const crypto = require('crypto')
const express = require('express')
const router  = express.Router()
const { pool, query, applyTenantContext } = require('../config/database')
const { protect, adminOnly } = require('../middleware/auth')
const { tenantClause, currentSchoolId, hasColumn } = require('../middleware/tenant')
const { findExistingChallan } = require('../services/feeChallanService')
const FEE_ADMIN_ROLES = new Set(['super_admin', 'admin', 'principal', 'accountant'])

function generateChallanNumber() {
  const timePart = Date.now().toString(36).slice(-7).toUpperCase()
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `CH-${timePart}-${randomPart}`
}

async function requireFeeWriteContext(req, res) {
  const schoolId = currentSchoolId(req)
  if (!schoolId) {
    res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'A school context is required for fee changes.' })
    return null
  }
  const [feeTenantSafe, studentTenantSafe] = await Promise.all([
    hasColumn('fee_challans', 'school_id'),
    hasColumn('students', 'school_id'),
  ])
  if (!feeTenantSafe || !studentTenantSafe) {
    res.status(503).json({ success: false, code: 'FEE_TENANT_SCHEMA_REQUIRED', message: 'Fee and student storage must be tenant-safe before fee changes are allowed.' })
    return null
  }
  return schoolId
}

async function resolveAcademicSession(schoolId) {
  const result = await query('SELECT academic_setup FROM settings WHERE school_id = $1 LIMIT 1', [schoolId])
  const setup = result.rows[0]?.academic_setup
  const startYear = String(setup?.sessionStart || '').slice(0, 4)
  const endYear = String(setup?.sessionEnd || '').slice(0, 4)
  return /^\d{4}$/.test(startYear) && /^\d{4}$/.test(endYear) ? `${startYear}-${endYear}` : ''
}

async function resolveAcademicClassNames(schoolId) {
  const result = await query('SELECT academic_setup FROM settings WHERE school_id = $1 LIMIT 1', [schoolId])
  const setup = result.rows[0]?.academic_setup
  const configured = Array.isArray(setup?.classes)
    ? setup.classes.filter(item => item?.active !== false).map(item => String(item?.name || '').trim()).filter(Boolean)
    : []
  return [...new Set(configured)]
}

function canManageFeeRecord(req) {
  return FEE_ADMIN_ROLES.has(String(req.user?.role || '').toLowerCase())
}

function scopedFeeReadClause(req, alias = 's', startIndex = 1) {
  const role = String(req.user?.role || '').toLowerCase()
  if (canManageFeeRecord(req)) return { clause: '', params: [], nextIndex: startIndex }
  if (role === 'parent') {
    return { clause: ` AND ${alias}.parent_user_id = $${startIndex}`, params: [req.user?.id || null], nextIndex: startIndex + 1 }
  }
  if (role === 'student') {
    return { clause: ` AND ${alias}.student_user_id = $${startIndex}`, params: [req.user?.id || null], nextIndex: startIndex + 1 }
  }
  return { clause: ' AND 1=0', params: [], nextIndex: startIndex }
}

let feePaymentColumnsReady = false
async function ensureFeePaymentColumns() {
  if (feePaymentColumnsReady) return true
  const result = await query(`
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='fee_challans'
      AND column_name IN ('discount','payment_note','proof_image','proof_status','proof_amount','proof_method','proof_submitted_at')
  `)
  if (Number(result.rows[0]?.count || 0) !== 7) {
    const err = new Error('fee payment schema migration is not applied.')
    err.code = 'FEE_SCHEMA_NOT_READY'
    throw err
  }
  feePaymentColumnsReady = true
  return true
}

// Schema bootstrap must never invent fee amounts, sessions, or discount packages.
let feeSystemSchemaReady = false
async function ensureFeeSystemSchema() {
  if (feeSystemSchemaReady) return true
  const result = await query(`
    SELECT
      to_regclass('public.fee_class_settings') AS class_settings,
      to_regclass('public.fee_discount_packages') AS discount_packages,
      to_regclass('public.fee_discount_applications') AS discount_applications,
      COUNT(*) FILTER (WHERE column_name IN ('monthly_fee','previous_arrears','gross_total','remaining_balance','discount_package_id','discount_label','fee_source','source_serial','migration_batch'))::int AS challan_columns
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='fee_challans'
  `)
  const row = result.rows[0] || {}
  if (!row.class_settings || !row.discount_packages || !row.discount_applications || Number(row.challan_columns || 0) !== 9) {
    const err = new Error('fee system schema migration is not applied.')
    err.code = 'FEE_SCHEMA_NOT_READY'
    throw err
  }
  feeSystemSchemaReady = true
  return true
}

function asMoney(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function normalizeClassName(value) {
  return String(value || '').trim()
}

const MONTH_ORDER = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

function monthNumber(value) {
  return MONTH_ORDER[String(value || '').trim().toLowerCase()] || null
}

async function getClassMonthlyFee(schoolId, className, session) {
  await ensureFeeSystemSchema(schoolId)
  const normalizedSession = String(session || '').trim()
  if (!/^\d{4}-\d{4}$/.test(normalizedSession)) return 0
  const result = await query(`
    SELECT monthly_fee
    FROM fee_class_settings
    WHERE school_id = $1 AND class_name = $2 AND session = $3 AND active = true
    LIMIT 1
  `, [schoolId, normalizeClassName(className), normalizedSession])
  return result.rows[0] ? asMoney(result.rows[0].monthly_fee) : 0
}

async function getSiblingCount(studentId, schoolId) {
  // First try family_code as the authoritative link
  const byFamilyCode = await query(`
    WITH target AS (
      SELECT family_code
      FROM students
      WHERE id = $1 AND school_id = $2
    )
    SELECT COUNT(*)::int AS total
    FROM students s, target t
    WHERE s.school_id = $2
      AND s.is_active = true
      AND t.family_code IS NOT NULL
      AND t.family_code <> ''
      AND s.family_code = t.family_code
  `, [studentId, schoolId])
  const familyCodeCount = byFamilyCode.rows[0]?.total || 0
  if (familyCodeCount > 1) return familyCodeCount

  // Fallback: match by father_cnic (reliable, unique identifier)
  const byCnic = await query(`
    WITH target AS (
      SELECT father_cnic
      FROM students
      WHERE id = $1 AND school_id = $2 AND father_cnic IS NOT NULL AND father_cnic <> ''
    )
    SELECT COUNT(*)::int AS total
    FROM students s, target t
    WHERE s.school_id = $2
      AND s.is_active = true
      AND s.father_cnic = t.father_cnic
  `, [studentId, schoolId])
  const cnicCount = byCnic.rows[0]?.total || 0
  if (cnicCount > 1) return cnicCount

  return 1
}

async function calculateAutoDiscount({ studentId, schoolId, className, session, baseAmount }) {
  await ensureFeeSystemSchema(schoolId)
  const packages = await query(`
    SELECT *
    FROM fee_discount_packages
    WHERE school_id = $1
      AND active = true
      AND auto_apply = true
      AND (start_date IS NULL OR start_date <= CURRENT_DATE)
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ORDER BY id
  `, [schoolId])
  const siblingCount = await getSiblingCount(studentId, schoolId)
  for (const pkg of packages.rows) {
    const classes = Array.isArray(pkg.applicable_classes) ? pkg.applicable_classes : []
    const sessions = Array.isArray(pkg.applicable_sessions) ? pkg.applicable_sessions : []
    const appliesToClass = classes.length === 0 || classes.includes(className)
    const appliesToSession = sessions.length === 0 || sessions.includes(session)
    if (!appliesToClass || !appliesToSession || siblingCount < Number(pkg.min_sibling_count || 1)) continue
    const amount = pkg.discount_type === 'fixed'
      ? asMoney(pkg.discount_value)
      : Math.round((asMoney(baseAmount) * asMoney(pkg.discount_value)) / 100)
    return {
      packageId: pkg.id,
      label: pkg.name,
      amount: Math.max(0, amount),
      siblingCount,
    }
  }
  return { packageId: null, label: null, amount: 0, siblingCount }
}

async function calculatePreviousArrears(studentId, schoolId, targetMonth, targetYear) {
  const targetMonthNumber = monthNumber(targetMonth)
  const targetYearNumber = Number(targetYear)
  const monthCase = `
    CASE LOWER(TRIM(month))
      WHEN 'january' THEN 1 WHEN 'february' THEN 2 WHEN 'march' THEN 3 WHEN 'april' THEN 4
      WHEN 'may' THEN 5 WHEN 'june' THEN 6 WHEN 'july' THEN 7 WHEN 'august' THEN 8
      WHEN 'september' THEN 9 WHEN 'october' THEN 10 WHEN 'november' THEN 11 WHEN 'december' THEN 12
      ELSE NULL
    END
  `
  const params = [studentId, schoolId]
  let priorPeriodFilter = ''
  if (targetMonthNumber && Number.isFinite(targetYearNumber)) {
    priorPeriodFilter = ` AND (year < $3 OR (year = $3 AND ${monthCase} < $4))`
    params.push(targetYearNumber, targetMonthNumber)
  }
  const result = await query(`
    SELECT COALESCE(SUM(GREATEST(COALESCE(remaining_balance, gross_total, amount, 0), 0)), 0) AS total_arrears
    FROM fee_challans
    WHERE student_id = $1 AND school_id = $2 AND status IN ('unpaid', 'partial')${priorPeriodFilter}
  `, params)
  return asMoney(result.rows[0]?.total_arrears || 0)
}

router.get('/settings', protect, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    await ensureFeeSystemSchema(schoolId)
    const academicClasses = await resolveAcademicClassNames(schoolId)
    const classSettings = await query(`
      SELECT id, class_name, session, monthly_fee, active
      FROM fee_class_settings
      WHERE school_id = $1 AND active = true AND class_name = ANY($2::text[])
      ORDER BY id
    `, [schoolId, academicClasses])
    const packages = await query(`
      SELECT *
      FROM fee_discount_packages
      WHERE school_id = $1
      ORDER BY id
    `, [schoolId])
    res.json({ success: true, data: { classSettings: classSettings.rows, discountPackages: packages.rows } })
  } catch (err) {
    console.error('Fee settings error:', err.message)
    res.status(500).json({ success: false, message: 'Fee settings could not be loaded.' })
  }
})

// PUT /api/fees/settings
router.put('/settings', protect, adminOnly, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    await ensureFeeSystemSchema(schoolId)
    const { classSettings = [], discountPackages = [] } = req.body
    const academicClasses = await resolveAcademicClassNames(schoolId)
    const academicClassSet = new Set(academicClasses)
    const activeSession = await resolveAcademicSession(schoolId, new Date().getFullYear())
    for (const item of classSettings) {
      const className = String(item?.class_name || '').trim()
      if (!className) continue
      if (!academicClassSet.has(className)) {
        return res.status(422).json({ success: false, message: `Class ${className} is not part of the active Academic Setup.` })
      }
      const session = String(item?.session || activeSession || '').trim()
      if (!/^\d{4}-\d{4}$/.test(session)) {
        return res.status(422).json({ success: false, message: 'A valid academic session is required for fee settings.' })
      }
      await query(`
        INSERT INTO fee_class_settings (school_id, class_name, session, monthly_fee, active)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (school_id, class_name, session)
        DO UPDATE SET monthly_fee = EXCLUDED.monthly_fee, active = EXCLUDED.active, updated_at = NOW()
      `, [schoolId, className, session, asMoney(item.monthly_fee), item.active !== false])
    }
    for (const pkg of discountPackages) {
      if (!pkg.name) continue
      await query(`
        INSERT INTO fee_discount_packages (
          school_id, name, description, discount_type, discount_value, min_sibling_count,
          applicable_classes, applicable_sessions, active, auto_apply, start_date, end_date
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12)
        ON CONFLICT (school_id, name)
        DO UPDATE SET
          description = EXCLUDED.description,
          discount_type = EXCLUDED.discount_type,
          discount_value = EXCLUDED.discount_value,
          min_sibling_count = EXCLUDED.min_sibling_count,
          applicable_classes = EXCLUDED.applicable_classes,
          applicable_sessions = EXCLUDED.applicable_sessions,
          active = EXCLUDED.active,
          auto_apply = EXCLUDED.auto_apply,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          updated_at = NOW()
      `, [
        schoolId,
        pkg.name,
        pkg.description || '',
        ['percentage', 'fixed'].includes(pkg.discount_type) ? pkg.discount_type : 'percentage',
        asMoney(pkg.discount_value),
        Number(pkg.min_sibling_count || 1),
        JSON.stringify(Array.isArray(pkg.applicable_classes) ? pkg.applicable_classes : []),
        JSON.stringify(Array.isArray(pkg.applicable_sessions) ? pkg.applicable_sessions : []),
        pkg.active !== false,
        pkg.auto_apply !== false,
        pkg.start_date || null,
        pkg.end_date || null,
      ])
    }
    res.json({ success: true, message: 'Fee settings saved' })
  } catch (err) {
    console.error('Fee settings save error:', err.message)
    res.status(500).json({ success: false, message: 'Fee settings could not be saved.' })
  }
})

// GET /api/fees/summary â€” dashboard aggregates
router.get('/summary', protect, adminOnly, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    if (!schoolId) return res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'A school context is required for fee summary.' })
    const supportsTenant = await hasColumn('fee_challans', 'school_id')
    if (!supportsTenant) return res.status(503).json({ success: false, code: 'FEE_TENANT_SCHEMA_REQUIRED', message: 'Fee storage is not tenant-safe for summary reads.' })
    const tenantFilter = 'AND f.school_id = $1'
    const params = [schoolId]
    const agg = await query(`
      SELECT
        COALESCE(SUM(COALESCE(f.paid_amount, 0)), 0) AS collected,
        COALESCE(SUM(
          CASE WHEN COALESCE(f.status, 'unpaid') <> 'paid' THEN
            GREATEST(
              0,
              COALESCE(
                f.remaining_balance,
                COALESCE(f.gross_total, f.amount, 0) - COALESCE(f.paid_amount, 0)
              )
            )
          ELSE 0 END
        ), 0) AS pending,
        COUNT(*) FILTER (WHERE f.status IN ('unpaid', 'partial')) AS unpaid_count,
        COUNT(*) FILTER (WHERE f.status = 'partial') AS partial_count,
        COUNT(*) FILTER (WHERE f.due_date IS NOT NULL AND f.due_date < CURRENT_DATE AND f.status <> 'paid') AS overdue_count
      FROM fee_challans f
      WHERE 1=1 ${tenantFilter}
    `, params)
    const recent = await query(`
      SELECT f.id, f.challan_no, f.amount, f.status, f.paid_amount, f.paid_date, f.month, f.year, s.name, s.gr_number
      FROM fee_challans f
      JOIN students s ON f.student_id = s.id AND s.school_id = f.school_id
      WHERE 1=1 ${tenantFilter}
      ORDER BY COALESCE(f.paid_date, f.created_at) DESC NULLS LAST
      LIMIT 8
    `, params)
    const row = agg.rows[0] || {}
    res.json({
      success: true,
      data: {
        collected: asMoney(row.collected),
        pending: asMoney(row.pending),
        unpaid_students: Number(row.unpaid_count || 0) + Number(row.partial_count || 0),
        overdue_challans: Number(row.overdue_count || 0),
        partial_count: Number(row.partial_count || 0),
        recent_payments: recent.rows,
      },
    })
  } catch (err) {
    console.error('Fee summary error:', err.message)
    res.status(500).json({ success: false, message: 'Fee summary could not be loaded.' })
  }
})

// GET /api/fees/existing â€” lookup challan for student + period
router.get('/existing', protect, adminOnly, async (req, res) => {
  try {
    const { student_id, month, year } = req.query
    if (!student_id || !month || !year) {
      return res.status(400).json({ success: false, message: 'student_id, month, and year are required' })
    }
    const existing = await findExistingChallan({
      studentId: Number(student_id),
      month,
      year: Number(year),
      schoolId: currentSchoolId(req),
    })
    res.json({ success: true, exists: !!existing, data: existing })
  } catch (err) {
    console.error('Fee existence check error:', err.message)
    res.status(500).json({ success: false, message: 'Fee challan status could not be checked.' })
  }
})

// GET /api/fees/:id â€” get single challan by ID
router.get('/pending-proofs', protect, adminOnly, async (req, res) => {
  try {
    await ensureFeePaymentColumns()
    const tenant = await tenantClause(req, { table: 'fee_challans', alias: 'f', paramIndex: 1 })
    const result = await query(`
      SELECT f.id, f.challan_no, f.month, f.year, f.amount, f.proof_amount, f.proof_method,
             f.proof_image, f.proof_submitted_at, s.name, s.gr_number, s.class, s.father_name
      FROM fee_challans f
      JOIN students s ON f.student_id = s.id AND s.school_id = f.school_id
      WHERE f.proof_status = 'pending'${tenant.clause}
      ORDER BY f.proof_submitted_at DESC
    `, tenant.params)
    res.json({ success: true, count: result.rowCount, data: result.rows })
  } catch (err) {
    console.error('Pending proofs list error:', err.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Pending payment proofs could not be loaded.' })
  }
})

// GET /api/fees/history/student/:student_id — tenant-safe challan/payment history for one student
router.get('/history/student/:student_id', protect, async (req, res) => {
  try {
    const studentId = Number(req.params.student_id)
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid student id is required.' })
    }
    const schoolId = currentSchoolId(req)
    const supportsTenant = await hasColumn('fee_challans', 'school_id')
    if (!supportsTenant) {
      return res.status(503).json({ success: false, code: 'FEE_TENANT_SCHEMA_REQUIRED', message: 'Fee storage is not tenant-safe for history reads.' })
    }
    let sql = `
      SELECT f.*, s.name, s.gr_number, s.class, s.section, s.father_name, s.family_code
      FROM fee_challans f
      JOIN students s ON s.id = f.student_id AND s.school_id = f.school_id
      WHERE f.student_id = $1
    `
    const params = [studentId]
    if (req.user?.role !== 'super_admin') {
      sql += ' AND f.school_id = $2'
      params.push(schoolId)
    }
    const readScope = scopedFeeReadClause(req, 's', params.length + 1)
    sql += readScope.clause
    params.push(...readScope.params)
    sql += ' ORDER BY f.year DESC, CASE LOWER(f.month) WHEN \'january\' THEN 1 WHEN \'february\' THEN 2 WHEN \'march\' THEN 3 WHEN \'april\' THEN 4 WHEN \'may\' THEN 5 WHEN \'june\' THEN 6 WHEN \'july\' THEN 7 WHEN \'august\' THEN 8 WHEN \'september\' THEN 9 WHEN \'october\' THEN 10 WHEN \'november\' THEN 11 WHEN \'december\' THEN 12 ELSE 0 END DESC, f.created_at DESC'
    const result = await query(sql, params)
    res.json({ success: true, count: result.rowCount, data: result.rows })
  } catch (err) {
    console.error('Fee history error:', err.message)
    res.status(500).json({ success: false, message: 'Fee history could not be loaded.' })
  }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid challan id' })
    }
    await tenantClause(req)
    const supportsTenant = await hasColumn('fee_challans', 'school_id')
    if (!supportsTenant) {
      return res.status(503).json({ success: false, code: 'FEE_TENANT_SCHEMA_REQUIRED', message: 'Fee storage is not tenant-safe for challan reads.' })
    }
    let sql = `
      SELECT f.*, s.name, s.gr_number, s.class, s.section, s.parent_phone, s.father_name,
             s.family_code, s.photo
      FROM fee_challans f
      JOIN students s ON f.student_id = s.id AND s.school_id = f.school_id
      WHERE f.id = $1
      ${req.user?.role !== 'super_admin' ? 'AND f.school_id = $2' : ''}
    `
    const params = req.user?.role !== 'super_admin'
      ? [id, currentSchoolId(req)]
      : [id]
    const readScope = scopedFeeReadClause(req, 's', params.length + 1)
    sql += readScope.clause
    params.push(...readScope.params)
    sql += ' LIMIT 1'
    const result = await query(sql, params)
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Fee challan not found' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Fee get by id error:', err.message)
    res.status(500).json({ success: false, message: 'Fee challan could not be loaded.' })
  }
})

// GET /api/fees
router.get('/', protect, async (req, res) => {
  try {
    const { class: cls, status, month, year, student_id } = req.query
    let sql = `
      SELECT f.*, s.name, s.gr_number, s.class, s.section, s.parent_phone, s.father_name
      FROM fee_challans f
      JOIN students s ON f.student_id = s.id AND s.school_id = f.school_id
      WHERE 1=1
    `
    const params = []
    let i = 1
    const tenant = await tenantClause(req, { table: 'fee_challans', alias: 'f', paramIndex: i })
    sql += tenant.clause
    params.push(...tenant.params)
    i = tenant.nextIndex
    const readScope = scopedFeeReadClause(req, 's', i)
    sql += readScope.clause
    params.push(...readScope.params)
    i = readScope.nextIndex
    if (status)     { sql += ` AND f.status = $${i++}`;                             params.push(status) }
    if (month)      { sql += ` AND LOWER(TRIM(f.month)) = LOWER(TRIM($${i++}))`;    params.push(month) }
    if (year)       { sql += ` AND f.year = $${i++}`;                               params.push(Number(year)) }
    if (cls) {
      const norm = String(cls).trim().toLowerCase()
      if (['9', 'nine', 'pre nine', 'pre-nine', 'class 9'].includes(norm)) {
        sql += ` AND (s.class ILIKE '9' OR s.class ILIKE 'Nine' OR s.class ILIKE 'Pre Nine')`
      } else {
        sql += ` AND (s.class = $${i} OR s.class ILIKE $${i})`
        params.push(cls)
        i++
      }
    }
    if (student_id) { sql += ` AND f.student_id = $${i++}`;                         params.push(Number(student_id)) }
    sql += ' ORDER BY f.created_at DESC'

    const result = await query(sql, params)
    res.json({ success: true, count: result.rowCount, data: result.rows })
  } catch (err) {
    console.error('Fee list error:', err.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Fee challans could not be loaded.' })
  }
})

// POST /api/fees
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    await ensureFeePaymentColumns()
    await ensureFeeSystemSchema()
    const { student_id, month, year, amount, due_date, created_by, discount, previous_arrears } = req.body
    const challan_no = generateChallanNumber()
    const schoolId = await requireFeeWriteContext(req, res)
    if (!schoolId) return
    const duplicateSql = `
      SELECT id FROM fee_challans
      WHERE student_id = $1 AND LOWER(TRIM(month)) = LOWER(TRIM($2)) AND year = $3 AND school_id = $4
      LIMIT 1
    `
    const duplicateParams = [student_id, month, year, schoolId]
    const duplicate = await query(duplicateSql, duplicateParams)
    if (duplicate.rows.length) {
      const existing = await findExistingChallan({
        studentId: Number(student_id),
        month,
        year: Number(year),
        schoolId,
      })
      return res.status(409).json({
        success: false,
        code: 'CHALLAN_EXISTS',
        message: 'A challan already exists for this student and month.',
        data: existing,
      })
    }

    const studentResult = await query(
      'SELECT id, class, section FROM students WHERE id = $1 AND school_id = $2 LIMIT 1',
      [student_id, schoolId]
    )
    if (!studentResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Student not found for this challan.' })
    }

    const student = studentResult.rows[0]
    const session = await resolveAcademicSession(schoolId, year)
    const configuredMonthly = await getClassMonthlyFee(schoolId, student.class, session)
    const monthlyFee = asMoney(amount || configuredMonthly)
    const arrears = previous_arrears !== undefined
      ? asMoney(previous_arrears)
      : await calculatePreviousArrears(student_id, schoolId, month, year)
    const autoDiscount = discount === undefined || discount === null || discount === ''
      ? await calculateAutoDiscount({ studentId: Number(student_id), schoolId, className: student.class, session, baseAmount: monthlyFee })
      : { packageId: null, label: null, amount: 0, siblingCount: 1 }
    const finalDiscount = discount === undefined || discount === null || discount === ''
      ? autoDiscount.amount
      : asMoney(discount)
    const grossTotal = Math.max(0, monthlyFee + arrears - finalDiscount)
    const remainingBalance = grossTotal
    const creatorId = Number.isFinite(Number(created_by)) ? Number(created_by) : (req.user?.id || null)

    const result = await query(`
      INSERT INTO fee_challans (
        school_id, challan_no, student_id, month, year, amount, due_date, created_by,
        discount, monthly_fee, previous_arrears, gross_total, remaining_balance,
        discount_package_id, discount_label
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT DO NOTHING
      RETURNING *
    `, [
      schoolId, challan_no, student_id, month, year, grossTotal, due_date, creatorId,
      finalDiscount, monthlyFee, arrears, grossTotal, remainingBalance,
      autoDiscount.packageId, autoDiscount.label,
    ])

    if (!result.rows[0]) {
      const existing = await findExistingChallan({
        studentId: Number(student_id), month, year: Number(year), schoolId,
      })
      return res.status(409).json({
        success: false,
        code: 'CHALLAN_EXISTS',
        message: 'A challan already exists for this student and month.',
        data: existing,
      })
    }

    if (autoDiscount.packageId && result.rows[0]?.id) {
      await query(`
        INSERT INTO fee_discount_applications (school_id, challan_id, student_id, package_id, amount, reason)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (challan_id, package_id) DO NOTHING
      `, [
        schoolId,
        result.rows[0].id,
        student_id,
        autoDiscount.packageId,
        finalDiscount,
        `${autoDiscount.label} auto-applied for ${autoDiscount.siblingCount} active siblings`,
      ])
    }

    res.status(201).json({ success: true, message: 'Challan ban gaya', data: result.rows[0] })
  } catch (err) {
    console.error('Fee create error:', err.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Fee challan could not be created.' })
  }
})

// POST /api/fees/bulk
router.post('/bulk', protect, adminOnly, async (req, res) => {
  try {
    await ensureFeePaymentColumns()
    await ensureFeeSystemSchema()
    const schoolId = await requireFeeWriteContext(req, res)
    if (!schoolId) return
    const { class: className, month, year, due_date } = req.body
    
    if (!className || !month || !year) {
      return res.status(400).json({ success: false, message: 'class, month, and year are required' })
    }

    const studentsResult = await query(
      'SELECT id, class, section FROM students WHERE class = $1 AND is_active = true AND school_id = $2',
      [className, schoolId]
    )
    
    let generatedCount = 0
    let skippedCount = 0
    const session = await resolveAcademicSession(schoolId, year)
    const configuredMonthly = await getClassMonthlyFee(schoolId, className, session)

    for (const student of studentsResult.rows) {
      const duplicateSql = 'SELECT id FROM fee_challans WHERE student_id = $1 AND LOWER(TRIM(month)) = LOWER(TRIM($2)) AND year = $3 AND school_id = $4 LIMIT 1'
      const duplicateParams = [student.id, month, year, schoolId]
      const duplicate = await query(duplicateSql, duplicateParams)
      
      if (duplicate.rows.length) {
        skippedCount++
        continue
      }

      const challan_no = generateChallanNumber()
      const arrears = await calculatePreviousArrears(student.id, schoolId, month, year)
      const monthlyFee = asMoney(configuredMonthly)
      
      const autoDiscount = await calculateAutoDiscount({ studentId: student.id, schoolId, className: student.class, session, baseAmount: monthlyFee })
      const finalDiscount = autoDiscount.amount
      const grossTotal = Math.max(0, monthlyFee + arrears - finalDiscount)
      const remainingBalance = grossTotal
      const creatorId = req.user?.id || null

      const result = await query(`
        INSERT INTO fee_challans (
          school_id, challan_no, student_id, month, year, amount, due_date, created_by,
          discount, monthly_fee, previous_arrears, gross_total, remaining_balance,
          discount_package_id, discount_label
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [
        schoolId, challan_no, student.id, month, year, grossTotal, due_date, creatorId,
        finalDiscount, monthlyFee, arrears, grossTotal, remainingBalance,
        autoDiscount.packageId, autoDiscount.label,
      ])

      if (!result.rows[0]) {
        skippedCount++
        continue
      }

      if (autoDiscount.packageId && result.rows[0]?.id) {
        await query(`
          INSERT INTO fee_discount_applications (school_id, challan_id, student_id, package_id, amount, reason)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (challan_id, package_id) DO NOTHING
        `, [
          schoolId, result.rows[0].id, student.id, autoDiscount.packageId, finalDiscount,
          `${autoDiscount.label} auto-applied for ${autoDiscount.siblingCount} active siblings`,
        ])
      }
      generatedCount++
    }

    res.status(201).json({ success: true, message: `Bulk generation complete. Created: ${generatedCount}, Skipped: ${skippedCount}` })
  } catch (err) {
    console.error('Bulk fee create error:', err.message)
    res.status(500).json({ success: false, message: 'Server error during bulk generation.' })
  }
})

// PUT /api/fees/:id — edit challan (amount, due date, discount, arrears, monthly fee)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    await ensureFeePaymentColumns()
    const { amount, due_date, discount, month, year, monthly_fee, previous_arrears, challan_no } = req.body
    const schoolId = await requireFeeWriteContext(req, res)
    if (!schoolId) return
    const monthly = amount !== undefined ? asMoney(amount) : (monthly_fee !== undefined ? asMoney(monthly_fee) : null)
    const arrears = previous_arrears !== undefined ? asMoney(previous_arrears) : null
    const disc = discount !== undefined ? asMoney(discount) : null
    const sql = `
      UPDATE fee_challans SET
        challan_no = COALESCE($1, challan_no),
        amount = GREATEST(COALESCE($2, monthly_fee, amount, 0) + COALESCE($3, previous_arrears, 0) - COALESCE($4, discount, 0), 0),
        monthly_fee = COALESCE($2, monthly_fee),
        previous_arrears = COALESCE($3, previous_arrears),
        discount = COALESCE($4, discount),
        due_date = COALESCE($5, due_date),
        month = COALESCE($6, month),
        year = COALESCE($7, year),
        gross_total = GREATEST(COALESCE($2, monthly_fee, amount, 0) + COALESCE($3, previous_arrears, 0) - COALESCE($4, discount, 0), 0),
        remaining_balance = GREATEST(GREATEST(COALESCE($2, monthly_fee, amount, 0) + COALESCE($3, previous_arrears, 0) - COALESCE($4, discount, 0), 0) - COALESCE(paid_amount, 0), 0),
        status = CASE
          WHEN COALESCE(paid_amount, 0) <= 0 THEN 'unpaid'
          WHEN COALESCE(paid_amount, 0) < GREATEST(COALESCE($2, monthly_fee, amount, 0) + COALESCE($3, previous_arrears, 0) - COALESCE($4, discount, 0), 0) THEN 'partial'
          ELSE 'paid'
        END,
        updated_at = NOW()
      WHERE id = $8 AND school_id = $9
      RETURNING *
    `
    const params = [challan_no || null, monthly, arrears, disc, due_date || null, month || null, year ? Number(year) : null, req.params.id, schoolId]
    const result = await query(sql, params)
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Challan not found' })
    res.json({ success: true, message: 'Challan updated', data: result.rows[0] })
  } catch (err) {
    console.error('Challan update failed:', err.message)
    res.status(500).json({ success: false, message: 'Fee challan could not be updated.' })
  }
})

// DELETE /api/fees/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const schoolId = await requireFeeWriteContext(req, res)
    if (!schoolId) return
    const result = await query('DELETE FROM fee_challans WHERE id = $1 AND school_id = $2 RETURNING id', [req.params.id, schoolId])
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Challan not found' })
    res.json({ success: true, message: 'Challan deleted' })
  } catch (err) {
    console.error('Challan delete failed:', err.message)
    res.status(500).json({ success: false, message: 'Fee challan could not be deleted.' })
  }
})

// POST /api/fees/:id/regenerate â€” replace challan amounts (same period)
router.post('/:id/regenerate', protect, adminOnly, async (req, res) => {
  try {
    const { amount, discount, due_date, previous_arrears } = req.body
    const schoolId = await requireFeeWriteContext(req, res)
    if (!schoolId) return
    const existingSql = `
      SELECT student_id, month, year, amount, monthly_fee, discount
      FROM fee_challans
      WHERE id = $1 AND school_id = $2
      LIMIT 1
    `
    const existingParams = [req.params.id, schoolId]
    const existing = await query(existingSql, existingParams)
    if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Challan not found' })
    const current = existing.rows[0]
    const monthly = amount !== undefined
      ? asMoney(amount)
      : asMoney(current.monthly_fee || current.amount)
    const arrears = previous_arrears !== undefined
      ? asMoney(previous_arrears)
      : await calculatePreviousArrears(current.student_id, schoolId, current.month, current.year)
    const disc = discount !== undefined
      ? asMoney(discount)
      : asMoney(current.discount)
    const gross = Math.max(0, monthly + arrears - disc)
    const challan_no = generateChallanNumber()
    const sql = `
      UPDATE fee_challans SET
        challan_no = $1,
        amount = $3,
        monthly_fee = $2,
        previous_arrears = $4,
        gross_total = $5,
        remaining_balance = GREATEST($5 - COALESCE(paid_amount, 0), 0),
        discount = $6,
        due_date = COALESCE($7, due_date),
        status = CASE
          WHEN COALESCE(paid_amount, 0) <= 0 THEN 'unpaid'
          WHEN COALESCE(paid_amount, 0) < $5 THEN 'partial'
          ELSE 'paid'
        END,
        updated_at = NOW()
      WHERE id = $8 AND school_id = $9
      RETURNING *
    `
    const params = [challan_no, monthly, gross, arrears, gross, disc, due_date || null, req.params.id, schoolId]
    const result = await query(sql, params)
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Challan not found' })
    res.json({ success: true, message: 'Challan regenerated', data: result.rows[0] })
  } catch (err) {
    console.error('Challan regeneration failed:', err.message)
    res.status(500).json({ success: false, message: 'Fee challan could not be regenerated.' })
  }
})

// POST /api/fees/:id/upload-proof — parent/student/admin submits payment screenshot
router.post('/:id/upload-proof', protect, async (req, res) => {
  try {
    await ensureFeePaymentColumns()
    await ensureFeeSystemSchema()
    const schoolId = await requireFeeWriteContext(req, res)
    if (!schoolId) return

    const { proof_image, proof_amount, proof_method } = req.body
    if (!proof_image) return res.status(400).json({ success: false, message: 'Screenshot required' })
    if (Buffer.byteLength(proof_image, 'utf8') > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Image too large (max 5MB)' })
    }
    const amountValue = proof_amount === '' || proof_amount === null || proof_amount === undefined ? null : Number(proof_amount)
    if (amountValue !== null && (!Number.isFinite(amountValue) || amountValue <= 0)) {
      return res.status(422).json({ success: false, message: 'Proof amount must be greater than zero when provided.' })
    }

    const role = String(req.user?.role || '').toLowerCase()
    const userId = req.user?.id || null
    if (!canManageFeeRecord(req) && !['parent', 'student'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only admins, parents, or students can submit fee proofs.' })
    }

    const params = [proof_image, amountValue, proof_method || null, Number(req.params.id), schoolId]
    let ownerFilter = ''
    if (!canManageFeeRecord(req)) {
      params.push(role, userId)
      ownerFilter = `AND EXISTS (
        SELECT 1
        FROM students s
        WHERE s.id = fee_challans.student_id
          AND s.school_id = fee_challans.school_id
          AND (
            ($6::text = 'parent' AND s.parent_user_id = $7)
            OR ($6::text = 'student' AND s.student_user_id = $7)
          )
      )`
    }

    const result = await query(`
      UPDATE fee_challans
      SET proof_image = $1,
          proof_amount = $2,
          proof_method = $3,
          proof_status = 'pending',
          proof_submitted_at = NOW(),
          updated_at = NOW()
      WHERE id = $4 AND school_id = $5
        ${ownerFilter}
      RETURNING id, proof_status, proof_submitted_at, proof_amount, proof_method
    `, params)
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Fee challan not found or not accessible.' })
    return res.json({ success: true, message: 'Payment proof submitted for review', data: result.rows[0] })
  } catch (err) {
    console.error('Proof upload error:', err.message)
    return res.status(500).json({ success: false, message: 'Payment proof could not be submitted.' })
  }
})

// PUT /api/fees/:id/approve-proof — review proof transactionally and preserve payment history
router.put('/:id/approve-proof', protect, adminOnly, async (req, res) => {
  const { action } = req.body
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'action must be approve or reject' })
  }
  const challanId = Number(req.params.id)
  if (!Number.isInteger(challanId) || challanId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid challan id is required.' })
  }
  const schoolId = await requireFeeWriteContext(req, res)
  if (!schoolId) return

  const client = await pool.connect()
  try {
    await ensureFeePaymentColumns()
    await client.query('BEGIN')
    await applyTenantContext(client)
    const locked = await client.query(`
      SELECT id, student_id, amount, monthly_fee, previous_arrears, discount, gross_total,
             paid_amount, proof_amount, proof_method, proof_status
      FROM fee_challans
      WHERE id = $1 AND school_id = $2
      FOR UPDATE
    `, [challanId, schoolId])
    if (!locked.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Fee challan not found.' })
    }
    const current = locked.rows[0]
    if (current.proof_status !== 'pending') {
      await client.query('ROLLBACK')
      return res.status(409).json({ success: false, message: 'Only a pending payment proof can be reviewed.' })
    }

    if (action === 'reject') {
      const result = await client.query(`
        UPDATE fee_challans
        SET proof_status = 'rejected', proof_image = NULL, updated_at = NOW()
        WHERE id = $1 AND school_id = $2
        RETURNING id, proof_status
      `, [challanId, schoolId])
      await client.query('COMMIT')
      return res.json({ success: true, message: 'Proof rejected.', data: result.rows[0] })
    }

    const baseTotal = Math.max(0, Number(current.monthly_fee ?? current.amount ?? 0) + Number(current.previous_arrears || 0))
    const discount = Math.max(0, Number(current.discount || 0))
    const grossTotal = Math.max(0, Number(current.gross_total ?? (baseTotal - discount)))
    const previousPaid = Math.max(0, Number(current.paid_amount || 0))
    const remainingBefore = Math.max(0, grossTotal - previousPaid)
    const proofIncrement = current.proof_amount == null
      ? remainingBefore
      : Number(current.proof_amount)
    if (!Number.isFinite(proofIncrement) || proofIncrement <= 0 || proofIncrement > remainingBefore) {
      await client.query('ROLLBACK')
      return res.status(422).json({ success: false, message: 'Proof amount must be positive and cannot exceed the remaining balance.' })
    }
    const cumulativePaid = Number((previousPaid + proofIncrement).toFixed(2))
    const paymentMode = String(current.proof_method || 'online').trim().toLowerCase().slice(0, 32) || 'online'
    const result = await client.query(`
      UPDATE fee_challans
      SET paid_amount = $1,
          remaining_balance = GREATEST($2 - $1, 0),
          status = CASE WHEN $1 >= $2 THEN 'paid' ELSE 'partial' END,
          payment_mode = $3,
          paid_date = COALESCE(paid_date, CURRENT_DATE),
          proof_status = 'approved',
          updated_at = NOW()
      WHERE id = $4 AND school_id = $5
      RETURNING *
    `, [cumulativePaid, grossTotal, paymentMode, challanId, schoolId])

    await client.query(`
      INSERT INTO fee_payment_transactions (
        school_id, challan_id, student_id, amount, cumulative_paid,
        payment_mode, discount_snapshot, payment_note, recorded_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      schoolId,
      challanId,
      current.student_id || null,
      proofIncrement,
      cumulativePaid,
      paymentMode,
      discount,
      'Approved submitted payment proof',
      req.user?.id || null,
    ])

    await client.query('COMMIT')
    return res.json({ success: true, message: 'Payment proof approved and recorded.', payment_increment: proofIncrement, data: result.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Proof approval/rejection error:', err.message)
    return res.status(500).json({ success: false, message: 'Payment proof review could not be completed.' })
  } finally {
    client.release()
  }
})

// GET /api/fees/pending-proofs â€” admin reviews submitted screenshots
router.get('/pending-proofs', protect, adminOnly, async (req, res) => {
  try {
    await ensureFeePaymentColumns()
    const tenant = await tenantClause(req, { table: 'fee_challans', alias: 'f', paramIndex: 1 })
    const result = await query(`
      SELECT f.id, f.challan_no, f.month, f.year, f.amount, f.proof_amount, f.proof_method,
             f.proof_image, f.proof_submitted_at, s.name, s.gr_number, s.class, s.father_name
      FROM fee_challans f
      JOIN students s ON f.student_id = s.id AND s.school_id = f.school_id
      WHERE f.proof_status = 'pending'${tenant.clause}
      ORDER BY f.proof_submitted_at DESC
    `, tenant.params)
    res.json({ success: true, count: result.rowCount, data: result.rows })
  } catch (err) {
    console.error('Pending proofs list error:', err.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Pending payment proofs could not be loaded.' })
  }
})

// PUT /api/fees/:id/pay — cumulative challan state + append-only payment ledger
router.put('/:id/pay', protect, adminOnly, async (req, res) => {
  const challanId = Number(req.params.id)
  if (!Number.isInteger(challanId) || challanId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid fee challan id is required.' })
  }

  const cumulativePaid = Number(req.body?.paid_amount)
  const discount = Number(req.body?.discount || 0)
  const paymentMode = String(req.body?.payment_mode || 'cash').trim().toLowerCase()
  const paymentNote = req.body?.payment_note == null ? null : String(req.body.payment_note).trim().slice(0, 1000)
  const allowedModes = new Set(['cash', 'online', 'bank', 'jazzcash', 'easypaisa', 'card', 'other'])

  if (!Number.isFinite(cumulativePaid) || cumulativePaid < 0) {
    return res.status(422).json({ success: false, message: 'Valid cumulative paid amount is required.' })
  }
  if (!Number.isFinite(discount) || discount < 0) {
    return res.status(422).json({ success: false, message: 'Discount cannot be negative.' })
  }
  if (!allowedModes.has(paymentMode)) {
    return res.status(422).json({ success: false, message: 'Invalid payment mode.' })
  }

  const schoolId = await requireFeeWriteContext(req, res)
  if (!schoolId) return
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await applyTenantContext(client)
    const rowResult = await client.query(`
      SELECT id, student_id, school_id, amount, monthly_fee, previous_arrears, paid_amount, discount
      FROM fee_challans
      WHERE id = $1 AND school_id = $2
      FOR UPDATE
    `, [challanId, schoolId])

    if (!rowResult.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Fee challan not found.' })
    }

    const current = rowResult.rows[0]
    const baseTotal = Math.max(0, Number(current.monthly_fee ?? current.amount ?? 0) + Number(current.previous_arrears || 0))
    const previousPaid = Math.max(0, Number(current.paid_amount || 0))
    if (discount > baseTotal) {
      await client.query('ROLLBACK')
      return res.status(422).json({ success: false, message: 'Discount cannot exceed the challan amount.' })
    }
    const grossTotal = Math.max(0, baseTotal - discount)
    if (cumulativePaid > grossTotal) {
      await client.query('ROLLBACK')
      return res.status(422).json({ success: false, message: 'Paid amount cannot exceed the payable challan total.' })
    }
    if (cumulativePaid < previousPaid) {
      await client.query('ROLLBACK')
      return res.status(422).json({ success: false, message: 'Recorded paid amount cannot be reduced through the payment workflow.' })
    }

    const paymentIncrement = Number((cumulativePaid - previousPaid).toFixed(2))
    const updateResult = await client.query(`
      UPDATE fee_challans
      SET paid_amount = $1,
          payment_mode = $2,
          discount = $3,
          payment_note = $4,
          gross_total = $5,
          remaining_balance = GREATEST($5 - $1, 0),
          status = CASE
            WHEN $1 <= 0 THEN 'unpaid'
            WHEN $1 < $5 THEN 'partial'
            ELSE 'paid'
          END,
          paid_date = CASE WHEN $1 > 0 THEN COALESCE(paid_date, CURRENT_DATE) ELSE NULL END,
          updated_at = NOW()
      WHERE id = $6 AND school_id = $7
      RETURNING *
    `, [cumulativePaid, paymentMode, discount, paymentNote, grossTotal, challanId, schoolId])

    if (paymentIncrement > 0) {
      await client.query(`
        INSERT INTO fee_payment_transactions (
          school_id, challan_id, student_id, amount, cumulative_paid,
          payment_mode, discount_snapshot, payment_note, recorded_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        Number(current.school_id || schoolId),
        challanId,
        current.student_id || null,
        paymentIncrement,
        cumulativePaid,
        paymentMode,
        discount,
        paymentNote,
        req.user?.id || null,
      ])
    }

    await client.query('COMMIT')
    return res.json({
      success: true,
      message: paymentIncrement > 0 ? 'Payment recorded successfully.' : 'Payment state updated successfully.',
      payment_increment: paymentIncrement,
      data: updateResult.rows[0],
    })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Fee payment error:', err.message)
    return res.status(500).json({ success: false, message: 'Payment could not be recorded.' })
  } finally {
    client.release()
  }
})

module.exports = router

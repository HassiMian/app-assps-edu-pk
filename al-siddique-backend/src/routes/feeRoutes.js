const express = require('express')
const router  = express.Router()
const { query } = require('../config/database')
const { protect, adminOnly } = require('../middleware/auth')
const { tenantClause, currentSchoolId, hasColumn } = require('../middleware/tenant')
const { findExistingChallan } = require('../services/feeChallanService')
const ALLOW_MOCK_FALLBACK = process.env.NODE_ENV !== 'production'
const REAL_CLASS_NAMES = ['Starter', 'Mover', 'Flyer', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Pre Nine', 'Hifaz Class']
const FEE_ADMIN_ROLES = new Set(['super_admin', 'admin', 'principal', 'accountant'])

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
  if (feePaymentColumnsReady) return
  await query(`
    ALTER TABLE fee_challans
      ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS payment_note TEXT,
      ADD COLUMN IF NOT EXISTS proof_image TEXT,
      ADD COLUMN IF NOT EXISTS proof_status VARCHAR(20) DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS proof_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS proof_method VARCHAR(50),
      ADD COLUMN IF NOT EXISTS proof_submitted_at TIMESTAMP
  `)
  feePaymentColumnsReady = true
}

let feeSystemSchemaReady = false
async function ensureFeeSystemSchema(schoolId) {
  if (feeSystemSchemaReady && !schoolId) return
  await query(`
    ALTER TABLE fee_challans
      ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS previous_arrears DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gross_total DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS discount_package_id INTEGER,
      ADD COLUMN IF NOT EXISTS discount_label VARCHAR(150),
      ADD COLUMN IF NOT EXISTS fee_source VARCHAR(80),
      ADD COLUMN IF NOT EXISTS source_serial INTEGER,
      ADD COLUMN IF NOT EXISTS migration_batch VARCHAR(80);

    CREATE TABLE IF NOT EXISTS fee_class_settings (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id),
      class_name VARCHAR(100) NOT NULL,
      session VARCHAR(20) DEFAULT '2026-2027',
      monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(school_id, class_name, session)
    );

    CREATE TABLE IF NOT EXISTS fee_discount_packages (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id),
      name VARCHAR(150) NOT NULL,
      description TEXT,
      discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
      discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
      min_sibling_count INTEGER NOT NULL DEFAULT 1,
      applicable_classes JSONB DEFAULT '[]'::jsonb,
      applicable_sessions JSONB DEFAULT '[]'::jsonb,
      active BOOLEAN DEFAULT true,
      auto_apply BOOLEAN DEFAULT true,
      start_date DATE,
      end_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(school_id, name)
    );

    CREATE TABLE IF NOT EXISTS fee_discount_applications (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id),
      challan_id INTEGER REFERENCES fee_challans(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      package_id INTEGER REFERENCES fee_discount_packages(id),
      amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      reason TEXT,
      applied_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(challan_id, package_id)
    );

    CREATE INDEX IF NOT EXISTS idx_fee_class_settings_school ON fee_class_settings(school_id, class_name);
    CREATE INDEX IF NOT EXISTS idx_fee_discount_packages_school ON fee_discount_packages(school_id, active);
    CREATE INDEX IF NOT EXISTS idx_fee_challans_migration_batch ON fee_challans(migration_batch);
  `)
  for (const tableName of ['fee_class_settings', 'fee_discount_packages', 'fee_discount_applications']) {
    await query(`ALTER TABLE ${tableName} ALTER COLUMN school_id DROP DEFAULT`).catch(() => {})
  }

  if (!schoolId) {
    feeSystemSchemaReady = true
    return
  }

  const defaults = [
    ['Starter', 2500], ['Mover', 2500], ['Flyer', 2500], ['One', 2500], ['Two', 2500], ['Three', 2500], ['Four', 2500], ['Five', 2500],
    ['Six', 2800], ['Seven', 2800], ['Eight', 2800],
    ['Pre Nine', 3000], ['Hifaz Class', 2500],
  ]
  for (const [className, monthlyFee] of defaults) {
    await query(`
      INSERT INTO fee_class_settings (school_id, class_name, session, monthly_fee, active)
      VALUES ($1, $2, '2026-2027', $3, true)
      ON CONFLICT (school_id, class_name, session)
      DO UPDATE SET monthly_fee = EXCLUDED.monthly_fee, active = true, updated_at = NOW()
    `, [schoolId, className, monthlyFee])
  }
  await query(`
    UPDATE fee_class_settings
    SET active = false, updated_at = NOW()
    WHERE school_id = $1 AND NOT (class_name = ANY($2::text[]))
  `, [schoolId, REAL_CLASS_NAMES])
  await query(`
    INSERT INTO fee_discount_packages (
      school_id, name, description, discount_type, discount_value, min_sibling_count,
      applicable_classes, applicable_sessions, active, auto_apply
    )
    VALUES (
      $1,
      'Triple Star Discount Package',
      'Automatically applies when a family has 3 or more active enrolled children.',
      'percentage',
      10,
      3,
      '[]'::jsonb,
      '["2026-2027"]'::jsonb,
      true,
      true
    )
    ON CONFLICT (school_id, name)
    DO UPDATE SET
      description = EXCLUDED.description,
      discount_type = EXCLUDED.discount_type,
      discount_value = EXCLUDED.discount_value,
      min_sibling_count = EXCLUDED.min_sibling_count,
      active = true,
      auto_apply = true,
      updated_at = NOW()
  `, [schoolId])
  feeSystemSchemaReady = true
}

function asMoney(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function normalizeClassName(value) {
  return String(value || '').trim()
}

async function getClassMonthlyFee(schoolId, className, session = '2026-2027') {
  await ensureFeeSystemSchema(schoolId)
  const result = await query(`
    SELECT monthly_fee
    FROM fee_class_settings
    WHERE school_id = $1 AND class_name = $2 AND session = $3 AND active = true
    LIMIT 1
  `, [schoolId, normalizeClassName(className), session])
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

async function calculatePreviousArrears(studentId, schoolId, supportsTenant) {
  const sql = supportsTenant 
    ? `SELECT COALESCE(SUM(remaining_balance - COALESCE(paid_amount, 0)), 0) AS total_arrears
       FROM fee_challans
       WHERE student_id = $1 AND school_id = $2 AND status IN ('unpaid', 'partial')`
    : `SELECT COALESCE(SUM(remaining_balance - COALESCE(paid_amount, 0)), 0) AS total_arrears
       FROM fee_challans
       WHERE student_id = $1 AND status IN ('unpaid', 'partial')`
  const params = supportsTenant ? [studentId, schoolId] : [studentId]
  try {
    const result = await query(sql, params)
    return asMoney(result.rows[0]?.total_arrears || 0)
  } catch (err) {
    console.error('Error calculating arrears:', err)
    return 0
  }
}

// GET /api/fees/settings
router.get('/settings', protect, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    await ensureFeeSystemSchema(schoolId)
    const classSettings = await query(`
      SELECT id, class_name, session, monthly_fee, active
      FROM fee_class_settings
      WHERE school_id = $1 AND active = true AND class_name = ANY($2::text[])
      ORDER BY id
    `, [schoolId, REAL_CLASS_NAMES])
    const packages = await query(`
      SELECT *
      FROM fee_discount_packages
      WHERE school_id = $1
      ORDER BY id
    `, [schoolId])
    res.json({ success: true, data: { classSettings: classSettings.rows, discountPackages: packages.rows } })
  } catch (err) {
    console.error('Fee settings error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/fees/settings
router.put('/settings', protect, adminOnly, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    await ensureFeeSystemSchema(schoolId)
    const { classSettings = [], discountPackages = [] } = req.body
    for (const item of classSettings) {
      if (!item.class_name) continue
      await query(`
        INSERT INTO fee_class_settings (school_id, class_name, session, monthly_fee, active)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (school_id, class_name, session)
        DO UPDATE SET monthly_fee = EXCLUDED.monthly_fee, active = EXCLUDED.active, updated_at = NOW()
      `, [schoolId, item.class_name, item.session || '2026-2027', asMoney(item.monthly_fee), item.active !== false])
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
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/fees/summary â€” dashboard aggregates
router.get('/summary', protect, adminOnly, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const supportsTenant = await hasColumn('fee_challans', 'school_id').catch(() => false)
    const tenantFilter = supportsTenant ? 'AND f.school_id = $1' : ''
    const params = supportsTenant ? [schoolId] : []
    const agg = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN f.status = 'paid' THEN COALESCE(f.paid_amount, f.amount, 0) ELSE 0 END), 0) AS collected,
        COALESCE(SUM(CASE WHEN f.status IN ('unpaid', 'partial') THEN COALESCE(f.remaining_balance, f.amount, 0) - COALESCE(f.paid_amount, 0) ELSE 0 END), 0) AS pending,
        COUNT(*) FILTER (WHERE f.status = 'unpaid') AS unpaid_count,
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
        unpaid_students: Number(row.unpaid_count || 0),
        overdue_challans: Number(row.overdue_count || 0),
        partial_count: Number(row.partial_count || 0),
        recent_payments: recent.rows,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
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
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/fees/:id â€” get single challan by ID
router.get('/pending-proofs', protect, adminOnly, async (req, res) => {
  try {
    try {
      await ensureFeePaymentColumns()
    } catch (e) {
      console.warn('Skipping column verification due to offline db');
    }
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
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    console.warn('PostgreSQL offline. Returning empty pending-proofs list (Mock Fallback).');
    return res.json({ success: true, count: 0, data: [] })
  }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid challan id' })
    }
    await tenantClause(req)
    const supportsTenant = await hasColumn('fee_challans', 'school_id').catch(() => false)
    let sql = `
      SELECT f.*, s.name, s.gr_number, s.class, s.section, s.parent_phone, s.father_name,
             s.family_code, s.photo
      FROM fee_challans f
      JOIN students s ON f.student_id = s.id AND s.school_id = f.school_id
      WHERE f.id = $1
      ${supportsTenant && req.user?.role !== 'super_admin' ? 'AND f.school_id = $2' : ''}
    `
    const params = supportsTenant && req.user?.role !== 'super_admin'
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
    res.status(500).json({ success: false, message: err.message })
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
    if (status)     { sql += ` AND f.status = $${i++}`;      params.push(status) }
    if (month)      { sql += ` AND f.month = $${i++}`;       params.push(month) }
    if (year)       { sql += ` AND f.year = $${i++}`;        params.push(year) }
    if (cls)        { sql += ` AND s.class = $${i++}`;       params.push(cls) }
    if (student_id) { sql += ` AND f.student_id = $${i++}`;  params.push(student_id) }
    sql += ' ORDER BY f.created_at DESC'

    const result = await query(sql, params)
    res.json({ success: true, count: result.rowCount, data: result.rows })
  } catch (err) {
    console.error('Fee list error:', err.message)
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    console.warn('PostgreSQL offline. Returning high-fidelity mock fee challans.');
    const mockChallans = [
      {
        id: 1,
        challan_no: 'CH-26051901',
        student_id: 1,
        month: 'May',
        year: 2026,
        amount: 3500.00,
        paid_amount: 3500.00,
        discount: 0.00,
        status: 'paid',
        payment_mode: 'cash',
        paid_date: '2026-05-10T00:00:00.000Z',
        due_date: '2026-05-15T00:00:00.000Z',
        created_by: 'Ahmed Raza',
        created_at: '2026-05-01T10:00:00.000Z',
        name: 'Muhammad Ali',
        gr_number: 'GR-1001',
        class: '10',
        section: 'A',
        parent_phone: '03001234567',
        proof_status: 'approved'
      },
      {
        id: 2,
        challan_no: 'CH-26051902',
        student_id: 2,
        month: 'May',
        year: 2026,
        amount: 3500.00,
        paid_amount: 0.00,
        discount: 500.00,
        status: 'unpaid',
        payment_mode: null,
        paid_date: null,
        due_date: '2026-05-15T00:00:00.000Z',
        created_by: 'Ahmed Raza',
        created_at: '2026-05-01T10:05:00.000Z',
        name: 'Ayesha Fatima',
        gr_number: 'GR-1002',
        class: '10',
        section: 'A',
        parent_phone: '03007654321',
        proof_status: 'none'
      },
      {
        id: 3,
        challan_no: 'CH-26051903',
        student_id: 3,
        month: 'May',
        year: 2026,
        amount: 3000.00,
        paid_amount: 1500.00,
        discount: 0.00,
        status: 'partial',
        payment_mode: 'online',
        paid_date: '2026-05-12T00:00:00.000Z',
        due_date: '2026-05-15T00:00:00.000Z',
        created_by: 'Ahmed Raza',
        created_at: '2026-05-01T10:10:00.000Z',
        name: 'Zainab Bibi',
        gr_number: 'GR-1003',
        class: '9',
        section: 'B',
        parent_phone: '03009988776',
        proof_status: 'none'
      }
    ];
    let filtered = mockChallans;
    const { class: cls, status, month: reqMonth, student_id } = req.query;
    if (status) filtered = filtered.filter(f => f.status === status);
    if (reqMonth) filtered = filtered.filter(f => f.month === reqMonth);
    if (cls) filtered = filtered.filter(f => f.class === cls);
    if (student_id) filtered = filtered.filter(f => f.student_id === Number(student_id));
    return res.json({ success: true, count: filtered.length, data: filtered });
  }
})

// POST /api/fees
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    try {
      await ensureFeePaymentColumns()
      await ensureFeeSystemSchema()
    } catch (e) {
      console.warn('Skipping column verification due to offline db');
    }
    await tenantClause(req)
    const { student_id, month, year, amount, due_date, created_by, discount, previous_arrears = 0 } = req.body
    const challan_no = `CH-${Date.now().toString().slice(-8)}`
    const schoolId = currentSchoolId(req)

    const supportsTenant = await hasColumn('fee_challans', 'school_id').catch(() => false)
    const duplicateSql = supportsTenant
      ? `
        SELECT id FROM fee_challans
        WHERE student_id = $1 AND month = $2 AND year = $3 AND school_id = $4
        LIMIT 1
      `
      : `
        SELECT id FROM fee_challans
        WHERE student_id = $1 AND month = $2 AND year = $3
        LIMIT 1
      `
    const duplicateParams = supportsTenant
      ? [student_id, month, year, currentSchoolId(req)]
      : [student_id, month, year]
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
      `SELECT id, class, section FROM students WHERE id = $1 ${supportsTenant ? 'AND school_id = $2' : ''} LIMIT 1`,
      supportsTenant ? [student_id, schoolId] : [student_id]
    )
    if (!studentResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Student not found for this challan.' })
    }

    const student = studentResult.rows[0]
    const session = String(year || '2026') === '2026' ? '2026-2027' : `${year}-${Number(year) + 1}`
    const configuredMonthly = await getClassMonthlyFee(schoolId, student.class, session)
    const monthlyFee = asMoney(amount || configuredMonthly)
    const arrears = previous_arrears !== undefined ? asMoney(previous_arrears) : await calculatePreviousArrears(student_id, schoolId, supportsTenant)
    const autoDiscount = discount === undefined || discount === null || discount === ''
      ? await calculateAutoDiscount({ studentId: Number(student_id), schoolId, className: student.class, session, baseAmount: monthlyFee })
      : { packageId: null, label: null, amount: 0, siblingCount: 1 }
    const finalDiscount = discount === undefined || discount === null || discount === ''
      ? autoDiscount.amount
      : asMoney(discount)
    const grossTotal = Math.max(0, monthlyFee + arrears - finalDiscount)
    const remainingBalance = grossTotal
    const creatorId = Number.isFinite(Number(created_by)) ? Number(created_by) : (req.user?.id || null)

    const result = supportsTenant
      ? await query(`
        INSERT INTO fee_challans (
          school_id, challan_no, student_id, month, year, amount, due_date, created_by,
          discount, monthly_fee, previous_arrears, gross_total, remaining_balance,
          discount_package_id, discount_label
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *
      `, [
        schoolId, challan_no, student_id, month, year, grossTotal, due_date, creatorId,
        finalDiscount, monthlyFee, arrears, grossTotal, remainingBalance,
        autoDiscount.packageId, autoDiscount.label,
      ])
      : await query(`
        INSERT INTO fee_challans (
          challan_no, student_id, month, year, amount, due_date, created_by,
          discount, monthly_fee, previous_arrears, gross_total, remaining_balance,
          discount_package_id, discount_label
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *
      `, [
        challan_no, student_id, month, year, grossTotal, due_date, creatorId,
        finalDiscount, monthlyFee, arrears, grossTotal, remainingBalance,
        autoDiscount.packageId, autoDiscount.label,
      ])

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
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Fee challan could not be created.' })
    }
    console.warn('PostgreSQL offline. Simulating successful fee challan creation (Mock Fallback).');
    const { student_id, month, year, amount, due_date, created_by, discount = 0 } = req.body
    const challan_no = `CH-${Date.now().toString().slice(-8)}`
    const mockCreated = {
      id: Math.floor(Math.random() * 1000) + 100,
      challan_no,
      student_id: Number(student_id),
      month,
      year: Number(year),
      amount: Number(amount),
      paid_amount: 0.00,
      discount: Number(discount) || 0,
      status: 'unpaid',
      due_date,
      created_by,
      created_at: new Date().toISOString()
    }
    return res.status(201).json({ success: true, message: 'Challan ban gaya (Mock Fallback)', data: mockCreated })
  }
})

// POST /api/fees/bulk
router.post('/bulk', protect, adminOnly, async (req, res) => {
  try {
    try {
      await ensureFeePaymentColumns()
      await ensureFeeSystemSchema()
    } catch (e) {}
    await tenantClause(req)
    const schoolId = currentSchoolId(req)
    const supportsTenant = await hasColumn('fee_challans', 'school_id').catch(() => false)
    const { class: className, month, year, due_date } = req.body
    
    if (!className || !month || !year) {
      return res.status(400).json({ success: false, message: 'class, month, and year are required' })
    }

    const studentsResult = await query(
      `SELECT id, class, section FROM students WHERE class = $1 AND is_active = true ${supportsTenant ? 'AND school_id = $2' : ''}`,
      supportsTenant ? [className, schoolId] : [className]
    )
    
    let generatedCount = 0
    let skippedCount = 0
    const session = String(year || '2026') === '2026' ? '2026-2027' : `${year}-${Number(year) + 1}`
    const configuredMonthly = await getClassMonthlyFee(schoolId, className, session)

    for (const student of studentsResult.rows) {
      const duplicateSql = supportsTenant
        ? `SELECT id FROM fee_challans WHERE student_id = $1 AND month = $2 AND year = $3 AND school_id = $4 LIMIT 1`
        : `SELECT id FROM fee_challans WHERE student_id = $1 AND month = $2 AND year = $3 LIMIT 1`
      const duplicateParams = supportsTenant
        ? [student.id, month, year, schoolId]
        : [student.id, month, year]
      const duplicate = await query(duplicateSql, duplicateParams)
      
      if (duplicate.rows.length) {
        skippedCount++
        continue
      }

      const challan_no = `CH-${Date.now().toString().slice(-8)}-${student.id}`
      const arrears = await calculatePreviousArrears(student.id, schoolId, supportsTenant)
      const monthlyFee = asMoney(configuredMonthly)
      
      const autoDiscount = await calculateAutoDiscount({ studentId: student.id, schoolId, className: student.class, session, baseAmount: monthlyFee })
      const finalDiscount = autoDiscount.amount
      const grossTotal = Math.max(0, monthlyFee + arrears - finalDiscount)
      const remainingBalance = grossTotal
      const creatorId = req.user?.id || null

      const result = supportsTenant
        ? await query(`
          INSERT INTO fee_challans (
            school_id, challan_no, student_id, month, year, amount, due_date, created_by,
            discount, monthly_fee, previous_arrears, gross_total, remaining_balance,
            discount_package_id, discount_label
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id
        `, [
          schoolId, challan_no, student.id, month, year, grossTotal, due_date, creatorId,
          finalDiscount, monthlyFee, arrears, grossTotal, remainingBalance,
          autoDiscount.packageId, autoDiscount.label,
        ])
        : await query(`
          INSERT INTO fee_challans (
            challan_no, student_id, month, year, amount, due_date, created_by,
            discount, monthly_fee, previous_arrears, gross_total, remaining_balance,
            discount_package_id, discount_label
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id
        `, [
          challan_no, student.id, month, year, grossTotal, due_date, creatorId,
          finalDiscount, monthlyFee, arrears, grossTotal, remainingBalance,
          autoDiscount.packageId, autoDiscount.label,
        ])

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

// PUT /api/fees/:id â€” edit challan (amount, due date, discount)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    await ensureFeePaymentColumns()
    await ensureFeeSystemSchema(currentSchoolId(req))
    const { amount, monthly_fee, previous_arrears, due_date, discount, month, year, challan_no } = req.body
    const supportsTenant = await hasColumn('fee_challans', 'school_id').catch(() => false)
    const monthly = amount !== undefined ? asMoney(amount) : monthly_fee !== undefined ? asMoney(monthly_fee) : null
    const arrears = previous_arrears !== undefined ? asMoney(previous_arrears) : null
    const disc = discount !== undefined ? asMoney(discount) : null
    const sql = `
      UPDATE fee_challans SET
        challan_no = COALESCE($1, challan_no),
        amount = COALESCE($2, amount),
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
      WHERE id = $8
      ${supportsTenant && req.user?.role !== 'super_admin' ? 'AND school_id = $9' : ''}
      RETURNING *
    `
    const params = supportsTenant && req.user?.role !== 'super_admin'
      ? [challan_no || null, monthly, arrears, disc, due_date || null, month || null, year ? Number(year) : null, req.params.id, currentSchoolId(req)]
      : [challan_no || null, monthly, arrears, disc, due_date || null, month || null, year ? Number(year) : null, req.params.id]
    const result = await query(sql, params)
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Challan not found' })
    res.json({ success: true, message: 'Challan updated', data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/fees/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const supportsTenant = await hasColumn('fee_challans', 'school_id').catch(() => false)
    const sql = supportsTenant && req.user?.role !== 'super_admin'
      ? 'DELETE FROM fee_challans WHERE id = $1 AND school_id = $2 RETURNING id'
      : 'DELETE FROM fee_challans WHERE id = $1 RETURNING id'
    const params = supportsTenant && req.user?.role !== 'super_admin'
      ? [req.params.id, currentSchoolId(req)]
      : [req.params.id]
    const result = await query(sql, params)
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Challan not found' })
    res.json({ success: true, message: 'Challan deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/fees/:id/regenerate â€” replace challan amounts (same period)
router.post('/:id/regenerate', protect, adminOnly, async (req, res) => {
  try {
    const { amount, discount, due_date } = req.body
    const supportsTenant = await hasColumn('fee_challans', 'school_id').catch(() => false)
    const gross = asMoney(amount)
    const disc = asMoney(discount)
    const remaining = Math.max(0, gross - disc)
    const challan_no = `CH-${Date.now().toString().slice(-8)}`
    const sql = `
      UPDATE fee_challans SET
        challan_no = $1,
        amount = $2,
        monthly_fee = $2,
        gross_total = $3,
        remaining_balance = $3,
        discount = $4,
        due_date = COALESCE($5, due_date),
        status = CASE WHEN paid_amount > 0 THEN status ELSE 'unpaid' END,
        updated_at = NOW()
      WHERE id = $6
      ${supportsTenant && req.user?.role !== 'super_admin' ? 'AND school_id = $7' : ''}
      RETURNING *
    `
    const params = supportsTenant && req.user?.role !== 'super_admin'
      ? [challan_no, gross, remaining, disc, due_date || null, req.params.id, currentSchoolId(req)]
      : [challan_no, gross, remaining, disc, due_date || null, req.params.id]
    const result = await query(sql, params)
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Challan not found' })
    res.json({ success: true, message: 'Challan regenerated', data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/fees/:id/upload-proof â€” parent submits payment screenshot
router.post('/:id/upload-proof', protect, async (req, res) => {
  try {
    try {
      await ensureFeePaymentColumns()
      await ensureFeeSystemSchema()
    } catch (e) {
      console.warn('Skipping column verification due to offline db');
    }
    const { proof_image, proof_amount, proof_method } = req.body
    if (!proof_image) return res.status(400).json({ success: false, message: 'Screenshot required' })
    if (Buffer.byteLength(proof_image, 'utf8') > 5 * 1024 * 1024)
      return res.status(400).json({ success: false, message: 'Image too large (max 5MB)' })

    const supportsTenant = await hasColumn('fee_challans', 'school_id').catch(() => false)
    const role = String(req.user?.role || '').toLowerCase()
    const userId = req.user?.id || null
    if (!canManageFeeRecord(req) && !['parent', 'student'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only admins, parents, or students can submit fee proofs.' })
    }
    const scopedUserFilter = !canManageFeeRecord(req) && ['parent', 'student'].includes(role)
      ? `AND EXISTS (
           SELECT 1
           FROM students s
           WHERE s.id = fee_challans.student_id
             AND s.school_id = fee_challans.school_id
             AND (
               ($${supportsTenant && req.user?.role !== 'super_admin' ? 6 : 5}::text = 'parent' AND s.parent_user_id = $${supportsTenant && req.user?.role !== 'super_admin' ? 7 : 6})
               OR
               ($${supportsTenant && req.user?.role !== 'super_admin' ? 6 : 5}::text = 'student' AND s.student_user_id = $${supportsTenant && req.user?.role !== 'super_admin' ? 7 : 6})
             )
         )`
      : ''
    const sql = `
      UPDATE fee_challans
      SET proof_image = $1, proof_amount = $2, proof_method = $3,
          proof_status = 'pending', proof_submitted_at = NOW(), updated_at = NOW()
      WHERE id = $4
      ${supportsTenant && req.user?.role !== 'super_admin' ? 'AND school_id = $5' : ''}
      ${scopedUserFilter}
      RETURNING id, proof_status, proof_submitted_at
    `
    const params = supportsTenant && req.user?.role !== 'super_admin'
      ? [proof_image, proof_amount || null, proof_method || null, req.params.id, currentSchoolId(req)]
      : [proof_image, proof_amount || null, proof_method || null, req.params.id]
    if (scopedUserFilter) {
      params.push(role, userId)
    }
    const result = await query(sql, params)

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Fee challan not found' })

    res.json({ success: true, message: 'Proof submitted. Admin will verify soon.', data: result.rows[0] })
  } catch (err) {
    console.error('Proof upload error:', err.message)
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Proof could not be submitted.' })
    }
    console.warn('PostgreSQL offline. Simulating screenshot proof upload (Mock Fallback).');
    return res.json({
      success: true,
      message: 'Proof submitted. Admin will verify soon. (Mock Fallback)',
      data: {
        id: Number(req.params.id) || 1,
        proof_status: 'pending',
        proof_submitted_at: new Date().toISOString()
      }
    })
  }
})

// PUT /api/fees/:id/approve-proof â€” admin approves or rejects screenshot
router.put('/:id/approve-proof', protect, adminOnly, async (req, res) => {
  try {
    try {
      await ensureFeePaymentColumns()
    } catch (e) {
      console.warn('Skipping column verification due to offline db');
    }
    const { action } = req.body  // 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ success: false, message: 'action must be approve or reject' })

    const supportsTenant = await hasColumn('fee_challans', 'school_id').catch(() => false)
    const tenantFilter = supportsTenant && req.user?.role !== 'super_admin'
      ? 'AND school_id = $2'
      : ''
    const params = supportsTenant && req.user?.role !== 'super_admin'
      ? [req.params.id, currentSchoolId(req)]
      : [req.params.id]

    if (action === 'approve') {
      const result = await query(`
        UPDATE fee_challans
        SET status = 'paid',
            paid_amount = COALESCE(proof_amount, gross_total, GREATEST(amount - COALESCE(discount, 0), 0)),
            remaining_balance = GREATEST(COALESCE(gross_total, GREATEST(amount - COALESCE(discount, 0), 0)) - COALESCE(proof_amount, gross_total, GREATEST(amount - COALESCE(discount, 0), 0)), 0),
            payment_mode = COALESCE(proof_method, 'online'),
            paid_date = CURRENT_DATE,
            proof_status = 'approved',
            updated_at = NOW()
        WHERE id = $1 ${tenantFilter}
        RETURNING *
      `, params)
      if (!result.rows.length) return res.status(404).json({ success: false, message: 'Fee challan not found' })
      return res.json({ success: true, message: 'Fee approved and marked as paid', data: result.rows[0] })
    } else {
      const result = await query(`
        UPDATE fee_challans
        SET proof_status = 'rejected', proof_image = NULL, updated_at = NOW()
        WHERE id = $1 ${tenantFilter}
        RETURNING id, proof_status
      `, params)
      if (!result.rows.length) return res.status(404).json({ success: false, message: 'Fee challan not found' })
      return res.json({ success: true, message: 'Proof rejected', data: result.rows[0] })
    }
  } catch (err) {
    console.error('Proof approval/rejection error:', err.message)
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Proof could not be updated.' })
    }
    console.warn('PostgreSQL offline. Simulating proof approval/rejection (Mock Fallback).');
    const { action } = req.body
    if (action === 'approve') {
      return res.json({
        success: true,
        message: 'Fee approved and marked as paid (Mock Fallback)',
        data: {
          id: Number(req.params.id) || 1,
          status: 'paid',
          proof_status: 'approved',
          updated_at: new Date().toISOString()
        }
      })
    } else {
      return res.json({
        success: true,
        message: 'Proof rejected (Mock Fallback)',
        data: {
          id: Number(req.params.id) || 1,
          proof_status: 'rejected'
        }
      })
    }
  }
})

// GET /api/fees/pending-proofs â€” admin reviews submitted screenshots
router.get('/pending-proofs', protect, adminOnly, async (req, res) => {
  try {
    try {
      await ensureFeePaymentColumns()
    } catch (e) {
      console.warn('Skipping column verification due to offline db');
    }
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
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    console.warn('PostgreSQL offline. Returning empty pending-proofs list (Mock Fallback).');
    return res.json({ success: true, count: 0, data: [] })
  }
})

// PUT /api/fees/:id/pay
router.put('/:id/pay', protect, adminOnly, async (req, res) => {
  try {
    try {
      await ensureFeePaymentColumns()
    } catch (e) {
      console.warn('Skipping column verification due to offline db');
    }
    await tenantClause(req)
    const { paid_amount, payment_mode = 'cash', discount = 0, payment_note = null } = req.body
    const paid = Number(paid_amount)
    const disc = Number(discount) || 0
    if (!Number.isFinite(paid) || paid < 0) {
      return res.status(400).json({ success: false, message: 'Valid paid amount is required' })
    }
    if (disc < 0) {
      return res.status(400).json({ success: false, message: 'Discount cannot be negative' })
    }
    const supportsTenant = await hasColumn('fee_challans', 'school_id').catch(() => false)
    const result = await query(`
      UPDATE fee_challans
      SET paid_amount=$1,
          payment_mode=$2,
          discount=$4,
          payment_note=$5,
          gross_total=GREATEST(COALESCE(monthly_fee, amount, 0) + COALESCE(previous_arrears, 0) - $4, 0),
          remaining_balance=GREATEST(GREATEST(COALESCE(monthly_fee, amount, 0) + COALESCE(previous_arrears, 0) - $4, 0) - $1, 0),
          status=CASE
            WHEN $1 <= 0 THEN 'unpaid'
            WHEN $1 < GREATEST(COALESCE(monthly_fee, amount, 0) + COALESCE(previous_arrears, 0) - $4, 0) THEN 'partial'
            ELSE 'paid'
          END,
          paid_date=CASE WHEN $1 > 0 THEN CURRENT_DATE ELSE NULL END,
          updated_at=NOW()
      WHERE id=$3
        ${supportsTenant && req.user?.role !== 'super_admin' ? 'AND school_id = $6' : ''}
      RETURNING *
    `, supportsTenant && req.user?.role !== 'super_admin'
      ? [paid, payment_mode, req.params.id, disc, payment_note, currentSchoolId(req)]
      : [paid, payment_mode, req.params.id, disc, payment_note])

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Fee challan not found' })

    res.json({ success: true, message: 'Fee paid mark ho gayi', data: result.rows[0] })
  } catch (err) {
    console.error('Fee payment error:', err.message)
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Payment could not be recorded.' })
    }
    console.warn('PostgreSQL offline. Simulating payment update (Mock Fallback).');
    const { paid_amount, payment_mode = 'cash', discount = 0, payment_note = null } = req.body
    const paid = Number(paid_amount)
    const disc = Number(discount) || 0
    const status = paid <= 0 ? 'unpaid' : paid < Math.max(3500 - disc, 0) ? 'partial' : 'paid'
    return res.json({
      success: true,
      message: 'Fee paid mark ho gayi (Mock Fallback)',
      data: {
        id: Number(req.params.id) || 1,
        paid_amount: paid,
        payment_mode,
        discount: disc,
        payment_note,
        status,
        paid_date: paid > 0 ? new Date().toISOString().split('T')[0] : null,
        updated_at: new Date().toISOString()
      }
    })
  }
})

module.exports = router


const crypto = require('crypto')
const express = require('express')
const router  = express.Router()
const { pool, query } = require('../config/database')
const auth = require('../middleware/auth')
const protect = auth.protect
const adminOnly = auth.adminOnly
const hasServiceScope = auth.hasServiceScope || (() => true)
const requireScopeForServiceOnly = auth.requireScopeForServiceOnly || (() => (req, res, next) => next())
const { tenantClause, currentSchoolId, currentTenantId, hasColumn } = require('../middleware/tenant')
const { validateSameTenantOrThrow } = require('../services/tenantCredentialGuard')
const { ensureStudentFeeProfileSchema, upsertStudentFeeProfile, getStudentFeeProfile, findExistingChallan } = require('../services/feeChallanService')
const { resolveAcademicAssignment } = require('../services/academicAssignmentGuard')
const { provisionPortalUser, resetPortalUserPassword, setPortalUserActive } = require('../services/portalAccountService')
const STUDENT_ADMIN_ROLES = new Set(['super_admin', 'admin', 'principal', 'school_admin', 'accountant', 'teacher'])

async function requireStudentWriteContext(req, res) {
  const schoolId = currentSchoolId(req)
  if (!schoolId) {
    res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'A school context is required for student changes.' })
    return null
  }
  if (!(await hasColumn('students', 'school_id').catch(() => false))) {
    res.status(503).json({ success: false, code: 'STUDENT_TENANT_SCHEMA_REQUIRED', message: 'Student storage is not tenant-safe for writes.' })
    return null
  }
  return schoolId
}

const CLASS_ALIASES = {
  starter: 'Starter',
  mover: 'Mover',
  flyer: 'Flyer',
  one: 'One',
  two: 'Two',
  three: 'Three',
  four: 'Four',
  five: 'Five',
  six: 'Six',
  seven: 'Seven',
  eight: 'Eight',
  'pre nine': 'Pre Nine',
  'hifaz class': 'Hifaz Class',
}

function normalizeClassName(value) {
  const raw = String(value || '').trim()
  if (!raw || raw === 'All Classes' || raw === 'All') return raw
  const key = raw.toLowerCase().replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
  return CLASS_ALIASES[key] || raw
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(-10)
}

function normalizeDate(value) {
  if (!value) return ''
  return String(value).split('T')[0]
}

function duplicateKey(student = {}) {
  const schoolId = student.school_id || 'default'
  const gr = String(student.gr_number || '').trim().toLowerCase()
  if (gr) return `${schoolId}:gr:${gr}`

  const name = normalizeText(student.name)
  const father = normalizeText(student.father_name)
  const dob = normalizeDate(student.date_of_birth)
  const phone = normalizePhone(student.parent_phone || student.parent_whatsapp)
  return `${schoolId}:identity:${name}|${father}|${dob}|${phone}`
}

function hasMoreCompleteStudentData(candidate = {}, current = {}) {
  const fields = [
    'name',
    'father_name',
    'mother_name',
    'class',
    'section',
    'roll_number',
    'date_of_birth',
    'gender',
    'address',
    'parent_phone',
    'parent_whatsapp',
    'photo',
    'family_code',
    'father_cnic',
  ]
  const candidateScore = fields.reduce((score, field) => score + (candidate[field] ? 1 : 0), 0)
  const currentScore = fields.reduce((score, field) => score + (current[field] ? 1 : 0), 0)
  if (candidateScore !== currentScore) return candidateScore > currentScore
  return Number(candidate.id || 0) > Number(current.id || 0)
}

function dedupeStudents(rows = []) {
  const byKey = new Map()
  rows.forEach(row => {
    const key = duplicateKey(row)
    const current = byKey.get(key)
    if (!current || hasMoreCompleteStudentData(row, current)) {
      byKey.set(key, row)
    }
  })
  return Array.from(byKey.values()).sort((a, b) => {
    const classCompare = String(a.class || '').localeCompare(String(b.class || ''), undefined, { numeric: true })
    if (classCompare !== 0) return classCompare
    return Number(a.roll_number || 0) - Number(b.roll_number || 0)
  })
}

async function requireStudentInCurrentSchool(req, res, studentId) {
  if (req.user?.role === 'super_admin') return true

  const role = String(req.user?.role || '').toLowerCase()
  let sql = 'SELECT id FROM students WHERE id = $1 AND school_id = $2'
  const params = [studentId, currentSchoolId(req)]
  if (role === 'parent') {
    sql += ' AND parent_user_id = $3'
    params.push(req.user?.id || null)
  } else if (role === 'student') {
    sql += ' AND student_user_id = $3'
    params.push(req.user?.id || null)
  } else if (req.user?.account_type === 'service' && hasServiceScope(req, 'school.students.read')) {
    // tenantClause/RLS already limits the service to its authenticated school.
  } else if (!STUDENT_ADMIN_ROLES.has(role)) {
    sql += ' AND 1=0'
  }
  sql += ' LIMIT 1'
  const result = await query(sql, params)
  if (result.rowCount > 0) return true

  res.status(404).json({ success: false, message: 'Student nahi mila' })
  return false
}

function scopedStudentReadClause(req, alias = '', startIndex = 1) {
  const role = String(req.user?.role || '').toLowerCase()
  const prefix = alias ? `${alias}.` : ''
  if (STUDENT_ADMIN_ROLES.has(role)) return { clause: '', params: [], nextIndex: startIndex }
  if (req.user?.account_type === 'service' && hasServiceScope(req, 'school.students.read')) return { clause: '', params: [], nextIndex: startIndex }
  if (role === 'parent') {
    return { clause: ` AND ${prefix}parent_user_id = $${startIndex}`, params: [req.user?.id || null], nextIndex: startIndex + 1 }
  }
  if (role === 'student') {
    return { clause: ` AND ${prefix}student_user_id = $${startIndex}`, params: [req.user?.id || null], nextIndex: startIndex + 1 }
  }
  return { clause: ' AND 1=0', params: [], nextIndex: startIndex }
}

// GET /api/students
router.get('/', protect, requireScopeForServiceOnly('school.students.read'), async (req, res) => {
  try {
    const { class: cls, section, search, active = 'all' } = req.query
    const activeValue = String(active).trim().toLowerCase()
    let sql    = 'SELECT * FROM students WHERE 1=1'
    let params = []
    let i = 1

    if (activeValue === 'true' || activeValue === 'active' || activeValue === '1') {
      sql += ` AND is_active = true`
    } else if (activeValue === 'false' || activeValue === 'inactive' || activeValue === '0') {
      sql += ` AND is_active = false`
    }

    const tenant = await tenantClause(req, { table: 'students', paramIndex: i })
    sql += tenant.clause
    params.push(...tenant.params)
    i = tenant.nextIndex
    const readScope = scopedStudentReadClause(req, '', i)
    sql += readScope.clause
    params.push(...readScope.params)
    i = readScope.nextIndex

    if (cls)     { sql += ` AND class = $${i++}`;   params.push(normalizeClassName(cls)) }
    if (section) { sql += ` AND section = $${i++}`; params.push(section) }
    if (search)  {
      sql += ` AND (name ILIKE $${i} OR gr_number ILIKE $${i} OR father_name ILIKE $${i} OR COALESCE(roll_number::text, '') ILIKE $${i} OR COALESCE(father_cnic, '') ILIKE $${i} OR COALESCE(b_form, '') ILIKE $${i} OR COALESCE(parent_phone, '') ILIKE $${i} OR COALESCE(family_code, '') ILIKE $${i})`
      params.push(`%${search}%`); i++
    }
    sql += ' ORDER BY class, roll_number'

    const result = await query(sql, params)
    const students = dedupeStudents(result.rows)
    res.json({ success: true, count: students.length, total_rows: result.rowCount, data: students })
  } catch (err) {
    console.error('Student list error:', err.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
  }
})

// GET /api/students/:id/fee-profile
router.get('/:id/fee-profile', protect, requireScopeForServiceOnly('school.fees.read'), async (req, res) => {
  try {
    const studentId = Number(req.params.id)
    if (!(await requireStudentInCurrentSchool(req, res, studentId))) return
    const profile = await getStudentFeeProfile(studentId, currentSchoolId(req))
    res.json({ success: true, data: profile })
  } catch (err) {
    console.error('Student fee profile load error:', err.message)
    res.status(500).json({ success: false, message: 'Student fee profile could not be loaded.' })
  }
})

// PUT /api/students/:id/fee-profile
router.put('/:id/fee-profile', protect, adminOnly, async (req, res) => {
  try {
    const studentId = Number(req.params.id)
    if (!(await requireStudentInCurrentSchool(req, res, studentId))) return
    const schoolId = currentSchoolId(req)
    await upsertStudentFeeProfile(studentId, schoolId, req.body || {})
    const profile = await getStudentFeeProfile(studentId, schoolId)
    res.json({ success: true, message: 'Fee profile saved', data: profile })
  } catch (err) {
    console.error('Student fee profile save error:', err.message)
    res.status(500).json({ success: false, message: 'Student fee profile could not be saved.' })
  }
})

// GET /api/students/family-search?code=FAM-XXXX
router.get('/family-search', protect, adminOnly, async (req, res) => {
  try {
    const { code, phone, cnic } = req.query
    if (!code && !phone && !cnic) {
      return res.status(400).json({ success: false, message: 'Please provide family code, phone, or CNIC to search' })
    }

    const schoolId = currentSchoolId(req)
    const tenant = await tenantClause(req, { table: 'students', paramIndex: 1 })

    let sql = `SELECT * FROM students WHERE is_active = true`
    const params = []
    let i = 1
    sql += tenant.clause
    params.push(...tenant.params)
    i = tenant.nextIndex

    if (code) {
      sql += ` AND family_code ILIKE $${i++}`
      params.push(`%${code.trim()}%`)
    } else if (phone) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10)
      sql += ` AND regexp_replace(COALESCE(parent_phone,''), '[^0-9]', '', 'g') LIKE $${i++}`
      params.push(`%${cleanPhone}`)
    } else if (cnic) {
      sql += ` AND father_cnic ILIKE $${i++}`
      params.push(`%${cnic.trim()}%`)
    }
    sql += ' ORDER BY class, roll_number'

    const result = await query(sql, params)
    const students = result.rows

    if (!students.length) {
      return res.json({ success: true, count: 0, data: [], message: 'No students found for this family' })
    }

    // Determine the family code to use for this group
    const familyCodes = [...new Set(students.filter(s => s.family_code).map(s => s.family_code))]
    const familyCode = familyCodes[0] || null

    res.json({
      success: true,
      count: students.length,
      family_code: familyCode,
      data: students,
    })
  } catch (err) {
    console.error('Family search error:', err.message)
    console.error('Family search error:', err.message)
    res.status(500).json({ success: false, message: 'Family search could not be completed.' })
  }
})

// GET /api/students/:id
router.get('/:id', protect, requireScopeForServiceOnly('school.students.read'), async (req, res) => {
  try {
    let sql = 'SELECT * FROM students WHERE id = $1'
    const params = [req.params.id]
    const tenant = await tenantClause(req, { table: 'students', paramIndex: 2 })
    sql += tenant.clause
    params.push(...tenant.params)
    let i = tenant.nextIndex
    const readScope = scopedStudentReadClause(req, '', i)
    sql += readScope.clause
    params.push(...readScope.params)
    i = readScope.nextIndex
    const result = await query(sql, params)
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Student nahi mila' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Student detail error:', err.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
  }
})

// POST /api/students
router.post('/', protect, adminOnly, async (req, res) => {
  let client = null
  let transactionOpen = false
  try {
    const {
      name, father_name, mother_name, class: cls, section,
      roll_number, date_of_birth, gender, address, parent_phone, parent_whatsapp,
      photo, family_code, father_cnic, b_form,
      emergency_contact, previous_school, remarks,
      student_portal_enabled, parent_portal_enabled, send_credentials,
      create_challan, challan_month, challan_due_date,
      monthly_fee, tuition_fee, computer_fee, lab_fee, library_fee, transport_fee, exam_fee, other_charges, admission_fee
    } = req.body

    const schoolId = currentSchoolId(req)
    validateSameTenantOrThrow(req, schoolId)

    // Validate required fields
    if (!name) {
      return res.status(400).json({ success: false, message: 'Student Name zaroori hai' })
    }
    if (!father_name) {
      return res.status(400).json({ success: false, message: 'Father Name zaroori hai' })
    }
    if (!cls) {
      return res.status(400).json({ success: false, message: 'Class select karein' })
    }

    const currentYear = new Date().getFullYear()
    const autoGr = `GR-${currentYear}-${crypto.randomInt(1000, 10000)}`
    const finalGr = req.body.gr_number || autoGr
    const requestedClass = normalizeClassName(cls)
    const requestedSection = section || ''
    const academicAssignment = await resolveAcademicAssignment({
      schoolId,
      className: requestedClass,
      section: requestedSection,
    })
    const normalizedClass = academicAssignment.className
    const normalizedSection = academicAssignment.section

    const studentTenantSafe = await hasColumn('students', 'school_id').catch(() => false)
    if (!studentTenantSafe) {
      return res.status(503).json({ success: false, code: 'STUDENT_TENANT_SCHEMA_REQUIRED', message: 'Student storage is not tenant-safe for admission writes.' })
    }
    if (!schoolId) {
      return res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'A school context is required to admit a student.' })
    }
    await ensureStudentFeeProfileSchema()
    if (create_challan && !(await hasColumn('fee_challans', 'school_id').catch(() => false))) {
      return res.status(503).json({ success: false, code: 'FEE_TENANT_SCHEMA_REQUIRED', message: 'Fee storage is not tenant-safe for creating the first challan.' })
    }

    client = await pool.connect()
    await client.query('BEGIN')
    transactionOpen = true
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`student-roll:${schoolId}:${normalizedClass}:${normalizedSection}`])

    // Calculate Roll Number automatically if not provided
    let finalRollNumber = roll_number
    if (!finalRollNumber) {
      const rollRes = await client.query(
        `SELECT COALESCE(MAX(NULLIF(regexp_replace(roll_number, '[^0-9]', '', 'g'), '')::integer), 0) + 1 AS next_roll
         FROM students
         WHERE class = $1 AND section = $2 AND school_id = $3`,
        [normalizedClass, normalizedSection, schoolId]
      )
      finalRollNumber = String(rollRes.rows[0]?.next_roll || 1)
    }

    const candidateColumns = [
      ['school_id', schoolId],
      ['gr_number', finalGr],
      ['name', name],
      ['father_name', father_name],
      ['mother_name', mother_name || null],
      ['class', normalizedClass],
      ['section', normalizedSection],
      ['roll_number', finalRollNumber],
      ['date_of_birth', date_of_birth || null],
      ['gender', gender || null],
      ['address', address || null],
      ['parent_phone', parent_phone || null],
      ['parent_whatsapp', parent_whatsapp || null],
      ['photo', photo || null],
      ['is_active', true],
      ['family_code', family_code || null],
      ['father_cnic', father_cnic || null],
      ['father_occupation', req.body.father_occupation || null],
      ['locality', req.body.locality || null],
      ['b_form', req.body.b_form || req.body.b_form_number || null],
      ['emergency_contact', emergency_contact || null],
      ['previous_school', previous_school || null],
      ['remarks', remarks || null],
      ['blood_group', req.body.blood_group || null],
      ['religion', req.body.religion || null],
    ]

    const insertCols = []
    const insertVals = []
    const insertPlaceholders = []

    for (const [col, val] of candidateColumns) {
      const colExists = await hasColumn('students', col).catch(() => false)
      if (colExists) {
        insertCols.push(col)
        insertVals.push(val)
        insertPlaceholders.push(`$${insertCols.length}`)
      }
    }

    const sql = `
      INSERT INTO students (${insertCols.join(', ')})
      VALUES (${insertPlaceholders.join(', ')})
      RETURNING *
    `
    const result = await client.query(sql, insertVals)
    const studentData = result.rows[0]
    const studentId = studentData.id

    // Portal accounts are real users, not browser-only credential cards.
    const tenantId = currentTenantId(req) || null
    const studentEmail = `${finalGr.toLowerCase().replace(/[^a-z0-9]/g, '')}@assps.edu.pk`
    const parentDigits = String(parent_phone || parent_whatsapp || '').replace(/\D/g, '').slice(-10)
    const parentEmail = parentDigits ? `${parentDigits}@parents.assps.edu.pk` : null
    const studentPortalEnabled = student_portal_enabled !== false
    const parentPortalEnabled = parent_portal_enabled !== false && Boolean(parentEmail)

    let studentAccount = null
    let parentAccount = null
    if (studentPortalEnabled) {
      studentAccount = await provisionPortalUser({
        schoolId,
        tenantId,
        name: studentData.name,
        email: studentEmail,
        username: finalGr,
        role: 'student',
        designation: 'Student',
        active: true,
        db: client,
      })
    }
    if (parentPortalEnabled) {
      parentAccount = await provisionPortalUser({
        schoolId,
        tenantId,
        name: studentData.father_name || `${studentData.name} Parent`,
        email: parentEmail,
        username: `P-${parentDigits}`,
        role: 'parent',
        designation: 'Parent',
        phone: parent_phone || parent_whatsapp || null,
        active: true,
        db: client,
      })
    }

    const userLinkUpdates = []
    const userLinkParams = []
    let userLinkIndex = 1
    if (studentAccount?.user?.id && await hasColumn('students', 'student_user_id').catch(() => false)) {
      userLinkUpdates.push(`student_user_id = $${userLinkIndex++}`)
      userLinkParams.push(studentAccount.user.id)
    }
    if (parentAccount?.user?.id && await hasColumn('students', 'parent_user_id').catch(() => false)) {
      userLinkUpdates.push(`parent_user_id = $${userLinkIndex++}`)
      userLinkParams.push(parentAccount.user.id)
    }
    if (userLinkUpdates.length) {
      userLinkParams.push(studentId, schoolId)
      await client.query(`
        UPDATE students
        SET ${userLinkUpdates.join(', ')}, updated_at = NOW()
        WHERE id = $${userLinkIndex++} AND school_id = $${userLinkIndex}
      `, userLinkParams)
      if (studentAccount?.user?.id) studentData.student_user_id = studentAccount.user.id
      if (parentAccount?.user?.id) studentData.parent_user_id = parentAccount.user.id
    }

    // Save Fee Profile
    let savedFeeProfile = null
    const rawMonthlyFee = Number(monthly_fee || tuition_fee || 0)
    if (rawMonthlyFee > 0 || computer_fee || lab_fee || library_fee || transport_fee || exam_fee || other_charges || admission_fee) {
      savedFeeProfile = await upsertStudentFeeProfile(studentId, schoolId, {
        monthly_fee: rawMonthlyFee,
        tuition_fee: Number(tuition_fee || rawMonthlyFee || 0),
        computer_fee: Number(computer_fee || 0),
        lab_fee: Number(lab_fee || 0),
        library_fee: Number(library_fee || 0),
        transport_fee: Number(transport_fee || 0),
        exam_fee: Number(exam_fee || 0),
        other_charges: Number(other_charges || 0),
        admission_fee: Number(admission_fee || 0)
      }, client)
    }

    // Generate First Challan if requested
    let firstChallan = null
    if (create_challan) {
      const month = challan_month || new Date().toLocaleString('en-US', { month: 'long' })
      const year = currentYear
      const due_date = challan_due_date || new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
      const discount = 0
      const grossAmount = Math.max(0,
        rawMonthlyFee + (savedFeeProfile
          ? Number(savedFeeProfile.admission_fee || 0)
            + Number(savedFeeProfile.computer_fee || 0)
            + Number(savedFeeProfile.lab_fee || 0)
            + Number(savedFeeProfile.library_fee || 0)
            + Number(savedFeeProfile.transport_fee || 0)
            + Number(savedFeeProfile.exam_fee || 0)
            + Number(savedFeeProfile.other_charges || 0)
          : 0)
      )

      const existing = await findExistingChallan({ studentId, month, year, schoolId, db: client })
      if (existing) {
        firstChallan = existing
      } else {
        const challan_no = `CH-${Date.now().toString().slice(-8)}`
        const ins = await client.query(`
          INSERT INTO fee_challans (school_id, challan_no, student_id, month, year, amount, due_date, created_by, discount, monthly_fee, gross_total, remaining_balance, status)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'unpaid') RETURNING *
        `, [schoolId, challan_no, studentId, month, year, grossAmount, due_date, req.user?.id || null, discount, grossAmount, grossAmount, grossAmount])
        firstChallan = ins.rows[0] || null
      }
    }

    await client.query('COMMIT')
    transactionOpen = false

    res.status(201).json({
      success: true,
      message: firstChallan
        ? 'Student add ho gaya, fee profile save ho gaya aur pehla challan ban gaya'
        : 'Student add ho gaya aur portal accounts sync ho gaye',
      data: studentData,
      fee_profile: savedFeeProfile,
      first_challan: firstChallan,
      credentials: {
        parent: parentAccount ? {
          email: parentAccount.user?.email || parentEmail,
          username: parentAccount.user?.username || `P-${parentDigits}`,
          password: parentAccount.temporaryPassword,
          created: parentAccount.created,
        } : null,
        student: studentAccount ? {
          email: studentAccount.user?.email || studentEmail,
          username: studentAccount.user?.username || finalGr,
          password: studentAccount.temporaryPassword,
          created: studentAccount.created,
        } : null,
      },
      dispatched: false,
      credentialDispatchRequested: Boolean(send_credentials)
    })
  } catch (err) {
    if (transactionOpen && client) await client.query('ROLLBACK').catch(() => {})
    transactionOpen = false
    if (err.code === '23505')
      return res.status(400).json({ success: false, message: 'GR Number already exists' })
    if (err.status === 422)
      return res.status(422).json({ success: false, code: err.code, message: err.message, details: err.details })
    console.error('Student create error:', err.message)
    res.status(500).json({ success: false, message: 'Student could not be created.' })
  } finally {
    client?.release()
  }
})

// GET /api/students/:id/portal-accounts
router.get('/:id/portal-accounts', protect, adminOnly, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const studentId = Number(req.params.id)
    const studentResult = await query(`
      SELECT id, name, father_name, gr_number, parent_phone, parent_whatsapp, student_user_id, parent_user_id
      FROM students
      WHERE id = $1 AND school_id = $2
      LIMIT 1
    `, [studentId, schoolId])
    if (!studentResult.rowCount) return res.status(404).json({ success: false, message: 'Student not found.' })
    const student = studentResult.rows[0]
    const userIds = [student.student_user_id, student.parent_user_id].filter(Boolean)
    let users = []
    if (userIds.length) {
      const supportsUsername = await hasColumn('users', 'username').catch(() => false)
      const supportsLastLogin = await hasColumn('users', 'last_login').catch(() => false)
      const result = await query(`
        SELECT id, name, email, role, designation, is_active
          ${supportsUsername ? ', username' : ''}
          ${supportsLastLogin ? ', last_login' : ''}
        FROM users
        WHERE school_id = $1 AND id = ANY($2::int[])
      `, [schoolId, userIds])
      users = result.rows
    }
    const byId = new Map(users.map(user => [Number(user.id), user]))
    res.json({
      success: true,
      data: {
        student: student.student_user_id ? byId.get(Number(student.student_user_id)) || null : null,
        parent: student.parent_user_id ? byId.get(Number(student.parent_user_id)) || null : null,
      },
    })
  } catch (err) {
    console.error('Student portal accounts read error:', err.message)
    res.status(500).json({ success: false, message: 'Portal accounts could not be loaded.' })
  }
})

async function provisionStudentPortalRole(req, role) {
  const schoolId = currentSchoolId(req)
  const studentId = Number(req.params.id)
  const result = await query(`
    SELECT id, name, father_name, gr_number, parent_phone, parent_whatsapp, student_user_id, parent_user_id
    FROM students
    WHERE id = $1 AND school_id = $2
    LIMIT 1
  `, [studentId, schoolId])
  if (!result.rowCount) {
    const err = new Error('Student not found.')
    err.status = 404
    throw err
  }
  const student = result.rows[0]
  const tenantId = currentTenantId(req) || null
  const gr = String(student.gr_number || '').trim()
  if (role === 'student') {
    const account = await provisionPortalUser({
      schoolId,
      tenantId,
      userId: student.student_user_id || null,
      name: student.name,
      email: `${gr.toLowerCase().replace(/[^a-z0-9]/g, '')}@assps.edu.pk`,
      username: gr,
      role: 'student',
      designation: 'Student',
      active: true,
    })
    if (await hasColumn('students', 'student_user_id').catch(() => false)) {
      await query('UPDATE students SET student_user_id = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3', [account.user.id, studentId, schoolId])
    }
    return account
  }
  const phone = String(student.parent_phone || student.parent_whatsapp || '').replace(/\D/g, '').slice(-10)
  if (!phone) {
    const err = new Error('Parent phone/WhatsApp number is required before creating parent access.')
    err.status = 422
    throw err
  }
  const account = await provisionPortalUser({
    schoolId,
    tenantId,
    userId: student.parent_user_id || null,
    name: student.father_name || `${student.name} Parent`,
    email: `${phone}@parents.assps.edu.pk`,
    username: `P-${phone}`,
    role: 'parent',
    designation: 'Parent',
    phone: student.parent_phone || student.parent_whatsapp,
    active: true,
  })
  if (await hasColumn('students', 'parent_user_id').catch(() => false)) {
    await query('UPDATE students SET parent_user_id = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3', [account.user.id, studentId, schoolId])
  }
  return account
}

router.post('/:id/portal-accounts/:role', protect, adminOnly, async (req, res) => {
  const role = String(req.params.role || '').toLowerCase()
  if (!['student', 'parent'].includes(role)) return res.status(400).json({ success: false, message: 'Role must be student or parent.' })
  try {
    const account = await provisionStudentPortalRole(req, role)
    res.status(account.created ? 201 : 200).json({
      success: true,
      data: account.user,
      credentials: {
        username: account.user?.username || account.user?.email || '',
        email: account.user?.email || '',
        password: account.temporaryPassword,
        created: account.created,
      },
    })
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || 'Portal account could not be provisioned.' })
  }
})

router.post('/:id/portal-accounts/:role/reset', protect, adminOnly, async (req, res) => {
  const role = String(req.params.role || '').toLowerCase()
  if (!['student', 'parent'].includes(role)) return res.status(400).json({ success: false, message: 'Role must be student or parent.' })
  try {
    const schoolId = currentSchoolId(req)
    const linkColumn = role === 'student' ? 'student_user_id' : 'parent_user_id'
    const student = await query(`SELECT ${linkColumn} AS user_id FROM students WHERE id = $1 AND school_id = $2 LIMIT 1`, [Number(req.params.id), schoolId])
    const userId = student.rows[0]?.user_id
    if (!userId) return res.status(404).json({ success: false, message: 'Portal account is not linked yet.' })
    const reset = await resetPortalUserPassword({ schoolId, userId })
    res.json({
      success: true,
      data: reset.user,
      credentials: {
        username: reset.user?.username || reset.user?.email || '',
        email: reset.user?.email || '',
        password: reset.temporaryPassword,
        created: false,
      },
    })
  } catch (err) {
    console.error('Student portal password reset error:', err.message)
    res.status(500).json({ success: false, message: 'Password reset failed.' })
  }
})

router.put('/:id/portal-accounts/:role/active', protect, adminOnly, async (req, res) => {
  const role = String(req.params.role || '').toLowerCase()
  if (!['student', 'parent'].includes(role)) return res.status(400).json({ success: false, message: 'Role must be student or parent.' })
  try {
    const schoolId = currentSchoolId(req)
    const linkColumn = role === 'student' ? 'student_user_id' : 'parent_user_id'
    const student = await query(`SELECT ${linkColumn} AS user_id FROM students WHERE id = $1 AND school_id = $2 LIMIT 1`, [Number(req.params.id), schoolId])
    const userId = student.rows[0]?.user_id
    if (!userId) return res.status(404).json({ success: false, message: 'Portal account is not linked yet.' })
    const user = await setPortalUserActive({ schoolId, userId, active: req.body?.active !== false })
    res.json({ success: true, data: user })
  } catch (err) {
    console.error('Student portal state update error:', err.message)
    res.status(500).json({ success: false, message: 'Portal account state could not be updated.' })
  }
})

router.delete('/:id/portal-accounts/:role', protect, adminOnly, async (req, res) => {
  const role = String(req.params.role || '').toLowerCase()
  if (!['student', 'parent'].includes(role)) return res.status(400).json({ success: false, message: 'Role must be student or parent.' })
  try {
    const schoolId = currentSchoolId(req)
    const linkColumn = role === 'student' ? 'student_user_id' : 'parent_user_id'
    const studentId = Number(req.params.id)
    const student = await query(`SELECT ${linkColumn} AS user_id FROM students WHERE id = $1 AND school_id = $2 LIMIT 1`, [studentId, schoolId])
    const userId = student.rows[0]?.user_id
    if (!userId) return res.status(404).json({ success: false, message: 'Portal account is not linked yet.' })
    await setPortalUserActive({ schoolId, userId, active: false })
    await query(`UPDATE students SET ${linkColumn} = NULL, updated_at = NOW() WHERE id = $1 AND school_id = $2`, [studentId, schoolId])
    res.json({ success: true })
  } catch (err) {
    console.error('Student portal revoke error:', err.message)
    res.status(500).json({ success: false, message: 'Portal access could not be revoked.' })
  }
})

// POST /api/students/bulk-class-assignment — atomic class/section transitions
router.post('/bulk-class-assignment', protect, adminOnly, async (req, res) => {
  const assignments = Array.isArray(req.body?.assignments) ? req.body.assignments : []
  if (!assignments.length || assignments.length > 500) {
    return res.status(422).json({ success: false, message: 'Provide between 1 and 500 student assignments.' })
  }

  const schoolId = currentSchoolId(req)
  const normalized = []
  const seen = new Set()
  try {
    for (const [index, item] of assignments.entries()) {
      const studentId = Number(item?.student_id || item?.id)
      if (!Number.isInteger(studentId) || studentId <= 0) {
        return res.status(422).json({ success:false, message:`Row ${index + 1}: valid student id is required.` })
      }
      if (seen.has(studentId)) {
        return res.status(422).json({ success:false, message:`Row ${index + 1}: duplicate student id.` })
      }
      seen.add(studentId)
      const assignment = await resolveAcademicAssignment({
        schoolId,
        className: normalizeClassName(item?.class),
        section: String(item?.section || '').trim(),
      })
      normalized.push({ studentId, className:assignment.className, section:assignment.section })
    }
  } catch (err) {
    if (err.status === 422) return res.status(422).json({ success:false, code:err.code, message:err.message, details:err.details })
    return res.status(500).json({ success:false, message:'Academic assignment validation failed.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const ids = normalized.map(item => item.studentId)
    const existing = await client.query('SELECT id FROM students WHERE school_id = $1 AND id = ANY($2::int[]) FOR UPDATE', [schoolId, ids])
    if (existing.rowCount !== normalized.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success:false, message:'One or more selected students were not found in this school.' })
    }

    const updated = []
    for (const item of normalized) {
      const result = await client.query(`
        UPDATE students
        SET class = $1, section = $2, updated_at = NOW()
        WHERE id = $3 AND school_id = $4
        RETURNING id, gr_number, name, class, section
      `, [item.className, item.section, item.studentId, schoolId])
      updated.push(result.rows[0])
    }
    await client.query('COMMIT')
    res.json({ success:true, count:updated.length, data:updated, message:`${updated.length} student assignments updated.` })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Bulk student class assignment error:', err.message)
    res.status(500).json({ success:false, message:'Student class assignments could not be updated.' })
  } finally {
    client.release()
  }
})

// PUT /api/students/:id — partial, tenant-safe update
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const schoolId = await requireStudentWriteContext(req, res)
    if (!schoolId) return
    const studentId = Number(req.params.id)
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid student id is required.' })
    }

    const currentResult = await query(
      'SELECT * FROM students WHERE id = $1 AND school_id = $2 LIMIT 1',
      [studentId, schoolId]
    )
    const current = currentResult.rows[0]
    if (!current) return res.status(404).json({ success: false, message: 'Student nahi mila' })

    const body = req.body || {}
    const hasOwn = key => Object.prototype.hasOwnProperty.call(body, key)
    const requestedClassRaw = hasOwn('class') ? body.class : current.class
    const requestedSectionRaw = hasOwn('section') ? body.section : current.section
    let academicAssignment = null
    if (hasOwn('class') || hasOwn('section')) {
      academicAssignment = await resolveAcademicAssignment({
        schoolId: current.school_id || schoolId,
        className: normalizeClassName(requestedClassRaw),
        section: requestedSectionRaw == null ? '' : String(requestedSectionRaw),
      })
    }

    const candidateFields = [
      ['name', 'name'],
      ['father_name', 'father_name'],
      ['mother_name', 'mother_name'],
      ['roll_number', 'roll_number'],
      ['date_of_birth', 'date_of_birth'],
      ['gender', 'gender'],
      ['address', 'address'],
      ['parent_phone', 'parent_phone'],
      ['parent_whatsapp', 'parent_whatsapp'],
      ['photo', 'photo'],
      ['family_code', 'family_code'],
      ['father_cnic', 'father_cnic'],
      ['father_occupation', 'father_occupation'],
      ['locality', 'locality'],
      ['b_form', 'b_form'],
      ['b_form_number', 'b_form'],
      ['emergency_contact', 'emergency_contact'],
      ['previous_school', 'previous_school'],
      ['remarks', 'remarks'],
      ['blood_group', 'blood_group'],
      ['religion', 'religion'],
      ['is_active', 'is_active'],
    ]

    const assignments = []
    const values = []
    const usedColumns = new Set()
    let paramIndex = 1
    const addAssignment = async (column, value) => {
      if (usedColumns.has(column)) return
      if (!(await hasColumn('students', column).catch(() => false))) return
      usedColumns.add(column)
      assignments.push(`${column} = $${paramIndex++}`)
      values.push(value === '' ? null : value)
    }

    for (const [bodyKey, column] of candidateFields) {
      if (hasOwn(bodyKey)) await addAssignment(column, body[bodyKey])
    }
    if (academicAssignment) {
      await addAssignment('class', academicAssignment.className)
      await addAssignment('section', academicAssignment.section)
    }

    if (!assignments.length) {
      return res.json({ success: true, message: 'No student fields changed', data: current })
    }

    assignments.push('updated_at = NOW()')
    values.push(studentId)
    const studentParam = paramIndex++
    values.push(schoolId)
    const schoolParam = paramIndex++
    const where = `id = $${studentParam} AND school_id = $${schoolParam}`

    const result = await query(`
      UPDATE students
      SET ${assignments.join(', ')}
      WHERE ${where}
      RETURNING *
    `, values)

    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Student nahi mila' })
    res.json({ success: true, message: 'Student update ho gaya', data: result.rows[0] })
  } catch (err) {
    if (err.status === 422) {
      return res.status(422).json({ success: false, code: err.code, message: err.message, details: err.details })
    }
    console.error('Student update error:', err.message)
    console.error('Student update error:', err.message)
    res.status(500).json({ success: false, message: 'Student could not be updated.' })
  }
})

// DELETE /api/students/:id — school-scoped deactivate or transactional permanent purge
router.delete('/:id', protect, adminOnly, async (req, res) => {
  const schoolId = await requireStudentWriteContext(req, res)
  if (!schoolId) return
  const studentId = Number(req.params.id)
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid student id is required.' })
  }
  const permanent = req.query.permanent === 'true'

  if (!permanent) {
    try {
      const result = await query(
        'UPDATE students SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2 RETURNING id',
        [studentId, schoolId]
      )
      if (!result.rowCount) return res.status(404).json({ success: false, message: 'Student not found.' })
      return res.json({ success: true, message: 'Student deactivated successfully.' })
    } catch (err) {
      console.error('Student deactivate error:', err.message)
      return res.status(500).json({ success: false, message: 'Student could not be deactivated.' })
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const locked = await client.query(
      'SELECT id, student_user_id, parent_user_id FROM students WHERE id = $1 AND school_id = $2 FOR UPDATE',
      [studentId, schoolId]
    )
    if (!locked.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Student not found.' })
    }

    const cleanup = [
      ['cards', 'student_id'],
      ['notification_log', 'student_id'],
      ['online_exam_attempts', 'student_id'],
      ['exam_results', 'student_id'],
      ['attendance', 'student_id'],
      ['fee_payment_transactions', 'student_id'],
      ['fee_challans', 'student_id'],
      ['student_fee_profiles', 'student_id'],
    ]
    for (const [table, column] of cleanup) {
      if (await hasColumn(table, column).catch(() => false)) {
        await client.query(`DELETE FROM ${table} WHERE ${column} = $1`, [studentId])
      }
    }

    await client.query('DELETE FROM students WHERE id = $1 AND school_id = $2', [studentId, schoolId])
    await client.query('COMMIT')
    return res.json({ success: true, message: 'Student permanently deleted.' })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Permanent student deletion error:', err.message)
    return res.status(500).json({ success: false, message: 'Student could not be permanently deleted.' })
  } finally {
    client.release()
  }
})


// POST /api/students/bulk
router.post('/bulk', protect, adminOnly, async (req, res) => {
  try {
    const { students = [] } = req.body
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty students array.' })
    }

    const schoolId = currentSchoolId(req)
    const validatedAssignments = new Map()
    for (let index = 0; index < students.length; index += 1) {
      const student = students[index]
      if (!student?.name || !student?.class) continue
      const assignment = await resolveAcademicAssignment({
        schoolId,
        className: normalizeClassName(student.class),
        section: student.section || '',
        allowEmptySection: true,
      })
      validatedAssignments.set(index, assignment)
    }

    let imported = 0

    for (let index = 0; index < students.length; index += 1) {
      const student = students[index]
      // Basic validation
      if (!student.name || !student.class) continue

      const name = student.name
      const gr_number = student.gr_number || ''
      const roll_number = student.roll_number || ''
      const assignment = validatedAssignments.get(index)
      const className = assignment?.className || normalizeClassName(student.class)
      const section = assignment?.section || student.section || ''
      const father_name = student.father_name || ''
      const father_cnic = student.father_cnic || ''
      const phone_number = student.phone_number || ''
      const family_code = student.family_code || ''
      const gender = student.gender || 'male'

      const insertSql = `
        INSERT INTO students (school_id, name, gr_number, roll_number, class, section, father_name, father_cnic, phone_number, family_code, gender)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `
      await query(insertSql, [schoolId, name, gr_number, roll_number, className, section, father_name, father_cnic, phone_number, family_code, gender])
      imported++
    }

    res.json({ success: true, message: `Successfully imported ${imported} students.` })
  } catch (err) {
    console.error('Bulk import error:', err.message)
    if (err.status === 422)
      return res.status(422).json({ success: false, code: err.code, message: err.message, details: err.details })
    res.status(500).json({ success: false, message: 'Server error during bulk import' })
  }
})

module.exports = router

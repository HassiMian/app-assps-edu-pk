const express = require('express')
const router  = express.Router()
const { query } = require('../config/database')
const auth = require('../middleware/auth')
const protect = auth.protect
const adminOnly = auth.adminOnly
const hasServiceScope = auth.hasServiceScope || (() => true)
const requireScopeForServiceOnly = auth.requireScopeForServiceOnly || (() => (req, res, next) => next())
const { tenantClause, currentSchoolId, currentTenantId, hasColumn } = require('../middleware/tenant')
const { validateSameTenantOrThrow } = require('../services/tenantCredentialGuard')
const { upsertStudentFeeProfile, getStudentFeeProfile, findExistingChallan } = require('../services/feeChallanService')
const ALLOW_MOCK_FALLBACK = process.env.NODE_ENV !== 'production'
const STUDENT_ADMIN_ROLES = new Set(['super_admin', 'admin', 'principal', 'school_admin', 'accountant', 'teacher'])

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

function studentPortalPassword(student) {
  const father = String(student.father_name || 'Student').trim().replace(/\s+/g, '').slice(0, 4) || 'Stud'
  return `${father}${new Date().getFullYear()}`
}

function parentPortalPassword(student) {
  const phone = String(student.parent_phone || student.parent_whatsapp || '').replace(/\D/g, '').slice(-4) || '0000'
  return `${phone}@${new Date().getFullYear()}`
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
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    console.warn('PostgreSQL offline. Returning high-fidelity mock students.');
    const mockStudents = [
      {
        id: 1,
        school_id: 1,
        gr_number: 'GR-1001',
        name: 'Muhammad Ali',
        father_name: 'Ahmed Khan',
        mother_name: 'Sobia Ahmed',
        class: '10',
        section: 'A',
        roll_number: '1',
        date_of_birth: '2010-05-15',
        gender: 'male',
        address: 'Street 4, Sector G-9, Islamabad',
        parent_phone: '03001234567',
        parent_whatsapp: '03001234567',
        photo: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        school_id: 1,
        gr_number: 'GR-1002',
        name: 'Ayesha Fatima',
        father_name: 'Tariq Mahmood',
        mother_name: 'Fariha Tariq',
        class: '10',
        section: 'A',
        roll_number: '2',
        date_of_birth: '2011-02-20',
        gender: 'female',
        address: 'House 12, Block C, Lahore',
        parent_phone: '03007654321',
        parent_whatsapp: '03007654321',
        photo: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 3,
        school_id: 1,
        gr_number: 'GR-1003',
        name: 'Zainab Bibi',
        father_name: 'Muhammad Asif',
        mother_name: 'Sadia Bibi',
        class: '9',
        section: 'B',
        roll_number: '5',
        date_of_birth: '2012-08-11',
        gender: 'female',
        address: 'Flat 5, Al-Rehman Heights, Karachi',
        parent_phone: '03123456789',
        parent_whatsapp: '03123456789',
        photo: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    let filtered = mockStudents;
    const { class: cls, section, search } = req.query;
    if (cls) filtered = filtered.filter(s => s.class === cls);
    if (section) filtered = filtered.filter(s => s.section === section);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.gr_number.toLowerCase().includes(q) ||
        s.father_name.toLowerCase().includes(q)
      );
    }
    return res.json({ success: true, count: filtered.length, data: filtered });
  }
})

// GET /api/students/:id/fee-profile
router.get('/:id/fee-profile', protect, requireScopeForServiceOnly('school.fees.read'), async (req, res) => {
  try {
    const studentId = Number(req.params.id)
    if (!(await requireStudentInCurrentSchool(req, res, studentId))) return
    const profile = await getStudentFeeProfile(studentId)
    res.json({ success: true, data: profile })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/students/:id/fee-profile
router.put('/:id/fee-profile', protect, adminOnly, async (req, res) => {
  try {
    const studentId = Number(req.params.id)
    if (!(await requireStudentInCurrentSchool(req, res, studentId))) return
    const schoolId = currentSchoolId(req)
    await upsertStudentFeeProfile(studentId, schoolId, req.body || {})
    const profile = await getStudentFeeProfile(studentId)
    res.json({ success: true, message: 'Fee profile saved', data: profile })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
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
    res.status(500).json({ success: false, message: err.message })
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
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    console.warn('PostgreSQL offline. Returning high-fidelity mock student details.');
    const mockStudent = {
      id: req.params.id || 1,
      school_id: 1,
      gr_number: 'GR-1001',
      name: 'Muhammad Ali',
      father_name: 'Ahmed Khan',
      mother_name: 'Sobia Ahmed',
      class: '10',
      section: 'A',
      roll_number: '1',
      date_of_birth: '2010-05-15',
      gender: 'male',
      address: 'Street 4, Sector G-9, Islamabad',
      parent_phone: '03001234567',
      parent_whatsapp: '03001234567',
      photo: null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    return res.json({ success: true, data: mockStudent });
  }
})

// POST /api/students
router.post('/', protect, adminOnly, async (req, res) => {
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
    const autoGr = `GR-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`
    const finalGr = req.body.gr_number || autoGr
    const normalizedClass = normalizeClassName(cls)

    // Calculate Roll Number automatically if not provided
    let finalRollNumber = roll_number
    if (!finalRollNumber) {
      const rollRes = await query(
        `SELECT COALESCE(MAX(NULLIF(regexp_replace(roll_number, '[^0-9]', '', 'g'), '')::integer), 0) + 1 AS next_roll
         FROM students
         WHERE class = $1 AND section = $2 AND school_id = $3`,
        [normalizedClass, section || 'Blue', schoolId]
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
      ['section', section || 'Blue'],
      ['roll_number', finalRollNumber],
      ['date_of_birth', date_of_birth || null],
      ['gender', gender || 'male'],
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
    const result = await query(sql, insertVals)
    const studentData = result.rows[0]
    const studentId = studentData.id

    // Credentials Setup
    const studentEmail = `${finalGr.toLowerCase().replace(/[^a-z0-9]/g, '')}@assps.edu.pk`
    const studentPassword = studentPortalPassword(studentData)
    const parentEmail = (parent_phone || parent_whatsapp) ? `${(parent_phone || parent_whatsapp).replace(/\D/g, '').slice(-10)}@parents.assps.edu.pk` : null
    const parentPassword = parentPortalPassword(studentData)

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
      })
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

      const existing = await findExistingChallan({ studentId, month, year, schoolId })
      if (existing) {
        firstChallan = existing
      } else {
        const challan_no = `CH-${Date.now().toString().slice(-8)}`
        const supportsTenantCh = await hasColumn('fee_challans', 'school_id').catch(() => false)
        const ins = supportsTenantCh
          ? await query(`
            INSERT INTO fee_challans (school_id, challan_no, student_id, month, year, amount, due_date, created_by, discount, monthly_fee, gross_total, remaining_balance, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'unpaid') RETURNING *
          `, [schoolId, challan_no, studentId, month, year, grossAmount, due_date, req.user?.id || null, discount, grossAmount, grossAmount, grossAmount])
          : await query(`
            INSERT INTO fee_challans (challan_no, student_id, month, year, amount, due_date, created_by, discount, monthly_fee, gross_total, remaining_balance, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'unpaid') RETURNING *
          `, [challan_no, studentId, month, year, grossAmount, due_date, req.user?.id || null, discount, grossAmount, grossAmount, grossAmount])
        firstChallan = ins.rows[0] || null
      }
    }

    res.status(201).json({
      success: true,
      message: firstChallan
        ? 'Student add ho gaya, fee profile save ho gaya aur pehla challan ban gaya'
        : 'Student add ho gaya aur credentials generate ho gaye',
      data: studentData,
      fee_profile: savedFeeProfile,
      first_challan: firstChallan,
      credentials: {
        parent: parentEmail ? { email: parentEmail, password: parentPassword } : null,
        student: { email: studentEmail, password: studentPassword }
      },
      dispatched: !!send_credentials
    })
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ success: false, message: 'GR Number already exists' })
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/students/:id
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const {
      name, father_name, mother_name, class: cls, section,
      roll_number, date_of_birth, gender, address, parent_phone, parent_whatsapp, photo,
      family_code, father_cnic, is_active
    } = req.body

    const supportsTenant = await hasColumn('students', 'school_id')
    const sql = `
      UPDATE students SET
        name=$1, father_name=$2, mother_name=$3, class=$4, section=$5,
        roll_number=$6, date_of_birth=$7, gender=$8, address=$9,
        parent_phone=$10, parent_whatsapp=$11, photo=$12,
        family_code=COALESCE($13, family_code),
        father_cnic=COALESCE($14, father_cnic),
        is_active=COALESCE($15, is_active),
        updated_at=NOW()
      WHERE id=$16
        ${supportsTenant && req.user?.role !== 'super_admin' ? 'AND school_id = $17' : ''}
      RETURNING *
    `
    const params = [
      name, father_name, mother_name, normalizeClassName(cls), section || 'Blue', roll_number,
      date_of_birth, gender, address, parent_phone, parent_whatsapp, photo,
      family_code || null, father_cnic || null, is_active !== undefined ? is_active : null,
      req.params.id
    ]
    if (supportsTenant && req.user?.role !== 'super_admin') params.push(currentSchoolId(req))
    const result = await query(sql, params)

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Student nahi mila' })

    res.json({ success: true, message: 'Student update ho gaya', data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/students/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const supportsTenant = await hasColumn('students', 'school_id')
    const permanent = req.query.permanent === 'true'
    const schoolId = currentSchoolId(req)
    const studentId = req.params.id

    if (permanent) {
      // Clean non-cascading foreign keys safely
      await query('DELETE FROM cards WHERE student_id = $1', [studentId]).catch(() => {})
      await query('DELETE FROM notification_log WHERE student_id = $1', [studentId]).catch(() => {})
      await query('DELETE FROM online_exam_attempts WHERE student_id = $1', [studentId]).catch(() => {})

      const sql = supportsTenant && req.user?.role !== 'super_admin'
        ? 'DELETE FROM students WHERE id = $1 AND school_id = $2'
        : 'DELETE FROM students WHERE id = $1'
      const params = supportsTenant && req.user?.role !== 'super_admin'
        ? [studentId, schoolId]
        : [studentId]
      await query(sql, params)
      return res.json({ success: true, message: 'Student permanently delete ho gaya' })
    }

    const sql = supportsTenant && req.user?.role !== 'super_admin'
      ? 'UPDATE students SET is_active = false WHERE id = $1 AND school_id = $2'
      : 'UPDATE students SET is_active = false WHERE id = $1'
    const params = supportsTenant && req.user?.role !== 'super_admin'
      ? [studentId, schoolId]
      : [studentId]
    await query(sql, params)
    res.json({ success: true, message: 'Student delete ho gaya' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
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
    let imported = 0

    for (const student of students) {
      // Basic validation
      if (!student.name || !student.class) continue

      const name = student.name
      const gr_number = student.gr_number || ''
      const roll_number = student.roll_number || ''
      const className = student.class
      const section = student.section || ''
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
    res.status(500).json({ success: false, message: 'Server error during bulk import' })
  }
})

module.exports = router

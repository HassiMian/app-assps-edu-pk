const express = require('express')
const router  = express.Router()
const { query } = require('../config/database')
const { protect, adminOnly } = require('../middleware/auth')
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
  if (role === 'parent') {
    return { clause: ` AND ${prefix}parent_user_id = $${startIndex}`, params: [req.user?.id || null], nextIndex: startIndex + 1 }
  }
  if (role === 'student') {
    return { clause: ` AND ${prefix}student_user_id = $${startIndex}`, params: [req.user?.id || null], nextIndex: startIndex + 1 }
  }
  return { clause: ' AND 1=0', params: [], nextIndex: startIndex }
}

// GET /api/students
router.get('/', protect, async (req, res) => {
  try {
    const { class: cls, section, search, active = 'true' } = req.query
    const activeValue = String(active).trim().toLowerCase()
    const activeBool = activeValue === 'false' || activeValue === '0' ? false : true
    let sql    = 'SELECT * FROM students WHERE is_active = $1'
    let params = [activeBool]
    let i = 2
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
router.get('/:id/fee-profile', protect, async (req, res) => {
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
router.get('/:id', protect, async (req, res) => {
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
      gr_number, name, father_name, mother_name, class: cls, section = 'Blue',
      roll_number, date_of_birth, gender, address, parent_phone, parent_whatsapp, photo, send_credentials
    } = req.body

    if (!name || !cls)
      return res.status(400).json({ success: false, message: 'Name aur Class zaroori hai' })

    const gr = gr_number || `GR-${Date.now().toString().slice(-6)}`
    const normalizedClass = normalizeClassName(cls)

    const supportsSchool = await hasColumn('students', 'school_id')
    const supportsTenantId = await hasColumn('students', 'tenant_id')
    const schoolIdForInsert = currentSchoolId(req)
    const tenantIdForInsert = currentTenantId(req)
    const result = supportsSchool && supportsTenantId
      ? await query(`
        INSERT INTO students
          (school_id, tenant_id, gr_number, name, father_name, mother_name, class, section, roll_number,
           date_of_birth, gender, address, parent_phone, parent_whatsapp, photo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING *
      `, [schoolIdForInsert, tenantIdForInsert, gr, name, father_name, mother_name, normalizedClass, section, roll_number,
          date_of_birth, gender, address, parent_phone, parent_whatsapp, photo])
      : supportsSchool
      ? await query(`
        INSERT INTO students
          (school_id, gr_number, name, father_name, mother_name, class, section, roll_number,
           date_of_birth, gender, address, parent_phone, parent_whatsapp, photo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *
      `, [schoolIdForInsert, gr, name, father_name, mother_name, normalizedClass, section, roll_number,
          date_of_birth, gender, address, parent_phone, parent_whatsapp, photo])
      : await query(`
        INSERT INTO students
          (gr_number, name, father_name, mother_name, class, section, roll_number,
           date_of_birth, gender, address, parent_phone, parent_whatsapp, photo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *
      `, [gr, name, father_name, mother_name, normalizedClass, section, roll_number,
          date_of_birth, gender, address, parent_phone, parent_whatsapp, photo])

    const studentData = result.rows[0];
    const studentId = studentData.id;
    const schoolId = studentData.school_id || schoolIdForInsert || 1;
    const tenantId = studentData.tenant_id || tenantIdForInsert || null;

    // --- AUTO GENERATE SUPER APP CREDENTIALS ---
    const bcrypt = require('bcryptjs');
    let parentEmail = null;
    let parentPassword = null;
    let parentUserId = null;

    await validateSameTenantOrThrow({
      tenantId,
      studentId,
    });
    
    if (parent_phone) {
      const cleanPhone = parent_phone.replace(/[^0-9]/g, '');
      parentEmail = `parent_${cleanPhone}@assps.edu.pk`;
      parentPassword = parentPortalPassword({ parent_phone });
      
      let parentUserRes = await query(
        'SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND LOWER(role) = $3 LIMIT 1',
        [parentEmail, tenantId, 'parent']
      );
      if (parentUserRes.rows.length === 0) {
        const hashedParentPw = await bcrypt.hash(parentPassword, 10);
        parentUserRes = await query(`
          INSERT INTO users (name, email, username, password, role, designation, school_id, tenant_id, is_active, phone)
          VALUES ($1, $2, $3, $4, 'parent', 'Parent', $5, $6, true, $7)
          RETURNING id
        `, [father_name || 'Parent', parentEmail, `P-${String(gr).replace(/\D/g, '') || cleanPhone.slice(-4)}`, hashedParentPw, schoolId, tenantId, parent_phone]);
      }
      parentUserId = parentUserRes.rows[0]?.id || null;

      await validateSameTenantOrThrow({
        tenantId,
        studentId,
        parentUserId,
      });
    }

    const studentUsername = gr;
    const studentEmail = `student_${String(gr).toLowerCase()}@assps.edu.pk`;
    const studentPassword = studentPortalPassword({ father_name });

    const existingStudentCredential = await query(
      `SELECT id
       FROM users
       WHERE tenant_id = $1
         AND LOWER(role) = 'student'
         AND (email = $2 OR username = $3)
       LIMIT 1`,
      [tenantId, studentEmail, studentUsername]
    );

    if (existingStudentCredential.rows.length === 0) {
      const hashedStudentPw = await bcrypt.hash(studentPassword, 10);
      await query(`
        INSERT INTO users (name, email, username, password, role, designation, school_id, tenant_id, is_active, phone)
        VALUES ($1, $2, $3, $4, 'student', 'Student', $5, $6, true, $7)
      `, [name, studentEmail, studentUsername, hashedStudentPw, schoolId, tenantId, parent_phone || parent_whatsapp || null]);
    }

    try {
      if (send_credentials && parent_phone) {
        await query(`
          INSERT INTO notification_log (school_id, recipient_role, title, message, type, sent_at)
          VALUES ($1, 'admin', 'Credentials Dispatched', $2, 'info', NOW())
        `, [schoolId, `Super App credentials sent via WhatsApp to ${parent_phone}`]);
      }
    } catch (e) {
      console.error('Notification log error:', e.message);
    }

    const { fee_profile, generate_first_challan, first_challan } = req.body
    let savedFeeProfile = null
    let firstChallan = null

    if (fee_profile && typeof fee_profile === 'object') {
      await upsertStudentFeeProfile(studentId, schoolId, fee_profile)
      savedFeeProfile = await getStudentFeeProfile(studentId)
    }

    if (generate_first_challan) {
      const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const now = new Date()
      const month = first_challan?.month || MONTHS[now.getMonth()]
      const year = Number(first_challan?.year || now.getFullYear())
      const due_date = first_challan?.due_date || null
      const discount = Number(first_challan?.discount || 0)
      const grossAmount = Number(
        first_challan?.amount
        || (savedFeeProfile
          ? Number(savedFeeProfile.monthly_fee || 0)
            + Number(savedFeeProfile.admission_fee || 0)
            + Number(savedFeeProfile.registration_fee || 0)
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
    const sql = supportsTenant && req.user?.role !== 'super_admin'
      ? 'UPDATE students SET is_active = false WHERE id = $1 AND school_id = $2'
      : 'UPDATE students SET is_active = false WHERE id = $1'
    const params = supportsTenant && req.user?.role !== 'super_admin'
      ? [req.params.id, currentSchoolId(req)]
      : [req.params.id]
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


const crypto = require('crypto')
const express = require('express')
const router  = express.Router()
const { pool, query, applyTenantContext } = require('../config/database')
const { protect, requireRoles, adminOrServiceScope } = require('../middleware/auth')
const { currentSchoolId, currentTenantId, hasColumn } = require('../middleware/tenant')
const {
  validateSameTenantOrThrow,
  resolveTenantIdForSchool,
} = require('../services/tenantCredentialGuard')
const { resolveAcademicAssignment } = require('../services/academicAssignmentGuard')

const canViewAdmissions = requireRoles('super_admin', 'admin', 'principal')
const canReadAdmissions = adminOrServiceScope('school.admissions.read')

let admissionsSchemaReady = null
async function ensureAdmissionsTable() {
  if (admissionsSchemaReady) return true
  const result = await query(`
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='admissions'
      AND column_name IN ('id','school_id','tenant_id','student_name','father_name','parent_phone','class_applying','status','created_at')
  `)
  if (Number(result.rows[0]?.count || 0) !== 9) {
    const err = new Error('admissions schema migration is not applied.')
    err.code = 'ADMISSION_SCHEMA_NOT_READY'
    throw err
  }
  admissionsSchemaReady = true
  return true
}

// POST /api/admissions — public, no auth required
router.post('/', async (req, res) => {
  try {
    await ensureAdmissionsTable()
    const body = req.body || {}
    const pick = (...keys) => {
      for (const key of keys) {
        const value = body[key]
        if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim()
      }
      return ''
    }

    const student_name = pick('student_name', 'name', 'studentName', 'full_name', 'applicant_name')
    const father_name = pick('father_name', 'fatherName', 'guardian_name', 'parent_name')
    const parent_phone = pick('parent_phone', 'phone', 'parentPhone', 'mobile', 'contact_number', 'contact')
    const whatsapp_number = pick('whatsapp_number', 'whatsapp', 'parent_whatsapp', 'parentWhatsapp', 'whatsappNumber')
    const class_applying = pick('class_applying', 'class', 'studentClass', 'applied_class', 'grade', 'className')
    const gender = pick('gender')
    const date_of_birth = pick('date_of_birth', 'dob', 'birth_date')
    const previous_school = pick('previous_school', 'previousSchool', 'last_school')
    const message = pick('message', 'comments', 'remarks', 'note', 'notes', 'address')
    const school_id = currentSchoolId(req)

    if (!student_name || !parent_phone || !class_applying) {
      return res.status(400).json({ success: false, message: 'Name, phone and class are required.' })
    }
    if (!school_id) {
      return res.status(400).json({ success: false, message: 'School context is required for admission applications.' })
    }

    const baseColumns = [
      ['student_name', student_name],
      ['father_name', father_name],
      ['parent_phone', parent_phone],
      ['whatsapp_number', whatsapp_number || null],
      ['class_applying', class_applying],
      ['gender', gender || null],
      ['date_of_birth', date_of_birth || null],
      ['previous_school', previous_school || null],
      ['message', message || null],
    ]
    const supported = await Promise.all(baseColumns.map(([col]) => hasColumn('admissions', col)))
    const columns = []
    const values = []
    baseColumns.forEach(([col, val], i) => {
      if (supported[i] && val !== undefined) {
        columns.push(col)
        values.push(val)
      }
    })
    if (await hasColumn('admissions', 'school_id')) {
      columns.push('school_id')
      values.push(school_id)
    }
    if (await hasColumn('admissions', 'status')) {
      columns.push('status')
      values.push('pending')
    }
    if (await hasColumn('admissions', 'created_at')) {
      columns.push('created_at')
      values.push(new Date())
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(',')
    const result = await query(
      `INSERT INTO admissions (${columns.join(',')}) VALUES (${placeholders}) RETURNING id`,
      values
    )

    res.json({
      success: true,
      message: 'Application submitted successfully.',
      application_id: result.rows[0].id
    })

    // Send notifications to admins
    try {
      const msg = `New admission: ${student_name} for Class ${class_applying} (${parent_phone})`;
      await query(`
        INSERT INTO notification_log (school_id, recipient_role, title, message, type, sent_at)
        VALUES ($1, 'admin', 'New Admission Application', $2, 'info', NOW()),
               ($1, 'super_admin', 'New Admission Application', $2, 'info', NOW())
      `, [school_id, msg]);
    } catch (notifyErr) {
      console.error('Failed to log admission notification:', notifyErr.message);
    }
  } catch (err) {
    console.error('Admissions error:', err.message)
    res.status(500).json({ success: false, message: 'Server error. Please try again.' })
  }
})

// GET /api/admissions — admin only, get all applications
router.get('/', protect, canReadAdmissions, async (req, res) => {
  try {
    await ensureAdmissionsTable()
    const supportsTenant = await hasColumn('admissions', 'school_id')
    if (!supportsTenant) {
      return res.status(503).json({
        success: false,
        code: 'ADMISSION_TENANT_SCHEMA_REQUIRED',
        message: 'Admission storage is not tenant-safe for reads.'
      })
    }
    const result = req.user?.role !== 'super_admin'
      ? await query(
        `SELECT * FROM admissions WHERE school_id = $1 ORDER BY created_at DESC LIMIT 200`,
        [currentSchoolId(req)]
      )
      : await query(`SELECT * FROM admissions ORDER BY created_at DESC LIMIT 200`)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Admissions list error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to load admissions.' })
  }
})

// PUT /api/admissions/:id/status — admin only, update application status
router.put('/:id/status', protect, canViewAdmissions, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const schoolScope = req.user?.role === 'super_admin' ? null : Number(currentSchoolId(req) || 0);
    const check = schoolScope
      ? await query('SELECT * FROM admissions WHERE id = $1 AND school_id = $2', [id, schoolScope])
      : await query('SELECT * FROM admissions WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admission application not found.' });
    }
    const admission = check.rows[0];

    // Ensure we don't cross tenant boundaries
    if (req.user?.role !== 'super_admin' && admission.school_id && admission.school_id !== currentSchoolId(req)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const schoolId = Number(admission.school_id);
    if (!Number.isFinite(schoolId) || schoolId <= 0) {
      return res.status(400).json({ success: false, message: 'Admission is missing school context and cannot be updated.' });
    }

    await query('UPDATE admissions SET status = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3', [status, id, schoolId]);

    // Log notification
    try {
      await query(`
        INSERT INTO notification_log (school_id, recipient_role, title, message, type, sent_at)
        VALUES ($1, 'admin', 'Admission Application Updated', $2, 'info', NOW()),
               ($1, 'super_admin', 'Admission Application Updated', $2, 'info', NOW())
      `, [schoolId, `Admission application for ${admission.student_name} marked as ${status}.`]);
    } catch (e) {}

    res.json({ success: true, message: `Application status updated to ${status}.` });
  } catch (err) {
    console.error('Status update error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update application status.' });
  }
});

// POST /api/admissions/:id/approve — atomic approval + student/account creation
router.post('/:id/approve', protect, canViewAdmissions, async (req, res) => {
  let client = null
  try {
    await ensureAdmissionsTable()
    const { id } = req.params
    const sendCredentialsRequested = Boolean(req.body?.send_credentials)
    const requestSchoolId = req.user?.role === 'super_admin' ? null : Number(currentSchoolId(req) || 0)

    const initial = requestSchoolId
      ? await query('SELECT * FROM admissions WHERE id = $1 AND school_id = $2', [id, requestSchoolId])
      : await query('SELECT * FROM admissions WHERE id = $1', [id])
    if (!initial.rows.length) {
      return res.status(404).json({ success: false, message: 'Admission application not found.' })
    }

    const initialAdmission = initial.rows[0]
    const schoolId = Number(initialAdmission.school_id)
    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      return res.status(422).json({ success: false, message: 'Admission is missing school context and cannot be approved.' })
    }
    if (req.user?.role !== 'super_admin' && schoolId !== Number(currentSchoolId(req))) {
      return res.status(403).json({ success: false, message: 'Unauthorized' })
    }

    const tenantId = currentTenantId(req) || await resolveTenantIdForSchool(schoolId)
    if (!tenantId) {
      return res.status(422).json({ success: false, message: 'Tenant ID is required before generating credentials.' })
    }

    const academicAssignment = await resolveAcademicAssignment({
      schoolId,
      className: initialAdmission.class_applying,
      section: '',
      allowEmptySection: true,
    })

    const [supportsStudentTenantId, supportsStudentUserLink, supportsParentUserLink] = await Promise.all([
      hasColumn('students', 'tenant_id'),
      hasColumn('students', 'student_user_id'),
      hasColumn('students', 'parent_user_id'),
    ])

    client = await pool.connect()
    await client.query('BEGIN')
    await applyTenantContext(client)
    // Serialize GR allocation and duplicate detection per school.
    await client.query('SELECT pg_advisory_xact_lock($1)', [schoolId])

    const locked = await client.query(
      'SELECT * FROM admissions WHERE id = $1 AND school_id = $2 FOR UPDATE',
      [id, schoolId]
    )
    if (!locked.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Admission application not found.' })
    }
    const admission = locked.rows[0]
    if (admission.status === 'approved') {
      await client.query('ROLLBACK')
      return res.status(409).json({ success: false, message: 'Application is already approved.' })
    }

    const duplicate = await client.query(
      'SELECT id FROM students WHERE name ILIKE $1 AND parent_phone = $2 AND school_id = $3 LIMIT 1',
      [admission.student_name, admission.parent_phone, schoolId]
    )
    if (duplicate.rows.length) {
      await client.query(
        'UPDATE admissions SET status = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3',
        ['approved', id, schoolId]
      )
      await client.query('COMMIT')
      client.release(); client = null
      return res.json({
        success: true,
        message: 'Application approved; the matching student record already exists.',
        student_id: duplicate.rows[0].id,
        credentials: null,
        delivery: { requested: sendCredentialsRequested, dispatched: false, reason: 'No new credentials were created.' },
      })
    }

    const grRes = await client.query(
      "SELECT MAX(CAST(gr_number AS INTEGER)) AS max_gr FROM students WHERE school_id = $1 AND gr_number ~ '^[0-9]+$'",
      [schoolId]
    )
    const nextGr = Number(grRes.rows[0]?.max_gr || 1000) + 1

    const studentInsert = supportsStudentTenantId
      ? await client.query(`
          INSERT INTO students (
            school_id, tenant_id, gr_number, name, father_name, class,
            parent_phone, whatsapp_number, gender, admission_date, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),'active')
          RETURNING id
        `, [
          schoolId, tenantId, String(nextGr), admission.student_name, admission.father_name,
          academicAssignment.className, admission.parent_phone,
          admission.whatsapp_number || admission.parent_phone, admission.gender || null,
        ])
      : await client.query(`
          INSERT INTO students (
            school_id, gr_number, name, father_name, class,
            parent_phone, whatsapp_number, gender, admission_date, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),'active')
          RETURNING id
        `, [
          schoolId, String(nextGr), admission.student_name, admission.father_name,
          academicAssignment.className, admission.parent_phone,
          admission.whatsapp_number || admission.parent_phone, admission.gender || null,
        ])
    const studentId = Number(studentInsert.rows[0].id)

    const bcrypt = require('bcryptjs')
    const cleanPhone = String(admission.parent_phone || '').replace(/[^0-9]/g, '')
    const parentEmail = `parent_${schoolId}_${cleanPhone}@assps.edu.pk`
    const parentPassword = `Par@${crypto.randomBytes(8).toString('base64url')}`

    let parentUser = await client.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND LOWER(role) = $3 LIMIT 1',
      [parentEmail, tenantId, 'parent']
    )
    let parentPasswordCreated = null
    if (!parentUser.rows.length) {
      const hashedParentPw = await bcrypt.hash(parentPassword, 10)
      parentUser = await client.query(`
        INSERT INTO users (name, email, password, role, designation, school_id, tenant_id, is_active)
        VALUES ($1,$2,$3,'parent','Parent',$4,$5,true)
        RETURNING id
      `, [admission.father_name || 'Parent', parentEmail, hashedParentPw, schoolId, tenantId])
      parentPasswordCreated = parentPassword
    }

    const studentEmail = `student_${studentId}@assps.edu.pk`
    const studentPassword = `Stu@${crypto.randomBytes(8).toString('base64url')}`
    let studentUser = await client.query(
      `SELECT id FROM users WHERE tenant_id = $1 AND LOWER(role) = 'student' AND email = $2 LIMIT 1`,
      [tenantId, studentEmail]
    )
    let studentPasswordCreated = null
    if (!studentUser.rows.length) {
      const hashedStudentPw = await bcrypt.hash(studentPassword, 10)
      studentUser = await client.query(`
        INSERT INTO users (name, email, password, role, designation, school_id, tenant_id, is_active)
        VALUES ($1,$2,$3,'student','Student',$4,$5,true)
        RETURNING id
      `, [admission.student_name, studentEmail, hashedStudentPw, schoolId, tenantId])
      studentPasswordCreated = studentPassword
    }

    const parentUserId = Number(parentUser.rows[0]?.id || 0)
    const studentUserId = Number(studentUser.rows[0]?.id || 0)
    await validateSameTenantOrThrow({
      tenantId,
      studentId,
      parentUserId,
      dbQuery: client.query.bind(client),
    })

    const linkSets = []
    const linkValues = []
    if (supportsStudentUserLink && studentUserId) {
      linkValues.push(studentUserId)
      linkSets.push(`student_user_id = $${linkValues.length}`)
    }
    if (supportsParentUserLink && parentUserId) {
      linkValues.push(parentUserId)
      linkSets.push(`parent_user_id = $${linkValues.length}`)
    }
    if (linkSets.length) {
      linkValues.push(studentId, schoolId)
      await client.query(
        `UPDATE students SET ${linkSets.join(', ')}, updated_at = NOW() WHERE id = $${linkValues.length - 1} AND school_id = $${linkValues.length}`,
        linkValues
      )
    }

    await client.query(
      'UPDATE admissions SET status = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3',
      ['approved', id, schoolId]
    )
    await client.query('COMMIT')
    client.release(); client = null

    // Notifications are best-effort and do not compromise the atomic admission transaction.
    try {
      await query(`
        INSERT INTO notification_log (school_id, recipient_role, title, message, type, sent_at)
        VALUES ($1, 'admin', 'Admission Approved', $2, 'success', NOW()),
               ($1, 'super_admin', 'Admission Approved', $2, 'success', NOW())
      `, [schoolId, `Admission approved for ${admission.student_name} (${academicAssignment.className}). Student record and portal accounts created.`])
    } catch (notificationError) {
      console.error('Admission notification log error:', notificationError.message)
    }

    return res.json({
      success: true,
      message: 'Application approved. Student record and linked portal accounts were created atomically.',
      student_id: studentId,
      credentials: {
        parent: { email: parentEmail, password: parentPasswordCreated },
        student: { email: studentEmail, password: studentPasswordCreated },
      },
      delivery: {
        requested: sendCredentialsRequested,
        dispatched: false,
        reason: sendCredentialsRequested
          ? 'Automatic credential delivery is not configured in this workflow; credentials were generated but not sent.'
          : null,
      },
    })
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {})
      client.release()
      client = null
    }
    console.error('Approve error:', err.message)
    if (err.status === 422) {
      return res.status(422).json({ success: false, code: err.code, message: err.message, details: err.details })
    }
    return res.status(500).json({ success: false, message: 'Failed to approve application.' })
  }
})

module.exports = router

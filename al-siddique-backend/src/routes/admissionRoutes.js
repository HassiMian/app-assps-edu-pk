const express = require('express')
const router  = express.Router()
const pool    = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId, currentTenantId, hasColumn } = require('../middleware/tenant')
const {
  validateSameTenantOrThrow,
  resolveTenantIdForSchool,
} = require('../services/tenantCredentialGuard')

const canViewAdmissions = requireRoles('super_admin', 'admin', 'principal')

// POST /api/admissions — public, no auth required
router.post('/', async (req, res) => {
  try {
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
    const supported = await Promise.all(baseColumns.map(([col]) => hasColumn('admissions', col).catch(() => false)))
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
    const result = await pool.query(
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
      await pool.query(`
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
router.get('/', protect, canViewAdmissions, async (req, res) => {
  try {
    const supportsTenant = await hasColumn('admissions', 'school_id')
    const result = supportsTenant && req.user?.role !== 'super_admin'
      ? await pool.query(
        `SELECT * FROM admissions WHERE school_id = $1 ORDER BY created_at DESC LIMIT 200`,
        [currentSchoolId(req)]
      )
      : await pool.query(`SELECT * FROM admissions ORDER BY created_at DESC LIMIT 200`)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
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

    const check = await pool.query('SELECT * FROM admissions WHERE id = $1', [id]);
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

    await pool.query('UPDATE admissions SET status = $1 WHERE id = $2', [status, id]);

    // Log notification
    try {
      await pool.query(`
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

// POST /api/admissions/:id/approve — admin only, approve application & create student
router.post('/:id/approve', protect, canViewAdmissions, async (req, res) => {
  try {
    const { id } = req.params;
    const { send_credentials } = req.body || {};
    
    const check = await pool.query('SELECT * FROM admissions WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admission application not found.' });
    }
    const admission = check.rows[0];

    // Ensure we don't cross tenant boundaries
    if (req.user?.role !== 'super_admin' && admission.school_id && admission.school_id !== currentSchoolId(req)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (admission.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Application is already approved.' });
    }

    const schoolId = Number(admission.school_id);
    if (!Number.isFinite(schoolId) || schoolId <= 0) {
      return res.status(400).json({ success: false, message: 'Admission is missing school context and cannot be approved.' });
    }

    // Check for duplicate student (by phone and name)
    const duplicate = await pool.query(
      'SELECT id FROM students WHERE name ILIKE $1 AND parent_phone = $2 AND school_id = $3 LIMIT 1',
      [admission.student_name, admission.parent_phone, schoolId]
    );

    if (duplicate.rows.length > 0) {
      // Just update status if student already exists
      await pool.query('UPDATE admissions SET status = $1 WHERE id = $2', ['approved', id]);
      return res.json({ success: true, message: 'Application approved (student record already exists).' });
    }

    // Auto-generate gr_number based on max
    const grRes = await pool.query('SELECT MAX(CAST(gr_number AS INTEGER)) as max_gr FROM students WHERE school_id = $1 AND gr_number ~ \'^[0-9]+$\'', [schoolId]);
    const nextGr = (grRes.rows[0]?.max_gr || 1000) + 1;

    const tenantId = currentTenantId(req) || await resolveTenantIdForSchool(schoolId);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required before generating credentials.' });
    }

    // Create student
    const supportsStudentTenantId = await hasColumn('students', 'tenant_id');
    const newStudentRes = supportsStudentTenantId
      ? await pool.query(`
        INSERT INTO students (
          school_id, tenant_id, gr_number, name, father_name, class,
          parent_phone, whatsapp_number, gender, admission_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 'active')
        RETURNING id
      `, [
        schoolId,
        tenantId,
        String(nextGr),
        admission.student_name,
        admission.father_name,
        admission.class_applying,
        admission.parent_phone,
        admission.whatsapp_number || admission.parent_phone,
        admission.gender || 'Unknown'
      ])
      : await pool.query(`
        INSERT INTO students (
          school_id, gr_number, name, father_name, class,
          parent_phone, whatsapp_number, gender, admission_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'active')
        RETURNING id
      `, [
        schoolId,
        String(nextGr),
        admission.student_name,
        admission.father_name,
        admission.class_applying,
        admission.parent_phone,
        admission.whatsapp_number || admission.parent_phone,
        admission.gender || 'Unknown'
      ]);
    const studentId = newStudentRes.rows[0].id;

    await validateSameTenantOrThrow({
      tenantId,
      studentId,
    });

    // --- AUTO GENERATE SUPER APP CREDENTIALS ---
    const bcrypt = require('bcryptjs');
    
    // Generate parent credentials
    const cleanPhone = admission.parent_phone.replace(/[^0-9]/g, '');
    const parentEmail = `parent_${cleanPhone}@assps.edu.pk`;
    const parentPassword = `Parent@${cleanPhone.slice(-4)}`; // e.g., Parent@1234
    
    // Check if parent user exists
    let parentUserRes = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND LOWER(role) = $3 LIMIT 1',
      [parentEmail, tenantId, 'parent']
    );
    if (parentUserRes.rows.length === 0) {
      const hashedParentPw = await bcrypt.hash(parentPassword, 10);
      parentUserRes = await pool.query(`
        INSERT INTO users (name, email, password, role, designation, school_id, tenant_id, is_active)
        VALUES ($1, $2, $3, 'parent', 'Parent', $4, $5, true)
        RETURNING id
      `, [admission.father_name || 'Parent', parentEmail, hashedParentPw, schoolId, tenantId]);
    }

    await validateSameTenantOrThrow({
      tenantId,
      studentId,
      parentUserId: parentUserRes.rows[0]?.id,
    });

    // Generate student credentials
    const studentPin = Math.floor(100000 + Math.random() * 900000); // 6 digit PIN
    const studentEmail = `student_${studentId}@assps.edu.pk`;
    const studentPassword = `Stu@${studentPin}`;

    const existingStudentCredential = await pool.query(
      `SELECT id
       FROM users
       WHERE tenant_id = $1
         AND LOWER(role) = 'student'
         AND email = $2
       LIMIT 1`,
      [tenantId, studentEmail]
    );

    if (existingStudentCredential.rows.length === 0) {
      const hashedStudentPw = await bcrypt.hash(studentPassword, 10);
      await pool.query(`
        INSERT INTO users (name, email, password, role, designation, school_id, tenant_id, is_active)
        VALUES ($1, $2, $3, 'student', 'Student', $4, $5, true)
      `, [admission.student_name, studentEmail, hashedStudentPw, schoolId, tenantId]);
    }

    // Update status
    await pool.query('UPDATE admissions SET status = $1 WHERE id = $2', ['approved', id]);

    // Log notification
    try {
      await pool.query(`
        INSERT INTO notification_log (school_id, recipient_role, title, message, type, sent_at)
        VALUES ($1, 'admin', 'Admission Approved', $2, 'success', NOW()),
               ($1, 'super_admin', 'Admission Approved', $2, 'success', NOW())
      `, [schoolId, `Admission approved for ${admission.student_name} (${admission.class_applying}). Student record & credentials created.`]);
      
      if (send_credentials) {
        await pool.query(`
          INSERT INTO notification_log (school_id, recipient_role, title, message, type, sent_at)
          VALUES ($1, 'admin', 'Credentials Dispatched', $2, 'info', NOW())
        `, [schoolId, `Super App credentials sent via WhatsApp to ${admission.parent_phone}`]);
      }
    } catch (e) {
      console.error('Notification log error:', e.message);
    }

    res.json({ 
      success: true, 
      message: 'Application approved. Student record and Super App credentials created successfully.',
      credentials: {
        parent: { email: parentEmail, password: parentPassword },
        student: { email: studentEmail, password: studentPassword }
      },
      dispatched: !!send_credentials
    });
  } catch (err) {
    console.error('Approve error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to approve application.' });
  }
});

module.exports = router

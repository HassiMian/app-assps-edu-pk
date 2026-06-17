const express = require('express')
const router  = express.Router()
const pool    = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId, hasColumn } = require('../middleware/tenant')

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

module.exports = router

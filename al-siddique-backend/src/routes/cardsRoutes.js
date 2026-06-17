// src/routes/cardsRoutes.js
// Al Siddique Smart School OS - Cards Generator API Routes

const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { tenantClause, currentSchoolId, hasColumn } = require('../middleware/tenant')

const canGenerateCards = requireRoles('super_admin', 'admin', 'principal', 'teacher', 'accountant')
const canDeleteCards = requireRoles('super_admin', 'admin', 'principal')

router.get('/', protect, canGenerateCards, async (req, res) => {
  try {
    let sql = 'SELECT * FROM cards WHERE 1=1'
    const tenant = await tenantClause(req, { table: 'cards', paramIndex: 1 })
    sql += tenant.clause + ' ORDER BY created_at DESC'
    const result = await query(sql, tenant.params)
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Cards fetch error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch cards' })
  }
})

router.post('/student-id', protect, canGenerateCards, async (req, res) => {
  try {
    const { student_id, template = 'default' } = req.body
    if (!student_id) {
      return res.status(400).json({ success: false, message: 'Student ID is required' })
    }

    const supportsStudentTenant = await hasColumn('students', 'school_id')
    const studentResult = await query(
      `SELECT id, gr_number, name, father_name, class, section, roll_number,
              date_of_birth, parent_phone, address, photo
       FROM students
       WHERE id = $1 AND is_active = true
         ${supportsStudentTenant && req.user?.role !== 'super_admin' ? 'AND school_id = $2' : ''}`,
      supportsStudentTenant && req.user?.role !== 'super_admin'
        ? [student_id, currentSchoolId(req)]
        : [student_id]
    )

    if (!studentResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Student not found' })
    }

    const student = studentResult.rows[0]
    const cardData = {
      type: 'student_id',
      student_id: student.id,
      gr_number: student.gr_number,
      student_name: student.name,
      father_name: student.father_name,
      class_name: student.class,
      section: student.section,
      roll_number: student.roll_number,
      date_of_birth: student.date_of_birth,
      contact: student.parent_phone,
      address: student.address,
      photo: student.photo,
      template,
      generated_at: new Date().toISOString(),
      status: 'generated'
    }

    const supportsCardsTenant = await hasColumn('cards', 'school_id')
    const insertResult = supportsCardsTenant
      ? await query(
        `INSERT INTO cards (school_id, type, student_id, card_data, template, status)
         VALUES ($1, $2, $3, $4, $5, 'generated')
         RETURNING id`,
        [currentSchoolId(req), 'student_id', student.id, cardData, template]
      )
      : await query(
        `INSERT INTO cards (type, student_id, card_data, template, status)
         VALUES ($1, $2, $3, $4, 'generated')
         RETURNING id`,
        ['student_id', student.id, cardData, template]
      )

    res.json({
      success: true,
      data: { ...cardData, id: insertResult.rows[0].id },
      message: 'Student ID card generated successfully'
    })
  } catch (error) {
    console.error('Student ID generation error:', error)
    res.status(500).json({ success: false, message: 'Failed to generate student ID card' })
  }
})

router.post('/fee-receipt', protect, canGenerateCards, async (req, res) => {
  try {
    const { challan_id, template = 'default' } = req.body
    if (!challan_id) {
      return res.status(400).json({ success: false, message: 'Challan ID is required' })
    }

    const supportsFeeTenant = await hasColumn('fee_challans', 'school_id')
    const challanResult = await query(
      `SELECT f.*, s.name AS student_name, s.father_name, s.class, s.section, s.gr_number
       FROM fee_challans f
       JOIN students s ON f.student_id = s.id AND s.school_id = f.school_id
       WHERE f.id = $1
         ${supportsFeeTenant && req.user?.role !== 'super_admin' ? 'AND f.school_id = $2' : ''}`,
      supportsFeeTenant && req.user?.role !== 'super_admin'
        ? [challan_id, currentSchoolId(req)]
        : [challan_id]
    )

    if (!challanResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Fee challan not found' })
    }

    const challan = challanResult.rows[0]
    const receiptData = {
      type: 'fee_receipt',
      challan_id: challan.id,
      student_id: challan.student_id,
      student_name: challan.student_name,
      father_name: challan.father_name,
      gr_number: challan.gr_number,
      class_name: challan.class,
      section: challan.section,
      challan_number: challan.challan_no,
      month: challan.month,
      year: challan.year,
      amount: Number(challan.amount || 0),
      paid_amount: Number(challan.paid_amount || 0),
      due_date: challan.due_date,
      paid_date: challan.paid_date,
      payment_mode: challan.payment_mode,
      status: challan.status,
      template,
      generated_at: new Date().toISOString()
    }

    const supportsCardsTenant = await hasColumn('cards', 'school_id')
    const insertResult = supportsCardsTenant
      ? await query(
        `INSERT INTO cards (school_id, type, student_id, card_data, template, status)
         VALUES ($1, $2, $3, $4, $5, 'generated')
         RETURNING id`,
        [currentSchoolId(req), 'fee_receipt', challan.student_id, receiptData, template]
      )
      : await query(
        `INSERT INTO cards (type, student_id, card_data, template, status)
         VALUES ($1, $2, $3, $4, 'generated')
         RETURNING id`,
        ['fee_receipt', challan.student_id, receiptData, template]
      )

    res.json({
      success: true,
      data: { ...receiptData, id: insertResult.rows[0].id },
      message: 'Fee receipt generated successfully'
    })
  } catch (error) {
    console.error('Fee receipt generation error:', error)
    res.status(500).json({ success: false, message: 'Failed to generate fee receipt' })
  }
})

router.post('/result-card', protect, canGenerateCards, async (req, res) => {
  try {
    const { student_id, exam_id, template = 'default' } = req.body
    if (!student_id || !exam_id) {
      return res.status(400).json({ success: false, message: 'Student ID and Exam ID are required' })
    }

    const supportsStudentTenant = await hasColumn('students', 'school_id')
    const resultQuery = await query(
      `SELECT er.*, e.name AS exam_name, e.type AS exam_type, e.session,
              s.name AS student_name, s.father_name, s.class, s.section, s.gr_number, s.roll_number
       FROM exam_results er
       JOIN exams e ON er.exam_id = e.id
       JOIN students s ON er.student_id = s.id AND s.school_id = e.school_id
       WHERE er.student_id = $1 AND er.exam_id = $2
         ${supportsStudentTenant && req.user?.role !== 'super_admin' ? 'AND s.school_id = $3' : ''}
       ORDER BY er.subject`,
      supportsStudentTenant && req.user?.role !== 'super_admin'
        ? [student_id, exam_id, currentSchoolId(req)]
        : [student_id, exam_id]
    )

    if (!resultQuery.rows.length) {
      return res.status(404).json({ success: false, message: 'Exam results not found' })
    }

    const rows = resultQuery.rows
    const student = rows[0]
    const totalMarks = rows.reduce((sum, row) => sum + Number(row.total_marks || 0), 0)
    const obtainedMarks = rows.reduce((sum, row) => sum + Number(row.marks_obtained || 0), 0)
    const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0

    const resultCardData = {
      type: 'result_card',
      student_id: student.student_id,
      exam_id: student.exam_id,
      student_name: student.student_name,
      father_name: student.father_name,
      gr_number: student.gr_number,
      roll_number: student.roll_number,
      class_name: student.class,
      section: student.section,
      exam_name: student.exam_name,
      exam_type: student.exam_type,
      session: student.session,
      subjects: rows.map(row => ({
        subject_name: row.subject,
        total_marks: Number(row.total_marks || 0),
        marks_obtained: Number(row.marks_obtained || 0),
        grade: row.grade,
        remarks: row.remarks
      })),
      total_marks: totalMarks,
      marks_obtained: obtainedMarks,
      percentage,
      template,
      generated_at: new Date().toISOString()
    }

    const supportsCardsTenant = await hasColumn('cards', 'school_id')
    const insertResult = supportsCardsTenant
      ? await query(
        `INSERT INTO cards (school_id, type, student_id, card_data, template, status)
         VALUES ($1, $2, $3, $4, $5, 'generated')
         RETURNING id`,
        [currentSchoolId(req), 'result_card', student.student_id, resultCardData, template]
      )
      : await query(
        `INSERT INTO cards (type, student_id, card_data, template, status)
         VALUES ($1, $2, $3, $4, 'generated')
         RETURNING id`,
        ['result_card', student.student_id, resultCardData, template]
      )

    res.json({
      success: true,
      data: { ...resultCardData, id: insertResult.rows[0].id },
      message: 'Result card generated successfully'
    })
  } catch (error) {
    console.error('Result card generation error:', error)
    res.status(500).json({ success: false, message: 'Failed to generate result card' })
  }
})

router.delete('/:id', protect, canDeleteCards, async (req, res) => {
  try {
    const supportsCardsTenant = await hasColumn('cards', 'school_id')
    const result = await query(
      `DELETE FROM cards WHERE id = $1 ${supportsCardsTenant && req.user?.role !== 'super_admin' ? 'AND school_id = $2' : ''} RETURNING id`,
      supportsCardsTenant && req.user?.role !== 'super_admin' ? [req.params.id, currentSchoolId(req)] : [req.params.id]
    )
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Card not found' })
    }

    res.json({ success: true, message: 'Card deleted successfully' })
  } catch (error) {
    console.error('Card deletion error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete card' })
  }
})

module.exports = router


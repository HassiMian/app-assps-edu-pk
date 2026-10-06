const express = require('express')
const router = express.Router()
const { pool } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

const canReviewDemoRequests = requireRoles('super_admin', 'admin', 'principal')

let demoRequestsSchemaReady = null
async function ensureDemoRequestsTable() {
  if (demoRequestsSchemaReady) return true
  const result = await pool.query("SELECT to_regclass('public.demo_requests') AS table_name")
  if (!result.rows[0]?.table_name) {
    const err = new Error('demo_requests schema migration is not applied.')
    err.code = 'DEMO_REQUEST_SCHEMA_NOT_READY'
    throw err
  }
  demoRequestsSchemaReady = true
  return true
}

function normalizeBody(body = {}) {
  return {
    schoolName: String(body.schoolName || body.school_name || '').trim(),
    contactName: String(body.contactName || body.contact_name || '').trim(),
    phone: String(body.phone || '').trim(),
    email: String(body.email || '').trim(),
    city: String(body.city || '').trim(),
    studentsCount: String(body.studentsCount || body.students_count || '').trim(),
    message: String(body.message || '').trim(),
  }
}

router.post('/', async (req, res) => {
  try {
    await ensureDemoRequestsTable()
    const incoming = normalizeBody(req.body)
    if (!incoming.schoolName || !incoming.contactName || !incoming.phone) {
      return res.status(400).json({
        success: false,
        message: 'School name, contact person, and phone are required.',
      })
    }

    const result = await pool.query(`
      INSERT INTO demo_requests (
        school_id, school_name, contact_name, phone, email, city, students_count, message, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_approval')
      RETURNING *
    `, [
      currentSchoolId(req),
      incoming.schoolName,
      incoming.contactName,
      incoming.phone,
      incoming.email || null,
      incoming.city || null,
      incoming.studentsCount || null,
      incoming.message || null,
    ])

    res.status(201).json({
      success: true,
      message: 'Demo request submitted for SaaS admin approval.',
      data: result.rows[0],
    })
  } catch (err) {
    console.error('Demo request create error:', err.message)
    res.status(err.code === 'DEMO_REQUEST_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'DEMO_REQUEST_SCHEMA_NOT_READY' ? 'Demo request storage is not initialized.' : 'Failed to submit demo request.' })
  }
})

router.get('/', protect, canReviewDemoRequests, async (req, res) => {
  try {
    await ensureDemoRequestsTable()
    const status = String(req.query.status || '').trim()
    const schoolId = currentSchoolId(req)
    const isSuperAdmin = req.user?.role === 'super_admin'
    const params = []
    let sql = 'SELECT * FROM demo_requests WHERE 1=1'
    if (!isSuperAdmin) {
      params.push(schoolId)
      sql += ` AND school_id = $${params.length}`
    }
    if (status && status !== 'all') {
      params.push(status)
      sql += ` AND status = $${params.length}`
    }
    sql += ' ORDER BY created_at DESC LIMIT 100'
    const result = await pool.query(sql, params)
    res.json({ success: true, count: result.rowCount, data: result.rows })
  } catch (err) {
    console.error('Demo request list error:', err.message)
    res.status(err.code === 'DEMO_REQUEST_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'DEMO_REQUEST_SCHEMA_NOT_READY' ? 'Demo request storage is not initialized.' : 'Failed to load demo requests.' })
  }
})

router.patch('/:id/status', protect, canReviewDemoRequests, async (req, res) => {
  try {
    await ensureDemoRequestsTable()
    const status = String(req.body?.status || '').trim()
    if (!['pending_approval', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid demo request status.' })
    }

    const schoolId = currentSchoolId(req)
    const isSuperAdmin = req.user?.role === 'super_admin'
    const params = [status, req.user?.id || null, req.params.id]
    let sql = `
      UPDATE demo_requests
         SET status = $1,
             reviewed_by = $2,
             reviewed_at = CASE WHEN $1 = 'pending_approval' THEN NULL ELSE CURRENT_TIMESTAMP END,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
    `
    if (!isSuperAdmin) {
      params.push(schoolId)
      sql += ` AND school_id = $${params.length}`
    }
    sql += ' RETURNING *'

    const result = await pool.query(sql, params)

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Demo request not found.' })
    }

    res.json({ success: true, data: result.rows[0], message: 'Demo request updated.' })
  } catch (err) {
    console.error('Demo request update error:', err.message)
    res.status(err.code === 'DEMO_REQUEST_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'DEMO_REQUEST_SCHEMA_NOT_READY' ? 'Demo request storage is not initialized.' : 'Failed to update demo request.' })
  }
})

module.exports = router


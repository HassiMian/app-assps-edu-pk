const express = require('express')
const router  = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const canManageEvents = requireRoles('super_admin', 'admin', 'principal')

let eventsSchemaReady = null
async function ensureTable() {
  if (eventsSchemaReady) return true
  const result = await query("SELECT to_regclass('public.events') AS table_name")
  if (!result.rows[0]?.table_name) {
    const err = new Error('events schema migration is not applied.')
    err.code = 'EVENT_SCHEMA_NOT_READY'
    throw err
  }
  eventsSchemaReady = true
  return true
}

function requireEventSchoolId(req, res) {
  const schoolId = Number(currentSchoolId(req) || 0)
  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'A school context is required for events.' })
    return null
  }
  return schoolId
}

// GET /api/events
router.get('/', protect, async (req, res) => {
  try {
    await ensureTable()
    const schoolId = requireEventSchoolId(req, res)
    if (!schoolId) return
    const result = await query(`SELECT * FROM events WHERE school_id = $1 ORDER BY event_date ASC LIMIT 100`, [schoolId])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(err.code === 'EVENT_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'EVENT_SCHEMA_NOT_READY' ? 'Event storage is not initialized.' : 'Event operation failed.' })
  }
})

// GET /api/events/upcoming  — next 30 days
router.get('/upcoming', protect, async (req, res) => {
  try {
    await ensureTable()
    const schoolId = requireEventSchoolId(req, res)
    if (!schoolId) return
    const result = await query(`SELECT * FROM events WHERE school_id = $1 AND event_date >= CURRENT_DATE AND event_date <= CURRENT_DATE + INTERVAL '30 days' ORDER BY event_date ASC LIMIT 20`, [schoolId])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(err.code === 'EVENT_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'EVENT_SCHEMA_NOT_READY' ? 'Event storage is not initialized.' : 'Event operation failed.' })
  }
})

// POST /api/events
router.post('/', protect, canManageEvents, async (req, res) => {
  try {
    const { title, description, event_date, event_type = 'general', color = 'gold' } = req.body
    if (!title || !event_date)
      return res.status(400).json({ success: false, message: 'Title and date are required.' })

    await ensureTable()
    const schoolId = requireEventSchoolId(req, res)
    if (!schoolId) return
    const result = await query(
      `INSERT INTO events (school_id, title, description, event_date, event_type, color, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [schoolId, title, description || null, event_date, event_type, color, req.user?.id || null]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(err.code === 'EVENT_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'EVENT_SCHEMA_NOT_READY' ? 'Event storage is not initialized.' : 'Event operation failed.' })
  }
})

// PUT /api/events/:id
router.put('/:id', protect, canManageEvents, async (req, res) => {
  try {
    const { title, description, event_date, event_type, color } = req.body
    await ensureTable()
    const schoolId = requireEventSchoolId(req, res)
    if (!schoolId) return
    const result = await query(`UPDATE events SET title=$1, description=$2, event_date=$3, event_type=$4, color=$5, updated_at=NOW() WHERE id=$6 AND school_id=$7 RETURNING *`, [title, description || null, event_date, event_type || 'general', color || 'gold', req.params.id, schoolId])
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Event not found.' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(err.code === 'EVENT_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'EVENT_SCHEMA_NOT_READY' ? 'Event storage is not initialized.' : 'Event operation failed.' })
  }
})

// DELETE /api/events/:id
router.delete('/:id', protect, canManageEvents, async (req, res) => {
  try {
    await ensureTable()
    const schoolId = requireEventSchoolId(req, res)
    if (!schoolId) return
    const result = await query(`DELETE FROM events WHERE id = $1 AND school_id = $2 RETURNING id`, [req.params.id, schoolId])
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Event not found.' })
    }
    res.json({ success: true, message: 'Event deleted.' })
  } catch (err) {
    res.status(err.code === 'EVENT_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'EVENT_SCHEMA_NOT_READY' ? 'Event storage is not initialized.' : 'Event operation failed.' })
  }
})

module.exports = router

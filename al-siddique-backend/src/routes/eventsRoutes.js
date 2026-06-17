const express = require('express')
const router  = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId, hasColumn } = require('../middleware/tenant')
const canManageEvents = requireRoles('super_admin', 'admin', 'principal')

// Ensure events table exists
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id          SERIAL PRIMARY KEY,
      school_id   INTEGER REFERENCES schools(id),
      title       TEXT NOT NULL,
      description TEXT,
      event_date  DATE NOT NULL,
      event_type  TEXT DEFAULT 'general',
      color       TEXT DEFAULT 'gold',
      created_by  INTEGER,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})
  await query('ALTER TABLE events ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);').catch(() => {})
  await query('ALTER TABLE events ALTER COLUMN school_id DROP DEFAULT;').catch(() => {})
  await query('CREATE INDEX IF NOT EXISTS idx_events_school_date ON events(school_id, event_date);').catch(() => {})
}
// Keep startup non-fatal if PostgreSQL is unavailable; handlers will retry when needed.
void ensureTable().catch((err) => {
  console.warn('Events table bootstrap skipped:', err.message)
})

// GET /api/events
router.get('/', protect, async (req, res) => {
  try {
    const supportsTenant = await hasColumn('events', 'school_id')
    const result = supportsTenant
      ? await query(
        `SELECT * FROM events WHERE school_id = $1 ORDER BY event_date ASC LIMIT 100`,
        [currentSchoolId(req)]
      )
      : await query(`SELECT * FROM events ORDER BY event_date ASC LIMIT 100`)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/events/upcoming  — next 30 days
router.get('/upcoming', protect, async (req, res) => {
  try {
    const supportsTenant = await hasColumn('events', 'school_id')
    const result = supportsTenant
      ? await query(
        `SELECT * FROM events
         WHERE school_id = $1
           AND event_date >= CURRENT_DATE
           AND event_date <= CURRENT_DATE + INTERVAL '30 days'
         ORDER BY event_date ASC LIMIT 20`,
        [currentSchoolId(req)]
      )
      : await query(
        `SELECT * FROM events
         WHERE event_date >= CURRENT_DATE AND event_date <= CURRENT_DATE + INTERVAL '30 days'
         ORDER BY event_date ASC LIMIT 20`
      )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/events
router.post('/', protect, canManageEvents, async (req, res) => {
  try {
    const { title, description, event_date, event_type = 'general', color = 'gold' } = req.body
    if (!title || !event_date)
      return res.status(400).json({ success: false, message: 'Title and date are required.' })

    const supportsTenant = await hasColumn('events', 'school_id')
    const result = supportsTenant
      ? await query(
        `INSERT INTO events (school_id, title, description, event_date, event_type, color, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [currentSchoolId(req), title, description || null, event_date, event_type, color, req.user?.id || null]
      )
      : await query(
        `INSERT INTO events (title, description, event_date, event_type, color, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [title, description || null, event_date, event_type, color, req.user?.id || null]
      )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/events/:id
router.put('/:id', protect, canManageEvents, async (req, res) => {
  try {
    const { title, description, event_date, event_type, color } = req.body
    const supportsTenant = await hasColumn('events', 'school_id')
    const result = supportsTenant
      ? await query(
        `UPDATE events SET title=$1, description=$2, event_date=$3,
         event_type=$4, color=$5, updated_at=NOW()
         WHERE id=$6 AND school_id = $7 RETURNING *`,
        [title, description || null, event_date, event_type || 'general', color || 'gold', req.params.id, currentSchoolId(req)]
      )
      : await query(
        `UPDATE events SET title=$1, description=$2, event_date=$3,
         event_type=$4, color=$5, updated_at=NOW()
         WHERE id=$6 RETURNING *`,
        [title, description || null, event_date, event_type || 'general', color || 'gold', req.params.id]
      )
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Event not found.' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/events/:id
router.delete('/:id', protect, canManageEvents, async (req, res) => {
  try {
    const supportsTenant = await hasColumn('events', 'school_id')
    const result = supportsTenant && req.user?.role !== 'super_admin'
      ? await query(`DELETE FROM events WHERE id = $1 AND school_id = $2 RETURNING id`, [req.params.id, currentSchoolId(req)])
      : await query(`DELETE FROM events WHERE id = $1 RETURNING id`, [req.params.id])
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Event not found.' })
    }
    res.json({ success: true, message: 'Event deleted.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router

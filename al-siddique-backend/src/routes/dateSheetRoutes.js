const express = require('express')
const router = express.Router()
const { pool, query, applyTenantContext } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

const canRead = requireRoles('super_admin', 'admin', 'principal', 'school_admin', 'teacher')
const canManage = requireRoles('super_admin', 'admin', 'principal', 'school_admin')

let schemaReady = null
async function ensureSchema() {
  if (schemaReady) return true
  const result = await query("SELECT to_regclass('public.date_sheet_records') AS table_name")
  if (!result.rows[0]?.table_name) {
    const err = new Error('date_sheet_records schema migration is not applied.')
    err.code = 'DOMAIN_SCHEMA_NOT_READY'
    throw err
  }
  schemaReady = true
  return true
}

function cleanString(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max)
}

function normalizeRow(row = {}) {
  const classLevel = cleanString(row.class || row.class_level, 80)
  const section = cleanString(row.section, 80)
  const date = cleanString(row.date || row.exam_date, 10)
  const day = cleanString(row.day || row.day_label, 32)
  const times = Array.isArray(row.times) ? row.times.map(v => cleanString(v, 80)).slice(0, 6) : []
  const subjects = Array.isArray(row.subjects) ? [...new Set(row.subjects.map(v => cleanString(v, 160)).filter(Boolean))].slice(0, 12) : []
  const errors = []
  if (!classLevel) errors.push('Class is required.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('Valid exam date is required.')
  if (!subjects.length) errors.push('At least one subject is required.')
  return { errors, value: { classLevel, section, date, day, times, subjects } }
}

function mapRow(row) {
  return {
    id: row.id,
    session: row.session,
    term: row.term,
    class: row.class_level,
    section: row.section || '',
    date: row.exam_date instanceof Date ? row.exam_date.toISOString().slice(0, 10) : String(row.exam_date).slice(0, 10),
    day: row.day_label || '',
    times: Array.isArray(row.times) ? row.times : [],
    subjects: Array.isArray(row.subjects) ? row.subjects : [],
  }
}

router.get('/', protect, canRead, async (req, res) => {
  try {
    await ensureSchema()
    const schoolId = currentSchoolId(req)
    const session = cleanString(req.query.session, 80)
    const term = cleanString(req.query.term, 120)
    const params = [schoolId]
    let where = 'school_id = $1'
    if (session) { params.push(session); where += ` AND session = $${params.length}` }
    if (term) { params.push(term); where += ` AND term = $${params.length}` }
    const result = await query(`
      SELECT id, session, term, class_level, section, exam_date, day_label, times, subjects
      FROM date_sheet_records
      WHERE ${where}
      ORDER BY session DESC, term, exam_date, class_level, section, id
      LIMIT 5000
    `, params)
    res.json({ success: true, data: result.rows.map(mapRow) })
  } catch (err) {
    console.error('Date sheet list error:', err.message)
    res.status(err.code === 'DOMAIN_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'DOMAIN_SCHEMA_NOT_READY' ? 'Date sheet storage is not initialized.' : 'Date sheets could not be loaded.' })
  }
})

router.put('/bulk', protect, canManage, async (req, res) => {
  const session = cleanString(req.body?.session, 80)
  const term = cleanString(req.body?.term, 120)
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : []
  if (!session || !term) return res.status(422).json({ success: false, message: 'Session and term are required.' })
  const normalized = rows.map(normalizeRow)
  const fieldErrors = normalized.flatMap((entry, index) => entry.errors.map(message => `Row ${index + 1}: ${message}`))
  if (fieldErrors.length) return res.status(422).json({ success: false, message: 'Date sheet validation failed.', fieldErrors })

  const schoolId = currentSchoolId(req)
  const client = await pool.connect()
  try {
    await ensureSchema()
    await client.query('BEGIN')
    await applyTenantContext(client)
    await client.query('DELETE FROM date_sheet_records WHERE school_id = $1 AND session = $2 AND term = $3', [schoolId, session, term])
    for (const entry of normalized) {
      const row = entry.value
      await client.query(`
        INSERT INTO date_sheet_records (school_id, session, term, class_level, section, exam_date, day_label, times, subjects, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10)
      `, [schoolId, session, term, row.classLevel, row.section, row.date, row.day || null, JSON.stringify(row.times), JSON.stringify(row.subjects), req.user?.id || null])
    }
    await client.query('COMMIT')
    const result = await query(`
      SELECT id, session, term, class_level, section, exam_date, day_label, times, subjects
      FROM date_sheet_records
      WHERE school_id = $1 AND session = $2 AND term = $3
      ORDER BY exam_date, class_level, section, id
    `, [schoolId, session, term])
    res.json({ success: true, count: result.rowCount, data: result.rows.map(mapRow) })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Date sheet save error:', err.message)
    res.status(err.code === 'DOMAIN_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'DOMAIN_SCHEMA_NOT_READY' ? 'Date sheet storage is not initialized.' : 'Date sheet could not be saved.' })
  } finally {
    client.release()
  }
})

module.exports = router

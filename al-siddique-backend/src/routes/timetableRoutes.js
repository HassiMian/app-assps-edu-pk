const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { protect, requireScopeForServiceOnly } = require('../middleware/auth')
const { tenantClause } = require('../middleware/tenant')
const { schoolBellSchedule } = require('../domain/schoolBellSchedule')

// Shared school-wide bell slots. No private student or academic assignment data is returned.
router.get('/bell-schedule', protect, requireScopeForServiceOnly('school.timetable.read'), (req, res) => {
  const schoolId = Number(req.school_id)
  if (!Number.isSafeInteger(schoolId) || schoolId <= 0) {
    return res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED' })
  }
  const schedule = schoolBellSchedule(schoolId)
  if (!schedule) return res.status(404).json({ success: false, code: 'BELL_SCHEDULE_NOT_PUBLISHED' })
  res.set('Cache-Control', 'private, no-store')
  return res.json({ success: true, data: schedule })
})

router.get('/', protect, requireScopeForServiceOnly('school.timetable.read'), async (req, res) => {
  try {
    const filters = []
    const params = []
    let idx = 1

    if (req.query.class) {
      filters.push(`LOWER(class_name) = LOWER($${idx++})`)
      params.push(req.query.class)
    }
    if (req.query.teacher_id) {
      filters.push(`teacher_id = $${idx++}`)
      params.push(req.query.teacher_id)
    }
    if (req.query.day_name) {
      filters.push(`LOWER(day_name) = LOWER($${idx++})`)
      params.push(req.query.day_name)
    }

    const tenant = await tenantClause(req, { table: 'timetable', paramIndex: idx })
    let sql = 'SELECT * FROM timetable WHERE 1=1'
    if (filters.length) sql += ` AND ${filters.join(' AND ')}`
    sql += tenant.clause
    sql += ' ORDER BY day_order, start_time, class_name, section LIMIT 500'
    params.push(...tenant.params)

    const result = await query(sql, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Timetable list error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router

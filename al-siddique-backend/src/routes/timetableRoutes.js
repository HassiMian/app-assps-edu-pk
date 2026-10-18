'use strict'
const express = require('express')
const router = express.Router()
const { query, pool } = require('../config/database')
const { protect, requireScopeForServiceOnly } = require('../middleware/auth')
const { tenantClause } = require('../middleware/tenant')
const { schoolBellSchedule } = require('../domain/schoolBellSchedule')

const CLASS_NAME_MAP = {
  '1': 'One', 'one': 'One',
  '2': 'Two', 'two': 'Two',
  '3': 'Three', 'three': 'Three',
  '4': 'Four', 'four': 'Four',
  '5': 'Five', 'five': 'Five',
  '6': 'Six', 'six': 'Six',
  '7': 'Seven', 'seven': 'Seven',
  '8': 'Eight', 'eight': 'Eight',
  '9': 'Nine', 'nine': 'Nine', '9-boys': 'Nine', '9-girls': 'Nine', 'usman': 'Nine', 'fatima': 'Nine',
  '10': 'Ten', 'ten': 'Ten',
  'pre-nine': 'Pre-Nine', 'prenine': 'Pre-Nine', 'pre 9': 'Pre-Nine',
  'starter': 'Starter', 'mover': 'Mover', 'flyer': 'Flyer',
  'school-wide': 'School-wide'
}

function normalizeClass(cls) {
  if (!cls) return null
  const key = String(cls).trim().toLowerCase()
  return CLASS_NAME_MAP[key] || String(cls).trim()
}

router.get('/bells', protect, async (req, res) => {
  try {
    const schoolId = req.user?.school_id || 1
    const schedule = schoolBellSchedule(schoolId)
    res.json({ success: true, data: schedule })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.get('/workload', protect, async (req, res) => {
  try {
    const schoolId = req.user?.school_id || 1
    const tenant = await tenantClause(req, { table: 'timetable', paramIndex: 1 })
    
    const workloadSql = `
      SELECT 
        teacher_id, 
        COALESCE(teacher_display_name, 'Unassigned') as teacher_name,
        COUNT(*) as total_periods,
        COUNT(DISTINCT day_name) as teaching_days,
        json_agg(json_build_object(
          'day_name', day_name,
          'period_label', period_label,
          'start_time', start_time,
          'end_time', end_time,
          'class_name', class_name,
          'section', section,
          'subject', subject
        ) ORDER BY day_order, start_time) as assignments
      FROM timetable
      WHERE 1=1 ${tenant.clause} AND teacher_id IS NOT NULL AND day_name != 'Regular'
      GROUP BY teacher_id, teacher_display_name
      ORDER BY total_periods DESC
    `
    const workloadResult = await query(workloadSql, tenant.params)

    const clashSql = `
      SELECT t1.day_name, t1.period_label, t1.start_time, t1.end_time,
             t1.teacher_id, t1.teacher_display_name,
             t1.class_name as class1, t1.section as section1, t1.subject as subject1,
             t2.class_name as class2, t2.section as section2, t2.subject as subject2
      FROM timetable t1
      JOIN timetable t2 ON t1.school_id = t2.school_id 
                       AND t1.day_name = t2.day_name 
                       AND t1.period_label = t2.period_label 
                       AND t1.teacher_id = t2.teacher_id 
                       AND t1.id < t2.id
      WHERE t1.school_id = $1 AND t1.teacher_id IS NOT NULL AND t1.day_name != 'Regular'
        AND NOT (t1.class_name = t2.class_name AND t1.section = t2.section)
      ORDER BY t1.day_order, t1.start_time
    `
    const clashResult = await query(clashSql, [schoolId])

    res.json({
      success: true,
      data: {
        workload: workloadResult.rows,
        clashes: clashResult.rows
      }
    })
  } catch (err) {
    console.error('Workload error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/save', protect, async (req, res) => {
  const client = await pool.connect()
  try {
    const schoolId = req.user?.school_id || 1
    const { class_name, section, day_name, academic_session, entries } = req.body || {}
    
    if (!class_name || !section || !day_name || !Array.isArray(entries)) {
      return res.status(400).json({ 
        success: false, 
        message: 'class_name, section, day_name, and entries array are required' 
      })
    }

    const normClass = normalizeClass(class_name)
    const normSection = String(section).trim()
    const normDay = String(day_name).trim()
    const session = academic_session || '2026–27'

    const dayOrderMap = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
      'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
    }
    const dayOrder = dayOrderMap[normDay] || 1

    await client.query('BEGIN')
    
    await client.query(`
      DELETE FROM timetable 
      WHERE school_id = $1 
        AND LOWER(class_name) = LOWER($2) 
        AND LOWER(section) = LOWER($3) 
        AND LOWER(day_name) = LOWER($4) 
        AND academic_session = $5
    `, [schoolId, normClass, normSection, normDay, session])

    for (const e of entries) {
      if (!e.period_label || !e.subject) continue
      const teacherId = e.teacher_id ? parseInt(e.teacher_id, 10) : null
      const teacherName = e.teacher_display_name ? String(e.teacher_display_name).trim() : ''
      const startTime = e.start_time || '08:45:00'
      const endTime = e.end_time || '09:25:00'
      const room = e.room || ''

      await client.query(`
        INSERT INTO timetable 
        (school_id, day_order, day_name, start_time, end_time, subject, class_name, section, room, period_label, teacher_id, teacher_display_name, academic_session, staff_identity_reviewed)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      `, [schoolId, dayOrder, normDay, startTime, endTime, e.subject, normClass, normSection, room, e.period_label, teacherId, teacherName, session])
    }

    await client.query('COMMIT')
    res.json({ success: true, message: `Timetable for ${normClass} ${normSection} (${normDay}) saved successfully.` })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Timetable save error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  } finally {
    client.release()
  }
})

router.get('/', protect, requireScopeForServiceOnly('school.timetable.read'), async (req, res) => {
  try {
    const filters = []
    const params = []
    let idx = 1

    if (req.query.class) {
      const norm = normalizeClass(req.query.class)
      filters.push(`(LOWER(class_name) = LOWER($${idx++}) OR LOWER(class_name) = LOWER($${idx++}))`)
      params.push(req.query.class.trim(), norm)
    }
    if (req.query.section) {
      filters.push(`LOWER(section) = LOWER($${idx++})`)
      params.push(req.query.section.trim())
    }
    if (req.query.teacher_id) {
      filters.push(`teacher_id = $${idx++}`)
      params.push(req.query.teacher_id)
    }
    if (req.query.day_name) {
      filters.push(`LOWER(day_name) = LOWER($${idx++})`)
      params.push(req.query.day_name.trim())
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

// src/routes/portalRoutes.js
// Apex Connect — Role-based portal dashboard data

const express = require('express')
const router  = express.Router()
const { pool } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

function toSafeDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function weekdayFromDate(dateValue) {
  const date = toSafeDate(dateValue)
  if (!date) return 'Monday'
  return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Karachi' })
}

function buildNotificationMessage({ title, className, section, subject, classDate, startTime }) {
  const sectionSuffix = section ? `-${section}` : ''
  return `${title} scheduled on ${classDate} at ${startTime} for ${subject} (${className}${sectionSuffix}).`
}

async function ensureOnlineClassTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_classes (
      id            SERIAL PRIMARY KEY,
      school_id     INTEGER REFERENCES schools(id),
      teacher_id    INTEGER REFERENCES users(id),
      class_name    VARCHAR(50) NOT NULL,
      section       VARCHAR(20),
      subject       VARCHAR(100) NOT NULL,
      title         VARCHAR(255) NOT NULL,
      class_date    DATE NOT NULL,
      start_time    TIME NOT NULL,
      end_time      TIME NOT NULL,
      meeting_link  TEXT NOT NULL,
      description   TEXT,
      timezone      VARCHAR(64) DEFAULT 'Asia/Karachi',
      created_at    TIMESTAMP DEFAULT NOW()
    );
  `)
  await pool.query(`
    ALTER TABLE online_classes ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
    ALTER TABLE online_classes ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES users(id);
    ALTER TABLE online_classes ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Asia/Karachi';
    ALTER TABLE online_classes ALTER COLUMN school_id DROP DEFAULT;
    CREATE INDEX IF NOT EXISTS idx_online_classes_school_date ON online_classes(school_id, class_date);
    CREATE INDEX IF NOT EXISTS idx_online_classes_teacher_date ON online_classes(teacher_id, class_date);
  `).catch(() => {})
}

async function ensureNotificationColumns() {
  await pool.query(`
    ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(20);
    ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
    CREATE INDEX IF NOT EXISTS idx_notification_log_school_role_sent ON notification_log(school_id, recipient_role, sent_at DESC);
  `).catch(() => {})
}

// GET /api/portal/dashboard — returns real school data for all portal roles
router.get('/dashboard', protect, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const today    = new Date().toISOString().split('T')[0]
    const role = String(req.user?.role || '').toLowerCase()
    const scopedPortalRole = role === 'parent' || role === 'student'
    const studentOwnerColumn = role === 'parent' ? 'parent_user_id' : role === 'student' ? 'student_user_id' : null

    let studentsRes = { rows: [] }
    let attendanceRes = { rows: [] }
    let feesRes = { rows: [] }
    let empRes = { rows: [] }
    let noticesRes = { rows: [] }
    let examsRes = { rows: [] }

    try {
      const studentQuery = scopedPortalRole
        ? `SELECT * FROM students WHERE school_id = $1 AND ${studentOwnerColumn} = $2 ORDER BY created_at DESC`
        : 'SELECT * FROM students WHERE school_id = $1 ORDER BY created_at DESC'
      const studentParams = scopedPortalRole ? [schoolId, req.user?.id || null] : [schoolId]

      const attendanceQuery = scopedPortalRole
        ? `SELECT a.status, COUNT(*) as count
           FROM attendance a
           JOIN students s ON s.id = a.student_id AND s.school_id = a.school_id
           WHERE a.school_id = $1 AND a.date::date = $2 AND s.${studentOwnerColumn} = $3
           GROUP BY a.status`
        : 'SELECT status, COUNT(*) as count FROM attendance WHERE school_id = $1 AND date::date = $2 GROUP BY status'
      const attendanceParams = scopedPortalRole ? [schoolId, today, req.user?.id || null] : [schoolId, today]

      const feesQuery = scopedPortalRole
        ? `SELECT f.status, COALESCE(SUM(f.amount::numeric),0) as total, COUNT(*) as count
           FROM fee_challans f
           JOIN students s ON s.id = f.student_id AND s.school_id = f.school_id
           WHERE f.school_id = $1 AND s.${studentOwnerColumn} = $2
           GROUP BY f.status`
        : 'SELECT status, COALESCE(SUM(amount::numeric),0) as total, COUNT(*) as count FROM fee_challans WHERE school_id = $1 GROUP BY status'
      const feesParams = scopedPortalRole ? [schoolId, req.user?.id || null] : [schoolId]

      const [r1, r2, r3] = await Promise.all([
        pool.query(studentQuery, studentParams),
        pool.query(attendanceQuery, attendanceParams),
        pool.query(feesQuery, feesParams),
      ])
      studentsRes = r1
      attendanceRes = r2
      feesRes = r3

      const optionalQueries = await Promise.allSettled([
        scopedPortalRole ? Promise.resolve({ rows: [] }) : pool.query('SELECT * FROM employees WHERE school_id = $1 ORDER BY created_at DESC LIMIT 20', [schoolId]),
        pool.query('SELECT * FROM notices WHERE school_id = $1 ORDER BY created_at DESC LIMIT 5', [schoolId]),
        pool.query('SELECT * FROM exams WHERE school_id = $1 ORDER BY exam_date DESC LIMIT 10', [schoolId]),
      ])
      const optionalWarnings = []
      const [employeeResult, noticeResult, examResult] = optionalQueries
      if (employeeResult.status === 'fulfilled') empRes = employeeResult.value
      else if (!scopedPortalRole) optionalWarnings.push('Employee summary is temporarily unavailable.')
      if (noticeResult.status === 'fulfilled') noticesRes = noticeResult.value
      else optionalWarnings.push('Recent notices are temporarily unavailable.')
      if (examResult.status === 'fulfilled') examsRes = examResult.value
      else optionalWarnings.push('Recent exams are temporarily unavailable.')
      req.portalWarnings = optionalWarnings
    } catch (e) {
      console.error('Portal dashboard error:', e.message)
      return res.status(503).json({ success: false, message: 'Database unavailable. Portal dashboard is temporarily offline.' })
    }

    const allStudents  = studentsRes.rows
    const totalStudents = allStudents.length

    const attByStatus  = {}
    attendanceRes.rows.forEach(r => { attByStatus[r.status] = parseInt(r.count) })
    const presentCount  = attByStatus.present || 0
    const absentCount   = attByStatus.absent  || 0
    const lateCount     = attByStatus.late    || 0
    const leaveCount    = attByStatus.leave   || 0
    const attPct        = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0
    const unmarkedCount = Math.max(0, totalStudents - (presentCount + absentCount + lateCount + leaveCount))

    const feeByStatus  = {}
    feesRes.rows.forEach(r => { feeByStatus[r.status] = { total: parseFloat(r.total || 0), count: parseInt(r.count) } })
    const paidTotal     = feeByStatus.paid?.total    || 0
    const pendingTotal  = feeByStatus.pending?.total || 0
    const pendingCount  = feeByStatus.pending?.count || 0
    const collectionRate = (paidTotal + pendingTotal) > 0 ? Math.round((paidTotal / (paidTotal + pendingTotal)) * 100) : 0
    const totalStaff    = empRes.rows.length

    // Class distribution
    const classCounts = {}
    allStudents.forEach(s => {
      const c = s.class || 'Unknown'
      classCounts[c] = (classCounts[c] || 0) + 1
    })
    const classDistribution = Object.entries(classCounts)
      .map(([name, value]) => ({ name: `Class ${name}`, value }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Monthly fee collection (last 6 months)
    const feeMonthlyQuery = scopedPortalRole
      ? `
      SELECT TO_CHAR(f.created_at, 'Mon') as month,
             COALESCE(SUM(CASE WHEN f.status='paid' THEN f.amount::numeric ELSE 0 END), 0) as collected,
             COALESCE(SUM(CASE WHEN f.status<>'paid' THEN f.amount::numeric ELSE 0 END), 0) as pending
      FROM fee_challans f
      JOIN students s ON s.id = f.student_id AND s.school_id = f.school_id
      WHERE f.school_id = $1 AND s.${studentOwnerColumn} = $2 AND f.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(f.created_at, 'Mon'), DATE_TRUNC('month', f.created_at)
      ORDER BY DATE_TRUNC('month', f.created_at)
    `
      : `
      SELECT TO_CHAR(created_at, 'Mon') as month,
             COALESCE(SUM(CASE WHEN status='paid' THEN amount::numeric ELSE 0 END), 0) as collected,
             COALESCE(SUM(CASE WHEN status<>'paid' THEN amount::numeric ELSE 0 END), 0) as pending
      FROM fee_challans
      WHERE school_id = $1 AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `
    const feeMonthlyParams = scopedPortalRole ? [schoolId, req.user?.id || null] : [schoolId]
    let feeMonthlyRes = { rows: [] }
    try {
      feeMonthlyRes = await pool.query(feeMonthlyQuery, feeMonthlyParams)
    } catch (err) {
      console.error('Portal fee trend error:', err.message)
      req.portalWarnings = [...(req.portalWarnings || []), 'Fee collection trend is temporarily unavailable.']
    }

    const revenueData = feeMonthlyRes.rows.map(r => ({
      name:      r.month,
      collected: Math.round(parseFloat(r.collected || 0) / 1000),
      pending:   Math.round(parseFloat(r.pending   || 0) / 1000),
    }))

    // Recent 5 students
    const recentStudents = allStudents.slice(0, 5).map(s => ({
      id:    s.id,
      name:  s.name,
      gr:    s.gr_number,
      class: s.class,
      phone: s.parent_phone || s.phone,
    }))

    // Gender split — only recorded values are counted; unknown values stay explicit.
    const boys = allStudents.filter(student => String(student.gender || '').toLowerCase() === 'male').length
    const girls = allStudents.filter(student => String(student.gender || '').toLowerCase() === 'female').length
    const genderUnknown = Math.max(0, totalStudents - boys - girls)
    const genderData = [
      { name: 'Boys', value: boys },
      { name: 'Girls', value: girls },
      ...(genderUnknown ? [{ name: 'Not recorded', value: genderUnknown }] : []),
    ]

    // Recent attendance trend — exact aggregates from the last six recorded school dates.
    const attendanceTrendQuery = scopedPortalRole
      ? `
        SELECT a.date::date AS attendance_date,
               SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::int AS present,
               SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END)::int AS absent
        FROM attendance a
        JOIN students s ON s.id = a.student_id AND s.school_id = a.school_id
        WHERE a.school_id = $1 AND s.${studentOwnerColumn} = $2
        GROUP BY a.date::date
        ORDER BY a.date::date DESC
        LIMIT 6
      `
      : `
        SELECT date::date AS attendance_date,
               SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::int AS present,
               SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END)::int AS absent
        FROM attendance
        WHERE school_id = $1
        GROUP BY date::date
        ORDER BY date::date DESC
        LIMIT 6
      `
    const attendanceTrendParams = scopedPortalRole ? [schoolId, req.user?.id || null] : [schoolId]
    let attendanceTrendRes = { rows: [] }
    try {
      attendanceTrendRes = await pool.query(attendanceTrendQuery, attendanceTrendParams)
    } catch (err) {
      console.error('Portal attendance trend error:', err.message)
      req.portalWarnings = [...(req.portalWarnings || []), 'Attendance trend is temporarily unavailable.']
    }
    const attendanceTrend = attendanceTrendRes.rows.slice().reverse().map(row => ({
      name: toSafeDate(row.attendance_date)?.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Karachi' }) || String(row.attendance_date || ''),
      present: Number(row.present || 0),
      absent: Number(row.absent || 0),
      date: row.attendance_date,
    }))

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents, totalStaff, presentCount, absentCount,
          lateCount, leaveCount, unmarkedCount, attPct,
          paidTotal:   Math.round(paidTotal),
          pendingTotal: Math.round(pendingTotal),
          pendingCount, collectionRate,
        },
        revenueData,
        classDistribution,
        genderData,
        attendanceTrend,
        recentStudents,
        recentNotices: noticesRes.rows,
        recentExams:   examsRes.rows.slice(0, 5),
        employees:     empRes.rows.slice(0, 5),
        role: req.user?.role,
      }
    })
  } catch (error) {
    console.error('Portal dashboard error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch portal data' })
  }
})

// GET /api/portal/timetable — teacher's weekly schedule
router.get('/timetable', protect, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    let entries = []
    let dbError = null

    try {
      const result = await pool.query(
        `SELECT * FROM timetable WHERE school_id = $1 AND teacher_id = $2 ORDER BY day_order, start_time`,
        [schoolId, req.user?.id]
      )
      entries = result.rows
    } catch (err) {
      dbError = err
      console.error('Timetable DB query error:', err.message)
    }

    try {
      await ensureOnlineClassTables()
      const onlineClassResult = await pool.query(
        `
          SELECT
            oc.id,
            oc.class_date,
            TO_CHAR(oc.class_date, 'FMDay') as day,
            CASE EXTRACT(DOW FROM oc.class_date)
              WHEN 0 THEN 6
              WHEN 1 THEN 0
              WHEN 2 THEN 1
              WHEN 3 THEN 2
              WHEN 4 THEN 3
              WHEN 5 THEN 4
              WHEN 6 THEN 5
            END AS day_order,
            oc.start_time,
            oc.end_time,
            oc.subject,
            CONCAT(oc.class_name, COALESCE(CONCAT('-', oc.section), '')) AS class_name,
            COALESCE(oc.meeting_link, 'Online') AS room
          FROM online_classes oc
          WHERE oc.school_id = $1 AND oc.teacher_id = $2
          ORDER BY oc.class_date DESC, oc.start_time ASC
        `,
        [schoolId, req.user?.id]
      )
      entries = [...entries, ...onlineClassResult.rows.map(row => ({
        ...row,
        day: weekdayFromDate(row.class_date),
      }))]
    } catch (onlineErr) {
      console.error('Online classes join error:', onlineErr.message)
    }

    if (dbError && !ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Timetable cannot be loaded.' })
    }

    if (entries.length === 0) {
      return res.json({ success: true, data: { timetable: [], byDay: {} } })
    }

    const byDay = {}
    entries.forEach(e => {
      const d = e.day || 'Monday'
      if (!byDay[d]) byDay[d] = []
      byDay[d].push(e)
    })

    res.json({ success: true, data: { timetable: entries, byDay } })
  } catch (error) {
    console.error('Timetable error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch timetable' })
  }
})

// GET /api/portal/teaching-options — distinct class/section combos for the current school
router.get('/teaching-options', protect, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const result = await pool.query(`
      SELECT class, section
      FROM students
      WHERE school_id = $1 AND (is_active = true OR is_active IS NULL)
      GROUP BY class, section
      ORDER BY class::text ASC, section::text ASC
    `, [schoolId])

    const classes = result.rows
      .map(row => ({
        class_name: String(row.class || '').trim(),
        section: String(row.section || '').trim(),
      }))
      .filter(item => item.class_name)

    const warnings = [...new Set(req.portalWarnings || [])]
    res.json({
      success: true,
      partial: warnings.length > 0,
      warnings,
      data: {
        classes,
        timezone: 'Asia/Karachi',
      },
    })
  } catch (error) {
    console.error('Teaching options error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch teaching options' })
  }
})

// GET /api/portal/online-classes — list scheduled online classes
router.get('/online-classes', protect, async (req, res) => {
  try {
    await ensureOnlineClassTables()
    const schoolId = currentSchoolId(req)
    const isTeacher = req.user?.role === 'teacher'
    const queryText = isTeacher
      ? `
        SELECT oc.*, u.name AS teacher_name
        FROM online_classes oc
        LEFT JOIN users u ON u.id = oc.teacher_id
        WHERE oc.school_id = $1 AND oc.teacher_id = $2
        ORDER BY oc.class_date DESC, oc.start_time DESC
        LIMIT 100
      `
      : `
        SELECT oc.*, u.name AS teacher_name
        FROM online_classes oc
        LEFT JOIN users u ON u.id = oc.teacher_id
        WHERE oc.school_id = $1
        ORDER BY oc.class_date DESC, oc.start_time DESC
        LIMIT 100
      `
    const params = isTeacher ? [schoolId, req.user?.id] : [schoolId]
    const result = await pool.query(queryText, params)

    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Online classes fetch error:', error)
    res.status(500).json({ success: false, message: 'Failed to load online classes' })
  }
})

// POST /api/portal/online-classes — teacher schedules a live class and students get in-app notifications
router.post('/online-classes', protect, requireRoles('teacher', 'admin', 'principal'), async (req, res) => {
  try {
    await ensureOnlineClassTables()
    await ensureNotificationColumns()

    const schoolId = currentSchoolId(req)
    const {
      class_name,
      section,
      subject,
      title,
      class_date,
      start_time,
      end_time,
      meeting_link,
      description = '',
      timezone = 'Asia/Karachi',
    } = req.body || {}

    if (!class_name || !subject || !title || !class_date || !start_time || !end_time || !meeting_link) {
      return res.status(400).json({
        success: false,
        message: 'Class, subject, title, date, start time, end time, and meeting link are required.',
      })
    }

    const startDate = toSafeDate(`${class_date}T${start_time}:00+05:00`)
    const endDate = toSafeDate(`${class_date}T${end_time}:00+05:00`)
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Please provide valid date and time values.' })
    }
    if (endDate <= startDate) {
      return res.status(400).json({ success: false, message: 'End time must be later than start time.' })
    }

    const classResult = await pool.query(`
      INSERT INTO online_classes (
        school_id, teacher_id, class_name, section, subject, title,
        class_date, start_time, end_time, meeting_link, description, timezone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      schoolId,
      req.user?.id || null,
      String(class_name).trim(),
      String(section || '').trim() || null,
      String(subject).trim(),
      String(title).trim(),
      class_date,
      start_time,
      end_time,
      String(meeting_link).trim(),
      String(description || '').trim(),
      String(timezone || 'Asia/Karachi').trim() || 'Asia/Karachi',
    ])

    const insertedClass = classResult.rows[0]

    const studentsResult = await pool.query(`
      SELECT id, name, parent_phone
      FROM students
      WHERE school_id = $1
        AND is_active = true
        AND class = $2
        AND ($3::text IS NULL OR section = $3 OR section IS NULL)
    `, [schoolId, String(class_name).trim(), section ? String(section).trim() : null])

    const recipientMessage = buildNotificationMessage({
      title,
      className: class_name,
      section: section ? String(section).trim() : '',
      subject,
      classDate: class_date,
      startTime: start_time,
    })

    const notificationRows = []
    for (const student of studentsResult.rows) {
      notificationRows.push([
        schoolId,
        student.id,
        'student',
        'online_class',
        title,
        recipientMessage,
        {
          class_name,
          section: section || null,
          subject,
          title,
          class_date,
          start_time,
          end_time,
          meeting_link,
          timezone,
          online_class_id: insertedClass.id,
          recipient: 'student',
        },
      ])
      notificationRows.push([
        schoolId,
        student.id,
        'parent',
        'online_class',
        title,
        recipientMessage,
        {
          class_name,
          section: section || null,
          subject,
          title,
          class_date,
          start_time,
          end_time,
          meeting_link,
          timezone,
          online_class_id: insertedClass.id,
          recipient: 'parent',
        },
      ])
    }

    for (const row of notificationRows) {
      await pool.query(`
        INSERT INTO notification_log (
          school_id, student_id, recipient_role, type, title, message, metadata, status, sent_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'sent', $8)
      `, [
        row[0],
        row[1],
        row[2],
        row[3],
        row[4],
        row[5],
        JSON.stringify(row[6]),
        req.user?.id || null,
      ])
    }

    res.status(201).json({
      success: true,
      message: 'Online class scheduled successfully.',
      data: {
        ...insertedClass,
        notifiedStudents: studentsResult.rows.length,
        notificationsCreated: notificationRows.length,
      },
    })
  } catch (error) {
    console.error('Create online class error:', error)
    res.status(500).json({ success: false, message: 'Failed to schedule online class.' })
  }
})

module.exports = router

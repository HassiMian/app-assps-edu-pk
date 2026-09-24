const express = require('express')
const router  = express.Router()
const { query } = require('../config/database')
const { protect } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const ALLOW_MOCK_FALLBACK = process.env.ALLOW_MOCK_FALLBACK === 'true' && process.env.NODE_ENV !== 'production'

// ── helpers ───────────────────────────────────────────────────────────────────
const safe = async (fn) => { try { return await fn() } catch (err) { console.error('Dashboard query failed:', err.message); return null } }

// ── GET /api/dashboard/stats  (SaaS)
router.get(['/', '/stats'], protect, async (req, res) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
  const year       = new Date().getFullYear()
  const monthName  = new Date().toLocaleString('en-US', { month: 'long' })
  const monthNum   = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const monthLabel = `${year}-${monthNum}`
  const schoolId   = currentSchoolId(req)
  const isSuperAdmin = req.user?.role === 'super_admin'

  const consolidatedSql = `
    WITH stu AS (
      SELECT
        COUNT(*) FILTER (WHERE is_active = true)::int AS total_students,
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS adm_today,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int AS adm_month,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('year', CURRENT_DATE))::int AS adm_year,
        COUNT(*) FILTER (WHERE is_active = false AND updated_at >= date_trunc('month', CURRENT_DATE))::int AS wd_month,
        COUNT(*) FILTER (WHERE is_active = false AND updated_at >= date_trunc('year', CURRENT_DATE))::int AS wd_year
      FROM students
      WHERE 1=1 AND ($1::int IS NULL OR school_id = $1)
    ),
    att AS (
      SELECT
        COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.student_id END)::int AS present,
        COUNT(DISTINCT CASE WHEN a.status = 'absent' THEN a.student_id END)::int AS absent,
        COUNT(DISTINCT CASE WHEN a.status = 'late' THEN a.student_id END)::int AS late,
        COUNT(DISTINCT CASE WHEN a.status = 'leave' THEN a.student_id END)::int AS leave,
        COUNT(DISTINCT a.student_id)::int AS marked
      FROM attendance a
      JOIN students s ON s.id = a.student_id AND s.is_active = true
      WHERE a.date::text = $2 AND ($1::int IS NULL OR s.school_id = $1)
    ),
    fee AS (
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)::float AS collected,
        COALESCE(SUM(CASE WHEN status IN ('unpaid','pending') THEN amount ELSE 0 END), 0)::float AS pending,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0)::float AS overdue,
        COALESCE(SUM(CASE WHEN status = 'paid' AND (month = $3 OR month = $4) THEN amount ELSE 0 END), 0)::float AS collected_month,
        COALESCE(SUM(CASE WHEN status IN ('unpaid','pending') THEN amount ELSE 0 END), 0)::float AS pending_total,
        COUNT(CASE WHEN status IN ('unpaid','pending') THEN 1 END)::int AS pending_count
      FROM fee_challans
      WHERE 1=1 AND ($1::int IS NULL OR school_id = $1)
    ),
    emp AS (
      SELECT COUNT(*)::int AS emp_count
      FROM employees
      WHERE is_active = true AND ($1::int IS NULL OR school_id = $1)
    ),
    adm AS (
      SELECT COUNT(*)::int AS adm_count
      FROM admissions
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    )
    SELECT
      stu.*,
      COALESCE(att.present, 0)::int AS att_present,
      COALESCE(att.absent, 0)::int AS att_absent,
      COALESCE(att.late, 0)::int AS att_late,
      COALESCE(att.leave, 0)::int AS att_leave,
      COALESCE(att.marked, 0)::int AS att_marked,
      COALESCE(fee.collected, 0)::float AS fee_collected,
      COALESCE(fee.pending, 0)::float AS fee_pending,
      COALESCE(fee.overdue, 0)::float AS fee_overdue,
      COALESCE(fee.collected_month, 0)::float AS fee_collected_month,
      COALESCE(fee.pending_total, 0)::float AS fee_pending_total,
      COALESCE(fee.pending_count, 0)::int AS fee_pending_count,
      emp.emp_count,
      COALESCE(adm.adm_count, 0)::int AS adm_count
    FROM stu
    CROSS JOIN att
    CROSS JOIN fee
    CROSS JOIN emp
    CROSS JOIN adm;
  `

  const weeklySql = `
    WITH dates AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval
      )::date AS d
    )
    SELECT
      d.d::text AS date,
      to_char(d.d, 'Dy') AS day,
      COALESCE(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END), 0)::int AS present,
      COALESCE(COUNT(DISTINCT a.student_id), 0)::int AS total,
      CASE WHEN COUNT(DISTINCT a.student_id) > 0
        THEN ROUND(SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)*100.0
             / NULLIF(COUNT(DISTINCT a.student_id),0))::int
        ELSE 0 END AS percent
    FROM dates d
    LEFT JOIN (
      SELECT a.*
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE ($1::int IS NULL OR s.school_id = $1)
    ) a ON a.date = d.d
    GROUP BY d.d ORDER BY d.d
  `

  const [overviewRes, weeklyRes] = await Promise.all([
    safe(() => query(consolidatedSql, [schoolId, today, monthName, monthLabel])),
    safe(() => query(weeklySql, [schoolId])),
  ])

  if (!overviewRes || !weeklyRes) {
    return res.status(503).json({ success: false, message: 'Database unavailable. Dashboard is temporarily offline.' })
  }

  const o = overviewRes.rows[0] || {}
  const students = o.total_students || 0
  const todayPresent = o.att_present || 0
  const todayAbsent  = o.att_absent  || 0
  const todayLate    = o.att_late    || 0
  const todayLeave   = o.att_leave   || 0
  const todayTotal   = todayPresent + todayAbsent + todayLate + todayLeave

  const todayMarked  = o.att_marked || 0
  const todayUnmarked = Math.max(0, students - todayMarked)
  const todayPct     = students > 0 ? Math.round((todayPresent / students) * 100) : (todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0)

  const fsData = {
    collected: o.fee_collected || 0,
    pending:   o.fee_pending   || 0,
    overdue:   o.fee_overdue   || 0,
  }
  const feeCollectedMonth  = parseFloat(o.fee_collected_month || 0)
  const feePendingTotal    = parseFloat(o.fee_pending_total || 0)
  const feePendingCount    = parseInt(o.fee_pending_count || 0)
  const employees  = parseInt(o.emp_count || 0)
  const books      = 0
  const admissions = parseInt(o.adm_count || 0)

  const weeklyR = weeklyRes
  const admTodayR = { rows: [{ c: o.adm_today || 0 }] }
  const admMonthR = { rows: [{ c: o.adm_month || 0 }] }
  const admYearR  = { rows: [{ c: o.adm_year  || 0 }] }
  const wdMonthR  = { rows: [{ c: o.wd_month  || 0 }] }
  const wdYearR   = { rows: [{ c: o.wd_year   || 0 }] }

  const weekly = (weeklyR?.rows || []).map(r => ({
    date:    r.date,
    day:     r.day,
    present: parseInt(r.present || 0),
    total:   parseInt(r.total   || 0),
    percent: parseInt(r.percent || 0),
  }))

  const superAppData = {
    stats: {
      totalStudents:  students,
      totalTeachers:  employees,
      totalParents:   0,
      monthlyRevenue: Math.round(parseFloat(fsData.collected || 0)),
      systemHealth:   99.9,
      attendanceRate: todayPct,
    },
    revenueData:       [],
    gradeDistribution: [],
    performanceTrend:  [],
    departmentStats:   [],
    recentActivities:  [],
    quickModules: [
      { name: 'Teachers', count: employees, path: '/admin/employees', color: 'from-purple-500 to-indigo-500', glow: 'shadow-purple-500/25' },
      { name: 'Students', count: students,  path: '/admin/students', color: 'from-blue-500 to-cyan-500',    glow: 'shadow-blue-500/25' },
    ],
  }

  res.json({
    success: true,
    data: superAppData,
    total_students:      students,
    today_total:         todayTotal,
    today_present:       todayPresent,
    today_absent:        todayAbsent,
    today_late:          todayLate,
    today_leave:         todayLeave,
    today_pct:           todayPct,
    fee_collected_month: feeCollectedMonth,
    fee_pending_total:   feePendingTotal,
    fee_pending_count:   feePendingCount,
    total_employees:     employees,
    books_issued:        books,
    admissions_this_month: admissions,
    weekly_attendance:   weekly,
    fee_status: {
      collected: parseFloat(fsData.collected || 0),
      pending:   parseFloat(fsData.pending   || 0),
      overdue:   parseFloat(fsData.overdue   || 0),
    },
    attendance_stats: {
      students: {
        unmarked: todayUnmarked,
        present: todayPresent,
        absent: todayAbsent,
        late: todayLate,
        leave: todayLeave,
      },
      staff: {
        present: employees,
        absent: 0,
        leave: 0,
      },
    },
    admission_withdrawal: {
      admission_today: parseInt(admTodayR?.rows?.[0]?.c || 0),
      admission_month: parseInt(admMonthR?.rows?.[0]?.c || 0),
      admission_year: parseInt(admYearR?.rows?.[0]?.c || 0),
      withdrawal_month: parseInt(wdMonthR?.rows?.[0]?.c || 0),
      withdrawal_year: parseInt(wdYearR?.rows?.[0]?.c || 0),
    },
  })
})

// ── GET /api/dashboard/class-stats
router.get('/class-stats', protect, async (req, res) => {
  const schoolId = currentSchoolId(req)
  const isSuperAdmin = req.user?.role === 'super_admin'
  const result = await safe(() => query(`
    SELECT
      s.class                                                               AS class_id,
      s.class                                                               AS class_name,
      COUNT(DISTINCT s.id)::int                                             AS total,
      COALESCE(SUM(CASE WHEN a.status='present' AND a.date=CURRENT_DATE
                        THEN 1 ELSE 0 END), 0)::int                        AS present_today,
      CASE WHEN COUNT(DISTINCT s.id) > 0
        THEN ROUND(COALESCE(SUM(CASE WHEN a.status='present' AND a.date=CURRENT_DATE
                                     THEN 1 ELSE 0 END),0)*100.0
             / NULLIF(COUNT(DISTINCT s.id),0))::int
        ELSE 0 END                                                          AS attendance_percent,
      COALESCE(SUM(CASE WHEN f.status='paid' THEN f.amount ELSE 0 END),0)::int
                                                                            AS fee_collected,
      COALESCE(SUM(CASE WHEN f.status IN('unpaid','pending') THEN f.amount ELSE 0 END),0)::int
                                                                           AS fee_pending
    FROM students s
    LEFT JOIN attendance a ON a.student_id = s.id
    LEFT JOIN fee_challans f ON f.student_id = s.id
    WHERE s.is_active = true${isSuperAdmin ? '' : ' AND s.school_id = $1'}
    GROUP BY s.class
    ORDER BY s.class
  `, isSuperAdmin ? [] : [schoolId]))

  if (result === null) {
    return res.status(503).json({ success: false, message: 'Database unavailable. Class stats cannot be loaded.' })
  }

  res.json(result?.rows || [])
})

// ── GET /api/dashboard/activity
router.get('/activity', protect, async (req, res) => {
  const schoolId = currentSchoolId(req)
  const isSuperAdmin = req.user?.role === 'super_admin'
  const [studentsR, feesR, attR] = await Promise.all([
    safe(() => query(`
      SELECT name, created_at FROM students
      WHERE is_active = true${isSuperAdmin ? '' : ' AND school_id = $1'}
      ORDER BY created_at DESC LIMIT 3`, isSuperAdmin ? [] : [schoolId])),
    safe(() => query(`
      SELECT s.name, f.amount, f.status, f.updated_at
      FROM fee_challans f JOIN students s ON s.id = f.student_id
      WHERE f.status = 'paid'${isSuperAdmin ? '' : ' AND s.school_id = $1'}
      ORDER BY f.updated_at DESC LIMIT 3`, isSuperAdmin ? [] : [schoolId])),
    safe(() => query(`
      SELECT COUNT(*) AS absent_count, MAX(a.date) AS date
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE a.status != 'present' AND a.date = CURRENT_DATE${isSuperAdmin ? '' : ' AND s.school_id = $1'}`, isSuperAdmin ? [] : [schoolId])),
  ])

  if ([studentsR, feesR, attR].some(r => r === null)) {
    return res.status(503).json({ success: false, message: 'Database unavailable. Activity feed cannot be loaded.' })
  }

  const activity = []

  ;(studentsR?.rows || []).forEach(r => activity.push({
    icon:    '🎓',
    message: `New student enrolled: ${r.name}`,
    time:    r.created_at,
  }))
  ;(feesR?.rows || []).forEach(r => activity.push({
    icon:    '💰',
    message: `Fee paid: ${r.name} — Rs. ${r.amount}`,
    time:    r.updated_at,
  }))
  const absent = parseInt(attR?.rows?.[0]?.absent_count || 0)
  if (absent > 0) activity.push({
    icon:    '📋',
    message: `${absent} students marked absent today`,
    time:    new Date().toISOString(),
  })

  activity.sort((a, b) => new Date(b.time) - new Date(a.time))
  res.json(activity)
})

module.exports = router

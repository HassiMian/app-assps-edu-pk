const express = require('express')
const router  = express.Router()
const { query } = require('../config/database')
const { protect } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const ALLOW_MOCK_FALLBACK = process.env.ALLOW_MOCK_FALLBACK === 'true' && process.env.NODE_ENV !== 'production'

// ── helpers ───────────────────────────────────────────────────────────────────
const safe = async (fn) => { try { return await fn() } catch (err) { console.error('Dashboard query failed:', err.message); return null } }

// ── GET /api/dashboard/stats  (SaaS)
// ── GET /api/admin/dashboard  (Super App — same handler via apiRouter alias)
router.get(['/', '/stats'], protect, async (req, res) => {
  const today      = new Date().toISOString().split('T')[0]
  const year       = new Date().getFullYear()
  const monthName  = new Date().toLocaleString('en-US', { month: 'long' })
  const monthNum   = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const monthLabel = `${year}-${monthNum}`
  const schoolId   = currentSchoolId(req)
  const isSuperAdmin = req.user?.role === 'super_admin'

  const studentScope = isSuperAdmin ? [] : [schoolId]
  const studentScopeAt2 = isSuperAdmin ? [today] : [today, schoolId]
  const feeScope = isSuperAdmin ? [] : [schoolId]
  const feeScopeMonth = isSuperAdmin ? [monthName, monthLabel] : [schoolId, monthName, monthLabel]

  const studentTenant = isSuperAdmin ? '' : ' AND school_id = $1'
  const studentParams = isSuperAdmin ? [] : [schoolId]

  const [studentsR, todayAttR, todayAttDistinctR, feeStatusR, feeMonthR, feePendR,
         employeesR, booksR, admissionsR, weeklyR,
         admTodayR, admMonthR, admYearR, wdMonthR, wdYearR] = await Promise.all([
    safe(() => query(`
      SELECT COUNT(*)
      FROM students
      WHERE is_active = true${isSuperAdmin ? '' : ' AND school_id = $1'}`, studentScope)),
    safe(() => query(`
      SELECT
        COUNT(*)                                                          AS total,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)              AS present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END)               AS absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END)                 AS late,
        SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END)                AS leave
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE a.date::text = $1${isSuperAdmin ? '' : ' AND s.school_id = $2'}`,
      studentScopeAt2)),
    safe(() => query(`
      SELECT
        COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.student_id END)::int AS present,
        COUNT(DISTINCT CASE WHEN a.status = 'absent' THEN a.student_id END)::int  AS absent,
        COUNT(DISTINCT CASE WHEN a.status = 'late' THEN a.student_id END)::int    AS late,
        COUNT(DISTINCT CASE WHEN a.status = 'leave' THEN a.student_id END)::int   AS leave,
        COUNT(DISTINCT a.student_id)::int AS marked
      FROM attendance a
      JOIN students s ON s.id = a.student_id AND s.is_active = true
      WHERE a.date::text = $1${isSuperAdmin ? '' : ' AND s.school_id = $2'}`,
      studentScopeAt2)),
    safe(() => query(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS collected,
        COALESCE(SUM(CASE WHEN status IN ('unpaid','pending') THEN amount ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) AS overdue
      FROM fee_challans${isSuperAdmin ? '' : ' WHERE school_id = $1'}`, feeScope)),
    safe(() => query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM fee_challans
      WHERE status = 'paid'${isSuperAdmin ? ' AND (month = $1 OR month = $2)' : ' AND school_id = $1 AND (month = $2 OR month = $3)'}`,
      feeScopeMonth)),
    safe(() => query(`
      SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
      FROM fee_challans
      WHERE status IN ('unpaid','pending')${isSuperAdmin ? '' : ' AND school_id = $1'}`, feeScope)),
    safe(() => query(`
      SELECT COUNT(*)
      FROM employees
      WHERE is_active = true${isSuperAdmin ? '' : ' AND school_id = $1'}`, studentScope)),
    safe(() => query(`SELECT 0 AS count`)),
    safe(() => query(`
      SELECT COUNT(*) FROM admissions
      WHERE created_at >= date_trunc('month', CURRENT_DATE)`)),
    safe(() => query(`
      WITH dates AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval
        )::date AS d
      )
      SELECT
        d.d::text                                                                      AS date,
        to_char(d.d, 'Dy')                                                             AS day,
        COALESCE(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END), 0)::int       AS present,
        COALESCE(COUNT(DISTINCT a.student_id), 0)::int                                 AS total,
        CASE WHEN COUNT(DISTINCT a.student_id) > 0
          THEN ROUND(SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)*100.0
               / NULLIF(COUNT(DISTINCT a.student_id),0))::int
          ELSE 0 END                                                                   AS percent
      FROM dates d
      LEFT JOIN (
        SELECT a.*
        FROM attendance a
        JOIN students s ON s.id = a.student_id
        ${isSuperAdmin ? '' : 'WHERE s.school_id = $1'}
      ) a ON a.date = d.d
      GROUP BY d.d ORDER BY d.d`, isSuperAdmin ? [] : [schoolId])),
    safe(() => query(`
      SELECT COUNT(*)::int AS c FROM students
      WHERE created_at::date = CURRENT_DATE${studentTenant}`, studentParams)),
    safe(() => query(`
      SELECT COUNT(*)::int AS c FROM students
      WHERE created_at >= date_trunc('month', CURRENT_DATE)${studentTenant}`, studentParams)),
    safe(() => query(`
      SELECT COUNT(*)::int AS c FROM students
      WHERE created_at >= date_trunc('year', CURRENT_DATE)${studentTenant}`, studentParams)),
    safe(() => query(`
      SELECT COUNT(*)::int AS c FROM students
      WHERE is_active = false
        AND updated_at >= date_trunc('month', CURRENT_DATE)${studentTenant}`, studentParams)),
    safe(() => query(`
      SELECT COUNT(*)::int AS c FROM students
      WHERE is_active = false
        AND updated_at >= date_trunc('year', CURRENT_DATE)${studentTenant}`, studentParams)),
  ])

  const dashboardDbOffline = [studentsR, todayAttR, todayAttDistinctR, feeStatusR, feeMonthR, feePendR, employeesR, weeklyR].some(r => r === null)
  if (dashboardDbOffline) {
    return res.status(503).json({ success: false, message: 'Database unavailable. Dashboard is temporarily offline.' })
  }

  const students = parseInt(studentsR?.rows?.[0]?.count || 0)
  const attTotal = todayAttR?.rows?.[0] || {}
  const attDist  = todayAttDistinctR?.rows?.[0] || {}

  const todayPresent = parseInt(attDist.present || attTotal.present || 0)
  const todayAbsent  = parseInt(attDist.absent  || attTotal.absent  || 0)
  const todayLate    = parseInt(attDist.late    || attTotal.late    || 0)
  const todayLeave   = parseInt(attDist.leave   || attTotal.leave   || 0)
  const todayTotal   = todayPresent + todayAbsent + todayLate + todayLeave

  const todayMarked  = parseInt(attDist.marked || 0)
  const todayUnmarked = Math.max(0, students - todayMarked)
  const todayPct     = students > 0 ? Math.round((todayPresent / students) * 100) : (todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0)

  const fsData = feeStatusR?.rows?.[0] || { collected: 0, pending: 0, overdue: 0 }
  const feeCollectedMonth  = parseFloat(feeMonthR?.rows?.[0]?.total || 0)
  const feePendingTotal    = parseFloat(feePendR?.rows?.[0]?.total  || 0)
  const feePendingCount    = parseInt(feePendR?.rows?.[0]?.cnt      || 0)
  const employees  = parseInt(employeesR?.rows?.[0]?.count  || 0)
  const books      = parseInt(booksR?.rows?.[0]?.count      || 0)
  const admissions = parseInt(admissionsR?.rows?.[0]?.count || 0)

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

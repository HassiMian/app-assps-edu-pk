const express = require('express')
const router  = express.Router()
const { query } = require('../config/database')
const { protect } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const ALLOW_MOCK_FALLBACK = process.env.NODE_ENV !== 'production'

// ── helpers ───────────────────────────────────────────────────────────────────
const safe = async (fn) => { try { return await fn() } catch (err) { console.error('Dashboard query failed:', err.message); return null } }

// ── GET /api/dashboard/stats  (SaaS)
// ── GET /api/admin/dashboard  (Super App — same handler via apiRouter alias)
router.get(['/', '/stats'], protect, async (req, res) => {
  const today      = new Date().toISOString().split('T')[0]
  const year       = new Date().getFullYear()
  const month      = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const monthLabel = `${year}-${month}`
  const schoolId   = currentSchoolId(req)
  const isSuperAdmin = req.user?.role === 'super_admin'
  const studentScope = isSuperAdmin ? [] : [schoolId]
  const studentScopeAt2 = isSuperAdmin ? [] : [today, schoolId]
  const feeScope = isSuperAdmin ? [] : [schoolId]
  const feeScopeMonth = isSuperAdmin ? [monthLabel] : [schoolId, monthLabel]

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
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)              AS present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END)               AS absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END)                 AS late,
        SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END)                AS leave
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE a.date = $1${isSuperAdmin ? '' : ' AND s.school_id = $2'}`,
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
      WHERE a.date = $1${isSuperAdmin ? '' : ' AND s.school_id = $2'}`,
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
      WHERE status = 'paid'${isSuperAdmin ? ' AND month = $1' : ' AND school_id = $1 AND month = $2'}`,
      feeScopeMonth)),
    safe(() => query(`
      SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
      FROM fee_challans
      WHERE status IN ('unpaid','pending')${isSuperAdmin ? '' : ' AND school_id = $1'}`, feeScope)),
    safe(() => query(`
      SELECT COUNT(*)
      FROM employees
      WHERE is_active = true${isSuperAdmin ? '' : ' AND school_id = $1'}`, studentScope)),
    safe(() => query(`SELECT 0 AS count`)), // library table does not exist yet
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

  const dashboardDbOffline = [studentsR, todayAttR, feeStatusR, feeMonthR, feePendR, employeesR, weeklyR].some(r => r === null)
  if (dashboardDbOffline) {
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Dashboard is temporarily offline.' })
    }
    console.warn('Dashboard offline fallback active. Returning high-fidelity mock dashboard data.')
    const mockWeeklyAttendance = [
      { date: today, day: 'Mon', present: 145, total: 150, percent: 97 },
      { date: today, day: 'Tue', present: 142, total: 150, percent: 95 },
      { date: today, day: 'Wed', present: 148, total: 150, percent: 99 },
      { date: today, day: 'Thu', present: 140, total: 150, percent: 93 },
      { date: today, day: 'Fri', present: 146, total: 150, percent: 97 },
      { date: today, day: 'Sat', present: 0, total: 0, percent: 0 },
      { date: today, day: 'Sun', present: 0, total: 0, percent: 0 },
    ]
    const superAppData = {
      stats: {
        totalStudents:  150,
        totalTeachers:  12,
        totalParents:   95,
        monthlyRevenue: 350000,
        systemHealth:   99.9,
        attendanceRate: 97,
      },
      revenueData: [
        { month: 'Jan', revenue: 320000 },
        { month: 'Feb', revenue: 340000 },
        { month: 'Mar', revenue: 310000 },
        { month: 'Apr', revenue: 350000 },
        { month: 'May', revenue: 360000 },
      ],
      gradeDistribution: [
        { grade: 'A+', count: 25 },
        { grade: 'A', count: 45 },
        { grade: 'B', count: 50 },
        { grade: 'C', count: 20 },
        { grade: 'D', count: 10 },
      ],
      performanceTrend: [
        { exam: 'Mid Term', average: 78 },
        { exam: 'Final Term', average: 82 },
      ],
      departmentStats: [
        { department: 'Science', teachers: 5 },
        { department: 'Arts', teachers: 3 },
        { department: 'Commerce', teachers: 4 },
      ],
      recentActivities: [
        { id: 1, message: 'New student Muhammad Ali enrolled in Class 10', time: '10 mins ago' },
        { id: 2, message: 'Fee payment of Rs. 2,500 received for Zaid Ahmed', time: '1 hour ago' },
        { id: 3, message: 'Attendance marked: 97% students present today', time: '2 hours ago' },
      ],
      quickModules: [
        { name: 'Teachers', count: 12, path: '/admin/employees', color: 'from-purple-500 to-indigo-500', glow: 'shadow-purple-500/25' },
        { name: 'Students', count: 150,  path: '/admin/students', color: 'from-blue-500 to-cyan-500',    glow: 'shadow-blue-500/25' },
      ],
    }

    return res.json({
      success: true,
      data: superAppData,
      total_students:      150,
      today_total:         150,
      today_present:       145,
      today_absent:        3,
      today_late:          2,
      today_leave:         0,
      today_pct:           97,
      fee_collected_month: 350000,
      fee_pending_total:   45000,
      fee_pending_count:   18,
      total_employees:     12,
      books_issued:        34,
      admissions_this_month: 12,
      weekly_attendance:   mockWeeklyAttendance,
      fee_status: {
        collected: 350000,
        pending:   45000,
        overdue:   15000,
      },
      attendance_stats: {
        students: { unmarked: 5, present: 145, absent: 3, late: 2, leave: 0 },
        staff: { present: 12, absent: 0, leave: 0 },
      },
      admission_withdrawal: {
        admission_today: 2,
        admission_month: 12,
        admission_year: 45,
        withdrawal_month: 1,
        withdrawal_year: 3,
      },
    })
  }

  const students   = parseInt(studentsR?.rows?.[0]?.count   || 0)
  const att        = todayAttR?.rows?.[0]  || { total: 0, present: 0, absent: 0, late: 0, leave: 0 }
  const attDist    = todayAttDistinctR?.rows?.[0] || { present: 0, absent: 0, late: 0, leave: 0, marked: 0 }
  const todayTotal   = parseInt(att.total   || 0)
  const todayPresent = parseInt(attDist.present ?? att.present ?? 0)
  const todayAbsent  = parseInt(attDist.absent ?? att.absent ?? 0)
  const todayLate    = parseInt(attDist.late ?? att.late ?? 0)
  const todayLeave   = parseInt(attDist.leave ?? att.leave ?? 0)
  const todayMarked  = parseInt(attDist.marked || 0)
  const todayUnmarked = Math.max(0, students - todayMarked)
  const todayPct     = students > 0 ? Math.round((todayPresent / students) * 100) : (todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0)

  const fs = feeStatusR?.rows?.[0] || { collected: 0, pending: 0, overdue: 0 }
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

  // Super App expects a nested data shape
  const superAppData = {
    stats: {
      totalStudents:  students,
      totalTeachers:  employees,
      totalParents:   0,
      monthlyRevenue: Math.round(parseFloat(fs.collected || 0)),
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
    // Flat fields for SaaS Dashboard
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
      collected: parseFloat(fs.collected || 0),
      pending:   parseFloat(fs.pending   || 0),
      overdue:   parseFloat(fs.overdue   || 0),
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
    LEFT JOIN attendance a ON a.student_id = s.id AND a.school_id = s.school_id
    LEFT JOIN fee_challans f ON f.student_id = s.id AND f.school_id = s.school_id
    WHERE s.is_active = true${isSuperAdmin ? '' : ' AND s.school_id = $1'}
    GROUP BY s.class
    ORDER BY s.class
  `, isSuperAdmin ? [] : [schoolId]))

  if (result === null) {
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Class stats cannot be loaded.' })
    }
    console.warn('Dashboard class-stats offline fallback active. Returning high-fidelity mock class stats.')
    const mockClassStats = [
      { class_id: '9', class_name: 'Class 9', total: 45, present_today: 43, attendance_percent: 95, fee_collected: 110000, fee_pending: 12000 },
      { class_id: '10', class_name: 'Class 10', total: 55, present_today: 54, attendance_percent: 98, fee_collected: 135000, fee_pending: 15000 },
      { class_id: '8', class_name: 'Class 8', total: 50, present_today: 48, attendance_percent: 96, fee_collected: 105000, fee_pending: 18000 },
    ]
    return res.json(mockClassStats)
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
      FROM fee_challans f JOIN students s ON s.id = f.student_id AND s.school_id = f.school_id
      WHERE f.status = 'paid'${isSuperAdmin ? '' : ' AND s.school_id = $1'}
      ORDER BY f.updated_at DESC LIMIT 3`, isSuperAdmin ? [] : [schoolId])),
    safe(() => query(`
      SELECT COUNT(*) AS absent_count, MAX(a.date) AS date
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE a.status != 'present' AND a.date = CURRENT_DATE${isSuperAdmin ? '' : ' AND s.school_id = $1'}`, isSuperAdmin ? [] : [schoolId])),
  ])

  if ([studentsR, feesR, attR].some(r => r === null)) {
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Activity feed cannot be loaded.' })
    }
    console.warn('Dashboard activity offline fallback active. Returning high-fidelity mock activities.')
    const mockActivities = [
      { icon: '🎓', message: 'New student enrolled: Muhammad Ali', time: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
      { icon: '💰', message: 'Fee paid: Zaid Ahmed — Rs. 2,500', time: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
      { icon: '📋', message: '5 students marked absent today', time: new Date().toISOString() },
    ]
    return res.json(mockActivities)
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

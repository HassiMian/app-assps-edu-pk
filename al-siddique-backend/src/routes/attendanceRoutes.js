require('dotenv').config()
const express = require('express')
const router = express.Router()
const { pool, query } = require('../config/database')
const { protect, requireRoles, requireScopeForServiceOnly, hasServiceScope } = require('../middleware/auth')
const { tenantClause, currentSchoolId, currentTenantId, hasColumn } = require('../middleware/tenant')
const {
  getTwilioConfigForSchool,
  buildTwilioClient,
} = require('../services/twilioSettings')

const ALLOW_MOCK_FALLBACK = process.env.ALLOW_MOCK_FALLBACK === 'true' && process.env.NODE_ENV !== 'production'
const canMarkAttendance = requireRoles('super_admin', 'admin', 'principal', 'teacher')
const ATTENDANCE_STATUSES = ['present', 'absent', 'leave', 'late']
const ATTENDANCE_READ_ROLES = new Set(['super_admin', 'admin', 'principal', 'school_admin', 'teacher'])

function getPakistanDateOnly(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function scopedAttendanceReadClause(req, alias = 's', startIndex = 1) {
  const role = String(req.user?.role || '').toLowerCase()
  const prefix = alias ? `${alias}.` : ''
  if (ATTENDANCE_READ_ROLES.has(role)) return { clause: '', params: [], nextIndex: startIndex }
  if (req.user?.account_type === 'service' && hasServiceScope(req, 'school.attendance.read')) {
    return { clause: '', params: [], nextIndex: startIndex }
  }
  if (role === 'parent') {
    return { clause: ` AND ${prefix}parent_user_id = $${startIndex}`, params: [req.user?.id || null], nextIndex: startIndex + 1 }
  }
  if (role === 'student') {
    return { clause: ` AND ${prefix}student_user_id = $${startIndex}`, params: [req.user?.id || null], nextIndex: startIndex + 1 }
  }
  return { clause: ' AND 1=0', params: [], nextIndex: startIndex }
}

function requireAttendanceAnalyticsAccess(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase()
  if (ATTENDANCE_READ_ROLES.has(role)) return next()
  if (req.user?.account_type === 'service' && hasServiceScope(req, 'school.attendance.read')) return next()
  return res.status(403).json({ success: false, message: 'Attendance analytics/report access denied.' })
}

function normalizeAttendanceStatus(status) {
  const value = String(status || '').trim().toLowerCase()
  if (!ATTENDANCE_STATUSES.includes(value)) {
    throw new Error('Invalid attendance status')
  }
  return value
}

function normalizeAttendanceRecord(record, fallbackDate) {
  const studentId = record.student_id || record.studentId
  if (!studentId) {
    throw new Error('Student ID is required')
  }

  return {
    student_id: studentId,
    date: record.date || fallbackDate || getPakistanDateOnly(),
    status: normalizeAttendanceStatus(record.status),
    note: record.note || record.remarks || null,
  }
}

function parseDate(value, fallback) {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date
}

function dateOnly(date) {
  return getPakistanDateOnly(date)
}

function defaultHistoryRange() {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 30)
  return {
    from: dateOnly(start),
    to: dateOnly(today),
  }
}

function summarizeAttendance(records) {
  const summary = {
    present: 0,
    absent: 0,
    leave: 0,
    late: 0,
    totalMarked: records.length,
  }

  for (const record of records) {
    const status = String(record.status || '').toLowerCase()
    if (status === 'present') summary.present++
    if (status === 'absent') summary.absent++
    if (status === 'leave') summary.leave++
    if (status === 'late') summary.late++
  }

  summary.attendancePercentage = summary.totalMarked > 0
    ? Math.round((summary.present / summary.totalMarked) * 100)
    : 0

  return summary
}

function normalizePakistanPhone(phone) {
  return `+92${String(phone).replace(/^0/, '').replace(/\D/g, '')}`
}

async function notifyParent(phone, studentName, status, date, twilioClient, twilioConfig) {
  if (!twilioClient || !twilioConfig?.waFrom || !phone) return
  const statusLabel = status === 'absent' ? 'Absent' : status === 'late' ? 'Late' : null
  if (!statusLabel) return

  const formattedPhone = `whatsapp:${normalizePakistanPhone(phone)}`
  const dateStr = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const msg = `*Al Siddique Scholars Public School*\n\nAttendance Alert - ${dateStr}\n\nStudent: *${studentName}*\nStatus: *${statusLabel}*\n\nFor queries, contact the school office.`

  twilioClient.messages.create({
    to: formattedPhone,
    from: twilioConfig.waFrom,
    body: msg,
  }).catch(() => {})
}

// GET /api/attendance
router.get('/', protect, requireScopeForServiceOnly('school.attendance.read'), async (req, res) => {
  try {
    const { class: cls, section, date } = req.query
    let sql = `
      SELECT a.*, s.name, s.gr_number, s.roll_number, s.class, s.section
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE 1=1
    `
    const params = []
    let i = 1
    const tenant = await tenantClause(req, { table: 'students', alias: 's', paramIndex: i })
    sql += tenant.clause
    params.push(...tenant.params)
    i = tenant.nextIndex
    const readScope = scopedAttendanceReadClause(req, 's', i)
    sql += readScope.clause
    params.push(...readScope.params)
    i = readScope.nextIndex
    if (date) { sql += ` AND a.date = $${i++}`; params.push(date) }
    if (cls) { sql += ` AND s.class = $${i++}`; params.push(cls) }
    if (section) { sql += ` AND s.section = $${i++}`; params.push(section) }
    sql += ' ORDER BY s.roll_number'

    const result = await query(sql, params)
    res.json({ success: true, count: result.rowCount, data: result.rows })
  } catch (err) {
    console.error('Attendance GET error:', err.message)
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }

    const mockAttendance = [
      {
        id: 1,
        student_id: 1,
        date: req.query.date || new Date().toISOString().split('T')[0],
        status: 'present',
        marked_by: 'Ahmed Raza',
        name: 'Muhammad Ali',
        gr_number: 'GR-1001',
        roll_number: '1',
        class: '10',
        section: 'A',
      },
      {
        id: 2,
        student_id: 2,
        date: req.query.date || new Date().toISOString().split('T')[0],
        status: 'absent',
        marked_by: 'Ahmed Raza',
        name: 'Ayesha Fatima',
        gr_number: 'GR-1002',
        roll_number: '2',
        class: '10',
        section: 'A',
      },
      {
        id: 3,
        student_id: 3,
        date: req.query.date || new Date().toISOString().split('T')[0],
        status: 'late',
        marked_by: 'Ahmed Raza',
        name: 'Zainab Bibi',
        gr_number: 'GR-1003',
        roll_number: '5',
        class: '9',
        section: 'B',
      }
    ]

    let filtered = mockAttendance
    const { class: cls, section } = req.query
    if (cls) filtered = filtered.filter(a => a.class === cls)
    if (section) filtered = filtered.filter(a => a.section === section)
    return res.json({ success: true, count: filtered.length, data: filtered })
  }
})

// POST /api/attendance/mark â€” bulk mark
router.post('/mark', protect, canMarkAttendance, async (req, res) => {
  const { records, marked_by } = req.body
  const inputRecords = Array.isArray(records)
    ? records
    : (req.body.student_id || req.body.studentId ? [req.body] : null)

  if (!Array.isArray(inputRecords) || !inputRecords.length) {
    return res.status(400).json({ success: false, message: 'Attendance records are required' })
  }

  let normalizedRecords
  try {
    normalizedRecords = inputRecords.map((record) => normalizeAttendanceRecord(record, req.body.date))
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || 'Invalid attendance record' })
  }

  const client = await pool.connect()
  try {
    const schoolId = currentSchoolId(req)
    const tenantId = currentTenantId(req)
    const twilioConfig = await getTwilioConfigForSchool(schoolId)
    const twilioClient = buildTwilioClient(twilioConfig)
    const supportsStudentSchool = await hasColumn('students', 'school_id')
    const supportsStudentTenant = await hasColumn('students', 'tenant_id')
    const supportsAttendanceSchool = await hasColumn('attendance', 'school_id')
    const supportsAttendanceTenant = await hasColumn('attendance', 'tenant_id')
    const supportsAttendanceNote = await hasColumn('attendance', 'note')
    const toNotify = []

    const studentColumns = ['id', 'name', 'parent_phone']
    if (supportsStudentSchool) studentColumns.push('school_id')
    if (supportsStudentTenant) studentColumns.push('tenant_id')

    await client.query('BEGIN')

    // 1. Bulk pre-validate all requested student IDs
    const requestedIds = [...new Set(normalizedRecords.map(r => Number(r.student_id)).filter(id => Number.isInteger(id)))]
    if (requestedIds.length !== normalizedRecords.length) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        error: 'INVALID_STUDENT_IDS',
        message: 'Invalid or non-integer student ID detected in payload.',
        invalidIds: normalizedRecords.filter(r => !Number.isInteger(Number(r.student_id))).map(r => r.student_id),
        saved: 0,
      })
    }

    let rosterSql = `SELECT ${studentColumns.join(', ')} FROM students WHERE id = ANY($1::int[]) AND is_active = true`
    const rosterParams = [requestedIds]
    let pIdx = 2
    if (req.user?.role !== 'super_admin') {
      if (supportsStudentTenant && tenantId) {
        rosterSql += ` AND tenant_id = $${pIdx++}`
        rosterParams.push(tenantId)
      } else if (supportsStudentSchool && schoolId) {
        rosterSql += ` AND school_id = $${pIdx++}`
        rosterParams.push(schoolId)
      }
    }

    const rosterResult = await client.query(rosterSql, rosterParams)
    const studentMap = new Map(rosterResult.rows.map(s => [Number(s.id), s]))
    const invalidIds = requestedIds.filter(id => !studentMap.has(Number(id)))

    if (invalidIds.length > 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        error: 'INVALID_STUDENT_IDS',
        message: `Attendance rejected: ${invalidIds.length} student(s) do not exist, are inactive, or are unauthorized for your school/tenant.`,
        invalidIds,
        saved: 0,
      })
    }

    // 2. Atomic upsert loop inside transaction
    let saved = 0
    const markedByUserId = Number.isInteger(Number(marked_by))
      ? Number(marked_by)
      : (Number.isInteger(Number(req.user?.id)) ? Number(req.user.id) : null)

    for (const r of normalizedRecords) {
      const student = studentMap.get(Number(r.student_id))
      if ((r.status === 'absent' || r.status === 'late') && student.parent_phone) {
        toNotify.push({
          name: student.name,
          phone: student.parent_phone,
          status: r.status,
          date: r.date,
        })
      }

      const columns = []
      const values = []
      const attendanceParams = []

      if (supportsAttendanceSchool) {
        columns.push('school_id')
        values.push(`$${attendanceParams.length + 1}`)
        attendanceParams.push(student.school_id || schoolId || null)
      }

      if (supportsAttendanceTenant) {
        columns.push('tenant_id')
        values.push(`$${attendanceParams.length + 1}`)
        attendanceParams.push(student.tenant_id || tenantId || null)
      }

      columns.push('student_id', 'date', 'status', 'marked_by')
      values.push(
        `$${attendanceParams.length + 1}`,
        `$${attendanceParams.length + 2}`,
        `$${attendanceParams.length + 3}`,
        `$${attendanceParams.length + 4}`
      )
      attendanceParams.push(r.student_id, r.date, r.status, markedByUserId)

      if (supportsAttendanceNote) {
        columns.push('note')
        values.push(`$${attendanceParams.length + 1}`)
        attendanceParams.push(r.note)
      }

      const updateParts = ['status = EXCLUDED.status', 'marked_by = EXCLUDED.marked_by']
      if (supportsAttendanceSchool) updateParts.push('school_id = EXCLUDED.school_id')
      if (supportsAttendanceTenant) updateParts.push('tenant_id = EXCLUDED.tenant_id')
      if (supportsAttendanceNote) updateParts.push('note = EXCLUDED.note')

      const attendanceSql = `
        INSERT INTO attendance (${columns.join(', ')})
        VALUES (${values.join(', ')})
        ON CONFLICT (student_id, date) DO UPDATE SET ${updateParts.join(', ')}
        RETURNING id
      `

      const insertRes = await client.query(attendanceSql, attendanceParams)
      if (insertRes.rowCount > 0) {
        saved++
      }
    }

    if (saved !== normalizedRecords.length) {
      await client.query('ROLLBACK')
      return res.status(500).json({
        success: false,
        error: 'INCOMPLETE_BATCH_PERSISTENCE',
        message: `Attendance batch failed invariant check: requested ${normalizedRecords.length}, persisted ${saved}. Rolled back completely.`,
        saved: 0,
      })
    }

    await client.query('COMMIT')

    res.json({
      success: true,
      message: `${saved} records save ho gaye`,
      savedCount: saved,
      requestedCount: normalizedRecords.length,
    })

    for (const item of toNotify) {
      void notifyParent(item.phone, item.name, item.status, item.date, twilioClient, twilioConfig)
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Attendance mark error:', err.message)
    return res.status(500).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: 'Database error: Attendance could not be saved. ' + err.message,
      saved: 0,
    })
  } finally {
    client.release()
  }
})

// POST /api/attendance/mark-by-gr — single scan by QR code / GR number
router.post('/mark-by-gr', protect, canMarkAttendance, async (req, res) => {
  try {
    const { gr_number, status = 'present', date } = req.body
    if (!gr_number) {
      return res.status(400).json({ success: false, message: 'GR number is required' })
    }
    const schoolId = currentSchoolId(req)
    const tenantId = currentTenantId(req)
    const supportsStudentSchool = await hasColumn('students', 'school_id')
    const supportsStudentTenant = await hasColumn('students', 'tenant_id')

    let studentSql = `SELECT id, name, gr_number, class, section, parent_phone FROM students WHERE LOWER(TRIM(gr_number)) = LOWER(TRIM($1)) AND is_active = true`
    const params = [gr_number]
    let idx = 2
    if (req.user?.role !== 'super_admin') {
      if (supportsStudentTenant && tenantId) {
        studentSql += ` AND tenant_id = $${idx++}`
        params.push(tenantId)
      } else if (supportsStudentSchool && schoolId) {
        studentSql += ` AND school_id = $${idx++}`
        params.push(schoolId)
      }
    }
    studentSql += ' LIMIT 1'
    const studentRes = await query(studentSql, params)
    if (!studentRes.rows.length) {
      return res.status(404).json({ success: false, message: `Student with GR ${gr_number} not found` })
    }

    const student = studentRes.rows[0]
    const recordDate = date || getPakistanDateOnly()
    const normalizedStatus = normalizeAttendanceStatus(status)

    const supportsAttendanceSchool = await hasColumn('attendance', 'school_id')
    const supportsAttendanceTenant = await hasColumn('attendance', 'tenant_id')

    const cols = ['student_id', 'date', 'status', 'marked_by']
    const vals = ['$1', '$2', '$3', '$4']
    const markedByUserId = Number.isInteger(Number(req.user?.id)) ? Number(req.user.id) : null
    const attParams = [student.id, recordDate, normalizedStatus, markedByUserId]

    if (supportsAttendanceSchool) {
      cols.push('school_id')
      vals.push(`$${attParams.length + 1}`)
      attParams.push(student.school_id || schoolId || null)
    }
    if (supportsAttendanceTenant) {
      cols.push('tenant_id')
      vals.push(`$${attParams.length + 1}`)
      attParams.push(student.tenant_id || tenantId || null)
    }

    const updateParts = ['status = EXCLUDED.status', 'marked_by = EXCLUDED.marked_by']
    const sql = `
      INSERT INTO attendance (${cols.join(', ')})
      VALUES (${vals.join(', ')})
      ON CONFLICT (student_id, date) DO UPDATE SET ${updateParts.join(', ')}
      RETURNING *
    `
    const result = await query(sql, attParams)
    return res.json({
      success: true,
      message: `${student.name} (${student.gr_number}) marked ${normalizedStatus}`,
      data: result.rows[0],
      student
    })
  } catch (err) {
    console.error('mark-by-gr error:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to mark attendance by GR' })
  }
})

// GET /api/attendance/history/:studentId â€” student attendance history
// GET /api/attendance/history â€” query-based attendance history
router.get('/history', protect, requireScopeForServiceOnly('school.attendance.read'), async (req, res) => {
  try {
    const {
      studentId,
      student_id,
      classId,
      class: cls,
      sectionId,
      section,
      from,
      to,
      status,
    } = req.query

    const range = defaultHistoryRange()
    const fromDate = dateOnly(parseDate(from, new Date(range.from)))
    const toDate = dateOnly(parseDate(to, new Date(range.to)))
    const requestedStudentId = studentId || student_id
    const requestedClass = classId || cls
    const requestedSection = sectionId || section

    let sql = `
      SELECT
        a.id,
        a.student_id,
        a.date,
        a.status,
        a.marked_by,
        a.note,
        a.created_at,
        s.name,
        s.gr_number,
        s.roll_number,
        s.class,
        s.section
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.date >= $1 AND a.date <= $2
    `
    const params = [fromDate, toDate]
    let i = 3

    const tenant = await tenantClause(req, { table: 'students', alias: 's', paramIndex: i })
    sql += tenant.clause
    params.push(...tenant.params)
    i = tenant.nextIndex
    const readScope = scopedAttendanceReadClause(req, 's', i)
    sql += readScope.clause
    params.push(...readScope.params)
    i = readScope.nextIndex

    if (requestedStudentId) {
      sql += ` AND a.student_id = $${i++}`
      params.push(requestedStudentId)
    }

    if (requestedClass) {
      sql += ` AND s.class = $${i++}`
      params.push(requestedClass)
    }

    if (requestedSection) {
      sql += ` AND s.section = $${i++}`
      params.push(requestedSection)
    }

    if (status) {
      sql += ` AND a.status = $${i++}`
      params.push(normalizeAttendanceStatus(status))
    }

    sql += ' ORDER BY a.date DESC, s.class ASC, s.section ASC, s.roll_number ASC, s.name ASC'

    const result = await query(sql, params)
    const records = result.rows.map((record) => ({
      ...record,
      remarks: record.note || null,
      student: {
        id: record.student_id,
        name: record.name,
        firstName: record.name,
        grNumber: record.gr_number,
        rollNumber: record.roll_number,
        class: record.class,
        section: record.section,
      },
    }))

    res.json({
      success: true,
      data: {
        filters: {
          studentId: requestedStudentId || null,
          classId: requestedClass || null,
          sectionId: requestedSection || null,
          from: fromDate,
          to: toDate,
        },
        summary: summarizeAttendance(records),
        records,
      },
    })
  } catch (err) {
    console.error('Attendance history query error:', err.message)
    res.status(500).json({ success: false, message: err.message || 'Failed to load attendance history' })
  }
})

router.get('/history/:studentId', protect, requireScopeForServiceOnly('school.attendance.read'), async (req, res) => {
  try {
    const { studentId } = req.params
    const { from, to, status } = req.query
    
    let sql = `
      SELECT 
        a.id, a.date, a.status, a.marked_by, a.created_at,
        s.name, s.class, s.section, s.gr_number
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.student_id = $1
    `
    const params = [studentId]
    let i = 2

    const schoolId = req.user?.role === 'super_admin' ? null : currentSchoolId(req)
    if (schoolId) {
      sql += ` AND s.school_id = $${i++}`
      params.push(schoolId)
    }
    const readScope = scopedAttendanceReadClause(req, 's', i)
    sql += readScope.clause
    params.push(...readScope.params)
    i = readScope.nextIndex

    if (from) {
      sql += ` AND a.date >= $${i++}`
      params.push(from)
    }
    if (to) {
      sql += ` AND a.date <= $${i++}`
      params.push(to)
    }
    if (status) {
      sql += ` AND a.status = $${i++}`
      params.push(status)
    }

    sql += ' ORDER BY a.date DESC'

    const result = await query(sql, params)
    res.json({ success: true, count: result.rowCount, data: result.rows })
  } catch (err) {
    console.error('Attendance history error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to fetch attendance history' })
  }
})

// GET /api/attendance/analytics â€” class and student level analytics
router.get('/analytics', protect, requireScopeForServiceOnly('school.attendance.read'), requireAttendanceAnalyticsAccess, async (req, res) => {
  try {
    const { class: cls, section, from, to } = req.query
    const schoolId = currentSchoolId(req)
    const isSuperAdmin = req.user?.role === 'super_admin'
    
    const today = dateOnly(new Date())
    const rangeStart = dateOnly(parseDate(from, new Date('2000-01-01T00:00:00Z')))
    const rangeEnd = dateOnly(parseDate(to, new Date()))
    const dateFilter = from || to
      ? `AND a.date >= '${rangeStart}' AND a.date <= '${rangeEnd}'`
      : `AND a.date >= date_trunc('month', CURRENT_DATE)::date`

    // Class-level analytics
    let classSql = `
      SELECT
        s.class,
        s.section,
        COUNT(DISTINCT s.id)::int AS total_students,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::int AS total_present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END)::int AS total_absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END)::int AS total_late,
        SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END)::int AS total_leave,
        COUNT(DISTINCT a.date)::int AS days_recorded,
        CASE WHEN COUNT(DISTINCT a.date) > 0 
          THEN ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::numeric / 
               (COUNT(DISTINCT a.date) * COUNT(DISTINCT s.id)) * 100, 2)
          ELSE 0 END AS avg_attendance_pct
      FROM students s
      LEFT JOIN attendance a ON a.student_id = s.id AND a.school_id = s.school_id ${dateFilter}
      WHERE s.is_active = true${isSuperAdmin ? '' : ' AND s.school_id = $1'}
    `
    
    let params = []
    let i = 1
    if (!isSuperAdmin) {
      params.push(schoolId)
      i++
    }

    if (cls) {
      classSql += ` AND s.class = $${i++}`
      params.push(cls)
    }
    if (section) {
      classSql += ` AND s.section = $${i++}`
      params.push(section)
    }

    classSql += ' GROUP BY s.class, s.section ORDER BY s.class, s.section'

    const classResult = await query(classSql, params)

    // Student-level analytics (top/bottom performers)
    let studentSql = `
      SELECT
        s.id,
        s.name,
        s.gr_number,
        s.class,
        s.section,
        COUNT(DISTINCT a.date)::int AS days_recorded,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::int AS present_days,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END)::int AS absent_days,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END)::int AS late_days,
        SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END)::int AS leave_days,
        CASE WHEN COUNT(DISTINCT a.date) > 0
          THEN ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::numeric / COUNT(DISTINCT a.date) * 100, 2)
          ELSE 0 END AS attendance_pct,
        MAX(a.date) AS last_marked_date
      FROM students s
      LEFT JOIN attendance a ON a.student_id = s.id AND a.school_id = s.school_id ${dateFilter}
      WHERE s.is_active = true${isSuperAdmin ? '' : ' AND s.school_id = $1'}
    `

    let studParams = [...params]
    let j = params.length + 1

    if (cls) {
      studentSql += ` AND s.class = $${j++}`
      studParams.push(cls)
    }
    if (section) {
      studentSql += ` AND s.section = $${j++}`
      studParams.push(section)
    }

    studentSql += ' GROUP BY s.id, s.name, s.gr_number, s.class, s.section ORDER BY attendance_pct DESC'

    const studentResult = await query(studentSql, studParams)

    res.json({
      success: true,
      data: {
        classAnalytics: classResult.rows || [],
        studentAnalytics: studentResult.rows || [],
        period: { from: from || today, to: to || today },
      }
    })
  } catch (err) {
    console.error('Attendance analytics error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to fetch attendance analytics' })
  }
})

// GET /api/attendance/report â€” generate attendance report
router.get('/report', protect, requireScopeForServiceOnly('school.attendance.read'), requireAttendanceAnalyticsAccess, async (req, res) => {
  try {
    const { class: cls, section, from, to, format = 'json' } = req.query
    const schoolId = currentSchoolId(req)
    const isSuperAdmin = req.user?.role === 'super_admin'

    const today = new Date()
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const startDate = dateOnly(parseDate(from, defaultStart))
    const endDate = dateOnly(parseDate(to, today))

    let sql = `
      SELECT
        s.id,
        s.name,
        s.gr_number,
        s.class,
        s.section,
        a.date,
        a.status,
        a.marked_by
      FROM students s
      LEFT JOIN attendance a ON a.student_id = s.id AND a.school_id = s.school_id AND a.date >= $1 AND a.date <= $2
      WHERE s.is_active = true${isSuperAdmin ? '' : ' AND s.school_id = $3'}
    `

    const params = [startDate, endDate]
    if (!isSuperAdmin) params.push(schoolId)

    let i = params.length + 1
    if (cls) {
      sql += ` AND s.class = $${i++}`
      params.push(cls)
    }
    if (section) {
      sql += ` AND s.section = $${i++}`
      params.push(section)
    }

    sql += ' ORDER BY s.class, s.section, s.name, a.date'

    const result = await query(sql, params)

    // Format based on request
    if (format === 'csv') {
      const csv = [
        ['Name', 'GR Number', 'Class', 'Section', 'Date', 'Status', 'Marked By'].join(','),
        ...result.rows.map(r => [r.name, r.gr_number, r.class, r.section, r.date, r.status, r.marked_by].join(','))
      ].join('\n')
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${today}.csv"`)
      return res.send(csv)
    }

    res.json({
      success: true,
      data: result.rows || [],
      meta: { startDate, endDate, recordCount: result.rowCount }
    })
  } catch (err) {
    console.error('Attendance report error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to generate attendance report' })
  }
})

module.exports = router


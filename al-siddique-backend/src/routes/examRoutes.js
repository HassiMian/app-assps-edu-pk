const express = require('express')
const router = express.Router()
const { query, pool } = require('../config/database')
const { protect, requireRoles, adminOrServiceScope, requireScopeForServiceOnly } = require('../middleware/auth')
const { tenantClause, currentSchoolId, hasColumn } = require('../middleware/tenant')
const officialFirstTerm = require('../config/firstTermExam2026')

const canManageExams = requireRoles('super_admin', 'admin', 'principal', 'teacher')
const canSyncOfficial = requireRoles('super_admin', 'admin', 'principal')
const canReadResults = adminOrServiceScope('school.results.read')
const ALLOW_MOCK_FALLBACK = process.env.NODE_ENV !== 'production'

function normalizeExamType(value) {
  const raw = String(value || '').trim()
  const lower = raw.toLowerCase()
  if (raw === 'TE' || lower === 'term exam' || lower === 'annual exam' || lower === 'first term exam') return 'TE'
  if (raw === 'AS' || lower === 'assessment') return 'AS'
  if (lower === 'monthly test' || lower === 'monthly') return 'monthly'
  if (lower === 'quiz' || lower === 'weekly test' || lower === 'weekly') return 'weekly'
  return raw || 'TE'
}

function portalStudentScope(req, alias = 's', startIndex = 1) {
  const role = String(req.user?.role || '').toLowerCase()
  const prefix = alias ? `${alias}.` : ''
  if (role === 'parent') {
    return { clause: ` AND ${prefix}parent_user_id = $${startIndex}`, params: [req.user?.id || null], nextIndex: startIndex + 1 }
  }
  if (role === 'student') {
    return { clause: ` AND ${prefix}student_user_id = $${startIndex}`, params: [req.user?.id || null], nextIndex: startIndex + 1 }
  }
  return { clause: '', params: [], nextIndex: startIndex }
}

async function getScopedExam(req, examId, db = null) {
  const runner = db ? db.query.bind(db) : query
  const result = await runner('SELECT * FROM exams WHERE id = $1 LIMIT 1', [examId])
  const exam = result.rows[0]
  if (!exam) {
    const error = new Error('Exam not found')
    error.status = 404
    throw error
  }
  const role = String(req.user?.role || '').toLowerCase()
  const isSuperAdmin = role === 'super_admin' || role === 'platform_owner'
  const schoolId = currentSchoolId(req)
  if (!isSuperAdmin && (!schoolId || Number(exam.school_id) !== Number(schoolId))) {
    const error = new Error('Exam does not belong to this school')
    error.status = 403
    throw error
  }
  return exam
}

function sendRouteError(res, error, fallback = 'Exam operation failed') {
  const status = Number(error?.status) || (error?.code === '42P01' ? 503 : 500)
  const message = error?.code === '42P01'
    ? 'Exam workflow setup is not installed yet.'
    : (error?.message || fallback)
  return res.status(status).json({ success: false, message })
}

function calcGrade(obtained, total) {
  if (!Number.isFinite(total) || total <= 0) return 'F'
  const pct = (obtained / total) * 100
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B'
  if (pct >= 60) return 'C'
  if (pct >= 50) return 'D'
  if (pct >= 33) return 'E'
  return 'F'
}

// GET /api/exams
router.get('/', protect, requireScopeForServiceOnly('school.results.read'), async (req, res) => {
  try {
    let sql = 'SELECT * FROM exams WHERE 1=1'
    const tenant = await tenantClause(req, { table: 'exams', paramIndex: 1 })
    sql += tenant.clause + ' ORDER BY created_at DESC'
    const result = await query(sql, tenant.params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Exams list error:', err.message)
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    const today = new Date().toISOString().split('T')[0]
    res.json({
      success: true,
      data: [
        { id: 1, name: 'Mid Term Examination', type: 'TE', class: '9', session: '2025-2026', start_date: today, end_date: today, total_marks: 100, pass_marks: 33, created_at: new Date().toISOString() },
      ]
    })
  }
})

// POST /api/exams/official-first-term/sync
router.post('/official-first-term/sync', protect, canSyncOfficial, async (req, res) => {
  const schoolId = currentSchoolId(req)
  if (!schoolId) return res.status(400).json({ success: false, message: 'School scope is required.' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let examResult = await client.query(
      `SELECT * FROM exams
       WHERE school_id = $1 AND session = $2 AND LOWER(name) = LOWER($3)
       ORDER BY id ASC LIMIT 1`,
      [schoolId, officialFirstTerm.SESSION, officialFirstTerm.NAME]
    )

    let exam = examResult.rows[0]
    if (!exam) {
      examResult = await client.query(
        `INSERT INTO exams
          (school_id, name, type, class, session, start_date, end_date, total_marks, pass_marks, created_by)
         VALUES ($1,$2,$3,'All Classes',$4,$5,$6,100,33,$7)
         RETURNING *`,
        [schoolId, officialFirstTerm.NAME, officialFirstTerm.TYPE, officialFirstTerm.SESSION, officialFirstTerm.START_DATE, officialFirstTerm.END_DATE, req.user?.id || null]
      )
      exam = examResult.rows[0]
    } else {
      const updated = await client.query(
        `UPDATE exams
         SET name=$1, type=$2, class='All Classes', session=$3, start_date=$4, end_date=$5
         WHERE id=$6 AND school_id=$7
         RETURNING *`,
        [officialFirstTerm.NAME, officialFirstTerm.TYPE, officialFirstTerm.SESSION, officialFirstTerm.START_DATE, officialFirstTerm.END_DATE, exam.id, schoolId]
      )
      exam = updated.rows[0]
    }

    const roster = await client.query(
      `SELECT class, COALESCE(section,'') AS section
       FROM students
       WHERE school_id=$1 AND COALESCE(is_active,true)=true`,
      [schoolId]
    )

    const officialClassNames = new Set(Object.values(officialFirstTerm.CLASS_LEVEL_TO_NAME))
    const desiredEnrollments = new Map()
    for (const row of roster.rows) {
      const className = officialFirstTerm.normalizeClassName(row.class)
      if (!officialClassNames.has(className)) continue
      const section = String(row.section || '').trim()
      desiredEnrollments.set(`${className}|${section}`, { className, section })
    }

    await client.query(
      'UPDATE exam_class_enrollments SET is_active=false, updated_at=NOW() WHERE school_id=$1 AND exam_id=$2',
      [schoolId, exam.id]
    )
    await client.query(
      'UPDATE exam_subjects SET is_active=false, updated_at=NOW() WHERE school_id=$1 AND exam_id=$2',
      [schoolId, exam.id]
    )

    let scheduledSectionPapers = 0
    for (const { className, section } of desiredEnrollments.values()) {
      await client.query(
        `INSERT INTO exam_class_enrollments (school_id, exam_id, class_name, section, is_active)
         VALUES ($1,$2,$3,$4,true)
         ON CONFLICT (school_id, exam_id, class_name, section)
         DO UPDATE SET is_active=true, updated_at=NOW()`,
        [schoolId, exam.id, className, section]
      )

      for (const paper of officialFirstTerm.subjectsForClass(className)) {
        await client.query(
          `INSERT INTO exam_subjects
            (school_id, exam_id, class_name, section, subject, exam_date, paper_time, sort_order, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
           ON CONFLICT (school_id, exam_id, class_name, section, subject)
           DO UPDATE SET
             exam_date=EXCLUDED.exam_date,
             paper_time=EXCLUDED.paper_time,
             sort_order=EXCLUDED.sort_order,
             is_active=true,
             updated_at=NOW()`,
          [schoolId, exam.id, className, section, paper.subject, paper.examDate, paper.paperTime, paper.sortOrder]
        )
        scheduledSectionPapers += 1
      }
    }

    await client.query('COMMIT')
    res.json({
      success: true,
      message: 'Official First Term Exam is synchronized with the date sheet and active class sections.',
      data: {
        exam,
        officialPaperCount: officialFirstTerm.officialRows().length,
        enrolledClassSections: desiredEnrollments.size,
        scheduledSectionPapers,
      }
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Official first term sync error:', error.message)
    return sendRouteError(res, error, 'Could not synchronize First Term Exam')
  } finally {
    client.release()
  }
})

// GET /api/exams/:id/setup
router.get('/:id/setup', protect, canManageExams, async (req, res) => {
  try {
    const exam = await getScopedExam(req, req.params.id)
    const schoolId = Number(exam.school_id)
    const [enrollmentResult, subjectResult] = await Promise.all([
      query(
        `SELECT id, class_name, section
         FROM exam_class_enrollments
         WHERE school_id=$1 AND exam_id=$2 AND is_active=true
         ORDER BY class_name, section`,
        [schoolId, exam.id]
      ),
      query(
        `SELECT id, class_name, section, subject, exam_date, paper_time, total_marks, pass_marks, sort_order
         FROM exam_subjects
         WHERE school_id=$1 AND exam_id=$2 AND is_active=true
         ORDER BY exam_date, sort_order, class_name, section, subject`,
        [schoolId, exam.id]
      ),
    ])
    res.json({
      success: true,
      data: {
        exam,
        enrollments: enrollmentResult.rows,
        subjects: subjectResult.rows,
      }
    })
  } catch (error) {
    return sendRouteError(res, error)
  }
})

// GET /api/exams/:id/roster?class=One&section=Yellow
router.get('/:id/roster', protect, canManageExams, async (req, res) => {
  try {
    const exam = await getScopedExam(req, req.params.id)
    const schoolId = Number(exam.school_id)
    const className = officialFirstTerm.normalizeClassName(req.query.class)
    const section = String(req.query.section || '').trim()
    if (!className) return res.status(400).json({ success: false, message: 'Class is required.' })

    const enrollment = await query(
      `SELECT id FROM exam_class_enrollments
       WHERE school_id=$1 AND exam_id=$2 AND class_name=$3 AND section=$4 AND is_active=true
       LIMIT 1`,
      [schoolId, exam.id, className, section]
    )
    if (!enrollment.rowCount) {
      return res.status(400).json({ success: false, message: 'This class/section is not enrolled in the selected exam.' })
    }

    const aliases = officialFirstTerm.aliasesForClass(className).map(value => String(value).trim().toLowerCase())
    const exactClass = String(className).trim().toLowerCase()
    const rosterSql = (classPredicate) => `SELECT id, gr_number, name, father_name, class, section, roll_number, photo
       FROM students
       WHERE school_id=$1
         AND COALESCE(is_active,true)=true
         AND ${classPredicate}
         AND COALESCE(TRIM(section),'')=$3
       ORDER BY
         CASE WHEN COALESCE(NULLIF(regexp_replace(COALESCE(roll_number,''),'[^0-9]','','g'),''),'') = '' THEN 1 ELSE 0 END,
         NULLIF(regexp_replace(COALESCE(roll_number,''),'[^0-9]','','g'),'')::int NULLS LAST,
         name`
    let students = await query(rosterSql('LOWER(TRIM(class)) = $2'), [schoolId, exactClass, section])
    if (!students.rowCount) {
      students = await query(rosterSql('LOWER(TRIM(class)) = ANY($2::text[])'), [schoolId, aliases, section])
    }
    res.json({ success: true, count: students.rowCount, data: students.rows })
  } catch (error) {
    return sendRouteError(res, error)
  }
})

// POST /api/exams
router.post('/', protect, canManageExams, async (req, res) => {
  try {
    const { name, type, class: cls, session, start_date, end_date, total_marks, pass_marks, created_by } = req.body
    const cleanName = String(name || '').trim()
    const cleanClass = String(cls || '').trim() || 'All Classes'
    const cleanSession = String(session || '').trim() || null
    if (!cleanName) return res.status(400).json({ success: false, message: 'Exam name is required.' })

    const supportsTenant = await hasColumn('exams', 'school_id')
    const schoolId = currentSchoolId(req)
    if (supportsTenant && schoolId) {
      const duplicate = await query(
        `SELECT * FROM exams
         WHERE school_id=$1
           AND LOWER(name)=LOWER($2)
           AND LOWER(class)=LOWER($3)
           AND COALESCE(session,'')=COALESCE($4,'')
         ORDER BY id ASC LIMIT 1`,
        [schoolId, cleanName, cleanClass, cleanSession]
      )
      if (duplicate.rowCount) {
        return res.status(409).json({ success: false, message: 'This exam already exists for the selected class/session.', data: duplicate.rows[0] })
      }
    }

    const resolvedType = normalizeExamType(type)
    const result = supportsTenant
      ? await query(
          `INSERT INTO exams (school_id, name, type, class, session, start_date, end_date, total_marks, pass_marks, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
          [schoolId, cleanName, resolvedType, cleanClass, cleanSession, start_date || null, end_date || null, Number(total_marks) || 100, Number(pass_marks) || 33, created_by || req.user?.id || null]
        )
      : await query(
          `INSERT INTO exams (name, type, class, session, start_date, end_date, total_marks, pass_marks, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [cleanName, resolvedType, cleanClass, cleanSession, start_date || null, end_date || null, Number(total_marks) || 100, Number(pass_marks) || 33, created_by || req.user?.id || null]
        )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/exams/results — atomic batch upsert
router.post('/results', protect, canManageExams, async (req, res) => {
  const { results = [] } = req.body
  if (!Array.isArray(results) || !results.length) {
    return res.status(400).json({ success: false, message: 'Enter at least one student mark before saving.' })
  }

  const schoolId = currentSchoolId(req)
  const role = String(req.user?.role || '').toLowerCase()
  const isSuperAdmin = role === 'super_admin' || role === 'platform_owner'
  const client = await pool.connect()
  const setupCache = new Map()

  try {
    await client.query('BEGIN')

    for (const row of results) {
      const examId = Number(row?.exam_id)
      const studentId = Number(row?.student_id)
      const subject = String(row?.subject || '').trim()
      const marksObtained = Number(row?.marks_obtained)
      const totalMarks = Number(row?.total_marks)
      const passMarks = row?.pass_marks === undefined || row?.pass_marks === null || row?.pass_marks === ''
        ? Math.round(totalMarks * 0.33)
        : Number(row.pass_marks)

      if (!Number.isInteger(examId) || examId <= 0 || !Number.isInteger(studentId) || studentId <= 0 || !subject) {
        const error = new Error('exam_id, student_id and subject are required')
        error.status = 400
        throw error
      }
      if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
        const error = new Error('Total marks must be greater than zero.')
        error.status = 400
        throw error
      }
      if (!Number.isFinite(passMarks) || passMarks < 0 || passMarks > totalMarks) {
        const error = new Error('Passing marks must be between 0 and total marks.')
        error.status = 400
        throw error
      }
      if (!Number.isFinite(marksObtained) || marksObtained < 0 || marksObtained > totalMarks) {
        const error = new Error(`Marks for student #${studentId} must be between 0 and ${totalMarks}.`)
        error.status = 400
        throw error
      }

      const exam = await getScopedExam(req, examId, client)
      const effectiveSchoolId = Number(exam.school_id)
      if (!isSuperAdmin && Number(schoolId) !== effectiveSchoolId) {
        const error = new Error('Exam does not belong to this school')
        error.status = 403
        throw error
      }

      const studentResult = await client.query(
        `SELECT id, class, COALESCE(section,'') AS section
         FROM students
         WHERE id=$1 AND school_id=$2 AND COALESCE(is_active,true)=true
         LIMIT 1`,
        [studentId, effectiveSchoolId]
      )
      const student = studentResult.rows[0]
      if (!student) {
        const error = new Error('Student does not belong to this school or is inactive')
        error.status = 403
        throw error
      }

      let hasSetup = setupCache.get(examId)
      if (hasSetup === undefined) {
        const setupResult = await client.query(
          'SELECT EXISTS(SELECT 1 FROM exam_class_enrollments WHERE school_id=$1 AND exam_id=$2 AND is_active=true) AS enabled',
          [effectiveSchoolId, examId]
        )
        hasSetup = setupResult.rows[0]?.enabled === true
        setupCache.set(examId, hasSetup)
      }

      if (hasSetup) {
        const className = officialFirstTerm.normalizeClassName(student.class)
        const section = String(student.section || '').trim()
        const enrollment = await client.query(
          `SELECT id FROM exam_class_enrollments
           WHERE school_id=$1 AND exam_id=$2 AND class_name=$3 AND section=$4 AND is_active=true
           LIMIT 1`,
          [effectiveSchoolId, examId, className, section]
        )
        if (!enrollment.rowCount) {
          const error = new Error('Student class/section is not enrolled in this exam.')
          error.status = 400
          throw error
        }

        const subjectConfig = await client.query(
          `SELECT id, total_marks, pass_marks
           FROM exam_subjects
           WHERE school_id=$1 AND exam_id=$2 AND class_name=$3 AND section=$4
             AND LOWER(subject)=LOWER($5) AND is_active=true
           LIMIT 1`,
          [effectiveSchoolId, examId, className, section, subject]
        )
        const config = subjectConfig.rows[0]
        if (!config) {
          const error = new Error(`${subject} is not scheduled for ${className} ${section} in this exam.`)
          error.status = 400
          throw error
        }

        if (config.total_marks !== null && Number(config.total_marks) !== totalMarks) {
          const error = new Error(`Total marks for ${subject} are already configured as ${config.total_marks}.`)
          error.status = 409
          throw error
        }
        if (config.pass_marks !== null && Number(config.pass_marks) !== passMarks) {
          const error = new Error(`Passing marks for ${subject} are already configured as ${config.pass_marks}.`)
          error.status = 409
          throw error
        }
        if (config.total_marks === null || config.pass_marks === null) {
          await client.query(
            `UPDATE exam_subjects
             SET total_marks=COALESCE(total_marks,$1),
                 pass_marks=COALESCE(pass_marks,$2),
                 updated_at=NOW()
             WHERE id=$3`,
            [totalMarks, passMarks, config.id]
          )
        }
      }

      const grade = calcGrade(marksObtained, totalMarks)
      await client.query(
        `INSERT INTO exam_results
          (school_id, exam_id, student_id, subject, marks_obtained, total_marks, grade)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (exam_id, student_id, subject)
         DO UPDATE SET
           school_id=EXCLUDED.school_id,
           marks_obtained=EXCLUDED.marks_obtained,
           total_marks=EXCLUDED.total_marks,
           grade=EXCLUDED.grade`,
        [effectiveSchoolId, examId, studentId, subject, marksObtained, totalMarks, grade]
      )
    }

    await client.query('COMMIT')
    res.json({ success: true, message: `Marks saved for ${results.length} student(s).`, count: results.length })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Exam result save error:', error.message)
    return sendRouteError(res, error, 'Marks could not be saved.')
  } finally {
    client.release()
  }
})

// GET /api/exams/results
router.get('/results', protect, canReadResults, async (req, res) => {
  try {
    const filters = []
    const params = []
    let idx = 1

    if (req.query.student_id) {
      filters.push(`er.student_id = $${idx++}`)
      params.push(req.query.student_id)
    }
    if (req.query.exam_type) {
      filters.push(`LOWER(e.type) = LOWER($${idx++})`)
      params.push(req.query.exam_type)
    }
    if (req.query.subject) {
      filters.push(`LOWER(er.subject) = LOWER($${idx++})`)
      params.push(req.query.subject)
    }
    if (req.query.class) {
      filters.push(`LOWER(s.class) = LOWER($${idx++})`)
      params.push(req.query.class)
    }
    if (req.query.section) {
      filters.push(`LOWER(COALESCE(s.section,'')) = LOWER($${idx++})`)
      params.push(req.query.section)
    }

    let sql = `
      SELECT er.*, e.name as exam_name, e.session, e.type as exam_type,
             s.name as student_name, s.class, s.section, s.gr_number, s.father_name
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      JOIN students s ON er.student_id = s.id AND s.school_id = e.school_id
      WHERE 1=1
    `
    if (filters.length) sql += ` AND ${filters.join(' AND ')}`

    const isSuperAdmin = req.user?.role === 'super_admin'
    if (!isSuperAdmin) {
      const studentTenant = await tenantClause(req, { table: 'students', alias: 's', paramIndex: idx })
      const examTenant = await tenantClause(req, { table: 'exams', alias: 'e', paramIndex: studentTenant.nextIndex })
      sql += studentTenant.clause + examTenant.clause
      params.push(...studentTenant.params, ...examTenant.params)
    }

    sql += ' ORDER BY e.created_at DESC, s.class, s.section, s.roll_number, er.subject LIMIT 1000'
    const result = await query(sql, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Exam results list error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/exams/results/:exam_id
router.get('/results/:exam_id', protect, canReadResults, async (req, res) => {
  try {
    let sql = `
      SELECT er.*, s.name, s.gr_number, s.roll_number, s.father_name, s.photo, s.class, s.section
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      JOIN students s ON er.student_id = s.id AND s.school_id = e.school_id
      WHERE er.exam_id = $1
    `
    const params = [req.params.exam_id]
    const isSuperAdmin = req.user?.role === 'super_admin'
    if (!isSuperAdmin) {
      const studentTenant = await tenantClause(req, { table: 'students', alias: 's', paramIndex: 2 })
      const examTenant = await tenantClause(req, { table: 'exams', alias: 'e', paramIndex: studentTenant.nextIndex })
      sql += studentTenant.clause + examTenant.clause
      params.push(...studentTenant.params, ...examTenant.params)
    }
    sql += ' ORDER BY s.class, s.section, s.roll_number, er.subject'
    const result = await query(sql, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Exam results fetch error:', err.message)
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    res.json({ success: true, data: [] })
  }
})

// GET /api/exams/student-results/:student_id
router.get('/student-results/:student_id', protect, requireScopeForServiceOnly('school.results.read'), async (req, res) => {
  try {
    let sql = `
      SELECT er.*, e.name as exam_name, e.session, e.type as exam_type,
             s.name as student_name, s.class, s.section, s.gr_number, s.father_name, s.photo
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      JOIN students s ON er.student_id = s.id AND s.school_id = e.school_id
      WHERE er.student_id = $1
    `
    const params = [req.params.student_id]
    const isSuperAdmin = req.user?.role === 'super_admin'
    if (!isSuperAdmin) {
      const studentTenant = await tenantClause(req, { table: 'students', alias: 's', paramIndex: 2 })
      const examTenant = await tenantClause(req, { table: 'exams', alias: 'e', paramIndex: studentTenant.nextIndex })
      sql += studentTenant.clause + examTenant.clause
      params.push(...studentTenant.params, ...examTenant.params)
      const portalScope = portalStudentScope(req, 's', examTenant.nextIndex)
      sql += portalScope.clause
      params.push(...portalScope.params)
    }
    sql += ' ORDER BY e.created_at DESC, er.subject'
    const result = await query(sql, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Student results fetch error:', err.message)
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    res.json({ success: true, data: [] })
  }
})

module.exports = router

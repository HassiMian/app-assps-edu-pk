const express = require('express')
const router  = express.Router()
const { pool, query, applyTenantContext } = require('../config/database')
const { protect, requireRoles, requireScopeForServiceOnly, hasServiceScope } = require('../middleware/auth')
const { tenantClause, currentSchoolId, hasColumn } = require('../middleware/tenant')
const { isTeacher, validateTeacherMarksWrite, teacherResultReadScope } = require('../services/examMarksTeacherScope')
const { parseExactMarksNumber } = require('../services/examMarksInputValidation')
const { validatePaperMaxima } = require('../services/examMarksSubjectMaximum')
const { validateResultState } = require('../services/examResultStatus')
const { selectGradeBand } = require('../services/gradeBandAssignment')

const canManageExams = requireRoles('super_admin', 'admin', 'principal')
const canWriteMarks = requireRoles('super_admin', 'admin', 'principal', 'teacher')
function canReadResults(req, res, next) {
  if (req.user?.account_type === 'service') {
    if (hasServiceScope(req, 'school.results.read')) return next()
    return res.status(403).json({ success: false, message: 'Service permission denied. Required scope: school.results.read' })
  }
  const role = String(req.user?.role || '').toLowerCase()
  if (['super_admin', 'admin', 'principal', 'teacher', 'parent', 'student'].includes(role)) return next()
  return res.status(403).json({ success: false, message: 'Results access denied.' })
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
  if (role === 'teacher') {
    return teacherResultReadScope(req,alias || 's','er',startIndex)
  }
  return { clause: '', params: [], nextIndex: startIndex }
}

let gradeSchemaReady = null
async function ensureGradeSettingsSchema() {
  if (gradeSchemaReady) return true
  const result = await query("SELECT to_regclass('public.grade_settings') AS table_name")
  if (!result.rows[0]?.table_name) {
    const err = new Error('grade_settings schema migration is not applied.')
    err.code = 'GRADE_SCHEMA_NOT_READY'
    throw err
  }
  gradeSchemaReady = true
  return true
}

const DEFAULT_GRADE_SETTINGS = [
  { label:'A+', from:90, to:100 },
  { label:'A', from:80, to:89 },
  { label:'B', from:70, to:79 },
  { label:'C', from:60, to:69 },
  { label:'D', from:50, to:59 },
  { label:'F', from:0, to:49 },
]

function gradeFromBands(obtained, total, bands = DEFAULT_GRADE_SETTINGS) {
  const obtainedValue = Number(obtained)
  const totalValue = Number(total)
  if (!Number.isFinite(obtainedValue) || !Number.isFinite(totalValue) || totalValue <= 0) return ''
  const pct = Math.max(0, Math.min(100, (obtainedValue / totalValue) * 100))
  const candidate = Array.isArray(bands) && bands.length ? bands : DEFAULT_GRADE_SETTINGS
  const normalized = candidate.map(row => ({ label: String(row.label), from: Number(row.from), to: Number(row.to) }))
  return selectGradeBand(pct, normalized)?.label || ''
}

async function loadGradeBandsForSchool(schoolId, {previewDefaults = true} = {}) {
  await ensureGradeSettingsSchema()
  const result = await query(`
    SELECT label, min_percentage, max_percentage
    FROM grade_settings
    WHERE school_id = $1
    ORDER BY sort_order, max_percentage DESC
  `, [schoolId])
  return result.rowCount
    ? result.rows.map(row => ({ label: row.label, from: Number(row.min_percentage), to: Number(row.max_percentage) }))
    : (previewDefaults ? DEFAULT_GRADE_SETTINGS : [])
}

function validateGradeSettings(rows) {
  if (!Array.isArray(rows) || !rows.length) return { errors:['At least one grade band is required.'], rows:[] }
  const normalized = rows.map((row, index) => ({
    label: String(row?.label || '').trim().slice(0, 24),
    from: Number(row?.from),
    to: Number(row?.to),
    sortOrder: index,
  }))
  const errors = []
  const seen = new Set()
  normalized.forEach((row, index) => {
    if (!row.label) errors.push(`Row ${index + 1}: grade label is required.`)
    if (seen.has(row.label.toLowerCase())) errors.push(`Row ${index + 1}: duplicate grade label.`)
    seen.add(row.label.toLowerCase())
    if (!Number.isInteger(row.from) || !Number.isInteger(row.to) || row.from < 0 || row.to > 100 || row.from > row.to) {
      errors.push(`Row ${index + 1}: percentage range must be valid and between 0 and 100.`)
    }
  })
  const coverage = Array.from({ length: 101 }, () => 0)
  normalized.forEach(row => {
    if (!Number.isInteger(row.from) || !Number.isInteger(row.to)) return
    for (let pct = Math.max(0, row.from); pct <= Math.min(100, row.to); pct += 1) coverage[pct] += 1
  })
  if (coverage.some(value => value === 0)) errors.push('Grade bands must cover every percentage from 0 to 100.')
  if (coverage.some(value => value > 1)) errors.push('Grade bands must not overlap.')
  return { errors, rows: normalized }
}

router.get('/grade-settings', protect, canReadResults, async (req, res) => {
  try {
    await ensureGradeSettingsSchema()
    const schoolId = currentSchoolId(req)
    const result = await query(`SELECT COUNT(*)::int AS count FROM grade_settings WHERE school_id = $1`, [schoolId])
    const rows = await loadGradeBandsForSchool(schoolId)
    res.json({ success:true, data:rows, configured:Number(result.rows[0]?.count || 0) > 0 })
  } catch (err) {
    console.error('Grade settings read error:', err.message)
    res.status(err.code === 'GRADE_SCHEMA_NOT_READY' ? 503 : 500).json({ success:false, message:err.code === 'GRADE_SCHEMA_NOT_READY' ? 'Grade settings storage is not initialized.' : 'Grade settings could not be loaded.' })
  }
})

router.put('/grade-settings', protect, canManageExams, async (req, res) => {
  const parsed = validateGradeSettings(req.body?.grades)
  if (parsed.errors.length) return res.status(422).json({ success:false, message:'Grade settings validation failed.', fieldErrors:parsed.errors })
  const schoolId = currentSchoolId(req)
  const client = await require('../config/database').pool.connect()
  try {
    await ensureGradeSettingsSchema()
    await client.query('BEGIN')
    await applyTenantContext(client)
    await client.query('DELETE FROM grade_settings WHERE school_id = $1', [schoolId])
    for (const row of parsed.rows) {
      await client.query(`INSERT INTO grade_settings (school_id, label, min_percentage, max_percentage, sort_order) VALUES ($1,$2,$3,$4,$5)`, [schoolId,row.label,row.from,row.to,row.sortOrder])
    }
    await client.query('COMMIT')
    res.json({ success:true, data:parsed.rows.map(({sortOrder,...row}) => row), message:'Grade settings saved successfully.' })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Grade settings save error:', err.message)
    res.status(500).json({ success:false, message:'Grade settings could not be saved.' })
  } finally {
    client.release()
  }
})

// GET /api/exams
router.get('/', protect, requireScopeForServiceOnly('school.results.read'), async (req, res) => {
  try {
    let sql = 'SELECT * FROM exams WHERE 1=1'
    const tenant = await tenantClause(req, { table: 'exams', paramIndex: 1 })
    sql += tenant.clause + ' ORDER BY created_at DESC'
    const result = await query(sql, tenant.params)
    // Optional authoritative class/section-specific exam subject catalog.
    // Existing clients continue receiving the original exam records. Results
    // stay school-scoped by BOTH the validated JWT and FORCE RLS policies.
    if (req.query.include_subjects === '1' && result.rows.length) {
      const role = String(req.user?.role || '').toLowerCase()
      if (!['principal','admin','super_admin','teacher'].includes(role) &&
          !(req.user?.account_type === 'service' && hasServiceScope(req,'school.results.read'))) {
        return res.status(403).json({success:false,code:'EXAM_SUBJECT_CATALOG_PERMISSION_DENIED'})
      }
      const schoolId = currentSchoolId(req)
      if (!Number.isSafeInteger(Number(schoolId)) || Number(schoolId) <= 0)
        return res.status(403).json({success:false,code:'EXAM_SUBJECT_CATALOG_SCHOOL_REQUIRED'})
      const examIds = result.rows.map(row => Number(row.id))
        .filter(id => Number.isSafeInteger(id) && id > 0)
      const offerings = examIds.length ? await query(`
        SELECT exam_id, class_name, section, subject, sort_order, total_marks, pass_marks
        FROM exam_subjects
        WHERE school_id = $1 AND exam_id = ANY($2::integer[]) AND is_active = true
        ORDER BY exam_id, class_name, section, sort_order NULLS LAST, id
      `, [schoolId, examIds]) : { rows: [] }
      const byExam = new Map()
      for (const offering of offerings.rows) {
        const key = Number(offering.exam_id)
        if (!byExam.has(key)) byExam.set(key, [])
        byExam.get(key).push(offering)
      }
      return res.json({ success:true, data:result.rows.map(row => ({
        ...row, subject_offerings:byExam.get(Number(row.id)) || []
      })) })
    }
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Exam list error:', err.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Exams could not be loaded.' })
  }
})

// POST /api/exams â€” teachers can create assessments
router.post('/', protect, canManageExams, async (req, res) => {
  try {
    const { name, type, class: cls, session, start_date, end_date, total_marks, pass_marks, created_by } = req.body
    const examName = String(name || '').trim().slice(0, 180)
    const examType = String(type || '').trim().slice(0, 60)
    const examClass = String(cls || '').trim().slice(0, 80)
    const examSession = String(session || '').trim().slice(0, 80)
    const totalMarks = Number(total_marks)
    const passMarks = Number(pass_marks)
    if (!examName || !examType || !examClass || !examSession) {
      return res.status(422).json({ success: false, message: 'Exam name, type, class and academic session are required.' })
    }
    if (!Number.isFinite(totalMarks) || totalMarks <= 0 || !Number.isFinite(passMarks) || passMarks < 0 || passMarks > totalMarks) {
      return res.status(422).json({ success: false, message: 'Total marks must be greater than zero and passing marks must be between zero and total marks.' })
    }
    const supportsTenant = await hasColumn('exams', 'school_id')
    const schoolId = currentSchoolId(req)
    if (!supportsTenant) {
      return res.status(503).json({ success: false, code: 'EXAM_TENANT_SCHEMA_REQUIRED', message: 'Exam storage is not tenant-safe for writes.' })
    }
    if (!schoolId) {
      return res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'A school context is required to create an exam.' })
    }
    const result = await query(`
      INSERT INTO exams (school_id, name, type, class, session, start_date, end_date, total_marks, pass_marks, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [schoolId, examName, examType, examClass, examSession, start_date || null, end_date || null, totalMarks, passMarks, created_by || req.user?.id || null])
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Exam create error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to create exam.' })
  }
})

// DELETE /api/exams/:id — remove one exam and its result rows atomically
router.delete('/:id', protect, canManageExams, async (req, res) => {
  const examId = Number(req.params.id)
  if (!Number.isInteger(examId) || examId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid exam id is required.' })
  }
  const client = await pool.connect()
  try {
    const schoolId = currentSchoolId(req)
    const supportsTenant = await hasColumn('exams', 'school_id')
    if (!supportsTenant) {
      return res.status(503).json({ success: false, code: 'EXAM_TENANT_SCHEMA_REQUIRED', message: 'Exam storage is not tenant-safe for deletion.' })
    }
    if (!schoolId) {
      return res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'A school context is required to delete an exam.' })
    }
    await client.query('BEGIN')
    await applyTenantContext(client)
    const lookup = await client.query('SELECT id, name FROM exams WHERE id = $1 AND school_id = $2 LIMIT 1', [examId, schoolId])
    if (!lookup.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Exam not found.' })
    }
    await client.query('DELETE FROM exam_results WHERE exam_id = $1', [examId])
    await client.query('DELETE FROM exams WHERE id = $1', [examId])
    await client.query('COMMIT')
    return res.json({ success: true, message: 'Exam deleted successfully.', data: { id: examId, name: lookup.rows[0].name } })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Exam delete error:', err.message)
    return res.status(500).json({ success: false, message: 'Exam could not be deleted.' })
  } finally {
    client.release()
  }
})

// POST /api/exams/results — tenant-scoped, transactional bulk result save
router.post('/results', protect, canWriteMarks, async (req, res) => {
  const { results = [] } = req.body
  if (!Array.isArray(results) || !results.length) {
    return res.status(400).json({ success: false, message: 'results must be a non-empty array' })
  }

  const schoolId = currentSchoolId(req)
  const [supportsStudentTenant, supportsExamTenant, supportsResultTenant] = await Promise.all([
    hasColumn('students', 'school_id'),
    hasColumn('exams', 'school_id'),
    hasColumn('exam_results', 'school_id'),
  ])
  if (!supportsStudentTenant || !supportsExamTenant || !supportsResultTenant) {
    return res.status(503).json({
      success: false,
      code: 'RESULT_TENANT_SCHEMA_REQUIRED',
      message: 'Student, exam, and result storage must all be tenant-safe before results can be written.',
    })
  }
  if (!schoolId) {
    return res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'A school context is required to save results.' })
  }

  let gradeBands
  try {
    gradeBands = await loadGradeBandsForSchool(schoolId)
  } catch (err) {
    console.error('Grade policy load error:', err.message)
    return res.status(500).json({ success: false, message: 'School grading policy could not be loaded.' })
  }

  const normalized = []
  for (const row of results) {
    const examId = Number(row?.exam_id)
    const studentId = Number(row?.student_id)
    const subject = String(row?.subject || '').trim().slice(0, 160)
    const parsedState = validateResultState(row, req.user?.role)
    if (parsedState.error) {
      return res.status(parsedState.error === 'EXCUSED_REQUIRES_PRINCIPAL' ? 403 : 422)
        .json({success:false,code:parsedState.error,
          message:'Exam subject status and numeric marks are inconsistent or unauthorized.'})
    }
    const marksObtained = parsedState.marks
    const totalMarks = parseExactMarksNumber(row?.total_marks)
    if (!Number.isInteger(examId) || examId <= 0 || !Number.isInteger(studentId) || studentId <= 0 || !subject) {
      return res.status(422).json({ success: false, message: 'Valid exam_id, student_id and subject are required for every result.' })
    }
    if (!Number.isFinite(totalMarks) || totalMarks <= 0 ||
        (parsedState.status === 'SCORED' &&
        (!Number.isFinite(marksObtained) || marksObtained < 0 || marksObtained > totalMarks))) {
      return res.status(422).json({ success: false, message: 'Marks must be numeric, total marks must be greater than zero, and obtained marks cannot exceed total marks.' })
    }
    normalized.push({
      examId,
      studentId,
      subject,
      marksObtained,
      totalMarks,
      resultStatus:parsedState.status,
      grade:parsedState.status === 'SCORED' && gradeBands.length > 0 ? gradeFromBands(marksObtained, totalMarks, gradeBands) : null,
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await applyTenantContext(client)
    const studentIds = [...new Set(normalized.map(row => row.studentId))]
    const examIds = [...new Set(normalized.map(row => row.examId))]
    const [studentScope, examScope] = await Promise.all([
      client.query('SELECT id, class, section FROM students WHERE school_id = $1 AND id = ANY($2::int[])', [schoolId, studentIds]),
      client.query('SELECT id, class FROM exams WHERE school_id = $1 AND id = ANY($2::int[])', [schoolId, examIds]),
    ])
    const validStudents = new Set(studentScope.rows.map(row => Number(row.id)))
    const validExams = new Set(examScope.rows.map(row => Number(row.id)))
    const foreignStudent = studentIds.find(id => !validStudents.has(id))
    const foreignExam = examIds.find(id => !validExams.has(id))
    if (foreignStudent || foreignExam) {
      await client.query('ROLLBACK')
      return res.status(403).json({
        success: false,
        message: foreignStudent ? 'One or more students do not belong to this school.' : 'One or more exams do not belong to this school.',
      })
    }

    if (isTeacher(req)) {
      const assignmentScope = await client.query(
        `SELECT school_id, teacher_user_id, class_name, section, subject, is_active
         FROM teacher_class_assignments
         WHERE school_id=$1 AND teacher_user_id=$2 AND is_active=true`,
        [schoolId, req.user?.id]
      )
      if (!validateTeacherMarksWrite({
        user:req.user,schoolId,results:normalized,
        students:studentScope.rows,exams:examScope.rows,assignments:assignmentScope.rows,
      })) {
        await client.query('ROLLBACK')
        return res.status(403).json({
          success:false,
          code:'EXAM_MARKS_TEACHER_ASSIGNMENT_REQUIRED',
          message:'Marks entry requires an active teacher assignment matching each student class, section and subject.',
        })
      }
    }

    // A school-published subject catalog, not the exam's general 100-mark
    // ceiling, must authorize every teacher write and every Exam 9 write.
    // Check within the same transaction to prevent TOCTOU catalog drift.
    if (isTeacher(req) || normalized.some(row => row.examId === 9)) {
      const offerings = await client.query(`
        SELECT x.exam_id, x.school_id, x.class_name, x.section, x.subject,
          x.total_marks, x.is_active, x.approval_status, x.approval_revision,
          x.approved_by_user_id, x.approved_at,
          (u.id IS NOT NULL AND u.is_active=true AND u.school_id=x.school_id
           AND u.role IN ('principal','admin')) AS reviewer_valid
        FROM exam_subjects x
        LEFT JOIN users u ON u.id=x.approved_by_user_id
        WHERE x.school_id = $1 AND x.exam_id = ANY($2::int[]) AND x.is_active = true
      `, [schoolId, examIds])
      const guardedRows = normalized.filter(row => isTeacher(req) || row.examId === 9)
      if (!validatePaperMaxima({
        schoolId, results:guardedRows, students:studentScope.rows, offerings:offerings.rows
      })) {
        await client.query('ROLLBACK')
        return res.status(422).json({success:false,code:'EXAM_SUBJECT_MAXIMUM_NOT_APPROVED',
          message:'A unique approved class/section/subject maximum is required. Existing results were not changed.'})
      }
    }

    // A result is an academic record, not a mutable scratchpad. A normal
    // teacher/admin save may insert a new score or repeat the exact same save,
    // but it must never inflate an already saved score to force a pass.
    // Any real change requires a separate Principal-reviewed revision with
    // an immutable previous/new value audit trail, not this bulk POST.
    const keys = normalized.map(row => `${row.examId}|${row.studentId}|${row.subject}`)
    if (new Set(keys).size !== keys.length) {
      await client.query('ROLLBACK')
      return res.status(422).json({success:false,code:'DUPLICATE_MARKS_ROW'})
    }
    const existing = await client.query(`
      WITH requested (exam_id,student_id,subject) AS (
        SELECT * FROM UNNEST($2::int[], $3::int[], $4::text[])
      )
      SELECT er.exam_id,er.student_id,er.subject,er.marks_obtained,
        er.total_marks,er.grade,er.result_status
      FROM exam_results er
      JOIN requested r ON r.exam_id=er.exam_id
        AND r.student_id=er.student_id AND r.subject=er.subject
      WHERE er.school_id=$1
      FOR UPDATE OF er
    `,[schoolId,normalized.map(row=>row.examId),normalized.map(row=>row.studentId),normalized.map(row=>row.subject)])
    const prior = new Map(existing.rows.map(row=>[
      `${row.exam_id}|${row.student_id}|${row.subject}`,row,
    ]))
    const sameScore = (oldRow,newRow) =>
      (oldRow.marks_obtained === null ? newRow.marksObtained === null : Number(oldRow.marks_obtained) === newRow.marksObtained) &&
      Number(oldRow.total_marks) === newRow.totalMarks &&
      (oldRow.grade ?? null) === (newRow.grade ?? null) &&
      (oldRow.result_status ?? 'SCORED') === newRow.resultStatus
    for(const row of normalized) {
      const key=`${row.examId}|${row.studentId}|${row.subject}`
      const before=prior.get(key)
      if(before && !sameScore(before,row)) {
        await client.query('ROLLBACK')
        return res.status(409).json({success:false,code:'OFFICIAL_MARKS_REVISION_REQUIRED',
          message:'Previously saved marks cannot be changed without an audited Principal revision.'})
      }
    }
    let insertedCount=0
    for (const row of normalized) {
      const key=`${row.examId}|${row.studentId}|${row.subject}`
      if(prior.has(key)) continue // Exact replay; do not alter DB row or timestamp.
      const inserted=await client.query(`
        INSERT INTO exam_results (school_id, exam_id, student_id, subject, marks_obtained, total_marks, grade, result_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (exam_id, student_id, subject) DO NOTHING
        RETURNING id
      `,[schoolId,row.examId,row.studentId,row.subject,row.marksObtained,row.totalMarks,row.grade,row.resultStatus])
      // Concurrent insert: fail the whole transaction instead of overwriting.
      if(inserted.rowCount!==1) {
        await client.query('ROLLBACK')
        return res.status(409).json({success:false,code:'OFFICIAL_MARKS_WRITE_CONFLICT'})
      }
      insertedCount++
    }
    await client.query('COMMIT')
    return res.json({success:true,savedCount:normalized.length,insertedCount,
      unchangedCount:normalized.length-insertedCount,message:'Results accepted without rewriting prior marks.'})
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Exam result save error:', err.message)
    return res.status(500).json({ success: false, message: 'Results could not be saved.' })
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

    let explicitExamIds = []
    if (req.query.exam_ids) {
      explicitExamIds = String(req.query.exam_ids)
        .split(',')
        .map(value => Number(value.trim()))
        .filter(value => Number.isInteger(value) && value > 0)
      explicitExamIds = [...new Set(explicitExamIds)]
      if (!explicitExamIds.length || explicitExamIds.length > 100) {
        return res.status(422).json({ success: false, message: 'exam_ids must contain between 1 and 100 valid exam IDs.' })
      }
      filters.push(`er.exam_id = ANY($${idx++}::int[])`)
      params.push(explicitExamIds)
    }

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
      const portalScope = portalStudentScope(req, 's', examTenant.nextIndex)
      sql += portalScope.clause
      params.push(...portalScope.params)
    }

    sql += ` ORDER BY e.created_at DESC, s.class, s.roll_number, er.subject`
    if (!explicitExamIds.length) sql += ` LIMIT 500`
    const result = await query(sql, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Exam results list error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to load exam results.' })
  }
})

// GET /api/exams/results/:exam_id
router.get('/results/:exam_id', protect, canReadResults, async (req, res) => {
  try {
    let sql = `
      SELECT er.*, s.name, s.class AS student_class, s.section AS student_section, s.gr_number, s.roll_number, s.father_name, s.photo
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
      const portalScope = portalStudentScope(req, 's', examTenant.nextIndex)
      sql += portalScope.clause
      params.push(...portalScope.params)
    }
    sql += ` ORDER BY s.roll_number, er.subject`
    const result = await query(sql, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Exam results fetch error:', err.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Exam results could not be loaded.' })
  }
})


// GET /api/exams/student-results/:student_id
router.get('/student-results/:student_id', protect, requireScopeForServiceOnly('school.results.read'), async (req, res) => {
  try {
    let sql = `
      SELECT er.*, e.name as exam_name, e.session, e.type as exam_type, s.name as student_name, s.class, s.section, s.gr_number, s.father_name, s.photo
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
    sql += ` ORDER BY e.created_at DESC, er.subject`
    const result = await query(sql, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Student results fetch error:', err.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Student results could not be loaded.' })
  }
})

module.exports = router


const express = require('express')
const router  = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles, requireScopeForServiceOnly, hasServiceScope } = require('../middleware/auth')
const { tenantClause, currentSchoolId, hasColumn } = require('../middleware/tenant')

const canManageExams = requireRoles('super_admin', 'admin', 'principal', 'teacher')
function canReadResults(req, res, next) {
  if (req.user?.account_type === 'service') {
    if (hasServiceScope(req, 'school.results.read')) return next()
    return res.status(403).json({ success: false, message: 'Service permission denied. Required scope: school.results.read' })
  }
  const role = String(req.user?.role || '').toLowerCase()
  if (['super_admin', 'admin', 'principal', 'teacher', 'parent', 'student'].includes(role)) return next()
  return res.status(403).json({ success: false, message: 'Results access denied.' })
}
const ALLOW_MOCK_FALLBACK = process.env.ALLOW_MOCK_FALLBACK === 'true' && process.env.NODE_ENV !== 'production'

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

let gradeSchemaReady = null
function ensureGradeSettingsSchema() {
  if (!gradeSchemaReady) {
    gradeSchemaReady = query(`
      CREATE TABLE IF NOT EXISTS grade_settings (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        label VARCHAR(24) NOT NULL,
        min_percentage INTEGER NOT NULL CHECK (min_percentage BETWEEN 0 AND 100),
        max_percentage INTEGER NOT NULL CHECK (max_percentage BETWEEN 0 AND 100),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, label)
      )
    `).then(() => query('CREATE INDEX IF NOT EXISTS idx_grade_settings_school_order ON grade_settings (school_id, sort_order)'))
      .catch(err => { gradeSchemaReady = null; throw err })
  }
  return gradeSchemaReady
}

const DEFAULT_GRADE_SETTINGS = [
  { label:'A+', from:90, to:100 },
  { label:'A', from:80, to:89 },
  { label:'B', from:70, to:79 },
  { label:'C', from:60, to:69 },
  { label:'D', from:50, to:59 },
  { label:'F', from:0, to:49 },
]

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
    const result = await query(`SELECT label, min_percentage, max_percentage FROM grade_settings WHERE school_id = $1 ORDER BY sort_order, max_percentage DESC`, [schoolId])
    const rows = result.rowCount
      ? result.rows.map(row => ({ label:row.label, from:Number(row.min_percentage), to:Number(row.max_percentage) }))
      : DEFAULT_GRADE_SETTINGS
    res.json({ success:true, data:rows, configured:result.rowCount > 0 })
  } catch (err) {
    console.error('Grade settings read error:', err.message)
    res.status(500).json({ success:false, message:'Grade settings could not be loaded.' })
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
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Exams list error:', err.message)
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    // DB offline â€” return mock exam list
    const today = new Date().toISOString().split('T')[0]
    res.json({
      success: true,
      data: [
        { id: 1, name: 'Mid Term Examination', type: 'midterm', class: '9', session: '2025-2026', start_date: today, end_date: today, total_marks: 100, pass_marks: 33, created_at: new Date().toISOString() },
        { id: 2, name: 'Final Term Examination', type: 'final', class: '10', session: '2025-2026', start_date: today, end_date: today, total_marks: 100, pass_marks: 33, created_at: new Date().toISOString() },
        { id: 3, name: 'Class Assessment - Mathematics', type: 'assessment', class: '8', session: '2025-2026', start_date: today, end_date: today, total_marks: 50, pass_marks: 17, created_at: new Date().toISOString() },
      ]
    })
  }
})

// POST /api/exams â€” teachers can create assessments
router.post('/', protect, canManageExams, async (req, res) => {
  try {
    const { name, type, class: cls, session, start_date, end_date, total_marks, pass_marks, created_by } = req.body
    const supportsTenant = await hasColumn('exams', 'school_id')
    const result = supportsTenant
      ? await query(`
        INSERT INTO exams (school_id, name, type, class, session, start_date, end_date, total_marks, pass_marks, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
      `, [currentSchoolId(req), name, type, cls, session, start_date, end_date, total_marks || 100, pass_marks || 33, created_by])
      : await query(`
        INSERT INTO exams (name, type, class, session, start_date, end_date, total_marks, pass_marks, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
      `, [name, type, cls, session, start_date, end_date, total_marks || 100, pass_marks || 33, created_by])
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/exams/results
router.post('/results', protect, canManageExams, async (req, res) => {
  try {
    const { results = [] } = req.body
    if (!Array.isArray(results)) {
      return res.status(400).json({ success: false, message: 'results must be an array' })
    }

    const supportsStudentTenant = await hasColumn('students', 'school_id')
    const supportsExamTenant = await hasColumn('exams', 'school_id')
    const supportsResultTenant = await hasColumn('exam_results', 'school_id')
    const schoolId = currentSchoolId(req)
    const isSuperAdmin = req.user?.role === 'super_admin'

    for (const r of results) {
      if (!r?.exam_id || !r?.student_id || !r?.subject) {
        return res.status(400).json({ success: false, message: 'exam_id, student_id and subject are required' })
      }

      const marksObtained = Number(r.marks_obtained) || 0
      const totalMarks = Number(r.total_marks) || 0
      const grade = calcGrade(marksObtained, totalMarks)

      if (!isSuperAdmin && supportsStudentTenant) {
        const studentCheck = await query(`
          SELECT id
          FROM students
          WHERE id = $1 AND school_id = $2
          LIMIT 1
        `, [r.student_id, schoolId])
        if (studentCheck.rowCount === 0) {
          return res.status(403).json({ success: false, message: 'Student does not belong to this school' })
        }
      }

      if (!isSuperAdmin && supportsExamTenant) {
        const examCheck = await query(`
          SELECT id
          FROM exams
          WHERE id = $1 AND school_id = $2
          LIMIT 1
        `, [r.exam_id, schoolId])
        if (examCheck.rowCount === 0) {
          return res.status(403).json({ success: false, message: 'Exam does not belong to this school' })
        }
      }

      const existingSql = supportsResultTenant && !isSuperAdmin
        ? `
        SELECT id
        FROM exam_results
        WHERE exam_id = $1 AND student_id = $2 AND subject = $3 AND school_id = $4
        LIMIT 1
      `
        : `
        SELECT id
        FROM exam_results
        WHERE exam_id = $1 AND student_id = $2 AND subject = $3
        LIMIT 1
      `
      const existingParams = supportsResultTenant && !isSuperAdmin
        ? [r.exam_id, r.student_id, r.subject, schoolId]
        : [r.exam_id, r.student_id, r.subject]
      const existing = await query(existingSql, existingParams)

      if (existing.rows.length) {
        const updateSql = supportsResultTenant
          ? `
            UPDATE exam_results
            SET marks_obtained=$1, total_marks=$2, grade=$3, school_id = COALESCE(school_id, $5)
            WHERE id=$4
          `
          : `
            UPDATE exam_results
            SET marks_obtained=$1, total_marks=$2, grade=$3
            WHERE id=$4
          `
        const updateParams = supportsResultTenant
          ? [marksObtained, totalMarks, grade, existing.rows[0].id, schoolId]
          : [marksObtained, totalMarks, grade, existing.rows[0].id]
        await query(updateSql, updateParams)
      } else {
        const insertSql = supportsResultTenant
          ? `
            INSERT INTO exam_results (school_id, exam_id, student_id, subject, marks_obtained, total_marks, grade)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
          `
          : `
            INSERT INTO exam_results (exam_id, student_id, subject, marks_obtained, total_marks, grade)
            VALUES ($1,$2,$3,$4,$5,$6)
          `
        const insertParams = supportsResultTenant
          ? [schoolId, r.exam_id, r.student_id, r.subject, marksObtained, totalMarks, grade]
          : [r.exam_id, r.student_id, r.subject, marksObtained, totalMarks, grade]
        await query(insertSql, insertParams)
      }
    }
    res.json({ success: true, message: 'Results save ho gaye' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
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

    sql += ` ORDER BY e.created_at DESC, s.class, s.roll_number, er.subject LIMIT 500`
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
      SELECT er.*, s.name, s.gr_number, s.roll_number, s.father_name, s.photo
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
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    // DB offline â€” return mock results
    res.json({
      success: true,
      data: [
        { id: 1, exam_id: req.params.exam_id, student_id: 1, name: 'Muhammad Ali', gr_number: 'GR-1001', roll_number: '01', subject: 'Mathematics', marks_obtained: 78, total_marks: 100, grade: 'A' },
        { id: 2, exam_id: req.params.exam_id, student_id: 1, name: 'Muhammad Ali', gr_number: 'GR-1001', roll_number: '01', subject: 'Physics', marks_obtained: 65, total_marks: 100, grade: 'B' },
        { id: 3, exam_id: req.params.exam_id, student_id: 2, name: 'Ayesha Khan', gr_number: 'GR-1002', roll_number: '02', subject: 'Mathematics', marks_obtained: 91, total_marks: 100, grade: 'A+' },
        { id: 4, exam_id: req.params.exam_id, student_id: 2, name: 'Ayesha Khan', gr_number: 'GR-1002', roll_number: '02', subject: 'Physics', marks_obtained: 88, total_marks: 100, grade: 'A+' },
      ]
    })
  }
})


function calcGrade(obtained, total) {
  const pct = (obtained / total) * 100
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B'
  if (pct >= 60) return 'C'
  if (pct >= 50) return 'D'
  if (pct >= 33) return 'E'
  return 'F'
}

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
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    res.json({
      success: true,
      data: [
        { id: 1, exam_id: 1, student_id: req.params.student_id, student_name: 'Mock Student', exam_name: 'Mid Term', subject: 'Mathematics', marks_obtained: 85, total_marks: 100, grade: 'A' },
        { id: 2, exam_id: 1, student_id: req.params.student_id, student_name: 'Mock Student', exam_name: 'Mid Term', subject: 'Physics', marks_obtained: 78, total_marks: 100, grade: 'B' },
        { id: 3, exam_id: 1, student_id: req.params.student_id, student_name: 'Mock Student', exam_name: 'Mid Term', subject: 'Chemistry', marks_obtained: 92, total_marks: 100, grade: 'A+' },
      ]
    })
  }
})

module.exports = router


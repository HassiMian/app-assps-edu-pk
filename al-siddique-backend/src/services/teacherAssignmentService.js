const { query } = require('../config/database')

async function ensureTeacherAssignmentSchema() {
  const result = await query(`
    SELECT
      to_regclass('public.teacher_class_assignments') AS table_name,
      COUNT(*) FILTER (WHERE column_name IN (
        'school_id','teacher_user_id','employee_id','class_name','section','subject','source','is_active'
      ))::int AS required_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teacher_class_assignments'
  `)

  const row = result.rows?.[0] || {}
  if (!row.table_name || Number(row.required_columns || 0) < 8) {
    const err = new Error('Teacher assignment schema is not initialized. Apply migration 019_teacher_assignment_schema before serving teacher-scoped workflows.')
    err.code = 'TEACHER_ASSIGNMENT_SCHEMA_NOT_READY'
    err.status = 503
    throw err
  }
  return true
}

function teacherStudentScopeClause(req, alias = 's', startIndex = 1) {
  const role = String(req.user?.role || '').toLowerCase()
  if (role !== 'teacher') return null
  const prefix = alias ? `${alias}.` : 'students.'
  return {
    clause: ` AND EXISTS (
      SELECT 1
      FROM teacher_class_assignments tca
      WHERE tca.school_id = ${prefix}school_id
        AND tca.teacher_user_id = $${startIndex}
        AND tca.is_active = true
        AND LOWER(tca.class_name) = LOWER(COALESCE(${prefix}class,''))
        AND (
          COALESCE(tca.section,'') = ''
          OR LOWER(tca.section) = LOWER(COALESCE(${prefix}section,''))
        )
    )`,
    params: [req.user?.id || null],
    nextIndex: startIndex + 1,
  }
}

async function getTeacherAssignments({ schoolId, teacherUserId }) {
  const result = await query(
    `SELECT id, school_id, teacher_user_id, employee_id, class_name, section, subject, source
     FROM teacher_class_assignments
     WHERE school_id=$1 AND teacher_user_id=$2 AND is_active=true
     ORDER BY class_name, section, subject`,
    [schoolId, teacherUserId],
  )
  return result.rows
}

async function teacherCanAccessClass({ schoolId, teacherUserId, className, section = null, subject = null }) {
  const cleanClass = String(className || '').trim()
  const cleanSection = String(section || '').trim()
  const cleanSubject = String(subject || '').trim()
  if (!cleanClass) return false
  const params = [schoolId, teacherUserId, cleanClass]
  let sql = `SELECT 1 FROM teacher_class_assignments
    WHERE school_id=$1 AND teacher_user_id=$2 AND is_active=true
      AND LOWER(class_name)=LOWER($3)`
  if (cleanSection) {
    params.push(cleanSection)
    sql += ` AND (COALESCE(section,'')='' OR LOWER(section)=LOWER($${params.length}))`
  }
  if (cleanSubject) {
    params.push(cleanSubject)
    sql += ` AND (COALESCE(subject,'')='' OR LOWER(subject)=LOWER($${params.length}))`
  }
  sql += ' LIMIT 1'
  const result = await query(sql, params)
  return result.rowCount > 0
}


module.exports = {
  ensureTeacherAssignmentSchema,
  teacherStudentScopeClause,
  getTeacherAssignments,
  teacherCanAccessClass,
}

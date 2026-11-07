const { query } = require('../config/database')
const {sqlCanonicalClass}=require('./academicClassKey')

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
        AND ${sqlCanonicalClass('tca.class_name')} = ${sqlCanonicalClass(`COALESCE(${prefix}class,'')`)}
        AND NULLIF(BTRIM(COALESCE(tca.section,'')),'') IS NOT NULL
        AND LOWER(BTRIM(tca.section)) = LOWER(BTRIM(COALESCE(${prefix}section,'')))
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
  // No all-section or all-subject grants for teacher authoring.
  if (!cleanClass || !cleanSection || !cleanSubject) return false
  const result = await query(`SELECT 1 FROM teacher_class_assignments
    WHERE school_id=$1 AND teacher_user_id=$2 AND is_active=true
      AND ${sqlCanonicalClass('class_name')}=${sqlCanonicalClass('$3')}
      AND LOWER(BTRIM(section))=LOWER(BTRIM($4))
      AND LOWER(BTRIM(subject))=LOWER(BTRIM($5)) LIMIT 1`,
    [schoolId,teacherUserId,cleanClass,cleanSection,cleanSubject])
  return result.rowCount > 0
}

module.exports = {
  ensureTeacherAssignmentSchema,
  teacherStudentScopeClause,
  getTeacherAssignments,
  teacherCanAccessClass,
}

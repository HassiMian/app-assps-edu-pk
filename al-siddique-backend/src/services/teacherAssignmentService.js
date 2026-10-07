const { query } = require('../config/database')

async function ensureTeacherAssignmentSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS teacher_class_assignments (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      class_name VARCHAR(100) NOT NULL,
      section VARCHAR(50),
      subject VARCHAR(120),
      source VARCHAR(40) NOT NULL DEFAULT 'manual',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher
      ON teacher_class_assignments(school_id, teacher_user_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class
      ON teacher_class_assignments(school_id, class_name, section, is_active);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_assignment_scope
      ON teacher_class_assignments(
        school_id,
        teacher_user_id,
        LOWER(class_name),
        LOWER(COALESCE(section,'')),
        LOWER(COALESCE(subject,''))
      );
  `)
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

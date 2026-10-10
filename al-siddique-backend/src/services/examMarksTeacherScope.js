'use strict'

// Actor-specific authorization for the existing tenant-scoped exam results API.
// Security invariants: the read and write paths use the same exact school,
// active teacher assignment, class, section and subject predicates.
function norm(value) {
  return String(value ?? '').trim().toLocaleLowerCase('en').replace(/\s+/g, ' ')
}
const NUMERIC_CLASS = {
  '1':'one','2':'two','3':'three','4':'four','5':'five',
  '6':'six','7':'seven','8':'eight','9':'nine','10':'ten',
}
function normalizedClass(value) {
  const raw = norm(value).replace(/^class\s+/, '')
  return NUMERIC_CLASS[raw] || raw
}
function validId(value) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : 0
}
function isTeacher(req) {
  return norm(req?.user?.role) === 'teacher'
}
function examMatchesStudent(exam, student) {
  const className = normalizedClass(exam?.class)
  return !!className && (
    className === 'all classes' ||
    className === 'all' ||
    className === normalizedClass(student?.class)
  )
}
function hasTeacherAssignment(assignments, schoolId, teacherId, student, subject) {
  if (!validId(schoolId) || !validId(teacherId) || !validId(student?.id) || !norm(subject)) return false
  return (assignments || []).some(a =>
    validId(a.school_id) === validId(schoolId) &&
    validId(a.teacher_user_id) === validId(teacherId) &&
    a.is_active === true &&
    // Match existing student roster teacher-assignment rule exactly.
    norm(a.class_name) === norm(student?.class) &&
    (!norm(a.section) || norm(a.section) === norm(student?.section)) &&
    (!norm(a.subject) || norm(a.subject) === norm(subject))
  )
}
function validateTeacherMarksWrite({user, schoolId, results, students, exams, assignments}) {
  const teacherId = validId(user?.id)
  if (!teacherId || !validId(schoolId)) return false
  const studentMap = new Map((students || []).map(row => [validId(row.id),row]))
  const examMap = new Map((exams || []).map(row => [validId(row.id),row]))
  return Array.isArray(results) && results.length > 0 && results.every(row => {
    const student = studentMap.get(validId(row.studentId))
    const exam = examMap.get(validId(row.examId))
    return !!student && !!exam && examMatchesStudent(exam,student) &&
      hasTeacherAssignment(assignments,schoolId,teacherId,student,row.subject)
  })
}

// All result read queries use e, s and er aliases. Keep the scope in SQL so
// a query never returns another teacher's classes/sections/subjects.
function teacherResultReadScope(req, studentAlias='s', resultAlias='er', index=1) {
  if (!isTeacher(req)) return {clause:'',params:[],nextIndex:index}
  const teacherId = validId(req.user?.id)
  // Missing actor ID fails closed; do not query unrestricted result rows.
  if (!teacherId) return {clause:' AND 1=0',params:[],nextIndex:index}
  const column = name => `${studentAlias}.${name}`
  return {
    clause:` AND EXISTS (
      SELECT 1 FROM teacher_class_assignments tca
      WHERE tca.school_id = ${column('school_id')}
        AND tca.teacher_user_id = $${index}
        AND tca.is_active = true
        AND LOWER(tca.class_name) = LOWER(COALESCE(${column('class')},''))
        AND (COALESCE(tca.section,'') = ''
          OR LOWER(tca.section) = LOWER(COALESCE(${column('section')},'')))
        AND (COALESCE(tca.subject,'') = ''
          OR LOWER(tca.subject) = LOWER(COALESCE(${resultAlias}.subject,'')))
    )`,
    params:[teacherId],
    nextIndex:index+1,
  }
}

module.exports = {
  isTeacher, validId, normalizedClass, examMatchesStudent,
  hasTeacherAssignment, validateTeacherMarksWrite, teacherResultReadScope,
}

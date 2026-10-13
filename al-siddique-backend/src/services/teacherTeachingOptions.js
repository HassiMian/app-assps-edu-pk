'use strict'

// Build ONLY authenticated teacher assignments. Never infer permission from
// a school-wide student roster or from a user-supplied class/subject selector.
function buildTeacherTeachingOptions(rows, schoolId, teacherUserId) {
  const sid = Number(schoolId)
  const uid = Number(teacherUserId)
  if (!Number.isSafeInteger(sid) || sid <= 0 || !Number.isSafeInteger(uid) || uid <= 0) return []
  const classes = new Map()
  for (const row of Array.isArray(rows) ? rows : []) {
    if (Number(row.school_id) !== sid || Number(row.teacher_user_id) !== uid) continue
    const cls = String(row.class_name || '').trim()
    const section = String(row.section || '').trim()
    const subject = String(row.subject || '').trim()
    // Empty subject is NOT permission for every subject.
    if (!cls || !subject) continue
    const key = cls.toLowerCase() + '\u0000' + section.toLowerCase()
    if (!classes.has(key)) classes.set(key, { class_name: cls, section, subjects: [] })
    const target = classes.get(key)
    if (!target.subjects.some(s => s.toLowerCase() === subject.toLowerCase())) {
      target.subjects.push(subject)
    }
  }
  return Array.from(classes.values())
}

module.exports = { buildTeacherTeachingOptions }

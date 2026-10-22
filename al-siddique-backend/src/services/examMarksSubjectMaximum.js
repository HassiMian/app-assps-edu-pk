'use strict'
// Official paper maximum is scoped to an authenticated school's exam,
// enrolled student's class/section and exact published subject offering.
// Historical marks and the exam-wide total are NEVER approval evidence.
const { normalizedClass } = require('./examMarksTeacherScope')
const {officialMoverFirstTermAllows} = require('./officialMoverFirstTermPolicy')
function norm(value) { return String(value ?? '').trim().toLowerCase().replace(/\s+/g,' ') }
function validatePaperMaxima({schoolId,results,students,offerings}) {
  const studentMap = new Map((students || []).map(s=>[Number(s.id),s]))
  return Array.isArray(results) && results.length > 0 && results.every(result=>{
    const s = studentMap.get(Number(result.studentId))
    if (!s) return false
    if (!officialMoverFirstTermAllows({examId:result.examId,className:s.class,subject:result.subject,totalMarks:result.totalMarks})) return false
    const matching = (offerings || []).filter(offering =>
      Number(offering.exam_id) === Number(result.examId) &&
      Number(offering.school_id) === Number(schoolId) &&
      normalizedClass(offering.class_name) === normalizedClass(s.class) &&
      norm(offering.section) === norm(s.section) &&
      norm(offering.subject) === norm(result.subject) &&
      Number.isSafeInteger(Number(offering.total_marks)) &&
      Number(offering.total_marks) > 0 &&
      Number(offering.total_marks) <= 1000 &&
      offering.is_active === true &&
      offering.approval_status === 'approved' &&
      Number.isSafeInteger(Number(offering.approval_revision)) &&
      Number(offering.approval_revision) > 0 &&
      Number.isSafeInteger(Number(offering.approved_by_user_id)) &&
      Number(offering.approved_by_user_id) > 0 &&
      !!offering.approved_at &&
      offering.reviewer_valid === true
    )
    return matching.length === 1 && Number(result.totalMarks) === Number(matching[0].total_marks)
  })
}
module.exports = {validatePaperMaxima}

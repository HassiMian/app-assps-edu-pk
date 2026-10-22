'use strict'
// Read-only policy verification. Never derives approval from historic marks.
const normalize = value => String(value ?? '').trim().toLocaleLowerCase('en').replace(/\s+/g,' ')
const id = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : 0
const {officialMoverFirstTermAllows}=require('./officialMoverFirstTermPolicy')
function requestedPolicy(query) {
  const examId=id(query?.exam_id)
  const cls=String(query?.class_name ?? '').trim()
  const section=String(query?.section ?? '').trim()
  const subject=String(query?.subject ?? '').trim()
  if(!examId || !cls || !subject || cls.length>80 || section.length>80 || subject.length>160) return null
  if (!officialMoverFirstTermAllows({examId,className:cls,subject})) return null
  return {examId,cls,section,subject}
}
function policyMatches(row, request, schoolId) {
  if (!officialMoverFirstTermAllows({examId:request?.examId,className:request?.cls,subject:request?.subject,totalMarks:row?.total_marks})) return false
  return Boolean(row && id(row.school_id)===id(schoolId) &&
    id(row.exam_id)===request.examId &&
    normalize(row.class_name)===normalize(request.cls) &&
    normalize(row.section)===normalize(request.section) &&
    normalize(row.subject)===normalize(request.subject) &&
    row.is_active===true && row.approval_status==='approved' &&
    Number.isSafeInteger(Number(row.approval_revision)) && Number(row.approval_revision)>0 &&
    Number.isSafeInteger(Number(row.total_marks)) && Number(row.total_marks)>0 && Number(row.total_marks)<=1000 &&
    id(row.approved_by_user_id)>0 && row.approved_at && row.reviewer_valid===true)
}
function assignmentMatches(row, request, teacherId, schoolId) {
  return Boolean(row && id(row.school_id)===id(schoolId) && id(row.teacher_user_id)===id(teacherId) &&
    row.is_active===true && normalize(row.class_name)===normalize(request.cls) &&
    normalize(row.section)===normalize(request.section) &&
    normalize(row.subject)===normalize(request.subject))
}
module.exports={requestedPolicy,policyMatches,assignmentMatches}

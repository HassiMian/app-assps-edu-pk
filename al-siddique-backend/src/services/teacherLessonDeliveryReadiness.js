'use strict'
// SaaS Core teacher-delivery EVIDENCE contract, not an authorization grant.
// Caller must verify all objects through server-owned signed-tenant lookups;
// never accept approval, identity or assignments from a browser request.
const positiveId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0
const clean=v=>String(v||'').trim().toLocaleLowerCase('en')
function teacherLessonDeliveryReadiness({schoolId,actor,employee,assignment,plan,academicReview}={}) {
  const failures=[]
  if(!positiveId(schoolId))failures.push('SIGNED_SCHOOL_MISSING')
  if(!actor||!positiveId(actor.id)||Number(actor.school_id)!==Number(schoolId)||
     actor.role!=='teacher'||actor.is_active!==true)failures.push('TEACHER_ACTOR_UNVERIFIED')
  if(!employee||!positiveId(employee.id)||Number(employee.school_id)!==Number(schoolId)||
     Number(employee.user_id)!==Number(actor?.id)||employee.is_active!==true)
    failures.push('EMPLOYEE_USER_LINK_UNVERIFIED')
  if(!assignment||!positiveId(assignment.id)||Number(assignment.school_id)!==Number(schoolId)||
     Number(assignment.teacher_user_id)!==Number(actor?.id)||
     Number(assignment.employee_id)!==Number(employee?.id)||assignment.is_active!==true)
    failures.push('ACTIVE_CLASS_ASSIGNMENT_MISSING')
  if(!plan||Number(plan.school_id)!==Number(schoolId)||!positiveId(plan.id)||
     typeof plan.payload!=='object'||!plan.payload||Array.isArray(plan.payload))
    failures.push('LESSON_PLAN_UNVERIFIED')
  const section=plan?.payload?.section
  if(!clean(section)||clean(assignment?.section)!==clean(section))
    failures.push('SECTION_BINDING_UNVERIFIED')
  if(!clean(plan?.class_level)||clean(assignment?.class_name)!==clean(plan?.class_level))
    failures.push('CLASS_BINDING_UNVERIFIED')
  if(!clean(plan?.subject)||clean(assignment?.subject)!==clean(plan?.subject))
    failures.push('SUBJECT_BINDING_UNVERIFIED')
  if(!academicReview||Number(academicReview.school_id)!==Number(schoolId)||
     Number(academicReview.lesson_plan_id)!==Number(plan?.id)||
     academicReview.review_state!=='APPROVED'||
     academicReview.source_provenance_verified!==true||
     academicReview.signed_by_verified_academic_owner!==true)
    failures.push('ACADEMIC_SOURCE_APPROVAL_MISSING')
  return {
    // Readiness is never a permission, publication or delivery receipt.
    evidenceComplete:failures.length===0,
    failures:[...new Set(failures)],
    permissionGranted:false,deliverablePublished:false,delivered:false
  }
}
module.exports={teacherLessonDeliveryReadiness}

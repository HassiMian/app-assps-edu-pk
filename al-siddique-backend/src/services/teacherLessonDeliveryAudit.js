'use strict'
/**
 * Principal-only, tenant-scoped delivery-readiness overview.
 * Aggregate evidence is NOT a teacher assignment, an academic signoff,
 * permission to share a plan, or confirmation of external delivery.
 * Caller must establish the authenticated signed tenant/actor transaction.
 */
const AGGREGATE_SQL=`WITH scheduled AS (
 SELECT DISTINCT t.teacher_id AS user_id
 FROM public.timetable t
 WHERE t.school_id=$1 AND t.day_name IN
 ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')
 AND t.period_label LIKE 'Period %' AND t.teacher_id IS NOT NULL
), verified AS (
 SELECT DISTINCT s.user_id FROM scheduled s
 JOIN public.users u ON u.id=s.user_id AND u.school_id=$1
  AND u.role='teacher' AND u.is_active=true
 JOIN public.employees e ON e.user_id=u.id AND e.school_id=$1 AND e.is_active=true
), eligible_assignments AS (
 SELECT DISTINCT a.teacher_user_id FROM public.teacher_class_assignments a
 JOIN public.users u ON u.id=a.teacher_user_id AND u.school_id=a.school_id
  AND u.role='teacher' AND u.is_active=true
 JOIN public.employees e ON e.id=a.employee_id AND e.user_id=u.id
  AND e.school_id=a.school_id AND e.is_active=true
 WHERE a.school_id=$1 AND a.is_active=true
)
SELECT
 (SELECT COUNT(*)::integer FROM scheduled) AS scheduled_accounts,
 (SELECT COUNT(*)::integer FROM verified) AS identity_verified_accounts,
 (SELECT COUNT(*)::integer FROM eligible_assignments) AS formally_assigned_accounts,
 (SELECT COUNT(*)::integer FROM public.users WHERE school_id=$1 AND
   role='teacher' AND is_active=true) AS active_teacher_accounts,
 (SELECT COUNT(*)::integer FROM public.lesson_plans WHERE school_id=$1) AS saved_lesson_plans,
 (SELECT COUNT(*)::integer FROM public.lesson_plans WHERE school_id=$1
   AND sent_to_portal=true) AS shared_lesson_plans`
function cleanCounts(row) {
 const fields=['scheduled_accounts','identity_verified_accounts','formally_assigned_accounts',
  'active_teacher_accounts','saved_lesson_plans','shared_lesson_plans']
 const result={}
 for(const key of fields){
  if(typeof row?.[key] !== 'number' || !Number.isSafeInteger(row[key]) || row[key]<0)
   throw Object.assign(new Error('Invalid tenant-scoped readiness metric'),{code:'DELIVERY_AUDIT_DATA_INVALID'})
  result[key]=Number(row[key])
 }
 return result
}
async function getTeacherLessonDeliveryAudit(client,schoolId) {
 if(!Number.isSafeInteger(schoolId)||schoolId<=0) {
  throw Object.assign(new Error('Verified school ID required'),{code:'DELIVERY_SCHOOL_REQUIRED'})
 }
 const result=await client.query(AGGREGATE_SQL,[schoolId])
 const evidence=cleanCounts(result.rows[0])
 return {
  status:'HOLD',
  school_id:schoolId,
  evidence,
  missing_teacher_class_assignment:evidence.formally_assigned_accounts===0,
  missing_shared_lesson_plans:evidence.shared_lesson_plans===0,
  academic_source_approval_required:true,
  signed_rls_and_independent_recipient_acceptance_required:true,
  publication_authorized:false,
  permission_granted:false,
  delivery_certified:false
 }
}
module.exports={AGGREGATE_SQL,cleanCounts,getTeacherLessonDeliveryAudit}

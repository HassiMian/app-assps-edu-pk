'use strict'
const crypto=require('node:crypto')
function reviewError(code,status=409){const e=new Error(code);e.code=code;e.status=status;return e}
async function verifiedSchoolPrincipal(client,schoolId,user){
 const id=Number(user?.id)
 if(!Number.isSafeInteger(id)||id<1||!['principal','admin'].includes(user?.role)) throw reviewError('ACADEMIC_PRINCIPAL_REAL_ROLE_REQUIRED',403)
 const q=await client.query(
   "SELECT id FROM users WHERE id=$1 AND school_id=$2 AND lower(role) IN ('principal','admin') AND lower(trim(designation))='principal' AND is_active=true LIMIT 1",
   [id,schoolId])
 if(q.rowCount!==1)throw reviewError('ACADEMIC_PRINCIPAL_ACTIVE_ACCOUNT_REQUIRED',403)
 return id
}
async function teacherAssignmentEvidence(client,schoolId,id){
 const scope=await client.query(
  "SELECT public_id,class_level,subject,payload FROM lesson_plans WHERE school_id=$1 AND public_id=$2 AND payload->>'composerIntake'='true' LIMIT 1",
  [schoolId,id])
 if(!scope.rowCount)throw reviewError('COMPOSER_SOURCE_NOT_FOUND',404)
 const row=scope.rows[0]
 const sql=[
  'SELECT a.teacher_user_id,a.employee_id,a.section,a.class_name,a.subject,a.source,',
  'e.is_active AS employee_active,u.is_active AS user_active,u.role AS user_role,',
  'EXISTS (SELECT 1 FROM timetable t WHERE t.school_id=a.school_id',
  'AND lower(trim(t.class_name))=lower(trim(a.class_name))',
  'AND lower(trim(t.subject))=lower(trim(a.subject))',
  "AND lower(trim(COALESCE(t.section,'')))=lower(trim(COALESCE(a.section,'')))",
  'AND t.teacher_id=a.teacher_user_id AND t.staff_identity_reviewed=true)',
  'AS reviewed_timetable,',
  'EXISTS (SELECT 1 FROM school_academic_approval_events ev',
  "WHERE ev.school_id=a.school_id AND ev.action='teacher_assignment'",
  'AND ev.object_id=a.id AND ev.actor_user_id IN',
  "(SELECT id FROM users WHERE school_id=a.school_id AND role IN ('admin','principal') AND is_active=true)",
  "AND ev.evidence_sha256 ~ '^[a-f0-9]{64}$') AS signed_assignment_audit",
  'FROM teacher_class_assignments a',
  'JOIN employees e ON e.school_id=a.school_id AND e.id=a.employee_id',
  'AND e.user_id=a.teacher_user_id AND e.is_active=true',
  'JOIN users u ON u.school_id=a.school_id AND u.id=a.teacher_user_id',
  "AND u.is_active=true AND lower(u.role)='teacher'",
  'WHERE a.school_id=$1 AND a.is_active=true',
  'AND lower(trim(a.class_name))=lower(trim($2))',
  'AND lower(trim(a.subject))=lower(trim($3))',
  'ORDER BY a.section,a.teacher_user_id'
 ].join(' ')
 const q=await client.query(sql,[schoolId,row.class_level,row.subject])
 const suggestions=await client.query(
  'SELECT DISTINCT class_name,section,subject,teacher_id,teacher_display_name,staff_identity_reviewed FROM timetable '+
  'WHERE school_id=$1 AND lower(trim(class_name))=lower(trim($2)) '+
  'AND lower(trim(subject))=lower(trim($3)) ORDER BY section,teacher_display_name',
  [schoolId,row.class_level,row.subject])
 const verified=q.rows.filter(a=>a.reviewed_timetable===true ||
   (a.source==='signed-admin-review' && a.signed_assignment_audit===true))
 return {
   sourceId:id,classLevel:row.class_level,subject:row.subject,
   assignmentCandidates:q.rows.length,verifiedCount:verified.length,
   // Verified teacher identity alone does not certify textbook, schedule or Principal signature.
   readyForAcademicApproval:false,
   verificationStatus:verified.length?'MATCHED_IDENTITY_REQUIRES_ACADEMIC_REVIEW':'ASSIGNMENT_EVIDENCE_REQUIRED',
   provisionalTimetableSuggestions:suggestions.rows.map(t=>({section:t.section,
     teacherDisplayName:t.teacher_display_name||'(not recorded)',
     teacherUserId:t.teacher_id||null,identityReviewed:t.staff_identity_reviewed===true,
     notAssignment:true})),
   candidates:verified.map(a=>({teacherUserId:a.teacher_user_id,employeeId:a.employee_id,
     section:a.section,verifiedVia:a.reviewed_timetable===true?'REVIEWED_TIMETABLE':'SIGNED_ADMIN_ASSIGNMENT_EVENT'}))
 }
}
async function appendPrincipalEvidenceReview(client,{schoolId,id,user,expectedRevision,sourceDigest,declaration}){
 if(!Number.isSafeInteger(schoolId)||schoolId<=0||!/^LPREVIEW-[A-Za-z0-9-]{8,95}$/.test(String(id)))throw reviewError('PRINCIPAL_SOURCE_SCOPE_REQUIRED',422)
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw reviewError('PRINCIPAL_REVIEW_REVISION_REQUIRED',428)
 if(typeof declaration!=='string'||declaration.trim()!=='I reviewed the original lesson syllabus evidence and its correction flags.')
   throw reviewError('PRINCIPAL_EXPLICIT_DECLARATION_REQUIRED',422)
 const actor=await verifiedSchoolPrincipal(client,schoolId,user)
 const result=await client.query(
  "SELECT revision,payload,created_by,sent_to_portal FROM lesson_plans WHERE school_id=$1 AND public_id=$2 FOR UPDATE",
  [schoolId,id])
 if(!result.rowCount)throw reviewError('PRINCIPAL_SOURCE_NOT_FOUND',404)
 const row=result.rows[0]
 if(!row.payload?.composerIntake ||row.created_by!==null||row.sent_to_portal!==false)
   throw reviewError('PRINCIPAL_SOURCE_INTEGRITY_FAIL')
 if(Number(row.revision)!==expectedRevision)throw reviewError('PRINCIPAL_SOURCE_REVISION_CONFLICT')
 if(row.payload.sourceDigest!==sourceDigest || !/^[a-f0-9]{64}$/.test(sourceDigest||''))
   throw reviewError('PRINCIPAL_SOURCE_DIGEST_MISMATCH')
 const previous=Array.isArray(row.payload.principalReviews)?row.payload.principalReviews:[]
 if(previous.length>=10)throw reviewError('PRINCIPAL_REVIEW_EVENT_LIMIT')
 const last=previous.length?previous[previous.length-1].integrityHash:row.payload.sourceDigest
 if(!/^[a-f0-9]{64}$/.test(last))throw reviewError('PRINCIPAL_REVIEW_HASH_CHAIN_BROKEN')
 const review={
   eventId:crypto.randomUUID(),reviewedByPrincipalUserId:actor,
   decision:'ORIGINAL_SOURCE_INSPECTED_NOT_ACADEMICALLY_APPROVED',
   sourceDigest,previousHash:last,reviewedAt:new Date().toISOString(),
   declarationText:declaration.trim()
 }
 review.integrityHash=crypto.createHash('sha256').update(JSON.stringify(review)).digest('hex')
 const reviews=previous.concat(review)
 const q=await client.query(
  "UPDATE lesson_plans SET payload=jsonb_set(payload,'{principalReviews}',$1::jsonb,true),revision=revision+1,updated_at=NOW() WHERE school_id=$2 AND public_id=$3 AND revision=$4 AND sent_to_portal=false AND payload->>'composerIntake'='true' RETURNING revision",
  [JSON.stringify(reviews),schoolId,id,expectedRevision])
 if(q.rowCount!==1)throw reviewError('PRINCIPAL_REVIEW_CONCURRENT_CHANGE')
 return {
  id,revision:Number(q.rows[0].revision),reviewEventId:review.eventId,
  reviewHash:review.integrityHash,sourceInspected:true,
  approved:false,published:false,notificationCount:0
 }
}
module.exports={verifiedSchoolPrincipal,teacherAssignmentEvidence,appendPrincipalEvidenceReview}

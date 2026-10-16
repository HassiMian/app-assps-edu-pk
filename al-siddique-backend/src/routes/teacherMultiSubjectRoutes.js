'use strict'
const express=require('express')
const {pool,query,applyTenantContext}=require('../config/database')
const {protect}=require('../middleware/auth')
const {currentSchoolId}=require('../middleware/tenant')
const {normalizeSubject,normalizeTeacherSubjectProposal,validateInchargeCandidate}=require('../services/academics/teacherMultiSubjectContract')
const router=express.Router()
const ADMIN=new Set(['admin','principal','school_admin'])
function scope(req){
 const schoolId=Number(currentSchoolId(req))
 const claimed=Number(req.user?.school_id)
 const userId=Number(req.user?.id)
 if(!Number.isSafeInteger(schoolId)||schoolId<=0||schoolId!==claimed||
 !Number.isSafeInteger(userId)||userId<=0)return null
 return {schoolId,userId,role:String(req.user?.role||'')}
}
function denied(res,code='SCHOOL_CONTEXT_REQUIRED'){return res.status(403).json({success:false,code})}
function internal(res,err){console.error('Multi-subject profile request:',err.code||'DB_ERROR');return res.status(503).json({success:false,code:'TEACHER_PROFILE_UNAVAILABLE'})}
async function hasSchema(){
 const x=await query("SELECT to_regclass('public.school_subject_catalog') AS a, to_regclass('public.teacher_subject_profiles') AS b, to_regclass('public.school_class_incharges') AS c, to_regclass('public.school_teacher_profile_events') AS d")
 if(!x.rows[0]?.a||!x.rows[0]?.b||!x.rows[0]?.c||!x.rows[0]?.d) {
  const err=new Error('Profile migration not certified');err.code='SCHEMA_NOT_PUBLISHED';throw err
 }
}
async function currentSession(schoolId){
 const x=await query('SELECT academic_year FROM settings WHERE school_id=$1 LIMIT 1',[schoolId])
 const raw=String(x.rows[0]?.academic_year||'')
 const m=/^(20\d{2})[-–](20\d{2})$/.exec(raw)
 if(!m||Number(m[2])!==Number(m[1])+1)throw Object.assign(new Error('Academic session missing'),{code:'SESSION_NOT_CONFIGURED'})
 return m[1]+'–'+m[2].slice(2)
}
async function verifiedEmployee(client,schoolId,employeeId){
 const x=await client.query(`SELECT e.id,e.user_id,u.role
  FROM employees e JOIN users u ON u.id=e.user_id AND u.school_id=e.school_id
  WHERE e.school_id=$1 AND e.id=$2 AND e.is_active=true AND u.is_active=true AND u.role='teacher'
  FOR SHARE OF e,u`,[schoolId,employeeId])
 return x.rows.length===1?x.rows[0]:null
}
router.get('/class-sections',protect,async(req,res)=>{
 const a=scope(req);if(!a||!ADMIN.has(a.role))return denied(res,'ADMIN_REQUIRED')
 try{
  const x=await query(`SELECT class AS class_name,section,COUNT(*)::int AS student_count
    FROM students WHERE school_id=$1 AND is_active=true
    GROUP BY class,section ORDER BY class,section`,[a.schoolId])
  return res.json({success:true,data:x.rows})
 }catch(e){return internal(res,e)}
})
router.get('/timetable-reference',protect,async(req,res)=>{
 const a=scope(req);if(!a||!ADMIN.has(a.role))return denied(res,'ADMIN_REQUIRED')
 try{
  const x=await query(`SELECT class_name,section,period_label,subject,teacher_display_name
    FROM timetable WHERE school_id=$1 AND academic_session='2026–27' AND class_name<>'School-wide'
    ORDER BY class_name,section,start_time LIMIT 150`,[a.schoolId])
  return res.json({success:true,referenceOnly:true,grantsIssued:false,data:x.rows})
 }catch(e){return internal(res,e)}
})
router.get('/authorized-assignments',protect,async(req,res)=>{
 const a=scope(req);if(!a||!ADMIN.has(a.role))return denied(res,'ADMIN_REQUIRED')
 try{
  const x=await query(`SELECT t.teacher_user_id,t.employee_id,t.class_name,t.section,t.subject,t.source,
   e.name AS teacher_name
   FROM teacher_class_assignments t JOIN employees e ON e.school_id=t.school_id AND e.id=t.employee_id
   WHERE t.school_id=$1 AND t.is_active=true ORDER BY e.name,t.class_name,t.subject LIMIT 500`,[a.schoolId])
  return res.json({success:true,data:x.rows})
 }catch(e){return internal(res,e)}
})
router.get('/catalog',protect,async(req,res)=>{
 const actor=scope(req)
 if(!actor||!(['teacher',...ADMIN].includes(actor.role)))return denied(res)
 try{await hasSchema();const x=await query('SELECT id,subject_key,name_en,name_ur,category FROM school_subject_catalog WHERE school_id=$1 AND is_active=true ORDER BY name_en',[actor.schoolId]);return res.json({success:true,data:x.rows})}catch(e){return internal(res,e)}
})
router.post('/catalog',protect,async(req,res)=>{
 const actor=scope(req)
 if(!actor||!ADMIN.has(actor.role))return denied(res,'ADMIN_REQUIRED')
 const {errors,value}=normalizeSubject(req.body)
 if(errors.length)return res.status(422).json({success:false,errors})
 try{
  await hasSchema()
  const x=await query(`INSERT INTO school_subject_catalog (school_id,subject_key,name_en,name_ur)
    VALUES($1,$2,$3,$4) ON CONFLICT (school_id,subject_key) DO NOTHING RETURNING id,subject_key,name_en,name_ur`,
   [actor.schoolId,value.key,value.name,value.nameUrdu])
  if(!x.rowCount)return res.status(409).json({success:false,code:'SUBJECT_ALREADY_EXISTS'})
  return res.status(201).json({success:true,data:x.rows[0]})
 }catch(e){return internal(res,e)}
})
router.get('/me',protect,async(req,res)=>{
 const actor=scope(req)
 if(!actor||actor.role!=='teacher')return denied(res,'TEACHER_ACCOUNT_REQUIRED')
 try{
  await hasSchema()
  const x=await query(`SELECT p.id,c.subject_key,c.name_en,c.name_ur,p.academic_session,p.status
   FROM teacher_subject_profiles p JOIN school_subject_catalog c ON c.school_id=p.school_id AND c.id=p.subject_id
   WHERE p.school_id=$1 AND p.teacher_user_id=$2 ORDER BY c.name_en`,[actor.schoolId,actor.userId])
  return res.json({success:true,data:x.rows,accessNote:'Profile subjects are not official class or examination access.'})
 }catch(e){return internal(res,e)}
})
router.get('/profiles',protect,async(req,res)=>{
 const actor=scope(req)
 if(!actor||!ADMIN.has(actor.role))return denied(res,'ADMIN_REQUIRED')
 try{
  await hasSchema()
  const x=await query(`SELECT p.id,p.employee_id,e.name AS teacher_name,p.teacher_user_id,c.name_en,c.name_ur,c.subject_key,
  p.academic_session,p.status,p.evidence_reference,p.version
  FROM teacher_subject_profiles p JOIN employees e ON e.school_id=p.school_id AND e.id=p.employee_id
  JOIN school_subject_catalog c ON c.id=p.subject_id AND c.school_id=p.school_id
  WHERE p.school_id=$1 ORDER BY e.name,c.name_en LIMIT 500`,[actor.schoolId])
  return res.json({success:true,data:x.rows})
 }catch(e){return internal(res,e)}
})
router.post('/proposals',protect,async(req,res)=>{
 const actor=scope(req)
 if(!actor||!ADMIN.has(actor.role))return denied(res,'ADMIN_REQUIRED')
 const {errors,value}=normalizeTeacherSubjectProposal(req.body)
 if(errors.length)return res.status(422).json({success:false,errors})
 let client
 try{
  await hasSchema();client=await pool.connect()
  await client.query('BEGIN');await applyTenantContext(client)
  const employee=await verifiedEmployee(client,actor.schoolId,value.employeeId)
  if(!employee){await client.query('ROLLBACK');return res.status(409).json({success:false,code:'TEACHER_ACCOUNT_IDENTITY_MISMATCH'})}
  const subject=await client.query('SELECT id FROM school_subject_catalog WHERE school_id=$1 AND id=$2 AND is_active=true FOR SHARE',[actor.schoolId,value.subjectId])
  if(subject.rowCount!==1){await client.query('ROLLBACK');return res.status(409).json({success:false,code:'CANONICAL_SUBJECT_REQUIRED'})}
  const x=await client.query(`INSERT INTO teacher_subject_profiles
   (school_id,employee_id,teacher_user_id,subject_id,academic_session,evidence_reference,created_by,status)
   VALUES($1,$2,$3,$4,$5,$6,$7,'proposed')
   ON CONFLICT(school_id,employee_id,subject_id,academic_session) DO NOTHING RETURNING id,status,version`,
   [actor.schoolId,value.employeeId,employee.user_id,value.subjectId,value.session,value.evidence,actor.userId])
  if(x.rowCount!==1){await client.query('ROLLBACK');return res.status(409).json({success:false,code:'SUBJECT_PROFILE_ALREADY_EXISTS'})}
  await client.query(`INSERT INTO school_teacher_profile_events(school_id,profile_kind,record_id,event_kind,actor_id)
   VALUES($1,'subject',$2,'proposed',$3)`,[actor.schoolId,x.rows[0].id,actor.userId])
  await client.query('COMMIT');return res.status(201).json({success:true,data:x.rows[0],grantIssued:false})
 }catch(e){if(client)await client.query('ROLLBACK').catch(()=>{});return internal(res,e)}
 finally{client?.release()}
})
router.post('/proposals/:id/approve',protect,async(req,res)=>{
 const actor=scope(req)
 if(!actor||!['admin','principal'].includes(actor.role))return denied(res,'PRINCIPAL_AUTHORIZATION_REQUIRED')
 const target=Number(req.params.id)
 const version=Number(req.body?.version)
 const confirmation=req.body?.reviewDeclaration
 if(!Number.isSafeInteger(target)||target<=0||!Number.isSafeInteger(version)||version<=0||
 confirmation!=='I_VERIFIED_TEACHER_SUBJECT_PROFILE')return res.status(422).json({success:false,code:'EXACT_REVIEW_REQUIRED'})
 let client
 try{
  await hasSchema();client=await pool.connect()
  await client.query('BEGIN');await applyTenantContext(client)
  const x=await client.query(`UPDATE teacher_subject_profiles SET status='approved',
   approved_by=$1,approved_at=NOW(),version=version+1,updated_at=NOW()
   WHERE id=$2 AND school_id=$3 AND status='proposed' AND version=$4
   AND EXISTS(SELECT 1 FROM employees e JOIN users u ON u.id=e.user_id AND u.school_id=e.school_id
      WHERE e.school_id=$3 AND e.id=teacher_subject_profiles.employee_id
      AND e.user_id=teacher_subject_profiles.teacher_user_id
      AND e.is_active AND u.is_active AND u.role='teacher')
   RETURNING id,status,version`,[actor.userId,target,actor.schoolId,version])
  if(x.rowCount!==1){await client.query('ROLLBACK');return res.status(409).json({success:false,code:'PROFILE_REVIEW_STALE_OR_INVALID'})}
  await client.query(`INSERT INTO school_teacher_profile_events(school_id,profile_kind,record_id,event_kind,actor_id)
   VALUES($1,'subject',$2,'approved',$3)`,[actor.schoolId,target,actor.userId])
  await client.query('COMMIT');return res.json({success:true,data:x.rows[0],grantIssued:false})
 }catch(e){if(client)await client.query('ROLLBACK').catch(()=>{});return internal(res,e)}
 finally{client?.release()}
})
router.get('/incharges',protect,async(req,res)=>{
 const a=scope(req);if(!a||!ADMIN.has(a.role))return denied(res,'ADMIN_REQUIRED')
 try{
  await hasSchema()
  const x=await query(`SELECT i.id,i.academic_session,i.class_name,i.section,
   i.employee_id,e.name AS teacher_name,i.assignment_role,i.status,i.version,
   i.source_reference FROM school_class_incharges i
   JOIN employees e ON e.school_id=i.school_id AND e.id=i.employee_id
   WHERE i.school_id=$1 ORDER BY i.class_name,i.section,i.assignment_role LIMIT 200`,[a.schoolId])
  return res.json({success:true,data:x.rows})
 }catch(e){return internal(res,e)}
})
router.post('/incharges/proposals',protect,async(req,res)=>{
 const a=scope(req);if(!a||!ADMIN.has(a.role))return denied(res,'ADMIN_REQUIRED')
 const {errors,value}=validateInchargeCandidate(req.body)
 if(errors.length)return res.status(422).json({success:false,errors})
 let c
 try{
  await hasSchema();c=await pool.connect();await c.query('BEGIN');await applyTenantContext(c)
  const emp=await verifiedEmployee(c,a.schoolId,value.employeeId)
  if(!emp){await c.query('ROLLBACK');return res.status(409).json({success:false,code:'ACTIVE_EMPLOYEE_USER_REQUIRED'})}
  const roster=await c.query(`SELECT 1 FROM students WHERE school_id=$1 AND is_active=true
   AND LOWER(BTRIM(class))=LOWER(BTRIM($2)) AND LOWER(BTRIM(section))=LOWER(BTRIM($3)) LIMIT 1`,
   [a.schoolId,value.className,value.section])
  if(!roster.rowCount){await c.query('ROLLBACK');return res.status(409).json({success:false,code:'CLASS_WITH_ACTIVE_STUDENTS_REQUIRED'})}
  const x=await c.query(`INSERT INTO school_class_incharges
   (school_id,academic_session,class_name,section,employee_id,teacher_user_id,
    assignment_role,source_reference,status)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,'proposed') RETURNING id,status,version`,
   [a.schoolId,value.session,value.className,value.section,value.employeeId,emp.user_id,value.role,value.evidence])
  await c.query(`INSERT INTO school_teacher_profile_events(school_id,profile_kind,record_id,event_kind,actor_id)
   VALUES($1,'incharge',$2,'proposed',$3)`,[a.schoolId,x.rows[0].id,a.userId])
  await c.query('COMMIT');return res.status(201).json({success:true,data:x.rows[0],studentVisible:false})
 }catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});return internal(res,e)}
 finally{c?.release()}
})
router.post('/incharges/:id/approve',protect,async(req,res)=>{
 const a=scope(req);if(!a||!['admin','principal'].includes(a.role))return denied(res,'PRINCIPAL_REQUIRED')
 const recordId=Number(req.params.id),revision=Number(req.body?.version)
 if(!Number.isSafeInteger(recordId)||recordId<=0||!Number.isSafeInteger(revision)||revision<=0||
 req.body?.reviewDeclaration!=='I_VERIFIED_EXACT_CLASS_INCHARGE')
 return res.status(422).json({success:false,code:'APPROVAL_EVIDENCE_REQUIRED'})
 let c
 try{
  await hasSchema();c=await pool.connect();await c.query('BEGIN');await applyTenantContext(c)
  const previous=await c.query(`SELECT * FROM school_class_incharges WHERE school_id=$1
   AND id=$2 AND status='proposed' AND version=$3 FOR UPDATE`,[a.schoolId,recordId,revision])
  if(previous.rowCount!==1){await c.query('ROLLBACK');return res.status(409).json({success:false,code:'INCHARGE_STALE'})}
  const p=previous.rows[0]
  const emp=await verifiedEmployee(c,a.schoolId,p.employee_id)
  if(!emp||Number(emp.user_id)!==Number(p.teacher_user_id)){
   await c.query('ROLLBACK');return res.status(409).json({success:false,code:'STAFF_IDENTITY_CHANGED'})
  }
  const x=await c.query(`UPDATE school_class_incharges SET status='approved',approved_by=$1,
   approved_at=NOW(),version=version+1,updated_at=NOW(),
   effective_from=COALESCE(effective_from,CURRENT_DATE)
   WHERE school_id=$2 AND id=$3 AND version=$4 AND status='proposed'
   RETURNING id,status,version`,[a.userId,a.schoolId,recordId,revision])
  await c.query(`INSERT INTO school_teacher_profile_events(school_id,profile_kind,record_id,event_kind,actor_id)
   VALUES($1,'incharge',$2,'approved',$3)`,[a.schoolId,recordId,a.userId])
  await c.query('COMMIT');return res.json({success:true,data:x.rows[0],studentVisible:true})
 }catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});return internal(res,e)}
 finally{c?.release()}
})
router.get('/class-incharge/my-class',protect,async(req,res)=>{
 const actor=scope(req)
 if(!actor||actor.role!=='student')return denied(res,'STUDENT_ACCOUNT_REQUIRED')
 try{
  await hasSchema()
  const session=await currentSession(actor.schoolId)
  const student=await query(`SELECT s.class AS class_name,s.section
    FROM users u JOIN students s ON s.id=u.entity_id AND s.school_id=u.school_id
    WHERE u.id=$1 AND u.school_id=$2 AND u.role='student' AND u.is_active=true
    AND LOWER(COALESCE(u.entity_type,''))='student' AND s.is_active=true LIMIT 1`,
    [actor.userId,actor.schoolId])
  if(student.rowCount!==1)return res.status(404).json({success:false,code:'VERIFIED_STUDENT_BINDING_MISSING'})
  const own=student.rows[0]
  const x=await query(`SELECT e.name AS teacher_name,a.assignment_role
  FROM school_class_incharges a JOIN employees e ON e.id=a.employee_id AND e.school_id=a.school_id
  JOIN users u ON u.id=a.teacher_user_id AND u.school_id=a.school_id AND u.is_active=true AND u.role='teacher'
  WHERE a.school_id=$1 AND a.academic_session=$2 AND a.status='approved'
  AND LOWER(BTRIM(a.class_name))=LOWER(BTRIM($3))
  AND LOWER(BTRIM(a.section))=LOWER(BTRIM($4))
  AND (a.effective_from IS NULL OR a.effective_from<=CURRENT_DATE)
  AND (a.effective_to IS NULL OR a.effective_to>=CURRENT_DATE)
  AND e.is_active=true
  ORDER BY CASE a.assignment_role WHEN 'primary' THEN 0 ELSE 1 END LIMIT 2`,
  [actor.schoolId,session,own.class_name,own.section||''])
  res.set('Cache-Control','private, no-store')
  return res.json({success:true,data:{className:own.class_name,section:own.section,academicSession:session,
    classIncharges:x.rows,status:x.rows.length?'confirmed':'awaiting_approval'}})
 }catch(e){return internal(res,e)}
})
module.exports=router

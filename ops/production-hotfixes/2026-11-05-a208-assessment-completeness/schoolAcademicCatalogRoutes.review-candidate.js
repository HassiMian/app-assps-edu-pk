'use strict'
// Authenticated ASSPS academic catalog staging. Staging is not approval.
const { protect, id, withApproval, audit } = require('./schoolAcademicApprovalCore')
const express = require('express')
const router = express.Router()
const { pool, applyTenantContext } = require('../config/database')
const { requireRoles } = require('../middleware/auth')
const {sqlCanonicalClass}=require('../services/academicClassKey')
const {reviewOriginalLessonSources}=require('../services/lessonOriginalSourceReview')
const {inspectSignedAcademicWriter}=require('../services/academicWriterReadinessService')
const {parseFilters,expectedGradeSQL,summaryRows,mismatchHint,summarizeMismatchHints}=require('../services/gradeDiscrepancyReview')

function canonical(text) { return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ') }

// Source-only A208 guard: count real student cohorts before staging exam subjects.
// Only the independently established Pre-Nine spelling alias is allowed.
function assessmentCohortKey(className, section) {
  const classKey = canonical(className) === 'pre-nine' ? 'pre nine' : canonical(className)
  return [classKey, canonical(section)].join('\u0000')
}
function uncoveredActiveCohorts(activeRows = [], candidateRows = []) {
  const covered = new Set(candidateRows.map(row => assessmentCohortKey(row.class_name, row.section)))
  return activeRows.filter(row => !covered.has(assessmentCohortKey(row.class_name, row.section)))
    .map(row => ({ className: String(row.class_name || '').trim(), section: String(row.section || '').trim() }))
}

async function proposedCatalog(c, school, examId) {
  const examRows = await c.query(
    "SELECT id,name,type,class,session,total_marks,pass_marks FROM exams WHERE id=$1 AND school_id=$2",
    [examId,school]
  )
  if (examRows.rowCount !== 1) return {error:'EXAM_NOT_FOUND',status:404}
  const exam = examRows.rows[0]
  if (String(exam.type) !== 'AS' || canonical(exam.class) !== 'all classes') return {error:'ALL_CLASS_ASSESSMENT_REQUIRED'}
  if (!Number.isSafeInteger(Number(exam.total_marks)) || Number(exam.total_marks)<=0 || Number(exam.total_marks)>1000) return {error:'INVALID_ASSESSMENT_MAXIMUM'}
  const grade = await c.query("SELECT max_percentage FROM grade_settings WHERE school_id=$1 AND label='F'",[school])
  if(grade.rowCount!==1 || !Number.isSafeInteger(Number(grade.rows[0].max_percentage)) || Number(grade.rows[0].max_percentage)<0 || Number(grade.rows[0].max_percentage)>=100) return {error:'OFFICIAL_PASS_POLICY_REQUIRED'}
  const pass = Math.ceil(Number(exam.total_marks)*(Number(grade.rows[0].max_percentage)+1)/100)
  if(Number(exam.pass_marks)!==pass) return {error:'ASSESSMENT_PASS_MARKS_POLICY_CONFLICT'}

  const rows = await c.query(`
    SELECT DISTINCT a.class_name, a.section, a.subject
    FROM teacher_class_assignments a
    JOIN users u ON u.school_id=a.school_id AND u.id=a.teacher_user_id
      AND u.role='teacher' AND u.is_active=true
    JOIN employees p ON p.school_id=u.school_id AND p.user_id=u.id
      AND p.id=a.employee_id AND p.is_active=true
    WHERE a.school_id=$1 AND a.is_active=true
      AND EXISTS (SELECT 1 FROM timetable t WHERE t.school_id=a.school_id
        AND t.teacher_id=a.teacher_user_id AND t.staff_identity_reviewed=true
        AND LOWER(BTRIM(t.class_name))=LOWER(BTRIM(a.class_name))
        AND LOWER(BTRIM(t.section))=LOWER(BTRIM(a.section))
        AND LOWER(BTRIM(t.subject))=LOWER(BTRIM(a.subject)))
      AND EXISTS (SELECT 1 FROM students s WHERE s.school_id=a.school_id
        AND s.is_active=true
        AND ${sqlCanonicalClass('s.class')}=${sqlCanonicalClass('a.class_name')}
        AND LOWER(BTRIM(s.section))=LOWER(BTRIM(a.section)))
    ORDER BY a.class_name,a.section,a.subject
  `,[school])
  if(rows.rowCount<1 || rows.rowCount>500) return {error:'VERIFIED_ACTIVE_TEACHING_SCOPE_REQUIRED'}
  for(const row of rows.rows){
    if(!row.class_name || !row.section || !row.subject ||
      row.class_name.length>80 || row.section.length>80 || row.subject.length>160)
      return {error:'INVALID_REVIEWED_CLASS_SUBJECT'}
  }
  // Fail closed on ambiguous normalized duplicate subjects (DB uniqueness is case sensitive).
  const signatures = rows.rows.map(r=>[r.class_name,r.section,r.subject].map(canonical).join('\u0000'))
  if(new Set(signatures).size!==signatures.length) return {error:'DUPLICATED_REVIEWED_SUBJECTS'}
  // A staged Assessment must cover EVERY active student cohort, not only
  // cohorts with verified teacher subjects. Otherwise students disappear from
  // Assessment 1-5 without any principal explicitly deciding their status.
  const active = await c.query(
    'SELECT DISTINCT s.class AS class_name,s.section FROM students s WHERE s.school_id=$1 AND s.is_active=true',
    [school]
  )
  const uncoveredCohorts = uncoveredActiveCohorts(active.rows, rows.rows)
  return {exam,pass,rows:rows.rows,cohorts:new Set(rows.rows.map(r=>assessmentCohortKey(r.class_name,r.section))).size,
    totalActiveCohorts:active.rows.length, uncoveredCohorts}
}

// Read-only, authenticated Principal coverage report; no inferred assignments.
// Read-only authenticated discrepancy review. Never changes historic marks or grades.
// Principal-only unified assessment readiness. Pure snapshot: never stages,
 // signs, approves, modifies historical marks or changes current enrollment.
router.get('/assessment-catalog/readiness',protect,requireRoles('admin','principal'),async(req,res)=>{
 const school=id(req.user?.school_id),userId=id(req.user?.id)
 if(!school||!userId||school!==id(req.school_id))
  return res.status(403).json({success:false,code:'SCHOOL_ADMIN_CONTEXT_REQUIRED'})
 let c,open=false
 try {
  c=await pool.connect()
  await c.query('BEGIN READ ONLY');open=true
  await applyTenantContext(c)
  const actor=await c.query("SELECT id FROM users WHERE id=$1 AND school_id=$2 AND is_active=true AND role IN ('admin','principal')",[userId,school])
  if(actor.rowCount!==1){await c.query('ROLLBACK');open=false;return res.status(403).json({success:false,code:'ACTIVE_PRINCIPAL_REQUIRED'})}
  const exams=(await c.query("SELECT id,name,type,class,total_marks,pass_marks,session FROM exams WHERE school_id=$1 AND type='AS' AND LOWER(BTRIM(class))='all classes' ORDER BY id",[school])).rows
  const counts=(await c.query("SELECT exam_id,approval_status,COUNT(*)::int AS total FROM exam_subjects WHERE school_id=$1 GROUP BY exam_id,approval_status",[school])).rows
  const population=(await c.query(`
    SELECT s.class AS class_name,s.section,COUNT(*)::int AS students,
      EXISTS(SELECT 1 FROM teacher_class_assignments a
       JOIN users u ON u.id=a.teacher_user_id AND u.school_id=a.school_id AND u.role='teacher' AND u.is_active=true
       JOIN employees ep ON ep.id=a.employee_id AND ep.user_id=u.id AND ep.school_id=a.school_id AND ep.is_active=true
       WHERE a.school_id=s.school_id AND a.is_active=true
       AND ${sqlCanonicalClass('a.class_name')}=${sqlCanonicalClass('s.class')}
       AND LOWER(BTRIM(a.section))=LOWER(BTRIM(s.section))) AS reviewed_staffed
    FROM students s WHERE s.school_id=$1 AND s.is_active=true
    GROUP BY s.school_id,s.class,s.section ORDER BY s.class,s.section
  `,[school])).rows
  // Signed audit table has FORCE RLS and a restricted signature-check function.
  // The general SaaS runtime is intentionally not granted that capability.
  // Do not query, bypass RLS or misrepresent an inaccessible audit as 0 approvals.
  const approvedEvents=null
  const approvalAuditStatus='SIGNED_AUDIT_NOT_READABLE_BY_GENERAL_RUNTIME'

  const gradeRows=(await c.query(expectedGradeSQL,[school,null])).rows
  const sourceGrades=gradeRows.length
  const records=(await c.query("SELECT COUNT(*)::int AS n,COUNT(*) FILTER(WHERE marks_obtained=0)::int AS genuine_zeros FROM exam_results WHERE school_id=$1",[school])).rows[0]
  const profiles=(await c.query("SELECT COUNT(*)::int AS total FROM lesson_plans WHERE school_id=$1",[school])).rows[0].total
  const vault=(await c.query("SELECT COUNT(*)::int AS total FROM paper_vault WHERE school_id=$1 AND deleted_at IS NULL",[school])).rows[0].total
  const assessments=[]
  for(const exam of exams){
   const count=counts.filter(x=>Number(x.exam_id)===Number(exam.id))
   const preview=await proposedCatalog(c,school,Number(exam.id))
   assessments.push({
    id:Number(exam.id),name:exam.name,session:exam.session,
    maximum:Number(exam.total_marks),passMarks:Number(exam.pass_marks),
    catalog:count,reviewedCandidateOfferings:preview.rows?.length||0,
    reviewedActiveCohorts:preview.cohorts||0,
    catalogPreviewError:preview.error||null,
    approvalRequired:count.every(x=>x.approval_status!=='approved')
   })
  }
  await c.query('COMMIT');open=false
  const unstaffed=population.filter(x=>!x.reviewed_staffed)
  res.set('Cache-Control','private, no-store')
  return res.json({success:true,data:{
   reviewOnly:true,academicApprovalCreated:false,
   schoolId:school,activeStudents:population.reduce((n,x)=>n+x.students,0),
   unstaffedStudents:unstaffed.reduce((n,x)=>n+x.students,0),
   unstaffedCohorts:unstaffed.map(x=>({className:x.class_name,section:x.section,activeStudents:x.students})),
   firstTermResultRecords:records.n,genuineZeroMarks:records.genuine_zeros,
   historicalGradeDiscrepancies:sourceGrades,investigativeHints:summarizeMismatchHints(gradeRows),academicApprovalEvents:approvedEvents,academicApprovalAuditStatus:approvalAuditStatus,
   savedVaultPapers:vault,lessonPlanRecords:profiles,assessments,
   releaseStatus:'PRINCIPAL_SOURCE_APPROVAL_AND_AUTHENTIC_ACCEPTANCE_REQUIRED',
   forbiddenAutomation:'NO_AUTO_SUBJECT_APPROVAL_OR_TEACHER_ASSIGNMENT'
  }})
 }catch(e){
  if(open)await c.query('ROLLBACK').catch(()=>{})
  console.error('Academic readiness snapshot failed:',e.code||'QUERY_FAILED')
  return res.status(503).json({success:false,code:'ACADEMIC_READINESS_UNAVAILABLE'})
 }finally{c?.release()}
})

router.get('/grade-discrepancies',protect,requireRoles('admin','principal'),async(req,res)=>{
 const school=id(req.user?.school_id),actorId=id(req.user?.id)
 if(!school||!actorId||school!==id(req.school_id))
  return res.status(403).json({success:false,code:'AUTHENTIC_SCHOOL_ADMIN_REQUIRED'})
 const filter=parseFilters(req.query)
 if(filter.error)return res.status(422).json({success:false,code:filter.error})
 let client,open=false
 try{
  client=await pool.connect()
  await client.query('BEGIN READ ONLY')
  open=true
  await applyTenantContext(client)
  const actor=await client.query("SELECT id FROM users WHERE id=$1 AND school_id=$2 AND is_active=true AND role IN ('admin','principal')",[actorId,school])
  if(actor.rowCount!==1){
   await client.query('ROLLBACK');open=false
   return res.status(403).json({success:false,code:'ACTIVE_SCHOOL_PRINCIPAL_REQUIRED'})
  }
  const {rows}=await client.query(expectedGradeSQL,[school,filter.examId])
  await client.query('COMMIT');open=false
  const stats=summaryRows(rows)
  res.set('Cache-Control','private, no-store')
  return res.json({success:true,data:{
    schoolId:school,examId:filter.examId,policy:'school_grade_settings_whole_percentage_floor',
    summary:stats,investigativeHints:summarizeMismatchHints(rows),reviewItems:rows.slice(0,filter.limit).map(r=>({
      examId:Number(r.exam_id),studentId:Number(r.student_id),
      className:r.class_name,section:r.section_name,subject:r.subject,
      marksObtained:Number(r.marks_obtained),totalMarks:Number(r.total_marks),
      wholePercent:Number(r.whole_percent),storedGrade:r.stored_grade,expectedGrade:r.expected_grade,investigativeHint:mismatchHint(r)
    })),returned:Math.min(filter.limit,rows.length),
    auditOnly:true,automaticHistoricalGradeChanges:false,
    requiresAuthenticAcademicReview:true
  }})
 }catch(e){
  if(open)await client.query('ROLLBACK').catch(()=>{})
  console.error('Historical grade discrepancy read:',e.code||'QUERY_FAILED')
  return res.status(503).json({success:false,code:'GRADE_REVIEW_UNAVAILABLE'})
 }finally{client?.release()}
})

router.get('/assessment-catalog/cohort-coverage',protect,requireRoles('admin','principal'),async(req,res)=>{
 const school=id(req.user?.school_id),actorId=id(req.user?.id)
 if(!school||!actorId||school!==id(req.school_id))return res.status(403).json({success:false,code:'SCHOOL_IDENTITY_REQUIRED'})
 let client,opened=false
 try {
  client=await pool.connect();await client.query('BEGIN READ ONLY');opened=true
  await applyTenantContext(client)
  const check=await client.query("SELECT id FROM users WHERE id=$1 AND school_id=$2 AND role IN ('admin','principal') AND is_active=true",[actorId,school])
  if(check.rowCount!==1){await client.query('ROLLBACK');opened=false;return res.status(403).json({success:false,code:'ACTIVE_SCHOOL_PRINCIPAL_REQUIRED'})}
  const {rows}=await client.query(`
   SELECT s.class AS class_name,s.section,COUNT(*)::int AS active_students,
   EXISTS(SELECT 1 FROM teacher_class_assignments a
     WHERE a.school_id=s.school_id AND a.is_active=true
     AND ${sqlCanonicalClass('a.class_name')}=${sqlCanonicalClass('s.class')}
     AND LOWER(BTRIM(a.section))=LOWER(BTRIM(s.section))
     AND BTRIM(COALESCE(a.subject,''))<>'') AS has_subject_assignment
   FROM students s WHERE s.school_id=$1 AND s.is_active=true
   GROUP BY s.school_id,s.class,s.section ORDER BY s.class,s.section
  `,[school])
  await client.query('COMMIT');opened=false
  return res.json({success:true,data:{
   cohorts:rows,totalActiveStudents:rows.reduce((n,c)=>n+c.active_students,0),
   uncoveredStudents:rows.filter(c=>!c.has_subject_assignment).reduce((n,c)=>n+c.active_students,0),
   changesApplied:false,academicApprovalsCreated:false
  }})
 }catch(e){
  if(opened)await client.query('ROLLBACK').catch(()=>{})
  console.error('Assessment coverage:',e.code||'QUERY_FAILED')
  return res.status(503).json({success:false,code:'COVERAGE_REPORT_UNAVAILABLE'})
 }finally{client?.release()}
})

// Historical First-Term offerings are REVIEW candidates, never proof of current academic approval.
router.get('/assessment-catalog/historical-subject-gaps',protect,requireRoles('admin','principal'),async(req,res)=>{
 const school=id(req.user?.school_id),uid=id(req.user?.id)
 const sourceExamId=id(req.query?.sourceExamId)
 if(!school||!uid||school!==id(req.school_id))return res.status(403).json({success:false,code:'AUTHENTIC_SCHOOL_ADMIN_REQUIRED'})
 if(!sourceExamId)return res.status(422).json({success:false,code:'EXACT_HISTORICAL_SOURCE_EXAM_REQUIRED'})
 let c,opened=false
 try {
  c=await pool.connect();await c.query('BEGIN READ ONLY');opened=true;await applyTenantContext(c)
  const actor=await c.query("SELECT id FROM users WHERE id=$1 AND school_id=$2 AND role IN ('admin','principal') AND is_active=true",[uid,school])
  if(actor.rowCount!==1){await c.query('ROLLBACK');opened=false;return res.status(403).json({success:false,code:'ACTIVE_SCHOOL_PRINCIPAL_REQUIRED'})}
  const exam=await c.query("SELECT id,name,type,session FROM exams WHERE id=$1 AND school_id=$2",[sourceExamId,school])
  if(exam.rowCount!==1){await c.query('ROLLBACK');opened=false;return res.status(404).json({success:false,code:'HISTORIC_EXAM_NOT_FOUND'})}
  const result=await c.query(`
    SELECT x.class_name,x.section,x.subject,
      (SELECT COUNT(*)::int FROM students s
       WHERE s.school_id=x.school_id AND s.is_active=true
         AND ${sqlCanonicalClass('s.class')}=${sqlCanonicalClass('x.class_name')}
         AND LOWER(BTRIM(s.section))=LOWER(BTRIM(x.section))) AS active_students,
      EXISTS(SELECT 1 FROM teacher_class_assignments a
       JOIN users u ON u.school_id=a.school_id AND u.id=a.teacher_user_id AND u.role='teacher' AND u.is_active=true
       JOIN employees p ON p.school_id=a.school_id AND p.user_id=u.id AND p.id=a.employee_id AND p.is_active=true
       WHERE a.school_id=x.school_id AND a.is_active=true
         AND ${sqlCanonicalClass('a.class_name')}=${sqlCanonicalClass('x.class_name')}
         AND LOWER(BTRIM(a.section))=LOWER(BTRIM(x.section))
         AND LOWER(BTRIM(a.subject))=LOWER(BTRIM(x.subject))) AS legitimate_assignment_exists,
      EXISTS(SELECT 1 FROM teacher_class_assignments ta
       JOIN users tu ON tu.school_id=ta.school_id AND tu.id=ta.teacher_user_id AND tu.is_active=true AND tu.role='teacher'
       JOIN employees ep ON ep.school_id=ta.school_id AND ep.id=ta.employee_id AND ep.user_id=tu.id AND ep.is_active=true
       WHERE ta.school_id=x.school_id AND ta.is_active=true
       AND ${sqlCanonicalClass('ta.class_name')}=${sqlCanonicalClass('x.class_name')}
       AND LOWER(BTRIM(ta.section))=LOWER(BTRIM(x.section))) AS current_cohort_staffed
    FROM exam_subjects x WHERE x.school_id=$1 AND x.exam_id=$2 AND x.is_active=true
    ORDER BY x.class_name,x.section,x.subject
  `,[school,sourceExamId])
  await c.query('COMMIT');opened=false
  const eligible=result.rows.filter(r=>Number(r.active_students)>0)
  const missing=eligible.filter(r=>r.legitimate_assignment_exists===false)
  res.set('Cache-Control','private, no-store')
  return res.json({success:true,data:{
   sourceExam:{id:sourceExamId,name:exam.rows[0].name,session:exam.rows[0].session},
   historicalActiveCohortOfferings:eligible.length,
   exactHistoricalSubjectLabelGaps:missing.length,
   unstaffedCohortSubjectRows:missing.filter(r=>r.current_cohort_staffed===false).length,
   staffedCohortLabelAlignmentRows:missing.filter(r=>r.current_cohort_staffed===true).length,
   gaps:missing.map(r=>({className:r.class_name,section:r.section,subject:r.subject,
      activeStudents:Number(r.active_students),cohortHasReviewedTeacher:r.current_cohort_staffed,
      classification:r.current_cohort_staffed?'HISTORIC_SUBJECT_LABEL_ALIGNMENT_REQUIRED':'REVIEWED_COHORT_TEACHER_SCOPE_MISSING'})),
   independentCurrentTermApproval:false,
   teacherIdentityInferred:false,
   stageStatus:'REVIEW_ONLY_NOT_APPROVED',productionAcademicWrites:0
  }})
 }catch(e){
  if(opened)await c.query('ROLLBACK').catch(()=>{})
  console.error('Historical subject gaps review:',e.code||'QUERY_FAILED')
  return res.status(503).json({success:false,code:'SUBJECT_GAP_REVIEW_UNAVAILABLE'})
 }finally{c?.release()}
})

// Principal-only review of original academic lesson evidence. Never certifies textbooks.
router.get('/lesson-source-review',protect,requireRoles('admin','principal'),async(req,res)=>{
 const school=id(req.user?.school_id),actorId=id(req.user?.id)
 if(!school||!actorId||school!==id(req.school_id))
  return res.status(403).json({success:false,code:'SCHOOL_SCOPE_REQUIRED'})
 let c,open=false
 try{
  c=await pool.connect()
  await c.query('BEGIN READ ONLY');open=true
  await applyTenantContext(c)
  const actor=await c.query("SELECT id FROM users WHERE id=$1 AND school_id=$2 AND is_active=true AND role IN('admin','principal')",[actorId,school])
  if(actor.rowCount!==1){
   await c.query('ROLLBACK');open=false
   return res.status(403).json({success:false,code:'ACTIVE_PRINCIPAL_REQUIRED'})
  }
  await c.query('COMMIT');open=false
  const result=reviewOriginalLessonSources(school)
  res.set('Cache-Control','private, no-store')
  if(result.error)return res.status(result.error==='ASSPS_SCHOOL_SCOPE_REQUIRED'?403:503).json({success:false,code:result.error})
  return res.json(result)
 }catch(error){
  if(open)await c.query('ROLLBACK').catch(()=>{})
  console.error('Original lesson evidence review:',error.code||'UNAVAILABLE')
  return res.status(503).json({success:false,code:'LESSON_EVIDENCE_REVIEW_UNAVAILABLE'})
 }finally{c?.release()}
})

// Authenticated Principal preflight: report technical signed-writer availability,
// never infer signed human academic consent or broaden database privileges.
router.get('/academic-writer-preflight',protect,requireRoles('admin','principal'),async(req,res)=>{
 const school=id(req.user?.school_id),actorId=id(req.user?.id)
 if(!school||!actorId||school!==id(req.school_id))return res.status(403).json({success:false,code:'SCHOOL_SCOPE_REQUIRED'})
 let c,open=false
 try{
  c=await pool.connect();await c.query('BEGIN READ ONLY');open=true
  await applyTenantContext(c)
  const actor=await c.query("SELECT id FROM users WHERE id=$1 AND school_id=$2 AND is_active=true AND role IN('admin','principal')",[actorId,school])
  if(actor.rowCount!==1){await c.query('ROLLBACK');open=false;return res.status(403).json({success:false,code:'ACTIVE_PRINCIPAL_REQUIRED'})}
  const status=await inspectSignedAcademicWriter(c)
  await c.query('COMMIT');open=false
  res.set('Cache-Control','private, no-store')
  return res.json({success:true,data:status})
 }catch(err){
  if(open)await c.query('ROLLBACK').catch(()=>{})
  console.error('Academic signed writer preflight:',err.code||'UNAVAILABLE')
  return res.status(503).json({success:false,code:'SIGNED_WRITER_PREFLIGHT_UNAVAILABLE'})
 }finally{c?.release()}
})


// Principal school-scoped read-only subject ledger (not the signed approval audit).
// Individual approval writes are governed by the separate signed Green service.
router.get('/assessment-catalog/:examId/offerings',protect,requireRoles('admin','principal'),async(req,res)=>{
 const school=id(req.user?.school_id),actorId=id(req.user?.id),examId=id(req.params.examId)
 if(!school||!actorId||!examId||school!==id(req.school_id))
  return res.status(403).json({success:false,code:'ACTIVE_SCHOOL_PRINCIPAL_REQUIRED'})
 let c,opened=false
 try{
  c=await pool.connect();await c.query('BEGIN READ ONLY');opened=true
  await applyTenantContext(c)
  const actor=await c.query("SELECT id FROM users WHERE id=$1 AND school_id=$2 AND role IN ('admin','principal') AND is_active=true",[actorId,school])
  if(actor.rowCount!==1){await c.query('ROLLBACK');opened=false;return res.status(403).json({success:false,code:'ACTIVE_SCHOOL_PRINCIPAL_REQUIRED'})}
  const exam=await c.query("SELECT id,name,type,total_marks,pass_marks FROM exams WHERE school_id=$1 AND id=$2",[school,examId])
  if(exam.rowCount!==1){await c.query('ROLLBACK');opened=false;return res.status(404).json({success:false,code:'SCHOOL_ASSESSMENT_NOT_FOUND'})}
  if(exam.rows[0].type!=='AS'){await c.query('ROLLBACK');opened=false;return res.status(409).json({success:false,code:'ASSESSMENT_TYPE_REQUIRED'})}
  const result=await c.query(`SELECT id,school_id,exam_id,class_name,section,subject,
    total_marks,pass_marks,approval_status,approval_revision,approved_at
    FROM exam_subjects WHERE school_id=$1 AND exam_id=$2 AND is_active=true
    ORDER BY class_name,section,sort_order,id LIMIT 501`,[school,examId])
  if(result.rows.length>500){await c.query('ROLLBACK');opened=false;return res.status(409).json({success:false,code:'ASSESSMENT_CATALOG_TOO_LARGE'})}
  await c.query('COMMIT');opened=false
  const offerings=result.rows.map(x=>({
    id:Number(x.id),className:x.class_name,section:x.section,subject:x.subject,
    totalMarks:Number(x.total_marks),passMarks:Number(x.pass_marks),
    approvalStatus:x.approval_status,revision:Number(x.approval_revision),
    approved:x.approval_status==='approved',approvedAt:x.approved_at||null
  }))
  res.set('Cache-Control','private, no-store')
  return res.json({success:true,data:{
    examId,examName:exam.rows[0].name,maximum:Number(exam.rows[0].total_marks),
    totalOfferings:offerings.length,pendingCount:offerings.filter(x=>!x.approved).length,
    reviewOnly:true,schoolScoped:true,
    requiresSignedPrincipalApproval:true,neverAutoApproves:true,
    offerings
  }})
 }catch(err){if(opened)await c.query('ROLLBACK').catch(()=>{});console.error('Assessment offering ledger:',err.code||'UNAVAILABLE');return res.status(503).json({success:false,code:'SUBJECT_OFFERINGS_UNAVAILABLE'})}
 finally{c?.release()}
})

router.get('/assessment-catalog/:examId/preview', protect, requireRoles('admin','principal'), async(req,res)=>{
  const school=id(req.user?.school_id), examId=id(req.params.examId)
  if(!school || school!==id(req.school_id) || !examId) return res.status(403).json({success:false,code:'AUTHENTIC_SCHOOL_ADMIN_REQUIRED'})
  let c,opened=false
  try{
    c=await pool.connect();await c.query('BEGIN READ ONLY');opened=true;await applyTenantContext(c)
    const actor=await c.query("SELECT id FROM users WHERE id=$1 AND school_id=$2 AND role IN('admin','principal') AND is_active=true",[id(req.user?.id),school])
    if(actor.rowCount!==1) {await c.query('ROLLBACK');opened=false;return res.status(403).json({success:false,code:'AUTHENTIC_SCHOOL_ADMIN_REQUIRED'})}
    const p=await proposedCatalog(c,school,examId)
    if(p.error){await c.query('ROLLBACK');opened=false;return res.status(p.status||409).json({success:false,code:p.error})}
    const existing=await c.query("SELECT approval_status,COUNT(*)::int AS n FROM exam_subjects WHERE school_id=$1 AND exam_id=$2 GROUP BY approval_status",[school,examId])
    await c.query('COMMIT');opened=false
    return res.json({success:true,data:{examId,assessment:p.exam.name,totalMarks:Number(p.exam.total_marks),passMarks:p.pass,verifiedCandidateCount:p.rows.length,activeCohorts:p.cohorts,totalActiveStudentCohorts:p.totalActiveCohorts,uncoveredCohorts:p.uncoveredCohorts,canStageFullCoverage:p.uncoveredCohorts.length===0,existing:existing.rows,candidates:p.rows,action:'SIGNED_PRINCIPAL_STAGE_REQUIRED',allCandidatesPendingUntilApproved:true}})
  }catch(e){if(opened)await c.query('ROLLBACK').catch(()=>{});console.error('Academic catalog preview:',e.code||'QUERY_FAILED');return res.status(503).json({success:false,code:'CATALOG_PREVIEW_UNAVAILABLE'})}
  finally{if(c)c.release()}
})

router.post('/assessment-catalog/:examId/stage',protect,(req,res)=>withApproval(req,res,async(c,actor)=>{
  const examId=id(req.params.examId)
  if(!examId)return {error:'INVALID_ASSESSMENT_ID',status:422}
  // One tenant-scoped lock ensures concurrent Principals cannot create duplicate catalogs.
  await c.query('SELECT pg_advisory_xact_lock($1::bigint)',[500000000+Number(actor.school)*100000+examId])
  const p=await proposedCatalog(c,actor.school,examId)
  if(p.error)return {error:p.error,status:p.status||409}
  // Fail closed before ANY INSERT or audit row if one active school cohort is absent.
  if(p.uncoveredCohorts.length)return {error:'ASSESSMENT_COHORT_COVERAGE_INCOMPLETE',status:409}
  const exists=await c.query("SELECT COUNT(*)::int AS n FROM exam_subjects WHERE school_id=$1 AND exam_id=$2",[actor.school,examId])
  if(Number(exists.rows[0].n)!==0)return {error:'ASSESSMENT_CATALOG_ALREADY_EXISTS',status:409}
  const cohortKeys=new Set()
  for(const r of p.rows){
    const k=[r.class_name,r.section].join('\u0000')
    if(!cohortKeys.has(k)){
      cohortKeys.add(k)
      await c.query(`INSERT INTO exam_class_enrollments(school_id,exam_id,class_name,section,is_active)
        VALUES($1,$2,$3,$4,true) ON CONFLICT (school_id,exam_id,class_name,section) DO NOTHING`,[actor.school,examId,r.class_name,r.section])
    }
  }
  let created=0
  for(let i=0;i<p.rows.length;i++){
    const r=p.rows[i]
    const insert=await c.query(`INSERT INTO exam_subjects
       (school_id,exam_id,class_name,section,subject,total_marks,pass_marks,sort_order,is_active,approval_status,approval_revision)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,'pending',1)
       ON CONFLICT (school_id,exam_id,class_name,section,subject) DO NOTHING RETURNING id`,
       [actor.school,examId,r.class_name,r.section,r.subject,Number(p.exam.total_marks),p.pass,i+1])
    if(insert.rowCount!==1)return {error:'CATALOG_CONCURRENT_CONFLICT',status:409}
    // Distinct stage audit action is enabled by the separate additive migration.
    await audit(c,actor,req,'assessment_catalog_stage',examId,insert.rows[0].id,null,1)
    created++
  }
  return {data:{examId,stagedSubjectOfferings:created,stagedCohorts:cohortKeys.size,approvalStatus:'pending',principalSubjectApprovalStillRequired:true}}
}))
router.proposedCatalogForTests=proposedCatalog
module.exports=router

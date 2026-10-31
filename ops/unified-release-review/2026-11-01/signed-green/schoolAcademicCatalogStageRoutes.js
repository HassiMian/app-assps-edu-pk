'use strict'
// Signed Principal-only assessment catalog stage. Creates PENDING subject offerings,
// never approves subjects; relies on green verified approval transaction and SHA evidence.
// A true signer with independently verified source is required for any mutation.
const {router,protect,id,withApproval,audit}=require('./schoolAcademicApprovalCore');
const sqlCanonicalClass=col=>`(CASE WHEN LOWER(BTRIM(${col}))='pre-nine' THEN 'pre nine' ELSE LOWER(BTRIM(${col})) END)`;

function canonical(text) { return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ') }

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
  return {exam,pass,rows:rows.rows,cohorts:new Set(rows.rows.map(r=>[r.class_name,r.section].map(canonical).join('\u0000'))).size}
}


router.post('/assessment-catalog/:examId/stage',protect,(req,res)=>withApproval(req,res,async(c,actor)=>{
  const examId=id(req.params.examId)
  if(!examId)return {error:'INVALID_ASSESSMENT_ID',status:422}
  // One tenant-scoped lock ensures concurrent Principals cannot create duplicate catalogs.
  await c.query('SELECT pg_advisory_xact_lock($1::bigint)',[500000000+Number(actor.school)*100000+examId])
  const p=await proposedCatalog(c,actor.school,examId)
  if(p.error)return {error:p.error,status:p.status||409}
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

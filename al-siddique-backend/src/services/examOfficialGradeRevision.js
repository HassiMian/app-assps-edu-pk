'use strict'
// Only for grade corrections where recorded numeric marks and total are IDENTICAL.
// No generic admin, legacy-only authorization, grade override or unsigned audit.
const {parseExactMarksNumber}=require('./examMarksInputValidation')
const {selectGradeBand}=require('./gradeBandAssignment')
class GradeRevisionError extends Error {
 constructor(code,status=422){super(code);this.code=code;this.status=status}
}
const positive=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null
function parseGradeRevisionRequest(body){
 const score=parseExactMarksNumber(body?.expected_marks)
 const max=parseExactMarksNumber(body?.expected_total_marks)
 const original=String(body?.expected_grade??'')
 const reason=String(body?.reason||'').trim()
 if(!Number.isFinite(score)||!Number.isSafeInteger(max)||max<1||max>1000||
    score<0||score>max||Math.abs(Math.round(score*100)-score*100)>1e-8)
  throw new GradeRevisionError('INVALID_GRADE_REVISION_EXPECTED_SCORE')
 if(!original||original.length>12)throw new GradeRevisionError('EXPECTED_GRADE_REQUIRED')
 if(reason.length<12||reason.length>500)throw new GradeRevisionError('GRADE_REVISION_REASON_REQUIRED')
 return {score,max,original,reason}
}
async function reviseExamGradeOnly({pool,applyTenantContext,actor,schoolId,resultId,body}={}){
 const role=String(actor?.role||'').toLowerCase()
 if(!['principal','owner'].includes(role) || actor?.account_type==='service')
  throw new GradeRevisionError('PRINCIPAL_OWNER_ONLY_GRADE_REVISION',403)
 const school=positive(schoolId), id=positive(resultId), userId=positive(actor?.id)
 if(!school||!id||!userId||positive(actor?.school_id)!==school)
  throw new GradeRevisionError('SIGNED_SCHOOL_ACTOR_REQUIRED',403)
 const expected=parseGradeRevisionRequest(body)
 const client=await pool.connect()
 try {
  await client.query('BEGIN ISOLATION LEVEL READ COMMITTED')
  await applyTenantContext(client)
  const user=await client.query(
   'SELECT id FROM users WHERE id=$1 AND school_id=$2 AND role=$3 AND is_active=true',
   [userId,school,role])
  if(user.rowCount!==1)throw new GradeRevisionError('OWNER_PRINCIPAL_MEMBERSHIP_REVOKED',403)
  const found=await client.query(
   `SELECT er.id,er.school_id,er.exam_id,er.student_id,er.subject,
           er.marks_obtained,er.total_marks,er.grade,er.result_status,
           to_regclass('public.exam_grade_revision_history') AS audit_schema
      FROM exam_results er
      JOIN exams e ON e.id=er.exam_id AND e.school_id=$2
      JOIN students s ON s.id=er.student_id AND s.school_id=$2
     WHERE er.id=$1 AND er.school_id=$2 FOR UPDATE OF er`,
   [id,school])
  if(found.rowCount!==1)throw new GradeRevisionError('SCHOOL_GRADE_RECORD_NOT_FOUND',404)
  const old=found.rows[0]
  if(!old.audit_schema)throw new GradeRevisionError('GRADE_REVISION_AUDIT_LEDGER_UNAVAILABLE',503)
  if(old.result_status!=='SCORED')
   throw new GradeRevisionError('GRADE_ONLY_REQUIRES_SCORED_RECORD',409)
  if(old.marks_obtained===null||
     Number(old.marks_obtained)!==expected.score||
     Number(old.total_marks)!==expected.max)
   throw new GradeRevisionError('GRADE_REVISION_STALE_OR_AMBIGUOUS',409)
  // Historical Exam 9 has a database immutability trigger. Never disable it.
  const latest=await client.query(
   `SELECT id,new_grade FROM exam_grade_revision_history
       WHERE school_id=$1 AND exam_result_id=$2
       ORDER BY id DESC LIMIT 1`,[school,id])
  const beforeGrade=latest.rowCount===1
    ?String(latest.rows[0].new_grade):String(old.grade??'')
  if(beforeGrade!==expected.original)
   throw new GradeRevisionError('GRADE_REVISION_STALE_OR_AMBIGUOUS',409)
  // A result may use only one correction ledger until a signed joint
  // reconciliation workflow is certified. Prevent stale grade overlays
  // from overriding a newer score revision.
  const scoreLedger=await client.query(
   "SELECT to_regclass('public.exam_marks_revision_history') AS rel")
  if(scoreLedger.rows[0]?.rel){
   const other=await client.query(
    'SELECT id FROM exam_marks_revision_history WHERE school_id=$1 AND exam_result_id=$2 LIMIT 1',
    [school,id])
   if(other.rowCount)throw new GradeRevisionError('CROSS_LEDGER_SCORE_CORRECTION_REQUIRES_ADJUDICATION',409)
  }
  const policy=await client.query(
   'SELECT label,min_percentage,max_percentage FROM grade_settings WHERE school_id=$1 ORDER BY sort_order',
   [school])
  if(!policy.rows.length)throw new GradeRevisionError('APPROVED_GRADE_BANDS_REQUIRED',409)
  const selected=selectGradeBand(expected.score/expected.max*100,
   policy.rows.map(b=>({label:String(b.label),from:Number(b.min_percentage),to:Number(b.max_percentage)})))
  if(!selected)throw new GradeRevisionError('GRADE_BANDS_INVALID_OR_AMBIGUOUS',409)
  const grade=selected.label
  if(grade===expected.original)throw new GradeRevisionError('GRADE_REVISION_NO_CHANGE',409)
  // Append-only signed overlay; never UPDATE protected original grade.
  const logged=await client.query(
   `INSERT INTO exam_grade_revision_history
      (school_id,exam_result_id,exam_id,student_id,subject,marks_obtained,total_marks,
       old_grade,new_grade,actor_user_id,reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id,created_at`,
   [school,id,old.exam_id,old.student_id,old.subject,expected.score,expected.max,
    beforeGrade,grade,userId,expected.reason])
  if(logged.rowCount!==1)throw new GradeRevisionError('GRADE_AUDIT_INSERT_FAILED',503)
  await client.query('COMMIT')
  return {result_id:id,exam_id:old.exam_id,student_id:old.student_id,
   subject:old.subject,marks_obtained:expected.score,total_marks:expected.max,
   recorded_grade:String(old.grade??''),effective_grade:grade,grade,
   revision_id:logged.rows[0].id,audited_at:logged.rows[0].created_at}
 }catch(e){
  try{await client.query('ROLLBACK')}catch(_){}
  throw e
 }finally{client.release()}
}
module.exports={GradeRevisionError,parseGradeRevisionRequest,reviseExamGradeOnly}

'use strict'
const {parseExactMarksNumber}=require('./examMarksInputValidation')
const {selectGradeBand}=require('./gradeBandAssignment')
class RevisionError extends Error {
 constructor(code,status=422){super(code);this.code=code;this.status=status}
}
function parseRequest(body){
 const old=parseExactMarksNumber(body?.expected_marks)
 const proposed=parseExactMarksNumber(body?.proposed_marks)
 const total=parseExactMarksNumber(body?.expected_total_marks)
 const oldGrade=String(body?.expected_grade??'')
 const reason=String(body?.reason||'').trim()
 if(!Number.isFinite(old)||!Number.isFinite(proposed)||!Number.isInteger(total)||total<1||total>1000)
  throw new RevisionError('INVALID_MARKS_REVISION_INPUT')
 if(old<0||old>total||proposed<0||proposed>total)
  throw new RevisionError('MARKS_REVISION_OUT_OF_RANGE')
 if(Math.abs(Math.round(proposed*100)-proposed*100)>1e-8 || Math.abs(Math.round(old*100)-old*100)>1e-8)
  throw new RevisionError('MARKS_REVISION_EXCESSIVE_PRECISION')
 if(proposed===old)throw new RevisionError('MARKS_REVISION_NO_CHANGE')
 if(reason.length<12||reason.length>500)throw new RevisionError('REVISION_REASON_REQUIRED')
 return {old,proposed,total,oldGrade,reason}
}
function deriveGrade(marks,total,bands){
 if(!Array.isArray(bands)||!bands.length)throw new RevisionError('SCHOOL_GRADE_SETUP_REQUIRED',409)
 const policy=bands.map(b=>({label:String(b.label),from:Number(b.min_percentage),to:Number(b.max_percentage)}))
 const selected=selectGradeBand(marks/total*100,policy)
 if(!selected)throw new RevisionError('INVALID_GRADE_SETUP',409)
 return selected.label
}
async function reviseExamScore({pool,applyTenantContext,actor,schoolId,resultId,body}){
 if(!actor || actor.account_type==='service' || !['principal','owner'].includes(String(actor.role||'').toLowerCase()))
  throw new RevisionError('PRINCIPAL_REVISION_AUTHORIZATION_REQUIRED',403)
 const actorId=Number(actor.id)
 if(!Number.isSafeInteger(actorId)||actorId<=0||!Number.isSafeInteger(schoolId)||schoolId<=0)
  throw new RevisionError('SIGNED_SCHOOL_ACTOR_REQUIRED',403)
 const id=Number(resultId)
 if(!Number.isSafeInteger(id)||id<=0)throw new RevisionError('INVALID_RESULT_ID',400)
 const requested=parseRequest(body)
 const client=await pool.connect()
 try{
  await client.query('BEGIN ISOLATION LEVEL READ COMMITTED')
  await applyTenantContext(client)
  // Never accept a stale authenticated claim as continuing school authority.
  // An owner/principal whose verified school membership was revoked cannot revise.
  const currentActor=await client.query(
    'SELECT id FROM users WHERE id=$1 AND school_id=$2 AND role=$3 AND is_active=true',
    [actorId,schoolId,String(actor.role).toLowerCase()])
  if(currentActor.rowCount!==1)
    throw new RevisionError('PRINCIPAL_SCHOOL_MEMBERSHIP_NO_LONGER_ACTIVE',403)
  const lookup=await client.query(
   `SELECT er.id,er.school_id,er.exam_id,er.student_id,er.subject,er.marks_obtained,
           er.total_marks,er.grade,er.remarks,er.result_status,
           to_regclass('public.exam_marks_revision_history') AS revision_schema
      FROM exam_results er
      JOIN exams e ON e.id=er.exam_id AND e.school_id=$2
      JOIN students s ON s.id=er.student_id AND s.school_id=$2
     WHERE er.id=$1 AND er.school_id=$2
     FOR UPDATE OF er`,
   [id,schoolId])
  if(lookup.rowCount!==1)throw new RevisionError('SAVED_MARK_NOT_FOUND_FOR_SCHOOL',404)
  const before=lookup.rows[0]
  if(!before.revision_schema)throw new RevisionError('REVISION_LEDGER_NOT_CERTIFIED',503)
  if(before.result_status && before.result_status!=='SCORED')throw new RevisionError('ONLY_NUMERIC_SCORES_CAN_BE_REVISED',409)
  // Locked First Term results must NEVER be updated or trigger-disabled.
  // Use strictly append-only mark history, read the latest under the base
  // row lock and compare with the authenticated reviewer's expected state.
  const next=await client.query(
   `SELECT new_marks,new_grade FROM exam_marks_revision_history
      WHERE school_id=$1 AND exam_result_id=$2
      ORDER BY id DESC LIMIT 1`,[schoolId,id])
  const liveMarks=next.rowCount===1?Number(next.rows[0].new_marks):
   (before.marks_obtained===null?null:Number(before.marks_obtained))
  const liveGrade=next.rowCount===1?String(next.rows[0].new_grade):String(before.grade??'')
  if(liveMarks===null)throw new RevisionError('NON_SCORED_MARKS_REVISION_REQUIRES_SEPARATE_STATUS_WORKFLOW',409)
  if(liveMarks!==requested.old||Number(before.total_marks)!==requested.total||
     liveGrade!==requested.oldGrade)
    throw new RevisionError('MARKS_CHANGED_SINCE_REVIEW_RELOAD_REQUIRED',409)
  const gradeLedger=await client.query(
   "SELECT to_regclass('public.exam_grade_revision_history') AS rel")
  if(gradeLedger.rows[0]?.rel){
   const other=await client.query(
    'SELECT id FROM exam_grade_revision_history WHERE school_id=$1 AND exam_result_id=$2 LIMIT 1',
    [schoolId,id])
   if(other.rowCount)
    throw new RevisionError('CROSS_LEDGER_GRADE_CORRECTION_REQUIRES_ADJUDICATION',409)
  }
  const policy=await client.query(
   'SELECT label,min_percentage,max_percentage FROM grade_settings WHERE school_id=$1 ORDER BY sort_order',
   [schoolId])
  const grade=deriveGrade(requested.proposed,requested.total,policy.rows)
  // No UPDATE to exam_results. Original saved score and grade are immutable.
  const audit=await client.query(
   `INSERT INTO exam_marks_revision_history
      (school_id,exam_result_id,exam_id,student_id,subject,
       old_marks,new_marks,total_marks,old_grade,new_grade,
       actor_user_id,reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id,created_at`,
   [schoolId,id,before.exam_id,before.student_id,before.subject,
    liveMarks,requested.proposed,requested.total,liveGrade,grade,actorId,requested.reason])
  if(audit.rowCount!==1)throw new RevisionError('REVISION_AUDIT_WRITE_FAILED',503)
  await client.query('COMMIT')
  return {result_id:id,exam_id:before.exam_id,student_id:before.student_id,
    subject:before.subject,marks_obtained:requested.proposed,total_marks:requested.total,
    recorded_marks:before.marks_obtained,recorded_grade:before.grade,
    effective_marks:requested.proposed,effective_grade:grade,
    grade,revision_id:audit.rows[0].id,audited_at:audit.rows[0].created_at}
 }catch(e){
  try{await client.query('ROLLBACK')}catch(_){}
  throw e
 }finally{client.release()}
}
module.exports={RevisionError,parseRequest,deriveGrade,reviseExamScore}

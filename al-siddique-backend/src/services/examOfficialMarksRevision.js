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
 if(!actor || !['principal','admin'].includes(String(actor.role||'').toLowerCase()))
  throw new RevisionError('PRINCIPAL_REVISION_AUTHORIZATION_REQUIRED',403)
 const actorId=Number(actor.id)
 if(!Number.isSafeInteger(actorId)||actorId<=0||!Number.isSafeInteger(schoolId)||schoolId<=0)
  throw new RevisionError('SIGNED_SCHOOL_ACTOR_REQUIRED',403)
 const id=Number(resultId)
 if(!Number.isSafeInteger(id)||id<=0)throw new RevisionError('INVALID_RESULT_ID',400)
 const requested=parseRequest(body)
 const client=await pool.connect()
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ')
  await applyTenantContext(client)
  // Never accept a stale authenticated claim as continuing school authority.
  // A principal who has left, been disabled, or changed role cannot revise.
  const currentActor=await client.query(
    'SELECT id FROM users WHERE id=$1 AND school_id=$2 AND role IN ($3,$4) AND is_active=true',
    [actorId,schoolId,'principal','admin'])
  if(currentActor.rowCount!==1)
    throw new RevisionError('PRINCIPAL_SCHOOL_MEMBERSHIP_NO_LONGER_ACTIVE',403)
  const lookup=await client.query(
   `SELECT er.id,er.school_id,er.exam_id,er.student_id,er.subject,er.marks_obtained,
           er.total_marks,er.grade,er.remarks,
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
  const actual=before.marks_obtained===null?null:Number(before.marks_obtained)
  if(actual===null)throw new RevisionError('NON_SCORED_MARKS_REVISION_REQUIRES_SEPARATE_STATUS_WORKFLOW',409)
  if(actual!==requested.old||Number(before.total_marks)!==requested.total||
     String(before.grade??'')!==requested.oldGrade)
    throw new RevisionError('MARKS_CHANGED_SINCE_REVIEW_RELOAD_REQUIRED',409)
  const policy=await client.query(
   'SELECT label,min_percentage,max_percentage FROM grade_settings WHERE school_id=$1 ORDER BY sort_order',
   [schoolId])
  const grade=deriveGrade(requested.proposed,requested.total,policy.rows)
  const updated=await client.query(
   `UPDATE exam_results
       SET marks_obtained=$1,grade=$2
     WHERE id=$3 AND school_id=$4 AND marks_obtained=$5 AND total_marks=$6
       AND COALESCE(grade,'')=$7
     RETURNING id,marks_obtained,total_marks,grade`,
   [requested.proposed,grade,id,schoolId,requested.old,requested.total,requested.oldGrade])
  if(updated.rowCount!==1)throw new RevisionError('MARKS_REVISION_CONFLICT',409)
  const audit=await client.query(
   `INSERT INTO exam_marks_revision_history
      (school_id,exam_result_id,exam_id,student_id,subject,
       old_marks,new_marks,total_marks,old_grade,new_grade,
       actor_user_id,reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id,created_at`,
   [schoolId,id,before.exam_id,before.student_id,before.subject,
    requested.old,requested.proposed,requested.total,requested.oldGrade,grade,actorId,requested.reason])
  if(audit.rowCount!==1)throw new RevisionError('REVISION_AUDIT_WRITE_FAILED',503)
  await client.query('COMMIT')
  return {result_id:id,exam_id:before.exam_id,student_id:before.student_id,
    subject:before.subject,marks_obtained:requested.proposed,total_marks:requested.total,
    grade,revision_id:audit.rows[0].id,audited_at:audit.rows[0].created_at}
 }catch(e){
  try{await client.query('ROLLBACK')}catch(_){}
  throw e
 }finally{client.release()}
}
module.exports={RevisionError,parseRequest,deriveGrade,reviseExamScore}

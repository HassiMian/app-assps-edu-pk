'use strict'
const {router,protect,id,withApproval,audit}=require('./schoolAcademicApprovalCore')
router.post('/exam-subjects/:id/approve',protect,(req,res)=>withApproval(req,res,async(c,actor)=>{
 const key=id(req.params.id),total=id(req.body?.totalMarks),passing=Number(req.body?.passMarks),revision=id(req.body?.expectedRevision)
 if(!key||!total||total>1000||!Number.isSafeInteger(passing)||passing<0||passing>total||!revision)
  return {error:'INVALID_EXACT_SUBJECT_MAXIMUM',status:422}
 const {rows}=await c.query("SELECT x.id,x.school_id,x.exam_id,x.class_name,x.section,x.subject,x.approval_revision FROM exam_subjects x JOIN exams e ON e.id=x.exam_id AND e.school_id=x.school_id WHERE x.id=$1 AND x.school_id=$2 AND x.is_active=true FOR UPDATE OF x",[key,actor.school])
 if(rows.length!==1)return {error:'SUBJECT_NOT_FOUND_IN_SCHOOL',status:404}
 const item=rows[0];if(Number(item.approval_revision)!==revision)return {error:'SUBJECT_APPROVAL_REVISION_CONFLICT'}
 const existing=await c.query(`SELECT COUNT(*)::int AS n FROM exam_results r JOIN students s ON s.id=r.student_id AND s.school_id=r.school_id
 WHERE r.school_id=$1 AND r.exam_id=$2 AND LOWER(BTRIM(r.subject))=LOWER(BTRIM($3))
 AND LOWER(BTRIM(s.class))=LOWER(BTRIM($4)) AND LOWER(BTRIM(s.section))=LOWER(BTRIM($5))
 AND (r.total_marks IS DISTINCT FROM $6 OR r.marks_obtained>$6)`,[actor.school,item.exam_id,item.subject,item.class_name,item.section,total])
 if(Number(existing.rows[0].n)!==0)return {error:'HISTORIC_RESULT_MAXIMUM_CONFLICT'}
 const next=revision+1
 await c.query("UPDATE exam_subjects SET total_marks=$1,pass_marks=$2,approval_status='approved',approval_revision=$3,approved_by_user_id=$4,approved_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$5 AND school_id=$6",[total,passing,next,actor.uid,item.id,actor.school])
 await audit(c,actor,req,'exam_subject_maximum',item.exam_id,item.id,revision,next)
 return {data:{subjectId:item.id,examId:item.exam_id,revision:next,totalMarks:total,passMarks:passing}}
}))
module.exports=router

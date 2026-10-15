'use strict'
// Independent response-side scope enforcement. The SQL and RLS gates are still
// mandatory; this is an additional denial boundary for a wrongly returned,
// otherwise authentically signed publication from a peer school or revision.
function rowBelongsToRequest(r,actor,request){
 if(!r||typeof r!=='object'||Array.isArray(r)||!actor||!request||
    !Number.isSafeInteger(actor.school)||actor.school<1||
    ![9,10].includes(request.grade)||
    Number(r.school_id)!==actor.school||Number(r.grade)!==request.grade||
    typeof request.subject!=='string'||!request.subject.trim()||
    typeof r.subject!=='string'||
    r.subject.trim().toLowerCase()!==request.subject.trim().toLowerCase())return false
 if(request.exact!==true)return request.exact===false
 return typeof request.originalQuestionId==='string'&&
   request.originalQuestionId.length>0&&
   r.original_question_id===request.originalQuestionId&&
   Number.isSafeInteger(request.revision)&&request.revision>0&&
   Number(r.question_revision)===request.revision&&
   typeof request.questionSha==='string'&&
   /^[a-f0-9]{64}$/.test(request.questionSha)&&
   r.question_sha===request.questionSha
}
module.exports={rowBelongsToRequest}

'use strict'
const express=require('express'),router=express.Router()
const {protect,requireRoles}=require('../middleware/auth')
const {query}=require('../config/database')
const {eligible}=require('../services/grade910VerifiedPublicationContract')
const {requireSignedSchool}=require('../services/grade910SignedSchoolGate')
const {rowBelongsToRequest}=require('../services/grade910PickerResponseScope')
const HASH=/^[0-9a-f]{64}$/
function session(req){
 const id=Number(req.user?.id),school=Number(req.user?.school_id)
 const role=String(req.user?.role||'')
 if(![id,school].every(x=>Number.isSafeInteger(x)&&x>0)||
   (!['teacher','principal','admin','school_admin'].includes(role))||
   (req.school_id!=null&&Number(req.school_id)!==school))return null
 return {id,school,role}
}
router.use(protect,requireRoles('teacher','principal','admin','school_admin'))
async function picker(req,res,exact=false){
 const actor=session(req)
 if(!actor)return res.status(403).json({success:false,code:'SCHOOL_IDENTITY_REQUIRED'})
 if(!process.env.DB_RUNTIME_ROLE)return res.status(503).json({success:false,code:'SIGNED_CORE_RUNTIME_NOT_CONFIGURED'})
 try{await requireSignedSchool(actor.school,query)}catch(e){return res.status(e.status||503).json({success:false,code:e.code||'SIGNED_CORE_SCHOOL_UNAVAILABLE'})}
 const grade=Number(req.query.grade)
 const subject=String(req.query.subject||'').trim()
 const section=String(req.query.section||'').trim()
 if(![9,10].includes(grade)||subject.length<1||subject.length>120||
  (actor.role==='teacher'&&(!section||section.length>50)))
   return res.status(422).json({success:false,code:'GRADE_SUBJECT_SECTION_SCOPE_REQUIRED'})
 const limit=exact?100:Math.min(Math.max(Number(req.query.limit)||40,1),100)
 const requested=exact?String(req.query.originalQuestionId||''):null
 const revision=exact?Number(req.query.revision):null
 const sha=exact?String(req.query.questionSha||''):null
 if(exact&&(!requested||requested.length>180||!Number.isSafeInteger(revision)||revision<1||!HASH.test(sha)))
   return res.status(422).json({success:false,code:'EXACT_IMMUTABLE_REVISION_REQUIRED'})
 const scopeSql=actor.role==='teacher'?`
 AND EXISTS (SELECT 1 FROM teacher_class_assignments t
   WHERE t.school_id=p.school_id AND t.teacher_user_id=$4 AND t.is_active=true
     AND lower(t.subject)=lower(p.subject)
     AND lower(coalesce(t.section,''))=lower($5)
     AND lower(t.class_name)=ANY(CASE p.grade
       WHEN 9 THEN ARRAY['9','9th','nine','ix']
       WHEN 10 THEN ARRAY['10','10th','ten','x'] END))`:''
 const params=[actor.school,grade,subject]
 if(actor.role==='teacher')params.push(actor.id,section)
 let bind=params.length
 const clauses=[]
 if(exact){
  clauses.push('p.original_question_id=$'+(++bind));params.push(requested)
  clauses.push('p.question_revision=$'+(++bind));params.push(revision)
  clauses.push('p.question_sha=$'+(++bind));params.push(sha)
 }
 const filter=clauses.map(s=>'AND '+s).join(' ')
 params.push(limit)
 const sql=`SELECT p.* FROM grade910_verified_paper_publications p
 WHERE p.school_id=$1 AND p.grade=$2 AND lower(p.subject)=lower($3)
 AND p.revoked_at IS NULL AND p.academic_approval_verified=true
 AND p.paper_studio_acceptance_verified=true AND p.core_restricted_release_verified=true
 ${scopeSql} ${filter}
 ORDER BY p.original_question_id ASC,p.question_revision DESC LIMIT $${bind+1}`
 try {
  const db=await query(sql,params)
  const request={grade,subject,exact,originalQuestionId:requested,
      revision,questionSha:sha}
  const safe=(db.rows||[]).filter(r=>
    rowBelongsToRequest(r,actor,request)&&eligible(r)).map(r=>({
   originalQuestionId:r.original_question_id,revision:Number(r.question_revision),
   questionSha:r.question_sha,answerSha:r.answer_sha,
   grade:Number(r.grade),subject:r.subject,medium:r.medium,
   sourceCatalogId:r.catalog_id,sourcePdfSha:r.original_source_pdf_sha,
   publicationGrantSha:r.publication_grant_sha,
   verifiedReviewPacketSha:r.verified_review_packet_sha,
   paperPayload:r.paper_payload,
   academicallyVerified:true,paperStudioSelectable:true
  }))
  res.set('Cache-Control','no-store')
  return res.json({success:true,source:'server-signed-restricted-verified-publications',
    academicallyApprovedOnly:true,schoolScoped:true,records:safe,verifiedCount:safe.length})
 }catch(e){
  console.error('Verified Grade IX-X selector inaccessible:',e.code||e.message)
  return res.status(503).json({success:false,code:'VERIFIED_PUBLISHER_NOT_CERTIFIED',records:[]})
 }
}
router.get('/approved-only',(req,res)=>picker(req,res,false))
router.get('/resolve-revision',(req,res)=>picker(req,res,true))
module.exports=router
module.exports.eligible=eligible
module.exports.session=session
module.exports.rowBelongsToRequest=rowBelongsToRequest

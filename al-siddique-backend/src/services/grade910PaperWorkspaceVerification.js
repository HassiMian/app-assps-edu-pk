'use strict'
const {eligible}=require('./grade910VerifiedPublicationContract')
const HASH=/^[a-f0-9]{64}$/
const fail=(code,status=409)=>{const e=new Error(code);e.code=code;e.status=status;throw e}
function verifiedBody(question){
 if(!question||typeof question!=='object'||Array.isArray(question))fail('VERIFIED_QUESTION_CONTENT_INVALID')
 const text=String(question.text||question.stem||'').trim()
 if(!text)fail('VERIFIED_QUESTION_EMPTY')
 const options=Array.isArray(question.options)?question.options:[]
 if(options.length>8)fail('VERIFIED_OPTION_COUNT_INVALID')
 const lines=options.map((o,i)=>{
  const label=String(o.label||o.key||String.fromCharCode(65+i)).trim()
  const t=String(o.text||'').trim()
  if(!label||!t)fail('VERIFIED_OPTION_INCOMPLETE')
  return label+'. '+t
 })
 return [text,...lines].join('\n')
}
function shape(doc){
 const data=doc?.grade910Verified
 if(data==null)return null
 if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.refs)||!data.refs.length||data.refs.length>100||
   ![9,10].includes(Number(data.grade))||!String(data.subject||'').trim()||
   typeof data.section!=='string'||data.section.length>50)fail('VERIFIED_DOCUMENT_SCOPE_INVALID',422)
 if(!Array.isArray(doc.sections))fail('VERIFIED_DOCUMENT_SECTIONS_MISSING',422)
 const ids=data.refs.map(r=>r?.sectionId)
 if(new Set(ids).size!==ids.length)fail('VERIFIED_SECTION_ID_DUPLICATE',422)
 return data
}
async function verifyDocument({document,schoolId,actorId,actorRole,client}){
 const data=shape(document)
 if(!data)return{verifiedCount:0,verifiedRefs:[],releaseAuthority:false}
 if(!Number.isSafeInteger(Number(schoolId))||Number(schoolId)<1||
   !Number.isSafeInteger(Number(actorId))||Number(actorId)<1||
   !['teacher','principal'].includes(actorRole))fail('VERIFIED_STAFF_CONTEXT_REQUIRED',403)
 const grade=Number(data.grade),subject=String(data.subject).trim()
 const matchMetadata=String(document.metadata?.subjectName||document.metadata?.subject||'').trim().toLowerCase()===subject.toLowerCase()
 const classVal=String(document.metadata?.classLevel||document.metadata?.className||'').toLowerCase()
 const classAllowed=grade===9?['9','9th','9th class','ix','class 9','grade 9']:['10','10th','10th class','x','class 10','grade 10']
 if(!matchMetadata||!classAllowed.includes(classVal))fail('VERIFIED_PAPER_METADATA_SCOPE_MISMATCH')
 if(actorRole==='teacher'){
  const a=await client.query(`SELECT 1 FROM teacher_class_assignments
   WHERE school_id=$1 AND teacher_user_id=$2 AND is_active=true
    AND lower(subject)=lower($3) AND lower(coalesce(section,''))=lower($4)
    AND lower(class_name)=ANY($5::text[]) LIMIT 1`,
    [schoolId,actorId,subject,data.section,grade===9?['9','9th','nine','ix']:['10','10th','ten','x']])
  if(a.rows.length!==1)fail('VERIFIED_FACULTY_SCOPE_MISSING',403)
 }
 const verified=[]
 for(const ref of data.refs){
  if(!ref||typeof ref!=='object'||typeof ref.sectionId!=='string'||!ref.sectionId||
    typeof ref.originalQuestionId!=='string'||!ref.originalQuestionId||
    !Number.isInteger(ref.revision)||ref.revision<1||
    ![ref.questionSha,ref.answerSha,ref.publicationGrantSha].every(h=>HASH.test(String(h||''))))
   fail('VERIFIED_REF_TAMPERED')
  const section=document.sections.find(s=>s.id==='manual-section-'+ref.sectionId)
  if(!section||!Array.isArray(section.nodes)||section.nodes.length!==1)fail('VERIFIED_SECTION_REMOVED_OR_REPLACED')
  const result=await client.query(`
   SELECT * FROM grade910_verified_paper_publications WHERE school_id=$1 AND grade=$2
   AND lower(subject)=lower($3) AND original_question_id=$4 AND question_revision=$5
   AND question_sha=$6 AND answer_sha=$7 AND publication_grant_sha=$8
   AND revoked_at IS NULL AND academic_approval_verified=true
   AND paper_studio_acceptance_verified=true AND core_restricted_release_verified=true
   LIMIT 1`,
   [schoolId,grade,subject,ref.originalQuestionId,ref.revision,ref.questionSha,ref.answerSha,ref.publicationGrantSha])
  const r=result.rows[0]
  if(!eligible(r)||Number(r.school_id)!==Number(schoolId)||
   Number(r.grade)!==grade||String(r.subject||'').toLowerCase()!==subject.toLowerCase()||
   r.original_question_id!==ref.originalQuestionId||Number(r.question_revision)!==ref.revision||
   r.question_sha!==ref.questionSha||r.answer_sha!==ref.answerSha||
   r.publication_grant_sha!==ref.publicationGrantSha)
   fail('VERIFIED_REVISION_NO_LONGER_PUBLISHED')
  const rendered=verifiedBody(r.paper_payload.finalQuestion)
  const node=section.nodes[0]
  const text=String(node.content||node.stemText||'').trim()
  if(text!==rendered)fail('VERIFIED_QUESTION_EDIT_INVALIDATES_APPROVAL')
  const marks=Number(r.paper_payload.finalQuestion.marks)
  if(Number.isFinite(marks)&&marks>0&&Number(node.authoritativeNodeMarks??node.operationalNodeMarks)!==marks)
   fail('VERIFIED_QUESTION_MARKS_CHANGED')
  verified.push({id:ref.originalQuestionId,revision:ref.revision,questionSha:ref.questionSha})
 }
 return {verifiedCount:verified.length,verifiedRefs:verified,releaseAuthority:false}
}
module.exports={verifiedBody,shape,verifyDocument}

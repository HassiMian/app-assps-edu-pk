#!/usr/bin/env node
'use strict'
// A handwritten image is an UNTRUSTED human claim, not a school authenticated signature.
// This verifier NEVER changes question approval/published status.
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path')
const sources=require('../../al-siddique-frontend/src/Modules/Paper-Generator/data/grade910AdoptionCatalogIndex.json')
const SHA=/^[0-9a-f]{64}$/
const CHECKS=['Curriculum and session','Actual book edition and exercise page','Question correctness',
'Answer and MCQ key','Marks and difficulty','English/Urdu correctness','Duplicates','Original source provenance']
const actions={teacher:['subject_review','urdu_review'],principal:['book_adoption','principal_approval']}
const fail=code=>{throw Error('GRADE910_UNTRUSTED_SIGNOFF_'+code)}
const digest=data=>crypto.createHash('sha256').update(data).digest('hex')
const isSha=x=>typeof x==='string'&&SHA.test(x)
function inspect(row){
 if(!row||typeof row!=='object'||Array.isArray(row)||
  Object.keys(row).some(x=>!['schemaVersion','schoolCode','academicSession','intendedBoardExamYear',
   'actorClaim','personallySignedAt','action','sourceCatalogRecordId','sourcePdfSha256',
   'originalQuestionRevisionSetSha256','sourceGradeUnassigned','subject','grade','medium',
   'bookDecision','printedEdition','originalQuestionId','finalQuestionRevisionSha256',
   'finalAnswerRevisionSha256','independentTeacherReceiptSha256','supportingEvidenceSha256',
   'completedReviewChecks','handwriting','signerDeclaration','verificationStatus',
   'academicallyApproved','paperStudioSelectable','published'].includes(x)))
  fail('UNRECOGNIZED_OR_PRIVILEGED_FIELD')
 if(row.schemaVersion!=='assps-grade910-human-claim-with-signature-v1'||
    row.schoolCode!=='ASSPS'||row.academicSession!=='2026-27'||row.intendedBoardExamYear!==2027||
    row.academicallyApproved!==false||row.paperStudioSelectable!==false||row.published!==false||
    row.verificationStatus!=='UNTRUSTED_CLAIM_PENDING_SCHOOL_AUTHENTICATION')
  fail('FORGED_APPROVAL_OR_SESSION')
 const actor=row.actorClaim
 if(!actor||!['teacher','principal'].includes(actor.role)||
    !/^[a-zA-Z0-9:_-]{1,80}$/.test(String(actor.userId||''))||
    !actions[actor.role].includes(row.action)||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.personallySignedAt||'')||
    !Number.isFinite(Date.parse(row.personallySignedAt))||
    Date.parse(row.personallySignedAt)>Date.now()+60000)
  fail('UNVERIFIED_ACTOR_SCOPE_OR_TIMESTAMP')
 const source=sources.rows.find(s=>s.catalogId===row.sourceCatalogRecordId)
 if(!source||source.sourcePdfSha256!==row.sourcePdfSha256||
    source.originalQuestionRevisionSetSha256!==row.originalQuestionRevisionSetSha256||
    source.subject!==row.subject||source.grade!==row.grade||
    source.medium!==row.medium||row.sourceGradeUnassigned!==(source.grade===0))
  fail('IMMUTABLE_ORIGINAL_SOURCE_ID_MISMATCH')
 const h=row.handwriting
 if(!h||h.mimeType!=='image/png'||!isSha(h.sha256)||
    typeof h.imageDataUrl!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(h.imageDataUrl))
  fail('NO_PRIVATE_PNG_SIGNATURE')
 const base64=h.imageDataUrl.slice('data:image/png;base64,'.length),bytes=Buffer.from(base64,'base64')
 if(bytes.length<40||bytes.length>120*1024||bytes.toString('base64')!==base64||
    !bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))||digest(bytes)!==h.sha256)
  fail('PNG_SIGNATURE_BYTES_OR_SHA_MISMATCH')
 if(row.signerDeclaration!=='I personally reviewed this source and evidence and signed with my own hand.')
  fail('PERSONAL_DECLARATION_MISSING')
 const isBook=row.action==='book_adoption'
 if(isBook){
  if(!['needs-evidence','adopted','not-adopted'].includes(row.bookDecision)||
     (row.bookDecision==='adopted'&&(!String(row.printedEdition||'').trim()||!isSha(row.supportingEvidenceSha256)))||
     row.originalQuestionId!==null||row.finalQuestionRevisionSha256!==null||
     row.finalAnswerRevisionSha256!==null||row.independentTeacherReceiptSha256!==null)
   fail('BOOK_DECISION_INCOMPLETE')
 }else{
  if(typeof row.originalQuestionId!=='string'||row.originalQuestionId.trim()!==row.originalQuestionId||
     !row.originalQuestionId||!isSha(row.finalQuestionRevisionSha256)||
     !isSha(row.finalAnswerRevisionSha256)||!isSha(row.supportingEvidenceSha256)||
     row.bookDecision!==null||row.printedEdition!==null)
   fail('QUESTION_ANSWER_REVISION_UNBOUND')
  if(row.action==='principal_approval'&&!isSha(row.independentTeacherReceiptSha256))
   fail('INDEPENDENT_TEACHER_RECEIPT_REQUIRED')
  if(row.action==='urdu_review'&&source.medium==='English')
   fail('URDU_REVIEW_SOURCE_MEDIUM_UNVERIFIED')
  if(row.action!=='principal_approval'){
   if(!Array.isArray(row.completedReviewChecks)||row.completedReviewChecks.length!==8||
      new Set(row.completedReviewChecks).size!==8||CHECKS.some(x=>!row.completedReviewChecks.includes(x)))
    fail('EIGHT_ACADEMIC_CHECKS_NOT_ATTESTED')
  }
 }
 return {sourceCatalogId:source.catalogId,action:row.action,
  claimedActorRole:actor.role,signatureImageByteSha256:h.sha256,
  immutableSourceSha256:row.sourcePdfSha256,originalQuestionId:isBook?null:row.originalQuestionId,
  claimFileValidated:true,authenticatedStaffIdentity:false,academicAnswerVerified:false,
  principalAuthorityVerified:false,academicallyApproved:0,published:0,
  paperStudioSelectable:false,releaseDecision:'HOLD_REAL_AUTHENTICATION_AND_INDEPENDENT_REVIEW'}
}

function inspectFile(file){
 const stat=fs.lstatSync(file)
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
    (stat.mode&0o077)!==0||stat.size<300||stat.size>260*1024)
  fail('PRIVATE_FILE_PERMISSIONS_OR_BYTES')
 const fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0))
 let bytes
 try{
  const check=fs.fstatSync(fd)
  if(stat.dev!==check.dev||stat.ino!==check.ino||check.nlink!==1||check.size!==stat.size)fail('FILE_CHANGED')
  bytes=fs.readFileSync(fd)
 }finally{fs.closeSync(fd)}
 let data
 try{data=JSON.parse(bytes.toString('utf8'))}catch(_){fail('INVALID_JSON')}
 return {...inspect(data),privateClaimFileSha256:digest(bytes)}
}
if(require.main===module){
 try{
  if(process.argv.length!==3)fail('PROVIDE_ONE_PRIVATE_FILE')
  const file=path.resolve(process.argv[2])
  console.log(JSON.stringify(inspectFile(file),null,2))
 }catch(error){console.error('GRADE910_SIGNOFF_CAPTURE_DENIED',error.message);process.exitCode=2}
}
module.exports={inspect,inspectFile,CHECKS}

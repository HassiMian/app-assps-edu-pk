'use strict'
const crypto=require('node:crypto')
const catalog=require('../data/grade910CatalogIndex.json')
const SHA=/^[0-9a-f]{64}$/
const checks=['Curriculum and session','Actual book edition and exercise page','Question correctness',
 'Answer and MCQ key','Marks and difficulty','English/Urdu correctness','Duplicates','Original source provenance']
const roles={teacher:['subject_review','urdu_review'],principal:['book_adoption','principal_approval']}
function fail(code,status=422){const e=Error(code);e.code=code;e.status=status;throw e}
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const valid=x=>typeof x==='string'&&SHA.test(x)
function verifyClaim(row,actor) {
 if(!actor||![...Object.keys(roles)].includes(actor.role)||!Number.isSafeInteger(actor.id)||actor.id<1||
  !Number.isSafeInteger(actor.schoolId)||actor.schoolId<1)
  fail('AUTHENTICATED_SCHOOL_STAFF_REQUIRED',403)
 if(!row||typeof row!=='object'||Array.isArray(row)||
  Object.keys(row).some(x=>!['schemaVersion','schoolCode','academicSession','intendedBoardExamYear',
  'actorClaim','personallySignedAt','action','sourceCatalogRecordId','sourcePdfSha256',
  'originalQuestionRevisionSetSha256','sourceGradeUnassigned','subject','grade','medium',
  'bookDecision','printedEdition','originalQuestionId','finalQuestionRevisionSha256',
  'finalAnswerRevisionSha256','independentTeacherReceiptSha256','supportingEvidenceSha256',
  'completedReviewChecks','handwriting','signerDeclaration','verificationStatus',
  'academicallyApproved','paperStudioSelectable','published'].includes(x)))
  fail('UNTRUSTED_FIELDS')
 if(row.schemaVersion!=='assps-grade910-human-claim-with-signature-v1'||row.schoolCode!=='ASSPS'||
   row.academicSession!=='2026-27'||row.intendedBoardExamYear!==2027||
   row.verificationStatus!=='UNTRUSTED_CLAIM_PENDING_SCHOOL_AUTHENTICATION'||
   row.academicallyApproved!==false||row.paperStudioSelectable!==false||row.published!==false)
  fail('FORGED_SCHOOL_CERTIFICATION')
 if(!row.actorClaim||String(row.actorClaim.userId)!==String(actor.id)||
    row.actorClaim.role!==actor.role||!roles[actor.role].includes(row.action))
  fail('STAFF_ROLE_OR_ID_SPOOF',403)
 const time=Date.parse(row.personallySignedAt)
 if(!Number.isFinite(time)||Math.abs(Date.now()-time)>15*60*1000)
  fail('SIGNING_TIMESTAMP_OUT_OF_WINDOW')
 const source=catalog.rows.find(x=>x.catalogId===row.sourceCatalogRecordId)
 if(!source||row.sourcePdfSha256!==source.sourcePdfSha256||
    row.originalQuestionRevisionSetSha256!==source.originalQuestionRevisionSetSha256||
    row.subject!==source.subject||row.medium!==source.medium||row.grade!==source.grade||
    row.sourceGradeUnassigned!==(source.grade===0))fail('FROZEN_CATALOG_MISMATCH')
 if(row.signerDeclaration!=='I personally reviewed this source and evidence and signed with my own hand.')
  fail('PERSONAL_SIGNATURE_DECLARATION_REQUIRED')
 const h=row.handwriting, prefix='data:image/png;base64,'
 if(!h||h.mimeType!=='image/png'||!valid(h.sha256)||typeof h.imageDataUrl!=='string'||
  !h.imageDataUrl.startsWith(prefix)||h.imageDataUrl.length>180000)fail('SIGNATURE_PNG_REQUIRED')
 const b64=h.imageDataUrl.slice(prefix.length)
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(b64))fail('SIGNATURE_PNG_ENCODING_INVALID')
 const png=Buffer.from(b64,'base64')
 if(png.length<40||png.length>120*1024||png.toString('base64')!==b64||
    !png.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))||
    png.toString('ascii',12,16)!=='IHDR'||digest(png)!==h.sha256)
   fail('SIGNATURE_BYTES_SHA_MISMATCH')
 const w=png.readUInt32BE(16),ht=png.readUInt32BE(20)
 if(w<1||ht<1||w>4096||ht>4096)fail('SIGNATURE_IMAGE_DIMENSIONS_INVALID')
 const book=row.action==='book_adoption'
 if(book){
  if(!['needs-evidence','adopted','not-adopted'].includes(row.bookDecision)||
   (row.bookDecision==='adopted'&&(!String(row.printedEdition||'').trim()||!valid(row.supportingEvidenceSha256)))||
    row.originalQuestionId!==null||row.finalQuestionRevisionSha256!==null||
    row.finalAnswerRevisionSha256!==null||row.independentTeacherReceiptSha256!==null)
   fail('SCHOOL_BOOK_EVIDENCE_INCOMPLETE')
 }else{
  if(typeof row.originalQuestionId!=='string'||row.originalQuestionId.length<3||row.originalQuestionId.length>180||
    !valid(row.finalQuestionRevisionSha256)||!valid(row.finalAnswerRevisionSha256)||
    !valid(row.supportingEvidenceSha256)||row.bookDecision!==null||row.printedEdition!==null)
   fail('QUESTION_ANSWER_REVISION_MISSING')
  if(row.action==='urdu_review'&&source.medium==='English')fail('URDU_SOURCE_LANGUAGE_MISMATCH')
  if(row.action==='principal_approval'&&!valid(row.independentTeacherReceiptSha256))
   fail('INDEPENDENT_TEACHER_RECEIPT_REQUIRED')
  if(row.action!=='principal_approval'&&(!Array.isArray(row.completedReviewChecks)||
    row.completedReviewChecks.length!==8||new Set(row.completedReviewChecks).size!==8||
    checks.some(x=>!row.completedReviewChecks.includes(x))))
   fail('EIGHT_ACADEMIC_CHECKS_REQUIRED')
 }
 const claim={...row,handwriting:{mimeType:'image/png',sha256:h.sha256}}
 const claimSha=digest(Buffer.from(JSON.stringify(claim),'utf8'))
 return {png,claim,source,claimSha,actor}
}
function encryptPng(png,hexKey) {
 if(!/^[0-9a-f]{64}$/i.test(String(hexKey||'')))fail('PRIVATE_SIGNATURE_ENCRYPTION_KEY_MISSING',503)
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',Buffer.from(hexKey,'hex'),iv)
 const encrypted=Buffer.concat([cipher.update(png),cipher.final()])
 return {ciphertext:encrypted,nonce:iv,tag:cipher.getAuthTag()}
}
async function storeClaim({payload,actor,query,encryptionKey}) {
 const r=verifyClaim(payload,actor)
 const enc=encryptPng(r.png,encryptionKey)
 const b=payload
 const result=await query(`
 INSERT INTO grade910_human_signoff_evidence
 (school_id,actor_user_id,actor_role,action,catalog_id,original_catalog_pdf_sha,
  original_question_set_sha,question_id,question_sha,answer_sha,evidence_sha,
  teacher_receipt_sha,academic_session,board_year,image_sha,image_ciphertext,
  image_nonce,image_tag,claim_sha,review_claim)
 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'2026-27',2027,$13,$14,$15,$16,$17,$18::jsonb)
 ON CONFLICT(school_id,actor_user_id,claim_sha) DO NOTHING RETURNING id, created_at`,
 [actor.schoolId,actor.id,actor.role,b.action,r.source.catalogId,r.source.sourcePdfSha256,
  r.source.originalQuestionRevisionSetSha256,b.originalQuestionId,b.finalQuestionRevisionSha256,
  b.finalAnswerRevisionSha256,b.supportingEvidenceSha256,b.independentTeacherReceiptSha256,
  b.handwriting.sha256,enc.ciphertext,enc.nonce,enc.tag,r.claimSha,JSON.stringify(r.claim)])
 if(result.rows.length)return {id:String(result.rows[0].id),created:true,verificationStatus:'PENDING_SCHOOL_IDENTITY_VERIFICATION',academicallyApproved:false,published:false}
 const seen=await query('SELECT id FROM grade910_human_signoff_evidence WHERE school_id=$1 AND actor_user_id=$2 AND claim_sha=$3',
  [actor.schoolId,actor.id,r.claimSha])
 if(!seen.rows.length)fail('SIGNED_SUBMISSION_RETRY_CONFLICT',409)
 return {id:String(seen.rows[0].id),created:false,verificationStatus:'PENDING_SCHOOL_IDENTITY_VERIFICATION',academicallyApproved:false,published:false}
}
module.exports={verifyClaim,encryptPng,storeClaim,catalog}

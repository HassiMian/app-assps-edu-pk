#!/usr/bin/env node
'use strict'
// Offline evidence verification ONLY. Never grants DB publication or impersonates school staff.
// Signing keys and school trust anchor must be provided OUT OF BAND; no private keys in repository.
const crypto=require('node:crypto')
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex')
const HEX=/^[a-f0-9]{64}$/
const TIME=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/
const original=require('./attest-grade910-all-original-candidate-revisions.cjs')
const intake=require('./validate-grade910-independent-review-evidence.cjs')
const REVIEW_CHECKS=Object.freeze(['curriculumApplicability','textbookEditionAndPrintedPage',
  'questionCorrectness','answerAndOptionCorrectness','marksAndDifficulty',
  'languageAccuracy','duplicatesAndOriginality','sourceProvenance'])
const ROLES=new Set(['adoptionCoordinator','subjectReviewer','urduReviewer','schoolApprover'])
const err=x=>{throw Error('GRADE910_INSTITUTIONAL_SIGNATURE_'+x)}
const nonempty=x=>typeof x==='string'&&x.trim()===x&&x.length>0
const hash=x=>typeof x==='string'&&HEX.test(x)
function timestamp(x){
 if(typeof x!=='string'||!TIME.test(x))return false
 const t=Date.parse(x)
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,19)===x.slice(0,19)
}
function canonical(v){
 if(v===null)return 'null'
 if(typeof v==='string'||typeof v==='boolean')return JSON.stringify(v)
 if(typeof v==='number'){
  if(!Number.isFinite(v))err('NONFINITE_NUMBER')
  return JSON.stringify(v)
 }
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']'
 if(typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype){
  const keys=Object.keys(v).sort()
  if(keys.some(k=>k==='__proto__'||k==='prototype'||k==='constructor'))err('UNSAFE_PAYLOAD_KEY')
  return '{'+keys.map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}'
 }
 err('INVALID_SIGNED_PAYLOAD_TYPE')
}
function publicKey(pem){
 let key
 try{key=crypto.createPublicKey(pem)}catch(_){err('INVALID_TRUSTED_PUBLIC_KEY')}
 if(key.asymmetricKeyType!=='ed25519')err('NON_ED25519_PUBLIC_KEY')
 return key
}
const fingerprint=key=>SHA(key.export({format:'der',type:'spki'}))
const envelope=(domain,payload)=>Buffer.from(domain+'\x00'+canonical(payload),'utf8')
function signatureBytes(s){
 if(typeof s!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(s))err('INVALID_DETACHED_SIGNATURE')
 const b=Buffer.from(s,'base64')
 if(b.length!==64||b.toString('base64')!==s)err('NONCANONICAL_SIGNATURE_ENCODING')
 return b
}
function verify(key,domain,payload,signature){
 if(!crypto.verify(null,envelope(domain,payload),key,signatureBytes(signature)))
  err('INVALID_SIGNATURE:'+domain)
}
function rosterTrust({roster,rosterSignature,schoolRootPublicKeyPem,
 trustedSchoolRootFingerprint,at}){
 if(!timestamp(at))err('NONCANONICAL_VERIFICATION_TIME')
 if(!roster||typeof roster!=='object'||Array.isArray(roster)||
   roster.schemaVersion!=='assps-academic-trust-roster-v1'||roster.schoolCode!=='ASSPS'||
   !nonempty(roster.tenantId)||!nonempty(roster.academicSession)||!timestamp(roster.activeFrom)||!timestamp(roster.activeUntil)||
   !Array.isArray(roster.actors)||roster.actors.length===0)
  err('UNACCEPTABLE_SCHOOL_ROOT_ROSTER')
 const root=publicKey(schoolRootPublicKeyPem)
 if(!hash(trustedSchoolRootFingerprint)||
    fingerprint(root)!==trustedSchoolRootFingerprint)err('SCHOOL_ROOT_NOT_EXTERNALLY_PINNED')
 verify(root,'assps-academic-roster-v1',roster,rosterSignature)
 const when=Date.parse(at)
 if(when<Date.parse(roster.activeFrom)||when>Date.parse(roster.activeUntil))
  err('SCHOOL_ROSTER_EXPIRED_OR_NOT_ACTIVE')
 const actors=new Map()
 for(const a of roster.actors){
  if(!a||typeof a!=='object'||Array.isArray(a)||!nonempty(a.actorId)||
   actors.has(a.actorId)||a.actorId.length>128||a.revoked!==false||
   !Array.isArray(a.roles)||a.roles.length<1||new Set(a.roles).size!==a.roles.length||
   a.roles.some(r=>!ROLES.has(r))||
   !Array.isArray(a.subjects)||a.subjects.some(s=>!nonempty(s))||
   !Array.isArray(a.grades)||a.grades.some(g=>![9,10].includes(g))||
   !Array.isArray(a.media)||a.media.some(m=>!['english','urdu','dual'].includes(m))||
   !hash(a.credentialEvidenceSha256)||!timestamp(a.activeFrom)||!timestamp(a.activeUntil))
    err('INVALID_ACTOR_AUTHORIZATION')
  const key=publicKey(a.publicKeyPem)
  if(when<Date.parse(a.activeFrom)||when>Date.parse(a.activeUntil))
   continue // expired actor cannot attest today
  actors.set(a.actorId,{...a,key})
 }
 return{roster,actors,trustRootFingerprint:fingerprint(root)}
}
function actorFor(ctx,ref,role,grade,subject,medium){
 if(!ref||typeof ref!=='object'||Array.isArray(ref)||!nonempty(ref.actorId)||!nonempty(ref.signature))
  err('MISSING_SIGNED_ACTOR_ATTESTATION')
 const a=ctx.actors.get(ref.actorId)
 if(!a||!a.roles.includes(role))err('ACTOR_ROLE_NOT_SCHOOL_AUTHORIZED:'+role)
 if(!a.grades.includes(grade)||!(a.subjects.includes(subject)||a.subjects.includes('*'))||
   !(a.media.includes(medium)||a.media.includes('dual')))
  err('ACTOR_SCOPE_MISMATCH:'+role)
 return a
}
function indexForInstitutionalSignatures(frozen,documents){
 const base=intake.indexOriginals(frozen,documents)
 const byId=new Map()
 for(const d of documents){
  for(const q of [...(d.data?.drafts||[]),...(d.data?.items||[])]){
   if(base.has(q.id)){
    const parent=base.get(q.id)
    byId.set(q.id,{...parent,sourceGrade:q.curriculum?.grade??null,
     sourceSubjectId:q.curriculum?.subjectId||null,
     sourceCatalogRecordId:q.source?.catalogRecordId||d.data?.sourceRecordId||null,
     sourcePdfSha256:q.source?.pdfSha256||d.data?.sourcePdfSha256||null})
   }
  }
 }
 if(byId.size!==2581)err('SOURCE_ID_COHORT_DRIFT')
 return byId
}
function checkPacket(packet){
 if(!packet||typeof packet!=='object'||Array.isArray(packet)||packet.schemaVersion!=='assps-academic-review-packet-v1'||
   packet.schoolCode!=='ASSPS'||!nonempty(packet.tenantId)||!nonempty(packet.academicSession)||
   !nonempty(packet.originalQuestionId)||![9,10].includes(packet.grade)||
   !nonempty(packet.subjectId)||!['english','urdu','dual'].includes(packet.medium)||
   !nonempty(packet.sourceCatalogRecordId)||!hash(packet.sourcePdfSha256)||
   !nonempty(packet.adoptedBookEdition)||!nonempty(packet.curriculumTopicId)||
   !Number.isInteger(packet.boardExamYear)||packet.boardExamYear<2025||packet.boardExamYear>2100||
   !nonempty(packet.authorId)||!hash(packet.originalQuestionRevisionSha256)||
   !hash(packet.originalSourceFileSha256)||!hash(packet.finalQuestionRevisionSha256)||
   !hash(packet.finalAnswerRevisionSha256)||!hash(packet.bookAdoptionEvidenceSha256)||
   !hash(packet.curriculumTopicEvidenceSha256)||!timestamp(packet.reviewedAt)||
   !timestamp(packet.approvedAt)||Date.parse(packet.approvedAt)<Date.parse(packet.reviewedAt)||
   !['original-conceptual','textbook-exercise'].includes(packet.originType)||
   (packet.originType==='textbook-exercise'&&!hash(packet.printedPageExerciseEvidenceSha256))||
   !Array.isArray(packet.checks)||packet.checks.length!==REVIEW_CHECKS.length||
   new Set(packet.checks.map(x=>x?.name)).size!==REVIEW_CHECKS.length)
  err('REVIEW_PACKET_INCOMPLETE')
 for(const name of REVIEW_CHECKS){
  const c=packet.checks.find(x=>x.name===name)
  if(!c||c.passed!==true||!hash(c.evidenceSha256))err('REVIEW_CHECK_NOT_SUPPORTED:'+name)
 }
}
function verifyReview({roster,rosterSignature,schoolRootPublicKeyPem,
 trustedSchoolRootFingerprint,packet,signatures,at,originalsIndex,
 finalQuestion,finalAnswer,expectedTenantId}){
 const ctx=rosterTrust({roster,rosterSignature,schoolRootPublicKeyPem,trustedSchoolRootFingerprint,at})
 checkPacket(packet)
 if(!nonempty(expectedTenantId)||packet.tenantId!==expectedTenantId||
   roster.tenantId!==expectedTenantId)err('INSTITUTIONAL_TENANT_MISMATCH')
 if(packet.academicSession!==roster.academicSession||!signatures||typeof signatures!=='object')
  err('SESSION_OR_SIGNATURE_SET_MISMATCH')
 const baseline=originalsIndex?.get(packet.originalQuestionId)
 if(!baseline||baseline.originalQuestionRevisionSha256!==packet.originalQuestionRevisionSha256||
   baseline.sourceSha!==packet.originalSourceFileSha256||
   baseline.sourceMedium!==packet.medium||
   baseline.sourceGrade!==packet.grade||baseline.sourceSubjectId!==packet.subjectId||
   baseline.sourceCatalogRecordId!==packet.sourceCatalogRecordId||
   baseline.sourcePdfSha256!==packet.sourcePdfSha256)
  err('FROZEN_ORIGINAL_ID_REVISION_MEDIUM_MISMATCH')
 if(SHA(canonical(finalQuestion))!==packet.finalQuestionRevisionSha256||
    SHA(canonical(finalAnswer))!==packet.finalAnswerRevisionSha256)
  err('UNVERIFIED_FINAL_CONTENT_REVISION')
 const reviewer=actorFor(ctx,signatures.subjectReviewer,'subjectReviewer',
  packet.grade,packet.subjectId,packet.medium)
 const coordinator=actorFor(ctx,signatures.adoptionCoordinator,'adoptionCoordinator',
  packet.grade,packet.subjectId,packet.medium)
 const approver=actorFor(ctx,signatures.schoolApprover,'schoolApprover',
  packet.grade,packet.subjectId,packet.medium)
 if(new Set([reviewer.actorId,coordinator.actorId,approver.actorId,packet.authorId]).size!==4)
  err('NONINDEPENDENT_AUTHOR_REVIEWER_SCHOOL_ROLES')
 let urdu=null
 if(packet.medium==='dual'||packet.medium==='urdu'){
  urdu=actorFor(ctx,signatures.urduReviewer,'urduReviewer',packet.grade,packet.subjectId,packet.medium)
  if([reviewer.actorId,coordinator.actorId,approver.actorId,packet.authorId].includes(urdu.actorId))
   err('NONINDEPENDENT_URDU_REVIEWER')
 }else if(signatures.urduReviewer!=null)err('UNEXPECTED_URDU_ATTESTATION')
 const approved=Date.parse(packet.approvedAt),reviewed=Date.parse(packet.reviewedAt),when=Date.parse(at)
 if(reviewed>when||approved>when)err('FUTURE_REVIEW_OR_APPROVAL')
 for(const a of [reviewer,coordinator,approver,...(urdu?[urdu]:[])]){
  if(Date.parse(a.activeFrom)>reviewed||Date.parse(a.activeUntil)<approved)
   err('ACTOR_NOT_AUTHORIZED_AT_REVIEW')
 }
 const adoption={schoolCode:packet.schoolCode,tenantId:packet.tenantId,academicSession:packet.academicSession,
  originalQuestionId:packet.originalQuestionId,bookAdoptionEvidenceSha256:packet.bookAdoptionEvidenceSha256,
  curriculumTopicEvidenceSha256:packet.curriculumTopicEvidenceSha256,
  originType:packet.originType,
  sourceCatalogRecordId:packet.sourceCatalogRecordId,sourcePdfSha256:packet.sourcePdfSha256,
  adoptedBookEdition:packet.adoptedBookEdition,curriculumTopicId:packet.curriculumTopicId,
  boardExamYear:packet.boardExamYear,
  printedPageExerciseEvidenceSha256:packet.printedPageExerciseEvidenceSha256||null}
 verify(coordinator.key,'assps-academic-adoption-v1',adoption,signatures.adoptionCoordinator.signature)
 verify(reviewer.key,'assps-academic-subject-review-v1',packet,signatures.subjectReviewer.signature)
 if(urdu)verify(urdu.key,'assps-academic-urdu-review-v1',packet,signatures.urduReviewer.signature)
 const digest=SHA(canonical(packet))
 verify(approver.key,'assps-academic-school-approval-v1',
  {schoolCode:packet.schoolCode,tenantId:packet.tenantId,session:packet.academicSession,
   reviewPacketSha256:digest,questionSha256:packet.finalQuestionRevisionSha256,
   answerSha256:packet.finalAnswerRevisionSha256,approvedAt:packet.approvedAt},
  signatures.schoolApprover.signature)
 return{originalQuestionId:packet.originalQuestionId,
  reviewPacketSha256:digest,finalQuestionRevisionSha256:packet.finalQuestionRevisionSha256,
  finalAnswerRevisionSha256:packet.finalAnswerRevisionSha256,
  schoolRosterAuthenticated:true,independentReviewerSignaturesCryptographicallyVerified:true,
  researchCandidateOriginIntact:true,
  academicallyPublished:false,publisherSelectable:false,
  nextGate:'Verify actual school adopted edition and authentic reviewer credentials independently; Paper Studio and SaaS Core release certification required'}
}
function verifyBatch({records,...shared}){
 if(!Array.isArray(records)||records.length===0||records.length>2581)
  err('EMPTY_OR_OVERSIZED_SIGNED_BATCH')
 const seenIds=new Set(),seenRevisions=new Set(),receipts=[]
 const {roster,rosterSignature,schoolRootPublicKeyPem,trustedSchoolRootFingerprint,
  at,originalsIndex,expectedTenantId}=shared
 for(const item of records){
  if(!item||typeof item!=='object')err('MALFORMED_SIGNED_BATCH_ROW')
  const id=item.packet?.originalQuestionId
  const rev=id+':'+item.packet?.finalQuestionRevisionSha256
  if(!nonempty(id)||seenIds.has(id)||seenRevisions.has(rev))
   err('DUPLICATE_OR_REPLAYED_QUESTION_REVISION')
  seenIds.add(id);seenRevisions.add(rev)
  // Never let a packet's extra properties replace the independently provisioned trust anchor.
  receipts.push(verifyReview({
   roster,rosterSignature,schoolRootPublicKeyPem,trustedSchoolRootFingerprint,
   at,originalsIndex,expectedTenantId,
   packet:item.packet,signatures:item.signatures,
   finalQuestion:item.finalQuestion,finalAnswer:item.finalAnswer}))
 }
 return{schoolCode:'ASSPS',reviewEvidencePackets:receipts.length,
  signedReviewsCryptographicallyVerified:receipts.length,
  academicallyPublished:0,publisherSelectable:false,
  releaseDecision:'HOLD_PENDING_PAPER_STUDIO_AND_SAAS_CORE_RELEASE_CERTIFICATION',
  receipts}
}
if(require.main===module){
 console.log(JSON.stringify({schoolRosterConnected:false,liveAuthenticationsPerformed:0,
  academicallyApproved:0,publisherSelectable:0,releaseDecision:'BLOCK_AUTHENTICATION_PENDING_EXTERNAL_SCHOOL_TRUST_ANCHOR'}))
}
module.exports={verifyReview,verifyBatch,rosterTrust,indexForInstitutionalSignatures,canonical,envelope,fingerprint,checkPacket,REVIEW_CHECKS}

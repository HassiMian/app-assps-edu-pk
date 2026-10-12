#!/usr/bin/env node
'use strict'
// Joins independent research response to REAL separately authenticated school signatures.
// This module does NOT authenticate a faculty member or grant Paper Studio publication.
const fs=require('node:fs'),crypto=require('node:crypto')
const unsigned=require('./aggregate-grade910-offline-faculty-decisions.cjs')
const signed=require('./verify-grade910-school-review-envelope.cjs')
const auth=require('./verify-grade910-institutional-signatures.cjs')
const deny=x=>{throw Error('ASSPS_GRADE910_SIGNED_FACULTY_CHAIN_'+x)}
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex')
const H=/^[a-f0-9]{64}$/
function reconcilePacket(record,teacher){
 if(!record?.packet||!record?.signatures||!teacher)deny('SIGNED_AND_INDEPENDENT_REVIEW_REQUIRED')
 const p=record.packet,s=record.signatures,t=teacher
 if(t.schemaVersion!=='assps-grade910-offline-subject-review-v1'||
  t.originalQuestionId!==p.originalQuestionId||
  t.originalQuestionRevisionSha256!==p.originalQuestionRevisionSha256||
  t.originalSourceFileSha256!==p.originalSourceFileSha256||
  t.reviewerClaimId!==s.subjectReviewer?.actorId||
  t.academicSessionClaim!==p.academicSession)
  deny('INDEPENDENT_REVIEW_ID_REVISION_SUBJECT_SIGNER_OR_SESSION_MISMATCH')
 if(t.disposition!=='recommend-independent-verification')
  deny('INDEPENDENT_TEACHER_DID_NOT_RECOMMEND_VERIFICATION')
 const completed=Date.parse(t.completedAt),reviewed=Date.parse(p.reviewedAt)
 if(!Number.isFinite(completed)||!Number.isFinite(reviewed)||completed>reviewed)
  deny('INDEPENDENT_TEACHER_REVIEW_COMPLETION_AFTER_SIGNED_REVIEW')
 if(!Array.isArray(t.checks)||t.checks.length!==8||
   new Set(t.checks.map(x=>x.name)).size!==8)
  deny('INDEPENDENT_TEACHER_EIGHT_CRITERIA_MISSING')
 if(!Array.isArray(p.checks)||p.checks.length!==8||
   new Set(p.checks.map(x=>x.name)).size!==8)
  deny('SIGNED_PACKET_EIGHT_CRITERIA_MISSING')
 for(const name of auth.REVIEW_CHECKS){
  const a=t.checks.find(x=>x.name===name),b=p.checks.find(x=>x.name===name)
  if(!a||!b||a.status!=='passed'||b.passed!==true||
    !H.test(String(a.evidenceSha256))||a.evidenceSha256!==b.evidenceSha256)
    deny('REVIEW_EVIDENCE_DIFFERENT_FROM_SIGNED_CHECK_'+name)
 }
 if(t.adoptedTextbookEditionClaim!==p.adoptedBookEdition||
  t.applicableExamYearClaim!==p.boardExamYear||
  t.schoolAdoptionProofHashClaim!==p.bookAdoptionEvidenceSha256||
  t.finalQuestionRevisionSha256Claim!==p.finalQuestionRevisionSha256||
  t.finalAnswerRevisionSha256Claim!==p.finalAnswerRevisionSha256)
  deny('QUESTION_ANSWER_ADOPTION_OR_BOARD_VERSION_MISMATCH')
 if(t.signatureAuthenticated===true||t.academicallyApproved===true||
  t.published===true||t.verifiedPaperStudioSelectable===true)
  deny('UNSIGNED_REVIEW_RECORD_CANNOT_CLAIM_APPROVAL')
 // Structural consistency only, not a certification of truth, real role or school authority.
 return {originalQuestionId:p.originalQuestionId,
  originalQuestionRevisionSha256:p.originalQuestionRevisionSha256,
  originalSourceFileSha256:p.originalSourceFileSha256,
  finalQuestionRevisionSha256:p.finalQuestionRevisionSha256,
  finalAnswerRevisionSha256:p.finalAnswerRevisionSha256,
  teacherClaimMatchesSignedPacket:true,
  independentReviewContentSemanticallyVerifiedByThisJoin:false,
  schoolSignerCryptographicallyAuthenticatedByThisJoin:false,
  paperStudioVerifiedSelectable:false,academicallyPublished:false}
}
function reconcileRecords(records,teachers){
 if(!Array.isArray(records)||!Array.isArray(teachers)||records.length===0||
  records.length>2580||teachers.length>2580)
  deny('INVALID_SIGNED_PACKET_OR_REVIEW_COUNT')
 const originals=new Map()
 for(const t of teachers){
  if(!t||typeof t.originalQuestionId!=='string'||originals.has(t.originalQuestionId))
   deny('DUPLICATE_OR_INVALID_ORIGINAL_TEACHER_REVIEW')
  originals.set(t.originalQuestionId,t)
 }
 const used=new Set(),rows=[]
 for(const r of records){
  const id=r?.packet?.originalQuestionId
  if(typeof id!=='string'||used.has(id))deny('DUPLICATE_SIGNED_ORIGINAL_ID')
  used.add(id)
  const t=originals.get(id)
  if(!t)deny('MISSING_INDEPENDENT_REAL_TEACHER_RESPONSE_FOR_SIGNED_PACKET')
  rows.push(reconcilePacket(r,t))
 }
 return{schemaVersion:'assps-grade910-checked-signed-faculty-response-revision-chain-v1',
  reconciledResponses:rows.length,allSignedPacketsHaveCorrespondingIndependentHumanResponse:true,
  signingAndRootTrustMustBeIndependentlyVerified:true,
  actualSchoolAuthorityAttestedByThisStructuralJoin:false,
  approvedForPaperStudioPicker:false,academicallyPublished:0,
  releaseDecision:'HOLD_PENDING_ACTUAL_SIGNER_VALIDATION_AND_PAPER_STUDIO_SAAS_CORE',
  rows}
}
function loadReconciled({privateTeacherDirectory,...options}){
 const dir=unsigned.secureDir(privateTeacherDirectory)
 const schoolBundle=options.reviewBundleFile
 const verified=signed.loadExternal(options) // real school-pinned root + exact original + Ed25519 review signatures + physical evidence objects
 if(verified.paperStudioPublisherSelectable!==false||verified.productionChanged!==false)
  deny('SCHOOL_ENVELOPE_ILLEGALLY_ENABLED_PUBLICATION')
 const file=signed.verifyExternalFile(schoolBundle,{sensitive:true})
 const first=fs.readFileSync(file),digest=SHA(first)
 if(digest!==verified.verifiedSignedBundleFileSha256)
  deny('SIGNED_BUNDLE_CHANGED_AFTER_CRYPTOGRAPHIC_CHECK')
 const bundle=JSON.parse(first.toString('utf8'))
 const initial=unsigned.aggregate({reviewDir:dir})
 const originals=unsigned.originalIndex(),verifiedHashes=new Map(initial.rows.map(x=>[x.originalQuestionId,x.privateRecordDigest]))
 const entryNames=fs.readdirSync(dir).sort()
 const human=[]
 for(const name of entryNames){
  if(!/^[A-Za-z0-9_-]{3,180}\.faculty-review\.json$/.test(name))
   deny('UNTRUSTED_INDEPENDENT_REVIEW_FILENAME')
  const full=fs.realpathSync(require('node:path').join(dir,name))
  if(full!==require('node:path').join(dir,name))deny('INDEPENDENT_REVIEW_SYMLINK')
  const st=fs.lstatSync(full)
  if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||
    (st.mode&0o077)!==0||st.nlink!==1||st.size<20||st.size>256*1024)
    deny('UNSAFE_INDEPENDENT_TEACHER_RESPONSE_BYTES')
  const bytes=fs.readFileSync(full)
  const item=JSON.parse(bytes.toString('utf8'))
  unsigned.inspect(item,originals)
  if(verifiedHashes.get(item.originalQuestionId)!==SHA(bytes))
   deny('INDEPENDENT_TEACHER_RESPONSE_CHANGED_AFTER_SOURCE_VALIDATION')
  human.push(item)
 }
 const joined=reconcileRecords(bundle.records,human)
 if(human.length!==initial.unsignedTeacherResponsesReceived)
  deny('INDEPENDENT_TEACHER_RESPONSE_COUNT_CHANGED')
 if(SHA(fs.readFileSync(file))!==digest)deny('SIGNED_BUNDLE_CHANGED_DURING_JOIN')
 if(joined.reconciledResponses!==verified.reviewEvidencePackets)
  deny('SCHOOL_SIGNED_ROSTER_RECEIPT_COUNT_MISMATCH')
 return{...joined,
  signedSchoolPacketsCryptographicallyAndEvidenceByteVerified:verified.reviewEvidencePackets,
  independentlySignedSchoolRosterFingerprint:verified.schoolRootPublicKeyFingerprint,
  actualSignedReviewReceiptCount:verified.reviewEvidencePackets,
  paperStudioVerifiedSelectable:false,academicallyPublished:0,
  releaseDecision:'HOLD_PENDING_PAPER_STUDIO_AND_SAAS_CORE_ACCEPTANCE'}
}
function run(){
 const e=process.env
 const inputs={
  privateTeacherDirectory:e.ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR,
  rootPublicKeyFile:e.ASSPS_ACADEMIC_SCHOOL_ROOT_PUBKEY_PATH,
  reviewBundleFile:e.ASSPS_ACADEMIC_SIGNED_REVIEW_BUNDLE_PATH,
  rootFingerprint:e.ASSPS_ACADEMIC_TRUSTED_ROOT_SPKI_SHA256,
  tenantId:e.ASSPS_ACADEMIC_SCHOOL_TENANT_ID,
  at:e.ASSPS_ACADEMIC_REVIEW_VERIFICATION_AT,
  evidenceObjectDirectory:e.ASSPS_ACADEMIC_EVIDENCE_OBJECT_DIR}
 const schoolValues=Object.entries(inputs).filter(([k,v])=>k!=='privateTeacherDirectory'&&typeof v==='string'&&v.length)
 if(schoolValues.length===0){
  if(inputs.privateTeacherDirectory){
   const initial=unsigned.aggregate({reviewDir:inputs.privateTeacherDirectory})
   return {schoolSignedBundleConfigured:false,privateTeacherResponses:initial.unsignedTeacherResponsesReceived,
    validSignedQuestionRevisions:0,academicApprovals:0,published:0,releaseDecision:'HOLD'}
  }
  return {schoolSignedBundleConfigured:false,privateTeacherResponses:0,
   validSignedQuestionRevisions:0,academicApprovals:0,published:0,releaseDecision:'HOLD'}
 }
 if(schoolValues.length!==6||!inputs.privateTeacherDirectory)
  deny('INCOMPLETE_REAL_SCHOOL_SIGNED_EVIDENCE_CONFIGURATION')
 return loadReconciled(inputs)
}
if(require.main===module){
 try{console.log(JSON.stringify(run()))}
 catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={reconcilePacket,reconcileRecords,loadReconciled,run}

'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),
 crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),os=require('node:os')
const r=require('../qbank/reconcile-grade910-teacher-response-to-signed-school-packet.cjs')
const auth=require('../qbank/verify-grade910-institutional-signatures.cjs')
const h=s=>crypto.createHash('sha256').update(s).digest('hex')
function sample(){
 const checks=auth.REVIEW_CHECKS.map(name=>({name,evidenceSha256:h('real-object-'+name)}))
 const packet={originalQuestionId:'SYNTHETIC-IX-CHEMISTRY-ORIGINAL-TEST',
  originalQuestionRevisionSha256:h('original question'),originalSourceFileSha256:h('source file'),
  academicSession:'2026-27',reviewedAt:'2026-10-12T12:05:00Z',
  adoptedBookEdition:'2026-27',boardExamYear:2027,
  bookAdoptionEvidenceSha256:h('book adoption'),
  finalQuestionRevisionSha256:h('revised question'),finalAnswerRevisionSha256:h('revised answer'),
  checks:checks.map(x=>({...x,passed:true}))}
 const t={schemaVersion:'assps-grade910-offline-subject-review-v1',
  originalQuestionId:packet.originalQuestionId,
  originalQuestionRevisionSha256:packet.originalQuestionRevisionSha256,
  originalSourceFileSha256:packet.originalSourceFileSha256,
  reviewerClaimId:'synthetic-subject-reviewer',academicSessionClaim:'2026-27',
  completedAt:'2026-10-12T12:00:00Z',
  disposition:'recommend-independent-verification',
  independentAnswerBeforeReference:'Synthetic independently proposed answer is never proof of school approval.',
  adoptedTextbookEditionClaim:'2026-27',applicableExamYearClaim:2027,
  schoolAdoptionProofHashClaim:packet.bookAdoptionEvidenceSha256,
  finalQuestionRevisionSha256Claim:packet.finalQuestionRevisionSha256,
  finalAnswerRevisionSha256Claim:packet.finalAnswerRevisionSha256,
  checks:checks.map(x=>({...x,status:'passed'})),
  academicallyApproved:false,published:false,signatureAuthenticated:false}
 return{record:{packet,signatures:{subjectReviewer:{actorId:'synthetic-subject-reviewer'}}},teacher:t}
}
test('structurally matching signed and independent teacher response creates no publication authority',()=>{
 const s=sample()
 const v=r.reconcilePacket(s.record,s.teacher)
 assert.equal(v.teacherClaimMatchesSignedPacket,true)
 assert.equal(v.schoolSignerCryptographicallyAuthenticatedByThisJoin,false)
 assert.equal(v.paperStudioVerifiedSelectable,false)
 assert.equal(v.academicallyPublished,false)
 const report=r.reconcileRecords([s.record],[s.teacher])
 assert.equal(report.reconciledResponses,1)
 assert.equal(report.approvedForPaperStudioPicker,false)
 assert.equal(report.academicallyPublished,0)
})
test('signer impersonation, changed original revision or source file, cross-session response is denied',()=>{
 const s=sample()
 for(const [key,value] of [['reviewerClaimId','other teacher'],['originalQuestionRevisionSha256',h('different question')],
  ['originalSourceFileSha256',h('different file')],['academicSessionClaim','2025-26']]){
  const changed={...s.teacher,[key]:value}
  assert.throws(()=>r.reconcilePacket(s.record,changed),/INDEPENDENT_REVIEW_ID_REVISION_SUBJECT_SIGNER_OR_SESSION_MISMATCH/)
 }
})
test('revisions, textbook edition, board year, adoption hashes and criterion evidence must be identical',()=>{
 const s=sample()
 for(const [key,value] of [
  ['adoptedTextbookEditionClaim','2025-26'],
  ['applicableExamYearClaim',2026],
  ['schoolAdoptionProofHashClaim',h('wrong adoption certificate')],
  ['finalQuestionRevisionSha256Claim',h('wrong final question')],
  ['finalAnswerRevisionSha256Claim',h('wrong final answer')]]){
  assert.throws(()=>r.reconcilePacket(s.record,{...s.teacher,[key]:value}),
    /QUESTION_ANSWER_ADOPTION_OR_BOARD_VERSION_MISMATCH/)
 }
 const t={...s.teacher,checks:s.teacher.checks.map(x=>({...x}))}
 t.checks[0].evidenceSha256=h('evidence changed')
 assert.throws(()=>r.reconcilePacket(s.record,t),/REVIEW_EVIDENCE_DIFFERENT_FROM_SIGNED_CHECK/)
})
test('unsigned school success cannot follow missing, failed or pending teacher checks',()=>{
 const s=sample()
 assert.throws(()=>r.reconcilePacket(s.record,{...s.teacher,disposition:'needs-answer-revision'}),
  /INDEPENDENT_TEACHER_DID_NOT_RECOMMEND_VERIFICATION/)
 for(const status of ['pending','failed']){
  const t={...s.teacher,checks:s.teacher.checks.map(x=>({...x}))}
  t.checks[0].status=status
  assert.throws(()=>r.reconcilePacket(s.record,t),/REVIEW_EVIDENCE_DIFFERENT_FROM_SIGNED_CHECK/)
 }
 assert.throws(()=>r.reconcilePacket(s.record,{...s.teacher,completedAt:'2026-10-13T00:00:00Z'}),
  /INDEPENDENT_TEACHER_REVIEW_COMPLETION_AFTER_SIGNED_REVIEW/)
 assert.throws(()=>r.reconcilePacket(s.record,{...s.teacher,academicallyApproved:true}),
  /UNSIGNED_REVIEW_RECORD_CANNOT_CLAIM_APPROVAL/)
})
test('signed bundle replay, missing original teacher response and duplicate teacher claims fail closed',()=>{
 const s=sample()
 assert.throws(()=>r.reconcileRecords([s.record],[]),
  /MISSING_INDEPENDENT_REAL_TEACHER_RESPONSE_FOR_SIGNED_PACKET/)
 assert.throws(()=>r.reconcileRecords([s.record,s.record],[s.teacher]),
  /DUPLICATE_SIGNED_ORIGINAL_ID/)
 assert.throws(()=>r.reconcileRecords([s.record],[s.teacher,s.teacher]),
  /DUPLICATE_OR_INVALID_ORIGINAL_TEACHER_REVIEW/)
})
test('actual school private submissions directory with no signed school authority reports zero authenticated receipts',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps910-reconciliation-'))
 fs.chmodSync(dir,0o700)
 const old=process.env.ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR
 const fields=['ASSPS_ACADEMIC_SCHOOL_ROOT_PUBKEY_PATH','ASSPS_ACADEMIC_SIGNED_REVIEW_BUNDLE_PATH',
  'ASSPS_ACADEMIC_TRUSTED_ROOT_SPKI_SHA256','ASSPS_ACADEMIC_SCHOOL_TENANT_ID',
  'ASSPS_ACADEMIC_REVIEW_VERIFICATION_AT','ASSPS_ACADEMIC_EVIDENCE_OBJECT_DIR']
 const saved=Object.fromEntries(fields.map(k=>[k,process.env[k]]))
 try{
  process.env.ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR=dir
  fields.forEach(k=>{delete process.env[k]})
  const a=r.run()
  assert.equal(a.schoolSignedBundleConfigured,false)
  assert.equal(a.privateTeacherResponses,0)
  assert.equal(a.validSignedQuestionRevisions,0)
  assert.equal(a.academicApprovals,0)
  process.env.ASSPS_ACADEMIC_EVIDENCE_OBJECT_DIR=dir
  assert.throws(()=>r.run(),/INCOMPLETE_REAL_SCHOOL_SIGNED_EVIDENCE_CONFIGURATION/)
 }finally{
  if(old==null)delete process.env.ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR
  else process.env.ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR=old
  fields.forEach(k=>saved[k]===undefined?delete process.env[k]:process.env[k]=saved[k])
  fs.rmSync(dir,{recursive:true,force:true})
 }
})

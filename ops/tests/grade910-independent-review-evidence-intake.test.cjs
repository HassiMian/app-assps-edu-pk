'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const mod=require('../qbank/validate-grade910-independent-review-evidence.cjs')
const source=require('../qbank/attest-grade910-all-original-candidate-revisions.cjs')
const frozen=source.assertFrozen(source.loadInputs())
const indexed=mod.indexOriginals(frozen)
const original=[...indexed.values()][0]
const hex='a'.repeat(64),answerHash='b'.repeat(64)
const valid=()=>({
 originalQuestionId:original.originalQuestionId,
 originalQuestionRevisionSha256:original.originalQuestionRevisionSha256,
 originalFileSha256:original.sourceSha,
 finalQuestionRevisionSha256:hex,finalAnswerRevisionSha256:answerHash,
 authorId:'author1',independentReviewerId:'teacher2',
 reviewerSubjectQualificationRef:'credential/2',teacherCredentialEvidenceRef:'school/teacher/2',
 schoolAdoptionEvidenceRef:'school/adoption/1',physicalPageExerciseEvidenceRef:'pages/1',
 applicableBoardExamYearEvidenceRef:'board/2027',
 reviewerSignatureEvidenceRef:'signature/2',reviewedAt:'2026-10-10T12:00:00Z',
 schoolAcademicApprovalEvidenceRef:'principal/1',approvedAt:'2026-10-10T12:10:00Z',
 medium:'english',checks:mod.REASONS.map(name=>({name,decision:'pass',evidenceRef:'evidence/'+name,
 reviewedQuestionRevisionSha256:hex,reviewedAnswerRevisionSha256:answerHash}))
})
test('current reality has 2581 candidates but zero authenticated independent reviews',()=>{
 const r=mod.run()
 assert.equal(r.originalCandidateCount,2581)
 assert.equal(r.reviewEvidencePacketsReceived,0)
 assert.equal(r.authenticatedAcademicApprovals,0)
 assert.equal(r.verifiedPublished,0)
 assert.match(r.publicationDecision,/DENY/)
})
test('even full-looking forged identifiers only produce unauthenticated intake, not approval',()=>{
 const r=mod.run({reviews:[valid()]})
 assert.equal(r.structurallyCompleteReviewerIntakePackets,1)
 assert.equal(r.rows[0].schoolAcademicApprovalAuthenticated,false)
 assert.equal(r.rows[0].reviewerIdentityCryptographicallyAuthenticated,false)
 assert.equal(r.rows[0].publisherSelectable,false)
 assert.equal(r.authenticatedAcademicApprovals,0)
})
test('source and answer revision tampering rejected',()=>{
 for(const k of ['originalQuestionRevisionSha256','originalFileSha256']){
  const r=valid();r[k]='c'.repeat(64)
  assert.throws(()=>mod.run({reviews:[r]}),/STALE_OR_FORGED/)
 }
 const r=valid();r.checks[0].reviewedAnswerRevisionSha256='c'.repeat(64)
 assert.throws(()=>mod.run({reviews:[r]}),/CHECKS_INCOMPLETE/)
})
test('author self approval and missing signature disallowed',()=>{
 let r=valid();r.independentReviewerId=r.authorId
 assert.throws(()=>mod.run({reviews:[r]}),/NOT_INDEPENDENT/)
 r=valid();delete r.reviewerSignatureEvidenceRef
 assert.throws(()=>mod.run({reviews:[r]}),/SIGNED_REVIEW_OR_SCHOOL_APPROVAL_MISSING/)
})
test('missing subject, source, adoption, board or physical proof blocked',()=>{
 for(const k of ['teacherCredentialEvidenceRef','reviewerSubjectQualificationRef','schoolAdoptionEvidenceRef','physicalPageExerciseEvidenceRef','applicableBoardExamYearEvidenceRef']){
  const r=valid();delete r[k]
  assert.throws(()=>mod.run({reviews:[r]}),/QUALIFICATION_ADOPTION_OR_PRINTED_SOURCE_MISSING/)
 }
})
test('eight complete revision-specific checks mandatory',()=>{
 let r=valid();r.checks.pop()
 assert.throws(()=>mod.run({reviews:[r]}),/CHECKS_INCOMPLETE/)
 r=valid();r.checks[0].decision='fail'
 assert.throws(()=>mod.run({reviews:[r]}),/CHECKS_INCOMPLETE/)
})
test('dual language requests separate independent Urdu teacher review',()=>{
 let r=valid();r.medium='dual'
 assert.throws(()=>mod.run({reviews:[r]}),/INDEPENDENT_URDU_REVIEW_MISSING/)
 r.urduTranslationReviewerId='teacherUrdu3'
 r.urduTranslationReviewEvidenceRef='ur/3'
 assert.equal(mod.run({reviews:[r]}).rows[0].publisherSelectable,false)
})
test('repeat revision review packets cannot falsely inflate reviewed count',()=>{
 const r=valid()
 assert.throws(()=>mod.run({reviews:[r,r]}),/DUPLICATE_REVIEW_REVISION/)
})

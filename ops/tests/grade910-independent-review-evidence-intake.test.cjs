'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const mod=require('../qbank/validate-grade910-independent-review-evidence.cjs')
const source=require('../qbank/attest-grade910-all-original-candidate-revisions.cjs')
const frozen=source.assertFrozen(source.loadInputs())
const indexed=mod.indexOriginals(frozen)
const original=[...indexed.values()][0]
const hex='a'.repeat(64),answerHash='b'.repeat(64)
const bilingualOriginal=[...indexed.values()].find(q=>q.requiresUrduParityReview)
const dualValid=()=>{
 const r=valid()
 r.originalQuestionId=bilingualOriginal.originalQuestionId
 r.originalQuestionRevisionSha256=bilingualOriginal.originalQuestionRevisionSha256
 r.originalFileSha256=bilingualOriginal.sourceSha
 r.medium='dual'
 return r
}
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
 let r=dualValid()
 assert.throws(()=>mod.run({reviews:[r]}),/INDEPENDENT_URDU_REVIEW_MISSING/)
 r.urduTranslationReviewerId='teacherUrdu3'
 r.urduTranslationReviewEvidenceRef='ur/3'
 assert.equal(mod.run({reviews:[r]}).rows[0].publisherSelectable,false)
})
test('repeat revision review packets cannot falsely inflate reviewed count',()=>{
 const r=valid()
 assert.throws(()=>mod.run({reviews:[r,r]}),/DUPLICATE_REVIEW_REVISION/)
})

test('frozen bilingual source cannot be downgraded by reviewer packet medium',()=>{
 const sourceDual=[...indexed.values()].find(q=>q.requiresUrduParityReview)
 assert.ok(sourceDual,'original frozen Grade IX Biology bilingual question must exist')
 const r=valid()
 r.originalQuestionId=sourceDual.originalQuestionId
 r.originalQuestionRevisionSha256=sourceDual.originalQuestionRevisionSha256
 r.originalFileSha256=sourceDual.sourceSha
 r.medium='english'
 assert.throws(()=>mod.run({reviews:[r]}),/FROZEN_DUAL_MEDIUM_DOWNGRADE/)
 r.medium='dual'
 assert.throws(()=>mod.run({reviews:[r]}),/INDEPENDENT_URDU_REVIEW_MISSING/)
 r.urduTranslationReviewerId='qualifiedUrduReviewer3'
 r.urduTranslationReviewEvidenceRef='urdu-signoff-pending/3'
 const intake=mod.run({reviews:[r]})
 assert.equal(intake.rows[0].publisherSelectable,false)
 assert.equal(intake.authenticatedAcademicApprovals,0)
})
test('malformed review checks fail closed with stable academic error',()=>{
 for(const invalid of [null,false,'curriculumApplicability',[]]){
  const r=valid();r.checks[0]=invalid
  assert.throws(()=>mod.run({reviews:[r]}),/ACADEMIC_REVIEW_INTAKE_REQUIRED_SIGNED_REVISION_SPECIFIC_CHECKS_INCOMPLETE/)
 }
})

test('dual-medium review requires a distinct qualified Urdu reviewer identity',()=>{
 const r=dualValid()
 r.urduTranslationReviewerId=r.independentReviewerId
 r.urduTranslationReviewEvidenceRef='urdu/qualified'
 assert.throws(()=>mod.run({reviews:[r]}),/DUAL_LANGUAGE_INDEPENDENT_URDU_REVIEW_MISSING/)
 r.urduTranslationReviewerId=' teacherUrdu3 '
 assert.throws(()=>mod.run({reviews:[r]}),/DUAL_LANGUAGE_INDEPENDENT_URDU_REVIEW_MISSING/)
 r.urduTranslationReviewerId='teacherUrdu3'
 assert.equal(mod.run({reviews:[r]}).authenticatedAcademicApprovals,0)
})
test('non-string blank evidence and actor IDs never pass evidence intake',()=>{
 for(const key of ['reviewerSubjectQualificationRef','schoolAdoptionEvidenceRef',
  'reviewerSignatureEvidenceRef','schoolAcademicApprovalEvidenceRef']){
  for(const invalid of ['  ', {path:'fake'}, ['fake']]){
   const r=valid();r[key]=invalid
   assert.throws(()=>mod.run({reviews:[r]}),/ACADEMIC_REVIEW_INTAKE_/)
  }
 }
 for(const key of ['authorId','independentReviewerId']){
  const r=valid();r[key]='  '
  assert.throws(()=>mod.run({reviews:[r]}),/REVIEWER_IDENTITY_MISSING_OR_NOT_INDEPENDENT/)
 }
 const r=valid();r.checks[0].evidenceRef={url:'fake'}
 assert.throws(()=>mod.run({reviews:[r]}),/CHECKS_INCOMPLETE/)
})
test('signed faculty review chronology must be a real canonical UTC timestamp',()=>{
 for(const bad of ['2026-02-30T12:00:00Z','yesterday','2026-10-10','2026-10-10T12:00:00+05:00']){
  const r=valid();r.reviewedAt=bad
  assert.throws(()=>mod.run({reviews:[r]}),/SIGNED_REVIEW_OR_SCHOOL_APPROVAL_MISSING/)
 }
 const r=valid();r.approvedAt='2026-10-10T11:59:59Z'
 assert.throws(()=>mod.run({reviews:[r]}),/SIGNED_REVIEW_OR_SCHOOL_APPROVAL_MISSING/)
})

test('medium identity for all 2581 frozen originals is not reviewer-editable',()=>{
 const totals={}
 for(const q of indexed.values())totals[q.sourceMedium]=(totals[q.sourceMedium]||0)+1
 assert.deepEqual(totals,{english:1512,urdu:971,dual:48,'':50})
 const originalUrdu=[...indexed.values()].find(q=>q.sourceMedium==='urdu')
 const r=valid()
 r.originalQuestionId=originalUrdu.originalQuestionId
 r.originalQuestionRevisionSha256=originalUrdu.originalQuestionRevisionSha256
 r.originalFileSha256=originalUrdu.sourceSha
 assert.throws(()=>mod.run({reviews:[r]}),/FROZEN_ORIGINAL_MEDIUM_MISMATCH/)
 r.medium='urdu'
 assert.equal(mod.run({reviews:[r]}).authenticatedAcademicApprovals,0)
 const unknown=[...indexed.values()].find(q=>q.sourceMedium==='')
 r.originalQuestionId=unknown.originalQuestionId
 r.originalQuestionRevisionSha256=unknown.originalQuestionRevisionSha256
 r.originalFileSha256=unknown.sourceSha
 assert.throws(()=>mod.run({reviews:[r]}),/FROZEN_ORIGINAL_MEDIUM_UNRESOLVED/)
})
test('single-language original cannot be relabelled dual by packet alone',()=>{
 const r=valid();r.medium='dual'
 r.urduTranslationReviewerId='independentUrduReviewer'
 r.urduTranslationReviewEvidenceRef='evidence/urdu'
 assert.throws(()=>mod.run({reviews:[r]}),/FROZEN_ORIGINAL_MEDIUM_MISMATCH/)
})

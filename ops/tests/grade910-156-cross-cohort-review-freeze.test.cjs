'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const gate=require('../qbank/attest-grade910-156-cohort-review-freeze.cjs')
const copy=()=>{
 const x=gate.loadInputs()
 return {snapshot:structuredClone(x.snapshot),registry:structuredClone(x.registry),
  groups:x.groups.map(g=>({...g,bytes:Buffer.from(g.bytes),payload:structuredClone(g.payload)}))}
}
const pass=()=>gate.attest(copy())
test('all 19 source groups with 741 original source IDs and 156 separate draft IDs attested read-only',()=>{
 const d=pass()
 assert.equal(d.authOriginalQuestionCandidates,2581)
 assert.equal(d.authenticRawQuestionIdsWithinNineteenSourceCohorts,741)
 assert.equal(d.authenticProvisionalSourceGroups,19)
 assert.equal(d.sourceCryptographicallyMatchedOriginalIds,156)
 assert.equal(d.sourceAuthenticMarkingPointProposals,798)
 assert.equal(new Set(d.questionReviewIntake.map(q=>q.questionId)).size,156)
 assert.equal(d.admissionDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('all 156 original/proposed question reviewer statuses explicitly deny approval and publication',()=>{
 for(const q of pass().questionReviewIntake){
  assert.equal(q.schoolAdoptionVerified,false)
  assert.equal(q.sourcePrintedPageVerified,false)
  assert.equal(q.qualifiedTeacherReviewed,false)
  assert.equal(q.urduEquivalenceReviewed,false)
  assert.equal(q.approvedRevisionId,null)
  assert.equal(q.approved,false)
  assert.equal(q.published,false)
 }
})
test('individual cohort raw source byte tampering is rejected',()=>{
 const x=copy();x.groups[5].bytes[0]^=1
 assert.throws(()=>gate.attest(x),/REVIEW_FREEZE_SOURCE_RAW_SHA_DRIFT/)
})
test('packet contents with changed original question hash are rejected',()=>{
 const x=copy();x.groups[0].payload.items[0].originalQuestionSha256='a'.repeat(64)
 assert.throws(()=>gate.attest(x),/REVIEW_FREEZE_ORIGINAL_QUESTION_ANSWER_OR_PDF_SHA_DRIFT/)
})
test('packet contents with changed original answer hash are rejected',()=>{
 const x=copy();x.groups[1].payload.items[0].originalAnswerSha256='a'.repeat(64)
 assert.throws(()=>gate.attest(x),/REVIEW_FREEZE_ORIGINAL_QUESTION_ANSWER_OR_PDF_SHA_DRIFT/)
})
test('source claimed PDF identity different from registry is rejected',()=>{
 const x=copy();x.registry.entries.find(q=>q.recordId==='pectaa-catalog-007').pdfSha256='b'.repeat(64)
 assert.throws(()=>gate.attest(x),/REVIEW_FREEZE_PROVISIONAL_CATALOG_IDENTITY_DRIFT/)
})
test('catalog purported academic approval true fails despite proposal statuses false',()=>{
 const x=copy();x.registry.entries.find(q=>q.recordId==='pectaa-catalog-007').academicApproval=true
 assert.throws(()=>gate.attest(x),/REVIEW_FREEZE_PROVISIONAL_CATALOG_IDENTITY_DRIFT/)
})
test('duplicate question ID within or across cohorts fails before row count inflation',()=>{
 const x=copy();x.groups[0].payload.items[1].questionId=x.groups[0].payload.items[0].questionId
 assert.throws(()=>gate.attest(x),/REVIEW_FREEZE_DUPLICATE_OR_ORPHAN_ORIGINAL_ID/)
})
test('forged qualified faculty review or approval is rejected and never becomes published',()=>{
 for(const [index,field,value] of [[0,'qualifiedSubjectReviewed',true],[1,'academicApproved',true],
  [2,'published',true],[12,'academicallyApproved',true]]){
  const x=copy();x.groups[index].payload.items[0][field]=value
  assert.throws(()=>gate.attest(x),/REVIEW_FREEZE_FRAUDULENT_OR_MISSING_REVIEW_GATE/)
 }
})
test('forged named reviewer or approved revision is rejected',()=>{
 const a=copy();a.groups[0].payload.items[0].independentReviewerId='fake'
 assert.throws(()=>gate.attest(a),/REVIEW_FREEZE_FABRICATED_HUMAN_REVIEWER_OR_REVISION/)
 const b=copy();b.groups[0].payload.items[0].approvedQuestionRevisionId='fake'
 assert.throws(()=>gate.attest(b),/REVIEW_FREEZE_FABRICATED_HUMAN_REVIEWER_OR_REVISION/)
})
test('removing explicitly false review signoff gate is rejected even if no approval is asserted',()=>{
 const x=copy();delete x.groups[0].payload.items[0].qualifiedSubjectReviewed
 assert.throws(()=>gate.attest(x),/REVIEW_FREEZE_SCHEMA_ALIAS_AMBIGUOUS/)
})
test('changed marks, too few marking criteria or duplicated marking criteria fail-closed',()=>{
 const x=copy();x.groups[0].payload.items[0].marks=6
 assert.throws(()=>gate.attest(x),/REVIEW_FREEZE_SOURCE_MARKS_DRIFT/)
 const y=copy();y.groups[0].payload.items[0].proposedSeparateMarkingCriteria.pop()
 assert.throws(()=>gate.attest(y),/REVIEW_FREEZE_RUBRIC_CRITERIA_DRIFT/)
 const z=copy();z.groups[0].payload.items[0].proposedSeparateMarkingCriteria[0]=z.groups[0].payload.items[0].proposedSeparateMarkingCriteria[1]
 assert.throws(()=>gate.attest(z),/REVIEW_FREEZE_RUBRIC_CRITERIA_DRIFT/)
})
test('deleting a cohort, swapping cohort source or omitting source hash fails',()=>{
 const x=copy();x.groups.pop()
 assert.throws(()=>gate.attest(x),/REVIEW_FREEZE_CUMULATIVE_SNAPSHOT_DRIFT/)
 const y=copy();y.groups[0].source=y.groups[1].source
 assert.throws(()=>gate.attest(y),/REVIEW_FREEZE_GROUP_IDENTITY_OR_PATH_DRIFT/)
 const z=copy();delete z.groups[0].payload.sourceFileSha256
 assert.throws(()=>gate.attest(z),/REVIEW_FREEZE_SCHEMA_ALIAS_AMBIGUOUS/)
})
test('all 10 deferred safety/backlog IDs and three semantic overlap pairs remain visible and unreviewed',()=>{
 const d=pass()
 assert.equal(d.remainingWithoutExplanatoryResearch.length,10)
 assert.equal(d.intentionallyDeferredResearch.length,2)
 assert.ok(d.remainingWithoutExplanatoryResearch.includes('IX-CHEM-2025-C11-T4-02L'))
 assert.equal(d.potentialSemanticOverlapsPendingFaculty.length,3)
 assert.ok(d.potentialSemanticOverlapsPendingFaculty.every(a=>a.independentFacultyDuplicateReview===false))
})
test('cannot launder pending ID by silently pretending it was already answered',()=>{
 const x=copy();x.snapshot.remainingOriginalQuestionIds[0]='IX-CHEM-2025-C11-T1-01L'
 assert.throws(()=>gate.attest(x),/REVIEW_FREEZE_REMAINING_BACKLOG_OR_DUPLICATE_DRIFT/)
})
test('saved read-only report equals fresh attestation and reviewer Markdown clearly blocks release',()=>{
 const d=pass()
 const stored=JSON.parse(fs.readFileSync('docs/question-bank/ASSPS_GRADE910_156_CROSS_COHORT_REVIEW_FREEZE_20261009.json'))
 assert.deepEqual(d,stored)
 const md=gate.markdown(d)
 assert.match(md,/FAIL CLOSED/)
 assert.match(md,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
 assert.match(md,/exact printed exercise-page/)
 assert.match(md,/X-CHEM-C18-L01/)
})

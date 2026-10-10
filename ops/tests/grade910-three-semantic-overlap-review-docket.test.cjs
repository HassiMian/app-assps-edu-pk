'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const auditor=require('../qbank/attest-grade910-three-overlap-faculty-docket.cjs')
const version14=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
function copy(){
 const x=auditor.loadInputs()
 return {ledgerBytes:Buffer.from(x.ledgerBytes),snapshots:x.snapshots.map(z=>({
  ...z,sourceBytes:Buffer.from(z.sourceBytes),packetBytes:Buffer.from(z.packetBytes)}))}
}
test('three unadjudicated Chemistry IX semantic pairs bind SIX distinct source-authored IDs',()=>{
 const d=auditor.assertPinned(copy())
 assert.equal(d.potentialUnadjudicatedPairs,3)
 assert.equal(d.distinctSourceQuestionRevisionsChecked,6)
 assert.equal(d.candidateSourceFilesChecked,3)
 const ids=d.potentialOverlapReviewDockets.flatMap(p=>p.originalQuestionIds)
 assert.equal(new Set(ids).size,6)
 assert.deepEqual(ids,[
  'IX-CHEM-2025-C07-T05-L01','IX-CHEM-2025-C10-T3-01L',
  'IX-CHEM-2025-C11-T1-01L','IX-CHEM-2025-C11-T1-02L',
  'IX-CHEM-2025-C11-T3-01L','IX-CHEM-2025-C11-T3-02L'
 ])
})
test('no automatic duplicate or distinct-answer certification is fabricated',()=>{
 const d=auditor.build(copy())
 assert.equal(d.duplicatePairsConfirmedByIndependentFaculty,0)
 assert.equal(d.distinctPairsCertifiedByIndependentFaculty,0)
 assert.equal(d.completeQualifiedIndependentFacultyReviews,0)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
 assert.equal(d.decision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
 for(const p of d.potentialOverlapReviewDockets){
  for(const key of ['independentFacultyDecision','independentReviewerId','academicRationale','reviewerSignature','approvalRevisionHash'])assert.equal(p[key],null)
  for(const key of ['independentlyReviewed','academicallyApproved','verifiedPublished','sourceEditionAndPrintedPageVerified','independentQualifiedChemistryReviewCompleted'])assert.equal(p[key],false)
 }
})
test('all six original AND separately proposed answer revisions are SHA256 bound',()=>{
 for(const p of auditor.build(copy()).potentialOverlapReviewDockets){
  assert.equal(p.questions.length,2)
  assert.ok(p.reviewQuestion.includes('?'))
  assert.equal(p.reviewerDecisionOptionsForFutureIndependentReview.length,3)
  for(const q of p.questions){
   for(const name of ['originalQuestionSha256','originalAnswerRubricSha256','proposedAnswerRevisionSha256'])assert.match(q[name],/^[0-9a-f]{64}$/)
   assert.ok(q.originalAuthoredQuestionStem.length>20)
   assert.equal(q.proposedFiveMarkCriteria.length,5)
   assert.equal(q.grade,9)
   assert.equal(q.medium,'English')
   assert.equal(q.marks,5)
   assert.equal(q.academicallyApproved,false)
   assert.equal(q.published,false)
   assert.equal(q.qualifiedIndependentReviewerId,null)
  }
 }
})
test('Ch7 vs Ch10 acid-rain pair has distinct topic IDs but is not certified unique',()=>{
 const p=auditor.build(copy()).potentialOverlapReviewDockets[0]
 assert.deepEqual(p.questions.map(q=>q.chapterNumber),[7,10])
 assert.deepEqual(p.questions.map(q=>q.topicId),['7.5','10.3'])
 assert.match(p.reviewQuestion,/emissions-control objective/i)
 assert.ok(p.questions.every(q=>/acid rain/i.test(q.originalAuthoredQuestionStem)))
 assert.equal(p.independentFacultyDecision,null)
})
test('Chapter11 classification and naming candidate pairs remain pending faculty decision',()=>{
 const d=auditor.build(copy())
 assert.deepEqual(d.potentialOverlapReviewDockets.slice(1).map(p=>p.questions[0].chapterNumber),[11,11])
 assert.ok(d.potentialOverlapReviewDockets.slice(1).every(p=>p.independentFacultyDecision===null))
})
for(const [chapter] of [[7],[10],[11]]){
 test('original Chapter '+chapter+' source byte tamper fails before any false review claim',()=>{
  const x=copy(),p=x.snapshots.find(z=>z.originalAuthoredSource.includes('Chapter'+chapter))
  p.sourceBytes[0]^=1
  assert.throws(()=>auditor.build(x),/SEMANTIC_PAIR_ORIGINAL_SOURCE_BYTES_CHANGED/)
 })
}
test('modified research marking point is rejected by original cohort SHA pin',()=>{
 const x=copy(),p=x.snapshots.find(z=>z.originalAuthoredSource.includes('Chapter7'))
 const d=JSON.parse(p.packetBytes)
 d.items[4].proposedDistinctMarkingPoints[0]+=' unreviewed change'
 p.packetBytes=Buffer.from(JSON.stringify(d,null,2)+'\n')
 assert.throws(()=>auditor.build(x),/SEMANTIC_PAIR_PINNED_ANSWER_PACKET_OR_SOURCE_IDENTITY_CHANGED/)
})
test('changed packet metadata cannot inherit pinned answer review',()=>{
 const x=copy(),p=x.snapshots.find(z=>z.originalAuthoredSource.includes('Chapter11'))
 const d=JSON.parse(p.packetBytes);d.reviewStatus='approved'
 p.packetBytes=Buffer.from(JSON.stringify(d,null,2)+'\n')
 assert.throws(()=>auditor.build(x),/SEMANTIC_PAIR_PINNED_ANSWER_PACKET_OR_SOURCE_IDENTITY_CHANGED/)
})
test('invented original source ID in existing report is rejected',()=>{
 const x=copy(),d=JSON.parse(x.ledgerBytes)
 d.semanticOverlapReviewCandidates[0].sourceQuestionIds[0]='IX-CHEM-INVENTED'
 x.ledgerBytes=Buffer.from(JSON.stringify(d,null,2)+'\n')
 assert.throws(()=>auditor.build(x),/SEMANTIC_PAIR_EXISTING_161_LEDGER_RAW_SHA_DRIFT/)
})
test('forged faculty duplicate decision in existing source report is rejected',()=>{
 const x=copy(),d=JSON.parse(x.ledgerBytes)
 d.semanticOverlapReviewCandidates[2].independentFacultyDuplicateReview=true
 x.ledgerBytes=Buffer.from(JSON.stringify(d,null,2)+'\n')
 assert.throws(()=>auditor.build(x),/SEMANTIC_PAIR_EXISTING_161_LEDGER_RAW_SHA_DRIFT/)
})
test('changed original answer source packet identity fails closed',()=>{
 const x=copy();x.snapshots[1].researchAnswerPacket='fabricated.json'
 assert.throws(()=>auditor.build(x),/SEMANTIC_PAIR_COHORT_IDENTITY_DRIFT/)
})
test('missing original Chapter 11 cohort fails closed',()=>{
 const x=copy();x.snapshots.pop()
 assert.throws(()=>auditor.build(x),/SEMANTIC_PAIR_FLAGGED_PAIR_SCOPE_CHANGED/)
})
test('duplicated source cohort cannot satisfy SIX original question references',()=>{
 const x=copy();x.snapshots[2]={...x.snapshots[1]}
 assert.throws(()=>auditor.build(x),/SEMANTIC_PAIR_COHORT_IDENTITY_DRIFT/)
})
test('generated immutable faculty review dossier exactly matches and rejects tamper',()=>{
 const result=auditor.assertPinned(copy())
 const disk=JSON.parse(fs.readFileSync('docs/question-bank/'+auditor.OUTPUT+'.json'))
 assert.deepEqual(result,disk)
 const tamper=Buffer.from(fs.readFileSync('docs/question-bank/'+auditor.OUTPUT+'.json'));tamper[101]^=1
 assert.throws(()=>auditor.assertPinned(copy(),tamper),/SEMANTIC_PAIR_PINNED_FACULTY_DOCKET_SHA_CHANGED/)
})
test('full 161-research coverage now requires three-pair source verified docket and still denies publication',()=>{
 const d=version14.reconcile(version14.loadInputs())
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
 assert.equal(d.originalRubricOnlyIdsWithoutNewAnswerDraft,5)
})
test('human review-facing document displays original stems and preserves unresolved status',()=>{
 const text=auditor.markdown(auditor.build(copy()))
 assert.match(text,/No question is declared a duplicate/)
 assert.match(text,/No faculty decision exists yet/)
 assert.match(text,/do NOT establish actual ASSPS adopted textbooks/)
 assert.match(text,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
})

'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const a=require('../qbank/author-chemistry9-ch13-five-original-answers.cjs')
const c=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
const bytes=fs.readFileSync(a.INPUT),src=JSON.parse(bytes)
const registry=JSON.parse(fs.readFileSync(a.REGISTRY))
const build=()=>a.build({bytes,source:src,registry})
const ids=['IX-CHEM-2025-C13-13T1-L01','IX-CHEM-2025-C13-13T2-L01',
 'IX-CHEM-2025-C13-13T3-L01','IX-CHEM-2025-C13-13T4-L01',
 'IX-CHEM-2025-C13-13T5-L01']
test('original source SHA, exact five original Ch13 IDs and 25 source-long/short/MCQ totals',()=>{
 const d=build()
 assert.equal(d.schemaVersion,'assps-chemistry9-ch13-five-original-safety-answer-research-v1')
 assert.equal(d.originalFileSha256,'c328c074b6caa9632712fa3007a7e457eac87a62e9bd5085114f35842463dc69')
 assert.equal(d.originalAuthoredResearchQuestions,25)
 assert.equal(d.originalRubricOnlyLongQuestions,5)
 assert.deepEqual(d.items.map(q=>q.questionId),ids)
})
test('five individual concepts have five distinct answer criteria and the source original marks',()=>{
 const d=build()
 assert.equal(d.newFiveMarkPointProposals,25)
 for(const q of d.items){
  assert.equal(q.chapterNo,13)
  assert.equal(q.marks,5)
  assert.ok(q.proposedIndependentEnglishExplanation.length>300)
  assert.equal(q.proposedDistinctMarkingPoints.length,5)
  assert.equal(new Set(q.proposedDistinctMarkingPoints).size,5)
  assert.equal(q.originalQuestionUnchanged,true)
 }
})
test('all five conceptual responses emphasize school responsibility and student supervision',()=>{
 const answers=build().items.map(q=>q.proposedIndependentEnglishExplanation)
 assert.match(answers[0],/trained staff/)
 assert.match(answers[1],/qualified teacher/)
 assert.match(answers[2],/responsible teacher/)
 assert.match(answers[3],/trained adults/)
 assert.match(answers[4],/qualified staff/)
 for(const answer of answers)assert.doesNotMatch(answer,/experimental synthesis|recipe|precise quantities|step.by.step chemical operation/i)
})
test('research drafts cannot falsely claim physical adopted source review, Urdu equivalence or qualified signoff',()=>{
 for(const q of build().items){
  for(const k of ['schoolAdoptedEditionSessionVerified','originalPrintedExercisePageVerified',
   'qualifiedIndependentSubjectReviewed','urduEquivalenceReviewed','academicallyApproved','verifiedPublished'])
   assert.equal(q[k],false,k+':'+q.questionId)
  assert.equal(q.independentReviewerId,null)
  assert.equal(q.approvedRevisionId,null)
 }
})
test('original raw source tamper rejects before drafting',()=>{
 const b=Buffer.from(bytes);b[b.length-2]^=1
 assert.throws(()=>a.build({bytes:b,source:src,registry}),/CHEM9C13_SOURCE_SHA_DRIFT/)
})
test('changed original parsed question marks fails source lock',()=>{
 const s=structuredClone(src);s.drafts.find(q=>q.type==='long').marks=8
 assert.throws(()=>a.build({bytes,source:s,registry}),/CHEM9C13_SOURCE_SHA_DRIFT/)
})
test('official source identity claims cannot be replaced by fabricated approval',()=>{
 const r=structuredClone(registry)
 r.entries.find(q=>q.recordId==='pectaa-catalog-007').academicApproval=true
 assert.throws(()=>a.build({bytes,source:src,registry:r}),/CHEM9C13_CATALOG_DRIFT_OR_FALSE_APPROVAL/)
})
test('additive v14 has 161 unique existing original research IDs and exactly five unaddressed originals',()=>{
 const d=c.reconcile(c.loadInputs())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.correctedRubricOnlyOriginals,166)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(d.separateMarkingPointProposals,823)
 assert.equal(d.originalRubricOnlyIdsWithoutNewAnswerDraft,5)
 assert.equal(d.sourceGroups.length,20)
 assert.equal(d.predecessorFrozenResearchAnswerIds,156)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
 assert.equal(d.academicReleaseDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('only Chapter 11 and Grade X deferred original IDs remain without explanations',()=>{
 const d=c.reconcile(c.loadInputs())
 assert.deepEqual(d.remainingOriginalQuestionIds,[
  'IX-CHEM-2025-C11-T4-01L','IX-CHEM-2025-C11-T4-02L',
  'X-CHEM-C18-L01','X-CHEM-C23-L01','X-CHEM-C24-L01'])
 for(const id of ids)assert.ok(!d.remainingOriginalQuestionIds.includes(id))
})
test('all preexisting three potential conceptual overlap pairs remain unapproved',()=>{
 const d=c.reconcile(c.loadInputs())
 assert.equal(d.semanticOverlapReviewCandidates.length,3)
 assert.ok(d.semanticOverlapReviewCandidates.every(p=>p.independentFacultyDuplicateReview===false))
})
test('fraudulent academic published flag inside supplemental answer packet fails closed',()=>{
 const x=c.loadInputs();x.packet.items[0].academicallyApproved=true
 assert.throws(()=>c.reconcile(x),/COVERAGE161_NEW_PACKET_TAMPERED_OR_APPROVED/)
})
test('modified explanatory answer, original question or marking criteria fails current packet fingerprint',()=>{
 for(const mutate of [
  q=>{q.proposedIndependentEnglishExplanation+=' unauthorized revision'},
  q=>{q.sourceQuestionSha256='f'.repeat(64)},
  q=>{q.proposedDistinctMarkingPoints[0]+=' unauthorized change'}]){
  const x=c.loadInputs();mutate(x.packet.items[0])
  assert.throws(()=>c.reconcile(x),/COVERAGE161_NEW_PACKET_TAMPERED_OR_APPROVED/)
 }
})
test('old preceding 156 answers must pass previously frozen revision-signature check',()=>{
 const d=c.reconcile(c.loadInputs())
 assert.equal(d.predecessorFrozenResearchAnswerIds,156)
 assert.match(d.inheritedRevisionManifest,/156_PROPOSED_ANSWER_REVISION_PINS/)
})
test('v14 JSON and Markdown exactly regenerated and publication still denied',()=>{
 const d=c.reconcile(c.loadInputs())
 const disk=JSON.parse(fs.readFileSync('docs/question-bank/ASSPS_GRADE910_161_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json'))
 assert.deepEqual(d,disk)
 const m=c.markdown(d)
 assert.match(m,/Original IDs without supplemental explanations: 5/)
 assert.match(m,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
 assert.match(a.markdown(build()),/no chemical-handling/)
})

'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const author=require('../qbank/author-chemistry9-ch9-five-original-answers.cjs')
const cover=require('../qbank/reconcile-grade910-answer-coverage-147.cjs')
const bytes=fs.readFileSync(author.INPUT),source=JSON.parse(bytes)
const registry=JSON.parse(fs.readFileSync(author.REGISTRY))
const build=()=>author.build({bytes,source,registry})
test('exact original Grade IX Chemistry Ch9 source hash and all five unchanged long-question IDs',()=>{
 const d=build()
 assert.equal(d.originalFileSha256,'59f4914435b0e1fd542dc8d0adb9579afdff0e73777f6218cdd17ad015895884')
 assert.equal(d.originalAuthoredResearchQuestions,25)
 assert.equal(d.originalRubricOnlyLongQuestions,5)
 assert.deepEqual(d.items.map(q=>q.questionId),[
 'IX-CHEM-2025-C09-T01-L01','IX-CHEM-2025-C09-T02-L01','IX-CHEM-2025-C09-T03-L01',
 'IX-CHEM-2025-C09-T04-L01','IX-CHEM-2025-C09-T05-L01'])
})
test('five independent conceptual prose proposals contain exactly 25 unique marking criteria',()=>{
 const d=build()
 assert.equal(d.newFiveMarkPointProposals,25)
 for(const q of d.items){
  assert.equal(q.marks,5);assert.ok(q.proposedIndependentEnglishExplanation.length>=280,q.questionId)
  assert.equal(new Set(q.proposedDistinctMarkingPoints).size,5)
  assert.ok(q.proposedDistinctMarkingPoints.every(s=>s.length>=18))
  assert.equal(q.originalQuestionUnchanged,true)
 }
})
test('scientific caveats address halogen physical states, noble-gas exceptions, transition metals and graphite',()=>{
 const q=build().items.map(x=>x.proposedIndependentEnglishExplanation)
 assert.match(q[0],/density does not increase uniformly/i)
 assert.match(q[1],/bromine is a liquid/)
 assert.match(q[2],/mercury/)
 assert.match(q[3],/xenon/)
 assert.match(q[4],/graphite/)
})
test('unverified school edition, printed page, Urdu and faculty signoffs remain false/null',()=>{
 for(const q of build().items){
  for(const key of ['schoolAdoptedEditionSessionVerified','originalPrintedExercisePageVerified',
  'qualifiedIndependentSubjectReviewed','urduEquivalenceReviewed','academicallyApproved','verifiedPublished'])
   assert.equal(q[key],false,key+':'+q.questionId)
  assert.equal(q.independentReviewerId,null);assert.equal(q.approvedRevisionId,null)
 }
})
test('raw source bytes tampering fails closed',()=>{
 const b=Buffer.from(bytes);b[b.length-2]^=1
 assert.throws(()=>author.build({bytes:b,source,registry}),/CHEM9C9_SOURCE_SHA_DRIFT/)
})
test('altered original marks in parsed question cannot be laundered into source-locked author packet',()=>{
 const s=structuredClone(source);s.drafts.find(x=>x.type==='long').marks=8
 assert.throws(()=>author.build({bytes,source:s,registry}),/CHEM9C9_SOURCE_SHA_DRIFT/)
})
test('source-registry false academic signoff fails closed',()=>{
 const r=structuredClone(registry)
 r.entries.find(x=>x.recordId==='pectaa-catalog-007').academicApproval=true
 assert.throws(()=>author.build({bytes,source,registry:r}),/CHEM9C9_CATALOG_DRIFT_OR_FALSE_APPROVAL/)
})
test('v11 reconciles 147 unique original IDs, 753 marking criteria, 17 original source groups and 19 remaining',()=>{
 const d=cover.reconcile(cover.loadInputs())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.correctedRubricOnlyOriginals,166)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,147)
 assert.equal(d.separateMarkingPointProposals,753)
 assert.equal(d.originalRubricOnlyIdsWithoutNewAnswerDraft,19)
 assert.equal(d.sourceGroups.length,17)
 assert.equal(new Set(d.remainingOriginalQuestionIds).size,19)
 assert.equal(d.academicallyApproved,0);assert.equal(d.verifiedPublished,0)
})
test('old Chapter 7-10 acid-rain potential conceptual overlap remains unreviewed',()=>{
 const d=cover.reconcile(cover.loadInputs())
 assert.deepEqual(d.semanticOverlapReviewCandidates[0].sourceQuestionIds,[
  'IX-CHEM-2025-C07-T05-L01','IX-CHEM-2025-C10-T3-01L'])
 assert.equal(d.semanticOverlapReviewCandidates[0].independentFacultyDuplicateReview,false)
})
test('all five original Chapter 9 IDs leave unapproved backlog while three Chemistry X practical originals remain held',()=>{
 const pending=new Set(cover.reconcile(cover.loadInputs()).remainingOriginalQuestionIds)
 for(const q of build().items)assert.ok(!pending.has(q.questionId))
 for(const x of ['X-CHEM-C18-L01','X-CHEM-C23-L01','X-CHEM-C24-L01'])assert.ok(pending.has(x),x)
})
test('tampered answer packet and false review do not inflate v11 source reconciliation',()=>{
 let x=cover.loadInputs();x.packet.items[0].academicallyApproved=true
 assert.throws(()=>cover.reconcile(x),/COVERAGE147_PACKET_TAMPERED_OR_STALE/)
 x=cover.loadInputs();x.packet.items[0].proposedDistinctMarkingPoints[1]='fabrication'
 assert.throws(()=>cover.reconcile(x),/COVERAGE147_PACKET_TAMPERED_OR_STALE/)
})
test('duplicate Chapter 8 original ID cannot masquerade as newly authored Chapter 9 original',()=>{
 const x=cover.loadInputs();x.packet.items[0].questionId='IX-CHEM-2025-C08-T01-L01'
 assert.throws(()=>cover.reconcile(x),/COVERAGE147_PACKET_TAMPERED_OR_STALE|COVERAGE147_DUPLICATE_OR_NOT_IN_BACKLOG/)
})
test('current generated JSON and Markdown report exactly reflect source-locked v11 counts',()=>{
 const d=cover.reconcile(cover.loadInputs())
 const stored=JSON.parse(fs.readFileSync('docs/question-bank/ASSPS_GRADE910_147_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json'))
 assert.deepEqual(d,stored)
 const m=cover.markdown(d)
 assert.match(m,/19 remaining original research IDs/)
 assert.match(m,/16 Chemistry IX/)
 assert.ok(m.includes('academic approved **0**'))
 assert.match(author.markdown(build()),/18-1-periodicity/)
 assert.doesNotMatch(author.markdown(build()),/acidrain|Brønsted acid/)
})

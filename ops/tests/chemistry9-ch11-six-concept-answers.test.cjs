'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const author=require('../qbank/author-chemistry9-ch11-six-original-answers.cjs')
const cover=require('../qbank/reconcile-grade910-answer-coverage-156.cjs')
const bytes=fs.readFileSync(author.INPUT),source=JSON.parse(bytes)
const registry=JSON.parse(fs.readFileSync(author.REGISTRY))
const build=()=>author.build({bytes,source,registry})
const ids=['IX-CHEM-2025-C11-T1-01L','IX-CHEM-2025-C11-T1-02L',
'IX-CHEM-2025-C11-T2-01L','IX-CHEM-2025-C11-T2-02L',
'IX-CHEM-2025-C11-T3-01L','IX-CHEM-2025-C11-T3-02L']
const deferred=['IX-CHEM-2025-C11-T4-01L','IX-CHEM-2025-C11-T4-02L']
test('original 24-question Ch11 source SHA and eight original longs pinned; only six safe conceptual drafts',()=>{
 const d=build()
 assert.equal(d.originalFileSha256,'e27178c2fabc7fc63fed68f12fdaeb8c1e7dfb085e9962fd3e7ab1e410c4825b')
 assert.equal(d.originalAuthoredResearchQuestions,24)
 assert.equal(d.originalRubricOnlyLongQuestions,8)
 assert.equal(d.schemaVersion,'assps-chemistry9-ch11-six-original-answer-research-v1')
 assert.deepEqual(d.items.map(q=>q.questionId),ids)
 assert.deepEqual(d.deferredExistingOriginalIds,deferred)
 assert.equal(new Set([...ids,...deferred]).size,8)
})
test('six individual explanations and exactly 30 original question mark-aligned rubric criteria',()=>{
 const d=build();assert.equal(d.newFiveMarkPointProposals,30)
 for(const q of d.items){
  assert.equal(q.chapterNo,11);assert.equal(q.marks,5)
  assert.ok(q.proposedIndependentEnglishExplanation.length>=280,q.questionId)
  assert.equal(q.proposedDistinctMarkingPoints.length,5)
  assert.equal(new Set(q.proposedDistinctMarkingPoints).size,5)
  assert.equal(q.originalQuestionUnchanged,true)
 }
})
test('ethane, propane, alkane formulas, branched 2-methylbutane and cycloalkane caveat correct',()=>{
 const a=build().items.map(x=>x.proposedIndependentEnglishExplanation)
 assert.match(a[0],/cycloalkane/)
 assert.match(a[1],/ethene and ethyne/)
 assert.match(a[2],/CnH\(2n\+2\)/)
 assert.match(a[3],/C2H6/)
 assert.match(a[3],/C3H8/)
 assert.match(a[4],/2-methylbutane/)
 assert.match(a[5],/CH3–CH\(CH3\)–CH2–CH3/)
 for(const [n,h] of [[2,6],[3,8],[5,12]])assert.equal(2*n+2,h)
})
test('two reaction/preparation source originals deferred; no laboratory instructions in six draft explanations',()=>{
 const d=build()
 assert.deepEqual(d.deferredExistingOriginalIds,deferred)
 assert.match(d.deferredReason,/QUALIFIED_FACULTY/)
 for(const id of deferred)assert.ok(!d.items.some(x=>x.questionId===id))
 for(const q of d.items)assert.doesNotMatch(q.proposedIndependentEnglishExplanation,/step.by.step|apparatus|reaction temperature|synthesis procedure|heat.*chemical|mix.*reagent/i)
})
test('independent school textbook, actual printed page, faculty reviewer, Urdu parity and publication all unverified',()=>{
 for(const q of build().items){
  for(const k of ['schoolAdoptedEditionSessionVerified','originalPrintedExercisePageVerified','qualifiedIndependentSubjectReviewed',
  'urduEquivalenceReviewed','academicallyApproved','verifiedPublished'])assert.equal(q[k],false,k)
  assert.equal(q.independentReviewerId,null);assert.equal(q.approvedRevisionId,null)
 }
})
test('modified original bytes or modified source-mark claims fail-closed',()=>{
 const b=Buffer.from(bytes);b[b.length-2]^=1
 assert.throws(()=>author.build({bytes:b,source,registry}),/CHEM9C11_SOURCE_SHA_DRIFT/)
 const x=structuredClone(source);x.drafts.find(q=>q.type==='long').marks=7
 assert.throws(()=>author.build({bytes,source:x,registry}),/CHEM9C11_SOURCE_SHA_DRIFT/)
})
test('falsified positive catalog academicApproval rejects academic authoring',()=>{
 const x=structuredClone(registry);x.entries.find(q=>q.recordId==='pectaa-catalog-007').academicApproval=true
 assert.throws(()=>author.build({bytes,source,registry:x}),/CHEM9C11_CATALOG_DRIFT_OR_FALSE_APPROVAL/)
})
test('v13 source-locked coverage: 156 original IDs with research drafts, 798 proposed mark points, 19 source cohorts',()=>{
 const d=cover.reconcile(cover.loadInputs())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.correctedRubricOnlyOriginals,166)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,156)
 assert.equal(d.separateMarkingPointProposals,798)
 assert.equal(d.originalRubricOnlyIdsWithoutNewAnswerDraft,10)
 assert.equal(d.sourceGroups.length,19)
 assert.equal(new Set(d.remainingOriginalQuestionIds).size,10)
 assert.equal(d.academicallyApproved,0);assert.equal(d.verifiedPublished,0)
})
test('two original reaction IDs plus Chapter13 and three Grade X practical IDs stay unaddressed',()=>{
 const d=cover.reconcile(cover.loadInputs()),remaining=new Set(d.remainingOriginalQuestionIds)
 assert.deepEqual(d.deferredOriginalIds,deferred)
 for(const q of build().items)assert.ok(!remaining.has(q.questionId))
 for(const id of [...deferred,'X-CHEM-C18-L01','X-CHEM-C23-L01','X-CHEM-C24-L01'])
  assert.ok(remaining.has(id),id)
 assert.equal([...remaining].filter(id=>id.startsWith('IX-CHEM-2025-C13-')).length,5)
})
test('three potential concept-overlap groups require independent originality review',()=>{
 const a=cover.reconcile(cover.loadInputs()).semanticOverlapReviewCandidates
 assert.equal(a.length,3)
 assert.deepEqual(a.map(x=>x.sourceQuestionIds),[
 ['IX-CHEM-2025-C07-T05-L01','IX-CHEM-2025-C10-T3-01L'],
 ['IX-CHEM-2025-C11-T1-01L','IX-CHEM-2025-C11-T1-02L'],
 ['IX-CHEM-2025-C11-T3-01L','IX-CHEM-2025-C11-T3-02L']])
 assert.ok(a.every(x=>x.independentFacultyDuplicateReview===false))
})
test('mutated source-backed packet proposals, reviews, and marking points cannot pass reconciliation',()=>{
 for(const change of [
 q=>q.academicallyApproved=true,
 q=>q.independentReviewerId='forgery',
 q=>q.proposedDistinctMarkingPoints[0]='fabricated'
 ]){
  const x=cover.loadInputs();change(x.packet.items[0])
  assert.throws(()=>cover.reconcile(x),/COVERAGE156_PACKET_TAMPERED_OR_STALE/)
 }
})
test('prior Chapter12 already-covered original ID cannot inflate new source cohort',()=>{
 const x=cover.loadInputs();x.packet.items[0].questionId='IX-CHEM-2025-C12-12T1-L01'
 assert.throws(()=>cover.reconcile(x),/COVERAGE156_PACKET_TAMPERED_OR_STALE|COVERAGE156_DUPLICATE_OR_NOT_IN_BACKLOG/)
})
test('tampered deferred ID list fails without releasing reaction/preparation topics',()=>{
 const x=cover.loadInputs();x.packet.deferredExistingOriginalIds=[]
 assert.throws(()=>cover.reconcile(x),/COVERAGE156_PACKET_TAMPERED_OR_STALE/)
})
test('versioned v13 serialized report equals original-source regeneration; Markdown has dynamic pending count',()=>{
 const d=cover.reconcile(cover.loadInputs()),disk=JSON.parse(fs.readFileSync(
 'docs/question-bank/ASSPS_GRADE910_156_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json'))
 assert.deepEqual(d,disk)
 const md=cover.markdown(d)
 assert.match(md,/10 remaining original research IDs/)
 assert.match(md,/seven Chemistry IX/)
 assert.match(md,/academic approved \*\*0\*\*/)
 assert.match(md,/T4-01L/)
 const faculty=author.markdown(build())
 assert.match(faculty,/BlueBook\/P1.html/)
 assert.doesNotMatch(faculty,/NIST Guide|18-1-periodicity/)
})

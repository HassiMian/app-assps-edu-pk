'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const author=require('../qbank/author-chemistry9-ch7-five-original-answers.cjs')
const cover=require('../qbank/reconcile-grade910-answer-coverage-138.cjs')
const bytes=fs.readFileSync(author.INPUT),source=JSON.parse(bytes)
const registry=JSON.parse(fs.readFileSync(author.REGISTRY))
const build=()=>author.build({bytes,source,registry})
test('five authentic original Ch7 IDs and pinned 25-question source are unchanged',()=>{
 const d=build()
 assert.equal(d.originalFileSha256,author.PIN)
 assert.equal(d.originalAuthoredResearchQuestions,25)
 assert.equal(d.originalRubricOnlyLongQuestions,5)
 assert.deepEqual(d.items.map(q=>q.questionId),[
  'IX-CHEM-2025-C07-T01-L01','IX-CHEM-2025-C07-T02-L01',
  'IX-CHEM-2025-C07-T03-L01','IX-CHEM-2025-C07-T04-L01',
  'IX-CHEM-2025-C07-T05-L01'])
})
test('each proposed answer has independent explanatory English prose and five distinct criteria',()=>{
 const d=build()
 assert.equal(d.newFiveMarkPointProposals,25)
 for(const q of d.items){
  assert.ok(q.proposedIndependentEnglishExplanation.length>=280,q.questionId)
  assert.equal(q.marks,5)
  assert.equal(new Set(q.proposedDistinctMarkingPoints).size,q.marks)
  assert.ok(q.proposedDistinctMarkingPoints.every(p=>p.length>=18))
  assert.equal(q.originalQuestionUnchanged,true)
 }
})
test('Arrhenius aqueous scope, Brønsted conjugates, alkali subset, acid-deposition wet/dry distinctions appear',()=>{
 const [a,b,c,d,e]=build().items.map(q=>q.proposedIndependentEnglishExplanation)
 assert.match(a,/not every base is an alkali/)
 assert.match(b,/aqueous/)
 assert.match(b,/limitation/)
 assert.match(c,/proton donor/)
 assert.match(c,/conjugate acid/)
 assert.match(d,/not directions for carrying out/)
 assert.match(e,/dry/)
 assert.match(e,/sulfur dioxide and nitrogen oxides/)
})
test('practical chemicals never framed as laboratory procedure instructions',()=>{
 for(const q of build().items){
  const s=q.proposedIndependentEnglishExplanation.toLowerCase()
  assert.ok(!/step.by.step|equipment setup|lab procedure|add \d+|heat to \d+|mix \d+|pour \d+/.test(s),q.questionId)
 }
})
test('new proposals do not impersonate reviewer, edition, official page or academic approval',()=>{
 for(const q of build().items){
  assert.equal(q.schoolAdoptedEditionSessionVerified,false)
  assert.equal(q.originalPrintedExercisePageVerified,false)
  assert.equal(q.qualifiedIndependentSubjectReviewed,false)
  assert.equal(q.urduEquivalenceReviewed,false)
  assert.equal(q.independentReviewerId,null)
  assert.equal(q.approvedRevisionId,null)
  assert.equal(q.academicallyApproved,false)
  assert.equal(q.verifiedPublished,false)
 }
})
test('tampered source bytes fail closed before prose can be accepted',()=>{
 const alt=Buffer.from(bytes); alt[alt.length-2]^=1
 assert.throws(()=>author.build({bytes:alt,source,registry}),/CHEM9C7_SOURCE_SHA_DRIFT/)
})
test('falsified parsed original marks or content fails immutable SHA check',()=>{
 const alt=structuredClone(source)
 alt.drafts.find(q=>q.type==='long').marks=7
 assert.throws(()=>author.build({bytes,source:alt,registry}),/CHEM9C7_SOURCE_SHA_DRIFT/)
})
test('falsely approved official source registry fails prior to candidate authoring',()=>{
 const alt=structuredClone(registry)
 alt.entries.find(q=>q.recordId==='pectaa-catalog-007').academicApproval=true
 assert.throws(()=>author.build({bytes,source,registry:alt}),/CHEM9C7_CATALOG_DRIFT_OR_FALSE_APPROVAL/)
})
test('additive 138-ID coverage uses exactly 15 original source groups and 28 pending IDs',()=>{
 const d=cover.reconcile(cover.loadInputs())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.correctedRubricOnlyOriginals,166)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,138)
 assert.equal(d.separateMarkingPointProposals,708)
 assert.equal(d.originalRubricOnlyIdsWithoutNewAnswerDraft,28)
 assert.equal(d.sourceGroups.length,15)
 assert.deepEqual(d.semanticOverlapReviewCandidates[0].sourceQuestionIds,[
 'IX-CHEM-2025-C07-T05-L01','IX-CHEM-2025-C10-T3-01L'])
 assert.equal(d.semanticOverlapReviewCandidates[0].independentFacultyDuplicateReview,false)
 assert.equal(new Set(d.remainingOriginalQuestionIds).size,28)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('all five Ch7 original IDs are absent from backlog and three Chemistry X remain deliberately deferred',()=>{
 const pending=new Set(cover.reconcile(cover.loadInputs()).remainingOriginalQuestionIds)
 for(const q of build().items)assert.ok(!pending.has(q.questionId),q.questionId)
 for(const id of ['X-CHEM-C18-L01','X-CHEM-C23-L01','X-CHEM-C24-L01'])
  assert.ok(pending.has(id),id)
})
test('altering the new answer or review status fails exact-source packet reconciliation',()=>{
 let x=cover.loadInputs();x.packet.items[0].academicallyApproved=true
 assert.throws(()=>cover.reconcile(x),/COVERAGE138_PACKET_TAMPERED_OR_STALE/)
 x=cover.loadInputs();x.packet.items[0].proposedDistinctMarkingPoints[2]='invented'
 assert.throws(()=>cover.reconcile(x),/COVERAGE138_PACKET_TAMPERED_OR_STALE/)
})
test('attempt to reuse old Chapter 6 original ID rejects cumulative 138-ID registration',()=>{
 const x=cover.loadInputs()
 x.packet.items[0].questionId='IX-CHEM-2025-C06-T00-L01'
 assert.throws(()=>cover.reconcile(x),/COVERAGE138_PACKET_TAMPERED_OR_STALE|COVERAGE138_DUPLICATE_OR_NOT_IN_BACKLOG/)
})
test('new Markdown and emitted JSON precisely match source-based current 138 audit',()=>{
 const x=cover.reconcile(cover.loadInputs()),m=cover.markdown(x)
 const disk=JSON.parse(fs.readFileSync('docs/question-bank/ASSPS_GRADE910_138_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json'))
 assert.deepEqual(x,disk)
 assert.match(m,/28 remaining original research IDs/)
 assert.match(m,/25 Chemistry IX/)
 assert.match(m,/academic approved \*\*0\*\*/)
 assert.ok(!m.includes('82 remaining'))
})

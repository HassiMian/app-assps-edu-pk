'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs')
const author=require('../qbank/author-chemistry9-ch6-three-original-answers.cjs')
const coverage=require('../qbank/reconcile-grade910-answer-coverage-133.cjs')
const originalBytes=fs.readFileSync(author.INPUT)
const source=JSON.parse(originalBytes)
const registry=JSON.parse(fs.readFileSync(author.REGISTRY))
const build=()=>author.build({bytes:originalBytes,source,registry})
test('exact original Chemistry IX chapter 6 source has precisely three immutable rubric-only long IDs',()=>{
 const d=build()
 assert.equal(d.originalFileSha256,author.PIN)
 assert.equal(d.originalAuthoredResearchQuestions,15)
 assert.equal(d.originalRubricOnlyLongQuestions,3)
 assert.deepEqual(d.items.map(x=>x.questionId),[
 'IX-CHEM-2025-C06-T00-L01','IX-CHEM-2025-C06-T02-L01','IX-CHEM-2025-C06-T03-L01'])
 assert.equal(d.newFiveMarkPointProposals,15)
})
test('each long model answer is prose and has five distinct meaningful marking points',()=>{
 const d=build()
 for(const x of d.items){
  assert.ok(x.proposedIndependentEnglishExplanation.length>=250)
  assert.equal(x.marks,5)
  assert.equal(new Set(x.proposedDistinctMarkingPoints).size,5)
  assert.ok(x.proposedDistinctMarkingPoints.every(p=>p.length>=18))
 }
 assert.match(d.items[1].proposedIndependentEnglishExplanation,/equal/)
 assert.match(d.items[2].proposedIndependentEnglishExplanation,/catalyst/)
 assert.match(d.items[2].proposedIndependentEnglishExplanation,/without changing/)
})
test('no unreviewed original proposal is masquerading as an approved publisher/reviewer revision',()=>{
 for(const x of build().items){
  assert.equal(x.originalPrintedExercisePageVerified,false)
  assert.equal(x.schoolAdoptedEditionSessionVerified,false)
  assert.equal(x.qualifiedIndependentSubjectReviewed,false)
  assert.equal(x.urduEquivalenceReviewed,false)
  assert.equal(x.independentReviewerId,null)
  assert.equal(x.approvedRevisionId,null)
  assert.equal(x.academicallyApproved,false)
  assert.equal(x.verifiedPublished,false)
 }
})
test('source-byte drift blocks new research authoring',()=>{
 const altered=Buffer.from(originalBytes)
 altered[altered.length-2]^=1
 assert.throws(()=>author.build({bytes:altered,source,registry}),/CHEM9C6_SOURCE_SHA_CHANGED/)
})
test('registry false-approval drift blocks new research authoring',()=>{
 const copy=structuredClone(registry)
 const x=copy.entries.find(z=>z.recordId==='pectaa-catalog-007')
 x.academicApproval=true
 assert.throws(()=>author.build({bytes:originalBytes,source,registry:copy}),/CHEM9C6_CATALOG_IDENTITY_DRIFT/)
})
test('invented altered parsed question record cannot bypass source byte pin',()=>{
 const tampered=structuredClone(source)
 tampered.drafts.find(q=>q.type==='long').marks=20
 assert.throws(()=>author.build({bytes:originalBytes,source:tampered,registry}),/CHEM9C6_SOURCE_SHA_CHANGED/)
})
test('133-ID cumulative snapshot source-reconciles without duplicate prior proposal IDs',()=>{
 const d=coverage.reconcile(coverage.loadInputs())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.correctedRubricOnlyOriginals,166)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,133)
 assert.equal(d.separateMarkingPointProposals,683)
 assert.equal(d.originalRubricOnlyIdsWithoutNewAnswerDraft,33)
 assert.equal(d.sourceGroups.length,14)
 assert.equal(new Set(d.remainingOriginalQuestionIds).size,33)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('all three original Chapter 6 IDs leave pending backlog exactly once',()=>{
 const d=coverage.reconcile(coverage.loadInputs())
 const pending=new Set(d.remainingOriginalQuestionIds)
 for(const x of build().items) assert.ok(!pending.has(x.questionId))
 assert.ok(pending.has('X-CHEM-C18-L01'))
 assert.ok(pending.has('X-CHEM-C23-L01'))
 assert.ok(pending.has('X-CHEM-C24-L01'))
})
test('poisoned standalone new packet or forged approval fails cumulative 133-ID reconciliation',()=>{
 const c=coverage.loadInputs()
 c.packet.items[0].academicallyApproved=true
 assert.throws(()=>coverage.reconcile(c),/COVERAGE133_DRAFT_PACKET_TAMPER_OR_STALE/)
 const e=coverage.loadInputs()
 e.packet.items[0].proposedDistinctMarkingPoints[0]='fake'
 assert.throws(()=>coverage.reconcile(e),/COVERAGE133_DRAFT_PACKET_TAMPER_OR_STALE/)
})
test('duplicate of any prior original ID cannot inflate the cumulative count',()=>{
 const c=coverage.loadInputs()
 c.packet.items[0].questionId=c.oldInputs.packets['ASSPS_CHEMISTRY9_CH10_TEN_LONG_MODEL_ANSWER_DRAFTS_20261009.json'].items[0].questionId
 assert.throws(()=>coverage.reconcile(c),/COVERAGE133_DRAFT_PACKET_TAMPER_OR_STALE|COVERAGE133_NOT_PREVIOUSLY_UNADDRESSED/)
})
test('written projection and JSON are equal to live source-reconciled results',()=>{
 const d=coverage.reconcile(coverage.loadInputs())
 const file=require('../../docs/question-bank/ASSPS_GRADE910_133_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json')
 assert.deepEqual(file,d)
 const m=coverage.markdown(d)
 assert.match(m,/Still missing separate drafts: \*\*33\*\*/)
 assert.match(m,/approved: \*\*0\*\*/)
 assert.ok(m.includes('Companion JSON lists all 33 remaining original IDs'))
 assert.ok(!m.includes('82 remaining'))
})

'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const author=require('../qbank/author-chemistry9-ch8-four-original-answers.cjs')
const coverage=require('../qbank/reconcile-grade910-answer-coverage-142.cjs')
const bytes=fs.readFileSync(author.INPUT),source=JSON.parse(bytes)
const registry=JSON.parse(fs.readFileSync(author.REGISTRY))
const build=()=>author.build({bytes,source,registry})
test('Chapter 8 unmodified 20-question original source has exactly four five-mark rubric-only long IDs',()=>{
 const d=build()
 assert.equal(d.originalFileSha256,author.PIN)
 assert.equal(d.originalAuthoredResearchQuestions,20)
 assert.equal(d.originalRubricOnlyLongQuestions,4)
 assert.deepEqual(d.items.map(x=>x.questionId),[
  'IX-CHEM-2025-C08-T01-L01','IX-CHEM-2025-C08-T02-L01',
  'IX-CHEM-2025-C08-T03-L01','IX-CHEM-2025-C08-T04-L01'
 ])
})
test('four explanatory research answers carry exactly twenty distinct source-mark-aware criteria',()=>{
 const d=build()
 assert.equal(d.newFiveMarkPointProposals,20)
 for(const q of d.items){
  assert.equal(q.marks,5)
  assert.ok(q.proposedIndependentEnglishExplanation.length>=280,q.questionId)
  assert.equal(new Set(q.proposedDistinctMarkingPoints).size,5)
  assert.ok(q.proposedDistinctMarkingPoints.every(p=>p.length>=18),q.questionId)
 }
})
test('periodic trends are appropriately qualified, not asserted as universal laws',()=>{
 const p=build().items.map(q=>q.proposedIndependentEnglishExplanation)
 assert.match(p[0],/increasing atomic number/)
 assert.match(p[1],/valence/)
 assert.match(p[2],/Group 17/)
 assert.match(p[3],/generally/)
 assert.match(p[3],/exceptions|exception-free/)
 assert.match(p[3],/shielding/)
})
test('no false independent school adoption/page, Urdu equivalence, reviewer, approval or publication',()=>{
 for(const q of build().items){
  for(const key of ['schoolAdoptedEditionSessionVerified','originalPrintedExercisePageVerified',
  'qualifiedIndependentSubjectReviewed','urduEquivalenceReviewed','academicallyApproved','verifiedPublished'])
   assert.equal(q[key],false,key+':'+q.questionId)
  assert.equal(q.independentReviewerId,null)
  assert.equal(q.approvedRevisionId,null)
 }
})
test('raw original source-byte tamper is rejected before candidate acceptance',()=>{
 const b=Buffer.from(bytes);b[b.length-2]^=1
 assert.throws(()=>author.build({bytes:b,source,registry}),/CHEM9C8_SOURCE_SHA_DRIFT/)
})
test('parsed original question marks cannot be changed without source fingerprint rejection',()=>{
 const s=structuredClone(source)
 s.drafts.find(q=>q.type==='long').marks=6
 assert.throws(()=>author.build({bytes,source:s,registry}),/CHEM9C8_SOURCE_SHA_DRIFT/)
})
test('false academicApproval in catalog registry does not authorize research publishing',()=>{
 const r=structuredClone(registry)
 r.entries.find(q=>q.recordId==='pectaa-catalog-007').academicApproval=true
 assert.throws(()=>author.build({bytes,source,registry:r}),/CHEM9C8_CATALOG_DRIFT_OR_FALSE_APPROVAL/)
})
test('the 142-ID cumulative report includes all 16 distinct original source cohorts',()=>{
 const d=coverage.reconcile(coverage.loadInputs())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.correctedRubricOnlyOriginals,166)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,142)
 assert.equal(d.separateMarkingPointProposals,728)
 assert.equal(d.originalRubricOnlyIdsWithoutNewAnswerDraft,24)
 assert.equal(d.sourceGroups.length,16)
 assert.equal(new Set(d.remainingOriginalQuestionIds).size,24)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('previous Chapter 7 vs Chapter 10 acid-deposition semantic overlap remains unreviewed',()=>{
 const d=coverage.reconcile(coverage.loadInputs())
 assert.deepEqual(d.semanticOverlapReviewCandidates[0].sourceQuestionIds,[
  'IX-CHEM-2025-C07-T05-L01','IX-CHEM-2025-C10-T3-01L'])
 assert.equal(d.semanticOverlapReviewCandidates[0].independentFacultyDuplicateReview,false)
})
test('four Ch8 original IDs leave backlog without pretending remaining Chemistry X safety candidates are authored',()=>{
 const d=coverage.reconcile(coverage.loadInputs())
 const pending=new Set(d.remainingOriginalQuestionIds)
 for(const q of build().items)assert.ok(!pending.has(q.questionId))
 for(const id of ['X-CHEM-C18-L01','X-CHEM-C23-L01','X-CHEM-C24-L01'])assert.ok(pending.has(id))
})
test('tampered new packet and forged reviewer are rejected from source-reconciled v10 snapshot',()=>{
 let x=coverage.loadInputs()
 x.packet.items[0].academicallyApproved=true
 assert.throws(()=>coverage.reconcile(x),/COVERAGE142_PACKET_TAMPERED_OR_STALE/)
 x=coverage.loadInputs()
 x.packet.items[0].proposedDistinctMarkingPoints[0]='fabricated'
 assert.throws(()=>coverage.reconcile(x),/COVERAGE142_PACKET_TAMPERED_OR_STALE/)
})
test('no previously covered Chapter 7 original can inflate v10 research-answer totals',()=>{
 const x=coverage.loadInputs()
 x.packet.items[0].questionId='IX-CHEM-2025-C07-T01-L01'
 assert.throws(()=>coverage.reconcile(x),/COVERAGE142_PACKET_TAMPERED_OR_STALE|COVERAGE142_DUPLICATE_OR_NOT_IN_BACKLOG/)
})
test('stored v10 output is exact reconcilable source result and Markdown backlog count is dynamic',()=>{
 const d=coverage.reconcile(coverage.loadInputs())
 const stored=JSON.parse(fs.readFileSync('docs/question-bank/ASSPS_GRADE910_142_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json'))
 assert.deepEqual(d,stored)
 const m=coverage.markdown(d)
 assert.match(m,/24 remaining original research IDs/)
 assert.match(m,/21 Chemistry IX/)
 assert.ok(m.includes('academic approved **0**'))
 const faculty=author.markdown(build())
 assert.match(faculty,/periodic-variations-in-element-properties/)
 assert.ok(!/goldbook\.iupac\.org\/terms\/view\/B00744|epa\.gov\/acidrain/.test(faculty))
})

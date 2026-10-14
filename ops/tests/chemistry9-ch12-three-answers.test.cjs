'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const author=require('../qbank/author-chemistry9-ch12-three-original-answers.cjs')
const cover=require('../qbank/reconcile-grade910-answer-coverage-150.cjs')
const bytes=fs.readFileSync(author.INPUT),source=JSON.parse(bytes)
const registry=JSON.parse(fs.readFileSync(author.REGISTRY))
const build=()=>author.build({bytes,source,registry})
test('exact source raw SHA and all three preexisting Chemistry IX Ch12 five-mark long IDs',()=>{
 const d=build()
 assert.equal(d.originalFileSha256,'b566e7b515abb2770106fb49893364189b4d116125cc0630aaa979cafd6300bd')
 assert.equal(d.originalAuthoredResearchQuestions,15)
 assert.equal(d.originalRubricOnlyLongQuestions,3)
 assert.equal(d.schemaVersion,'assps-chemistry9-ch12-three-original-answer-research-v1')
 assert.deepEqual(d.items.map(q=>q.questionId),[
 'IX-CHEM-2025-C12-12T1-L01','IX-CHEM-2025-C12-12T2-L01','IX-CHEM-2025-C12-12T3-L01'])
})
test('every new original-ID answer is explanatory rather than original rubric-only and has exactly five distinct criterion drafts',()=>{
 const d=build()
 assert.equal(d.newFiveMarkPointProposals,15)
 for(const q of d.items){
  assert.equal(q.chapterNo,12)
  assert.equal(q.marks,5)
  assert.ok(q.proposedIndependentEnglishExplanation.length>=280,q.questionId)
  assert.equal(new Set(q.proposedDistinctMarkingPoints).size,5)
  assert.ok(q.proposedDistinctMarkingPoints.every(x=>x.length>=18))
  assert.equal(q.originalQuestionUnchanged,true)
 }
})
test('measurement numeric quantity, unit convention and scientific uncertainty are conceptually consistent',()=>{
 const d=build().items.map(q=>q.proposedIndependentEnglishExplanation)
 assert.match(d[0],/0\.005 kilograms is the same quantity as 5 grams/)
 assert.equal(0.005*1000,5)
 assert.match(d[0],/SI/)
 assert.match(d[1],/parallax/)
 assert.match(d[1],/qualified supervisor/)
 assert.match(d[2],/50\.0 grams/)
 assert.match(d[2],/52\.0, 52\.1 and 51\.9/)
 assert.match(d[2],/precise but not accurate/)
 assert.match(d[2],/systematic/)
})
test('measurement discussion avoids any instruction to handle dangerous reagents or perform experiments',()=>{
 const paragraphs=build().items.map(q=>q.proposedIndependentEnglishExplanation.toLowerCase())
 for(const s of paragraphs){
  assert.doesNotMatch(s,/step.by.step synthesis|mix chemicals|heat chemicals|pour acid|distill|extract solvent/)
 }
})
test('actual printed textbook/edition/session, teacher approval and Urdu review never falsely marked complete',()=>{
 for(const q of build().items){
  for(const key of ['schoolAdoptedEditionSessionVerified','originalPrintedExercisePageVerified',
   'qualifiedIndependentSubjectReviewed','urduEquivalenceReviewed','academicallyApproved','verifiedPublished'])
   assert.equal(q[key],false,key+':'+q.questionId)
  assert.equal(q.independentReviewerId,null)
  assert.equal(q.approvedRevisionId,null)
 }
})
test('raw unchanged authored question source bytes are cryptographically pinned',()=>{
 const b=Buffer.from(bytes);b[b.length-2]^=1
 assert.throws(()=>author.build({bytes:b,source,registry}),/CHEM9C12_SOURCE_SHA_DRIFT/)
})
test('parsed original marks changed without bytes triggers author fail-close',()=>{
 const s=structuredClone(source)
 s.drafts.find(q=>q.type==='long').marks=8
 assert.throws(()=>author.build({bytes,source:s,registry}),/CHEM9C12_SOURCE_SHA_DRIFT/)
})
test('unreviewed catalog cannot be spoofed to verified with approval true',()=>{
 const r=structuredClone(registry)
 r.entries.find(q=>q.recordId==='pectaa-catalog-007').academicApproval=true
 assert.throws(()=>author.build({bytes,source,registry:r}),/CHEM9C12_CATALOG_DRIFT_OR_FALSE_APPROVAL/)
})
test('new additive v12 report has exact 150 unique existing original IDs, 768 marking points, 18 cohorts, 16 pending',()=>{
 const d=cover.reconcile(cover.loadInputs())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.correctedRubricOnlyOriginals,166)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,150)
 assert.equal(d.separateMarkingPointProposals,768)
 assert.equal(d.originalRubricOnlyIdsWithoutNewAnswerDraft,16)
 assert.equal(d.sourceGroups.length,18)
 assert.equal(new Set(d.remainingOriginalQuestionIds).size,16)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('v12 inherits Ch7 vs Ch10 semantic overlap flag as unreviewed',()=>{
 const d=cover.reconcile(cover.loadInputs())
 assert.deepEqual(d.semanticOverlapReviewCandidates[0].sourceQuestionIds,[
  'IX-CHEM-2025-C07-T05-L01','IX-CHEM-2025-C10-T3-01L'])
 assert.equal(d.semanticOverlapReviewCandidates[0].independentFacultyDuplicateReview,false)
})
test('original Ch12 IDs leave backlog but deferred Chemistry X original lab questions do not',()=>{
 const s=new Set(cover.reconcile(cover.loadInputs()).remainingOriginalQuestionIds)
 for(const q of build().items)assert.ok(!s.has(q.questionId))
 for(const id of ['X-CHEM-C18-L01','X-CHEM-C23-L01','X-CHEM-C24-L01'])assert.ok(s.has(id))
})
test('tampered v12 proposal body, fabricated grading points and false approvals cannot pass exact reconciliation',()=>{
 for(const mutate of [
  q=>{q.academicallyApproved=true},
  q=>{q.independentReviewerId='fabricated'},
  q=>{q.proposedDistinctMarkingPoints[0]='fabricated'}
 ]){
  const x=cover.loadInputs();mutate(x.packet.items[0])
  assert.throws(()=>cover.reconcile(x),/COVERAGE150_PACKET_TAMPERED_OR_STALE/)
 }
})
test('reusing prior Ch9 stable ID cannot inflate 150-ID count',()=>{
 const x=cover.loadInputs();x.packet.items[0].questionId='IX-CHEM-2025-C09-T01-L01'
 assert.throws(()=>cover.reconcile(x),/COVERAGE150_PACKET_TAMPERED_OR_STALE|COVERAGE150_DUPLICATE_OR_NOT_IN_BACKLOG/)
})
test('serialized 150-ID coverage and provenance references equal freshly recomputed result',()=>{
 const d=cover.reconcile(cover.loadInputs())
 const stored=JSON.parse(fs.readFileSync('docs/question-bank/ASSPS_GRADE910_150_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json'))
 assert.deepEqual(d,stored)
 const md=cover.markdown(d)
 assert.match(md,/16 remaining original research IDs/)
 assert.match(md,/13 Chemistry IX/)
 assert.match(md,/academic approved \*\*0\*\*/)
 const faculty=author.markdown(build())
 assert.match(faculty,/NIST Guide to the SI/)
 assert.doesNotMatch(faculty,/periodicity|acidrain/)
})

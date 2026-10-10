'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const att=require('../qbank/attest-grade910-161-faculty-handoff.cjs')
const reconciler=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
const copy=()=>{const x=att.loadInputs();return {
 ...x,ledgerBytes:Buffer.from(x.ledgerBytes),packetBytes:Buffer.from(x.packetBytes),
 originalChapter13Bytes:Buffer.from(x.originalChapter13Bytes),
 registry:structuredClone(x.registry),
 originalOutstanding:Object.fromEntries(Object.entries(x.originalOutstanding).map(([k,v])=>[k,Buffer.from(v)]))
}}
const pending=[
 'IX-CHEM-2025-C11-T4-01L','IX-CHEM-2025-C11-T4-02L',
 'X-CHEM-C18-L01','X-CHEM-C23-L01','X-CHEM-C24-L01']
test('new sealed handoff preserves 156 prior revisions and exactly 5 separately pinned new original-ID answers',()=>{
 const d=att.assertPinned(copy())
 assert.equal(d.inheritedAnswerRevisionPins,156)
 assert.equal(d.newAnswerRevisionPins,5)
 assert.equal(d.distinctExistingOriginalIdsWithSupplementalResearch,161)
 assert.equal(d.proposedMarkingCriteria,823)
 assert.equal(d.originalCandidateCountUnchanged,2581)
 assert.equal(d.originalRubricOnlyCountUnchanged,166)
 assert.equal(d.originalSourceCohorts,20)
 assert.equal(d.releaseDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('all 5 new revision digests are unique and review/approval absent',()=>{
 const d=att.build(copy())
 assert.equal(new Set(d.newAnswerDraftRevisionPins.map(q=>q.questionId)).size,5)
 assert.equal(new Set(d.newAnswerDraftRevisionPins.map(q=>q.proposedRevisionSha256)).size,5)
 for(const r of d.newAnswerDraftRevisionPins){
  assert.match(r.proposedRevisionSha256,/^[0-9a-f]{64}$/)
  assert.equal(r.approved,false)
  assert.equal(r.published,false)
  assert.equal(r.independentReviewerId,null)
 }
})
test('final five original revision IDs link to original source bytes and contain no fabricated approved status',()=>{
 const d=att.build(copy())
 assert.deepEqual(d.originalFiveFacultyReviewDocket.map(x=>x.questionId).sort(),pending)
 for(const r of d.originalFiveFacultyReviewDocket){
  assert.match(r.originalQuestionRevisionSha256,/^[0-9a-f]{64}$/)
  assert.match(r.originalRubricSha256,/^[0-9a-f]{64}$/)
  assert.equal(r.additionalExplanationExists,false)
  assert.equal(r.schoolEditionPageVerified,false)
  assert.equal(r.qualifiedSubjectReviewed,false)
  assert.equal(r.urduEquivalenceReviewed,false)
  assert.equal(r.academicallyApproved,false)
  assert.equal(r.verifiedPublished,false)
  assert.equal(r.approvedRevisionId,null)
 }
})
test('new Ch13 packet byte mutation fails closed',()=>{
 const x=copy();x.packetBytes[51]^=1
 assert.throws(()=>att.build(x),/ACADEMIC161_CH13_PACKET_FINGERPRINT_DRIFT/)
})
test('new Ch13 answer content cannot change without new fingerprint',()=>{
 const x=copy(),d=JSON.parse(x.packetBytes)
 d.items[0].proposedIndependentEnglishExplanation+=' edit before faculty review'
 x.packetBytes=Buffer.from(JSON.stringify(d)+'\n')
 assert.throws(()=>att.build(x),/ACADEMIC161_CH13_PACKET_FINGERPRINT_DRIFT/)
})
test('marking-criterion order change cannot silently inherit previous revision',()=>{
 const x=copy(),d=JSON.parse(x.packetBytes)
 const criteria=d.items[1].proposedDistinctMarkingPoints
 ;[criteria[0],criteria[1]]=[criteria[1],criteria[0]]
 x.packetBytes=Buffer.from(JSON.stringify(d,null,2)+'\n')
 assert.throws(()=>att.build(x),/ACADEMIC161_CH13_PACKET_FINGERPRINT_DRIFT/)
})
test('cumulative ledger count tamper rejected by original SHA pin',()=>{
 const x=copy(),d=JSON.parse(x.ledgerBytes)
 d.academicallyApproved=1
 x.ledgerBytes=Buffer.from(JSON.stringify(d,null,2)+'\n')
 assert.throws(()=>att.build(x),/ACADEMIC161_V14_LEDGER_FINGERPRINT_DRIFT/)
})
test('pending Chemistry IX original source bytes mutation fails',()=>{
 const x=copy(),k='chemistry9Chapter11EnglishDrafts2026.json'
 x.originalOutstanding[k][4]^=1
 assert.throws(()=>att.build(x),/ACADEMIC161_PENDING_ORIGINAL_SOURCE_BYTES_DRIFT/)
})
test('pending Chemistry X original source bytes mutation fails',()=>{
 const x=copy(),k='chemistry10Starter2026.json'
 x.originalOutstanding[k][9]^=1
 assert.throws(()=>att.build(x),/ACADEMIC161_PENDING_ORIGINAL_SOURCE_BYTES_DRIFT/)
})
test('false academic catalog approval cannot turn research answer into approved',()=>{
 const x=copy()
 x.registry.entries.find(e=>e.recordId==='pectaa-catalog-007').academicApproval=true
 assert.throws(()=>att.build(x),/CHEM9C13_CATALOG_DRIFT_OR_FALSE_APPROVAL/)
})
test('original Ch13 candidate source question changed but still valid JSON is rejected by pinned raw SHA',()=>{
 const x=copy(),d=JSON.parse(x.originalChapter13Bytes)
 d.drafts.find(q=>q.type==='long').marks=7
 x.originalChapter13Bytes=Buffer.from(JSON.stringify(d)+'\n')
 assert.throws(()=>att.build(x),/CHEM9C13_SOURCE_SHA_DRIFT/)
})
test('frozen handoff tamper rejected even if old source and packets remain unchanged',()=>{
 const bytes=fs.readFileSync('docs/question-bank/'+att.OUTPUT+'.json')
 const corrupted=Buffer.from(bytes);corrupted[120]^=1
 assert.throws(()=>att.assertPinned(copy(),corrupted),/ACADEMIC161_FROZEN_FACULTY_INTAKE_SHA_DRIFT/)
})
test('complete v14 reconciliation requires new independent handoff seal',()=>{
 const d=reconciler.reconcile(reconciler.loadInputs())
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(d.originalRubricOnlyIdsWithoutNewAnswerDraft,5)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('old potential semantic-overlap flags remain unsigned',()=>{
 const pairs=att.build(copy()).unresolvedPotentialSemanticOverlaps
 assert.equal(pairs.length,3)
 assert.ok(pairs.every(x=>x.independentFacultyDuplicateReview===false))
})
test('saved review intake exactly matches regenerated source-linked result',()=>{
 const d=att.build(copy())
 const stored=JSON.parse(fs.readFileSync('docs/question-bank/'+att.OUTPUT+'.json'))
 assert.deepEqual(JSON.parse(JSON.stringify(d)),stored)
 const md=att.markdown(d)
 assert.match(md,/UNAPPROVED academic research/)
 assert.match(md,/X-CHEM-C24-L01/)
 assert.match(md,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
})

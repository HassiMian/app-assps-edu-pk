'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const {verifyPacket,loadCandidates,SOURCE,PACKET,DOCKET}=require('../qbank/verify-bio9-editorial-translation-proposals.cjs')
const {buildReviewQueue}=require('../qbank/build-grade910-review-triage.cjs')
const {collectDocuments}=require('../qbank/audit-authoring-crossfile-qa.cjs')
const manifest=require('../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
const clone=x=>JSON.parse(JSON.stringify(x))
const sourceBytes=fs.readFileSync(SOURCE),packetBytes=fs.readFileSync(PACKET),docketBytes=fs.readFileSync(DOCKET)
const args={sourceBytes,packetBytes,docketBytes}
test('exact four candidate translations are linked to independent pending review, with unchanged originals',()=>{
 const a=loadCandidates()
 assert.equal(a.length,4)
 const queue=buildReviewQueue(collectDocuments(),manifest,{},a)
 assert.equal(queue.counts.questionRecords,2581)
 assert.equal(queue.unapprovedEditorialTranslationProposals,4)
 assert.equal(queue.blockerCounts.URDU_DUAL_CONTENT_COMPLETION_REQUIRED,4)
 assert.equal(queue.counts.approved,0)
 assert.equal(queue.counts.published,0)
 const linked=queue.records.filter(x=>x.editorialTranslationCandidate)
 assert.equal(linked.length,4)
 for(const row of linked){
  const entry=a.find(x=>x.questionId===row.questionId)
  assert.equal(row.questionContentSha256,entry.parentQuestionSha256)
  assert.equal(row.editorialTranslationCandidate.revisionFileSha256,entry.editorialRevisionFileSha256)
  assert.equal(row.editorialTranslationCandidate.revisionQuestionSha256,entry.proposedRevisionSha256)
  assert.equal(row.editorialTranslationCandidate.status,'PENDING_INDEPENDENT_TRANSLATION_AND_BIOLOGY_REVIEW')
  assert.equal(row.editorialTranslationCandidate.approved,false)
  assert.ok(row.blockers.includes('URDU_DUAL_CONTENT_COMPLETION_REQUIRED'))
  assert.ok(row.blockers.includes('BILINGUAL_EQUIVALENCE_INDEPENDENT_CHECK_MISSING'))
  assert.equal(row.status.approved,false)
 }
})
test('forged human approval flag or changed translation draft is not accepted as reviewer evidence',()=>{
 const bad=clone(JSON.parse(packetBytes))
 bad.academicallyApproved=true
 assert.throws(()=>verifyPacket({...args,packetBytes:Buffer.from(JSON.stringify(bad))}),/EDITORIAL_PACKET_IDENTITY_OR_APPROVAL_INVARIANT_FAILED/)
 const changed=clone(JSON.parse(packetBytes))
 changed.questions[0].content.ur.answer+=' اضافی عبارت'
 assert.throws(()=>verifyPacket({...args,packetBytes:Buffer.from(JSON.stringify(changed))}),/EDITORIAL_PACKET_IDENTITY_OR_APPROVAL_INVARIANT_FAILED/)
})
test('forged docket parent SHA or reviewed status is rejected',()=>{
 const bad=clone(JSON.parse(docketBytes))
 bad.items[0].originalQuestionSha256='f'.repeat(64)
 assert.throws(()=>verifyPacket({...args,docketBytes:Buffer.from(JSON.stringify(bad))}),/EDITORIAL_QUESTION_PARENT_OR_REVIEW_IDENTITY_MISMATCH/)
})
test('review queue fails when a linked original changes or a proposed question disappears',()=>{
 const candidates=loadCandidates()
 const source=collectDocuments()
 const original=source.find(x=>x.file==='biology9TopicResearchDrafts.json')
 const altered=source.map(x=>x===original?{...x,data:clone(x.data)}:x)
 altered.find(x=>x.file===original.file).data.drafts.find(q=>q.id===candidates[0].questionId).content.en.answer+=' changed'
 assert.throws(()=>buildReviewQueue(altered,manifest,{},candidates),/EDITORIAL_PROPOSAL_STALE_OR_UNVERIFIED/)
 assert.throws(()=>buildReviewQueue(source,manifest,{},candidates.slice(0,3).concat(candidates[0])),/DUPLICATE_EDITORIAL_CANDIDATE_ID/)
})

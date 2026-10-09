'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {reconcile,loadInputs,MANIFEST,markdown}=require('../qbank/reconcile-grade910-authored-answer-coverage.cjs')
const base=loadInputs()
const clone=()=>({
 sources:{...base.sources},
 packets:Object.fromEntries(Object.entries(base.packets).map(([k,v])=>[k,structuredClone(v)])),
 docket:structuredClone(base.docket)
})
test('twelve source-bound original research packets reconcile 120 unique drafts including one additional Physics X original',()=>{
 const d=reconcile(base)
 assert.equal(MANIFEST.length,12)
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.originalLongQuestionCount,564)
 assert.equal(d.correctedRubricOnlyOriginals,166)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,120)
 assert.equal(d.separateMarkingPointProposals,618)
 assert.equal(d.originalRubricOnlyIdsWithoutNewAnswerDraft,46)
 assert.equal(new Set(d.remainingOriginalQuestionIds).size,46)
 assert.equal(d.sourceGroups.reduce((n,x)=>n+x.distinctUnapprovedExplanationProposals,0),120)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('duplicate original question ID across two subject draft packets blocks inflated coverage',()=>{
 const c=clone(),one=MANIFEST[0][1],two=MANIFEST[1][1]
 const copied=structuredClone(c.packets[one].items[0])
 c.packets[two].items[0]=copied
 assert.throws(()=>reconcile(c),/COVERAGE_DUPLICATE_DRAFT_ID|COVERAGE_NOT_ORIGINAL_RUBRIC_FLAG/)
})
test('edited original question SHA is detected before any approval claim',()=>{
 const c=clone(),name=MANIFEST[11][1]
 c.packets[name].items[0].sourceQuestionSha256='0'.repeat(64)
 assert.throws(()=>reconcile(c),/COVERAGE_STALE_PROPOSAL_SHA/)
})
test('forged original source bytes are detected even when packet text remains unchanged',()=>{
 const c=clone(),name=MANIFEST[11][0]
 c.sources[name]={bytes:Buffer.from('{"drafts":[]}')}
 assert.throws(()=>reconcile(c),/COVERAGE_NOT_ORIGINAL_RUBRIC_FLAG|COVERAGE_STALE_PROPOSAL_SHA/)
})
test('research answer false-approval mutation cannot pass coverage reconciliation',()=>{
 const c=clone(),name=MANIFEST[11][1]
 c.packets[name].items[0].academicallyApproved=true
 assert.throws(()=>reconcile(c),/COVERAGE_FALSE_ACADEMIC_APPROVAL/)
})
test('invented independent reviewer identity is rejected on every answer proposal',()=>{
 const c=clone(),name=MANIFEST[11][1]
 c.packets[name].items[0].independentReviewerId=90000
 assert.throws(()=>reconcile(c),/COVERAGE_FALSE_REVIEWER/)
})
test('incorrect historical full-corpus rubric baseline cannot promote previously unchecked answers',()=>{
 const c=clone()
 c.docket.totals.rubricOnlyLongAnswers=165
 assert.throws(()=>reconcile(c),/COVERAGE_DOCKET_INVALID/)
})
test('reconciliation report is only original ID/source metadata and explicitly marks approval zero',()=>{
 const d=reconcile(base),m=markdown(d)
 assert.match(m,/120 distinct original IDs/)
 assert.match(m,/still lacking a separate explanatory draft: \*\*46\*\*/)
 assert.match(m,/approved: \*\*0\*\*/)
 assert.ok(!JSON.stringify(d).includes('A word processor supports written communication'))
 assert.ok(!JSON.stringify(d).includes('possible marks:'))
})

test('seven-mark Fashion IX proposal rejects six-point rubric even when old five-mark subjects remain valid',()=>{
 const c=clone(),name=MANIFEST[8][1]
 const q=c.packets[name].items[0]
 assert.equal(q.marks,7)
 assert.equal(q.proposedDistinctMarkingPoints.length,7)
 q.proposedDistinctMarkingPoints=q.proposedDistinctMarkingPoints.slice(0,6)
 assert.throws(()=>reconcile(c),/COVERAGE_MISSING_PROPOSAL_OR_CRITERIA/)
})
test('seven-mark Fashion IX question marked as five cannot count as a complete source-bound answer',()=>{
 const c=clone(),name=MANIFEST[8][1]
 c.packets[name].items[0].marks=5
 assert.throws(()=>reconcile(c),/COVERAGE_CHAPTER_TOPIC_MARKS_CHANGED/)
})

test('three Chemistry X practical-procedure topics stay in original pending research backlog',()=>{
 const d=reconcile(base),pending=new Set(d.remainingOriginalQuestionIds)
 for(const id of ['X-CHEM-C18-L01','X-CHEM-C23-L01','X-CHEM-C24-L01'])assert.ok(pending.has(id),id)
})
test('sole Physics X original flagged comparison is counted only once',()=>{
 const d=reconcile(base),phy=d.sourceGroups.find(x=>x.originalAuthoredSource==='physics10OriginalApplicationBatch2026.json')
 assert.ok(phy)
 assert.equal(phy.distinctUnapprovedExplanationProposals,1)
 assert.equal(d.remainingOriginalQuestionIds.some(x=>x==='X-PHY-C17-L03'),false)
})

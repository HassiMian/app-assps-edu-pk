'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {build,OUT}=require('../qbank/build-grade910-authoritative-faculty-intake.cjs')
let cache
const report=()=>cache??(cache=build())
test('all 2581 frozen originals map into exactly one source-bound faculty review queue',()=>{
 const q=report()
 assert.equal(q.uniqueOriginalQuestionIds,2581)
 assert.equal(new Set(q.rows.map(x=>x.originalQuestionId)).size,2581)
 assert.equal(q.originalSourceFiles,73)
 assert.equal(q.researchTypeCounts.mcq,875)
 assert.equal(q.researchTypeCounts.short,908)
 assert.equal(q.researchTypeCounts.long,564)
 assert.equal(q.researchTypeCounts.numerical,91)
 assert.equal(q.reviewFlags.NO_AUTHENTICATED_SCHOOL_BOOK_ADOPTION,2581)
 assert.equal(q.reviewFlags.INDEPENDENT_MCQ_KEY_AND_DISTRACTOR_REVIEW,875)
 assert.equal(q.reviewFlags.INDEPENDENT_OVERLAP_PAIR_ADJUDICATION,6)
 assert.equal(q.reviewFlags.QUALIFIED_TEACHER_MUST_AUTHOR_MISSING_ANSWER,1)
})
test('no teacher identity is fabricated or research publication pre-approved',()=>{
 const q=report()
 assert.equal(q.approved,0)
 assert.equal(q.verifiedPublished,0)
 assert.equal(q.publisherSelectable,0)
 for(const x of q.rows){
  assert.match(x.originalQuestionRevisionSha256,/^[0-9a-f]{64}$/)
  assert.match(x.originalFileSha256,/^[0-9a-f]{64}$/)
  assert.equal(x.independentSubjectReviewer,null)
  assert.equal(x.schoolApprovalAuthenticated,false)
  assert.equal(x.published,false)
  assert.equal(x.releaseStatus,'RESEARCH_HOLD')
 }
})
test('teacher worklist is reproducible and does not contain verbatim original stems',()=>{
 const x=JSON.parse(fs.readFileSync(OUT,'utf8'))
 assert.deepEqual(x,report())
 assert.ok(!JSON.stringify(x).includes('question_text'))
 assert.ok(!JSON.stringify(x).includes('proposedEnglishConceptualModelExplanation'))
})

'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const m=require('../qbank/build-grade910-one-faculty-quality-worklist.cjs')
let cached
const result=()=>cached??(cached=m.build())
test('one cryptographically revision-bound 2581 original question set spans four exclusive faculty priorities',()=>{
 const x=result(),c=x.priorityCounts
 assert.equal(x.researchOriginalCandidates,2581)
 assert.equal(x.rows.length,2581)
 assert.equal(new Set(x.rows.map(q=>q.originalQuestionId)).size,2581)
 assert.equal(c.P0_CANONICAL_MCQ_KEY_MAPPING,24)
 assert.equal(c.P1_MARKS_ANSWER_RUBRIC_REVIEW,492)
 assert.equal(c.P2_SOURCE_LANGUAGE_ORIGINALITY,1167)
 assert.equal(c.P3_QUALIFIED_GENERAL_REVIEW,898)
 assert.equal(Object.values(c).reduce((a,b)=>a+b,0),2581)
})
test('no content/adoption/source issue can be automatically treated as faculty certified',()=>{
 const x=result()
 assert.equal(x.independentlyApproved,0)
 assert.equal(x.verifiedPublished,0)
 assert.equal(x.publication,'DENY')
 for(const q of x.rows){
  assert.match(q.originalQuestionRevisionSha256,/^[0-9a-f]{64}$/)
  assert.match(q.originalSourceFileSha256,/^[0-9a-f]{64}$/)
  assert.ok(Array.isArray(q.editorialSignalFlags))
  assert.ok(Array.isArray(q.applicabilityAndSourceSignalFlags))
  assert.equal(q.originalTeacherApproval,null)
  assert.equal(q.academicallyApproved,false)
  assert.equal(q.published,false)
  assert.equal(q.verifiedPaperStudioSelectable,false)
  assert.equal(q.independentAcademicAnswerCheckComplete,false)
 }
})
test('new all-inclusive worklist is deterministic, non-reproducing original text, and research-only',()=>{
 const disk=JSON.parse(fs.readFileSync(m.OUT,'utf8'))
 assert.deepEqual(disk,result())
 assert.equal(fs.readFileSync(m.SUMMARY,'utf8'),m.markdown(result()))
 for(const x of disk.rows){
  assert.equal(Object.hasOwn(x,'stem'),false)
  assert.equal(Object.hasOwn(x,'answer'),false)
  assert.equal(Object.hasOwn(x,'options'),false)
 }
})

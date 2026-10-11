'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {compile,OUT}=require('../qbank/report-grade910-frozen-coverage.cjs')
let cached
const result=()=>cached??(cached=compile())
test('coverage totals exactly preserve the 2581-original SHA-frozen cohort',()=>{
 const r=result()
 assert.equal(r.filesShaFrozen,73)
 assert.equal(r.originalResearchCandidates,2581)
 assert.equal(r.coverage.reduce((n,x)=>n+x.questionCount,0),2581)
 assert.equal(r.originalSources.reduce((n,x)=>n+x.questionCount,0),2581)
 assert.equal(r.originalSources.length,73)
 assert.ok(r.withoutQuestionLevelSubject>=44)
 assert.ok(r.coverage.some(x=>x.grade===null))
 for(const x of r.coverage){
  assert.equal(Object.values(x.questionTypes).reduce((n,k)=>n+k,0),x.questionCount)
  assert.equal(x.academicallyApproved,0)
  assert.equal(x.verifiedPublished,0)
 }
 assert.equal(r.publisherSelectable,false)
 assert.equal(r.releaseDecision,'DENY')
})
test('reproducible coverage manifest matches current frozen original metadata and contains no question stems',()=>{
 const j=JSON.parse(fs.readFileSync(OUT,'utf8'))
 assert.deepEqual(j,result())
 assert.equal(j.independentTeacherReviewCount,0)
 assert.equal(j.schoolAdoptionProven,false)
 assert.ok(!JSON.stringify(j).includes('question_text'))
})

'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const risk=require('../qbank/audit-grade910-66-residual-option-cues-20261015.cjs')
test('language-neutral length balancing has not silently erased other editorial risks',()=>{
 const r=risk.report(),a=r.aggregate
 assert.equal(a.total,66)
 assert.equal(a.alternativesChecked,198)
 assert.equal(a.originalStrongLengthOutliers,66)
 assert.equal(a.newStrongLengthOutliers,0)
 assert.equal(a.incorrectOptionsWithAbsoluteWordCue,102)
 assert.equal(a.referenceAnswersWithAbsoluteWordCue,2)
 assert.equal(a.questionsWithAnySuchDistractorCue,54)
 assert.equal(a.questionsWithTwoOrMoreSuchDistractors,34)
 assert.equal(a.correctOptionStillStrictlyLongest,15)
 assert.equal(a.independentlyQualifiedAcademicApprovals,0)
 assert.equal(a.published,0)
 assert.deepEqual(JSON.parse(fs.readFileSync(risk.out)),r)
})
test('each risk row is SHA-bound and excludes real academic approval',()=>{
 const r=risk.report()
 assert.equal(new Set(r.rows.map(x=>x.originalId)).size,66)
 for(const item of r.rows){
  assert.equal(item.individualDistractorFlags.length,3)
  assert.equal(item.individualDistractorFlags.filter(x=>x.lexicalAbsoluteCue).length,item.distractorsWithAbsoluteCue)
  assert.match(item.originalRevisionSha256,/^[a-f0-9]{64}$/)
  assert.match(item.proposalSha256,/^[a-f0-9]{64}$/)
  assert.equal(item.academicallyApproved,false)
  assert.equal(item.published,false)
 }
})
test('surface-language heuristic must not be mistaken for answer correctness',()=>{
 assert.equal(risk.absolute.test('only one ever'),true)
 assert.equal(risk.absolute.test('ہمیشہ ایک ہی طریقہ'),true)
 assert.equal(risk.absolute.test('a transparent and reliable procedure'),false)
 assert.match(risk.report().aggregate.caution,/NOT prove option factual incorrectness/)
})

'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {buildSummary}=require('../qbank/consolidate-grade910-numerical-qa.cjs')
const ROOT=path.resolve(__dirname,'../..')
test('complete Grade IX/X numerical authoring universe is 91 and no draft is missing or double counted',()=>{
 const result=buildSummary()
 assert.equal(result.counts.authoredNumericals,91)
 assert.equal(result.counts.covered,91)
 assert.equal(result.counts.arithmeticPassed,91)
 assert.equal(result.counts.arithmeticFailed,0)
 assert.deepEqual(result.byGrade,{IX:57,X:34})
 assert.equal(Object.keys(result.bySourceFile).length,13)
 assert.equal(new Set(result.records.map(x=>x.questionId)).size,91)
})
test('all 91 question hashes and mechanical-answer status are recorded without copied copyrighted problem text',()=>{
 const result=buildSummary()
 for(const r of result.records){
  assert.match(r.questionContentSha256,/^[0-9a-f]{64}$/)
  assert.equal(r.passed,true)
  assert.equal(r.mathematicalRecomputationPass,true)
  assert.equal(r.storedAnswerPass,true)
  for(const forbidden of ['stem','questionText','options','answer','correctOption'])assert.equal(Object.hasOwn(r,forbidden),false)
 }
})
test('full arithmetic QA does not imply source-page approval or independent human review',()=>{
 const result=buildSummary()
 for(const key of ['sourceVerifiedByPhysicalPage','independentlyHumanReviewed','approved','published'])assert.equal(result.counts[key],0)
 assert.equal(result.academicReleaseGranted,false)
 assert.equal(result.schoolBookAdoptionEvidenceCertified,false)
 assert.equal(result.questionLanguageEquivalenceIndependentlyCertified,false)
})
test('materialized evidence JSON is deterministic and identical to current verified draft snapshots',()=>{
 const saved=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_ALL_NUMERICAL_QA_CERTIFICATE_CANDIDATE_20261008.json'),'utf8'))
 assert.deepEqual(saved,buildSummary())
})

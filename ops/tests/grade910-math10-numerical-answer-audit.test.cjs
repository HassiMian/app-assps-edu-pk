'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {auditMathNumericals,mechanicalChecks}=require('../qbank/audit-math10-numerical-answers.cjs')
const root=path.resolve(__dirname,'../..')
const file=path.join(root,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/mathematics10OriginalReasoningBatch2026.json')
const draft=JSON.parse(fs.readFileSync(file,'utf8'))
const report=auditMathNumericals(draft)
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
test('all 11 Grade X original numerical working answers pass independent arithmetic + stored-result checks',()=>{
 assert.equal(report.numericalDraftCount,11)
 assert.equal(report.checked,11)
 assert.equal(report.passed,11)
 assert.equal(report.failed,0)
 assert.deepEqual(report.uncheckedNumericalIds,[])
})
test('question-level SHA pins every numerically checked draft and reviewer/approval flags remain false',()=>{
 assert.equal(report.originalFileSha256,sha(fs.readFileSync(file)))
 for(const r of report.results) {
  const original=draft.drafts.find(q=>q.id===r.questionId)
  assert.equal(r.questionContentSha256,sha(JSON.stringify(original)))
  assert.equal(r.numericalDerivationValid,true)
  assert.equal(r.savedAnswerCrosscheckPassed,true)
  assert.equal(r.independentlyHumanReviewed,false)
  assert.equal(r.sourcePageVerified,false)
  assert.equal(r.approved,false)
 }
 assert.equal(report.academicApproved,0)
 assert.equal(report.published,0)
})
test('incorrect saved numerical result is detected without changing original authoring file',()=>{
 const changed=JSON.parse(JSON.stringify(draft))
 const q=changed.drafts.find(x=>x.id==='X-MATH-C02-N02')
 q.content.en.answer='x=-4 and x=3.'
 const result=auditMathNumericals(changed)
 assert.equal(result.passed,10)
 assert.equal(result.failed,1)
 assert.equal(result.results.find(x=>x.questionId===q.id).savedAnswerCrosscheckPassed,false)
 assert.equal(result.results.find(x=>x.questionId===q.id).approved,false)
})
test('incorrect inverse or circle-radius stored answer fails closed',()=>{
 const changed=JSON.parse(JSON.stringify(draft))
 changed.drafts.find(x=>x.id==='X-MATH-C03-N02').content.en.answer='Inverse [[1,1],[1,2]]'
 changed.drafts.find(x=>x.id==='X-MATH-C08-N01').content.en.answer='12 cm'
 const result=auditMathNumericals(changed)
 assert.equal(result.failed,2)
 assert.equal(result.passed,9)
})
test('independent numerical result calculations are unchanged and cover exactly 11 stable identities',()=>{
 const keys=Object.keys(mechanicalChecks())
 assert.equal(keys.length,11)
 assert.equal(new Set(keys).size,11)
 assert.deepEqual(new Set(keys),new Set(draft.drafts.filter(q=>q.type==='numerical').map(q=>q.id)))
 assert.ok(keys.every(k=>mechanicalChecks()[k].numerical))
})

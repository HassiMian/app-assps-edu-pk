'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const crypto=require('node:crypto')
const path=require('node:path')
const {inspectMcqs}=require('../qbank/audit-mcq-key-patterns.cjs')
const p=path.resolve(__dirname,'../../docs/question-bank')
const original=JSON.parse(fs.readFileSync(path.join(p,'ASSPS_BIO9_CH1_ORIGINAL_PRACTICE_DRAFT_20261008.json'),'utf8'))
const revised=JSON.parse(fs.readFileSync(path.join(p,'ASSPS_BIO9_CH1_ORIGINAL_PRACTICE_REV2_20261008.json'),'utf8'))
const docket=JSON.parse(fs.readFileSync(path.join(p,'ASSPS_BIO9_CH1_ORIGINAL_REV2_REVIEW_DOCKET_20261008.json'),'utf8'))
const sha=v=>crypto.createHash('sha256').update(v).digest('hex')
test('revision2 is a same-question editorial revision, not a new question bank or academic approval',()=>{
 assert.equal(revised.questions.length,27)
 assert.deepEqual(revised.questions.map(x=>x.localId),original.questions.map(x=>x.localId))
 assert.equal(new Set(revised.questions.map(x=>x.localId)).size,27)
 for(const name of ['academicallyApproved','independentAnswerReview','independentCurriculumReview','productionQuestionBankImportAllowed','releaseEligible','sourceExerciseVerified']) assert.equal(revised[name],false)
 assert.equal(revised.revisionNumber,2)
 assert.equal(revised.parentDraftSha256,sha(fs.readFileSync(path.join(p,'ASSPS_BIO9_CH1_ORIGINAL_PRACTICE_DRAFT_20261008.json'))))
})
test('all MCQ answers and distractors are preserved byte-for-byte across option remapping',()=>{
 for(let i=0;i<original.questions.length;i++){
  const x=original.questions[i],y=revised.questions[i]
  assert.equal(y.questionText,x.questionText)
  assert.equal(y.marks,x.marks)
  assert.equal(y.type,x.type)
  if(x.type==='mcq'){
   assert.equal(y.options['ABCD'.indexOf(y.correctOption)],x.options['ABCD'.indexOf(x.correctOption)])
   assert.deepEqual([...y.options].sort(),[...x.options].sort())
   assert.equal(y.answerExplanation,x.answerExplanation)
  }else assert.deepEqual(y,x)
 }
})
test('MCQ sequence no longer periodic and original 12-question pattern remains untouched',()=>{
 assert.ok(inspectMcqs(original.questions).findings.some(x=>x.type==='PREDICTABLE_MCQ_KEY_SEQUENCE'))
 assert.deepEqual(inspectMcqs(revised.questions).findings,[])
 assert.equal(revised.questions.filter(x=>x.type==='mcq').map(x=>x.correctOption).join(''),'BDACBADBCADC')
})
test('every review docket item is revision bound and pending independent human review',()=>{
 assert.equal(docket.revisionSha256,sha(fs.readFileSync(path.join(p,docket.revisionFile))))
 assert.equal(docket.items.length,27)
 assert.equal(docket.sourceVerified,0)
 assert.equal(docket.independentlyReviewed,0)
 assert.equal(docket.approved,0)
 assert.equal(docket.published,0)
 for(const item of docket.items) {
  const originalQ=original.questions.find(x=>x.localId===item.localQuestionId)
  const revisedQ=revised.questions.find(x=>x.localId===item.localQuestionId)
  assert.equal(item.sourceQuestionSha256,sha(JSON.stringify(originalQ)))
  assert.equal(item.revisionContentSha256,sha(JSON.stringify(revisedQ)))
  assert.equal(item.academicReview,'PENDING')
  assert.equal(item.sourcePageVerified,false)
  assert.equal(item.answerIndependentlyVerified,false)
  assert.equal(item.reviewerId,null)
  assert.equal(item.approved,false)
 }
})

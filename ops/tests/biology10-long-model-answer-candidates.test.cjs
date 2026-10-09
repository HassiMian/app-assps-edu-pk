'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {build,markdown,ANSWERS,LOCKED_SOURCE_SHA}=require('../qbank/author-biology10-long-model-answer-candidates.cjs')
const ROOT=path.resolve(__dirname,'../..')
const file=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/biology10EnglishStarter2026.json')
const bytes=fs.readFileSync(file),source=JSON.parse(bytes)
const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')))
const sha=data=>crypto.createHash('sha256').update(data).digest('hex')
const run=(b=bytes,s=source,r=registry)=>build({bytes:b,source:s,registry:r})
test('new original authored model-answer proposals cover all and only 20 real Grade X Biology long questions',()=>{
 const d=run()
 assert.equal(sha(bytes),LOCKED_SOURCE_SHA)
 assert.equal(d.originalDraftQuestions,60)
 assert.equal(d.originalLongRubricOnlyQuestions,20)
 assert.equal(d.proposedLongModelAnswers,20)
 assert.equal(d.items.length,20)
 assert.equal(new Set(d.items.map(x=>x.questionId)).size,20)
 assert.deepEqual(d.items.map(x=>x.questionId),
   source.drafts.filter(q=>q.type==='long').map(x=>x.id))
 assert.equal(d.approved,0);assert.equal(d.published,0)
})
test('all 20 answers are complete, newly explanatory prose and marking criteria are separate from answer text',()=>{
 const d=run()
 for(const x of d.items){
  assert.ok(x.proposedEnglishModelAnswer.length>=180,x.questionId)
  assert.ok(!/^\s*award\s/i.test(x.proposedEnglishModelAnswer),x.questionId)
  assert.equal(x.proposedIndependentMarkingPoints.length,5,x.questionId)
  assert.equal(new Set(x.proposedIndependentMarkingPoints).size,5)
  assert.equal(x.marks,5)
  assert.equal(x.originalQuestionAndAnswerUnmodified,true)
  assert.match(x.originalQuestionSha256,/^[a-f0-9]{64}$/)
  assert.match(x.originalAnswerSha256,/^[a-f0-9]{64}$/)
  assert.equal(x.independentReviewerId,null)
  assert.equal(x.qualifiedTeacherReviewed,undefined)
  assert.equal(x.answerCorrectnessVerifiedByQualifiedTeacher,false)
  assert.equal(x.schoolEditionAndPrintedPageIndependentlyVerified,false)
  assert.equal(x.englishUrduEquivalenceReviewed,false)
  assert.equal(x.academicApproved,false)
  assert.equal(x.published,false)
 }
 assert.ok(d.items.find(x=>x.questionId==='X-BIO-2026-C07-B02-L01').proposedEnglishModelAnswer.includes('1 AA : 2 Aa : 1 aa'))
 assert.ok(d.items.find(x=>x.questionId==='X-BIO-2026-C03-B02-L01').proposedEnglishModelAnswer.includes('pulmonary veins'))
})
test('proposals do not silently reuse original marking-only answer text',()=>{
 const d=run()
 const originals=new Map(source.drafts.map(x=>[x.id,x]))
 for(const row of d.items){
  assert.notEqual(row.proposedEnglishModelAnswer,originals.get(row.questionId).content.en.answer)
  assert.equal(row.originalAnswerSha256,sha(originals.get(row.questionId).content.en.answer))
  assert.equal(row.originalQuestionSha256,sha(JSON.stringify(originals.get(row.questionId))))
 }
})
test('changing flagged or unflagged original answers invalidates immutable batch source SHA',()=>{
 for(const id of ['X-BIO-2026-C01-B01-L01','X-BIO-2026-C10-B02-M01']){
  const changed=structuredClone(source)
  const q=changed.drafts.find(x=>x.id===id);assert.ok(q)
  q.content.en.answer='Altered evidence not approved'
  assert.throws(()=>run(Buffer.from(JSON.stringify(changed)),changed),
   /BIO10_MODEL_ANSWER_SOURCE_REVISION_DRIFT/)
 }
})
test('forged input document object cannot bypass the original file SHA pin',()=>{
 const changed=structuredClone(source)
 changed.drafts[0].content.en.answer='Modified object only'
 assert.throws(()=>run(bytes,changed),/BIO10_MODEL_ANSWER_SOURCE_REVISION_DRIFT/)
})
test('incorrect underlying Biology X textbook PDF source ID/hash cannot be used for publication',()=>{
 const fake=structuredClone(registry)
 fake.entries.find(x=>x.recordId===source.sourceRecordId).pdfSha256='0'.repeat(64)
 assert.throws(()=>run(bytes,source,fake),/BIO10_MODEL_ANSWER_SOURCE_REGISTRY_DRIFT/)
})
test('positive nonapproval and closed paper picker status survive generated Markdown reporting',()=>{
 const d=run(),md=markdown(d)
 assert.ok(md.includes('20 full student-readable explanations'))
 assert.ok(md.includes('Independent qualified review: 0; approved: 0; published: 0'))
 assert.equal(d.qualifiedTeacherReviewed,0)
 assert.equal(d.published,0)
 assert.equal(d.items.every(x=>x.approvedRevisionId===null),true)
 assert.ok(md.includes('HOLD'))
})
test('all five marking points are specific and internally distinct on the original authored Biology scope',()=>{
 const d=run()
 for(const x of d.items){
  const q=source.drafts.find(z=>z.id===x.questionId)
  assert.equal(x.chapterNo,q.chapter.number)
  assert.equal(x.topicId,q.topicId)
  assert.ok(x.proposedIndependentMarkingPoints.every(s=>s.length>=12))
 }
 assert.equal(Object.keys(ANSWERS).length,20)
})

'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {inspect,audit}=require('../qbank/audit-bilingual-structural-parity.cjs')
const {collectDocuments}=require('../qbank/audit-authoring-crossfile-qa.cjs')
const {buildReviewQueue}=require('../qbank/build-grade910-review-triage.cjs')
const root=path.resolve(__dirname,'../..')
const docs=collectDocuments(),result=audit(docs)
test('all dual-language authored records scanned once without inventing translations',()=>{
 assert.equal(result.totalBilingual,54)
 assert.equal(result.mcqs,18)
 assert.equal(result.short,30)
 assert.equal(result.long,6)
 assert.equal(result.structuralPass,50)
 assert.equal(result.structuralFail,4)
 assert.equal(result.independentlyEquivalent,0)
 assert.equal(result.approved,0)
})
test('exact four incomplete research questions are flagged, original source hashes match',()=>{
 const failed=result.records.filter(r=>!r.structuralCheckPassed)
 assert.deepEqual(failed.map(x=>x.questionId),[1,2,3,4].map(n=>'IX-BIO-EM-RESEARCH-C01-T0101-S0'+n))
 for(const item of failed){
  assert.deepEqual(item.structuralIssues,['ur:STEM_MISSING','ur:ANSWER_MISSING'])
  const file=docs.find(x=>x.file===item.sourceFile)
  const original=file.data.drafts.find(q=>q.id===item.questionId)
  assert.equal(item.questionContentSha256,crypto.createHash('sha256').update(JSON.stringify(original)).digest('hex'))
  assert.equal(item.academicApproved,false)
 }
})
test('dual-language MCQ answer-option mismatch and missing option is rejected',()=>{
 const q={id:'S',medium:'dual',type:'mcq',correctOptionId:'B',content:{
  en:{stem:'Question',answer:'Yes',options:['No','Yes','Maybe','Unknown'].map((text,i)=>({id:'ABCD'[i],text}))},
  ur:{stem:'سوال',answer:'جی',options:['نہیں','جی','شاید','نامعلوم'].map((text,i)=>({id:'ABCD'[i],text}))}
 }}
 assert.deepEqual(inspect(q).structuralIssues,[])
 q.content.ur.answer='غلط'
 assert.ok(inspect(q).structuralIssues.includes('ur:ANSWER_NOT_IDENTICAL_TO_SELECTED_OPTION'))
 q.content.ur.options.pop()
 assert.ok(inspect(q).structuralIssues.includes('ur:OPTION_COUNT_NOT_FOUR'))
})
test('4 incomplete dual-language questions are blocked in metadata-only reviewer queue',()=>{
 const manifest=require('../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
 const report=buildReviewQueue(docs,manifest)
 assert.equal(report.blockerCounts.URDU_DUAL_CONTENT_COMPLETION_REQUIRED,4)
 assert.equal(report.counts.questionRecords,2581)
 assert.equal(report.counts.approved,0)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { isQuestionEligibleForPaper, mapBackendQuestionRow, mergeBackendQuestionBankRows } from './questionBankBackendSync.js'

const row = {
 id: 101, subject: 'Biology', class_level: '10th', chapter_name: 'Inheritance', topic_name: 'DNA',
 question_type: 'mcq', question_text: 'DNA ka bunyadi role kya hai?',
 options: [{id:'A',text:'Genetic information'}, {id:'B',text:'Heat transfer'}], correct_option:'A', answer:'Genetic information',
 marks:1, difficulty:'easy', priority:'conceptual', board:'Punjab Board', medium:'Urdu', is_approved:false,
 source:'PECTAA source', tags:['grade10']
}

test('backend row maps to local question without promoting provisional approval',()=>{
 const q=mapBackendQuestionRow(row,'sub1')
 assert.equal(q.id,'db_q_101');assert.equal(q.medium,'urdu');assert.equal(q.text,'');assert.equal(q.textUrdu,row.question_text)
 assert.equal(q.answer,'A');assert.equal(q.priority,'additional');assert.equal(q.backendPriority,'conceptual')
 assert.equal(q.isApproved,false);assert.equal(q.approvalStatus,'provisional');assert.equal(q.options[0].label,'A')
})

test('merge creates subject, preserves existing local data, and is idempotent by backend id',()=>{
 const original={subjects:[{id:'local-sub',name:'English',classLevel:'9th'}],questions:[{id:'local-q',subjectId:'local-sub',type:'short',text:'Local question',chapter:'Unit 1'}],seedInfo:{}}
 const first=mergeBackendQuestionBankRows(original,[row],{scope:'school-1'})
 assert.equal(first.stats.inserted,1);assert.equal(first.store.subjects.length,2);assert.equal(first.store.questions.length,2)
 assert(first.store.questions.some(q=>q.id==='local-q'));assert.equal(first.store.seedInfo.backendQuestionBank.scope,'school-1')
 const second=mergeBackendQuestionBankRows(first.store,[{...row,is_approved:true}],{scope:'school-1'})
 assert.equal(second.stats.inserted,0);assert.equal(second.stats.updated,1);assert.equal(second.store.questions.length,2)
 const synced=second.store.questions.find(q=>q.backendQuestionId===101);assert.equal(synced.isApproved,true);assert.equal(synced.approvalStatus,'approved')
})

test('content duplicate is skipped even when backend id is new',()=>{
 const store={subjects:[{id:'b10',name:'Biology',classLevel:'10th'}],questions:[{id:'manual',subjectId:'b10',type:'mcq',textUrdu:row.question_text,text:'',chapter:'Inheritance'}]}
 const merged=mergeBackendQuestionBankRows(store,[{...row,id:202}],{scope:'school-1'})
 assert.equal(merged.stats.inserted,0);assert.equal(merged.stats.skippedDuplicates,1);assert.equal(merged.store.questions.length,1)
})


test('paper-generation eligibility excludes explicit provisional rows without hiding legacy approved/unknown rows', () => {
  assert.equal(isQuestionEligibleForPaper({ isApproved:false, approvalStatus:'provisional' }), false)
  assert.equal(isQuestionEligibleForPaper({ isApproved:false, approvalStatus:'approved' }), false)
  assert.equal(isQuestionEligibleForPaper({ approvalStatus:'provisional' }), false)
  assert.equal(isQuestionEligibleForPaper({ isApproved:true, approvalStatus:'approved' }), true)
  assert.equal(isQuestionEligibleForPaper({}), true)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {termAssessmentRows,buildTermOverview} from '../termPlanningModel.js'

const range={start:'2026-10-01',end:'2026-10-31'}

test('replayed proposal may change date but cannot forge original academic provenance',()=>{
 const original=[{id:'en',subject:'English',events:[{
   date:'2026-10-17',originalDate:'2026-10-17',
   origin:'PROPOSED',sourceId:'source-p',name:'Draft assessment'
 }]}]
 const key='src:en|2026-10-17|source-p|PROPOSED'
 const edited=termAssessmentRows(original,[{id:key,subjectId:'en',date:'2026-10-19',
   origin:'ORIGINAL_SOURCE',academicApproval:true,
   sourceId:'forged-source',originalDate:'2026-10-01',name:'Fake official'}],range).find(x=>x.id===key)
 assert.equal(edited.id,key)
 assert.equal(edited.date,'2026-10-19')
 assert.notEqual(edited.origin,'ORIGINAL_SOURCE')
 assert.equal(edited.academicApproval,false)
 assert.equal(edited.sourceId,'source-p')
 assert.equal(edited.originalDate,'2026-10-17')
 assert.equal(edited.name,'Fake official')
})

test('manually entered and suggested assessments never inherit forged approval',()=>{
 const subject=[{id:'en',subject:'English',events:[]}]
 const results=termAssessmentRows(subject,[
   {id:'manual-new',subjectId:'en',date:'2026-10-20',
    origin:'ORIGINAL_SOURCE',academicApproval:true,sourceId:'forged'},
   {id:'suggested:en:2026-10:1',subjectId:'en',date:'2026-10-17',
    origin:'ORIGINAL_SOURCE',academicApproval:true,sourceId:'forged'}
 ],range)
 const manual=results.find(x=>x.id==='manual-new')
 const suggested=results.find(x=>x.id==='suggested:en:2026-10:1')
 for(const item of [manual,suggested]){
   assert.ok(item)
   assert.notEqual(item.origin,'ORIGINAL_SOURCE')
   assert.equal(item.academicApproval,false)
   assert.equal(item.sourceId,'')
 }
 assert.equal(manual.date,'2026-10-20')
 assert.equal(suggested.date,'2026-10-17')
})

test('paired source-backed A/B page bounds remain immutable under saved draft edits',()=>{
 const source={candidate_key:'part-source',source_subject_label:'English',
   source_submissions:['fixture-source'],
   source_detail_records:[{source_id:'fixture-source',source_excerpt_pieces:[
     {verbatim:'15 October to 21 October\nPage 31 to 40\nUnit 7: Formation of clouds'}]}]}
 const pair={candidate_key:'paired',source_subject_label:'English',
   source_submissions:['fixture-a','fixture-b'],
   sourceVariants:[{part:'A',candidate:source},{part:'B',candidate:source}]}
 const [base]=buildTermOverview([pair],{start:'2026-10-15',end:'2027-02-15'})
 const [edited]=buildTermOverview([pair],{start:'2026-10-15',end:'2027-02-15',
   edits:{paired:{pageFrom:'1',pageTo:'999',detail:'Teacher draft note'}}})
 assert.equal(base.pageFrom,'31')
 assert.equal(base.pageTo,'40')
 assert.equal(edited.pageFrom,base.pageFrom)
 assert.equal(edited.pageTo,base.pageTo)
 assert.equal(edited.sourcePageFrom,base.pageFrom)
 assert.equal(edited.sourcePageTo,base.pageTo)
 assert.equal(edited.detail,'Teacher draft note')
 assert.ok(edited.warnings.some(x=>x.includes('original')))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeMarksExam,matchesMarksExam,pickMarksExam} from './marksEntryModel.js'
const saved=[
 {id:14,name:'Assessment 1',type:'AS',class:'All Classes',session:'2026-2027',total_marks:20,pass_marks:8},
 {id:15,name:'Assessment 2',type:'AS',class:'All Classes',session:'2026-2027',total_marks:20,pass_marks:8},
 {id:16,name:'Assessment 3',type:'AS',class:'All Classes',session:'2026-2027',total_marks:20,pass_marks:8},
 {id:17,name:'Assessment 4',type:'AS',class:'All Classes',session:'2026-2027',total_marks:20,pass_marks:8},
].map(normalizeMarksExam)
test('all four real assessment definitions normalize for Marks Entry',()=>{
 assert.deepEqual(saved.map(x=>x.type),['Assessment','Assessment','Assessment','Assessment'])
 assert.ok(saved.every(x=>x.class==='All Classes'&&x.session==='2026-2027'&&x.pass_marks===8))
})
test('All Classes exam is selectable for Starter to Seven and promoted Pre Nine',()=>{
 for(const klass of ['Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven','Pre Nine']){
  assert.ok(saved.every(x=>matchesMarksExam(x,'Assessment',klass)),klass)
 }
})
test('exam type/selection preserve a specific Assessment rather than First Term',()=>{
 assert.equal(pickMarksExam(saved,'Assessment','Seven',15)?.id,15)
 assert.equal(pickMarksExam(saved,'Assessment','Pre Nine',14)?.id,14)
 assert.equal(pickMarksExam(saved,'Term Exam','Seven'),null)
})
test('incorrect school class and unknown scope are rejected where applicable',()=>{
 assert.equal(matchesMarksExam(normalizeMarksExam({type:'AS',class:'Seven'}),'Assessment','Six'),false)
 assert.equal(matchesMarksExam(saved[0],'Term Exam','Seven'),false)
})

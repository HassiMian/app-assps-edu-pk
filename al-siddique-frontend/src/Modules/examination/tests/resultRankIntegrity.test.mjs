import test from 'node:test'
import assert from 'node:assert/strict'
import { auditClassPositions } from '../resultRankIntegrity.js'
const s = (id, cls='Mover') => ({id,className:cls})
const r = (id,subject,obtained,total=50) => ({student_id:id,subject,marks_obtained:obtained,total_marks:total,result_status:'SCORED'})
test('shared complete Mover syllabus ranks by marks with standard ties',()=>{
 const rows=[r(1,'English',50),r(1,'Urdu',45),r(2,'English',40),r(2,'Urdu',40),r(3,'English',40),r(3,'Urdu',40)]
 const out=auditClassPositions(rows,[s(1),s(2),s(3)])
 assert.equal(out.issues.size,0);assert.equal(out.ranks.get('1'),'1st');assert.equal(out.ranks.get('2'),'2nd');assert.equal(out.ranks.get('3'),'2nd')
})
test('an extra Computer subject cannot fabricate first class position',()=>{
 const rows=[r(1,'English',48),r(1,'Urdu',48),r(2,'English',47),r(2,'Urdu',47),r(2,'Computer',85,100)]
 const out=auditClassPositions(rows,[s(1),s(2)])
 assert.equal(out.issues.size,1);assert.equal(out.ranks.size,0)
})
test('blanks and AB cannot become zero-score ranks',()=>{
 const rows=[r(1,'English',50),r(2,'English',null)]
 assert.equal(auditClassPositions(rows,[s(1),s(2)]).ranks.size,0)
 const absent=[r(1,'English',50),{...r(2,'English',0),result_status:'ABSENT'}]
 assert.equal(auditClassPositions(absent,[s(1),s(2)]).ranks.size,0)
})
test('class cohorts independently rank where clean',()=>{
 const rows=[r(1,'English',50),r(2,'English',47),r(3,'English',50),r(3,'Computer',80,100),r(4,'English',49)]
 const out=auditClassPositions(rows,[s(1,'One'),s(2,'One'),s(3),s(4)])
 assert.equal(out.ranks.get('1'),'1st');assert.equal(out.ranks.get('2'),'2nd');assert.equal(out.issues.has('mover'),true);assert.equal(out.ranks.has('4'),false)
})

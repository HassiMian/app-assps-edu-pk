import test from 'node:test'
import assert from 'node:assert/strict'
import { projectMoverFirstTermRows } from '../moverFirstTermRoster.js'
import { auditClassPositions } from '../resultRankIntegrity.js'
const mover = id => ({id,className:'Mover'})
const row = (id,subject,obtained,total) => ({student_id:id,subject,marks_obtained:obtained,total_marks:total,result_status:'SCORED'})
const roster=[['English Written',50],['Mathematics Written',50],['Urdu Written',50],
 ['English Oral',25],['Mathematics Oral',25],['Urdu Oral',25],['General Knowledge Oral',25]]
test('42 students: Computer historical mark kept as evidence but never in exam 9 projection or class rank',()=>{
 const students=Array.from({length:42},(_,i)=>mover(i+1))
 const results=students.flatMap(s=>roster.map(([subject,total])=>row(s.id,subject, s.id===1 ? total : total-1,total)))
 results.push(row(2,'Computer',85,100))
 const copy=JSON.stringify(results)
 const project=projectMoverFirstTermRows(results,students,{id:9,school_id:1})
 assert.equal(results.length,295)
 assert.equal(project.rows.length,294)
 assert.equal(project.excluded.length,1)
 assert.equal(project.excluded[0].subject,'Computer')
 assert.equal(JSON.stringify(results),copy)
 const out=auditClassPositions(project.rows,students)
 assert.equal(out.issues.size,0)
 assert.equal(out.ranks.get('1'),'1st')
 assert.equal(out.ranks.get('2'),'2nd')
})
test('subject names and maxima must match the exact official Mover 250-point roster',()=>{
 const result=projectMoverFirstTermRows([
 row(1,'English Written',50,100),
 row(1,'English Written',50,50),
 row(1,'General Knowledge Oral',0,25),
 row(1,'Art',25,25),
 ],[mover(1)],{id:9,school_id:1})
 assert.equal(result.rows.length,2)
 assert.equal(result.excluded.length,2)
 assert.equal(result.rows.find(x=>x.subject==='General Knowledge Oral').marks_obtained,0)
})
test('other schools and other exams retain original independent marks unchanged',()=>{
 const rows=[row(1,'Computer',85,100)]
 const students=[mover(1)]
 assert.equal(projectMoverFirstTermRows(rows,students,{id:9,school_id:2}).rows.length,1)
 assert.equal(projectMoverFirstTermRows(rows,students,{id:12,school_id:1}).rows.length,1)
})

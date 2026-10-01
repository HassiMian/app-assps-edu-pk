import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateFirstTermStudent, gradeFromPercentage } from '../firstTermResultIntegrity.js'

const exam = { id:9, school_id:1, name:'First Term Exam', session:'2026-2027' }
const student = { id:21, name:'Local test student', class:'One', section:'Yellow' }
const schedule = [
 { class_name:'One', section:'Yellow', subject:'English', total_marks:50, pass_marks:20, pass_percentage:40 },
 { class_name:'One', section:'Yellow', subject:'Mathematics', total_marks:60, pass_marks:20, pass_percentage:33 },
 { class_name:'One', section:'Blue', subject:'English', total_marks:50, pass_marks:17, pass_percentage:33 },
]
const mark = (subject, marks_obtained, total_marks) => ({ subject, marks_obtained, total_marks, student_id:21 })
const evaluate = (rows, scheduledSubjects=schedule) => evaluateFirstTermStudent({ exam, student, rows, scheduledSubjects })

test('custom percentage changes subject outcome, and failed subject prevents overall Pass', () => {
 const result=evaluate([mark('English',19,50),mark('Mathematics',60,60)])
 assert.equal(result.complete,true)
 assert.equal(result.status,'Fail')
 assert.deepEqual(result.rows.map(r=>[r.subject,r.pass_marks,r.grade,r.subject_status]),[
  ['English',20,'F','Fail'],['Mathematics',20,'A+','Pass'],
 ])
 assert.equal(gradeFromPercentage(25),'E')
})

test('all papers recorded at their selected thresholds produce complete Pass', () => {
 const result=evaluate([mark('English',20,50),mark('Mathematics',20,60)])
 assert.equal(result.complete,true)
 assert.equal(result.status,'Pass')
 assert.equal(result.expectedCount,2)
 assert.equal(result.enteredCount,2)
 assert.deepEqual(result.missing,[])
})

test('an actual zero is recorded as 0 (Fail), not mistaken for a missing mark', () => {
 const result=evaluate([mark('English',0,50),mark('Mathematics',20,60)])
 assert.equal(result.complete,true)
 assert.equal(result.status,'Fail')
 assert.equal(result.rows[0].marks_obtained,0)
 assert.equal(result.rows[0].grade,'F')
})

test('no premature final result: missing, blank, duplicate or conflicting paper is incomplete', () => {
 for (const rows of [
  [mark('English',20,50)],
  [mark('English',20,50),mark('Mathematics','',60)],
  [mark('English',20,50),mark('English',21,50),mark('Mathematics',20,60)],
  [mark('English',20,100),mark('Mathematics',20,60)],
 ]) {
  const result=evaluate(rows)
  assert.equal(result.complete,false)
  assert.equal(result.status,'Incomplete')
  assert.ok(result.missing.length>0)
 }
})

test('unverified scheme, unavailable schedule, wrong class/section cannot become final', () => {
 assert.equal(evaluate([mark('English',25,50),mark('Mathematics',25,60)],null).complete,false)
 assert.equal(evaluate([mark('English',25,50)],schedule.filter(s=>s.section==='Blue')).complete,false)
 const mismatch=schedule.map(s=>s.subject==='English'&&s.section==='Yellow'?{...s,pass_marks:17}:s)
 assert.equal(evaluate([mark('English',25,50),mark('Mathematics',25,60)],mismatch).complete,false)
 const missingTotal=schedule.map(s=>s.subject==='English'&&s.section==='Yellow'?{...s,total_marks:null}:s)
 assert.equal(evaluate([mark('English',25,50),mark('Mathematics',25,60)],missingTotal).complete,false)
})

test('legacy exams retain their saved results without imposing official First Term schedule', () => {
 const result=evaluateFirstTermStudent({ exam:{...exam,id:10},student,rows:[mark('English',30,50)],scheduledSubjects:null })
 assert.equal(result.complete,true)
 assert.equal(result.rows.length,1)
})

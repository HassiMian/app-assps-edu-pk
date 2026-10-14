import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasSavedScore, registerFilterRows, resolveRegisterOffering,
  registerScoreInfo, registerSummary, escapeRegisterHtml,
} from '../src/Modules/examination/marksRegisterModel.js'
const exam = { total_marks: 100, subject_offerings: [
  { class_name:'Five',section:'Purple',subject:'English',total_marks:75,pass_marks:30 },
  { class_name:'Five',section:'',subject:'English',total_marks:70,pass_marks:28 },
  { class_name:'Six',section:'',subject:'English',total_marks:60,pass_marks:24 },
] }
const records = [
  { id:1, student_id:1, name:'A',student_class:'Five',student_section:'Purple',subject:'English',marks_obtained:0 },
  { id:2, student_id:2, name:'B',student_class:'Five',student_section:'Blue',subject:'English',marks_obtained:null },
  { id:3, student_id:3, name:'C',student_class:'Six',student_section:'Purple',subject:'English',marks_obtained:27 },
  { id:4, student_id:1, name:'A',student_class:'Five',student_section:'Purple',subject:'Science',marks_obtained:53 },
]
test('zero is a saved score; blank is not', () => {
  assert.equal(hasSavedScore(0), true)
  assert.equal(hasSavedScore('0'), true)
  assert.equal(hasSavedScore(''), false)
  assert.equal(hasSavedScore(null), false)
  assert.equal(hasSavedScore(undefined), false)
  assert.equal(hasSavedScore('not a number'), false)
})
test('class plus section filter isolates exact class records', () => {
  const scoped = registerFilterRows(records, {className:'5',section:'Purple'})
  assert.equal(scoped.length, 2)
  assert.deepEqual(scoped.map(x=>x.student_id),[1,1])
  assert.equal(registerFilterRows(records,{className:'Six',section:'Purple'}).length,1)
  assert.equal(registerFilterRows(records,{className:'Five',subject:'English'}).length,2)
})
test('approved section-specific subject maxima and pass marks override generic ones', () => {
  const purple = registerScoreInfo(records[0], exam)
  assert.equal(purple.score,0)
  assert.equal(purple.maximum,75)
  assert.equal(purple.pass,30)
  assert.equal(purple.status,'FAIL')
  assert.equal(registerScoreInfo(records[1],exam).maximum,70)
  assert.equal(registerScoreInfo(records[1],exam).status,'NOT ENTERED')
  assert.equal(registerScoreInfo(records[2],exam).status,'PASS')
  assert.equal(resolveRegisterOffering(exam, records[2]).total_marks,60)
})
test('missing pass policy does not fabricate a threshold', () => {
  assert.deepEqual(registerScoreInfo(records[3],{total_marks:60}),{score:53,maximum:60,pass:null,status:'RECORDED'})
})
test('summary includes recorded zero, deduplicates students', () => {
  assert.deepEqual(registerSummary(records,exam),{records:4,students:3,entered:3,pending:1})
})
test('special results are not converted to numeric zero', () => {
  assert.equal(registerScoreInfo({...records[0],result_state:'absent'},exam).score,null)
  assert.equal(registerScoreInfo({...records[0],result_state:'absent'},exam).status,'ABSENT')
})
test('print content is HTML encoded to prevent script injection', () => {
  assert.equal(escapeRegisterHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;')
})

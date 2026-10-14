import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasSavedScore, registerFilterRows, registerEditGuard, registerSnapshotMatches, registerRowKey, orderRegisterRows, resolveRegisterOffering,
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

test('only existing saved numeric records with matched exam may be corrected', () => {
  const source = {...records[0],exam_id:11,total_marks:75}
  const storedExam = {...exam,id:11}
  assert.deepEqual(registerEditGuard(source,storedExam,'29.50').payload,{
    exam_id:11,student_id:1,subject:'English',marks_obtained:29.5,total_marks:75,
  })
  assert.equal(registerEditGuard(source,storedExam,'0').error,'')
  assert.match(registerEditGuard({...source,exam_id:12},storedExam,'4').error,/identity/)
  assert.match(registerEditGuard({...source,marks_obtained:null},storedExam,'4').error,/existing numeric/)
  assert.match(registerEditGuard({...source,marks_obtained:0,result_state:'absent'},storedExam,'4').error,/existing numeric/)
})
test('no negative, scientific notation, more than two decimals or overflow', () => {
  const row={...records[0],exam_id:11,total_marks:75}
  const e={...exam,id:11}
  for (const value of ['-1','76','1e2','12.345','','NaN','Infinity']) {
    assert.ok(registerEditGuard(row,e,value).error, value)
  }
  assert.equal(registerEditGuard(row,e,'75.00').error,'')
})
test('reject edit when original maximum and authoritative subject policy conflict', () => {
  const row={...records[0],exam_id:11,total_marks:60}
  assert.match(registerEditGuard(row,{...exam,id:11},'20').error,/differs from approved/)
})
test('preflight detects score, maximum, revision, grade, identity drift', () => {
  const original={...records[0],exam_id:11,updated_at:'2026-10-14T03:01:00Z',grade:'F'}
  assert.equal(registerSnapshotMatches(original,{...original}),true)
  assert.equal(registerSnapshotMatches(original,{...original,marks_obtained:15}),false)
  assert.equal(registerSnapshotMatches(original,{...original,total_marks:60}),false)
  assert.equal(registerSnapshotMatches(original,{...original,updated_at:'2026-10-14T03:02:00Z'}),false)
  assert.equal(registerSnapshotMatches(original,{...original,grade:'A'}),false)
  assert.equal(registerSnapshotMatches(original,{...original,student_id:999}),false)
  assert.equal(registerSnapshotMatches(original,null),false)
  assert.equal(registerRowKey(original),'11::1::english')
})
test('default register arrangement sorts class, section, GR, and subject', () => {
  const rows = [
    {student_id:3,class:'Six',section:'Purple',gr_number:'GR-3',subject:'English'},
    {student_id:2,class:'Five',section:'Purple',gr_number:'GR-10',subject:'Urdu'},
    {student_id:4,class:'Five',section:'Blue',gr_number:'GR-2',subject:'Science'},
    {student_id:1,class:'Five',section:'Purple',gr_number:'GR-2',subject:'Math'},
  ]
  assert.deepEqual(orderRegisterRows(rows).map(x=>x.student_id),[4,1,2,3])
})
test('percentage sorting never treats a missing score as a zero', () => {
  const rows=[{id:1,marks_obtained:null,total_marks:70},{id:2,marks_obtained:0,total_marks:60},{id:3,marks_obtained:45,total_marks:50}]
  assert.deepEqual(orderRegisterRows(rows,'high').map(x=>x.id),[3,2,1])
  assert.deepEqual(orderRegisterRows(rows,'low').map(x=>x.id),[2,3,1])
})

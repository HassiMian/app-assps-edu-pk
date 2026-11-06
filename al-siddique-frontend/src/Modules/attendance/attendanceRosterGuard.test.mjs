import test from 'node:test'
import assert from 'node:assert/strict'
import {attendanceCanonicalClass,attendanceStudentMatchesScope,reconcileAttendanceRoster} from './attendanceRosterGuard.js'
const preNine={id:101,class:'Pre Nine',section:'Blue',name:'Pre Nine Student'}
const nineFatima={id:201,class:'Nine',section:'Fatima',name:'Grade Nine Student'}
const nineUsman={id:202,class:'Nine',section:'Usman',name:'Nine Usman Student'}
test('Pre Nine is a distinct grade from Nine under all official spellings',()=>{
 assert.equal(attendanceCanonicalClass('Pre-Nine'),'pre nine')
 assert.equal(attendanceCanonicalClass('Pre 9'),'pre nine')
 assert.equal(attendanceCanonicalClass('9'),'nine')
 assert.notEqual(attendanceCanonicalClass('Pre Nine'),attendanceCanonicalClass('Nine'))
})
test('Pre Nine Blue matching real 12-student cohort cannot admit Nine Fatima or Usman',()=>{
 assert.equal(attendanceStudentMatchesScope(preNine,'Pre Nine','Blue'),true)
 assert.equal(attendanceStudentMatchesScope(nineFatima,'Pre Nine','Blue'),false)
 assert.equal(attendanceStudentMatchesScope(nineUsman,'Pre Nine','Blue'),false)
})
test('Grade Nine Fatima cannot inherit Nine Usman section or Pre Nine Blue',()=>{
 assert.equal(attendanceStudentMatchesScope(nineFatima,'Nine','Fatima'),true)
 assert.equal(attendanceStudentMatchesScope(nineUsman,'Nine','Fatima'),false)
 assert.equal(attendanceStudentMatchesScope(preNine,'Nine','Fatima'),false)
})
test('mixed backend student roster is rejected, not silently blended',()=>{
 assert.throws(()=>reconcileAttendanceRoster([preNine,nineFatima],[], 'Pre Nine','Blue'),/ATTENDANCE_ROSTER_SCOPE_MISMATCH/)
})
test('Pre Nine with explicit hyphen class label remains in own cohort',()=>{
 const v=reconcileAttendanceRoster([{...preNine,class:'Pre-Nine'}],[{student_id:101,status:'present'}],'Pre Nine','Blue')
 assert.equal(v.students.length,1);assert.equal(v.marks[101],'present')
})
test('missing student class or section identity fails closed for Grade Nine and Pre Nine',()=>{
 for(const field of ['class','section']){
  const data={...preNine};delete data[field]
  assert.throws(()=>reconcileAttendanceRoster([data],[],'Pre Nine','Blue'),/ATTENDANCE_ROSTER_SCOPE_MISMATCH/)
 }
})
test('roster duplicates and malformed IDs block acceptance',()=>{
 assert.throws(()=>reconcileAttendanceRoster([preNine,preNine],[],'Pre Nine','Blue'),/ATTENDANCE_ROSTER_IDENTIFIER_INVALID/)
 assert.throws(()=>reconcileAttendanceRoster([{...preNine,id:'not-a-number'}],[],'Pre Nine','Blue'),/ATTENDANCE_ROSTER_IDENTIFIER_INVALID/)
})
test('attendance API cannot inject a student ID outside verified roster',()=>{
 const r=reconcileAttendanceRoster([preNine],[{student_id:101,status:'present'},{student_id:201,status:'absent'}],'Pre Nine','Blue')
 assert.equal(r.marks[101],'present');assert.equal(r.marks[201],undefined);assert.deepEqual(Object.keys(r.marks),['101'])
})
test('a conflicting grade on attendance record does not set even matching student ID',()=>{
 const r=reconcileAttendanceRoster([preNine],[{student_id:101,class:'Nine',section:'Blue',status:'present'}],'Pre Nine','Blue')
 assert.deepEqual(r.marks,{})
})
test('wrong section from attendance API is filtered without importing it',()=>{
 const r=reconcileAttendanceRoster([preNine],[{student_id:101,class:'Pre Nine',section:'Fatima',status:'absent'}],'Pre Nine','Blue')
 assert.equal(Object.keys(r.marks).length,0)
})
test('invalid marks status does not enter a saveable record',()=>{
 const r=reconcileAttendanceRoster([preNine],[{student_id:101,status:'compromised'}],'Pre Nine','Blue')
 assert.deepEqual(r.marks,{})
})
test('valid present, absent, late and leave statuses are preserved for correct students',()=>{
 const ss=[0,1,2,3].map(i=>({...preNine,id:i+1}))
 const rows=['present','absent','late','leave'].map((status,i)=>({student_id:i+1,status}))
 const got=reconcileAttendanceRoster(ss,rows,'Pre Nine','Blue')
 assert.deepEqual(Object.values(got.marks),['present','absent','late','leave'])
})
test('empty and malformed response must not be promoted to a loaded attendance scope',()=>{
 assert.throws(()=>reconcileAttendanceRoster({},[],'Pre Nine','Blue'),/ATTENDANCE_RESPONSE_INVALID/)
 assert.throws(()=>reconcileAttendanceRoster([],[], '', 'Blue'),/ATTENDANCE_SCOPE_REQUIRED/)
})

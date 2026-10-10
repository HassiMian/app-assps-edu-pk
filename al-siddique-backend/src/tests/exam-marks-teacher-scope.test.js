'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {
  isTeacher,examMatchesStudent,hasTeacherAssignment,
  validateTeacherMarksWrite,teacherResultReadScope,
}=require('../services/examMarksTeacherScope')

const schoolId=21, user={id:77,role:'teacher'}
const students=[{id:101,class:'One',section:'A'},{id:102,class:'Two',section:'B'}]
const exams=[{id:9,class:'All Classes'},{id:18,class:'Class Two'}]
const assignments=[
 {school_id:21,teacher_user_id:77,class_name:'One',section:'A',subject:'English',is_active:true},
 {school_id:21,teacher_user_id:77,class_name:'Two',section:'B',subject:'Mathematics',is_active:true},
]
const row=(studentId=101,examId=9,subject='English')=>({studentId,examId,subject})
const check=(results,opts={})=>validateTeacherMarksWrite({user,schoolId,results,students,exams,assignments,...opts})

test('authorized assigned teacher can write only matching school/class/section/subject',()=>{
 assert.equal(check([row()]),true)
 assert.equal(check([row(102,9,'Mathematics')]),true)
 assert.equal(check([row(),row(102,9,'Mathematics')]),true)
 assert.equal(check([row(101,9,'Mathematics')]),false)
 assert.equal(check([row(102,9,'English')]),false)
 assert.equal(check([row(101,18,'English')]),false)
 assert.equal(check([row(999,9,'English')]),false)
 assert.equal(check([row(101,99,'English')]),false)
 assert.equal(check([]),false)
})

test('assignment must be active, in same tenant, same teacher and matching scope',()=>{
 for (const mutation of [
  {school_id:22},{teacher_user_id:88},{is_active:false},
  {class_name:'Two'},{section:'B'},{subject:'Urdu'},
 ]) {
  assert.equal(check([row()],{assignments:[{...assignments[0],...mutation}]}),false,JSON.stringify(mutation))
 }
 assert.equal(check([row()],{assignments:[]}),false)
 assert.equal(check([row()],{user:{role:'teacher',id:0}}),false)
 assert.equal(check([row()],{schoolId:0}),false)
 assert.equal(check([row()],{students:[{id:0,class:'One',section:'A'}]}),false)
 assert.equal(check([row()],{exams:[{id:9,class:'Two'}]}),false)
})

test('legacy class names and class-all term exams can match without broadening assignment',()=>{
 assert.equal(examMatchesStudent({class:'Class One'},students[0]),true)
 assert.equal(examMatchesStudent({class:'1'},students[0]),true)
 assert.equal(examMatchesStudent({class:'All Classes'},students[0]),true)
 assert.equal(examMatchesStudent({class:'Class Two'},students[0]),false)
 assert.equal(hasTeacherAssignment([{...assignments[0],section:'',subject:''}],21,77,students[0],'Urdu'),true)
 assert.equal(hasTeacherAssignment([{...assignments[0],section:'B',subject:''}],21,77,students[0],'Urdu'),false)
})

test('teacher result reads use DB-level EXISTS for school, class, section, subject',()=>{
 const scope=teacherResultReadScope({user},'s','er',4)
 assert.deepEqual(scope.params,[77])
 assert.equal(scope.nextIndex,5)
 for(const token of ['teacher_class_assignments','tca.school_id = s.school_id','tca.teacher_user_id = $4',
   'tca.is_active = true',"LOWER(tca.class_name)","LOWER(tca.section)","LOWER(tca.subject)","er.subject"])
  assert.ok(scope.clause.includes(token),token)
 const invalid=teacherResultReadScope({user:{role:'teacher',id:null}},'s','er',1)
 assert.equal(invalid.clause,' AND 1=0')
 assert.deepEqual(invalid.params,[])
 assert.equal(isTeacher({user}),true)
 assert.deepEqual(teacherResultReadScope({user:{role:'principal',id:77}},'s','er',1),{clause:'',params:[],nextIndex:1})
})

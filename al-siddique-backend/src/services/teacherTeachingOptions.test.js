'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const { buildTeacherTeachingOptions }=require('./teacherTeachingOptions')

const row=(overrides={})=>({
 school_id:7,teacher_user_id:42,class_name:'Seven',section:'A',
 subject:'English',is_active:true,...overrides,
})

test('zero assignments fail closed instead of listing school-wide classes',()=>{
 assert.deepEqual(buildTeacherTeachingOptions([],7,42),[])
 assert.deepEqual(buildTeacherTeachingOptions([row()],null,42),[])
 assert.deepEqual(buildTeacherTeachingOptions([row()],7,null),[])
})

test('teacher receives only own tenant, own role, exact class/section/subject',()=>{
 const data=[
  row(),row({subject:'english'}),row({subject:'Urdu'}),
  row({school_id:8,subject:'Physics'}),row({teacher_user_id:43,subject:'Science'}),
  row({class_name:'Eight',section:'B',subject:'Math'}),
  row({subject:''}),row({class_name:''}),
 ]
 assert.deepEqual(buildTeacherTeachingOptions(data,7,42),[
  {class_name:'Seven',section:'A',subjects:['English','Urdu']},
  {class_name:'Eight',section:'B',subjects:['Math']}
 ])
})

test('teacher teaching-options route uses scoped assignments before all-school roster',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../routes/portalRoutes.js'),'utf8')
 const start=source.indexOf("router.get('/teaching-options'")
 const end=source.indexOf("router.get('/online-classes'",start)
 const route=source.slice(start,end)
 assert.ok(start>=0&&end>start)
 assert.ok(route.indexOf("req.user?.role") < route.indexOf('FROM students'))
 assert.match(route,/getTeacherAssignments/)
 assert.match(route,/assignment_required: classes.length === 0/)
 assert.match(route,/return res.json/)
})

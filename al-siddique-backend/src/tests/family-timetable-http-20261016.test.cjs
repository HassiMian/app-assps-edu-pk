'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const http=require('node:http')
const express=require('express')
const original=Module._load
const selections=[]
Module._load=function(name,parent,...rest){
 if(name==='../config/database'&&parent?.filename?.endsWith('portalRoutes.js'))
  return {query:async(sql,args)=>{
    selections.push({sql,args})
    if(sql.includes('FROM students'))return {rows:args[1]===10?
      [{id:71,name:'Child A',class:'Four',section:'Blue'}]:[]}
    if(sql.includes('FROM timetable'))return {rows:[
      {class_name:'Four',section:'Blue',period_label:'Period 1',subject:'Urdu',teacher_display_name:'Miss Aqsa',teacher_id:4192},
      {class_name:'Four',section:'Blue',period_label:'Period 5',subject:'English',teacher_display_name:'Miss Sumaira',teacher_id:2378}]}
    throw Error('unexpected SQL: '+sql)
  }}
 if(name==='../middleware/auth'&&parent?.filename?.endsWith('portalRoutes.js'))
  return {protect:(req,res,next)=>{
   req.user={role:req.headers['x-test-role']||'parent',id:Number(req.headers['x-test-user']||10)}
   next()
  },requireRoles:()=>((req,res,next)=>next())}
 if(name==='../middleware/tenant'&&parent?.filename?.endsWith('portalRoutes.js'))
  return {currentSchoolId:req=>Number(req.headers['x-test-school']||1)}
 return original.call(this,name,parent,...rest)
}
const route=require('../routes/portalRoutes.js')
Module._load=original
const app=express();app.use('/portal',route)
let server,port
const GET=async(path,role='parent',user=10,school=1)=>{
 const r=await fetch('http://127.0.0.1:'+port+'/portal'+path,{headers:{'x-test-role':role,'x-test-user':String(user),'x-test-school':String(school)}})
 return {code:r.status,data:await r.json()}
}
test('Start isolated HTTP router',async()=>{
 server=http.createServer(app)
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 port=server.address().port
})
test('Parent: only own student records; correct Friday no-break 5th; teacher name and incharge',async()=>{
 const x=await GET('/family-timetable?day=Friday')
 assert.equal(x.code,200);assert.equal(x.data.success,true)
 assert.equal(x.data.data.children.length,1)
 const c=x.data.data.children[0]
 assert.equal(c.class_incharge.name,'Miss Aqsa')
 assert.equal(c.periods.find(p=>p.label==='Period 5').start,'10:40')
 assert.equal(c.periods.find(p=>p.label==='Period 5').teacher,'Miss Sumaira')
 assert(!x.data.data.bell_schedule.some(p=>p.kind==='break'))
 assert(selections.some(x=>x.sql.includes('parent_user_id=$2')&&x.args[1]===10))
 assert(selections.some(x=>x.sql.includes('source_sha256 IN') && x.args.length===5))
})
test('Different parent gets no child records and never queries timetable',async()=>{
 selections.length=0
 const x=await GET('/family-timetable?day=Monday','parent',99)
 assert.equal(x.code,200);assert.equal(x.data.data.children.length,0)
 assert(!selections.some(x=>x.sql.includes('FROM timetable')))
})
test('Teacher role cannot use parent read',async()=>{
 const x=await GET('/family-timetable?day=Friday','teacher')
 assert.equal(x.code,403);assert.equal(x.data.code,'FAMILY_ROLE_REQUIRED')
})
test('Invalid weekday rejected, no unchecked DB query',async()=>{
 selections.length=0
 const x=await GET('/family-timetable?day=Any%27%20OR%201=1')
 assert.equal(x.code,400);assert.equal(x.data.code,'INVALID_SCHOOL_DAY')
 assert.equal(selections.length,0)
})
test('Other SaaS tenants cannot inherit the ASSPS timetable policy',async()=>{
 selections.length=0
 const x=await GET('/family-timetable?day=Friday','parent',10,2)
 assert.equal(x.code,409);assert.equal(x.data.code,'TENANT_TIMETABLE_POLICY_NOT_CONFIGURED')
 assert.equal(selections.length,0)
})
test('Close isolated HTTP server',async()=>{await new Promise(resolve=>server.close(resolve))})

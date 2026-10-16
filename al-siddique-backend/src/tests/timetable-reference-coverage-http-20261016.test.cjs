'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
const Module=require('node:module')
const express=require('express'),http=require('node:http')
const {SOURCE_SHAS}=require('../services/approvedSchoolTimetable')
const scheduleGroups=[['Four','Blue',17],['Five','Blue',23],['Six','Blue',20],['Seven','Blue',22],['Pre-Nine','',0],['Nine','Fatima',7],['Nine','Usman',9]]
const sourceRows=scheduleGroups.flatMap(([cls,section])=>Array.from({length:8},(_,i)=>({class_name:cls,section,period_label:'Period '+(i+1),subject:'Science',teacher_display_name:'Miss Aqsa',teacher_id:i===1?null:4192,academic_session:'2026–27',source_sha256:cls==='Nine'?SOURCE_SHAS[1]:SOURCE_SHAS[0],staff_identity_reviewed:false}))).concat([
 {class_name:'School-wide',section:'',period_label:'Assembly',source_sha256:SOURCE_SHAS[0]},
 {class_name:'School-wide',section:'',period_label:'Break',source_sha256:SOURCE_SHAS[0]}
])
const roster=scheduleGroups.filter(x=>x[2]>0).map(([cls,section,n])=>({class:cls,section,n,parent_linked:n})).concat([{class:'Eight',section:'Blue',n:11,parent_linked:11}])
let route,dbCalls=[],server,port
const original=Module._load
Module._load=function(name,parent,...rest){
 if(name==='../config/database'&&parent?.filename?.endsWith('timetableReferenceRoutes.js'))
  return {query:async(sql)=>{
   dbCalls.push(sql)
   if(sql.includes('FROM public.timetable'))return {rows:sourceRows}
   if(sql.includes('FROM public.students'))return {rows:roster}
   throw Error('Unexpected SQL')
  }}
 if(name==='../middleware/auth'&&parent?.filename?.endsWith('timetableReferenceRoutes.js'))
  return {protect:(req,res,next)=>{req.user={role:req.headers['x-test-role']||'admin'};req.school_id=Number(req.headers['x-test-school']||1);next()},requireScopeForServiceOnly:()=>((req,res,next)=>next())}
 return original.call(this,name,parent,...rest)
}
try{route=require('../routes/timetableReferenceRoutes.js')}finally{Module._load=original}
const app=express();app.use('/timetable',route)
test('Start local mock-auth reference',async()=>{server=http.createServer(app);await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port})
const get=async(role,school=1)=>{const r=await fetch('http://127.0.0.1:'+port+'/timetable/reference',{headers:{'x-test-role':role,'x-test-school':String(school)}});return {status:r.status,json:await r.json()}}
test('Admin gets correct source, approved timing, only aggregated coverage, not teacher account IDs',async()=>{
 dbCalls=[]
 const r=await get('admin')
 assert.equal(r.status,200);assert.equal(r.json.success,true)
 assert.equal(r.json.data.length,58)
 assert.equal(r.json.coverage.decision,'HOLD_FULL_RELEASE')
 assert.equal(r.json.coverage.fully_verified_subject_timetable_students,98)
 assert.equal(r.json.coverage.students_subject_timetable_pending,11)
 assert.equal(r.json.approvedBellTimings.friday.find(x=>x.label==='Period 5').start,'10:40')
 assert(r.json.data.every(x=>!Object.hasOwn(x,'teacher_id')))
 assert(dbCalls.some(sql=>sql.includes('FROM public.students')))
})
test('Teacher gets timetable but not school-wide student aggregate',async()=>{
 dbCalls=[]
 const r=await get('teacher');assert.equal(r.status,200);assert.equal(r.json.coverage,null)
 assert(!dbCalls.some(sql=>sql.includes('FROM public.students')))
})
test('Another school does not get ASSPS-approved bell profile',async()=>{
 const r=await get('admin',2);assert.equal(r.status,200)
 assert.equal(r.json.approvedTimingVersion,null);assert.equal(r.json.coverage,null)
})
test('Parent cannot access schoolwide teacher directory',async()=>{
 const r=await get('parent');assert.equal(r.status,403)
})
test('Stop mock server',async()=>{await new Promise(r=>server.close(r))})

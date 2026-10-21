'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const express = require('express')
const http = require('node:http')
const path = require('node:path')
let assignments = [], writes = 0, selectSql = '', selectParams = []
const originalLoad = Module._load
const next = (req, res, follow) => { req.user={id:17,role:'teacher',school_id:1}; follow() }
const fake = {
 '../config/database': {pool:{connect:async()=>{throw Error('unexpected pool')}},applyTenantContext:()=>{},
  query:async (sql,params)=>{
   if(sql.includes('FROM students')) {
    selectSql=sql;selectParams=params
    if(params[0]==='DENIED'&&sql.includes('teacher_class_assignments'))return{rows:[]}
    return{rows:[{id:901,name:'Fixture Student',gr_number:params[0],class:'Five',section:'A',school_id:1,tenant_id:'tenant1',parent_phone:null}]}
   }
   if(sql.includes('INSERT INTO attendance')){writes++;return{rows:[{id:7,student_id:901}]}}
   throw Error('unexpected SQL')
  }},
 '../middleware/auth':{protect:next,requireRoles:()=>next,requireScopeForServiceOnly:()=>next,hasServiceScope:()=>false},
 '../middleware/tenant':{currentSchoolId:()=>1,currentTenantId:()=> 'tenant1',hasColumn:async()=>true,tenantClause:()=>({clause:'',params:[],nextIndex:1})},
 '../services/teacherAssignmentService':{getTeacherAssignments:async()=>assignments,
  teacherStudentScopeClause:(req,alias,startIndex)=>({clause:' AND EXISTS (SELECT 1 FROM teacher_class_assignments tca WHERE tca.teacher_user_id = $'+startIndex+' AND tca.school_id = '+alias+'.school_id AND tca.is_active = true)',params:[17],nextIndex:startIndex+1})},
 '../services/twilioSettings':{getTwilioConfigForSchool:async()=>({}),buildTwilioClient:()=>null}
}
let routes
try {
 Module._load=function(request,parent,isMain){return Object.hasOwn(fake,request)?fake[request]:originalLoad.call(this,request,parent,isMain)}
 routes=require(path.resolve(__dirname,'../routes/attendanceRoutes.js'))
} finally {Module._load=originalLoad}
const app=express();app.use(express.json());app.use('/api/attendance',routes)
const server=http.createServer(app);let url
test.before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port+'/api/attendance/mark-by-gr'})
test.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))})
const send=async gr_number=>{const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({gr_number,status:'present',date:'2026-10-20'}),signal:AbortSignal.timeout(2000)});return{status:response.status,body:await response.json()}}
test('teacher without active assignments cannot scan attendance',async()=>{
 assignments=[];writes=0
 const r=await send('ANY')
 assert.equal(r.status,409);assert.equal(r.body.code,'TEACHER_ASSIGNMENTS_REQUIRED');assert.equal(writes,0)
})
test('assigned teacher cannot scan unauthorized GR outside class',async()=>{
 assignments=[{class_name:'One',section:'A'}];writes=0
 const r=await send('DENIED')
 assert.equal(r.status,404);assert.match(selectSql,/teacher_class_assignments/);assert.equal(selectParams.at(-1),17);assert.equal(writes,0)
})
test('assigned teacher can scan class-authorized GR',async()=>{
 assignments=[{class_name:'Five',section:'A'}];writes=0
 const r=await send('ALLOWED')
 assert.equal(r.status,200);assert.equal(r.body.success,true);assert.match(selectSql,/teacher_class_assignments/);assert.equal(writes,1)
})

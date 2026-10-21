'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const express = require('express')
const http = require('node:http')
const path = require('node:path')
const sourcePath = path.resolve(__dirname, '../routes/attendanceRoutes.js')
let connectAttempts = 0
let anyQuery = 0
const originalLoad = Module._load
const next = (req, res, follow) => { req.user = {id:17,role:'principal',school_id:1};follow() }
const db = {
  pool:{connect: async () => {connectAttempts++;throw new Error('synthetic database unavailable: sensitive internal details')}},
  query:async () => {anyQuery++;throw new Error('unexpected query')},
  applyTenantContext:()=>{}
}
const lookup = {
 '../config/database':db,
 '../middleware/auth':{protect:next,requireRoles:()=>next,requireScopeForServiceOnly:()=>next,hasServiceScope:()=>false},
 '../middleware/tenant':{tenantClause:()=>({clause:'',params:[]}),currentSchoolId:()=>1,currentTenantId:()=> 'assps',hasColumn:async()=>true},
 '../services/teacherAssignmentService':{teacherStudentScopeClause:()=>({clause:'',params:[],nextIndex:1}),getTeacherAssignments:async()=>[]},
 '../services/twilioSettings':{getTwilioConfigForSchool:async()=>({}),buildTwilioClient:()=>null}
}
let route
try {
 Module._load = function(request,parent,isMain) { if (Object.hasOwn(lookup,request)) return lookup[request];return originalLoad.call(this,request,parent,isMain) }
 route = require(sourcePath)
} finally {Module._load = originalLoad}
const app = express();app.use(express.json());app.use('/api/attendance',route)
const server = http.createServer(app)
let base

test.before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port})
test.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))})
const send=async body=> {const r=await fetch(base+'/api/attendance/mark',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(1800)});return {code:r.status,body:await r.json()}}
test('bulk Attendance connection rejection returns controlled 503 without leaking internal error or persisting rows',async()=>{
 const priorError=console.error
 const diagnostics=[]
 console.error=(...args)=>diagnostics.push(args.join(' '))
 let r
 try {r=await send({date:'2026-10-20',records:[{student_id:901,status:'present'}]})}
 finally {console.error=priorError}
 assert.ok(diagnostics.some(line=>line.includes('Attendance bulk save failed')))
 assert.ok(diagnostics.every(line=>!line.includes('sensitive internal details')))

 assert.equal(r.code,503);assert.equal(r.body.success,false)
 assert.equal(r.body.error,'ATTENDANCE_STORAGE_UNAVAILABLE')
 assert.equal(r.body.saved,0);assert.equal(r.body.requestedCount,1)
 assert.ok(!JSON.stringify(r.body).includes('sensitive internal details'))
 assert.equal(anyQuery,0);assert.equal(connectAttempts,1)
})
test('empty and malformed attendance input rejects before connecting to database',async()=>{
 const blank=await send({records:[]});assert.equal(blank.code,400)
 const invalid=await send({records:[{status:'present'}]});assert.equal(invalid.code,400)
 assert.equal(connectAttempts,1);assert.equal(anyQuery,0)
})

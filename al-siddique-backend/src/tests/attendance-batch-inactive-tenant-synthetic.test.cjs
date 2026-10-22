'use strict'
// Synthetic, in-process HTTP tests. No production credentials, database, or student writes.
const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const express = require('express')
const http = require('node:http')
const path = require('node:path')
let writes = [], rollbacks = 0, commits = 0
const client = {
  query: async (sql, params = []) => {
    if (sql === 'BEGIN') return { rows:[], rowCount:0 }
    if (sql === 'ROLLBACK') { rollbacks++; return { rows:[], rowCount:0 } }
    if (sql === 'COMMIT') { commits++; return { rows:[], rowCount:0 } }
    if (/FROM students WHERE id = ANY/.test(sql) && /is_active = true/.test(sql)) {
      // Only id=101 is eligible under school_id=1 and tenant='assps'.
      assert.ok(sql.includes('tenant_id = '), 'active roster must be tenant scoped')
      return {rows:params[0].includes(101)?[{id:101,name:'Synthetic Active',parent_phone:null,school_id:1,tenant_id:'assps'}]:[],rowCount:params[0].includes(101)?1:0}
    }
    if (/FROM students WHERE id = ANY/.test(sql) && /is_active = false/.test(sql)) {
      assert.ok(sql.includes('school_id = $2'), 'inactive lookup must bind same school')
      assert.ok(sql.includes('tenant_id = $3'), 'inactive lookup must bind same tenant')
      assert.equal(params[1],1); assert.equal(params[2],'assps')
      return {rows:params[0].includes(102)?[{id:102}]:[],rowCount:params[0].includes(102)?1:0}
    }
    if (/INSERT INTO attendance/.test(sql)) { writes.push(params); return {rows:[{id:9901}],rowCount:1} }
    throw new Error('Unexpected synthetic SQL: '+sql.slice(0,110))
  },
  release:()=>{}
}
const next=(req,res,continueWith)=>{req.user={id:77,role:'principal',school_id:1,tenant_id:'assps'}; continueWith()}
const fake={
  '../config/database':{pool:{connect:async()=>client},query:async(sql)=>{if(/FROM schools s/.test(sql))return{rows:[{school_name:'Synthetic School'}]};throw Error('Unexpected query')},applyTenantContext:async()=>{}},
  '../middleware/auth':{protect:next,requireRoles:()=>next,requireScopeForServiceOnly:()=>next,hasServiceScope:()=>false},
  '../middleware/tenant':{tenantClause:()=>({clause:'',params:[],nextIndex:1}),currentSchoolId:()=>1,currentTenantId:()=> 'assps',hasColumn:async()=>true},
  '../services/teacherAssignmentService':{teacherStudentScopeClause:()=>({clause:'',params:[],nextIndex:1}),getTeacherAssignments:async()=>[]},
  '../services/twilioSettings':{getTwilioConfigForSchool:async()=>({waFrom:null}),buildTwilioClient:()=>null},
}
const originalLoad=Module._load
let routes
try {
  Module._load=function(request,parent,isMain){return Object.hasOwn(fake,request)?fake[request]:originalLoad.call(this,request,parent,isMain)}
  routes=require(path.resolve(__dirname,'../routes/attendanceRoutes.js'))
} finally {Module._load=originalLoad}
const app=express();app.use(express.json());app.use('/api/attendance',routes)
const server=http.createServer(app);let url
// Use Node test lifecycle; requests never reach production.
test.before(async()=>{await new Promise(ok=>server.listen(0,'127.0.0.1',ok));url='http://127.0.0.1:'+server.address().port+'/api/attendance/mark'})
test.after(async()=>{server.closeAllConnections();await new Promise(ok=>server.close(ok))})
async function send(ids){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({records:ids.map(id=>({student_id:id,status:'present',date:'2026-10-22'}))}),signal:AbortSignal.timeout(2500)});return{status:response.status,body:await response.json()}}
test('same-school struck-off student is skipped while valid attendance commits',async()=>{
 writes=[];rollbacks=0;commits=0
 const r=await send([101,102]);assert.equal(r.status,200);assert.equal(r.body.savedCount,1);assert.equal(r.body.skippedInactiveCount,1);assert.deepEqual(r.body.skippedInactiveIds,[102]);assert.equal(commits,1);assert.equal(rollbacks,0);assert.equal(writes.length,1);assert.equal(writes[0].includes(101),true);assert.equal(writes[0].includes(102),false)
})
test('foreign-school or unknown student rejects whole batch atomically',async()=>{
 writes=[];rollbacks=0;commits=0
 const r=await send([101,201]);assert.equal(r.status,400);assert.equal(r.body.error,'INVALID_STUDENT_IDS');assert.deepEqual(r.body.invalidIds,[201]);assert.equal(writes.length,0);assert.equal(commits,0);assert.equal(rollbacks,1)
})
test('unknown student is not silently converted to inactive',async()=>{
 writes=[];rollbacks=0;commits=0
 const r=await send([303]);assert.equal(r.status,400);assert.deepEqual(r.body.invalidIds,[303]);assert.equal(writes.length,0);assert.equal(commits,0);assert.equal(rollbacks,1)
})

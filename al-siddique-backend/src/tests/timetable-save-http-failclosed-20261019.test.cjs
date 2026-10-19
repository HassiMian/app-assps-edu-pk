'use strict'
// All actors and DB calls in this file are synthetic. Never attach live credentials.
const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const Module = require('node:module')
const express = require('express')
const path = require('node:path')
const guard = require('../services/timetableWriteGuard')
const calls = []
const original = Module._load
const routeFile = path.resolve(__dirname, '../routes/timetableRoutes.js')
const db = {
  query: async () => { calls.push('query'); throw Error('Unexpected live query') },
  pool: { connect: async () => { calls.push('connect'); throw Error('Unexpected DB connection') } },
  applyTenantContext: async () => { calls.push('tenant'); throw Error('Unexpected tenant context') }
}
let loaded
try {
  Module._load = function(request, parent, isMain) {
    if (parent?.filename === routeFile) {
      if (request === '../config/database') return db
      if (request === '../middleware/auth') return {
        protect(req, res, next) {
          if (!req.headers['x-fixture-role']) return res.status(401).json({success:false, code:'MOCK_AUTH_REQUIRED'})
          req.user = {id:1, school_id:Number(req.headers['x-fixture-school'] || 1),role:req.headers['x-fixture-role']}
          req.school_id = Number(req.headers['x-fixture-bound-school'] || req.user.school_id)
          next()
        },
        requireScopeForServiceOnly: () => (_, __, next) => next()
      }
      if (request === '../middleware/tenant') return {tenantClause: async () => ({clause:'',params:[]})}
      if (request === '../domain/schoolBellSchedule') return {schoolBellSchedule: id => ({school_id:id})}
    }
    return original.call(this,request,parent,isMain)
  }
  loaded = require(routeFile)
} finally { Module._load = original }
const app = express()
app.use(express.json())
app.use('/api/timetable',loaded)
let server, base
test.before(async () => {
  server=http.createServer(app)
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  base='http://127.0.0.1:'+server.address().port
  delete process.env.ASSPS_TIMETABLE_SOURCE_INDEPENDENTLY_ATTESTED
  delete process.env.ASSPS_TIMETABLE_APPROVED_SOURCE_SHA256
})
test.after(async () => {if(server)await new Promise(resolve=>server.close(resolve))})
async function post(body={},headers={}) {
  const r=await fetch(base+'/api/timetable/save', {
    method:'POST',headers:{'content-type':'application/json',...headers},
    body:JSON.stringify(body)
  })
  return {status:r.status,body:await r.json()}
}
test('anonymous request fails before any pool access',async()=>{
  calls.length=0;const r=await post({})
  assert.equal(r.status,401);assert.deepEqual(calls,[])
})
test('teacher, clerk and unrelated superadmin cannot replace timetable',async()=>{
  for(const role of ['teacher','clerk','super_admin']){
    calls.length=0;const r=await post({entries:[]},{'x-fixture-role':role})
    assert.equal(r.status,403,role);assert.deepEqual(calls,[],role)
  }
})
test('peer-school override and unverified principal school context fail closed',async()=>{
  for(const [headers,body] of [
    [{'x-fixture-role':'principal','x-fixture-school':'2'}, {school_id:1,entries:[]}],
    [{'x-fixture-role':'principal','x-fixture-school':'1','x-fixture-bound-school':'2'}, {entries:[]}]
  ]){
    calls.length=0;const r=await post(body,headers)
    assert.equal(r.status,403);assert.deepEqual(calls,[])
  }
})
test('principal cannot write until source has independent attestation',async()=>{
  calls.length=0;const r=await post({school_id:1, entries:[]},{'x-fixture-role':'principal'})
  assert.equal(r.status,409);assert.equal(r.body.code,'TIMETABLE_SOURCE_ATTESTATION_HOLD')
  assert.deepEqual(calls,[])
})
test('attestation is insufficient to authorize empty schedule replacement',async()=>{
  process.env.ASSPS_TIMETABLE_SOURCE_INDEPENDENTLY_ATTESTED='true'
  process.env.ASSPS_TIMETABLE_APPROVED_SOURCE_SHA256=guard.APPROVED_SHA
  calls.length=0;const r=await post({school_id:1, entries:[]},{'x-fixture-role':'principal'})
  assert.equal(r.status,422);assert.deepEqual(calls,[])
  delete process.env.ASSPS_TIMETABLE_SOURCE_INDEPENDENTLY_ATTESTED
  delete process.env.ASSPS_TIMETABLE_APPROVED_SOURCE_SHA256
})

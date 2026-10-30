'use strict'
// Exercises the actual POST /api/exams route with synthetic isolated actor
// and a mocked database. Does NOT connect to production PostgreSQL.
const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const Module = require('node:module')
const path = require('node:path')

test('principal assessment creation accepts whole marks and rejects unsafe drafts before writes', async t => {
  const actor = { id: 51, role: 'principal', school_id: 7 }
  const inserted = []
  const db = {
    pool: { connect: async () => { throw new Error('must not connect for POST create') } },
    query: async (sql, params) => {
      if (String(sql).includes('INSERT INTO exams')) {
        inserted.push(params)
        return { rows: [{id: 202, school_id: 7, name: params[1], type: params[2], class: params[3], session: params[4], total_marks: params[7], pass_marks: params[8]}] }
      }
      return {rows: []}
    },
    applyTenantContext: async () => {},
  }
  const auth = {
    protect: (req,_res,next) => { req.user = actor; next() },
    requireRoles: (...roles) => (req,res,next) => roles.includes(actor.role) ? next() : res.status(403).json({success:false}),
    requireScopeForServiceOnly: () => (_req,_res,next) => next(),
    hasServiceScope: () => false,
  }
  const tenant = { currentSchoolId: () => actor.school_id, hasColumn: async () => true, tenantClause: () => ({}) }
  const routePath = path.resolve(__dirname, '../routes/examRoutes.js')
  const orig = Module._load
  let router
  try {
    Module._load = function (request,parent,isMain) {
      if (parent?.filename === routePath) {
        if (request === '../config/database') return db
        if (request === '../middleware/auth') return auth
        if (request === '../middleware/tenant') return tenant
      }
      return orig.apply(this,arguments)
    }
    delete require.cache[routePath]
    router = require(routePath)
  } finally {
    Module._load = orig
  }
  t.after(() => {delete require.cache[routePath]})
  const app = express()
  app.use(express.json())
  app.use('/api/exams',router)
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening',resolve))
  t.after(() => server.close())
  const base = 'http://127.0.0.1:' + server.address().port
  const draft = { name:'Assessment 1', type:'AS', class:'All Classes', session:'2026-2027', total_marks:25, pass_marks:10 }
  async function create(body) {
    const response = await fetch(base+'/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
    return {status:response.status, body:await response.json()}
  }
  const saved = await create(draft)
  assert.equal(saved.status,201)
  assert.equal(saved.body.data.name,'Assessment 1')
  assert.equal(inserted.length,1)
  assert.deepEqual(inserted[0].slice(1,5),['Assessment 1','AS','All Classes','2026-2027'])
  for (const body of [
    {...draft,total_marks:12.5}, {...draft,pass_marks:12.5},
    {...draft,total_marks:''}, {...draft,pass_marks:''},
    {...draft,pass_marks:26}, {...draft,name:''},
    {...draft,session:''},
  ]) {
    const outcome = await create(body)
    assert.equal(outcome.status,422,JSON.stringify(body))
  }
  assert.equal(inserted.length,1,'invalid data never reached INSERT')
})

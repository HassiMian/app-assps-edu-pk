'use strict'
// All HTTP requests, actors, and student records in this test are synthetic.
// Database and auth modules are intercepted before the actual attendance route loads.
const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const express = require('express')
const http = require('node:http')
const path = require('node:path')
const routePath = path.resolve(__dirname, '../routes/attendanceRoutes.js')
const originalLoad = Module._load
let actualScopeClause
try {
  Module._load = function (name, parent, isMain) {
    if (name === '../config/database') return { query: async () => { throw Error('unexpected real query') } }
    return originalLoad.call(this, name, parent, isMain)
  }
  actualScopeClause = require('../services/teacherAssignmentService').teacherStudentScopeClause
} finally { Module._load = originalLoad }
let hasAssignment = false
let studentSelectCount = 0
let insertedCount = 0
const tenantId = 'tenant-synthetic-one'
const syntheticDb = {
  pool: { connect: async () => { throw Error('real pool must not be used') } },
  applyTenantContext: () => {},
  query: async (sql, args) => {
    if (sql.includes('FROM students WHERE')) {
      studentSelectCount++
      assert.match(sql, /EXISTS\s*\(\s*SELECT 1\s*FROM teacher_class_assignments tca/)
      assert.match(sql, /tca\.teacher_user_id = \$3/)
      assert.match(sql, /tca\.school_id = students\.school_id/)
      assert.equal(args[1], tenantId)
      assert.equal(args[2], 17)
      if (args[0] !== 'OWN-GR') return {rows: []}
      return {rows: [{id: 201, name: 'Synthetic Student', gr_number: 'OWN-GR', class: '8', section: 'Blue', school_id: 1, tenant_id: tenantId, parent_phone: null}]}
    }
    if (sql.includes('INSERT INTO attendance')) {
      insertedCount++
      assert.equal(args[0], 201)
      assert.equal(args[3], 17)
      return { rows: [{student_id: 201, date: '2026-10-21', status: 'present', marked_by: 17}] }
    }
    throw Error('Unexpected SQL in synthetic test')
  }
}
const pass = (req, res, next) => { req.user = { id: 17, role: 'teacher', school_id: 1, tenant_id: tenantId }; next() }
const stubs = {
  '../config/database': syntheticDb,
  '../middleware/auth': { protect: pass, requireRoles: () => pass, requireScopeForServiceOnly: () => pass, hasServiceScope: () => false },
  '../middleware/tenant': { tenantClause: () => ({clause:'',params:[]}), currentSchoolId: () => 1, currentTenantId: () => tenantId, hasColumn: async () => true },
  '../services/teacherAssignmentService': { teacherStudentScopeClause: actualScopeClause, getTeacherAssignments: async () => hasAssignment ? [{class_name:'8',section:'Blue'}] : [] },
  '../services/twilioSettings': { getTwilioConfigForSchool: async () => ({}), buildTwilioClient: () => null }
}
let route
try {
  Module._load = function (name, parent, isMain) { if (Object.hasOwn(stubs,name)) return stubs[name]; return originalLoad.call(this,name,parent,isMain) }
  route = require(routePath)
} finally { Module._load = originalLoad }
const app = express(); app.use(express.json()); app.use('/api/attendance', route)
const server = http.createServer(app)
let base

test.before(async () => { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${server.address().port}` })
test.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) })
async function mark(gr) {
  const response = await fetch(base + '/api/attendance/mark-by-gr', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({gr_number:gr,status:'present',date:'2026-10-21'}), signal:AbortSignal.timeout(2000) })
  return {code:response.status, data:await response.json()}
}
test('teacher with no assignments is rejected before GR lookup or attendance writes', async () => {
  hasAssignment = false
  const result = await mark('OWN-GR')
  assert.equal(result.code, 409)
  assert.equal(result.data.code, 'TEACHER_ASSIGNMENTS_REQUIRED')
  assert.equal(studentSelectCount, 0)
  assert.equal(insertedCount, 0)
})
test('teacher with one class assignment cannot mark a GR outside that assigned class', async () => {
  hasAssignment = true
  const result = await mark('OUT-OF-SCOPE-GR')
  assert.equal(result.code, 404)
  assert.equal(result.data.success, false)
  assert.equal(studentSelectCount, 1)
  assert.equal(insertedCount, 0)
})
test('teacher may mark a GR in assigned class only after scoped SQL lookup', async () => {
  hasAssignment = true
  const result = await mark('OWN-GR')
  assert.equal(result.code, 200)
  assert.equal(result.data.success, true)
  assert.equal(studentSelectCount, 2)
  assert.equal(insertedCount, 1)
})

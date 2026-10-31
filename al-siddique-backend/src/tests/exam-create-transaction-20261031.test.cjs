'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const s=fs.readFileSync(path.join(__dirname,'../routes/examRoutes.js'),'utf8')
const part=s.split('// POST /api/exams')[1].split('// DELETE /api/exams')[0]
test('new assessment creation uses one serializable RLS transaction',()=>{
 assert.match(part,/BEGIN ISOLATION LEVEL SERIALIZABLE/)
 assert.match(part,/applyTenantContext\(client\)/)
 assert.match(part,/pg_advisory_xact_lock/)
 assert.match(part,/await client.query\('COMMIT'\)/)
 assert.match(part,/await client.query\('ROLLBACK'\)/)
})
test('no school/session/class/name duplicate is created',()=>{
 assert.match(part,/lower\(trim\(name\)\)=lower\(trim\(\$2\)\)/)
 assert.match(part,/lower\(trim\(class\)\)=lower\(trim\(\$3\)\)/)
 assert.match(part,/EXAM_ALREADY_EXISTS/)
 assert.match(part,/res.status\(409\)/)
})
test('actor taken from authenticated context, not client body',()=>{
 assert.match(part,/const actorId=Number\(req.user\?\.id\)/)
 assert.doesNotMatch(part,/created_by\s*\|\|\s*req.user/)
 assert.match(part,/EXAM_CREATOR_AUTH_REQUIRED/)
 assert.match(part,/actorId\]/)
})

test('retryable serialization is not falsely reported as existing assessment',()=>{
 assert.match(part,/EXAM_CREATE_RETRY/)
 assert.match(part,/err.code==='40001'/)
})

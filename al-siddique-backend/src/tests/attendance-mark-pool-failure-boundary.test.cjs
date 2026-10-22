'use strict'
// Non-mutating static defense-in-depth checks; no real teachers or DB access.
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const src=fs.readFileSync(path.resolve(__dirname,'../routes/attendanceRoutes.js'),'utf8')
const block=src.match(/router\.post\('\/mark', protect, canMarkAttendance,[\s\S]*?(?=\/\/ POST \/api\/attendance\/mark-by-gr)/)?.[0]||''

test('batch attendance route validates teacher grants before allocating DB connection',()=>{
 assert.ok(block.includes('let client'))
 const indexApproval=block.indexOf('requireTeacherAssignmentsForAttendance(req, res)')
 const indexPool=block.indexOf('client = await pool.connect()')
 assert.ok(indexApproval>0 && indexPool>indexApproval)
 assert.ok(block.indexOf('try {')<indexApproval)
})
test('failed connection and preflight returns safe response without undefined release',()=>{
 assert.match(block,/if \(client\) await client\.query\('ROLLBACK'\)\.catch/)
 assert.match(block,/if \(client\) client\.release\(\)/)
 assert.match(block,/ATTENDANCE_SAVE_UNAVAILABLE/)
 assert.match(block,/res\.status\(503\)/)
})
test('student marks and status never synthesized or exposed via raw database error text',()=>{
 assert.doesNotMatch(block,/message: ['"`]Database error:[^\n]*\+ err\.message/)
 assert.match(block,/saved:\s*0/)
 assert.match(block,/if \(saved !== persistableRecords\.length\)/)
 assert.match(block,/await client\.query\('COMMIT'\)/)
})

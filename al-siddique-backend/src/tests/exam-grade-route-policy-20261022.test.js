'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const routes=fs.readFileSync(path.join(__dirname,'../routes/examRoutes.js'),'utf8')
test('grade-only changes require protect and Principal/Owner and audited service',()=>{
 assert.ok(routes.includes("router.post('/results/:resultId/grade-revision', protect, requireRoles('principal','owner')"))
 assert.ok(routes.includes('reviseExamGradeOnly({'))
 assert.ok(routes.includes('AUDITED_GRADE_ONLY_REVISION_SAVED'))
 assert.ok(!routes.includes("grade-revision', protect, requireRoles('admin'"))
})
test('grade-only service never updates score',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../services/examOfficialGradeRevision.js'),'utf8')
 assert.ok(s.includes('SET grade=$1'))
 assert.ok(!/SET\s+marks_obtained\s*=/.test(s))
 assert.ok(s.includes('AND marks_obtained=$4'))
 assert.ok(s.includes('INSERT INTO exam_grade_revision_history'))
})

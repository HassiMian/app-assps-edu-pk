'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {buildTeachingOptionsQuery}=require('../services/teacherTeachingOptionsScope')
const {parseExactMarksNumber}=require('../services/examMarksInputValidation')
const routes=fs.readFileSync(path.join(__dirname,'../routes/examRoutes.js'),'utf8')
const portal=fs.readFileSync(path.join(__dirname,'../routes/portalRoutes.js'),'utf8')

test('teacher only sees exact authorized school/class/section assignments',()=>{
 const scope=buildTeachingOptionsQuery({schoolId:1,actorSchoolId:1,teacherId:2377,role:'teacher'})
 assert.deepEqual(scope.params,[1,2377])
 assert.match(scope.sql,/tca\.school_id=s\.school_id/)
 assert.match(scope.sql,/tca\.teacher_user_id=\$2/)
 assert.match(scope.sql,/tca\.is_active=true/)
 assert.match(scope.sql,/LOWER\(BTRIM\(tca\.class_name\)\)=LOWER\(BTRIM\(s\.class\)\)/)
 assert.match(scope.sql,/BTRIM\(COALESCE\(tca\.section,''\)\)<>''/)
 assert.match(scope.sql,/LOWER\(BTRIM\(tca\.section\)\)=LOWER\(BTRIM\(COALESCE\(s\.section,''\)\)\)/)
 assert.doesNotMatch(scope.sql,/OR\s+true/)
})
test('unbound/cross-school teacher and other users denied without full school roster fallback',()=>{
 for(const a of [{schoolId:1,actorSchoolId:2,teacherId:2377,role:'teacher'},
  {schoolId:1,actorSchoolId:1,teacherId:null,role:'teacher'},
  {schoolId:1,actorSchoolId:1,teacherId:2377,role:'student'},
  {schoolId:0,actorSchoolId:0,teacherId:2377,role:'principal'}]){
   assert.equal(buildTeachingOptionsQuery(a),null)
  }
})
test('principal retains authorized school roster but never a cross-school unrestricted query',()=>{
 const r=buildTeachingOptionsQuery({schoolId:1,role:'principal'})
 assert.deepEqual(r.params,[1]);assert.match(r.sql,/s\.school_id=\$1/)
 assert.doesNotMatch(r.sql,/teacher_class_assignments/)
})
test('router invokes the scoped builder before reading teaching options',()=>{
 assert.match(portal,/buildTeachingOptionsQuery\(/)
 assert.match(portal,/if \(!plan\) return res\.status\(403\)/)
 assert.match(portal,/query\(plan\.sql, plan\.params\)/)
})
test('teacher cannot create/delete exams or edit grade scheme, only request scoped result writes',()=>{
 assert.match(routes,/const canManageExams = requireRoles\('super_admin', 'admin', 'principal'\)/)
 assert.match(routes,/const canWriteMarks = requireRoles\('super_admin', 'admin', 'principal', 'teacher'\)/)
 for(const route of ["router.post('/', protect, canManageExams", "router.delete('/:id', protect, canManageExams", "router.put('/grade-settings', protect, canManageExams"])
  assert.ok(routes.includes(route),route)
 assert.match(routes,/router\.post\('\/results', protect, canWriteMarks/)
 assert.match(routes,/validateTeacherMarksWrite/)
})
test('actual numeric zero allowed; missing, blank, false and invalid marks do not silently become 0',()=>{
 assert.equal(parseExactMarksNumber(0),0)
 assert.equal(parseExactMarksNumber('0'),0)
 assert.equal(parseExactMarksNumber(' 0 '),0)
 assert.equal(parseExactMarksNumber('25.5'),25.5)
 for(const value of [null,undefined,'','  ',false,true,{},[],Number.NaN,Infinity,'absent','1e100'])
  assert.ok(Number.isNaN(parseExactMarksNumber(value)),String(value))
 assert.match(routes,/parseExactMarksNumber\(row\?\.marks_obtained\)/)
 assert.match(routes,/parseExactMarksNumber\(row\?\.total_marks\)/)
})

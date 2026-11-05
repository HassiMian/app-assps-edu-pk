'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const crypto=require('node:crypto')
const ACTUAL='/var/www/apex-backend/src/services/teacherAssignmentService.js'
const KEY='/var/www/apex-backend/src/services/academicClassKey.js'
const file=fs.readFileSync(ACTUAL,'utf8')
const digest=crypto.createHash('sha256').update(file).digest('hex')
const classKey=require(KEY)
const queries=[]
const db={query:async(sql,params)=>{
 queries.push({sql,params})
 return {rowCount:1,rows:[{table_name:'teacher_class_assignments',required_columns:8}]}
}}
const context={require(id){
 if(id==='../config/database')return db
 if(id==='./academicClassKey')return classKey
 throw Error('UNAPPROVED_REQUIRE:'+id)
}, module:{exports:{}},console}
vm.runInNewContext(file,context,{filename:'mock-teacherAssignmentService',timeout:2000})
const live=context.module.exports
const rr=()=>{queries.length=0}
test('live source SHA is present and all DB access remains mock-only',()=>{
 assert.match(digest,/^[a-f0-9]{64}$/)
 assert.deepEqual(Object.keys(live).sort(),['ensureTeacherAssignmentSchema','getTeacherAssignments','teacherCanAccessClass','teacherStudentScopeClause'].sort())
})
test('class key preserves official Nine vs Pre Nine distinction',()=>{
 assert.equal(classKey.normalizeClassKey('Pre-Nine'),'pre nine')
 assert.equal(classKey.normalizeClassKey('Pre Nine'),'pre nine')
 assert.equal(classKey.normalizeClassKey('Nine'),'nine')
 assert.notEqual(classKey.normalizeClassKey('Pre-Nine'),classKey.normalizeClassKey('Nine'))
})
test('canonical SQL source permits only exact Pre-Nine spelling equivalence',()=>{
 const c=classKey.sqlCanonicalClass('s.class')
 assert.match(c,/pre-nine/)
 assert.match(c,/pre nine/)
 assert.ok(!c.includes('WHEN LOWER(BTRIM(s.class))=\'nine\' THEN \'pre nine\''))
})
test('teacher student scope binds teacher user id and school with canonical class and exact section',()=>{
 const t=live.teacherStudentScopeClause({user:{role:'teacher',id:910}},'s',4)
 assert.equal(t.params[0],910)
 assert.equal(t.nextIndex,5)
 assert.match(t.clause,/tca\.school_id = s\.school_id/)
 assert.match(t.clause,/tca\.teacher_user_id = \$4/)
 assert.match(t.clause,/tca\.is_active = true/)
 assert.match(t.clause,/pre-nine/)
 assert.match(t.clause,/tca\.section/)
})
test('non-teacher scope cannot receive teacher-only predicate',()=>{
 assert.equal(live.teacherStudentScopeClause({user:{role:'parent',id:777}},'s',2),null)
})
test('missing subject fails closed without any database query',async()=>{
 rr();assert.equal(await live.teacherCanAccessClass({schoolId:1,teacherUserId:910,className:'Pre Nine',section:'Blue',subject:''}),false)
 assert.equal(queries.length,0)
})
test('missing section fails closed without any database query',async()=>{
 rr();assert.equal(await live.teacherCanAccessClass({schoolId:1,teacherUserId:910,className:'Pre Nine',section:'',subject:'Biology'}),false)
 assert.equal(queries.length,0)
})
test('single teacher subject-scope query requires school, class, section and subject',async()=>{
 rr();await live.teacherCanAccessClass({schoolId:1,teacherUserId:910,className:'Pre Nine',section:'Blue',subject:'Biology'})
 assert.equal(queries.length,1)
 assert.equal(queries[0].params.join('|'),'1|910|Pre Nine|Blue|Biology')
 assert.match(queries[0].sql,/is_active=true/)
 assert.match(queries[0].sql,/pre-nine/)
 assert.match(queries[0].sql,/school_id=\$1/)
 assert.match(queries[0].sql,/teacher_user_id=\$2/)
 assert.match(queries[0].sql,/LOWER\(BTRIM\(section\)\)/)
 assert.match(queries[0].sql,/LOWER\(BTRIM\(subject\)\)/)
})
test('subject-level scope does not inject class/subject names into SQL',async()=>{
 rr();const tricky="Pre Nine' OR 1=1 --"
 await live.teacherCanAccessClass({schoolId:1,teacherUserId:910,className:tricky,section:'Blue',subject:'Science'})
 assert.equal(queries.length,1)
 assert.equal(queries[0].params[2],tricky)
 assert.ok(!queries[0].sql.includes(tricky))
})

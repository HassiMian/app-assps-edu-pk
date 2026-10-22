'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {GradeRevisionError,parseGradeRevisionRequest,reviseExamGradeOnly}=require('../services/examOfficialGradeRevision')
const bands=[{label:'A+',min_percentage:90,max_percentage:100},
 {label:'A',min_percentage:80,max_percentage:89},
 {label:'B',min_percentage:70,max_percentage:79},
 {label:'C',min_percentage:60,max_percentage:69},
 {label:'D',min_percentage:40,max_percentage:59},
 {label:'F',min_percentage:0,max_percentage:39}]
const body={expected_marks:50,expected_total_marks:50,expected_grade:'D',
 reason:'Verified grade calculation against approved school policy'}
const before={id:77,school_id:1,exam_id:9,student_id:794,subject:'English Written',
 marks_obtained:'50.00',total_marks:50,grade:'D',result_status:'SCORED',
 audit_schema:'exam_grade_revision_history'}
function mocks({row=before,user=true,policy=bands,update=1,audit=1}={}){
 const queries=[]
 const client={query:async(sql,v)=>{
  queries.push({sql:String(sql),values:v})
  if(/SELECT id FROM users WHERE id=/.test(sql))return {rowCount:user?1:0,rows:user?[{id:4}]:[]}
  if(/SELECT er.id/.test(sql))return {rowCount:row?1:0,rows:row?[row]:[]}
  if(/SELECT label,min_percentage/.test(sql))return {rowCount:policy.length,rows:policy}
  if(/UPDATE exam_results SET grade=/.test(sql))return {rowCount:update,rows:update?[{id:77,marks_obtained:'50.00',total_marks:50,grade:'A+'}]:[]}
  if(/INSERT INTO exam_grade_revision_history/.test(sql))return {rowCount:audit,rows:audit?[{id:19,created_at:'2026-10-22T18:00:00Z'}]:[]}
  return {rowCount:0,rows:[]}
 },release:()=>queries.push({sql:'RELEASE'})}
 return {queries,pool:{connect:async()=>client}}
}
const execute=(m,extra={})=>reviseExamGradeOnly({pool:m.pool,applyTenantContext:async()=>m.queries.push({sql:'TENANT_CTX'}),actor:{id:4,school_id:1,role:'owner'},schoolId:1,resultId:77,body,...extra})
test('grade-only correction D to authentic school A+ audits atomically without writing marks',async()=>{
 const m=mocks()
 const x=await execute(m)
 assert.equal(x.marks_obtained,50)
 assert.equal(x.total_marks,50)
 assert.equal(x.grade,'A+')
 assert.equal(x.revision_id,19)
 const u=m.queries.find(q=>q.sql.includes('UPDATE exam_results SET grade='))
 assert.ok(u)
 assert.doesNotMatch(u.sql,/SET\s+marks_obtained/i)
 assert.deepEqual(u.values,['A+',77,1,50,50,'D'])
 assert.equal(m.queries.filter(x=>x.sql==='COMMIT').length,1)
 assert.equal(m.queries.filter(x=>x.sql==='TENANT_CTX').length,1)
})
test('role identity cannot impersonate owner and generic admin is forbidden before DB',async()=>{
 for(const role of ['admin','super_admin','teacher','parent','service',null]){
  const m=mocks()
  await assert.rejects(()=>execute(m,{actor:{id:4,school_id:1,role}}),e=>e.status===403)
  assert.equal(m.queries.length,0)
 }
 const m=mocks()
 await assert.rejects(()=>execute(m,{actor:{id:4,school_id:2,role:'owner'}}),e=>e.status===403)
 assert.equal(m.queries.length,0)
})
test('Principal exact school membership is accepted but revoked owner is rejected',async()=>{
 const m=mocks()
 await execute(m,{actor:{id:7,school_id:1,role:'principal'}})
 assert.deepEqual(m.queries.find(x=>/SELECT id FROM users/.test(x.sql)).values,[7,1,'principal'])
 const revoked=mocks({user:false})
 await assert.rejects(()=>execute(revoked),e=>e.status===403)
 assert.equal(revoked.queries.some(x=>/UPDATE exam_results/.test(x.sql)),false)
})
test('fail closed on missing grade audit schema and non-score states',async()=>{
 for(const row of [{...before,audit_schema:null},{...before,result_status:'ABSENT'}]){
  const m=mocks({row})
  await assert.rejects(()=>execute(m),e=>e.status===503||e.status===409)
  assert.equal(m.queries.filter(x=>x.sql==='COMMIT').length,0)
  assert.ok(m.queries.some(x=>x.sql==='ROLLBACK'))
 }
})
test('reject stale mark, wrong expected grade, missing signed bands and unchanged grades',async()=>{
 const scenarios=[
  {row:{...before,marks_obtained:'49.00'}},
  {row:{...before,grade:'B'}},
  {policy:[]},
  {row:{...before,grade:'A+'},body:{...body,expected_grade:'A+'}}
 ]
 for(const {body:b,...opts} of scenarios){
  const m=mocks(opts)
  await assert.rejects(()=>execute(m,b?{body:b}:{}) ,e=>e.status===409)
  assert.equal(m.queries.some(x=>/UPDATE exam_results/.test(x.sql)),false)
 }
})
test('audit failure triggers rollback not COMMIT',async()=>{
 const m=mocks({audit:0})
 await assert.rejects(()=>execute(m),e=>e.code==='GRADE_AUDIT_INSERT_FAILED')
 assert.equal(m.queries.filter(x=>x.sql==='COMMIT').length,0)
 assert.equal(m.queries.filter(x=>x.sql==='ROLLBACK').length,1)
})
test('invalid blanks and forged values rejected before mutation',async()=>{
 for(const raw of [null,'',false,NaN,100]){
  const m=mocks()
  await assert.rejects(()=>execute(m,{body:{...body,expected_marks:raw}}))
  assert.equal(m.queries.length,0)
 }
 for(const reason of ['','short']){
  const m=mocks()
  await assert.rejects(()=>execute(m,{body:{...body,reason}}))
  assert.equal(m.queries.length,0)
 }
})

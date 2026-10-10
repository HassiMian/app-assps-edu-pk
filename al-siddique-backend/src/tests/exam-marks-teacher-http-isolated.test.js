'use strict'
// Real Express router and HTTP transport, synthetic isolated tenant/role/DB
// doubles only. No real PostgreSQL connection or production school record.
const test=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const Module=require('node:module')
const http=require('node:http')
const path=require('node:path')

test('actual examRoutes enforces assignment scoped reads and transactional writes',{timeout:20000},async t=>{
  const queries=[]
  let actor={role:'teacher',id:77}
  let assignments=[{school_id:21,teacher_user_id:77,class_name:'One',section:'A',subject:'English',is_active:true}]
  const students=[{id:101,class:'One',section:'A'}]
  const exams=[{id:9,class:'All Classes'}]
  const transaction={writes:0,commits:0,rollbacks:0}
  const client={
    async query(sql,params=[]){
      queries.push({sql:String(sql),params})
      if (sql.includes('FROM teacher_class_assignments'))return {rows:assignments}
      if (sql.includes('FROM students WHERE school_id'))return {rows:students}
      if (sql.includes('FROM exams WHERE school_id'))return {rows:exams}
      if (sql.includes('INSERT INTO exam_results')) {transaction.writes++;return {rowCount:1}}
      if (sql==='COMMIT') transaction.commits++
      if (sql==='ROLLBACK') transaction.rollbacks++
      return {rows:[],rowCount:0}
    },
    release(){},
  }
  const db={
    pool:{async connect(){return client}},
    async applyTenantContext(){},
    async query(sql,params=[]){
      queries.push({sql:String(sql),params})
      if (sql.includes('to_regclass'))return {rows:[{table_name:'grade_settings'}]}
      if (sql.includes('FROM grade_settings'))return {rows:[{label:'A',min_percentage:0,max_percentage:100}]}
      return {rows:[],rowCount:0}
    },
  }
  const auth={
    protect(req,res,next){req.user={...actor};next()},
    requireRoles(...roles){return (req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({success:false})},
    requireScopeForServiceOnly(){return (req,res,next)=>next()},
    hasServiceScope(){return false},
  }
  const tenant={
    currentSchoolId(){return 21},
    hasColumn:async()=>true,
    async tenantClause(req,{table,alias,paramIndex}){
      return {clause:` AND ${alias||table}.school_id = $${paramIndex}`,params:[21],nextIndex:paramIndex+1}
    },
  }
  const originalLoad=Module._load
  const routerPath=path.resolve(__dirname,'../routes/examRoutes.js')
  try {
    delete require.cache[routerPath]
    Module._load=function(request,parent,isMain){
      if(parent?.filename===routerPath){
        if(request==='../config/database')return db
        if(request==='../middleware/auth')return auth
        if(request==='../middleware/tenant')return tenant
      }
      return originalLoad.apply(this,arguments)
    }
    var router=require(routerPath)
  } finally {
    Module._load=originalLoad
    delete require.cache[routerPath]
  }
  const app=express();app.use(express.json());app.use('/api/exams',router)
  const server=await new Promise(resolve=>{const s=http.createServer(app);s.listen(0,'127.0.0.1',()=>resolve(s))})
  t.after(()=>new Promise(resolve=>server.close(resolve)))
  const base=`http://127.0.0.1:${server.address().port}`
  async function request(method,route,body){
    const res=await fetch(base+route,{method,headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined})
    return {status:res.status,data:await res.json()}
  }
  const payload={results:[{exam_id:9,student_id:101,subject:'English',marks_obtained:67,total_marks:100}]}
  let reply=await request('GET','/api/exams/results/9')
  assert.equal(reply.status,200)
  let select=queries.filter(q=>q.sql.includes('FROM exam_results')).at(-1)
  assert.ok(select.sql.includes('EXISTS'))
  assert.ok(select.sql.includes('tca.subject'))
  assert.ok(select.params.includes(77))
  console.log('REAL_EXPRESS_HTTP_PASS teacher saved marks GET class/subject scoped')

  reply=await request('GET','/api/exams/results?exam_ids=9')
  assert.equal(reply.status,200)
  select=queries.filter(q=>q.sql.includes('FROM exam_results')).at(-1)
  assert.ok(select.sql.includes('tca.teacher_user_id'))
  assert.ok(select.sql.includes('er.subject'))
  console.log('REAL_EXPRESS_HTTP_PASS teacher results list scoped')

  reply=await request('GET','/api/exams/student-results/101')
  assert.equal(reply.status,200)
  select=queries.filter(q=>q.sql.includes('FROM exam_results')).at(-1)
  assert.ok(select.sql.includes('tca.teacher_user_id'))
  console.log('REAL_EXPRESS_HTTP_PASS teacher per-student results scoped')

  reply=await request('POST','/api/exams/results',payload)
  assert.equal(reply.status,200,JSON.stringify(reply))
  assert.equal(reply.data.savedCount,1)
  assert.equal(transaction.writes,1)
  assert.equal(transaction.commits,1)
  console.log('REAL_EXPRESS_HTTP_PASS assigned teacher authorized mark committed')

  const rejects=[
    [{...assignments[0],subject:'Urdu'},'subject'],
    [{...assignments[0],class_name:'Two'},'class'],
    [{...assignments[0],section:'B'},'section'],
    [{...assignments[0],school_id:22},'tenant'],
    [{...assignments[0],teacher_user_id:78},'teacher'],
    [{...assignments[0],is_active:false},'inactive'],
  ]
  for(const [a,label] of rejects){
    assignments=[a]
    const before=transaction.writes
    reply=await request('POST','/api/exams/results',payload)
    assert.equal(reply.status,403,label+':'+JSON.stringify(reply))
    assert.equal(reply.data.code,'EXAM_MARKS_TEACHER_ASSIGNMENT_REQUIRED',label)
    assert.equal(transaction.writes,before,'write must not happen '+label)
  }
  assert.equal(transaction.rollbacks,6)
  console.log('REAL_EXPRESS_HTTP_PASS 6 forbidden teacher mark writes rejected before SQL UPSERT')

  assignments=[]
  actor={role:'principal',id:90}
  const before=transaction.writes
  reply=await request('POST','/api/exams/results',payload)
  assert.equal(reply.status,200)
  assert.equal(transaction.writes,before+1)
  console.log('REAL_EXPRESS_HTTP_PASS authorized principal not blocked by teacher-assignment policy')
})

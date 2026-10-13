'use strict'
// Real signed-JWT middleware & PostgreSQL tenant isolation, synthetic QA-only users.
const assert=require('node:assert/strict')
const express=require('express')
const jwt=require('jsonwebtoken')
const http=require('node:http')
const path=require('node:path')
const backend=path.resolve(__dirname,'../../../al-siddique-backend/src')
async function main() {
  assert.equal(process.env.NODE_ENV,'production')
  assert.equal(process.env.DB_PORT,'55432')
  assert.ok(['assps_core_cutover_login_qa_20261013','assps_core_green77_qa_20261013'].includes(process.env.DB_NAME))
  assert.equal(process.env.DB_ENFORCE_LEAST_PRIVILEGE_LOGIN,'true')
  assert.equal(process.env.DB_AUTH_USE_SIGNED_TENANT_CONTEXT,'true')
  const {query,tenantContext,pool}=require(path.join(backend,'config/database'))
  const {protect,requireRoles}=require(path.join(backend,'middleware/auth'))
  const app=express()
  app.use((req,res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next))
  app.get('/__qa__/students/count',protect,async(req,res)=>{
    try {
      const n=Number((await query('SELECT count(*)::int AS n FROM public.students')).rows[0].n)
      res.json({n,role:req.user.role})
    } catch(e) { res.status(503).json({code:e.code||'QUERY_FAILED'}) }
  })
  app.get('/__qa__/super-admin-only',protect,requireRoles('super_admin'),(_req,res)=>res.sendStatus(204))
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))})
  try {
    const port=server.address().port
    const sign=(id,email,school,extra={})=>jwt.sign({id,email,school_id:school,...extra},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'3m'})
    const principalA=sign(9001001,'qa-principal-a@example.invalid',1)
    const teacherA=sign(9001002,'qa-teacher-a@example.invalid',1)
    const principalB=sign(9002001,'qa-principal-b@example.invalid',2)
    const forgedSchool=sign(9001001,'qa-principal-a@example.invalid',2)
    const forgedRole=sign(9001001,'qa-principal-a@example.invalid',1,{role:'super_admin'})
    const request=(uri,token)=>new Promise((resolve,reject)=>{
      const req=http.get({host:'127.0.0.1',port,path:uri,headers:token?{Authorization:`Bearer ${token}`}:{}}
      ,res=>{let body='';res.on('data',part=>body+=part);res.on('end',()=>{let data={};try{data=JSON.parse(body)}catch{}resolve({status:res.statusCode,data})})})
      req.on('error',reject)
    })
    const a=await request('/__qa__/students/count',principalA)
    const t=await request('/__qa__/students/count',teacherA)
    const b=await request('/__qa__/students/count',principalB)
    const wrong=await request('/__qa__/students/count',forgedSchool)
    const missing=await request('/__qa__/students/count',null)
    const elevated=await request('/__qa__/super-admin-only',forgedRole)
    assert.equal(a.status,200,`principalA ${a.status} ${JSON.stringify(a.data)}`)
    assert.equal(t.status,200,`teacherA ${t.status} ${JSON.stringify(t.data)}`)
    assert.equal(b.status,200,`principalB ${b.status} ${JSON.stringify(b.data)}`)
    assert.equal(a.data.n,318);assert.equal(t.data.n,318);assert.equal(b.data.n,3)
    assert.equal(a.data.role,'principal');assert.equal(t.data.role,'teacher')
    assert.ok([401,403,404].includes(wrong.status),'forged peer school cannot authenticate')
    assert.equal(missing.status,401)
    assert.equal(elevated.status,403,'JWT role claim cannot override database principal')
    console.log(JSON.stringify({status:'PASS_SYNTHETIC_JWT_REAL_AUTH_MIDDLEWARE_SIGNED_TENANT_HTTP_ONLY',
      principal_school1:a.status,teacher_school1:t.status,principal_school2:b.status,
      cross_school_forgery:wrong.status,anonymous:missing.status,forged_super_admin:elevated.status,
      real_staff_credentials:false,production_modified:false}))
  } finally {await new Promise(resolve=>server.close(resolve));await pool.end()}
}
main().catch(e=>{console.error(JSON.stringify({status:'HOLD',code:e.code||'HTTP_QA_FAILED',message:e.message.slice(0,300)}));process.exitCode=2})

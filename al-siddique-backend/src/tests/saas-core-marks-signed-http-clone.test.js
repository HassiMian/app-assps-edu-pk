'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const jwt=require('jsonwebtoken')
const http=require('node:http')
for (const [k,v] of Object.entries({
 DB_HOST:'127.0.0.1',DB_PORT:'55432',DB_NAME:'assps_core_signed_p7_20261008',
 DB_USER:'assps_core_test_login',DB_RUNTIME_ROLE:'apex_app_runtime',
 DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'true',DB_AUTH_USE_SIGNED_TENANT_CONTEXT:'true',
 DB_SIGNED_TENANT_RLS_ENABLED:'true',JWT_SECRET:'isolated-synthetic-signing-key-only',
 DB_SIGNED_TENANT_HMAC_KEY:process.env.CORE_SIGNED_TEST_KEY,
})) assert.equal(process.env[k],v,'signed clone only '+k)
assert.match(process.env.CORE_SIGNED_TEST_KEY||'',/^[a-f0-9]{64}$/)
process.env.DB_STARTUP_PROBE='false'
const {pool,tenantContext,query}=require('../config/database')
const routes=require('../routes/examRoutes')
const getActor=(school,email)=>tenantContext.run({
 rlsEnabled:true,tenantId:school,actorId:999001,isSuperAdmin:false,
},async()=>{
 const out=await query('SELECT id,role,email,school_id FROM users WHERE school_id=$1 AND email=$2',[school,email])
 return out.rows[0]
})
const call=(port,path,token,method='GET',body=null)=>new Promise((resolve,reject)=>{
 const payload=body==null?null:JSON.stringify(body)
 const req=http.request({host:'127.0.0.1',port,path,method,headers:{
  ...(token?{Authorization:'Bearer '+token}:{}),
  ...(payload?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{}),
 }},res=>{let raw='';res.on('data',c=>raw+=c);res.on('end',()=>{
  let json;try{json=JSON.parse(raw)}catch{}
  resolve({status:res.statusCode,json})
 })})
 req.setTimeout(2500,()=>req.destroy(new Error('HTTP clone test timed out')))
 req.on('error',reject);req.end(payload||undefined)
})
test('real signed PostgreSQL JWT teacher marks GET, RLS and forged tenant guards',{timeout:16000},async t=>{
 const a=await getActor(900001,'core-security-a@example.invalid')
 const b=await getActor(900002,'core-security-b@example.invalid')
 assert.equal(a?.role,'teacher')
 assert.equal(b?.role,'teacher')
 const sign=claims=>jwt.sign(claims,process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'3m'})
 const aToken=sign(a),bToken=sign(b)
 const app=express();app.use(express.json())
 app.use((_req,_res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next))
 app.use('/api/exams',routes)
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))})
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await pool.end()})
 const port=server.address().port
 const endpoints=['/api/exams/results/9','/api/exams/results?exam_ids=9','/api/exams/student-results/999999']
 for(const path of endpoints) {
  const anonymous=await call(port,path,null)
  assert.equal(anonymous.status,401,'unsigned access to '+path)
  const readA=await call(port,path,aToken)
  assert.equal(readA.status,200,JSON.stringify({path,readA}))
  assert.deepEqual(readA.json,{success:true,data:[]},'no fabricated results '+path)
  const readB=await call(port,path,bToken)
  assert.equal(readB.status,200,JSON.stringify({path,readB}))
  assert.deepEqual(readB.json,{success:true,data:[]},'school B isolation '+path)
  console.log('SIGNED_CLONE_HTTP_MARKS_READ_PASS '+path+' anonymous401 schoolA200_empty schoolB200_empty')
 }
 for(const fake of [{...a,school_id:900002},{...a,tenant_id:'synthetic-core-b'}]){
  const response=await call(port,'/api/exams/results/9',sign(fake))
  assert.equal(response.status,401,'mismatched JWT school/tenant must fail closed')
 }
 const missingSchool=await call(port,'/api/exams/results/9',sign({...a,school_id:null}))
 assert.equal(missingSchool.status,401)
 console.log('SIGNED_CLONE_HTTP_MARKS_JWT_SPOOF_DENIED_PASS mismatchedSchool mismatchedTenant missingSchool')
 const invalid=await call(port,'/api/exams/results',aToken,'POST',{results:[
  {exam_id:999999,student_id:999999,subject:'English',marks_obtained:0,total_marks:100},
 ]})
 assert.ok([400,403].includes(invalid.status),JSON.stringify(invalid))
 console.log('SIGNED_CLONE_HTTP_MARKS_INVALID_RECORD_WRITE_DENIED_PASS HTTP'+invalid.status)
})

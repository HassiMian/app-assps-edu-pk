'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const http=require('node:http')
const jwt=require('jsonwebtoken')
const crypto=require('node:crypto')
const expected={
 DB_HOST:'127.0.0.1',DB_PORT:'55432',DB_NAME:'assps_core_signed_p7_20261008',
 DB_USER:'assps_core_test_login',DB_RUNTIME_ROLE:'apex_app_runtime',
 DB_SIGNED_TENANT_RLS_ENABLED:'true',DB_AUTH_USE_SIGNED_TENANT_CONTEXT:'true',
 DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'true',JWT_SECRET:'isolated-synthetic-signing-key-only'
}
for(const [k,v] of Object.entries(expected))assert.equal(process.env[k],v,`unsafe test environment: ${k}`)
assert.match(process.env.DB_SIGNED_TENANT_HMAC_KEY||'',/^[0-9a-f]{64}$/)
process.env.DB_STARTUP_PROBE='false'
const {pool,query,tenantContext}=require('../config/database')
const scope=(school,fn)=>tenantContext.run({
 rlsEnabled:true,isSuperAdmin:false,tenantId:school,
 tenantKey:school===900001?'synthetic-core-a':'synthetic-core-b',actorId:999001
},fn)
const req=(port,method,path,token,body)=>new Promise((resolve,reject)=>{
 const data=body===undefined?null:JSON.stringify(body)
 const headers={...(token?{Authorization:'Bearer '+token}:{}),
  ...(data?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{})}
 const r=http.request({host:'127.0.0.1',port,method,path,headers},res=>{
  let s='';res.on('data',x=>s+=x)
  res.on('end',()=>{let json;try{json=JSON.parse(s)}catch{};resolve({status:res.statusCode,json,raw:s})})
 })
 r.on('error',reject);r.end(data||undefined)
})
test('signed restricted login: real Lesson Plans and Diary HTTP ownership, publication and dates', {timeout:30000},async t=>{
 const names=['core-security-a@example.invalid','core-unassigned@example.invalid','core-admin@example.invalid']
 const ours=await scope(900001,async()=> (await query('SELECT id,email,role,school_id FROM users WHERE email=ANY($1)',[names])).rows)
 const theirs=await scope(900002,async()=> (await query("SELECT id,email,role,school_id FROM users WHERE email='core-security-b@example.invalid'")).rows[0])
 const byEmail=Object.fromEntries(ours.map(u=>[u.email,u]))
 assert.equal(ours.length,3)
 assert.ok(theirs)
 const sign=user=>jwt.sign({id:user.id,email:user.email,school_id:user.school_id},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'3m'})
 const author=sign(byEmail['core-security-a@example.invalid'])
 const peer=sign(byEmail['core-unassigned@example.invalid'])
 const manager=sign(byEmail['core-admin@example.invalid'])
 const outsider=sign(theirs)
 const app=express()
 app.use(express.json())
 app.use((_rq,_rs,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next))
 app.use('/api/lesson-plans',require('../routes/lessonPlanRoutes'))
 app.use('/api/daily-diary',require('../routes/dailyDiaryRoutes'))
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))})
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await pool.end()})
 const port=server.address().port
 const call=(method,path,token,body)=>req(port,method,path,token,body)
 let r=await call('GET','/api/lesson-plans/',null)
 assert.equal(r.status,401,JSON.stringify(r))
 const id='p8-signed-'+crypto.randomUUID()
 const lesson={id,title:'Synthetic English Lesson',subject:'English',classLevel:'Eight',
  date:'2026-10-08',sentToPortal:true,chapter:'Paragraphs',teacher:'Synthetic Teacher'}
 r=await call('POST','/api/lesson-plans/',author,lesson)
 assert.equal(r.status,201,JSON.stringify(r))
 assert.equal(r.json.data.sentToPortal,false)
 r=await call('GET','/api/lesson-plans/',peer)
 assert.equal(r.status,200,JSON.stringify(r))
 assert.equal(r.json.data.length,0)
 r=await call('GET','/api/lesson-plans/',outsider)
 assert.equal(r.status,200,JSON.stringify(r))
 assert.equal(r.json.data.length,0)
 r=await call('GET','/api/lesson-plans/',manager)
 assert.equal(r.status,200,JSON.stringify(r))
 assert.ok(r.json.data.some(x=>x.id===id),'Management must see the new own-school lesson')
 r=await call('PUT','/api/lesson-plans/'+id,peer,{...lesson,expectedRevision:1})
 assert.equal(r.status,404,JSON.stringify(r))
 r=await call('PUT','/api/lesson-plans/'+id,author,{...lesson,expectedRevision:1,title:'Revised Lesson',sentToPortal:true})
 assert.equal(r.status,200,JSON.stringify(r))
 assert.equal(r.json.data.sentToPortal,false)
 r=await call('POST','/api/lesson-plans/'+id+'/share',author,{expectedRevision:2})
 assert.equal(r.status,403,JSON.stringify(r))
 r=await call('POST','/api/lesson-plans/'+id+'/share',manager,{expectedRevision:2})
 assert.equal(r.status,200,JSON.stringify(r))
 assert.equal(r.json.data.sentToPortal,true)
 r=await call('PUT','/api/lesson-plans/'+id,author,{...lesson,expectedRevision:3})
 assert.equal(r.status,404,JSON.stringify(r))
 r=await call('PUT','/api/lesson-plans/'+id,manager,{...lesson,expectedRevision:3,title:'Manager Revision'})
 assert.equal(r.status,200,JSON.stringify(r))
 assert.equal(r.json.data.sentToPortal,false)
 const diary={classLevel:'Eight',className:'Eight',diaryDate:'2026-10-08',
  rows:[{subject:'English',diary:'Read page 20'}],slipsPerPage:4}
 r=await call('POST','/api/daily-diary/',author,{diaryDate:'2026-02-30'})
 assert.equal(r.status,422,JSON.stringify(r))
 r=await call('POST','/api/daily-diary/',author,diary)
 assert.equal(r.status,200,JSON.stringify(r))
 const diaryId=r.json.data.id
 r=await call('GET','/api/daily-diary/?limit=30',peer)
 assert.equal(r.status,200,JSON.stringify(r))
 assert.equal(r.json.data.length,0)
 r=await call('GET','/api/daily-diary/?limit=100',manager)
 assert.equal(r.status,200,JSON.stringify(r))
 assert.ok(r.json.data.some(x=>x.id===diaryId),'Management must see this own-school diary')
 r=await call('GET','/api/daily-diary/'+diaryId,outsider)
 assert.equal(r.status,404,JSON.stringify(r))
 r=await call('PUT','/api/daily-diary/'+diaryId,peer,{rows:[{subject:'English',diary:'Forged'}]})
 assert.equal(r.status,404,JSON.stringify(r))
 r=await call('PUT','/api/daily-diary/'+diaryId,author,{diaryDate:'2026-02-30'})
 assert.equal(r.status,422,JSON.stringify(r))
 r=await call('PUT','/api/daily-diary/'+diaryId,author,{footerText:'School copy',slipsPerPage:6,styleSettings:{contrast:'high'}})
 assert.equal(r.status,200,JSON.stringify(r))
 assert.equal(r.json.data.footer_text,'School copy')
 assert.equal(r.json.data.slips_per_page,6)
 assert.equal(new Date(r.json.data.diary_date).toISOString().slice(0,10),'2026-10-08')
})

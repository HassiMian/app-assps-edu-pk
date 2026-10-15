'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const http=require('node:http')
const Module=require('node:module')
const routePath=require.resolve('../routes/lessonPlanRoutes')
const expected='4d2ccdce5ec644750a530c890df5a0a41eaee5b76f1e4ba47d912617db5c0cda'
const manifestPath='/root/secure-archive/composer-review-20261014/manifest_plus_classone_private.json'
const source=require('node:crypto').createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex')
const original=Module._load
const oldFlag=process.env.DB_SIGNED_TENANT_RLS_ENABLED
let userChecks=0
const pool={connect:async()=>({query:async(sql,params)=>{
 if(sql.includes('to_regclass'))return {rows:[{table_name:'lesson_plans'}],rowCount:1}
 if(sql.includes('SELECT id FROM users')){
   userChecks++
   return {rowCount:params?.[0]===15&&params?.[1]===1?1:0,rows:params?.[0]===15?[{id:15}]:[]}
 }
 return {rowCount:0,rows:[]}
},release(){}})}
const createFake=(role,school,designation,id=15)=>({
 id,role,school_id:school,designation
})
function fakeProtect(req,res,next){
 const as=req.get('X-MOCK-ACTOR')
 const actors={
  principal:createFake('admin',1,'Principal'),
  teacher:createFake('teacher',1,'Teacher',19),
  peer:createFake('admin',2,'Principal',31),
  fake:createFake('admin',1,'Principal',42),
  nondesignated:createFake('admin',1,'Teacher')
 }
 const user=actors[as]
 if(!user)return res.status(401).json({code:'AUTH_REQUIRED'})
 req.user=user;req.school_id=user.school_id;next()
}
Module._load=function(request,parent,isMain){
 if(parent?.filename===routePath){
  if(request==='../config/database')
    return {pool,tenantContext:{getStore:()=>null},applyTenantContext:async()=>{}}
  if(request==='../middleware/auth')
    return {protect:fakeProtect,requireRoles:()=>((req,res,next)=>next())}
  if(request==='../middleware/tenant')
    return {currentSchoolId:req=>req.user?.school_id}
  if(request==='../services/teacherDocumentAccess')
    return {isSchoolDocumentManager:user=>user.role==='admin',canAccessAuthoredDocument:()=>true}
  if(request==='../services/lessonPlanningContext')
    return {loadPlanningContext:async()=>({})}
  if(request==='../services/lessonPlanningEngine')
    return {buildDeterministicPlan:()=>({}),enhancePlanWithAi:async()=>({}),parseSmartPlanningText:()=>({}),
      parseIsoDate:s=>new Date(s+'T00:00:00Z'),MAX_RANGE_DAYS:150}
 }
 return original.apply(this,arguments)
}
let router
try{
 process.env.DB_SIGNED_TENANT_RLS_ENABLED='false'
 router=require(routePath)
}finally{
 Module._load=original
 if(oldFlag===undefined)delete process.env.DB_SIGNED_TENANT_RLS_ENABLED
 else process.env.DB_SIGNED_TENANT_RLS_ENABLED=oldFlag
}
const express=require('express')
const app=express()
app.use('/api/lesson-plans',router)
const server=http.createServer(app)
let base=''
test.before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port})
test.after(async()=>{await new Promise(r=>server.close(r))})
async function get(actor){
 const res=await fetch(base+'/api/lesson-plans/planner/private-source-bundle',{headers:actor?{'X-MOCK-ACTOR':actor}:{}})
 return {status:res.status,headers:res.headers,body:await res.json()}
}
test('original private school source exact SHA intact and 59+18 coverage',()=>{
 assert.equal(source,expected)
 const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'))
 assert.equal(m.candidates.length,59)
 assert.equal(m.class_one_image_review.weeks.length,18)
})
test('no token, teacher role, peer tenant, nondesignated admin and forged principal denied',async()=>{
 for(const actor of ['', 'teacher','peer','nondesignated','fake']){
  const res=await get(actor)
  assert.ok([401,403].includes(res.status),actor+': '+res.status)
  assert.equal(JSON.stringify(res.body).includes('source_detail_records'),false)
 }
})
test('active verified Principal receives exact private bundle, no shared cache and no writes',async()=>{
 const before=userChecks
 const r=await get('principal')
 assert.equal(r.status,200,JSON.stringify(r.body).slice(0,100))
 assert.equal(r.body.data.candidates.length,59)
 assert.equal(r.body.data.class_one_image_review.weeks.length,18)
 assert.match(r.headers.get('cache-control'),/no-store/)
 assert.equal(userChecks,before+1)
})

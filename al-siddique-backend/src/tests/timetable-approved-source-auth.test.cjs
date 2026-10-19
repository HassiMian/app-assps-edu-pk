'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const path=require('node:path')
const handlers=new Map()
const express={Router(){return {get(path,...h){handlers.set(path,h)}}}}
const auth={
 protect(req,res,next){if (!req.user) return res.status(401).json({code:'NO_AUTH'}); next()},
 requireRoles(...roles){return (req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({code:'ROLE_DENIED'})},
 requireScopeForServiceOnly(scope){return (req,res,next)=>
  req.user?.account_type==='service' && !req.user?.scopes?.includes(scope)
  ?res.status(403).json({code:'SCOPE_DENIED'}):next()
 }
}
const realLoad=Module._load
try{
 Module._load=function(name,parent,isMain){
  if(parent?.filename.endsWith('/routes/timetableApprovedSourceRoutes.js')){
   if(name==='express')return express
   if(name==='../middleware/auth')return auth
   if(name==='../middleware/tenant')return {currentSchoolId(req){return req.user?.school_id || null}}
  }
  return realLoad.apply(this,arguments)
 }
 require(path.join(__dirname,'../routes/timetableApprovedSourceRoutes.js'))
}finally{Module._load=realLoad}
async function invoke(user){
 const req={user,query:{school_id:1},body:{school_id:1},headers:{'x-school-id':'1'}}
 const res={code:200,headers:{},body:null,status(code){this.code=code;return this},
  json(body){this.body=body;return this},set(name,val){this.headers[name.toLowerCase()]=val;return this}}
 for(const fn of handlers.get('/approved-source')){
  let allowed=false;await fn(req,res,()=>{allowed=true})
  if(!allowed)break
 }
 return res
}
test('anonymous request denied',async()=>{
 const r=await invoke(null);assert.equal(r.code,401);assert.equal(r.body.code,'NO_AUTH')
})
test('ordinary teacher cannot view unverified approved reference',async()=>{
 const r=await invoke({id:4,role:'teacher',school_id:1});assert.equal(r.code,403)
})
test('principal sees only School1 original source with reference-only flags',async()=>{
 const r=await invoke({id:4,role:'principal',school_id:1})
 assert.equal(r.code,200)
 assert.equal(r.body.reference_only,true)
 assert.equal(r.body.publication_authorized,false)
 assert.equal(r.body.teacher_ids_verified,false)
 assert.equal(r.body.section_mapping_verified,false)
 assert.equal(r.body.data.allocations.length,7)
 assert.equal(r.headers['cache-control'],'private, no-store')
})
test('peer school denied even with spoofed query/header school_id=1',async()=>{
 const r=await invoke({id:55,role:'principal',school_id:2})
 assert.equal(r.code,404);assert.equal(r.body.code,'TIMETABLE_APPROVED_SOURCE_NOT_FOUND')
})
test('missing authenticated school context rejected',async()=>{
 const r=await invoke({id:4,role:'principal',school_id:null});assert.equal(r.code,403)
})
test('service cannot impersonate principal with scope only',async()=>{
 const r=await invoke({id:55,role:'service',school_id:1,account_type:'service',scopes:['school.timetable.read']})
 assert.equal(r.code,403)
})

'use strict'
// Mock-isolated route test. NO real credentials, database, HTTP network or user mutation.
const test=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const path=require('node:path')
const routes=new Map()
const calls=[]
const router={}
for(const method of ['get','post','put','patch','delete'])
 router[method]=(url,...handlers)=>routes.set(method.toUpperCase()+' '+url,handlers)
const db={
 async query(sql,args){
  calls.push({sql:String(sql),args})
  if(/FROM schools/i.test(sql) && Array.isArray(args) &&
     (args[0]==='assps'||args[0]===1)){
   return {rows:[{id:1,code:'assps',name:'ASSPS Test School',status:'active'}],rowCount:1}
  }
  return {rows:[],rowCount:0}
 }
}
const original=Module._load
try{
 Module._load=function(request,parent,isMain){
  if(parent?.filename.endsWith('/routes/authRoutes.js')){
   if(request==='express')return {Router:()=>router}
   if(request==='bcryptjs')return {compare:async()=>false,hash:async()=>''}
   if(request==='jsonwebtoken')return {sign:()=> 'test',verify:()=>({})}
   if(request==='../config/database')return db
   if(request==='../middleware/auth')return {protect:(req,res,next)=>next()}
   if(request==='../middleware/tenant')return {currentTenantId:()=>1,hasColumn:async()=>true}
   if(request==='../services/twilioSettings')return {
    getTwilioConfigForSchool:async()=>null,buildTwilioClient:()=>null
   }
  }
  return original.apply(this,arguments)
 }
 require(path.resolve(__dirname,'../routes/authRoutes.js'))
}finally{Module._load=original}
async function invoke(route,payload){
 calls.length=0
 const method='POST'
 const handlers=routes.get(method+' '+route)
 assert.ok(handlers,'Missing route '+route)
 const req={body:payload,query:{},headers:{},ip:'192.0.2.201',get:()=>null}
 const res={code:200,body:null,status(n){this.code=n;return this},
  json(v){this.body=v;return this},cookie(){return this},clearCookie(){return this}}
 for(const fn of handlers){
  let nextCalled=false
  await fn(req,res,()=>{nextCalled=true})
  if(!nextCalled)break
 }
 return {res,sql:[...calls]}
}
test('unknown explicit school code denies login BEFORE any user lookup',async()=>{
 const {res,sql}=await invoke('/login',{
  email:'synthetic-teacher@example.invalid',password:'fake-demo-pass-123',school_code:'unknown-peer'
 })
 assert.equal(res.code,403)
 assert.equal(res.body.code,'SCHOOL_CONTEXT_NOT_VERIFIED')
 assert.ok(sql.length>=1)
 assert.ok(!sql.some(x=>/FROM users|JOIN users/i.test(x.sql)))
})
test('school id mismatched with valid school code denies login before user lookup',async()=>{
 const {res,sql}=await invoke('/login',{
  email:'synthetic-teacher@example.invalid',password:'fake-demo-pass-123',
  school_id:2,school_code:'assps'
 })
 assert.equal(res.code,403)
 assert.ok(!sql.some(x=>/FROM users|JOIN users/i.test(x.sql)))
})
test('unknown explicit school code denies password reset BEFORE account lookup',async()=>{
 const {res,sql}=await invoke('/password-reset/request',{
  loginId:'synthetic-teacher@example.invalid',school_code:'unknown-peer'
 })
 assert.equal(res.code,403)
 assert.equal(res.body.code,'SCHOOL_CONTEXT_NOT_VERIFIED')
 assert.ok(!sql.some(x=>/FROM users|JOIN users/i.test(x.sql)))
})
test('missing school selection preserves legacy login path without accidental authorization',async()=>{
 const {res,sql}=await invoke('/login',{
  email:'synthetic-teacher@example.invalid',password:'fake-demo-pass-123'
 })
 assert.notEqual(res.code,200)
 assert.ok(sql.some(x=>/FROM users/i.test(x.sql)))
})

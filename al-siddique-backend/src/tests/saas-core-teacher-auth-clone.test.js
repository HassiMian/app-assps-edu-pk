'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const http = require('node:http')
const jwt = require('jsonwebtoken')
assert.equal(process.env.DB_NAME,'assps_core_rls_clone_20261008')
assert.equal(process.env.DB_HOST,'127.0.0.1')
assert.equal(process.env.DB_PORT,'55432')
assert.equal(process.env.DB_USER,'assps_core_test_login')
assert.equal(process.env.DB_RUNTIME_ROLE,'apex_app_runtime')
assert.equal(process.env.DB_ENFORCE_LEAST_PRIVILEGE_LOGIN,'true')
assert.equal(process.env.DB_AUTH_USE_SIGNED_TENANT_CONTEXT,'true')
assert.equal(process.env.JWT_SECRET,'isolated-synthetic-signing-key-only')
process.env.DB_STARTUP_PROBE='false'
const {pool,query,tenantContext}=require('../config/database')
const {protect,adminOnly,requireRoles}=require('../middleware/auth')
function request(port,path,token) {
 return new Promise((resolve,reject)=>{
  const headers=token?{authorization:'Bearer '+token}:{}
  const req=http.request({host:'127.0.0.1',port,path,headers},res=>{
    let b='';res.on('data',c=>b+=c)
    res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(b)}))
  })
  req.on('error',reject);req.end()
 })
}
const context=(tenantId,fn)=>tenantContext.run({rlsEnabled:true,tenantId,isSuperAdmin:false},fn)
test('teacher auth and tenant restrictions: real restricted PG, signed JWT, synthetic HTTP',async t=>{
 const [a,b]=await Promise.all([
  context(900001,async()=> (await query("SELECT id,email,role,school_id FROM users WHERE email='core-security-a@example.invalid'")).rows[0]),
  context(900002,async()=> (await query("SELECT id,email,role,school_id FROM users WHERE email='core-security-b@example.invalid'")).rows[0]),
 ])
 assert.ok(a&&b)
 const app=express()
 app.use((req,res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next))
 app.get('/teachers',protect,requireRoles('teacher'),async(req,res)=>{
  try{
   const list=await query("SELECT school_id FROM users WHERE role='teacher' AND email LIKE 'core-security-%@example.invalid' ORDER BY school_id")
   res.json({schoolId:req.school_id,schools:list.rows.map(x=>x.school_id)})
  }catch(e){res.status(500).json({error:'isolated database query failed'})}
 })
 app.get('/admin',protect,adminOnly,(req,res)=>res.json({allowed:true}))
 const server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s))})
 t.after(async()=>{await new Promise(r=>server.close(r));await pool.end()})
 const port=server.address().port
 const sign=(row,overrides={})=>jwt.sign({...row,...overrides},process.env.JWT_SECRET,{expiresIn:'2m',algorithm:'HS256'})
 const tokenA=sign(a), tokenB=sign(b)
 let res=await request(port,'/teachers',tokenA)
 assert.deepEqual(res,{status:200,body:{schoolId:900001,schools:[900001]}})
 res=await request(port,'/teachers',tokenB)
 assert.deepEqual(res,{status:200,body:{schoolId:900002,schools:[900002]}})
 res=await request(port,'/teachers',sign(a,{school_id:900002}))
 assert.equal(res.status,401)
 res=await request(port,'/admin',tokenA)
 assert.equal(res.status,403)
 res=await request(port,'/teachers',null)
 assert.equal(res.status,401)
 res=await request(port,'/teachers',sign(a,{role:'accountant'}))
 assert.equal(res.status,200) // user role is loaded from DB, JWT role is not authority
 assert.deepEqual(res.body.schools,[900001])
})

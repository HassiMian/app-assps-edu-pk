'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const http=require('node:http')
const express=require('/var/www/apex-backend/node_modules/express')
const target=process.env.CANDIDATE||'/root/secure-archive/assps-security-mission-20261101/opsRoutes.candidate.js'
const src=fs.readFileSync(target,'utf8')
function route(){
 const called=[]
 const fakeQuery=async(sql,params)=>{
  called.push({sql,params})
  if (/FROM ai_queue_events/i.test(sql)) {
    if (/FILTER/.test(sql)) return {rows:[{completed:2,failed:1,cancelled:0}]}
    return {rows:[{count:3}]}
  }
  return {rows:[{count:1}]}
 }
 const getQueueStats=()=>{called.push({globalQueueCalled:true});return {queued:3,active:1,statuses:{failed:0}}}
 const listQueueEvents=async()=>{called.push({globalEventCalled:true});return [{eventType:'job_created',message:'PRIVATE OTHER SCHOOL CONTENT',createdAt:new Date().toISOString()}]}
 const stubReq=(mod)=>{
  if(mod==='express')return express
  if(mod==='../config/database')return {query:fakeQuery}
  if(mod==='../middleware/auth')return {
   protect:(req,res,next)=>{
     const role=req.get('X-Synthetic-Test-Role')||'anonymous'
     if(role==='anonymous')return res.status(401).json({success:false})
     req.user={role};next()
   },
   adminOnly:(req,res,next)=>['super_admin','admin','principal'].includes(req.user.role)?next():res.status(403).json({success:false}),
  }
  if(mod==='../middleware/tenant')return {currentSchoolId:()=>1}
  if(mod==='../services/ai/paperAiQueue')return {getQueueStats,listQueueEvents}
  if(mod==='../services/ai/geminiClient')return {getAiEnvConfig:()=>({apiKey:'synthetic',primaryModel:'synthetic',fallbackModel:'synthetic',visionModel:'synthetic',textModel:'synthetic'})}
  throw new Error('Unexpected import '+mod)
 }
 const output={exports:{}}
 vm.runInNewContext(src,{require:stubReq,module:output,exports:output.exports,console,Date,Math,Number,Boolean,String,Array,Object,Promise,JSON,Error,setTimeout,clearTimeout})
 const app=express();app.use('/api/ops',output.exports)
 return {app,called}
}
async function serve(app,role){
 const srv=await new Promise(ok=>{const server=http.createServer(app);server.listen(0,'127.0.0.1',()=>ok(server))})
 const port=srv.address().port
 try{
  const res=await fetch('http://127.0.0.1:'+port+'/api/ops/diagnostics',{headers:{'X-Synthetic-Test-Role':role}})
  return {status:res.status,body:await res.json()}
 }finally{await new Promise(ok=>srv.close(ok))}
}
test('principal cannot see global cross-school AI queue stats, jobs or events',{timeout:10000},async()=>{
 const {app,called}=route()
 const out=await serve(app,'principal')
 assert.equal(out.status,200)
 assert.equal(out.body.scope,'school')
 assert.equal(out.body.ai.queueScope,'withheld_global_queue_not_school_scoped')
 assert.equal(out.body.ai.latestEvent,null)
 assert.equal(out.body.ai.recentActivity30m,null)
 assert.equal(out.body.ai.recentOutcomes24h,null)
 assert.equal(out.body.ai.failureRate24h,null)
 assert.equal(out.body.ai.queue,null)
 assert.ok(!called.some(x=>/ai_queue_events/i.test(x.sql||'')||x.globalEventCalled||x.globalQueueCalled))
})
test('school admin same global telemetry protections',{timeout:10000},async()=>{
 const {app,called}=route()
 const out=await serve(app,'admin')
 assert.equal(out.status,200)
 assert.equal(out.body.ai.queueScope,'withheld_global_queue_not_school_scoped')
 assert.ok(!called.some(x=>/ai_queue_events/i.test(x.sql||'')||x.globalEventCalled||x.globalQueueCalled))
})
test('super-admin retains global queue diagnostics',{timeout:10000},async()=>{
 const {app,called}=route()
 const out=await serve(app,'super_admin')
 assert.equal(out.status,200)
 assert.equal(out.body.scope,'global')
 assert.equal(out.body.ai.queueScope,'global')
 assert.match(out.body.ai.latestEvent.message,/PRIVATE OTHER SCHOOL CONTENT/)
 assert.ok(called.some(x=>x.globalEventCalled))
 assert.equal(called.filter(x=>/ai_queue_events/i.test(x.sql||'')).length,2)
})
test('non-admin anonymous cannot query diagnostics',{timeout:10000},async()=>{
 const {app,called}=route()
 const out=await serve(app,'anonymous')
 assert.equal(out.status,401)
 assert.equal(called.length,0)
})

'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const http=require('node:http')
const express=require('express')
const Module=require('node:module')
const routePath=require.resolve('../routes/lessonPlanRoutes')
const originalLoad=Module._load
const oldFlag=process.env.DB_SIGNED_TENANT_RLS_ENABLED
let forbiddenWriteAttempts=0
const payload=()=>({
 title:'Synthetic term',classLevel:'Four',section:'Blue',planningScope:'term',
 date:'2026-10-15',startDate:'2026-10-15',endDate:'2027-02-15',
 plannerDocument:{
  schemaVersion:3,planningType:'term',classLevel:'Four',section:'Blue',
  startDate:'2026-10-15',endDate:'2027-02-15',
  provenance:{marker:'ASSPS_TERM_NOTEBOOK_V1',termKey:'four|blue|second term|2026-10-15',
   sourceZipSha256:'a'.repeat(64),academicPublication:'BLOCKED'},
  subjects:[],assessments:[]
 }
})
const schoolDocs=new Map([
 ['lp-synthetic-private',{school_id:1,public_id:'lp-synthetic-private',
  revision:1,created_by:10,subject:'',class_level:'Four',
  payload:payload(),plan_date:new Date('2026-10-15T00:00:00Z')}],
 ['lp_c5_sst_adiba_20261014',{school_id:1,public_id:'lp_c5_sst_adiba_20261014',
  revision:1,created_by:11,payload:{status:'staged_verified'},
  plan_date:new Date('2026-10-15T00:00:00Z')}]
])
const pool={connect:async()=>({
 query:async(sql,params=[])=>{
  if(sql.includes('to_regclass'))return {rows:[{table_name:'lesson_plans'}],rowCount:1}
  if(sql.includes('SELECT * FROM lesson_plans WHERE school_id=$1 AND public_id=$2')){
   const row=schoolDocs.get(params[1])
   return {rows:row&&Number(row.school_id)===Number(params[0])?[row]:[],rowCount:row&&Number(row.school_id)===Number(params[0])?1:0}
  }
  if(sql.includes('SELECT payload FROM lesson_plans WHERE school_id=$1')){
   const row=schoolDocs.get(params[1])
   return {rows:row&&row.school_id===params[0]&&row.revision===params[2]?[{payload:row.payload}]:[],
    rowCount:row&&row.school_id===params[0]&&row.revision===params[2]?1:0}
  }
  if(/(UPDATE|DELETE|INSERT)\s+lesson_plans/i.test(sql)||
     /INSERT\s+INTO\s+notification_log/i.test(sql)){
   forbiddenWriteAttempts++
   return {rows:[],rowCount:0}
  }
  return {rows:[],rowCount:0}
 },release(){}
})}
const fakeProtect=(req,res,next)=>{
 const actor=req.get('X-Test-Actor')
 const accounts={
  principal:{id:10,role:'admin',school_id:1},
  peer:{id:20,role:'admin',school_id:2},
  teacher:{id:30,role:'teacher',school_id:1}
 }
 if(!accounts[actor])return res.status(401).json({code:'AUTH_REQUIRED'})
 req.user=accounts[actor];req.school_id=req.user.school_id;next()
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
   return {isSchoolDocumentManager:user=>user.role==='admin',
    canAccessAuthoredDocument:(user,row,school)=>row.school_id===school&&user.school_id===school}
  if(request==='../services/lessonPlanningContext')
   return {loadPlanningContext:async()=>({})}
  if(request==='../services/lessonPlanningEngine')
   return {buildDeterministicPlan:()=>({}),
    enhancePlanWithAi:async()=>({}),parseSmartPlanningText:()=>({}),
    parseIsoDate:x=>new Date(x+'T00:00:00Z'),MAX_RANGE_DAYS:150}
 }
 return originalLoad.apply(this,arguments)
}
let router
try{
 process.env.DB_SIGNED_TENANT_RLS_ENABLED='false'
 router=require(routePath)
}finally{
 Module._load=originalLoad
 if(oldFlag===undefined)delete process.env.DB_SIGNED_TENANT_RLS_ENABLED
 else process.env.DB_SIGNED_TENANT_RLS_ENABLED=oldFlag
}
const app=express()
app.use(express.json())
app.use('/api/lesson-plans',router)
const server=http.createServer(app)
let base=''
test.before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port})
test.after(async()=>{await new Promise(r=>server.close(r))})
async function send(actor,method,id,body){
 const r=await fetch(base+'/api/lesson-plans/'+id,{
  method,headers:{...(actor?{'X-Test-Actor':actor}:{}),
   'content-type':'application/json'},body:body?JSON.stringify(body):undefined})
 return {status:r.status,body:await r.json()}
}
test('genuine manager cannot share blocked term draft or locked legacy source',async()=>{
 for(const id of ['lp-synthetic-private','lp_c5_sst_adiba_20261014']){
  const r=await send('principal','POST',id+'/share',{expectedRevision:1})
  assert.equal(r.status,409,r.body.message)
  assert.equal(r.body.code,'LESSON_PLAN_ACADEMIC_APPROVAL_REQUIRED')
 }
 assert.equal(forbiddenWriteAttempts,0)
})
test('ordinary teacher, unauthenticated actor and peer tenant cannot share source',async()=>{
 assert.equal((await send('teacher','POST','lp-synthetic-private/share',{expectedRevision:1})).status,403)
 assert.equal((await send('peer','POST','lp-synthetic-private/share',{expectedRevision:1})).status,404)
 assert.equal((await send('','POST','lp-synthetic-private/share',{expectedRevision:1})).status,401)
 assert.equal(forbiddenWriteAttempts,0)
})
test('source metadata cannot be stripped via generic PUT, including forged BLOCk removal',async()=>{
 const altered=payload()
 altered.plannerDocument.provenance={}
 const a=await send('principal','PUT','lp-synthetic-private',{...altered,expectedRevision:1})
 assert.equal(a.status,409)
 assert.equal(a.body.code,'LESSON_PLAN_ACADEMIC_SOURCE_LOCKED')
 const modified=payload()
 modified.plannerDocument.provenance.sourceZipSha256='b'.repeat(64)
 const b=await send('principal','PUT','lp-synthetic-private',{...modified,expectedRevision:1})
 assert.equal(b.status,409)
 assert.equal(forbiddenWriteAttempts,0)
})
test('old unapproved Adiba draft cannot be overwritten via generic PUT',async()=>{
 const r=await send('principal','PUT','lp_c5_sst_adiba_20261014',{...payload(),expectedRevision:1})
 assert.equal(r.status,409)
 assert.equal(forbiddenWriteAttempts,0)
})
test('protected private source and old unapproved drafts cannot be DELETEd',async()=>{
 for(const id of ['lp-synthetic-private','lp_c5_sst_adiba_20261014']){
  const r=await send('principal','DELETE',id+'?expectedRevision=1')
  assert.equal(r.status,409,r.body.message)
  assert.equal(r.body.code,'LESSON_PLAN_ACADEMIC_SOURCE_LOCKED')
 }
 assert.equal(forbiddenWriteAttempts,0)
})

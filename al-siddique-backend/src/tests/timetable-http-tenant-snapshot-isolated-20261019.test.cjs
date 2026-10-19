'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const express=require('express'),Module=require('node:module'),path=require('node:path')
const guard=require('../services/timetableWriteGuard')
const bells=require('../domain/schoolBellSchedule').schoolBellSchedule(1)
test('real Express timetable manager/tenant/stale-version HTTP without production database',async t=>{
 const log=[],role={name:'principal',school_id:1}
 const existing=bells.regular.filter(e=>e.label.startsWith('Period ')).map(slot=>({
   period_label:slot.label,start_time:slot.start,end_time:slot.end,subject:'Synthetic Science',
   teacher_id:77,teacher_display_name:'Test Teacher',staff_identity_reviewed:true,source_sha256:'0'.repeat(64)
 }))
 const client={async query(sql,params=[]){
   log.push(String(sql))
   if(String(sql).includes('FOR UPDATE'))return {rows:existing,rowCount:8}
   if(String(sql).includes('FROM public.users u JOIN public.employees'))return {rows:[{uid:77,employee_name:'Test Teacher'}],rowCount:1}
   return {rows:[],rowCount:0}
 },release(){}}
 const db={
  async query(sql){log.push(String(sql));return {rows:existing,rowCount:existing.length}},
  pool:{async connect(){log.push('POOL_CONNECT');return client}},
  async applyTenantContext(){log.push('TENANT_CONTEXT_APPLIED')}
 }
 const auth={protect(req,res,next){
  if(!req.headers['x-mock-role'])return res.status(401).json({success:false,code:'NO_TEST_AUTH'})
  req.user={id:100,role:role.name,school_id:role.school_id}
  req.school_id=role.school_id;next()
 },requireScopeForServiceOnly:()=>((req,res,next)=>next())}
 const tenant={async tenantClause(){return {clause:' AND school_id=$1',params:[1]}}}
 const target=path.resolve(__dirname,'../routes/timetableRoutes.js'),original=Module._load
 let router
 try{
  delete require.cache[target]
  Module._load=function(request,parent,isMain){
   if(parent?.filename===target){
    if(request==='../config/database')return db
    if(request==='../middleware/auth')return auth
    if(request==='../middleware/tenant')return tenant
   }
   return original.call(this,request,parent,isMain)
  }
  router=require(target)
 }finally{Module._load=original}
 const app=express();app.use(express.json());app.use('/api/timetable',router)
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))})
 t.after(()=>new Promise(resolve=>server.close(resolve)))
 const base='http://127.0.0.1:'+server.address().port
 const request=async(route,body,withAuth=true)=>{const r=await fetch(base+route,{method:body?'POST':'GET',headers:{...(withAuth?{'x-mock-role':role.name}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}}
 const payload=()=>({
  class_name:'Five',section:'Blue',day_name:'Monday',
  academic_session:bells.academic_session,schedule_version:bells.version,
  source_sha256:guard.APPROVED_SHA,expected_snapshot_sha256:guard.digest(existing),
  entries:existing.map(x=>({...x,subject:'Synthetic Science'}))
 })
 const oldSha=process.env.ASSPS_TIMETABLE_APPROVED_SOURCE_SHA256,oldGate=process.env.ASSPS_TIMETABLE_SOURCE_INDEPENDENTLY_ATTESTED
 process.env.ASSPS_TIMETABLE_APPROVED_SOURCE_SHA256=guard.APPROVED_SHA
 process.env.ASSPS_TIMETABLE_SOURCE_INDEPENDENTLY_ATTESTED='true'
 t.after(()=>{if(oldSha===undefined)delete process.env.ASSPS_TIMETABLE_APPROVED_SOURCE_SHA256;else process.env.ASSPS_TIMETABLE_APPROVED_SOURCE_SHA256=oldSha
  if(oldGate===undefined)delete process.env.ASSPS_TIMETABLE_SOURCE_INDEPENDENTLY_ATTESTED;else process.env.ASSPS_TIMETABLE_SOURCE_INDEPENDENTLY_ATTESTED=oldGate})
 assert.equal((await request('/api/timetable/save',payload(),false)).status,401)
 role.name='teacher';assert.equal((await request('/api/timetable/save',payload())).status,403)
 role.name='principal'
 const cross=payload();cross.school_id=2;assert.equal((await request('/api/timetable/save',cross)).status,403)
 const empty=payload();empty.entries=[];assert.equal((await request('/api/timetable/save',empty)).status,422)
 const stale=payload();stale.expected_snapshot_sha256='f'.repeat(64)
 assert.equal((await request('/api/timetable/save',stale)).status,409)
 assert.equal(log.filter(x=>x.includes('DELETE FROM public.timetable')).length,0)
 const success=await request('/api/timetable/save',payload())
 assert.equal(success.status,200,JSON.stringify(success))
 assert.equal(success.data.count,8)
 assert.equal(log.filter(x=>x.includes('INSERT INTO public.timetable')).length,8)
 assert.equal(log.filter(x=>x.includes('DELETE FROM public.timetable')).length,1)
 assert(log.some(x=>x.includes('ISOLATION LEVEL SERIALIZABLE')))
 assert(log.includes('TENANT_CONTEXT_APPLIED'))
 assert(log.some(x=>x.includes('COMMIT')))
 const snapshot=await request('/api/timetable/snapshot?class_name=Five&section=Blue&day_name=Monday&academic_session='+encodeURIComponent(bells.academic_session))
 assert.equal(snapshot.status,200)
 assert.equal(snapshot.data.entries.length,8)
 role.school_id=2
 assert.equal((await request('/api/timetable/save',payload())).status,403)
 assert.equal((await request('/api/timetable/snapshot?class_name=Five&section=Blue&day_name=Monday&academic_session='+encodeURIComponent(bells.academic_session))).status,403)
})

'use strict'
// Simulated PostgreSQL connection, independent of any school database.
// Only tests transaction ordering, tenant binding, validated actor, and rollback.
const test=require('node:test'), assert=require('node:assert/strict')
const express=require('express'), http=require('node:http'), Module=require('node:module')
const path=require('node:path')
const guard=require('../services/timetableWriteGuard')
const actualBell=require('../domain/schoolBellSchedule').schoolBellSchedule
const bell=actualBell(1)
const name='Demo Teacher', teacher=17
const entries=bell.regular.filter(x=>/^Period [1-8]$/.test(x.label)).map(s=>({
  period_label:s.label,start_time:s.start,end_time:s.end,
  subject:'Mathematics',teacher_id:teacher,teacher_display_name:name,room:'Blue'
}))
const rows=entries.map(e=>({...e,source_sha256:guard.APPROVED_SHA,staff_identity_reviewed:true}))
const payload={class_name:'Five',section:'Blue',day_name:'Monday',academic_session:bell.academic_session,
  entries,source_sha256:guard.APPROVED_SHA,schedule_version:bell.version,expected_snapshot_sha256:guard.digest(rows)}
let failInsert=false
const sqls=[]
const fakeClient={
 async query(sql,params){
  sqls.push([sql,params])
  if(sql.includes('SELECT period_label')&&sql.includes('FOR UPDATE'))return {rows}
  if(sql.includes('SELECT u.id AS uid'))return {rows:[{uid:teacher,employee_name:name}]}
  if(failInsert && sql.includes('INSERT INTO public.timetable'))throw Error('Synthetic insert failure')
  return {rows:[]}
 },
 release(){sqls.push(['RELEASE'])}
}
const fakeDatabase={
 query:async()=>{throw Error('Non-transaction query prohibited')},
 pool:{connect:async()=>{sqls.push(['CONNECT']);return fakeClient}},
 applyTenantContext:async()=>{sqls.push(['TENANT_CONTEXT'])}
}
const routeFile=path.resolve(__dirname,'../routes/timetableRoutes.js')
const origin=Module._load
let route
try{
 Module._load=function(request,parent,isMain){
  if(parent?.filename===routeFile){
   if(request==='../config/database')return fakeDatabase
   if(request==='../middleware/auth')return {
    protect(req,res,next){req.user={id:12,school_id:1,role:'principal'};req.school_id=1;next()},
    requireScopeForServiceOnly:()=> (_,__,next)=>next()
   }
   if(request==='../middleware/tenant')return {tenantClause:async()=>({clause:'',params:[]})}
   if(request==='../domain/schoolBellSchedule')return {schoolBellSchedule:actualBell}
  }
  return origin.call(this,request,parent,isMain)
 }
 route=require(routeFile)
}finally{Module._load=origin}
const app=express();app.use(express.json());app.use('/api/timetable',route)
let server,base
test.before(async()=>{
  server=http.createServer(app)
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  base='http://127.0.0.1:'+server.address().port
  process.env.ASSPS_TIMETABLE_APPROVED_SOURCE_SHA256=guard.APPROVED_SHA
  process.env.ASSPS_TIMETABLE_SOURCE_INDEPENDENTLY_ATTESTED='true'
})
test.after(async()=>{
  if(server)await new Promise(resolve=>server.close(resolve))
  delete process.env.ASSPS_TIMETABLE_APPROVED_SOURCE_SHA256
  delete process.env.ASSPS_TIMETABLE_SOURCE_INDEPENDENTLY_ATTESTED
})
async function request(){const r=await fetch(base+'/api/timetable/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});return {status:r.status,body:await r.json()}}
function op(x){return sqls.filter(c=>c[0].includes(x))}
test('valid optimistic replacement binds tenant and commits all eight rows atomically',async()=>{
  failInsert=false;sqls.length=0
  const r=await request()
  assert.equal(r.status,200,JSON.stringify(r.body))
  assert.equal(r.body.count,8)
  assert.equal(op('BEGIN ISOLATION LEVEL SERIALIZABLE').length,1)
  assert.equal(op('TENANT_CONTEXT').length,1)
  assert.equal(op('pg_advisory_xact_lock').length,1)
  assert.equal(op('INSERT INTO public.timetable').length,8)
  assert.equal(op('DELETE FROM public.timetable').length,1)
  assert.equal(op('COMMIT').length,1)
  assert.equal(op('ROLLBACK').length,0)
  assert.equal(op('RELEASE').length,1)
  assert.equal(op('DELETE FROM public.timetable')[0][1][0],1)
})
test('failed insertion rolls back and never commits partial timetable',async()=>{
  failInsert=true;sqls.length=0
  const r=await request()
  assert.equal(r.status,503) // intentional generic database-failure contract
  assert.equal(r.body.code,'TIMETABLE_SAVE_UNAVAILABLE')
  assert.equal(op('BEGIN ISOLATION LEVEL SERIALIZABLE').length,1)
  assert.equal(op('ROLLBACK').length,1)
  assert.equal(op('COMMIT').length,0)
  assert.equal(op('RELEASE').length,1)
  failInsert=false
})

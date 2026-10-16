'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
const Module=require('node:module'),express=require('express'),http=require('node:http')
const {Client}=require('pg')
const enabled=process.env.ASSPS_DB_INTEGRATION==='1'
test('Real ASSPS source 58-row admin reference HTTP / staff no-roster / parent forbidden',
 {skip:!enabled},async()=>{
 require('dotenv').config({path:process.env.ASSPS_DB_ENV_PATH||'/var/www/apex-backend/.env'})
 const c=new Client({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,connectionTimeoutMillis:5000})
 let server
 try{
  await c.connect();await c.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
  const old=Module._load
  Module._load=function(name,parent,...rest){
   if(name==='../config/database'&&parent?.filename?.endsWith('timetableReferenceRoutes.js'))
    return {query:(sql,args)=>{assert(/^\s*SELECT\b/i.test(sql),'Read-only SQL only');return c.query(sql,args)}}
   if(name==='../middleware/auth'&&parent?.filename?.endsWith('timetableReferenceRoutes.js'))
    return {protect:(req,res,next)=>{req.user={role:req.headers['x-test-role']||'admin'};req.school_id=1;next()},requireScopeForServiceOnly:()=>((req,res,next)=>next())}
   return old.call(this,name,parent,...rest)
  }
  let route
  try{route=require('../routes/timetableReferenceRoutes.js')}finally{Module._load=old}
  const app=express();app.use('/api/timetable',route)
  server=http.createServer(app);await new Promise(r=>server.listen(0,'127.0.0.1',r))
  const port=server.address().port
  const get=async(role)=>{const r=await fetch('http://127.0.0.1:'+port+'/api/timetable/reference',{headers:{'x-test-role':role}});return {status:r.status,data:await r.json()}}
  const admin=await get('admin')
  assert.equal(admin.status,200,JSON.stringify(admin.data))
  assert.equal(admin.data.data.length,58)
  assert.equal(admin.data.coverage.total_active_students,318)
  assert.equal(admin.data.coverage.fully_verified_subject_timetable_students,98)
  assert.equal(admin.data.coverage.students_subject_timetable_pending,220)
  assert.equal(admin.data.coverage.decision,'HOLD_FULL_RELEASE')
  assert.equal(admin.data.approvedBellTimings.friday.find(x=>x.label==='Period 5').start,'10:40')
  assert(admin.data.data.every(x=>!Object.hasOwn(x,'teacher_id')))
  const teacher=await get('teacher')
  assert.equal(teacher.status,200)
  assert.equal(teacher.data.coverage,null)
  assert.equal((await get('parent')).status,403)
  console.log('REAL_REFERENCE_HTTP_READONLY_PASS admin=200 teacher=200 parent=403 source_rows=58 verified_students=98 pending=220')
  await c.query('ROLLBACK')
 }finally{if(server)await new Promise(r=>server.close(r));await c.query('ROLLBACK').catch(()=>{});await c.end().catch(()=>{})}
})

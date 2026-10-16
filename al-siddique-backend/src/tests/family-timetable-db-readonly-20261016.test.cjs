'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const http=require('node:http')
const express=require('express')
const {Client}=require('pg')
require('dotenv').config({path:process.env.ASSPS_DB_ENV_PATH||'/var/www/apex-backend/.env'})
const con=new Client({
 host:process.env.DB_HOST,port:Number(process.env.DB_PORT||5432),
 database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,
 connectionTimeoutMillis:5000
})
let server,port
test('Isolated real DB read-only family timetable: exact linked parents, tenant boundary, Friday',{skip:process.env.ASSPS_DB_INTEGRATION!=='1'},async()=>{
 await con.connect()
 await con.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
 try {
  const users=await con.query(`SELECT DISTINCT parent_user_id FROM students
   WHERE school_id=1 AND is_active=true AND parent_user_id IS NOT NULL
    AND class IN ('Four','Five','Six','Seven','Nine') ORDER BY parent_user_id LIMIT 2`)
  assert.equal(users.rows.length,2,'Need two separately linked parents')
  const [idA,idB]=users.rows.map(r=>Number(r.parent_user_id))
  const original=Module._load
  Module._load=function(name,parent,...rest){
   if(name==='../config/database'&&parent?.filename?.endsWith('portalRoutes.js'))
    return {query:(sql,args)=>{assert(/^\s*SELECT\b/i.test(sql),'Read-only SELECT queries only');return con.query(sql,args)}}
   if(name==='../middleware/auth'&&parent?.filename?.endsWith('portalRoutes.js'))
    return {protect:(req,res,next)=>{
      req.user={role:'parent',id:Number(req.headers['x-qa-test-user'])};next()
    },requireRoles:()=>((req,res,next)=>next())}
   if(name==='../middleware/tenant'&&parent?.filename?.endsWith('portalRoutes.js'))
    return {currentSchoolId:req=>Number(req.headers['x-qa-test-school']||1)}
   return original.call(this,name,parent,...rest)
  }
  let router
  try{router=require('../routes/portalRoutes.js')}finally{Module._load=original}
  const app=express();app.use('/portal',router)
  server=http.createServer(app)
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port
  const get=async(user,school=1)=>{
    const rsp=await fetch('http://127.0.0.1:'+port+'/portal/family-timetable?day=Friday',
      {headers:{'x-qa-test-user':String(user),'x-qa-test-school':String(school)}})
    return {status:rsp.status,body:await rsp.json()}
  }
  const a=await get(idA),b=await get(idB)
  assert.equal(a.status,200);assert.equal(b.status,200)
  assert(a.body.data.children.length>0);assert(b.body.data.children.length>0)
  const expectedA=await con.query('SELECT id FROM students WHERE school_id=1 AND parent_user_id=$1 AND is_active=true',[idA])
  const expectedB=await con.query('SELECT id FROM students WHERE school_id=1 AND parent_user_id=$1 AND is_active=true',[idB])
  const same=(x,y)=>assert.deepEqual(x.sort((a,b)=>a-b),y.sort((a,b)=>a-b))
  same(a.body.data.children.map(x=>x.student_id),expectedA.rows.map(x=>x.id))
  same(b.body.data.children.map(x=>x.student_id),expectedB.rows.map(x=>x.id))
  assert(!a.body.data.children.some(x=>expectedB.rows.some(y=>y.id===x.student_id)))
  assert(!b.body.data.children.some(x=>expectedA.rows.some(y=>y.id===x.student_id)))
  const child=a.body.data.children[0]
  assert.equal(a.body.data.version,'ASSPS-2026-10-16-V1')
  assert.equal(a.body.data.profile,'friday')
  assert(!a.body.data.bell_schedule.some(x=>x.kind==='break'))
  assert.equal(child.periods.find(x=>x.label==='Period 5').start,'10:40')
  const otherSchool=await get(idA,2)
  assert.equal(otherSchool.status,409)
  console.log('PASS: read-only DB parent scoping, two parent IDs, Friday, no break, peer tenant denial; no student identifiers logged')
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve))
  await con.query('ROLLBACK').catch(()=>{})
  await con.end()
 }
})

'use strict'
const {test,before,after}=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const http=require('node:http')
const fs=require('node:fs')
const path=require('node:path')
const express=require('express')
const route=path.resolve(__dirname,'../routes/brandingRoutes.js')
const backendRoot=path.resolve(__dirname,'../')
const original=Module._load
let responses=[], calls=[]
let readBranding
try{
 Module._load=function(request,parent,isMain){
  if(parent?.filename===route && request==='../config/database'){
   return {
    query:async(sql,args)=>{
      calls.push({sql,args})
      if(responses[0] instanceof Error)throw responses[0]
      return {rows:responses.shift()||[]}
    },
    pool:{},applyTenantContext:()=>{}
   }
  }
  if(parent?.filename===route && request==='../middleware/auth')
    return {protect:(req,res,next)=>res.status(401).json({success:false})}
  return original.call(this,request,parent,isMain)
 }
 readBranding=require(route)
}finally{Module._load=original}
const app=express()
app.use('/api/school',readBranding)
let server,base
before(async()=>{server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port})
after(async()=>{await new Promise(resolve=>server.close(resolve))})
async function query(code){const r=await fetch(base+'/api/school/public-branding?school_code='+encodeURIComponent(code));return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')}}
test('missing/malformed tenant codes fail validation without DB query',async()=>{
 for(const code of ['','!#','../../admin','a'.repeat(61)]){
  calls.length=0;responses=[]
  const r=await query(code)
  assert.equal(r.status,400,code)
  assert.deepEqual(calls,[])
 }
})
test('school code lookup only uses public branding columns and binds a parameter',async()=>{
 calls.length=0
 responses=[[{school_name:'Sample School',logo_url:'/public/school-logo.png',primary_color:'#336699',secondary_color:'#009988',
 password_hash:'private-fixture',teacher_email:'hidden-fixture',school_id:777}]]
 const r=await query('sample')
 assert.equal(r.status,200)
 assert.equal(r.body.success,true)
 assert.deepEqual(Object.keys(r.body.data).sort(),['logoUrl','primaryColor','schoolName','secondaryColor'].sort())
 assert.equal(r.body.data.schoolName,'Sample School')
 assert.equal(r.body.data.logoUrl,'/public/school-logo.png')
 assert.ok(!JSON.stringify(r.body).includes('private-fixture'))
 assert.ok(!JSON.stringify(r.body).includes('hidden-fixture'))
 assert.ok(!JSON.stringify(r.body).includes('school_id'))
 assert.equal(calls.length,1)
 assert.deepEqual(calls[0].args,['sample'])
 assert.match(calls[0].sql,/LOWER\(s\.code\)\s*=\s*LOWER\(\$1\)/)
 assert.match(calls[0].sql,/LOWER\(s\.status\) IN \('active','trial'\)/)
 assert.ok(!calls[0].sql.toLowerCase().includes('select *'))
})
test('unknown/inactive schools fail without leaking schools list',async()=>{
 calls.length=0;responses=[[]]
 const r=await query('nonexistent')
 assert.equal(r.status,404)
 assert.deepEqual(Object.keys(r.body),['success','message'])
 assert.equal(calls.length,1)
})
test('database outage is contained with generic unavailable response',async()=>{
 calls.length=0;responses=[new Error('synthetic db secret')]
 const r=await query('school')
 assert.equal(r.status,503)
 assert.ok(!JSON.stringify(r.body).includes('synthetic'))
})
test('current live school documents mount is present on source server',()=>{
 const source=fs.readFileSync(path.join(backendRoot,'server.js'),'utf8')
 assert.ok(source.includes("mount('/school-documents', './routes/schoolDocumentStudioRoutes')"))
 assert.equal(source.split("mount('/school-documents',").length,2)
 assert.ok(source.includes("mount('/lesson-plans','./routes/lessonPlanRoutes')"))
 assert.ok(source.includes("mount('/timetable',  './routes/timetableRoutes')"))
})
test('result query includes attendance and scopes aggregate to exam school',()=>{
 const source=fs.readFileSync(path.join(backendRoot,'routes/examRoutes.js'),'utf8')
 assert.equal(source.split('FROM attendance GROUP BY school_id, student_id').length-1,2)
 assert.equal(source.split('att.school_id = s.school_id AND att.student_id = s.id').length-1,2)
 assert.ok(source.includes("loadGradeBandsForSchool(schoolId, {previewDefaults:false})"))
 assert.ok(source.includes('JOIN students s ON er.student_id = s.id AND s.school_id = e.school_id'))
})

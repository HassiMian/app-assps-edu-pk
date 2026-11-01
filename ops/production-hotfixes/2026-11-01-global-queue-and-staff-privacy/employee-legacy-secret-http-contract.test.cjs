'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs'),vm=require('node:vm'),http=require('node:http')
const express=require('/var/www/apex-backend/node_modules/express')
const source=fs.readFileSync(process.env.CANDIDATE||'/var/www/apex-backend/src/routes/employeeRoutes.js','utf8')
const {employeePublicRecord}=require('/var/www/apex-backend/src/services/staffSecurityProjection')
function create(){
 const queries=[]
 const SECRET='SYNTHETIC_NOT_ACTUAL_STAFF_PASSWORD'
 const fakeQuery=async(sql,params)=>{
  queries.push({sql,params})
  if(sql.includes('FROM employees WHERE is_active')) return {rowCount:1,rows:[{id:5,name:'Test Only',school_id:1,portal_password:SECRET,phone:'000',is_active:true}]}
  if(sql.includes('FROM employees WHERE id')) return {rowCount:1,rows:[{id:5,name:'Test Only',school_id:1,portal_password:SECRET,phone:'000',is_active:true}]}
  return {rowCount:0,rows:[]}
 }
 const role=()=>(req,res,next)=>['principal','admin','super_admin'].includes(req.user?.role)?next():res.status(403).json({success:false})
 const custom=(m)=>{
  if(m==='express')return express
  if(m==='crypto')return require('node:crypto')
  if(m==='../config/database')return {query:fakeQuery}
  if(m==='../middleware/auth')return {
   protect:(req,res,next)=>{const r=req.get('X-Synthetic-Role')||'anonymous';if(r==='anonymous')return res.status(401).json({success:false});req.user={role:r};next()},
   requireRoles:()=>role(),
   adminOrServiceScope:()=>role()
  }
  if(m==='../middleware/tenant')return {
   tenantClause:async(req,{paramIndex})=>({clause:' AND school_id = $'+paramIndex,params:[1],nextIndex:paramIndex+1}),
   currentSchoolId:()=>1,currentTenantId:()=>null,hasColumn:async()=>true}
  if(m==='../services/portalAccountService')return {provisionPortalUser:async()=>{},resetPortalUserPassword:async()=>{},setPortalUserActive:async()=>{}}
  if(m==='../services/staffSecurityProjection')return {employeePublicRecord}
  throw new Error('UNMOCKED_MODULE '+m)
 }
 const module={exports:{}}
 vm.runInNewContext(source,{require:custom,module,exports:module.exports,console,Buffer,Date,JSON,Number,Array,Object,Math,String,Boolean,Promise,Error,setTimeout})
 const app=express();app.use(express.json());app.use('/api/employees',module.exports)
 return {app,queries,SECRET}
}
async function request(app,path,role,method='GET',body=null){
 const s=await new Promise(r=>{const x=http.createServer(app);x.listen(0,'127.0.0.1',()=>r(x))})
 try{
  const result=await fetch('http://127.0.0.1:'+s.address().port+path,{method,headers:{'X-Synthetic-Role':role,'Content-Type':'application/json'},body:body===null?undefined:JSON.stringify(body)})
  return {status:result.status,text:await result.text()}
 }finally{await new Promise(r=>s.close(r))}
}
test('school Principal staff listing redacts all legacy portal password fields',async()=>{
 const {app,SECRET}=create()
 const r=await request(app,'/api/employees','principal')
 assert.equal(r.status,200,r.text)
 assert.equal(JSON.parse(r.text).data[0].portal_password,undefined)
 assert.ok(!r.text.includes(SECRET))
})
test('school Principal employee detail redacts legacy password field',async()=>{
 const {app,SECRET}=create()
 const r=await request(app,'/api/employees/5','principal')
 assert.equal(r.status,200,r.text)
 assert.equal(JSON.parse(r.text).data.portal_password,undefined)
 assert.ok(!r.text.includes(SECRET))
})
test('no authorization means no employee data',async()=>{
 const {app}=create()
 const r=await request(app,'/api/employees','anonymous')
 assert.equal(r.status,401)
})

test('legacy password on employee POST is actively rejected without a DB query',async()=>{
 const {app,queries}=create()
 const r=await request(app,'/api/employees','principal','POST',{name:'Test',designation:'Teacher',portal_password:'synthetic-only'})
 assert.equal(r.status,422,r.text)
 assert.equal(JSON.parse(r.text).code,'LEGACY_PORTAL_PASSWORD_FIELD_FORBIDDEN')
 assert.equal(queries.length,0)
})
test('legacy password on employee PUT is actively rejected without a DB query',async()=>{
 const {app,queries}=create()
 const r=await request(app,'/api/employees/5','principal','PUT',{name:'Test',portal_password:'synthetic-only'})
 assert.equal(r.status,422,r.text)
 assert.equal(JSON.parse(r.text).code,'LEGACY_PORTAL_PASSWORD_FIELD_FORBIDDEN')
 assert.equal(queries.length,0)
})

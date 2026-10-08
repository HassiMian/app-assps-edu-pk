'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const http=require('node:http')
const express=require('express')
const jwt=require('jsonwebtoken')
const crypto=require('node:crypto')
const required={
 DB_HOST:'127.0.0.1',DB_PORT:'55432',
 DB_NAME:'assps_archv1_rls_corep9_20261008',DB_USER:'assps_core_test_login',
 DB_RUNTIME_ROLE:'apex_app_runtime',DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'true',
 DB_AUTH_USE_SIGNED_TENANT_CONTEXT:'true',DB_SIGNED_TENANT_RLS_ENABLED:'true',
 PAPER_RESTRICTED_DB_ENABLED:'true',PAPER_RESTRICTED_DB_USER:'assps_core_paper_p9',
 JWT_SECRET:'isolated-synthetic-signing-key-only'
}
for(const [key,val] of Object.entries(required))assert.equal(process.env[key],val,'Unsafe test env: '+key)
assert.match(process.env.DB_SIGNED_TENANT_HMAC_KEY||'',/^[a-f0-9]{64}$/)
assert.equal(process.env.PAPER_RESTRICTED_SIGNING_KEY,process.env.DB_SIGNED_TENANT_HMAC_KEY)
process.env.DB_STARTUP_PROBE='false'
const {pool,query,tenantContext}=require('../config/database')
const scoped=(tenant,fn)=>tenantContext.run({
 rlsEnabled:true,isSuperAdmin:false,tenantId:tenant,
 tenantKey:tenant===900001?'synthetic-core-a':'synthetic-core-b',actorId:999001
},fn)
const fetch=(port,path,token,method='GET',body)=>new Promise((resolve,reject)=>{
 const data=body?JSON.stringify(body):''
 const r=http.request({host:'127.0.0.1',port,path,method,headers:{
  ...(token?{authorization:'Bearer '+token}:{}),
  ...(data?{'content-type':'application/json','content-length':Buffer.byteLength(data)}:{})
 }},res=>{
  let s='';res.on('data',x=>s+=x)
  res.on('end',()=>{let json=null;try{json=JSON.parse(s)}catch{};resolve({status:res.statusCode,json,body:s})})
 })
 r.on('error',reject);r.end(data||undefined)
})
test('real restricted Paper login validates rich heading BEFORE persistence and preserves safe revision', {timeout:30000},async t=>{
 const teacher=(await scoped(900001,()=>query("SELECT id,email,role,school_id FROM users WHERE email='core-security-a@example.invalid'"))).rows[0]
 const otherSchool=(await scoped(900002,()=>query("SELECT id,email,role,school_id FROM users WHERE email='core-security-b@example.invalid'"))).rows[0]
 const peer=(await scoped(900001,()=>query("SELECT id,email,role,school_id FROM users WHERE email='core-unassigned@example.invalid'"))).rows[0]
 assert.ok(teacher&&otherSchool&&peer)
 const sign=x=>jwt.sign({id:x.id,email:x.email,role:x.role,school_id:x.school_id},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'3m'})
 const app=express()
 app.use(express.json({limit:'1mb'}))
 app.use((_req,_res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next))
 app.use('/api/assessment-studio',require('../routes/assessmentStudioRoutes'))
 const server=await new Promise(done=>{const s=app.listen(0,'127.0.0.1',()=>done(s))})
 t.after(async()=>{await new Promise(done=>server.close(done));await pool.end()})
 const port=server.address().port
 const doc={format:'assps-canonical-paper',documentModel:'PaperDocumentV2',schemaVersion:3,documentOrigin:'USER_AUTHORED',sourceIdentity:null,sections:[{
  id:'sec-p12',heading:'Q1. Formation of clouds (5)',operationalSectionTotal:5,
  headingFormatting:{questionSerial:'<b>Q1.</b>',headingInstruction:'<span style="font-weight:bold;text-decoration-line:underline">Formation</span> of clouds'}
 }]}
 const paperId='p12-rich-'+crypto.randomUUID()
 const path='/api/assessment-studio/papers/'+paperId
 const body={expectedRevision:0,title:'Synthetic Restricted Rich Heading',document:doc}
 let r=await fetch(port,path+'/revisions',null,'POST',body)
 assert.equal(r.status,401,r.body)
 for(const html of ['<img src=x onerror=alert(1)>','<svg><script>x</script></svg>','<span style="position:absolute">x</span>']){
  const altered={...doc,sections:[{...doc.sections[0],headingFormatting:{...doc.sections[0].headingFormatting,headingInstruction:html}}]}
  r=await fetch(port,path+'/revisions',sign(teacher),'POST',{...body,document:altered})
  assert.equal(r.status,400,r.body)
  assert.match(r.json.message,/headingFormatting/)
 }
 r=await fetch(port,path+'/revisions',sign(teacher),'POST',body)
 assert.equal(r.status,201,r.body)
 assert.equal(r.json.data.currentRevision,1)
 const hash=r.json.data.contentHash
 assert.match(hash,/^[0-9a-f]{64}$/)
 r=await fetch(port,path,sign(teacher))
 assert.equal(r.status,200,r.body)
 assert.deepEqual(r.json.data.document_json,doc)
 assert.equal(r.json.data.content_hash,hash)
 r=await fetch(port,path+'/revisions',sign(teacher),'POST',{...body,expectedRevision:0})
 assert.equal(r.status,409,r.body)
 r=await fetch(port,path,sign(peer))
 assert.ok([403,404].includes(r.status),'Same-school peer must not read author paper: '+r.body)
 r=await fetch(port,path,sign(otherSchool))
 assert.ok([403,404].includes(r.status),'Other school must not read: '+r.body)
 // A same-school nonauthor and a different school may not update the
 // author's existing revision using the same public identifier.
 r=await fetch(port,path+'/revisions',sign(peer),'POST',{...body,expectedRevision:1})
 assert.equal(r.status,409,r.body)
 r=await fetch(port,path+'/revisions',sign(otherSchool),'POST',{...body,expectedRevision:1})
 assert.equal(r.status,409,r.body)
 // Cross-school caller cannot view the original document, and the owner
 // still sees the unchanged authoritative content/hash after all denials.
 r=await fetch(port,path,sign(teacher))
 assert.equal(r.status,200,r.body)
 assert.equal(r.json.data.content_hash,hash)
 assert.deepEqual(r.json.data.document_json,doc)

})

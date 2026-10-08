'use strict'
const {test,after}=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const jwt=require('jsonwebtoken')
const http=require('node:http')
const mandatory={
 DB_HOST:'127.0.0.1',DB_PORT:'55432',DB_NAME:'assps_archv1_rls_corep9_20261008',
 DB_USER:'assps_core_test_login',DB_RUNTIME_ROLE:'apex_app_runtime',
 DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'true',DB_SIGNED_TENANT_RLS_ENABLED:'true',
 DB_AUTH_USE_SIGNED_TENANT_CONTEXT:'true',PAPER_RESTRICTED_DB_ENABLED:'true',
 PAPER_RESTRICTED_DB_USER:'assps_core_paper_p9',JWT_SECRET:'isolated-synthetic-signing-key-only'
}
for(const [k,v] of Object.entries(mandatory))assert.equal(process.env[k],v,'unsafe clone gate '+k)
assert.match(process.env.DB_SIGNED_TENANT_HMAC_KEY||'',/^[0-9a-f]{64}$/)
assert.equal(process.env.PAPER_RESTRICTED_SIGNING_KEY,process.env.DB_SIGNED_TENANT_HMAC_KEY)
process.env.DB_STARTUP_PROBE='false'
const {query,pool,tenantContext}=require('../config/database')
const {verifiedPaperContext}=require('../middleware/paperRestrictedDatabase')
after(async()=>pool.end())
const scoped=(tenant,actorId,fn,restricted=false)=>tenantContext.run({
 rlsEnabled:true,isSuperAdmin:false,tenantId:tenant,actorId,
 tenantKey:tenant===900001?'synthetic-core-a':'synthetic-core-b',
 ...(restricted?{paperRestricted:true,paperActorId:actorId,paperActorRole:'teacher'}:{})
},fn)
const request=(port,path,token)=>new Promise((resolve,reject)=>{
 const r=http.request({host:'127.0.0.1',port,path,
  headers:token?{Authorization:'Bearer '+token}:{}},res=>{
   let s='';res.on('data',c=>s+=c);res.on('end',()=>{let json={};try{json=JSON.parse(s)}catch{};resolve({status:res.statusCode,json})})
 })
 r.on('error',reject);r.end()
})
test('signed Paper dedicated login: real teacher HTTP paper vault and school isolation',{timeout:18000},async t=>{
 const a=(await scoped(900001,999001,()=>query("SELECT id,email,school_id,role FROM users WHERE email='core-security-a@example.invalid'"))).rows[0]
 const b=(await scoped(900002,999001,()=>query("SELECT id,email,school_id,role FROM users WHERE email='core-security-b@example.invalid'"))).rows[0]
 const peer=(await scoped(900001,999001,()=>query("SELECT id,email,school_id,role FROM users WHERE email='core-unassigned@example.invalid'"))).rows[0]
 assert.ok(a&&b&&peer)
 const token=(u,extra={})=>jwt.sign({...u,...extra},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'4m'})
 const app=express()
 app.use((_req,_res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next))
 app.use('/api/paper-studio',require('../routes/paperStudioRoutes'))
 const server=await new Promise(ok=>{const s=app.listen(0,'127.0.0.1',()=>ok(s))})
 t.after(async()=>{await new Promise(ok=>server.close(ok))})
 const port=server.address().port
 let r=await request(port,'/api/paper-studio/papers',token(a))
 assert.equal(r.status,200,JSON.stringify(r))
 assert.ok(r.json?.data?.some(p=>p.name==='P6 Synthetic Paper 900001'),JSON.stringify(r))
 assert.ok(!r.json?.data?.some(p=>p.name==='P6 Synthetic Paper 900002'))
 r=await request(port,'/api/paper-studio/papers?school_id=900002',token(a))
 assert.equal(r.status,200,JSON.stringify(r))
 assert.ok(!r.json?.data?.some(p=>p.name==='P6 Synthetic Paper 900002'))
 r=await request(port,'/api/paper-studio/papers',token(b))
 assert.equal(r.status,200,JSON.stringify(r))
 assert.ok(r.json?.data?.some(p=>p.name==='P6 Synthetic Paper 900002'),JSON.stringify(r))
 r=await request(port,'/api/paper-studio/papers',token(peer))
 assert.equal(r.status,200,JSON.stringify(r))
 assert.equal(r.json?.data?.length,0)
 r=await request(port,'/api/paper-studio/papers',token(a,{role:'admin'}))
 assert.equal(r.status,200,JSON.stringify(r))
 assert.ok(!r.json?.data?.some(p=>p.name==='P6 Synthetic Paper 900002'))
 r=await request(port,'/api/paper-studio/papers',token(a,{school_id:900002}))
 assert.equal(r.status,401,JSON.stringify(r))
 r=await request(port,'/api/paper-studio/papers',null)
 assert.equal(r.status,401,JSON.stringify(r))
})
test('signed Paper connection refuses unsigned access and forged request actors',async()=>{
 await assert.rejects(query('SELECT count(*) FROM paper_vault'),e=>e.code==='PAPER_RESTRICTED_SCOPE_REQUIRED')
 assert.throws(()=>verifiedPaperContext({user:{role:'teacher',id:1,school_id:900001},school_id:900002}),e=>e.code==='PAPER_DB_CONTEXT_FORBIDDEN')
})
test('dedicated Paper role cannot escape signed policies by setting arbitrary tenant context',async()=>{
 const a=(await scoped(900001,999001,()=>query("SELECT id FROM users WHERE email='core-security-a@example.invalid'"))).rows[0]
 await scoped(900001,a.id,async()=>{
  const client=await pool.connect()
  try{
   const yes=(await client.query('SELECT count(*)::int AS n FROM paper_vault WHERE school_id=900001')).rows[0].n
   assert.equal(yes,1)
   await client.query("SELECT set_config('app.tenant_id','900002',true)")
   const no=(await client.query('SELECT count(*)::int AS n FROM paper_vault WHERE school_id=900002')).rows[0].n
   assert.equal(no,0)
   await assert.rejects(client.query('SET LOCAL ROLE apex_app_runtime'),/permission denied|not permitted/)
  }finally{await client.release()}
 },true)
})
test('real Assessment Results HTTP uses dedicated signed paper login for assigned teacher only',{timeout:12000},async t=>{
 const a=(await scoped(900001,999001,()=>query("SELECT id,email,school_id,role FROM users WHERE email='core-security-a@example.invalid'"))).rows[0]
 const b=(await scoped(900002,999001,()=>query("SELECT id,email,school_id,role FROM users WHERE email='core-security-b@example.invalid'"))).rows[0]
 const peer=(await scoped(900001,999001,()=>query("SELECT id,email,school_id,role FROM users WHERE email='core-unassigned@example.invalid'"))).rows[0]
 const proof=await scoped(900001,a.id,async()=>{
   const results=await query("SELECT count(*)::int AS n FROM assessment_result_records WHERE result_id='CORE-P6-RESULT-A'")
   const releases=await query("SELECT count(*)::int AS n FROM assessment_releases WHERE release_id='CORE-P6-RELEASE-900001'")
   const assignments=await query("SELECT count(*)::int AS n FROM teacher_class_assignments WHERE teacher_user_id=$1",[a.id])
   return [results.rows[0].n,releases.rows[0].n,assignments.rows[0].n]
 },true)
 assert.deepEqual(proof,[1,1,1],'Signed result release and assignment must be visible')
 const token=u=>jwt.sign(u,process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'4m'})
 const app=express()
 app.use((_req,_res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next))
 app.use('/api/assessment-results',require('../routes/assessmentResultRoutes'))
 const server=await new Promise(ok=>{const s=app.listen(0,'127.0.0.1',()=>ok(s))})
 t.after(async()=>{await new Promise(ok=>server.close(ok))})
 const port=server.address().port
 let r=await request(port,'/api/assessment-results/CORE-P6-RESULT-A',token(a))
 assert.equal(r.status,200,JSON.stringify(r))
 assert.equal(r.json?.data?.result_id,'CORE-P6-RESULT-A')
 r=await request(port,'/api/assessment-results/CORE-P6-RESULT-A',token(b))
 assert.equal(r.status,404,JSON.stringify(r))
 r=await request(port,'/api/assessment-results/CORE-P6-RESULT-A',token(peer))
 assert.equal(r.status,404,JSON.stringify(r))
 r=await request(port,'/api/assessment-results/CORE-P6-RESULT-B',token(a))
 assert.equal(r.status,404,JSON.stringify(r))
})
test('assigned teacher may read historical result but cannot rewrite non-authored result',{timeout:12000},async()=>{
 const a=(await scoped(900001,999001,()=>query("SELECT id FROM users WHERE email='core-security-a@example.invalid'"))).rows[0]
 await scoped(900001,a.id,async()=>{
  const client=await pool.connect()
  try {
   const readable=await client.query("SELECT id,status FROM assessment_result_records WHERE result_id='CORE-P6-RESULT-A'")
   assert.equal(readable.rowCount,1,'Assigned teacher must read result through signed policy')
   const revision=await client.query('SELECT count(*)::int AS n FROM assessment_result_revisions WHERE result_record_id=$1',[readable.rows[0].id])
   assert.equal(revision.rows[0].n,1,'Historical revision is visible only through authorized parent')
   const attempt=await client.query("UPDATE assessment_result_records SET status='IN_PROGRESS' WHERE id=$1 RETURNING id",[readable.rows[0].id])
   assert.equal(attempt.rowCount,0,'Signed assigned teacher is not the historical result author')
   const rev=await client.query('SELECT id FROM assessment_result_revisions WHERE result_record_id=$1 LIMIT 1',[readable.rows[0].id])
   assert.equal(rev.rowCount,1)
   const revUpdate=await client.query("UPDATE assessment_result_revisions SET revision_reason='not authorized' WHERE id=$1 RETURNING id",[rev.rows[0].id])
   assert.equal(revUpdate.rowCount,0,'Revision mutation must remain author-bound')
   const revDelete=await client.query('DELETE FROM assessment_result_revisions WHERE id=$1 RETURNING id',[rev.rows[0].id])
   assert.equal(revDelete.rowCount,0,'Revision deletion must remain author-bound')
  } finally {
   await client.release()
  }
 },true)
})

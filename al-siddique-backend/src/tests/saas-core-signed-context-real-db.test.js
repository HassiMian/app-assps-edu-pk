'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {Pool}=require('pg')
const {applySignedTenantContext,signedTenantEnvelope}=require('../services/security/coreSignedTenantContext')
for(const [key,value] of Object.entries({
 DB_HOST:'127.0.0.1',DB_PORT:'55432',DB_NAME:'assps_core_signed_p7_20261008',
 DB_USER:'assps_core_test_login',CORE_SIGNED_TEST_MODE:'phase7-isolated-only'
}))assert.equal(process.env[key],value)
const secret=String(process.env.CORE_SIGNED_TEST_KEY||'')
assert.match(secret,/^[a-f0-9]{64}$/)
const pool=new Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),
  database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,max:2})
test.after(async()=>pool.end())
const count=async client=>Number((await client.query(
  "SELECT count(*)::int AS n FROM students WHERE gr_number='CORE-RLS-SYN-B'")).rows[0].n)
const scoped=async(fn)=>{
 const c=await pool.connect()
 try{
  await c.query('BEGIN')
  await c.query('SET LOCAL ROLE apex_app_runtime')
  await applySignedTenantContext(c,{tenantId:900001,actorId:999001,secret,expectedLogin:'assps_core_test_login'})
  await fn(c)
  await c.query('ROLLBACK')
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}
 finally{c.release()}
}
test('signed context permits scoped school A records and denies B',async()=>{
 await scoped(async c=>{
  const n=Number((await c.query("SELECT count(*)::int AS n FROM students WHERE gr_number='CORE-RLS-SYN-A'")).rows[0].n)
  assert.equal(n,1)
  assert.equal(await count(c),0)
 })
})
test('tampering SQL session tenant setting cannot manufacture a school B signature',async()=>{
 await scoped(async c=>{
  await c.query("SELECT set_config('app.tenant_id','900002',true)")
  assert.equal(await count(c),0)
 })
})
test('a forged superadmin setting cannot bypass signed school guard',async()=>{
 await scoped(async c=>{
  await c.query("SELECT set_config('app.is_super_admin','true',true)")
  assert.equal(await count(c),0)
 })
})
test('removing HMAC signature or changing actor ID closes access',async()=>{
 await scoped(async c=>{
  await c.query("SELECT set_config('app.core_sig','',true)")
  assert.equal(Number((await c.query("SELECT count(*)::int AS n FROM students")).rows[0].n),0)
 })
 await scoped(async c=>{
  await c.query("SELECT set_config('app.core_actor_id','999999',true)")
  assert.equal(Number((await c.query("SELECT count(*)::int AS n FROM students")).rows[0].n),0)
 })
})
test('replaying valid signed settings into a different transaction cannot access rows',async()=>{
 let old={}
 await scoped(async c=>{
  old=(await c.query("SELECT current_setting('app.core_sig') sig,current_setting('app.core_sig_exp') exp,current_setting('app.core_sig_nonce') nonce")).rows[0]
 })
 const c=await pool.connect()
 try {
  await c.query('BEGIN')
  await c.query('SET LOCAL ROLE apex_app_runtime')
  await c.query("SELECT set_config('app.rls_enabled','true',true),set_config('app.is_super_admin','false',true),set_config('app.tenant_id','900001',true),set_config('app.core_actor_id','999001',true)")
  await c.query("SELECT set_config('app.core_sig',$1,true),set_config('app.core_sig_exp',$2,true),set_config('app.core_sig_nonce',$3,true)",[old.sig,old.exp,old.nonce])
  const n=Number((await c.query("SELECT count(*)::int AS n FROM students")).rows[0].n)
  assert.equal(n,0)
  await c.query('ROLLBACK')
 }finally{c.release()}
})
test('restricted database role cannot read the protected signing secret',async()=>{
 await scoped(async c=>{
  await assert.rejects(c.query('SELECT secret FROM core_security.signing_key'),/permission denied/)
 })
})
test('database login and context inputs fail closed',async()=>{
 assert.throws(()=>signedTenantEnvelope({tenantId:900001,actorId:0,loginRole:'assps_core_test_login',transactionId:1,secret}),/trusted positive IDs/)
 const c=await pool.connect()
 try{
  await c.query('BEGIN');await c.query('SET LOCAL ROLE apex_app_runtime')
  await assert.rejects(
   applySignedTenantContext(c,{tenantId:900001,actorId:999001,secret,expectedLogin:'not_the_login'}),
   /database login mismatch/)
  await c.query('ROLLBACK')
 }finally{c.release()}
})
test('restricted login cannot elevate to the old BYPASSRLS database role',async()=>{
 const c=await pool.connect()
 try {
  await assert.rejects(c.query('SET ROLE apexos_user'),/permission denied|not permitted/)
  const identity=(await c.query('SELECT current_user AS u')).rows[0]
  assert.equal(identity.u,'assps_core_test_login')
 } finally {c.release()}
})
test('manual restricted-role connection without a signed transaction cannot read protected rows',async()=>{
 const c=await pool.connect()
 try{
  await c.query('BEGIN')
  await c.query('SET LOCAL ROLE apex_app_runtime')
  await c.query("SELECT set_config('app.rls_enabled','true',true),set_config('app.is_super_admin','false',true),set_config('app.tenant_id','900001',true)")
  const rows=(await c.query('SELECT count(*)::int AS n FROM students')).rows[0].n
  assert.equal(rows,0)
  await c.query('ROLLBACK')
 }finally{c.release()}
})
test('unsafe signed-gate startup configuration is explicitly rejected',()=>{
 const {spawnSync}=require('node:child_process')
 const out=spawnSync(process.execPath,['-e',"require('./src/config/database')"],{
  cwd:require('node:path').resolve(__dirname,'../..'),
  env:{...process.env,DB_SIGNED_TENANT_RLS_ENABLED:'true',
   DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'false',DB_STARTUP_PROBE:'false',
   NODE_PATH:process.env.NODE_PATH||'/var/www/apex-backend/node_modules'},
  encoding:'utf8',timeout:4500
 })
 assert.notEqual(out.status,0)
 assert.match(out.stderr,/DB_SIGNED_TENANT_DEPENDENCY_REQUIRED/)
})
test('tenant-key-only finance policy verifies signed canonical key, not mutable GUC',async()=>{
 const c=await pool.connect()
 try{
  await c.query('BEGIN')
  await c.query('SET LOCAL ROLE apex_app_runtime')
  await applySignedTenantContext(c,{tenantId:900001,tenantKey:'synthetic-core-a',
    actorId:999001,secret,expectedLogin:'assps_core_test_login'})
  let result=(await c.query("SELECT core_security.signed_tenant_key_allowed('synthetic-core-a') AS a,core_security.signed_tenant_key_allowed('synthetic-core-b') AS b")).rows[0]
  assert.equal(result.a,true)
  assert.equal(result.b,false)
  await c.query("SELECT set_config('app.tenant_key','synthetic-core-b',true)")
  result=(await c.query("SELECT core_security.signed_tenant_key_allowed('synthetic-core-b') AS b,core_security.signed_school_allowed(900001) AS a")).rows[0]
  assert.equal(result.b,false)
  assert.equal(result.a,false)
  await c.query('ROLLBACK')
 }finally{c.release()}
})
test('all 77 FORCE-RLS public relations have the signed core restrictive policy',async()=>{
 const c=await pool.connect()
 try{
  const r=await c.query(`
  SELECT (SELECT count(*)::int FROM pg_class WHERE relkind='r'
     AND relnamespace='public'::regnamespace AND relforcerowsecurity) AS forced,
   (SELECT count(*)::int FROM pg_policies WHERE schemaname='public'
     AND policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE') AS signed`)
  assert.deepEqual(r.rows,[{forced:77,signed:77}])
 }finally{c.release()}
})
test('incorrect signing material cannot authorize protected synthetic rows',async()=>{
 const c=await pool.connect()
 try{
  await c.query('BEGIN');await c.query('SET LOCAL ROLE apex_app_runtime')
  await applySignedTenantContext(c,{tenantId:900001,actorId:999001,
    secret:'incorrect-test-material-not-a-production-secret',expectedLogin:'assps_core_test_login'})
  assert.equal(Number((await c.query('SELECT count(*)::int AS n FROM students')).rows[0].n),0)
  await c.query('ROLLBACK')
 }finally{c.release()}
})

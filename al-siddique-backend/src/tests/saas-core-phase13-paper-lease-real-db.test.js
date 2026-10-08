'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
for(const [key,val] of Object.entries({
 DB_HOST:'127.0.0.1',DB_PORT:'55432',DB_NAME:'assps_archv1_rls_corep9_20261008',
 DB_USER:'assps_core_test_login',DB_RUNTIME_ROLE:'apex_app_runtime',
 DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'true',DB_AUTH_USE_SIGNED_TENANT_CONTEXT:'true',
 DB_SIGNED_TENANT_RLS_ENABLED:'true',PAPER_RESTRICTED_DB_ENABLED:'true',
 PAPER_RESTRICTED_DB_USER:'assps_core_paper_p9'
}))assert.equal(process.env[key],val,'No production test: '+key)
assert.match(process.env.DB_SIGNED_TENANT_HMAC_KEY||'',/^[0-9a-f]{64}$/)
assert.equal(process.env.PAPER_RESTRICTED_SIGNING_KEY,process.env.DB_SIGNED_TENANT_HMAC_KEY)
process.env.DB_STARTUP_PROBE='false'
const {pool,query,tenantContext}=require('../config/database')
const withCore=(school,fn)=>tenantContext.run({
 rlsEnabled:true,isSuperAdmin:false,tenantId:school,
 tenantKey:school===900001?'synthetic-core-a':'synthetic-core-b',actorId:999001
},fn)
const withPaper=(school,actor,fn)=>tenantContext.run({
 rlsEnabled:true,isSuperAdmin:false,tenantId:school,
 tenantKey:school===900001?'synthetic-core-a':'synthetic-core-b',
 actorId:actor,paperRestricted:true,paperActorId:actor,paperActorRole:'teacher'
},fn)
test.after(async()=>pool.end())
test('real Paper PG transaction abort: rollback safely preserves signed isolation before client reuse',{timeout:15000},async()=>{
 const a=(await withCore(900001,()=>query("SELECT id FROM users WHERE email='core-security-a@example.invalid'"))).rows[0]
 const b=(await withCore(900002,()=>query("SELECT id FROM users WHERE email='core-security-b@example.invalid'"))).rows[0]
 assert.ok(a?.id&&b?.id)
 let aPid
 await withPaper(900001,a.id,async()=>{
  const c=await pool.connect()
  try {
   const id=(await c.query('SELECT pg_backend_pid() AS pid,current_user AS role')).rows[0]
   aPid=Number(id.pid);assert.equal(id.role,'apex_paper_runtime')
   assert.equal((await c.query('SELECT count(*)::int AS n FROM paper_vault WHERE school_id=900001')).rows[0].n,1)
   assert.equal((await c.query('SELECT count(*)::int AS n FROM paper_vault WHERE school_id=900002')).rows[0].n,0)
   await assert.rejects(c.query('SELECT 1/0'),e=>e.code==='22012')
  } finally {await c.release()}
 })
 await withPaper(900002,b.id,async()=>{
  const c=await pool.connect()
  try {
   const now=(await c.query('SELECT pg_backend_pid() AS pid,current_user AS role')).rows[0]
   assert.equal(Number(now.pid),aPid,'clean ROLLBACK may reuse physical login')
   assert.equal(now.role,'apex_paper_runtime')
   const visible=(await c.query('SELECT school_id,name FROM paper_vault')).rows
   assert.ok(visible.length>=1)
   assert.ok(visible.every(row=>Number(row.school_id)===900002),'no school A papers after signed role reset')
   await c.query('COMMIT')
  }finally{await c.release()}
 })
})

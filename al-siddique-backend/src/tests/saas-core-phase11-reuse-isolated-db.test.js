'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const env={
 DB_HOST:'127.0.0.1',DB_PORT:'55432',DB_NAME:'assps_core_signed_p7_20261008',
 DB_USER:'assps_core_test_login',DB_RUNTIME_ROLE:'apex_app_runtime',
 DB_SIGNED_TENANT_RLS_ENABLED:'true',DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'true',
 DB_AUTH_USE_SIGNED_TENANT_CONTEXT:'true',PAPER_RESTRICTED_DB_ENABLED:'false'
}
for(const [k,v] of Object.entries(env))assert.equal(process.env[k],v,'Phase11 is disposable-only: '+k)
assert.match(process.env.DB_SIGNED_TENANT_HMAC_KEY||'',/^[a-f0-9]{64}$/)
process.env.NODE_ENV='test'
process.env.DB_STARTUP_PROBE='false'
const {pool,tenantContext,applyTenantContext}=require('../config/database')
test.after(async()=>{await pool.end()})
const withContext=(school,fn)=>tenantContext.run({
 rlsEnabled:true,isSuperAdmin:false,tenantId:school,
 tenantKey:school===900001?'synthetic-core-a':'synthetic-core-b',actorId:999001
},fn)
test('an aborted transaction evicts the poisoned PG session instead of retaining previous tenant role',async()=>{
 let oldPid
 await withContext(900001,async()=>{
  const c=await pool.connect()
  try{
   oldPid=Number((await c.query('SELECT pg_backend_pid() AS pid')).rows[0].pid)
   await c.query('BEGIN')
   await applyTenantContext(c)
   await assert.rejects(c.query('SELECT 1/0'),e=>e.code==='22012')
  } finally {await c.release()}
 })
 assert.equal(pool.idleCount,0,'failed cleanup must NOT mark broken connection reusable')
 await withContext(900002,async()=>{
  const c=await pool.connect()
  try {
   const r=(await c.query('SELECT pg_backend_pid() AS pid,current_user AS role,current_setting($1,true) AS tenant',['app.tenant_id'])).rows[0]
   assert.notEqual(Number(r.pid),oldPid,'backend PID must differ from disposed dirty connection')
   assert.equal(r.role,'apex_app_runtime')
   assert.equal(r.tenant,'900002')
   await c.query('BEGIN')
   await applyTenantContext(c)
   const visible=(await c.query("SELECT gr_number FROM students WHERE gr_number IN ('CORE-RLS-SYN-A','CORE-RLS-SYN-B') ORDER BY gr_number")).rows.map(x=>x.gr_number)
   assert.deepEqual(visible,['CORE-RLS-SYN-B'])
   await c.query('ROLLBACK')
  } finally {await c.release()}
 })
})
test('a normally reset client can be reused for another tenant without leaking the previous school',async()=>{
 let oldPid
 await withContext(900001,async()=>{
  const c=await pool.connect()
  try{
   oldPid=Number((await c.query('SELECT pg_backend_pid() AS pid')).rows[0].pid)
   await c.query('BEGIN')
   await applyTenantContext(c)
   const rows=(await c.query("SELECT gr_number FROM students WHERE gr_number IN ('CORE-RLS-SYN-A','CORE-RLS-SYN-B')")).rows.map(x=>x.gr_number)
   assert.deepEqual(rows,['CORE-RLS-SYN-A'])
   await c.query('ROLLBACK')
  }finally{await c.release()}
 })
 assert.ok(pool.idleCount>=1)
 await withContext(900002,async()=>{
  const c=await pool.connect()
  try{
   assert.equal(Number((await c.query('SELECT pg_backend_pid() AS pid')).rows[0].pid),oldPid,
    'PG pool should reuse the clean connection')
   await c.query('BEGIN')
   await applyTenantContext(c)
   const rows=(await c.query("SELECT gr_number FROM students WHERE gr_number IN ('CORE-RLS-SYN-A','CORE-RLS-SYN-B')")).rows.map(x=>x.gr_number)
   assert.deepEqual(rows,['CORE-RLS-SYN-B'])
   await c.query('ROLLBACK')
  }finally{await c.release()}
 })
})

'use strict'
const {test,after}=require('node:test')
const assert=require('node:assert/strict')
for(const [key,val] of Object.entries({
 DB_HOST:'127.0.0.1',DB_PORT:'55432',DB_NAME:'assps_core_signed_p7_20261008',
 DB_USER:'assps_core_test_login',DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'true',
 DB_RUNTIME_ROLE:'apex_app_runtime',DB_SIGNED_TENANT_RLS_ENABLED:'true',
 PAPER_RESTRICTED_DB_ENABLED:'false'
}))assert.equal(process.env[key],val,'isolated clone is required: '+key)
assert.match(process.env.DB_SIGNED_TENANT_HMAC_KEY||'',/^[a-f0-9]{64}$/)
process.env.DB_STARTUP_PROBE='false'
const {query,pool,tenantContext}=require('../config/database')
const ctx=(school)=>({rlsEnabled:true,isSuperAdmin:false,tenantId:school,actorId:999001,tenantKey:school==900001?'synthetic-core-a':'synthetic-core-b'})
after(async()=>pool.end())
test('real signed non-BYPASS PostgreSQL login: malformed school identifiers cannot run protected SQL',async()=>{
 const bad=['900001suffix','900001.5','9e5',1.5,Number.MAX_SAFE_INTEGER+1]
 for(const tenantId of bad){
  await assert.rejects(tenantContext.run(ctx(tenantId),()=>query('SELECT count(*) FROM students')),{code:'TENANT_CONTEXT_REQUIRED'})
 }
 for(const isSuperAdmin of ['false','true',1]){
  await assert.rejects(tenantContext.run({...ctx(900001),isSuperAdmin},()=>query('SELECT count(*) FROM students')),{code:'DB_SUPERADMIN_SCOPE_INVALID'})
 }
 for(const rlsEnabled of ['false','true',1]){
  await assert.rejects(tenantContext.run({...ctx(900001),rlsEnabled},()=>query('SELECT count(*) FROM students')),{code:'DB_RLS_FLAG_INVALID'})
 }
})
test('valid signed numeric/string scopes still enforce independent two-school RLS on real PostgreSQL',async()=>{
 const selection="SELECT gr_number FROM students WHERE gr_number IN ('CORE-RLS-SYN-A','CORE-RLS-SYN-B') ORDER BY gr_number"
 const a=await tenantContext.run(ctx('900001'),()=>query(selection))
 assert.deepEqual(a.rows.map(x=>x.gr_number),['CORE-RLS-SYN-A'])
 const b=await tenantContext.run(ctx(900002),()=>query(selection))
 assert.deepEqual(b.rows.map(x=>x.gr_number),['CORE-RLS-SYN-B'])
})

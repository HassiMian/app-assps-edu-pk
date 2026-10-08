'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
process.env.NODE_ENV='test'
process.env.DB_STARTUP_PROBE='false'
process.env.DB_RUNTIME_ROLE='apex_app_runtime'
const {tenantContext,__test}=require('../config/database')
assert.ok(__test,'Controlled test-only security session helper is required')
const ctx={rlsEnabled:true,tenantId:900001,tenantKey:'phase11-synthetic',actorId:991001,isSuperAdmin:false}
function clientFor(resetFailure='') {
 const log=[],releases=[]
 return {
  log,releases,
  async query(sql) {
   log.push(String(sql))
   if((resetFailure==='guc'&&String(sql).includes("set_config('app.rls_enabled', 'false'")) ||
      (resetFailure==='role'&&sql==='RESET ROLE')) throw Object.assign(new Error('synthetic reset failed'),{code:'25P02'})
   return {rows:[]}
  },
  release(error){releases.push(error)}
 }
}
test('a fully reset synthetic session returns to pool without error and releases once',async()=>{
 const c=clientFor()
 await tenantContext.run(ctx,()=>__test.prepareRuntimeClient(c))
 await c.release()
 await c.release()
 assert.equal(c.releases.length,1)
 assert.equal(c.releases[0],undefined)
 assert.equal(c.log.filter(x=>x==='RESET ROLE').length,1)
})
for(const failure of ['guc','role']){
 test('a failed '+failure+' reset MUST evict pooled client instead of reusing dirty tenant state',async()=>{
  const c=clientFor(failure)
  await tenantContext.run(ctx,()=>__test.prepareRuntimeClient(c))
  await c.release()
  assert.equal(c.releases.length,1)
  assert.ok(c.releases[0] instanceof Error,'node-postgres release(error) destroys unsafe connection')
  assert.equal(c.releases[0].code,'DB_RUNTIME_SESSION_RESET_FAILED')
 })
}
test('authorization error passed into release always discards the connection',async()=>{
 const c=clientFor()
 await tenantContext.run(ctx,()=>__test.prepareRuntimeClient(c))
 const forbidden=Object.assign(new Error('synthetic unauthorized DB role'),{code:'DB_RUNTIME_ROLE_UNSAFE'})
 await c.release(forbidden)
 assert.equal(c.releases[0],forbidden)
})

'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
process.env.DB_STARTUP_PROBE='false'
process.env.DB_SIGNED_TENANT_RLS_ENABLED='true'
process.env.DB_ENFORCE_LEAST_PRIVILEGE_LOGIN='true'
process.env.DB_AUTH_USE_SIGNED_TENANT_CONTEXT='true'
process.env.DB_SIGNED_TENANT_HMAC_KEY='isolated-unit-only-signing-key-not-live-credentials'
const {applyTenantContext,tenantContext}=require('../config/database')
const client={query:async()=>{throw new Error('NO_SQL_EXPECTED')}}
test('signed RLS explicitly refuses missing AsyncLocalStorage school/actor rather than returning false',async()=>{
 await assert.rejects(applyTenantContext(client),e=>e.code==='DB_SIGNED_TENANT_SCOPE_REQUIRED')
})
test('signed RLS refuses unscoped or superadmin context before sending SQL',async()=>{
 for(const ctx of [{rlsEnabled:false,tenantId:900001,actorId:9},{rlsEnabled:true,tenantId:900001,actorId:9,isSuperAdmin:true},{rlsEnabled:true,tenantId:900001,actorId:null,isSuperAdmin:false}]){
  await assert.rejects(tenantContext.run(ctx,()=>applyTenantContext(client)),e=>e.code==='DB_SIGNED_TENANT_SCOPE_REQUIRED')
 }
})

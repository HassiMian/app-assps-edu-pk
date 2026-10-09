'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
process.env.DB_STARTUP_PROBE='false'
const {normalizedRuntimeContext,applyTenantContext,tenantContext,pool}=require('../config/database')
const school={rlsEnabled:true,isSuperAdmin:false,tenantId:900001,tenantKey:'synthetic'}
test('normal school numeric and canonical decimal string remain equivalent',()=>{
 assert.equal(normalizedRuntimeContext(school).tenantId,'900001')
 assert.equal(normalizedRuntimeContext({...school,tenantId:'900001'}).tenantId,'900001')
})
test('string false is never elevated into super-admin scope',async()=>{
 const ctx={...school,isSuperAdmin:'false'}
 assert.throws(()=>normalizedRuntimeContext(ctx),{code:'DB_SUPERADMIN_SCOPE_INVALID'})
 const calls=[]
 await assert.rejects(tenantContext.run(ctx,()=>applyTenantContext({query:async(...args)=>{calls.push(args);return {rows:[]}}})),{code:'DB_SUPERADMIN_SCOPE_INVALID'})
 assert.equal(calls.length,0,'must reject before setting GUCs')
})
test('nonnumeric and numeric-prefix school identifiers fail closed before SQL',async()=>{
 const inputs=['900001suffix','900001.5','9e5',' 900001suffix',Infinity,NaN,1.5,Number.MAX_SAFE_INTEGER+1,'-900001','0','',null,undefined]
 for(const tenantId of inputs){
  const ctx={...school,tenantId}
  assert.throws(()=>normalizedRuntimeContext(ctx),{code:'TENANT_CONTEXT_REQUIRED'},String(tenantId))
  const calls=[]
  await assert.rejects(tenantContext.run(ctx,()=>applyTenantContext({query:async(...args)=>{calls.push(args);return {rows:[]}}})),{code:'TENANT_CONTEXT_REQUIRED'})
  assert.equal(calls.length,0,'bad scope must never reach SQL for '+String(tenantId))
 }
})
test('malformed RLS-enabled values do not silently downgrade to unauthenticated raw pool',()=>{
 for(const rlsEnabled of ['false','true',1,{},[]]){
  assert.throws(()=>normalizedRuntimeContext({...school,rlsEnabled}),{code:'DB_RLS_FLAG_INVALID'})
 }
 assert.equal(normalizedRuntimeContext({...school,rlsEnabled:false}),null)
})
test('malformed truthy super-admin flags cannot silently change tenant binding',()=>{
 for(const isSuperAdmin of ['true',1,{},[],new Boolean(false)]){
  assert.throws(()=>normalizedRuntimeContext({...school,isSuperAdmin}),{code:'DB_SUPERADMIN_SCOPE_INVALID'})
 }
 assert.deepEqual(normalizedRuntimeContext({...school,isSuperAdmin:true}),{isSuperAdmin:true,tenantId:'',tenantKey:''})
})
test.after(async()=>pool.end())

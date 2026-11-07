'use strict'
// Evaluate actual reviewed database.js with an inert pg.Pool; no real database connection.
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const path=require('node:path')
const {AsyncLocalStorage}=require('node:async_hooks')
const crypto=require('node:crypto')
const file=path.resolve(__dirname,'../../../al-siddique-backend/src/config/database.js')
const source=fs.readFileSync(file,'utf8')
function fixture(extra={}){
 const env={NODE_ENV:'test',DB_STARTUP_PROBE:'false',DB_USER:'synthetic_runtime_user',
  DB_SIGNED_TENANT_RLS_ENABLED:'false',PAPER_RESTRICTED_DB_ENABLED:'false',...extra}
 let creates=0,networks=0
 class FakePool{
  constructor(){creates++}
  connect(){networks++;throw Error('No DB sockets')}
  query(){networks++;throw Error('No DB queries')}
  on(){}
 }
 const context={module:{exports:{}},exports:{},
  require(name){
   if(name==='dotenv')return {config:()=>({})}
   if(name==='pg')return {Pool:FakePool}
   if(name==='async_hooks')return {AsyncLocalStorage}
   if(name==='node:crypto')return crypto
   if(name==='../services/security/coreSignedTenantContext')return {
    applySignedTenantContext:async()=>{throw Error('No real signed context')}}
   throw Error('Unexpected import '+name)
  },
  process:{env},__dirname:path.dirname(file),
  console:{log(){},warn(){},error(){}},Buffer,Date,
  setTimeout:()=>{throw Error('No timers')},clearTimeout(){}}
 context.exports=context.module.exports
 vm.runInNewContext(source,context,{timeout:1200,filename:file})
 return {db:context.module.exports,stats:()=>({creates,networks}),env}
}
function signedPaper(){
 return {
  PAPER_RESTRICTED_DB_ENABLED:'true',DB_SIGNED_TENANT_RLS_ENABLED:'true',
  DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'true',DB_AUTH_USE_SIGNED_TENANT_CONTEXT:'true',
  DB_SIGNED_TENANT_HMAC_KEY:'a'.repeat(64),
  PAPER_RESTRICTED_DB_USER:'isolated_paper_login',
  PAPER_RESTRICTED_DB_PASSWORD:'synthetic-only-nonsecret'
 }
}
test('module import creates inert pool without connecting',()=>{
 const x=fixture();assert.ok(x.stats().creates>=1);assert.equal(x.stats().networks,0)
})
test('query/pool/tenantContext APIs remain exported',()=>{
 const {db}=fixture()
 for(const name of ['pool','query','tenantContext','applyTenantContext','normalizedRuntimeContext',
   'rejectUnscopedProtectedSql','configuredRuntimeRole'])
   assert.ok(db[name],name)
})
test('no context yields no elevated RLS',()=>assert.equal(fixture().db.normalizedRuntimeContext(),null))
test('explicit false RLS returns no elevated context',()=>assert.equal(fixture().db.normalizedRuntimeContext({rlsEnabled:false}),null))
test('string false RLS is rejected',()=>{
 assert.throws(()=>fixture().db.normalizedRuntimeContext({rlsEnabled:'false',tenantId:1}),
  e=>e.code==='DB_RLS_FLAG_INVALID')
})
test('string true RLS is rejected',()=>{
 assert.throws(()=>fixture().db.normalizedRuntimeContext({rlsEnabled:'true',tenantId:1}),
  e=>e.code==='DB_RLS_FLAG_INVALID')
})
test('string superadmin false cannot be treated as trusted boolean',()=>{
 assert.throws(()=>fixture().db.normalizedRuntimeContext({rlsEnabled:true,isSuperAdmin:'false',tenantId:1}),
  e=>e.code==='DB_SUPERADMIN_SCOPE_INVALID')
})
test('string superadmin true cannot grant broad access',()=>{
 assert.throws(()=>fixture().db.normalizedRuntimeContext({rlsEnabled:true,isSuperAdmin:'true',tenantId:1}),
  e=>e.code==='DB_SUPERADMIN_SCOPE_INVALID')
})
test('negative school id rejected',()=>{
 assert.throws(()=>fixture().db.normalizedRuntimeContext({rlsEnabled:true,tenantId:-1}),
  e=>e.code==='TENANT_CONTEXT_REQUIRED')
})
test('zero school id rejected',()=>{
 assert.throws(()=>fixture().db.normalizedRuntimeContext({rlsEnabled:true,tenantId:0}),
  e=>e.code==='TENANT_CONTEXT_REQUIRED')
})
test('trailing school text rejected',()=>{
 assert.throws(()=>fixture().db.normalizedRuntimeContext({rlsEnabled:true,tenantId:'1foobar'}),
  e=>e.code==='TENANT_CONTEXT_REQUIRED')
})
test('scientific notation school id rejected',()=>{
 assert.throws(()=>fixture().db.normalizedRuntimeContext({rlsEnabled:true,tenantId:'1e3'}),
  e=>e.code==='TENANT_CONTEXT_REQUIRED')
})
test('fractional school id rejected',()=>{
 assert.throws(()=>fixture().db.normalizedRuntimeContext({rlsEnabled:true,tenantId:1.5}),
  e=>e.code==='TENANT_CONTEXT_REQUIRED')
})
test('unsafe integer school id rejected',()=>{
 assert.throws(()=>fixture().db.normalizedRuntimeContext({rlsEnabled:true,tenantId:Number.MAX_SAFE_INTEGER+1}),
  e=>e.code==='TENANT_CONTEXT_REQUIRED')
})
test('valid signed scoped tenant id accepted',()=>{
 const x=fixture().db.normalizedRuntimeContext({rlsEnabled:true,isSuperAdmin:false,tenantId:'12',tenantKey:'test'})
 assert.equal(x.isSuperAdmin,false);assert.equal(x.tenantId,'12');assert.equal(x.tenantKey,'test')
})
test('trusted boolean superadmin is explicit',()=>{
 const x=fixture().db.normalizedRuntimeContext({rlsEnabled:true,isSuperAdmin:true})
 assert.equal(x.isSuperAdmin,true);assert.equal(x.tenantId,'')
})
test('invalid dynamic runtime PostgreSQL role rejected',()=>{
 assert.throws(()=>fixture({DB_RUNTIME_ROLE:'postgres;drop'}).db.configuredRuntimeRole(),
   e=>e.code==='DB_RUNTIME_ROLE_INVALID')
})
test('valid role identifier accepted',()=>{
 assert.equal(fixture({DB_RUNTIME_ROLE:'apexos_user'}).db.configuredRuntimeRole(),'apexos_user')
})
test('no runtime role configured returns null',()=>{
 assert.equal(fixture().db.configuredRuntimeRole(),null)
})
test('restricted paper mode refuses unsigned startup',()=>{
 assert.throws(()=>fixture({PAPER_RESTRICTED_DB_ENABLED:'true'}),/PAPER_RESTRICTED_CORE_SIGNED_DEPENDENCIES_REQUIRED/)
})
test('signed tenant startup refuses absent HMAC key',()=>{
 assert.throws(()=>fixture({DB_SIGNED_TENANT_RLS_ENABLED:'true'}),/DB_SIGNED_TENANT_DEPENDENCY_REQUIRED/)
})
test('restricted paper mode refuses identical runtime DB login',()=>{
 assert.throws(()=>fixture({...signedPaper(),PAPER_RESTRICTED_DB_USER:'synthetic_runtime_user'}),/PAPER_RESTRICTED_DB_CONFIG_REQUIRED/)
})
test('restricted paper mode refuses postgres DB login',()=>{
 assert.throws(()=>fixture({...signedPaper(),PAPER_RESTRICTED_DB_USER:'postgres'}),/PAPER_RESTRICTED_DB_CONFIG_REQUIRED/)
})
test('restricted paper mode requires nonempty distinct password',()=>{
 assert.throws(()=>fixture({...signedPaper(),PAPER_RESTRICTED_DB_PASSWORD:''}),/PAPER_RESTRICTED_DB_CONFIG_REQUIRED/)
})
test('restricted paper mode separate fake pool still never connects at module import',()=>{
 const x=fixture(signedPaper());assert.equal(x.stats().creates,2);assert.equal(x.stats().networks,0)
})
test('restricted mode rejects unscope paper_vault select',()=>{
 const {db}=fixture(signedPaper())
 assert.throws(()=>db.rejectUnscopedProtectedSql('SELECT * FROM paper_vault'),
  e=>e.code==='PAPER_RESTRICTED_SCOPE_REQUIRED')
})
test('restricted mode rejects unscope question_bank writes',()=>{
 const {db}=fixture(signedPaper())
 assert.throws(()=>db.rejectUnscopedProtectedSql('INSERT INTO question_bank VALUES (1)'),
  e=>e.code==='PAPER_RESTRICTED_SCOPE_REQUIRED')
})
test('restricted mode rejects unscope teacher assignment SQL',()=>{
 const {db}=fixture(signedPaper())
 assert.throws(()=>db.rejectUnscopedProtectedSql('UPDATE teacher_class_assignments SET is_active=false'),
  e=>e.code==='PAPER_RESTRICTED_SCOPE_REQUIRED')
})
test('restricted mode accepts safe unprotected SQL statement',()=>{
 assert.doesNotThrow(()=>fixture(signedPaper()).db.rejectUnscopedProtectedSql('SELECT 1'))
})
test('unscoped paper protection also works for query config object text',()=>{
 assert.throws(()=>fixture(signedPaper()).db.rejectUnscopedProtectedSql({text:'SELECT * FROM saved_papers'}),
  e=>e.code==='PAPER_RESTRICTED_SCOPE_REQUIRED')
})
test('paper restricted context status false outside async context',()=>{
 assert.equal(fixture(signedPaper()).db.isRestrictedPaperRequest(),false)
})
test('trusted restricted async context bypasses last-resort guard only inside verified lease',()=>{
 const {db}=fixture(signedPaper())
 db.tenantContext.run({paperRestricted:true},()=>{
  assert.equal(db.isRestrictedPaperRequest(),true)
  assert.doesNotThrow(()=>db.rejectUnscopedProtectedSql('SELECT * FROM paper_vault'))
 })
 assert.equal(db.isRestrictedPaperRequest(),false)
})
test('standard mode does not accidentally turn on restricted paper scope',()=>{
 const {db}=fixture()
 assert.doesNotThrow(()=>db.rejectUnscopedProtectedSql('SELECT * FROM paper_vault'))
 assert.equal(db.isRestrictedPaperRequest(),false)
})
test('any schema identity over 12 digits fails signed envelope (independent guard)',()=>{
 const {signedTenantEnvelope}=require(path.resolve(__dirname,'../../../al-siddique-backend/src/services/security/coreSignedTenantContext.js'))
 assert.throws(()=>signedTenantEnvelope({tenantId:'1234567890123',actorId:41,loginRole:'apexos_user',transactionId:'4',secret:'z'.repeat(48)}))
})

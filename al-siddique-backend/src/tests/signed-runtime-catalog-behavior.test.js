'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const code=fs.readFileSync(path.join(__dirname,'../config/database.js'),'utf8')
const start=code.indexOf('async function connectForContext() {')
const end=code.indexOf('// Expose a pool-compatible facade.',start)
assert.ok(start>=0 && end>start)
// Evaluate the actual production function in an isolated dependency-injected VM.
const functionSource=code.slice(start,end)
async function runGate(state){
 const observed={sql:[],released:[],prepared:0}
 const mock={query:async sql=>{
   observed.sql.push(sql)
   if(sql.includes('pg_policies'))return {rows:[state]}
   return {rows:[{login_name:'assps_core_test_login',rolsuper:false,rolbypassrls:false}]}
 },release:async error=>observed.released.push(error?.code||null)}
 const scope={signedTenantGate:true,isRestrictedPaperRequest:()=>false,rawPool:{connect:async()=>mock},configuredRuntimeRole:()=> 'apex_app_runtime',process:{env:{DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'true'}},prepareRuntimeClient:async()=>{observed.prepared++;return mock},normalizedRuntimeContext:()=>null,Error}
 const connect=vm.runInNewContext(`${functionSource}\nconnectForContext`,scope)
 try{await connect();observed.success=true}catch(err){observed.error=err.code}
 return observed
}
test('signed runtime rejects 11/77 enabled clone before preparing tenant context',async()=>{
 const r=await runGate({forced:77,enabled:11,signed:77})
 assert.equal(r.error,'DB_SIGNED_RLS_CATALOG_INCOMPLETE')
 assert.equal(r.prepared,0)
 assert.deepEqual(r.released,['DB_SIGNED_RLS_CATALOG_INCOMPLETE'])
})
test('signed runtime proceeds only after 77/77 enabled, force and signed restrictive guards',async()=>{
 const r=await runGate({forced:77,enabled:77,signed:77})
 assert.equal(r.success,true)
 assert.equal(r.prepared,1)
 assert.deepEqual(r.released,[])
})
test('signed runtime rejects missing restrictive policy before tenant context',async()=>{
 const r=await runGate({forced:77,enabled:77,signed:76})
 assert.equal(r.error,'DB_SIGNED_RLS_CATALOG_INCOMPLETE')
 assert.equal(r.prepared,0)
})

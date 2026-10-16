'use strict'
// Source-executed security regression with an in-memory PostgreSQL client.
// Does not connect to or alter any real database, role, credential or account.
const test=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const path=require('node:path')
const child=require('node:child_process')
const original=path.resolve(__dirname,'../../../../assps-core-signed-runtime-livebase-20261010/al-siddique-backend/src/config/database.js')
const updated=path.resolve(__dirname,'../config/database.js')
const stub=`
'use strict';
const Module=require('node:module');
const expectedModule=process.env.ASSPS_CHECK_SOURCE;
const orig=Module._load;
let observedPolicySQL='', observedRoleParams=[];
const role='assps_signed_shadow_runtime';
const login='assps_core_test_login';
const responses={};
class FakePool{
 async connect(){return {
  async query(sql,params=[]){
   sql=typeof sql==='string'?sql:sql.text;
   if(sql.includes('AS login_name, rolsuper'))return {rows:[{login_name:login,rolsuper:false,rolbypassrls:false}]};
   if(sql.includes('AS forced,')&&sql.includes('AS enabled,')&&sql.includes('AS signed')){
    observedPolicySQL=sql;observedRoleParams=params;
    const correct=sql.includes('$1::name=ANY(p.roles)')&&params.length===1&&params[0]===role;
    const modern=sql.includes("c.relname <> 'student_class_movement_audit'");
    return {rows:[{
      forced:modern?82:77,
      enabled:modern?82:77,
      signed:correct?77:0,
      signed_school:modern?73:undefined,
      signed_tenant:modern?4:undefined,
    }]};
   }
   if(sql.includes('AS approved_additional'))return {rows:[{
    approved_additional:process.env.ASSPS_TEST_SIMULATE_POLICY_DRIFT==='1'?4:5
   }]};
   if(sql.includes('AS role_name, rolsuper'))return {rows:[{role_name:role,rolsuper:false,rolbypassrls:false}]};
   if(sql.includes('session_user AS login_name'))return {rows:[{login_name:login,transaction_id:'21212121'}]};
   if(sql.includes('current_user AS role_name'))return {rows:[{role_name:role,rolsuper:false,rolbypassrls:false}]};
   if(sql.includes('current_user AS runtime_role'))return {rows:[{runtime_role:role,login_role:login,protected:true}]};
   return {rows:[],rowCount:0};
  },
  release(){}
 }}
 async end(){}
}
Module._load=function(name,parent,isMain){
 if(name==='pg')return{Pool:FakePool};
 if(name==='dotenv')return{config:()=>({parsed:{}})};
 return orig.call(this,name,parent,isMain);
}
process.env.DB_STARTUP_PROBE='false';
process.env.PAPER_RESTRICTED_DB_ENABLED='false';
process.env.DB_SIGNED_TENANT_RLS_ENABLED='true';
process.env.DB_ENFORCE_LEAST_PRIVILEGE_LOGIN='true';
process.env.DB_AUTH_USE_SIGNED_TENANT_CONTEXT='true';
process.env.DB_SIGNED_TENANT_HMAC_KEY='isolated-synthetic-signing-material-1234567890';
process.env.DB_RUNTIME_ROLE=role;
process.env.DB_USER=login;
process.env.NODE_ENV='test';
const {tenantContext,query,pool}=require(expectedModule);
(async()=>{
 try{
  await tenantContext.run({rlsEnabled:true,tenantId:900001,actorId:999001,isSuperAdmin:false},()=>query('SELECT current_user AS runtime_role'));
  if(!observedPolicySQL.includes('$1::name=ANY(p.roles)')||observedRoleParams[0]!==role)throw Error('ROLE_POLICY_COVERAGE_NOT_PARAMETERIZED');
  console.log('BLUEGREEN_POLICY_BINDING_REAL_SOURCE_PASS');
 }finally{await pool.end()}
})().catch(e=>{console.error('BLUEGREEN_POLICY_BINDING_SOURCE_FAIL '+(e.code||e.message));process.exitCode=2});
`
function run(src){return child.spawnSync(process.execPath,['-e',stub],{env:{...process.env,ASSPS_CHECK_SOURCE:src},encoding:'utf8',timeout:12000})}
test('legacy hardcoded role fails new bluegreen policy coverage',()=>{
 const x=run(original)
 assert.notEqual(x.status,0)
 assert.match(x.stderr,/DB_SIGNED_RLS_CATALOG_INCOMPLETE/)
})
test('role-configured restrictive policy coverage binds exact new runtime role',()=>{
 const x=run(updated)
 assert.equal(x.status,0,x.stderr)
 assert.match(x.stdout,/BLUEGREEN_POLICY_BINDING_REAL_SOURCE_PASS/)
})

test('new signed catalog refuses missing academic signed policy despite matching 77 core role policies',()=>{
 const x=child.spawnSync(process.execPath,['-e',stub],{
  env:{...process.env,ASSPS_CHECK_SOURCE:updated,ASSPS_TEST_SIMULATE_POLICY_DRIFT:'1'},
  encoding:'utf8',timeout:12000,
 })
 assert.notEqual(x.status,0)
 assert.match(x.stderr,/DB_SIGNED_RLS_CATALOG_INCOMPLETE/)
})

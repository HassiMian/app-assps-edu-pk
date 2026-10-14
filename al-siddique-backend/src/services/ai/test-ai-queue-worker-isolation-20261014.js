'use strict'
const assert=require('node:assert/strict')
process.env.NODE_ENV='test'
process.env.DB_STARTUP_PROBE='false'
process.env.DB_SIGNED_TENANT_RLS_ENABLED='true'
process.env.DB_ENFORCE_LEAST_PRIVILEGE_LOGIN='true'
process.env.DB_AUTH_USE_SIGNED_TENANT_CONTEXT='true'
process.env.DB_SIGNED_TENANT_HMAC_KEY='qa-guard-only-supersecret-please-never-use-in-production'
const { __test } = require('./aiQueueWorkerDatabase')
let count=0
function pass(label,fn){fn();count++;console.log('PASS '+label)}
const valid={
  ASSPS_ISOLATED_QA:'yes',
  DB_AI_WORKER_HOST:'/var/run/postgresql',
  DB_AI_WORKER_PORT:'55477',
  DB_AI_WORKER_NAME:'apexos',
  DB_AI_WORKER_USER:'assps_core_qa_ai_login',
  DB_AI_WORKER_PASSWORD:'qa-only-trust-socket-ignored',
  DB_AI_WORKER_ROLE:'assps_core_qa_ai_worker',
  DB_USER:'assps_core_green_login',
}
pass('QA worker config accepted only for QA PG55477',()=>{
  assert.equal(__test.validatedConfig(valid).workerRole,'assps_core_qa_ai_worker')
})
pass('missing separate worker credentials fail-closed',()=>{
  assert.throws(()=>__test.validatedConfig({...valid,DB_AI_WORKER_PASSWORD:''}),/SEPARATE_IDENTITY/)
})
pass('request runtime cannot reuse same login as AI worker',()=>{
  assert.throws(()=>__test.validatedConfig({...valid,DB_AI_WORKER_USER:valid.DB_USER}),/IDENTITY_MUST_BE_SEPARATE/)
})
pass('QA cannot target production DB port',()=>{
  assert.throws(()=>__test.validatedConfig({...valid,DB_AI_WORKER_PORT:'5432'}),/ROLE_NOT_PINNED|QA_CANNOT_TOUCH_PRODUCTION/)
})
pass('production worker role cannot be arbitrary inherited role',()=>{
  assert.throws(()=>__test.validatedConfig({...valid,ASSPS_ISOLATED_QA:'no'}),/ROLE_NOT_PINNED/)
})
console.log('ASSPS_AI_WORKER_CONFIG_NEGATIVE '+count+'/'+count+' PASS')

'use strict'
// Hermetic mocked pg Pool. No DB socket, production password, or school data.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const workerPath = require.resolve('./aiQueueWorkerDatabase')

const identity = () => ({
  actor: 'assps_ai_worker_login', can_login: true,
  bypass: false, super: false, can_create_role:false, can_create_db:false,
  can_replicate:false, worker_member:true, can_set_worker_role:false,
  can_queue:true,can_org:false,can_campus:false,can_audit:false,
  can_students:false,can_exam_results:false,
})
const envVars = {
  NODE_ENV:'test',DB_SIGNED_TENANT_RLS_ENABLED:'true',
  DB_AI_WORKER_HOST:'127.0.0.1',DB_AI_WORKER_PORT:'5432',
  DB_AI_WORKER_NAME:'synthetic_test_only',DB_AI_WORKER_USER:'assps_ai_worker_login',
  DB_AI_WORKER_PASSWORD:'synthetic_not_real', DB_AI_WORKER_ROLE:'assps_core_ai_worker',
  DB_USER:'assps_core_green_login',
}

async function runCase(changes = {}, shouldDeny = false) {
  const events=[]
  const previous={}
  for (const [k,v] of Object.entries(envVars)) {
    previous[k]=process.env[k]
    process.env[k]=v
  }
  const originalLoad=Module._load
  let sqlText=''
  const client = {
    async query(text,params) {
      events.push(['query',text,params])
      if (text.includes('SELECT current_user AS actor')) {
        sqlText=text
        return { rows:[{...identity(),...changes}] }
      }
      return {rows:[{ok:true}]}
    },
    release() { events.push(['release']) },
  }
  Module._load=function patched(request, parent, isMain) {
    if (request==='pg' && parent?.filename===workerPath) {
      return { Pool: class SyntheticPool {
        constructor(options) { events.push(['pool',options.user,options.database]) }
        async connect() { events.push(['connect']); return client }
      } }
    }
    return originalLoad.apply(this,arguments)
  }
  let worker
  try {
    delete require.cache[workerPath]
    worker=require(workerPath)
  } finally {
    Module._load=originalLoad
  }
  try {
    if (shouldDeny) {
      await assert.rejects(worker.query('SELECT synthetic_queue_fixture'), /AI_QUEUE_WORKER_DATABASE_PRIVILEGES_NOT_ISOLATED/)
    } else {
      const v=await worker.query('SELECT synthetic_queue_fixture')
      assert.equal(v.rows[0].ok,true)
    }
    const actualQueries=events.filter(e=>e[0]==='query')
    assert.equal(actualQueries.length,shouldDeny?1:2,'denied worker must never execute queue SQL')
    assert.equal(events.filter(e=>e[0]==='release').length,1,'connection must release')
    return sqlText
  } finally {
    delete require.cache[workerPath]
    for (const [k,v] of Object.entries(previous)) {
      if (v===undefined) delete process.env[k]; else process.env[k]=v
    }
  }
}

test('legitimate isolated queue worker remains allowed and DB session released',async()=>{
  const sql=await runCase()
  assert.match(sql,/SELECT current_user AS actor/)
})
test('sensitive student table CRUD cannot be acquired',async()=>{
  await runCase({can_students:true},true)
})
test('sensitive result marks table CRUD cannot be acquired',async()=>{
  await runCase({can_exam_results:true},true)
})
test('campus INSERT or other DML cannot be acquired',async()=>{
  await runCase({can_campus:true},true)
})
test('organization UPDATE or other DML cannot be acquired',async()=>{
  await runCase({can_org:true},true)
})
test('audit DELETE or other DML cannot be acquired',async()=>{
  await runCase({can_audit:true},true)
})
test('worker membership SET privilege cannot be escalated',async()=>{
  await runCase({can_set_worker_role:true},true)
})
test('worker role CREATE ROLE privilege cannot be escalated',async()=>{
  await runCase({can_create_role:true},true)
})
test('worker role replication privilege cannot be escalated',async()=>{
  await runCase({can_replicate:true},true)
})
test('worker role CREATE DATABASE privilege cannot be escalated',async()=>{
  await runCase({can_create_db:true},true)
})
test('worker BYPASSRLS is denied',async()=>{
  await runCase({bypass:true},true)
})
test('worker SQL checks exact sensitive DML operations and SET-role',async()=>{
  const sql=await runCase()
  for (const table of ['students','exam_results','organizations','campuses','admin_block_audit_log']) {
    assert.ok(sql.includes("has_table_privilege(current_user,'public."+table+"','SELECT,INSERT,UPDATE,DELETE')"),table)
  }
  assert.ok(sql.includes("pg_has_role(current_user, $1, 'SET')"))
})

test('missing sensitive-permission SQL field fails closed instead of coercing falsy', async()=>{
  await runCase({can_students:undefined},true)
})
test('null sensitive-permission SQL field fails closed', async()=>{
  await runCase({can_exam_results:null},true)
})
test('string encoded false cannot bypass role privilege check', async()=>{
  await runCase({can_create_role:'false'},true)
})
test('missing worker SET-role proof fails closed', async()=>{
  await runCase({can_set_worker_role:undefined},true)
})
test('missing expected queue authorization fails closed', async()=>{
  await runCase({can_queue:undefined},true)
})

'use strict'
// Real Node/pg adapter acceptance against disposable PostgreSQL only.
// Never run against live port5432, never access current staff records.
const assert = require('node:assert/strict')
assert.equal(process.env.ASSPS_ISOLATED_QA, 'yes')
assert.equal(process.env.DB_AI_WORKER_PORT, '55477')
assert.equal(process.env.DB_AI_WORKER_ROLE, 'assps_core_qa_ai_worker')
assert.equal(process.env.DB_AI_WORKER_HOST, '/var/run/postgresql')
assert.equal(process.env.DB_AI_WORKER_NAME, 'apexos')
assert.equal(process.env.DB_AI_WORKER_USER, 'assps_core_qa_login')
assert.equal(process.env.DB_SIGNED_TENANT_RLS_ENABLED, 'true')
assert.equal(process.env.DB_STARTUP_PROBE, 'false')
if (!process.env.DB_AI_WORKER_PASSWORD || process.env.DB_AI_WORKER_PASSWORD.length < 32) {
  throw Error('QA_SECRET_NOT_SET')
}
const {query} = require('./aiQueueWorkerDatabase')
async function run() {
  const identity = await query('SELECT current_user AS name')
  assert.equal(identity.rows[0].name, 'assps_core_qa_login')
  console.log('QA_REAL_NODE_PG_AUTHENTICATED_RESTRICTED_WORKER_PASS')
  for (const table of ['ai_jobs','ai_queue_events','ai_queue_state']) {
    const data = await query('SELECT count(*)::int AS count FROM public.'+table)
    assert.ok(Number.isInteger(data.rows[0].count))
    console.log('QA_REAL_AI_WORKER_READ_PASS '+table)
  }
  const marker='QA_ISOLATED_REAL_NODE_20261015'
  await query('INSERT INTO public.ai_queue_state(key,value) VALUES($1,$2)',[marker,'qa-only'])
  const updated = await query('UPDATE public.ai_queue_state SET value=$2 WHERE key=$1 RETURNING key',[marker,'updated-qa'])
  assert.equal(updated.rows.length,1)
  console.log('QA_REAL_AI_WORKER_INSERT_UPDATE_PASS')
  for (const table of ['organizations','campuses','admin_block_audit_log']) {
    let rejected = false
    try {
      await query('SELECT count(*) FROM public.'+table)
    } catch (err) {
      rejected = err && err.code === '42501'
    }
    assert.equal(rejected,true, 'unexpected global table access '+table)
    console.log('QA_AI_WORKER_FORBIDDEN_GLOBAL_DENIAL_PASS '+table)
  }
  console.log('QA_REAL_NODE_TO_PG_SERVICE_INTEGRATION_8OF8_PASS')
}
run().then(()=>process.exit(0)).catch(err=>{
  console.error('QA_REAL_NODE_WORKER_SERVICE_BLOCKED '+(err && err.code ? err.code : 'CHECK_FAILED'))
  process.exit(2)
})

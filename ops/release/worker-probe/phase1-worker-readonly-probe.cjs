'use strict';
// One-shot operational proof of the reviewed worker adapter under real OS peer
// authentication. READ ONLY. Does not replace signed worker and tenant receipts.
const assert = require('node:assert/strict');
const path = require('node:path');
const { query } = require(path.join(__dirname, 'aiQueueWorkerDatabase.js'));
const protectedTables = ['students', 'exam_results', 'organizations', 'campuses', 'admin_block_audit_log'];
const queueTables = ['ai_jobs', 'ai_queue_events', 'ai_queue_state'];
async function check() {
  assert.equal(process.env.DB_SIGNED_TENANT_RLS_ENABLED, 'true');
  assert.equal(process.env.DB_AI_WORKER_HOST, '/var/run/postgresql');
  assert.equal(process.env.DB_AI_WORKER_PORT, '5432');
  assert.equal(process.env.DB_AI_WORKER_USER, 'assps_ai_worker_login');
  const r = await query(`SELECT current_user AS actual_login, session_user AS session_login,
     pg_has_role(current_user,'assps_core_ai_worker','USAGE') AS worker_member,
     rolbypassrls AS bypass_rls, rolsuper AS super_user,
     has_table_privilege(current_user,'public.ai_jobs','SELECT') AS queue_read
     FROM pg_roles WHERE rolname=current_user`);
  const actor = r.rows[0];
  assert.equal(actor?.actual_login, 'assps_ai_worker_login');
  assert.equal(actor.session_login, actor.actual_login);
  assert.equal(actor.worker_member, true);
  assert.equal(actor.bypass_rls, false);
  assert.equal(actor.super_user, false);
  assert.equal(actor.queue_read, true);
  let denied = 0;
  for (const table of protectedTables) {
    const rights = await query(`SELECT has_table_privilege(current_user,'public.${table}', 'SELECT') AS sel,
      has_table_privilege(current_user,'public.${table}', 'INSERT') AS ins,
      has_table_privilege(current_user,'public.${table}', 'UPDATE') AS upd,
      has_table_privilege(current_user,'public.${table}', 'DELETE') AS del`);
    assert.deepEqual(rights.rows[0], {sel:false,ins:false,upd:false,del:false}, `${table} permissions leaked`);
    denied++;
  }
  for(const table of queueTables) {
    const rights = await query(`SELECT has_table_privilege(current_user,'public.${table}','SELECT') AS allowed`);
    assert.equal(rights.rows[0]?.allowed,true,`${table} read denied`);
  }
  // Authorization errors must come from actual PostgreSQL, not only a
  // pg_has_role/has_table_privilege catalog estimate.
  for(const table of ['students','exam_results']) {
    let refused=false;
    try { await query(`SELECT 1 FROM public.${table} LIMIT 0`); }
    catch(e) { if(e.code==='42501') refused=true; else throw e; }
    assert.equal(refused, true, `${table} SELECT unexpectedly allowed`);
  }
  console.log(JSON.stringify({phase:'ASSPS_PHASE1_WORKER_READONLY_PROBE',status:'PASS',
    actor:actor.actual_login,role:'assps_core_ai_worker',
    sensitive_acl_denied:denied,protected_sql_denied:2,
    queue_read_verified:queueTables.length,production_data_modified:false,
    signed_tenant_or_offsite_receipt_issued:false,backend_cutover_performed:false}));
}
check().then(()=>process.exit(0)).catch(e=>{
  console.error(JSON.stringify({phase:'ASSPS_PHASE1_WORKER_READONLY_PROBE',status:'HOLD',reason:e.code||e.message}));
  process.exit(2);
});

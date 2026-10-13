'use strict'
// Operator QA only: a disposable signed clone and distinct, non-BYPASS login.
const assert = require('node:assert/strict')
const { Pool } = require('pg')
const path = require('node:path')
const backend = path.resolve(__dirname, '../../../al-siddique-backend')
async function main() {
  assert.equal(process.env.DB_PORT, '55432')
  assert.ok(['assps_core_cutover_login_qa_20261013','assps_core_green77_qa_20261013'].includes(process.env.DB_NAME))
  assert.equal(process.env.DB_ENFORCE_LEAST_PRIVILEGE_LOGIN, 'true')
  assert.equal(process.env.DB_AUTH_USE_SIGNED_TENANT_CONTEXT, 'true')
  assert.equal(process.env.DB_SIGNED_TENANT_RLS_ENABLED, 'true')
  assert.ok(['assps_core_cutover_qa_login_20261013','assps_core_green77_login_qa_20261013'].includes(process.env.DB_USER))
  assert.match(process.env.DB_SIGNED_TENANT_HMAC_KEY || '', /^[a-f0-9]{64}$/)
  const config = require(path.join(backend, 'src/config/database'))
  const { query, tenantContext, pool } = config
  const direct = new Pool({host:'127.0.0.1', port:55432, database:process.env.DB_NAME,
    user:process.env.DB_USER, password:process.env.DB_PASSWORD, max:1})
  try {
    const facts = await direct.query('SELECT session_user AS login, current_setting($1)::int AS port', ['port'])
    assert.equal(facts.rows[0].port, 55432)
    assert.equal(facts.rows[0].login, process.env.DB_USER)
    const roles = await direct.query('SELECT rolcanlogin,rolbypassrls,rolsuper,rolinherit FROM pg_roles WHERE rolname=current_user')
    assert.deepEqual(roles.rows[0], {rolcanlogin:true,rolbypassrls:false,rolsuper:false,rolinherit:false})
    const signed = async schoolId => tenantContext.run({rlsEnabled:true,isSuperAdmin:false,tenantId:schoolId,actorId:999001},
      async () => Number((await query('SELECT count(*)::int AS n FROM public.students')).rows[0].n))
    const schoolOne = await signed(1)
    const schoolTwo = await signed(2)
    assert.equal(schoolOne,318,'signed school 1 must see only school 1')
    assert.equal(schoolTwo,3,'signed school 2 must see only school 2')
    const unsigned = await direct.connect()
    let forgedCount = null
    try {
      await unsigned.query('BEGIN')
      await unsigned.query(`SET LOCAL ROLE ${process.env.DB_RUNTIME_ROLE}`)
      await unsigned.query("SELECT set_config('app.rls_enabled','true',true),set_config('app.tenant_id','1',true),set_config('app.is_super_admin','true',true)")
      forgedCount = Number((await unsigned.query('SELECT count(*)::int AS n FROM public.students')).rows[0].n)
      await unsigned.query('ROLLBACK')
    } finally { unsigned.release() }
    assert.equal(forgedCount,0,'client-forged tenant/superadmin must read zero')
    // A runtime login must not be able to SET ROLE into privileged legacy or Paper ownership.
    for (const disallowed of ['apexos_user','apex_paper_owner','postgres', ...(process.env.DB_RUNTIME_ROLE==='assps_core_green_runtime'?['apex_app_runtime']:[])]) {
      let denied=false
      try { await direct.query(`SET ROLE ${disallowed}`) } catch (e) { denied=e.code==='42501' }
      assert.equal(denied,true,`privileged role ${disallowed} must be unavailable`)
    }
    assert.equal(await signed(1),schoolOne,'pool cleanup must preserve school 1 isolation')
    assert.equal(await signed(2),schoolTwo,'pool cleanup must preserve school 2 isolation')
    let blocked = false
    try { await signed(99999) } catch (e) { blocked = true }
    // Either an empty permitted tenant or hard denial is acceptable: it cannot return school 1 rows.
    const nonSchool = blocked ? 0 : await signed(99999)
    assert.equal(nonSchool,0)
    console.log(JSON.stringify({status:'PASS_ISOLATED_RESTRICTED_LOGIN_SIGNED_POSITIVE_AND_FORGED_DENIAL_ONLY',
      login_nonbypass:true, role_inherit:false, school1_rows:schoolOne, school2_rows:schoolTwo,
      forged_rows:forgedCount, other_school_rows:nonSchool, real_staff_http:false, production_modified:false}))
  } finally { await direct.end(); await pool.end() }
}
main().catch(e=>{console.error(JSON.stringify({status:'HOLD',code:e.code||'TEST_FAILURE',message:e.message.slice(0,180)})); process.exitCode=2})

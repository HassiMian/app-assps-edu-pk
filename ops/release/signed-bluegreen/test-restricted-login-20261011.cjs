'use strict'
/** Authenticated password/SCRAM signed PostgreSQL acceptance on isolated restored DB ONLY. */
const assert=require('node:assert/strict')
const {Pool}=require('/var/www/apex-backend/node_modules/pg')
const {applySignedTenantContext}=require('../../../al-siddique-backend/src/services/security/coreSignedTenantContext')
async function main(){
  assert.equal(process.env.ASSPS_CLONE_DB_NAME,'assps_backup_restore_check_20261011')
  assert.equal(process.env.ASSPS_CLONE_DB_PORT,'55432')
  assert.equal(process.env.ASSPS_CLONE_DB_USER,'assps_marks_signed_login')
  assert.ok(String(process.env.ASSPS_CLONE_DB_PASSWORD||'').length>=32)
  assert.ok(String(process.env.ASSPS_CLONE_SIGNING_KEY||'').length>=32)
  assert.match(String(process.env.ASSPS_CLONE_SCHOOL_ID||''),/^[1-9][0-9]*$/)
  const pool=new Pool({host:'127.0.0.1',port:55432,database:process.env.ASSPS_CLONE_DB_NAME,
    user:process.env.ASSPS_CLONE_DB_USER,password:process.env.ASSPS_CLONE_DB_PASSWORD,
    max:1,connectionTimeoutMillis:2500})
  try {
    const client=await pool.connect()
    try {
      const identity=(await client.query("SELECT session_user AS login, rolbypassrls AS bypass,rolsuper AS super FROM pg_roles WHERE rolname=current_user")).rows[0]
      assert.equal(identity.login,'assps_marks_signed_login')
      assert.equal(identity.bypass,false)
      assert.equal(identity.super,false)
      console.log('RESTRICTED_SCRAM_DATABASE_LOGIN_PASS')
      await client.query('BEGIN')
      try {
        await client.query('SET ROLE assps_marks_signed_runtime')
        await applySignedTenantContext(client,{tenantId:process.env.ASSPS_CLONE_SCHOOL_ID,
          tenantKey:'disposable_scope',actorId:999998,secret:process.env.ASSPS_CLONE_SIGNING_KEY,
          expectedLogin:'assps_marks_signed_login'})
        const allowed=await client.query('SELECT COUNT(*)::int AS n FROM public.schools WHERE id=$1',[Number(process.env.ASSPS_CLONE_SCHOOL_ID)])
        const denied=await client.query('SELECT COUNT(*)::int AS n FROM public.schools WHERE id<>$1',[Number(process.env.ASSPS_CLONE_SCHOOL_ID)])
        assert.equal(allowed.rows[0].n,1)
        assert.equal(denied.rows[0].n,0)
        console.log('REAL_PASSWORD_LOGIN_SIGNED_OWN_SCHOOL_PASS CROSS_SCHOOL_DENIED_PASS')
        await client.query("SELECT set_config('app.tenant_id','987654321',true)")
        const spoof=await client.query('SELECT COUNT(*)::int AS n FROM public.schools')
        assert.equal(spoof.rows[0].n,0)
        console.log('REAL_PASSWORD_LOGIN_TENANT_SPOOF_DENIED_PASS')
      } finally {await client.query('ROLLBACK')}
      await client.query('BEGIN')
      try {
        await client.query('SET ROLE assps_marks_signed_runtime')
        const unsigned=await client.query('SELECT COUNT(*)::int AS n FROM public.schools')
        assert.equal(unsigned.rows[0].n,0)
        console.log('REAL_PASSWORD_LOGIN_UNSIGNED_SCOPE_DENIED_PASS')
      } finally {await client.query('ROLLBACK')}
    } finally {client.release()}
  } finally {await pool.end()}
}
main().catch(err=>{console.error('RESTRICTED_LOGIN_ACCEPTANCE_NO_GO',err.code||err.message);process.exitCode=2})

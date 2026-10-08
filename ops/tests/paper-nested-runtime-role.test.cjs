const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

test('authenticated application runtime safely enters restricted Paper Vault role', {timeout:15000}, async () => {
  assert.match(process.env.DB_NAME || '', /^assps_/)
  assert.match(process.env.DB_HOST || '', /^\/dev\/shm\/assps-/)
  assert.equal(process.env.DB_RUNTIME_ROLE, 'apex_app_runtime')
  const backend = path.resolve(__dirname, '../../al-siddique-backend/src')
  const { pool, tenantContext } = require(path.join(backend, 'config/database'))
  const { applyPaperVaultRuntimeContext } = require(path.join(backend,'services/papers/paperVaultRuntimeRole'))
  try {
    const withoutTenant = await pool.query('SELECT count(*)::int AS count FROM paper_vault')
    assert.equal(withoutTenant.rows[0].count, 0)
    for (const schoolId of [1,2,1]) {
      await tenantContext.run({rlsEnabled:true,tenantId:schoolId,isSuperAdmin:false}, async () => {
        const client = await pool.connect()
        try {
          let role = await client.query('SELECT current_user AS role')
          assert.equal(role.rows[0].role, 'apex_app_runtime')
          await client.query('BEGIN')
          await applyPaperVaultRuntimeContext(client,schoolId)
          role = await client.query('SELECT current_user AS role')
          assert.equal(role.rows[0].role, 'apex_paper_runtime')
          const count = await client.query('SELECT count(*)::int AS total, count(*) FILTER(WHERE school_id<>$1)::int AS foreign FROM paper_vault',[schoolId])
          assert.equal(count.rows[0].foreign,0)
          await client.query('COMMIT')
        } catch (error) {
          await client.query('ROLLBACK').catch(()=>{})
          throw error
        } finally {
          await client.release()
        }
      })
    }
    console.log('NESTED_RUNTIME_ROLE_RLS_PASS')
  } finally { await pool.end() }
})

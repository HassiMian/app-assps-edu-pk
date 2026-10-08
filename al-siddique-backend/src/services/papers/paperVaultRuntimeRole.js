// Single restricted PostgreSQL runtime boundary for Paper Vault and its revision journal.
const { pool } = require('../../config/database')

async function applyPaperVaultRuntimeContext(client, schoolId) {
  const tenantId = Number(schoolId)
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    const err = new Error('School context is required.')
    err.code = 'SCHOOL_CONTEXT_REQUIRED'
    err.status = 403
    throw err
  }
  await client.query('SET LOCAL ROLE apex_paper_runtime')
  await client.query(
    "SELECT set_config('app.rls_enabled','true',true), set_config('app.is_super_admin','false',true), set_config('app.tenant_id',$1,true)",
    [String(tenantId)]
  )
}

async function withPaperVaultRuntime(schoolId, work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await applyPaperVaultRuntimeContext(client, schoolId)
    const value = await work(client)
    await client.query('COMMIT')
    return value
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

module.exports = { applyPaperVaultRuntimeContext, withPaperVaultRuntime }

/**
 * Read-only, fail-closed DB-role verification for the Assessment Studio release.
 *
 * ENABLE/FORCE RLS alone is insufficient: PostgreSQL BYPASSRLS roles always
 * bypass row policies. This gate checks the actual connected application role
 * and tenant-bound tables before any future deployment is declared RLS-safe.
 *
 * Does not grant/revoke roles or mutate records.
 */

const REQUIRED = [
  'question_bank', 'question_bank_imports', 'paper_vault',
  'paper_vault_revision_history', 'paper_documents',
  'paper_revisions', 'assessment_releases', 'assessment_print_jobs',
  'lesson_plans',
]

function assessRlsGate({ role, tables }) {
  const findings = []
  if (!role || role.rolsuper || role.rolbypassrls) {
    findings.push('APPLICATION_ROLE_BYPASSES_RLS')
  }
  for (const name of REQUIRED) {
    const entry = tables.find(t => t.relname === name)
    if (!entry) findings.push('MISSING_TENANT_TABLE:' + name)
    else if (!entry.relrowsecurity || !entry.relforcerowsecurity) {
      findings.push('UNENFORCED_TENANT_RLS:' + name)
    }
  }
  return { safe: findings.length === 0, findings }
}

async function main() {
  const { pool } = require('../al-siddique-backend/src/config/database')
  const identity = (await pool.query(
    'SELECT current_database() AS db, current_user AS username'
  )).rows[0]
  const role = (await pool.query(
    'SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname = current_user'
  )).rows[0]
  const tables = (await pool.query(
    `SELECT relname,relrowsecurity,relforcerowsecurity
       FROM pg_class WHERE relnamespace='public'::regnamespace
       AND relkind='r' AND relname=ANY($1::text[])`,
    [REQUIRED]
  )).rows
  const gate = assessRlsGate({ role, tables })
  console.log(JSON.stringify({
    gate: 'PAPER_TENANT_DB_ROLE_RLS',
    database: identity.db,
    username: identity.username,
    safe: gate.safe,
    inspectedTables: REQUIRED.length,
    findings: gate.findings,
  }))
  if (!gate.safe) process.exitCode = 2
  await pool.end()
}

if (require.main === module) {
  main().catch(err => {
    console.error('PAPER_TENANT_DB_ROLE_RLS_ERROR', err.message)
    process.exitCode = 2
  })
}

module.exports = { REQUIRED, assessRlsGate }

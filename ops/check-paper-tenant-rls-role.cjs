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

// The bootstrap login is deliberately privileged for legacy schema operations.
// Actual authenticated requests SET ROLE to the NOBYPASSRLS runtime identity.
// Delegate the live gate to the full request-role checker, which proves this
// with SET LOCAL ROLE and blank/cross-tenant visibility checks.
function main() {
  const path = require('node:path')
  const { spawnSync } = require('node:child_process')
  const command = spawnSync(process.execPath, [path.join(__dirname,'check-app-runtime-rls.cjs')], {
    env: process.env,
    stdio: 'inherit',
    timeout: 30000,
  })
  process.exitCode = command.status === 0 ? 0 : 2
  if (command.error) console.error('PAPER_TENANT_RUNTIME_RLS_ERROR', command.error.message)
}

if (require.main === module) main()

module.exports = { REQUIRED, assessRlsGate }

/**
 * Read-only preflight for the restricted Paper Vault database boundary.
 * A global BYPASSRLS application login does not qualify as a DB security
 * boundary; Paper Vault must actively SET LOCAL ROLE to this limited role.
 */
const ROLE = 'apex_paper_runtime'
const PROTECTED = ['paper_vault', 'paper_vault_revision_history', 'teacher_class_assignments']

function assessVaultRuntime(probe) {
  const findings = []
  const role = probe.role
  if (!role) findings.push('VAULT_RUNTIME_ROLE_MISSING')
  else {
    if (role.rolbypassrls || role.rolsuper || role.rolcanlogin)
      findings.push('VAULT_RUNTIME_ROLE_OVERPRIVILEGED')
    if (!probe.canSetRole) findings.push('APPLICATION_CANNOT_SET_RUNTIME_ROLE')
  }
  const vault = probe.tables.find(x => x.relname === 'paper_vault')
  const journal = probe.tables.find(x => x.relname === 'paper_vault_revision_history')
  const teacherScope = probe.tables.find(x => x.relname === 'teacher_class_assignments')
  for (const table of [vault, journal, teacherScope]) {
    if (!table) findings.push('REQUIRED_TABLE_MISSING')
    else {
      if (!table.relrowsecurity || !table.relforcerowsecurity)
        findings.push('RLS_NOT_FORCED:' + table.relname)
      const policy = probe.policies.find(x => x.tablename === table.relname)
      if (!policy || !/app\.tenant_id/.test(policy.qual || '') ||
          /app\.rls_enabled/.test(policy.qual || '') ||
          !/app\.tenant_id/.test(policy.with_check || '')) {
        findings.push('TENANT_POLICY_NOT_STRICT:' + table.relname)
      }
    }
  }
  for (const p of ['SELECT','INSERT','UPDATE','DELETE']) {
    if (probe.tableGrants?.[p] !== true) findings.push('VAULT_GRANT_MISSING:' + p)
  }
  for (const p of ['USAGE','SELECT']) {
    if (probe.sequenceGrants?.[p] !== true) findings.push('VAULT_SEQUENCE_GRANT_MISSING:' + p)
  }
  for (const p of ['SELECT','INSERT']) {
    if (probe.journalGrants?.[p] !== true) findings.push('JOURNAL_GRANT_MISSING:' + p)
  }
  if (probe.teacherAssignmentGrant !== true) findings.push('TEACHER_SCOPE_GRANT_MISSING')
  return { ready: findings.length === 0, findings }
}

async function inspect() {
  const { pool } = require('../al-siddique-backend/src/config/database')
  try {
    const [{ rows: roles }, { rows: tables }, { rows: policies }] = await Promise.all([
      pool.query("SELECT rolname,rolbypassrls,rolsuper,rolcanlogin FROM pg_roles WHERE rolname=$1",[ROLE]),
      pool.query("SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname=ANY($1::text[]) AND relkind='r'",[PROTECTED]),
      pool.query("SELECT tablename,policyname,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename=ANY($1::text[])",[PROTECTED]),
    ])
    const role = roles[0] || null
    const canSetRole = role ?
      (await pool.query("SELECT pg_has_role(current_user,$1,'SET') AS permitted",[ROLE])).rows[0].permitted : false
    const tableGrants = {}
    const sequenceGrants = {}
    const journalGrants = {}
    let teacherAssignmentGrant = false
    if (role && tables.some(t=>t.relname==='paper_vault')) {
      for (const p of ['SELECT','INSERT','UPDATE','DELETE']) {
        tableGrants[p] = (await pool.query(
          "SELECT has_table_privilege($1,'public.paper_vault',$2) AS allowed",[ROLE,p])).rows[0].allowed
      }
      for (const p of ['USAGE','SELECT']) {
        sequenceGrants[p] = (await pool.query(
          "SELECT has_sequence_privilege($1,'public.paper_vault_id_seq',$2) AS allowed",[ROLE,p])).rows[0].allowed
      }
      if (tables.some(t=>t.relname==='paper_vault_revision_history')) {
        for (const p of ['SELECT','INSERT']) {
          journalGrants[p] = (await pool.query(
            "SELECT has_table_privilege($1,'public.paper_vault_revision_history',$2) AS allowed",[ROLE,p])).rows[0].allowed
        }
      }
      if (tables.some(t=>t.relname==='teacher_class_assignments')) {
        teacherAssignmentGrant = (await pool.query(
          "SELECT has_table_privilege($1,'public.teacher_class_assignments','SELECT') AS allowed",[ROLE])).rows[0].allowed
      }
    }
    const assessed = assessVaultRuntime({role,tables,policies,canSetRole,tableGrants,sequenceGrants,journalGrants,teacherAssignmentGrant})
    console.log(JSON.stringify({
      gate:'PAPER_VAULT_RUNTIME_DB_BOUNDARY',database:(await pool.query('SELECT current_database() AS db')).rows[0].db,
      role:ROLE,ready:assessed.ready,findings:assessed.findings,
    }))
    if (!assessed.ready) process.exitCode = 2
  } finally { await pool.end() }
}

if (require.main === module) {
  inspect().catch(err => {
    console.error('PAPER_VAULT_RUNTIME_GATE_ERROR',err.message)
    process.exitCode = 2
  })
}
module.exports = { assessVaultRuntime }

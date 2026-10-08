const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '../..')
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8')

test('Paper Vault is forced through the canonical NOBYPASSRLS runtime role', () => {
  const route = read('al-siddique-backend/src/routes/paperRoute.js')
  assert.match(route, /SET LOCAL ROLE apex_paper_runtime/)
  assert.match(route, /set_config\('app\.tenant_id'/)
  assert.match(route, /async function withPaperVaultRuntime/)
  assert.ok((route.match(/await applyPaperVaultRuntimeContext\(client, schoolId\)/g) || []).length >= 3)
  assert.ok((route.match(/withPaperVaultRuntime\(schoolId/g) || []).length >= 2)
})

test('Paper Vault migration grants only its table and sequence to the runtime role', () => {
  const migration = read('al-siddique-backend/migrations/020_paper_vault_schema.js')
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE paper_vault TO apex_paper_runtime/)
  assert.match(migration, /GRANT USAGE, SELECT ON SEQUENCE paper_vault_id_seq TO apex_paper_runtime/)
})

test('Paper Vault participates in strict tenant RLS coverage', () => {
  const rls = read('al-siddique-backend/src/config/migrations/005_rls_policies.js')
  assert.match(rls, /'paper_vault'/)
  assert.match(rls, /'paper_vault', 'paper_vault_revision_history'/)
  assert.ok(rls.indexOf("'paper_vault', 'paper_vault_revision_history'") > rls.indexOf('const strictTables'))
  assert.match(rls, /ALTER TABLE \$\{table\} FORCE ROW LEVEL SECURITY/)
})

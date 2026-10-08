const test = require('node:test')
const assert = require('node:assert/strict')
const { evaluateReleaseConsistency, parseProcEnv, CANONICAL_BRANCH } = require('../check-release-consistency.cjs')

const commit = 'a'.repeat(40)
const meta = {
  commit,
  branch: CANONICAL_BRANCH,
  productionSmoke: 'pass',
  liveRouteContract: 'pass',
  protectedTemplates: '6/6 unchanged',
}
const env = { PORT:'5000', NODE_ENV:'production', AUTO_MIGRATE_ON_BOOT:'false', DB_RUNTIME_ROLE:'apex_app_runtime' }

test('release consistency passes only when canonical metadata and PM2 invariants align', () => {
  const result = evaluateReleaseConsistency({ canonicalCommit:commit, frontendMeta:meta, backendMeta:meta, pm2Env:env })
  assert.equal(result.safe, true)
  assert.deepEqual(result.findings, [])
})

test('release consistency detects commit, branch, gate, and PM2 environment drift', () => {
  const result = evaluateReleaseConsistency({
    canonicalCommit:commit,
    frontendMeta:{...meta,commit:'b'.repeat(40)},
    backendMeta:{...meta,branch:'stale/branch',productionSmoke:'unknown'},
    pm2Env:{...env,PORT:'5001',DB_RUNTIME_ROLE:''},
  })
  assert.equal(result.safe, false)
  assert.ok(result.findings.some(x => x.startsWith('FRONTEND_COMMIT_DRIFT:')))
  assert.ok(result.findings.some(x => x.startsWith('BACKEND_BRANCH_DRIFT:')))
  assert.ok(result.findings.includes('BACKEND_PRODUCTION_SMOKE_NOT_SEALED'))
  assert.ok(result.findings.some(x => x.startsWith('PM2_ENV_DRIFT:PORT:')))
  assert.ok(result.findings.some(x => x.startsWith('PM2_ENV_DRIFT:DB_RUNTIME_ROLE:')))
})

test('proc env parser keeps exact values without exposing unrelated semantics', () => {
  const parsed = parseProcEnv(Buffer.from('PORT=5000\0NODE_ENV=production\0EMPTY=\0'))
  assert.equal(parsed.PORT,'5000')
  assert.equal(parsed.NODE_ENV,'production')
  assert.equal(parsed.EMPTY,'')
})

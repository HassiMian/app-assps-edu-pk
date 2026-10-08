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

test('backend-only forward release preserves frontend commit and requires independent ancestry proof', () => {
  const backend = {
    ...meta,
    commit:'b'.repeat(40),
    branch:'fix/paper-v1-release-rls-reconcile-20261008',
    component:'backend-paper-studio-rls-hardening',
    sourceBaseLiveCommit:commit,
    previousRelease:{commit},
  }
  const allowed = evaluateReleaseConsistency({canonicalCommit:commit,frontendMeta:meta,backendMeta:backend,pm2Env:env,
    backendForwardVerifier:(base,head,branch)=>base===commit&&head===backend.commit&&branch===backend.branch})
  assert.equal(allowed.safe,true)
  const denied = evaluateReleaseConsistency({canonicalCommit:commit,frontendMeta:meta,backendMeta:backend,pm2Env:env,
    backendForwardVerifier:()=>false})
  assert.equal(denied.safe,false)
  assert.ok(denied.findings.some(item=>item.startsWith('BACKEND_COMMIT_DRIFT:')))
  const wrongBase = evaluateReleaseConsistency({canonicalCommit:commit,frontendMeta:meta,
    backendMeta:{...backend,sourceBaseLiveCommit:'c'.repeat(40)},pm2Env:env,
    backendForwardVerifier:(_base,_head,_branch,metadata)=>metadata.sourceBaseLiveCommit===commit})
  assert.equal(wrongBase.safe,false)
})

test('static frontend release uses its actual frontendDeployedContracts seal, not an absent API contract field', () => {
  const staticFrontend = {...meta,liveRouteContract:undefined,frontendDeployedContracts:'pass'}
  const result = evaluateReleaseConsistency({canonicalCommit:commit,frontendMeta:staticFrontend,backendMeta:meta,pm2Env:env})
  assert.equal(result.safe,true)
  const brokenFrontend = {...staticFrontend,frontendDeployedContracts:'unknown'}
  const denied = evaluateReleaseConsistency({canonicalCommit:commit,frontendMeta:brokenFrontend,backendMeta:meta,pm2Env:env})
  assert.equal(denied.safe,false)
  assert.ok(denied.findings.includes('FRONTEND_LIVE_CONTRACT_NOT_SEALED'))
  const brokenApi = {...meta,liveRouteContract:undefined,frontendDeployedContracts:'pass'}
  const deniedApi = evaluateReleaseConsistency({canonicalCommit:commit,frontendMeta:staticFrontend,backendMeta:brokenApi,pm2Env:env})
  assert.equal(deniedApi.safe,false)
  assert.ok(deniedApi.findings.includes('BACKEND_LIVE_CONTRACT_NOT_SEALED'))
})

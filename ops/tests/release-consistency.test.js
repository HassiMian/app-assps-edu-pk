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

test('governed Question Bank seeding uses distinct backend forward component and cannot bypass release ancestry',()=>{
  const candidate={...meta,
    commit:'b'.repeat(40),branch:'fix/paper-grade910-qbank-safe-intake-20261008',
    component:'backend-question-bank-seed-intake-safety',
    sourceBaseLiveCommit:commit,previousRelease:{commit},
  }
  const yes=evaluateReleaseConsistency({canonicalCommit:commit,frontendMeta:meta,
    backendMeta:candidate,pm2Env:env,backendForwardVerifier:()=>true})
  assert.equal(yes.safe,true)
  const no=evaluateReleaseConsistency({canonicalCommit:commit,frontendMeta:meta,
    backendMeta:candidate,pm2Env:env,backendForwardVerifier:()=>false})
  assert.equal(no.safe,false)
  assert.ok(no.findings.some(s=>s.startsWith('BACKEND_COMMIT_DRIFT:')))

})

test('frontend-only forward release requires genuine branch and ancestry verifier', () => {
  const candidate = {
    ...meta,
    component: 'frontend-paper-studio-ux-hardening',
    commit: 'b'.repeat(40),
    branch: 'feat/paper-phase2-release-guard-20261008',
    sourceBaseLiveCommit: commit,
    previousRelease: { commit },
  }
  const valid = evaluateReleaseConsistency({
    canonicalCommit: commit, frontendMeta: candidate, backendMeta: meta, pm2Env: env,
    frontendForwardVerifier: (base, head, branch, metadata) =>
      base === commit && head === candidate.commit && branch === candidate.branch &&
      metadata.sourceBaseLiveCommit === commit && metadata.previousRelease.commit === commit,
  })
  assert.equal(valid.safe, true)
  const rejected = evaluateReleaseConsistency({
    canonicalCommit: commit, frontendMeta: candidate, backendMeta: meta, pm2Env: env,
    frontendForwardVerifier: () => false,
  })
  assert.equal(rejected.safe, false)
  assert.ok(rejected.findings.some(x => x.startsWith('FRONTEND_BRANCH_DRIFT:')))
  const missingBase = evaluateReleaseConsistency({
    canonicalCommit: commit, frontendMeta: { ...candidate, sourceBaseLiveCommit: 'bad' },
    backendMeta: meta, pm2Env: env, frontendForwardVerifier: () => true,
  })
  assert.equal(missingBase.safe, false)
})

test('independent concurrent backend and frontend forwards preserve shared canonical ancestry', () => {
  const backendCommit = 'b'.repeat(40)
  const frontendCommit = 'c'.repeat(40)
  const backend = {
    ...meta, commit: backendCommit, branch: 'fix/paper-grade910-qbank-safe-intake-20261008',
    component: 'backend-question-bank-seed-intake-safety',
    sourceBaseLiveCommit: commit, previousRelease: { commit },
  }
  const frontend = {
    ...meta, commit: frontendCommit, branch: 'feat/phase2-paper-safe-forward-0544378',
    component: 'frontend-paper-studio-ux-hardening',
    sourceBaseLiveCommit: backendCommit, previousRelease: { commit },
  }
  const permitted = evaluateReleaseConsistency({
    canonicalCommit: commit, backendMeta: backend, frontendMeta: frontend, pm2Env:env,
    backendForwardVerifier: (base,head,branch) => base===commit && head===backendCommit && branch===backend.branch,
    frontendForwardVerifier: (base,head,branch,details,liveBackend) =>
      base===commit && head===frontendCommit && branch===frontend.branch &&
      details.sourceBaseLiveCommit===backendCommit && liveBackend===backendCommit,
  })
  assert.equal(permitted.safe,true)
  const reverse = evaluateReleaseConsistency({
    canonicalCommit: commit, backendMeta: backend, frontendMeta:{...frontend,sourceBaseLiveCommit:commit},pm2Env:env,
    backendForwardVerifier:()=>true,
    frontendForwardVerifier: (_base,_head,_branch,details,liveBackend)=>details.sourceBaseLiveCommit===liveBackend,
  })
  assert.equal(reverse.safe,false)
  assert.ok(reverse.findings.some(f=>f.startsWith('FRONTEND_COMMIT_DRIFT:')))
})

test('sequential frontend-only promotions retain their previous live release identity', () => {
  const priorLiveFrontend='d'.repeat(40)
  const nextFrontend={
    ...meta, commit:'e'.repeat(40),branch:'feat/paper-phase3-teacher-delivery-20261008',
    component:'frontend-paper-studio-ux-hardening',
    previousRelease:{commit:priorLiveFrontend},
    sourceBaseLiveCommit:'b'.repeat(40),
  }
  const backend={
    ...meta, commit:'b'.repeat(40),branch:'fix/paper-grade910-qbank-safe-intake-20261008',
    component:'backend-question-bank-seed-intake-safety',
    sourceBaseLiveCommit:commit,previousRelease:{commit},
  }
  const accepted=evaluateReleaseConsistency({
    canonicalCommit:commit,frontendMeta:nextFrontend,backendMeta:backend,pm2Env:env,
    backendForwardVerifier:()=>true,
    frontendForwardVerifier:(base,head,branch,item,backendHead)=>
      base===commit && head===nextFrontend.commit && branch===nextFrontend.branch &&
      item.previousRelease.commit===priorLiveFrontend && item.sourceBaseLiveCommit===backendHead,
  })
  assert.equal(accepted.safe,true)
  const rejected=evaluateReleaseConsistency({
    canonicalCommit:commit,frontendMeta:{...nextFrontend,sourceBaseLiveCommit:commit},
    backendMeta:backend,pm2Env:env,
    backendForwardVerifier:()=>true,
    frontendForwardVerifier:(_base,_head,_branch,item,backendHead)=>item.sourceBaseLiveCommit===backendHead,
  })
  assert.equal(rejected.safe,false)
  assert.ok(rejected.findings.some(item=>item.startsWith('FRONTEND_COMMIT_DRIFT:')))
})

test('backend JARVIS atomicity release follows the already deployed Phase 3 frontend', () => {
  const backendOld='b'.repeat(40)
  const frontendHead='c'.repeat(40)
  const backendHead='d'.repeat(40)
  const frontend={...meta,commit:frontendHead,branch:'feat/paper-phase3-teacher-delivery-20261008',component:'frontend-paper-studio-ux-hardening',sourceBaseLiveCommit:backendOld,previousRelease:{commit:backendOld}}
  const backend={...meta,commit:backendHead,branch:'fix/jarvis-admission-atomicity-forward-20261008',component:'backend-jarvis-admission-atomicity',sourceBaseLiveCommit:frontendHead,previousRelease:{commit:backendOld}}
  const valid=evaluateReleaseConsistency({canonicalCommit:commit,frontendMeta:frontend,backendMeta:backend,pm2Env:env,
    frontendForwardVerifier:(base,head,branch,details,sourceBackend)=>base===commit&&head===frontendHead&&details.sourceBaseLiveCommit===sourceBackend&&sourceBackend===backendOld,
    backendForwardVerifier:(base,head,branch,details,sourceFrontend)=>base===commit&&head===backendHead&&details.sourceBaseLiveCommit===sourceFrontend&&sourceFrontend===frontendHead,
  })
  assert.equal(valid.safe,true,valid.findings.join(','))
  const bad=evaluateReleaseConsistency({canonicalCommit:commit,frontendMeta:frontend,backendMeta:{...backend,sourceBaseLiveCommit:backendOld},pm2Env:env,
    frontendForwardVerifier:()=>true,
    backendForwardVerifier:(_base,_head,_branch,details,sourceFrontend)=>details.sourceBaseLiveCommit===sourceFrontend,
  })
  assert.equal(bad.safe,false)
  assert.ok(bad.findings.some(v=>v.startsWith('BACKEND_COMMIT_DRIFT:')))
})

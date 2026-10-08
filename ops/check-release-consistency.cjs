const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const CANONICAL_BRANCH = 'release/saas-canonical-production-20261007'
const repoRoot = path.resolve(__dirname, '..')

function parseProcEnv(buffer) {
  const out = {}
  for (const entry of buffer.toString('utf8').split('\0')) {
    if (!entry || !entry.includes('=')) continue
    const index = entry.indexOf('=')
    out[entry.slice(0, index)] = entry.slice(index + 1)
  }
  return out
}

function evaluateReleaseConsistency({ canonicalCommit, canonicalBranch = CANONICAL_BRANCH, frontendMeta, backendMeta, pm2Env, backendForwardVerifier = () => false }) {
  const findings = []
  if (!/^[0-9a-f]{40}$/i.test(String(canonicalCommit || ''))) findings.push('CANONICAL_COMMIT_INVALID')
  for (const [name, meta] of [['FRONTEND', frontendMeta], ['BACKEND', backendMeta]]) {
    if (!meta || typeof meta !== 'object') {
      findings.push(`${name}_RELEASE_METADATA_MISSING`)
      continue
    }
    // A backend-only forward security release may legitimately advance beyond
    // the still-live frontend. It must preserve the canonical base and prove
    // ancestry AND exact remote branch identity. No heuristic SHA allowance.
    const verifiedBackendForward = name === 'BACKEND' &&
      meta.component === 'backend-paper-studio-rls-hardening' &&
      meta.sourceBaseLiveCommit === canonicalCommit &&
      meta.previousRelease?.commit === canonicalCommit &&
      backendForwardVerifier(canonicalCommit, meta.commit, meta.branch)
    if (meta.commit !== canonicalCommit && !verifiedBackendForward)
      findings.push(`${name}_COMMIT_DRIFT:${meta.commit || 'missing'}:${canonicalCommit}`)
    if (meta.branch !== canonicalBranch && !verifiedBackendForward)
      findings.push(`${name}_BRANCH_DRIFT:${meta.branch || 'missing'}:${canonicalBranch}`)
    if (meta.productionSmoke !== 'pass') findings.push(`${name}_PRODUCTION_SMOKE_NOT_SEALED`)
    if (meta.liveRouteContract !== 'pass') findings.push(`${name}_LIVE_CONTRACT_NOT_SEALED`)
    if (meta.protectedTemplates !== '6/6 unchanged') findings.push(`${name}_PROTECTED_TEMPLATE_SEAL_INVALID`)
  }

  const expectedEnv = {
    PORT: '5000',
    NODE_ENV: 'production',
    AUTO_MIGRATE_ON_BOOT: 'false',
    DB_RUNTIME_ROLE: 'apex_app_runtime',
  }
  for (const [key, expected] of Object.entries(expectedEnv)) {
    const actual = String(pm2Env?.[key] ?? '')
    if (actual !== expected) findings.push(`PM2_ENV_DRIFT:${key}:${actual || 'missing'}:${expected}`)
  }

  return { safe: findings.length === 0, findings }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function canonicalRemoteCommit() {
  const expected = String(process.env.ASSPS_EXPECTED_CANONICAL_COMMIT || '').trim()
  if (expected) return expected
  const output = execFileSync('git', ['-C', repoRoot, 'ls-remote', 'origin', `refs/heads/${CANONICAL_BRANCH}`], { encoding: 'utf8' }).trim()
  const commit = output.split(/\s+/)[0]
  if (!commit) throw new Error('Canonical remote branch could not be resolved.')
  return commit
}

function verifyBackendForward(base, head, branch) {
  if (!/^[0-9a-f]{40}$/i.test(String(head || ''))) return false
  if (branch !== 'fix/paper-v1-release-rls-reconcile-20261008') return false
  try {
    execFileSync('git', ['-C', repoRoot, 'merge-base', '--is-ancestor', base, head], {timeout:12000})
    const remote = execFileSync('git', ['-C', repoRoot, 'ls-remote', 'origin', 'refs/heads/' + branch], {encoding:'utf8',timeout:12000}).trim().split(/\s+/)[0]
    return remote === head
  } catch (_) { return false }
}

function remoteBackendChanges(liveFrontendCommit, remoteCanonicalCommit) {
  if (!/^[0-9a-f]{40}$/i.test(String(liveFrontendCommit || ''))) throw new Error('Invalid live frontend SHA')
  execFileSync('git', ['-C', repoRoot, 'merge-base', '--is-ancestor', liveFrontendCommit, remoteCanonicalCommit], {timeout:12000})
  return execFileSync('git', ['-C', repoRoot, 'diff', '--name-only', liveFrontendCommit, remoteCanonicalCommit, '--', 'al-siddique-backend/'],
    {encoding:'utf8',timeout:12000}).trim().split('\n').filter(Boolean)
}

function pm2Environment() {
  const output = execFileSync('pm2', ['pid', 'apex-backend'], { encoding: 'utf8' }).trim()
  const pid = output.split(/\s+/).filter(Boolean).at(-1)
  if (!pid || pid === '0') throw new Error('apex-backend PM2 process is not online.')
  return parseProcEnv(fs.readFileSync(`/proc/${pid}/environ`))
}

function main() {
  const remoteCanonicalCommit = canonicalRemoteCommit()
  const frontendMeta = readJson(process.env.ASSPS_FRONTEND_RELEASE_META || '/var/www/apex-os/release-meta.json')
  const backendMeta = readJson(process.env.ASSPS_BACKEND_RELEASE_META || '/var/www/apex-backend/release-meta.json')
  const pm2Env = pm2Environment()
  const isBackendOnlyForward = backendMeta?.component === 'backend-paper-studio-rls-hardening'
  const canonicalCommit = isBackendOnlyForward ? frontendMeta?.commit : remoteCanonicalCommit
  const extraFindings = []
  if (isBackendOnlyForward) {
    try {
      const backendChanges = remoteBackendChanges(canonicalCommit, remoteCanonicalCommit)
      if (backendChanges.length) extraFindings.push('UNDEPLOYED_CANONICAL_BACKEND_CHANGES:' + backendChanges.join(','))
    } catch (err) {
      extraFindings.push('REMOTE_CANONICAL_ANCESTRY_NOT_VERIFIED')
    }
  }
  const result = evaluateReleaseConsistency({ canonicalCommit, frontendMeta, backendMeta, pm2Env, backendForwardVerifier: verifyBackendForward })
  const findings = [...result.findings, ...extraFindings]
  console.log(JSON.stringify({ canonicalCommit, remoteCanonicalCommit, canonicalBranch: CANONICAL_BRANCH,
    componentForward:isBackendOnlyForward, safe:findings.length===0, findings }, null, 2))
  if (findings.length) process.exitCode = 1
}

if (require.main === module) main()
module.exports = { CANONICAL_BRANCH, parseProcEnv, evaluateReleaseConsistency, remoteBackendChanges }

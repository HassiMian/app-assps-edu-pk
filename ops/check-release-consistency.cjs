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

function evaluateReleaseConsistency({ canonicalCommit, canonicalBranch = CANONICAL_BRANCH, frontendMeta, backendMeta, pm2Env }) {
  const findings = []
  if (!/^[0-9a-f]{40}$/i.test(String(canonicalCommit || ''))) findings.push('CANONICAL_COMMIT_INVALID')
  for (const [name, meta] of [['FRONTEND', frontendMeta], ['BACKEND', backendMeta]]) {
    if (!meta || typeof meta !== 'object') {
      findings.push(`${name}_RELEASE_METADATA_MISSING`)
      continue
    }
    if (meta.commit !== canonicalCommit) findings.push(`${name}_COMMIT_DRIFT:${meta.commit || 'missing'}:${canonicalCommit}`)
    if (meta.branch !== canonicalBranch) findings.push(`${name}_BRANCH_DRIFT:${meta.branch || 'missing'}:${canonicalBranch}`)
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

function pm2Environment() {
  const output = execFileSync('pm2', ['pid', 'apex-backend'], { encoding: 'utf8' }).trim()
  const pid = output.split(/\s+/).filter(Boolean).at(-1)
  if (!pid || pid === '0') throw new Error('apex-backend PM2 process is not online.')
  return parseProcEnv(fs.readFileSync(`/proc/${pid}/environ`))
}

function main() {
  const canonicalCommit = canonicalRemoteCommit()
  const frontendMeta = readJson(process.env.ASSPS_FRONTEND_RELEASE_META || '/var/www/apex-os/release-meta.json')
  const backendMeta = readJson(process.env.ASSPS_BACKEND_RELEASE_META || '/var/www/apex-backend/release-meta.json')
  const pm2Env = pm2Environment()
  const result = evaluateReleaseConsistency({ canonicalCommit, frontendMeta, backendMeta, pm2Env })
  console.log(JSON.stringify({ canonicalCommit, canonicalBranch: CANONICAL_BRANCH, ...result }, null, 2))
  if (!result.safe) process.exitCode = 1
}

if (require.main === module) main()
module.exports = { CANONICAL_BRANCH, parseProcEnv, evaluateReleaseConsistency }

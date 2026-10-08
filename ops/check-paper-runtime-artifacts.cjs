/**
 * Read-only release gate: a declared Git commit cannot certify runtime files
 * unless the actual deployed backend bytes match that exact source tree.
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync } = require('node:child_process')

const FILES = [
  'src/config/database.js',
  'src/middleware/auth.js',
  'src/services/papers/paperVaultRevisionV6D.js',
]
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex') }
function compareArtifacts(sourceBackend, deployedBackend, files = FILES) {
  const findings = []
  for (const rel of files) {
    const src = path.join(sourceBackend, rel)
    const dst = path.join(deployedBackend, rel)
    if (!fs.existsSync(src)) { findings.push(`SOURCE_FILE_MISSING:${rel}`); continue }
    if (!fs.existsSync(dst)) { findings.push(`DEPLOYED_FILE_MISSING:${rel}`); continue }
    if (sha256(fs.readFileSync(src)) !== sha256(fs.readFileSync(dst))) {
      findings.push(`ARTIFACT_CONTENT_DRIFT:${rel}`)
    }
  }
  return findings
}
function compareReleaseMeta(sourceCommit, meta) {
  return meta?.commit === sourceCommit ? [] : ['BACKEND_RELEASE_COMMIT_DRIFT']
}
function main() {
  const repo = path.resolve(__dirname, '..')
  const live = process.env.ASSPS_BACKEND_ARTIFACT_ROOT || '/var/www/apex-backend'
  const sourceCommit = execFileSync('git', ['rev-parse','HEAD'], {cwd:repo,encoding:'utf8'}).trim()
  const meta = JSON.parse(fs.readFileSync(path.join(live,'release-meta.json'),'utf8'))
  const findings = [
    ...compareArtifacts(path.join(repo,'al-siddique-backend'),live),
    ...compareReleaseMeta(sourceCommit,meta),
  ]
  console.log(JSON.stringify({gate:'PAPER_RUNTIME_ARTIFACT_BYTES',sourceCommit,
    declaredCommit:meta.commit,verifiedFiles:FILES.length,safe:findings.length===0,findings},null,2))
  if (findings.length) process.exitCode = 2
}
if (require.main === module) main()
module.exports = {FILES, compareArtifacts, compareReleaseMeta}

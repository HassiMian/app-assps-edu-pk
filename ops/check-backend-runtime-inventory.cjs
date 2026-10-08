/**
 * Canonical backend inventory: every tracked runtime file must match the
 * installed artifact. A focused predeploy repair may declare exactly one
 * expected mismatch. Test files and environment templates are not runtime.
 */
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const PREFIX = 'al-siddique-backend/'
const EXPECTED_PATCH = 'src/services/papers/paperVaultRevisionV6D.js'

function inspectInventory(repo, installed, tracked, expectedDifferences = []) {
  const differences = []
  const missing = []
  let matching = 0
  for (const file of tracked) {
    if (!file.startsWith(PREFIX + 'src/')) continue
    const rel = file.slice(PREFIX.length)
    if (rel.startsWith('src/tests/') || rel.endsWith('.env.example') ||
        rel.endsWith('/.env') || rel.endsWith('.env')) continue
    const src = path.join(repo, file)
    const live = path.join(installed, rel)
    if (!fs.existsSync(src) || !fs.existsSync(live)) {
      missing.push(rel)
    } else if (!fs.readFileSync(src).equals(fs.readFileSync(live))) {
      differences.push(rel)
    } else matching++
  }
  const expected = [...new Set(expectedDifferences)].sort()
  const actual = [...new Set(differences)].sort()
  return {
    safe: missing.length === 0 && JSON.stringify(actual) === JSON.stringify(expected),
    matching, missing, differences: actual, expectedDifferences: expected,
  }
}

function main() {
  const repo = path.resolve(__dirname, '..')
  const installed = process.env.ASSPS_BACKEND_ARTIFACT_ROOT || '/var/www/apex-backend'
  const tracked = execFileSync('git', ['ls-files','-z','al-siddique-backend/src/'], {
    cwd:repo, encoding:'utf8',
  }).split('\0').filter(Boolean)
  const mode = process.argv[2] || 'postdeploy'
  if (!['predeploy','postdeploy'].includes(mode)) {
    throw Error('Expected predeploy or postdeploy')
  }
  const expected = mode === 'predeploy' ? [EXPECTED_PATCH] : []
  const result = inspectInventory(repo, installed, tracked, expected)
  console.log(JSON.stringify({gate:'FULL_BACKEND_SOURCE_ARTIFACT_INVENTORY',mode,...result}))
  if (!result.safe) process.exitCode = 2
}
if (require.main === module) main()
module.exports = { PREFIX, EXPECTED_PATCH, inspectInventory }

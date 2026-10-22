import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(here, '..')
const repoRoot = path.resolve(frontendRoot, '..')
const baselinePath = path.join(repoRoot, 'docs/template-baseline/TEMPLATE_BASELINE_SHA256_20261005.txt')

if (!fs.existsSync(baselinePath)) {
  console.error(`Protected-template baseline missing: ${baselinePath}`)
  process.exit(2)
}

const expected = new Map()
for (const line of fs.readFileSync(baselinePath, 'utf8').split(/\r?\n/)) {
  if (!line.trim()) continue
  const match = line.match(/^([a-f0-9]{64})\s+(.+)$/i)
  if (!match) continue
  expected.set(match[2].trim(), match[1].toLowerCase())
}

const changed = []
const missing = []
const amendments = []
const amendmentPath = path.join(repoRoot, 'docs/template-baseline/RESULT_CARD_AMENDMENT_20261022.json')
let amendment = null
if (fs.existsSync(amendmentPath)) {
  // A source-reconciliation attestation can pin one already-shipped historical
  // change, but cannot amend marks, disable the original baseline or allow a
  // second unrelated protected file to drift.
  amendment = JSON.parse(fs.readFileSync(amendmentPath, 'utf8'))
  if (amendment?.schema_version !== 1 ||
      amendment?.template_path !== 'al-siddique-frontend/src/Modules/examination/resultCardTemplates.jsx' ||
      amendment?.historical_approved_snapshot !== 'docs/template-baseline/history/resultCardTemplates.20261005.jsx' ||
      amendment?.historical_approved_sha256 !== '302b5f162689b2067a81073b98de53ffd38502cf2659c2a5757fe8d099c1c13c' ||
      amendment?.reconciled_sha256 !== 'cb76705cffecd8675f35ab6425b904374a44197a53779e403384a022fff7ee29' ||
      amendment?.previous_baseline_preserved !== true ||
      amendment?.official_print_result_acceptance !== 'NOT_CERTIFIED' ||
      amendment?.production_release_permission !== 'DENIED_UNTIL_AUTHENTICATED_PRINT_ACCEPTANCE') {
    throw new Error('Invalid or unreviewed result-card source reconciliation attestation.')
  }
  const original = path.join(repoRoot, amendment.historical_approved_snapshot)
  if (!fs.existsSync(original) || fs.lstatSync(original).isSymbolicLink() ||
      crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex') !== amendment.historical_approved_sha256) {
    throw new Error('Historic approved result-card source is absent or tampered.')
  }
}

for (const [relativeFromRepo, hash] of expected) {
  const absolute = path.join(repoRoot, relativeFromRepo)
  if (!fs.existsSync(absolute)) {
    missing.push(relativeFromRepo)
    continue
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')
  if (actual !== hash) {
    if (amendment && relativeFromRepo === amendment.template_path &&
        hash === amendment.historical_approved_sha256 && actual === amendment.reconciled_sha256) {
      amendments.push(relativeFromRepo)
    } else {
      changed.push({ file: relativeFromRepo, expected: hash, actual })
    }
  }
}

if (missing.length || changed.length) {
  console.error('PROTECTED TEMPLATE BASELINE CHANGED')
  for (const file of missing) console.error(`MISSING ${file}`)
  for (const item of changed) console.error(`CHANGED ${item.file}\n expected ${item.expected}\n actual   ${item.actual}`)
  console.error('Review is required. Do not silently redesign approved templates.')
  process.exit(1)
}

console.log(`PASS protected source hashes (${expected.size - amendments.length} unchanged, ${amendments.length} provenance-pinned amendment; authenticated print signoff NOT CERTIFIED)`)

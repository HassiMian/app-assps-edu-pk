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
for (const [relativeFromRepo, hash] of expected) {
  const absolute = path.join(repoRoot, relativeFromRepo)
  if (!fs.existsSync(absolute)) {
    missing.push(relativeFromRepo)
    continue
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')
  if (actual !== hash) changed.push({ file: relativeFromRepo, expected: hash, actual })
}

if (missing.length || changed.length) {
  console.error('PROTECTED TEMPLATE BASELINE CHANGED')
  for (const file of missing) console.error(`MISSING ${file}`)
  for (const item of changed) console.error(`CHANGED ${item.file}\n expected ${item.expected}\n actual   ${item.actual}`)
  console.error('Review is required. Do not silently redesign approved templates.')
  process.exit(1)
}

console.log(`PASS protected template integrity (${expected.size} files unchanged)`)

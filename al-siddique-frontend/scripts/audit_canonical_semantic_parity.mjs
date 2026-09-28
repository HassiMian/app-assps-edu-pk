import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditCanonicalSemanticParity } from '../src/Modules/Paper-Generator/PaperEditor/migration/auditCanonicalSemanticParity.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const v13Path = path.join(
  root,
  'src/Modules/Paper-Generator/seed-data/official-first-term-2026-v13.json'
)
const canonicalPath = path.join(
  root,
  'src/Modules/Paper-Generator/PaperEditor/migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json'
)

const v13 = JSON.parse(fs.readFileSync(v13Path, 'utf8'))
const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'))
const report = auditCanonicalSemanticParity(v13, canonical)

console.log(JSON.stringify(report, null, 2))
if (!report.ok) process.exitCode = 1

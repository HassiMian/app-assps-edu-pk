import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditCanonicalSemanticParity } from '../migration/auditCanonicalSemanticParity.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const v13 = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../seed-data/official-first-term-2026-v13.json'),
    'utf8'
  )
)
const canonical = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json'),
    'utf8'
  )
)

test('all 43 papers pass canonical semantic shadow parity', () => {
  const report = auditCanonicalSemanticParity(v13, canonical)
  assert.strictEqual(report.stats.papers, 43)
  assert.deepStrictEqual(report.issues, [])
  assert.strictEqual(report.ok, true)
})
test('heading-only academic sections are promoted instead of disappearing', () => {
  const report = auditCanonicalSemanticParity(v13, canonical)
  assert.ok(report.stats.headingOnlyAcademicSections > 0)
  assert.strictEqual(
    report.issues.some(issue => issue.code === 'ACADEMIC_SECTION_HAS_NO_ACADEMIC_NODE'),
    false
  )

  const bySourceId = new Map(
    canonical.documents.map(document => [document.sourceIdentity.sourcePaperId, document])
  )

  const essay = bySourceId
    .get('official-first-term-2026-class-2-english')
    .sections[6]
    .nodes[0]
  assert.strictEqual(essay.type, 'essay')
  assert.strictEqual(essay.stemText, 'Write an essay on "My Pet".')
  assert.match(essay.provenance.rawSourceSnapshot, /^Q7\./)

  const urduEssay = bySourceId
    .get('official-first-term-2026-class-2-urdu')
    .sections[7]
    .nodes[0]
  assert.strictEqual(urduEssay.type, 'essay')
  assert.strictEqual(urduEssay.stemText, 'مضمون "میرا اسکول" لکھیں۔')
  assert.match(urduEssay.provenance.rawSourceSnapshot, /^سوال نمبر 8:/)
})

test('MCQ prompts and option text stay byte-meaning equivalent to live parser', () => {
  const report = auditCanonicalSemanticParity(v13, canonical)
  assert.ok(report.stats.mcqSections > 0)
  const mcqIssues = report.issues.filter(issue =>
    ['MCQ_ROW_COUNT_MISMATCH', 'MCQ_PROMPT_MISMATCH', 'MCQ_OPTIONS_MISMATCH'].includes(issue.code)
  )
  assert.deepStrictEqual(mcqIssues, [])
})

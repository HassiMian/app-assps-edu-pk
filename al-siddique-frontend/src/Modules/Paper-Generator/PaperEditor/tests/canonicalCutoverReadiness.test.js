import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolvePaperRoute } from '../../resolvePaperRoute.js'
import {
  resolvePaperEditorRoute,
  isPristineOfficialV13Paper,
} from '../editorV2/canonicalRouteGuards.js'
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

test('Phase 17 readiness: canonical corpus is complete and semantically clean', () => {
  const report = auditCanonicalSemanticParity(v13, canonical)

  assert.strictEqual(v13.papers.length, 43)
  assert.strictEqual(canonical.documents.length, 43)
  assert.strictEqual(report.stats.sourceSections, 242)
  assert.strictEqual(report.stats.canonicalSections, 242)
  assert.strictEqual(report.stats.unknownPreservedNodes, 0)
  assert.deepStrictEqual(report.issues, [])
  assert.deepStrictEqual(report.warnings, [])

  for (const document of canonical.documents) {
    assert.strictEqual(document.schemaVersion, 3, document.id)
    assert.ok(document.id.startsWith('doc__'), document.id)
  }
})

test('Phase 17 readiness: default production route remains stable until explicit cutover', () => {
  for (const paper of v13.papers) {
    assert.strictEqual(resolvePaperRoute(paper), 'build', paper.id)
    assert.strictEqual(
      resolvePaperRoute(paper, 'word_editor'),
      'build',
      `${paper.id}: targetTab must not bypass default route`
    )
  }
})

test('Phase 17 readiness: explicit canary resolves all 43 pristine V13 papers to Canonical V2', () => {
  for (const paper of v13.papers) {
    assert.strictEqual(isPristineOfficialV13Paper(paper), true, paper.id)
    assert.strictEqual(
      resolvePaperRoute(paper, null, { officialCanonicalCanary: true }),
      'word_editor',
      paper.id
    )
    const decision = resolvePaperEditorRoute(paper)
    assert.strictEqual(decision.route, 'CANONICAL_V2', `${paper.id}: ${decision.reason}`)
    assert.strictEqual(decision.resolvedPaper?.schemaVersion, 3, paper.id)
  }
})

test('Phase 17 readiness: rollback/fallback remains safe for academic mutations', () => {
  const source = v13.papers.find(
    paper => paper.id === 'official-first-term-2026-class-5-english'
  )
  assert.ok(source)

  const modifiedContent = structuredClone(source)
  modifiedContent.selectedQuestions.official_section.questions[0].content += '\nUSER ACADEMIC EDIT'
  assert.strictEqual(isPristineOfficialV13Paper(modifiedContent), false)
  assert.strictEqual(resolvePaperEditorRoute(modifiedContent).route, 'LEGACY_CANVAS_V2')

  const modifiedMarks = structuredClone(source)
  modifiedMarks.config.totalMarks = Number(modifiedMarks.config.totalMarks || 0) + 1
  assert.strictEqual(isPristineOfficialV13Paper(modifiedMarks), false)
  assert.strictEqual(resolvePaperEditorRoute(modifiedMarks).route, 'LEGACY_CANVAS_V2')
})

test('Phase 17 readiness: operational schedule metadata remains canonical-safe', () => {
  const source = v13.papers.find(
    paper => paper.id === 'official-first-term-2026-class-1-countdown-mathematics'
  )
  assert.ok(source)

  const scheduled = structuredClone(source)
  scheduled.config.examDate = '2026-09-30'
  scheduled.config.timeAllowed = '2 Hours'

  assert.strictEqual(isPristineOfficialV13Paper(scheduled), true)
  const decision = resolvePaperEditorRoute(scheduled)
  assert.strictEqual(decision.route, 'CANONICAL_V2')
  assert.strictEqual(decision.resolvedPaper?.metadata?.examDate, '2026-09-30')
  assert.strictEqual(decision.resolvedPaper?.metadata?.timeAllowed, '2 Hours')
})

test('Phase 17 readiness: legacy rollback editor and protected routes still exist', () => {
  const legacyEditorPath = path.resolve(__dirname, '../PaperEditorMain.jsx')
  assert.strictEqual(fs.existsSync(legacyEditorPath), true)

  const policy = { officialCanonicalCanary: true }
  assert.strictEqual(
    resolvePaperRoute({
      id: 'official-first-term-2026-class-5-urdu',
      documentFormat: 'official-v12',
    }, null, policy),
    'build'
  )
  assert.strictEqual(
    resolvePaperRoute({ id: 'ey-starter-english-2026', classStage: 'starter' }, null, policy),
    'early_years'
  )
  assert.strictEqual(
    resolvePaperRoute({ id: 'custom-board', structureMode: 'board_pattern' }, null, policy),
    'board_pattern'
  )
})

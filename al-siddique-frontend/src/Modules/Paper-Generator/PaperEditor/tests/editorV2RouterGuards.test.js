// editorV2RouterGuards.test.js — Unit Tests for Canonical / Legacy Router Guards (Rules 24, 25, 26)
import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  isPristineOfficialV13Paper,
  resolvePaperEditorRoute,
} from '../editorV2/canonicalRouteGuards.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const corpusPath = path.resolve(__dirname, '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
const canonicalCorpus = JSON.parse(fs.readFileSync(corpusPath, 'utf-8')).documents

const v13DatasetPath = path.resolve(__dirname, '../../seed-data/official-first-term-2026-v13.json')
const v13Dataset = JSON.parse(fs.readFileSync(v13DatasetPath, 'utf-8'))

test('ROUTER A: Canonical document routes directly to CANONICAL_V2', () => {
  const canonicalDoc = canonicalCorpus[0]
  const decision = resolvePaperEditorRoute(canonicalDoc)

  assert.strictEqual(decision.route, 'CANONICAL_V2')
  assert.strictEqual(decision.resolvedPaper.id, canonicalDoc.id)
})

test('ROUTER B: Legacy Schema 2 canvas document routes to LEGACY_CANVAS_V2', () => {
  const legacyDoc = {
    schemaVersion: 2,
    id: 'paper_123',
    name: 'Old Exam',
    sections: [{ id: 'sec_1', questions: [] }],
  }
  const decision = resolvePaperEditorRoute(legacyDoc)

  assert.strictEqual(decision.route, 'LEGACY_CANVAS_V2')
})

test('ROUTER C: Null or empty payload routes safely to LEGACY_CANVAS_V2', () => {
  assert.strictEqual(resolvePaperEditorRoute(null).route, 'LEGACY_CANVAS_V2')
  assert.strictEqual(resolvePaperEditorRoute(undefined).route, 'LEGACY_CANVAS_V2')
  assert.strictEqual(resolvePaperEditorRoute({}).route, 'LEGACY_CANVAS_V2')
})

test('ROUTER D: V13 Dataset container routes to DIAGNOSTIC_DATASET (never direct editor)', () => {
  const decision = resolvePaperEditorRoute(v13Dataset)
  assert.strictEqual(decision.route, 'DIAGNOSTIC_DATASET')
})

test('ROUTER E: Pristine Official V13 Paper routes to CANONICAL_V2 via migration', () => {
  const pristinePaper = v13Dataset.papers[0]
  assert.ok(pristinePaper)
  assert.strictEqual(isPristineOfficialV13Paper(pristinePaper), true)

  const decision = resolvePaperEditorRoute(pristinePaper)
  assert.strictEqual(decision.route, 'CANONICAL_V2')
  assert.strictEqual(decision.resolvedPaper.format, 'assps-canonical-paper')
  assert.strictEqual(decision.resolvedPaper.documentModel, 'PaperDocumentV2')
  assert.strictEqual(decision.resolvedPaper.schemaVersion, 3)
})

test('ROUTER F: Academically Modified V13 Paper routes to LEGACY_CANVAS_V2 to preserve edits (Rule 25)', () => {
  const pristinePaper = v13Dataset.papers[0]
  const modifiedPaper = JSON.parse(JSON.stringify(pristinePaper))

  // Mutate academic question content
  modifiedPaper.official_section[0].content = 'User edited this question content in legacy editor.'
  assert.strictEqual(isPristineOfficialV13Paper(modifiedPaper), false)

  const decision = resolvePaperEditorRoute(modifiedPaper)
  assert.strictEqual(decision.route, 'LEGACY_CANVAS_V2', 'Modified V13 paper must NOT be overwritten by pristine canonical baseline')
  assert.strictEqual(decision.reason, 'MODIFIED_OR_CUSTOM_V13_PRESERVED_IN_LEGACY')
  assert.strictEqual(decision.resolvedPaper, modifiedPaper)
})

test('ROUTER G: Every individual academic mutation forces LEGACY route (Section 21)', () => {
  const pristinePaper = v13Dataset.papers[0]

  // Helper to assert modified paper routes to LEGACY_CANVAS_V2
  function assertForcesLegacy(mutator, label) {
    const paper = JSON.parse(JSON.stringify(pristinePaper))
    mutator(paper)
    const isPristine = isPristineOfficialV13Paper(paper)
    assert.strictEqual(isPristine, false, `Mutation '${label}' must fail pristine check`)
    const decision = resolvePaperEditorRoute(paper)
    assert.strictEqual(decision.route, 'LEGACY_CANVAS_V2', `Mutation '${label}' must route to LEGACY_CANVAS_V2`)
  }

  // 1. config.totalMarks changed
  assertForcesLegacy(p => { p.config.totalMarks = 999 }, 'config.totalMarks')

  // 2. config.subject changed
  assertForcesLegacy(p => { p.config.subject = 'Advanced Astrophysics' }, 'config.subject')

  // 3. config.language changed
  assertForcesLegacy(p => { p.config.language = 'arabic' }, 'config.language')

  // 4. config.paperCode changed
  assertForcesLegacy(p => { p.config.paperCode = 'CUSTOM-CODE-99' }, 'config.paperCode')

  // 5. section.medium changed
  assertForcesLegacy(p => { p.official_section[0].medium = 'english' }, 'section.medium')

  // 6. section.marks changed
  assertForcesLegacy(p => { p.official_section[0].marks = 25 }, 'section.marks')

  // 7. section.heading changed
  assertForcesLegacy(p => { p.official_section[0].heading = 'Custom Section Heading' }, 'section.heading')

  // 8. section.content changed
  assertForcesLegacy(p => { p.official_section[0].content = 'Different question stem body' }, 'section.content')

  // 9. section.textUrdu changed
  assertForcesLegacy(p => { p.official_section[0].textUrdu = 'تبدیل شدہ سوال' }, 'section.textUrdu')

  // 10. option content changed if options exist
  assertForcesLegacy(p => {
    p.official_section[0].options = [{ id: 'opt_1', text: 'Custom Option A' }]
  }, 'section.options')

  // 11. selectedQuestions official academic content changed
  assertForcesLegacy(p => {
    p.selectedQuestions = [{ id: 'sq_1', text: 'Custom Selected Question' }]
  }, 'selectedQuestions')
})

test('ROUTER H: All 43 pristine papers in V13 dataset pass pristine check and route to CANONICAL_V2', () => {
  for (const paper of v13Dataset.papers) {
    assert.strictEqual(isPristineOfficialV13Paper(paper), true, `Paper ${paper.id} must be pristine`)
    const decision = resolvePaperEditorRoute(paper)
    assert.strictEqual(decision.route, 'CANONICAL_V2', `Paper ${paper.id} must route to CANONICAL_V2`)
  }
})


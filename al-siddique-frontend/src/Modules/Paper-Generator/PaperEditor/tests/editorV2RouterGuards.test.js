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

test('ROUTER I: Real source shape assertion across all 43 V13 papers (Section 8)', () => {
  assert.strictEqual(v13Dataset.papers.length, 43, 'paperCount must be 43')

  for (const paper of v13Dataset.papers) {
    assert.ok(
      paper.selectedQuestions && typeof paper.selectedQuestions === 'object' && !Array.isArray(paper.selectedQuestions),
      `Paper '${paper.id}' selectedQuestions must be a non-array object`
    )
    assert.ok(
      paper.selectedQuestions.official_section && typeof paper.selectedQuestions.official_section === 'object',
      `Paper '${paper.id}' selectedQuestions.official_section must exist as an object`
    )
    assert.ok(
      Array.isArray(paper.selectedQuestions.official_section.questions),
      `Paper '${paper.id}' selectedQuestions.official_section.questions must be an array`
    )
    assert.ok(
      paper.selectedQuestions.official_section.questions.length > 0,
      `Paper '${paper.id}' selectedQuestions.official_section.questions must not be empty`
    )
  }
})

test('ROUTER J: Real-shape selectedQuestions content mutation forces LEGACY with official_section untouched (Section 6)', () => {
  const pristinePaper = v13Dataset.papers[0]
  const modifiedPaper = JSON.parse(JSON.stringify(pristinePaper))

  // official_section remains COMPLETELY UNCHANGED
  assert.deepStrictEqual(modifiedPaper.official_section, pristinePaper.official_section)

  // Modify ONLY selectedQuestions.official_section.questions[0].content
  modifiedPaper.selectedQuestions.official_section.questions[0].content = 'User modified question in selectedQuestions mirror only'

  assert.strictEqual(isPristineOfficialV13Paper(modifiedPaper), false, 'Modified selectedQuestions mirror must fail pristine check')

  const decision = resolvePaperEditorRoute(modifiedPaper)
  assert.strictEqual(
    decision.route,
    'LEGACY_CANVAS_V2',
    'Modified selectedQuestions mirror must route to LEGACY_CANVAS_V2 to protect user customization'
  )
  assert.strictEqual(decision.reason, 'MODIFIED_OR_CUSTOM_V13_PRESERVED_IN_LEGACY')
  assert.strictEqual(decision.resolvedPaper, modifiedPaper)
})

test('ROUTER K: Additional nested mirror tests with top-level official_section untouched (Section 7)', () => {
  const pristinePaper = v13Dataset.papers[0]

  function assertMirrorMutationForcesLegacy(mutator, label) {
    const paper = JSON.parse(JSON.stringify(pristinePaper))
    // Verify initial official_section parity
    assert.deepStrictEqual(paper.official_section, pristinePaper.official_section)

    mutator(paper)

    // Verify official_section was NOT mutated by the helper
    assert.deepStrictEqual(paper.official_section, pristinePaper.official_section, `official_section must remain untouched for '${label}'`)

    const isPristine = isPristineOfficialV13Paper(paper)
    assert.strictEqual(isPristine, false, `Mutation '${label}' in selectedQuestions must fail pristine check`)

    const decision = resolvePaperEditorRoute(paper)
    assert.strictEqual(
      decision.route,
      'LEGACY_CANVAS_V2',
      `Mutation '${label}' in selectedQuestions must route to LEGACY_CANVAS_V2`
    )
  }

  // A. selectedQuestions.official_section.questions[0].heading
  assertMirrorMutationForcesLegacy(p => {
    p.selectedQuestions.official_section.questions[0].heading = 'Custom Modified Heading'
  }, 'questions[0].heading')

  // B. selectedQuestions.official_section.questions[0].marks
  assertMirrorMutationForcesLegacy(p => {
    p.selectedQuestions.official_section.questions[0].marks = 99
  }, 'questions[0].marks')

  // C. selectedQuestions.official_section.questions[0].textUrdu
  assertMirrorMutationForcesLegacy(p => {
    p.selectedQuestions.official_section.questions[0].textUrdu = 'تبدیل شدہ سوال برائے مرر'
  }, 'questions[0].textUrdu')

  // D. selectedQuestions.official_section.questions reorder
  assertMirrorMutationForcesLegacy(p => {
    p.selectedQuestions.official_section.questions.reverse()
  }, 'questions reorder')

  // E. remove one nested question
  assertMirrorMutationForcesLegacy(p => {
    p.selectedQuestions.official_section.questions.pop()
  }, 'remove nested question')

  // F. add one nested question
  assertMirrorMutationForcesLegacy(p => {
    const clone = JSON.parse(JSON.stringify(p.selectedQuestions.official_section.questions[0]))
    clone.id = 'extra-nested-q-id'
    p.selectedQuestions.official_section.questions.push(clone)
  }, 'add nested question')

  // G. selectedQuestions.official_section.marks
  assertMirrorMutationForcesLegacy(p => {
    p.selectedQuestions.official_section.marks = 50
  }, 'official_section.marks')

  // H. nested option text/label mutation where options data exists
  assertMirrorMutationForcesLegacy(p => {
    p.selectedQuestions.official_section.questions[0].options = [
      { id: 'opt_1', label: 'A', text: 'Custom Option in Mirror' },
    ]
  }, 'nested options mutation')
})


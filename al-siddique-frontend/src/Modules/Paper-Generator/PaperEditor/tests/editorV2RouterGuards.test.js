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

function flattenCanonicalText(doc) {
  return (doc?.sections || [])
    .flatMap(section => [
      section.title,
      section.titleUrdu,
      ...(section.nodes || []).flatMap(node => [
        node.stemText,
        node.rawText,
        node.text,
        ...(node.options || []).map(option => option.text),
      ]),
    ])
    .filter(Boolean)
    .join(' | ')
}

test('ROUTER A: Canonical document routes directly to CANONICAL_V2', () => {
  const canonicalDoc = canonicalCorpus[0]
  const decision = resolvePaperEditorRoute(canonicalDoc)

  assert.strictEqual(decision.route, 'CANONICAL_V2')
  assert.strictEqual(decision.resolvedPaper.id, canonicalDoc.id)
})

test('ROUTER B: Legacy Schema 2 saved paper adapts to the same CANONICAL_V2 editor', () => {
  const legacyDoc = {
    schemaVersion: 2,
    id: 'paper_123',
    name: 'Old Exam',
    metadata: { subject: 'Islamiyat', classLevel: '7', language: 'urdu', totalMarks: 10 },
    sections: [{
      id: 'sec_1',
      type: 'mcq',
      title: 'درست جواب کا انتخاب کریں',
      totalMarks: 10,
      questions: [{
        id: 'q1',
        type: 'mcq',
        stemUrdu: 'نمونہ سوال؟',
        marks: 1,
        options: [
          { label: 'الف', textUrdu: 'پہلا' },
          { label: 'ب', textUrdu: 'دوسرا' },
        ],
      }],
    }],
  }
  const decision = resolvePaperEditorRoute(legacyDoc)

  assert.strictEqual(decision.route, 'CANONICAL_V2')
  assert.strictEqual(decision.reason, 'LEGACY_CANVAS_V2_ADAPTED_TO_UNIFIED_EDITOR')
  assert.strictEqual(decision.resolvedPaper.id, 'paper_123')
  assert.strictEqual(decision.resolvedPaper.metadata.subject, 'Islamiyat')
  assert.strictEqual(decision.resolvedPaper.metadata.direction, 'rtl')
  assert.strictEqual(decision.resolvedPaper.authority.authoritativePaperTotal, 10)
  assert.strictEqual(decision.resolvedPaper.sections[0].nodes[0].options[0].text, 'پہلا')
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

test('ROUTER F: Academically modified V13 content imports to Canonical without losing the edit', () => {
  const pristinePaper = v13Dataset.papers[0]
  const modifiedPaper = structuredClone(pristinePaper)
  modifiedPaper.official_section[0].content = 'USER EDIT SENTINEL: preserved official-section content'

  assert.strictEqual(isPristineOfficialV13Paper(modifiedPaper), false)
  const decision = resolvePaperEditorRoute(modifiedPaper)

  assert.strictEqual(decision.route, 'CANONICAL_V2')
  assert.strictEqual(decision.reason, 'MODIFIED_V13_IMPORTED_TO_CANONICAL')
  assert.ok(
    flattenCanonicalText(decision.resolvedPaper).includes('USER EDIT SENTINEL'),
    'Modified official-section content must survive canonical import'
  )
})

test('ROUTER G: Only losslessly mapped legacy mutations enter Canonical; unsupported mutations keep emergency fallback', () => {
  const pristinePaper = v13Dataset.papers[0]

  const canonicalCase = (mutator, verify, label) => {
    const paper = structuredClone(pristinePaper)
    mutator(paper)
    assert.strictEqual(isPristineOfficialV13Paper(paper), false, label + ' must fail pristine check')
    const decision = resolvePaperEditorRoute(paper)
    assert.strictEqual(decision.route, 'CANONICAL_V2', label + ' must import to Canonical')
    assert.strictEqual(decision.reason, 'MODIFIED_V13_IMPORTED_TO_CANONICAL')
    verify?.(decision.resolvedPaper)
  }

  canonicalCase(
    paper => { paper.config.totalMarks = 999 },
    doc => assert.strictEqual(doc.authority.authoritativePaperTotal, 999),
    'config.totalMarks'
  )
  canonicalCase(
    paper => { paper.config.subject = 'Advanced Astrophysics' },
    doc => assert.strictEqual(doc.metadata.subject, 'Advanced Astrophysics'),
    'config.subject'
  )
  canonicalCase(
    paper => { paper.config.paperCode = 'CUSTOM-CODE-99' },
    doc => assert.strictEqual(doc.metadata.paperCode, 'CUSTOM-CODE-99'),
    'config.paperCode'
  )
  canonicalCase(
    paper => { paper.official_section[0].marks = 25 },
    doc => assert.strictEqual(doc.sections[0].authoritativeSectionTotal, 25),
    'section.marks'
  )
  canonicalCase(
    paper => { paper.official_section[0].heading = 'Custom Section Heading Sentinel' },
    doc => assert.ok(flattenCanonicalText(doc).includes('Custom Section Heading Sentinel')),
    'section.heading'
  )
  canonicalCase(
    paper => { paper.official_section[0].content = 'Different question stem body sentinel' },
    doc => assert.ok(flattenCanonicalText(doc).includes('Different question stem body sentinel')),
    'section.content'
  )

  const legacyCase = (mutator, label) => {
    const paper = structuredClone(pristinePaper)
    mutator(paper)
    assert.strictEqual(isPristineOfficialV13Paper(paper), false, label + ' must fail pristine check')
    const decision = resolvePaperEditorRoute(paper)
    assert.strictEqual(
      decision.route,
      'LEGACY_CANVAS_V2',
      label + ' is not losslessly mapped and must retain emergency fallback'
    )
    assert.strictEqual(decision.reason, 'MODIFIED_V13_IMPORT_FAILED_SAFE_LEGACY_FALLBACK')
  }

  legacyCase(paper => { paper.config.language = 'arabic' }, 'unsupported config.language')
  legacyCase(paper => { paper.official_section[0].medium = 'english' }, 'section.medium')
  legacyCase(paper => { paper.official_section[0].textUrdu = 'تبدیل شدہ سوال' }, 'section.textUrdu')
  legacyCase(
    paper => { paper.official_section[0].options = [{ id: 'opt_1', text: 'Custom Option A' }] },
    'section.options'
  )
  legacyCase(
    paper => { paper.selectedQuestions = [{ id: 'sq_1', text: 'Malformed legacy mirror' }] },
    'malformed selectedQuestions'
  )
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

test('ROUTER J: selectedQuestions-only content mutation imports to Canonical and preserves the mirror edit', () => {
  const pristinePaper = v13Dataset.papers[0]
  const modifiedPaper = structuredClone(pristinePaper)
  modifiedPaper.selectedQuestions.official_section.questions[0].content =
    'MIRROR ONLY SENTINEL: preserve this user customization'

  assert.deepStrictEqual(modifiedPaper.official_section, pristinePaper.official_section)
  assert.strictEqual(isPristineOfficialV13Paper(modifiedPaper), false)

  const decision = resolvePaperEditorRoute(modifiedPaper)
  assert.strictEqual(decision.route, 'CANONICAL_V2')
  assert.strictEqual(decision.reason, 'MODIFIED_V13_IMPORTED_TO_CANONICAL')
  assert.ok(flattenCanonicalText(decision.resolvedPaper).includes('MIRROR ONLY SENTINEL'))
})

test('ROUTER K: mirror reorder/remove and mapped fields are preserved; ambiguous/unsupported edits fall back safely', () => {
  const pristinePaper = v13Dataset.papers[0]

  const run = (mutator) => {
    const paper = structuredClone(pristinePaper)
    mutator(paper)
    assert.deepStrictEqual(paper.official_section, pristinePaper.official_section)
    assert.strictEqual(isPristineOfficialV13Paper(paper), false)
    return resolvePaperEditorRoute(paper)
  }

  {
    const decision = run(paper => {
      paper.selectedQuestions.official_section.questions[0].heading = 'Mirror Heading Sentinel'
    })
    assert.strictEqual(decision.route, 'CANONICAL_V2')
    assert.ok(flattenCanonicalText(decision.resolvedPaper).includes('Mirror Heading Sentinel'))
  }

  {
    const decision = run(paper => {
      paper.selectedQuestions.official_section.questions[0].marks = 99
    })
    assert.strictEqual(decision.route, 'CANONICAL_V2')
    assert.strictEqual(decision.resolvedPaper.sections[0].authoritativeSectionTotal, 99)
  }

  {
    const original = pristinePaper.selectedQuestions.official_section.questions
    const decision = run(paper => {
      paper.selectedQuestions.official_section.questions.reverse()
    })
    assert.strictEqual(decision.route, 'CANONICAL_V2')
    assert.strictEqual(
      decision.resolvedPaper.sections[0].provenance.sourceSectionId,
      original[original.length - 1].id,
      'Mirror reorder must become canonical section order'
    )
  }

  {
    const decision = run(paper => {
      paper.selectedQuestions.official_section.questions.pop()
    })
    assert.strictEqual(decision.route, 'CANONICAL_V2')
    assert.strictEqual(
      decision.resolvedPaper.sections.length,
      pristinePaper.official_section.length - 1,
      'Mirror removal must remain removed after canonical import'
    )
  }

  const expectLegacy = (mutator, label) => {
    const decision = run(mutator)
    assert.strictEqual(decision.route, 'LEGACY_CANVAS_V2', label)
    assert.strictEqual(decision.reason, 'MODIFIED_V13_IMPORT_FAILED_SAFE_LEGACY_FALLBACK')
  }

  expectLegacy(
    paper => { paper.selectedQuestions.official_section.questions[0].textUrdu = 'تبدیل شدہ سوال برائے مرر' },
    'Unmapped textUrdu edit must not be discarded'
  )
  expectLegacy(
    paper => {
      const clone = structuredClone(paper.selectedQuestions.official_section.questions[0])
      clone.id = 'extra-nested-q-id'
      paper.selectedQuestions.official_section.questions.push(clone)
    },
    'New legacy section without normalization manifest must retain fallback'
  )
  expectLegacy(
    paper => { paper.selectedQuestions.official_section.marks = 50 },
    'Ambiguous container marks must retain fallback'
  )
  expectLegacy(
    paper => {
      paper.selectedQuestions.official_section.questions[0].options = [
        { id: 'opt_1', label: 'A', text: 'Custom Option in Mirror' },
      ]
    },
    'Legacy section.options mutation is not a lossless canonical source'
  )
})


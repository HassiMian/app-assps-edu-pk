// documentClassifier.test.js — Unit test suite for classifier and canonical schema validator
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  classifyPaperDocument,
  DOCUMENT_CLASSIFICATIONS,
} from '../migration/classifyPaperDocument.js'

import {
  CANONICAL_FORMAT,
  CANONICAL_DOCUMENT_MODEL,
  CANONICAL_SCHEMA_VERSION,
  DocumentLanguage,
  DocumentDirection,
  AttemptRule,
  AttemptRuleOrigin,
  PaperMarksStatus,
  PaperTotalOrigin,
  SectionMarksOrigin,
  CanonicalNodeType,
  LabelOrigin,
  FieldProvenanceOrigin,
  createCanonicalPaperDocument,
  createCanonicalSection,
  createMcqNode,
  createShortQuestionNode,
  createTrueFalseNode,
  createFillBlankNode,
  createMatchingColumnsNode,
  createGrammarTableNode,
  createVerticalMathNode,
  createUnknownPreservedNode,
  createScopeHeaderNode,
  createSectionBannerNode,
  validateCanonicalPaperDocument,
} from '../core/PaperDocumentV2.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const v13Path = path.resolve(__dirname, '../../seed-data/official-first-term-2026-v13.json')
const v13Dataset = JSON.parse(fs.readFileSync(v13Path, 'utf8'))

test('CLASSIFIER A: old schemaVersion 2 -> LEGACY_CANVAS_V2', () => {
  const legacyDoc = {
    schemaVersion: 2,
    id: 'legacy-paper-1',
    sections: [
      { id: 'sec-1', type: 'short', questions: [] },
    ],
  }
  assert.equal(classifyPaperDocument(legacyDoc), DOCUMENT_CLASSIFICATIONS.LEGACY_CANVAS_V2)
})

test('CLASSIFIER B: canonical discriminator triple -> CANONICAL_V2', () => {
  const canonicalDoc = {
    format: CANONICAL_FORMAT,
    documentModel: CANONICAL_DOCUMENT_MODEL,
    schemaVersion: 3,
    id: 'doc__sample',
    sections: [],
  }
  assert.equal(classifyPaperDocument(canonicalDoc), DOCUMENT_CLASSIFICATIONS.CANONICAL_V2)
})

test('CLASSIFIER C: schemaVersion 3 alone -> UNKNOWN', () => {
  const incompleteV3 = {
    schemaVersion: 3,
    id: 'incomplete-paper',
    sections: [],
  }
  assert.equal(classifyPaperDocument(incompleteV3), DOCUMENT_CLASSIFICATIONS.UNKNOWN)

  const missingModel = {
    format: 'assps-canonical-paper',
    schemaVersion: 3,
  }
  assert.equal(classifyPaperDocument(missingModel), DOCUMENT_CLASSIFICATIONS.UNKNOWN)
})

test('CLASSIFIER D: V13 individual paper -> OFFICIAL_V13_PAPER', () => {
  const paper0 = v13Dataset.papers[0]
  assert.equal(classifyPaperDocument(paper0), DOCUMENT_CLASSIFICATIONS.OFFICIAL_V13_PAPER)
})

test('CLASSIFIER E: V13 dataset container -> OFFICIAL_V13_DATASET', () => {
  assert.equal(classifyPaperDocument(v13Dataset), DOCUMENT_CLASSIFICATIONS.OFFICIAL_V13_DATASET)
})

test('CLASSIFIER F: V12 official paper MUST NOT classify as OFFICIAL_V13_PAPER', () => {
  // A historical V12 paper with official_section but documentFormat pts-native-v12
  const v12Paper = {
    id: 'historical-v12-paper',
    documentFormat: 'pts-native-v12',
    official_section: [{ id: 's1', heading: 'Section 1', content: 'content' }],
  }
  assert.notEqual(classifyPaperDocument(v12Paper), DOCUMENT_CLASSIFICATIONS.OFFICIAL_V13_PAPER)
  assert.equal(classifyPaperDocument(v12Paper), DOCUMENT_CLASSIFICATIONS.UNKNOWN)

  // Bare official_section without pts-native-v13 MUST NOT classify as OFFICIAL_V13_PAPER
  const bareSectionPaper = {
    id: 'bare-section-paper',
    official_section: [{ id: 's1', heading: 'Section 1', content: 'content' }],
  }
  assert.notEqual(classifyPaperDocument(bareSectionPaper), DOCUMENT_CLASSIFICATIONS.OFFICIAL_V13_PAPER)
  assert.equal(classifyPaperDocument(bareSectionPaper), DOCUMENT_CLASSIFICATIONS.UNKNOWN)
})

test('CLASSIFIER G: arbitrary object -> UNKNOWN', () => {
  assert.equal(classifyPaperDocument({}), DOCUMENT_CLASSIFICATIONS.UNKNOWN)
  assert.equal(classifyPaperDocument({ foo: 'bar', totalMarks: 50 }), DOCUMENT_CLASSIFICATIONS.UNKNOWN)
  assert.equal(classifyPaperDocument(null), DOCUMENT_CLASSIFICATIONS.UNKNOWN)
  assert.equal(classifyPaperDocument(undefined), DOCUMENT_CLASSIFICATIONS.UNKNOWN)
  assert.equal(classifyPaperDocument('string'), DOCUMENT_CLASSIFICATIONS.UNKNOWN)
})

test('VALIDATOR: Valid canonical document passes validation', () => {
  const doc = createCanonicalPaperDocument({
    id: 'doc__official-first-term-2026-class-1-urdu',
    metadata: {
      title: 'FIRST TERM EXAMINATION 2026',
      className: 'Class 1',
      subject: 'Urdu',
      language: DocumentLanguage.URDU,
      direction: DocumentDirection.RTL,
    },
    sections: [
      createCanonicalSection({
        id: 'sec__01',
        sectionIndex: 1,
        direction: DocumentDirection.RTL,
        sectionMarksOrigin: SectionMarksOrigin.TEACHER_EXPLICIT_SCALAR,
        storedLegacyMarksValue: 10,
        operationalSectionTotal: 10,
        authoritativeSectionTotal: 10,
        attemptRule: AttemptRule.ALL,
        attemptRuleOrigin: AttemptRuleOrigin.DETERMINISTIC_FROM_STRUCTURE,
        nodes: [
          createShortQuestionNode({
            id: 'sec__01__q01',
            direction: DocumentDirection.RTL,
            stemText: 'سوال نمبر 1: الفاظ کے معنی لکھیں۔',
            subparts: [
              {
                id: 'sec__01__q01__p01',
                label: '1',
                stemText: 'سورج',
                direction: DocumentDirection.RTL,
                rawSourceSnapshot: 'سورج',
                sourceSegmentIds: ['seg-1'],
              },
            ],
          }),
        ],
      }),
    ],
  })

  const result = validateCanonicalPaperDocument(doc)
  assert.equal(result.valid, true, `Errors: ${result.errors.join(', ')}`)
  assert.equal(result.errors.length, 0)
})

test('VALIDATOR: Malformed specialized nodes fail validation (BaseNode cannot bypass)', () => {
  // 1. MCQ without options
  const badMcqDoc = createCanonicalPaperDocument({
    id: 'doc__bad-mcq',
    sections: [
      createCanonicalSection({
        id: 'sec__1',
        nodes: [
          {
            id: 'node__mcq_no_opts',
            type: CanonicalNodeType.MCQ,
            direction: DocumentDirection.AUTO,
            stemText: 'Which one is correct?',
            // options omitted
          },
        ],
      }),
    ],
  })
  const resMcq = validateCanonicalPaperDocument(badMcqDoc)
  assert.equal(resMcq.valid, false)
  assert.ok(resMcq.errors.some(e => e.includes('options must be an array of at least 2 options')))

  // 2. Fill blank without segments
  const badFillDoc = createCanonicalPaperDocument({
    id: 'doc__bad-fill',
    sections: [
      createCanonicalSection({
        id: 'sec__1',
        nodes: [
          {
            id: 'node__fill_no_segments',
            type: CanonicalNodeType.FILL_BLANK,
            direction: DocumentDirection.AUTO,
            fullText: 'Fill in the blank.',
            rawSource: 'Fill in the blank.',
            // segments omitted
          },
        ],
      }),
    ],
  })
  const resFill = validateCanonicalPaperDocument(badFillDoc)
  assert.equal(resFill.valid, false)
  assert.ok(resFill.errors.some(e => e.includes('segments must be a non-empty array')))

  // 3. Matching columns without left/right arrays
  const badMatchDoc = createCanonicalPaperDocument({
    id: 'doc__bad-match',
    sections: [
      createCanonicalSection({
        id: 'sec__1',
        nodes: [
          {
            id: 'node__match_bad',
            type: CanonicalNodeType.MATCHING_COLUMNS,
            direction: DocumentDirection.AUTO,
            // leftItems / rightItems omitted
          },
        ],
      }),
    ],
  })
  const resMatch = validateCanonicalPaperDocument(badMatchDoc)
  assert.equal(resMatch.valid, false)
  assert.ok(resMatch.errors.some(e => e.includes('leftItems must be a non-empty array')))

  // 4. True/false without statement
  const badTfDoc = createCanonicalPaperDocument({
    id: 'doc__bad-tf',
    sections: [
      createCanonicalSection({
        id: 'sec__1',
        nodes: [
          {
            id: 'node__tf_no_statement',
            type: CanonicalNodeType.TRUE_FALSE,
            direction: DocumentDirection.AUTO,
            hasIndicatorBox: true,
            // statement omitted
          },
        ],
      }),
    ],
  })
  const resTf = validateCanonicalPaperDocument(badTfDoc)
  assert.equal(resTf.valid, false)
  assert.ok(resTf.errors.some(e => e.includes('statement must be a string')))

  // 5. Vertical math without operands
  const badMathDoc = createCanonicalPaperDocument({
    id: 'doc__bad-math',
    sections: [
      createCanonicalSection({
        id: 'sec__1',
        nodes: [
          {
            id: 'node__math_no_operands',
            type: CanonicalNodeType.VERTICAL_MATH,
            direction: DocumentDirection.AUTO,
            operator: '+',
            // operands omitted
          },
        ],
      }),
    ],
  })
  const resMath = validateCanonicalPaperDocument(badMathDoc)
  assert.equal(resMath.valid, false)
  assert.ok(resMath.errors.some(e => e.includes('operands must be an array of at least 2 operands')))

  // 6. Unknown preserved without rawText / source refs
  const badUnknownDoc = createCanonicalPaperDocument({
    id: 'doc__bad-unknown',
    sections: [
      createCanonicalSection({
        id: 'sec__1',
        nodes: [
          {
            id: 'node__unknown_empty',
            type: CanonicalNodeType.UNKNOWN_PRESERVED,
            direction: DocumentDirection.AUTO,
            // rawText omitted
            // provenance omitted
          },
        ],
      }),
    ],
  })
  const resUnknown = validateCanonicalPaperDocument(badUnknownDoc)
  assert.equal(resUnknown.valid, false)
  assert.ok(resUnknown.errors.some(e => e.includes('rawText must be a string')))
})

test('VALIDATOR: Direction "dual" MUST be rejected at all levels', () => {
  // Document level
  const docBadDir = createCanonicalPaperDocument({
    id: 'doc__bad-dir',
    metadata: { direction: 'dual' },
  })
  const resDoc = validateCanonicalPaperDocument(docBadDir)
  assert.equal(resDoc.valid, false)
  assert.ok(resDoc.errors.some(e => e.includes('direction MUST NOT be "dual"')))

  // Section level
  const secBadDir = createCanonicalPaperDocument({
    id: 'doc__sec-bad-dir',
    sections: [
      createCanonicalSection({
        id: 's1',
        direction: 'dual',
      }),
    ],
  })
  const resSec = validateCanonicalPaperDocument(secBadDir)
  assert.equal(resSec.valid, false)
  assert.ok(resSec.errors.some(e => e.includes('direction MUST NOT be "dual"')))

  // Node level
  const nodeBadDir = createCanonicalPaperDocument({
    id: 'doc__node-bad-dir',
    sections: [
      createCanonicalSection({
        id: 's1',
        nodes: [
          createShortQuestionNode({
            id: 'q1',
            direction: 'dual',
            stemText: 'Test',
          }),
        ],
      }),
    ],
  })
  const resNode = validateCanonicalPaperDocument(nodeBadDir)
  assert.equal(resNode.valid, false)
  assert.ok(resNode.errors.some(e => e.includes('direction MUST NOT be "dual"')))

  // Option level
  const optBadDir = createCanonicalPaperDocument({
    id: 'doc__opt-bad-dir',
    sections: [
      createCanonicalSection({
        id: 's1',
        nodes: [
          createMcqNode({
            id: 'q1',
            stemText: 'Choose one:',
            options: [
              { id: 'opt1', canonicalLabel: 'A', text: 'Option 1', direction: 'dual', labelOrigin: LabelOrigin.GENERATED_CANONICAL, isCorrect: null },
              { id: 'opt2', canonicalLabel: 'B', text: 'Option 2', direction: 'ltr', labelOrigin: LabelOrigin.GENERATED_CANONICAL, isCorrect: null },
            ],
          }),
        ],
      }),
    ],
  })
  const resOpt = validateCanonicalPaperDocument(optBadDir)
  assert.equal(resOpt.valid, false)
  assert.ok(resOpt.errors.some(e => e.includes('direction MUST NOT be "dual"')))
})

test('VALIDATOR: Duplicate IDs rejected', () => {
  const docDup = createCanonicalPaperDocument({
    id: 'doc__dup',
    sections: [
      createCanonicalSection({
        id: 'sec_1',
        nodes: [
          createShortQuestionNode({ id: 'node_dup', stemText: 'Q1' }),
        ],
      }),
      createCanonicalSection({
        id: 'sec_2',
        nodes: [
          createShortQuestionNode({ id: 'node_dup', stemText: 'Q2 with duplicate ID' }),
        ],
      }),
    ],
  })
  const res = validateCanonicalPaperDocument(docDup)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some(e => e.includes('Duplicate node id "node_dup"')))
})

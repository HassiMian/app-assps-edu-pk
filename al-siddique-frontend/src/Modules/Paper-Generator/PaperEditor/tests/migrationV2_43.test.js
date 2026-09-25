// migrationV2_43.test.js — 43-Paper Canonical V2 Verification Suite
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

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
  NodeMarksOrigin,
  VALID_NODE_MARKS_ORIGINS,
  ClassificationCertainty,
  VALID_CLASSIFICATION_CERTAINTIES,
  CoverageStatus,
  CanonicalNodeType,
  LabelOrigin,
  createCanonicalPaperDocument,
  createShortQuestionNode,
  validateCanonicalPaperDocument,
} from '../core/PaperDocumentV2.js'

import {
  generateCanonicalV2Corpus,
  migrateOfficialPaperToV2,
  stitchItemsToFullCoverage,
} from '../migration/migrateOfficialPaperToV2.js'

import {
  verifyFieldCoverageInvariants,
  verifyCanonicalCoverageHashes,
} from '../migration/sourceCoverage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const v12Path = path.resolve(__dirname, '../../seed-data/official-first-term-2026-v12.json')
const v13Path = path.resolve(__dirname, '../../seed-data/official-first-term-2026-v13.json')
const manifestPath = path.resolve(__dirname, '../migration/data/normalizationManifestV13.json')
const committedArtifactPath = path.resolve(
  __dirname,
  '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json'
)

const v13Buf = fs.readFileSync(v13Path)
const manifestBuf = fs.readFileSync(manifestPath)
const v13Dataset = JSON.parse(v13Buf.toString('utf8'))
const normalizationManifest = JSON.parse(manifestBuf.toString('utf8'))

const v13ByteSha256 = crypto.createHash('sha256').update(v13Buf).digest('hex')
const manifestByteSha256 = crypto.createHash('sha256').update(manifestBuf).digest('hex')

// Baseline immutable SHA values
const EXPECTED_V12_SHA = 'd8fe0c5529c26a557444dc41331f67b8699e93bf06bae442c40ac274edbfd8a3'
const EXPECTED_V13_SHA = '5e659e9ce9d8bba5003bfd4e1e54dceaeddec2aac7ce52a07adee7f165757214'
const EXPECTED_MANIFEST_SHA = 'f40cf8a5ae627ba32924f19dd6b9bc6172ed61d9b46654ff9084ae9e395095d4'

function canonicalStringify(obj, space = 2) {
  function sortKeys(value) {
    if (value === null || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map(sortKeys)
    const sorted = {}
    Object.keys(value)
      .sort()
      .forEach(k => {
        sorted[k] = sortKeys(value[k])
      })
    return sorted
  }
  return JSON.stringify(sortKeys(obj), null, space) + '\n'
}

const corpus = generateCanonicalV2Corpus(v13Dataset, normalizationManifest, {
  sourceDatasetByteSha256: v13ByteSha256,
  normalizationManifestByteSha256: manifestByteSha256,
})

test('TEST 39: 43-Paper Acceptance & Invariant Checks', () => {
  assert.equal(v13Dataset.papers.length, 43, 'Source must have 43 papers')
  assert.equal(normalizationManifest.papers.length, 43, 'Manifest must have 43 papers')
  assert.equal(corpus.documents.length, 43, 'Corpus must have 43 canonical documents')

  const docIds = new Set()
  let totalSections = 0

  for (const doc of corpus.documents) {
    assert.ok(doc.id.startsWith('doc__'), `Document ID ${doc.id} must start with doc__`)
    assert.ok(!docIds.has(doc.id), `Document ID ${doc.id} must be unique`)
    docIds.add(doc.id)

    assert.equal(doc.format, CANONICAL_FORMAT)
    assert.equal(doc.documentModel, CANONICAL_DOCUMENT_MODEL)
    assert.equal(doc.schemaVersion, CANONICAL_SCHEMA_VERSION)

    totalSections += doc.sections.length

    // Synchronous structural validation
    const res = validateCanonicalPaperDocument(doc)
    assert.equal(res.valid, true, `Validation failed for ${doc.id}: ${res.errors.join(', ')}`)
  }

  assert.equal(totalSections, 242, 'Total canonical sections must equal 242')
  assert.equal(docIds.size, 43, 'Must have exactly 43 unique document IDs')
})

test('TEST 38: 100% Gapless, Non-Overlapping Source Coverage across all 43 Papers', async () => {
  let totalCoverageSegments = 0

  for (let pIdx = 0; pIdx < corpus.documents.length; pIdx++) {
    const doc = corpus.documents[pIdx]
    const v13Paper = v13Dataset.papers[pIdx]
    assert.equal(doc.id, `doc__${v13Paper.id}`)

    // Verify hash integrity of all segments in doc
    const hashRes = await verifyCanonicalCoverageHashes(doc)
    assert.equal(hashRes.valid, true, `Hash verification failed in ${doc.id}: ${hashRes.errors.join(', ')}`)

    totalCoverageSegments += doc.sourceCoverageLedger.length

    for (let sIdx = 0; sIdx < v13Paper.official_section.length; sIdx++) {
      const sourceSec = v13Paper.official_section[sIdx]
      const canonicalSec = doc.sections[sIdx]

      const secHeading = typeof sourceSec.heading === 'string' ? sourceSec.heading : ''
      const secContent = typeof sourceSec.content === 'string' ? sourceSec.content : ''

      // Heading segments
      const hSegs = doc.sourceCoverageLedger.filter(
        seg => seg.sourceSectionId === sourceSec.id && seg.sourceField === 'heading'
      )
      const hCheck = verifyFieldCoverageInvariants(secHeading, hSegs)
      assert.equal(
        hCheck.valid,
        true,
        `Heading coverage error in ${sourceSec.id}: ${hCheck.errors.join(', ')}`
      )

      // Content segments
      const cSegs = doc.sourceCoverageLedger.filter(
        seg => seg.sourceSectionId === sourceSec.id && seg.sourceField === 'content'
      )
      const cCheck = verifyFieldCoverageInvariants(secContent, cSegs)
      assert.equal(
        cCheck.valid,
        true,
        `Content coverage error in ${sourceSec.id}: ${cCheck.errors.join(', ')}`
      )

      // Every segment must be referenced
      for (const seg of [...hSegs, ...cSegs]) {
        assert.ok(
          Array.isArray(seg.targetCanonicalIds) && seg.targetCanonicalIds.length > 0,
          `Segment ${seg.sourceSegmentId} must have targetCanonicalIds`
        )
        assert.notEqual(seg.coverageStatus, 'DROPPED', `Segment ${seg.sourceSegmentId} must not be DROPPED`)
      }
    }
  }

  assert.ok(totalCoverageSegments >= 1000, `Expected >= 1000 coverage segments, got ${totalCoverageSegments}`)
})

test('TEST 40: Benchmark Fixture Acceptance', () => {
  // 1. Class 1 Countdown Mathematics -> vertical math or rich fallback
  const c1Math = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-1-countdown-mathematics')
  assert.ok(c1Math, 'Class 1 Countdown document must exist')
  const vmNodes = c1Math.sections.flatMap(s => s.nodes).filter(n => n.type === CanonicalNodeType.VERTICAL_MATH || (n.type === CanonicalNodeType.RICH_TEXT && n.layoutSemantic === 'vertical-math-grid'))
  assert.ok(vmNodes.length > 0, 'Class 1 Countdown must preserve vertical math structure')

  // 2. Class 1 English -> table/list structure preserved
  const c1Eng = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-1-english')
  assert.ok(c1Eng, 'Class 1 English document must exist')
  assert.equal(c1Eng.sections.length, 5)

  // 3. Class 1 Science -> total 0 preserved, MCQ and True/False
  const c1Sci = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-1-science')
  assert.ok(c1Sci, 'Class 1 Science document must exist')
  assert.equal(c1Sci.authority.storedConfiguredTotal, 0)
  assert.equal(c1Sci.authority.paperTotalOrigin, PaperTotalOrigin.UNRESOLVED_ZERO)
  assert.equal(c1Sci.authority.authoritativePaperTotal, null)
  const c1SciTypes = new Set(c1Sci.sections.flatMap(s => s.nodes).map(n => n.type))
  assert.ok(c1SciTypes.has(CanonicalNodeType.MCQ), 'Class 1 Science must contain MCQ node')
  assert.ok(c1SciTypes.has(CanonicalNodeType.TRUE_FALSE), 'Class 1 Science must contain True/False node')

  // 4. Class 1 Islamiyat -> Urdu RTL, MCQ, matching, fill blank + word bank
  const c1Isl = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-1-islamiyat')
  assert.ok(c1Isl, 'Class 1 Islamiyat document must exist')
  assert.equal(c1Isl.metadata.direction, DocumentDirection.RTL)
  const c1IslTypes = new Set(c1Isl.sections.flatMap(s => s.nodes).map(n => n.type))
  assert.ok(c1IslTypes.has(CanonicalNodeType.MCQ), 'Class 1 Islamiyat must contain MCQ')
  assert.ok(c1IslTypes.has(CanonicalNodeType.MATCHING_COLUMNS), 'Class 1 Islamiyat must contain Matching Columns')
  assert.ok(c1IslTypes.has(CanonicalNodeType.FILL_BLANK), 'Class 1 Islamiyat must contain Fill Blank')
  const fillNode = c1Isl.sections.flatMap(s => s.nodes).find(n => n.type === CanonicalNodeType.FILL_BLANK)
  assert.ok(Array.isArray(fillNode.wordBank), 'Class 1 Islamiyat fill blank must have word bank')

  // 5. Class 3 Science -> matching, no row-pair answer invention
  const c3Sci = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-3-science')
  assert.ok(c3Sci, 'Class 3 Science document must exist')
  const matchNode = c3Sci.sections.flatMap(s => s.nodes).find(n => n.type === CanonicalNodeType.MATCHING_COLUMNS)
  assert.ok(matchNode, 'Class 3 Science must contain matching columns node')
  assert.equal(matchNode.correctMappings, null, 'Class 3 Science correctMappings must remain null')

  // 6. Class 4 Mathematics -> B1 formula semantics preserved
  const c4Math = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-4-mathematics')
  assert.ok(c4Math, 'Class 4 Mathematics document must exist')
  const c4Sec2 = c4Math.sections[1]
  assert.equal(c4Sec2.formula.rawFormula, '2×8=16')
  assert.equal(c4Sec2.formula.operandA, 2)
  assert.equal(c4Sec2.formula.operandB, 8)
  assert.equal(c4Sec2.formula.formulaTotal, 16)
  assert.equal(c4Sec2.formula.interpretedItemCount, 8)
  assert.equal(c4Sec2.formula.interpretedMarksPerItem, 2)
  assert.equal(c4Sec2.attemptRule, AttemptRule.ATTEMPT_ANY)
  assert.equal(c4Sec2.attemptCount, 8)

  // 7. Class 5 Islamiyat Version B -> unlabeled MCQ label provenance
  const c5IslB = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-5-islamiyat-version-b')
  assert.ok(c5IslB, 'Class 5 Islamiyat Version B document must exist')
  const c5Mcq = c5IslB.sections[0].nodes[0]
  assert.equal(c5Mcq.type, CanonicalNodeType.MCQ)
  assert.equal(c5Mcq.options[0].sourceLabel, null)
  assert.equal(c5Mcq.options[0].labelOrigin, LabelOrigin.GENERATED_CANONICAL)

  // 8. Class 6 Science -> actual count discrepancy retained
  const c6Sci = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-6-science')
  assert.ok(c6Sci, 'Class 6 Science document must exist')
  assert.equal(c6Sci.authority.flags.hasItemCountConflict, true)

  // 9. Class 6 Mathematics -> long attempt UNSPECIFIED
  const c6Math = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-6-mathematics')
  assert.ok(c6Math, 'Class 6 Mathematics document must exist')
  const c6LongSec = c6Math.sections.find(s => /Long/i.test(s.heading || ''))
  assert.equal(c6LongSec.attemptRule, AttemptRule.UNSPECIFIED)

  // 10. Class 8 Computer -> 3 item-level 10 Marks, section authority unresolved
  const c8Comp = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-8-computer')
  assert.ok(c8Comp, 'Class 8 Computer document must exist')
  const c8LongSec = c8Comp.sections.find(s => /Long/i.test(s.heading || ''))
  assert.equal(c8LongSec.authoritativeSectionTotal, null)
  assert.equal(c8LongSec.listedPotentialItemMarksTotal, 30)
  assert.equal(c8LongSec.sectionMarksOrigin, SectionMarksOrigin.NONE)

  // 11. Class 8 Mathematics -> provisional marks stay provisional
  const c8Math = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-8-mathematics')
  assert.ok(c8Math, 'Class 8 Mathematics document must exist')
  assert.equal(c8Math.authority.paperMarksStatus, PaperMarksStatus.PROVISIONAL_OR_RECONCILED)
  assert.equal(c8Math.authority.authoritativePaperTotal, null)
  assert.equal(c8Math.authority.flags.hasProvisionalMarks, true)

  // 12. Class 8 Tarjuma-tul-Quran -> Arabic/Urdu characters preserved
  const c8Quran = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-8-tarjuma-tul-quran')
  assert.ok(c8Quran, 'Class 8 Tarjuma-tul-Quran document must exist')
  assert.equal(c8Quran.metadata.language, DocumentLanguage.URDU)
  assert.ok(c8Quran.sections[0].nodes[0].stemText.includes('نجاشی'))
})

test('TEST 41: No Default-Invention Invariants', () => {
  for (const doc of corpus.documents) {
    const v13Paper = v13Dataset.papers.find(p => p.id === doc.id.replace('doc__', ''))
    const cfg = v13Paper.config || {}

    // Assert unstated metadata is null (not invented)
    if (!cfg.paperCode) assert.equal(doc.metadata.paperCode, null)
    if (!cfg.examType) assert.equal(doc.metadata.examType, null)
    if (!cfg.session) assert.equal(doc.metadata.session, null)
    if (!cfg.durationMinutes) assert.equal(doc.metadata.durationMinutes, null)
    if (!cfg.timeAllowed) assert.equal(doc.metadata.timeAllowed, null)
    if (!cfg.examDate) assert.equal(doc.metadata.examDate, null)
    if (!cfg.instructions) assert.equal(doc.metadata.generalInstructions, null)

    // Assert presentation fields default UNSET in B2
    assert.equal(doc.presentation.schoolName.origin, 'UNSET')
    assert.equal(doc.presentation.schoolName.value, null)
    assert.equal(doc.presentation.schoolAddress.origin, 'UNSET')
    assert.equal(doc.presentation.schoolAddress.value, null)
    assert.equal(doc.presentation.logoUrl.origin, 'UNSET')
    assert.equal(doc.presentation.logoUrl.value, null)

    // Assert no default node marks (1, 2, 5) invented for unmarked nodes
    for (const sec of doc.sections) {
      for (const node of sec.nodes) {
        if (node.type === CanonicalNodeType.SCOPE_HEADER || node.type === CanonicalNodeType.SECTION_BANNER) {
          assert.equal(node.operationalNodeMarks, null)
          assert.equal(node.authoritativeNodeMarks, null)
        }
      }
    }
  }
})

test('TEST 42: MCQ Label & Instructional Checkmark Safety', () => {
  for (const doc of corpus.documents) {
    for (const sec of doc.sections) {
      for (const node of sec.nodes) {
        if (node.type === CanonicalNodeType.MCQ) {
          assert.ok(Array.isArray(node.options) && node.options.length >= 2)
          for (const opt of node.options) {
            // Instructional ✓ in heading must not invent answer key
            assert.equal(opt.isCorrect, null, `MCQ option ${opt.id} in ${doc.id} must have isCorrect === null`)
            assert.ok(
              opt.labelOrigin === LabelOrigin.SOURCE || opt.labelOrigin === LabelOrigin.GENERATED_CANONICAL
            )
          }
        }
      }
    }
  }
})

test('TEST 43: Language & Direction Invariant ("dual" forbidden for direction)', () => {
  for (const doc of corpus.documents) {
    assert.notEqual(doc.metadata.direction, 'dual', `doc ${doc.id} metadata.direction cannot be dual`)
    for (const sec of doc.sections) {
      assert.notEqual(sec.direction, 'dual', `section ${sec.id} direction cannot be dual`)
      for (const node of sec.nodes) {
        assert.notEqual(node.direction, 'dual', `node ${node.id} direction cannot be dual`)
        if (node.type === CanonicalNodeType.MCQ) {
          for (const opt of node.options) {
            assert.notEqual(opt.direction, 'dual', `opt ${opt.id} direction cannot be dual`)
          }
        }
      }
    }
  }
})

test('TEST 44: Deterministic Byte-Identical Serialization & Committed Artifact Parity', () => {
  const corpus1 = generateCanonicalV2Corpus(v13Dataset, normalizationManifest, {
    sourceDatasetByteSha256: v13ByteSha256,
    normalizationManifestByteSha256: manifestByteSha256,
  })
  const corpus2 = generateCanonicalV2Corpus(v13Dataset, normalizationManifest, {
    sourceDatasetByteSha256: v13ByteSha256,
    normalizationManifestByteSha256: manifestByteSha256,
  })

  const str1 = canonicalStringify(corpus1, 2)
  const str2 = canonicalStringify(corpus2, 2)

  assert.equal(str1, str2, 'Corpus generation must be 100% byte-identical across runs')

  // Compare to committed artifact file
  const committedBytes = fs.readFileSync(committedArtifactPath, 'utf8')
  assert.equal(str1, committedBytes, 'Committed canonical artifact must match freshly generated corpus byte-for-byte')
})

test('TEST 45: Source Immutability (V12, V13, B1 Manifest SHA-256 unchanged)', () => {
  const currentV12Buf = fs.readFileSync(v12Path)
  const currentV13Buf = fs.readFileSync(v13Path)
  const currentManifestBuf = fs.readFileSync(manifestPath)

  const curV12Sha = crypto.createHash('sha256').update(currentV12Buf).digest('hex')
  const curV13Sha = crypto.createHash('sha256').update(currentV13Buf).digest('hex')
  const curManifestSha = crypto.createHash('sha256').update(currentManifestBuf).digest('hex')

  assert.equal(curV12Sha, EXPECTED_V12_SHA, 'V12 source file SHA-256 must remain identical')
  assert.equal(curV13Sha, EXPECTED_V13_SHA, 'V13 source file SHA-256 must remain identical')
  assert.equal(curManifestSha, EXPECTED_MANIFEST_SHA, 'Normalization manifest SHA-256 must remain identical')
})

test('REGRESSION A: Class 8 Computer Q3 explicit item marks', () => {
  const c8Comp = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-8-computer')
  assert.ok(c8Comp, 'Class 8 Computer document must exist')
  const c8LongSec = c8Comp.sections.find(s => /Long/i.test(s.heading || ''))
  assert.ok(c8LongSec, 'Class 8 Computer Long questions section must exist')
  assert.equal(c8LongSec.authoritativeSectionTotal, null)
  assert.equal(c8LongSec.listedPotentialItemMarksTotal, 30)
  assert.equal(c8LongSec.attemptRule, AttemptRule.UNSPECIFIED)

  // 3 explicit question nodes
  const qNodes = c8LongSec.nodes.filter(n => n.type === CanonicalNodeType.LONG_QUESTION)
  assert.equal(qNodes.length, 3, 'Must have 3 long question nodes')
  for (const q of qNodes) {
    assert.equal(q.operationalNodeMarks, 10)
    assert.equal(q.authoritativeNodeMarks, 10)
    assert.equal(q.nodeMarksOrigin, NodeMarksOrigin.ITEM_LEVEL_EXPLICIT)
    assert.equal(q.marksEvidenceString, '(10 Marks)')
  }
})

test('REGRESSION B: Class 4 Math Q2 formula-derived node marks', () => {
  const c4Math = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-4-mathematics')
  assert.ok(c4Math, 'Class 4 Mathematics document must exist')
  const sec2 = c4Math.sections.find(s => /Q2\./i.test(s.heading || ''))
  assert.ok(sec2, 'Class 4 Math Q2 section must exist')
  assert.equal(sec2.formula.rawFormula, '2×8=16')
  assert.equal(sec2.formula.interpretationStatus, 'RESOLVED')
  assert.equal(sec2.formula.interpretedMarksPerItem, 2)

  const academicNodes = sec2.nodes.filter(n => n.type === CanonicalNodeType.SHORT_QUESTION)
  assert.equal(academicNodes.length, 10, 'Expected 10 candidate question nodes')
  for (const node of academicNodes) {
    assert.equal(node.operationalNodeMarks, 2)
    assert.equal(node.authoritativeNodeMarks, 2)
    assert.equal(node.nodeMarksOrigin, NodeMarksOrigin.DERIVED_FROM_RESOLVED_FORMULA)
  }
})

test('REGRESSION C: Class 5 Math Q4 formula-derived 6 marks/question', () => {
  const c5Math = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-5-mathematics')
  assert.ok(c5Math, 'Class 5 Mathematics document must exist')
  const sec4 = c5Math.sections.find(s => /Q4\./i.test(s.heading || ''))
  assert.ok(sec4, 'Class 5 Math Q4 section must exist')
  assert.equal(sec4.formula.rawFormula, '2×6=12')
  assert.equal(sec4.formula.interpretationStatus, 'RESOLVED')
  assert.equal(sec4.formula.interpretedMarksPerItem, 6)

  const academicNodes = sec4.nodes.filter(n => n.type === CanonicalNodeType.LONG_QUESTION || n.type === CanonicalNodeType.SHORT_QUESTION)
  assert.ok(academicNodes.length > 0, 'Class 5 Math Q4 must contain academic question nodes')
  for (const node of academicNodes) {
    assert.equal(node.operationalNodeMarks, 6)
    assert.equal(node.authoritativeNodeMarks, 6)
    assert.equal(node.nodeMarksOrigin, NodeMarksOrigin.DERIVED_FROM_RESOLVED_FORMULA)
  }
})

test('REGRESSION D: Class 6 Math Long unresolved formula does not invent node marks', () => {
  const c6Math = corpus.documents.find(d => d.id === 'doc__official-first-term-2026-class-6-mathematics')
  assert.ok(c6Math, 'Class 6 Mathematics document must exist')
  const longSec = c6Math.sections.find(s => /Long/i.test(s.heading || ''))
  assert.ok(longSec, 'Class 6 Math Long section must exist')
  assert.equal(longSec.formula.rawFormula, '10×2')
  assert.equal(longSec.formula.interpretationStatus, 'UNRESOLVED')
  assert.equal(longSec.formula.interpretedMarksPerItem, null)

  for (const node of longSec.nodes) {
    assert.equal(node.operationalNodeMarks, null)
    assert.equal(node.authoritativeNodeMarks, null)
    assert.equal(node.nodeMarksOrigin, NodeMarksOrigin.UNSTATED)
  }
})

test('REGRESSION E: All canonical nodes have valid nodeMarksOrigin', () => {
  let nodeCount = 0
  for (const doc of corpus.documents) {
    for (const sec of doc.sections) {
      for (const node of sec.nodes) {
        nodeCount++
        assert.ok(
          VALID_NODE_MARKS_ORIGINS.has(node.nodeMarksOrigin),
          `Node ${node.id} in ${doc.id} has invalid nodeMarksOrigin: "${node.nodeMarksOrigin}"`
        )
        if (node.type === CanonicalNodeType.SCOPE_HEADER || node.type === CanonicalNodeType.SECTION_BANNER || node.type === CanonicalNodeType.UNKNOWN_PRESERVED) {
          assert.equal(node.nodeMarksOrigin, NodeMarksOrigin.UNSTATED)
          assert.equal(node.operationalNodeMarks, null)
          assert.equal(node.authoritativeNodeMarks, null)
        }
      }
    }
  }
  assert.ok(nodeCount > 500, `Expected > 500 nodes across corpus, got ${nodeCount}`)
})

test('REGRESSION F, G, H: sourceIdentity contract and parity across all 43 docs', () => {
  for (let i = 0; i < corpus.documents.length; i++) {
    const doc = corpus.documents[i]
    const v13Paper = v13Dataset.papers[i]
    const manifestPaper = normalizationManifest.papers[i]

    // F. sourceIdentity exists and is object
    assert.ok(doc.sourceIdentity && typeof doc.sourceIdentity === 'object', `Doc ${doc.id} must have sourceIdentity object`)

    // G. sourcePaperId exactly matches original V13 ID
    assert.equal(doc.sourceIdentity.sourcePaperId, v13Paper.id)
    assert.equal(doc.sourceIdentity.sourceDatasetGeneration, 'v13')
    assert.equal(doc.sourceIdentity.sourceDatasetVersion, v13Dataset.version)
    assert.equal(doc.sourceIdentity.sourceDatasetByteSha256, v13ByteSha256)
    assert.equal(doc.sourceIdentity.sourceDatasetDeclaredSha256, v13Dataset.sourceSha256)
    assert.equal(doc.sourceIdentity.normalizationManifestByteSha256, manifestByteSha256)
    assert.equal(doc.sourceIdentity.normalizationManifestVersion, normalizationManifest.schemaVersion)

    // H. manifestPaperIndex parity 1..43
    assert.equal(doc.sourceIdentity.manifestPaperIndex, i + 1)
    assert.equal(doc.sourceIdentity.manifestPaperIndex, manifestPaper.paperIndex)
  }
})

test('REGRESSION I: Factory default language is UNKNOWN and direction is AUTO', () => {
  const defaultDoc = createCanonicalPaperDocument({})
  assert.equal(defaultDoc.metadata.language, DocumentLanguage.UNKNOWN)
  assert.equal(defaultDoc.metadata.direction, DocumentDirection.AUTO)
})

test('REGRESSION J & K: Meaningful unparsed gap creates unknown_preserved + RAW_PRESERVED without false STRUCTURED labeling', () => {
  // Test section stitching with an unparsed meaningful internal gap between two items
  const testContent = 'First question stem.\n\n[Unparsed non-banner teacher note here]\n\nSecond question stem.'
  const parsedItems = [
    {
      node: createShortQuestionNode({ id: 'item01', stemText: 'First question stem.' }),
      startOffset: 0,
      endOffset: 20,
      rawText: 'First question stem.',
    },
    {
      node: createShortQuestionNode({ id: 'item02', stemText: 'Second question stem.' }),
      startOffset: testContent.indexOf('Second question stem.'),
      endOffset: testContent.length,
      rawText: 'Second question stem.',
    },
  ]
  const globalNodeIds = new Set()
  const stitched = stitchItemsToFullCoverage(
    parsedItems,
    testContent,
    'test_sec',
    'source_sec',
    DocumentDirection.LTR,
    globalNodeIds,
    {}
  )
  assert.equal(stitched.nodes.length, 3, 'Must contain Item 1, gap node, and Item 2')

  const gapNode = stitched.nodes[1]
  assert.equal(gapNode.type, CanonicalNodeType.UNKNOWN_PRESERVED, 'Gap must produce unknown_preserved node')
  assert.equal(gapNode.nodeMarksOrigin, NodeMarksOrigin.UNSTATED)
  assert.equal(gapNode.operationalNodeMarks, null)
  assert.equal(gapNode.authoritativeNodeMarks, null)
  assert.equal(gapNode.provenance.classificationCertainty, ClassificationCertainty.UNKNOWN)
  assert.equal(gapNode.provenance.academicTextMutated, false)
  assert.ok(gapNode.rawText.includes('[Unparsed non-banner teacher note here]'))

  // Check ledger coverageStatus
  const gapSegment = stitched.segments.find(seg => seg.targetCanonicalIds.includes(gapNode.id))
  assert.ok(gapSegment, 'Gap segment must exist in ledger')
  assert.equal(gapSegment.coverageStatus, CoverageStatus.RAW_PRESERVED, 'Gap segment must have RAW_PRESERVED status')

  // Check that structured items are STRUCTURED
  assert.equal(stitched.segments[0].coverageStatus, CoverageStatus.STRUCTURED)
  assert.equal(stitched.segments[2].coverageStatus, CoverageStatus.STRUCTURED)

  // Invariant verification on test gap
  const cInvariants = verifyFieldCoverageInvariants(testContent, stitched.segments)
  assert.equal(cInvariants.valid, true)

  // Verify K across all corpus documents: no unknown_preserved has STRUCTURED and no structured has RAW_PRESERVED
  for (const doc of corpus.documents) {
    const nodeMap = new Map()
    for (const s of doc.sections) {
      for (const n of s.nodes) {
        nodeMap.set(n.id, n)
      }
    }
    for (const seg of doc.sourceCoverageLedger) {
      for (const targetId of seg.targetCanonicalIds) {
        const targetNode = nodeMap.get(targetId)
        if (targetNode) {
          if (targetNode.type === CanonicalNodeType.UNKNOWN_PRESERVED) {
            assert.equal(seg.coverageStatus, CoverageStatus.RAW_PRESERVED, `Node ${targetId} is unknown_preserved but ledger status is ${seg.coverageStatus}`)
          } else {
            assert.equal(seg.coverageStatus, CoverageStatus.STRUCTURED, `Node ${targetId} is structured but ledger status is ${seg.coverageStatus}`)
          }
        }
      }
    }
  }
})

test('REGRESSION L: All nodes have valid classificationCertainty and academicTextMutated === false', () => {
  for (const doc of corpus.documents) {
    for (const sec of doc.sections) {
      for (const node of sec.nodes) {
        assert.ok(
          VALID_CLASSIFICATION_CERTAINTIES.has(node.provenance.classificationCertainty),
          `Node ${node.id} in ${doc.id} has invalid classificationCertainty: "${node.provenance.classificationCertainty}"`
        )
        assert.equal(
          node.provenance.academicTextMutated,
          false,
          `Node ${node.id} in ${doc.id} must have academicTextMutated === false in B2`
        )
      }
    }
  }
})


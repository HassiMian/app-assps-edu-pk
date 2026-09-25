// normalization43.test.js — Automated test suite for authority-safe 43-paper normalization
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  normalizeOfficialPaper,
  generate43NormalizationManifest,
  sortObjectKeysRecursively,
} from '../migration/normalizeOfficialPaper.js'
import {
  parseMarksFormula,
  resolveFormulaRoles,
} from '../migration/marksEvidence.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const v13Path = path.resolve(__dirname, '../../seed-data/official-first-term-2026-v13.json')
const v12Path = path.resolve(__dirname, '../../seed-data/official-first-term-2026-v12.json')
const manifestPath = path.resolve(__dirname, '../migration/data/normalizationManifestV13.json')

const v13 = JSON.parse(fs.readFileSync(v13Path, 'utf8'))
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

test('TEST 1: Input count, manifest count, and unique IDs parity', () => {
  assert.equal(v13.papers.length, 43, 'Operational v13 must contain exactly 43 papers')
  assert.equal(manifest.paperCount, 43, 'Manifest must report paperCount = 43')
  assert.equal(manifest.papers.length, 43, 'Manifest must contain 43 paper entries')

  const ids = new Set(manifest.papers.map(p => p.paperId))
  assert.equal(ids.size, 43, 'All 43 paper IDs in manifest must be unique')

  for (let i = 0; i < 43; i++) {
    assert.equal(manifest.papers[i].paperIndex, i + 1, `Paper index at position ${i} must be ${i + 1}`)
    assert.equal(manifest.papers[i].paperId, v13.papers[i].id, `Paper ID at index ${i + 1} must match source v13`)
  }
})

test('TEST 2: All source sections accounted for without omission or drop', () => {
  let totalSourceSections = 0
  let totalManifestSections = 0

  for (let i = 0; i < 43; i++) {
    const rawSections = v13.papers[i].selectedQuestions?.official_section?.questions || []
    const manifestSections = manifest.papers[i].sections || []
    assert.equal(manifestSections.length, rawSections.length, `Paper ${i + 1} (${v13.papers[i].id}) section count mismatch`)
    totalSourceSections += rawSections.length
    totalManifestSections += manifestSections.length

    for (let s = 0; s < rawSections.length; s++) {
      assert.equal(manifestSections[s].sectionId, rawSections[s].id, `Section ID mismatch in paper ${i + 1}`)
      assert.equal(manifestSections[s].storedLegacyMarksValue, rawSections[s].marks ?? 0, `Legacy marks preserved in paper ${i + 1}`)
    }
  }

  assert.equal(totalManifestSections, totalSourceSections, 'Total section count in manifest must match source exactly')
  assert.ok(totalManifestSections > 200, 'All sections accounted for')
})

test('TEST 3: Deterministic Byte-Identical Manifest Regeneration', () => {
  const regenerated = generate43NormalizationManifest(v13)
  const regeneratedJson = JSON.stringify(regenerated, null, 2) + '\n'
  const diskJson = fs.readFileSync(manifestPath, 'utf8')

  assert.equal(regeneratedJson, diskJson, 'Regenerating manifest from v13 must yield byte-identical content')
})

test('TEST 4: Class 1 Science and Islamiyat totalMarks remain 0 / UNRESOLVED_ZERO', () => {
  const c1sci = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-1-science')
  assert.ok(c1sci)
  assert.equal(c1sci.storedConfiguredTotal, 0)
  assert.equal(c1sci.originalTeacherHeaderTotal, null)
  assert.equal(c1sci.authoritativePaperTotal, null)
  assert.equal(c1sci.paperTotalOrigin, 'UNRESOLVED_ZERO')
  assert.equal(c1sci.paperMarksStatus, 'FULLY_UNRESOLVED')

  const c1isl = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-1-islamiyat')
  assert.ok(c1isl)
  assert.equal(c1isl.storedConfiguredTotal, 0)
  assert.equal(c1isl.originalTeacherHeaderTotal, null)
  assert.equal(c1isl.authoritativePaperTotal, null)
  assert.equal(c1isl.paperTotalOrigin, 'UNRESOLVED_ZERO')
  assert.equal(c1isl.paperMarksStatus, 'FULLY_UNRESOLVED')
})

test('TEST 5: Class 3 English Q7 provenance — Inferred 10 must NOT become TEACHER_EXPLICIT', () => {
  const c3eng = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-3-english')
  assert.ok(c3eng)
  const q7 = c3eng.sections.find(s => s.sectionId === 'official-first-term-2026-class-3-english-section-7')
  assert.ok(q7)

  assert.equal(q7.storedLegacyMarksValue, 10)
  assert.equal(q7.operationalSectionTotal, 10)
  assert.equal(q7.authoritativeSectionTotal, null, 'Q7 authoritativeSectionTotal must be null because 10 was inferred')
  assert.equal(q7.sectionMarksOrigin, 'TRANSCRIBER_INFERRED', 'Must be TRANSCRIBER_INFERRED, NOT TEACHER_EXPLICIT')
  assert.notEqual(q7.sectionMarksOrigin, 'TEACHER_EXPLICIT_SCALAR')
  assert.equal(c3eng.hasProvisionalMarks, true)
  assert.equal(c3eng.paperMarksStatus, 'PROVISIONAL_OR_RECONCILED')
})

test('TEST 6: Class 4 Urdu Q6 provenance — Provisional 5 must NOT become TEACHER_EXPLICIT', () => {
  const c4urdu = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-4-urdu')
  assert.ok(c4urdu)
  const q6 = c4urdu.sections.find(s => s.sectionId === 'official-first-term-2026-class-4-urdu-section-6')
  assert.ok(q6)

  assert.equal(q6.storedLegacyMarksValue, 5)
  assert.equal(q6.operationalSectionTotal, 5)
  assert.equal(q6.authoritativeSectionTotal, null, 'Q6 authoritativeSectionTotal must be null because 5 was provisional')
  assert.equal(q6.sectionMarksOrigin, 'PROVISIONAL_RECONCILIATION')
  assert.notEqual(q6.sectionMarksOrigin, 'TEACHER_EXPLICIT_SCALAR')
  assert.equal(c4urdu.hasProvisionalMarks, true)
  assert.equal(c4urdu.paperMarksStatus, 'PROVISIONAL_OR_RECONCILED')
})

test('TEST 7: Class 4 Social Studies — Inferred total/sections preserve provisional origin', () => {
  const c4ss = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-4-social-studies')
  assert.ok(c4ss)

  assert.equal(c4ss.storedConfiguredTotal, 50)
  assert.equal(c4ss.originalTeacherHeaderTotal, null)
  assert.equal(c4ss.authoritativePaperTotal, null)
  assert.equal(c4ss.paperTotalOrigin, 'PROVISIONAL_INFERENCE')
  assert.equal(c4ss.hasProvisionalMarks, true)
  assert.equal(c4ss.paperMarksStatus, 'PROVISIONAL_OR_RECONCILED')

  for (const s of c4ss.sections) {
    assert.equal(s.sectionMarksOrigin, 'TRANSCRIBER_INFERRED')
    assert.equal(s.authoritativeSectionTotal, null)
    assert.equal(s.operationalSectionTotal, 10)
  }
})

test('TEST 8: Class 5 Social Studies — Five operational 10-mark sections must NOT become teacher-explicit', () => {
  const c5ss = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-5-social-studies')
  assert.ok(c5ss)

  assert.equal(c5ss.storedConfiguredTotal, 50)
  assert.equal(c5ss.originalTeacherHeaderTotal, null)
  assert.equal(c5ss.authoritativePaperTotal, null)
  assert.equal(c5ss.paperTotalOrigin, 'PROVISIONAL_INFERENCE')
  assert.equal(c5ss.hasProvisionalMarks, true)
  assert.equal(c5ss.paperMarksStatus, 'PROVISIONAL_OR_RECONCILED')

  for (const s of c5ss.sections) {
    assert.equal(s.sectionMarksOrigin, 'TRANSCRIBER_INFERRED')
    assert.equal(s.authoritativeSectionTotal, null)
    assert.notEqual(s.sectionMarksOrigin, 'TEACHER_EXPLICIT_SCALAR')
  }
})

test('TEST 9: Class 7 Science — Original header 20 preserved alongside operational 60', () => {
  const c7sci = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-7-science')
  assert.ok(c7sci)

  assert.equal(c7sci.originalTeacherHeaderTotal, 20, 'Original teacher top-line 20 must be preserved')
  assert.equal(c7sci.storedConfiguredTotal, 60, 'Operational total 60 must be preserved')
  assert.equal(c7sci.authoritativePaperTotal, null, 'Authoritative total is null due to header-section conflict')
  assert.equal(c7sci.paperTotalOrigin, 'CORRECTED_FROM_CONFLICTING_SOURCE_HEADER')
  assert.equal(c7sci.hasSourceHeaderConflict, true)
  assert.equal(c7sci.paperMarksStatus, 'SOURCE_TOTAL_CONFLICT')
})

test('TEST 10: Class 7 Social Studies — Original header 10 preserved alongside operational 50', () => {
  const c7ss = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-7-social-studies')
  assert.ok(c7ss)

  assert.equal(c7ss.originalTeacherHeaderTotal, 10, 'Original teacher top-line 10 must be preserved')
  assert.equal(c7ss.storedConfiguredTotal, 50, 'Operational total 50 must be preserved')
  assert.equal(c7ss.authoritativePaperTotal, null, 'Authoritative total is null due to header-section conflict')
  assert.equal(c7ss.paperTotalOrigin, 'CORRECTED_FROM_CONFLICTING_SOURCE_HEADER')
  assert.equal(c7ss.hasSourceHeaderConflict, true)
  assert.equal(c7ss.paperMarksStatus, 'SOURCE_TOTAL_CONFLICT')
})

test('TEST 11: Class 8 Social Studies — Provisional total 50 remains non-authoritative', () => {
  const c8ss = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-8-social-studies')
  assert.ok(c8ss)

  assert.equal(c8ss.storedConfiguredTotal, 50)
  assert.equal(c8ss.originalTeacherHeaderTotal, null)
  assert.equal(c8ss.authoritativePaperTotal, null)
  assert.equal(c8ss.paperTotalOrigin, 'PROVISIONAL_INFERENCE')
  assert.equal(c8ss.paperMarksStatus, 'PROVISIONAL_OR_RECONCILED')
})

test('TEST 12: Class 8 Mathematics — Operational 60 and Long 20 remain PROVISIONAL, NOT BALANCED_DETERMINISTIC', () => {
  const c8m = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-8-mathematics')
  assert.ok(c8m)

  assert.equal(c8m.storedConfiguredTotal, 60)
  assert.equal(c8m.originalTeacherHeaderTotal, null)
  assert.equal(c8m.authoritativePaperTotal, null)
  assert.equal(c8m.paperTotalOrigin, 'PROVISIONAL_INFERENCE')
  assert.equal(c8m.hasProvisionalMarks, true)
  assert.notEqual(c8m.paperMarksStatus, 'BALANCED_DETERMINISTIC', 'MUST NOT classify BALANCED_DETERMINISTIC')
  assert.equal(c8m.paperMarksStatus, 'PROVISIONAL_OR_RECONCILED')

  // Check Long Section 4
  const longSec = c8m.sections.find(s => s.sectionId === 'official-first-term-2026-class-8-mathematics-section-4')
  assert.ok(longSec)
  assert.equal(longSec.storedLegacyMarksValue, 20)
  assert.equal(longSec.operationalSectionTotal, 20)
  assert.equal(longSec.authoritativeSectionTotal, null, 'Long 20 was provisional, authoritative must be null')
  assert.equal(longSec.sectionMarksOrigin, 'PROVISIONAL_RECONCILIATION')
})

test('TEST 13: Class 8 English — Provisional 75 remains non-authoritative', () => {
  const c8eng = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-8-english')
  assert.ok(c8eng)

  assert.equal(c8eng.storedConfiguredTotal, 75)
  assert.equal(c8eng.originalTeacherHeaderTotal, null)
  assert.equal(c8eng.authoritativePaperTotal, null)
  assert.equal(c8eng.paperTotalOrigin, 'PROVISIONAL_INFERENCE')
  assert.equal(c8eng.paperMarksStatus, 'PROVISIONAL_OR_RECONCILED')
})

test('TEST 14: Class 8 Computer Q3 — Detects 3 item-level "10 Marks", UNSPECIFIED attempt rule', () => {
  const comp = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-8-computer')
  assert.ok(comp)
  const q3 = comp.sections.find(s => s.sectionId === 'official-first-term-2026-class-8-computer-section-3')
  assert.ok(q3)

  assert.equal(q3.explicitContentMarksEvidence, true, 'Must detect item-level marks in content')
  assert.equal(q3.listedPotentialItemMarksTotal, 30, 'Three 10-mark questions give 30 potential marks')
  assert.equal(q3.attemptRule, 'UNSPECIFIED', 'Attempt rule must be UNSPECIFIED since source gave no instruction')
  assert.equal(q3.authoritativeSectionTotal, null, 'Authoritative total must be null due to unresolved attempt rule')
  assert.equal(q3.storedLegacyMarksValue, 0)
  assert.equal(q3.operationalSectionTotal, 0)
  assert.equal(comp.hasUnresolvedAttemptRule, true)
})

test('TEST 15: Item-Count Conflict Benchmarks', () => {
  // Benchmark 1: Class 6 Science MCQs (10x1=10 but 9 items)
  const c6sci = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-6-science')
  const c6s2 = c6sci.sections[1]
  assert.equal(c6s2.actualItemCount, 9)
  assert.equal(c6s2.formulaExpectedItemCount, 10)
  assert.equal(c6s2.itemCountStatus, 'SOURCE_COUNT_MISMATCH')

  // Benchmark 2: Class 1 English Q2 (marked 10 but 8 items)
  const c1eng = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-1-english')
  const c1s2 = c1eng.sections[1]
  assert.equal(c1s2.actualItemCount, 8)
  assert.equal(c1s2.formulaExpectedItemCount, 10)
  assert.equal(c1s2.itemCountStatus, 'SOURCE_COUNT_MISMATCH')

  // Benchmark 3: Class 5 Islamiyat Version B Q4 (1x4=4 but 2 hadiths)
  const c5islB = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-5-islamiyat-version-b')
  const c5s4 = c5islB.sections[3]
  assert.equal(c5s4.actualItemCount, 2)
  assert.equal(c5s4.formulaExpectedItemCount, 1, 'Singular hadith wording establishes formulaExpectedItemCount = 1')
  assert.equal(c5s4.itemCountStatus, 'SOURCE_COUNT_MISMATCH')

  // Benchmark 4: Class 8 Mathematics Short (10x3=30 with 12 items; unresolved formula role)
  const c8m = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-8-mathematics')
  const c8s3 = c8m.sections[2]
  assert.equal(c8s3.actualItemCount, 12)
  assert.equal(c8s3.formulaExpectedItemCount, null, 'Unresolved formula role must not fabricate expected count')
  assert.equal(c8s3.itemCountStatus, 'UNKNOWN')
})

test('TEST 16: Exact 43-Paper Partition Verification', () => {
  const counts = {
    BALANCED_EXPLICIT: [],
    BALANCED_DETERMINISTIC: [],
    SOURCE_TOTAL_CONFLICT: [],
    HEADER_TOTAL_WITH_UNRESOLVED_SECTIONS: [],
    MIXED_EXPLICIT_AND_UNRESOLVED: [],
    PROVISIONAL_OR_RECONCILED: [],
    FULLY_UNRESOLVED: [],
  }

  for (const p of manifest.papers) {
    counts[p.paperMarksStatus].push(p.paperIndex)
  }

  // Exact expected counts
  assert.equal(counts.BALANCED_EXPLICIT.length, 7, 'BALANCED_EXPLICIT must have 7 papers')
  assert.deepEqual(counts.BALANCED_EXPLICIT, [7, 8, 19, 22, 23, 26, 29])

  assert.equal(counts.BALANCED_DETERMINISTIC.length, 3, 'BALANCED_DETERMINISTIC must have 3 papers')
  assert.deepEqual(counts.BALANCED_DETERMINISTIC, [1, 3, 18])

  assert.equal(counts.SOURCE_TOTAL_CONFLICT.length, 16, 'SOURCE_TOTAL_CONFLICT must have 16 papers')
  assert.deepEqual(counts.SOURCE_TOTAL_CONFLICT, [4, 5, 6, 9, 10, 11, 13, 14, 16, 24, 27, 30, 32, 33, 34, 38])

  assert.equal(counts.HEADER_TOTAL_WITH_UNRESOLVED_SECTIONS.length, 3, 'HEADER_TOTAL_WITH_UNRESOLVED_SECTIONS must have 3 papers')
  assert.deepEqual(counts.HEADER_TOTAL_WITH_UNRESOLVED_SECTIONS, [25, 31, 35])

  assert.equal(counts.MIXED_EXPLICIT_AND_UNRESOLVED.length, 3, 'MIXED_EXPLICIT_AND_UNRESOLVED must have 3 papers')
  assert.deepEqual(counts.MIXED_EXPLICIT_AND_UNRESOLVED, [28, 37, 39])

  assert.equal(counts.PROVISIONAL_OR_RECONCILED.length, 9, 'PROVISIONAL_OR_RECONCILED must have 9 papers')
  assert.deepEqual(counts.PROVISIONAL_OR_RECONCILED, [2, 12, 15, 17, 20, 21, 36, 40, 41])

  assert.equal(counts.FULLY_UNRESOLVED.length, 2, 'FULLY_UNRESOLVED must have 2 papers')
  assert.deepEqual(counts.FULLY_UNRESOLVED, [42, 43])

  // Total must sum to 43
  const total = Object.values(counts).reduce((sum, arr) => sum + arr.length, 0)
  assert.equal(total, 43, 'Total category counts must equal exactly 43')

  // Disjoint & continuous 1..43 check
  const allIndices = Object.values(counts).flat().sort((a, b) => a - b)
  assert.equal(allIndices.length, 43)
  for (let i = 0; i < 43; i++) {
    assert.equal(allIndices[i], i + 1, `Index at ${i} must be ${i + 1}`)
  }
})

test('TEST 17: Content Losslessness & Lexical Integrity', () => {
  for (let i = 0; i < 43; i++) {
    const rawPaper = v13.papers[i]
    const normPaper = manifest.papers[i]
    const rawSections = rawPaper.selectedQuestions?.official_section?.questions || []

    for (let s = 0; s < rawSections.length; s++) {
      const rawContent = rawSections[s].content || ''
      const snapshot = normPaper.sections[s].rawSourceSnapshot

      // Assert snapshot matches raw content
      assert.equal(snapshot, rawContent, `rawSourceSnapshot in paper ${i + 1} sec ${s + 1} must match source content`)

      // If raw had Urdu text, verify snapshot still contains it (no corruption)
      if (/[\u0600-\u06FF]/.test(rawContent)) {
        assert.ok(/[\u0600-\u06FF]/.test(snapshot), 'Urdu characters must be preserved')
      }

      // If raw had numeric digits, verify they are in snapshot
      const rawNumbers = rawContent.match(/\d+/g) || []
      const snapNumbers = snapshot.match(/\d+/g) || []
      assert.equal(snapNumbers.length, rawNumbers.length, 'All numeric tokens in content must be preserved')
    }
  }
})

test('TEST 18: Formula Role Resolution Benchmarks (Class 4 Math Q2, Class 5 Math Q2 & Q4, Class 7 Math Q3)', () => {
  // A. Class 4 Math Q2: 2×8=16 + Attempt any 8 -> itemCount 8, marksEach 2
  const c4m = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-4-mathematics')
  const c4s2 = c4m.sections[1]
  assert.equal(c4s2.attemptRule, 'ATTEMPT_ANY')
  assert.equal(c4s2.attemptCount, 8)
  assert.equal(c4s2.explicitHeadingFormula.rawFormula, '2×8=16')
  assert.equal(c4s2.explicitHeadingFormula.operandA, 2)
  assert.equal(c4s2.explicitHeadingFormula.operandB, 8)
  assert.equal(c4s2.explicitHeadingFormula.formulaTotal, 16)
  assert.equal(c4s2.explicitHeadingFormula.hasExplicitEqualsTotal, true)
  assert.equal(c4s2.explicitHeadingFormula.interpretedItemCount, 8, 'itemCount must be 8, NEVER 2')
  assert.equal(c4s2.explicitHeadingFormula.interpretedMarksPerItem, 2, 'marksPerItem must be 2, NEVER 8')
  assert.equal(c4s2.explicitHeadingFormula.interpretationStatus, 'RESOLVED')

  // Class 4 Math Q3: also 2×8=16 + Attempt any 8
  const c4s3 = c4m.sections[2]
  assert.equal(c4s3.explicitHeadingFormula.interpretedItemCount, 8)
  assert.equal(c4s3.explicitHeadingFormula.interpretedMarksPerItem, 2)
  assert.equal(c4s3.explicitHeadingFormula.interpretationStatus, 'RESOLVED')

  // B. Class 5 Math Q2: 8×2=16 + Attempt any 8 -> itemCount 8, marksEach 2
  const c5m = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-5-mathematics')
  const c5s2 = c5m.sections[1]
  assert.equal(c5s2.attemptRule, 'ATTEMPT_ANY')
  assert.equal(c5s2.attemptCount, 8)
  assert.equal(c5s2.explicitHeadingFormula.rawFormula, '8×2=16')
  assert.equal(c5s2.explicitHeadingFormula.interpretedItemCount, 8)
  assert.equal(c5s2.explicitHeadingFormula.interpretedMarksPerItem, 2)
  assert.equal(c5s2.explicitHeadingFormula.interpretationStatus, 'RESOLVED')

  // C. Class 5 Math Q4: 2×6=12 + Attempt any 2 -> itemCount 2, marksEach 6
  const c5s4 = c5m.sections[3]
  assert.equal(c5s4.attemptRule, 'ATTEMPT_ANY')
  assert.equal(c5s4.attemptCount, 2)
  assert.equal(c5s4.explicitHeadingFormula.rawFormula, '2×6=12')
  assert.equal(c5s4.explicitHeadingFormula.interpretedItemCount, 2)
  assert.equal(c5s4.explicitHeadingFormula.interpretedMarksPerItem, 6)
  assert.equal(c5s4.explicitHeadingFormula.interpretationStatus, 'RESOLVED')

  // D. Class 7 Math Q3: 7×2=14 + Attempt any 7 -> itemCount 7, marksEach 2
  const c7m = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-7-mathematics')
  const c7s3 = c7m.sections[2]
  assert.equal(c7s3.attemptRule, 'ATTEMPT_ANY')
  assert.equal(c7s3.attemptCount, 7)
  assert.equal(c7s3.explicitHeadingFormula.rawFormula, '7×2=14')
  assert.equal(c7s3.explicitHeadingFormula.interpretedItemCount, 7)
  assert.equal(c7s3.explicitHeadingFormula.interpretedMarksPerItem, 2)
  assert.equal(c7s3.explicitHeadingFormula.interpretationStatus, 'RESOLVED')
})

test('TEST 19: Class 6 Math Long and Class 8 Computer Q3 Conservative Attempt Semantics', () => {
  // E. Class 6 Math Long: must NOT default to ALL solely because items exist
  const c6m = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-6-mathematics')
  const longSec = c6m.sections[4]
  assert.equal(longSec.heading, 'Long Questions. (10×2)')
  assert.equal(longSec.actualItemCount, 3)
  assert.equal(longSec.attemptRule, 'UNSPECIFIED', 'Must NOT default to ALL solely because items exist')
  assert.equal(longSec.attemptCount, null)
  assert.notEqual(longSec.attemptRule, 'ALL')
  assert.equal(longSec.explicitHeadingFormula.formulaTotal, 20)
  assert.equal(longSec.explicitHeadingFormula.interpretationStatus, 'UNRESOLVED')
  assert.equal(longSec.explicitHeadingFormula.interpretedItemCount, null)
  assert.equal(longSec.explicitHeadingFormula.interpretedMarksPerItem, null)
  assert.equal(longSec.formulaExpectedItemCount, null)
  assert.equal(longSec.itemCountStatus, 'UNKNOWN')

  // F. Class 8 Computer Q3: remains UNSPECIFIED
  const c8comp = manifest.papers.find(p => p.paperId === 'official-first-term-2026-class-8-computer')
  const q3 = c8comp.sections[2]
  assert.equal(q3.attemptRule, 'UNSPECIFIED')
  assert.equal(q3.listedPotentialItemMarksTotal, 30)
  assert.equal(q3.authoritativeSectionTotal, null)
})

test('TEST 20: Spacer and Chapter/Scope Headings are NOT_APPLICABLE with 0 items', () => {
  // G. chapter/scope headings: NOT_APPLICABLE, actualItemCount: 0
  const spacerIds = [
    'official-first-term-2026-class-4-english',
    'official-first-term-2026-class-5-english',
    'official-first-term-2026-class-6-science',
    'official-first-term-2026-class-6-mathematics',
    'official-first-term-2026-class-6-urdu',
    'official-first-term-2026-class-6-english',
    'official-first-term-2026-class-8-mathematics',
  ]

  for (const pid of spacerIds) {
    const paper = manifest.papers.find(p => p.paperId === pid)
    assert.ok(paper, `Paper ${pid} must exist`)
    const sec1 = paper.sections[0]
    assert.equal(sec1.actualItemCount, 0, `${pid} S1 actualItemCount must be 0`)
    assert.equal(sec1.attemptRule, 'NOT_APPLICABLE', `${pid} S1 attemptRule must be NOT_APPLICABLE`)
    assert.equal(sec1.attemptCount, null, `${pid} S1 attemptCount must be null`)
  }
})

test('TEST 21: Formula Parser Preserves Raw Structure (operandA, operandB, hasExplicitEqualsTotal)', () => {
  // H. formula parser preserves: operandA, operandB, hasExplicitEqualsTotal
  const f1 = parseMarksFormula('Q2. Attempt any eight questions. (2×8=16)')
  assert.deepEqual(f1, {
    rawFormula: '2×8=16',
    operandA: 2,
    operandB: 8,
    formulaTotal: 16,
    hasExplicitEqualsTotal: true,
  })

  const f2 = parseMarksFormula('Long Questions. (10×2)')
  assert.deepEqual(f2, {
    rawFormula: '10×2',
    operandA: 10,
    operandB: 2,
    formulaTotal: 20,
    hasExplicitEqualsTotal: false,
  })

  const f3 = parseMarksFormula('Short Questions. (10×3=30)')
  assert.deepEqual(f3, {
    rawFormula: '10×3=30',
    operandA: 10,
    operandB: 3,
    formulaTotal: 30,
    hasExplicitEqualsTotal: true,
  })

  const f4 = parseMarksFormula('Heading with no formula')
  assert.equal(f4, null)
})

test('TEST 22: Unresolved Formula Roles Do Not Fabricate itemCount / marksPerItem', () => {
  // I. unresolved formula role: does not fabricate itemCount / marksPerItem
  const rawF = parseMarksFormula('Short Questions. (10×3=30)')
  // When actual items is 12 and no attempt rule exists, roles remain ambiguous
  const resolved = resolveFormulaRoles(rawF, 'Short Questions. (10×3=30)', 12, null)

  assert.equal(resolved.rawFormula, '10×3=30')
  assert.equal(resolved.operandA, 10)
  assert.equal(resolved.operandB, 3)
  assert.equal(resolved.formulaTotal, 30)
  assert.equal(resolved.hasExplicitEqualsTotal, true)
  assert.equal(resolved.interpretationStatus, 'UNRESOLVED')
  assert.equal(resolved.interpretedItemCount, null, 'Must NOT guess itemCount')
  assert.equal(resolved.interpretedMarksPerItem, null, 'Must NOT guess marksPerItem')
})

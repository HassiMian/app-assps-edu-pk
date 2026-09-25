// earlyYearsSourceData.test.js — Verifies Early Years 9-paper source truth & QA manifest preservation
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getEarlyYearsCorpus,
  getAllEarlyYearsPapers,
  getEarlyYearsPaperById,
  getEarlyYearsPapersByClass,
  getEarlyYearsQAManifest,
  getQAFindingsForPaper,
  validateEarlyYearsCorpus
} from '../earlyYears/data/earlyYearsSourceStore.js'

test('EY-SOURCE 1: Exactly 9 papers exist and all are SOURCE_PRESENT (0 SOURCE_MISSING)', () => {
  const papers = getAllEarlyYearsPapers()
  assert.equal(papers.length, 9, 'Expected exactly 9 Early Years papers')

  const presentCount = papers.filter((p) => p.status === 'SOURCE_PRESENT').length
  const missingCount = papers.filter((p) => p.status === 'SOURCE_MISSING').length

  assert.equal(presentCount, 9, 'All 9 papers must have status SOURCE_PRESENT')
  assert.equal(missingCount, 0, 'No papers may have status SOURCE_MISSING per Addendum')

  for (const paper of papers) {
    assert.equal(paper.printable, true, `Paper ${paper.id} must be printable`)
  }
})

test('EY-SOURCE 2: Distribution across classes (Starter, Mover, Flyer) and subjects (English, Urdu, Math)', () => {
  const starters = getEarlyYearsPapersByClass('starter')
  const movers = getEarlyYearsPapersByClass('mover')
  const flyers = getEarlyYearsPapersByClass('flyer')

  assert.equal(starters.length, 3, 'Expected 3 Starter papers')
  assert.equal(movers.length, 3, 'Expected 3 Mover papers')
  assert.equal(flyers.length, 3, 'Expected 3 Flyer papers')

  const expectedCombos = [
    { classStage: 'starter', subject: 'english' },
    { classStage: 'starter', subject: 'urdu' },
    { classStage: 'starter', subject: 'math' },
    { classStage: 'mover', subject: 'english' },
    { classStage: 'mover', subject: 'urdu' },
    { classStage: 'mover', subject: 'math' },
    { classStage: 'flyer', subject: 'english' },
    { classStage: 'flyer', subject: 'urdu' },
    { classStage: 'flyer', subject: 'math' }
  ]

  for (const combo of expectedCombos) {
    const found = getAllEarlyYearsPapers().find(
      (p) => p.classStage === combo.classStage && p.subject === combo.subject
    )
    assert.ok(found, `Expected paper for ${combo.classStage} ${combo.subject}`)
  }
})

test('EY-SOURCE 3: Starter Urdu preserves 50 header vs 80 question marks conflict without reconciliation', () => {
  const paper = getEarlyYearsPaperById('ey-starter-urdu-2026')
  assert.ok(paper, 'Starter Urdu paper must exist')

  assert.equal(paper.headerSource.totalMarks, 50, 'Header total must remain 50')
  assert.equal(paper.totalMarksSource.headerTotal, 50)
  assert.equal(paper.totalMarksSource.listedQuestionTotal, 80)
  assert.equal(paper.totalMarksSource.hasConflict, true)
  assert.equal(paper.totalMarksSource.conflictStatus, 'SOURCE_TOTAL_CONFLICT')

  // Sum of individual questions
  const sumOfMarks = paper.questions.reduce((acc, q) => acc + q.marks, 0)
  assert.equal(sumOfMarks, 80, 'Question marks must sum to 80 (20+20+10+10+20)')

  // Check QA flag is attached
  assert.ok(paper.qaFlags.includes('SOURCE_TOTAL_CONFLICT'))
  assert.ok(paper.qaFlags.includes('SUSPICIOUS_PICTURE_LETTER_OPTIONS'))
})

test('EY-SOURCE 4: Mover Urdu records authoritativeHeaderTotal = null and derivedPotentialTotal = 50', () => {
  const paper = getEarlyYearsPaperById('ey-mover-urdu-2026')
  assert.ok(paper, 'Mover Urdu paper must exist')

  assert.equal(paper.headerSource.totalMarks, null, 'Header total was omitted by teacher')
  assert.equal(paper.totalMarksSource.headerTotal, null)
  assert.equal(paper.totalMarksSource.derivedPotentialTotal, 50)
  assert.equal(paper.totalMarksSource.conflictStatus, 'AUTHORITATIVE_HEADER_TOTAL_ABSENT')

  const sumOfMarks = paper.questions.reduce((acc, q) => acc + q.marks, 0)
  assert.equal(sumOfMarks, 50, 'Question marks must sum to 50')

  // Q4 repeated right matching value
  const q4 = paper.questions.find((q) => q.questionNumber === 4)
  assert.ok(q4, 'Q4 must exist')
  const rightValues = q4.content.rightItems.map((i) => i.text)
  const bOccurrences = rightValues.filter((v) => v === 'ب').length
  assert.equal(bOccurrences, 2, 'Right column must preserve duplicate ب value')
})

test('EY-SOURCE 5: Flyer Urdu preserves 50 header vs 60 question marks conflict without reconciliation', () => {
  const paper = getEarlyYearsPaperById('ey-flyer-urdu-2026')
  assert.ok(paper, 'Flyer Urdu paper must exist')

  assert.equal(paper.headerSource.totalMarks, 50, 'Header total must remain 50')
  assert.equal(paper.totalMarksSource.headerTotal, 50)
  assert.equal(paper.totalMarksSource.listedQuestionTotal, 60)
  assert.equal(paper.totalMarksSource.hasConflict, true)
  assert.equal(paper.totalMarksSource.conflictStatus, 'SOURCE_TOTAL_CONFLICT')

  const sumOfMarks = paper.questions.reduce((acc, q) => acc + q.marks, 0)
  assert.equal(sumOfMarks, 60, 'Question marks must sum to 60 (10+20+10+10+5+5)')
  assert.ok(paper.qaFlags.includes('SOURCE_TOTAL_CONFLICT'))
})

test('EY-SOURCE 6: Starter English preserves source fidelity and Q5 ambiguity', () => {
  const paper = getEarlyYearsPaperById('ey-starter-english-2026')
  assert.ok(paper)
  assert.equal(paper.questions.length, 5)

  const q5 = paper.questions.find((q) => q.questionNumber === 5)
  assert.ok(q5)
  assert.equal(q5.content.rows.length, 4, 'Must have only 4 rows (A-D), did not invent E')
  assert.ok(q5.qaFlags.includes('SOURCE_ITEM_COUNT_MARKS_AMBIGUITY'))
})

test('EY-SOURCE 7: Starter Math preserves caterpillar marker and Q5 ambiguous heading', () => {
  const paper = getEarlyYearsPaperById('ey-starter-math-2026')
  assert.ok(paper)

  const q1 = paper.questions.find((q) => q.questionNumber === 1)
  assert.ok(q1)
  assert.equal(q1.content.sourceMarker, 'Drawing of cartipiler')
  assert.deepEqual(q1.content.numbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

  const q5 = paper.questions.find((q) => q.questionNumber === 5)
  assert.ok(q5)
  assert.equal(q5.instruction, 'Match the Same words.', 'Must not rename heading to Numbers')
  assert.ok(q5.qaFlags.includes('SOURCE_AMBIGUOUS'))
})

test('EY-SOURCE 8: Flyer English preserves duplicate choices and wording ambiguities', () => {
  const paper = getEarlyYearsPaperById('ey-flyer-english-2026')
  assert.ok(paper)

  const q1 = paper.questions.find((q) => q.questionNumber === 1)
  assert.deepEqual(q1.content.rows[0].choices, ['ball', 'ball', 'bill'], 'Must preserve duplicate ball/ball/bill')
  assert.ok(q1.qaFlags.includes('DUPLICATE_CANDIDATE'))

  const q2 = paper.questions.find((q) => q.questionNumber === 2)
  assert.ok(q2.content.items.includes('Ball _'), 'Must preserve Ball _ prompt')
  assert.ok(q2.qaFlags.includes('AMBIGUOUS_PROMPT'))

  const q3 = paper.questions.find((q) => q.questionNumber === 3)
  assert.equal(q3.instruction, 'Write small letters A a to S')
  assert.ok(q3.qaFlags.includes('WORDING_AMBIGUITY'))
})

test('EY-SOURCE 9: Flyer Math preserves semantic ambiguity on Q3', () => {
  const paper = getEarlyYearsPaperById('ey-flyer-math-2026')
  assert.ok(paper)

  const q3 = paper.questions.find((q) => q.questionNumber === 3)
  assert.equal(q3.instruction, 'Write english counting 1 to 10')
  assert.ok(q3.qaFlags.includes('SEMANTIC_AMBIGUITY'))
})

test('EY-SOURCE 10: validateEarlyYearsCorpus passes cleanly', () => {
  const result = validateEarlyYearsCorpus()
  assert.equal(result.valid, true, `Corpus validation failed: ${result.errors.join(', ')}`)
  assert.equal(result.errors.length, 0)
})

test('EY-SOURCE 11: QA Manifest accurately links findings to papers', () => {
  const manifest = getEarlyYearsQAManifest()
  assert.equal(manifest.summary.totalPapers, 9)
  assert.equal(manifest.summary.sourcePresentCount, 9)
  assert.equal(manifest.summary.sourceMissingCount, 0)
  assert.ok(manifest.findings.length >= 8)

  const starterUrduFindings = getQAFindingsForPaper('ey-starter-urdu-2026')
  assert.ok(starterUrduFindings.some((f) => f.status === 'SOURCE_TOTAL_CONFLICT'))
  assert.ok(starterUrduFindings.some((f) => f.status === 'SOURCE_AMBIGUOUS'))
})

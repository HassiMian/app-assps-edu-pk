'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '../..')
const DOCKET = require('../qbank/issue-grade910-ai-editorial-advisory-20261014.cjs').OUT
const PROCESSED = path.join(ROOT, 'docs/question-bank/ASSPS_GRADE910_PROCESSED_ACADEMIC_CORRECTIONS_20261014.json')
const PROCESSED_MD = path.join(ROOT, 'docs/question-bank/ASSPS_GRADE910_PROCESSED_ACADEMIC_CORRECTIONS_20261014.md')

test('processed docket preserves all 584 original revision hashes and sequences P1 then P2', () => {
  const orig = JSON.parse(fs.readFileSync(DOCKET, 'utf8'))
  const proc = JSON.parse(fs.readFileSync(PROCESSED, 'utf8'))

  assert.equal(proc.totalProcessedQuestions, 584)
  assert.equal(proc.p1ProcessedCount, 119)
  assert.equal(proc.p2ProcessedCount, 465)
  assert.equal(proc.corrections.length, 584)

  // Verify first 119 are P1
  for (let i = 0; i < 119; i++) {
    assert.equal(proc.corrections[i].reviewPriority, 'P1')
  }

  // Verify subsequent 465 are P2
  for (let i = 119; i < 584; i++) {
    assert.equal(proc.corrections[i].reviewPriority, 'P2')
  }

  // Verify every item matches its original revision hash from input docket
  const origMap = new Map(orig.rows.map(r => [r.originalId, r.originalRevisionSha256]))
  for (const item of proc.corrections) {
    assert.ok(origMap.has(item.originalId), `Unexpected question ID: ${item.originalId}`)
    assert.equal(item.originalRevisionSha256, origMap.get(item.originalId))
    assert.match(item.originalRevisionSha256, /^[0-9a-f]{64}$/)
    assert.match(item.correctedRevisionSha256, /^[0-9a-f]{64}$/)
  }
})

test('MCQ normalization produces explicit canonical A-D options and valid keys without cueing', () => {
  const proc = JSON.parse(fs.readFileSync(PROCESSED, 'utf8'))
  const p1Mcqs = proc.corrections.filter(r => r.signals.includes('MCQ_KEY_ID_NOT_EXPLICIT'))
  assert.equal(p1Mcqs.length, 24)

  for (const q of p1Mcqs) {
    const opts = q.proposedRevision.options
    assert.equal(opts.length, 4)
    assert.deepEqual(opts.map(o => o.id), ['A', 'B', 'C', 'D'])
    assert.ok('ABCD'.includes(q.proposedRevision.correctOptionId))
    assert.ok(opts.some(o => o.id === q.proposedRevision.correctOptionId))
  }

  const p2Mcqs = proc.corrections.filter(r => r.signals.includes('MCQ_OPTION_LENGTH_CUE_REVIEW'))
  assert.equal(p2Mcqs.length, 68)
  for (const q of p2Mcqs) {
    const opts = q.proposedRevision.options
    assert.equal(opts.length, 4)
    assert.ok('ABCD'.includes(q.proposedRevision.correctOptionId))
  }
})

test('numerical items contain step-by-step formula derivation and verified arithmetic', () => {
  const proc = JSON.parse(fs.readFileSync(PROCESSED, 'utf8'))
  const nums = proc.corrections.filter(r => r.signals.includes('NUMERICAL_WORKING_REVIEW'))
  assert.equal(nums.length, 61)

  for (const q of nums) {
    const deriv = q.proposedRevision.numericalDerivation
    assert.ok(deriv)
    assert.equal(deriv.recomputedPassed, true)
    assert.ok(Array.isArray(deriv.steps) && deriv.steps.length >= 3)
    assert.ok(deriv.finalAnswer)
  }
})

test('model answers and rubrics are expanded with multi-criteria scoring guides', () => {
  const proc = JSON.parse(fs.readFileSync(PROCESSED, 'utf8'))
  const p1Long = proc.corrections.filter(r => r.signals.includes('LONG_REFERENCE_EXTREMELY_BRIEF'))
  assert.equal(p1Long.length, 34)
  for (const q of p1Long) {
    assert.ok(q.proposedRevision.expandedModelAnswer.comprehensiveRubric.length >= 4)
  }

  const essays = proc.corrections.filter(r => r.signals.includes('ESSAY_REFERENCE_BRIEF'))
  assert.equal(essays.length, 8)
  for (const q of essays) {
    assert.ok(q.proposedRevision.markingRubric.criteria.length >= 4)
  }

  const p2Long = proc.corrections.filter(r => r.signals.includes('LONG_REFERENCE_BRIEF_RUBRIC_REVIEW'))
  assert.equal(p2Long.length, 389)
  for (const q of p2Long) {
    assert.ok(q.proposedRevision.structuredModelAnswer.markingGuide.length >= 3)
  }
})

test('fail-closed governance: all items marked AI_ADVISORY, zero human approvals fabricated, paper studio selectable false', () => {
  const proc = JSON.parse(fs.readFileSync(PROCESSED, 'utf8'))

  for (const q of proc.corrections) {
    assert.equal(q.pipelineState, 'AI_ADVISORY')
    assert.equal(q.governance.qualifiedTeacherReviewed, false)
    assert.equal(q.governance.qualifiedTeacherName, null)
    assert.equal(q.governance.principalAuthorized, false)
    assert.equal(q.governance.principalPersonalSignatureSha, null)
    assert.equal(q.governance.paperStudioSelectable, false)
    assert.equal(q.governance.publicationApproved, false)
    assert.equal(q.sourceIntegrity.printedPageEvidencePolicy, 'UNINVENTED_PENDING_PHYSICAL_COPY_INSPECTION')
  }

  const md = fs.readFileSync(PROCESSED_MD, 'utf8')
  assert.match(md, /AI Advisory/i)
  assert.match(md, /Total Flagged Questions Processed: \*\*584\*\*/)
  assert.match(md, /Priority P1 Items: \*\*119\*\*/)
  assert.match(md, /Priority P2 Items: \*\*465\*\*/)
  assert.match(md, /Paper Studio Selectable/i)
  assert.match(md, /Publication Approved/i)
})

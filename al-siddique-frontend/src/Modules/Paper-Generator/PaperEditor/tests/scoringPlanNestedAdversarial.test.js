import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveManualSectionScoring, buildManualScoringPlan } from '../core/ScoringPlan.js'

const leaf = marks => ({ mode: 'ALL', actualItemCount: 1, marksPerItem: marks })

function plan(section, configuredTotal) {
  const scoring = resolveManualSectionScoring(section)
  return { scoring, plan: buildManualScoringPlan([scoring], configuredTotal) }
}

test('nested OR computes the highest attainable alternative and accepts matching explicit marks', () => {
  const { scoring, plan: result } = plan({
    nestedChoiceMode: 'OR', maximumObtainableMarks: 5,
    nestedChoiceGroups: [leaf(4), leaf(5)],
  }, 5)
  assert.equal(scoring.maximumObtainableMarks, 5)
  assert.equal(scoring.listedPotentialItemMarksTotal, 9)
  assert.equal(result.balanced, true)
  assert.deepEqual(result.errors, [])
})

test('nested OR rejects impossible explicit maximum rather than falsely balancing header', () => {
  const { scoring, plan: result } = plan({
    nestedChoiceMode: 'OR', maximumObtainableMarks: 999,
    nestedChoiceGroups: [leaf(4), leaf(5)],
  }, 999)
  assert.equal(result.balanced, false)
  assert.ok(scoring.errors.some(e => e.includes('explicit maximum marks conflict')))
})

test('nested OR rejects attempting more than one alternative', () => {
  const { plan: result } = plan({
    nestedChoiceMode: 'OR', attemptCount: 2,
    nestedChoiceGroups: [leaf(4), leaf(5)],
  }, 9)
  assert.equal(result.balanced, false)
  assert.ok(result.errors.some(e => e.includes('OR choice must require exactly one')))
})

test('nested invalid child maximum propagates to parent even with matching header', () => {
  const { plan: result } = plan({
    nestedChoiceMode: 'ALL',
    nestedChoiceGroups: [
      { mode: 'OR', maximumObtainableMarks: 90, children: [leaf(4), leaf(5)] },
      { mode: 'ATTEMPT_ANY', attemptCount: 2, children: [leaf(2), leaf(2), leaf(2)] },
    ],
  }, 94)
  assert.equal(result.balanced, false)
  assert.ok(result.errors.some(e => e.includes('explicit maximum marks conflict')))
})

test('non-nested attempt any 10 of 12 preserves 20 obtainable versus 24 available', () => {
  const { plan: result } = plan({
    attemptRule: 'ATTEMPT_ANY', actualItemCount: 12, attemptCount: 10, marksPerItem: 2,
  }, 20)
  assert.equal(result.maximumObtainableMarks, 20)
  assert.equal(result.availableItemMarksTotal, 24)
  assert.equal(result.balanced, true)
})

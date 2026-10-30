import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveExamSession, validateExamCreation, nextAssessmentName } from './examCreationModel.js'

const valid = { name: 'Assessment 1', type: 'Assessment', class: 'All Classes', session: '2026-2027', total_marks: '25', pass_marks: '10' }

test('form with 25 total and 10 passing validates', () => {
  assert.equal(validateExamCreation(valid), '')
})
test('missing internal session never appears valid', () => {
  assert.match(validateExamCreation({ ...valid, session: '' }), /session/)
})
test('async session hydration resolves internal empty state', () => {
  assert.equal(resolveExamSession('', '2026-2027', []), '2026-2027')
  assert.equal(resolveExamSession('', '', [{session:'2026-27'}, {session:'2026-2027'}]), '2026-2027')
  assert.equal(resolveExamSession('2025-2026', '2026-2027', []), '2025-2026')
})
test('rejects missing marks and non-finite or coerced values', () => {
  for (const [total, passing] of [['',''],['25',''],['0','0'],['25','26'],['25','-1'],['Infinity','2'],['1e1','1'],['0x10','5']]) {
    assert.notEqual(validateExamCreation({...valid,total_marks:total,pass_marks:passing}), '', String([total,passing]))
  }
})
test('zero passing marks valid; fractional marks rejected by integer database schema', () => {
  assert.equal(validateExamCreation({...valid,total_marks:'12',pass_marks:'0'}), '')
  assert.notEqual(validateExamCreation({...valid,total_marks:'12.5',pass_marks:'0'}), '')
})
test('next assessment only increments standard names', () => {
  assert.equal(nextAssessmentName('Assessment 1'), 'Assessment 2')
  assert.equal(nextAssessmentName('Assessment 9'), 'Assessment 10')
  assert.equal(nextAssessmentName('First Term Exam'), '')
})

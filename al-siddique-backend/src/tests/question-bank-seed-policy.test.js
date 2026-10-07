const assert = require('assert')
const path = require('path')
const { normalizeRecord, signature, validate } = require('../scripts/seedQuestionBankFromJson')

const sample = {
  id: 'IX-CHEM-C01-M01', class_level: '9th', subject: 'Chemistry', medium: 'english',
  chapter_no: '1', chapter_name: 'States of Matter', topic_name: '1.1', category: 'mcq',
  question_text: 'Which statement is correct?', options: [{id:'A',text:'A'},{id:'B',text:'B'}],
  correct_option: 'A', answer: 'A', marks: 1, difficulty: 'easy'
}
const provisional = normalizeRecord(sample, 0, 'school-1', path.join('/tmp','seed.json'), true)
assert.equal(provisional.isApproved, false)
assert.equal(provisional.confidence, 60)
assert.equal(provisional.metadata.provisional_internal, true)
assert.equal(provisional.metadata.review_state, 'provisional_internal')
assert.equal(validate(provisional), '')
const approved = normalizeRecord(sample, 0, 'school-1', path.join('/tmp','seed.json'), false)
assert.equal(approved.isApproved, true)
assert.equal(approved.confidence, 100)
assert.equal(approved.metadata.provisional_internal, false)
assert.notEqual(signature(provisional), '')
console.log('question-bank-seed-policy: PASS')

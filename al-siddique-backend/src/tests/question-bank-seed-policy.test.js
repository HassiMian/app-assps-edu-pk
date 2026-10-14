const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { seedPolicy, seedEvidence, optionQuality } = require('../scripts/lib/seed-intake-policy.cjs')

const sample = {
  id:'IX-CHEM-C01-M01', class_level:'9th', subject:'Chemistry', chapter_no:'1',
  question_text:'Which statement is correct?', correct_option:'A', answer:'A',
}

test('Grade IX/X seed intake is always provisional and exact-school scoped', () => {
  const dry = seedPolicy(['--school-code','assps','--dry-run'])
  assert.deepEqual(dry, { schoolCode:'assps', apply:false, provisional:true })
  const apply = seedPolicy(['--school-code=assps','--apply','--provisional'])
  assert.deepEqual(apply, { schoolCode:'assps', apply:true, provisional:true })
  assert.throws(() => seedPolicy(['--school-code','assps','--apply']), /PROVISIONAL_FLAG_REQUIRED/)
  assert.throws(() => seedPolicy(['--school-code','assps','--apply','--provisional','--approve']), /SEED_AUTO_APPROVAL_FORBIDDEN/)
  assert.throws(() => seedPolicy(['--school','AL SIDDIQUE','--dry-run']), /EXACT_SCHOOL_CODE_REQUIRED|AMBIGUOUS_SCHOOL_NAME_FORBIDDEN/)
})

test('seed evidence remains review-gated and content-addressed', () => {
  const digest = 'a'.repeat(64)
  const evidence = seedEvidence(sample, digest)
  assert.equal(evidence.provisional_internal, true)
  assert.equal(evidence.review_state, 'provisional_internal')
  assert.equal(evidence.seed_input_sha256, digest)
  assert.match(evidence.record_sha256, /^[0-9a-f]{64}$/)
})

test('MCQ distribution can require editorial review but never auto-approval', () => {
  const rows = Array.from({ length:20 }, () => ({ questionType:'mcq', correctOption:'A' }))
  const qa = optionQuality(rows)
  assert.equal(qa.total, 20)
  assert.equal(qa.editorialReviewRequired, true)
  assert.equal(qa.distribution.A, 20)
})

test('seeder is wired to safe intake policy and cannot create approved seed rows', () => {
  const source = fs.readFileSync(path.join(__dirname, '../scripts/seedQuestionBankFromJson.js'), 'utf8')
  assert.match(source, /require\(['"]\.\/lib\/seed-intake-policy\.cjs['"]\)/)
  assert.match(source, /seedPolicy\(process\.argv\.slice\(2\)\)/)
  assert.match(source, /is_approved,\s*confidence[\s\S]*false,\s*60/)
  assert.doesNotMatch(source, /approved_seed/)
})

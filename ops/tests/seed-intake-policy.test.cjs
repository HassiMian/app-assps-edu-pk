const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {
  seedPolicy, seedEvidence, optionQuality,
} = require('../../al-siddique-backend/src/scripts/lib/seed-intake-policy.cjs')

test('plain academic question seeds stay provisional and require exact school code',()=>{
  assert.deepEqual(seedPolicy(['--school-code','assps']), {
    schoolCode:'assps',apply:false,provisional:true,
  })
  assert.deepEqual(seedPolicy(['--school-code=al-siddique']), {
    schoolCode:'al-siddique',apply:false,provisional:true,
  })
})
test('ambiguous school name or missing code cannot silently choose same-name tenant',()=>{
  for(const args of [[], ['--school','AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'],
    ['--school-code','assps','--school','AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'],
    ['--school-code','assps','--school-code','al-siddique'],
    ['--school-code','x;DROP'], ['--school-code','']]) {
    assert.throws(()=>seedPolicy(args))
  }
})
test('no normal JSON-seed invocation may bulk approve reviewed exam questions',()=>{
  for(const unsafe of ['--approved','--approve','--reviewed','--auto-approve','--publish','--non-provisional']) {
    assert.throws(()=>seedPolicy(['--school-code','assps',unsafe]), /AUTO_APPROVAL_FORBIDDEN/)
  }
})
test('bulk write requires explicit provisional designation',()=>{
  assert.throws(()=>seedPolicy(['--school-code','assps','--apply']),/PROVISIONAL_FLAG_REQUIRED/)
  assert.equal(seedPolicy(['--school-code','assps','--apply','--provisional']).apply,true)
})
test('provisional record contains content evidence SHA hashes, not false source page claims',()=>{
  const sha='a'.repeat(64),record={class_level:'9th',subject:'Biology',question_text:'What is a cell?'}
  const evidence=seedEvidence(record,sha)
  assert.equal(evidence.provisional_internal,true)
  assert.equal(evidence.review_state,'provisional_internal')
  assert.equal(evidence.source_pdf_sha256,undefined) // seed input is NOT verified textbook
  assert.equal(evidence.seed_input_sha256,sha)
  assert.match(evidence.record_sha256,/^[0-9a-f]{64}$/)
  assert.equal(seedEvidence(record,'unverified').seed_input_sha256,null)
})
test('provisional MCQ answer-key bias is reported as editorial review, not approval',()=>{
  const rows=Array.from({length:30},(_,i)=>({questionType:'mcq',correctOption:i<29?'A':'D'}))
  assert.equal(optionQuality(rows).editorialReviewRequired,true)
  assert.equal(optionQuality(rows).largestShare,0.9667)
  assert.equal(optionQuality([{questionType:'short',correctOption:'A'}]).total,0)
})
test('seeder never writes approved rows or resolves tenant by common display name',()=>{
  const src=fs.readFileSync(path.resolve(__dirname,
    '../../al-siddique-backend/src/scripts/seedQuestionBankFromJson.js'),'utf8')
  assert.match(src,/\$25::jsonb, false, 60/)
  assert.doesNotMatch(src,/\$25::jsonb, true, 100/)
  assert.match(src,/WHERE lower\(code\) = lower\(\$1\)/)
  assert.doesNotMatch(src,/OR lower\(name\) = lower\(/)
  assert.match(src,/DATABASE_PROVENANCE_MISMATCH/)
})

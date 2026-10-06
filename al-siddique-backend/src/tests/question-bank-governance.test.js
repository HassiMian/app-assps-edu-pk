const test = require('node:test')
const assert = require('node:assert/strict')
const {
  normalizeQuestionForGovernance,
  buildCanonicalFingerprint,
  buildRevisionHash,
  assertLifecycleTransition,
  assertIdempotencyKey,
} = require('../services/questionBankGovernance')

test('canonical fingerprint collapses superficial spacing/case but ignores answer metadata', () => {
  const a={class_level:'7',subject:'Science',medium:'English',question_type:'short',question_text:'  What   is force? ',answer:'A push or pull',marks:2}
  const b={classLevel:'7',subject:' science ',medium:'english',type:'SHORT',text:'What is force?',answer:'Different draft answer',marks:5}
  assert.equal(buildCanonicalFingerprint(a),buildCanonicalFingerprint(b))
})

test('revision hash changes when governed answer/marks change', () => {
  const base={class_level:'7',subject:'Science',question_type:'short',question_text:'What is force?',answer:'A push or pull',marks:2}
  assert.notEqual(buildRevisionHash(base),buildRevisionHash({...base,marks:3}))
  assert.notEqual(buildRevisionHash(base),buildRevisionHash({...base,answer:'Force changes motion'}))
})

test('normalization keeps bilingual content and deterministic option labels', () => {
  const n=normalizeQuestionForGovernance({subject:'Science',question_type:'mcq',question_text:'Water?',question_text_urdu:'پانی؟',options:['Solid','Liquid']})
  assert.equal(n.questionTextUrdu,'پانی؟')
  assert.deepEqual(n.options,[{label:'A',text:'Solid'},{label:'B',text:'Liquid'}])
})

test('lifecycle transitions are explicit and retired is terminal', () => {
  assert.equal(assertLifecycleTransition('candidate','reviewed'),true)
  assert.equal(assertLifecycleTransition('reviewed','ready'),true)
  assert.equal(assertLifecycleTransition('ready','retired'),true)
  assert.throws(()=>assertLifecycleTransition('candidate','ready'),e=>e.code==='INVALID_QUESTION_LIFECYCLE_TRANSITION')
  assert.throws(()=>assertLifecycleTransition('retired','candidate'),e=>e.code==='INVALID_QUESTION_LIFECYCLE_TRANSITION')
})

test('idempotency keys are bounded and safe', () => {
  assert.equal(assertIdempotencyKey('manual:science:q1'),'manual:science:q1')
  assert.throws(()=>assertIdempotencyKey('short'),e=>e.code==='INVALID_IDEMPOTENCY_KEY')
})

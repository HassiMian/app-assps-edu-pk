const test = require('node:test')
const assert = require('node:assert/strict')

const {
  buildCheckingSlots,
  normalizeResultEntries,
  releaseMaximum,
} = require('../services/assessmentResults')

function snapshot(maximumObtainableMarks = 20) {
  return {
    scoringPlan:{ maximumObtainableMarks },
    sections:[
      {
        id:'sec-1',
        sectionIndex:1,
        authoritativeSectionTotal:10,
        nodes:[{ id:'q-1', marks:10 }],
      },
      {
        id:'sec-2',
        sectionIndex:2,
        nodes:[
          { id:'q-2a', authoritativeNodeMarks:5 },
          { id:'q-2b', authoritativeNodeMarks:5 },
        ],
      },
    ],
  }
}

test('checking slots use stable canonical ids and release maximum', () => {
  const snap=snapshot(20)
  const slots=buildCheckingSlots(snap)
  assert.deepEqual(slots.map(x=>x.questionInstanceId),['q-1','q-2a','q-2b'])
  assert.deepEqual(slots.map(x=>x.displayLabel),['Q1','Q2.1','Q2.2'])
  assert.deepEqual(slots.map(x=>x.maxMarks),[10,5,5])
  assert.equal(releaseMaximum(snap,slots),20)
})

test('score zero remains SCORED and is distinct from NOT_ATTEMPTED', () => {
  const out=normalizeResultEntries(snapshot(),[
    { questionInstanceId:'q-1', state:'SCORED', score:0 },
    { questionInstanceId:'q-2a', state:'NOT_ATTEMPTED' },
    { questionInstanceId:'q-2b', state:'ABSENT' },
  ],{ resultStatus:'FINALIZED', releaseId:'release-r1', studentId:7 })
  assert.equal(out.totalScore,0)
  assert.equal(out.entries[0].state,'SCORED')
  assert.equal(out.entries[0].score,0)
  assert.equal(out.entries[1].state,'NOT_ATTEMPTED')
  assert.equal(out.entries[1].score,null)
})

test('finalized result rejects unchecked question instances', () => {
  assert.throws(()=>normalizeResultEntries(snapshot(),[
    { questionInstanceId:'q-1', state:'SCORED', score:8 },
    { questionInstanceId:'q-2a', state:'SCORED', score:4 },
  ],{ resultStatus:'FINALIZED', releaseId:'release-r1', studentId:7 }), error=>{
    assert.equal(error.code,'RESULT_NOT_FULLY_CHECKED')
    return true
  })
})

test('per-question score cannot exceed immutable release slot maximum', () => {
  assert.throws(()=>normalizeResultEntries(snapshot(),[
    { questionInstanceId:'q-1', state:'SCORED', score:11 },
  ],{ releaseId:'release-r1', studentId:7 }), error=>{
    assert.equal(error.code,'INVALID_RESULT_SCORE')
    return true
  })
})

test('release maximum prevents naive sum overflow even when individual scores are valid', () => {
  assert.throws(()=>normalizeResultEntries(snapshot(10),[
    { questionInstanceId:'q-1', state:'SCORED', score:10 },
    { questionInstanceId:'q-2a', state:'SCORED', score:5 },
    { questionInstanceId:'q-2b', state:'NOT_ATTEMPTED' },
  ],{ resultStatus:'FINALIZED', releaseId:'release-r1', studentId:7 }), error=>{
    assert.equal(error.code,'RESULT_TOTAL_EXCEEDS_RELEASE_MAX')
    return true
  })
})

test('EXEMPT lowers effective maximum without mutating release maximum', () => {
  const out=normalizeResultEntries(snapshot(20),[
    { questionInstanceId:'q-1', state:'SCORED', score:8 },
    { questionInstanceId:'q-2a', state:'SCORED', score:4 },
    { questionInstanceId:'q-2b', state:'EXEMPT' },
  ],{ resultStatus:'FINALIZED', releaseId:'release-r1', studentId:7, reason:'approved exemption' })
  assert.equal(out.maximumScore,20)
  assert.equal(out.effectiveMaximumScore,15)
  assert.equal(out.totalScore,12)
})

test('unknown question instance fails closed', () => {
  assert.throws(()=>normalizeResultEntries(snapshot(),[
    { questionInstanceId:'not-in-release', state:'SCORED', score:1 },
  ],{ releaseId:'release-r1', studentId:7 }), error=>{
    assert.equal(error.code,'UNKNOWN_QUESTION_INSTANCE')
    return true
  })
})

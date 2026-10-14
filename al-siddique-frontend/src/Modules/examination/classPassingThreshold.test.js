import {test} from 'node:test'
import assert from 'node:assert/strict'
import {classPassingThreshold, DEFAULT_REQUESTED_PASS_PERCENT} from './classPassingThreshold.js'

test('40 percent converts between percentage and absolute passing marks', () => {
  assert.equal(DEFAULT_REQUESTED_PASS_PERCENT, 40)
  for (const [total, threshold] of [[75,30],[60,24],[50,20]]) {
    assert.equal(classPassingThreshold({totalMarks:total,mode:'percentage',value:40}).marks,threshold)
    assert.equal(classPassingThreshold({totalMarks:total,mode:'marks',value:threshold}).percentage,40)
  }
})
test('configurable percentage and marks display are reversible', () => {
  assert.equal(classPassingThreshold({totalMarks:75,mode:'percentage',value:10}).marks,7.5)
  assert.equal(classPassingThreshold({totalMarks:75,mode:'marks',value:7.5}).percentage,10)
})
test('invalid or missing inputs do not invent a passing mark', () => {
  for (const obj of [{totalMarks:'',mode:'percentage',value:40},{totalMarks:0,mode:'percentage',value:40},{totalMarks:50,mode:'percentage',value:''},{totalMarks:50,mode:'percentage',value:101},{totalMarks:50,mode:'marks',value:51},{totalMarks:50,mode:'marks',value:'invalid'},{totalMarks:50,mode:'incorrect',value:20}])
    assert.equal(classPassingThreshold(obj),null)
})

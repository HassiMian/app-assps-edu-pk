const test = require('node:test')
const assert = require('node:assert/strict')
const { DEFAULT_PASS_PERCENT, isOfficialFirstTermExam, requiredFirstTermPassMarks } = require('../config/firstTermMarksPolicy')

test('33 percent is the starting default, not a mandatory hardcoded pass percentage', () => {
  assert.equal(DEFAULT_PASS_PERCENT, 33)
  assert.equal(requiredFirstTermPassMarks(50), 17)
  assert.equal(requiredFirstTermPassMarks(60), 20)
  assert.equal(requiredFirstTermPassMarks(75), 25)
  assert.equal(requiredFirstTermPassMarks(100), 33)
  assert.equal(requiredFirstTermPassMarks(50, 30), 15)
  assert.equal(requiredFirstTermPassMarks(50, 40), 20)
  assert.equal(requiredFirstTermPassMarks(75, 35), 27)
  assert.equal(requiredFirstTermPassMarks(50, 33.5), 17)
})

test('same configurable formula covers Written, Oral, GK and Quran Nazra; input must be valid', () => {
  for (const type of ['Written', 'Oral', 'General Knowledge Oral', 'Quran / Nazra']) {
    assert.equal(requiredFirstTermPassMarks(30, 40), 12, type)
  }
  for (const bad of [-10, 0, 101, NaN, Infinity]) {
    assert.equal(requiredFirstTermPassMarks(50, bad), null)
  }
  assert.equal(requiredFirstTermPassMarks(0, 33), null)
  assert.equal(isOfficialFirstTermExam({ id:9,school_id:1,name:'First Term Exam',session:'2026-2027' }), true)
  assert.equal(isOfficialFirstTermExam({ id:10,school_id:1,name:'First Term Exam',session:'2026-2027' }), false)
})

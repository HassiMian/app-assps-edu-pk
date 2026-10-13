'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {validateResultState}=require('../services/examResultStatus')
test('real numeric zero and unmarked values are distinct',()=>{
 assert.deepEqual(validateResultState({marks_obtained:0},'teacher'),{status:'SCORED',marks:0})
 assert.equal(validateResultState({marks_obtained:null},'teacher').error,'EXAM_MARKS_UNMARKED_NOT_ZERO')
 assert.equal(validateResultState({marks_obtained:''},'teacher').error,'EXAM_MARKS_UNMARKED_NOT_ZERO')
 assert.equal(validateResultState({marks_obtained:'not-a-number'},'teacher').error,'INVALID_NUMERIC_MARKS')
})
test('absent and pending never become scored zero',()=>{
 assert.deepEqual(validateResultState({result_status:'ABSENT',marks_obtained:null},'teacher'),{status:'ABSENT',marks:null})
 assert.deepEqual(validateResultState({result_status:'PENDING',marks_obtained:null},'teacher'),{status:'PENDING',marks:null})
 assert.equal(validateResultState({result_status:'ABSENT',marks_obtained:0},'teacher').error,'NON_NUMERIC_STATUS_HAS_MARKS')
 assert.equal(validateResultState({result_status:'NOT_PRESENT',marks_obtained:null},'teacher').error,'INVALID_EXAM_RESULT_STATUS')
})
test('excused status is restricted to school authority',()=>{
 assert.equal(validateResultState({result_status:'EXCUSED',marks_obtained:null},'teacher').error,'EXCUSED_REQUIRES_PRINCIPAL')
 assert.deepEqual(validateResultState({result_status:'EXCUSED',marks_obtained:null},'principal'),{status:'EXCUSED',marks:null})
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { areExamMarksVerified } from '../marksSaveVerification.js'
const row=(val,sub='English')=>({exam_id:9,student_id:13,subject:sub,marks_obtained:val,total_marks:50,result_status:'SCORED'})
test('independent same-student same-subject numeric readback confirms only exact values',()=>{
 assert.equal(areExamMarksVerified([row(49)],[row('49.00')]),true)
 assert.equal(areExamMarksVerified([row(49)],[row(48)]),false)
 assert.equal(areExamMarksVerified([row(49)],[row(49,'Math')]),false)
})
test('zero cannot be verified by NULL or blank',()=>{
 assert.equal(areExamMarksVerified([row(0)],[row('0.00')]),true)
 assert.equal(areExamMarksVerified([row(0)],[row(null)]),false)
 assert.equal(areExamMarksVerified([row(0)],[row('')]),false)
})
test('pending/absent status and incomplete batch cannot be verified',()=>{
 assert.equal(areExamMarksVerified([row(25)],[{...row(25),result_status:'ABSENT'}]),false)
 assert.equal(areExamMarksVerified([row(25),row(30,'Math')],[row(25)]),false)
})

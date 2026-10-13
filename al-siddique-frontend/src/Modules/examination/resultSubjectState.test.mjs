import test from 'node:test'
import assert from 'node:assert/strict'
import {interpretSubjectResult} from './resultSubjectState.js'
test('explicit absent and deferral print labels and no zero',()=>{
 assert.deepEqual(interpretSubjectResult({result_status:'ABSENT',marks_obtained:null}),{status:'ABSENT',score:null,label:'AB'})
 assert.deepEqual(interpretSubjectResult({result_status:'EXCUSED',marks_obtained:null}),{status:'EXCUSED',score:null,label:'EX'})
})
test('missing pending while numeric zero is scored',()=>{
 assert.equal(interpretSubjectResult({marks_obtained:0}).status,'SCORED')
 assert.equal(interpretSubjectResult({marks_obtained:0}).label,'0')
 assert.equal(interpretSubjectResult({marks_obtained:null}).status,'PENDING')
 assert.equal(interpretSubjectResult({result_status:'PENDING',marks_obtained:null}).label,'Pending')
})
test('contradictory state is invalid',()=>{
 assert.equal(interpretSubjectResult({result_status:'ABSENT',marks_obtained:0}).status,'INVALID')
 assert.equal(interpretSubjectResult({result_status:'SCORED',marks_obtained:null}).status,'INVALID')
 assert.equal(interpretSubjectResult({result_status:'unreviewed',marks_obtained:null}).status,'INVALID')
})

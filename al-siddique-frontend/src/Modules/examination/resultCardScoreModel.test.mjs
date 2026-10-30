import test from 'node:test'
import assert from 'node:assert/strict'
import {summarizeResultCardScores} from './resultCardScoreModel.js'

const payload={studentId:12,subjects:['English','Urdu'],totalMarks:50,passMarks:20}
test('zero is a genuine score; fractional marks survive without truncation',()=>{
  const v=summarizeResultCardScores({...payload,marks:{12:{English:'49.5',Urdu:0}}})
  assert.equal(v.complete,true)
  assert.equal(v.rows[0].score,49.5)
  assert.equal(v.rows[1].score,0)
  assert.equal(v.totalObtained,49.5)
  assert.equal(v.pass,false)
})
test('blank subject never becomes zero, FAIL, grade, or percentage',()=>{
  const v=summarizeResultCardScores({...payload,marks:{12:{English:37}}})
  assert.equal(v.complete,false)
  assert.equal(v.rows[1].label,'Pending')
  assert.equal(v.rows[1].score,null)
  assert.equal(v.percentage,null)
  assert.equal(v.pass,null)
})
test('non-decimal, coercible and out-of-range values fail closed',()=>{
  for(const bad of ['0x10','1e1',false,[],100,-1]){
    const v=summarizeResultCardScores({...payload,marks:{12:{English:bad,Urdu:12}}})
    assert.equal(v.complete,false)
    assert.equal(v.rows[0].status,'INVALID')
    assert.equal(v.pass,null)
  }
})
test('only a complete score with an explicit passing threshold can receive pass or fail',()=>{
  const marks={12:{English:30,Urdu:28}}
  const v=summarizeResultCardScores({...payload,marks})
  assert.equal(v.pass,true)
  assert.equal(v.percentage,58)
  assert.equal(summarizeResultCardScores({...payload,passMarks:null,marks}).pass,null)
})

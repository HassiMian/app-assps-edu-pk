import test from 'node:test'
import assert from 'node:assert/strict'
import {validateMarksBatch} from './marksEntryModel.js'

const sample = {
  exam:{id:11,type:'Assessment',class:'Seven',name:'Assessment 1'},
  selectedClass:'Seven', students:[{id:31,name:'Sample student',class:'Seven'}],
  subject:'Math', marks:{31:'12'}, totalMarks:25, passMarks:10,
}
const evaluate = overrides => validateMarksBatch({...sample,...overrides})

test('reject misleading numeric coercions instead of saving another score',()=>{
  for (const bad of ['1e1','0x10','Infinity','25foo',true,false,[],{},'0b10']) {
    const value=evaluate({marks:{31:bad}})
    assert.notEqual(value.error,'','unexpected acceptance: '+String(bad))
    assert.equal(value.rows.length,0)
  }
})
test('reject non-decimal total and passing marks, including booleans',()=>{
  for (const value of ['1e2','0x19',false,[],{}]) {
    assert.notEqual(evaluate({totalMarks:value}).error,'',String(value))
    assert.notEqual(evaluate({passMarks:value}).error,'',String(value))
  }
})
test('genuine numeric zero, fractional marks, and blank remain distinct',()=>{
  assert.equal(evaluate({marks:{31:'0'}}).rows[0].marks_obtained,0)
  assert.equal(evaluate({marks:{31:'.5'}}).rows[0].marks_obtained,0.5)
  assert.equal(evaluate({marks:{31:'2.'}}).rows[0].marks_obtained,2)
  assert.match(evaluate({marks:{31:''}}).error,/Blank marks are not zero/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEnteredMarkRows, assertCreatedExam } from './legacyExamWriteModel.js'
const basic = {examId:101,students:[{id:1},{id:2}],subjects:['English','Math'],totalMarks:20}
test('blank and missing rows remain pending, explicit 0 survives',()=>{
 const rows=buildEnteredMarkRows({...basic,marks:{1:{English:'0',Math:''},2:{English:'14.5'}}})
 assert.deepEqual(rows,[
  {exam_id:101,student_id:1,subject:'English',marks_obtained:0,total_marks:20},
  {exam_id:101,student_id:2,subject:'English',marks_obtained:14.5,total_marks:20},
 ])
 assert.deepEqual(buildEnteredMarkRows({...basic,marks:{}}),[])
})
test('reject invalid marks, overflow and missing exam without any partial result',()=>{
 for(const value of ['NaN','Infinity','21','-1','1e1','0x1','1.123']) {
  assert.throws(()=>buildEnteredMarkRows({...basic,marks:{1:{English:value}}}),Error,value)
 }
 assert.throws(()=>buildEnteredMarkRows({...basic,examId:'',marks:{1:{English:'5'}}}))
})
test('requires explicit server acknowledgement, not just HTTP response',()=>{
 assert.deepEqual(assertCreatedExam({data:{success:true,data:{id:111,name:'Assessment 1'}}}),{id:111,name:'Assessment 1'})
 for(const data of [{success:false,data:{id:1}},{success:true,data:{}},{success:true},{data:{id:1}}]) {
  assert.throws(()=>assertCreatedExam({data}))
 }
})

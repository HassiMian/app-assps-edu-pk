'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {validatePaperMaxima}=require('../services/examMarksSubjectMaximum')
const students=[{id:101,class:'One',section:'Blue'}]
const base={examId:9,studentId:101,subject:'English Oral',totalMarks:25}
const offering={exam_id:9,school_id:21,class_name:'Class 1',section:'blue',subject:'English Oral',total_marks:25,is_active:true,approval_status:'approved',approval_revision:1,approved_by_user_id:90,approved_at:'2026-10-13T17:00:00Z',reviewer_valid:true}
const approved = rows=>validatePaperMaxima({schoolId:21,results:rows,students,offerings:[offering]})
test('requires exact published subject maximum instead of exam-level total',()=>{
 assert.equal(approved([base]),true)
 assert.equal(approved([{...base,totalMarks:100}]),false)
 assert.equal(approved([{...base,subject:'English Written'}]),false)
 assert.equal(approved([{...base,studentId:102}]),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[]}),false)
})
test('prevents ambiguous or cross-tenant-offering selection',()=>{
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[offering,offering]}),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[{...offering,section:'Yellow'}]}),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[{...offering,total_marks:0}]}),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[{...offering,exam_id:10}]}),false)
 assert.equal(validatePaperMaxima({schoolId:22,results:[base],students,offerings:[offering]}),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[{...offering,approval_status:'pending'}]}),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[{...offering,approved_by_user_id:null}]}),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[{...offering,reviewer_valid:false}]}),false)
})

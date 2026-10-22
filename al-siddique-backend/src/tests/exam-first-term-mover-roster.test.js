'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {validateMoverFirstTermResults}=require('../services/examFirstTermMoverRosterGuard')
const students=[{id:952,class:'Mover'},{id:99,class:'Eight'}]
const exams=[{id:9,name:'First Term Exam'}]
const params={schoolId:1,students,exams}
const score=(studentId,subject,totalMarks,examId=9)=>({studentId,subject,totalMarks,examId})
test('authentic 7 Mover subjects and exact maximum accepted',()=>{
 const subjects=[['English Written',50],['Mathematics Written',50],['Urdu Written',50],
 ['English Oral',25],['Mathematics Oral',25],['Urdu Oral',25],['General Knowledge Oral',25]]
 assert.ok(validateMoverFirstTermResults({...params,results:subjects.map(([subject,max])=>score(952,subject,max))}))
})
test('Mover Computer and malformed total are rejected independently of frontend',()=>{
 assert.equal(validateMoverFirstTermResults({...params,results:[score(952,'Computer',100)]}),false)
 assert.equal(validateMoverFirstTermResults({...params,results:[score(952,'English Written',100)]}),false)
 assert.equal(validateMoverFirstTermResults({...params,results:[score(952,'English Oral',50)]}),false)
})
test('scope stays with ASSPS exam 9; legitimate Eight Computer and other schools unaffected',()=>{
 assert.ok(validateMoverFirstTermResults({...params,results:[score(99,'Computer',100)]}))
 assert.ok(validateMoverFirstTermResults({...params,schoolId:2,results:[score(952,'Computer',100)]}))
 assert.ok(validateMoverFirstTermResults({...params,results:[score(952,'Computer',100,10)]}))
})
test('missing student fails closed for ASSPS Mover first term',()=>{
 assert.equal(validateMoverFirstTermResults({...params,results:[score(777,'Computer',100)]}),false)
})

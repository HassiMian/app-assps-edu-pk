'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {draftGradeReconciliation}=require('../services/examGradeReconciliationProposal')
const bands=[{label:'A+',from:90,to:100},{label:'A',from:80,to:89},
 {label:'B',from:70,to:79},{label:'C',from:60,to:69},
 {label:'D',from:40,to:59},{label:'F',from:0,to:39}]
const a={id:51,school_id:1,exam_id:9,result_status:'SCORED',
    marks_obtained:'50.00',total_marks:50,grade:'D'}
test('proposes A+ for original 50/50 D without altering source',()=>{
 const saved={...a}
 const x=draftGradeReconciliation({record:a,bands,schoolId:1})
 assert.equal(x.currentGrade,'D')
 assert.equal(x.provisionalGrade,'A+')
 assert.equal(x.state,'AWAITING_AUTHENTICATED_OWNER_ACADEMIC_REVIEW')
 assert.equal(x.productionMutationAuthorized,false)
 assert.deepEqual(a,saved)
 assert.ok(Object.isFrozen(x))
})
test('rejects foreign school, missing policy and valid grades',()=>{
 assert.equal(draftGradeReconciliation({record:a,bands,schoolId:2}),null)
 assert.equal(draftGradeReconciliation({record:a,bands:[],schoolId:1}),null)
 assert.equal(draftGradeReconciliation({record:{...a,grade:'A+'},bands,schoolId:1}),null)
})
test('null, blank, absent, pending and corrupt scores never become numeric zero',()=>{
 for(const raw of [undefined,null,'',' ',false,'invalid',100]){
  const record={...a,marks_obtained:raw}
  assert.equal(draftGradeReconciliation({record,bands,schoolId:1}),null)
 }
 for(const status of ['ABSENT','PENDING','EXCUSED',undefined])
  assert.equal(draftGradeReconciliation({record:{...a,result_status:status},bands,schoolId:1}),null)
})
test('provisional grade cannot be treated as principal-signed revision',()=>{
 const x=draftGradeReconciliation({record:{...a,marks_obtained:0,grade:'A+'},bands,schoolId:1})
 assert.equal(x.provisionalGrade,'F')
 assert.equal(x.expectedMarks,0)
 assert.equal(x.productionMutationAuthorized,false)
})

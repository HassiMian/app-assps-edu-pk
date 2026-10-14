'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {buildStudentSafeProjection,buildStaffAnswerKeyProjection,containsForbiddenAnswerMaterial}=require('../../al-siddique-backend/src/services/assessmentPrintJobs')
const canonical={documentModel:'PaperDocumentV2',sections:[{id:'signed-q1',nodes:[{content:'1. MCQ?\n(A) Yes\n(B) No',options:[{key:'A',correct:true},{key:'B',correct:false}]}]}],
 academicVerifiedSelections:{schemaVersion:'assps-grade910-canonical-approved-revisions-v1',
  rows:[{question:{options:[{en:'Yes',correct:true},{en:'No',correct:false}],verifiedAcademicRef:{answerSha:'a'.repeat(64)}},
   section:{answerKey:{'1':'A'},verifiedAcademicRef:{answerSha:'a'.repeat(64)}}}]}}
test('student-safe paper excludes entire private academic signed revision and MCQ answers',()=>{
 const result=buildStudentSafeProjection(canonical,{student:{displayName:'Synthetic Learner'}})
 assert.equal(result.projectionType,'STUDENT_SAFE')
 assert.equal(result.paper.academicVerifiedSelections,undefined)
 assert.equal(result.paper.sections[0].nodes[0].options[0].correct,undefined)
 assert.equal(containsForbiddenAnswerMaterial(result),false)
})
test('staff-only printed answer key can retain signed provenance',()=>{
 const result=buildStaffAnswerKeyProjection(canonical,{role:'teacher'})
 assert.equal(result.projectionType,'STAFF_ANSWER_KEY')
 assert.equal(result.paper.academicVerifiedSelections.rows[0].section.answerKey['1'],'A')
})
test('student cannot fetch staff projection without staff role',()=>{
 assert.throws(()=>buildStaffAnswerKeyProjection(canonical,{role:'student'}),/Staff authorization/)
})

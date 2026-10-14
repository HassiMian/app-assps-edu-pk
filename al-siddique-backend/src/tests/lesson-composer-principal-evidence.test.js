'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const {verifiedSchoolPrincipal,teacherAssignmentEvidence,appendPrincipalEvidenceReview}=require('../services/lessonComposerPrincipalEvidence')
const sourceDigest=crypto.createHash('sha256').update('original academic source').digest('hex')
function db(){
 const state={revision:1,payload:{composerIntake:true,sourceDigest,sourceSubmissions:[{verbatim:'immutable source'}]},
    created_by:null,sent_to_portal:false}
 const sql=[]
 const d={state,sql,assignmentRows:[],suggestionRows:[],async query(statement,params){
  sql.push(statement)
  if(statement.includes("FROM users WHERE id=$1")){
   if((params[0]===9||params[0]===11)&&params[1]===1)return {rowCount:1,rows:[{id:params[0]}]}
   return {rowCount:0,rows:[]}
  }
  if(statement.startsWith('SELECT revision,payload')){
   return {rowCount:1,rows:[state]}
  }
  if(statement.startsWith('SELECT public_id,class_level')){
   return {rowCount:1,rows:[{public_id:'LPREVIEW-20261014-starter-english',
      class_level:'Starter',subject:'English',payload:state.payload}]}
  }
  if(statement.includes('FROM timetable WHERE school_id=$1'))return {rowCount:this.suggestionRows.length,rows:this.suggestionRows}
  if(statement.includes('FROM teacher_class_assignments')){
   return {rowCount:this.assignmentRows.length,rows:this.assignmentRows}
  }
  if(statement.startsWith('UPDATE lesson_plans SET')){
   state.payload.principalReviews=JSON.parse(params[0]);state.revision++
   return {rowCount:1,rows:[{revision:state.revision}]}
  }
  throw Error('UNKNOWN_SQL: '+statement)
 }};return d
}
const actor={id:9,role:'principal',school_id:1}
const call=(d,overrides={})=>appendPrincipalEvidenceReview(d,{
 schoolId:1,id:'LPREVIEW-20261014-starter-english',user:actor,
 expectedRevision:1,sourceDigest,
 declaration:'I reviewed the original lesson syllabus evidence and its correction flags.',
 ...overrides
})
test('teacher verification requires linked reviewed timetable and active assignments',async()=>{
 const d=db()
 const data=await teacherAssignmentEvidence(d,1,'LPREVIEW-20261014-starter-english')
 assert.equal(data.assignmentCandidates,0)
 assert.equal(data.verifiedCount,0)
 assert.equal(data.readyForAcademicApproval,false)
 assert.equal(data.verificationStatus,'ASSIGNMENT_EVIDENCE_REQUIRED')
 assert.ok(d.sql.some(q=>q.includes('staff_identity_reviewed=true')))
 assert.ok(d.sql.some(q=>q.includes('teacher_class_assignments')))
})
test('genuine principal inspection keeps original evidence, ownership and publication unchanged',async()=>{
 const d=db()
 const before=JSON.stringify(d.state.payload.sourceSubmissions)
 const r=await call(d)
 assert.equal(r.revision,2)
 assert.equal(r.sourceInspected,true)
 assert.equal(r.approved,false)
 assert.equal(r.published,false)
 assert.equal(r.notificationCount,0)
 assert.equal(d.state.payload.principalReviews[0].reviewedByPrincipalUserId,9)
 assert.equal(d.state.payload.principalReviews[0].decision,'ORIGINAL_SOURCE_INSPECTED_NOT_ACADEMICALLY_APPROVED')
 assert.equal(d.state.payload.sourceDigest,sourceDigest)
 assert.equal(JSON.stringify(d.state.payload.sourceSubmissions),before)
 assert.equal(d.state.created_by,null)
 assert.equal(d.state.sent_to_portal,false)
 assert.ok(!d.sql.some(x=>/notification_log|DELETE FROM/i.test(x)))
})
test('reject admin, teacher or synthetic principal without actual active account',async()=>{
 await assert.rejects(()=>verifiedSchoolPrincipal(db(),1,{id:10,role:'admin'}),e=>e.code==='ACADEMIC_PRINCIPAL_ACTIVE_ACCOUNT_REQUIRED')
 await assert.rejects(()=>verifiedSchoolPrincipal(db(),1,{id:10,role:'principal'}),e=>e.code==='ACADEMIC_PRINCIPAL_ACTIVE_ACCOUNT_REQUIRED')
 await assert.rejects(()=>call(db(),{user:{id:10,role:'principal'}}),e=>e.code==='ACADEMIC_PRINCIPAL_ACTIVE_ACCOUNT_REQUIRED')
})
test('reject stale source revision, forged digest and missing explicit declaration',async()=>{
 await assert.rejects(()=>call(db(),{expectedRevision:2}),e=>e.code==='PRINCIPAL_SOURCE_REVISION_CONFLICT')
 await assert.rejects(()=>call(db(),{sourceDigest:'f'.repeat(64)}),e=>e.code==='PRINCIPAL_SOURCE_DIGEST_MISMATCH')
 await assert.rejects(()=>call(db(),{declaration:'Yes, approve all'}),e=>e.code==='PRINCIPAL_EXPLICIT_DECLARATION_REQUIRED')
})
test('published/non-composer records cannot be Principal-inspection mutated',async()=>{
 const a=db();a.state.sent_to_portal=true
 await assert.rejects(()=>call(a),e=>e.code==='PRINCIPAL_SOURCE_INTEGRITY_FAIL')
 const b=db();b.state.payload.composerIntake=false
 await assert.rejects(()=>call(b),e=>e.code==='PRINCIPAL_SOURCE_INTEGRITY_FAIL')
})
test('principal inspection integrity chain stops if corrupted',async()=>{
 const d=db();d.state.payload.principalReviews=[{integrityHash:'broken'}]
 await assert.rejects(()=>call(d),e=>e.code==='PRINCIPAL_REVIEW_HASH_CHAIN_BROKEN')
})


test('school admin designated Principal may sign only if its active user row is verified',async()=>{
 const d=db()
 const r=await call(d,{user:{id:11,role:'admin',school_id:1}})
 assert.equal(r.sourceInspected,true)
 assert.equal(r.approved,false)
 assert.equal(d.state.payload.principalReviews[0].reviewedByPrincipalUserId,11)
 assert.ok(d.sql.some(q=>q.includes('lower(trim(designation))')))
})

test('signed academic assignment needs real source event, not a forged source string',async()=>{
 const d=db()
 d.assignmentRows=[{teacher_user_id:123,employee_id:45,section:'Blue',source:'signed-admin-review',reviewed_timetable:false,signed_assignment_audit:false}]
 let r=await teacherAssignmentEvidence(d,1,'LPREVIEW-20261014-starter-english')
 assert.equal(r.verifiedCount,0)
 d.assignmentRows[0].signed_assignment_audit=true
 r=await teacherAssignmentEvidence(d,1,'LPREVIEW-20261014-starter-english')
 assert.equal(r.verifiedCount,1)
 assert.equal(r.candidates[0].verifiedVia,'SIGNED_ADMIN_ASSIGNMENT_EVENT')
 assert.equal(r.readyForAcademicApproval,false)
})

test('timetable staff names remain explicitly provisional without signed identity approval',async()=>{
 const d=db()
 d.suggestionRows=[{section:'Blue',teacher_id:4194,teacher_display_name:'Teacher candidate',staff_identity_reviewed:false}]
 const r=await teacherAssignmentEvidence(d,1,'LPREVIEW-20261014-starter-english')
 assert.equal(r.verifiedCount,0)
 assert.equal(r.provisionalTimetableSuggestions.length,1)
 assert.equal(r.provisionalTimetableSuggestions[0].notAssignment,true)
 assert.equal(r.provisionalTimetableSuggestions[0].identityReviewed,false)
 assert.equal(r.readyForAcademicApproval,false)
})

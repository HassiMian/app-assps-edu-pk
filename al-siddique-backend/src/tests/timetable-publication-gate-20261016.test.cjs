'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
const {SOURCE_SHAS}=require('../services/approvedSchoolTimetable')
const {publicationAssessment}=require('../services/timetablePublicationGate')
const roster=[{class:'Four',section:'Blue',n:17,parent_linked:17},{class:'Starter',section:'Blue',n:45,parent_linked:42}]
const rows=Array.from({length:8},(_,i)=>({class_name:'Four',section:'Blue',period_label:'Period '+(i+1),subject:'Science',teacher_display_name:'Miss Aqsa',teacher_id:4192,source_sha256:SOURCE_SHAS[0],academic_session:'2026–27'}))
test('HOLD full, parent sees approved times in missing-source groups',()=>{
 const x=publicationAssessment({schoolId:1,roster,entries:rows})
 assert.equal(x.decision,'HOLD_FULL_RELEASE')
 assert.equal(x.total_active_students,62)
 assert.equal(x.fully_verified_subject_timetable_students,17)
 assert.equal(x.students_subject_timetable_pending,45)
 assert.equal(x.unlinked_parent_students,3)
 assert.equal(x.limited_readonly_possible,true)
})
test('FULL requires complete subject periods, teacher links and parent links',()=>{
 const extra=Array.from({length:8},(_,i)=>({...rows[i],class_name:'Starter'}))
 const x=publicationAssessment({schoolId:1,roster:[{class:'Four',section:'Blue',n:17,parent_linked:17},{class:'Starter',section:'Blue',n:45,parent_linked:45}],entries:[...rows,...extra]})
 assert.equal(x.decision,'FULL_RELEASE_READY')
 assert.equal(x.students_subject_timetable_pending,0)
})
test('Incorrect imported SHA never qualifies as verified schedule',()=>{
 const x=publicationAssessment({schoolId:1,roster,entries:rows.map(x=>({...x,source_sha256:'unverified'}))})
 assert.equal(x.fully_verified_subject_timetable_students,0)
 assert.equal(x.decision,'HOLD_FULL_RELEASE')
})
test('Cross tenant denies and Pre-Nine is not Class Eight',()=>{
 assert.equal(publicationAssessment({schoolId:2,roster,entries:rows}).decision,'DENY')
 const x=publicationAssessment({schoolId:1,roster:[{class:'Eight',section:'Blue',n:11,parent_linked:11}],entries:rows.map(x=>({...x,class_name:'Pre-Nine',section:''}))})
 assert.equal(x.fully_verified_subject_timetable_students,0)
 assert.deepEqual(x.unmatched_imported_groups,['pre-nine|'])
})
test('Duplicate periods cannot produce false complete status',()=>{
 const x=publicationAssessment({schoolId:1,roster,entries:rows.map((r,i)=>i===7?{...r,period_label:'Period 7'}:r)})
 assert.equal(x.fully_verified_subject_timetable_students,0)
})

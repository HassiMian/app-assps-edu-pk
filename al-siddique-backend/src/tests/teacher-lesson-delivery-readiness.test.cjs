'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {teacherLessonDeliveryReadiness:check}=require('../services/teacherLessonDeliveryReadiness')
function example(){
 return {
  schoolId:1,actor:{id:100,school_id:1,role:'teacher',is_active:true},
  employee:{id:55,school_id:1,user_id:100,is_active:true},
  assignment:{id:7,school_id:1,employee_id:55,teacher_user_id:100,
    class_name:'Five',section:'Blue',subject:'Mathematics',is_active:true},
  plan:{id:8,school_id:1,class_level:'Five',subject:'Mathematics',payload:{section:'Blue'}},
  academicReview:{school_id:1,lesson_plan_id:8,review_state:'APPROVED',
    source_provenance_verified:true,signed_by_verified_academic_owner:true}
 }
}
test('complete synthetic evidence is NOT authority to grant or publish',()=>{
 const a=check(example())
 assert.deepEqual(a.failures,[])
 assert.equal(a.evidenceComplete,true)
 assert.equal(a.permissionGranted,false)
 assert.equal(a.deliverablePublished,false)
 assert.equal(a.delivered,false)
})
test('no formal teacher-class assignment always blocks readiness',()=>{
 const e=example();e.assignment=null
 assert.equal(check(e).evidenceComplete,false)
 assert.ok(check(e).failures.includes('ACTIVE_CLASS_ASSIGNMENT_MISSING'))
})
test('a timetable user ID alone never substitutes for employee+assignment',()=>{
 const e=example();e.employee=null;e.assignment=null
 assert.ok(check(e).failures.includes('EMPLOYEE_USER_LINK_UNVERIFIED'))
 assert.ok(check(e).failures.includes('ACTIVE_CLASS_ASSIGNMENT_MISSING'))
})
test('peer-school assignment and plan are both rejected',()=>{
 const e=example();e.assignment.school_id=2;e.plan.school_id=2
 const f=check(e).failures
 assert.ok(f.includes('ACTIVE_CLASS_ASSIGNMENT_MISSING'))
 assert.ok(f.includes('LESSON_PLAN_UNVERIFIED'))
})
test('disabled, nonteacher or mismatched user cannot pass',()=>{
 for(const patch of [{role:'parent'},{is_active:false},{school_id:2}]){
  const e=example();Object.assign(e.actor,patch)
  assert.ok(check(e).failures.includes('TEACHER_ACTOR_UNVERIFIED'))
 }
 const differentUser=example();differentUser.actor.id=101
 assert.equal(check(differentUser).evidenceComplete,false)
 assert.ok(check(differentUser).failures.includes('EMPLOYEE_USER_LINK_UNVERIFIED'))
 assert.ok(check(differentUser).failures.includes('ACTIVE_CLASS_ASSIGNMENT_MISSING'))
})
test('employee must be active, same school, bound to authenticated user',()=>{
 const e=example();e.employee.user_id=199
 assert.ok(check(e).failures.includes('EMPLOYEE_USER_LINK_UNVERIFIED'))
})
test('class subject and section are independently scoped',()=>{
 for(const [field,value,expected] of [
   ['class_level','Nine','CLASS_BINDING_UNVERIFIED'],
   ['subject','Physics','SUBJECT_BINDING_UNVERIFIED']
 ]){
  const e=example();e.plan[field]=value
  assert.ok(check(e).failures.includes(expected))
 }
 const e=example();e.plan.payload.section='Fatima'
 assert.ok(check(e).failures.includes('SECTION_BINDING_UNVERIFIED'))
})
test('plans without section never leak to an arbitrary section',()=>{
 const e=example();delete e.plan.payload.section
 assert.ok(check(e).failures.includes('SECTION_BINDING_UNVERIFIED'))
})
test('unknown/unapproved 59 original academic sources remain blocked',()=>{
 for(const review_state of ['BLOCKED','AWAITING_SUBJECT_OWNER_AND_ACADEMIC_QA',null]){
  const e=example();e.academicReview.review_state=review_state
  assert.ok(check(e).failures.includes('ACADEMIC_SOURCE_APPROVAL_MISSING'))
 }
})
test('a client-supplied approval flag cannot substitute independent academic evidence',()=>{
 const e=example();e.academicReview={school_id:1,lesson_plan_id:8,review_state:'APPROVED',
    source_provenance_verified:false,signed_by_verified_academic_owner:false}
 assert.ok(check(e).failures.includes('ACADEMIC_SOURCE_APPROVAL_MISSING'))
})
test('no actor or school fails closed',()=>{
 const e=example();e.actor=null;e.schoolId=0
 const f=check(e).failures
 assert.ok(f.includes('SIGNED_SCHOOL_MISSING'))
 assert.ok(f.includes('TEACHER_ACTOR_UNVERIFIED'))
})


test('reviewed Grade Five teacher assignment accepts numeric Class 5 lesson alias only',()=>{
 for(const label of ['5','Class 5','Grade Five']){
  const e=example();e.plan.class_level=label
  assert.equal(check(e).evidenceComplete,true,label)
  assert.equal(check(e).permissionGranted,false)
 }
 const e=example();e.plan.class_level='9'
 assert.ok(check(e).failures.includes('CLASS_BINDING_UNVERIFIED'))
})
test('Pre-Nine cannot alias Grade Nine or bypass review',()=>{
 const e=example();e.assignment.class_name='Pre-Nine';e.plan.class_level='9'
 assert.ok(check(e).failures.includes('CLASS_BINDING_UNVERIFIED'))
 const unapproved=example();unapproved.plan.class_level='5';unapproved.academicReview.review_state='BLOCKED'
 assert.ok(check(unapproved).failures.includes('ACADEMIC_SOURCE_APPROVAL_MISSING'))
})

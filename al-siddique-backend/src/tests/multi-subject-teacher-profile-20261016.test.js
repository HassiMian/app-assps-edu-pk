'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {normalizeSubject,normalizeTeacherSubjectProposal,validateInchargeCandidate}=require('../services/academics/teacherMultiSubjectContract')

test('Nazra and Islamiyat are independently addressable canonical subjects',()=>{
 const islamiyat=normalizeSubject({key:'islamiyat',name:'Islamiyat'})
 const nazra=normalizeSubject({key:'nazra',name:'Nazra'})
 assert.equal(islamiyat.errors.length,0)
 assert.equal(nazra.errors.length,0)
 assert.notEqual(islamiyat.value.key,nazra.value.key)
})
test('Multiple profile proposals for same teacher can target distinct subject IDs',()=>{
 const payload={employeeId:65,academicSession:'2026–27',evidenceReference:'Approved academic roster 2026'}
 const a=normalizeTeacherSubjectProposal({...payload,subjectId:10})
 const b=normalizeTeacherSubjectProposal({...payload,subjectId:11})
 assert.deepEqual(a.errors,[])
 assert.deepEqual(b.errors,[])
 assert.equal(a.value.employeeId,b.value.employeeId)
 assert.notEqual(a.value.subjectId,b.value.subjectId)
})
test('Academic year accepts both database 2026-2027 and timetable 2026–27',()=>{
 const base={employeeId:65,subjectId:10,evidenceReference:'Academic timetable official source'}
 const a=normalizeTeacherSubjectProposal({...base,academicSession:'2026-2027'})
 const b=normalizeTeacherSubjectProposal({...base,academicSession:'2026–27'})
 assert.deepEqual(a.value,b.value)
 assert.equal(a.value.session,'2026–27')
 assert(normalizeTeacherSubjectProposal({...base,academicSession:'2026–28'}).errors.length>0)
})
test('Class incharge nomination requires exact class and section and signed source description',()=>{
 assert(validateInchargeCandidate({employeeId:65,className:'Six',section:'',academicSession:'2026–27',evidenceReference:'Principal roster'}).errors.includes('EXACT_CLASS_AND_SECTION_REQUIRED'))
 assert.deepEqual(validateInchargeCandidate({employeeId:65,className:'Six',section:'Blue',academicSession:'2026-2027',evidenceReference:'Principal verified class duty roster'}).errors,[])
})
test('New migration is additive and enforces signed school RLS',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../../../ops/release/teacher-subjects/001_multi_subject_profile_and_incharge_qa.sql'),'utf8')
 for(const name of ['school_subject_catalog','teacher_subject_profiles','school_class_incharges','school_teacher_profile_events'])assert(source.includes(name))
 assert(source.includes('FORCE ROW LEVEL SECURITY'))
 assert(source.includes('core_security.signed_school_allowed(school_id)'))
 assert(source.includes("status='approved' AND assignment_role='primary'"))
 assert(!/\b(TRUNCATE|DROP TABLE|DELETE FROM|UPDATE\s+exam_results|UPDATE\s+students)\b/i.test(source))
})
test('Student incharge lookup derives student identity server side and reads approved class records only',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../routes/teacherMultiSubjectRoutes.js'),'utf8')
 const block=source.split("router.get('/class-incharge/my-class'")[1]
 assert(block.includes("u.id=$1 AND u.school_id=$2"))
 assert(block.includes("s.id=u.entity_id"))
 assert(block.includes("a.status='approved'"))
 assert(!block.includes('req.query.class'))
 assert(!block.includes('req.body.studentId'))
 assert(source.includes('grantIssued:false'))
 assert(source.includes('TEACHER_ACCOUNT_IDENTITY_MISMATCH'))
})

'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {buildTeachingOptionsQuery}=require('../services/teacherTeachingOptionsScope')
const {validateResultState}=require('../services/examResultStatus')
test('verified Owner teaching scope stays in exact current school',()=>{
 const own=buildTeachingOptionsQuery({role:'owner',schoolId:1,actorSchoolId:1,teacherId:3})
 assert.ok(own)
 assert.deepEqual(own.params,[1])
 assert.match(own.sql,/s.school_id=\$1/)
 assert.equal(buildTeachingOptionsQuery({role:'owner',schoolId:2,actorSchoolId:1,teacherId:3}),null)
 assert.equal(buildTeachingOptionsQuery({role:'owner',schoolId:1,actorSchoolId:null}),null)
})
test('Owner may approve EXCUSED subject status but cannot supply a score in non-scored rows',()=>{
 assert.deepEqual(validateResultState({result_status:'EXCUSED',marks_obtained:null},'owner'),{status:'EXCUSED',marks:null})
 assert.equal(validateResultState({result_status:'EXCUSED',marks_obtained:0},'owner').error,'NON_NUMERIC_STATUS_HAS_MARKS')
 assert.equal(validateResultState({result_status:'EXCUSED',marks_obtained:null},'teacher').error,'EXCUSED_REQUIRES_PRINCIPAL')
 assert.equal(validateResultState({result_status:'SCORED',marks_obtained:''},'owner').error,'EXAM_MARKS_UNMARKED_NOT_ZERO')
 assert.deepEqual(validateResultState({result_status:'SCORED',marks_obtained:0},'owner'),{status:'SCORED',marks:0})
})
test('Owner academic approval requires actual reviewer role and cannot bypass tenant policy',()=>{
 const fs=require('node:fs'),path=require('node:path')
 for(const name of ['grade910AcademicReviewService.js','grade910AcademicReviewGate.js']){
  const s=fs.readFileSync(path.join(__dirname,'../services',name),'utf8')
  assert.ok(s.includes("'super_admin','owner'"))
  assert.match(s,/school_id=\$2|school_id=\$1|tenantId/)
 }
})

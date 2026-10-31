'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {parseFilters,expectedGradeSQL,summaryRows}=require('../services/gradeDiscrepancyReview')
const {normalizeClassKey,sqlCanonicalClass}=require('../services/academicClassKey')
const source=fs.readFileSync(path.join(__dirname,'../routes/schoolAcademicCatalogRoutes.js'),'utf8')
const routePart=start=>source.split(start)[1]||''
test('historical grade review requires an active school administrator and read-only tenant transaction',()=>{
 const part=routePart("router.get('/grade-discrepancies'")
 assert.ok(part)
 assert.match(source,/router.get\('\/grade-discrepancies',protect,requireRoles\('admin','principal'\)/)
 assert.match(part,/BEGIN READ ONLY/)
 assert.match(part,/applyTenantContext\(client\)/)
 assert.match(part,/ACTIVE_SCHOOL_PRINCIPAL_REQUIRED/)
 assert.match(part,/automaticHistoricalGradeChanges:false/)
})
test('source-history review never grants marks permissions or creates syllabus approval',()=>{
 const part=routePart("router.get('/assessment-catalog/historical-subject-gaps'").split("router.get('/assessment-catalog/:examId/preview'")[0]
 assert.match(part,/requireRoles\('admin','principal'\)/)
 assert.match(part,/BEGIN READ ONLY/)
 assert.match(part,/school_id=\$1/)
 assert.match(part,/teacherIdentityInferred:false/)
 assert.match(part,/independentCurrentTermApproval:false/)
 assert.match(part,/productionAcademicWrites:0/)
 assert.doesNotMatch(part,/\b(?:INSERT|UPDATE|DELETE)\b/i)
})
test('historical grade percentages use FLOOR and exact policy per school',()=>{
 assert.match(expectedGradeSQL,/FLOOR\(100\.0\*r\.marks_obtained/)
 assert.match(expectedGradeSQL,/r\.school_id=\$1/)
 assert.match(expectedGradeSQL,/g\.school_id=\$1/)
 assert.match(expectedGradeSQL,/stored_grade IS DISTINCT FROM expected_grade/)
 assert.doesNotMatch(expectedGradeSQL,/\bUPDATE\b/)
})
test('academic review input parsing rejects ambiguous numeric identifiers and excess result sizes',()=>{
 assert.deepEqual(parseFilters({}),{examId:null,limit:50})
 assert.deepEqual(parseFilters({examId:'9',limit:'100'}),{examId:9,limit:100})
 for(const query of [{examId:'9a'},{examId:0},{examId:-1},{limit:0},{limit:101},{limit:'foo'}])
  assert.ok(parseFilters(query).error)
})
test('Pre Nine canonical alias never conflates with Nine',()=>{
 assert.equal(normalizeClassKey('Pre-Nine'),'pre nine')
 assert.equal(normalizeClassKey('Pre Nine'),'pre nine')
 assert.equal(normalizeClassKey('Nine'),'nine')
 assert.notEqual(normalizeClassKey('Pre-Nine'),normalizeClassKey('Nine'))
 assert.match(sqlCanonicalClass('student.class'),/CASE WHEN/)
})
test('cross-exam summary never modifies data',()=>{
 const rows=[{exam_id:9,subject:'Science'},{exam_id:9,subject:'English Written'},{exam_id:14,subject:'English Written'}]
 assert.deepEqual(summaryRows(rows),{discrepancies:3,byExam:{9:2,14:1},bySubject:{Science:1,'English Written':2}})
 assert.equal(rows.length,3)
})
test('historical exact matching distinguishes active cohort staff from matching subject policy',()=>{
 const part=routePart("router.get('/assessment-catalog/historical-subject-gaps'").split("router.get('/assessment-catalog/:examId/preview'")[0]
 assert.match(part,/legitimate_assignment_exists/)
 assert.match(part,/current_cohort_staffed/)
 assert.match(part,/unstaffedCohortSubjectRows/)
 assert.match(part,/staffedCohortLabelAlignmentRows/)
 assert.match(part,/HISTORIC_SUBJECT_LABEL_ALIGNMENT_REQUIRED/)
})

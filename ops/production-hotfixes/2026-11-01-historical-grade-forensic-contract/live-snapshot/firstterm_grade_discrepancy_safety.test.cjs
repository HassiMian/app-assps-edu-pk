'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const x=require('./gradeDiscrepancyReview')
test('read-only SQL references current school policy and correct 50-mark denominator',()=>{
 assert.match(x.expectedGradeSQL,/FLOOR\(100\.0\*r\.marks_obtained\/NULLIF\(r\.total_marks,0\)\)/)
 assert.match(x.expectedGradeSQL,/grade_settings g/)
 assert.match(x.expectedGradeSQL,/r.school_id=\$1/)
 assert.doesNotMatch(x.expectedGradeSQL,/\bUPDATE\b|\bDELETE\b|\bINSERT\b/i)
})
test('50-point early-grade suspicious 100-denominator is hint only',()=>{
 assert.equal(x.mismatchHint({total_marks:50,stored_grade:'D',expected_grade:'A+',grade_if_hypothetical_100_max:'D'}),'POSSIBLE_FIXED_100_MARK_DENOMINATOR')
})
test('legacy E to D remains investigation',()=>{
 assert.equal(x.mismatchHint({total_marks:50,stored_grade:'E',expected_grade:'D',grade_if_hypothetical_100_max:'F'}),'LEGACY_GRADE_E_LABEL')
})
test('other suspicious marks do not silently normalize',()=>{
 assert.equal(x.mismatchHint({total_marks:100,stored_grade:'A',expected_grade:'F',grade_if_hypothetical_100_max:'F'}),'OTHER_REQUIRES_REVIEW')
})
test('correct grade is not flagged',()=>{
 assert.equal(x.mismatchHint({total_marks:50,stored_grade:'B',expected_grade:'B'}),'NO_MISMATCH')
})
test('exam filter rejects untrusted identifiers and huge page scans',()=>{
 assert.equal(x.parseFilters({examId:'1 OR 1=1'}).error,'EXAM_ID_INVALID')
 assert.equal(x.parseFilters({limit:'100000'}).error,'LIMIT_INVALID')
 assert.deepEqual(x.parseFilters({examId:'9',limit:'100'}),{examId:9,limit:100})
})
test('summary is deterministic and never claims principal sign-off',()=>{
 const z=x.summarizeMismatchHints([
 {total_marks:50,stored_grade:'D',expected_grade:'A+',grade_if_hypothetical_100_max:'D'},
 {total_marks:50,stored_grade:'E',expected_grade:'D',grade_if_hypothetical_100_max:'F'}])
 assert.deepEqual(z,{possibleFixed100Denominator:1,legacyGradeE:1,other:0})
 assert.equal(Object.hasOwn(z,'principalApproved'),false)
})

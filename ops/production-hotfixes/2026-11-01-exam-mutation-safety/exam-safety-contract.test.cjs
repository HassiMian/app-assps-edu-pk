'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path')
const {isSequentialAllClassAssessment,officialPassMarks}=require('./examMutationSafety')
const src=fs.readFileSync(path.join(__dirname,'examRoutes.js'),'utf8')
test('assessment current school threshold uses F max +1 and scales with maximum',()=>{
 for(const [total,pass] of [[20,8],[30,12],[100,40]]){
  assert.equal(officialPassMarks(total,39),pass)
 }
 for(const [max,fmax] of [[-1,39],[20,-1],[20,100],[0,39],[30,NaN]]){
  assert.equal(officialPassMarks(max,fmax),null)
 }
})
test('only canonical full-school assessment sequence triggers policy; preserves legacy',()=>{
 assert.ok(isSequentialAllClassAssessment({name:'Assessment 5',type:'AS',className:'All Classes'}))
 assert.ok(isSequentialAllClassAssessment({name:' assessment   10 ',type:'AS',className:'all classes'}))
 for(const x of [
  {name:'First Term Exam',type:'TE',className:'All Classes'},
  {name:'Assessment - Class 1',type:'AS',className:'1'},
  {name:'Assessment 5',type:'TE',className:'All Classes'},
  {name:'Assessment 5',type:'AS',className:'Seven'}
 ])assert.equal(isSequentialAllClassAssessment(x),false)
})
test('authenticated exam create checks grade policy without modifying any historical exam',()=>{
 assert.match(src,/router\.post\('\/', protect, canManageExams/)
 assert.match(src,/isSequentialAllClassAssessment\(\{name:examName,type:examType,className:examClass\}\)/)
 assert.match(src,/SELECT max_percentage FROM grade_settings WHERE school_id=\$1 AND label='F'/)
 assert.match(src,/ASSESSMENT_PASS_MARKS_POLICY_CONFLICT/)
 assert.match(src,/OFFICIAL_PASS_POLICY_REQUIRED/)
 assert.match(src,/BEGIN ISOLATION LEVEL SERIALIZABLE/)
 assert.match(src,/pg_advisory_xact_lock/)
})
test('exam delete is tenant-bound and refuses original First Term and saved results',()=>{
 assert.match(src,/Number\(schoolId\)===1 && examId===9/)
 assert.match(src,/ORIGINAL_FIRST_TERM_IMMUTABLE/)
 assert.match(src,/SELECT 1 FROM exam_results WHERE exam_id=\$1 AND school_id=\$2 LIMIT 1/)
 assert.match(src,/EXAM_RESULTS_RETENTION_REQUIRED/)
 assert.match(src,/SELECT 1 FROM exam_subjects WHERE exam_id=\$1 AND school_id=\$2 AND approval_status='approved' LIMIT 1/)
 assert.match(src,/APPROVED_EXAM_SCOPE_RETENTION_REQUIRED/)
 assert.match(src,/DELETE FROM exam_results WHERE exam_id = \$1 AND school_id=\$2/)
 assert.match(src,/DELETE FROM exams WHERE id = \$1 AND school_id=\$2/)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { examMarksUiAction as readiness } from './assessmentMarksReadiness.js'
const review=(subject,overrides={})=>({class_name:'Five',section:'Blue',subject,total_marks:20,pass_marks:8,...overrides})
test('Assessment 1 without an exam subject array is locked, never inferred from Academic Setup',()=>{
 const status=readiness({type:'AS',name:'Assessment 1',academicSubjects:['English']})
 assert.equal(status.canEnter,false)
 assert.equal(status.actionLabel,'Marks Locked')
})
test('Assessment API with zero signed offerings is locked',()=>{
 assert.equal(readiness({type:'Assessment',subject_offerings:[]}).canEnter,false)
})
test('pending-only fields never prove authorization',()=>{
 assert.equal(readiness({type:'AS',subject_offerings:[{class_name:'Five',subject:'Math'}]}).canEnter,false)
})
test('one valid backend-filtered offering permits ONLY scoped entry affordance',()=>{
 const status=readiness({type:'AS',subject_offerings:[review('English')]})
 assert.equal(status.canEnter,true)
 assert.equal(status.actionLabel,'Enter Approved Marks')
 assert.match(status.message,/Only 1 verified/)
})
test('malformed max/pass marks and empty identifiers cannot open Assessment entry',()=>{
 const invalid=[review('English',{total_marks:0}),review('English',{pass_marks:30}),review('',{}),review('Urdu',{class_name:''}),review('Urdu',{section:''})]
 assert.equal(readiness({type:'AS',subject_offerings:invalid}).canEnter,false)
})
test('zero pass threshold is a valid nonnegative numeric bound if backend supplied it',()=>{
 assert.equal(readiness({type:'AS',subject_offerings:[review('Math',{pass_marks:0})]}).canEnter,true)
})
test('term marks workflow remains available without a new Assessment catalog',()=>{
 assert.equal(readiness({type:'TE'}).canEnter,true)
})
test('legacy annual exams remain available for viewing',()=>{
 assert.equal(readiness({type:'Annual Exam'}).canEnter,true)
})
test('no data is not an implicit Assessment approval',()=>{
 assert.equal(readiness({type:'AS',subject_offerings:null}).canEnter,false)
})
test('bad serialized subject catalog cannot be treated as verified',()=>{
 assert.equal(readiness({type:'AS',subject_offerings:{subject:'English'}}).canEnter,false)
})
test('mixed valid/invalid offerings only count the valid scoped entries',()=>{
 const status=readiness({type:'AS',subject_offerings:[review('English'),{subject:'Science'},review('Urdu')]})
 assert.equal(status.canEnter,true);assert.match(status.message,/Only 2 verified/)
})
test('app requests real approved offerings from protected backend, not generic school subjects',async()=>{
 const {readFileSync}=await import('node:fs')
 const ui=readFileSync(new URL('./ManageExams.jsx',import.meta.url),'utf8')
 assert.match(ui,/include_subjects: '1'/)
 assert.match(ui,/disabled={!examMarksUiAction\(exam\)\.canEnter}/)
 assert.match(ui,/Principal subject approval is required before marks entry/)
})
test('live backend filters AS offerings by authentic approved signature and school',async()=>{
 const {readFileSync}=await import('node:fs')
 const api=readFileSync('/var/www/apex-backend/src/routes/examRoutes.js','utf8')
 assert.match(api,/x\.approval_status='approved'/)
 assert.match(api,/x\.approved_at IS NOT NULL AND approver\.id IS NOT NULL/)
 assert.match(api,/WHERE x\.school_id=\$1/)
})
test('missing pass_marks and numeric strings cannot become a verified Assessment offering',()=>{
 const candidates=[review('Math',{pass_marks:null}),review('Math',{pass_marks:'8'}),review('English',{total_marks:'20'}),review('Urdu',{total_marks:true})]
 assert.equal(readiness({type:'AS',subject_offerings:candidates}).canEnter,false)
})
test('refresh failure path clears stale approval hints, preserves exam headers',async()=>{
 const {readFileSync}=await import('node:fs')
 const ui=readFileSync(new URL('./ManageExams.jsx',import.meta.url),'utf8')
 assert.match(ui,/exam\.type === 'Assessment' \? \{ \.\.\.exam, subject_offerings: null \}/)
 assert.match(ui,/Assessment marks remain locked until the signed subject catalog is verified again/)
})

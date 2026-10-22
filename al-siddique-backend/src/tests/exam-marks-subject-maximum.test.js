'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {validatePaperMaxima}=require('../services/examMarksSubjectMaximum')
const students=[{id:101,class:'One',section:'Blue'}]
const base={examId:9,studentId:101,subject:'English Oral',totalMarks:25}
const offering={exam_id:9,school_id:21,class_name:'Class 1',section:'blue',subject:'English Oral',total_marks:25,is_active:true,approval_status:'approved',approval_revision:1,approved_by_user_id:90,approved_at:'2026-10-13T17:00:00Z',reviewer_valid:true}
const approved = rows=>validatePaperMaxima({schoolId:21,results:rows,students,offerings:[offering]})
test('requires exact published subject maximum instead of exam-level total',()=>{
 assert.equal(approved([base]),true)
 assert.equal(approved([{...base,totalMarks:100}]),false)
 assert.equal(approved([{...base,subject:'English Written'}]),false)
 assert.equal(approved([{...base,studentId:102}]),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[]}),false)
})
test('prevents ambiguous or cross-tenant-offering selection',()=>{
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[offering,offering]}),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[{...offering,section:'Yellow'}]}),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[{...offering,total_marks:0}]}),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[{...offering,exam_id:10}]}),false)
 assert.equal(validatePaperMaxima({schoolId:22,results:[base],students,offerings:[offering]}),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[{...offering,approval_status:'pending'}]}),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[{...offering,approved_by_user_id:null}]}),false)
 assert.equal(validatePaperMaxima({schoolId:21,results:[base],students,offerings:[{...offering,reviewer_valid:false}]}),false)
})

test('Mover First Term has only seven approved subject names with a 250-mark scheme',()=>{
 const {official,officialMoverFirstTermAllows}=require('../services/officialMoverFirstTermPolicy')
 assert.equal(Object.values(official).reduce((x,y)=>x+y,0),250)
 assert.equal(Object.keys(official).length,7)
 const student=[{id:952,class:'Mover',section:'Purple'}]
 for(const [subject,max] of Object.entries(official)){
  const row={examId:9,studentId:952,subject,totalMarks:max}
  const off={...offering,class_name:'Mover',section:'Purple',subject,total_marks:max}
  assert.equal(validatePaperMaxima({schoolId:21,results:[row],students:student,offerings:[off]}),true,subject)
  assert.equal(validatePaperMaxima({schoolId:21,results:[{...row,totalMarks:100}],students:student,offerings:[{...off,total_marks:100}]}),false,subject)
 }
 const spoof={...offering,class_name:'Mover',section:'Purple',subject:'Computer',total_marks:100}
 assert.equal(validatePaperMaxima({schoolId:21,results:[{examId:9,studentId:952,subject:'Computer',totalMarks:100}],students:student,offerings:[spoof]}),false)
 assert.equal(officialMoverFirstTermAllows({examId:7,className:'Mover',subject:'Computer',totalMarks:100}),true)
})
test('Mover subject catalog cannot approve Computer or GK maximum 100',()=>{
 const {requestedPolicy,policyMatches}=require('../services/approvedExamSubjectPolicy')
 const q={exam_id:9,class_name:'Mover',section:'Purple',subject:'General Knowledge Oral'}
 const req=requestedPolicy(q)
 assert.ok(req)
 assert.equal(requestedPolicy({...q,subject:'Computer'}),null)
 const listed={...offering,class_name:'Mover',section:'Purple',subject:'General Knowledge Oral',total_marks:25}
 assert.equal(policyMatches(listed,req,21),true)
 assert.equal(policyMatches({...listed,total_marks:100},req,21),false)
})
test('Revision route must require only Principal role',()=>{
 const fs=require('node:fs'),path=require('node:path')
 const text=fs.readFileSync(path.resolve(__dirname,'../routes/examRoutes.js'),'utf8')
 assert.ok(text.includes("router.post('/results/:resultId/revision', protect, requireRoles('principal','owner')"))
 assert.equal(text.includes("requireRoles('principal','admin'), async (req,res)"),false)
})

test('Owner is school-scoped, never a platform tenant bypass',()=>{
 const fs=require('node:fs'),path=require('node:path')
 const middleware=fs.readFileSync(path.resolve(__dirname,'../middleware/auth.js'),'utf8')
 const tenant=fs.readFileSync(path.resolve(__dirname,'../middleware/tenant.js'),'utf8')
 const routes=fs.readFileSync(path.resolve(__dirname,'../routes/examRoutes.js'),'utf8')
 assert.ok(middleware.includes("const allowed = ['super_admin', 'admin', 'principal', 'owner']"))
 assert.ok(!/isSuperAdmin\s*=\s*role\s*===\s*'owner'/.test(middleware))
 assert.ok(!/isPlatform\s*=\s*role\s*===\s*'owner'/.test(tenant))
 assert.ok(routes.includes("requireRoles('principal','owner')"))
 assert.ok(!routes.includes("requireRoles('principal','owner','admin')"))
})

test('Owner may read approved subject policy only in its own signed school',()=>{
 const fs=require('node:fs'),path=require('node:path')
 const src=fs.readFileSync(path.resolve(__dirname,'../routes/portalRoutes.js'),'utf8')
 assert.ok(src.includes("!['teacher','admin','principal','owner'].includes(role)"))
 assert.ok(src.includes("u.role IN ('admin','principal','owner')) AS reviewer_valid"))
 assert.ok(src.includes('actorSchoolId !== schoolId'))
})

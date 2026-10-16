'use strict'
// Real Express assessmentStudioRoutes transport, synthetic actors and a disposable
// in-memory SQL client. Never touches a live user, production PostgreSQL or printer.
const test=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const http=require('node:http')
const path=require('node:path')
const express=require('express')
const service=require('../services/assessmentPrintJobs')

const source={title:'Synthetic True/False',sections:[{nodes:[
  {kind:'TRUE_FALSE',statement:'The sun is a star.',hasIndicatorBox:true,expectedAnswer:true},
  {kind:'TRUE_FALSE',statement:'Ice is hot.',hasIndicatorBox:true,expected_answer:false},
  {kind:'TRUE_FALSE',statement:'Water is wet.',hasIndicatorBox:true,'expected-answer':true},
  {kind:'MCQ',prompt:'Choose a planet.',answerLines:3,options:[{id:'A',text:'Mars',isCorrect:true},{id:'B',text:'Rock'}]},
  {kind:'NUMERICAL',prompt:'Show your calculation.',answerLines:4,
    structuredData:{formula:'F=ma',finalAnswer:'PRIVATE_NUMERICAL_RESULT'},
    markingRubric:['PRIVATE_STAFF_RUBRIC'],options:[{text:'Given'}]},
 ]}]}
const roster={context:{school_id:1,className:'Seven',section:'Blue'},students:[{studentId:'101',displayName:'Synthetic Student',rollNo:'05',section:'Blue'}]}
const printRecord={print_job_id:'job-synthetic-1',personalized:true,
 binding_snapshot_json:{teacherName:'Synthetic Teacher',subjectName:'Science'},
 render_settings_json:{includeStudentName:true,includeRollNumber:true},
 snapshot_json:source,content_hash:service.sha256(source),
 context_json:roster.context,students_json:roster.students,roster_hash:service.sha256(roster)}

const fakeDb={
 pool:{async connect(){return {
   async query(sql,params=[]){
     const q=String(sql)
     if(q.includes('FROM assessment_print_jobs j')&&q.includes('JOIN assessment_releases')){
       return {rows:Number(params[0])===1 && params[1]==='job-synthetic-1'?[printRecord]:[]}
     }
     return {rows:[],rowCount:0}
   },
   release(){}
 }}},
 async query(){return {rows:[]}},
}
const mocks={
 '../config/database':fakeDb,
 '../middleware/auth':{
   protect(req,res,next){
     const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'')
     if(token==='school1teacher')req.user={id:5,role:'teacher',school_id:1}
     else if(token==='school2teacher')req.user={id:6,role:'teacher',school_id:2}
     else return res.status(401).json({success:false,code:'SYNTHETIC_AUTH_REQUIRED'})
     return next()
   },
   requireRoles(...allowed){return (req,res,next)=>allowed.includes(req.user?.role)?next():res.status(403).json({success:false})},
 },
 '../middleware/tenant':{
   currentSchoolId(req){return req.user?.school_id||null},
   tenantClause(){throw new Error('Tenant clause not expected in print projection acceptance')},
 },
 '../services/grade910PaperWorkspaceReleaseGuard':{assertVerifiedPaperDocument(){throw new Error('Academic source review is outside Paper synthetic test')}},
 '../services/paperStudioInlineRichTextGuard':{validatePaperStudioInlineRichText(){return {valid:true}}},
}

test('HTTP student projection suppresses canonical true/false keys but staff print and tenant boundaries persist',{timeout:20000},async t=>{
 const routePath=path.resolve(__dirname,'../routes/assessmentStudioRoutes.js')
 const original=Module._load
 let router
 try{
   Module._load=function(request,parent,isMain){
     if(parent?.filename===routePath && Object.prototype.hasOwnProperty.call(mocks,request))return mocks[request]
     return original.apply(this,arguments)
   }
   delete require.cache[routePath]
   router=require(routePath)
 }finally{Module._load=original;delete require.cache[routePath]}
 const app=express();app.use(express.json());app.use('/api/assessment-studio',router)
 const server=await new Promise(ok=>{let s=http.createServer(app);s.listen(0,'127.0.0.1',()=>ok(s))})
 t.after(()=>new Promise(resolve=>server.close(resolve)))
 const base=`http://127.0.0.1:${server.address().port}/api/assessment-studio`
 async function get(suffix,actor){let response=await fetch(base+suffix,{headers:actor?{authorization:'Bearer '+actor}:{}});return {status:response.status,json:await response.json()}}
 const suffix='/print-jobs/job-synthetic-1/student-projection/101'
 const missingAuth=await get(suffix);assert.equal(missingAuth.status,401)
 const student=await get(suffix,'school1teacher');assert.equal(student.status,200,JSON.stringify(student.json));assert.equal(student.json.success,true)
 const paper=student.json.data.paper
 const nodes=paper.sections[0].nodes
 for(const n of nodes.slice(0,3)){
   assert.equal(n.hasIndicatorBox,true)
   assert.equal(Object.keys(n).some(k=>k.replace(/[^a-z0-9]/gi,'').toLowerCase()==='expectedanswer'),false,'hidden true/false answer leaked through HTTP')
 }
 assert.equal(nodes[0].statement,'The sun is a star.')
 assert.deepEqual(nodes[3].options.map(x=>x.text),['Mars','Rock'])
 assert.equal(nodes[3].answerLines,3)
 assert.equal(Object.hasOwn(nodes[3].options[0],'isCorrect'),false)
 assert.equal(nodes[4].prompt,'Show your calculation.')
 assert.equal(nodes[4].answerLines,4)
 assert.equal(nodes[4].structuredData.formula,'F=ma')
 assert.equal(Object.hasOwn(nodes[4].structuredData,'finalAnswer'),false,'numeric final answer leaked by student HTTP')
 assert.equal(Object.hasOwn(nodes[4],'markingRubric'),false,'marking rubric leaked by student HTTP')
 assert.equal(JSON.stringify(student.json).includes('PRIVATE_'),false,'private answer or rubric bytes leaked by student HTTP')
 assert.equal(student.json.data.personalization.student.rollNumber,'05')
 const staff=await get('/print-jobs/job-synthetic-1/answer-key','school1teacher')
 assert.equal(staff.status,200,JSON.stringify(staff.json))
 assert.equal(staff.json.data.paper.sections[0].nodes[0].expectedAnswer,true)
 assert.equal(staff.json.data.paper.sections[0].nodes[4].structuredData.finalAnswer,'PRIVATE_NUMERICAL_RESULT')
 assert.deepEqual(staff.json.data.paper.sections[0].nodes[4].markingRubric,['PRIVATE_STAFF_RUBRIC'])
 assert.equal(source.sections[0].nodes[0].expectedAnswer,true,'frozen original release mutated')
 const otherSchool=await get(suffix,'school2teacher')
 assert.equal(otherSchool.status,404,'peer-school must not be able to read same print-job ID')
 const otherStaff=await get('/print-jobs/job-synthetic-1/answer-key','school2teacher')
 assert.equal(otherStaff.status,404,'peer-school must not obtain staff answer key')
 const missingStudent=await get('/print-jobs/job-synthetic-1/student-projection/999','school1teacher')
 assert.equal(missingStudent.status,404,'foreign roster student must not be accepted')
 const initialHash=printRecord.content_hash
 try {
   printRecord.content_hash='0'.repeat(64)
   const tampered=await get(suffix,'school1teacher')
   assert.equal(tampered.status,409,'tampered release hash must fail closed')
 } finally {printRecord.content_hash=initialHash}
 const initialRosterHash=printRecord.roster_hash
 try {
   printRecord.roster_hash='0'.repeat(64)
   const tamperedRoster=await get(suffix,'school1teacher')
   assert.equal(tamperedRoster.status,409,'tampered roster hash must fail closed')
 } finally {printRecord.roster_hash=initialRosterHash}
 const initialPersonalized=printRecord.personalized
 try {
   printRecord.personalized=false
   const nonpersonalized=await get(suffix,'school1teacher')
   assert.equal(nonpersonalized.status,409,'unpersonalized job must not project a student copy')
 } finally {printRecord.personalized=initialPersonalized}
 console.log('CANONICAL_TRUEFALSE_STUDENT_HTTP 10/10 expected transport and security decisions PASS (synthetic actors)')
})

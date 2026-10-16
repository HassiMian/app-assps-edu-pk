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
 ]}]}
const roster={context:{school_id:1,className:'Seven',section:'Blue'},students:[{studentId:'101',displayName:'Synthetic Student',rollNo:'05',section:'Blue'}]}
const printRecord={print_job_id:'job-synthetic-1',personalized:true,
 binding_snapshot_json:{teacherUserId:'5',teacherName:'Synthetic Teacher',className:'Seven',section:'Blue',subjectName:'Science'},
 render_settings_json:{includeStudentName:true,includeRollNumber:true},
 snapshot_json:source,content_hash:service.sha256(source),
 context_json:roster.context,students_json:roster.students,roster_hash:service.sha256(roster)}

let syntheticAssignmentActive=true
const fakeDb={
 pool:{async connect(){return {
   async query(sql,params=[]){
     const q=String(sql)
     if(q.includes('FROM teacher_class_assignments')) {
       return {rows:[{allowed:syntheticAssignmentActive && Number(params[0])===1 && Number(params[1])===5 && params[2]==='Seven' && params[3]==='Science' && params[4]==='Blue'}]}
     }
     if(q.includes('FROM assessment_papers WHERE'))return {rows:[{id:77}],rowCount:1}
     if(q.includes('SELECT binding_snapshot_json FROM assessment_print_jobs'))return {rows:[{binding_snapshot_json:printRecord.binding_snapshot_json}],rowCount:1}
     if(q.includes('FROM assessment_releases ar')&&q.includes('ar.paper_id'))return {rows:[{release_id:'release-synthetic',signed_release_document:source}],rowCount:1}
     if(q.includes('INSERT INTO assessment_print_jobs'))return {rows:[{print_job_id:params[1],status:'CREATED',release_id:'release-synthetic'}],rowCount:1}
     if(q.includes('UPDATE assessment_print_jobs SET status'))return {rows:[{print_job_id:params[1],status:params[2],attempt_count:params[3],last_error:params[4]}],rowCount:1}
     if(q.includes('FROM assessment_print_jobs WHERE') && q.includes('FOR UPDATE')) return {rows:[{status:'CREATED',attempt_count:0,binding_snapshot_json:printRecord.binding_snapshot_json}],rowCount:1}
     if(q.includes('FROM assessment_print_jobs j')&&q.includes('JOIN assessment_releases')){
       return {rows:Number(params[0])===1 && params[1]==='job-synthetic-1'?[printRecord]:[],rowCount:1}
     }
     return {rows:[],rowCount:0}
   },
   release(){}
 }}},
 async query(sql,params=[]){
   if(String(sql).includes('FROM teacher_class_assignments'))return {rows:[{allowed:syntheticAssignmentActive && Number(params[0])===1 && Number(params[1])===5 && params[2]==='Seven' && params[3]==='Science' && params[4]==='Blue'}]}
   if(String(sql).includes('FROM assessment_print_jobs j')&&String(sql).includes('JOIN assessment_releases'))return {rows:Number(params[0])===1&&params[1]==='job-synthetic-1'?[printRecord]:[],rowCount:1}
   if(String(sql).includes('FROM assessment_print_jobs j')&&String(sql).includes('LEFT JOIN assessment_roster_snapshots')){
     return Number(params[0])===1&&params[1]==='job-synthetic-1'?{rows:[{print_job_id:'job-synthetic-1',binding_snapshot_json:printRecord.binding_snapshot_json,roster_context:roster.context}],rowCount:1}:{rows:[],rowCount:0}
   }
   return {rows:[],rowCount:0}
 },
}
const mocks={
 '../config/database':fakeDb,
 '../middleware/auth':{
   protect(req,res,next){
     const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'')
     if(token==='school1teacher')req.user={id:5,role:'teacher',school_id:1}
     else if(token==='school2teacher')req.user={id:6,role:'teacher',school_id:2}
     else if(token==='school1otherteacher')req.user={id:8,role:'teacher',school_id:1}
     else if(token==='school1principal')req.user={id:7,role:'principal',school_id:1}
     else return res.status(401).json({success:false,code:'SYNTHETIC_AUTH_REQUIRED'})
     return next()
   },
   requireRoles(...allowed){return (req,res,next)=>allowed.includes(req.user?.role)?next():res.status(403).json({success:false})},
 },
 '../middleware/tenant':{
   currentSchoolId(req){return req.user?.school_id||null},
   async tenantClause(){return {}},
 },
 '../services/grade910PaperWorkspaceReleaseGuard':{assertVerifiedPaperDocument({document}){if(document?.academicVerifiedSelections)throw new Error('Academic signed sources forbidden in this synthetic fixture');return {verifiedReferences:0}}},
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
 async function send(method,suffix,actor,body){const response=await fetch(base+suffix,{method,headers:{...(actor?{authorization:'Bearer '+actor}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,json:await response.json()}}
 async function get(suffix,actor){return send('GET',suffix,actor)}
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
 assert.equal(student.json.data.personalization.student.rollNumber,'05')
 const staff=await get('/print-jobs/job-synthetic-1/answer-key','school1teacher')
 assert.equal(staff.status,200,JSON.stringify(staff.json))
 assert.equal(staff.json.data.paper.sections[0].nodes[0].expectedAnswer,true)
 assert.equal(source.sections[0].nodes[0].expectedAnswer,true,'frozen original release mutated')
 // All print-job endpoints must fail closed, not just projections.
 const school1OwnJob=await get('/print-jobs/job-synthetic-1','school1teacher')
 assert.equal(school1OwnJob.status,200,'properly assigned teacher must retain print-job details')
 assert.equal(Object.hasOwn(school1OwnJob.json.data,'binding_snapshot_json'),false,'internal teacher scope binding must not be exposed in job details')
 const assignedJobStatus=await send('PATCH','/print-jobs/job-synthetic-1/status','school1teacher',{status:'QUEUED'})
 assert.equal(assignedJobStatus.status,200,'properly assigned teacher must be able to queue a print job')
 assert.equal(assignedJobStatus.json.data.status,'QUEUED')
 const assignedJobCreate=await send('POST','/papers/synthetic-paper/print-jobs','school1teacher',{printJobId:'job-positive',releaseId:'release-synthetic',teacherBinding:{className:'Seven',section:'Blue',subjectName:'Science'}})
 assert.equal(assignedJobCreate.status,201,'properly assigned teacher should create a print job with unsigned teacherUserId absent')
 const savedParentBinding=printRecord.binding_snapshot_json
 try {
   printRecord.binding_snapshot_json={...savedParentBinding,subjectName:'History'}
   const foreignParent=await send('POST','/papers/synthetic-paper/print-jobs','school1teacher',{printJobId:'job-synthetic-foreign-parent',releaseId:'release-synthetic',reprintMode:'UPDATED_JOB',parentPrintJobId:'job-synthetic-1',teacherBinding:{className:'Seven',section:'Blue',subjectName:'Science'}})
   assert.equal(foreignParent.status,403,'teacher must not associate an updated print job with an out-of-scope parent job')
 } finally {printRecord.binding_snapshot_json=savedParentBinding}
 const sameSchoolJobDetails=await get('/print-jobs/job-synthetic-1','school1otherteacher')
 assert.equal(sameSchoolJobDetails.status,403,'unassigned teacher must not read print-job roster context')
 const sameSchoolStatusWrite=await send('PATCH','/print-jobs/job-synthetic-1/status','school1otherteacher',{status:'QUEUED'})
 assert.equal(sameSchoolStatusWrite.status,403,'unassigned teacher must not change print-job status')
 const sameSchoolCreate=await send('POST','/papers/synthetic-paper/print-jobs','school1otherteacher',{printJobId:'job-synthetic-new',releaseId:'release-synthetic',teacherBinding:{teacherUserId:'8',className:'Seven',section:'Blue',subjectName:'Science'}})
 assert.equal(sameSchoolCreate.status,403,'unassigned teacher must not mint a spoofed print binding')
 const sameSchoolReprint=await send('POST','/papers/synthetic-paper/print-jobs','school1otherteacher',{printJobId:'job-synthetic-reprint',reprintMode:'REPRINT_ORIGINAL',parentPrintJobId:'job-synthetic-1'})
 assert.equal(sameSchoolReprint.status,403,'unassigned teacher must not clone another teacher print-job')
 const sameSchoolUnassigned=await get(suffix,'school1otherteacher')
 assert.equal(sameSchoolUnassigned.status,403,'same-school unassigned teacher must not receive student roster projections')
 const sameSchoolUnassignedKey=await get('/print-jobs/job-synthetic-1/answer-key','school1otherteacher')
 assert.equal(sameSchoolUnassignedKey.status,403,'same-school unassigned teacher must not receive source answer keys')
 const principal=await get(suffix,'school1principal')
 assert.equal(principal.status,200,'same-school principal should retain institutional print access')
 const principalAnswer=await get('/print-jobs/job-synthetic-1/answer-key','school1principal')
 assert.equal(principalAnswer.status,200,'same-school principal should retain institutional answer access')
 try {
   syntheticAssignmentActive=false
   const revoked=await get(suffix,'school1teacher')
   assert.equal(revoked.status,403,'teacher with revoked exact assignment must be denied student output')
   const revokedKey=await get('/print-jobs/job-synthetic-1/answer-key','school1teacher')
   assert.equal(revokedKey.status,403,'teacher with revoked assignment must be denied answer key')
 } finally {syntheticAssignmentActive=true}
 const savedBinding=printRecord.binding_snapshot_json
 try {
   printRecord.binding_snapshot_json={...savedBinding,teacherUserId:null}
   assert.equal((await get(suffix,'school1teacher')).status,200,'real frontend omits teacherUserId, so signed actor assignment must suffice')
   printRecord.binding_snapshot_json={...savedBinding,teacherUserId:'999'}
   assert.equal((await get(suffix,'school1teacher')).status,403,'signed actor must not accept client-supplied different teacher id')
   printRecord.binding_snapshot_json={...savedBinding,section:''}
   assert.equal((await get(suffix,'school1teacher')).status,403,'sectionless request must not inherit a section-specific assignment')
   printRecord.binding_snapshot_json={...savedBinding,subjectName:'History'}
   assert.equal((await get(suffix,'school1teacher')).status,403,'wrong print subject must deny teachers')
   printRecord.binding_snapshot_json={...savedBinding,className:'Eight'}
   assert.equal((await get('/print-jobs/job-synthetic-1/answer-key','school1teacher')).status,403,'wrong print class must deny teacher answer keys')
 } finally {printRecord.binding_snapshot_json=savedBinding}
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
 console.log('CANONICAL_TRUEFALSE_STUDENT_HTTP privacy, revoked assignment, staff-role, tenant and integrity cases PASS (synthetic actors)')
})

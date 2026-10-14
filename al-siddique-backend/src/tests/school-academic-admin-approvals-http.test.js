'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),Module=require('node:module')
const express=require('express')
const state={actor:true,identity:true,offering:1,conflict:0,duplicate:false,connectionFail:false,events:[],writes:[]}
const client={
 release(){},
 async query(sql,params=[]){
  const s=String(sql).replace(/\s+/g,' ')
  if(s==='BEGIN'||s==='COMMIT'||s==='ROLLBACK')return {rowCount:0,rows:[]}
  if(s.includes('FROM users WHERE id='))return {rowCount:state.actor?1:0,rows:state.actor?[{id:1}]:[]}
  if(s.includes('FROM exam_subjects x JOIN exams'))return {rowCount:1,rows:[{id:15,exam_id:9,class_name:'Four',section:'Blue',subject:'Urdu',approval_revision:1}]}
  if(s.includes('FROM exam_results r JOIN students'))return {rowCount:1,rows:[{n:state.conflict}]}
  if(s.includes('FROM users u JOIN employees p'))return {rowCount:state.identity?1:0,rows:state.identity?[{id:31}]:[]}
  if(s.includes('FROM exam_subjects x JOIN exam_class_enrollments'))return {rowCount:1,rows:[{n:state.offering}]}
  if(s.includes('FROM teacher_class_assignments WHERE'))return {rowCount:state.duplicate?1:0,rows:state.duplicate?[{id:4}]:[]}
  if(s.includes('INSERT INTO teacher_class_assignments')){state.writes.push(s);return {rowCount:1,rows:[{id:73}]}}
  if(s.includes('UPDATE exam_subjects')){state.writes.push(s);return {rowCount:1,rows:[]}}
  if(s.includes('INSERT INTO school_academic_approval_events')){state.events.push(params);return {rowCount:1,rows:[]}}
  throw Error('unexpected SQL: '+s.slice(0,80))
 }
}
const original=Module._load
Module._load=function(request,parent,isMain){
 if(parent?.filename?.includes('schoolAcademicApprovalCore.js') && request==='../config/database')
  return {pool:{connect:async()=>{if(state.connectionFail)throw Error('QA_CONNECTION_FAILURE');return client}},applyTenantContext:async()=>{}}
 if(parent?.filename?.includes('schoolAcademicApprovalCore.js') && request==='../middleware/auth')
  return {protect:(req,res,next)=>{
   req.user={id:1,role:req.headers['x-test-role']||'admin',school_id:Number(req.headers['x-test-actor-school']||1)}
   req.school_id=Number(req.headers['x-test-school']||1);next()
  }}
 return original.call(this,request,parent,isMain)
}
const r1=require('../routes/schoolAcademicApprovalRoutes')
const r2=require('../routes/schoolAcademicAssignmentRoutes')
Module._load=original
const app=express();app.use(express.json());app.use('/api/academic-approvals',r1,r2)
const body={evidenceSha256:'a'.repeat(64),evidenceReference:'official school paper verified',reviewDeclaration:'I_VERIFIED_THE_EXACT_OFFICIAL_SOURCE'}
let server,base
test.before(async()=>{server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port})
test.after(async()=>await new Promise(resolve=>server.close(resolve)))
const send=async(path,payload,headers={})=>{
 const response=await fetch(base+'/api/academic-approvals'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer qa-signed-fixture',...headers},body:JSON.stringify(payload)})
 return {status:response.status,data:await response.json()}
}
const reset=()=>Object.assign(state,{actor:true,identity:true,offering:1,conflict:0,duplicate:false,connectionFail:false,events:[],writes:[]})
test('signed active school admin approves exact compatible subject, retains evidence',async()=>{
 reset();const r=await send('/exam-subjects/15/approve',{...body,totalMarks:50,passMarks:20,expectedRevision:1})
 assert.equal(r.status,201);assert.equal(r.data.data.revision,2);assert.equal(state.events.length,1);assert.equal(state.writes.length,1)
})
test('teacher, peer-school, absent bearer and missing school-source fail closed',async()=>{
 reset();const req={...body,totalMarks:50,passMarks:20,expectedRevision:1}
 for(const headers of [{'x-test-role':'teacher'},{'x-test-actor-school':'2'},{'x-test-school':'2'},{Authorization:''}]){
  const r=await send('/exam-subjects/15/approve',req,headers);assert.equal(r.status,403)
 }
 const missing=await send('/exam-subjects/15/approve',{...req,evidenceSha256:''})
 assert.equal(missing.status,422);assert.equal(state.events.length,0);assert.equal(state.writes.length,0)
})
test('revised marks and historical denominator mismatches never auto-write marks',async()=>{
 reset();let r=await send('/exam-subjects/15/approve',{...body,totalMarks:50,passMarks:20,expectedRevision:2})
 assert.equal(r.status,409)
 state.conflict=3;r=await send('/exam-subjects/15/approve',{...body,totalMarks:100,passMarks:40,expectedRevision:1})
 assert.equal(r.status,409);assert.equal(state.events.length,0);assert.equal(state.writes.length,0)
})
test('approved exact teacher, staff identity and paper offering permit scoped grant',async()=>{
 reset();const r=await send('/teacher-assignments',{...body,examId:9,teacherUserId:31,employeeId:12,className:'Four',section:'Blue',subject:'Urdu'})
 assert.equal(r.status,201);assert.equal(r.data.data.assignmentId,73);assert.equal(state.events.length,1);assert.equal(state.writes.length,1)
})
test('teacher identity, missing offering, duplicate and blank section deny assignments',async()=>{
 const d={...body,examId:9,teacherUserId:31,employeeId:12,className:'Four',section:'Blue',subject:'Urdu'}
 reset();state.identity=false;assert.equal((await send('/teacher-assignments',d)).status,409)
 reset();state.offering=0;assert.equal((await send('/teacher-assignments',d)).status,409)
 reset();state.duplicate=true;assert.equal((await send('/teacher-assignments',d)).status,409)
 reset();assert.equal((await send('/teacher-assignments',{...d,section:''})).status,422)
 assert.equal(state.events.length,0);assert.equal(state.writes.length,0)
})

test('database connection failure returns controlled 503 without committing approvals',async()=>{
 reset();state.connectionFail=true
 const r=await send('/exam-subjects/15/approve',{...body,totalMarks:50,passMarks:20,expectedRevision:1})
 assert.equal(r.status,503);assert.equal(r.data.code,'ACADEMIC_APPROVAL_UNAVAILABLE')
 assert.equal(state.events.length,0);assert.equal(state.writes.length,0)
 reset()
})
test('40 percent passing marks derive from each exact maximum and conflicting requests fail',async()=>{
 for(const [total,expected] of [[25,10],[50,20],[60,24],[75,30],[100,40]]){
  reset()
  const reply=await send('/exam-subjects/15/approve',{...body,totalMarks:total,expectedRevision:1})
  assert.equal(reply.status,201,JSON.stringify(reply))
  assert.equal(reply.data.data.passMarks,expected)
  assert.equal(state.events.length,1)
 }
 reset()
 const invalid=await send('/exam-subjects/15/approve',{...body,totalMarks:75,passMarks:20,expectedRevision:1})
 assert.equal(invalid.status,422)
 assert.equal(state.events.length,0)
 assert.equal(state.writes.length,0)
})

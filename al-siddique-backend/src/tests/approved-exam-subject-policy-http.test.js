'use strict'
// Actual isolated Express HTTP transport, synthetic in-memory database doubles.
// Not actual staff authentication or production school approval.
const test=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const http=require('node:http')
const Module=require('node:module')
const path=require('node:path')
const {requestedPolicy,policyMatches,assignmentMatches}=require('../services/approvedExamSubjectPolicy')
const req={examId:9,cls:'Mover',section:'Purple',subject:'English Oral'}
const base={school_id:1,exam_id:9,class_name:'Mover',section:'Purple',subject:'English Oral',total_marks:25,is_active:true,approval_status:'approved',approval_revision:3,approved_by_user_id:12,approved_at:'2026-10-13T10:00:00Z',reviewer_valid:true}
const assignment={school_id:1,teacher_user_id:77,class_name:'Mover',section:'Purple',subject:'English Oral',is_active:true}
test('strict approval parser requires exact subject, active authentic reviewer and version',()=>{
 assert.equal(requestedPolicy({exam_id:'9',class_name:'Mover',section:'Purple',subject:'English Oral'}).examId,9)
 assert.equal(policyMatches(base,req,1),true)
 assert.equal(assignmentMatches(assignment,req,77,1),true)
 for(const edit of [{total_marks:1000.5},{total_marks:0},{is_active:false},{approval_status:'pending'},{approval_revision:0},{approved_by_user_id:null},{approved_at:null},{reviewer_valid:false},{school_id:2},{exam_id:7},{class_name:'Starter'},{subject:'English Written'},{section:'Pink'}]){
  assert.equal(policyMatches({...base,...edit},req,1),false,JSON.stringify(edit))
 }
 assert.equal(assignmentMatches({...assignment,school_id:2},req,77,1),false)
 assert.equal(assignmentMatches({...assignment,teacher_user_id:78},req,77,1),false)
})
test('actual Express HTTP subject policy route denies unassigned/cross-school/ambiguous/unapproved records',async t=>{
 let actor={role:'teacher',id:77,school_id:1}
 let approved=[{...base}]
 let assignments=[{...assignment}]
 let columns=4
 const hits=[]
 const db={query:async(sql,params)=>{
  hits.push({sql:String(sql),params})
  if(String(sql).includes('information_schema.columns'))return {rows:[{columns_ready:columns}]}
  if(String(sql).includes('FROM teacher_class_assignments'))return {rows:assignments}
  if(String(sql).includes('FROM exam_subjects x'))return {rows:approved}
  return {rows:[]}
 }}
 const auth={protect:(req,_res,next)=>{req.user=actor;next()},requireRoles:()=>()=>{}}
 const tenant={currentSchoolId:()=>actor.school_id}
 const routerPath=path.resolve(__dirname,'../routes/portalRoutes.js')
 const orig=Module._load
 let router
 try{
  delete require.cache[routerPath]
  Module._load=function(request,parent,isMain){
   if(parent?.filename===routerPath){
    if(request==='../config/database')return db
    if(request==='../middleware/auth')return auth
    if(request==='../middleware/tenant')return tenant
   }
   return orig.apply(this,arguments)
  }
  router=require(routerPath)
 }finally{Module._load=orig;delete require.cache[routerPath]}
 const app=express();app.use('/api/portal',router)
 const server=await new Promise(resolve=>{let s=http.createServer(app);s.listen(0,'127.0.0.1',()=>resolve(s))})
 t.after(()=>new Promise(resolve=>server.close(resolve)))
 const route='/api/portal/assessment-subject-policy?exam_id=9&class_name=Mover&section=Purple&subject=English%20Oral'
 const get=async()=>{const response=await fetch('http://127.0.0.1:'+server.address().port+route);return {status:response.status,data:await response.json()}}
 let r=await get();assert.equal(r.status,200);assert.equal(r.data.data.total_marks,25);assert.equal(r.data.data.revision,3);assert.equal(hits.at(-1).params[0],1)
 actor={role:'teacher',id:78,school_id:1};r=await get();assert.equal(r.status,403)
 actor={role:'teacher',id:77,school_id:1};assignments=[];r=await get();assert.equal(r.status,403)
 assignments=[{...assignment}];approved=[];r=await get();assert.equal(r.status,409)
 approved=[{...base},{...base}];r=await get();assert.equal(r.status,409)
 approved=[{...base,reviewer_valid:false}];r=await get();assert.equal(r.status,409)
 approved=[{...base}];columns=3;r=await get();assert.equal(r.status,503)
 columns=4;actor={role:'student',id:99,school_id:1};r=await get();assert.equal(r.status,403)
 actor={role:'teacher',id:77,school_id:2};r=await get();assert.equal(r.status,403)
 actor={role:'admin',id:12,school_id:1};r=await get();assert.equal(r.status,200)
 console.log('ISOLATED_CORE_SUBJECT_POLICY_HTTP_DENIAL_PASS without production connection')
})

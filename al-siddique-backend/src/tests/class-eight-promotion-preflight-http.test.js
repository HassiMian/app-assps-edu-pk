'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const http=require('node:http')
const Module=require('node:module')
const express=require('express')
let school=1,role='admin',missingPolicy=false,failedDb=false,ready=false,rosterMatch=true
const trace=[]
const policy=()=>({id:1,exam_id:9,source_class:'Eight',source_section:'Blue',
 destination_class:'Pre-Nine',destination_section:ready?'Blue':null,
 academic_session:'2026-2027',historical_exam_name:'First Term Exam',
 passing_percentage:40,baseline_student_count:11,expected_subject_count:7,
 status:ready?'READY_FOR_APPROVED_PROMOTION':'AWAITING_RESULTS_AND_PRINT',
 print_verified_at:ready?'2026-10-14T15:00:00Z':null,
 result_snapshot_sha256:ready?'a'.repeat(64):null,
 academic_approved_at:ready?'2026-10-14T15:00:00Z':null,executed_at:null})
const subjectRows=()=>['Computer','English','Islamiyat','Mathematics','Quran / Nazra','Science','Urdu']
.map(name=>({subject:name,entered:['Science','Quran / Nazra'].includes(name)?0:11,
 below_passing:name==='Mathematics'?5:0,invalid:0,official_maximum_approved:false}))
const load=Module._load
Module._load=function(name,parent,isMain){
 if(parent?.filename?.endsWith('classEightPromotionPreflightRoutes.js')&&name==='../config/database')
  return {query:async(sql,params)=>{
   trace.push(params)
   if(failedDb)throw Error('QA_DB_OUTAGE')
   if(sql.includes('FROM public.school_class_promotion_plans'))
    return {rows:missingPolicy||school!==1?[]:[policy()]}
   if(sql.includes('FROM public.students WHERE'))
    return {rows:[{n:11}]}
   if(sql.includes('FROM public.school_class_promotion_source_roster'))
    return {rows:[{captured:11,still_source:rosterMatch?11:10,historical_score_rows:55}]}
   if(sql.includes('FROM public.exam_subjects es'))
    return {rows:subjectRows()}
   throw Error('Unrecognized SQL fixture')
  }}
 if(parent?.filename?.endsWith('classEightPromotionPreflightRoutes.js')&&name==='../middleware/auth')
  return {protect:(req,res,next)=>{
   if(!req.headers.authorization)return res.sendStatus(401)
   req.user={role};req.school_id=school;next()
  },requireScopeForServiceOnly:()=>(_req,_res,next)=>next()}
 return load.call(this,name,parent,isMain)
}
const routes=require('../routes/classEightPromotionPreflightRoutes')
Module._load=load
const app=express();app.use('/api/academic-promotions',routes)
let srv,base
test.before(async()=>{srv=http.createServer(app);await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+srv.address().port})
test.after(async()=>await new Promise(resolve=>srv.close(resolve)))
const request=async(auth=true)=>{
 const response=await fetch(base+'/api/academic-promotions/eight-to-pre-nine/preflight',{
  headers:auth?{Authorization:'Bearer synthetic'}:{}})
 const body=await response.json().catch(()=>null)
 return {status:response.status,body}
}
const reset=()=>{school=1;role='admin';missingPolicy=false;failedDb=false;ready=false;rosterMatch=true;trace.length=0}
test('authentic school role fixture sees pending print and missing Science, never promotes',async()=>{
 reset()
 const r=await request()
 assert.equal(r.status,200)
 assert.equal(r.body.plan.enrolledStudents,11)
 assert.equal(r.body.plan.frozenOriginalCohortCount,11)
 assert.equal(r.body.plan.historicalLinkedScoreCount,55)
 assert.equal(r.body.plan.originalCohortPreserved,true)
 assert.equal(r.body.plan.originalExamName,'First Term Exam')
 assert.equal(r.body.plan.sourceClass,'Eight')
 assert.equal(r.body.plan.targetClass,'Pre-Nine')
 assert.equal(r.body.plan.canPromoteNow,false)
 assert.ok(r.body.releaseHoldReasons.includes('PRE_NINE_DESTINATION_NOT_CANONICAL'))
 assert.equal(r.body.plan.printedResultCardsVerified,false)
 assert.equal(r.body.plan.passingPercentage,40)
 assert.deepEqual(r.body.missingSubjects,['Quran / Nazra','Science'])
 assert.equal(r.body.readOnly,true)
 assert.equal(r.body.noStudentClassChanged,true)
 assert.equal(trace.at(0)[0],1)
})
test('unauthenticated and teacher cannot read school promotion plan',async()=>{
 reset();assert.equal((await request(false)).status,401)
 role='teacher';assert.equal((await request()).status,403)
})
test('separately identified school never receives school1 promotion policy',async()=>{
 reset();school=2
 const r=await request();assert.equal(r.status,404)
 assert.equal(trace.at(0)[0],2)
})
test('print approval alone cannot bypass missing scores or maxima',async()=>{
 reset();ready=true
 const r=await request();assert.equal(r.status,200)
 assert.equal(r.body.plan.printedResultCardsVerified,true)
 assert.equal(r.body.plan.canPromoteNow,false)
 assert.ok(r.body.releaseHoldReasons.includes('SCHEDULED_MARKS_INCOMPLETE'))
 assert.ok(r.body.releaseHoldReasons.includes('PAPER_MAXIMA_NOT_APPROVED'))
})
test('database failure fails closed with 503 and no writes',async()=>{
 reset();failedDb=true
 assert.equal((await request()).status,503)
})

test('live number of students alone is insufficient if original cohort membership changed',async()=>{
 reset()
 rosterMatch=false
 const r=await request()
 assert.equal(r.status,200)
 assert.equal(r.body.plan.enrolledStudents,11)
 assert.equal(r.body.plan.originalCohortPreserved,false)
 assert.equal(r.body.plan.canPromoteNow,false)
 assert.ok(r.body.releaseHoldReasons.includes('HISTORICAL_CLASS_EIGHT_ROSTER_NOT_VERIFIED'))
})

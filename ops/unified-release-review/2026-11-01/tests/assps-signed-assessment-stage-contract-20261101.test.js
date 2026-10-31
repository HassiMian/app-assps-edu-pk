'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const path=require('node:path')
const stageFile=path.resolve(__dirname,'../routes/schoolAcademicCatalogStageRoutes.js')
const originalLoad=Module._load
let route,commit,executor,audits=[]
const fakeRouter={stack:[],post(routePath,...handlers){this.stack.push({routePath,handlers})}}
Module._load=function(name,parent,...args) {
 if(name==='./schoolAcademicApprovalCore'&&parent?.filename===stageFile)
  return {router:fakeRouter,protect:(_r,_s,n)=>n?.(),id:x=>Number.isSafeInteger(Number(x))&&Number(x)>0?Number(x):0,
    withApproval:async(req,res,fn)=>{commit=await fn(executor,{school:1,uid:11});return commit},
    audit:async(_db,actor,req,action,examId,objectId,oldRev,newRev)=>{
      audits.push({actor,action,examId,objectId,oldRev,newRev,evidence:req.body?.evidenceSha256})
    }}
 return originalLoad.call(this,name,parent,...args)
}
try{route=require(stageFile)}finally{Module._load=originalLoad}
const registered=fakeRouter.stack.find(x=>x.routePath==='/assessment-catalog/:examId/stage')
assert.ok(registered)
const handler=registered.handlers.at(-1)
const originalRows=[
 {class_name:'Six',section:'Blue',subject:'English A'},
 {class_name:'Six',section:'Blue',subject:'Science'},
 {class_name:'Seven',section:'Blue',subject:'Mathematics'}
]
function fixture({rows=originalRows,existing=0,pass=8,max=20}={}){
 const calls=[];let issuedId=6000
 executor={async query(statement,args) {
  const sql=String(statement).replace(/\s+/g,' ')
  calls.push({sql,args})
  if(sql.includes('SELECT pg_advisory_xact_lock'))return {rowCount:1,rows:[{}]}
  if(sql.includes('FROM exams WHERE id=$1 AND school_id=$2'))return {rowCount:1,rows:[{id:14,name:'Assessment 1',type:'AS',class:'All Classes',session:'2026-27',total_marks:max,pass_marks:pass}]}
  if(sql.includes('FROM grade_settings'))return {rowCount:1,rows:[{max_percentage:39}]}
  if(sql.includes('SELECT DISTINCT a.class_name'))return {rowCount:rows.length,rows}
  if(sql.includes('SELECT COUNT(*)::int AS n FROM exam_subjects'))return {rowCount:1,rows:[{n:existing}]}
  if(sql.includes('INSERT INTO exam_class_enrollments'))return {rowCount:1,rows:[]}
  if(sql.includes('INSERT INTO exam_subjects'))return {rowCount:1,rows:[{id:++issuedId}]}
  throw new Error('Unexpected SQL in synthetic test: '+sql.slice(0,70))
 }}
 audits=[]
 return calls
}
const req={params:{examId:'14'},body:{evidenceSha256:'a'.repeat(64),evidenceReference:'QA source ref only',reviewDeclaration:'I_VERIFIED_THE_EXACT_OFFICIAL_SOURCE'}}
test('signed service mounts POST under guarded approval boundary',()=>{
 assert.equal(registered.handlers.length,2)
 assert.ok(registered.handlers[0])
 assert.equal(fakeRouter.stack.length,1)
 assert.equal(route,fakeRouter)
})
test('exact reviewed source creates only pending offerings and audit per offering',async()=>{
 const calls=fixture()
 const result=await handler(req,{})
 assert.equal(result.data.stagedSubjectOfferings,3)
 assert.equal(result.data.stagedCohorts,2)
 assert.equal(result.data.approvalStatus,'pending')
 assert.equal(result.data.principalSubjectApprovalStillRequired,true)
 assert.equal(audits.length,3)
 assert.ok(audits.every(x=>x.action==='assessment_catalog_stage'&&x.actor.uid===11&&x.examId===14))
 assert.equal(calls.filter(x=>x.sql.includes('INSERT INTO exam_subjects')).length,3)
 assert.equal(calls.filter(x=>x.sql.includes('INSERT INTO exam_class_enrollments')).length,2)
 assert.ok(calls.every(x=>!/(^|\s)UPDATE\s/i.test(x.sql)))
 assert.ok(calls.filter(x=>x.sql.includes('INSERT INTO exam_subjects')).every(x=>/['"]?pending['"]?/.test(x.sql)))
})
test('staging is rejected for exam with existing catalog',async()=>{
 const calls=fixture({existing:1})
 const result=await handler(req,{})
 assert.equal(result.error,'ASSESSMENT_CATALOG_ALREADY_EXISTS')
 assert.equal(calls.filter(x=>x.sql.includes('INSERT INTO exam_subjects')).length,0)
 assert.equal(audits.length,0)
})
test('staging fails closed when exam pass marks conflict with F grade band',async()=>{
 const calls=fixture({pass:7})
 const result=await handler(req,{})
 assert.equal(result.error,'ASSESSMENT_PASS_MARKS_POLICY_CONFLICT')
 assert.equal(calls.filter(x=>x.sql.includes('INSERT INTO exam_subjects')).length,0)
})
test('case-insensitive duplicate teacher subjects are rejected',async()=>{
 const calls=fixture({rows:[
 {class_name:'Seven',section:'Blue',subject:'Science'},
 {class_name:'Seven',section:'Blue',subject:'science'}
 ]})
 const result=await handler(req,{})
 assert.equal(result.error,'DUPLICATED_REVIEWED_SUBJECTS')
 assert.equal(calls.filter(x=>x.sql.includes('INSERT INTO exam_subjects')).length,0)
})
test('no valid staffed source means no academic offerings may be staged',async()=>{
 const calls=fixture({rows:[]})
 const result=await handler(req,{})
 assert.equal(result.error,'VERIFIED_ACTIVE_TEACHING_SCOPE_REQUIRED')
 assert.equal(calls.filter(x=>x.sql.includes('INSERT INTO exam_subjects')).length,0)
})

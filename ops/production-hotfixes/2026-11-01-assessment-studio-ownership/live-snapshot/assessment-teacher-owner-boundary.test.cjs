'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {isTeacher,resourceFromPath,teacherOwnerBoundary}=require('./assessmentStudioTeacherBoundary.js')
function verify(request,{storedOwner='99',dbFail=false}={}){
 const calls=[]
 const query=async (sql,params)=>{
  calls.push({sql,params})
  if(dbFail)throw Object.assign(new Error('synthetic outage'),{code:'DB_SYNTHETIC_OUTAGE'})
  return {rows:storedOwner===null?[]:[{created_by_key:storedOwner}]}
 }
 const guard=teacherOwnerBoundary({query,schoolIdForRequest:()=>1,actorKey:(r)=>String(r.user?.id),
  safePublicId:(v)=>/^[A-Za-z0-9._:-]+$/.test(v)?v:null})
 const req={user:{role:'teacher',id:42},method:'GET',path:'/papers/example-42',body:{},...request}
 let nextCount=0,response=null
 const res={status(n){this.statusCode=n;return this},json(o){response={status:this.statusCode,body:o};return this}}
 return guard(req,res,()=>{nextCount++}).then(()=>({calls,nextCount,response}))
}
test('teacher is not platform Principal',()=>{assert.equal(isTeacher({role:'teacher'}),true);assert.equal(isTeacher({role:'principal'}),false)})
test('resource classification includes paper and print-job nested views',()=>{
 assert.equal(resourceFromPath('/papers/p1/releases/latest').type,'paper')
 assert.equal(resourceFromPath('/papers/p1/print-jobs').type,'paper')
 assert.equal(resourceFromPath('/print-jobs/j1/answer-key').type,'print-job')
 assert.equal(resourceFromPath('/print-jobs/j1/student-projection/s7').type,'print-job')
 assert.equal(resourceFromPath('/papers/%70aper-42').id,'paper-42')
})
test('different teacher paper read and revision is rejected',async()=>{
 for(const path of ['/papers/example-42','/papers/example-42/revisions','/papers/example-42/releases/latest']){
  const r=await verify({path});assert.equal(r.response.status,404);assert.equal(r.nextCount,0);assert.equal(r.calls[0].params[0],1)
 }
})
test('different teacher cannot create reprint, view answer key, or change job status',async()=>{
 for(const path of ['/papers/example-42/print-jobs','/print-jobs/other/answer-key','/print-jobs/other/status']){
  const r=await verify({path,method:path.endsWith('status')?'PATCH':'GET'})
  assert.equal(r.response.status,404);assert.equal(r.nextCount,0)
 }
})
test('percent-encoded paper id does not bypass owner check',async()=>{
 const r=await verify({path:'/papers/%65xample-42'})
 assert.equal(r.response.status,404);assert.equal(r.nextCount,0)
})
test('teacher own paper and own print job are allowed',async()=>{
 const p=await verify({path:'/papers/example-42'},{storedOwner:'42'})
 const j=await verify({path:'/print-jobs/own-job/answer-key'},{storedOwner:'42'})
 assert.equal(p.nextCount,1);assert.equal(j.nextCount,1);assert.equal(j.response,null)
})
test('Principal access is not restricted to own paper',async()=>{
 const p=await verify({user:{role:'principal',id:99}},{storedOwner:'42'})
 assert.equal(p.nextCount,1);assert.equal(p.calls.length,0)
})
test('missing staff account id and database errors fail closed',async()=>{
 const noId=await verify({user:{role:'teacher',id:null}})
 const dbError=await verify({},{dbFail:true})
 assert.equal(noId.response.status,403);assert.equal(dbError.response.status,503)
})
test('new revision initial creation stays supported; original handler handles atomic unique key',async()=>{
 const r=await verify({path:'/papers/new-42/revisions',method:'POST',body:{expectedRevision:0}},{storedOwner:null})
 assert.equal(r.nextCount,1);assert.equal(r.response,null)
})

'use strict'
const {test,after}=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const http=require('node:http')
const crypto=require('node:crypto')
const sha=t=>crypto.createHash('sha256').update(t).digest('hex')
const admin={id:101,role:'principal',school_id:1}
const teacher={id:102,role:'teacher',school_id:1}
const authPath=require.resolve('../middleware/auth')
const oldAuth=require.cache[authPath]
require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{
 protect:(req,res,next)=>{
   const h=String(req.headers['x-test-actor']||'')
   if(h==='principal') req.user=admin
   else if(h==='teacher') req.user=teacher
   else return res.status(401).json({code:'TEST_AUTH_REQUIRED'})
   next()
 },
 requireRoles:(...roles)=>(req,res,next)=>
   roles.includes(req.user?.role)?next():res.status(403).json({code:'TEST_ROLE_DENIED'})
}}
const routePath=require.resolve('../routes/lessonPlanRoutes')
delete require.cache[routePath]
const route=require('../routes/lessonPlanRoutes')
if(oldAuth) require.cache[authPath]=oldAuth
else delete require.cache[authPath]
const app=express();app.use(express.json({limit:'512kb'}));app.use('/api/lesson-plans',route)
let server
const candidate=()=>({
 candidate_key:'LPREVIEW-20261014-starter-english',school_id:1,
 class_display:'Play',proposed_class_level:'Starter',source_subject_label:'English',
 teacher_user_id:null,document_owner_id:null,section_id:null,canonical_subject_id:null,
 canonical_term_id:null,reviewer_identity:null,approval_signature:null,corrected_schedule:null,
 source_submissions:['WA14-L2847'],source_detail_records:[{
  source_id:'WA14-L2847',source_body_sha256:sha('original'),
  source_excerpt_pieces:[{source_start_line:1,source_end_line:1,verbatim:'Private text'}]
 }],
 publish_status:'BLOCKED',sent_to_portal:false,ready_for_post_api:false,
 safe_import_mode:'REVIEW_ONLY_APPEND_LINKED_SOURCES',
 review_state:'AWAITING_SUBJECT_OWNER_AND_ACADEMIC_QA'
})
const payload=()=>({reviewBatch:{
 schema:'assps.lesson_plan.review_import.v1',
 source_zip_sha256:sha('zip'),source_txt_sha256:sha('txt'),
 candidates:[candidate()],unassigned_evidence:['WA14-L1719']
}})
async function request(actor,body,path='/planner/composer-review-preview',method='POST'){
 const data=JSON.stringify(body)
 const port=server.address().port
 return new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port,path:'/api/lesson-plans'+path,
   method,headers:{'content-type':'application/json','content-length':Buffer.byteLength(data),'x-test-actor':actor}},res=>{
    let raw='';res.on('data',x=>raw+=x);res.on('end',()=>{
      try{resolve({status:res.statusCode,body:JSON.parse(raw)})}catch(err){reject(err)}
    })
  })
  req.on('error',reject);req.end(data)
 })
}
test('isolated HTTP negative gates for composer review (mock actor; NOT live JWT acceptance)',async()=>{
 server=app.listen(0,'127.0.0.1')
 await new Promise(resolve=>server.once('listening',resolve))
 let r=await request('',payload());assert.equal(r.status,401)
 r=await request('teacher',payload());assert.equal(r.status,403)
 r=await request('principal',payload())
 assert.equal(r.status,200);assert.equal(r.body.publicationAllowed,false)
 assert.equal(r.body.data.candidateCount,1)
 assert.equal(r.body.data.candidates[0].teacherUserId,null)
 assert.equal(JSON.stringify(r.body).includes('Private text'),false)
 const cross=payload();cross.reviewBatch.candidates[0].school_id=2
 r=await request('principal',cross);assert.equal(r.status,422);assert.equal(r.body.code,'CROSS_TENANT_CANDIDATE')
 const publish=payload();publish.reviewBatch.candidates[0].publish_status='APPROVED'
 r=await request('principal',publish);assert.equal(r.status,422);assert.equal(r.body.code,'UNSAFE_PUBLICATION_STATE')
 const owner=payload();owner.reviewBatch.candidates[0].teacher_user_id=4191
 r=await request('principal',owner);assert.equal(r.status,422);assert.equal(r.body.code,'UNVERIFIED_ASSIGNMENT_OR_APPROVAL')
})
test('import release gate denies simulated teacher and manager by default',async()=>{
 const c=payload()
 let r=await request('teacher',c,'/planner/composer-review-import')
 assert.equal(r.status,403)
 assert.equal(r.body.code,'COMPOSER_REVIEW_MANAGER_REQUIRED')
 r=await request('principal',c,'/planner/composer-review-import')
 assert.equal(r.status,503)
 assert.equal(r.body.code,'COMPOSER_IMPORT_RELEASE_HOLD')
})
test('correction route requires school manager and stays release-disabled',async()=>{
 const c={sourceId:'WA14-L2847',changeType:'DATE_PROPOSAL',
  proposedText:'Proposed 2027-01-05',rationale:'Source date is inconsistent with school calendar',
  expectedRevision:1}
 const url='/planner/composer-review-correction/LPREVIEW-20261014-starter-english'
 let r=await request('teacher',c,url)
 assert.equal(r.status,403)
 assert.equal(r.body.code,'COMPOSER_CORRECTION_MANAGER_REQUIRED')
 r=await request('principal',c,url)
 assert.equal(r.status,503)
 assert.equal(r.body.code,'COMPOSER_CORRECTION_RELEASE_HOLD')
})
test('source and class list are management-only',async()=>{
 let r=await request('teacher',{},'/planner/composer-review-classes','GET')
 assert.equal(r.status,403)
 r=await request('teacher',{},'/planner/composer-review-source/LPREVIEW-20261014-starter-english','GET')
 assert.equal(r.status,403)
})
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve))})

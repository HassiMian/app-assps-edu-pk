'use strict'
process.env.DB_STARTUP_PROBE='false'
process.env.DB_RUNTIME_ROLE='assps_qa_restricted'
const test=require('node:test'),assert=require('node:assert/strict')
const path=require('node:path')
const express=require(require.resolve('express',{paths:[path.join(__dirname,'../../al-siddique-backend')]}))
const authPath=require.resolve('../../al-siddique-backend/src/middleware/auth')
require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{
 protect(req,res,next){
 const who=req.get('x-qa-role')
 if(!who)return res.status(401).json({success:false})
 req.user=who==='teacher'?{id:50,school_id:1,role:'teacher'}:
  who==='principal'?{id:10,school_id:1,role:'principal'}:
  {id:51,school_id:2,role:'teacher'}
 return next()
 },
 requireRoles:(...roles)=>(req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).end()
}}
const {sha}=require('../../al-siddique-backend/src/services/grade910VerifiedPublicationContract')
const payload={originalQuestionId:'IX-BIO-01',questionRevision:7,finalQuestion:{text:'A verified and reviewed question'},finalAnswer:{answer:'Verified answer'}}
const SQL=[],H='a'.repeat(64)
const row=(overrides={})=>({
 school_id:1,original_question_id:'IX-BIO-01',question_revision:7,question_sha:sha(payload.finalQuestion),answer_sha:sha(payload.finalAnswer),
 grade:9,subject:'Biology',medium:'english',
 original_source_pdf_sha:H,catalog_id:'pectaa-catalog-009',
 verified_review_packet_sha:H,qualified_faculty_receipt_sha:H,school_book_certificate_sha:H,
 principal_approval_sha:H,publication_grant_sha:H,
 academic_approval_verified:true,paper_studio_acceptance_verified:true,core_restricted_release_verified:true,
 published_at:'2026-10-14T00:00:00Z',revoked_at:null,paper_payload:payload,
 ...overrides
})
let responseRows=[]
const dbPath=require.resolve('../../al-siddique-backend/src/config/database')
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:async(sql,args)=>{
 SQL.push({sql,args})
 return{rows:responseRows}
}}}
const route=require('../../al-siddique-backend/src/routes/grade910VerifiedPickerRoutes')
const eligible=route.eligible
test('positive synthetic row requires all independent certificates and published revision',()=>{
 assert.equal(eligible(row()),true)
 for(const diff of [{academic_approval_verified:false},{paper_studio_acceptance_verified:false},
  {core_restricted_release_verified:false},{revoked_at:'2026-10-15T00:00:00Z'},
  {qualified_faculty_receipt_sha:null},{publication_grant_sha:'fake'}, {published_at:null}, {answer_sha:'0'.repeat(64)},
  {paper_payload:{...payload,finalQuestion:{text:'tampered revision'}}}])
  assert.equal(eligible(row(diff)),false)
})
test('actual HTTP picker enforces school, teacher assignment SQL, immutable resolve and zero unpublished',async t=>{
 const app=express();app.use('/api/grade910-verified-picker',route)
 const server=app.listen(0,'127.0.0.1');t.after(()=>server.close())
 await new Promise(r=>server.once('listening',r))
 const base='http://127.0.0.1:'+server.address().port+'/api/grade910-verified-picker'
 responseRows=[]
 assert.equal((await fetch(base+'/approved-only?grade=9&subject=Biology&section=Usman')).status,401)
 assert.equal((await fetch(base+'/approved-only?grade=9&subject=Biology',{headers:{'x-qa-role':'teacher'}})).status,422)
 const zero=await fetch(base+'/approved-only?grade=9&subject=Biology&section=Usman',{headers:{'x-qa-role':'teacher'}})
 assert.equal(zero.status,200);assert.equal((await zero.json()).verifiedCount,0)
 const scope=SQL.at(-1)
 assert.match(scope.sql,/teacher_class_assignments/)
 assert.match(scope.sql,/t\.teacher_user_id=\$4/)
 assert.deepEqual(scope.args.slice(0,5),[1,9,'Biology',50,'Usman'])
 responseRows=[row({academic_approval_verified:false}),row()]
 const ok=await fetch(base+'/approved-only?grade=9&subject=Biology',{headers:{'x-qa-role':'principal'}})
 assert.equal(ok.status,200);const body=await ok.json()
 assert.equal(body.verifiedCount,1);assert.equal(body.records[0].questionSha,sha(payload.finalQuestion))
 assert.equal(body.records[0].academicallyVerified,true)
 responseRows=[row()]
 const resolved=await fetch(base+'/resolve-revision?grade=9&subject=Biology&originalQuestionId=IX-BIO-01&revision=7&questionSha='+sha(payload.finalQuestion),{headers:{'x-qa-role':'principal'}})
 assert.equal(resolved.status,200);assert.equal((await resolved.json()).records.length,1)
 assert.match(SQL.at(-1).sql,/p\.question_revision=/)
 assert.equal((await fetch(base+'/resolve-revision?grade=9&subject=Biology&revision=7&questionSha='+sha(payload.finalQuestion),{headers:{'x-qa-role':'principal'}})).status,422)
 responseRows=[]
 const peer=await fetch(base+'/approved-only?grade=9&subject=Biology&section=Usman',{headers:{'x-qa-role':'other'}})
 assert.equal(peer.status,200);assert.equal((await peer.json()).verifiedCount,0)
 assert.equal(SQL.at(-1).args[0],2)
})

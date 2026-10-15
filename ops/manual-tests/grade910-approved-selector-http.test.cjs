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
  who==='admin'?{id:5,school_id:1,role:'admin'}:
  {id:51,school_id:2,role:'teacher'}
 return next()
 },
 requireRoles:(...roles)=>(req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).end()
}}
const crypto=require('node:crypto')
const {sha,publicationMessage}=require('../../al-siddique-backend/src/services/grade910VerifiedPublicationContract')
const ephemeral=crypto.generateKeyPairSync('ed25519')
process.env.ASSPS_GRADE910_PUBLISHER_PUBLIC_KEY_PEM=ephemeral.publicKey.export({type:'spki',format:'pem'})
process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256=crypto.createHash('sha256')
 .update(ephemeral.publicKey.export({type:'spki',format:'der'})).digest('hex')
const payload={originalQuestionId:'IX-BIO-01',questionRevision:7,finalQuestion:{text:'A verified and reviewed question'},finalAnswer:{answer:'Verified answer'}}
let signedReady=true
const SQL=[],H='a'.repeat(64)
const unsignedRow=()=>({
 school_id:1,original_question_id:'IX-BIO-01',question_revision:7,question_sha:sha(payload.finalQuestion),answer_sha:sha(payload.finalAnswer),
 grade:9,subject:'Biology',medium:'english',
 original_source_pdf_sha:H,catalog_id:'pectaa-catalog-009',
 verified_review_packet_sha:H,qualified_faculty_receipt_sha:H,school_book_certificate_sha:H,
 principal_approval_sha:H,publication_grant_sha:H,
 academic_approval_verified:true,paper_studio_acceptance_verified:true,core_restricted_release_verified:true,
 published_at:'2026-10-14T00:00:00Z',revoked_at:null,paper_payload:payload,
})
const row=(overrides={})=>{
 const r=unsignedRow()
 r.publication_signature_base64=crypto.sign(null,publicationMessage(r),ephemeral.privateKey).toString('base64')
 return {...r,...overrides}
}
// Sign post-mutation test fixtures so a properly signed peer-school publication
// still fails the RESPONSE-SIDE tenant/grade/subject/revision boundary.
const authenticallySigned=(overrides={})=>{
 const r={...unsignedRow(),...overrides}
 r.publication_signature_base64=crypto.sign(null,publicationMessage(r),ephemeral.privateKey).toString('base64')
 return r
}
let responseRows=[]
const dbPath=require.resolve('../../al-siddique-backend/src/config/database')
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:async(sql,args)=>{
 if(sql.includes('core_security.signed_school_allowed'))return {rows:[{allowed:signedReady}]}
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
test('release fails closed without out-of-band school-root fingerprint',()=>{
 const old=process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256
 process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256='0'.repeat(64)
 assert.equal(eligible(row()),false)
 process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256=old
})
test('changing signed school and reviewer digest defeats forged approved booleans',()=>{
 const signed=row()
 assert.equal(eligible(signed),true)
 assert.equal(eligible({...signed,school_id:22}),false)
 assert.equal(eligible({...signed,qualified_faculty_receipt_sha:'c'.repeat(64)}),false)
 assert.equal(eligible({...signed,publication_signature_base64:'a'.repeat(88)}),false)
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
 for(const signedMismatch of [
   authenticallySigned({school_id:2}),
   authenticallySigned({grade:10}),
   authenticallySigned({subject:'Physics'})]){
  assert.equal(eligible(signedMismatch),true)
  responseRows=[signedMismatch]
  const response=await fetch(base+'/approved-only?grade=9&subject=Biology',{
   headers:{'x-qa-role':'principal'}})
  assert.equal(response.status,200)
  assert.equal((await response.json()).verifiedCount,0)
 }
 const differingId='IX-BIO-02'
 const signedOtherRevision=authenticallySigned({
  original_question_id:differingId,
  paper_payload:{...payload,originalQuestionId:differingId}})
 assert.equal(eligible(signedOtherRevision),true)
 responseRows=[signedOtherRevision]
 const exactReplay=await fetch(base+'/resolve-revision?grade=9&subject=Biology&originalQuestionId=IX-BIO-01&revision=7&questionSha='+sha(payload.finalQuestion),{
  headers:{'x-qa-role':'principal'}})
 assert.equal(exactReplay.status,200)
 assert.equal((await exactReplay.json()).verifiedCount,0)
 responseRows=[]
 const peer=await fetch(base+'/approved-only?grade=9&subject=Biology&section=Usman',{headers:{'x-qa-role':'other'}})
 assert.equal(peer.status,200);assert.equal((await peer.json()).verifiedCount,0)
 assert.equal(SQL.at(-1).args[0],2)
 signedReady=false
 const unsigned=await fetch(base+'/approved-only?grade=9&subject=Biology',{
  headers:{'x-qa-role':'admin'}})
 assert.equal(unsigned.status,503)
 assert.equal((await unsigned.json()).code,'CORE_SIGNED_SCHOOL_CONTEXT_REQUIRED')
 signedReady=true
})

'use strict'
process.env.DB_STARTUP_PROBE='false'
process.env.ASSPS_QBANK_SIGNATURE_ENCRYPTION_KEY='1'.repeat(64)
process.env.DB_RUNTIME_ROLE='assps_grade910_qa_restricted'
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path')
const express=require(require.resolve('express',{paths:[path.join(__dirname,'../../al-siddique-backend')]}))
const svc=require('../../al-siddique-backend/src/services/grade910HumanSignoffService')
const authPath=require.resolve('../../al-siddique-backend/src/middleware/auth')
require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{
 protect(req,res,next){
  const who=req.get('x-qa-staff')
  if(!who)return res.status(401).json({success:false})
  req.user=who==='teacher'?{id:5432,school_id:11,role:'teacher'}:
  who==='principal'?{id:6,school_id:11,role:'principal'}:
  {id:843,school_id:22,role:'teacher'}
  return next()
 },
 requireRoles:(...allowed)=>(req,res,next)=>allowed.includes(req.user?.role)?next():res.status(403).end()
}}
const dbPath=require.resolve('../../al-siddique-backend/src/config/database')
const records=[]
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:async(sql,args)=>{
 if(sql.includes('INSERT INTO grade910_human_signoff_evidence')){
  records.push({id:records.length+1,schoolId:args[0],actorId:args[1],action:args[3]})
  return {rows:[{id:records.length}]}
 }
 if(sql.includes('GROUP BY action'))return {rows:[]}
 if(sql.includes('FROM grade910_human_signoff_evidence'))return{rows:records.filter(x=>x.schoolId===args[0]&&(args.length===1||x.actorId===args[1]))}
 return {rows:[]}
}}}
const router=require('../../al-siddique-backend/src/routes/grade910HumanSignoffRoutes')
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')
const crypto=require('node:crypto'),hash=crypto.createHash('sha256').update(png).digest('hex'),sha='a'.repeat(64)
const source=svc.catalog.rows.find(x=>x.grade===9&&x.medium==='English')
const checks=['Curriculum and session','Actual book edition and exercise page','Question correctness',
'Answer and MCQ key','Marks and difficulty','English/Urdu correctness','Duplicates','Original source provenance']
function claim() {
 return {schemaVersion:'assps-grade910-human-claim-with-signature-v1',schoolCode:'ASSPS',
 academicSession:'2026-27',intendedBoardExamYear:2027,
 actorClaim:{userId:'5432',role:'teacher'},personallySignedAt:new Date().toISOString(),
 action:'subject_review',sourceCatalogRecordId:source.catalogId,sourcePdfSha256:source.sourcePdfSha256,
 originalQuestionRevisionSetSha256:source.originalQuestionRevisionSetSha256,
 sourceGradeUnassigned:false,subject:source.subject,grade:source.grade,medium:source.medium,
 bookDecision:null,printedEdition:null,originalQuestionId:'IX-1',finalQuestionRevisionSha256:sha,
 finalAnswerRevisionSha256:sha,independentTeacherReceiptSha256:null,
 supportingEvidenceSha256:sha,completedReviewChecks:checks,
 handwriting:{mimeType:'image/png',sha256:hash,imageDataUrl:'data:image/png;base64,'+png.toString('base64')},
 signerDeclaration:'I personally reviewed this source and evidence and signed with my own hand.',
 verificationStatus:'UNTRUSTED_CLAIM_PENDING_SCHOOL_AUTHENTICATION',
 academicallyApproved:false,paperStudioSelectable:false,published:false}
}
test('actual HTTP route requires authenticated staff, stores private claim, and filters cross-school',async t=>{
 const app=express();app.use(express.json({limit:'512kb'}));app.use('/api/grade910-signoffs',router)
 const server=app.listen(0,'127.0.0.1');t.after(()=>server.close())
 await new Promise(resolve=>server.once('listening',resolve))
 const base='http://127.0.0.1:'+server.address().port+'/api/grade910-signoffs'
 const unauth=await fetch(base+'/catalog');assert.equal(unauth.status,401)
 const ok=await fetch(base+'/submissions',{method:'POST',headers:{'content-type':'application/json','x-qa-staff':'teacher'},body:JSON.stringify(claim())})
 assert.equal(ok.status,201)
 const data=await ok.json();assert.equal(data.data.academicallyApproved,false)
 const owned=await fetch(base+'/submissions',{headers:{'x-qa-staff':'teacher'}})
 const list=await owned.json();assert.equal(list.records.length,1)
 const other=await fetch(base+'/submissions',{headers:{'x-qa-staff':'other'}})
 const cross=await other.json();assert.equal(cross.records.length,0)
 const ready=await fetch(base+'/publication-readiness',{headers:{'x-qa-staff':'principal'}})
 const state=await ready.json();assert.equal(state.published,0)
})

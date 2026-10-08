'use strict'
// Genuine JWT/HTTP acceptance: run ONLY against a loopback test server and
// disposable clone seeded with archv1-...@invalid.example fixtures.
const assert=require('node:assert/strict')
const jwt=require('jsonwebtoken')
const crypto=require('node:crypto')
const http=require('node:http')
const {Client}=require('pg')
const db=String(process.env.DB_NAME||'')
const port=Number(process.env.ARCHV1_HTTP_TEST_PORT||0)
if(!/^assps_archv1_rls_/.test(db)||!Number.isInteger(port)||port<1025||port===5000||process.env.NODE_ENV!=='test'){
 throw Error('ARCHV1_CLONE_ONLY: DB_NAME must be an isolated RLS clone, PORT not 5000, NODE_ENV=test')
}
const fixtureKey='ASSPS_ARCHV1_CLONE_TEST_ONLY_JWT_SIGNING_NO_LIVE'
const expectedActors={principal:'archv1-principal@invalid.example',teacherA:'archv1-teacher-a@invalid.example',teacherB:'archv1-teacher-b@invalid.example',teacherC:'archv1-teacher-c@invalid.example',resultClerk:'archv1-results-clerk@invalid.example'}
let actors={}
const base='/api/portal/paper-studio'
async function loadActors(){
 const client=new Client({host:process.env.DB_HOST||'/var/run/postgresql',database:db,user:process.env.DB_USER||'asspsworker',password:process.env.DB_PASSWORD||undefined})
 await client.connect()
 try{
  const result=await client.query('SELECT id,email FROM users WHERE email=ANY($1::text[])',[Object.values(expectedActors)])
  for(const [key,email] of Object.entries(expectedActors)){
   const row=result.rows.find(r=>r.email===email)
   assert.ok(row,'clone-only fixture actor missing: '+key)
   actors[key]={id:row.id,email}
  }
 }finally{await client.end()}
}
function request(actor,path,method='GET',body,extra={}){
 return new Promise((resolve,reject)=>{
  const raw=body?JSON.stringify(body):''
  const headers={Host:'api.assps.edu.pk','Content-Type':'application/json',...(actor?{Authorization:'Bearer '+jwt.sign(actors[actor],fixtureKey,{expiresIn:'5m'})}:{}),...(raw?{'Content-Length':Buffer.byteLength(raw)}:{}),...extra}
  const req=http.request({hostname:'127.0.0.1',port,path,method,headers,timeout:8000},res=>{let out='';res.on('data',b=>out+=b);res.on('end',()=>{let value={};try{value=JSON.parse(out)}catch{value={message:out.slice(0,250)}}resolve({status:res.statusCode,body:value})})})
  req.on('error',reject);if(raw)req.write(raw);req.end()
 })
}
async function gate(label,actor,path,status,method='GET',body,headers){
 const r=await request(actor,path,method,body,headers)
 console.log('ARCHV1_HTTP',label,r.status,r.body?.code||'')
 assert.equal(r.status,status,`${label}: ${JSON.stringify(r.body).slice(0,350)}`)
 return r
}
;(async()=>{
 await loadActors()
 await gate('unauthenticated fail closed',null,base+'/papers',401)
 const p=await gate('principal school paper list', 'principal',base+'/papers',200)
 assert.ok(p.body.data.length>=5)
 for(const role of ['teacherA','teacherB','teacherC']) await gate('teacher scoped list '+role,role,base+'/papers',200)
 const legacyVaultPrincipal=await gate('legacy vault principal school view','principal','/api/paper/vault',200)
 assert.ok(legacyVaultPrincipal.body?.success && legacyVaultPrincipal.body.papers.length>=5)
 await gate('legacy vault own teacher view','teacherA','/api/paper/vault',200)
 const crossVault=await gate('legacy vault foreign school view','teacherC','/api/paper/vault',200)
 assert.ok(crossVault.body?.success)
 assert.equal(crossVault.body.papers.length,0,'legacy vault must hide other school papers')
 const paper={format:'assps-canonical-paper',documentModel:'PaperDocumentV2',schemaVersion:3,documentOrigin:'USER_AUTHORED',config:{name:'ARCHV1 Clone Only Paper',classLevel:'Seven',subject:'Urdu',section:''},metadata:{language:'urdu'},sections:[]}
 await gate('unassigned teacher create denied','teacherB',base+'/papers',403,'POST',{paper})
 const created=await gate('assigned teacher manual create','teacherA',base+'/papers',201,'POST',{paper})
 const paperId=created.body.data?.id;assert.ok(paperId)
 const target=base+'/papers/'+paperId
 await gate('owner read','teacherA',target,200)
 await gate('same-school peer read denied','teacherB',target,404)
 await gate('cross-tenant read denied','teacherC',target,404)
 await gate('principal review read','principal',target,200)
 await gate('forged school selection ignored','teacherA',target+'?school_id=5',200)
 await gate('forged school header ignored','teacherA',target,200,'GET',undefined,{'X-School-Id':'5'})
 const revision=await gate('revision history owner scope','teacherA',target+'/revisions',200)
 const {currentRevision,currentSnapshotHash}=revision.body.data
 for(const r of ['teacherB','teacherC']) await gate('peer/cross-tenant edit denied '+r,r,target+'/metadata',404,'PATCH',{expectedRevision:currentRevision,expectedSnapshotHash:currentSnapshotHash,name:'tampered'})
 await gate('stale hash denied','teacherA',target+'/metadata',409,'PATCH',{expectedRevision:currentRevision,expectedSnapshotHash:'0'.repeat(64),name:'stale'})
 const edited=await gate('owner revision-bound metadata edit','teacherA',target+'/metadata',200,'PATCH',{expectedRevision:currentRevision,expectedSnapshotHash:currentSnapshotHash,name:'ARCHV1 clone edited'})
 assert.equal(edited.body.data?.revision,currentRevision+1)
 await gate('teacher publisher reviewer denied','teacherA',base+'/publisher-review/validate',403,'POST',{})
 const reviewer=await request('principal',base+'/publisher-review/validate','POST',{})
 assert.notEqual(reviewer.status,403,'principal must reach authorized validation')
 console.log('ARCHV1_HTTP','principal validation authorized',reviewer.status)
 await gate('teacher academic release denied','teacherA','/api/assessment-studio/papers/archv1-invalid/releases',403,'POST',{})
 const approving=await request('principal','/api/assessment-studio/papers/archv1-invalid/releases','POST',{})
 console.log('ARCHV1_HTTP','principal reaches academic release validation',approving.status)
 assert.equal(approving.status,400,'principal academic release should reach input validator')
 await gate('teacher governance capture denied','teacherA','/api/question-bank/governance/capture',403,'POST',{question:{question_text:'clone'}})
 const governanceKey='archv1-clone-'+crypto.randomUUID()
 const candidate={idempotencyKey:governanceKey,question:{class_level:'Seven',subject:'Science',chapter_name:'Synthetic Certification',question_type:'short',question_text:'ARCHV1 Clone Only: Identify a control variable.',answer:'A variable maintained constant.',marks:2,source_type:'teacher_created'}}
 const governed=await request('principal','/api/question-bank/governance/capture','POST',candidate,{'Idempotency-Key':governanceKey})
 console.log('ARCHV1_HTTP principal governed candidate',governed.status,governed.body?.data?.lifecycleStatus||'')
 assert.ok([200,201].includes(governed.status) && governed.body?.success===true,'governance must return created or deduplicated valid candidate')
 assert.equal(governed.body?.data?.lifecycleStatus,'candidate')
 for(const actor of ['principal','teacherA','teacherC']){
  await gate('question-bank metadata '+actor,actor,'/api/question-bank/filters/metadata',200)
  await gate('assessment list '+actor,actor,'/api/assessment-studio/papers',200)
 }
 // Assessment Studio uses a separate authoring stream; teacher drafts must
 // remain private to their author even within the same authenticated school.
 const assessmentId='archv1-clone-'+crypto.randomUUID()
 const authoredDocument={...paper,documentOrigin:'USER_AUTHORED'}
 await gate('assessment teacher creates own draft','teacherA','/api/assessment-studio/papers/'+assessmentId+'/revisions',201,'POST',{
  expectedRevision:0,title:'ARCHV1 assessment author scope',document:authoredDocument
 })
 await gate('assessment creator reads draft','teacherA','/api/assessment-studio/papers/'+assessmentId,200)
 await gate('assessment peer draft denied','teacherB','/api/assessment-studio/papers/'+assessmentId,404)
 await gate('assessment cross-school draft denied','teacherC','/api/assessment-studio/papers/'+assessmentId,404)
 await gate('assessment principal reviewer reads draft','principal','/api/assessment-studio/papers/'+assessmentId,200)
 const peerRevision=await request('teacherB','/api/assessment-studio/papers/'+assessmentId+'/revisions','POST',{
  expectedRevision:1,title:'peer attempted overwrite',document:authoredDocument
 })
 console.log('ARCHV1_HTTP','assessment same-school peer cannot overwrite',peerRevision.status)
 assert.notEqual(peerRevision.status,201,'peer must not overwrite another teacher draft')
 await gate('signed result-entry access','resultClerk','/api/assessment-results/archv1-unrecognized',404)
 await gate('principal result review access','principal','/api/assessment-results/archv1-unrecognized',404)
 await gate('cross-school result denied','teacherC','/api/assessment-results/archv1-unrecognized',404)
 const existingPapers=await request('principal','/api/assessment-studio/papers')
 assert.equal(existingPapers.status,200)
 let releaseId
 for(const candidate of existingPapers.body.data||[]){
  const last=await request('principal','/api/assessment-studio/papers/'+candidate.public_id+'/releases/latest')
  if(last.status===200&&last.body.data?.release_id){releaseId=last.body.data.release_id;break}
 }
 assert.ok(releaseId,'A test release is required for results revision gates')
 const studentKey='archv1-clone-'+crypto.randomUUID()
 const resultPayload={releaseId,studentKey,expectedRevision:0,entries:[],status:'IN_PROGRESS',studentSnapshot:{name:'ARCHV1 Fixture'}}
 const savedResult=await gate('result clerk saves student checking revision','resultClerk','/api/assessment-results',201,'POST',resultPayload)
 const resultId=savedResult.body.data?.resultId
 assert.ok(resultId)
 await gate('result clerk reads saved checking','resultClerk','/api/assessment-results/'+resultId,200)
 const outsider=await request('teacherC','/api/assessment-results/'+resultId)
 console.log('ARCHV1_HTTP','cross-school result access denied',outsider.status)
 assert.ok([403,404].includes(outsider.status))
 await gate('stale checking revision denied','resultClerk','/api/assessment-results',409,'POST',{...resultPayload,resultId,expectedRevision:0})
 console.log('ARCHV1_RESTRICTED_HTTP_ACCEPTANCE_PASS')
})().catch(err=>{console.error('ARCHV1_RESTRICTED_HTTP_ACCEPTANCE_FAIL',err.message);process.exitCode=1})

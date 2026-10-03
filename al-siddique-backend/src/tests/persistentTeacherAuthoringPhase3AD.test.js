const {test}=require('node:test')
const assert=require('node:assert/strict')
const {generateKeyPairSync,sign,createHash,randomUUID}=require('node:crypto')
const {pathToFileURL}=require('node:url')
const {join}=require('node:path')
const {createPhase3VApprovedProvider,canonicalPublicationPayload,recordsDigest,
 SCHEMA:PUBLICATION_SCHEMA,GATE_LABEL:PUBLICATION_GATE}
 =require('../services/papers/approvedCurriculumProviderPhase3V')
const {authoringBindingSha256}
 =require('../services/papers/newAuthoringRoleBoundRepositoryPhase3T')
const {createPhase3XTeacherProjection,GATE_LABEL:PROJECTION_GATE}
 =require('../services/papers/teacherCurriculumProjectionPhase3X')
const {createIsolatedDraftGateway,GATE_LABEL:STAGING_GATE}
 =require('../services/papers/newAuthoringDraftGatewayPhase3S')
const {createPhase3ADPersistentAuthoring,LABEL}
 =require('../services/papers/persistentTeacherAuthoringPhase3AD')
const copy=x=>JSON.parse(JSON.stringify(x))
const digest=x=>createHash('sha256').update(x,'utf8').digest('hex')
const {publicKey,privateKey}=generateKeyPairSync('ed25519')
const keyPem=publicKey.export({type:'spki',format:'pem'})
const NOW=1800000000
const actor={id:20,school_id:51,tenant_id:'tenant-51',role:'teacher'}
const identity={authority:'PECTAA',grade:9,subjectId:'biology',
 textbookId:'ix-biology-dual',edition:'2025-26',syllabusVersion:'2025-26'}
const selection={syllabusMode:'full',examYear:null}
const bookIds={en:'fictional-bio-en',ur:'fictional-bio-ur'}
const pdfs={en:'a'.repeat(64),ur:'b'.repeat(64)}
const topic={chapterId:'ch-1',topicId:'t-1',chapterNumber:1,
 enChapterTitle:'The Science of Biology',urChapterTitle:'حیاتیات کی سائنس',
 enTopicTitle:'Biology',urTopicTitle:'حیاتیات',
 enSourceTopicId:'official-en-1.1',urSourceTopicId:'official-ur-1.1',
 enPageStart:1,enPageEnd:15,urPageStart:1,urPageEnd:15}
const question=()=>({id:'qid-phase3y-01',type:'short',marks:2,medium:'dual',
 curriculum:copy(identity),chapter:{id:'ch-1',number:1},topicId:'t-1',
 review:{status:'approved',reviewerId:12,evidenceId:'fictional-independent-review'},
 content:{en:{stem:'Define Biology.',answer:'Study of life.'},
 ur:{stem:'حیاتیات کی تعریف کریں۔',answer:'زندگی کا مطالعہ۔'}},
 source:{languages:{en:{pdfSha256:pdfs.en,topicId:'official-en-1.1',page:5},
 ur:{pdfSha256:pdfs.ur,topicId:'official-ur-1.1',page:6}}}})
function publication(){
 const records=[question()]
 const payload={schema:PUBLICATION_SCHEMA,publicationId:'pub-phase3y-v7',
  schoolId:51,tenantId:'tenant-51',revision:7,signingKeyId:'key-phase3y',
  curriculumIdentity:copy(identity),selection:copy(selection),
  sourceBookIds:copy(bookIds),sourceChecksums:copy(pdfs),
  bindingSha256:authoringBindingSha256({curriculumIdentity:identity,
   selection,sourceBookIds:bookIds,sourceChecksums:pdfs}),alpPolicy:null,
  publishedAt:NOW-600,validUntil:NOW+600,
  reviewer:{authorId:11,reviewerId:12,independentReviewComplete:true,
   evidenceId:'fictional-independent-publication-review'},
  topicRegistry:[copy(topic)],recordCount:records.length,recordsDigest:recordsDigest(records)}
 const fixture={records,row:{status:'PUBLISHED_APPROVED',payload},head:null}
 return resign(fixture)
}
function resign(f){
 f.row.payload.recordCount=f.records.length
 f.row.payload.recordsDigest=recordsDigest(f.records)
 f.row.signature=sign(null,Buffer.from(canonicalPublicationPayload(f.row.payload),'utf8'),
  privateKey).toString('base64')
 f.head={status:'PUBLISHED_APPROVED',schoolId:51,tenantId:'tenant-51',
  publicationId:f.row.payload.publicationId,revision:f.row.payload.revision,
  payloadSha256:digest(canonicalPublicationPayload(f.row.payload))}
 return f
}
function repository(){
 const state={rows:new Map(),creates:0,reads:0,revisions:0,unknownCommit:false}
 const key=x=>[x.schoolId,x.tenantId,x.draftId].join('::')
 return {state,
  async createExclusive(x){
   state.creates++;const k=key(x)
   if(state.rows.has(k))throw Error('duplicate draft collision')
   const row={...copy(x)};state.rows.set(k,row)
   if(state.unknownCommit)throw Error('unknown commit outcome synthetic')
   return copy(row)
  },
  async loadScoped(x){state.reads++;return copy(state.rows.get(key(x))??null)},
  async casUpdate(x){
   state.revisions++;const k=key(x),old=state.rows.get(k)
   if(!old||old.revision!==x.expectedRevision||
      old.nativeSha256!==x.expectedNativeSha256)throw Error('stale atomic CAS')
   const row={...old,revision:x.nextRevision,updatedBy:x.actorId,
    nativeJsonText:x.nextNativeJsonText,nativeSha256:x.nextNativeSha256}
   state.rows.set(k,row);return copy(row)
  }
 }
}
const phase3adGate={label:LABEL,confirmedNotProduction:true,
 independentPhase3XAndPhase3ABReviewed:true,
 disposablePhase3ACAtomicIntentVerified:true,
 phase3SReauthenticatesAndPinsCurrentSource:true}
const projectionGate={label:PROJECTION_GATE,confirmedNotProduction:true,
 verifiedPhase3VBackendPort:true,independentSchoolSubjectGrantReviewed:true}
const publicationGate={label:PUBLICATION_GATE,confirmedNotProduction:true,
 independentCurriculumPublisherReviewPassed:true,
 serverSidePublicationRegistryVerified:true,keyCustodySeparationVerified:true}
const stagingGate={label:STAGING_GATE,confirmedNotProduction:true,
 isolatedSchoolCredentialAuditPassed:true,backupRestoreTestPassed:true,
 approvedProviderReadinessVerified:true}
// Fake shared database contract for fast deterministic tests; actual Phase3AC PG18
// SQL concurrency is separately verified by its physical disposable suite.
function sharedPersistentIntents(state){
 const rows=new Map(),sameActor=(a,b)=>['schoolId','tenantId','actorId','role']
  .every(k=>a[k]===b[k])
 return {rows,
  async reserve(x){
   const active=[...rows.values()].filter(v=>v.state==='READY'&&v.expiresAt>state.ms)
   if(active.length>=64||active.filter(v=>sameActor(v.actor,x)).length>=3)
    throw Error('persistent capacity exhausted')
   const intentId=randomUUID(),expiresAt=state.ms+600000
   rows.set(intentId,{actor:copy(x),assignmentId:x.assignmentId,
    sourcePin:copy(x.sourcePin),fingerprint:x.fingerprint,expiresAt,state:'READY'})
   return {intentId,expiresAt,authorizesPersistence:false,approvedForPrint:false}
  },
  async claim(x){
   const row=rows.get(x.intentId)
   if(!row||!sameActor(row.actor,x)||row.state!=='READY'||
      row.expiresAt<=state.ms||row.fingerprint!==x.fingerprint||
      row.sourcePin.recordsDigest!==x.recordsDigest)
    throw Error('persistent claim refused: unknown/foreign/revoked/spent')
   row.state='CLAIMED'
   return {intentId:x.intentId,sourcePin:copy(row.sourcePin),
    publicationId:row.sourcePin.publicationId,
    approvedRevision:row.sourcePin.revision,
    recordsDigest:row.sourcePin.recordsDigest,
    projectionFingerprint:row.fingerprint}
  },
  async finish(x){
   const row=rows.get(x.intentId)
   if(!row||!sameActor(row.actor,x)||row.state!=='CLAIMED')return false
   row.state='SPENT';return true
  },
  async cancel(x){
   const row=rows.get(x.intentId)
   if(!row||!sameActor(row.actor,x)||row.state!=='READY')return false
   row.state='CANCELLED';return true
  }
 }
}
function setup(){
 const f=publication(),repo=repository(),state={actor:copy(actor),
  gatewayActor:null,ms:NOW*1000,subjectEnabled:true,featureEnabled:true}
 const authenticated=async()=>copy(state.actor)
 const verified=createPhase3VApprovedProvider({gate:publicationGate,clock:()=>NOW*1000,
  publicKeyRegistry:{'key-phase3y':{publicKeyPem:keyPem,authority:'PECTAA',
   notBefore:NOW-2000,notAfter:NOW+2000}},
  resolveCurrentHead:async()=>copy(f.head),
  readPublication:async()=>copy(f.row),readPublishedRecords:async()=>copy(f.records)})
 const teacherProjection=createPhase3XTeacherProjection({gate:projectionGate,
  authenticate:authenticated,resolveSubjectGrant:async a=>({
   status:state.subjectEnabled?'AUTHORIZED':'PENDING',
   schoolId:a.schoolId,tenantId:a.tenantId,actorId:a.actorId,role:a.role,
   subject:{id:'biology9',classId:'nine',syllabusId:'ptb',
    curriculumBinding:copy(identity)}}),approvedProvider:verified})
 const draftGateway=createIsolatedDraftGateway({gate:stagingGate,
  authenticate:async()=>copy(state.gatewayActor??state.actor),
  approvedProvider:verified,repository:repo,
  isSchoolEnabled:async()=>state.featureEnabled})
 const intents=sharedPersistentIntents(state)
 const readAssignment=async()=>({
  source:'SCHOOL_APPROVED_STAFF_ASSIGNMENT',
  status:state.assignmentEnabled===false?'REVOKED':'ACTIVE',
  assignmentId:'synthetic-biology-nine-teacher20',schoolId:51,tenantId:'tenant-51',
  actorId:20,role:'teacher',grade:9,subjectId:'biology',subjectRef:'biology9',
  classId:'nine',syllabusId:'ptb',
  validFromMs:state.ms-300000,validUntilMs:state.ms+300000,
  review:{approvedByStaffId:22,evidenceId:'synthetic-independent-enrolment',
   approvedAtMs:state.ms-300000}
 })
 const makeSession=()=>createPhase3ADPersistentAuthoring({gate:phase3adGate,
  authenticate:authenticated,teacherProjection,readAssignment,
  intents,draftGateway,clock:()=>state.ms})
 const session=makeSession()
 return {f,repo,state,session,makeSession,intents,verified,
  teacherProjection,draftGateway}
}
const request=()=>({authenticationContext:{trustedSession:'server-verified-context'},
 curriculumIdentity:copy(identity),selection:copy(selection)})
async function authored(prepared,id='draft-phase3y-001'){
 const dir=join(__dirname,
  '../../../al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/editorV2')
 const importFile=name=>import(pathToFileURL(join(dir,name)).href)
 const q=await importFile('curriculumPreparationPhase3Q.js')
 const r=await importFile('newAuthoringPaperDocumentPhase3R.js')
 const p=prepared.projection
 let w=q.createPhase3QWorkspace(p)
 w=q.phase3QSwitchType(w,p,'short')
 w=q.phase3QToggleQuestion(w,p,'qid-phase3y-01')
 const handoff=q.phase3QPreview(w,p)
 return {draft:r.createNewAuthoringPaperDocument({handoff,draftId:id}),editor:r}
}
test('persistent session consumes signed Phase3V→X→Q→R draft and supports independent scoped revision',async()=>{
 const e=setup(),prepared=await e.session.prepare(request())
 assert.equal(prepared.status,'TEACHER_ONLY_AUTHORING_PREPARED')
 assert.equal(prepared.projection.publicationLineage.snapshotRevision,7)
 assert.equal(prepared.authorizesPersistence,false)
 assert.equal(prepared.approvedForPrint,false)
 const {draft,editor}=await authored(prepared,'synthetic-phase3ad-paper1')
 const stored=await e.session.savePrepared({authenticationContext:request().authenticationContext,
  intentId:prepared.intentId,draft})
 assert.equal(stored.status,'STAGING_ONLY_DRAFT_STORED')
 assert.equal(stored.authoringIntentConsumed,true)
 assert.equal(stored.revision,1)
 assert.equal(e.intents.rows.get(prepared.intentId).state,'SPENT')
 assert.equal(e.repo.state.creates,1)
 const read=await e.makeSession().readVerified({
  authenticationContext:request().authenticationContext,draftId:draft.id})
 assert.equal(read.approvedForPrint,false)
 assert.deepEqual(read.draft.sourceLedger,draft.sourceLedger)
 const update=editor.editNewAuthoringMetadata(read.draft,{title:'Revised signed source'})
 const changed=await e.makeSession().reviseVerified({
  authenticationContext:request().authenticationContext,draft:update,
  expectedRevision:read.revision,expectedNativeSha256:read.nativeSha256})
 assert.equal(changed.revision,2)
 assert.equal(e.repo.state.revisions,1)
})
test('two server coordinators sharing durable intent allow one create only',async()=>{
 const e=setup(),prepared=await e.session.prepare(request())
 const {draft}=await authored(prepared,'synthetic-phase3ad-race')
 const args={authenticationContext:request().authenticationContext,
  intentId:prepared.intentId,draft}
 const outcomes=await Promise.allSettled([
  e.session.savePrepared(args),e.makeSession().savePrepared(args)])
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1)
 assert.equal(outcomes.filter(x=>x.status==='rejected').length,1)
 assert.equal(e.repo.state.creates,1)
 assert.equal(e.intents.rows.get(prepared.intentId).state,'SPENT')
})
test('changed genuine signed publication invalidates prepared intent across independent workers',async()=>{
 const e=setup(),prepared=await e.session.prepare(request())
 const {draft}=await authored(prepared)
 e.f.row.payload.revision=8;e.f.row.payload.publicationId='pub-phase3ad-v8'
 resign(e.f)
 await assert.rejects(e.makeSession().savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /authored draft must match current independently signed publication pin/)
 assert.equal(e.repo.state.creates,0)
 assert.equal(e.intents.rows.get(prepared.intentId).state,'READY')
})
test('forged original bilingual ledger is rejected before claiming database intent',async()=>{
 const e=setup(),prepared=await e.session.prepare(request())
 const {draft}=await authored(prepared)
 draft.sourceLedger[0].academicRecord.content.ur.answer='invented translation'
 await assert.rejects(e.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /selected record is not an unchanged member/)
 assert.equal(e.intents.rows.get(prepared.intentId).state,'READY')
 assert.equal(e.repo.state.creates,0)
})
test('unknown COMMIT outcome burns claimed intent; scoped read can discover persisted draft',async()=>{
 const e=setup(),prepared=await e.session.prepare(request())
 const {draft}=await authored(prepared)
 e.repo.state.unknownCommit=true
 const args={authenticationContext:request().authenticationContext,
  intentId:prepared.intentId,draft}
 await assert.rejects(e.session.savePrepared(args),/unknown commit outcome synthetic/)
 assert.equal(e.intents.rows.get(prepared.intentId).state,'SPENT')
 assert.equal(e.repo.state.creates,1)
 await assert.rejects(e.makeSession().savePrepared(args),/persistent claim refused/)
 const recovered=await e.makeSession().readVerified({
  authenticationContext:request().authenticationContext,draftId:draft.id})
 assert.equal(recovered.revision,1)
 assert.equal(recovered.approvedForPrint,false)
})
test('unknown finalization cannot announce success or make a claimed intent reusable',async()=>{
 const e=setup(),prepared=await e.session.prepare(request())
 const {draft}=await authored(prepared)
 e.intents.finish=async()=>{throw Error('synthetic finish lost')}
 await assert.rejects(e.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /finalization unconfirmed/)
 assert.equal(e.intents.rows.get(prepared.intentId).state,'CLAIMED')
 assert.equal(e.repo.state.creates,1)
 await assert.rejects(e.makeSession().savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /persistent claim refused/)
 const read=await e.session.readVerified({
  authenticationContext:request().authenticationContext,draftId:draft.id})
 assert.equal(read.revision,1)
})
test('foreign teacher and cross-school scope cannot consume or cancel an owned intent',async()=>{
 const e=setup(),prepared=await e.session.prepare(request())
 const {draft}=await authored(prepared)
 e.state.actor={...actor,id:21}
 await assert.rejects(e.makeSession().savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /persistent claim refused/)
 await assert.rejects(e.makeSession().cancel({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId}),
  /cannot cancel/)
 e.state.actor={...actor,school_id:52,tenant_id:'tenant-52'}
 await assert.rejects(e.makeSession().savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /Phase3V refused|Phase3X refused|persistent claim refused/)
 assert.equal(e.repo.state.creates,0)
 assert.equal(e.intents.rows.get(prepared.intentId).state,'READY')
})
test('revoked school subject grant or independent assignment refuses any new persistent prepare',async()=>{
 for(const which of ['subjectEnabled','assignmentEnabled']){
  const e=setup();e.state[which]=false
  await assert.rejects(e.session.prepare(request()),
   /trusted school subject|current independently approved/)
  assert.equal(e.intents.rows.size,0)
 }
})
test('expired/cancelled durable intent cannot be reused by another server coordinator',async()=>{
 const e=setup(),first=await e.session.prepare(request())
 assert.equal((await e.makeSession().cancel({
  authenticationContext:request().authenticationContext,intentId:first.intentId})).status,
  'AUTHORING_INTENT_CANCELLED')
 const {draft}=await authored(first)
 await assert.rejects(e.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:first.intentId,draft}),
  /persistent claim refused/)
 const next=await e.session.prepare(request())
 e.state.ms+=600001
 await assert.rejects(e.makeSession().savePrepared({
  authenticationContext:request().authenticationContext,intentId:next.intentId,draft}),
  /persistent claim refused/)
 assert.equal(e.repo.state.creates,0)
})
test('a forged private SQL claim acknowledgment is never forwarded to Phase3S',async()=>{
 const e=setup(),prepared=await e.session.prepare(request())
 const {draft}=await authored(prepared),actual=e.intents.claim.bind(e.intents)
 e.intents.claim=async x=>{const r=await actual(x);
  return {...r,sourcePin:{...r.sourcePin,recordsDigest:'0'.repeat(64)}}}
 await assert.rejects(e.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /database claim was not for the exact currently approved source/)
 assert.equal(e.repo.state.creates,0)
 assert.equal(e.intents.rows.get(prepared.intentId).state,'SPENT')
})
test('Phase3S refuses actor changed after claim and intent is never reactivated',async()=>{
 const e=setup(),prepared=await e.session.prepare(request())
 const {draft}=await authored(prepared)
 e.state.gatewayActor={...actor,id:21}
 await assert.rejects(e.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /authenticated actor changed/)
 assert.equal(e.intents.rows.get(prepared.intentId).state,'SPENT')
 assert.equal(e.repo.state.creates,0)
})
test('bounded persistent prepare and publisher revoked before save fail closed',async()=>{
 const e=setup()
 for(let i=0;i<3;i++)await e.session.prepare(request())
 await assert.rejects(e.makeSession().prepare(request()),/persistent capacity exhausted/)
 const f=setup(),prepared=await f.session.prepare(request())
 const {draft}=await authored(prepared)
 f.f.head.status='REVOKED'
 await assert.rejects(f.makeSession().savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /Phase3V refused/)
 assert.equal(f.repo.state.creates,0)
})
test('staging-only constructor and operation refuse production and missing ports',async()=>{
 assert.throws(()=>createPhase3ADPersistentAuthoring(),/trust gates required/)
 const e=setup(),old=process.env.NODE_ENV
 try{process.env.NODE_ENV='production'
  assert.throws(()=>createPhase3ADPersistentAuthoring({gate:phase3adGate}),
   /trust gates required/)
  await assert.rejects(e.session.prepare(request()),/production disabled/)
 }finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old}
 const {readFileSync}=require('node:fs')
 const source=readFileSync(join(__dirname,
  '../services/papers/persistentTeacherAuthoringPhase3AD.js'),'utf8')
 assert.doesNotMatch(source,/app\.use\(|express|DATABASE_URL|INSERT INTO|localStorage/)
})

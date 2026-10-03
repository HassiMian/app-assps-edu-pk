const {test}=require('node:test')
const assert=require('node:assert/strict')
const {generateKeyPairSync,sign,createHash}=require('node:crypto')
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
const {createPhase3YAuthoringSession,GATE_LABEL,TTL_MS}
 =require('../services/papers/teacherAuthoringSessionPhase3Y')
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
const phase3yGate={label:GATE_LABEL,confirmedNotProduction:true,
 trustedAuthContextStable:true,independentProjectionAndGatewayReviewed:true}
const projectionGate={label:PROJECTION_GATE,confirmedNotProduction:true,
 verifiedPhase3VBackendPort:true,independentSchoolSubjectGrantReviewed:true}
const publicationGate={label:PUBLICATION_GATE,confirmedNotProduction:true,
 independentCurriculumPublisherReviewPassed:true,
 serverSidePublicationRegistryVerified:true,keyCustodySeparationVerified:true}
const stagingGate={label:STAGING_GATE,confirmedNotProduction:true,
 isolatedSchoolCredentialAuditPassed:true,backupRestoreTestPassed:true,
 approvedProviderReadinessVerified:true}
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
 const session=createPhase3YAuthoringSession({gate:phase3yGate,
  authenticate:authenticated,teacherProjection,draftGateway,clock:()=>state.ms})
 return {f,repo,state,session,verified,teacherProjection,draftGateway}
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
test('signed authoring intent permits exactly one verified create/read/CAS revision',async()=>{
 const {session,repo}=setup()
 const prepared=await session.prepare(request())
 assert.equal(prepared.status,'TEACHER_ONLY_AUTHORING_PREPARED')
 assert.equal(prepared.projection.publicationLineage.snapshotRevision,7)
 assert.equal(prepared.authorizesPersistence,false)
 assert.equal(prepared.approvedForPrint,false)
 assert.equal(prepared.studentAccessible,false)
 const {draft,editor}=await authored(prepared)
 const saved=await session.savePrepared({authenticationContext:request().authenticationContext,
  intentId:prepared.intentId,draft})
 assert.equal(saved.status,'STAGING_ONLY_DRAFT_STORED')
 assert.equal(saved.authoringIntentConsumed,true)
 assert.equal(saved.revision,1);assert.equal(repo.state.creates,1)
 await assert.rejects(session.savePrepared({authenticationContext:request().authenticationContext,
  intentId:prepared.intentId,draft}),/unknown or spent/)
 assert.equal(repo.state.creates,1)
 const read=await session.readVerified({authenticationContext:request().authenticationContext,
  draftId:draft.id})
 assert.equal(read.revision,1);assert.equal(read.approvedForPrint,false)
 assert.deepEqual(read.draft.sourceLedger,draft.sourceLedger)
 const altered=editor.editNewAuthoringMetadata(read.draft,{title:'Updated First Term'})
 const revised=await session.reviseVerified({authenticationContext:request().authenticationContext,
  draft:altered,expectedRevision:read.revision,
  expectedNativeSha256:read.nativeSha256})
 assert.equal(revised.revision,2);assert.equal(repo.state.revisions,1)
 const next=await session.readVerified({authenticationContext:request().authenticationContext,
  draftId:draft.id})
 assert.equal(next.draft.metadata.title,'Updated First Term')
 assert.deepEqual(next.draft.sourceLedger,draft.sourceLedger)
 assert.equal(next.approvedForPrint,false)
})
test('another teacher in same school cannot consume source-authoring intent',async()=>{
 const env=setup(),prepared=await env.session.prepare(request())
 const {draft}=await authored(prepared)
 env.state.actor={...actor,id:21}
 await assert.rejects(env.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /belongs to another actor/)
 assert.equal(env.repo.state.creates,0)
 env.state.actor={...actor,school_id:52,tenant_id:'tenant-52'}
 await assert.rejects(env.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /belongs to another actor/)
 assert.equal(env.repo.state.creates,0)
})
test('ten-minute one-use intent expires and cannot create a draft',async()=>{
 const env=setup(),prepared=await env.session.prepare(request())
 const {draft}=await authored(prepared)
 env.state.ms+=TTL_MS+1
 await assert.rejects(env.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /expired/)
 assert.equal(env.repo.state.creates,0)
})
test('a newly signed publication invalidates previously prepared source fingerprints',async()=>{
 const env=setup(),prepared=await env.session.prepare(request())
 const {draft}=await authored(prepared)
 env.f.row.payload.revision=8;env.f.row.payload.publicationId='pub-phase3y-v8'
 resign(env.f)
 await assert.rejects(env.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /publication or signed Question Bank changed/)
 assert.equal(env.repo.state.creates,0)
})
test('a revoked approved publication blocks authoring without reaching repository',async()=>{
 const env=setup(),prepared=await env.session.prepare(request())
 const {draft}=await authored(prepared)
 env.f.head.status='REVOKED'
 await assert.rejects(env.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /Phase3V refused/)
 assert.equal(env.repo.state.creates,0)
})
test('teacher subject enrolment revoked after prepare disables save and read',async()=>{
 const env=setup(),prepared=await env.session.prepare(request())
 const {draft}=await authored(prepared)
 env.state.subjectEnabled=false
 await assert.rejects(env.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /trusted school subject enrolment/)
 assert.equal(env.repo.state.creates,0)
})
test('forged source ledger and signed pin cannot be saved',async()=>{
 for(const change of [d=>{d.sourceLedger[0].academicRecord.content.ur.answer='forged'},
  d=>{d.sourceIdentity.publicationId='other-publication'},
  d=>{d.sourceIdentity.approvedSnapshotRevision=999},
  d=>{d.sections[0].items[0].sourceQuestionId='invented'},
 ]){
  const env=setup(),prepared=await env.session.prepare(request())
  const {draft}=await authored(prepared);change(draft)
  await assert.rejects(env.session.savePrepared({
   authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
   /Phase3Y refused/)
  assert.equal(env.repo.state.creates,0)
 }
})
test('identity change between teacher authoring and Phase3S gate is refused',async()=>{
 const env=setup(),prepared=await env.session.prepare(request())
 const {draft}=await authored(prepared)
 env.state.gatewayActor={...actor,id:22}
 await assert.rejects(env.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /authenticated actor changed between authoring session and staging gateway/)
 assert.equal(env.repo.state.creates,0)
})
test('unknown database write outcome consumes intent; caller must inspect scoped draft',async()=>{
 const env=setup(),prepared=await env.session.prepare(request())
 const {draft}=await authored(prepared)
 env.repo.state.unknownCommit=true
 await assert.rejects(env.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /unknown commit outcome/)
 assert.equal(env.repo.state.creates,1)
 await assert.rejects(env.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /unknown or spent authoring intent/)
 const read=await env.session.readVerified({
  authenticationContext:request().authenticationContext,draftId:draft.id})
 assert.equal(read.revision,1)
})
test('cancellation and bounded pending intents prevent replay or session flooding',async()=>{
 const env=setup(),first=await env.session.prepare(request())
 const cancel=await env.session.cancel({authenticationContext:request().authenticationContext,
  intentId:first.intentId})
 assert.equal(cancel.status,'AUTHORING_INTENT_CANCELLED')
 const {draft}=await authored(first)
 await assert.rejects(env.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:first.intentId,draft}),
  /unknown or spent/)
 for(let i=0;i<3;i++)await env.session.prepare(request())
 await assert.rejects(env.session.prepare(request()),/existing authoring intents/)
 assert.equal(env.repo.state.creates,0)
})
test('untrusted actor and disabled staging feature do not permit a saved paper',async()=>{
 const env=setup();env.state.actor={...actor,role:'student'}
 await assert.rejects(env.session.prepare(request()),/Phase3S refused/)
 env.state.actor=copy(actor)
 const prepared=await env.session.prepare(request()),{draft}=await authored(prepared)
 env.state.featureEnabled=false
 await assert.rejects(env.session.savePrepared({
  authenticationContext:request().authenticationContext,intentId:prepared.intentId,draft}),
  /school has not been independently enabled/)
 assert.equal(env.repo.state.creates,0)
})
test('published documents remain inaccessible if enrolled school subject is revoked',async()=>{
 const env=setup(),prepared=await env.session.prepare(request())
 const {draft}=await authored(prepared)
 await env.session.savePrepared({authenticationContext:request().authenticationContext,
  intentId:prepared.intentId,draft})
 env.state.subjectEnabled=false
 await assert.rejects(env.session.readVerified({
  authenticationContext:request().authenticationContext,draftId:draft.id}),
  /trusted school subject enrolment/)
 assert.equal(env.repo.state.creates,1)
})
test('Phase3Y remains unmounted and construction fails when gate or production changes',()=>{
 const {readFileSync}=require('node:fs')
 const src=readFileSync(join(__dirname,'../services/papers/teacherAuthoringSessionPhase3Y.js'),'utf8')
 assert.doesNotMatch(src,/require\(['"][^'"]*(express|paperRoute|database)/)
 assert.doesNotMatch(src,/DATABASE_URL|app\.use\(|INSERT INTO|fetch\(|localStorage/)
 assert.throws(()=>createPhase3YAuthoringSession(),/gates required/)
 const prior=process.env.NODE_ENV
 try{process.env.NODE_ENV='production'
  assert.throws(()=>setup(),/production|gates required/)
 }finally{if(prior===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=prior}
})
test('two concurrent requests with one intent permit only a single write attempt',async()=>{
 const env=setup(),prepared=await env.session.prepare(request())
 const {draft}=await authored(prepared)
 const args={authenticationContext:request().authenticationContext,
  intentId:prepared.intentId,draft}
 const results=await Promise.allSettled([
  env.session.savePrepared(args),env.session.savePrepared(args)])
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1)
 assert.equal(results.filter(x=>x.status==='rejected').length,1)
 assert.equal(env.repo.state.creates,1)
})
test('direct Phase3S use cannot silently relabel a signed short into a long question',async()=>{
 const env=setup(),prepared=await env.session.prepare(request())
 const {draft}=await authored(prepared)
 draft.sections[0].kind='long'
 draft.sections[0].items[0].kind='long'
 await assert.rejects(env.draftGateway.create({
  authenticationContext:request().authenticationContext,draft}),
  /authored question mismatch/)
 assert.equal(env.repo.state.creates,0)
})
test('read and revision are independently bound to the same stable actor',async()=>{
 const env=setup(),prepared=await env.session.prepare(request())
 const {draft}=await authored(prepared)
 await env.session.savePrepared({authenticationContext:request().authenticationContext,
  intentId:prepared.intentId,draft})
 env.state.gatewayActor={...actor,id:24}
 await assert.rejects(env.session.readVerified({
  authenticationContext:request().authenticationContext,draftId:draft.id}),
  /authenticated actor changed/)
 await assert.rejects(env.session.reviseVerified({
  authenticationContext:request().authenticationContext,draft,
  expectedRevision:1,expectedNativeSha256:digest(JSON.stringify(draft))}),
  /authenticated actor changed/)
 assert.equal(env.repo.state.revisions,0)
})

// Phase3Z opt-in real PostgreSQL18 adapter verification, ONLY self-created synthetic cluster.
const {test,before,after}=require('node:test')
const assert=require('node:assert/strict')
const {generateKeyPairSync,sign,createHash}=require('node:crypto')
const {pathToFileURL}=require('node:url')
const {readFileSync}=require('node:fs')
const {join,win32}=require('node:path')
const {createRoleBoundNewAuthoringRepository,authoringBindingSha256,
 EXPECTED_LOGIN,LABEL:REPO_LABEL,ROLE_ID_SQL,SQL}
 =require('../services/papers/newAuthoringRoleBoundRepositoryPhase3T')
const {createPhase3VApprovedProvider,canonicalPublicationPayload,recordsDigest,
 SCHEMA:PUBLICATION_SCHEMA,GATE_LABEL:PUBLISH_LABEL}
 =require('../services/papers/approvedCurriculumProviderPhase3V')
const {createPhase3XTeacherProjection,GATE_LABEL:TEACHER_LABEL}
 =require('../services/papers/teacherCurriculumProjectionPhase3X')
const {createIsolatedDraftGateway,GATE_LABEL:STAGING_LABEL}
 =require('../services/papers/newAuthoringDraftGatewayPhase3S')
const {createPhase3YAuthoringSession,GATE_LABEL:SESSION_LABEL}
 =require('../services/papers/teacherAuthoringSessionPhase3Y')
const RUN=process.env.ASSPS_PHASE3Z_REAL_PG==='SELF_CREATED_PG18_127_0_0_1_55443'
const copy=x=>JSON.parse(JSON.stringify(x))
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const TIME=1800000000
const actor={id:110,school_id:51,tenant_id:'tenant-51',role:'teacher'}
const identity={authority:'PECTAA',grade:9,subjectId:'biology',
 textbookId:'ix-biology-bilingual',edition:'2025-26',syllabusVersion:'2025-26'}
const selection={syllabusMode:'full',examYear:null}
const sourceBookIds={en:'synthetic-en-book',ur:'synthetic-ur-book'}
const sourceChecksums={en:'a'.repeat(64),ur:'b'.repeat(64)}
const topic={chapterId:'ch1',topicId:'t1',chapterNumber:1,
 enChapterTitle:'Biology',urChapterTitle:'حیاتیات',
 enTopicTitle:'Introduction',urTopicTitle:'تعارف',
 enSourceTopicId:'official-en-1.1',urSourceTopicId:'official-ur-1.1',
 enPageStart:1,enPageEnd:10,urPageStart:1,urPageEnd:10}
const original=()=>({id:'q1',type:'short',marks:2,medium:'dual',
 curriculum:copy(identity),chapter:{id:'ch1',number:1},topicId:'t1',
 review:{status:'approved',reviewerId:12,evidenceId:'synthetic-reviewed-academic-q1'},
 content:{en:{stem:'Define Biology.',answer:'Study of life.'},
 ur:{stem:'حیاتیات کی تعریف کریں۔',answer:'زندگی کا مطالعہ۔'}},
 source:{languages:{en:{pdfSha256:sourceChecksums.en,topicId:'official-en-1.1',page:4},
 ur:{pdfSha256:sourceChecksums.ur,topicId:'official-ur-1.1',page:5}}}})
function signedFixture(){
 const records=[original()]
 const payload={schema:PUBLICATION_SCHEMA,publicationId:'synthetic-pub-v7',
  schoolId:51,tenantId:'tenant-51',revision:7,signingKeyId:'test-issuer-only',
  curriculumIdentity:copy(identity),selection:copy(selection),
  sourceBookIds:copy(sourceBookIds),sourceChecksums:copy(sourceChecksums),
  bindingSha256:authoringBindingSha256({curriculumIdentity:identity,
   selection,sourceBookIds,sourceChecksums}),alpPolicy:null,
  publishedAt:TIME-300,validUntil:TIME+300,
  reviewer:{authorId:11,reviewerId:12,independentReviewComplete:true,
   evidenceId:'synthetic-publisher-docket'},topicRegistry:[copy(topic)],
  recordCount:records.length,recordsDigest:recordsDigest(records)}
 const {publicKey,privateKey}=generateKeyPairSync('ed25519')
 const row={status:'PUBLISHED_APPROVED',payload,signature:sign(null,
  Buffer.from(canonicalPublicationPayload(payload),'utf8'),privateKey).toString('base64')}
 const head={status:'PUBLISHED_APPROVED',schoolId:51,tenantId:'tenant-51',
  publicationId:payload.publicationId,revision:payload.revision,
  payloadSha256:sha(canonicalPublicationPayload(payload))}
 return {records,row,head,publicKeyPem:publicKey.export({type:'spki',format:'pem'})}
}
const repoGate={label:REPO_LABEL,confirmedNotProduction:true,
 independentSchemaAndRlsReviewPassed:true,backupRestorePassed:true,
 roleLoginIsolationPassed:true,approvedSnapshotAtomicGateReviewed:true}
const publisherGate={label:PUBLISH_LABEL,confirmedNotProduction:true,
 independentCurriculumPublisherReviewPassed:true,
 serverSidePublicationRegistryVerified:true,keyCustodySeparationVerified:true}
const teacherGate={label:TEACHER_LABEL,confirmedNotProduction:true,
 verifiedPhase3VBackendPort:true,independentSchoolSubjectGrantReviewed:true}
const stageGate={label:STAGING_LABEL,confirmedNotProduction:true,
 isolatedSchoolCredentialAuditPassed:true,backupRestoreTestPassed:true,
 approvedProviderReadinessVerified:true}
const sessionGate={label:SESSION_LABEL,confirmedNotProduction:true,
 trustedAuthContextStable:true,independentProjectionAndGatewayReviewed:true}
const request=()=>({authenticationContext:{syntheticOnly:true},
 curriculumIdentity:copy(identity),selection:copy(selection)})
async function draftFrom(prepared){
 const dir=join(__dirname,'../../../al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/editorV2')
 const q=await import(pathToFileURL(join(dir,'curriculumPreparationPhase3Q.js')).href)
 const r=await import(pathToFileURL(join(dir,'newAuthoringPaperDocumentPhase3R.js')).href)
 const p=prepared.projection
 let state=q.createPhase3QWorkspace(p)
 state=q.phase3QSwitchType(state,p,'short')
 state=q.phase3QToggleQuestion(state,p,'q1')
 state=q.phase3QSetMedium(state,p,'ur')
 return {draft:r.createNewAuthoringPaperDocument({handoff:q.phase3QPreview(state,p),
  draftId:'draft-phase3z-synthetic-001'}),editor:r}
}
if(!RUN){
 test('Phase3Z requires explicit marker-owned disposable PG18 runner',{skip:true},()=>{})
}else{
 if(process.env.PGHOST!=='127.0.0.1'||process.env.PGPORT!=='55443'||
    process.env.PGUSER!=='assps_p3u_admin'||process.env.NODE_ENV==='production'||
    !process.env.ASSPS_PHASE3Z_OWNED_CLUSTER_MARKER||
    !['ASSPS_PHASE3U_ADMIN_PASSWORD','ASSPS_PHASE3U_51_PASSWORD',
      'ASSPS_PHASE3U_52_PASSWORD'].every(k=>typeof process.env[k]==='string'&&
       process.env[k].length>=32))
  throw Error('Phase3Z refused: only own loopback PG18 and fresh generated passwords allowed')
 const {Pool}=require('pg')
 const base={host:'127.0.0.1',port:55443,database:'assps_paper_phase3u_ci',
  max:3,idleTimeoutMillis:2000,connectionTimeoutMillis:3000,ssl:false}
 const admin=new Pool({...base,user:'assps_p3u_admin',
  password:process.env.ASSPS_PHASE3U_ADMIN_PASSWORD})
 const school51=new Pool({...base,user:EXPECTED_LOGIN(51),
  password:process.env.ASSPS_PHASE3U_51_PASSWORD})
 const school52=new Pool({...base,user:EXPECTED_LOGIN(52),
  password:process.env.ASSPS_PHASE3U_52_PASSWORD})
 let f,repository,session,prepared,doc,editor,saved,updated,staging
 const serverActor=async()=>copy(actor)
 before(async()=>{
  const marker=process.env.ASSPS_PHASE3Z_OWNED_CLUSTER_MARKER
  const prefix=win32.normalize(join(process.env.TEMP,'assps-phase3z-ephemeral-')).toLowerCase()
  if(win32.basename(marker)!=='.ASSPS_PHASE3Z_SELF_CREATED'||
     !win32.normalize(marker).toLowerCase().startsWith(prefix)||
     readFileSync(marker,'utf8').trim()!=='SELF-CREATED SYNTHETIC-ONLY PHASE3Z')
   throw Error('Phase3Z refused: missing owned disposable test-cluster marker')
  const check=await admin.query("SELECT current_database() db, current_setting('port') port, "+
   "current_setting('listen_addresses') host, session_user login, "+
   "current_setting('data_directory') data")
  assert.deepEqual({db:check.rows[0].db,port:check.rows[0].port,
   host:check.rows[0].host,login:check.rows[0].login},
   {db:'assps_paper_phase3u_ci',port:'55443',
    host:'127.0.0.1',login:'assps_p3u_admin'})
  assert.equal(win32.normalize(check.rows[0].data).toLowerCase(),
   win32.normalize(win32.join(win32.dirname(marker),'data')).toLowerCase(),
   'PostgreSQL must be running from only the marker-owned newly created directory')
  f=signedFixture()
  await admin.query('INSERT INTO public.new_authoring_approved_snapshots_staging '+
   '(school_id,tenant_id,binding_sha256,revision,status) '+
   "VALUES(51,'tenant-51',$1,7,'PUBLISHED_APPROVED')",
   [f.row.payload.bindingSha256])
  repository=createRoleBoundNewAuthoringRepository({gate:repoGate,
   connectorDefinitions:[
    {schoolId:51,tenantId:'tenant-51',expectedLogin:EXPECTED_LOGIN(51),
     connect:()=>school51.connect()},
    {schoolId:52,tenantId:'tenant-52',expectedLogin:EXPECTED_LOGIN(52),
     connect:()=>school52.connect()}]})
  const approvedProvider=createPhase3VApprovedProvider({gate:publisherGate,
   clock:()=>TIME*1000,publicKeyRegistry:{'test-issuer-only':{
    publicKeyPem:f.publicKeyPem,authority:'PECTAA',
    notBefore:TIME-1000,notAfter:TIME+1000}},
   resolveCurrentHead:async()=>copy(f.head),
   readPublication:async()=>copy(f.row),readPublishedRecords:async()=>copy(f.records)})
  const teacherProjection=createPhase3XTeacherProjection({gate:teacherGate,
   authenticate:serverActor,approvedProvider,resolveSubjectGrant:async scope=>({
    status:'AUTHORIZED',schoolId:scope.schoolId,tenantId:scope.tenantId,
    actorId:scope.actorId,role:scope.role,subject:{id:'biology9',classId:'nine',
     syllabusId:'ptb',curriculumBinding:copy(identity)}})})
  staging=createIsolatedDraftGateway({gate:stageGate,authenticate:serverActor,
   approvedProvider,repository,isSchoolEnabled:async()=>true})
  session=createPhase3YAuthoringSession({gate:sessionGate,
   authenticate:serverActor,teacherProjection,draftGateway:staging,clock:()=>TIME*1000})
 })
 after(async()=>{await Promise.allSettled([admin.end(),school51.end(),school52.end()])})
 test('real PG18 validates distinct password-authenticated session_user and RLS identity',async()=>{
  const a=await school51.query(ROLE_ID_SQL),b=await school52.query(ROLE_ID_SQL)
  assert.deepEqual(a.rows[0],{authenticated_login:EXPECTED_LOGIN(51),
   verified_school_id:51,verified_tenant_id:'tenant-51'})
  assert.deepEqual(b.rows[0],{authenticated_login:EXPECTED_LOGIN(52),
   verified_school_id:52,verified_tenant_id:'tenant-52'})
  await school51.query("SELECT set_config('app.paper_school_id','52',false)")
  const unchanged=await school51.query('SELECT public.phase3t_session_school_id() id')
  assert.equal(unchanged.rows[0].id,51)
  await assert.rejects(()=>school51.query('SELECT * FROM '+
   'public.new_authoring_approved_snapshots_staging'),e=>e.code==='42501')
 })
 test('real signed synthetic source reaches independent teacher and new-authoring model',async()=>{
  prepared=await session.prepare(request())
  assert.equal(prepared.projection.revision,7)
  assert.equal(prepared.projection.publicationLineage.publicationId,'synthetic-pub-v7')
  const generated=await draftFrom(prepared);doc=generated.draft;editor=generated.editor
  assert.equal(doc.sourceIdentity.approvedSnapshotRevision,7)
  assert.equal(doc.sourceIdentity.recordsDigest,f.row.payload.recordsDigest)
  assert.equal(doc.sourceLedger[0].academicRecord.content.ur.answer,
   'زندگی کا مطالعہ۔')
  assert.equal(doc.printApproved,false)
  const absent=await repository.loadScoped({schoolId:51,tenantId:'tenant-51',draftId:doc.id})
  assert.equal(absent,null)
 })
 test('Phase3Y->Phase3S->Phase3T creates one real PG draft and audit atomically',async()=>{
  saved=await session.savePrepared({authenticationContext:request().authenticationContext,
   intentId:prepared.intentId,draft:doc})
  assert.equal(saved.status,'STAGING_ONLY_DRAFT_STORED')
  assert.equal(saved.schoolId,51)
  assert.equal(saved.revision,1)
  const row=await admin.query('SELECT revision,native_json_text,native_sha256,'+
   'approved_snapshot_revision,approved_binding_sha256 FROM '+
   'public.new_authoring_drafts_staging WHERE school_id=51 AND tenant_id=$1',
   ['tenant-51'])
  assert.equal(row.rowCount,1)
  assert.equal(row.rows[0].revision,1)
  assert.equal(row.rows[0].native_json_text,JSON.stringify(doc))
  assert.equal(row.rows[0].native_sha256,sha(JSON.stringify(doc)))
  assert.equal(row.rows[0].approved_snapshot_revision,7)
  assert.equal(row.rows[0].approved_binding_sha256,f.row.payload.bindingSha256)
  const audit=await admin.query('SELECT revision,native_sha256,previous_native_sha256 '+
   'FROM public.new_authoring_revisions_staging WHERE school_id=51')
  assert.equal(audit.rowCount,1)
  assert.equal(audit.rows[0].revision,1)
  assert.equal(audit.rows[0].native_sha256,saved.nativeSha256)
  assert.equal(audit.rows[0].previous_native_sha256,null)
  await assert.rejects(session.savePrepared({authenticationContext:request().authenticationContext,
   intentId:prepared.intentId,draft:doc}),/unknown or spent/)
 })
 test('true DB school isolation, Urdu native bytes and authorized scoped reopen',async()=>{
  const hidden=await school52.query('SELECT draft_id FROM '+
   'public.new_authoring_drafts_staging WHERE school_id=51')
  assert.equal(hidden.rowCount,0)
  assert.equal(await repository.loadScoped({schoolId:52,
   tenantId:'tenant-52',draftId:doc.id}),null)
  await assert.rejects(repository.loadScoped({schoolId:51,
   tenantId:'tenant-52',draftId:doc.id}),/private DB login/)
  const reopened=await session.readVerified({
   authenticationContext:request().authenticationContext,draftId:doc.id})
  assert.equal(reopened.revision,1)
  assert.deepEqual(reopened.draft.sourceLedger,doc.sourceLedger)
  const u=await admin.query("SELECT encode(convert_to(native_json_text::jsonb->'sourceLedger'->0->'academicRecord'->'content'->'ur'->>'stem','UTF8'),'hex') AS h FROM public.new_authoring_drafts_staging WHERE school_id=51")
  assert.equal(u.rows[0].h,Buffer.from('حیاتیات کی تعریف کریں۔','utf8').toString('hex'))
 })
 test('Phase3S real CAS updates revision 2 and appends native prior SHA chain',async()=>{
  const reopened=await session.readVerified({
   authenticationContext:request().authenticationContext,draftId:doc.id})
  const edited=editor.editNewAuthoringMetadata(reopened.draft,{
   title:'Verified revised Biology paper'})
  updated=await session.reviseVerified({
   authenticationContext:request().authenticationContext,draft:edited,
   expectedRevision:reopened.revision,expectedNativeSha256:reopened.nativeSha256})
  assert.equal(updated.revision,2)
  const actual=await repository.loadScoped({schoolId:51,
   tenantId:'tenant-51',draftId:doc.id})
  assert.equal(actual.revision,2)
  assert.equal(JSON.parse(actual.nativeJsonText).metadata.title,
   'Verified revised Biology paper')
  const audit=await admin.query('SELECT revision,native_sha256,previous_native_sha256 '+
   'FROM public.new_authoring_revisions_staging WHERE school_id=51 ORDER BY revision')
  assert.equal(audit.rowCount,2)
  assert.equal(audit.rows[1].revision,2)
  assert.equal(audit.rows[1].previous_native_sha256,saved.nativeSha256)
  assert.equal(audit.rows[1].native_sha256,updated.nativeSha256)
  await assert.rejects(session.reviseVerified({
   authenticationContext:request().authenticationContext,draft:edited,
   expectedRevision:1,expectedNativeSha256:reopened.nativeSha256}),
   /stale revision|stale CAS/)
 })
 test('real failed audit rolls back CAS and retains the original two revisions',async()=>{
  const old=await repository.loadScoped({schoolId:51,tenantId:'tenant-51',draftId:doc.id})
  const nextDoc=JSON.parse(old.nativeJsonText)
  nextDoc.metadata.title='Rollback on absent immutable audit'
  const json=JSON.stringify(nextDoc)
  const failing=createRoleBoundNewAuthoringRepository({gate:repoGate,
   connectorDefinitions:[{schoolId:51,tenantId:'tenant-51',
    expectedLogin:EXPECTED_LOGIN(51),connect:async()=>{
     const c=await school51.connect()
     return {query:(sql,args)=>sql===SQL.appendRevision?
      Promise.reject(Error('synthetic forced immutable audit failure')):
      c.query(sql,args),release:reason=>c.release(reason)}
    }}]})
  await assert.rejects(failing.casUpdate({schoolId:51,tenantId:'tenant-51',
   draftId:doc.id,actorId:110,expectedRevision:2,
   expectedNativeSha256:old.nativeSha256,nextRevision:3,
   nextNativeJsonText:json,nextNativeSha256:sha(json),
   approvedSnapshotRevision:7}),/forced immutable audit failure/)
  const preserved=await repository.loadScoped({
   schoolId:51,tenantId:'tenant-51',draftId:doc.id})
  assert.equal(preserved.revision,2)
  assert.equal(preserved.nativeJsonText,old.nativeJsonText)
  const audit=await admin.query('SELECT count(*)::int AS n FROM '+
   'public.new_authoring_revisions_staging WHERE school_id=51')
  assert.equal(audit.rows[0].n,2)
 })
 test('withdrawn SQL publisher row rejects Phase3T CAS even while signed mock remains current',async()=>{
  const row=await repository.loadScoped({schoolId:51,tenantId:'tenant-51',draftId:doc.id})
  const third=JSON.parse(row.nativeJsonText);third.metadata.title='Revocation attempt'
  const json=JSON.stringify(third)
  const revoke=await admin.query('UPDATE public.new_authoring_approved_snapshots_staging '+
   "SET status='REVOKED' WHERE school_id=51 AND tenant_id='tenant-51' "+
   'AND binding_sha256=$1 AND revision=7 RETURNING status',
   [f.row.payload.bindingSha256])
  assert.equal(revoke.rows[0].status,'REVOKED')
  await assert.rejects(repository.casUpdate({schoolId:51,tenantId:'tenant-51',
   draftId:doc.id,actorId:110,expectedRevision:2,
   expectedNativeSha256:row.nativeSha256,nextRevision:3,
   nextNativeJsonText:json,nextNativeSha256:sha(json),
   approvedSnapshotRevision:7}),/absent\/revoked/)
  const originalRow=await repository.loadScoped({
   schoolId:51,tenantId:'tenant-51',draftId:doc.id})
  assert.equal(originalRow.revision,2)
  f.head.status='REVOKED'
  await assert.rejects(session.readVerified({
   authenticationContext:request().authenticationContext,draftId:doc.id}),
   /Phase3V refused/)
 })
 test('real synthetic database has exactly one approved-origin draft and two linked revisions',async()=>{
  const rows=await admin.query('SELECT '+
   '(SELECT count(*)::int FROM public.new_authoring_drafts_staging) AS drafts,'+
   '(SELECT count(*)::int FROM public.new_authoring_revisions_staging) AS revisions,'+
   '(SELECT count(*)::int FROM public.new_authoring_approved_snapshots_staging '+
   "WHERE status='REVOKED') AS revoked")
  assert.deepEqual(rows.rows[0],{drafts:1,revisions:2,revoked:1})
  const rl=await admin.query('SELECT relname,relrowsecurity,relforcerowsecurity '+
   "FROM pg_class WHERE relname IN ('new_authoring_drafts_staging',"+
   "'new_authoring_revisions_staging','new_authoring_approved_snapshots_staging')")
  assert.equal(rl.rowCount,3)
  assert.ok(rl.rows.every(x=>x.relrowsecurity===true&&x.relforcerowsecurity===true))
 })
}

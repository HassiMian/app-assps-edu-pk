const {test}=require('node:test')
const assert=require('node:assert/strict')
const {generateKeyPairSync,sign,createHash}=require('node:crypto')
const {readFileSync}=require('node:fs')
const {join}=require('node:path')
const {createPhase3VApprovedProvider,canonicalPublicationPayload,
 recordsDigest,SCHEMA,GATE_LABEL}
 =require('../services/papers/approvedCurriculumProviderPhase3V')
const {authoringBindingSha256}
 =require('../services/papers/newAuthoringRoleBoundRepositoryPhase3T')
const {approvedRecords,createIsolatedDraftGateway,GATE_LABEL:STAGING_LABEL}
 =require('../services/papers/newAuthoringDraftGatewayPhase3S')
const clone=x=>JSON.parse(JSON.stringify(x))
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const TIME=1800000000
const keys=generateKeyPairSync('ed25519')
const publicKeyPem=keys.publicKey.export({type:'spki',format:'pem'})
const gate={label:GATE_LABEL,confirmedNotProduction:true,
 independentCurriculumPublisherReviewPassed:true,
 serverSidePublicationRegistryVerified:true,keyCustodySeparationVerified:true}
const identity={authority:'PECTAA',grade:9,subjectId:'biology',
 textbookId:'biology-ix-bilingual-2025',edition:'2025-26',syllabusVersion:'2025-26'}
const selection={syllabusMode:'full',examYear:null}
const sourceBookIds={en:'em-book-ix',ur:'um-book-ix'}
const sourceChecksums={en:'a'.repeat(64),ur:'b'.repeat(64)}
const registry=[{chapterId:'chapter-1',topicId:'topic-1',
 enSourceTopicId:'official-em-1.1',urSourceTopicId:'official-um-1.1'}]
const question=()=>({id:'bio9-short-001',type:'short',marks:2,
 curriculum:clone(identity),chapter:{id:'chapter-1',number:1},
 topicId:'topic-1',review:{status:'approved',reviewerId:12,evidenceId:'academic-review-001'},
 content:{en:{stem:'Define Biology.',answer:'Study of life.'},
 ur:{stem:'حیاتیات کی تعریف کریں۔',answer:'زندگی کا مطالعہ۔'}},
 source:{languages:{
 en:{pdfSha256:sourceChecksums.en,topicId:'official-em-1.1',page:8},
 ur:{pdfSha256:sourceChecksums.ur,topicId:'official-um-1.1',page:9}}}})
function make(){
 const records=[question()]
 const payload={schema:SCHEMA,publicationId:'pub-bio9-001',schoolId:51,
 tenantId:'tenant-51',revision:7,signingKeyId:'pectaa-school-validated-key-01',
 curriculumIdentity:clone(identity),selection:clone(selection),
 sourceBookIds:clone(sourceBookIds),sourceChecksums:clone(sourceChecksums),
 bindingSha256:authoringBindingSha256({curriculumIdentity:identity,selection,
  sourceBookIds,sourceChecksums}),alpPolicy:null,
 publishedAt:TIME-500,validUntil:TIME+500,
 reviewer:{authorId:11,reviewerId:12,independentReviewComplete:true,
  evidenceId:'independent-book-cohort-review-001'},
 topicRegistry:clone(registry),recordCount:records.length,
 recordsDigest:recordsDigest(records)}
 const row={status:'PUBLISHED_APPROVED',payload,
  signature:sign(null,Buffer.from(canonicalPublicationPayload(payload),'utf8'),
   keys.privateKey).toString('base64')}
 const head={status:'PUBLISHED_APPROVED',schoolId:51,tenantId:'tenant-51',
  publicationId:payload.publicationId,revision:payload.revision,
  payloadSha256:sha(canonicalPublicationPayload(payload))}
 return {row,head,records}
}
function bootstrap(f=make(),overrides={}){
 let calls=0
 const ports={gate,clock:()=>TIME*1000,
  publicKeyRegistry:{'pectaa-school-validated-key-01':{
   publicKeyPem,authority:'PECTAA',notBefore:TIME-10000,notAfter:TIME+10000}},
  resolveCurrentHead:async()=>{calls++;return clone(f.head)},
  readPublication:async()=>clone(f.row),
  readPublishedRecords:async()=>clone(f.records),...overrides}
 return {provider:createPhase3VApprovedProvider(ports),calls:()=>calls}
}
const lookup={schoolId:51,tenantId:'tenant-51',
 curriculumIdentity:identity,selection}
test('verified signed publication projects exact Phase3S approved snapshot, no writing',async()=>{
 const {provider,calls}=bootstrap()
 const snap=await provider(lookup)
 assert.equal(snap.status,'PUBLISHED_APPROVED')
 assert.equal(snap.trustOrigin,'SERVER_INDEPENDENT_AUDIT')
 assert.equal(snap.signatureVerification,'PINNED_ED25519_VERIFIED')
 assert.equal(snap.schoolId,51);assert.equal(snap.tenantId,'tenant-51')
 assert.equal(snap.revision,7);assert.equal(snap.records.length,1)
 assert.equal(calls(),2,'publication head checked both before and after source read')
 const checked=approvedRecords(snap,{schoolId:51,tenantId:'tenant-51'},
  {sourceIdentity:{...snap,approvedSnapshotRevision:7}})
 assert.equal(checked.get('bio9-short-001').content.ur.answer,'زندگی کا مطالعہ۔')
})
test('not-yet-published Curriculum drafts remain pending and cannot seed a paper',async()=>{
 for(const head of [null,{...make().head,status:'PENDING_REVIEW'},
  {...make().head,status:'REVOKED'}]){
  const {provider}=bootstrap(make(),{resolveCurrentHead:async()=>head})
  await assert.rejects(provider(lookup),/unavailable/)
 }
})
test('signer key and signature are required, never inferred from client flags',async()=>{
 const f=make();f.row.signature='AAAA'
 await assert.rejects(bootstrap(f).provider(lookup),/signature/)
 const missing=bootstrap(make(),{publicKeyRegistry:{'different-key':{
  publicKeyPem,authority:'PECTAA',notBefore:TIME-1000,notAfter:TIME+1000}}})
 await assert.rejects(missing.provider(lookup),/signature/)
 assert.throws(()=>createPhase3VApprovedProvider({gate}),/registry unavailable/)
})
test('signed payload cannot be changed even if repository metadata is rewritten',async()=>{
 const f=make();f.row.payload.curriculumIdentity.edition='2030-31'
 await assert.rejects(bootstrap(f).provider(lookup),/source identity/)
 const g=make();g.row.payload.reviewer.evidenceId='substituted-review'
 await assert.rejects(bootstrap(g).provider(lookup),/SHA mismatch/)
 const h=make();h.row.payload.sourceChecksums.ur='9'.repeat(64)
 await assert.rejects(bootstrap(h).provider(lookup),/SHA mismatch/)
})
test('source record digest detects tampering without changing publication signature',async()=>{
 const f=make();f.records[0].content.ur.answer='Unreviewed changed translation'
 await assert.rejects(bootstrap(f).provider(lookup),/changed after signed publication/)
 const g=make();g.records[0].review.status='draft'
 await assert.rejects(bootstrap(g).provider(lookup),/draft|unregistered/)
})
test('canonical paired topic IDs and source PDF hashes must both be independently reviewed',async()=>{
 const f=make();f.records[0].source.languages.ur.topicId='invented-1.1'
 await assert.rejects(bootstrap(f).provider(lookup),/bilingual source evidence/)
 const g=make();g.records[0].chapter.id='different-cohort'
 await assert.rejects(bootstrap(g).provider(lookup),/unregistered topic/)
 const h=make();h.records[0].source.languages.en.pdfSha256='0'.repeat(64)
 await assert.rejects(bootstrap(h).provider(lookup),/bilingual source evidence/)
})
test('request cannot use published record across another school/tenant or edition',async()=>{
 const {provider}=bootstrap()
 await assert.rejects(provider({...lookup,schoolId:52}),/unavailable/)
 await assert.rejects(provider({...lookup,tenantId:'tenant-52'}),/unavailable/)
 await assert.rejects(provider({...lookup,curriculumIdentity:{
  ...identity,edition:'2026-27'}}),/source identity/)
})
test('publication head revocation during source read prevents stale authorization',async()=>{
 const f=make();let seen=0
 const {provider}=bootstrap(f,{resolveCurrentHead:async()=>{
  seen++;return seen===1?clone(f.head):{...clone(f.head),status:'REVOKED'}
 }})
 await assert.rejects(provider(lookup),/changed or revoked/)
 assert.equal(seen,2)
})
test('expiry and unsigned ALP policy are fail-closed',async()=>{
 const f=make();f.row.payload.validUntil=TIME-5
 await assert.rejects(bootstrap(f).provider(lookup),/expired/)
 const g=make();g.row.payload.selection={syllabusMode:'alp',examYear:2026}
 const {provider}=bootstrap(g)
 await assert.rejects(provider({...lookup,selection:g.row.payload.selection}),/ALP needs/)
})
function resign(f){
 f.row.payload.recordsDigest=recordsDigest(f.records)
 f.row.payload.recordCount=f.records.length
 f.row.signature=sign(null,Buffer.from(canonicalPublicationPayload(f.row.payload),'utf8'),
  keys.privateKey).toString('base64')
 f.head.payloadSha256=sha(canonicalPublicationPayload(f.row.payload))
}
test('verified ALP is distinct from Full and needs signed year/board evidence',async()=>{
 const f=make();f.row.payload.selection={syllabusMode:'alp',examYear:2026}
 f.row.payload.alpPolicy={examYear:2026,independentlyVerified:true,
  evidenceId:'verified-board-ALP-2026'}
 f.row.payload.bindingSha256=authoringBindingSha256({curriculumIdentity:identity,
  selection:f.row.payload.selection,sourceBookIds,sourceChecksums})
 resign(f)
 const snap=await bootstrap(f).provider({...lookup,selection:f.row.payload.selection})
 assert.equal(snap.selection.syllabusMode,'alp')
 assert.equal(snap.selection.examYear,2026)
 await assert.rejects(bootstrap(f).provider(lookup),/source identity/)
})
test('published bilingual MCQ retains exact paired option IDs and answer identity',async()=>{
 const f=make(),q=f.records[0]
 q.id='bio9-mcq-001';q.type='mcq';q.marks=1;q.correctOptionId='B'
 q.content.en.options=['A','B','C','D'].map(id=>({id,text:'English '+id}))
 q.content.ur.options=['A','B','C','D'].map(id=>({id,text:'اردو '+id}))
 resign(f)
 const result=await bootstrap(f).provider(lookup)
 assert.equal(result.records[0].correctOptionId,'B')
 const changed=clone(f);changed.records[0].content.ur.options[1].id='Z'
 await assert.rejects(bootstrap(changed).provider(lookup),/option/)
})
function workingDraft(q=question()){
 const blockId='shorts',qid=q.id
 return {format:'assps-new-authoring-paper',documentModel:'PaperDocumentNewAuthoring',
  schemaVersion:1,id:'draft-3v-001',status:'UNSAVED_LOCAL_DRAFT',
  metadata:{title:'First Term Biology',classLevel:9,subject:'biology',
   language:'english',direction:'ltr'},
  sourceIdentity:{kind:'NEW_AUTHORING_APPROVED_CURRICULUM',
   draftId:'draft-3v-001',sourcePaperId:null,sourceDatasetGeneration:null,
   authorizationState:'UNVERIFIED_CLIENT_ONLY',approvedSnapshotRevision:7,
   publicationId:'pub-bio9-001',recordsDigest:recordsDigest([q]),
   curriculumIdentity:clone(identity),selection:clone(selection),
   sourceBookIds:clone(sourceBookIds),sourceChecksums:clone(sourceChecksums)},
  institutionBranding:null,
  sections:[{id:blockId,order:1,kind:'short',medium:'en',attemptAny:1,
   selectedCount:1,instruction:'Attempt all',marksPerQuestion:2,
   listedPotentialMarks:2,totalMarks:2,items:[{
    id:'authored::'+blockId+'::'+qid,sourceQuestionId:qid,
    chapterId:q.chapter.id,topicId:q.topicId,kind:'short',
    working:{stem:q.content.en.stem,marks:2,options:[],responseLines:0,direction:'ltr'},
    provenance:{sourceBlockId:blockId,sourceRecordId:qid,academicTextMutated:false,
     answerKeyStatus:'SOURCE_VERIFIED',marksMutated:false}}]}],
  sourceLedger:[{blockId,questionId:qid,chapterId:q.chapter.id,topicId:q.topicId,
   academicRecord:clone(q)}],totalMarks:2,
  legacyPaperUpdated:false,legacyBankWriteAllowed:false,
  canonicalV13MigrationClaim:false,serverPublicationApproved:false,printApproved:false}
}
test('real Phase3S injection accepts only the signed Phase3V provider, no production writes',async()=>{
 const f=make(),draft=workingDraft(f.records[0]),rows=[]
 const provider=bootstrap(f).provider
 const gateway=createIsolatedDraftGateway({
  gate:{label:STAGING_LABEL,confirmedNotProduction:true,
   isolatedSchoolCredentialAuditPassed:true,backupRestoreTestPassed:true,
   approvedProviderReadinessVerified:true},
  authenticate:async()=>({id:20,school_id:51,tenant_id:'tenant-51',role:'teacher'}),
  approvedProvider:provider,isSchoolEnabled:async()=>true,
  repository:{createExclusive:async row=>{rows.push(clone(row));return row},
   loadScoped:async()=>null,casUpdate:async()=>null}
 })
 const result=await gateway.create({authenticationContext:{},draft})
 assert.equal(result.status,'STAGING_ONLY_DRAFT_STORED')
 assert.equal(result.authorizesProduction,false);assert.equal(result.approvedForPrint,false)
 assert.equal(rows.length,1);assert.equal(rows[0].approvedSnapshotRevision,7)
 for(const mutate of [
  x=>{x.sourceIdentity.publicationId='forged-other-publication'},
  x=>{x.sourceIdentity.recordsDigest='0'.repeat(64)},
  x=>{x.sourceIdentity.publicationId=null},
 ]){const changed=clone(draft);mutate(changed)
  await assert.rejects(gateway.create({draft:changed}),/signed publisher ID\/digest/)}
 assert.equal(rows.length,1,'forged publication cannot reach repository')
 const blocked=make();blocked.head.status='PENDING_REVIEW'
 const noRows=[]
 const closed=createIsolatedDraftGateway({
  gate:{label:STAGING_LABEL,confirmedNotProduction:true,
   isolatedSchoolCredentialAuditPassed:true,backupRestoreTestPassed:true,
   approvedProviderReadinessVerified:true},
  authenticate:async()=>({id:20,school_id:51,tenant_id:'tenant-51',role:'teacher'}),
  approvedProvider:bootstrap(blocked).provider,isSchoolEnabled:async()=>true,
  repository:{createExclusive:async row=>{noRows.push(row);return row},
   loadScoped:async()=>null,casUpdate:async()=>null}
 })
 await assert.rejects(closed.create({draft}),/unavailable/)
 assert.equal(noRows.length,0)
})
test('Phase3V is dormant with no source seeding, routing, local storage or network access',()=>{
 const src=readFileSync(join(__dirname,
  '../services/papers/approvedCurriculumProviderPhase3V.js'),'utf8')
 assert.doesNotMatch(src,/require\(['"][^'"]*(?:express|database|questionBankRoutes)/)
 assert.doesNotMatch(src,/fetch\(|axios|localStorage|app\.use\(|INSERT INTO|UPDATE public\./)
 assert.match(src,/NODE_ENV==='production'/)
})
test('production construction remains hard-disabled at this milestone',()=>{
 const previous=process.env.NODE_ENV
 try{
  process.env.NODE_ENV='production'
  assert.throws(()=>createPhase3VApprovedProvider({gate}),/production use prohibited/)
 }finally{
  if(previous===undefined)delete process.env.NODE_ENV
  else process.env.NODE_ENV=previous
 }
})
test('publisher signature cannot override per-question self-review or missing evidence',async()=>{
 const f=make();f.records[0].review.reviewerId=f.row.payload.reviewer.authorId
 resign(f)
 await assert.rejects(bootstrap(f).provider(lookup),/draft|unregistered|cohort/)
 const missing=make();missing.records[0].review.evidenceId=''
 resign(missing)
 await assert.rejects(bootstrap(missing).provider(lookup),/draft|unregistered|cohort/)
})

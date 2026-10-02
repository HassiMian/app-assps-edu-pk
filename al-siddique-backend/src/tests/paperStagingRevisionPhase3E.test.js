// Phase 3E: entirely fake transactional connector. Never connects to live PostgreSQL.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createHash}=require('node:crypto')
const {appendStagingDraftRevision,assertVerifiedStagingGate,SQL}
 =require('../services/papers/paperStagingRevisionAdapter.js')
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex')
const gate=Object.freeze({targetEnvironment:'ASSPS_ISOLATED_STAGING',
 confirmedNotProduction:true,readonlySchemaInventoryReviewed:true,
 encryptedBackupVerified:true,backupRestoreTestPassed:true,
 serverAuthenticatedSchoolScopeVerified:true,twoSchoolIsolationTestPassed:true,
 originalApprovedVisualEvidenceIndependentlyReviewed:true})
const original={id:'draft-001',status:'DRAFT',config:{marks:50,subject:'Science'},
 createdAt:'2026-10-02T02:00:00.000Z',sourcePaperId:'native-approved-reference'}
const nativeText=JSON.stringify(original)
const row=(school_id=51)=>({school_id,id:original.id,created_by:11,status:'DRAFT',
 source_protected:false,revision:2,native_json_text:nativeText,native_sha256:sha(nativeText)})
const actor={id:11,role:'teacher',school_id:51}
const changed=JSON.stringify({...original,config:{...original.config,marks:55}})
const revision=(r)=>({school_id:r.school_id,document_id:r.id,revision:r.revision,
 native_json_text:r.native_json_text,native_sha256:r.native_sha256,actor_id:11})
const copyMap=map=>new Map([...map].map(([k,v])=>[k,{...v}]))
const key=(school,id)=>school+'|'+id
const revKey=(school,id,revision)=>key(school,id)+'|'+revision
function fakePg(rows=[row()],options={}){
 const db={docs:new Map(rows.map(r=>[key(r.school_id,r.id),{...r}])),
  revisions:new Map(rows.map(r=>[revKey(r.school_id,r.id,r.revision),revision(r)])),
  events:[],releases:0,releaseErrors:[],connections:0}
 const connector=async()=>{
  db.connections++
  let draftDocs=null,draftRevisions=null
  return {async query(sql,params=[]){
   db.events.push({sql,params:[...params]})
   if(sql==='BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE'){
    assert.equal(draftDocs,null);draftDocs=copyMap(db.docs);draftRevisions=copyMap(db.revisions)
    return {rowCount:0,rows:[]}
   }
   if(sql==='COMMIT'){
    if(options.failCommit)throw new Error('Simulated commit failure')
    db.docs=draftDocs;db.revisions=draftRevisions;draftDocs=null;draftRevisions=null
    return {rowCount:0,rows:[]}
   }
   if(sql==='ROLLBACK'){
    if(options.failRollback)throw new Error('Simulated rollback failure')
    draftDocs=null;draftRevisions=null
    return {rowCount:0,rows:[]}
   }
   if(!draftDocs)throw new Error('Query outside SERIALIZABLE transaction.')
   if(sql===SQL.setLocalSchool){
    if(options.failRlsScope)return {rowCount:1,rows:[{scoped_school_id:'999'}]}
    return {rowCount:1,rows:[{scoped_school_id:params[0]}]}
   }
   if(sql===SQL.lockPaper){
    const record=draftDocs.get(key(params[0],params[1]))
    return {rowCount:record?1:0,rows:record?[{...record}]:[]}
   }
   if(sql===SQL.lockRevision){
    if(options.missingSeed)return {rowCount:0,rows:[]}
    const existing=draftRevisions.get(revKey(params[0],params[1],params[2]))
    if(options.driftSeed&&existing)return {rowCount:1,rows:[{...existing,native_sha256:'d'.repeat(64)}]}
    return {rowCount:existing?1:0,rows:existing?[{...existing}]:[]}
   }
   if(sql===SQL.updateDraft){
    const [native_json_text,native_sha256,revision,updated_by,school,id,
     expectedRevision,expectedSha]=params
    const existing=draftDocs.get(key(school,id))
    if(options.concurrentChange&&existing)existing.native_sha256='b'.repeat(64)
    if(!existing||existing.revision!==expectedRevision||
     existing.native_sha256!==expectedSha||existing.status!=='DRAFT'||existing.source_protected)
     return {rowCount:0,rows:[]}
    const result={...existing,native_json_text,native_sha256,revision,updated_by}
    draftDocs.set(key(school,id),result)
    if(options.badUpdateResult)return {rowCount:1,rows:[{...result,revision:revision+1}]}
    return {rowCount:1,rows:[{...result}]}
   }
   if(sql===SQL.appendImmutableRevision){
    if(options.failAudit)throw new Error('Simulated append-only audit failure')
    const [school_id,document_id,revisionNumber,native_json_text,native_sha256,
     previous_native_sha256,actor_id]=params
    const index=revKey(school_id,document_id,revisionNumber)
    if(draftRevisions.has(index))throw new Error('duplicate revision')
    const result={school_id,document_id,revision:revisionNumber,native_json_text,
     native_sha256,previous_native_sha256,actor_id}
    draftRevisions.set(index,result)
    if(options.badAuditResult)return {rowCount:1,rows:[{...result,native_sha256:'0'.repeat(64)}]}
    return {rowCount:1,rows:[result]}
   }
   throw new Error('Unsupported SQL reached in mock: '+sql)
  },release(error){db.releases++;db.releaseErrors.push(Boolean(error))}}
 }
 return {db,connect:connector}
}
const request=(connect,extra={})=>({connect,gate,actor,paperId:'draft-001',
 expectedRevision:2,expectedNativeSha256:sha(nativeText),proposedNativeJsonText:changed,...extra})
test('does not create an implicit live database connection; mandatory prerequisites block before connect',async()=>{
 const pg=fakePg()
 for(const key of Object.keys(gate)){
  const bad={...gate,[key]:key==='targetEnvironment'?'production':false}
  await assert.rejects(()=>appendStagingDraftRevision(request(pg.connect,{gate:bad})),/Staging blocked/)
 }
 assert.throws(()=>assertVerifiedStagingGate({}),/Staging blocked/)
 assert.equal(pg.db.connections,0)
})
test('successful staging-only DRAFT CAS appends exactly one immutable revision atomically',async()=>{
 const pg=fakePg(),result=await appendStagingDraftRevision(request(pg.connect))
 assert.deepEqual(result,{status:'STAGING_DRAFT_REVISION_COMMITTED',schoolId:51,
  paperId:'draft-001',revision:3,nativeSha256:sha(changed),
  originalSourceChanged:false,approvalGranted:false,originalNativeRendererRequired:true})
 assert.equal(pg.db.docs.get(key(51,'draft-001')).native_json_text,changed)
 assert.equal(pg.db.docs.get(key(51,'draft-001')).revision,3)
 assert.equal(pg.db.revisions.size,2)
 const snapshot=pg.db.revisions.get(revKey(51,'draft-001',3))
 assert.equal(snapshot.previous_native_sha256,sha(nativeText))
 assert.equal(snapshot.native_sha256,sha(changed))
 assert.equal(pg.db.revisions.get(revKey(51,'draft-001',2)).native_json_text,nativeText)
 assert.deepEqual(pg.db.events.map(e=>e.sql),[
  'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE',SQL.setLocalSchool,SQL.lockPaper,SQL.lockRevision,
  SQL.updateDraft,SQL.appendImmutableRevision,'COMMIT'])
 assert.equal(pg.db.releases,1)
 assert.deepEqual(pg.db.releaseErrors,[false])
})
test('strict transaction-local paper RLS school scope is established before ANY paper read',async()=>{
 const pg=fakePg()
 const result=await appendStagingDraftRevision(request(pg.connect))
 assert.equal(result.schoolId,51)
 assert.deepEqual(pg.db.events[1],{sql:SQL.setLocalSchool,params:['51']})
 assert.equal(pg.db.events[2].sql,SQL.lockPaper)
 const rejected=fakePg([row()],{failRlsScope:true})
 await assert.rejects(()=>appendStagingDraftRevision(request(rejected.connect)),/paper school RLS scope/)
 assert.equal(rejected.db.events.some(x=>x.sql===SQL.lockPaper),false)
 assert.equal(rejected.db.events.at(-1).sql,'ROLLBACK')
 assert.equal(rejected.db.docs.get(key(51,'draft-001')).revision,2)
})
test('stale second writer loses optimistic lock; original and revision chain retained',async()=>{
 const pg=fakePg()
 await appendStagingDraftRevision(request(pg.connect))
 const firstAudit=pg.db.revisions.size
 await assert.rejects(()=>appendStagingDraftRevision(request(pg.connect)),/revision conflict/)
 assert.equal(pg.db.docs.get(key(51,'draft-001')).revision,3)
 assert.equal(pg.db.revisions.size,firstAudit)
 assert.equal(pg.db.events.at(-1).sql,'ROLLBACK')
 assert.equal(pg.db.releases,2)
})
test('school 52 with the SAME paper ID remains invisible to school 51, and ID spoofing is ignored',async()=>{
 const other=row(52),pg=fakePg([row(51),other])
 const impossible=await appendStagingDraftRevision(request(pg.connect,{actor:{...actor,school_id:52}}))
 assert.equal(impossible.schoolId,52)
 assert.equal(pg.db.docs.get(key(51,'draft-001')).revision,2)
 assert.equal(pg.db.docs.get(key(52,'draft-001')).revision,3)
 const pg2=fakePg([other])
 await assert.rejects(()=>appendStagingDraftRevision(request(pg2.connect,{
  claimedSchoolId:52,school_id:52,
  actor:{...actor,school_id:51},
 })),/not found within independently verified school/)
 assert.equal(pg2.db.docs.get(key(52,'draft-001')).revision,2)
})
test('teacher may not edit another author and cross-school actor/verified platform scope is enforced',async()=>{
 for(const badActor of [{...actor,id:19},{...actor,school_id:52},
  {id:2,role:'student',school_id:51},{id:2,role:'super_admin'}]){
  const pg=fakePg()
  await assert.rejects(()=>appendStagingDraftRevision(request(pg.connect,{actor:badActor})),
   /only their own|not found|authenticated|server-verified/i)
  assert.equal(pg.db.docs.get(key(51,'draft-001')).revision,2)
  assert.equal(pg.db.revisions.size,1)
 }
 const pg=fakePg()
 await assert.rejects(()=>appendStagingDraftRevision(request(pg.connect,{actor:{id:1,role:'super_admin'},
  platformScopeVerified:true,verifiedPlatformSchoolId:52})),/not found/)
 assert.equal(pg.db.docs.get(key(51,'draft-001')).revision,2)
})
test('approved, protected and retired rows NEVER enter update or append-only writes',async()=>{
 for(const changes of [{status:'APPROVED'},{status:'LOCKED'},{source_protected:true}]){
  const pg=fakePg([{...row(),...changes}])
  await assert.rejects(()=>appendStagingDraftRevision(request(pg.connect)),
   /Only independent DRAFT/)
  assert.equal(pg.db.events.some(e=>e.sql===SQL.updateDraft),false)
  assert.equal(pg.db.events.some(e=>e.sql===SQL.appendImmutableRevision),false)
  assert.equal(pg.db.releases,1)
 }
})
test('missing or divergent immutable seed snapshot fails BEFORE UPDATE, with rollback',async()=>{
 for(const options of [{missingSeed:true},{driftSeed:true}]){
  const pg=fakePg([row()],options)
  await assert.rejects(()=>appendStagingDraftRevision(request(pg.connect)),/seed|snapshot|diverged/i)
  assert.equal(pg.db.docs.get(key(51,'draft-001')).revision,2)
  assert.equal(pg.db.events.some(e=>e.sql===SQL.updateDraft),false)
  assert.equal(pg.db.events.at(-1).sql,'ROLLBACK')
 }
})
test('concurrent CAS update 0 rows, unexpected returning row, audit INSERT failure or bad audit response rollback everything',async()=>{
 for(const options of [{concurrentChange:true},{badUpdateResult:true},
  {failAudit:true},{badAuditResult:true}]){
  const pg=fakePg([row()],options)
  await assert.rejects(()=>appendStagingDraftRevision(request(pg.connect)),
   /Stale revision|audit failed|Simulated append-only audit failure/i)
  assert.equal(pg.db.docs.get(key(51,'draft-001')).revision,2)
  assert.equal(pg.db.docs.get(key(51,'draft-001')).native_json_text,nativeText)
  assert.equal(pg.db.revisions.size,1)
  assert.equal(pg.db.events.at(-1).sql,'ROLLBACK')
  assert.equal(pg.db.releases,1)
 }
})
test('attempt to self-approve, rewrite paper identity or submit no-change paper rolls back',async()=>{
 for(const proposal of [JSON.stringify({...original,status:'APPROVED'}),
  JSON.stringify({...original,id:'another-id'}),nativeText]){
  const pg=fakePg()
  await assert.rejects(()=>appendStagingDraftRevision(request(pg.connect,{
   proposedNativeJsonText:proposal})),/self-approve|immutable paper ID|No changes/i)
  assert.equal(pg.db.docs.get(key(51,'draft-001')).native_json_text,nativeText)
  assert.equal(pg.db.revisions.size,1)
  assert.equal(pg.db.events.at(-1).sql,'ROLLBACK')
 }
})
test('malformed request, unverified stage connector or missing actor blocked before any SQL',async()=>{
 const pg=fakePg()
 for(const edit of [{connect:null},{actor:null},{paperId:' '},{expectedRevision:0},
  {expectedNativeSha256:'unknown'},{proposedNativeJsonText:undefined}]){
  await assert.rejects(()=>appendStagingDraftRevision(request(pg.connect,edit)),
   /required|Malformed|server-auth|source hash|STAGING/i)
 }
 assert.equal(pg.db.connections,0)
})
test('Urdu/multibyte text is bounded in UTF-8 BYTES before any staging connection',async()=>{
 const pg=fakePg()
 const oversized=JSON.stringify({...original,content:'کتاب'.repeat(700000)})
 assert.ok(oversized.length<5*1024*1024)
 assert.ok(Buffer.byteLength(oversized,'utf8')>5*1024*1024)
 await assert.rejects(()=>appendStagingDraftRevision(request(pg.connect,{
  proposedNativeJsonText:oversized})),/5 MiB UTF-8/)
 assert.equal(pg.db.connections,0)
})
test('uncertain COMMIT outcome forces connection quarantine, rollback attempts, never reports success',async()=>{
 const pg=fakePg([row()],{failCommit:true})
 await assert.rejects(()=>appendStagingDraftRevision(request(pg.connect)),/commit failure/)
 assert.equal(pg.db.docs.get(key(51,'draft-001')).revision,2)
 assert.equal(pg.db.revisions.size,1)
 assert.equal(pg.db.events.at(-1).sql,'ROLLBACK')
 assert.deepEqual(pg.db.releaseErrors,[true])
})
test('rollback itself failing is surfaced and pool client quarantined, never claimed clean',async()=>{
 const pg=fakePg([row()],{failAudit:true,failRollback:true})
 await assert.rejects(()=>appendStagingDraftRevision(request(pg.connect)),/rollback failed/)
 assert.equal(pg.db.docs.get(key(51,'draft-001')).revision,2)
 assert.equal(pg.db.releases,1)
 assert.deepEqual(pg.db.releaseErrors,[true])
})

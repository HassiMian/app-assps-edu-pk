// Synthetic nonproduction authorization and CAS contract; no external database.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const path=require('node:path')
const {pathToFileURL}=require('node:url')
const {createIsolatedDraftGateway,GATE_LABEL,actorScope,MAX_BYTES}
 =require('../services/papers/newAuthoringDraftGatewayPhase3S.js')
const root=path.resolve(__dirname,'../../..')
const editor=path.join(root,'al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/editorV2')
const hashEn='a'.repeat(64),hashUr='b'.repeat(64)
const identity={authority:'PECTAA',grade:9,subjectId:'biology',
 textbookId:'ix-bio',edition:'2025-26',syllabusVersion:'2025-26'}
const clone=x=>JSON.parse(JSON.stringify(x))
const actor={id:11,school_id:1,tenant_id:'tenant-1',role:'teacher'}
const gate={label:GATE_LABEL,confirmedNotProduction:true,
 isolatedSchoolCredentialAuditPassed:true,backupRestoreTestPassed:true,
 approvedProviderReadinessVerified:true}
async function fixture(){
 const {composeCurriculumPhase3PPreview,PHASE3P_SCHEMA}=await import(
  pathToFileURL(path.join(editor,'curriculumPhase3PBridge.js')).href)
 const {createNewAuthoringPaperDocument,editNewAuthoringMetadata,editNewAuthoringQuestion}=
  await import(pathToFileURL(path.join(editor,'newAuthoringPaperDocumentPhase3R.js')).href)
 const question={id:'qid-short',type:'short',marks:2,medium:'dual',
  chapter:{id:'chapter-1',number:1},topicId:'topic-1',curriculum:identity,
  content:{en:{stem:'Define biology.',answer:'Study of life.'},
   ur:{stem:'حیاتیات کی تعریف کریں۔',answer:'زندگی کا مطالعہ۔'}},
  review:{status:'approved'},
  source:{languages:{en:{pdfSha256:hashEn,page:8,paragraph:'1.1'},
   ur:{pdfSha256:hashUr,page:9,paragraph:'1.1'}}}}
 const projection={schema:PHASE3P_SCHEMA,status:'READ_ONLY_APPROVED_PROJECTION',
  identity,sourceBookIds:{en:'en-book',ur:'ur-book'},
  sourceChecksums:{en:hashEn,ur:hashUr},
  selection:{syllabusMode:'full',examYear:null},
  subjects:[{id:'biology9',classId:'nine',syllabusId:'ptb'}],
  chapters:[{id:'chapter-1',subjectId:'biology9',n:1,en:'Introduction',ur:'تعارف',
   topics:[{id:'topic-1',en:'Biology',ur:'حیاتیات'}]}],
  questions:[{id:question.id,subjectId:'biology9',type:'short',
   chapterId:'chapter-1',topicId:'topic-1',marks:2,
   text:question.content.en.stem,textUrdu:question.content.ur.stem,
   options:[],academicRecord:question}]}
 const handoff=composeCurriculumPhase3PPreview({projection,medium:'en',
  blocks:[{id:'shorts',type:'short',questionIds:['qid-short'],attemptAny:1}]})
 handoff.snapshotRevision=7
 handoff.publicationLineage={schema:'assps-phase3w-source-lineage-v1',
  snapshotRevision:7,publicationId:'synthetic-phase3s-publication',
  recordsDigest:'c'.repeat(64),clientAuthorizationState:'UNVERIFIED_CLIENT_ONLY'}
 const draft=createNewAuthoringPaperDocument({handoff,draftId:'draft-phase3s-001'})
 const snapshot={status:'PUBLISHED_APPROVED',trustOrigin:'SERVER_INDEPENDENT_AUDIT',
  schoolId:1,tenantId:'tenant-1',revision:7,curriculumIdentity:clone(identity),
  selection:clone(handoff.selection),sourceBookIds:clone(handoff.sourceBookIds),
  sourceChecksums:clone(handoff.sourceChecksums),records:[clone(question)]}
 return {draft,snapshot,editNewAuthoringMetadata,editNewAuthoringQuestion}
}
function fakeRepository(){
 const rows=new Map()
 const key=x=>[x.schoolId,x.tenantId,x.draftId].join('::')
 return {
  rows,
  async createExclusive(x){
   const k=key(x);if(rows.has(k))throw Error('duplicate draft cannot overwrite')
   const row={...x};rows.set(k,row);return {...row}
  },
  async loadScoped(x){const row=rows.get(key(x));return row?{...row}:null},
  async casUpdate(x){
   const k=key(x),old=rows.get(k)
   if(!old||old.revision!==x.expectedRevision||
      old.nativeSha256!==x.expectedNativeSha256)throw Error('atomic CAS conflict')
   const row={...old,revision:x.nextRevision,nativeSha256:x.nextNativeSha256,
    nativeJsonText:x.nextNativeJsonText,updatedBy:x.actorId}
   rows.set(k,row);return {...row}
  },
 }
}
function bootstrap(snapshot,{auth=()=>clone(actor),provider=()=>clone(snapshot),
 enabled=()=>true,repository=fakeRepository(),configuration=gate}={}){
 const gateway=createIsolatedDraftGateway({gate:configuration,authenticate:auth,
  approvedProvider:provider,repository,isSchoolEnabled:enabled})
 return {gateway,repository}
}
test('staging bootstrap and identity reject unverified authority or missing provider',()=>{
 assert.throws(()=>createIsolatedDraftGateway(),/staging|non-production/i)
 assert.throws(()=>createIsolatedDraftGateway({gate:{...gate,confirmedNotProduction:false}}),
  /non-production/i)
 assert.throws(()=>actorScope({...actor,tenant_id:null}),/authenticated school actor/)
 assert.throws(()=>actorScope({...actor,role:'super_admin'}),/authenticated school actor/)
 assert.throws(()=>actorScope({...actor,account_type:'service'}),/authenticated school actor/)
 assert.equal(MAX_BYTES,5*1024*1024)
})
test('authorized create and reopen require server actor and approved revision',async()=>{
 const {draft,snapshot}=await fixture(),{gateway,repository}=bootstrap(snapshot)
 const res=await gateway.create({authenticationContext:{},draft,schoolId:999,
  actor:{id:999,role:'principal',school_id:999}})
 assert.equal(res.status,'STAGING_ONLY_DRAFT_STORED')
 assert.equal(res.schoolId,1);assert.equal(res.revision,1)
 assert.equal(res.approvedForPrint,false);assert.equal(res.authorizesProduction,false)
 assert.equal(repository.rows.size,1)
 assert.equal([...repository.rows.values()][0].approvedSnapshotRevision,7)
 const read=await gateway.read({authenticationContext:{},draftId:draft.id})
 assert.deepEqual(read.draft,draft);assert.equal(read.revision,1)
 assert.equal(read.nativeSha256,res.nativeSha256)
 assert.equal(read.authorizesProduction,false)
 await assert.rejects(gateway.create({authenticationContext:{},draft}),/duplicate draft/)
})
test('school feature and missing actual publication fail closed without repository calls',async()=>{
 const {draft,snapshot}=await fixture(),repo=fakeRepository()
 const {gateway}=bootstrap(snapshot,{enabled:()=>false,repository:repo})
 await assert.rejects(gateway.create({draft}),/not been independently enabled/)
 assert.equal(repo.rows.size,0)
 const missing=bootstrap(snapshot,{provider:()=>null,repository:repo})
 await assert.rejects(missing.gateway.create({draft}),/snapshot school/)
 assert.equal(repo.rows.size,0)
})
test('CAS edit increments revision, immutable source stays exact, stale saves refuse',async()=>{
 const {draft,snapshot,editNewAuthoringMetadata}=await fixture()
 const {gateway}=bootstrap(snapshot)
 const created=await gateway.create({draft})
 const edited=editNewAuthoringMetadata(draft,{title:'Revised Test'})
 const saved=await gateway.revise({draft:edited,expectedRevision:1,
  expectedNativeSha256:created.nativeSha256})
 assert.equal(saved.revision,2);assert.notEqual(saved.nativeSha256,created.nativeSha256)
 const read=await gateway.read({draftId:draft.id})
 assert.equal(read.draft.metadata.title,'Revised Test')
 assert.deepEqual(read.draft.sourceLedger,draft.sourceLedger)
 await assert.rejects(gateway.revise({draft:edited,expectedRevision:1,
  expectedNativeSha256:created.nativeSha256}),/stale revision/)
 await assert.rejects(gateway.revise({draft:edited,expectedRevision:2,
  expectedNativeSha256:saved.nativeSha256}),/no changes/)
})
test('teacher cannot read or revise another teacher draft even within the same school',async()=>{
 const {draft,snapshot}=await fixture()
 const repo=fakeRepository(),owner=bootstrap(snapshot,{repository:repo})
 await owner.gateway.create({draft})
 const outsider=bootstrap(snapshot,{repository:repo,auth:()=>({...actor,id:99})})
 await assert.rejects(outsider.gateway.read({draftId:draft.id}),/teachers can open/)
 const principal=bootstrap(snapshot,{repository:repo,auth:()=>({...actor,id:99,role:'principal'})})
 const read=await principal.gateway.read({draftId:draft.id})
 assert.equal(read.draft.id,draft.id)
})
test('cross-school and cross-tenant access fail even with the correct draft ID',async()=>{
 const {draft,snapshot}=await fixture(),repo=fakeRepository()
 await bootstrap(snapshot,{repository:repo}).gateway.create({draft})
 for(const forged of [{...actor,school_id:2,tenant_id:'tenant-2'},
  {...actor,tenant_id:'other-tenant'}]){
  const {gateway}=bootstrap(snapshot,{repository:repo,auth:()=>forged})
  await assert.rejects(gateway.read({draftId:draft.id}),/same-school|record is not/i)
  await assert.rejects(gateway.create({draft}),/snapshot school/)
 }
})
test('forged academic record, snapshot revision and revoked approvals refuse storage',async()=>{
 const {draft,snapshot}=await fixture()
 const changed=clone(draft)
 changed.sourceLedger[0].academicRecord.content.en.answer='Forged answer'
 await assert.rejects(bootstrap(snapshot).gateway.create({draft:changed}),/forged|unapproved/i)
 const oldRev=clone(draft);oldRev.sourceIdentity.approvedSnapshotRevision=6
 await assert.rejects(bootstrap(snapshot).gateway.create({draft:oldRev}),/snapshot school/)
 const pending=clone(snapshot);pending.status='PENDING_REVIEW'
 await assert.rejects(bootstrap(pending).gateway.create({draft}),/snapshot school/)
 const revoked=clone(snapshot);revoked.records[0].review.status='draft'
 await assert.rejects(bootstrap(revoked).gateway.create({draft}),/unapproved/)
})
test('source structure and computed marks cannot change silently in revised draft',async()=>{
 const {draft,snapshot,editNewAuthoringQuestion}=await fixture()
 const {gateway}=bootstrap(snapshot),created=await gateway.create({draft})
 const tampered=clone(draft);tampered.totalMarks=100
 await assert.rejects(gateway.revise({draft:tampered,expectedRevision:1,
  expectedNativeSha256:created.nativeSha256}),/calculation mismatch/)
 const edited=editNewAuthoringQuestion(draft,{sectionId:'shorts',
  questionId:'qid-short',patch:{stem:'Teacher wording.'}})
 const saved=await gateway.revise({draft:edited,expectedRevision:1,
  expectedNativeSha256:created.nativeSha256})
 assert.equal(saved.revision,2)
 const restructured=clone(edited);restructured.sections[0].id='other-section'
 await assert.rejects(gateway.revise({draft:restructured,expectedRevision:2,
  expectedNativeSha256:saved.nativeSha256}),/invalid|source/i)
})
test('repository cannot acknowledge wrong tenant/revision or supply corrupt native bytes',async()=>{
 const {draft,snapshot}=await fixture(),repo=fakeRepository()
 const original=repo.createExclusive.bind(repo)
 repo.createExclusive=async x=>({...await original(x),revision:99})
 await assert.rejects(bootstrap(snapshot,{repository:repo}).gateway.create({draft}),
  /expected school\/tenant\/CAS revision/)
 const owner=bootstrap(snapshot,{repository:repo})
 const row=repo.rows.values().next().value;row.nativeJsonText='{}'
 await assert.rejects(owner.gateway.read({draftId:draft.id}),/immutable-hash/)
})
test('revoked or replaced publication prevents reopening previously saved draft',async()=>{
 const {draft,snapshot}=await fixture()
 let source=clone(snapshot)
 const {gateway}=bootstrap(snapshot,{provider:()=>clone(source)})
 await gateway.create({draft})
 source.revision=8
 await assert.rejects(gateway.read({draftId:draft.id}),/snapshot school/)
 source=clone(snapshot);source.status='REVOKED'
 await assert.rejects(gateway.read({draftId:draft.id}),/snapshot school/)
})
test('gateway has no production routing, DB credentials or legacy paper import',()=>{
 const fs=require('node:fs')
 const src=fs.readFileSync(path.join(root,
  'al-siddique-backend/src/services/papers/newAuthoringDraftGatewayPhase3S.js'),'utf8')
 assert.doesNotMatch(src,/require\(['"][^'"]*(?:config\/database|express|paperRoute)/)
 assert.doesNotMatch(src,/app\.use\(|router\.(?:post|put|delete|patch|use)\(/)
 assert.match(src,/PHASE3S_ISOLATED_DRAFT_STAGING_ONLY/)
})

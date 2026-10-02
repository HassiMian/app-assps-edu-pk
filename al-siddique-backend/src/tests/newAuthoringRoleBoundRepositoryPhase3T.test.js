// Phase 3T: deterministic fake PostgreSQL only. NEVER uses a real database.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createHash}=require('node:crypto')
const {readFileSync}=require('node:fs')
const {join}=require('node:path')
const {createRoleBoundNewAuthoringRepository,authoringBindingSha256,
 EXPECTED_LOGIN,ROLE_ID_SQL,LABEL,SQL}=require('../services/papers/newAuthoringRoleBoundRepositoryPhase3T.js')
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const clone=x=>JSON.parse(JSON.stringify(x))
const gate={label:LABEL,confirmedNotProduction:true,
 independentSchemaAndRlsReviewPassed:true,backupRestorePassed:true,
 roleLoginIsolationPassed:true,approvedSnapshotAtomicGateReviewed:true}
const sid={kind:'NEW_AUTHORING_APPROVED_CURRICULUM',draftId:'draft-3t-001',
 sourcePaperId:null,sourceDatasetGeneration:null,
 authorizationState:'UNVERIFIED_CLIENT_ONLY',approvedSnapshotRevision:7,
 curriculumIdentity:{authority:'PECTAA',grade:9,subjectId:'biology',
  textbookId:'biology-ix-pair',edition:'2025-26',syllabusVersion:'2025-26'},
 sourceBookIds:{en:'en-book',ur:'ur-book'},
 sourceChecksums:{en:'a'.repeat(64),ur:'b'.repeat(64)},
 selection:{syllabusMode:'full',examYear:null}}
const paper=()=>({id:sid.draftId,format:'assps-new-authoring-paper',
 documentModel:'PaperDocumentNewAuthoring',schemaVersion:1,status:'UNSAVED_LOCAL_DRAFT',
 sourceIdentity:clone(sid),printApproved:false,serverPublicationApproved:false,
 canonicalV13MigrationClaim:false,legacyBankWriteAllowed:false,
 legacyPaperUpdated:false,institutionBranding:null,metadata:{title:'Academic first term'},
 sections:[{id:'shorts',order:1,kind:'short',medium:'en',items:[
  {id:'authored::shorts::q1',sourceQuestionId:'q1',chapterId:'c1',topicId:'t1',kind:'short',
   working:{stem:'Question',marks:2}}]}],
 sourceLedger:[{blockId:'shorts',questionId:'q1',academicRecord:{id:'q1'}}]})
const makeInput=(doc=paper())=>({schoolId:51,tenantId:'tenant-51',
 draftId:doc.id,createdBy:110,revision:1,status:'DRAFT',sourceProtected:false,
 nativeJsonText:JSON.stringify(doc),nativeSha256:sha(JSON.stringify(doc)),
 approvedSnapshotRevision:7})
function fakeDb({login=EXPECTED_LOGIN(51),sessionSchool=51,
 sessionTenant='tenant-51',published=true,failInitial=false,failRevision=false,failCommit=false}={}){
 const state={row:null,audit:[],calls:[],releases:[],
  snapshot:{schoolId:51,tenantId:'tenant-51',
   binding:authoringBindingSha256(sid),revision:7,status:published?'PUBLISHED_APPROVED':'REVOKED'}}
 const result=row=>({rowCount:row?1:0,rows:row?[clone(row)]:[]})
 const connect=async()=>{
  let tx=null
  return {
   async query(sql,args=[]){
    state.calls.push({sql,args:clone(args)})
    if(sql===ROLE_ID_SQL)
     return result({authenticated_login:login,verified_school_id:sessionSchool,
      verified_tenant_id:sessionTenant})
    if(sql.startsWith('BEGIN TRANSACTION')){
     tx={row:clone(state.row),audit:clone(state.audit)};return result({ok:true})
    }
    if(sql==='COMMIT'){
     if(failCommit)throw Error('commit outcome unknown')
     state.row=tx.row;state.audit=tx.audit;tx=null;return result({ok:true})
    }
    if(sql==='ROLLBACK'){tx=null;return result({ok:true})}
    if(sql===SQL.snapshotLock){
     const [schoolId,tenantId,binding,revision]=args,s=state.snapshot
     return result(s.status==='PUBLISHED_APPROVED'&&s.schoolId===schoolId&&
       s.tenantId===tenantId&&s.binding===binding&&s.revision===revision?
       {revision}:null)
    }
    if(sql===SQL.insertDraft){
     if(tx.row)return result(null)
     const [schoolId,tenantId,draftId,createdBy,nativeJsonText,
      nativeSha256,approvedSnapshotRevision,approvedBindingSha256]=args
     tx.row={schoolId,tenantId,draftId,createdBy,sourceProtected:false,
      status:'DRAFT',revision:1,nativeJsonText,nativeSha256,
      approvedSnapshotRevision,approvedBindingSha256}
     return result(tx.row)
    }
    if(sql===SQL.appendInitial){
     if(failInitial)return result(null)
     tx.audit.push({revision:1,nativeSha256:args[4],previous:null})
     return result({revision:1,native_sha256:args[4]})
    }
    if(sql===SQL.readDraft||sql===SQL.lockDraft){
     const [school,tenant,id]=args,row=tx.row
     return result(row&&row.schoolId===school&&row.tenantId===tenant&&
      row.draftId===id?row:null)
    }
    if(sql===SQL.casUpdate){
     const [nativeJsonText,nativeSha256,nextRevision,actorId,school,tenant,id,
      oldRevision,oldSha,approvedRevision,binding]=args
     const r=tx.row
     if(!r||r.schoolId!==school||r.tenantId!==tenant||r.draftId!==id||
       r.revision!==oldRevision||r.nativeSha256!==oldSha||
       r.approvedSnapshotRevision!==approvedRevision||r.approvedBindingSha256!==binding)
      return result(null)
     tx.row={...r,nativeJsonText,nativeSha256,revision:nextRevision,updatedBy:actorId}
     return result(tx.row)
    }
    if(sql===SQL.appendRevision){
     if(failRevision)return result(null)
     tx.audit.push({revision:args[3],nativeSha256:args[5],previous:args[6]})
     return result({revision:args[3],native_sha256:args[5]})
    }
    throw Error('Unexpected fake DB SQL: '+sql)
   },
   release(error){state.releases.push(error??null)},
  }
 }
 return {state,connect}
}
const definition=db=>({schoolId:51,tenantId:'tenant-51',
 expectedLogin:EXPECTED_LOGIN(51),connect:db.connect})
const repo=db=>createRoleBoundNewAuthoringRepository({
 gate,connectorDefinitions:[definition(db)]})
const edit=x=>{const d=clone(x);d.metadata.title='Revised teacher draft';return d}
test('separate source binding is stable and sensitive to curriculum, books and ALP scope',()=>{
 const a=authoringBindingSha256(sid),b=authoringBindingSha256(clone(sid))
 assert.equal(a,b);assert.match(a,/^[a-f0-9]{64}$/)
 const changed=clone(sid);changed.curriculumIdentity.edition='2026-27'
 assert.notEqual(authoringBindingSha256(changed),a)
 const alp=clone(sid);alp.selection={syllabusMode:'alp',examYear:2026}
 assert.notEqual(authoringBindingSha256(alp),a)
 const invalid=clone(sid);invalid.selection={syllabusMode:'alp',examYear:null}
 assert.throws(()=>authoringBindingSha256(invalid),/ALP/)
})
test('staging only: missing review gates, unknown logins and reused connectors fail',()=>{
 const db=fakeDb()
 assert.throws(()=>createRoleBoundNewAuthoringRepository(),/gates/)
 assert.throws(()=>createRoleBoundNewAuthoringRepository({gate:{...gate,backupRestorePassed:false},
  connectorDefinitions:[definition(db)]}),/gates/)
 const conn=db.connect
 assert.throws(()=>createRoleBoundNewAuthoringRepository({gate,connectorDefinitions:[
  definition(db),{schoolId:52,tenantId:'tenant-52',
   expectedLogin:EXPECTED_LOGIN(52),connect:conn}]}),/credential/)
})
test('initial save locks published snapshot and appends native revision atomically',async()=>{
 const db=fakeDb(),repository=repo(db),input=makeInput()
 const saved=await repository.createExclusive(input)
 assert.equal(saved.schoolId,51);assert.equal(saved.tenantId,'tenant-51')
 assert.equal(saved.revision,1);assert.equal(saved.createdBy,110)
 assert.equal(saved.nativeSha256,input.nativeSha256)
 assert.equal(db.state.row.approvedBindingSha256,authoringBindingSha256(sid))
 assert.equal(db.state.audit.length,1)
 assert.deepEqual(db.state.calls.slice(0,3).map(x=>x.sql),[
  ROLE_ID_SQL,'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE',SQL.snapshotLock])
 assert.ok(db.state.calls.findIndex(x=>x.sql===SQL.insertDraft)<
   db.state.calls.findIndex(x=>x.sql===SQL.appendInitial))
 assert.equal(db.state.calls.at(-1).sql,'COMMIT')
})
test('reopen is scoped and read-only; create collision cannot overwrite first draft',async()=>{
 const db=fakeDb(),r=repo(db),input=makeInput()
 await r.createExclusive(input)
 const original=clone(db.state.row)
 const row=await r.loadScoped({schoolId:51,tenantId:'tenant-51',draftId:input.draftId})
 assert.deepEqual(row,original)
 assert.ok(db.state.calls.some(x=>x.sql==='BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'))
 await assert.rejects(r.createExclusive(input),/collision/)
 assert.deepEqual(db.state.row,original);assert.equal(db.state.audit.length,1)
 assert.equal(db.state.calls.at(-1).sql,'ROLLBACK')
})
test('new question wording can CAS-save without replacing academic source ledger',async()=>{
 const db=fakeDb(),r=repo(db),input=makeInput()
 await r.createExclusive(input)
 const proposed=edit(paper()),json=JSON.stringify(proposed)
 const saved=await r.casUpdate({schoolId:51,tenantId:'tenant-51',
  draftId:input.draftId,actorId:110,expectedRevision:1,
  expectedNativeSha256:input.nativeSha256,nextRevision:2,
  nextNativeJsonText:json,nextNativeSha256:sha(json),approvedSnapshotRevision:7})
 assert.equal(saved.revision,2);assert.equal(db.state.audit.length,2)
 assert.equal(db.state.audit[1].previous,input.nativeSha256)
 assert.equal(JSON.parse(saved.nativeJsonText).metadata.title,'Revised teacher draft')
 assert.ok(db.state.calls.findIndex(x=>x.sql===SQL.casUpdate)<
  db.state.calls.findIndex(x=>x.sql===SQL.appendRevision))
 assert.equal(db.state.calls.at(-1).sql,'COMMIT')
})
test('stale CAS or forged source ledger fails and existing revision remains intact',async()=>{
 const db=fakeDb(),r=repo(db),input=makeInput();await r.createExclusive(input)
 const proposed=edit(paper()),json=JSON.stringify(proposed)
 const next={schoolId:51,tenantId:'tenant-51',draftId:input.draftId,
  actorId:110,expectedRevision:2,expectedNativeSha256:input.nativeSha256,
  nextRevision:3,nextNativeJsonText:json,nextNativeSha256:sha(json),approvedSnapshotRevision:7}
 await assert.rejects(r.casUpdate(next),/stale CAS/)
 const forged=clone(proposed);forged.sourceLedger[0].questionId='other-id'
 const changed=JSON.stringify(forged)
 await assert.rejects(r.casUpdate({...next,expectedRevision:1,nextRevision:2,
  nextNativeJsonText:changed,nextNativeSha256:sha(changed)}),/source ledger/)
 assert.equal(db.state.row.revision,1);assert.equal(db.state.audit.length,1)
})
test('wrong database SESSION_USER or forged school is rejected before beginning a transaction',async()=>{
 for(const bad of [fakeDb({login:EXPECTED_LOGIN(52)}),fakeDb({sessionSchool:52}),
  fakeDb({sessionTenant:'other-tenant'})]){
  const r=repo(bad)
  await assert.rejects(r.createExclusive(makeInput()),/session login/)
  assert.equal(bad.state.row,null)
  assert.equal(bad.state.calls.length,1)
  assert.ok(bad.state.releases[0] instanceof Error)
 }
})
test('caller cannot swap tenant or school connector using request-controlled IDs',async()=>{
 const db=fakeDb(),r=repo(db),x=makeInput()
 await assert.rejects(r.createExclusive({...x,schoolId:52}),/private DB login/)
 await assert.rejects(r.createExclusive({...x,tenantId:'other-tenant'}),/private DB login/)
 assert.equal(db.state.calls.length,0)
})
test('withdrawn snapshot fails under row lock without creating any document or revision',async()=>{
 const db=fakeDb({published:false}),r=repo(db)
 await assert.rejects(r.createExclusive(makeInput()),/absent\/revoked/)
 assert.equal(db.state.row,null);assert.equal(db.state.audit.length,0)
 assert.equal(db.state.calls.at(-1).sql,'ROLLBACK')
})
test('failed initial audit rolls back inserted draft and quarantines unknown COMMIT outcomes',async()=>{
 const failed=fakeDb({failInitial:true})
 await assert.rejects(repo(failed).createExclusive(makeInput()),/initial immutable revision/)
 assert.equal(failed.state.row,null);assert.equal(failed.state.audit.length,0)
 assert.equal(failed.state.calls.at(-1).sql,'ROLLBACK')
 const unknown=fakeDb({failCommit:true})
 await assert.rejects(repo(unknown).createExclusive(makeInput()),/commit outcome unknown/)
 assert.equal(unknown.state.row,null)
 assert.ok(unknown.state.releases[0] instanceof Error)
})
test('failed revision audit rolls back the CAS update, retaining previous exact bytes',async()=>{
 const db=fakeDb(),r=repo(db),input=makeInput();await r.createExclusive(input)
 const old=clone(db.state.row),before=db.state.audit.length
 const proposed=edit(paper()),json=JSON.stringify(proposed)
 const failing=fakeDb({failRevision:true})
 failing.state.row=clone(db.state.row);failing.state.audit=clone(db.state.audit)
 await assert.rejects(repo(failing).casUpdate({schoolId:51,tenantId:'tenant-51',
  draftId:input.draftId,actorId:110,expectedRevision:1,
  expectedNativeSha256:input.nativeSha256,nextRevision:2,
  nextNativeJsonText:json,nextNativeSha256:sha(json),approvedSnapshotRevision:7}),
  /append-only CAS revision audit/)
 assert.deepEqual(failing.state.row,old);assert.equal(failing.state.audit.length,before)
})
test('input checks refuse altered hash, invalid identity and forged canonical V13 claims',async()=>{
 const db=fakeDb(),r=repo(db),input=makeInput()
 await assert.rejects(r.createExclusive({...input,nativeSha256:'9'.repeat(64)}),
  /bounded native text/)
 const forged=paper();forged.canonicalV13MigrationClaim=true
 const forgedText=JSON.stringify(forged)
 await assert.rejects(r.createExclusive({...input,nativeJsonText:forgedText,
  nativeSha256:sha(forgedText)}),/independent new-authoring identity/)
 assert.equal(db.state.calls.length,0)
})
test('SQL is isolated, scoped, approved-revision locked and append-only by construction',()=>{
 assert.match(ROLE_ID_SQL,/session_user/)
 assert.match(ROLE_ID_SQL,/phase3t_session_school_id/)
 assert.match(ROLE_ID_SQL,/phase3t_session_tenant_id/)
 assert.match(SQL.snapshotLock,/phase3t_lock_published_snapshot/)
 assert.doesNotMatch(SQL.snapshotLock,/FROM public\.new_authoring_approved_snapshots_staging/)
 for(const key of ['insertDraft','readDraft','lockDraft','casUpdate','appendInitial','appendRevision']){
  assert.match(SQL[key],/new_authoring_.*_staging/)
  assert.match(SQL[key],/school_id/);assert.match(SQL[key],/tenant_id/)
  assert.doesNotMatch(SQL[key],/\b(?:DROP|TRUNCATE|DELETE)\b/i)
 }
 assert.match(SQL.casUpdate,/native_sha256=\$9/)
 assert.match(SQL.casUpdate,/approved_snapshot_revision=\$10/)
 assert.match(SQL.casUpdate,/approved_binding_sha256=\$11/)
 assert.doesNotMatch(Object.values(SQL).join(' '),/\bpublic\.paper_documents\b/)
 const source=readFileSync(join(__dirname,'../services/papers/newAuthoringRoleBoundRepositoryPhase3T.js'),'utf8')
 assert.doesNotMatch(source,/require\(['"][^'"]*(?:database|express|paperRoute|migrate)/)
 assert.doesNotMatch(source,/DATABASE_URL|process\.env\.PG|app\.paper_school_id/)
})
test('production construction remains disabled even if a staging gate is supplied',()=>{
 const previous=process.env.NODE_ENV
 try{process.env.NODE_ENV='production';assert.throws(()=>repo(fakeDb()),/disabled in production/)}
 finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous}
})

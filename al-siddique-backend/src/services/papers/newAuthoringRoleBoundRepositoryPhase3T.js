// Phase 3T: DORMANT new-authoring repository for independently provisioned isolated staging.
// Never mounted in Express, imported by production, or connected through generic DB credentials.
const {createHash,timingSafeEqual}=require('node:crypto')
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x)
const equalHash=(a,b)=>hash(a)&&hash(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'))
const reject=x=>{throw Error('Phase3T refused: '+x)}
const text=x=>typeof x==='string'&&x.trim().length>0
const int=x=>Number.isSafeInteger(x)&&x>0
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const byteLimit=5*1024*1024
const LABEL='ASSPS_PHASE3T_ISOLATED_STAGING_ONLY'
const EXPECTED_LOGIN=id=>'assps_p3t_school'+id
const ROLE_ID_SQL='SELECT session_user AS authenticated_login, '+
 'public.phase3t_session_school_id() AS verified_school_id, '+
 'public.phase3t_session_tenant_id() AS verified_tenant_id'
const BINDING_KEYS=['authority','grade','subjectId','textbookId','edition','syllabusVersion']
function authoringBindingSha256(source){
 if(!source||!source.curriculumIdentity||!source.selection||
    !source.sourceBookIds||!source.sourceChecksums||
    !['en','ur'].every(k=>text(source.sourceBookIds[k])&&hash(source.sourceChecksums[k])))
  reject('complete independently bound bilingual source identity required')
 if(!['full','alp'].includes(source.selection.syllabusMode)||
    (source.selection.syllabusMode==='alp'&&!int(source.selection.examYear)))
  reject('full or explicitly verified exam-year ALP scope required')
 const values=BINDING_KEYS.map(k=>source.curriculumIdentity[k])
 if(values.some(x=>x===null||x===undefined||x===''))reject('missing canonical curriculum identity')
 return sha(JSON.stringify(['assps-new-authoring-snapshot-binding-v1',...values,
  source.selection.syllabusMode,source.selection.examYear??null,
  source.sourceBookIds.en,source.sourceBookIds.ur,
  source.sourceChecksums.en,source.sourceChecksums.ur]))
}
const SELECT_FIELDS='school_id AS "schoolId",tenant_id AS "tenantId",draft_id AS "draftId",'+
 'created_by AS "createdBy",status,source_protected AS "sourceProtected",revision,'+
 'native_json_text AS "nativeJsonText",native_sha256 AS "nativeSha256",'+
 'approved_snapshot_revision AS "approvedSnapshotRevision",'+
 'approved_binding_sha256 AS "approvedBindingSha256"'
const SQL=Object.freeze({
 // A purpose-only SECURITY DEFINER must check the private login mapping and hold
 // SELECT ... FOR SHARE on the PUBLISHED_APPROVED row until transaction commit.
 // Tenant logins receive EXECUTE only; they MUST NOT get snapshot UPDATE grants.
 snapshotLock: 'SELECT revision FROM public.phase3t_lock_published_snapshot($1,$2,$3,$4)',
 insertDraft: 'INSERT INTO public.new_authoring_drafts_staging '+
  '(school_id,tenant_id,draft_id,created_by,updated_by,status,source_protected,revision,'+
  'native_json_text,native_sha256,approved_snapshot_revision,approved_binding_sha256) '+
  "VALUES($1,$2,$3,$4,$4,'DRAFT',FALSE,1,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING "+SELECT_FIELDS,
 appendInitial: 'INSERT INTO public.new_authoring_revisions_staging '+
  '(school_id,tenant_id,draft_id,revision,native_json_text,native_sha256,'+
  "previous_native_sha256,actor_id,change_kind) VALUES($1,$2,$3,1,$4,$5,NULL,$6,'INITIAL_AUTHORING') "+
  'RETURNING revision,native_sha256',
 readDraft: 'SELECT '+SELECT_FIELDS+' FROM public.new_authoring_drafts_staging '+
  'WHERE school_id=$1 AND tenant_id=$2 AND draft_id=$3',
 lockDraft: 'SELECT '+SELECT_FIELDS+' FROM public.new_authoring_drafts_staging '+
  'WHERE school_id=$1 AND tenant_id=$2 AND draft_id=$3 FOR UPDATE',
 casUpdate: 'UPDATE public.new_authoring_drafts_staging SET '+
  'native_json_text=$1,native_sha256=$2,revision=$3,updated_by=$4,updated_at=now() '+
  'WHERE school_id=$5 AND tenant_id=$6 AND draft_id=$7 AND revision=$8 '+
  "AND native_sha256=$9 AND status='DRAFT' AND source_protected=FALSE "+
  'AND approved_snapshot_revision=$10 AND approved_binding_sha256=$11 RETURNING '+SELECT_FIELDS,
 appendRevision: 'INSERT INTO public.new_authoring_revisions_staging '+
  '(school_id,tenant_id,draft_id,revision,native_json_text,native_sha256,'+
  "previous_native_sha256,actor_id,change_kind) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'DRAFT_CAS_REVISION') "+
  'RETURNING revision,native_sha256',
})
const one=r=>r?.rowCount===1&&Array.isArray(r.rows)&&r.rows.length===1
function scopeOf(input){
 if(!int(input?.schoolId)||!text(input?.tenantId)||input.tenantId.length>128)
  reject('server-authenticated school and tenant scope required')
 return {schoolId:input.schoolId,tenantId:input.tenantId}
}
function sourceOf(input,{expectedRevision=null}={}){
 if(!text(input?.draftId)||input.draftId.length>128||
    !/^[a-z0-9][a-z0-9_.:-]{2,127}$/i.test(input.draftId)||
    !text(input.nativeJsonText)||Buffer.byteLength(input.nativeJsonText,'utf8')>byteLimit||
    !hash(input.nativeSha256)||!equalHash(sha(input.nativeJsonText),input.nativeSha256)||
    !int(input.approvedSnapshotRevision))
  reject('exact bounded native text, hash, draft ID and approved source revision required')
 let doc;try{doc=JSON.parse(input.nativeJsonText)}catch{reject('invalid native JSON')}
 if(!doc||doc.id!==input.draftId||doc.format!=='assps-new-authoring-paper'||
    doc.documentModel!=='PaperDocumentNewAuthoring'||doc.schemaVersion!==1||
    doc.status!=='UNSAVED_LOCAL_DRAFT'||doc.sourceIdentity?.draftId!==input.draftId||
    doc.sourceIdentity?.kind!=='NEW_AUTHORING_APPROVED_CURRICULUM'||
    doc.sourceIdentity.approvedSnapshotRevision!==input.approvedSnapshotRevision||
    doc.sourceIdentity.authorizationState!=='UNVERIFIED_CLIENT_ONLY'||
    doc.sourceIdentity.sourcePaperId!==null||
    doc.sourceIdentity.sourceDatasetGeneration!==null||
    doc.printApproved!==false||doc.serverPublicationApproved!==false||
    doc.canonicalV13MigrationClaim!==false||doc.legacyBankWriteAllowed!==false||
    doc.legacyPaperUpdated!==false||doc.institutionBranding!==null)
  reject('draft does not match independent new-authoring identity and pinned source revision')
 if(expectedRevision!==null&&(!int(expectedRevision)||expectedRevision<1))
  reject('invalid expected optimistic revision')
 return {bindingSha256:authoringBindingSha256(doc.sourceIdentity),doc}
}
function checkedRow(row,scope,draftId){
 if(!row||row.schoolId!==scope.schoolId||row.tenantId!==scope.tenantId||
    row.draftId!==draftId||row.status!=='DRAFT'||row.sourceProtected!==false||
    !int(row.createdBy)||!int(row.revision)||!text(row.nativeJsonText)||
    !hash(row.nativeSha256)||!equalHash(sha(row.nativeJsonText),row.nativeSha256)||
    !hash(row.approvedBindingSha256)||!int(row.approvedSnapshotRevision))
  reject('repository returned a non-owned or inconsistent draft record')
 return row
}
function createRoleBoundNewAuthoringRepository({gate,connectorDefinitions}={}){
 if(process.env.NODE_ENV==='production')reject('isolated Phase3T adapter disabled in production')
 if(gate?.label!==LABEL||gate.confirmedNotProduction!==true||
    gate.independentSchemaAndRlsReviewPassed!==true||gate.backupRestorePassed!==true||
    gate.roleLoginIsolationPassed!==true||gate.approvedSnapshotAtomicGateReviewed!==true)
  reject('independent isolated DB, schema, RLS, backup/restore and approved-source gates required')
 if(!Array.isArray(connectorDefinitions)||!connectorDefinitions.length||
    connectorDefinitions.length>128)
  reject('explicit bounded private per-school connector registry required')
 const bindings=new Map(),seenConnectors=new Set()
 for(const row of connectorDefinitions){
  if(!int(row?.schoolId)||!text(row?.tenantId)||row.tenantId.length>128||
     row.expectedLogin!==EXPECTED_LOGIN(row.schoolId)||
     typeof row.connect!=='function'||bindings.has(row.schoolId)||
     seenConnectors.has(row.connect))
   reject('ambiguous/reused school credential, tenant or login binding')
  bindings.set(row.schoolId,Object.freeze({tenantId:row.tenantId,
   expectedLogin:row.expectedLogin,connect:row.connect}))
  seenConnectors.add(row.connect)
 }
 async function transaction(input,write,work){
  if(process.env.NODE_ENV==='production')reject('staging repository disabled in production')
  const scope=scopeOf(input),binding=bindings.get(scope.schoolId)
  if(!binding||binding.tenantId!==scope.tenantId)
   reject('school/tenant has no independently enrolled private DB login')
  let client,begun=false,committed=false,quarantine=null
  try{
   client=await binding.connect()
   if(!client||typeof client.query!=='function'||typeof client.release!=='function')
    reject('trusted connector returned invalid database client')
   const identity=await client.query(ROLE_ID_SQL)
   if(!one(identity)||identity.rows[0].authenticated_login!==binding.expectedLogin||
      Number(identity.rows[0].verified_school_id)!==scope.schoolId||
      identity.rows[0].verified_tenant_id!==scope.tenantId){
    quarantine=new Error('authenticated DB session login is not bound to the intended school')
    throw quarantine
   }
   await client.query(write?'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE':
    'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
   begun=true
   const value=await work(client,scope)
   try{await client.query('COMMIT')}
   catch(error){quarantine=error;throw error}
   committed=true
   return value
  }catch(error){
   if(begun&&!committed&&client&&!quarantine){
    try{await client.query('ROLLBACK')}
    catch(rollbackError){quarantine=rollbackError}
   }
   throw error
  }finally{if(client)client.release(quarantine||undefined)}
 }
 async function pinnedSnapshot(client,scope,bindingSha256,revision){
  const verified=await client.query(SQL.snapshotLock,[scope.schoolId,scope.tenantId,
   bindingSha256,revision])
  if(!one(verified)||Number(verified.rows[0].revision)!==revision)
   reject('published snapshot revision absent/revoked: abort transaction')
 }
 async function createExclusive(input){
  if(!int(input?.createdBy)||input.revision!==1||input.status!=='DRAFT'||
     input.sourceProtected!==false)reject('only independent draft initial insertion allowed')
  const source=sourceOf(input)
  return transaction(input,true,async(client,scope)=>{
   await pinnedSnapshot(client,scope,source.bindingSha256,input.approvedSnapshotRevision)
   const params=[scope.schoolId,scope.tenantId,input.draftId,input.createdBy,
    input.nativeJsonText,input.nativeSha256,input.approvedSnapshotRevision,
    source.bindingSha256]
   const insert=await client.query(SQL.insertDraft,params)
   if(!one(insert))reject('draft identity collision or database insertion refused')
   const row=checkedRow(insert.rows[0],scope,input.draftId)
   if(row.revision!==1||row.createdBy!==input.createdBy||
      !equalHash(row.nativeSha256,input.nativeSha256)||
      row.approvedSnapshotRevision!==input.approvedSnapshotRevision||
      !equalHash(row.approvedBindingSha256,source.bindingSha256))
    reject('initial draft return fields differ from exact approved source')
   const revision=await client.query(SQL.appendInitial,[scope.schoolId,scope.tenantId,
    input.draftId,input.nativeJsonText,input.nativeSha256,input.createdBy])
   if(!one(revision)||revision.rows[0].revision!==1||
      !equalHash(revision.rows[0].native_sha256,input.nativeSha256))
    reject('initial immutable revision was not appended in the same transaction')
   return row
  })
 }
 async function loadScoped(input){
  if(!text(input?.draftId)||input.draftId.length>128)
   reject('valid school-scoped draft ID required')
  return transaction(input,false,async(client,scope)=>{
   const result=await client.query(SQL.readDraft,[scope.schoolId,scope.tenantId,input.draftId])
   if(result?.rowCount===0)return null
   if(!one(result))reject('ambiguous or malformed scoped draft lookup')
   return checkedRow(result.rows[0],scope,input.draftId)
  })
 }
 async function casUpdate(input){
  if(!int(input?.actorId)||!int(input?.expectedRevision)||
     input.nextRevision!==input.expectedRevision+1||
     !hash(input.expectedNativeSha256)||
     !equalHash(sha(input.nextNativeJsonText||''),input.nextNativeSha256))
   reject('valid actor, expected CAS revision and exact next SHA required')
  const source=sourceOf({...input,nativeJsonText:input.nextNativeJsonText,
   nativeSha256:input.nextNativeSha256})
  return transaction(input,true,async(client,scope)=>{
   await pinnedSnapshot(client,scope,source.bindingSha256,input.approvedSnapshotRevision)
   const locked=await client.query(SQL.lockDraft,[scope.schoolId,scope.tenantId,input.draftId])
   if(!one(locked))reject('draft not found within independently bound school')
   const old=checkedRow(locked.rows[0],scope,input.draftId)
   if(old.revision!==input.expectedRevision||
      !equalHash(old.nativeSha256,input.expectedNativeSha256)||
      old.approvedSnapshotRevision!==input.approvedSnapshotRevision||
      !equalHash(old.approvedBindingSha256,source.bindingSha256))
    reject('stale CAS or approved snapshot identity drift')
   const oldSource=sourceOf({draftId:input.draftId,nativeJsonText:old.nativeJsonText,
    nativeSha256:old.nativeSha256,approvedSnapshotRevision:old.approvedSnapshotRevision})
   const structure=doc=>doc.sections?.map(s=>[s.id,s.order,s.kind,s.medium,
    s.items?.map(i=>[i.id,i.sourceQuestionId,i.chapterId,i.topicId,i.kind])])
   if(!equalHash(oldSource.bindingSha256,source.bindingSha256)||
      !same(oldSource.doc.sourceIdentity,source.doc.sourceIdentity)||
      !same(oldSource.doc.sourceLedger,source.doc.sourceLedger)||
      !same(structure(oldSource.doc),structure(source.doc)))
    reject('new-authoring source ledger or selected question structure changed')
   if(input.nextNativeJsonText===old.nativeJsonText)reject('no-op draft revision refused')
   const updated=await client.query(SQL.casUpdate,[input.nextNativeJsonText,
    input.nextNativeSha256,input.nextRevision,input.actorId,
    scope.schoolId,scope.tenantId,input.draftId,input.expectedRevision,
    input.expectedNativeSha256,input.approvedSnapshotRevision,source.bindingSha256])
   if(!one(updated))reject('atomic revision compare-and-swap changed zero or multiple drafts')
   const row=checkedRow(updated.rows[0],scope,input.draftId)
   if(row.revision!==input.nextRevision||
      !equalHash(row.nativeSha256,input.nextNativeSha256)||
      row.nativeJsonText!==input.nextNativeJsonText||
      !equalHash(row.approvedBindingSha256,source.bindingSha256))
    reject('CAS returned unexpected draft contents or source identity')
   const audit=await client.query(SQL.appendRevision,[scope.schoolId,scope.tenantId,
    input.draftId,input.nextRevision,input.nextNativeJsonText,input.nextNativeSha256,
    input.expectedNativeSha256,input.actorId])
   if(!one(audit)||audit.rows[0].revision!==input.nextRevision||
      !equalHash(audit.rows[0].native_sha256,input.nextNativeSha256))
    reject('append-only CAS revision audit was not persisted atomically')
   return row
  })
 }
 return Object.freeze({createExclusive,loadScoped,casUpdate})
}
module.exports={createRoleBoundNewAuthoringRepository,authoringBindingSha256,
 EXPECTED_LOGIN,ROLE_ID_SQL,LABEL,SQL,byteLimit}

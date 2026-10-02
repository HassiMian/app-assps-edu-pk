// Phase 3E, DORMANT STAGING-ONLY adapter. NOT imported by app.js/Express or migrations.
// No database.js import: a verified isolated staging connector must be injected by trusted server code.
const {preparePaperRevisionCAS}=require('./paperRevisionPolicy.js')
const validSchoolId=id=>Number.isSafeInteger(Number(id))&&Number(id)>0?Number(id):null
const validHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/u.test(x)
const SQL=Object.freeze({
 lockPaper: 'SELECT school_id,id,created_by,status,source_protected,revision,native_json_text,native_sha256 FROM paper_documents WHERE school_id=$1 AND id=$2 FOR UPDATE',
 lockRevision: 'SELECT revision,native_sha256 FROM paper_revisions WHERE school_id=$1 AND document_id=$2 AND revision=$3',
 updateDraft: "UPDATE paper_documents SET native_json_text=$1,native_sha256=$2,revision=$3,updated_by=$4,updated_at=now() WHERE school_id=$5 AND id=$6 AND revision=$7 AND native_sha256=$8 AND status='DRAFT' AND source_protected=FALSE RETURNING school_id,id,revision,native_sha256",
 appendImmutableRevision: "INSERT INTO paper_revisions (school_id,document_id,revision,native_json_text,native_sha256,previous_native_sha256,actor_id,change_kind) VALUES ($1,$2,$3,$4,$5,$6,$7,'DRAFT_CAS_REVISION') RETURNING school_id,document_id,revision,native_sha256",
})
/**
 * A future trusted server STAGING bootstrap, never request headers/UI, must supply these gates.
 * This function alone is not an independent proof of backup/schema safety or authority.
 */
function assertVerifiedStagingGate(gate){
 if(!gate||typeof gate!=='object'||gate.targetEnvironment!=='ASSPS_ISOLATED_STAGING'||
    gate.confirmedNotProduction!==true||gate.readonlySchemaInventoryReviewed!==true||
    gate.encryptedBackupVerified!==true||gate.backupRestoreTestPassed!==true||
    gate.serverAuthenticatedSchoolScopeVerified!==true||
    gate.twoSchoolIsolationTestPassed!==true||gate.originalApprovedVisualEvidenceIndependentlyReviewed!==true)
  throw new Error('Staging blocked: verify non-production target, schema, backup+restore, authenticated school scope, cross-school isolation and actual original-paper visual approval.')
 return true
}
function verifiedSchoolScope(actor,{verifiedPlatformSchoolId,platformScopeVerified}={}){
 if(!actor||!validSchoolId(actor.id))throw new Error('Verified server-auth actor required.')
 if(actor.role==='super_admin'){
  if(platformScopeVerified!==true||!validSchoolId(verifiedPlatformSchoolId))
   throw new Error('Super-admin target school must be independently server-verified.')
  return validSchoolId(verifiedPlatformSchoolId)
 }
 const schoolId=validSchoolId(actor.school_id??actor.schoolId)
 if(!schoolId)throw new Error('Authenticated actor lacks a server-verified school ID.')
 return schoolId
}
function mapLockedRow(row){
 if(!row||typeof row!=='object')throw new Error('DB-verified owning paper row missing.')
 return {id:row.id,schoolId:row.school_id,createdBy:row.created_by,status:row.status,
  sourceProtected:row.source_protected,revision:row.revision,
  nativeJsonText:row.native_json_text,nativeSha256:row.native_sha256}
}
const exactlyOne=result=>result&&result.rowCount===1&&Array.isArray(result.rows)&&result.rows.length===1
/**
 * Makes only ONE DRAFT revision in a single SERIALIZABLE transaction.
 * This service has NO route and NO database credentials; test with injected connector only.
 * Existing reference/approved papers never enter the update predicate.
 */
async function appendStagingDraftRevision({
 connect,gate,actor,paperId,expectedRevision,expectedNativeSha256,
 proposedNativeJsonText,verifiedPlatformSchoolId=null,platformScopeVerified=false,
}={}){
 assertVerifiedStagingGate(gate)
 if(typeof connect!=='function')throw new Error('A verified STAGING-only pool.connect injection is required.')
 const schoolId=verifiedSchoolScope(actor,{verifiedPlatformSchoolId,platformScopeVerified})
 if(typeof paperId!=='string'||!paperId.trim()||paperId.length>160||
    !Number.isSafeInteger(expectedRevision)||expectedRevision<1||
    !validHash(expectedNativeSha256)||typeof proposedNativeJsonText!=='string')
  throw new Error('Malformed paper identity, expected revision, source hash or native JSON.')
 // Check UTF-8 BYTES: multibyte Urdu payloads can exceed the safe limit despite shorter JS text.
 if(Buffer.byteLength(proposedNativeJsonText,'utf8')>5*1024*1024)
  throw new Error('Native JSON exceeds the safe 5 MiB UTF-8 staging payload limit.')
 let client,begun=false,committed=false
 try{
  client=await connect()
  if(!client||typeof client.query!=='function'||typeof client.release!=='function')
   throw new Error('Staging database connection contract invalid.')
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE')
  begun=true
  // Always scope SELECT by independently verified school, never an ID from the UI/header.
  const lookup=await client.query(SQL.lockPaper,[schoolId,paperId])
  if(!exactlyOne(lookup))throw new Error('Paper not found within independently verified school.')
  const record=mapLockedRow(lookup.rows[0])
  const plan=preparePaperRevisionCAS({actor,record,expectedRevision,expectedNativeSha256,
   proposedNativeJsonText,verifiedPlatformSchoolId,platformScopeVerified})
  // Require pre-existing immutable seed snapshot so revisions cannot start from an untracked state.
  const prior=await client.query(SQL.lockRevision,[schoolId,paperId,expectedRevision])
  if(!exactlyOne(prior)||prior.rows[0].native_sha256!==expectedNativeSha256||
     prior.rows[0].revision!==expectedRevision)
   throw new Error('Last immutable revision snapshot missing or diverged; staging revision blocked.')
  const update=await client.query(SQL.updateDraft,[
   plan.nextNativeJsonText,plan.nextNativeSha256,plan.nextRevision,actor.id,
   schoolId,paperId,plan.expectedRevision,plan.expectedNativeSha256,
  ])
  if(!exactlyOne(update)||Number(update.rows[0].school_id)!==schoolId||
     String(update.rows[0].id)!==paperId||update.rows[0].revision!==plan.nextRevision||
     update.rows[0].native_sha256!==plan.nextNativeSha256)
   throw new Error('Stale revision or concurrent change; the entire transaction must roll back.')
  const audit=await client.query(SQL.appendImmutableRevision,[
   schoolId,paperId,plan.nextRevision,plan.nextNativeJsonText,
   plan.nextNativeSha256,plan.expectedNativeSha256,actor.id,
  ])
  if(!exactlyOne(audit)||Number(audit.rows[0].school_id)!==schoolId||
    String(audit.rows[0].document_id)!==paperId||audit.rows[0].revision!==plan.nextRevision||
    audit.rows[0].native_sha256!==plan.nextNativeSha256)
   throw new Error('Append-only revision audit failed; the entire paper update must roll back.')
  await client.query('COMMIT')
  committed=true
  return {status:'STAGING_DRAFT_REVISION_COMMITTED',schoolId,paperId,
   revision:plan.nextRevision,nativeSha256:plan.nextNativeSha256,
   originalSourceChanged:false,approvalGranted:false,
   originalNativeRendererRequired:true}
 }catch(error){
  if(begun&&!committed&&client){
   try{await client.query('ROLLBACK')}catch(rollbackError){
    const combined=new Error('Staging transaction failed AND rollback failed; connection must be quarantined.')
    combined.cause=error;combined.rollbackCause=rollbackError
    throw combined
   }
  }
  throw error
 }finally{
  if(client)client.release()
 }
}
module.exports={assertVerifiedStagingGate,appendStagingDraftRevision,SQL}

// V6-D transitional, single-truth revision boundary: paper_vault is still the
// live current record; this table is an immutable history, NOT Connect storage.
// Never creates fake official V13/Phase3R source identity or grants print.
const fs=require('node:fs')
const path=require('node:path')
const {createHash}=require('node:crypto')
const {pool}=require('../../config/database')
const {ensureTeacherAssignmentSchema}=require('../teacherAssignmentService')
const CONTRACT=path.join(__dirname,'saasReviewedContract/losslessLegacyBridgeV6D.mjs')
const VERIFIED_SHA='a6e25426a8f803050ec8bb112dbed76bc8d17c0173fb14770113ca06e100094b'
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const failure=(status,message,code)=>Object.assign(new Error(message),{status,code})
let contractPromise
async function bridge(){
  const actual=createHash('sha256').update(fs.readFileSync(CONTRACT)).digest('hex')
  if(actual!==VERIFIED_SHA)throw failure(500,'Legacy bridge source integrity failed.','CONTRACT_DRIFT')
  if(!contractPromise)contractPromise=import(`file://${CONTRACT}`)
  return contractPromise
}
async function ensureJournal(){
  // Schema is provisioned by a controlled migration, never by an HTTP request.
  // A zero-row read verifies both existence and the current tenant's DB privileges.
  try {
    await pool.query('SELECT 1 FROM paper_vault_revision_history LIMIT 0')
  } catch (err) {
    if (err.code === '42P01' || err.code === '42501') {
      throw failure(503,'Paper revision journal is unavailable. Apply the versioned migration before using this workflow.','REVISION_JOURNAL_NOT_READY')
    }
    throw err
  }
}
function roleAllowed(role){return ['super_admin','admin','principal','teacher'].includes(String(role||'').toLowerCase())}
function ownerClause(role,userId,params){if(role==='teacher'){params.push(userId);return ` AND owner_user_id=$${params.length}`}return ''}
async function authorizedCurrent(client,{schoolId,userId,role,paperId,lock=false}){
  if(!roleAllowed(role)||!/^\d+$/.test(String(paperId??'')))throw failure(400,'Invalid paper request.','INVALID_REQUEST')
  const params=[paperId,schoolId]
  const clause=ownerClause(role,userId,params)
  const result=await client.query(`SELECT * FROM paper_vault WHERE id=$1 AND school_id=$2 AND deleted_at IS NULL${clause} ${lock?'FOR UPDATE':''} LIMIT 1`,params)
  if(!result.rowCount)throw failure(404,'Paper not found in your accessible library.','NOT_FOUND')
  return result.rows[0]
}
async function verifyAssignment(client,{role,schoolId,userId,paper}){
  if(role!=='teacher')return
  const cfg=paper?.config||paper?.metadata||{}
  const cls=String(cfg.className||cfg.classLevel||cfg.class||'').trim()
  const section=String(cfg.section||'').trim()
  const subject=String(cfg.subjectName||cfg.subject||'').trim()
  if(!cls||!subject)throw failure(403,'A verified class/subject assignment is required.','SCOPE_REQUIRED')
  const res=await client.query(`SELECT 1 FROM teacher_class_assignments WHERE school_id=$1 AND teacher_user_id=$2 AND is_active=true AND LOWER(class_name)=LOWER($3) AND ($4='' OR COALESCE(section,'')='' OR LOWER(section)=LOWER($4)) AND ($5='' OR COALESCE(subject,'')='' OR LOWER(subject)=LOWER($5)) LIMIT 1`,[schoolId,userId,cls,section,subject])
  if(!res.rowCount)throw failure(403,'Teacher is not assigned to this paper class and subject.','OUT_OF_SCOPE')
}
async function saveGuardedRevision({schoolId,userId,role,paperId,expectedRevision,expectedSnapshotHash,workingDocument}){
  if(!Number.isInteger(expectedRevision)||expectedRevision<1)throw failure(400,'expectedRevision must be an integer >= 1.','REVISION_REQUIRED')
  if(!/^[a-f0-9]{64}$/.test(String(expectedSnapshotHash||'')))throw failure(400,'expectedSnapshotHash is required.','HASH_REQUIRED')
  if(!workingDocument||typeof workingDocument!=='object'||Array.isArray(workingDocument))throw failure(400,'A working document is required.','DOCUMENT_REQUIRED')
  const adapter=await bridge()
  await ensureJournal()
  await ensureTeacherAssignmentSchema()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const row=await authorizedCurrent(client,{schoolId,userId,role,paperId,lock:true})
    const priorHash=digest(row.payload)
    if(Number(row.revision)!==expectedRevision||priorHash!==expectedSnapshotHash){
      throw failure(409,'This paper changed in another session. Reload before saving.', 'STALE_REVISION')
    }
    // A legacy wrapper containing a reviewed canonical family is not itself an
    // editable legacy paper; do not allow the adapter to alter its surrounding
    // storage while claiming the nested approved document is untouched.
    if(row.payload?.document?.format)
      throw failure(422,'Nested canonical/specialist document requires its approved writer.','UNSUPPORTED_DOCUMENT')
    const compatible=adapter.classifyLegacyEditablePaper(row.payload)
    if(!compatible.compatible)throw failure(422,'This paper requires the approved canonical editor.', 'UNSUPPORTED_DOCUMENT')
    await verifyAssignment(client,{role,schoolId,userId,paper:row.payload})
    let next
    try{next=adapter.applyLegacyWorkingDocument(workingDocument,row.payload)}catch(err){throw failure(422,'Paper update is not representable by the validated legacy bridge.', 'UNSAFE_EDIT')}
    if(digest(next)===priorHash){await client.query('ROLLBACK');return {unchanged:true,revision:Number(row.revision),snapshotHash:priorHash}}
    const previous=await client.query(`INSERT INTO paper_vault_revision_history(school_id,paper_id,revision,actor_user_id,event_kind,payload_hash,payload) VALUES($1,$2,$3,NULL,'baseline_capture',$4,$5::jsonb) ON CONFLICT(school_id,paper_id,revision) DO NOTHING RETURNING payload_hash`,[schoolId,paperId,row.revision,priorHash,JSON.stringify(row.payload)])
    if(!previous.rowCount){const seen=await client.query('SELECT payload_hash FROM paper_vault_revision_history WHERE school_id=$1 AND paper_id=$2 AND revision=$3',[schoolId,paperId,row.revision]);if(seen.rows[0]?.payload_hash?.trim()!==priorHash)throw failure(409,'Revision journal and current paper diverged. Manual review required.','JOURNAL_DIVERGENCE')}
    const updated=await client.query(`UPDATE paper_vault SET payload=$1::jsonb, revision=revision+1, updated_at=NOW() WHERE id=$2 AND school_id=$3 AND revision=$4 RETURNING id,revision,payload,updated_at`,[JSON.stringify(next),paperId,schoolId,row.revision])
    if(!updated.rowCount)throw failure(409,'Paper changed before save.','STALE_REVISION')
    const newRow=updated.rows[0],newHash=digest(newRow.payload)
    await client.query(`INSERT INTO paper_vault_revision_history(school_id,paper_id,revision,actor_user_id,event_kind,payload_hash,payload) VALUES($1,$2,$3,$4,'v6d_guarded_edit',$5,$6::jsonb)`,[schoolId,paperId,newRow.revision,userId,newHash,JSON.stringify(newRow.payload)])
    await client.query('COMMIT')
    return {unchanged:false,revision:Number(newRow.revision),snapshotHash:newHash,updatedAt:newRow.updated_at}
  }catch(err){await client.query('ROLLBACK').catch(()=>{});throw err}finally{client.release()}
}

async function renameGuardedPaper({schoolId,userId,role,paperId,expectedRevision,expectedSnapshotHash,name}){
  if(!Number.isInteger(expectedRevision)||expectedRevision<1)throw failure(400,'expectedRevision must be an integer >= 1.','REVISION_REQUIRED')
  if(!/^[a-f0-9]{64}$/.test(String(expectedSnapshotHash||'')))throw failure(400,'expectedSnapshotHash is required.','HASH_REQUIRED')
  const nextName=String(name||'').trim().slice(0,220)
  if(!nextName)throw failure(400,'A paper name is required.','NAME_REQUIRED')
  await ensureJournal()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const row=await authorizedCurrent(client,{schoolId,userId,role,paperId,lock:true})
    const priorHash=digest(row.payload)
    if(Number(row.revision)!==expectedRevision||priorHash!==expectedSnapshotHash)throw failure(409,'This paper changed in another session. Reload before renaming.','STALE_REVISION')
    const previous=await client.query(`INSERT INTO paper_vault_revision_history(school_id,paper_id,revision,actor_user_id,event_kind,payload_hash,payload) VALUES($1,$2,$3,NULL,'baseline_capture',$4,$5::jsonb) ON CONFLICT(school_id,paper_id,revision) DO NOTHING RETURNING payload_hash`,[schoolId,paperId,row.revision,priorHash,JSON.stringify(row.payload)])
    if(!previous.rowCount){const seen=await client.query('SELECT payload_hash FROM paper_vault_revision_history WHERE school_id=$1 AND paper_id=$2 AND revision=$3',[schoolId,paperId,row.revision]);if(seen.rows[0]?.payload_hash?.trim()!==priorHash)throw failure(409,'Revision journal and current paper diverged. Manual review required.','JOURNAL_DIVERGENCE')}
    const updated=await client.query(`UPDATE paper_vault SET name=$1,revision=revision+1,updated_at=NOW() WHERE id=$2 AND school_id=$3 AND revision=$4 AND deleted_at IS NULL RETURNING revision,payload,updated_at,name`,[nextName,paperId,schoolId,row.revision])
    if(!updated.rowCount)throw failure(409,'Paper changed before rename.','STALE_REVISION')
    const newRow=updated.rows[0],newHash=digest(newRow.payload)
    await client.query(`INSERT INTO paper_vault_revision_history(school_id,paper_id,revision,actor_user_id,event_kind,payload_hash,payload) VALUES($1,$2,$3,$4,'v6d_guarded_rename',$5,$6::jsonb)`,[schoolId,paperId,newRow.revision,userId,newHash,JSON.stringify(newRow.payload)])
    await client.query('COMMIT')
    return {revision:Number(newRow.revision),snapshotHash:newHash,name:newRow.name,updatedAt:newRow.updated_at}
  }catch(err){await client.query('ROLLBACK').catch(()=>{});throw err}finally{client.release()}
}
async function deleteGuardedPaper({schoolId,userId,role,paperId,expectedRevision,expectedSnapshotHash}){
  if(!Number.isInteger(expectedRevision)||expectedRevision<1)throw failure(400,'expectedRevision must be an integer >= 1.','REVISION_REQUIRED')
  if(!/^[a-f0-9]{64}$/.test(String(expectedSnapshotHash||'')))throw failure(400,'expectedSnapshotHash is required.','HASH_REQUIRED')
  await ensureJournal()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const row=await authorizedCurrent(client,{schoolId,userId,role,paperId,lock:true})
    const priorHash=digest(row.payload)
    if(Number(row.revision)!==expectedRevision||priorHash!==expectedSnapshotHash)throw failure(409,'This paper changed in another session. Reload before deleting.','STALE_REVISION')
    const previous=await client.query(`INSERT INTO paper_vault_revision_history(school_id,paper_id,revision,actor_user_id,event_kind,payload_hash,payload) VALUES($1,$2,$3,NULL,'baseline_capture',$4,$5::jsonb) ON CONFLICT(school_id,paper_id,revision) DO NOTHING RETURNING payload_hash`,[schoolId,paperId,row.revision,priorHash,JSON.stringify(row.payload)])
    if(!previous.rowCount){const seen=await client.query('SELECT payload_hash FROM paper_vault_revision_history WHERE school_id=$1 AND paper_id=$2 AND revision=$3',[schoolId,paperId,row.revision]);if(seen.rows[0]?.payload_hash?.trim()!==priorHash)throw failure(409,'Revision journal and current paper diverged. Manual review required.','JOURNAL_DIVERGENCE')}
    const updated=await client.query(`UPDATE paper_vault SET deleted_at=NOW(),revision=revision+1,updated_at=NOW() WHERE id=$1 AND school_id=$2 AND revision=$3 AND deleted_at IS NULL RETURNING revision,payload,updated_at`,[paperId,schoolId,row.revision])
    if(!updated.rowCount)throw failure(409,'Paper changed before delete.','STALE_REVISION')
    const newRow=updated.rows[0],newHash=digest(newRow.payload)
    await client.query(`INSERT INTO paper_vault_revision_history(school_id,paper_id,revision,actor_user_id,event_kind,payload_hash,payload) VALUES($1,$2,$3,$4,'v6d_guarded_delete',$5,$6::jsonb)`,[schoolId,paperId,newRow.revision,userId,newHash,JSON.stringify(newRow.payload)])
    await client.query('COMMIT')
    return {deleted:true,revision:Number(newRow.revision),snapshotHash:newHash,updatedAt:newRow.updated_at}
  }catch(err){await client.query('ROLLBACK').catch(()=>{});throw err}finally{client.release()}
}
async function listGuardedRevisions({schoolId,userId,role,paperId}){
  await ensureJournal()
  const client=await pool.connect()
  try{
    const row=await authorizedCurrent(client,{schoolId,userId,role,paperId})
    const list=await client.query(`SELECT revision,event_kind,actor_user_id,payload_hash,created_at FROM paper_vault_revision_history WHERE school_id=$1 AND paper_id=$2 ORDER BY revision DESC LIMIT 200`,[schoolId,paperId])
    return {currentRevision:Number(row.revision),currentSnapshotHash:digest(row.payload),history:list.rows.map(({revision,event_kind,actor_user_id,payload_hash,created_at})=>({revision:Number(revision),event:event_kind,actorUserId:actor_user_id?String(actor_user_id):null,snapshotHash:payload_hash.trim(),createdAt:created_at}))}
  }finally{client.release()}
}
async function readGuardedRevision({schoolId,userId,role,paperId,revision}){
  if(!/^\d+$/.test(String(revision??'')))throw failure(400,'Invalid revision.','INVALID_REVISION')
  await ensureJournal()
  const client=await pool.connect()
  try{
    await authorizedCurrent(client,{schoolId,userId,role,paperId})
    const found=await client.query(`SELECT revision,event_kind,actor_user_id,payload_hash,payload,created_at FROM paper_vault_revision_history WHERE school_id=$1 AND paper_id=$2 AND revision=$3 LIMIT 1`,[schoolId,paperId,revision])
    if(!found.rowCount)throw failure(404,'Revision not found in your accessible paper.','NOT_FOUND')
    const row=found.rows[0]
    if(digest(row.payload)!==row.payload_hash.trim())throw failure(409,'Historical revision hash check failed.','HISTORY_CORRUPTED')
    return {revision:Number(row.revision),event:row.event_kind,snapshotHash:row.payload_hash.trim(),document:row.payload,createdAt:row.created_at}
  }finally{client.release()}
}
module.exports={saveGuardedRevision,renameGuardedPaper,deleteGuardedPaper,listGuardedRevisions,readGuardedRevision,ensureJournal,digest,VERIFIED_SHA}

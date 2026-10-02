// Phase 3B DESIGN GATE ONLY. Not mounted on Express; no database/schema/write execution.
// The caller must provide actor FROM verified auth middleware and record FROM school-scoped DB read.
// Exact native JSON TEXT is hashed, because PostgreSQL JSONB can change key order.
const {createHash}=require('node:crypto')
const sha256=value=>createHash('sha256').update(value,'utf8').digest('hex')
const safeInt=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null
const roles=new Set(['principal','admin','teacher','super_admin'])
function assertSchoolPaperAuthorization({actor,record,operation='read',
 verifiedPlatformSchoolId=null,platformScopeVerified=false}={}){
 if(!actor||typeof actor!=='object'||!roles.has(actor.role))
  throw new Error('Paper access requires an authenticated permitted user.')
 if(!record||!safeInt(record.schoolId))throw new Error('A DB-verified owning school is required.')
 const target=safeInt(record.schoolId)
 if(actor.role==='super_admin'){
  if(platformScopeVerified!==true||safeInt(verifiedPlatformSchoolId)!==target)
   throw new Error('Platform access needs a separately verified owning school; request headers are not authority.')
 }else if(!safeInt(actor.school_id??actor.schoolId)||safeInt(actor.school_id??actor.schoolId)!==target)
  throw new Error('Cross-school paper access forbidden.')
 if(operation==='prepare_revision'){
  const status=String(record.status||'').toUpperCase()
  if(status!=='DRAFT'||record.sourceProtected===true)
   throw new Error('Only independent DRAFT working copies may be revised; approved/source papers are immutable.')
  if(actor.role==='teacher'&&String(record.createdBy)!==String(actor.id))
   throw new Error('Teachers may revise only their own school-scoped drafts.')
 }else if(operation!=='read'){
  throw new Error('Unknown or inactive paper operation; approval is not enabled by this policy.')
 }
 return {permitted:true,schoolId:target,role:actor.role,operation}
}
function preparePaperRevisionCAS({
 actor,record,expectedRevision,expectedNativeSha256,proposedNativeJsonText,
 verifiedPlatformSchoolId=null,platformScopeVerified=false,
}={}){
 const auth=assertSchoolPaperAuthorization({actor,record,operation:'prepare_revision',
  verifiedPlatformSchoolId,platformScopeVerified})
 if(!Number.isSafeInteger(record.revision)||record.revision<1)
  throw new Error('Stored row has invalid revision; refuse to migrate or overwrite implicitly.')
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==record.revision)
  throw new Error('Optimistic revision conflict; refresh the working copy.')
 if(typeof record.nativeJsonText!=='string'||!record.nativeJsonText.trim()||
  !/^[a-f0-9]{64}$/iu.test(record.nativeSha256||'')||
  sha256(record.nativeJsonText)!==record.nativeSha256)
  throw new Error('Stored native paper payload/hash mismatch; do not repair silently.')
 if(expectedNativeSha256!==record.nativeSha256)
  throw new Error('Source SHA conflict; reload before proposing a revision.')
 if(typeof proposedNativeJsonText!=='string'||proposedNativeJsonText.length>5*1024*1024)
  throw new Error('A bounded native JSON text payload is required.')
 let oldPaper,proposed
 try{oldPaper=JSON.parse(record.nativeJsonText);proposed=JSON.parse(proposedNativeJsonText)}
 catch{throw new Error('Native paper payload contains invalid JSON.')}
 if(!oldPaper||Array.isArray(oldPaper)||typeof oldPaper!=='object'||
   !proposed||Array.isArray(proposed)||typeof proposed!=='object')
  throw new Error('Native papers must remain JSON objects.')
 if(String(oldPaper.id)!==String(record.id)||String(proposed.id)!==String(record.id))
  throw new Error('A revision cannot change the immutable paper ID.')
 if(proposedNativeJsonText===record.nativeJsonText)
  throw new Error('No changes to create as a revision.')
 const protectedKeys=['id','school_id','tenant_id','sourcePaperId','sourceVersion','createdAt',
  'sourceContentSha256','sourceProtected']
 for(const name of protectedKeys){
  if(Object.prototype.hasOwnProperty.call(oldPaper,name)||
    Object.prototype.hasOwnProperty.call(proposed,name)){
   if(JSON.stringify(oldPaper[name])!==JSON.stringify(proposed[name]))
    throw new Error('Protected native field '+name+' changed; create a separate copy instead.')
  }
 }
 if(['APPROVED','RELEASED'].includes(String(proposed.printReadiness||'').toUpperCase())||
    ['APPROVED','RELEASED'].includes(String(proposed.status||'').toUpperCase()))
  throw new Error('Revision cannot self-approve or silently release an assessment.')
 const nextHash=sha256(proposedNativeJsonText)
 return {state:'PREPARED_ONLY_NOT_EXECUTED',schoolId:auth.schoolId,
  paperId:String(record.id),createdBy:record.createdBy,actorId:actor.id,
  expectedRevision,expectedNativeSha256,nextRevision:expectedRevision+1,
  nextNativeSha256:nextHash,nextNativeJsonText:proposedNativeJsonText,
  requiredTransaction:'UPDATE paper_documents constrained by (school_id,id,revision,native_sha256,status=DRAFT) with one returned row AND INSERT immutable paper_revisions in same DB transaction',
  serverAuthorizationRequired:true,approvalGranted:false}
}
module.exports={assertSchoolPaperAuthorization,preparePaperRevisionCAS}

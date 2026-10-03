// Phase3AD: DORMANT durable alternative to Phase3Y's process-local intent Map.
// Uses server-trusted Phase3X/3AB projection and Phase3AC atomic SQL intent ports.
// Never authorizes real Curriculum publication, print, production, or route mounting.
const {createHash,timingSafeEqual}=require('node:crypto')
const {isDeepStrictEqual}=require('node:util')
const {actorScope}=require('./newAuthoringDraftGatewayPhase3S')
const {checkedProjection,sourcePin,assertSourceBinding}=
 require('./teacherAuthoringSessionPhase3Y')
const LABEL='PHASE3AD_PERSISTENT_AUTHORED_INTENT_STAGING_ONLY'
const yes=x=>typeof x==='string'&&x.trim().length>0
const pos=x=>Number.isSafeInteger(x)&&x>0
const hash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/i.test(x)
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const same=(a,b)=>isDeepStrictEqual(a,b)
const clone=x=>JSON.parse(JSON.stringify(x))
const refuse=x=>{throw Error('Phase3AD refused: '+x)}
const equalHash=(a,b)=>hash(a)&&hash(b)&&
 timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'))
const actorEqual=(a,b)=>same(a,b)
function assignmentFor(a,actor,p,now){
 const subject=p.subjects?.[0]
 if(a?.source!=='SCHOOL_APPROVED_STAFF_ASSIGNMENT'||a.status!=='ACTIVE'||
    !yes(a.assignmentId)||a.schoolId!==actor.schoolId||
    a.tenantId!==actor.tenantId||a.actorId!==actor.actorId||
    a.role!==actor.role||a.grade!==p.identity.grade||
    a.subjectId!==p.identity.subjectId||!subject||
    a.subjectRef!==subject.id||a.classId!==subject.classId||
    a.syllabusId!==subject.syllabusId||
    !pos(a.validFromMs)||!pos(a.validUntilMs)||
    now<a.validFromMs||now>=a.validUntilMs||
    !pos(a.review?.approvedByStaffId)||
    a.review.approvedByStaffId===actor.actorId||
    !yes(a.review?.evidenceId)||!pos(a.review?.approvedAtMs)||
    a.review.approvedAtMs>now)
  refuse('current independently approved staff/class/subject assignment required')
 return a.assignmentId
}
function createPhase3ADPersistentAuthoring({gate,authenticate,teacherProjection,
 readAssignment,intents,draftGateway,clock=Date.now}={}){
 if(process.env.NODE_ENV==='production'||gate?.label!==LABEL||
    gate.confirmedNotProduction!==true||
    gate.independentPhase3XAndPhase3ABReviewed!==true||
    gate.disposablePhase3ACAtomicIntentVerified!==true||
    gate.phase3SReauthenticatesAndPinsCurrentSource!==true||
    typeof authenticate!=='function'||typeof teacherProjection!=='function'||
    typeof readAssignment!=='function'||typeof clock!=='function'||
    !['reserve','claim','finish','cancel'].every(k=>typeof intents?.[k]==='function')||
    !['create','read','revise'].every(k=>typeof draftGateway?.[k]==='function'))
  refuse('independently reviewed staging-only persistence ports and trust gates required')
 const now=()=>{const n=clock();if(!pos(n))refuse('trusted clock invalid');return n}
 const who=async ctx=>actorScope(await authenticate(ctx))
 const current=async(ctx,actor,identity,selection)=>{
  const projection=await teacherProjection({authenticationContext:ctx,
   curriculumIdentity:clone(identity),selection:clone(selection)})
  if(!actorEqual(actor,await who(ctx)))
   refuse('trusted actor changed during independent Curriculum verification')
  return checkedProjection(projection,actor,identity,selection)
 }
 async function prepare({authenticationContext,curriculumIdentity,selection}={}){
  if(process.env.NODE_ENV==='production')refuse('production disabled')
  const actor=await who(authenticationContext)
  const p=await current(authenticationContext,actor,curriculumIdentity,selection)
  const assignment=await readAssignment({schoolId:actor.schoolId,
   tenantId:actor.tenantId,actorId:actor.actorId,role:actor.role,
   grade:p.identity.grade,subjectId:p.identity.subjectId})
  const assignmentId=assignmentFor(assignment,actor,p,now())
  if(!actorEqual(actor,await who(authenticationContext)))
   refuse('teacher changed during assignment revalidation')
  // The SQL reserve ALSO verifies the current staff/assignment/edition and
  // holds the approved publisher row; a client cannot choose an assignment ID.
  const pin=sourcePin(p),fingerprint=sha(JSON.stringify(p))
  const receipt=await intents.reserve({...actor,assignmentId,sourcePin:pin,fingerprint})
  if(!yes(receipt?.intentId)||!pos(receipt.expiresAt)||
     receipt.expiresAt<=now()||receipt.authorizesPersistence!==false||
     receipt.approvedForPrint!==false)
   refuse('private durable reservation acknowledgment failed')
  return {status:'TEACHER_ONLY_AUTHORING_PREPARED',intentId:receipt.intentId,
   expiresAt:receipt.expiresAt,projection:clone(p),
   authorizesPersistence:false,approvedForPrint:false,studentAccessible:false}
 }
 async function savePrepared({authenticationContext,intentId,draft}={}){
  if(process.env.NODE_ENV==='production')refuse('production disabled')
  if(!yes(intentId)||!draft?.sourceIdentity)
   refuse('persistent intent ID and authored source identity required')
  const actor=await who(authenticationContext),sid=draft.sourceIdentity
  // A forged client source cannot become authority. Phase3X verifies Phase3AB
  // current staff grant and Phase3V current signature BEFORE any DB claim.
  const p=await current(authenticationContext,actor,
   sid.curriculumIdentity,sid.selection)
  assertSourceBinding(draft,p)
  const pin=sourcePin(p),fingerprint=sha(JSON.stringify(p))
  const claimed=await intents.claim({...actor,intentId,fingerprint,
   recordsDigest:pin.recordsDigest})
  // Claim transition already consumed the READY intent in shared PostgreSQL.
  // Verify the canonical JSONB receipt, including all original book hashes.
  let result,failed=null
  try{
   if(claimed?.intentId!==intentId||
      claimed.publicationId!==pin.publicationId||
      claimed.approvedRevision!==pin.revision||
      !equalHash(claimed.recordsDigest,pin.recordsDigest)||
      !equalHash(claimed.projectionFingerprint,fingerprint)||
      !same(claimed.sourcePin,pin))
    refuse('database claim was not for the exact currently approved source')
   if(!actorEqual(actor,await who(authenticationContext)))
    refuse('teacher changed after durable intent claim')
   // Phase3S repeats authenticated scope and re-resolves current Phase3V;
   // Phase3T independently checks the physical published SQL revision FOR SHARE.
   result=await draftGateway.create({authenticationContext,draft,
    expectedScope:clone(actor)})
   if(result?.status!=='STAGING_ONLY_DRAFT_STORED'||
      result.schoolId!==actor.schoolId||result.draftId!==draft.id||
      result.revision!==1||result.approvedForPrint!==false||
      result.authorizesProduction!==false)
    refuse('isolated server gateway returned an unexpected write acknowledgment')
  }catch(error){failed=error}
  // Never transition CLAIMED back to READY, regardless of unknown COMMIT outcome.
  // If finish acknowledgment itself fails, do NOT automatically retry creation.
  let finished=false
  try{finished=await intents.finish({...actor,intentId})}
  catch{refuse('claim finalization unconfirmed; use authenticated scoped draft read')}
  if(finished!==true)
   refuse('claimed intent finalization unconfirmed; use authenticated scoped draft read')
  if(failed)throw failed
  return {...result,authoringIntentConsumed:true}
 }
 async function readVerified({authenticationContext,draftId}={}){
  if(process.env.NODE_ENV==='production')refuse('production disabled')
  if(!yes(draftId))refuse('scoped draft identity required')
  const actor=await who(authenticationContext)
  const result=await draftGateway.read({authenticationContext,draftId,
   expectedScope:clone(actor)})
  if(result?.status!=='STAGING_ONLY_AUTHORIZED_READ'||
     result.authorizesProduction!==false||result.draft?.id!==draftId)
   refuse('authenticated scoped gateway read required')
  const sid=result.draft?.sourceIdentity
  if(!sid)refuse('stored draft lacks source identity')
  const p=await current(authenticationContext,actor,
   sid.curriculumIdentity,sid.selection)
  assertSourceBinding(result.draft,p)
  return {...result,approvedForPrint:false}
 }
 async function reviseVerified({authenticationContext,draft,
  expectedRevision,expectedNativeSha256}={}){
  if(process.env.NODE_ENV==='production')refuse('production disabled')
  const sid=draft?.sourceIdentity
  if(!sid)refuse('source identity required for revision')
  const actor=await who(authenticationContext)
  const p=await current(authenticationContext,actor,
   sid.curriculumIdentity,sid.selection)
  assertSourceBinding(draft,p)
  return draftGateway.revise({authenticationContext,draft,
   expectedRevision,expectedNativeSha256,expectedScope:clone(actor)})
 }
 async function cancel({authenticationContext,intentId}={}){
  if(process.env.NODE_ENV==='production')refuse('production disabled')
  if(!yes(intentId))refuse('durable intent ID required')
  const actor=await who(authenticationContext)
  if(await intents.cancel({...actor,intentId})!==true)
   refuse('cannot cancel claimed, expired, foreign or already spent intent')
  return {status:'AUTHORING_INTENT_CANCELLED',authorizesPersistence:false}
 }
 return Object.freeze({prepare,savePrepared,readVerified,reviseVerified,cancel})
}
module.exports={LABEL,createPhase3ADPersistentAuthoring}

// Phase3Y: dormant, server-only authenticated teacher authoring session.
// Local selection intent never grants publication, printing, or persistence authority.
const {randomUUID,createHash,timingSafeEqual}=require('node:crypto')
const {actorScope}=require('./newAuthoringDraftGatewayPhase3S')
const GATE_LABEL='PHASE3Y_ISOLATED_TEACHER_AUTHORING_SESSION_ONLY'
const TTL_MS=10*60*1000, MAX_ACTIVE=64, MAX_PER_ACTOR=3
const SCHEMA='assps-phase3p-curriculum-projection-v1'
const LINEAGE='assps-phase3w-source-lineage-v1'
const yes=x=>typeof x==='string'&&x.trim().length>0
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x)
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const clone=x=>JSON.parse(JSON.stringify(x))
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const equal=(a,b)=>hash(a)&&hash(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'))
const refuse=x=>{throw Error('Phase3Y refused: '+x)}
const actorEqual=(a,b)=>a.schoolId===b.schoolId&&a.tenantId===b.tenantId&&
 a.actorId===b.actorId&&a.role===b.role
function checkedProjection(bundle,actor,identity,selection){
 const p=bundle?.projection,l=p?.publicationLineage
 if(bundle?.status!=='TEACHER_ONLY_UNSAVED_PROJECTION'||
    bundle.schoolId!==actor.schoolId||bundle.authorizesPersistence!==false||
    bundle.studentAccessible!==false||bundle.printApproved!==false||
    p?.schema!==SCHEMA||p.status!=='READ_ONLY_APPROVED_PROJECTION'||
    !obj(l)||l.schema!==LINEAGE||l.clientAuthorizationState!=='UNVERIFIED_CLIENT_ONLY'||
    !yes(l.publicationId)||!Number.isSafeInteger(l.snapshotRevision)||
    l.snapshotRevision<1||!hash(l.recordsDigest)||p.revision!==l.snapshotRevision||
    !same(p.identity,identity)||!same(p.selection,selection)||
    p.legacyBankWriteAllowed!==false||p.printApproved!==false||
    p.serverPublicationApproved!==false||!Array.isArray(p.questions)||
    !p.questions.length||!Array.isArray(p.chapters)||!p.chapters.length)
  refuse('authenticated teacher-only verified signed projection required')
 const ids=new Set()
 for(const q of p.questions){
  if(!yes(q?.id)||ids.has(q.id)||q.academicRecord?.id!==q.id||
     q.academicRecord.review?.status!=='approved')
   refuse('duplicate or unauthorized projected academic record')
  ids.add(q.id)
 }
 return p
}
const sourcePin=p=>({
 publicationId:p.publicationLineage.publicationId,
 revision:p.publicationLineage.snapshotRevision,
 recordsDigest:p.publicationLineage.recordsDigest,
 curriculumIdentity:clone(p.identity),selection:clone(p.selection),
 sourceBookIds:clone(p.sourceBookIds),sourceChecksums:clone(p.sourceChecksums)
})
function assertSourceBinding(doc,p){
 const sid=doc?.sourceIdentity,pin=sourcePin(p)
 if(!obj(sid)||!yes(doc?.id)||sid.draftId!==doc.id||
    sid.kind!=='NEW_AUTHORING_APPROVED_CURRICULUM'||
    sid.authorizationState!=='UNVERIFIED_CLIENT_ONLY'||
    sid.sourcePaperId!==null||sid.sourceDatasetGeneration!==null||
    sid.publicationId!==pin.publicationId||sid.approvedSnapshotRevision!==pin.revision||
    !equal(sid.recordsDigest,pin.recordsDigest)||
    !same(sid.curriculumIdentity,pin.curriculumIdentity)||
    !same(sid.selection,pin.selection)||
    !same(sid.sourceBookIds,pin.sourceBookIds)||
    !same(sid.sourceChecksums,pin.sourceChecksums)||
    doc.legacyPaperUpdated!==false||doc.legacyBankWriteAllowed!==false||
    doc.canonicalV13MigrationClaim!==false||doc.serverPublicationApproved!==false||
    doc.printApproved!==false)
  refuse('authored draft must match current independently signed publication pin')
 if(!Array.isArray(doc.sourceLedger)||!doc.sourceLedger.length||
    !Array.isArray(doc.sections)||!doc.sections.length)
  refuse('bounded original source ledger and authored sections required')
 const byId=new Map(p.questions.map(q=>[q.id,q])),ledger=new Map()
 for(const l of doc.sourceLedger){
  const q=byId.get(l?.questionId),key=l?.blockId+'::'+l?.questionId
  if(!q||ledger.has(key)||!yes(l.blockId)||
     !same(l.academicRecord,q.academicRecord)||
     l.chapterId!==q.chapterId||l.topicId!==q.topicId)
   refuse('selected record is not an unchanged member of signed teacher projection')
  ledger.set(key,q)
 }
 const selected=new Set()
 for(const sec of doc.sections){
  if(!Array.isArray(sec?.items))refuse('invalid authored section items')
  for(const item of sec.items){
   const key=sec.id+'::'+item?.sourceQuestionId,q=ledger.get(key)
   if(!q||selected.has(item.sourceQuestionId)||item.kind!==q.type||
      item.chapterId!==q.chapterId||item.topicId!==q.topicId)
    refuse('authored structure differs from current approved selection')
   selected.add(item.sourceQuestionId)
  }
 }
 if(selected.size!==ledger.size)refuse('source ledger must match authored selection exactly')
 return true
}
function createPhase3YAuthoringSession({gate,authenticate,teacherProjection,
 draftGateway,clock=Date.now}={}){
 if(process.env.NODE_ENV==='production'||gate?.label!==GATE_LABEL||
    gate.confirmedNotProduction!==true||gate.trustedAuthContextStable!==true||
    gate.independentProjectionAndGatewayReviewed!==true||
    typeof authenticate!=='function'||typeof teacherProjection!=='function'||
    typeof draftGateway?.create!=='function'||
    typeof draftGateway?.read!=='function'||
    typeof draftGateway?.revise!=='function'||typeof clock!=='function')
  refuse('isolated, stable-auth teacher-projection and staging gateway gates required')
 const intents=new Map()
 const now=()=>{const n=clock();if(!Number.isSafeInteger(n)||n<=0)refuse('trusted clock invalid');return n}
 const who=async context=>actorScope(await authenticate(context))
 const prune=time=>{for(const [key,value] of intents){
  if(value.expiresAt<=time||value.state==='SPENT')intents.delete(key)
 }}
 async function current(context,actor,identity,selection){
  const bundle=await teacherProjection({authenticationContext:context,
   curriculumIdentity:identity,selection})
  const second=await who(context)
  if(!actorEqual(actor,second))refuse('authenticated actor changed during projection')
  return checkedProjection(bundle,actor,identity,selection)
 }
 async function prepare({authenticationContext,curriculumIdentity,selection}={}){
  if(process.env.NODE_ENV==='production')refuse('production session is disabled')
  const actor=await who(authenticationContext),time=now()
  prune(time)
  if(intents.size>=MAX_ACTIVE)refuse('bounded pending authoring capacity exceeded')
  const active=[...intents.values()].filter(v=>actorEqual(v.actor,actor))
  if(active.length>=MAX_PER_ACTOR)refuse('finish or expire existing authoring intents')
  const p=await current(authenticationContext,actor,curriculumIdentity,selection)
  // Re-check capacity after the asynchronous provider read to prevent parallel prepare races.
  const readyAt=now();prune(readyAt)
  if(intents.size>=MAX_ACTIVE||
     [...intents.values()].filter(v=>actorEqual(v.actor,actor)).length>=MAX_PER_ACTOR)
   refuse('bounded pending authoring capacity exceeded')
  const intentId=randomUUID()
  const intent={actor:clone(actor),source:sourcePin(p),
   fingerprint:sha(JSON.stringify(p)),expiresAt:readyAt+TTL_MS,state:'READY'}
  intents.set(intentId,intent)
  return {status:'TEACHER_ONLY_AUTHORING_PREPARED',intentId,
   expiresAt:intent.expiresAt,projection:clone(p),authorizesPersistence:false,
   approvedForPrint:false,studentAccessible:false}
 }
 async function savePrepared({authenticationContext,intentId,draft}={}){
  if(process.env.NODE_ENV==='production')refuse('production authoring disabled')
  const actor=await who(authenticationContext),time=now()
  if(!yes(intentId)||!intents.has(intentId))refuse('unknown or spent authoring intent')
  const intent=intents.get(intentId)
  if(!actorEqual(intent.actor,actor))refuse('teacher intent belongs to another actor/school')
  if(intent.state!=='READY'||intent.expiresAt<=time){
   intents.delete(intentId);refuse('expired, concurrent or spent authoring intent')
  }
  if(!obj(draft?.sourceIdentity))refuse('authored source identity missing')
  const p=await current(authenticationContext,actor,
   intent.source.curriculumIdentity,intent.source.selection)
  const pin=sourcePin(p)
  if(!same(pin,intent.source)||
     !equal(sha(JSON.stringify(p)),intent.fingerprint))
   refuse('publication or signed Question Bank changed; prepare a fresh authoring selection')
  if(intents.get(intentId)!==intent||intent.state!=='READY'||intent.expiresAt<=now())
   refuse('cancelled, concurrent or expired authoring intent cannot be submitted')
  assertSourceBinding(draft,p)
  intent.state='IN_PROGRESS'
  try{
   const result=await draftGateway.create({authenticationContext,draft,
    expectedScope:clone(actor)})
   if(result?.status!=='STAGING_ONLY_DRAFT_STORED'||
      result.schoolId!==actor.schoolId||result.draftId!==draft.id||
      result.revision!==1||result.approvedForPrint!==false||
      result.authorizesProduction!==false)
    refuse('staging gateway returned an unexpected write acknowledgment')
   intent.state='SPENT';intents.delete(intentId)
   return {...result,authoringIntentConsumed:true}
  }catch(error){
   // Unknown commit outcome must never trigger an automatic duplicate retry.
   intent.state='SPENT';intents.delete(intentId);throw error
  }
 }
 async function readVerified({authenticationContext,draftId}={}){
  if(process.env.NODE_ENV==='production')refuse('production authoring disabled')
  const actor=await who(authenticationContext)
  const result=await draftGateway.read({authenticationContext,draftId,
   expectedScope:clone(actor)})
  if(result?.status!=='STAGING_ONLY_AUTHORIZED_READ'||
     result.authorizesProduction!==false||result.draft?.id!==draftId)
   refuse('trusted scoped gateway read is required')
  const sid=result.draft?.sourceIdentity
  if(!obj(sid))refuse('stored draft has no signed source identity')
  const p=await current(authenticationContext,actor,
   sid.curriculumIdentity,sid.selection)
  assertSourceBinding(result.draft,p)
  return {...result,approvedForPrint:false}
 }
 async function reviseVerified({authenticationContext,draft,
  expectedRevision,expectedNativeSha256}={}){
  if(process.env.NODE_ENV==='production')refuse('production authoring disabled')
  const actor=await who(authenticationContext),sid=draft?.sourceIdentity
  if(!obj(sid))refuse('source identity required for revision')
  const p=await current(authenticationContext,actor,
   sid.curriculumIdentity,sid.selection)
  assertSourceBinding(draft,p)
  return draftGateway.revise({authenticationContext,draft,
   expectedRevision,expectedNativeSha256,expectedScope:clone(actor)})
 }
 async function cancel({authenticationContext,intentId}={}){
  if(process.env.NODE_ENV==='production')refuse('production authoring disabled')
  const actor=await who(authenticationContext),intent=intents.get(intentId)
  if(!intent||!actorEqual(intent.actor,actor)||intent.state!=='READY')
   refuse('cannot cancel another actor or consumed authoring intent')
  intents.delete(intentId)
  return {status:'AUTHORING_INTENT_CANCELLED',authorizesPersistence:false}
 }
 return Object.freeze({prepare,savePrepared,readVerified,reviseVerified,cancel})
}
module.exports={GATE_LABEL,TTL_MS,createPhase3YAuthoringSession,
 checkedProjection,sourcePin,assertSourceBinding}

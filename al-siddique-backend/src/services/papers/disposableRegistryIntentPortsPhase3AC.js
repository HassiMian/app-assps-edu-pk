// Phase3AC: dormant per-school PG adapter for SELF-CREATED synthetic registry/intent schema.
// No real roster connector, route, production DB URL, or live deployment.
const {randomUUID}=require('node:crypto')
const {ROLE_ID_SQL,authoringBindingSha256,EXPECTED_LOGIN}=
 require('./newAuthoringRoleBoundRepositoryPhase3T')
const LABEL='PHASE3AC_SYNTHETIC_DISPOSABLE_PG18_ONLY'
const yes=x=>typeof x==='string'&&x.trim().length>0
const hash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/i.test(x)
const pos=x=>Number.isSafeInteger(x)&&x>0
const refuse=x=>{throw Error('Phase3AC refused: '+x)}
const SQL=Object.freeze({
 school:'SELECT public.phase3ac_read_school($1) AS v',
 staff:'SELECT public.phase3ac_read_staff($1,$2,$3) AS v',
 assignment:'SELECT public.phase3ac_read_assignment($1,$2,$3,$4,$5) AS v',
 binding:'SELECT public.phase3ac_read_binding($1,$2,$3,$4::jsonb) AS v',
 reserve:'SELECT reserved_id,deadline FROM public.phase3ac_reserve_intent(' +
  '$1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)',
 claim:'SELECT public.phase3ac_claim_intent($1::uuid,$2,$3,$4,$5,$6,$7) AS v',
 finish:'SELECT public.phase3ac_finish_intent($1::uuid,$2,$3,$4,$5) AS v',
 cancel:'SELECT public.phase3ac_cancel_intent($1::uuid,$2,$3,$4,$5) AS v'})
function createPhase3ACDisposablePorts({gate,schoolId,tenantId,connect}={}){
 if(process.env.NODE_ENV==='production'||gate?.label!==LABEL||
  gate.confirmedNotProduction!==true||
  gate.markerVerifiedSelfCreatedPg18!==true||gate.independentSchemaReviewPassed!==true||
  !pos(schoolId)||!yes(tenantId)||tenantId.length>128||typeof connect!=='function')
  refuse('isolated school role, source-controlled synthetic schema and staging gates required')
 const exact=s=>s?.schoolId===schoolId&&s?.tenantId===tenantId
 const check=()=>{if(process.env.NODE_ENV==='production')refuse('production disabled')}
 async function query(sql,args){
  check();let c,quarantine=null
  try{
   c=await connect()
   if(typeof c?.query!=='function'||typeof c?.release!=='function')
    refuse('invalid private school connector')
   const auth=await c.query(ROLE_ID_SQL)
   if(auth.rowCount!==1||auth.rows[0].authenticated_login!==EXPECTED_LOGIN(schoolId)||
      Number(auth.rows[0].verified_school_id)!==schoolId||
      auth.rows[0].verified_tenant_id!==tenantId){
    quarantine=Error('private session_user identity verification failed')
    throw quarantine
   }
   return await c.query(sql,args)
  }finally{if(c)c.release(quarantine||undefined)}
 }
 const one=async(sql,args)=>{const r=await query(sql,args);
  if(r.rowCount!==1)refuse('private read returned unexpected row count')
  return r.rows[0].v??null}
 const demand=x=>{if(!exact(x))refuse('caller scope differs from checked school connector')}
 const readSchool=async({schoolId:id}={})=>{
  if(id!==schoolId)refuse('untrusted school input')
  return one(SQL.school,[id])
 }
 const readStaff=async x=>{demand(x);if(!pos(x.actorId))refuse('bad actor');
  return one(SQL.staff,[schoolId,tenantId,x.actorId])}
 const readAssignment=async x=>{demand(x);
  if(!pos(x.actorId)||!pos(x.grade)||!yes(x.subjectId))refuse('bad subject scope');
  return one(SQL.assignment,[schoolId,tenantId,x.actorId,x.grade,x.subjectId])}
 const readCurriculumBinding=async x=>{demand(x);
  if(!yes(x.assignmentId)||!x.curriculumIdentity)refuse('bad edition binding');
  return one(SQL.binding,[schoolId,tenantId,x.assignmentId,
   JSON.stringify(x.curriculumIdentity)])}
 const identity=x=>{demand(x);if(!pos(x.actorId)||
   !['teacher','principal','admin'].includes(x.role))
   refuse('trusted staff actor and role required')}
 async function reserve(x){
  identity(x);const pin=x.sourcePin
  if(!yes(x.assignmentId)||!yes(pin?.publicationId)||!pos(pin?.revision)||
   !hash(pin?.recordsDigest)||!hash(x.fingerprint))
   refuse('complete independently checked source pin required')
  const binding=authoringBindingSha256(pin),intentId=randomUUID()
  const result=await query(SQL.reserve,[intentId,schoolId,tenantId,x.actorId,x.role,
   x.assignmentId,pin.publicationId,binding,pin.revision,pin.recordsDigest,
   x.fingerprint,JSON.stringify(pin)])
  if(result.rowCount!==1||result.rows[0].reserved_id!==intentId)
   refuse('persistent reservation not acknowledged')
  return {intentId,expiresAt:new Date(result.rows[0].deadline).getTime(),
   authorizesPersistence:false,approvedForPrint:false}
 }
 async function claim(x){
  identity(x);if(!yes(x.intentId)||!hash(x.fingerprint)||!hash(x.recordsDigest))
   refuse('complete one-use claim ID and immutable fingerprint required')
  const value=await one(SQL.claim,[x.intentId,schoolId,tenantId,x.actorId,x.role,
   x.fingerprint,x.recordsDigest])
  if(!value)refuse('unknown, expired, revoked, cross-actor, or already claimed intent')
  return value
 }
 async function finish(x){identity(x);if(!yes(x.intentId))refuse('bad intent ID');
  return (await one(SQL.finish,[x.intentId,schoolId,tenantId,x.actorId,x.role]))===true}
 async function cancel(x){identity(x);if(!yes(x.intentId))refuse('bad intent ID');
  return (await one(SQL.cancel,[x.intentId,schoolId,tenantId,x.actorId,x.role]))===true}
 return Object.freeze({readSchool,readStaff,readAssignment,readCurriculumBinding,
  reserve,claim,finish,cancel})
}
module.exports={LABEL,SQL,createPhase3ACDisposablePorts}

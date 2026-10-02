// Phase 3H: DORMANT opt-in role-bound STAGING gateway. Never mounted on app routes.
// The trusted bootstrap must inject a pool whose LOGIN/session_user is uniquely bound to ONE school.
// A client-provided tenant GUC, JWT claim, query string or header is NOT database identity.
const {appendStagingDraftRevision,assertVerifiedStagingGate}
 =require('./paperStagingRevisionAdapter.js')
const ROLE_BOUND_ID_SQL='SELECT public.phase3h_session_school_id() AS verified_school_id'
const safeId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null
function trustedSchoolFromActor(actor){
 if(!actor||!safeId(actor.id)||!['teacher','principal','admin'].includes(actor.role))
  throw new Error('Role-bound draft editing requires a verified non-platform authenticated actor.')
 const schoolId=safeId(actor.school_id??actor.schoolId)
 if(!schoolId)throw new Error('Verified school actor is missing a valid school ID.')
 return schoolId
}
function assertBoundIdentityResult(result,schoolId){
 if(!result||result.rowCount!==1||!Array.isArray(result.rows)||result.rows.length!==1||
  safeId(result.rows[0].verified_school_id)!==schoolId)
  throw new Error('Database LOGIN role is NOT independently bound to the verified actor school.')
 return true
}
async function appendRoleBoundStagingDraftRevision(options={}){
 const {gate,connect,actor}=options
 assertVerifiedStagingGate(gate)
 if(typeof connect!=='function')
  throw new Error('A trusted, separately credentialed per-school staging connector is required.')
 const schoolId=trustedSchoolFromActor(actor)
 // The credentialed pool is selected by trusted backend actor scope, never by client input.
 // This first SELECT invokes a locked SECURITY DEFINER function based on session_user,
 // not settable app.paper_school_id. Failed verification does not enter BEGIN/paper SELECT.
 const verifiedConnect=async()=>{
  let client
  try{
   client=await connect()
   if(!client||typeof client.query!=='function'||typeof client.release!=='function')
    throw new Error('Invalid role-bound staging connector.')
   const result=await client.query(ROLE_BOUND_ID_SQL)
   assertBoundIdentityResult(result,schoolId)
   return client
  }catch(error){
   if(client&&typeof client.release==='function')client.release(error)
   throw error
  }
 }
 // Existing Phase 3E/3F CAS, source protection, immutable native bytes and audit transaction
 // are unchanged; Phase 3H real DB RLS ignores even a forged GUC when evaluating school ID.
 return appendStagingDraftRevision({...options,connect:verifiedConnect})
}
module.exports={appendRoleBoundStagingDraftRevision,assertBoundIdentityResult,
 trustedSchoolFromActor,ROLE_BOUND_ID_SQL}

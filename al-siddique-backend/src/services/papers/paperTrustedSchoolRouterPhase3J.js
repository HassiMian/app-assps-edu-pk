// Phase 3J. DORMANT, TRUSTED-BOOTSTRAP ONLY per-school credential router.
// No production DB import, Express route, secrets or deployment. Never derive connector
// or DB login from query strings, user-provided school_id, headers or draft body.
const {appendRoleBoundStagingDraftRevision,trustedSchoolFromActor}
 =require('./paperRoleBoundStagingGateway.js')
const {assertVerifiedStagingGate}=require('./paperStagingRevisionAdapter.js')
const IDENTITY_SQL='SELECT session_user AS authenticated_login, public.phase3h_session_school_id() AS verified_school_id'
const exactId=id=>Number.isSafeInteger(id)&&id>0?id:null
const strictRole=id=>'assps_p3h_school'+id
const one=r=>r&&r.rowCount===1&&Array.isArray(r.rows)&&r.rows.length===1
function createTrustedSchoolRouter({trustedActorResolver,connectorDefinitions,gate}={}){
 // Only a privately built backend bootstrap may supply these objects. This is NOT proof
 // that an arbitrary caller is authorized; DO NOT expose this factory to HTTP payloads.
 assertVerifiedStagingGate(gate)
 if(typeof trustedActorResolver!=='function')
  throw new Error('A private trusted server authentication resolver is required.')
 if(!Array.isArray(connectorDefinitions)||connectorDefinitions.length<1||
  connectorDefinitions.length>512)
  throw new Error('An explicit bounded per-school secret-backed connector registry is required.')
 const pools=new Map(),seenRoles=new Set(),seenConnectors=new Set()
 for(const definition of connectorDefinitions){
  const id=exactId(definition?.schoolId)
  if(!id||typeof definition.connect!=='function'||
    definition.expectedLogin!==strictRole(id)||
    pools.has(id)||seenRoles.has(definition.expectedLogin)||
    seenConnectors.has(definition.connect))
   throw new Error('Ambiguous, privileged, shared or mismatched school credential mapping refused.')
  pools.set(id,Object.freeze({connect:definition.connect,login:definition.expectedLogin}))
  seenRoles.add(definition.expectedLogin)
  seenConnectors.add(definition.connect)
 }
 // Deliberately no returned registry, credential, connect() accessor, or mutable routing table.
 async function revise({authenticationContext,paperId,expectedRevision,
  expectedNativeSha256,proposedNativeJsonText}={}){
  // The actual actor can ONLY come from the independently supplied server resolver.
  // Extra caller-provided actor, schoolId, role, gate or connect fields are discarded.
  const actor=await trustedActorResolver(authenticationContext)
  const schoolId=trustedSchoolFromActor(actor)
  const binding=pools.get(schoolId)
  if(!binding)throw new Error('No independently enrolled DB LOGIN for the authenticated school.')
  const trustedConnect=async()=>{
   let client
   try{
    client=await binding.connect()
    if(!client||typeof client.query!=='function'||typeof client.release!=='function')
     throw new Error('Private per-school connector did not supply a valid PostgreSQL client.')
    const r=await client.query(IDENTITY_SQL)
    if(!one(r)||r.rows[0].authenticated_login!==binding.login||
      exactId(r.rows[0].verified_school_id)!==schoolId)
     throw new Error('Authenticated DB LOGIN does not match its private school registry binding.')
    return client
   }catch(error){
    if(client&&typeof client.release==='function')client.release(error)
    throw error
   }
  }
  // The existing Phase3H gateway independently checks the session_school function
  // AGAIN before the original serializable DRAFT SHA/CAS+append-only-audit transaction.
  // Trusted fields deliberately come LAST; no caller spread can replace credentials.
  return appendRoleBoundStagingDraftRevision({
   paperId,expectedRevision,expectedNativeSha256,proposedNativeJsonText,
   gate,actor,connect:trustedConnect,
  })
 }
 return Object.freeze({revise})
}
module.exports={createTrustedSchoolRouter,IDENTITY_SQL}

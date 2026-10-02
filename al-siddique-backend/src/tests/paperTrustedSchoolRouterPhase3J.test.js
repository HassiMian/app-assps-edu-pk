// Phase3J offline/private registry contract. Fake actors/data ONLY; no active PostgreSQL.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createTrustedSchoolRouter,IDENTITY_SQL}
 =require('../services/papers/paperTrustedSchoolRouterPhase3J.js')
const {ROLE_BOUND_ID_SQL}=require('../services/papers/paperRoleBoundStagingGateway.js')
const gate=Object.freeze({
 // Synthetic assertions are fixtures, NOT actual signed source/backup approval.
 targetEnvironment:'ASSPS_ISOLATED_STAGING',confirmedNotProduction:true,
 readonlySchemaInventoryReviewed:true,encryptedBackupVerified:true,
 backupRestoreTestPassed:true,serverAuthenticatedSchoolScopeVerified:true,
 twoSchoolIsolationTestPassed:true,originalApprovedVisualEvidenceIndependentlyReviewed:true,
})
const actor51=()=>({id:11,role:'teacher',school_id:51})
const fake=(school=51,login='assps_p3h_school51',events=[],releaseFlags=[])=>async()=>({
 query:async(sql)=>{
  events.push(sql)
  if(sql===IDENTITY_SQL)
   return {rowCount:1,rows:[{authenticated_login:login,verified_school_id:school}]}
  if(sql===ROLE_BOUND_ID_SQL)return {rowCount:1,rows:[{verified_school_id:school}]}
  throw new Error('Synthetic abort after verified identity; do not persist any fake paper.')
 },
 release:e=>releaseFlags.push(Boolean(e)),
})
const draft=()=>({
 authenticationContext:{opaqueSession:'fake-school51'},
 paperId:'synthetic-001',expectedRevision:1,expectedNativeSha256:'a'.repeat(64),
 proposedNativeJsonText:JSON.stringify({id:'synthetic-001',school_id:51,config:{marks:10}}),
})
test('registry setup blocks missing gate, missing private resolver, duplicate roles, malformed IDs and shared physical pool',()=>{
 assert.throws(()=>createTrustedSchoolRouter(),/Staging blocked/)
 const connect=()=>({query:async()=>({}),release:()=>{}})
 assert.throws(()=>createTrustedSchoolRouter({gate,connectorDefinitions:[]}),/resolver/)
 const base={gate,trustedActorResolver:actor51}
 for(const defs of [
  [],[{schoolId:'51',expectedLogin:'assps_p3h_school51',connect}],
  [{schoolId:51,expectedLogin:'postgres',connect}],
  [{schoolId:51,expectedLogin:'assps_p3h_school52',connect}],
  [{schoolId:0,expectedLogin:'assps_p3h_school0',connect}],
  [{schoolId:51,expectedLogin:'assps_p3h_school51',connect},
   {schoolId:51,expectedLogin:'assps_p3h_school51',connect:()=>{}}],
  [{schoolId:51,expectedLogin:'assps_p3h_school51',connect},
   {schoolId:52,expectedLogin:'assps_p3h_school52',connect}],
 ]){
  assert.throws(()=>createTrustedSchoolRouter({...base,connectorDefinitions:defs}),
   /registry is required|credential mapping refused/)
 }
})
test('router does not expose underlying connector registry/secret or public role selector',()=>{
 const router=createTrustedSchoolRouter({gate,trustedActorResolver:actor51,
  connectorDefinitions:[{schoolId:51,expectedLogin:'assps_p3h_school51',connect:fake()}]})
 assert.deepEqual(Object.keys(router),['revise'])
 assert.equal(Object.isFrozen(router),true)
 assert.equal(router.connect,undefined)
 assert.equal(router.pools,undefined)
})
test('forged request actor/school/role/connect/gate fields cannot override independently resolved school or connector',async()=>{
 const events=[],quarantine=[];let rogueConnectCalls=0;let calls=0
 const trustedActorResolver=async ctx=>{
  calls++
  assert.deepEqual(ctx,{opaqueSession:'fake-school51'})
  return actor51()
 }
 const router=createTrustedSchoolRouter({gate,trustedActorResolver,
  connectorDefinitions:[{schoolId:51,expectedLogin:'assps_p3h_school51',
   connect:fake(51,'assps_p3h_school51',events,quarantine)}]})
 await assert.rejects(()=>router.revise({...draft(),actor:{id:12,school_id:52,role:'admin'},
  claimedSchoolId:52,role:'super_admin',gate:null,
  connect:async()=>{rogueConnectCalls++;throw new Error('untrusted connector')},
 }),/Synthetic abort after verified identity/)
 assert.equal(calls,1)
 assert.equal(rogueConnectCalls,0)
 assert.deepEqual(events,[IDENTITY_SQL,ROLE_BOUND_ID_SQL,'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE'])
 // A deliberately rejected BEGIN leaves no open transaction; adapter may release cleanly.
 assert.deepEqual(quarantine,[false])
})
test('unregistered independently authenticated school cannot accidentally fall back to first/privileged pool',async()=>{
 let n=0
 const router=createTrustedSchoolRouter({gate,trustedActorResolver:()=>({
  id:12,school_id:52,role:'teacher'}),
  connectorDefinitions:[{schoolId:51,expectedLogin:'assps_p3h_school51',
   connect:async()=>{n++;throw new Error('must not run')}}]})
 await assert.rejects(()=>router.revise(draft()),/No independently enrolled DB LOGIN/)
 assert.equal(n,0)
})
test('wrong session_user, wrong DB role school or missing binding releases/quarantines before paper BEGIN',async()=>{
 for(const [school,login] of [[51,'assps_p3h_school52'],[52,'assps_p3h_school51'],
  [null,'assps_p3h_school51']]){
  const events=[],flags=[]
  const router=createTrustedSchoolRouter({gate,trustedActorResolver:actor51,
   connectorDefinitions:[{schoolId:51,expectedLogin:'assps_p3h_school51',
    connect:fake(school,login,events,flags)}]})
  await assert.rejects(()=>router.revise(draft()),/Authenticated DB LOGIN does not match/)
  assert.deepEqual(events,[IDENTITY_SQL])
  assert.deepEqual(flags,[true])
 }
})
test('missing/failed private server authentication resolves before any database connection',async()=>{
 let n=0
 for(const resolver of [
  ()=>null,()=>({id:11,school_id:0,role:'teacher'}),
  ()=>({id:11,school_id:51,role:'super_admin'}),
  async()=>{throw new Error('Server auth rejected session')}
 ]){
  const router=createTrustedSchoolRouter({gate,trustedActorResolver:resolver,
   connectorDefinitions:[{schoolId:51,expectedLogin:'assps_p3h_school51',
    connect:async()=>{n++;throw new Error('must not run')}}]})
  await assert.rejects(()=>router.revise(draft()),/authenticated|valid school ID|Server auth rejected/)
 }
 assert.equal(n,0)
})
test('public input cannot interpolate role names or set paper_school_id in immutable preflight query',()=>{
 assert.equal(IDENTITY_SQL,
  'SELECT session_user AS authenticated_login, public.phase3h_session_school_id() AS verified_school_id')
 assert.doesNotMatch(IDENTITY_SQL,/set_config|app\.paper_school_id|CURRENT_USER|\$1/u)
})

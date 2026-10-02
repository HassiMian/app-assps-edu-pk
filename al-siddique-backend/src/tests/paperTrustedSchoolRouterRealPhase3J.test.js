// Phase3J real PostgreSQL 18 TEST DATA ONLY: own 127.0.0.1:55442 fresh cluster.
// No active school DB pool, no production/5432, no principal-approved paper data.
const {test,before,after}=require('node:test')
const assert=require('node:assert/strict')
const {createHash}=require('node:crypto')
const {createTrustedSchoolRouter,IDENTITY_SQL}
 =require('../services/papers/paperTrustedSchoolRouterPhase3J.js')
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex')
const selected=process.env.ASSPS_PHASE3J_REAL_PG==='EXPLICIT_TWO_NEW_CLUSTERS_55442_55443'
function dsn(value,role){
 if(!value)throw new Error('Explicit synthetic-only generated DSN required.')
 const u=new URL(value)
 if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!=='127.0.0.1'||
  u.port!=='55442'||u.pathname!=='/assps_paper_phase3j_ci'||
  u.username!==role||!u.password)
  throw new Error('Refuse any non-own-source-cluster DB role, password, name, port or host.')
 return value
}
const gate=Object.freeze({
 // Fixture for dormant CAS testing, NOT actual principal or encrypted real-school approval.
 targetEnvironment:'ASSPS_ISOLATED_STAGING',confirmedNotProduction:true,
 readonlySchemaInventoryReviewed:true,encryptedBackupVerified:true,
 backupRestoreTestPassed:true,serverAuthenticatedSchoolScopeVerified:true,
 twoSchoolIsolationTestPassed:true,originalApprovedVisualEvidenceIndependentlyReviewed:true,
})
const native=(school,id,totalMarks,status='DRAFT')=>JSON.stringify({
 id,school_id:school,status,createdAt:'2026-10-02T09:00:00.000Z',
 sourcePaperId:'SYNTHETIC_2_CLUSTER_TEST_ONLY',
 config:{subject:'Science',totalMarks}})
if(!selected){
 test('REAL router source test SKIPPED absent exact independent two-new-cluster opt-in',{
  skip:'Never connect to 5432 or any production database.'},()=>{})
}else{
 const {Client,Pool}=require('pg')
 const admin=new Client({connectionString:dsn(process.env.ASSPS_PHASE3J_SOURCE_ADMIN_URL,
  'assps_p3g_admin'),connectionTimeoutMillis:3000})
 const pool51=new Pool({connectionString:dsn(process.env.ASSPS_PHASE3J_SOURCE_51_URL,
  'assps_p3h_school51'),max:3,connectionTimeoutMillis:3000})
 const pool52=new Pool({connectionString:dsn(process.env.ASSPS_PHASE3J_SOURCE_52_URL,
  'assps_p3h_school52'),max:3,connectionTimeoutMillis:3000})
 const actorBySession=new Map([
  ['synthetic-opaque-session-51',Object.freeze({id:11,role:'teacher',school_id:51})],
  ['synthetic-opaque-session-52',Object.freeze({id:12,role:'teacher',school_id:52})],
  ['synthetic-opaque-session-53',Object.freeze({id:13,role:'teacher',school_id:53})],
 ])
 const known=new Map()
 const resolveActor=async ctx=>{
  const actor=actorBySession.get(ctx?.session)
  if(!actor)throw new Error('Trusted server refused unknown session.')
  return actor
 }
 const connector51=()=>pool51.connect()
 const connector52=()=>pool52.connect()
 let router
 const args=(session,id,revision,digest,nextMarks,school)=>({
  authenticationContext:{session,school_id:school===51?52:51,
   claimedRole:'super_admin',tryConnection:'postgres'},
  paperId:id,expectedRevision:revision,expectedNativeSha256:digest,
  proposedNativeJsonText:native(school,id,nextMarks),
 })
 async function seed(school,owner,id,marks,status='DRAFT',protectedRef=false){
  const value=native(school,id,marks,status),hash=sha(value)
  await admin.query('INSERT INTO paper_documents (school_id,id,created_by,status,source_protected,revision,native_json_text,native_sha256,updated_by) VALUES ($1,$2,$3,$4,$5,1,$6,$7,$3)',[
   school,id,owner,status,protectedRef,value,hash])
  await admin.query("INSERT INTO paper_revisions (school_id,document_id,revision,native_json_text,native_sha256,previous_native_sha256,actor_id,change_kind) VALUES ($1,$2,1,$3,$4,NULL,$5,'INITIAL_SEED')",[
   school,id,value,hash,owner])
  known.set(school+'|'+id,{value,hash})
 }
 before(async()=>{
  await admin.connect()
  const info=(await admin.query(
   'SELECT current_database() AS db,session_user AS role,inet_server_port() AS port,host(inet_server_addr()) AS host')).rows[0]
  assert.deepEqual(info,{
   db:'assps_paper_phase3j_ci',role:'assps_p3g_admin',port:55442,host:'127.0.0.1'})
  await admin.query('BEGIN')
  try{
   await admin.query('INSERT INTO users(id,school_id) VALUES (11,51),(12,52)')
   await seed(51,11,'same-id-001',40)
   await seed(52,12,'same-id-001',41)
   await seed(51,11,'race-001',30)
   await seed(51,11,'approved-001',60,'APPROVED',true)
   await admin.query('COMMIT')
  }catch(e){await admin.query('ROLLBACK').catch(()=>{});throw e}
  router=createTrustedSchoolRouter({gate,trustedActorResolver:resolveActor,
   connectorDefinitions:[
    {schoolId:51,expectedLogin:'assps_p3h_school51',connect:connector51},
    {schoolId:52,expectedLogin:'assps_p3h_school52',connect:connector52},
   ]})
 })
 after(async()=>{
  await Promise.all([pool51.end().catch(()=>{}),pool52.end().catch(()=>{})])
  await admin.end().catch(()=>{})
 })
 test('REAL role-bound private router has no exposed pool and authenticated sessions can change ONLY own colliding paper ID',async()=>{
  assert.deepEqual(Object.keys(router),['revise'])
  const one=known.get('51|same-id-001'),two=known.get('52|same-id-001')
  const [result51,result52]=await Promise.all([
   router.revise(args('synthetic-opaque-session-51','same-id-001',1,one.hash,45,51)),
   router.revise(args('synthetic-opaque-session-52','same-id-001',1,two.hash,46,52)),
  ])
  assert.deepEqual([result51.schoolId,result51.revision,result52.schoolId,result52.revision],[51,2,52,2])
  const rows=(await admin.query("SELECT school_id,revision,native_json_text,native_sha256 FROM paper_documents WHERE id='same-id-001' ORDER BY school_id")).rows
  assert.equal(rows.length,2)
  assert.equal(rows[0].school_id,51);assert.equal(rows[1].school_id,52)
  for(const row of rows){assert.equal(row.revision,2);assert.equal(row.native_sha256,sha(row.native_json_text))}
 })
 test('REAL forged browser school_id, actor, role, credential connector and gate cannot override server resolver',async()=>{
  const current=(await admin.query("SELECT revision,native_sha256 FROM paper_documents WHERE school_id=51 AND id='same-id-001'")).rows[0]
  const plan={...args('synthetic-opaque-session-51','same-id-001',
   current.revision,current.native_sha256,48,51),
   school_id:52,schoolId:52,role:'super_admin',
   actor:{id:12,role:'admin',school_id:52},gate:null,
   connect:()=>{throw new Error('UNTRUSTED_BROWSER_CONNECTOR_MUST_NEVER_RUN')},
  }
  const result=await router.revise(plan)
  assert.equal(result.schoolId,51);assert.equal(result.revision,3)
  const other=(await admin.query("SELECT revision,native_json_text FROM paper_documents WHERE school_id=52 AND id='same-id-001'")).rows[0]
  assert.equal(other.revision,2)
  assert.equal(other.native_json_text,native(52,'same-id-001',46))
 })
 test('REAL privately mismatched school51 registry using school52 LOGIN is rejected BEFORE paper transaction',async()=>{
  const events=[]
  const wrong=async()=>{
   const c=await pool52.connect()
   return {query:(sql,params)=>{events.push(sql);return c.query(sql,params)},
    release:error=>c.release(error)}
  }
  const malicious=createTrustedSchoolRouter({gate,trustedActorResolver:resolveActor,
   connectorDefinitions:[{schoolId:51,expectedLogin:'assps_p3h_school51',connect:wrong}]})
  const c=(await admin.query("SELECT revision,native_sha256 FROM paper_documents WHERE school_id=51 AND id='same-id-001'")).rows[0]
  await assert.rejects(()=>malicious.revise(args('synthetic-opaque-session-51',
   'same-id-001',c.revision,c.native_sha256,49,51)),
  /Authenticated DB LOGIN does not match/)
  assert.deepEqual(events,[IDENTITY_SQL])
 })
 test('REAL unauthorized school53 or unrecognized opaque session never opens any credentialed connector',async()=>{
  let opened=0
  const excluded=createTrustedSchoolRouter({gate,trustedActorResolver:resolveActor,
   connectorDefinitions:[{schoolId:51,expectedLogin:'assps_p3h_school51',
    connect:async()=>{opened++;throw new Error('must not connect')}}]})
  await assert.rejects(()=>excluded.revise(args('synthetic-opaque-session-53',
   'same-id-001',1,'a'.repeat(64),53,53)),/No independently enrolled DB LOGIN/)
  await assert.rejects(()=>excluded.revise(args('unknown',
   'same-id-001',1,'a'.repeat(64),53,53)),/Trusted server refused unknown session/)
  assert.equal(opened,0)
 })
 test('REAL concurrent authenticated same-school writers cannot both append v2 and corrupt immutable audit',async()=>{
  const old=known.get('51|race-001')
  const results=await Promise.allSettled([
   router.revise(args('synthetic-opaque-session-51','race-001',1,old.hash,31,51)),
   router.revise(args('synthetic-opaque-session-51','race-001',1,old.hash,32,51)),
  ])
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1)
  assert.equal(results.filter(x=>x.status==='rejected').length,1)
  const audit=(await admin.query("SELECT COUNT(*)::integer AS n FROM paper_revisions WHERE school_id=51 AND document_id='race-001' AND revision=2")).rows[0].n
  assert.equal(audit,1)
 })
 test('REAL approved source stays byte-identical; restricted SQL principal still cannot fake tenant setting',async()=>{
  const original=known.get('51|approved-001')
  await assert.rejects(()=>router.revise(args('synthetic-opaque-session-51','approved-001',1,
   original.hash,75,51)),/Only independent DRAFT/u)
  const after=(await admin.query("SELECT revision,native_json_text,native_sha256,status,source_protected FROM paper_documents WHERE school_id=51 AND id='approved-001'")).rows[0]
  assert.deepEqual(after,{revision:1,native_json_text:original.value,native_sha256:original.hash,
   status:'APPROVED',source_protected:true})
  const c=await pool51.connect()
  try{
   await c.query('BEGIN')
   await c.query("SELECT set_config('app.paper_school_id','52',true)")
   assert.equal((await c.query("SELECT COUNT(*)::integer AS n FROM paper_documents WHERE school_id=52")).rows[0].n,0)
   assert.equal((await c.query('SELECT public.phase3h_session_school_id() AS school')).rows[0].school,51)
   await c.query('ROLLBACK')
  }finally{await c.query('ROLLBACK').catch(()=>{});c.release()}
 })
}

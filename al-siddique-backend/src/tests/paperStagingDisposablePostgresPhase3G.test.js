// Phase 3G: REAL PG integration ONLY inside a newly created disposable independent PG18 cluster.
// Never connects to active database.js, port 5432, production, principal data or app endpoints.
const {test,before,after}=require('node:test')
const assert=require('node:assert/strict')
const {createHash}=require('node:crypto')
const {auditPaperStagingRls}=require('../services/papers/paperStagingRlsAudit.js')
const {appendStagingDraftRevision,SQL}=require('../services/papers/paperStagingRevisionAdapter.js')
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex')
const optIn=process.env.ASSPS_PHASE3G_REAL_PG==='DISPOSABLE_CLUSTER_PORT_55439'
const source=(school,id,marks,status='DRAFT')=>({
 id,school_id:school,status,createdAt:'2026-10-02T01:00:00.000Z',
 sourcePaperId:'SYNTHETIC-ONLY-NOT-AN-ASSPS-STUDENT',config:{marks,subject:'Science'}})
const str=o=>JSON.stringify(o)
const gate=Object.freeze({
 // THESE ARE TEST FIXTURES and DO NOT MEAN REAL USER PAPER/BACKUP SIGNOFF.
 targetEnvironment:'ASSPS_ISOLATED_STAGING',confirmedNotProduction:true,
 readonlySchemaInventoryReviewed:true,encryptedBackupVerified:true,
 backupRestoreTestPassed:true,serverAuthenticatedSchoolScopeVerified:true,
 twoSchoolIsolationTestPassed:true,originalApprovedVisualEvidenceIndependentlyReviewed:true,
})
function validateDsn(raw,expectedDb,expectedUser){
 if(!raw)throw new Error('Explicit ephemeral DSN required (never use generic DATABASE_URL).')
 const u=new URL(raw)
 if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!=='127.0.0.1'||
  u.port!=='55439'||u.pathname!=='/'+expectedDb||
  u.username!==expectedUser||!u.password)
  throw new Error('Refusing non-ephemeral host, port, database or expected test role.')
 return raw
}
if(!optIn){
 test('REAL PG Phase3G tests explicitly SKIPPED without isolated opt-in; no connection attempted',{
  skip:'Set isolated ephemeral cluster opt-in only in synthetic provisioner; never touch port 5432.'},()=>{})
}else{
 const {Client,Pool}=require('pg')
 const adminUrl=validateDsn(process.env.ASSPS_PHASE3G_ADMIN_URL,
  'assps_paper_phase3f_ci','assps_p3g_admin')
 const appUrl=validateDsn(process.env.ASSPS_PHASE3G_APP_URL,
  'assps_paper_phase3f_ci','assps_p3g_app')
 const admin=new Client({connectionString:adminUrl,connectionTimeoutMillis:4000})
 const pool=new Pool({connectionString:appUrl,max:4,connectionTimeoutMillis:3000})
 const state={seed51:null,seed52:null,concurrent:null}
 async function syntheticSeed({school,owner,id,fromMarks,toMarks,status='DRAFT',
  sourceProtected=false}){
  const v1=str(source(school,id,fromMarks,status)),hash1=sha(v1)
  const v2=toMarks===null?v1:str(source(school,id,toMarks,status))
  const hash2=sha(v2)
  await admin.query('INSERT INTO public.paper_documents (school_id,id,created_by,status,source_protected,revision,native_json_text,native_sha256,updated_by) VALUES ($1,$2,$3,$4,$5,1,$6,$7,$3)',[
   school,id,owner,status,sourceProtected,v1,hash1])
  await admin.query("INSERT INTO public.paper_revisions (school_id,document_id,revision,native_json_text,native_sha256,previous_native_sha256,actor_id,change_kind) VALUES ($1,$2,1,$3,$4,NULL,$5,'INITIAL_SEED')",[
   school,id,v1,hash1,owner])
  if(toMarks!==null){
   await admin.query('UPDATE public.paper_documents SET native_json_text=$1,native_sha256=$2,revision=2,updated_by=$3 WHERE school_id=$4 AND id=$5',[
    v2,hash2,owner,school,id])
   await admin.query("INSERT INTO public.paper_revisions (school_id,document_id,revision,native_json_text,native_sha256,previous_native_sha256,actor_id,change_kind) VALUES ($1,$2,2,$3,$4,$5,$6,'DRAFT_CAS_REVISION')",[
    school,id,v2,hash2,hash1,owner])
  }
  return {id,school,owner,revision:toMarks===null?1:2,
   nativeJsonText:v2,nativeSha256:hash2}
 }
 before(async()=>{
  await admin.connect()
  const checks=await admin.query(
   "SELECT current_database() AS db, current_user AS who,inet_server_port() AS port,host(inet_server_addr()) AS host")
  assert.deepEqual(checks.rows[0],{
   db:'assps_paper_phase3f_ci',who:'assps_p3g_admin',port:55439,host:'127.0.0.1'})
  const count=await admin.query(
   "SELECT COUNT(*)::integer AS n FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('paper_documents','paper_revisions')")
  assert.equal(count.rows[0].n,2)
  await admin.query('BEGIN')
  try{
   await admin.query('INSERT INTO public.schools (id) VALUES (51),(52)')
   await admin.query('INSERT INTO public.users (id,school_id) VALUES (11,51),(12,52)')
   state.seed51=await syntheticSeed({school:51,owner:11,id:'draft-001',fromMarks:40,toMarks:50})
   state.seed52=await syntheticSeed({school:52,owner:12,id:'draft-001',fromMarks:41,toMarks:51})
   await syntheticSeed({school:51,owner:11,id:'approved-001',fromMarks:60,toMarks:null,
    status:'APPROVED',sourceProtected:true})
   state.concurrent=await syntheticSeed({school:51,owner:11,id:'concurrent-001',
    fromMarks:30,toMarks:null})
   await admin.query('COMMIT')
  }catch(e){await admin.query('ROLLBACK').catch(()=>{});throw e}
 })
 after(async()=>{await pool.end().catch(()=>{});await admin.end().catch(()=>{})})
 test('REAL database catalog has forced RLS, safe role, strict policy, exact source TEXT and composite same-school keys',async()=>{
  const client=await pool.connect()
  try{
   const roles=(await client.query(
    "SELECT rolsuper,rolbypassrls,has_table_privilege(current_user,to_regclass('public.paper_revisions'),'UPDATE') AS revisions_can_update,has_table_privilege(current_user,to_regclass('public.paper_revisions'),'DELETE') AS revisions_can_delete FROM pg_catalog.pg_roles WHERE rolname=current_user")).rows
   assert.equal(roles.length,1)
   // One physical pg Client: run catalog queries SEQUENTIALLY (pg@9 forbids overlapping client.query).
   const relations=await client.query("SELECT n.nspname AS schema_name,c.relname AS table_name,c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS force_rls,c.relkind AS relation_kind FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('paper_documents','paper_revisions')")
   const columns=await client.query("SELECT table_schema,table_name,column_name,is_nullable,udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('paper_documents','paper_revisions')")
   const constraints=await client.query("SELECT con.conrelid::regclass::text AS table_name,con.contype AS constraint_type,pg_get_constraintdef(con.oid) AS definition FROM pg_catalog.pg_constraint con WHERE con.conrelid IN (to_regclass('public.paper_documents'),to_regclass('public.paper_revisions'))")
   const policies=await client.query("SELECT schemaname,tablename,policyname,permissive,cmd,qual,with_check FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename IN ('paper_documents','paper_revisions')")
   const roleFlags={rolsuper:roles[0].rolsuper,rolbypassrls:roles[0].rolbypassrls,
    revisionsCanUpdate:roles[0].revisions_can_update,revisionsCanDelete:roles[0].revisions_can_delete}
   const audit=auditPaperStagingRls({relations:relations.rows,columns:columns.rows,
    constraints:constraints.rows,policies:policies.rows,roleFlags})
   assert.deepEqual(audit.findings,[],JSON.stringify(audit.findings))
   assert.equal(audit.schemaEligibleForManualReview,true)
   assert.equal(audit.approved,false)
   assert.equal(audit.authorizesSqlExecution,false)
  }finally{client.release()}
 })
 test('REAL forced RLS: no app.paper_school_id shows ZERO rows; each scoped user sees ONLY its own school even with identical ID',async()=>{
  const client=await pool.connect()
  try{
   await client.query('BEGIN')
   assert.equal((await client.query('SELECT COUNT(*)::integer AS n FROM paper_documents')).rows[0].n,0)
   assert.equal((await client.query('SELECT COUNT(*)::integer AS n FROM paper_revisions')).rows[0].n,0)
   await client.query(SQL.setLocalSchool,['51'])
   const visible=(await client.query('SELECT school_id,id FROM paper_documents ORDER BY id')).rows
   assert.ok(visible.length>=3)
   assert.ok(visible.every(r=>r.school_id===51))
   assert.equal((await client.query("SELECT COUNT(*)::integer AS n FROM paper_documents WHERE school_id=52 AND id='draft-001'")).rows[0].n,0)
   await client.query('ROLLBACK')
   await client.query('BEGIN')
   assert.equal((await client.query('SELECT COUNT(*)::integer AS n FROM paper_documents')).rows[0].n,0,
    'Transaction-local school context must RESET automatically after rollback.')
   await client.query(SQL.setLocalSchool,['52'])
   const own=(await client.query('SELECT school_id,id FROM paper_documents')).rows
   assert.deepEqual(own,[{school_id:52,id:'draft-001'}])
   await client.query('ROLLBACK')
  }finally{await client.query('ROLLBACK').catch(()=>{});client.release()}
 })
 test('REAL cross-school audit insertion fails through strict RLS or independent trigger; approval mutation privilege absent',async()=>{
  const client=await pool.connect()
  try{
   await client.query('BEGIN')
   await client.query(SQL.setLocalSchool,['51'])
   await assert.rejects(()=>client.query("UPDATE paper_documents SET status='APPROVED' WHERE school_id=51 AND id='draft-001'"),
    /permission denied/u)
   await client.query('ROLLBACK')
   await client.query('BEGIN')
   await client.query(SQL.setLocalSchool,['51'])
   await assert.rejects(()=>client.query(
    "INSERT INTO paper_revisions(school_id,document_id,revision,native_json_text,native_sha256,previous_native_sha256,actor_id,change_kind) VALUES (52,'draft-001',4,'{}',$1,$2,12,'DRAFT_CAS_REVISION')",
    [sha('{}'),'a'.repeat(64)]),/row-level security|violates|revision must match exact current school-scoped document/u)
   await client.query('ROLLBACK')
  }finally{await client.query('ROLLBACK').catch(()=>{});client.release()}
 })
 test('REAL SERIALIZABLE CAS commits school 51 v2->v3 without changing separate school 52 copy or reference paper',async()=>{
  const next=str({...source(51,'draft-001',55),config:{marks:55,subject:'Science'}})
  const r=await appendStagingDraftRevision({connect:()=>pool.connect(),gate,
   actor:{id:11,role:'teacher',school_id:51},paperId:'draft-001',
   expectedRevision:2,expectedNativeSha256:state.seed51.nativeSha256,
   proposedNativeJsonText:next})
  assert.equal(r.revision,3)
  assert.equal(r.nativeSha256,sha(next))
  assert.equal(r.approvalGranted,false)
  const rows=(await admin.query("SELECT school_id,revision,native_json_text FROM public.paper_documents WHERE id='draft-001' ORDER BY school_id")).rows
  assert.equal(rows[0].school_id,51);assert.equal(rows[0].revision,3)
  assert.equal(rows[0].native_json_text,next)
  assert.equal(rows[1].school_id,52);assert.equal(rows[1].revision,2)
  assert.equal(rows[1].native_json_text,state.seed52.nativeJsonText)
  const copies=(await admin.query("SELECT revision,native_sha256,previous_native_sha256 FROM paper_revisions WHERE school_id=51 AND document_id='draft-001' ORDER BY revision")).rows
  assert.deepEqual(copies.map(x=>x.revision),[1,2,3])
  assert.equal(copies[2].previous_native_sha256,state.seed51.nativeSha256)
  const approved=(await admin.query("SELECT status,source_protected,revision FROM paper_documents WHERE school_id=51 AND id='approved-001'")).rows[0]
  assert.deepEqual(approved,{status:'APPROVED',source_protected:true,revision:1})
 })
 test('REAL revision stale retry blocked; independently scoped school 52 can advance its SAME paperId',async()=>{
  await assert.rejects(()=>appendStagingDraftRevision({connect:()=>pool.connect(),gate,
   actor:{id:11,role:'teacher',school_id:51},paperId:'draft-001',
   expectedRevision:2,expectedNativeSha256:state.seed51.nativeSha256,
   proposedNativeJsonText:str(source(51,'draft-001',70))}),/revision conflict|serialize/u)
  const other=await appendStagingDraftRevision({connect:()=>pool.connect(),gate,
   actor:{id:12,role:'teacher',school_id:52},paperId:'draft-001',
   expectedRevision:2,expectedNativeSha256:state.seed52.nativeSha256,
   proposedNativeJsonText:str(source(52,'draft-001',58))})
  assert.equal(other.schoolId,52)
  const rows=(await admin.query("SELECT school_id,revision FROM paper_documents WHERE id='draft-001' ORDER BY school_id")).rows
  assert.deepEqual(rows,[{school_id:51,revision:3},{school_id:52,revision:3}])
 })
 test('REAL competing SERIALIZABLE writers cannot both append the same v2 revision',async()=>{
  const common={connect:()=>pool.connect(),gate,
   actor:{id:11,role:'teacher',school_id:51},paperId:'concurrent-001',
   expectedRevision:1,expectedNativeSha256:state.concurrent.nativeSha256}
  const results=await Promise.allSettled([
   appendStagingDraftRevision({...common,proposedNativeJsonText:str(source(51,'concurrent-001',35))}),
   appendStagingDraftRevision({...common,proposedNativeJsonText:str(source(51,'concurrent-001',36))}),
  ])
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1,JSON.stringify(results))
  assert.equal(results.filter(r=>r.status==='rejected').length,1)
  assert.equal((await admin.query("SELECT COUNT(*)::integer AS n FROM paper_revisions WHERE school_id=51 AND document_id='concurrent-001' AND revision=2")).rows[0].n,1)
  assert.equal((await admin.query("SELECT revision FROM paper_documents WHERE school_id=51 AND id='concurrent-001'")).rows[0].revision,2)
 })
 test('REAL approved source stays immutable; database trigger denies direct UPDATE or DELETE of audit chain',async()=>{
  const sourceRef=(await admin.query("SELECT native_json_text,native_sha256,revision FROM paper_documents WHERE school_id=51 AND id='approved-001'")).rows[0]
  await assert.rejects(()=>appendStagingDraftRevision({connect:()=>pool.connect(),gate,
   actor:{id:11,role:'teacher',school_id:51},paperId:'approved-001',
   expectedRevision:1,expectedNativeSha256:sourceRef.native_sha256,
   proposedNativeJsonText:str(source(51,'approved-001',75,'APPROVED'))}),/Only independent DRAFT/u)
  await assert.rejects(()=>admin.query("UPDATE paper_revisions SET actor_id=12 WHERE school_id=51 AND document_id='draft-001' AND revision=1"),/append-only/u)
  await assert.rejects(()=>admin.query("DELETE FROM paper_revisions WHERE school_id=51 AND document_id='draft-001' AND revision=1"),/append-only/u)
  const afterSource=(await admin.query("SELECT native_json_text,native_sha256,revision FROM paper_documents WHERE school_id=51 AND id='approved-001'")).rows[0]
  assert.deepEqual(afterSource,sourceRef)
 })
}

// OPTIONAL real PostgreSQL catalog gate: READ-ONLY, isolated loopback staging ONLY.
// NO env opt-in = explicit SKIP; never import the active app database pool or migrations.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {auditPaperStagingRls}=require('../services/papers/paperStagingRlsAudit.js')
const optIn=process.env.ASSPS_PHASE3F_READONLY_PG==='YES_ISOLATED_STAGING_READONLY'
const connectionString=process.env.ASSPS_PHASE3F_STAGING_PG_URL||''
test('optional REAL isolated PostgreSQL structural catalog check (no DB writes, no secrets printed)',{
 skip:!optIn||!connectionString?'No explicitly authorized isolated staging DSN+opt-in; DB NOT contacted.':false,
 timeout:12000,
},async()=>{
 const target=new URL(connectionString)
 if(!['postgres:','postgresql:'].includes(target.protocol)||
  !['localhost','127.0.0.1','[::1]'].includes(target.hostname)||
  target.pathname!=='/assps_paper_phase3f_ci')
  throw new Error('Refusing non-loopback or non-ephemeral exact-name staging database BEFORE connection.')
 // Must be invoked with a tunnel or separately provisioned local DB; never use config/database.js.
 const {Client}=require('pg')
 const client=new Client({connectionString,connectionTimeoutMillis:1500,
  query_timeout:5000,statement_timeout:5000,application_name:'assps_phase3f_readonly_catalog'})
 let begun=false
 try{
  await client.connect()
  await client.query('BEGIN TRANSACTION READ ONLY')
  begun=true
  await client.query("SET LOCAL statement_timeout = '5s'")
  await client.query("SET LOCAL lock_timeout = '1s'")
  const ident=await client.query('SELECT current_database() AS database_name')
  assert.equal(ident.rows[0]?.database_name,'assps_paper_phase3f_ci','Database name recheck after connect required.')
  const relations=(await client.query(
   "SELECT n.nspname AS schema_name,c.relname AS table_name,c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS force_rls,c.relkind AS relation_kind FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('paper_documents','paper_revisions')")).rows
  const columns=(await client.query(
   "SELECT table_schema,table_name,column_name,is_nullable,udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('paper_documents','paper_revisions')")).rows
  const constraints=(await client.query(
   "SELECT con.conrelid::regclass::text AS table_name,con.contype AS constraint_type,pg_get_constraintdef(con.oid) AS definition FROM pg_catalog.pg_constraint con WHERE con.conrelid IN (to_regclass('public.paper_documents'),to_regclass('public.paper_revisions'))")).rows
  const policies=(await client.query(
   "SELECT schemaname,tablename,policyname,permissive,cmd,qual,with_check FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename IN ('paper_documents','paper_revisions')")).rows
  const roles=(await client.query(
   "SELECT rol.rolsuper,rol.rolbypassrls,COALESCE(has_table_privilege(current_user,to_regclass('public.paper_revisions'),'UPDATE'),true) AS revisions_can_update,COALESCE(has_table_privilege(current_user,to_regclass('public.paper_revisions'),'DELETE'),true) AS revisions_can_delete FROM pg_catalog.pg_roles rol WHERE rol.rolname=current_user")).rows
  assert.equal(roles.length,1,'Unverified inspection role.')
  const roleFlags={rolsuper:roles[0].rolsuper,rolbypassrls:roles[0].rolbypassrls,
   revisionsCanUpdate:roles[0].revisions_can_update,
   revisionsCanDelete:roles[0].revisions_can_delete}
  const result=auditPaperStagingRls({relations,columns,constraints,policies,roleFlags})
  assert.equal(result.authorizesSqlExecution,false)
  assert.equal(result.approved,false)
  assert.equal(result.schemaEligibleForManualReview,true,
   'Real staging catalog is not structurally safe; review report under restricted access, DO NOT apply migration.')
  // Intentionally do NOT print source data, hostname, DSN, users, hashes or school records.
  console.log('PHASE3F_READONLY_PG_METADATA=CANDIDATE_FOR_INDEPENDENT_REVIEW_ONLY')
 }finally{
  if(begun)try{await client.query('ROLLBACK')}catch{ /* never claim a verified rollback if transport failed */ }
  await client.end().catch(()=>{})
 }
})

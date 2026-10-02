// REAL PostgreSQL 18 two INDEPENDENT newly initialized clusters, not merely 2 DBs
// in one cluster. Only fictional schools/papers. Fresh restore rotates login secrets.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createHash}=require('node:crypto')
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const selected=process.env.ASSPS_PHASE3J_REAL_PG==='EXPLICIT_TWO_NEW_CLUSTERS_55442_55443'
function exactUrl(value,role,port,db){
 if(!value)throw new Error('Explicit generated fictional-only DSN required.')
 const u=new URL(value)
 if(!['postgres:','postgresql:'].includes(u.protocol)||
  u.hostname!=='127.0.0.1'||u.port!==String(port)||
  u.pathname!=='/'+db||u.username!==role||!u.password)
  throw new Error('Refuse non-independent synthetic cluster, DB or authenticated role.')
 return value
}
if(!selected){
 test('REAL cross-cluster GLOBAL ROLES recovery explicitly SKIPPED without opt-in',{
  skip:'Do not connect to installed localhost 5432 or actual ASSPS data.'},()=>{})
}else{
 const {Client}=require('pg')
 const source=new Client({connectionString:exactUrl(process.env.ASSPS_PHASE3J_SOURCE_ADMIN_URL,
  'assps_p3g_admin',55442,'assps_paper_phase3j_ci'),connectionTimeoutMillis:3000})
 const target=new Client({connectionString:exactUrl(process.env.ASSPS_PHASE3J_TARGET_ADMIN_URL,
  'assps_p3j_restore_admin',55443,'assps_paper_phase3j_restore_ci'),connectionTimeoutMillis:3000})
 const target51=new Client({connectionString:exactUrl(process.env.ASSPS_PHASE3J_TARGET_51_URL,
  'assps_p3h_school51',55443,'assps_paper_phase3j_restore_ci'),connectionTimeoutMillis:3000})
 const target52=new Client({connectionString:exactUrl(process.env.ASSPS_PHASE3J_TARGET_52_URL,
  'assps_p3h_school52',55443,'assps_paper_phase3j_restore_ci'),connectionTimeoutMillis:3000})
 const old51=new Client({connectionString:exactUrl(process.env.ASSPS_PHASE3J_OLD_51_ON_TARGET_URL,
  'assps_p3h_school51',55443,'assps_paper_phase3j_restore_ci'),connectionTimeoutMillis:3000})
 const tableRows=async(client,name,order)=>(await client.query(
  'SELECT * FROM public.'+name+' ORDER BY '+order)).rows
 test('REAL independently created cluster restores db + global role ownership, ACL, native SHA, RLS and rotated secrets',{timeout:20000},async()=>{
  try{
   await source.connect();await target.connect()
   const [one,two]=await Promise.all([
    source.query('SELECT current_database() AS db,session_user AS who,inet_server_port() AS port,host(inet_server_addr()) AS ip'),
    target.query('SELECT current_database() AS db,session_user AS who,inet_server_port() AS port,host(inet_server_addr()) AS ip')
   ])
   assert.deepEqual(one.rows[0],{db:'assps_paper_phase3j_ci',who:'assps_p3g_admin',
    port:55442,ip:'127.0.0.1'})
   assert.deepEqual(two.rows[0],{db:'assps_paper_phase3j_restore_ci',who:'assps_p3j_restore_admin',
    port:55443,ip:'127.0.0.1'})
   for(const [table,order] of [
    ['schools','id'],['users','id'],['paper_role_school_bindings','school_id'],
    ['paper_documents','school_id,id'],
    ['paper_revisions','school_id,document_id,revision']
   ]){
    const x=await tableRows(source,table,order)
    const y=await tableRows(target,table,order)
    assert.ok(x.length>0,table+' fictional source must be non-empty')
    assert.deepEqual(y,x,'Real independent CLUSTER restore changed synthetic table: '+table)
    if(table==='paper_documents'||table==='paper_revisions')
     for(const row of y)assert.equal(row.native_sha256,sha(row.native_json_text),
      'Every source-native UTF-8 TEXT digest must survive fresh-cluster restore.')
   }
   // Source/target pg_authid are DISTINCT physical cluster-global catalogs.
   const roles="SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_catalog.pg_roles WHERE rolname IN ('assps_p3g_admin','assps_p3g_app','assps_p3h_school51','assps_p3h_school52','assps_p3i_identity_owner') ORDER BY rolname"
   const aRoles=(await source.query(roles)).rows,bRoles=(await target.query(roles)).rows
   assert.equal(aRoles.length,5)
   assert.deepEqual(bRoles,aRoles,'Actual GLOBAL role privileges lost across separate cluster.')
   const noLogin=bRoles.find(x=>x.rolname==='assps_p3i_identity_owner')
   assert.deepEqual({login:noLogin.rolcanlogin,superuser:noLogin.rolsuper,bypass:noLogin.rolbypassrls},
    {login:false,superuser:false,bypass:false})
   const member="SELECT member::regrole::text AS member,roleid::regrole::text AS grant_role FROM pg_catalog.pg_auth_members WHERE member IN (SELECT oid FROM pg_catalog.pg_roles WHERE rolname IN ('assps_p3h_school51','assps_p3h_school52','assps_p3i_identity_owner')) ORDER BY 1,2"
   assert.deepEqual((await target.query(member)).rows,(await source.query(member)).rows)
   const owner="SELECT pg_get_userbyid(proowner) AS owner,prosecdef,proconfig FROM pg_catalog.pg_proc WHERE oid='public.phase3h_session_school_id()'::regprocedure"
   const ownerSource=(await source.query(owner)).rows[0],ownerTarget=(await target.query(owner)).rows[0]
   assert.deepEqual(ownerTarget,ownerSource)
   assert.equal(ownerTarget.owner,'assps_p3i_identity_owner')
   assert.equal(ownerTarget.prosecdef,true)
   const acl="SELECT has_table_privilege('assps_p3i_identity_owner','public.paper_documents','SELECT') AS paper_read,has_table_privilege('assps_p3i_identity_owner','public.paper_role_school_bindings','SELECT') AS broad_map_read,has_column_privilege('assps_p3i_identity_owner','public.paper_role_school_bindings','login_role','SELECT') AS name_read,has_column_privilege('assps_p3i_identity_owner','public.paper_role_school_bindings','school_id','SELECT') AS scope_read,has_table_privilege('assps_p3h_school51','public.paper_revisions','UPDATE') AS audit_write"
   const srcAcl=(await source.query(acl)).rows[0],dstAcl=(await target.query(acl)).rows[0]
   assert.deepEqual(dstAcl,srcAcl)
   assert.deepEqual(dstAcl,{paper_read:false,broad_map_read:false,name_read:true,
    scope_read:true,audit_write:false})
   const policies="SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename IN ('paper_documents','paper_revisions') ORDER BY tablename"
   assert.deepEqual((await target.query(policies)).rows,(await source.query(policies)).rows)
   const force="SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_catalog.pg_class WHERE relname IN ('paper_documents','paper_revisions') ORDER BY relname"
   const flags=(await target.query(force)).rows
   assert.equal(flags.length,2)
   assert.ok(flags.every(x=>x.relrowsecurity&&x.relforcerowsecurity))
   const t=(await target.query("SELECT COUNT(*)::integer AS n FROM pg_catalog.pg_trigger WHERE tgrelid='public.paper_revisions'::regclass AND NOT tgisinternal")).rows[0]
   assert.equal(t.n,2,'Immutable and validated append must survive independent cluster.')
   // pg_dumpall --no-role-passwords MUST NOT copy source secrets to new cluster.
   // Independently rotated target school login secrets must work; old source PW must not.
   await assert.rejects(()=>old51.connect(),/password authentication failed|authentication failed/u)
   await target51.connect();await target52.connect()
   const [a,b]=await Promise.all([
    target51.query('SELECT session_user AS login,public.phase3h_session_school_id() AS school'),
    target52.query('SELECT session_user AS login,public.phase3h_session_school_id() AS school')
   ])
   assert.deepEqual(a.rows[0],{login:'assps_p3h_school51',school:51})
   assert.deepEqual(b.rows[0],{login:'assps_p3h_school52',school:52})
   await target51.query('BEGIN')
   await target51.query("SELECT set_config('app.paper_school_id','52',true)")
   const visible=(await target51.query('SELECT school_id FROM public.paper_documents')).rows
   assert.ok(visible.length>0&&visible.every(row=>row.school_id===51),
    'Restored independent-cluster RLS must still ignore forged tenant GUC.')
   await target51.query('ROLLBACK')
   console.log('PHASE3J_REAL_INDEPENDENT_TWO_CLUSTER_GLOBAL_ROLE_RECOVERY=PASS')
  }finally{
   await target51.query('ROLLBACK').catch(()=>{})
   await Promise.all([old51.end().catch(()=>{}),target51.end().catch(()=>{}),
    target52.end().catch(()=>{}),source.end().catch(()=>{}),target.end().catch(()=>{})])
  }
 })
}

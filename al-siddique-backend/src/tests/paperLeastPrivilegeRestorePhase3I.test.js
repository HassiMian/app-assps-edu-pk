// Separate REAL synthetic role-bound restore verification. Never accepts active school DB DSN.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createHash}=require('node:crypto')
const opt=process.env.ASSPS_PHASE3I_REAL_PG==='EXPLICIT_SYNTHETIC_ROLE_BOUND_55441'
const sha=t=>createHash('sha256').update(t,'utf8').digest('hex')
function url(raw,db,role){
 if(!raw)throw new Error('Explicit generated synthetic-only DSN missing.')
 const u=new URL(raw)
 if(u.hostname!=='127.0.0.1'||u.port!=='55441'||u.pathname!=='/'+db||
  u.username!==role||!u.password)throw new Error('Refuse non-disposable RESTORE endpoint.')
 return raw
}
if(!opt){
 test('Role-bound real restore is SKIPPED unless fresh synthetic cluster explicit opt-in',{
  skip:'Never contact existing installed PostgreSQL service.'},()=>{})
}else{
 const {Client}=require('pg')
 const a=new Client({connectionString:url(process.env.ASSPS_PHASE3I_ADMIN_URL,
  'assps_paper_phase3i_ci','assps_p3g_admin'),connectionTimeoutMillis:3000})
 const b=new Client({connectionString:url(process.env.ASSPS_PHASE3I_RESTORE_URL,
  'assps_paper_phase3i_restore_ci','assps_p3g_admin'),connectionTimeoutMillis:3000})
 const login51=new Client({connectionString:url(process.env.ASSPS_PHASE3I_RESTORE_51_URL,
  'assps_paper_phase3i_restore_ci','assps_p3h_school51'),connectionTimeoutMillis:3000})
 test('REAL separate database restore preserves ALL synthetic rows, native SHA, identity binding, RLS, function and audit triggers',{timeout:15000},async()=>{
  try{
   await a.connect();await b.connect();await login51.connect()
   const names=await Promise.all([a.query('SELECT current_database() AS db'),
    b.query('SELECT current_database() AS db')])
   assert.deepEqual(names.map(x=>x.rows[0].db),['assps_paper_phase3i_ci','assps_paper_phase3i_restore_ci'])
   const tables=[['schools','id'],['users','id'],
    ['paper_role_school_bindings','school_id'],
    ['paper_documents','school_id,id'],['paper_revisions','school_id,document_id,revision']]
   for(const [table,order] of tables){
    const query='SELECT * FROM public.'+table+' ORDER BY '+order
    const src=(await a.query(query)).rows,restored=(await b.query(query)).rows
    assert.ok(src.length>0,table+' synthetic fixture must be present.')
    assert.deepEqual(restored,src,'Byte-exact row/column mismatch after restore: '+table)
    if(['paper_documents','paper_revisions'].includes(table))
     for(const row of restored)assert.equal(row.native_sha256,sha(row.native_json_text))
   }
   const catalog="SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('paper_documents','paper_revisions') ORDER BY tablename"
   const [srcP,dstP]=await Promise.all([a.query(catalog),b.query(catalog)])
   assert.equal(srcP.rows.length,2)
   assert.deepEqual(dstP.rows,srcP.rows,'Strict role-bound RLS must survive archive/restore.')
   const def="SELECT pg_get_functiondef('public.phase3h_session_school_id()'::regprocedure) AS ddl"
   assert.deepEqual((await b.query(def)).rows,(await a.query(def)).rows,
    'Trusted login-role binding function changed after restore.')
   const metadata="SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname IN ('paper_documents','paper_revisions') ORDER BY relname"
   const r=(await b.query(metadata)).rows
   assert.equal(r.length,2)
   assert.ok(r.every(x=>x.relrowsecurity&&x.relforcerowsecurity))
   const trigger=(await b.query("SELECT COUNT(*)::integer AS n FROM pg_trigger WHERE tgrelid='public.paper_revisions'::regclass AND NOT tgisinternal")).rows[0].n
   assert.equal(trigger,2)
   const leastPrivilege=(await b.query("SELECT pg_get_userbyid(proowner) AS owner,prosecdef FROM pg_catalog.pg_proc WHERE oid='public.phase3h_session_school_id()'::regprocedure")).rows[0]
   assert.deepEqual(leastPrivilege,{owner:'assps_p3i_identity_owner',prosecdef:true},
    'Restored trusted function must NOT revert to privileged administrator ownership.')
   const role=(await b.query("SELECT rolcanlogin,rolsuper,rolbypassrls FROM pg_catalog.pg_roles WHERE rolname='assps_p3i_identity_owner'")).rows[0]
   assert.deepEqual(role,{rolcanlogin:false,rolsuper:false,rolbypassrls:false})
   const grant=(await b.query("SELECT has_table_privilege('assps_p3i_identity_owner','public.paper_role_school_bindings','SELECT') AS map_table_read,has_column_privilege('assps_p3i_identity_owner','public.paper_role_school_bindings','login_role','SELECT') AS login_column_read,has_column_privilege('assps_p3i_identity_owner','public.paper_role_school_bindings','school_id','SELECT') AS school_column_read,has_table_privilege('assps_p3i_identity_owner','public.paper_documents','SELECT') AS paper_read")).rows[0]
   assert.deepEqual(grant,{map_table_read:false,login_column_read:true,school_column_read:true,paper_read:false})
   const binding=(await login51.query("SELECT session_user AS login,public.phase3h_session_school_id() AS school")).rows[0]
   assert.deepEqual(binding,{login:'assps_p3h_school51',school:51})
   await login51.query('BEGIN')
   await login51.query("SELECT set_config('app.paper_school_id','52',true)")
   const visible=(await login51.query('SELECT school_id FROM public.paper_documents')).rows
   assert.ok(visible.length>0&&visible.every(x=>x.school_id===51),
    'Restored RLS must STILL resist an adversarial forged tenant GUC.')
   await login51.query('ROLLBACK')
   console.log('PHASE3H_RESTORE=EXACT_SYNTHETIC_NATIVE_SHA_ROLE_BINDING_RLS_TRIGGERS')
  }finally{
   await login51.query('ROLLBACK').catch(()=>{})
   await Promise.all([a.end().catch(()=>{}),b.end().catch(()=>{}),login51.end().catch(()=>{})])
  }
 })
}

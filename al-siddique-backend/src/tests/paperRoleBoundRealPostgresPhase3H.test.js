// REAL PostgreSQL adversarial isolation only inside NEW throwaway 127.0.0.1:55440 test cluster.
// No app/database.js, live localhost:5432, student data, genuine school paper or deployment.
const {test,before,after}=require('node:test')
const assert=require('node:assert/strict')
const {createHash}=require('node:crypto')
const {appendRoleBoundStagingDraftRevision,ROLE_BOUND_ID_SQL}
 =require('../services/papers/paperRoleBoundStagingGateway.js')
const sha=t=>createHash('sha256').update(t,'utf8').digest('hex')
const opt=process.env.ASSPS_PHASE3H_REAL_PG==='EXPLICIT_SYNTHETIC_ROLE_BOUND_55440'
const login=(raw,name,role)=>{
 if(!raw)throw new Error('Explicit generated DISPOSABLE DSN is required.')
 const u=new URL(raw)
 if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!=='127.0.0.1'||
  u.port!=='55440'||u.pathname!=='/'+name||u.username!==role||!u.password)
  throw new Error('Refuse non-ephemeral PostgreSQL target or mismatched authenticated login.')
 return raw
}
const gate=Object.freeze({
 // These are synthetic-only MOCK SIGNOFF FLAGS to exercise dormant logic.
 // They MUST NEVER be interpreted as a principal's actual evidence/backup approval.
 targetEnvironment:'ASSPS_ISOLATED_STAGING',confirmedNotProduction:true,
 readonlySchemaInventoryReviewed:true,encryptedBackupVerified:true,
 backupRestoreTestPassed:true,serverAuthenticatedSchoolScopeVerified:true,
 twoSchoolIsolationTestPassed:true,originalApprovedVisualEvidenceIndependentlyReviewed:true,
})
const src=(school,id,marks,status='DRAFT')=>({
 id,school_id:school,status,createdAt:'2026-10-02T02:00:00.000Z',
 sourcePaperId:'SYNTHETIC_ROLE_BOUND_REFERENCE',
 config:{subject:'Science',totalMarks:marks}})
const txt=v=>JSON.stringify(v)
if(!opt){
 test('REAL school LOGIN identity tests disabled unless disposable cluster opt-in',{
  skip:'No synthetic-only role-bound cluster opt-in; no PostgreSQL access.'},()=>{})
}else{
 const {Client,Pool}=require('pg')
 const admin=new Client({connectionString:login(process.env.ASSPS_PHASE3H_ADMIN_URL,
  'assps_paper_phase3h_ci','assps_p3g_admin'),connectionTimeoutMillis:3000})
 const school51=new Pool({connectionString:login(process.env.ASSPS_PHASE3H_51_URL,
  'assps_paper_phase3h_ci','assps_p3h_school51'),max:3,connectionTimeoutMillis:3000})
 const school52=new Pool({connectionString:login(process.env.ASSPS_PHASE3H_52_URL,
  'assps_paper_phase3h_ci','assps_p3h_school52'),max:3,connectionTimeoutMillis:3000})
 const initial=new Map()
 async function seed(school,owner,id,marks,status='DRAFT',protectedRef=false){
  const native=txt(src(school,id,marks,status)),digest=sha(native)
  await admin.query(
   'INSERT INTO public.paper_documents (school_id,id,created_by,status,source_protected,revision,native_json_text,native_sha256,updated_by) VALUES ($1,$2,$3,$4,$5,1,$6,$7,$3)',
   [school,id,owner,status,protectedRef,native,digest])
  await admin.query(
   "INSERT INTO public.paper_revisions (school_id,document_id,revision,native_json_text,native_sha256,previous_native_sha256,actor_id,change_kind) VALUES ($1,$2,1,$3,$4,NULL,$5,'INITIAL_SEED')",
   [school,id,native,digest,owner])
  const snapshot={school,id,owner,revision:1,native,digest,status}
  initial.set(school+'|'+id,snapshot)
  return snapshot
 }
 const revision=(school,owner,id,digest,marks,pool,extra={})=>
  appendRoleBoundStagingDraftRevision({connect:()=>pool.connect(),gate,
   actor:{id:owner,role:'teacher',school_id:school},paperId:id,
   expectedRevision:extra.expectedRevision??1,
   expectedNativeSha256:digest,proposedNativeJsonText:txt(src(school,id,marks)),...extra})
 before(async()=>{
  await admin.connect()
  const target=(await admin.query(
   "SELECT current_database() AS db,current_user AS who,inet_server_port() AS port,host(inet_server_addr()) AS ip")).rows[0]
  assert.deepEqual(target,{
   db:'assps_paper_phase3h_ci',who:'assps_p3g_admin',port:55440,ip:'127.0.0.1'})
  const roles=(await admin.query("SELECT rolname,rolsuper,rolbypassrls,rolcreaterole FROM pg_roles WHERE rolname IN ('assps_p3h_school51','assps_p3h_school52') ORDER BY rolname")).rows
  assert.equal(roles.length,2)
  assert.ok(roles.every(r=>!r.rolsuper&&!r.rolbypassrls&&!r.rolcreaterole))
  await admin.query('BEGIN')
  try{
   await admin.query('INSERT INTO public.users(id,school_id) VALUES (11,51),(12,52)')
   await seed(51,11,'draft-001',40)
   await seed(52,12,'draft-001',41)
   await seed(51,11,'race-001',30)
   await seed(51,11,'approved-001',60,'APPROVED',true)
   await admin.query('COMMIT')
  }catch(e){await admin.query('ROLLBACK').catch(()=>{});throw e}
 })
 after(async()=>{
  await Promise.all([school51.end().catch(()=>{}),school52.end().catch(()=>{})])
  await admin.end().catch(()=>{})
 })
 test('REAL immutable LOGIN/session_user binds different tenant roles to private school IDs',async()=>{
  for(const [pool,role,school] of [[school51,'assps_p3h_school51',51],
   [school52,'assps_p3h_school52',52]]){
   const c=await pool.connect()
   try{
    const r=(await c.query(
     'SELECT session_user AS login,current_user AS role,public.phase3h_session_school_id() AS trusted_school')).rows[0]
    assert.deepEqual(r,{login:role,role,trusted_school:school})
    assert.equal((await c.query('SELECT COUNT(*)::integer AS n FROM paper_documents')).rows[0].n,
     school===51?3:1)
    assert.equal((await c.query('SELECT COUNT(*)::integer AS n FROM paper_revisions')).rows[0].n,
     school===51?3:1)
   }finally{c.release()}
  }
  // Admin-owned lookup relation itself is inaccessible even to logged-in tenant accounts.
  const c=await school51.connect()
  try{
   await assert.rejects(()=>c.query('SELECT * FROM public.paper_role_school_bindings'),/permission denied/u)
   await assert.rejects(()=>c.query("UPDATE public.paper_role_school_bindings SET school_id=52 WHERE school_id=51"),/permission denied/u)
  }finally{c.release()}
 })
 test('REAL adversarial client can forge GUCs, but RLS stays bound to immutable authenticated SESSION_USER',async()=>{
  const c=await school51.connect()
  try{
   await c.query('BEGIN')
   await c.query("SELECT set_config('app.paper_school_id','52',true)")
   await c.query("SELECT set_config('app.rls_enabled','false',true)")
   await c.query("SELECT set_config('app.is_super_admin','true',true)")
   const ctx=(await c.query('SELECT public.phase3h_session_school_id() AS bound_school')).rows[0]
   assert.equal(ctx.bound_school,51,'Database role binding MUST ignore every forged app.* setting.')
   const rows=(await c.query('SELECT school_id,id FROM paper_documents ORDER BY id')).rows
   assert.ok(rows.length>=3)
   assert.ok(rows.every(r=>r.school_id===51))
   assert.equal((await c.query("SELECT COUNT(*)::integer AS n FROM paper_documents WHERE school_id=52 AND id='draft-001'")).rows[0].n,0)
   assert.equal((await c.query("SELECT COUNT(*)::integer AS n FROM paper_revisions WHERE school_id=52 AND document_id='draft-001'")).rows[0].n,0)
   await c.query('ROLLBACK')
  }finally{await c.query('ROLLBACK').catch(()=>{});c.release()}
 })
 test('REAL login role cannot impersonate other school, admin or SESSION_AUTHORIZATION',async()=>{
  const c=await school51.connect()
  try{
   await assert.rejects(()=>c.query('SET ROLE assps_p3h_school52'),/permission denied|not permitted|must be member/u)
   await assert.rejects(()=>c.query('SET ROLE assps_p3g_admin'),/permission denied|not permitted|must be member/u)
   await assert.rejects(()=>c.query('SET SESSION AUTHORIZATION assps_p3h_school52'),/permission denied|superuser|not permitted/u)
   const same=(await c.query('SELECT session_user AS login,public.phase3h_session_school_id() AS school_id')).rows[0]
   assert.deepEqual(same,{login:'assps_p3h_school51',school_id:51})
  }finally{c.release()}
  const membership=await admin.query("SELECT pg_has_role('assps_p3h_school51','assps_p3h_school52','MEMBER') AS may_cross,pg_has_role('assps_p3h_school51','assps_p3g_admin','MEMBER') AS may_admin")
  assert.deepEqual(membership.rows[0],{may_cross:false,may_admin:false})
 })
 test('REAL CROSS SCHOOL update sees zero rows and wrong-school updated_by is denied by composite FK',async()=>{
  const c=await school51.connect()
  try{
   const update=await c.query("UPDATE paper_documents SET revision=9 WHERE school_id=52 AND id='draft-001'")
   assert.equal(update.rowCount,0,'Cannot mutate even a known other-school identical ID.')
   await assert.rejects(()=>c.query("UPDATE paper_documents SET updated_by=12 WHERE school_id=51 AND id='draft-001'"),
    /foreign key constraint/u)
   const rows=(await admin.query("SELECT school_id,revision,updated_by FROM paper_documents WHERE id='draft-001' ORDER BY school_id")).rows
   assert.deepEqual(rows,[{school_id:51,revision:1,updated_by:11},{school_id:52,revision:1,updated_by:12}])
  }finally{c.release()}
 })
 test('REAL trusted gateway rejects role51 pool with authenticated school52 before BEGIN or paper SELECT',async()=>{
  const queried=[]
  const wrongConnect=async()=>{
   const c=await school51.connect()
   return {query:(sql,params)=>{queried.push(sql);return c.query(sql,params)},
    release:err=>c.release(err)}
  }
  const s=initial.get('52|draft-001')
  await assert.rejects(()=>revision(52,12,'draft-001',s.digest,56,school52,{
   connect:wrongConnect,claimedSchoolId:52}),/LOGIN role is NOT independently bound/)
  assert.deepEqual(queried,[ROLE_BOUND_ID_SQL])
  assert.equal((await admin.query("SELECT revision FROM paper_documents WHERE school_id=52 AND id='draft-001'")).rows[0].revision,1)
 })
 test('REAL separate login-pools permit own school DRAFT CAS but not another, preserving original source',async()=>{
  const a=initial.get('51|draft-001'),b=initial.get('52|draft-001')
  const [x,y]=await Promise.all([
   revision(51,11,'draft-001',a.digest,55,school51),
   revision(52,12,'draft-001',b.digest,56,school52)])
  assert.deepEqual([x.schoolId,x.revision,y.schoolId,y.revision],[51,2,52,2])
  const docs=(await admin.query("SELECT school_id,native_json_text,native_sha256,revision FROM paper_documents WHERE id='draft-001' ORDER BY school_id")).rows
  assert.equal(docs[0].school_id,51);assert.equal(docs[0].revision,2)
  assert.equal(docs[0].native_sha256,sha(docs[0].native_json_text))
  assert.equal(docs[1].school_id,52);assert.equal(docs[1].revision,2)
  assert.equal(docs[1].native_sha256,sha(docs[1].native_json_text))
  const protectedPaper=initial.get('51|approved-001')
  const original=(await admin.query("SELECT native_json_text,native_sha256,status,revision FROM paper_documents WHERE school_id=51 AND id='approved-001'")).rows[0]
  assert.deepEqual(original,{native_json_text:protectedPaper.native,
   native_sha256:protectedPaper.digest,status:'APPROVED',revision:1})
 })
 test('REAL stale writer and SAME ROLE competing SERIALIZABLE writers cannot append duplicate revision',async()=>{
  const s=initial.get('51|draft-001')
  await assert.rejects(()=>revision(51,11,'draft-001',s.digest,70,school51),/revision conflict|serialize/u)
  const race=initial.get('51|race-001')
  const results=await Promise.allSettled([
   revision(51,11,'race-001',race.digest,31,school51),
   revision(51,11,'race-001',race.digest,32,school51)])
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1)
  assert.equal(results.filter(x=>x.status==='rejected').length,1)
  const n=(await admin.query("SELECT COUNT(*)::integer AS n FROM paper_revisions WHERE school_id=51 AND document_id='race-001' AND revision=2")).rows[0].n
  assert.equal(n,1)
 })
 test('REAL strict role-only policy, private mapping and source audit cannot be weakened by app logins',async()=>{
  const p=(await admin.query("SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('paper_documents','paper_revisions') ORDER BY tablename")).rows
  assert.equal(p.length,2)
  for(const row of p){
   assert.equal(row.policyname,'paper_school_role_bound')
   assert.equal(row.cmd,'ALL')
   // pg_policies.roles is PostgreSQL name[]; older pg clients can return its text literal.
   const policyRoles=Array.isArray(row.roles)?row.roles:String(row.roles).replace(/^\{|\}$/gu,'').split(',')
   assert.deepEqual(policyRoles.sort(),['assps_p3h_school51','assps_p3h_school52'])
   assert.match(row.qual,/phase3h_session_school_id/u)
   assert.match(row.with_check,/phase3h_session_school_id/u)
   assert.doesNotMatch(row.qual,/app.paper_school_id|app.rls_enabled|app.is_super_admin/u)
  }
  const func=(await admin.query("SELECT pg_get_functiondef('public.phase3h_session_school_id()'::regprocedure) AS ddl")).rows[0].ddl
  assert.match(func,/session_user/u)
  assert.match(func,/SECURITY DEFINER/u)
  assert.match(func,/SET\s+search_path\s+TO\s+'?pg_catalog'?\s*,\s*'?public'?/iu)
  const c=await school51.connect()
  try{
   await assert.rejects(()=>c.query("UPDATE paper_revisions SET actor_id=12 WHERE school_id=51 AND document_id='draft-001'"),/permission denied/u)
   await assert.rejects(()=>c.query("DELETE FROM paper_revisions WHERE school_id=51 AND document_id='draft-001'"),/permission denied/u)
   await assert.rejects(()=>c.query("UPDATE paper_documents SET status='APPROVED' WHERE school_id=51 AND id='draft-001'"),/permission denied/u)
  }finally{c.release()}
 })
}

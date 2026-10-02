// Phase3U source-contract tests: no PostgreSQL connection, routes, DDL or credentials.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {readFileSync,existsSync}=require('node:fs')
const {join,resolve}=require('node:path')
const root=resolve(__dirname,'../../..')
const dir=join(root,'ops/paper-staging-review')
const sql=readFileSync(join(dir,'phase3u-new-authoring-DISPOSABLE-ONLY.sql'),'utf8')
const runner=readFileSync(join(dir,'phase3u-run-new-authoring-DISPOSABLE-ONLY.ps1'),'utf8')
const native=readFileSync(join(dir,'phase3u-native-smoke-DISPOSABLE-ONLY.ps1'),'utf8')
test('real SQL refuses non-disposable cluster before ANY schema mutation',()=>{
 const firstGuard=sql.indexOf('DO $phase3u_guard$')
 const firstMutation=sql.indexOf('REVOKE CREATE ON SCHEMA public')
 assert.ok(firstGuard>0&&firstGuard<firstMutation)
 for(const phrase of [
  "current_database()<>'assps_paper_phase3u_ci'",
  "current_setting('port')<>'55443'",
  "current_setting('listen_addresses')<>'127.0.0.1'",
  "session_user<>'assps_p3u_admin'",
  "to_regclass('public.schools') IS NOT NULL",
  "to_regclass('public.paper_documents') IS NOT NULL",
  "to_regclass('public.new_authoring_drafts_staging') IS NOT NULL",
  "RAISE EXCEPTION 'PHASE3U REFUSE",
 ])assert.ok(sql.includes(phrase),'missing pristine target check '+phrase)
 assert.doesNotMatch(sql,/\bDROP\s+(?:DATABASE|SCHEMA|TABLE)\b/i)
 assert.doesNotMatch(sql,/\bCREATE\s+TABLE\s+public\.(?:paper_documents|paper_revisions|question_bank)\b/i)
})
test('school and tenant are both bound to immutable session_user, no writable GUC authority',()=>{
 assert.match(sql,/login_role=session_user::name/g)
 for(const identifier of ['phase3t_session_school_id','phase3t_session_tenant_id',
  'phase3u_identity_bindings','assps_p3u_identity_owner'])
  assert.ok(sql.includes(identifier))
 assert.match(sql,/ALTER TABLE public\.phase3u_identity_bindings OWNER TO assps_p3u_identity_owner/)
 assert.match(sql,/REVOKE ALL ON public\.phase3u_identity_bindings FROM PUBLIC/)
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.phase3t_session_school_id\(\) FROM PUBLIC/)
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.phase3t_session_tenant_id\(\) FROM PUBLIC/)
 const active=sql.replace(/^--.*$/gm,'')
 assert.doesNotMatch(active,/current_setting\('app\.(?:paper_school_id|rls_enabled|is_super_admin)'/i)
 assert.doesNotMatch(active,/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)\s+ON\s+public\.phase3u_identity_bindings/i)
})
test('published snapshot is private and held FOR SHARE in the same transaction',()=>{
 assert.match(sql,/CREATE FUNCTION public\.phase3t_lock_published_snapshot\(/)
 assert.match(sql,/VOLATILE SECURITY DEFINER/)
 assert.match(sql,/SET search_path=pg_catalog,public/)
 assert.match(sql,/s\.status='PUBLISHED_APPROVED'/)
 assert.match(sql,/s\.school_id=public\.phase3t_session_school_id\(\)/)
 assert.match(sql,/s\.tenant_id=public\.phase3t_session_tenant_id\(\)/)
 assert.match(sql,/FOR SHARE/)
 assert.match(sql,/ALTER FUNCTION public\.phase3t_lock_published_snapshot\(integer,text,text,integer\)\s+OWNER TO assps_p3u_schema_owner/)
 assert.match(sql,/REVOKE ALL ON public\.new_authoring_approved_snapshots_staging FROM PUBLIC/)
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.phase3t_lock_published_snapshot/)
 assert.doesNotMatch(sql,/GRANT SELECT ON public\.new_authoring_approved_snapshots_staging\s+TO assps_p3t_school/)
})
test('new-authoring drafts and audit are distinct, SHA-bound, source-protected',()=>{
 for(const name of ['new_authoring_approved_snapshots_staging',
  'new_authoring_drafts_staging','new_authoring_revisions_staging']){
  assert.match(sql,new RegExp('CREATE TABLE public\\.'+name))
  assert.match(sql,new RegExp('ALTER TABLE public\\.'+name+
   ' (?:ENABLE|FORCE) ROW LEVEL SECURITY'))
  assert.match(sql,new RegExp('ALTER TABLE public\\.'+name+' FORCE ROW LEVEL SECURITY'))
 }
 assert.ok((sql.match(/native_json_text text NOT NULL CHECK\(octet_length/g)||[]).length>=2)
 assert.ok((sql.match(/sha256\(convert_to\(native_json_text,'UTF8'\)\)/g)||[]).length>=2)
 assert.match(sql,/PRIMARY KEY\(school_id,tenant_id,draft_id\)/)
 assert.match(sql,/PRIMARY KEY\(school_id,tenant_id,draft_id,revision\)/)
 assert.match(sql,/FOREIGN KEY\(school_id,tenant_id,approved_binding_sha256,approved_snapshot_revision\)/)
 assert.match(sql,/sourceIdentity' IS DISTINCT FROM OLD\.native_json_text::jsonb->'sourceIdentity'/)
 assert.match(sql,/sourceLedger' IS DISTINCT FROM OLD\.native_json_text::jsonb->'sourceLedger'/)
 assert.match(sql,/phase3u_revision_immutable/)
 assert.match(sql,/BEFORE UPDATE OR DELETE ON public\.new_authoring_revisions_staging/)
 assert.match(sql,/previous_native_sha256/)
 assert.match(sql,/prior<>NEW\.previous_native_sha256/)
})
test('FORCE RLS covers both school and tenant and excludes audit mutation grants',()=>{
 assert.ok((sql.match(/CREATE POLICY phase3u_school_tenant_scope/g)||[]).length===2)
 assert.ok((sql.match(/USING \(school_id=public\.phase3t_session_school_id\(\)/g)||[]).length>=3)
 assert.ok((sql.match(/AND tenant_id=public\.phase3t_session_tenant_id\(\)/g)||[]).length>=6)
 assert.match(sql,/GRANT SELECT,INSERT ON public\.new_authoring_revisions_staging/)
 assert.doesNotMatch(sql,/GRANT UPDATE(?:\([^)]*\))? ON public\.new_authoring_revisions_staging/i)
 assert.doesNotMatch(sql,/GRANT DELETE ON public\.new_authoring_revisions_staging/i)
 assert.match(sql,/REVOKE CREATE ON SCHEMA public FROM PUBLIC/)
})
test('runner creates its own private PG18 disposable cluster, performs real restore and cleanup',()=>{
 for(const phrase of [
  "RUN_PHASE3U_SYNTHETIC_ONLY","C:\\Program Files\\PostgreSQL\\18\\bin",
  '$port=55443',"'127.0.0.1'","assps_paper_phase3u_ci",
  'Get-NetTCPConnection -LocalPort $port',
  "'.ASSPS_PHASE3U_SELF_CREATED'",'New-RandomSecret',
  'pg_ctl.exe',"-c shared_buffers=32MB",'pg_dump.exe','pg_restore.exe',
  'phase3u-new-authoring-DISPOSABLE-ONLY.sql',
  'phase3u-native-smoke-DISPOSABLE-ONLY.ps1',
  'assps_paper_phase3u_restore_ci',
  'PHASE3U_STOPPED_SELF_CREATED_DB_DATA_CLEANED=true']){
  assert.ok(runner.includes(phrase),'runner prerequisite missing '+phrase)
 }
 assert.match(runner,/Remove-Item -LiteralPath \$data -Recurse -Force/)
 assert.match(runner,/if\(\$stopped -and \(Test-Path -LiteralPath \$marker\)/)
 assert.doesNotMatch(runner.replace(/^\s*#.*$/gm,''),/\bnpm\s+(?:install|ci)\b/i)
 assert.doesNotMatch(runner,/DATABASE_URL|deploy:production|app\.assps\.edu\.pk/)
})
test('native smoke tests real school separation, Urdu bytes, CAS, audit and revocation',()=>{
 for(const phrase of ['phase3t_session_school_id','phase3t_session_tenant_id',
  'phase3t_lock_published_snapshot','app.paper_school_id',
  'new_authoring_drafts_staging','new_authoring_revisions_staging',
  'GetBytes($urdu)','previous_native_sha256',
  "'REVOKED'",'PHASE3U_NATIVE_REAL_PG=PASS']){
  assert.ok(native.includes(phrase),'real smoke contract missing '+phrase)
 }
 assert.match(native,/source ledger mutation allowed/)
 assert.match(native,/audit mutation unexpectedly allowed/)
 assert.match(native,/revoked source update unexpectedly allowed/)
 assert.match(native,/FORCE RLS hides school 51 from school 52/)
 assert.doesNotMatch(native,/DATABASE_URL|production\.db|npm install/i)
})
test('Phase3U SQL is not referenced by production migrations or application routing',()=>{
 const migration=join(root,'al-siddique-backend/src/config/migrations')
 for(const entry of ['phase3u-new-authoring-DISPOSABLE-ONLY.sql',
  'phase3u-run-new-authoring-DISPOSABLE-ONLY.ps1'])
  assert.equal(existsSync(join(migration,entry)),false)
 const gateway=readFileSync(join(root,
  'al-siddique-backend/src/services/papers/newAuthoringDraftGatewayPhase3S.js'),'utf8')
 assert.doesNotMatch(gateway,/require\(['"][^'"]*phase3u/i)
 const paperRoute=readFileSync(join(root,'al-siddique-backend/src/routes/paperRoute.js'),'utf8')
 assert.doesNotMatch(paperRoute,/Phase3U|phase3u|newAuthoringRoleBoundRepositoryPhase3T/)
})

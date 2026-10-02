// Pure source contracts: does not connect to active or disposable PostgreSQL.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const root=path.resolve(__dirname,'../../..')
const ops=path.join(root,'ops/paper-staging-review')
const sql=fs.readFileSync(path.join(ops,'phase3h-role-bound-DISPOSABLE-ONLY.sql'),'utf8')
const runner=fs.readFileSync(path.join(ops,'phase3h-run-role-bound-DISPOSABLE-ONLY.ps1'),'utf8')
test('role binding DDL has hard wrong-target guard BEFORE any mutation, not installed in auto migrations',()=>{
 const guard=sql.indexOf('DO $phase3h_guard$'),firstChange=sql.indexOf('DROP POLICY')
 assert.ok(guard>=0&&guard<firstChange)
 for(const x of [
  "current_database()<>'assps_paper_phase3h_ci'",
  "current_setting('port')<>'55440'",
  "current_setting('listen_addresses')<>'127.0.0.1'",
  "session_user<>'assps_p3g_admin'",
  "to_regclass('public.paper_role_school_bindings') IS NOT NULL",
  'RAISE EXCEPTION','BEGIN;','COMMIT;'
 ])assert.ok(sql.includes(x),'Missing mandatory Phase3H guard: '+x)
 assert.doesNotMatch(sql,/\bDROP\s+(DATABASE|SCHEMA|TABLE)\b/iu)
 assert.equal(fs.existsSync(path.join(root,'al-siddique-backend/src/config/migrations/phase3h-role-bound-DISPOSABLE-ONLY.sql')),false)
})
test('RLS tenant identity is based on immutable session_user private map, never forgeable GUC or permissive legacy OR',()=>{
 for(const x of [
  'paper_role_school_bindings','login_role NAME PRIMARY KEY',
  'school_id INTEGER NOT NULL UNIQUE REFERENCES public.schools(id)',
  'SECURITY DEFINER','session_user::name',
  'REVOKE ALL ON FUNCTION public.phase3h_session_school_id() FROM PUBLIC',
  'GRANT EXECUTE ON FUNCTION public.phase3h_session_school_id()',
  'CREATE POLICY paper_school_role_bound ON public.paper_documents',
  'CREATE POLICY paper_school_role_bound ON public.paper_revisions',
  'USING (school_id=public.phase3h_session_school_id())',
  'WITH CHECK (school_id=public.phase3h_session_school_id())',
  'REVOKE ALL ON public.paper_documents FROM assps_p3g_app',
  'REVOKE ALL ON public.paper_revisions FROM assps_p3g_app',
 ])assert.ok(sql.includes(x),'Role identity hardening missing: '+x)
 const active=sql.replace(/--[^\r\n]*/gu,'')
 assert.doesNotMatch(active,/current_setting\('app\.(paper_school_id|rls_enabled|is_super_admin)'/u)
 assert.doesNotMatch(active,/GRANT\s+(?:SELECT|UPDATE|INSERT|DELETE)[^;\n]*paper_role_school_bindings/iu)
 assert.match(sql,/GRANT SELECT,INSERT ON public.paper_revisions/u)
 assert.doesNotMatch(active,/GRANT[^;\n]*UPDATE[^;\n]*paper_revisions/iu)
})
test('actor attribution additionally binds created_by, updated_by and revision actor to same school',()=>{
 for(const x of [
  'UNIQUE(school_id,id)',
  'FOREIGN KEY(school_id,created_by) REFERENCES public.users(school_id,id)',
  'FOREIGN KEY(school_id,updated_by) REFERENCES public.users(school_id,id)',
  'FOREIGN KEY(school_id,actor_id) REFERENCES public.users(school_id,id)',
 ]) assert.ok(sql.includes(x),'Missing composite actor-school constraint: '+x)
})
test('Phase3H runner insists on new independent PG18 cluster, explicit user action, 55440, own cleanup and NO network install',()=>{
 for(const x of [
  "if($Action -ne 'RUN_ROLE_BOUND_SYNTHETIC_ONLY')",
  '$port=55440',
  'assps-phase3h-ephemeral-',
  '.ASSPS_PHASE3H_SELF_CREATED',
  '127.0.0.1','phase3g-DISPOSABLE-ONLY-schema.sql',
  'phase3h-role-bound-DISPOSABLE-ONLY.sql',
  ".Replace('55439','55440')",
  'pg_dump.exe','pg_restore.exe','pg_ctl.exe',
  'phase3h_restore_ci',
  'ASSPS_PHASE3H_REAL_PG',
  'NODE_PATH',
  "if($stopped -and (Test-Path $marker)",
 ])assert.ok(runner.includes(x),'Missing runner fail-safe: '+x)
 assert.doesNotMatch(runner.replace(/^\s*#.*$/gmu,''),/\bnpm\s+(?:install|ci)\b/iu)
 assert.doesNotMatch(runner,/deploy:production|AUTO_MIGRATE_ON_BOOT|app\.assps\.edu\.pk/u)
})
test('all real Phase3H tests opt-in ONLY and refuse generic DB settings or any non-loopback endpoints',()=>{
 for(const name of ['paperRoleBoundRealPostgresPhase3H.test.js','paperRoleBoundRestorePhase3H.test.js']){
  const body=fs.readFileSync(path.join(__dirname,name),'utf8')
  for(const s of ['ASSPS_PHASE3H_REAL_PG','EXPLICIT_SYNTHETIC_ROLE_BOUND_55440',
   '127.0.0.1','55440','assps_paper_phase3h_'])
   assert.ok(body.includes(s),name+' missing '+s)
  assert.doesNotMatch(body,/require\(['"][^'"]*(?:database|migrate|routes)[^'"]*['"]\)/iu)
 }
})

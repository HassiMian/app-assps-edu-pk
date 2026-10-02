// Source-only safety contracts; no DB connections or migrations.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const root=path.resolve(__dirname,'../../..')
const ops=path.join(root,'ops/paper-staging-review')
const sql=fs.readFileSync(path.join(ops,'phase3i-least-privilege-DISPOSABLE-ONLY.sql'),'utf8')
const runner=fs.readFileSync(path.join(ops,'phase3i-run-least-privilege-DISPOSABLE-ONLY.ps1'),'utf8')
const gateway=fs.readFileSync(path.join(__dirname,'../services/papers/paperPrincipalEvidencePreflight.js'),'utf8')
test('phase3I guard blocks wrong DB, port, existing function owner BEFORE any DDL/grant/owner change',()=>{
 const first=sql.indexOf('DO $phase3i_guard$'),change=sql.indexOf('REVOKE ALL ON public.paper_role_school_bindings FROM PUBLIC')
 assert.ok(first>=0&&first<change)
 for(const x of [
  "current_database()<>'assps_paper_phase3i_ci'",
  "current_setting('port')<>'55441'",
  "current_setting('listen_addresses')<>'127.0.0.1'",
  "session_user<>'assps_p3g_admin'",
  "to_regrole('assps_p3i_identity_owner') IS NULL",
  "pg_get_userbyid(proowner)<>'assps_p3g_admin'",
  "RAISE EXCEPTION",
 ])assert.ok(sql.includes(x),'missing hard target/ownership guard: '+x)
 assert.doesNotMatch(sql,/\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/iu)
})
test('identity owner gets ONLY restricted mapping column SELECT; private function NO PUBLIC EXECUTE',()=>{
 for(const x of [
  'GRANT SELECT(login_role,school_id) ON public.paper_role_school_bindings',
  'TO assps_p3i_identity_owner',
  'ALTER FUNCTION public.phase3h_session_school_id()',
  'OWNER TO assps_p3i_identity_owner',
  'REVOKE ALL ON FUNCTION public.phase3h_session_school_id() FROM PUBLIC',
  'TO assps_p3h_school51,assps_p3h_school52',
 ])assert.ok(sql.includes(x),x)
 const source=sql.replace(/--[^\r\n]*/gu,'')
 assert.doesNotMatch(source,/GRANT[^;]*(?:paper_documents|paper_revisions)[^;]*assps_p3i_identity_owner/iu)
 assert.doesNotMatch(source,/GRANT[^;]*(?:UPDATE|INSERT|DELETE)[^;]*paper_role_school_bindings/iu)
 assert.doesNotMatch(source,/CURRENT_SETTING\('app.paper_school_id'/iu)
})
test('runner creates distinct marker-owned NEW port 55441 cluster, NOLOGIN role, authenticates two tenant roles',()=>{
 for(const x of [
  "if($Action -ne 'RUN_LEAST_PRIVILEGE_SYNTHETIC_ONLY')",
  '$port=55441','assps-phase3i-ephemeral-','.ASSPS_PHASE3I_SELF_CREATED',
  'NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT',
  'phase3g-DISPOSABLE-ONLY-schema.sql','phase3h-role-bound-DISPOSABLE-ONLY.sql',
  'phase3i-least-privilege-DISPOSABLE-ONLY.sql',
  'phase3i-run-least-privilege-DISPOSABLE-ONLY.ps1'.replace('phase3i-run-least-privilege-DISPOSABLE-ONLY.ps1','paperLeastPrivilegeRealPostgresPhase3I.test.js'),
  'paperLeastPrivilegeRestorePhase3I.test.js',
  'pg_dump.exe','pg_restore.exe',
  'PHASE3I_OWN_CLUSTER_STOPPED',
  'PHASE3I_STOPPED_SELF_CREATED_DATA_REMOVED'
 ])assert.ok(runner.includes(x),'missing synthetic runner guard: '+x)
 assert.doesNotMatch(runner.replace(/^\s*#.*$/gmu,''),/\bnpm\s+(?:ci|install)\b/iu)
 assert.doesNotMatch(runner,/AUTO_MIGRATE_ON_BOOT|app\.assps\.edu\.pk|deploy:production/iu)
})
test('real Phase3I tests are opt-in only, refuse non-loopback port and authenticated login mismatch',()=>{
 for(const filename of ['paperLeastPrivilegeRealPostgresPhase3I.test.js',
  'paperLeastPrivilegeRestorePhase3I.test.js']){
  const source=fs.readFileSync(path.join(__dirname,filename),'utf8')
  for(const x of ['ASSPS_PHASE3I_REAL_PG','EXPLICIT_SYNTHETIC_ROLE_BOUND_55441',
   '127.0.0.1','55441','assps_paper_phase3i_'])
   assert.ok(source.includes(x),filename+' missing: '+x)
  assert.doesNotMatch(source,/require\(['"][^'"]*config\/database/iu)
 }
})
test('principal Phase3D evidence verifier is pure read-only; immutable source and NO machine approval',()=>{
 for(const x of [
  'assps-native-paper-visual-evidence-manifest',
  'EVIDENCE_COLLECTED_UNVERIFIED','PENDING_INDEPENDENT_REVIEW',
  'FOUR_FILE_IDENTITY_VERIFIED_HUMAN_VISUAL_REVIEW_PENDING',
  'independentlyApproved:false','productionCutoverAllowed:false',
  'sourceMutationAllowed:false','semanticContentAndFontParityMachineVerified:false'
 ])assert.ok(gateway.includes(x),x)
 assert.doesNotMatch(gateway,/\brequire\(['"][^'"]*(?:database|migrate|routes)[^'"]*['"]\)/iu)
 assert.doesNotMatch(gateway,/\b(?:writeFile|unlink|rmSync|fetch|axios)\s*\(/u)
 const activePaths=[
  path.join(root,'al-siddique-backend/src/app.js'),
  path.join(root,'al-siddique-backend/src/server.js'),
  path.join(root,'al-siddique-backend/src/config/migrate.js')
 ]
 for(const file of activePaths){
  if(fs.existsSync(file)){
   const live=fs.readFileSync(file,'utf8')
   assert.doesNotMatch(live,/paperPrincipalEvidencePreflight|paperLeastPrivilege/iu)
  }
 }
})

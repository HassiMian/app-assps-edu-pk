// Phase3J structural contracts: NO PostgreSQL connection, shell execution or file writes.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const root=path.resolve(__dirname,'../../..')
const runner=fs.readFileSync(path.join(root,
 'ops/paper-staging-review/phase3j-run-two-INDEPENDENT-disposable-clusters-ONLY.ps1'),'utf8')
const router=fs.readFileSync(path.join(__dirname,
 '../services/papers/paperTrustedSchoolRouterPhase3J.js'),'utf8')
const real=fs.readFileSync(path.join(__dirname,
 'paperTrustedSchoolRouterRealPhase3J.test.js'),'utf8')
const recovery=fs.readFileSync(path.join(__dirname,
 'paperGlobalRolesFreshClusterRestorePhase3J.test.js'),'utf8')
test('new-cluster script has mandatory explicit one-shot action and refuses pre-existing ports/low disk',()=>{
 for(const item of [
  "if($Action -ne 'RUN_TWO_NEW_SYNTHETIC_CLUSTERS_ONLY')",
  "foreach($port in @(55442,55443))",
  "Get-NetTCPConnection -State Listen -LocalPort $port",
  "if((Get-PSDrive -Name C).Free -lt 2GB)",
  ".ASSPS_PHASE3J_SELF_CREATED",
  "assps-phase3j-ephemeral-",
  "127.0.0.1:55442_SOURCE_AND_55443_RECOVERY",
  "if($sourceStopped -and (Test-Path $sourceData))",
  "if($targetStopped -and (Test-Path $targetData))",
 ])assert.ok(runner.includes(item),'missing safety measure: '+item)
 assert.doesNotMatch(runner,/AUTO_MIGRATE_ON_BOOT|deploy:production|app\.assps\.edu\.pk/u)
 assert.doesNotMatch(runner.replace(/^\s*#.*$/gmu,''),/\bnpm\s+(?:install|ci)\b/u)
})
test('source+target are TWO fresh initdb clusters with distinct bootstrap roles and data directories',()=>{
 for(const item of [
  "-D $sourceData -U assps_p3g_admin",
  "-D $targetData -U assps_p3j_restore_admin",
  "pg_ctl.exe') -D $sourceData",
  "pg_ctl.exe') -D $targetData",
  "-p 55442",
  "-p 55443",
  "assps_paper_phase3j_ci",
  "assps_paper_phase3j_restore_ci",
  "phase3g-DISPOSABLE-ONLY-schema.sql",
  "phase3h-role-bound-DISPOSABLE-ONLY.sql",
  "phase3i-least-privilege-DISPOSABLE-ONLY.sql",
 ])assert.ok(runner.includes(item),'not an independent fresh-cluster recovery: '+item)
})
test('global role dump explicitly excludes ALL source passwords, target logins get ROTATED distinct secrets',()=>{
 for(const item of [
  'pg_dumpall.exe',
  '--globals-only --no-role-passwords',
  "'assps_p3i_identity_owner'",
  "source password material",
  'Set-PgSource','Set-PgTarget',
  'New-FakeSecret',
  '$src51Pw=New-FakeSecret',
  '$dst51Pw=New-FakeSecret',
  "ALTER ROLE assps_p3h_school51 WITH LOGIN PASSWORD",
  "ALTER ROLE assps_p3h_school52 WITH LOGIN PASSWORD",
  "ASSPS_PHASE3J_OLD_51_ON_TARGET_URL",
  "if(Test-Path $globals){Remove-Item -LiteralPath $globals -Force}",
 ])assert.ok(runner.includes(item),'missing no-source-secret global role recovery: '+item)
 assert.doesNotMatch(runner,/Write-Output\s*\(?\s*\$src51Pw|Write-Output\s*\(?\s*\$dst51Pw/u)
})
test('trusted router explicitly ignores caller actor, school, role, connect and gate injection',()=>{
 assert.match(router,/trustedActorResolver\(authenticationContext\)/u)
 assert.match(router,/binding=pools\.get\(schoolId\)/u)
 assert.match(router,/IDENTITY_SQL/u)
 assert.match(router,/r\.rows\[0\]\.authenticated_login!==binding\.login/u)
 assert.match(router,/gate,actor,connect:trustedConnect/u)
 assert.match(router,/Object\.freeze\(\{revise\}\)/u)
 assert.doesNotMatch(router,/require\(['"][^'"]*config\/database/u)
 assert.doesNotMatch(router,/req\.headers|req\.query|process\.env|DATABASE_URL/u)
 assert.match(real,/UNTRUSTED_BROWSER_CONNECTOR_MUST_NEVER_RUN/u)
})
test('real PG cases require exact fixed opt-in + source port55442 and target port55443',()=>{
 for(const x of [real,recovery]){
  assert.match(x,/ASSPS_PHASE3J_REAL_PG/u)
  assert.match(x,/EXPLICIT_TWO_NEW_CLUSTERS_55442_55443/u)
  assert.match(x,/127\.0\.0\.1/u)
  assert.doesNotMatch(x,/require\(['"][^'"]*config\/database/u)
 }
 assert.match(real,/55442/u)
 assert.match(recovery,/55442/u)
 assert.match(recovery,/55443/u)
 assert.match(recovery,/old51\.connect\(\)/u)
 assert.match(recovery,/password authentication failed/u)
})
test('no global-role or SQL copy is imported into active app routes/migrations',()=>{
 for(const name of [
  'al-siddique-backend/src/app.js',
  'al-siddique-backend/src/server.js',
  'al-siddique-backend/src/config/migrate.js'
 ]){
  const f=path.join(root,name)
  if(fs.existsSync(f)){
   const content=fs.readFileSync(f,'utf8')
   assert.doesNotMatch(content,/paperTrustedSchoolRouterPhase3J|phase3j-run-two-INDEPENDENT/u)
  }
 }
})

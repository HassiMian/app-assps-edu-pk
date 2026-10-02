// Structural contract tests only. No server connection, port bind, migration or shell execution.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const root=path.resolve(__dirname,'../../..')
const ops=path.join(root,'ops/paper-staging-review')
const runner=fs.readFileSync(path.join(ops,'phase3g-run-disposable-ONLY.ps1'),'utf8')
const schema=fs.readFileSync(path.join(ops,'phase3g-DISPOSABLE-ONLY-schema.sql'),'utf8')
test('synthetic DDL fails before CREATE on any non-disposable existing server/table',()=>{
 const firstCreate=schema.indexOf('CREATE TABLE')
 const gate=schema.indexOf('DO $guard$')
 assert.ok(gate>=0&&gate<firstCreate)
 for(const required of [
  "current_database()<>'assps_paper_phase3f_ci'",
  "current_setting('port')<>'55439'",
  "current_setting('listen_addresses')<>'127.0.0.1'",
  "to_regclass('public.paper_documents') IS NOT NULL",
  "to_regclass('public.schools') IS NOT NULL",
  'RAISE EXCEPTION',
  'BEGIN;','COMMIT;'
 ])assert.ok(schema.includes(required),'Missing disposable guard: '+required)
 assert.doesNotMatch(schema,/\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/iu)
 assert.doesNotMatch(schema,/\bALTER\s+TABLE\s+(?:students|exam_results|question_bank)\b/iu)
})
test('REAL RLS+append-only SQL uses force, exact UTF-8 digest, same-school PK/FK and role with no audit UPDATE/DELETE',()=>{
 assert.equal((schema.match(/FORCE ROW LEVEL SECURITY;/gu)||[]).length,2)
 assert.equal((schema.match(/ENABLE ROW LEVEL SECURITY;/gu)||[]).length,2)
 assert.equal((schema.match(/CREATE POLICY paper_school_strict/gu)||[]).length,2)
 assert.equal((schema.match(/WITH CHECK \(school_id=NULLIF\(current_setting\('app.paper_school_id',true\),''\)::integer\)/gu)||[]).length,2)
 assert.match(schema,/sha256\(convert_to\(native_json_text,'UTF8'\)\)/u)
 assert.match(schema,/PRIMARY KEY \(school_id,id\)/u)
 assert.match(schema,/PRIMARY KEY \(school_id,document_id,revision\)/u)
 assert.match(schema,/FOREIGN KEY \(school_id,document_id\) REFERENCES public\.paper_documents\(school_id,id\)/u)
 assert.match(schema,/BEFORE UPDATE OR DELETE ON public\.paper_revisions/u)
 assert.match(schema,/BEFORE INSERT ON public\.paper_revisions/u)
 assert.match(schema,/GRANT SELECT,INSERT ON public\.paper_revisions TO assps_p3g_app/u)
 assert.doesNotMatch(schema,/GRANT[^;\n]*(?:UPDATE|DELETE)[^;\n]*paper_revisions/u)
 assert.doesNotMatch(schema,/app\.rls_enabled|app\.is_super_admin/u)
})
test('disposable runner requires explicit action; never imports active app connection and stops ONLY its own cluster',()=>{
 for(const token of [
  "if($Action -ne 'RUN_SYNTHETIC_ONLY')",
  'Get-NetTCPConnection -LocalPort $port -State Listen',
  '$port=55439',
  "C:\\Program Files\\PostgreSQL\\18\\bin",
  'assps_paper_phase3f_ci',
  'phase3g-DISPOSABLE-ONLY-schema.sql',
  'pg_dump.exe','pg_restore.exe','pg_ctl.exe',
  "'ASSPS_PHASE3G_REAL_PG'",
  "assps-phase3g-ephemeral-",
  '.ASSPS_PHASE3G_SELF_CREATED',
  "if($success -and $stopped",
  "Remove-Item -LiteralPath $data -Force -Recurse",
  'NODE_PATH',
 ]) assert.ok(runner.includes(token),'Missing runner safety token: '+token)
 assert.doesNotMatch(runner,/require\(['"][^'"]*config\/database/u)
 assert.doesNotMatch(runner,/deploy:production|AUTO_MIGRATE_ON_BOOT|app\.assps\.edu\.pk/u)
 assert.doesNotMatch(runner.replace(/^\s*#.*$/gmu,''),/npm\s+(install|ci)/iu)
})
test('real PG tests are disabled without synthetic opt-in and require exact loopback port and dedicated names',()=>{
 const files=['paperStagingDisposablePostgresPhase3G.test.js','paperStagingRestorePhase3G.test.js']
 for(const file of files){
  const body=fs.readFileSync(path.join(__dirname,file),'utf8')
  assert.match(body,/ASSPS_PHASE3G_REAL_PG/u)
  assert.match(body,/DISPOSABLE_CLUSTER_PORT_55439/u)
  assert.match(body,/127\.0\.0\.1/u)
  assert.match(body,/55439/u)
  assert.match(body,/assps_paper_phase3f_ci/u)
  assert.doesNotMatch(body,/require\(['"]\.\.\/config\/database/u)
 }
 assert.match(runner,/ASSPS_PHASE3G_RESTORE_URL/u)
 assert.match(runner,/assps_paper_phase3g_restore_ci/u)
})

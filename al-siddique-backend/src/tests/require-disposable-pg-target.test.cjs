'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {validateDisposableTarget}=require('./helpers/require-disposable-pg-target.cjs')

const expected='assps_synthetic_attendance_qa_20261012'
const base={NODE_ENV:'test',ASSPS_ISOLATED_TEST_AUTHORIZED:'YES_DISPOSABLE_CLONE',
 DB_NAME:expected,DB_HOST:'127.0.0.1',DB_PORT:'55432',TEST_API_URL:'http://127.0.0.1:5561'}
function authorize(env,extra={httpVariable:'TEST_API_URL'}){return validateDisposableTarget(expected,extra,env)}
function denied(env){assert.throws(()=>authorize(env),error=>error.code==='ASSPS_MUTATING_QA_NOT_AUTHORIZED')}

test('valid *synthetic config* passes pure preconnection check; no PostgreSQL connection',()=>{
 assert.equal(authorize({...base}).database,expected)
})
test('no explicit independent operator signoff is denied',()=>denied({...base,ASSPS_ISOLATED_TEST_AUTHORIZED:''}))
test('development or production NODE_ENV is denied',()=>{
 denied({...base,NODE_ENV:'development'});denied({...base,NODE_ENV:'production'})
})
test('real production and restored-production-copy names are denied',()=>{
 denied({...base,DB_NAME:'apexos'});denied({...base,DB_NAME:'assps_backup_restore_check_20261011'})
})
test('wrong DB port and remote DB host are denied',()=>{
 denied({...base,DB_PORT:'5432'});denied({...base,DB_HOST:'187.127.121.221'});denied({...base,DB_HOST:'0.0.0.0'})
})
test('URL, PGHOST, PGPORT and PGDATABASE overrides all denied',()=>{
 denied({...base,DATABASE_URL:'postgresql://untrusted.invalid/a'})
 denied({...base,PGHOST:'127.0.0.1'})
 denied({...base,PGPORT:'5432'})
 denied({...base,PGDATABASE:'apexos'})
})
test('legacy production backend and signed green HTTP endpoints forbidden',()=>{
 denied({...base,TEST_API_URL:'http://127.0.0.1:5000'})
 denied({...base,TEST_API_URL:'http://127.0.0.1:5091'})
 denied({...base,TEST_API_URL:'https://app.assps.edu.pk'})
 denied({...base,TEST_API_URL:'http://0.0.0.0:5561'})
})
test('all ten mutating Core suites enforce guard BEFORE first DB Pool import',()=>{
 for(const file of ['attendance-active-roster-hotfix.test.js','attendance-integrity.test.js',
   'fee-payment-phase4-http.test.js','jarvis-student-admission-atomicity.test.js',
   'app-runtime-business-smoke-http.test.js','identity-issuance-http.test.js',
   'identity-provisioning-preservation.test.js','portal-role-isolation.test.js',
   'tenant-isolation-adversarial.test.js','verified-proxy-cookie.test.js']){
  const src=fs.readFileSync(path.join(__dirname,file),'utf8')
  assert.ok(src.indexOf("validateDisposableTarget('")>=0,file)
  assert.ok(src.indexOf('validateDisposableTarget(')<src.indexOf("require('../config/database')"),file)
 }
})
test('non-synthetic copy-like school database is refused even when claimed as expected',()=>{
 for(const db of ['assps_backup_restore_check_20261011','assps_qbank_intake_stage_phase4_20261008','apexos'])
  assert.throws(()=>validateDisposableTarget(db,{}, {...base,DB_NAME:db}), e=>e.code==='ASSPS_MUTATING_QA_NOT_AUTHORIZED')
})
test('staged API port is mandatory and must be independently isolated',()=>{
 assert.throws(()=>authorize({...base},{stagePortVariable:'STAGE_API_PORT'}))
 assert.throws(()=>authorize({...base,STAGE_API_PORT:'5000'},{stagePortVariable:'STAGE_API_PORT'}))
 assert.equal(authorize({...base,STAGE_API_PORT:'5483'},{stagePortVariable:'STAGE_API_PORT'}).authorized,true)
})
test('helper source never silently changes database, Nginx, tenant, or runtime service',()=>{
 const source=fs.readFileSync(path.join(__dirname,'helpers/require-disposable-pg-target.cjs'),'utf8')
 for(const forbidden of ['pool.query','child_process','execSync','DELETE FROM','DROP TABLE','ALTER TABLE','pm2 restart','nginx -s'])
  assert.ok(!source.includes(forbidden),'forbidden: '+forbidden)
})

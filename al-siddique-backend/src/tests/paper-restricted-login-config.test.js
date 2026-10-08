'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {spawnSync}=require('node:child_process')
const path=require('node:path')
const backendRoot=path.resolve(__dirname,'..')
function probe(overrides,script){
 return spawnSync(process.execPath,['-e',script],{cwd:backendRoot,encoding:'utf8',timeout:10000,env:{...process.env,DB_STARTUP_PROBE:'false',PAPER_RESTRICTED_DB_ENABLED:'true',DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'true',DB_AUTH_USE_SIGNED_TENANT_CONTEXT:'true',DB_SIGNED_TENANT_RLS_ENABLED:'true',DB_SIGNED_TENANT_HMAC_KEY:'isolated-static-test-signing-key-not-real-1234567890',DB_USER:'assps_app_testing',DB_NAME:'assps_archv1_rls_test_only',PAPER_RESTRICTED_DB_PASSWORD:'test-only-placeholder-never-live',...overrides}})
}
test('secure mode rejects use of the main SaaS DB login as the restricted Paper login',()=>{
 const p=probe({PAPER_RESTRICTED_DB_USER:'assps_app_testing'},"require('./config/database')")
 assert.notEqual(p.status,0)
 assert.match(p.stderr,/PAPER_RESTRICTED_DB_CONFIG_REQUIRED/)
})
test('unscoped protected SQL fails closed without a database connection',()=>{
 const p=probe({PAPER_RESTRICTED_DB_USER:'assps_dedicated_paper_test_only'},`
   const {rejectUnscopedProtectedSql}=require('./config/database')
   for(const sql of ['SELECT * FROM question_bank','UPDATE paper_vault SET status=\\'approved\\'','SELECT * FROM assessment_result_records','SELECT * FROM resource_scope_mappings']){
     let caught;try{rejectUnscopedProtectedSql(sql)}catch(e){caught=e}
     if(caught?.code!=='PAPER_RESTRICTED_SCOPE_REQUIRED')process.exit(11)
   }
   rejectUnscopedProtectedSql('SELECT id FROM students WHERE school_id=1')
   process.exit(0)
 `)
 assert.equal(p.status,0,p.stderr)
})
test('restricted pool initialization refuses missing login and signing prerequisites',()=>{
 const bad=probe({PAPER_RESTRICTED_DB_USER:''},"require('./config/database')")
 assert.notEqual(bad.status,0)
 assert.match(bad.stderr,/PAPER_RESTRICTED_DB_CONFIG_REQUIRED/)
})

test('Paper restricted mode refuses unsigned or privileged general SaaS configuration',()=>{
 const p=probe({DB_SIGNED_TENANT_RLS_ENABLED:'false',DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'false',PAPER_RESTRICTED_DB_USER:'dedicated_clone_paper_login'},"require('./config/database')")
 assert.notEqual(p.status,0)
 assert.match(p.stderr,/PAPER_RESTRICTED_CORE_SIGNED_DEPENDENCIES_REQUIRED/)
})

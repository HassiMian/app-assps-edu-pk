'use strict'
process.env.DB_STARTUP_PROBE='false'
const test=require('node:test'),assert=require('node:assert/strict')
const dbPath=require.resolve('../../al-siddique-backend/src/config/database')
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{pool:null}}
const migration=require('../../al-siddique-backend/migrations/031_grade910_verified_paper_selector')
function fake({core=true,bypass=false,force=true}={}){
 const sql=[]
 const client={async query(q,p){
  sql.push(q)
  if(q.includes('to_regprocedure'))return{rows:[{f:core?'core_security.signed_school_allowed(integer)':null}]}
  if(q.includes('FROM pg_roles'))return{rows:[{rolsuper:false,rolbypassrls:bypass}]}
  if(q.includes('FROM pg_class c'))return{rows:force?[{rls:true,force:true,policies:1}]:[]}
  return{rows:[]}
 },async release(){}}
 return {pool:{connect:async()=>client},sql}
}
test('qualified publication table enforces signed school RLS, SELECT-only runtime and NO seed',async()=>{
 const q=fake(),result=await migration.up({pool:q.pool,runtimeRole:'assps_grade_restricted'})
 const sql=q.sql.join('\n')
 assert.equal(result.schemaReady,true);assert.equal(result.rowsImported,0)
 assert.equal(result.runtimeRoleReadOnly,true)
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/core_security\.signed_school_allowed\(school_id\)/)
 assert.match(sql,/GRANT SELECT ON grade910_verified_paper_publications/)
 assert.doesNotMatch(sql,/GRANT INSERT ON grade910_verified_paper_publications/)
 assert.match(sql,/academic_approval_verified BOOLEAN NOT NULL DEFAULT false CHECK\(academic_approval_verified=true\)/)
})
test('missing signed Core predicate fails closed and rolls back transaction',async()=>{
 const f=fake({core:false})
 await assert.rejects(migration.up({pool:f.pool,runtimeRole:'assps_grade_restricted'}),/SIGNED_CORE_RLS_REQUIRED/)
 assert(f.sql.includes('ROLLBACK'))
})
test('runtime role with bypassRLS cannot own selector',async()=>{
 const f=fake({bypass:true})
 await assert.rejects(migration.up({pool:f.pool,runtimeRole:'assps_grade_restricted'}),/NOBYPASS_RUNTIME_ROLE_REQUIRED/)
})
test('missing FORCE RLS or policy blocks migration certification',async()=>{
 const f=fake({force:false})
 await assert.rejects(migration.up({pool:f.pool,runtimeRole:'assps_grade_restricted'}),/FORCE_RLS_NOT_CERTIFIED/)
})
test('rollback is additive and preserves original question and publication ledger data',async()=>{
 const result=await migration.down()
 assert.equal(result.storagePreserved,true)
 assert.match(result.message,/NO_DESTRUCTIVE_DDL/)
})

'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {up}=require('../../migrations/035_exam_grade_revision_history')
function mock({signed=true,restricted=true,rls=true,immutable=true}={}){
 const sql=[],client={query:async(s,v)=>{
  sql.push(String(s))
  if(String(s).includes('to_regprocedure'))return {rows:[{fn:signed?'core_security.signed_school_allowed(integer)':null}]}
  if(String(s).includes('FROM pg_roles'))return {rows:[{rolsuper:!restricted,rolbypassrls:false}]}
  if(String(s).includes('relforcerowsecurity'))return {rows:[{relrowsecurity:rls,relforcerowsecurity:rls,signed_policy:rls}]}
  if(String(s).includes('FROM pg_trigger'))return {rows:[{count:immutable?1:0}]}
  return {rows:[]}
 },release:()=>sql.push('RELEASE')}
 return {sql,pool:{connect:async()=>client}}
}
test('restricted signed migration creates append-only grade ledger but never overwrites marks',async()=>{
 const m=mock()
 const x=await up({pool:m.pool,runtimeRole:'apex_app_runtime'})
 assert.equal(x.marksModified,false)
 assert.equal(x.gradesModified,false)
 assert.equal(x.productionApproved,false)
 const full=m.sql.join('\n')
 for(const fragment of [
  'FOREIGN KEY(school_id,exam_result_id)','CHECK(old_grade<>new_grade)',
  'FORCE ROW LEVEL SECURITY','signed_school_allowed(school_id)',
  'BEFORE UPDATE OR DELETE','GRADE_AUDIT_APPEND_ONLY',
  'REVOKE ALL ON public.exam_grade_revision_history FROM PUBLIC',
  'GRANT SELECT,INSERT','COMMIT']){
  assert.ok(full.includes(fragment),fragment)
 }
 assert.doesNotMatch(full,/UPDATE\s+(?:public\.)?exam_results|DELETE\s+FROM\s+(?:public\.)?exam_results/i)
})
test('missing signed school verifier prevents schema creation',async()=>{
 const m=mock({signed:false})
 await assert.rejects(()=>up({pool:m.pool,runtimeRole:'apex_app_runtime'}),/SIGNED_SCHOOL_FUNCTION_MISSING/)
 assert.equal(m.sql.filter(x=>x.includes('CREATE TABLE')).length,0)
 assert.ok(m.sql.includes('ROLLBACK'))
})
test('superuser runtime cannot gain audit access',async()=>{
 const m=mock({restricted:false})
 await assert.rejects(()=>up({pool:m.pool,runtimeRole:'apex_app_runtime'}),/BYPASS_ROLE_FORBIDDEN/)
 assert.ok(!m.sql.includes('COMMIT'))
})
test('FORCE RLS and append-only trigger must be verified before COMMIT',async()=>{
 for(const opts of [{rls:false},{immutable:false}]){
  const m=mock(opts)
  await assert.rejects(()=>up({pool:m.pool,runtimeRole:'apex_app_runtime'}))
  assert.ok(m.sql.includes('ROLLBACK'))
  assert.ok(!m.sql.includes('COMMIT'))
 }
})
test('invalid SQL role name rejected before connecting to DB',async()=>{
 const m=mock()
 await assert.rejects(()=>up({pool:m.pool,runtimeRole:'runtime; DELETE FROM users'}),/RESTRICTED_RUNTIME_ROLE_REQUIRED/)
 assert.equal(m.sql.length,0)
})

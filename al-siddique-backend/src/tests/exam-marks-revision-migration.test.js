'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {up}=require('../../migrations/034_exam_marks_revision_history')
function pool({signed=true,restricted=true,rls=true}={}){
 const q=[]
 const db={connect:async()=>({
  query:async(text,params)=>{
   q.push(String(text))
   if(String(text).includes('to_regprocedure'))return {rows:[{fn:signed?'core_security.signed_school_allowed(integer)':null}]}
   if(String(text).includes('FROM pg_roles'))return {rows:[{rolsuper:!restricted,rolbypassrls:!restricted}]}
   if(String(text).includes('FROM pg_class c'))return {rows:[{relrowsecurity:rls,relforcerowsecurity:rls,has_policy:rls}]}
   return {rows:[],rowCount:0}
  },release:()=>q.push('RELEASE')
 })}
 return {q,db}
}
test('migration is additive, zero exam_results writes, installs force RLS plus restricted grants',async()=>{
 const m=pool()
 const result=await up({pool:m.db,runtimeRole:'apex_app_runtime'})
 assert.equal(result.existingMarksChanged,false)
 assert.ok(m.q.some(q=>q.includes('CREATE TABLE IF NOT EXISTS public.exam_marks_revision_history')))
 assert.ok(m.q.some(q=>q.includes('FORCE ROW LEVEL SECURITY')))
 assert.ok(m.q.some(q=>q.includes('core_security.signed_school_allowed(school_id)')))
 assert.ok(!m.q.some(q=>/UPDATE\s+(?:public\.)?exam_results/i.test(q)))
 assert.equal(m.q.filter(q=>q==='COMMIT').length,1)
})
test('unsigned verifier means fail closed with rollback',async()=>{
 const m=pool({signed:false})
 await assert.rejects(()=>up({pool:m.db,runtimeRole:'apex_app_runtime'}),/VERIFIER_REQUIRED/)
 assert.ok(m.q.includes('ROLLBACK'))
 assert.ok(!m.q.some(q=>q.includes('CREATE TABLE')))
})
test('DB superuser or bypass-RLS identity cannot get revision grants',async()=>{
 const m=pool({restricted:false})
 await assert.rejects(()=>up({pool:m.db,runtimeRole:'apex_app_runtime'}),/BYPASS_ROLE_FORBIDDEN/)
 assert.ok(m.q.includes('ROLLBACK'))
})
test('malformed runtime role denied before connecting',async()=>{
 const m=pool()
 await assert.rejects(()=>up({pool:m.db,runtimeRole:'apex_app_runtime;DROP TABLE exam_results'}),/RESTRICTED_RUNTIME_ROLE_REQUIRED/)
 assert.equal(m.q.length,0)
})
test('missing verified FORCE RLS rolls back migration',async()=>{
 const m=pool({rls:false})
 await assert.rejects(()=>up({pool:m.db,runtimeRole:'apex_app_runtime'}),/FORCE_RLS_VERIFICATION_FAILED/)
 assert.ok(m.q.includes('ROLLBACK'))
 assert.ok(!m.q.includes('COMMIT'))
})

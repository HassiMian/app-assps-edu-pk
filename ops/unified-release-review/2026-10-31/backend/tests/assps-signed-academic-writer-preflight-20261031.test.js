'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const {gateFlags,inspectSignedAcademicWriter}=require('../services/academicWriterReadinessService')
const good={DB_SIGNED_TENANT_RLS_ENABLED:'true',DB_ENFORCE_LEAST_PRIVILEGE_LOGIN:'true',DB_AUTH_USE_SIGNED_TENANT_CONTEXT:'true',DB_SIGNED_TENANT_HMAC_KEY:'x'.repeat(32)}
const fake=(audit_insert,non_bypass=true,force_rls=true)=>({query:async()=>({rows:[{audit_insert,non_bypass,force_rls}]})})
test('signed academic writer refuses unsigned or privileged runtime',()=>{
 assert.equal(gateFlags(good),true)
 for(const key of ['DB_SIGNED_TENANT_RLS_ENABLED','DB_ENFORCE_LEAST_PRIVILEGE_LOGIN','DB_AUTH_USE_SIGNED_TENANT_CONTEXT'])
  assert.equal(gateFlags({...good,[key]:'false'}),false)
 assert.equal(gateFlags({...good,DB_SIGNED_TENANT_HMAC_KEY:'short'}),false)
})
test('runtime without signed academic event INSERT is never stage-ready',async()=>{
 const status=await inspectSignedAcademicWriter(fake(false),good)
 assert.equal(status.technicalReady,false)
 assert.equal(status.status,'SIGNED_ACADEMIC_WRITER_NOT_READY')
 assert.equal(status.wouldGrantAcademicApproval,false)
})
test('signed writer with bypass or absent FORCE RLS must fail closed',async()=>{
 assert.equal((await inspectSignedAcademicWriter(fake(true,false,true),good)).technicalReady,false)
 assert.equal((await inspectSignedAcademicWriter(fake(true,true,false),good)).technicalReady,false)
})
test('technical preflight cannot be confused with human academic approval',async()=>{
 const ready=await inspectSignedAcademicWriter(fake(true,true,true),good)
 assert.equal(ready.technicalReady,true)
 assert.equal(ready.independentHumanAcceptanceConfirmed,false)
 assert.equal(ready.signedSourceEvidenceStillRequired,true)
 assert.equal(ready.wouldGrantAcademicApproval,false)
 assert.equal((await inspectSignedAcademicWriter(fake(true,true,true),{...good,DB_AUTH_USE_SIGNED_TENANT_CONTEXT:'false'})).technicalReady,false)
})
test('staging gates before writes and does not weaken signed evidence preconditions',()=>{
 const core=fs.readFileSync('/var/www/apex-backend/src/routes/schoolAcademicApprovalCore.js','utf8')
 const route=fs.readFileSync('/var/www/apex-backend/src/routes/schoolAcademicCatalogRoutes.js','utf8')
 assert.ok(core.indexOf('await inspectSignedAcademicWriter(c)')<core.indexOf('const result=await fn(c,{uid,school})'))
 assert.match(core,/SIGNED_ACADEMIC_WRITER_NOT_READY/)
 assert.match(core,/I_VERIFIED_THE_EXACT_OFFICIAL_SOURCE/)
 assert.match(core,/\^Bearer/)
 assert.match(route,/router.get\('\/academic-writer-preflight',protect,requireRoles\('admin','principal'\)/)
 const chunk=route.split("router.get('/academic-writer-preflight'")[1].split("router.get('/assessment-catalog/:examId/preview'")[0]
 assert.match(chunk,/BEGIN READ ONLY/)
 assert.match(chunk,/applyTenantContext\(c\)/)
 assert.doesNotMatch(chunk,/\b(?:INSERT|UPDATE|DELETE)\s+/i)
})

'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const {signedCatalogComplete,additionalPolicySql,documentPolicySql,EXPECTED} = require('./signedRlsCatalogGuard')
const core=()=>({forced:85,enabled:85,signed:77,signed_school:73,signed_tenant:4})
const extra=()=>({approved_additional:5})
test('current 85-forced-table catalog preserves all 77 core + five reviewed extra guards',()=>assert.equal(signedCatalogComplete(core(),extra(),{verified_documents:3}),true))
test('prior running green 77-hardcode would reject current real catalog',()=> {
 const c=core()
 assert.notEqual(c.forced,77)
 assert.equal(signedCatalogComplete(c,extra(),{verified_documents:3}),true)
})
for(const field of Object.keys(EXPECTED).filter(k=>k!=='approved_additional' && k!=='verified_documents')) {
 test('fails closed on drift '+field,()=>{
  const x=core();x[field]=EXPECTED[field]-1
  assert.equal(signedCatalogComplete(x,extra(),{verified_documents:3}),false)
  x[field]=EXPECTED[field]+1
  assert.equal(signedCatalogComplete(x,extra(),{verified_documents:3}),false)
 })
}
test('fails closed if fifth academic policy missing',()=>assert.equal(signedCatalogComplete(core(),{approved_additional:4},{verified_documents:3}),false))
test('fails closed if extra policies appear',()=>assert.equal(signedCatalogComplete(core(),{approved_additional:6},{verified_documents:3}),false))
test('fails closed on NULL, string and missing facts',()=>{
 assert.equal(signedCatalogComplete(null,extra(),{verified_documents:3}),false)
 assert.equal(signedCatalogComplete(core(),null,{verified_documents:3}),false)
 assert.equal(signedCatalogComplete(core(),{approved_additional:'5'},{verified_documents:3}),false)
 assert.equal(signedCatalogComplete({...core(),signed:undefined},extra(),{verified_documents:3}),false)
})
test('five individually reviewed policy names and exact predicate signatures are mandatory',()=>{
 for(const name of [
  'grade910_human_signoff_evidence','grade910_personal_signature_assets',
  'grade910_supporting_evidence_objects','grade910_verified_paper_publications',
  'school_academic_approval_events'
 ])assert.match(additionalPolicySql,new RegExp(name))
 assert.match(additionalPolicySql,/c\.relrowsecurity AND c\.relforcerowsecurity/)
 assert.match(additionalPolicySql,/p\.with_check IS NOT DISTINCT FROM expected\.insert_guard/)
 assert.match(additionalPolicySql,/p\.qual=expected\.predicate/)
 assert.match(additionalPolicySql,/p\.roles=ARRAY\['public'\]::name\[\]/)
 assert.match(additionalPolicySql,/count\(\*\) FROM pg_policies other/)
})

test('documents require exact three restrictive policy identities',()=>{
 assert.equal(signedCatalogComplete(core(),extra(),null),false)
 for(const n of [0,2,4,'3',undefined])assert.equal(signedCatalogComplete(core(),extra(),{verified_documents:n}),false)
 for(const name of ['school_documents','school_document_events','school_document_revisions'])
  assert.match(documentPolicySql,new RegExp(name))
 for(const fragment of ["p.permissive='RESTRICTIVE'",'c.relrowsecurity AND c.relforcerowsecurity',
   'p.qual=expected.guard_predicate','p.with_check=expected.guard_predicate','expected.policy_count','app.rls_enabled'])
  assert.ok(documentPolicySql.includes(fragment),fragment)
})

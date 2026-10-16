'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const {signedCatalogComplete,additionalPolicySql,EXPECTED} = require('./signedRlsCatalogGuard')
const core=()=>({forced:82,enabled:82,signed:77,signed_school:73,signed_tenant:4})
const extra=()=>({approved_additional:5})
test('current 82-forced-table catalog preserves all 77 core + five reviewed extra guards',()=>assert.equal(signedCatalogComplete(core(),extra()),true))
test('prior running green 77-hardcode would reject current real catalog',()=> {
 const c=core()
 assert.notEqual(c.forced,77)
 assert.equal(signedCatalogComplete(c,extra()),true)
})
for(const field of Object.keys(EXPECTED).filter(k=>k!=='approved_additional')) {
 test('fails closed on drift '+field,()=>{
  const x=core();x[field]=EXPECTED[field]-1
  assert.equal(signedCatalogComplete(x,extra()),false)
  x[field]=EXPECTED[field]+1
  assert.equal(signedCatalogComplete(x,extra()),false)
 })
}
test('fails closed if fifth academic policy missing',()=>assert.equal(signedCatalogComplete(core(),{approved_additional:4}),false))
test('fails closed if extra policies appear',()=>assert.equal(signedCatalogComplete(core(),{approved_additional:6}),false))
test('fails closed on NULL, string and missing facts',()=>{
 assert.equal(signedCatalogComplete(null,extra()),false)
 assert.equal(signedCatalogComplete(core(),null),false)
 assert.equal(signedCatalogComplete(core(),{approved_additional:'5'}),false)
 assert.equal(signedCatalogComplete({...core(),signed:undefined},extra()),false)
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

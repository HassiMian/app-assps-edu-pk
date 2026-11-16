'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {bridge}=require('./audit-a315-guard-bridge.cjs')
const root=process.env.A315_LIVE_ROOT||'/var/www/assps-releases/assps-diary-a208-word-narrow-margins-20261109'
test('current Diary source route passes without granting academic approval',()=>{
 const x=bridge('diary',root)
 assert.equal(x.status,'PASS')
 assert.equal(x.routeCount,4)
 assert.equal(x.sourceEvidenceOnly,true)
 assert.equal(x.academicRevisionApprovalGranted,false)
 assert.equal(x.prePromotionDecision,'PASS_DIARY_ACTIVE_CONTROLLER_PRESERVATION_ONLY')
})
test('current Marks Register passes source-only gate without school marks writes',()=>{
 const x=bridge('marks',root)
 assert.equal(x.status,'PASS')
 assert.equal(x.studentMarksMutated,false)
 assert.equal(x.checkedAssets.length,4)
})
test('current Result Cards stays on HOLD for nine unproven signals',()=>{
 const x=bridge('results',root)
 assert.equal(x.status,'FAIL')
 assert.equal(x.distinctPremiumTemplates,9)
 assert.equal(x.missingSignals.length,9)
 assert.ok(x.missingSignals.includes('scholars-archive'))
})
test('unrecognized gate category fails closed',()=>{
 assert.throws(()=>bridge('unknown',root),/A315_UNKNOWN_GUARD_KIND/)
})

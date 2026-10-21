'use strict'
// Pure tenant/channel isolation tests, no DB, network, WhatsApp, broker.
const test=require('node:test')
const assert=require('node:assert/strict')
const {inspectSchoolWebhookChanges}=require('../services/whatsapp/schoolWebhookChannelScope.cjs')
const good={entry:[{changes:[{value:{metadata:{phone_number_id:'school-1'},messages:[{id:'m'}]}}]}]}

test('all correctly scoped multiple change values are returned intact',()=>{
 const payload={entry:[{changes:[
  {value:{metadata:{phone_number_id:'school-1'},messages:[{id:'a'}]}},
  {value:{metadata:{phone_number_id:'school-1'},statuses:[{id:'b'}]}},
 ]}]}
 const outcome=inspectSchoolWebhookChanges(payload,'school-1')
 assert.equal(outcome.ok,true)
 assert.equal(outcome.values.length,2)
})
test('other school phone in same signed app is rejected',()=>{
 const result=inspectSchoolWebhookChanges(good,'different-school')
 assert.equal(result.ok,false)
 assert.equal(result.reason,'SCHOOL_PHONE_SCOPE_MISMATCH')
 assert.deepEqual(result.values,[])
})
test('unconfigured school number fails closed for actual messages',()=>{
 const result=inspectSchoolWebhookChanges(good,'')
 assert.equal(result.ok,false)
 assert.equal(result.reason,'SCHOOL_PHONE_SCOPE_NOT_CONFIGURED')
})
test('missing metadata or changed phone ID in second entry rejects whole batch',()=>{
 const payload={entry:[good.entry[0],{changes:[{value:{messages:[{id:'c'}]}}]}]}
 assert.equal(inspectSchoolWebhookChanges(payload,'school-1').ok,false)
})
test('status-only foreign phone number is blocked',()=>{
 const payload={entry:[{changes:[{value:{metadata:{phone_number_id:'other'},statuses:[{id:'status'}]}}]}]}
 assert.equal(inspectSchoolWebhookChanges(payload,'school-1').reason,'SCHOOL_PHONE_SCOPE_MISMATCH')
})
test('empty non-message provider change does not generate a school event',()=>{
 const payload={entry:[{changes:[{value:{metadata:{phone_number_id:'other'},contacts:[{}]}}]}]}
 const outcome=inspectSchoolWebhookChanges(payload,'school-1')
 assert.equal(outcome.ok,true)
 assert.equal(outcome.values.length,1)
})

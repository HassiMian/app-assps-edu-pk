'use strict'
// Pure identity-boundary unit tests; no network/database connection or writes.
process.env.DB_STARTUP_PROBE = 'false'
const test = require('node:test')
const assert = require('node:assert/strict')
const { currentSchoolId } = require('../middleware/tenant')

const req = (user = null, extras = {}) => ({user, ...extras})

test('authenticated scoped user school claim outranks mismatched request fields', () => {
 const user = {role:'teacher',school_id:1}
 assert.equal(currentSchoolId(req(user,{school_id:2,tenantSchoolId:2,query:{school_id:2},headers:{'x-school-id':'2'}})),1)
})
test('scoped user never trusts query or forwarded school-id header', () => {
 assert.equal(currentSchoolId(req({role:'principal',school_id:1},{query:{school_id:2},headers:{'x-school-id':'2'}})),1)
 assert.equal(currentSchoolId(req({role:'teacher'},{query:{school_id:2},headers:{'x-school-id':'2'}})),null)
})
test('unauthenticated query and header never select another school', () => {
 assert.equal(currentSchoolId(req(null,{query:{school_id:'2'},headers:{'x-school-id':'2'}})),null)
})
test('signed server claim can support legacy actor without school claim', () => {
 assert.equal(currentSchoolId(req({role:'service'},{school_id:'12'})),12)
 assert.equal(currentSchoolId(req(null,{school_id:12})),12)
})
test('invalid partial, negative, noninteger and unsafe IDs never become authority', () => {
 const values=['2abc','2e3','2.1','+2','-2','0','002','',null,undefined,2.3,0,-2,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,{},['2']]
 for(const value of values) {
  assert.equal(currentSchoolId(req({role:'teacher',school_id:value})),null,String(value))
 }
})
test('canonical positive decimal strings and safe integer school IDs work', () => {
 for(const value of [1,12,'1','12',' 12 ']) {
  assert.equal(currentSchoolId(req({role:'teacher',school_id:value})),Number(value))
 }
})
test('platform school selection requires authenticated platform role', () => {
 assert.equal(currentSchoolId(req({role:'platform_owner'},{query:{school_id:'12'}})),12)
 assert.equal(currentSchoolId(req({role:'super_admin'},{headers:{'x-school-id':'12'}})),12)
 assert.equal(currentSchoolId(req(null,{query:{school_id:'12'}})),null)
})

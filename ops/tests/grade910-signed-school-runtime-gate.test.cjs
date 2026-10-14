'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {requireSignedSchool}=require('../../al-siddique-backend/src/services/grade910SignedSchoolGate')
test('signed Core predicate true authorizes tenant-bound operation',async()=>{
 let call
 assert.equal(await requireSignedSchool(11,async(query,args)=>{call={query,args};return{rows:[{allowed:true}]}}),true)
 assert.match(call.query,/core_security.signed_school_allowed/)
 assert.deepEqual(call.args,[11])
})
test('unsigned/forged school actor is denied, even if JWT is syntactically valid',async()=>{
 await assert.rejects(requireSignedSchool(11,async()=>({rows:[{allowed:false}]})),/CORE_SIGNED_SCHOOL_CONTEXT_REQUIRED/)
})
test('missing Core signed security function fails closed',async()=>{
 await assert.rejects(requireSignedSchool(11,async()=>{throw Error('permission denied')}),/CORE_SIGNED_SCHOOL_RUNTIME_NOT_CERTIFIED/)
})
test('school id null, zero, string garbage all rejected before SQL access',async()=>{
 for(const id of [0,null,undefined,-1,'fake']){
  await assert.rejects(requireSignedSchool(id,async()=>{throw Error('SHOULD_NOT_QUERY')}),/SIGNED_SCHOOL_SCOPE_REQUIRED/)
 }
})

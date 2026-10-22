'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {evaluateOwnerClaimCandidate:evaluate}=require('../services/schoolOwnerIdentityEligibility')
const school={id:1,status:'active',owner_verified_email:'verified.owner@example.org',owner_verified_phone:'03001234567'}
const user={id:4,school_id:1,is_active:true,role:'admin',email:'verified.owner@example.org',phone:'03001234567'}
const proof={freshSignedUserSession:true,independentOwnerContactChallenge:true,institutionalOwnershipAttested:true,differentSchoolDenied:true}
test('blank owner metadata can never match blank admin contact',()=>{
 const x=evaluate({school:{id:1,status:'active',owner_verified_email:'',owner_verified_phone:''},
 user:{...user,email:'',phone:''},proof})
 assert.equal(x.eligibleForHumanAuthorizedProvisioning,false)
 assert.ok(x.reasons.includes('VERIFIED_OWNER_CONTACT_MATCH_REQUIRED'))
 assert.equal(x.automaticallyPromoted,false)
})
test('matched contact cannot replace authenticated challenge nor school identity',()=>{
 for(const change of [
  {proof:{...proof,independentOwnerContactChallenge:false}},
  {proof:{...proof,differentSchoolDenied:false}},
  {user:{...user,school_id:2}},
  {user:{...user,is_active:false}},
  {school:{...school,status:'unpaid'}}
 ]){
  const x=evaluate({school,user,proof,...change})
  assert.equal(x.eligibleForHumanAuthorizedProvisioning,false)
  assert.equal(x.automaticallyPromoted,false)
 }
})
test('all independent evidence permits review, never automatic promotion',()=>{
 const x=evaluate({school,user,proof})
 assert.equal(x.eligibleForHumanAuthorizedProvisioning,true)
 assert.equal(x.automaticallyPromoted,false)
 assert.equal(x.sourceRole,'admin')
})
test('telephone and email must not be normalized to matching empty strings',()=>{
 const candidate={...user,email:'',phone:'',role:'super_admin'}
 const x=evaluate({school:{...school,owner_verified_email:null,owner_verified_phone:null},user:candidate,proof})
 assert.equal(x.eligibleForHumanAuthorizedProvisioning,false)
 assert.ok(x.reasons.includes('VERIFIED_OWNER_CONTACT_MATCH_REQUIRED'))
})

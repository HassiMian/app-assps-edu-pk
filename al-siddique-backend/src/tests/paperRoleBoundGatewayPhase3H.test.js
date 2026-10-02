// Offline FAIL-CLOSED identity gateway tests: NO real DB import, NO live connection.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {appendRoleBoundStagingDraftRevision,assertBoundIdentityResult,trustedSchoolFromActor,
 ROLE_BOUND_ID_SQL}=require('../services/papers/paperRoleBoundStagingGateway.js')
const gate={targetEnvironment:'ASSPS_ISOLATED_STAGING',confirmedNotProduction:true,
 readonlySchemaInventoryReviewed:true,encryptedBackupVerified:true,
 backupRestoreTestPassed:true,serverAuthenticatedSchoolScopeVerified:true,
 twoSchoolIsolationTestPassed:true,originalApprovedVisualEvidenceIndependentlyReviewed:true}
const actor={id:11,school_id:51,role:'teacher'}
test('unbound or malformed session identity is always DENIED, never auto-default to actor or GUC',()=>{
 for(const r of [null,undefined,{rowCount:0,rows:[]},
  {rowCount:1,rows:[{verified_school_id:null}]},
  {rowCount:1,rows:[{verified_school_id:52}]},
  {rowCount:2,rows:[{verified_school_id:51},{verified_school_id:52}]},
  {rowCount:1,rows:[{verified_school_id:0}]}]){
  assert.throws(()=>assertBoundIdentityResult(r,51),/NOT independently bound/)
 }
 assert.equal(assertBoundIdentityResult({rowCount:1,rows:[{verified_school_id:51}]},51),true)
 assert.match(ROLE_BOUND_ID_SQL,/phase3h_session_school_id/)
 assert.doesNotMatch(ROLE_BOUND_ID_SQL,/set_config|paper_school_id|\$1/)
})
test('missing gate or untrusted actors reject BEFORE opening a connection',async()=>{
 let calls=0
 const connect=async()=>{calls++;throw new Error('must not run')}
 for(const options of [
  {gate:null,actor},
  {gate,actor:null},
  {gate,actor:{...actor,school_id:null}},
  {gate,actor:{...actor,role:'student'}},
  {gate,actor:{...actor,role:'super_admin'}},
 ]){
  await assert.rejects(()=>appendRoleBoundStagingDraftRevision({connect,...options}),/Staging blocked|authenticated|valid school ID/)
 }
 assert.equal(calls,0)
 assert.equal(trustedSchoolFromActor(actor),51)
})
test('incorrect DB LOGIN-school identity quarantines connector BEFORE BEGIN or any document read',async()=>{
 const events=[],releaseErrors=[]
 const connect=async()=>({query:async(sql)=>{
  events.push(sql)
  return {rowCount:1,rows:[{verified_school_id:52}]}
 },release:error=>releaseErrors.push(Boolean(error))})
 await assert.rejects(()=>appendRoleBoundStagingDraftRevision({
  gate,actor,connect,paperId:'synthetic',expectedRevision:1,
  expectedNativeSha256:'a'.repeat(64),proposedNativeJsonText:'{}',
 }),/LOGIN role is NOT independently bound/)
 assert.deepEqual(events,[ROLE_BOUND_ID_SQL])
 assert.deepEqual(releaseErrors,[true])
})
test('missing DB role mapping returns no row, closes connector and cannot consult a client-supplied tenant',async()=>{
 let opened=0,released=0
 const connect=async()=>{opened++;return {
  query:async(sql)=>{assert.equal(sql,ROLE_BOUND_ID_SQL);return {rowCount:1,rows:[{verified_school_id:null}]}},
  release:err=>{assert.ok(err);released++},
 }}
 await assert.rejects(()=>appendRoleBoundStagingDraftRevision({
  gate,actor,connect,paperId:'draft-001',claimedSchoolId:52,
  expectedRevision:1,expectedNativeSha256:'a'.repeat(64),proposedNativeJsonText:'{}',
 }),/LOGIN role is NOT independently bound/)
 assert.equal(opened,1)
 assert.equal(released,1)
})

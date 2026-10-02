// No DB connection. Contract tests for future authenticated, immutable, CAS persistence.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createHash}=require('node:crypto')
const {assertSchoolPaperAuthorization,preparePaperRevisionCAS}=require('../services/papers/paperRevisionPolicy.js')
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex')
const source={id:'draft-001',config:{totalMarks:50,subject:'Science'},status:'DRAFT',
 createdAt:'2026-10-02T01:00:00.000Z',sourcePaperId:'teacher-reference-01'}
const nativeJsonText=JSON.stringify(source)
const record={id:source.id,schoolId:51,createdBy:11,status:'DRAFT',
 revision:3,nativeJsonText,nativeSha256:sha(nativeJsonText),sourceProtected:false}
const actor={id:11,role:'teacher',school_id:51}
const next=JSON.stringify({...source,config:{...source.config,totalMarks:55}})
const request=(extra={})=>({actor,record,expectedRevision:3,expectedNativeSha256:record.nativeSha256,
 proposedNativeJsonText:next,...extra})
test('authorized original teacher and principal share school-scoped draft read/prepare',()=>{
 assert.equal(assertSchoolPaperAuthorization({actor,record,operation:'read'}).permitted,true)
 assert.equal(assertSchoolPaperAuthorization({actor,record,operation:'prepare_revision'}).schoolId,51)
 assert.equal(assertSchoolPaperAuthorization({actor:{id:4,role:'principal',school_id:51},record,operation:'prepare_revision'}).permitted,true)
})
test('role without auth context and unverified school ID cannot access paper',()=>{
 assert.throws(()=>assertSchoolPaperAuthorization({actor:null,record}),/authenticated/)
 assert.throws(()=>assertSchoolPaperAuthorization({actor:{id:1,role:'student',school_id:51},record}),/authenticated/)
 assert.throws(()=>assertSchoolPaperAuthorization({actor,record:{...record,schoolId:null}}),/owning school/)
})
test('tenant mismatch is a hard denial even if caller supplies claimed query/header school context',()=>{
 const bad={...actor,school_id:99}
 assert.throws(()=>assertSchoolPaperAuthorization({actor:bad,record,operation:'prepare_revision',
  requestHeaders:{'x-school-id':'51'}}),/Cross-school/)
})
test('platform admin requires independently verified target school; no implicit cross-school bypass',()=>{
 const superAdmin={id:1,role:'super_admin'}
 assert.throws(()=>assertSchoolPaperAuthorization({actor:superAdmin,record,operation:'prepare_revision'}),/separately verified/)
 assert.throws(()=>assertSchoolPaperAuthorization({actor:superAdmin,record,operation:'prepare_revision',
  platformScopeVerified:true,verifiedPlatformSchoolId:99}),/separately verified/)
 assert.equal(assertSchoolPaperAuthorization({actor:superAdmin,record,operation:'read',
  platformScopeVerified:true,verifiedPlatformSchoolId:51}).permitted,true)
})
test('teacher cannot change someone else paper, admin still subject to same-school and draft-only',()=>{
 assert.throws(()=>assertSchoolPaperAuthorization({actor:{...actor,id:12},record,operation:'prepare_revision'}),/only their own/)
 assert.equal(assertSchoolPaperAuthorization({actor:{id:22,role:'admin',school_id:51},record,operation:'prepare_revision'}).permitted,true)
})
test('approved/locked/reference paper and arbitrary unknown operations cannot be changed',()=>{
 for(const status of ['APPROVED','LOCKED','SOURCE_REFERENCE','RETIRED']){
  assert.throws(()=>assertSchoolPaperAuthorization({actor,record:{...record,status},operation:'prepare_revision'}),/Only independent DRAFT/)
 }
 assert.throws(()=>assertSchoolPaperAuthorization({actor,record:{...record,sourceProtected:true},operation:'prepare_revision'}),/immutable/)
 assert.throws(()=>assertSchoolPaperAuthorization({actor,record,operation:'approve'}),/inactive paper operation/)
})
test('expected revision and source SHA must match stored exact native JSON TEXT',()=>{
 assert.throws(()=>preparePaperRevisionCAS(request({expectedRevision:2})),/revision conflict/)
 assert.throws(()=>preparePaperRevisionCAS(request({expectedNativeSha256:'f'.repeat(64)})),/Source SHA conflict/)
 assert.throws(()=>preparePaperRevisionCAS(request({record:{...record,nativeSha256:'e'.repeat(64)}})),/payload\/hash mismatch/)
 assert.throws(()=>preparePaperRevisionCAS(request({record:{...record,nativeJsonText:next}})),/payload\/hash mismatch/)
})
test('prepared revision returns immutable CAS preconditions and SHA but executes ZERO DB writes',()=>{
 const before=JSON.stringify(record),plan=preparePaperRevisionCAS(request())
 assert.equal(plan.state,'PREPARED_ONLY_NOT_EXECUTED')
 assert.equal(plan.schoolId,51)
 assert.equal(plan.paperId,'draft-001')
 assert.equal(plan.expectedRevision,3)
 assert.equal(plan.nextRevision,4)
 assert.equal(plan.expectedNativeSha256,record.nativeSha256)
 assert.equal(plan.nextNativeSha256,sha(next))
 assert.equal(plan.nextNativeJsonText,next)
 assert.equal(plan.approvalGranted,false)
 assert.match(plan.requiredTransaction,/UPDATE paper_documents/)
 assert.equal(JSON.stringify(record),before)
})
test('identity/provenance and approval cannot be silently rewritten even on authorized current draft',()=>{
 for(const modified of [
  {...source,id:'different'}, {...source,sourcePaperId:'other'}, {...source,createdAt:'2026-10-03'},
  {...source,printReadiness:'APPROVED'}, {...source,status:'approved'},
 ]){
  assert.throws(()=>preparePaperRevisionCAS(request({proposedNativeJsonText:JSON.stringify(modified)})),/immutable paper ID|Protected native field|self-approve/)
 }
})
test('malformed, empty, overlarge, array, and no-change proposals blocked',()=>{
 assert.throws(()=>preparePaperRevisionCAS(request({proposedNativeJsonText:'not-json'})),/invalid JSON/)
 assert.throws(()=>preparePaperRevisionCAS(request({proposedNativeJsonText:JSON.stringify([])})),/must remain JSON objects/)
 assert.throws(()=>preparePaperRevisionCAS(request({proposedNativeJsonText:'x'.repeat(5*1024*1024+1)})),/bounded/)
 assert.throws(()=>preparePaperRevisionCAS(request({proposedNativeJsonText:nativeJsonText})),/No changes/)
})
test('one source revision supports one future CAS; stale second writer must be rejected after revision changes',()=>{
 const first=preparePaperRevisionCAS(request())
 const simulatedCommitted={...record,revision:first.nextRevision,nativeJsonText:first.nextNativeJsonText,
  nativeSha256:first.nextNativeSha256}
 assert.throws(()=>preparePaperRevisionCAS(request({record:simulatedCommitted})),/revision conflict/)
})

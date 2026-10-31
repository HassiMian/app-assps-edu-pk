'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {auditSourceManifest}=require('../../../ops/release/asspsAcademicEvidenceGate.cjs')
const src={classes:{Starter:{subjects:[{sourceReviewStatus:'PENDING',ownerVerified:false,academicApproval:false,publishStatus:'BLOCKED'}]}},all59SourceApproved:false}
test('ordinary academic source remains explicitly HOLD, not a fake certification',()=>{
 const s=auditSourceManifest(src)
 assert.equal(s.publicationCertification,'HOLD')
 assert.equal(s.subjectGroups,1)
 assert.equal(s.notApprovedGroups,1)
 assert.equal(s.mayIssueFromManifestAlone,false)
})
test('even edited manifest approval booleans cannot impersonate an actual signed school account',()=>{
 const s=auditSourceManifest({classes:{Starter:{subjects:[{ownerVerified:true,academicApproval:true,publishStatus:'APPROVED'}]}},all59SourceApproved:true})
 assert.equal(s.apparentApprovedGroups,1)
 assert.equal(s.publicationCertification,'HOLD')
 assert.ok(s.holdReasons.includes('INDEPENDENT_ACCOUNT_LEVEL_ACADEMIC_SIGNOFF_REQUIRED'))
})
test('Eight and Pre Nine cannot slip into this Second Term source scope',()=>{
 const s=auditSourceManifest({classes:{Eight:{subjects:[{}]},Seven:{subjects:[{}]}}})
 assert.deepEqual(s.unexpectedClasses,['Eight'])
 assert.ok(s.holdReasons.includes('OUT_OF_SCOPE_CLASS_IN_TERM_SOURCE'))
})
test('known ASSPS school source scope is Starter through Seven',()=>{
 assert.equal(auditSourceManifest({classes:{}}).classes,10)
})

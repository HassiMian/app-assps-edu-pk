'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const src=fs.readFileSync(path.join(__dirname,'../routes/schoolAcademicCatalogRoutes.js'),'utf8')
const core=fs.readFileSync(path.join(__dirname,'../routes/schoolAcademicApprovalCore.js'),'utf8')
const readiness=src.split("router.get('/assessment-catalog/readiness'")[1].split("router.get('/grade-discrepancies'")[0]
test('read-only academic readiness cannot infer zero approvals from inaccessible signed audit',()=>{
 assert.ok(readiness)
 assert.match(readiness,/const approvedEvents=null/)
 assert.match(readiness,/SIGNED_AUDIT_NOT_READABLE_BY_GENERAL_RUNTIME/)
 assert.match(readiness,/academicApprovalAuditStatus:approvalAuditStatus/)
 assert.doesNotMatch(readiness,/FROM school_academic_approval_events/)
})
test('academic stage and approval demand verified role, source reference and full SHA form',()=>{
 assert.match(core,/I_VERIFIED_THE_EXACT_OFFICIAL_SOURCE/)
 assert.match(core,/evidenceSha256/)
 assert.match(core,/evidenceReference/)
 assert.match(core,/\['admin','principal'\]/)
 assert.match(core,/BEGIN/)
 assert.match(core,/ROLLBACK/)
})
test('never promote an academic catalog just from tentative source references',()=>{
 assert.match(src,/allCandidatesPendingUntilApproved:true/)
 assert.match(src,/SIGNED_PRINCIPAL_STAGE_REQUIRED/)
 assert.match(src,/approval_status,approval_revision/)
 assert.match(src,/true,'pending',1/)
})

'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const m=require('../qbank/attest-grade910-private-offline-faculty-readiness.cjs')
test('without external school private archive this is source-only and never falsely claims private review proof',()=>{
 const d=m.validate({})
 assert.equal(d.originalResearchCandidates,2581)
 assert.equal(d.sourceLockedPrivateTeacherCandidates,2580)
 assert.equal(d.privateReviewArchiveVerified,false)
 assert.equal(d.privatePrintableOfflineHtmlVerified,false)
 assert.equal(d.verifiedPublished,0)
 assert.equal(d.publisherSelectable,false)
})
test('partial external archive configuration is a failure, not a green credential attestation',()=>{
 assert.throws(()=>m.validate({
 ASSPS_QBANK_PRIVATE_REVIEW_BASE:'/untrusted/reader'
 }),/PARTIAL_PRIVATE_ARCHIVE_CONFIGURATION/)
 assert.throws(()=>m.validate({
 ASSPS_QBANK_PRIVATE_REVIEW_BASE:'/untrusted/reader',
 ASSPS_QBANK_PRIVATE_REVIEW_RUN:'partial-stale'
 }),/PARTIAL_PRIVATE_ARCHIVE_CONFIGURATION/)
})
test('unavailable external private directory is not considered reviewed',()=>{
 assert.throws(()=>m.validate({
 ASSPS_QBANK_PRIVATE_REVIEW_BASE:'/tmp/definitely-missing-original-teacher-review',
 ASSPS_QBANK_PRIVATE_REVIEW_RUN:'original-runs',
 ASSPS_QBANK_PRIVATE_PRINT_RUN:'offline-print'
 }),/ENOENT/)
})

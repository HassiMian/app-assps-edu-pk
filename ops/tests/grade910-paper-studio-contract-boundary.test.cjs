'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const m=require('../qbank/attest-grade910-paper-studio-publisher-boundary.cjs')
let cache
const read=()=>cache??(cache=m.build())
test('all original candidate revisions 2581 exposed as nonpublishable, nonstudent content',()=>{
 const x=read()
 assert.equal(x.originalQuestionCount,2581)
 assert.equal(x.rows.length,2581)
 assert.equal(new Set(x.rows.map(r=>r.originalQuestionId)).size,2581)
 assert.equal(x.academicallyApproved,0)
 assert.equal(x.academicallyPublished,0)
 assert.equal(x.teacherVerifiedSelectable,0)
 assert.equal(x.productionWritePermitted,false)
 assert.match(x.allOriginalRevisionSetSha256,/^[0-9a-f]{64}$/)
 assert.ok(x.rows.every(r=>r.lifecycle==='RESEARCH_CANDIDATE'&&r.paperStudioVerifiedSelectable===false))
 assert.ok(x.rows.every(r=>r.finalQuestionAndAnswerReviewSignature===null))
 assert.ok(x.rows.every(r=>r.authenticatedSchoolAcademicApproval===false))
})
test('no original content, answer, or source PDF hash can auto-set verified school approval',()=>{
 const x=read()
 assert.equal(x.questionPdfDigestByteMatching,2537)
 assert.equal(x.questionPdfDigestUnstated,44)
 assert.equal(x.rows.every(r=>!Object.hasOwn(r,'answer')&&!Object.hasOwn(r,'options')&&!Object.hasOwn(r,'stem')),true)
 assert.equal(x.rows.every(r=>!Object.hasOwn(r,'pdfSha256')),true)
 assert.ok(x.requiredServerGates.some(s=>s.includes('tenant')))
 assert.equal(x.tenantAndProductionOwner,'SaaS Core & Production Master')
})
test('forged approved question or stale source SHA cannot be converted to teacher picker contract',()=>{
 const q=read().rows[0]
 const fake={originalQuestionId:q.originalQuestionId,
  originalQuestionRevisionSha256:q.originalQuestionRevisionSha256,
  originalSourceFileSha256:q.originalSourceFileSha256,
  academicallyApproved:true,verifiedPaperStudioSelectable:true}
 assert.throws(()=>m.row(fake),/RESEARCH_REVISION_OR_APPROVAL_IDENTITY_DRIFT/)
 fake.academicallyApproved=false;fake.verifiedPaperStudioSelectable=false
 fake.originalQuestionRevisionSha256='not-a-sha'
 assert.throws(()=>m.row(fake),/RESEARCH_REVISION_OR_APPROVAL_IDENTITY_DRIFT/)
})
test('materialized stable academic/Paper Studio owner handoff equals frozen generated source',()=>{
 const x=JSON.parse(fs.readFileSync(m.OUT,'utf8'))
 assert.deepEqual(x,read())
 assert.equal(fs.readFileSync(m.REPORT,'utf8'),m.render(read()))
})

test('50 grade/medium correction PROPOSALS stay research-only; two Biology Urdu+English items recognized',()=>{
 const x=read()
 assert.equal(x.researchMetadataProposalsAwaitIndependentReview,50)
 assert.equal(x.originalLegacyMcqPositionProposalsAwaitTeacherReview,24)
 assert.equal(x.originalBilingualBiologyQuestionProposalsAwaitUrduReview,2)
 const proposed=x.rows.filter(q=>q.pendingHumanLegacyMetadataProposal)
 assert.equal(proposed.length,50)
 assert.equal(proposed.filter(q=>q.pendingHumanLegacyMetadataProposal.tentativeLegacyMcqPosition).length,24)
 assert.equal(proposed.filter(q=>q.pendingHumanLegacyMetadataProposal.medium==='dual').length,2)
 assert.ok(proposed.every(q=>q.pendingHumanLegacyMetadataProposal.automaticallyAppliesToPaperStudio===false))
 assert.ok(proposed.every(q=>q.authenticatedSchoolAcademicApproval===false))
})

test('school adopted edition and original cross-grade Urdu source remain an explicit publisher HOLD',()=>{
 const x=read()
 assert.equal(x.catalogEntriesAwaitingRealASSPSBookAdoption,56)
 assert.equal(x.crossGradeUrduOriginalsAwaitingTextbookGradeResolution,70)
 assert.equal(x.realSchoolAdoptionObjectBytesIndependentlyAuthorized,0)
 assert.equal(x.requireActualShaVerifiedPrivateEvidenceObjects,true)
 const cross=x.rows.filter(r=>r.schoolAdoptionCatalogGradeUnassigned)
 assert.equal(cross.length,70)
 assert.ok(cross.every(r=>r.schoolAdoptedEditionAndExamYearVerified===false))
 assert.ok(cross.every(r=>r.sourceEvidenceObjectBytesIndependentlyVerifiedForQuestion===false))
 assert.equal(x.teacherVerifiedSelectable,0)
})

test('all 2581 research candidates retain official-link versus archive source distinction in approved-only handoff',()=>{
 const x=read()
 assert.equal(x.originalCandidateSourceRefsWithOfficialCatalogAnchorClaim,2377)
 assert.equal(x.originalCandidateSourceRefsRecoveredFromArchiveNotExactOfficialLink,204)
 assert.equal(x.authoringGradeSubjectChapterBucketsResearchOnly,396)
 assert.equal(x.originalCandidateGradeOrChapterUnassigned,44)
 const a=x.rows.filter(q=>q.originalSourceAcquisitionClass===
  'ARCHIVE_RECOVERED_NOT_EXACT_OFFICIAL_ASSET_LINK')
 assert.equal(a.length,204)
 assert.ok(a.every(q=>q.paperStudioVerifiedSelectable===false))
 assert.ok(a.every(q=>q.sourceOfficialCatalogProvenanceNotActualAdoption===true))
 assert.ok(x.rows.every(q=>q.sourceOfficialCatalogProvenanceNotActualAdoption===true))
 assert.equal(x.teacherVerifiedSelectable,0)
})

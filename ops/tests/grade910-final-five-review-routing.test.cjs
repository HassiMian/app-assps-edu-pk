'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const routing=require('../qbank/attest-grade910-final-five-review-routing.cjs')
const reconcile=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
const load=()=>routing.loadInputs()
const ixId=['IX-CHEM-2025-C11-T4-01L','IX-CHEM-2025-C11-T4-02L']
const xId=['X-CHEM-C18-L01','X-CHEM-C23-L01','X-CHEM-C24-L01']
test('previous source-locked reviewer handoff actually omitted all five grade values (fixed by additive v2)',()=>{
 const old=JSON.parse(fs.readFileSync('docs/question-bank/ASSPS_GRADE910_161_REVISION_AND_FIVE_PENDING_FACULTY_HANDOFF_20261010.json'))
 assert.equal(old.originalFiveFacultyReviewDocket.length,5)
 assert.ok(old.originalFiveFacultyReviewDocket.every(q=>!Object.hasOwn(q,'grade')))
})
test('new route derives exact Grade IX 2 / Grade X 3 from original curriculum and catalog, not ID guess alone',()=>{
 const d=routing.assertPinned(load())
 assert.equal(d.totalOriginalReviewRequests,5)
 assert.equal(d.grade9ChemistryRequests,2)
 assert.equal(d.grade10ChemistryRequests,3)
 assert.deepEqual(d.reviewerRoutes.filter(q=>q.grade===9).map(q=>q.questionId),ixId)
 assert.deepEqual(d.reviewerRoutes.filter(q=>q.grade===10).map(q=>q.questionId),xId)
 assert.ok(d.reviewerRoutes.every(q=>q.subject==='Chemistry'&&q.medium==='English'))
})
test('revisions, source catalog sha and edition labels are bound, but cannot imply school adoption',()=>{
 for(const q of routing.build(load()).reviewerRoutes){
  assert.match(q.originalQuestionRevisionSha256,/^[a-f0-9]{64}$/)
  assert.match(q.originalRubricSha256,/^[a-f0-9]{64}$/)
  assert.match(q.catalogPdfSha256Claim,/^[a-f0-9]{64}$/)
  assert.equal(q.schoolAdoptionEvidenceOwner,'ASSPS authorized textbook coordinator')
  assert.equal(q.reviewerMustBeIndependentFromDraftAuthor,true)
  assert.equal(q.sourceSchoolAdoptionAndPrintedPageApproved,false)
  assert.equal(q.originalQuestionAndAnswerCorrectnessApproved,false)
  assert.equal(q.independentEnglishUrduReviewApproved,false)
  assert.equal(q.originalityOverlapReviewApproved,false)
  assert.equal(q.qualificationAndIdentityVerified,false)
  assert.equal(q.independentReviewerId,null)
  assert.equal(q.approvedRevisionSha256,null)
  assert.equal(q.academicallyApproved,false)
  assert.equal(q.verifiedPublished,false)
  assert.equal(q.publicationAccess,'DENY')
 }
})
test('grade IX catalog record wrong grade fails even when old handoff gate passed',()=>{
 const x=load()
 x.old.registry.entries.find(q=>q.recordId==='pectaa-catalog-007').grade=10
 assert.throws(()=>routing.build(x),/CHEM9C13_CATALOG_DRIFT_OR_FALSE_APPROVAL|REVIEW_ROUTING_GRADE_SUBJECT_MEDIUM_OR_CATALOG_MISMATCH/)
})
test('grade X catalog record wrong grade fails even when original draft says grade X',()=>{
 const x=load()
 x.old.registry.entries.find(q=>q.recordId==='pectaa-recovered-chemistry10-en-2026').grade=9
 assert.throws(()=>routing.build(x),/REVIEW_ROUTING_GRADE_SUBJECT_MEDIUM_OR_CATALOG_MISMATCH/)
})
test('grade X incorrect subject is rejected before reviewer routing',()=>{
 const x=load()
 x.old.registry.entries.find(q=>q.recordId==='pectaa-recovered-chemistry10-en-2026').subject='Physics'
 assert.throws(()=>routing.build(x),/REVIEW_ROUTING_GRADE_SUBJECT_MEDIUM_OR_CATALOG_MISMATCH/)
})
test('grade X false claim of Urdu medium is rejected; no invented bilingual parity',()=>{
 const x=load()
 x.old.registry.entries.find(q=>q.recordId==='pectaa-recovered-chemistry10-en-2026').medium='Urdu'
 assert.throws(()=>routing.build(x),/REVIEW_ROUTING_GRADE_SUBJECT_MEDIUM_OR_CATALOG_MISMATCH/)
})
test('catalog claimed source edition mismatch cannot silently route an approved textbook',()=>{
 const x=load()
 x.old.registry.entries.find(q=>q.recordId==='pectaa-recovered-chemistry10-en-2026').edition='2026-27'
 assert.throws(()=>routing.build(x),/REVIEW_ROUTING_GRADE_SUBJECT_MEDIUM_OR_CATALOG_MISMATCH/)
})
test('catalog PDF hash for pending Grade X school claim cannot be substituted',()=>{
 const x=load()
 x.old.registry.entries.find(q=>q.recordId==='pectaa-recovered-chemistry10-en-2026').pdfSha256='f'.repeat(64)
 assert.throws(()=>routing.build(x),/REVIEW_ROUTING_GRADE_SUBJECT_MEDIUM_OR_CATALOG_MISMATCH/)
})
test('pretending a catalog record already holds academic approval fails even if source matched',()=>{
 const x=load()
 x.old.registry.entries.find(q=>q.recordId==='pectaa-recovered-chemistry10-en-2026').academicApproval=true
 assert.throws(()=>routing.build(x),/REVIEW_ROUTING_GRADE_SUBJECT_MEDIUM_OR_CATALOG_MISMATCH/)
})
test('duplicate registry source identity rejected before any assignment',()=>{
 const x=load()
 x.old.registry.entries.push(structuredClone(x.old.registry.entries[0]))
 assert.throws(()=>routing.build(x),/REVIEW_ROUTING_CATALOG_SOURCE_REGISTRY_UNTRUSTWORTHY/)
})
test('original Grade IX/X question file mutation cannot be laundered as a new grade',()=>{
 const x=load(),k='chemistry10Starter2026.json',d=JSON.parse(x.old.originalOutstanding[k])
 d.drafts.find(q=>q.id==='X-CHEM-C23-L01').curriculum.grade=9
 x.old.originalOutstanding[k]=Buffer.from(JSON.stringify(d,null,2)+'\n')
 assert.throws(()=>routing.build(x),/ACADEMIC161_PENDING_ORIGINAL_SOURCE_BYTES_DRIFT/)
})
test('frozen routing manifest raw bytes are pinned, not only in-memory counts',()=>{
 const bytes=fs.readFileSync('docs/question-bank/'+routing.NAME+'.json')
 const changed=Buffer.from(bytes);changed[124]^=1
 assert.throws(()=>routing.assertPinned(load(),changed),/REVIEW_ROUTING_PINNED_REVIEW_ROUTING_SHA_DRIFT/)
})
test('original full source-linked 161 ledger now includes the routing check as a blocking prerequisite',()=>{
 const d=reconcile.reconcile(reconcile.loadInputs())
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(d.originalRubricOnlyIdsWithoutNewAnswerDraft,5)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('Markdown explicitly labels routes unassigned and continues DENY verified publication',()=>{
 const d=routing.build(load()),md=routing.markdown(d)
 assert.match(md,/Grade IX Chemistry English/)
 assert.match(md,/Grade X Chemistry English/)
 assert.match(md,/NOT ASSIGNED \/ NOT APPROVED/)
 assert.match(md,/catalog/)
 assert.match(md,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
})

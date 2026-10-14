'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {requireAdoptedSource,SCHOOL_ADOPTIONS}=require('../services/grade910SchoolAdoptionGate')
const {requirePhysicalPageProof,PAGE_REGISTRY}=require('../services/grade910PhysicalPageGate')
const {normalizeEvidence,ACADEMIC_REVIEW_VERSION,ATTESTATIONS}=require('../services/grade910AcademicReviewGate')
const REGISTRY=require('../data/verifiedGrade910SourceRegistry.json')
const source=REGISTRY.entries.find(x=>x.recordId==='pectaa-catalog-009')
const question={classLevel:'9th',subject:'Biology',medium:'English',chapterNo:'1'}
const evidence={
 schemaVersion:ACADEMIC_REVIEW_VERSION,sourceRecordId:source.recordId,sourcePdfSha256:source.pdfSha256,
 edition:source.edition,chapterNo:'1',questionOrigin:'ORIGINAL',sourcePrintedPage:null,
 exerciseReference:null,schoolAdoptionId:'SYNTHETIC-ADOPTION-001',schoolAcademicSession:'2026-27',
 boardExamYear:2027,chapterPageEvidenceId:'SYNTHETIC-PAGE-001',
 attestations:Object.fromEntries(ATTESTATIONS.map(k=>[k,true])),
 editorialNotes:'Synthetic test evidence: no human certification. Used solely to test source-bound rejection conditions.'
}
const baseSchool={
 ...SCHOOL_ADOPTIONS,schoolBookAndExamYearApplicabilityCertified:true,
 verifiedAdoptions:[{
  id:'SYNTHETIC-ADOPTION-001',schoolId:1,academicSession:'2026-27',boardExamYear:2027,
  grade:9,subject:'Biology',medium:'English',sourceRecordId:source.recordId,
  sourcePdfSha256:source.pdfSha256,edition:source.edition,
  schoolCertificateSha256:'a'.repeat(64),officialBookPdfSha256:source.pdfSha256,
  schoolApproverUserId:11,independentEditionVerifierUserId:12,
  status:'school_academically_certified',certifiedAt:'2026-10-08T15:00:00Z'
 }]
}
const basePhysical={
 ...PAGE_REGISTRY,academicPageEvidenceCertified:true,
 verifiedChapterAnchors:[{
  id:'SYNTHETIC-PAGE-001',reviewState:'human_page_verified',sourceRecordId:source.recordId,
  sourcePdfSha256:source.pdfSha256,edition:source.edition,chapterNo:'1',
  pdfPhysicalPage:5,bookPrintedPage:1,pageImageSha256:'b'.repeat(64),
  independentReviewerId:13
 }],
 verifiedExerciseAnchors:[{
  id:'SYNTHETIC-EXERCISE-001',reviewState:'human_exercise_verified',
  sourceRecordId:source.recordId,sourcePdfSha256:source.pdfSha256,
  chapterPageEvidenceId:'SYNTHETIC-PAGE-001',sourcePrintedPage:19,
  exerciseReference:'Exercise 1 A',pdfPhysicalPage:23,bookPrintedPage:19,
  pageImageSha256:'c'.repeat(64),independentReviewerId:14
 }]
}
const callSchool=(school=baseSchool,overrides={})=>requireAdoptedSource({
 tenantId:1,source,evidence:{...evidence,...overrides},grade:9,question},school)
const callPage=(registry=basePhysical,overrides={})=>requirePhysicalPageProof({
 source,evidence:{...evidence,...overrides},question,mode:'ORIGINAL'},registry)
test('production school adoption ledger is empty and attestation checkboxes cannot create school approval',()=>{
 assert.equal(SCHOOL_ADOPTIONS.schoolBookAndExamYearApplicabilityCertified,false)
 assert.deepEqual(SCHOOL_ADOPTIONS.verifiedAdoptions,[])
 assert.throws(()=>normalizeEvidence(evidence,question,{tenantId:1}),{code:'SCHOOL_BOOK_ADOPTION_NOT_CERTIFIED'})
})
test('untrusted tenant scope and absent school source certificates fail closed',()=>{
 assert.throws(()=>requireAdoptedSource({tenantId:5,source,evidence,grade:9,question},baseSchool),
  {code:'SCHOOL_ADOPTION_TENANT_NOT_TRUSTED'})
 assert.throws(()=>callSchool({...baseSchool,verifiedAdoptions:[]}),{code:'SCHOOL_EDITION_NOT_ADOPTED'})
})
test('synthetic positive control proves exact session, source hash, edition, role and subject scoping',()=>{
 const proof=callSchool()
 assert.equal(proof.adoptionId,'SYNTHETIC-ADOPTION-001')
 assert.equal(proof.boardExamYear,2027)
 for(const key of ['schoolAcademicSession','boardExamYear','schoolAdoptionId']){
  assert.throws(()=>callSchool(baseSchool,{[key]:key==='boardExamYear'?2026:'WRONG'}),{code:key==='schoolAcademicSession'?'SCHOOL_ADOPTION_CONTEXT_REQUIRED':'SCHOOL_EDITION_NOT_ADOPTED'})
 }
 assert.throws(()=>requireAdoptedSource({tenantId:1,source,evidence,grade:10,question},baseSchool),
  {code:'SCHOOL_EDITION_NOT_ADOPTED'})
 assert.throws(()=>requireAdoptedSource({tenantId:1,source:{...source,pdfSha256:'d'.repeat(64)},evidence,grade:9,question},baseSchool),
  {code:'SCHOOL_EDITION_NOT_ADOPTED'})
})
test('approver and edition verifier must be different, verified identities',()=>{
 const bad={...baseSchool.verifiedAdoptions[0],independentEditionVerifierUserId:11}
 assert.throws(()=>callSchool({...baseSchool,verifiedAdoptions:[bad]}),{code:'SCHOOL_ADOPTION_EVIDENCE_INCOMPLETE'})
 const badHash={...baseSchool.verifiedAdoptions[0],schoolCertificateSha256:''}
 assert.throws(()=>callSchool({...baseSchool,verifiedAdoptions:[badHash]}),{code:'SCHOOL_ADOPTION_EVIDENCE_INCOMPLETE'})
})
test('real chapter-page registry is empty; OCR/TOC and source hash alone do not create a certified page',()=>{
 assert.equal(PAGE_REGISTRY.academicPageEvidenceCertified,false)
 assert.deepEqual(PAGE_REGISTRY.verifiedChapterAnchors,[])
 assert.deepEqual(PAGE_REGISTRY.verifiedExerciseAnchors,[])
 assert.throws(()=>requirePhysicalPageProof({source,evidence,question,mode:'ORIGINAL'}),
  {code:'PHYSICAL_SOURCE_PAGE_NOT_CERTIFIED'})
})
test('synthetic page proof strictly binds physical and printed pages, source and chapter',()=>{
 assert.deepEqual(callPage(),{chapterPageEvidenceId:'SYNTHETIC-PAGE-001',exercisePageEvidenceId:null})
 assert.throws(()=>callPage(basePhysical,{chapterPageEvidenceId:'UNREGISTERED'}),
  {code:'CHAPTER_PAGE_IDENTITY_UNVERIFIED'})
 const bad={...basePhysical,verifiedChapterAnchors:[{...basePhysical.verifiedChapterAnchors[0],chapterNo:'2'}]}
 assert.throws(()=>callPage(bad),{code:'CHAPTER_PAGE_IDENTITY_UNVERIFIED'})
 const wrongImage={...basePhysical,verifiedChapterAnchors:[{...basePhysical.verifiedChapterAnchors[0],pageImageSha256:''}]}
 assert.throws(()=>callPage(wrongImage),{code:'CHAPTER_PAGE_IDENTITY_UNVERIFIED'})
})
test('textbook exercise requires separately recorded exact printed exercise/page identity',()=>{
 const args={...evidence,questionOrigin:'TEXTBOOK_EXERCISE',sourcePrintedPage:19,exerciseReference:'Exercise 1 A',
   exercisePageEvidenceId:'SYNTHETIC-EXERCISE-001'}
 assert.equal(requirePhysicalPageProof({source,question,mode:'TEXTBOOK_EXERCISE',evidence:args},basePhysical).exercisePageEvidenceId,'SYNTHETIC-EXERCISE-001')
 for(const delta of [{exercisePageEvidenceId:'WRONG'},{sourcePrintedPage:20},{exerciseReference:'Exercise 1 B'}])
  assert.throws(()=>requirePhysicalPageProof({source,question,mode:'TEXTBOOK_EXERCISE',evidence:{...args,...delta}},basePhysical),
    {code:'EXERCISE_PAGE_IDENTITY_UNVERIFIED'})
})
test('physical image verification cannot be minted solely by client booleans',()=>{
 const unverified={...basePhysical,academicPageEvidenceCertified:false}
 assert.throws(()=>callPage(unverified,{sourceImageChecked:true}),{code:'PHYSICAL_SOURCE_PAGE_NOT_CERTIFIED'})
})

test('synthetic exercise requires independent server-owned actual printed page not a client-only number',()=>{
 const e={...evidence,questionOrigin:'TEXTBOOK_EXERCISE',sourcePrintedPage:19,exerciseReference:'Exercise 1 A',exercisePageEvidenceId:'SYNTHETIC-EXERCISE-001'}
 const invoke=reg=>requirePhysicalPageProof({source,question,mode:'TEXTBOOK_EXERCISE',evidence:e},reg)
 const base=basePhysical.verifiedExerciseAnchors[0]
 for(const broken of [{...base,bookPrintedPage:undefined},{...base,bookPrintedPage:20},{...base,bookPrintedPage:'19'},{...base,bookPrintedPage:0}]){
  assert.throws(()=>invoke({...basePhysical,verifiedExerciseAnchors:[broken]}),{code:'EXERCISE_PAGE_IDENTITY_UNVERIFIED'})
 }
 assert.equal(invoke(basePhysical).exercisePageEvidenceId,'SYNTHETIC-EXERCISE-001')
})

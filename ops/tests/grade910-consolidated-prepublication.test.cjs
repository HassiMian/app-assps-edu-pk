'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const Module=require('node:module'),path=require('node:path')
const DIR=path.resolve(__dirname,'../qbank')
const TARGET=path.join(DIR,'attest-grade910-prepublication-gates.cjs')
function data(){
 const frozen={originalAuthoredQuestionCandidates:2581,originalAuthoredFiles:73,academicallyApproved:0,verifiedPublished:0,
  originalQuestionTypeCounts:{mcq:875,short:908,long:564,numerical:91},
  files:[{originalAuthoredFile:'mock-originals',originalFileSha256:'a'.repeat(64),originalQuestionCount:2581}]}
 const f=(output,pin=false)=>({loadInputs:()=>({}),[pin?'assertPinned':'assertFrozen']:()=>output})
 const map=new Map()
 for(let i=0;i<2581;i++)map.set(String(i),{sourceMedium:i<1512?'english':i<2483?'urdu':i<2531?'dual':''})
 return {
  'attest-grade910-all-original-candidate-revisions.cjs':f(frozen),
  'attest-grade910-mcq-editorial-hold.cjs':f({originalMcqCandidateCount:875,academicallyVerifiedMcqsApproved:0,publishedMcqs:0,
    originalCorrectAnswerKeyCounts:{A:785,B:50,C:33,D:7},sourceFilesWithPatternConcern:53}),
  'attest-grade910-original-page-exercise-evidence.cjs':f({originalCandidateRevisions:2581,positiveSourcePdfPageClaims:1393,
    missingOriginalSourcePageClaims:1188,originalExerciseReferencesClaimed:0,independentPrintedPageEvidencePairs:0}),
  'attest-grade910-grade-medium-edition-claims.cjs':f({originalQuestionRevisionsNeedingEvidenceReview:1135,independentlyReviewedAndApproved:0}),
  'attest-grade910-original-subject-provenance.cjs':f({questionSubjectIdMissingFromOriginal:44,academicallyApproved:0}),
  'attest-grade910-board-and-session-applicability.cjs':f({actualAdoptedTextbookEvidenceRecords:0,sourceQuestionCandidateRevisionsPreserved:2581,academicallyApproved:0},true),
  'attest-grade910-161-faculty-handoff.cjs':f({academicApprovals:0,verifiedPublished:0},true),
  'attest-grade910-final-five-review-routing.cjs':f({totalOriginalReviewRequests:5,academicApproved:0,verifiedPublished:0},true),
  'attest-grade910-three-overlap-faculty-docket.cjs':f({completeQualifiedIndependentFacultyReviews:0},true),
  'validate-grade910-independent-review-evidence.cjs':{run:()=>({authenticatedAcademicApprovals:0,verifiedPublished:0}),indexOriginals:()=>map},
  'report-grade910-frozen-coverage.cjs':{compile:()=>({originalResearchCandidates:2581,coverageGroupCount:406,academicallyApprovedCount:0})},
  'prepare-grade910-missing-medium-review.cjs':{build:()=>({unresolvedOriginalMediumCandidates:50})},
  'prepare-grade910-five-final-long-research-drafts.cjs':{build:()=>({newSupplementalConceptualDrafts:4,facultyHeldWithoutAnswerText:1,
    combinedOriginalIdsWithSomeSupplementalResearch:165,academicallyApproved:0})},
  'prepare-grade910-three-overlap-review.cjs':{build:()=>({overlapPairsToReview:3,academicallyApproved:0})}
 }
}
function run(mutate=()=>{}){
 const mocks=data();mutate(mocks)
 const prev=Module._load
 try{
  Module._load=function(n,parent,main){
   if(parent&&parent.filename===TARGET&&Object.hasOwn(mocks,path.basename(n)))return mocks[path.basename(n)]
   return prev.apply(this,arguments)
  }
  delete require.cache[TARGET]
  return require(TARGET).build()
 }finally{Module._load=prev;delete require.cache[TARGET]}
}
test('full source consistent provisional research remains blocked even if all checks return normally',()=>{
 const x=run()
 assert.equal(x.decision,'BLOCK_PUBLICATION')
 assert.equal(x.questionCandidates,2581)
 assert.equal(x.paperStudioAcademicallyVerifiedSelectable,0)
 assert.equal(x.authenticatedIndependentFacultyApprovals,0)
 assert.equal(x.nextGates.length,6)
})
test('original candidate/source drift cannot pass',()=>{
 assert.throws(()=>run(m=>{m['attest-grade910-all-original-candidate-revisions.cjs'].assertFrozen=()=>({
  originalAuthoredQuestionCandidates:2580,originalAuthoredFiles:73})}),/2581_ORIGINAL_COHORT_DRIFT/)
})
test('fake school adoption cannot authorize release',()=>{
 assert.throws(()=>run(m=>{m['attest-grade910-board-and-session-applicability.cjs'].assertPinned=()=>({
  actualAdoptedTextbookEvidenceRecords:1,sourceQuestionCandidateRevisionsPreserved:2581,academicallyApproved:0})}),/SCHOOL_ADOPTION_UNVERIFIED/)
})
test('fake MCQ key validation cannot pass',()=>{
 assert.throws(()=>run(m=>{const m0=m['attest-grade910-mcq-editorial-hold.cjs'];const old=m0.assertFrozen;m0.assertFrozen=()=>{
  const v=old();v.originalCorrectAnswerKeyCounts={A:784,B:51,C:33,D:7};return v}}),/MCQ_NOT_FROZEN/)
})
test('forged exercise citation is not recognized as printed book evidence',()=>{
 assert.throws(()=>run(m=>{const x=m['attest-grade910-original-page-exercise-evidence.cjs'];const base=x.assertFrozen;x.assertFrozen=()=>{
  const v=base();v.independentPrintedPageEvidencePairs=1;return v}}),/PAGE_PROVENANCE_DRIFT/)
})
test('fake approval and incorrect frozen language population fail closed',()=>{
 assert.throws(()=>run(m=>{m['validate-grade910-independent-review-evidence.cjs'].run=()=>({
  authenticatedAcademicApprovals:1,verifiedPublished:0})}),/REVISION_SIGNATURE_UNVERIFIED/)
 assert.throws(()=>run(m=>{m['validate-grade910-independent-review-evidence.cjs'].indexOriginals=()=>new Map()}),/LANGUAGE_MISSING_DRIFT/)
})

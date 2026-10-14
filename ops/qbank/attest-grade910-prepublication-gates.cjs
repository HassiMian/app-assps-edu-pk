#!/usr/bin/env node
'use strict'
// One fail-closed Academic Master evidence aggregator; it cannot approve or publish.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_PREPUBLICATION_GATE_EVIDENCE_20261011.json')
const digest=x=>crypto.createHash('sha256').update(x).digest('hex')
const fail=x=>{throw Error('ACADEMIC_PREPUBLICATION_'+x)}
const mod=x=>require('./'+x+'.cjs')
function frozen(name,pinned='assertFrozen'){
 const m=mod(name)
 if(typeof m.loadInputs!=='function'||typeof m[pinned]!=='function')fail('MISSING_ATTESTOR:'+name)
 return m[pinned](m.loadInputs())
}
function demand(x,condition){if(!condition)fail(x)}
function build(){
 const s=frozen('attest-grade910-all-original-candidate-revisions')
 demand('2581_ORIGINAL_COHORT_DRIFT',s.originalAuthoredQuestionCandidates===2581&&s.originalAuthoredFiles===73&&s.academicallyApproved===0&&s.verifiedPublished===0)
 const m=frozen('attest-grade910-mcq-editorial-hold')
 const p=frozen('attest-grade910-original-page-exercise-evidence')
 const c=frozen('attest-grade910-grade-medium-edition-claims')
 const subject=frozen('attest-grade910-original-subject-provenance')
 const board=frozen('attest-grade910-board-and-session-applicability','assertPinned')
 const hand=frozen('attest-grade910-161-faculty-handoff','assertPinned')
 const five=frozen('attest-grade910-final-five-review-routing','assertPinned')
 const oldPairs=frozen('attest-grade910-three-overlap-faculty-docket','assertPinned')
 const review=mod('validate-grade910-independent-review-evidence').run()
 const language=mod('validate-grade910-independent-review-evidence').indexOriginals(s,mod('attest-grade910-all-original-candidate-revisions').loadInputs().documents)
 const coverage=mod('report-grade910-frozen-coverage').compile()
 const unresolved=mod('prepare-grade910-missing-medium-review').build()
 const newLong=mod('prepare-grade910-five-final-long-research-drafts').build()
 const newPairs=mod('prepare-grade910-three-overlap-review').build()
 demand('MCQ_NOT_FROZEN',m.originalMcqCandidateCount===875&&m.academicallyVerifiedMcqsApproved===0&&m.publishedMcqs===0&&m.originalCorrectAnswerKeyCounts.A===785&&m.originalCorrectAnswerKeyCounts.B===50&&m.originalCorrectAnswerKeyCounts.C===33&&m.originalCorrectAnswerKeyCounts.D===7)
 demand('PAGE_PROVENANCE_DRIFT',p.originalCandidateRevisions===2581&&p.positiveSourcePdfPageClaims===1393&&p.missingOriginalSourcePageClaims===1188&&p.originalExerciseReferencesClaimed===0&&p.independentPrintedPageEvidencePairs===0)
 demand('CATALOG_CLAIM_DRIFT',c.originalQuestionRevisionsNeedingEvidenceReview===1135&&c.independentlyReviewedAndApproved===0)
 demand('SUBJECT_CLAIM_DRIFT',subject.questionSubjectIdMissingFromOriginal===44&&subject.academicallyApproved===0)
 demand('SCHOOL_ADOPTION_UNVERIFIED',board.actualAdoptedTextbookEvidenceRecords===0&&board.sourceQuestionCandidateRevisionsPreserved===2581&&board.academicallyApproved===0)
 demand('HANDOFF_UNTRUSTWORTHY',hand.academicApprovals===0&&hand.verifiedPublished===0)
 demand('FINAL_FIVE_ID_DRIFT',five.totalOriginalReviewRequests===5&&five.academicApproved===0&&five.verifiedPublished===0)
 demand('DUPLICATE_APPROVAL_FORGED',oldPairs.completeQualifiedIndependentFacultyReviews===0&&newPairs.overlapPairsToReview===3&&newPairs.academicallyApproved===0)
 demand('REVISION_SIGNATURE_UNVERIFIED',review.authenticatedAcademicApprovals===0&&review.verifiedPublished===0)
 demand('COVERAGE_DRIFT',coverage.originalResearchCandidates===2581&&coverage.coverageGroupCount===406&&coverage.academicallyApprovedCount===0)
 demand('LANGUAGE_MISSING_DRIFT',unresolved.unresolvedOriginalMediumCandidates===50&&language.size===2581)
 demand('ANSWER_RESEARCH_DRIFT',newLong.newSupplementalConceptualDrafts===4&&newLong.facultyHeldWithoutAnswerText===1&&newLong.combinedOriginalIdsWithSomeSupplementalResearch===165&&newLong.academicallyApproved===0)
 const langs={english:0,urdu:0,dual:0,missing:0}
 for(const q of language.values()){if(q.sourceMedium==='english'||q.sourceMedium==='urdu'||q.sourceMedium==='dual')langs[q.sourceMedium]++;else langs.missing++}
 demand('SOURCE_MEDIUM_COUNT_DRIFT',langs.english===1512&&langs.urdu===971&&langs.dual===48&&langs.missing===50)
 const sha=digest(JSON.stringify(s.files.map(x=>({file:x.originalAuthoredFile,sha256:x.originalFileSha256,originals:x.originalQuestionCount}))))
 return {schemaVersion:'assps-grade910-consolidated-prepublication-v1',
  decision:'BLOCK_PUBLICATION',sourceFrozen:true,
  questionCandidates:2581,sourceFiles:73,sourceRevisionSetSha256:sha,
  types:s.originalQuestionTypeCounts,mcq:875,mcqCorrectKeyCounts:m.originalCorrectAnswerKeyCounts,
  mcqEditorRiskFiles:m.sourceFilesWithPatternConcern,sourcePageClaimsUnverified:1393,
  missingSourcePageClaims:1188,verifiedOriginalExercisePagePairs:0,
  sourceApplicabilityReviewCandidates:1135,sourceSubjectClaimMissing:44,originalMediumClaims:langs,
  researchCoverageGroups:406,unapprovedSupplementalAnswerResearchIds:165,
  newlyAuthoredConceptualLongDrafts:4,facultyHeldOriginalLongAnswerSlots:1,
  independentOverlapPairsPending:3,certifiedSchoolTextbookAdoptionEvidence:0,
  authenticatedIndependentFacultyApprovals:0,verifiedPublished:0,
  paperStudioAcademicallyVerifiedSelectable:0,
  nextGates:[
   {owner:'ASSPS authorized textbook coordinator',required:'Actual adopted textbook title, edition, medium, session and board document'},
   {owner:'Independent curriculum specialist',required:'Exact original topic/chapter and conceptual exercise-origin attribution; physical exercise page only when claimed as exercise'},
   {owner:'Independent subject teachers',required:'Scientific, answer/MCQ options, difficulty, marks, six flagged overlap candidates, remaining faculty-held long answer'},
   {owner:'Independent Urdu specialist',required:'Bilingual equivalence and four incomplete Urdu research drafts'},
   {owner:'School academic approval authority',required:'Authenticated signatures bound to exact question AND answer SHA revisions'},
   {owner:'Paper Studio & SaaS Core',required:'Approved-only tenant-isolated selection, independent security acceptance and authorized production release'}
  ],
  noDeployment:true,autonomousApprovalPermitted:false}
}
function write(){
 const state=build();fs.writeFileSync(OUT,JSON.stringify(state,null,2)+'\n')
 return {path:OUT,sha256:digest(fs.readFileSync(OUT)),decision:state.decision}
}
if(require.main===module)console.log(JSON.stringify(process.argv.includes('--write')?write():build(),null,2))
module.exports={build,write,OUT}

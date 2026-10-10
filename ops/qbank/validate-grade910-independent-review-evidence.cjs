#!/usr/bin/env node
'use strict'
// Academic reviewer-evidence INTAKE contract only. Never mints authenticated approval.
const {attest:unused}=require('./attest-grade910-all-original-candidate-revisions.cjs')
const original=require('./attest-grade910-all-original-candidate-revisions.cjs')
const shaPattern=/^[a-f0-9]{64}$/
const reject=x=>{throw Error('ACADEMIC_REVIEW_INTAKE_'+x)}
const REASONS=['curriculumApplicability','textbookEditionAndPrintedPage','questionCorrectness',
 'answerAndOptionCorrectness','marksAndDifficulty','languageAccuracy',
 'duplicatesAndOriginality','sourceProvenance']
function indexOriginals(frozen){
 const result=new Map()
 for(const file of frozen.files)for(const q of file.originalQuestionRevisions)
  result.set(q.originalQuestionId,{...q,originalFile:file.originalAuthoredFile,sourceSha:file.originalFileSha256})
 if(result.size!==2581)reject('SOURCE_ID_SET_DRIFT')
 return result
}
function assess({review,sourceById,seenRevision=new Set()}){
 if(!review||typeof review!=='object'||Array.isArray(review))reject('MISSING_REVIEW_PACKET')
 const q=sourceById.get(review.originalQuestionId)
 if(!q)reject('UNRECOGNIZED_ORIGINAL_QUESTION_ID')
 if(!shaPattern.test(String(review.originalQuestionRevisionSha256||''))||
   review.originalQuestionRevisionSha256!==q.originalQuestionRevisionSha256||
   review.originalFileSha256!==q.sourceSha)
  reject('STALE_OR_FORGED_ORIGINAL_QUESTION_REVISION')
 if(!shaPattern.test(String(review.finalQuestionRevisionSha256||''))||
   !shaPattern.test(String(review.finalAnswerRevisionSha256||'')))
  reject('FINAL_QUESTION_OR_ANSWER_REVISION_NOT_BOUND')
 if(!review.independentReviewerId||!review.authorId||
   review.independentReviewerId===review.authorId)
  reject('REVIEWER_IDENTITY_MISSING_OR_NOT_INDEPENDENT')
 if(!review.reviewerSubjectQualificationRef||!review.teacherCredentialEvidenceRef||
   !review.schoolAdoptionEvidenceRef||!review.physicalPageExerciseEvidenceRef||
   !review.applicableBoardExamYearEvidenceRef)
  reject('QUALIFICATION_ADOPTION_OR_PRINTED_SOURCE_MISSING')
 if(!review.reviewerSignatureEvidenceRef||!review.reviewedAt||
   !review.schoolAcademicApprovalEvidenceRef||!review.approvedAt)
  reject('SIGNED_REVIEW_OR_SCHOOL_APPROVAL_MISSING')
 if(!Array.isArray(review.checks)||review.checks.length!==REASONS.length||
   new Set(review.checks.map(x=>x.name)).size!==REASONS.length||
   REASONS.some(name=>!review.checks.some(x=>x.name===name&&x.decision==='pass'&&
     x.evidenceRef&&x.reviewedQuestionRevisionSha256===review.finalQuestionRevisionSha256&&
     x.reviewedAnswerRevisionSha256===review.finalAnswerRevisionSha256)))
  reject('REQUIRED_SIGNED_REVISION_SPECIFIC_CHECKS_INCOMPLETE')
 if(review.medium==='dual'&&(!review.urduTranslationReviewerId||
   review.urduTranslationReviewerId===review.authorId||
   !review.urduTranslationReviewEvidenceRef))
  reject('DUAL_LANGUAGE_INDEPENDENT_URDU_REVIEW_MISSING')
 const uniqueness=review.originalQuestionId+':'+review.finalQuestionRevisionSha256
 if(seenRevision.has(uniqueness))reject('DUPLICATE_REVIEW_REVISION')
 seenRevision.add(uniqueness)
 // Locally present identifiers and declared signatures are NOT cryptographic identity authentication.
 return{originalQuestionId:review.originalQuestionId,
  finalQuestionRevisionSha256:review.finalQuestionRevisionSha256,
  finalAnswerRevisionSha256:review.finalAnswerRevisionSha256,
  intakeEvidenceShapeComplete:true,
  reviewerIdentityCryptographicallyAuthenticated:false,
  schoolAcademicApprovalAuthenticated:false,
  publisherSelectable:false,
  requiredNextStep:'School-authorized independent identity/signature verification and Paper Studio release owner certification'}
}
function run({reviews=[]}={}){
 const frozen=original.assertFrozen(original.loadInputs())
 if(!Array.isArray(reviews))reject('INVALID_REVIEW_ARRAY')
 const sourceById=indexOriginals(frozen),seenRevision=new Set()
 const rows=reviews.map(review=>assess({review,sourceById,seenRevision}))
 return{schemaVersion:'assps-grade910-independent-revision-bound-review-evidence-intake-v1',
  originalCandidateCount:2581,reviewEvidencePacketsReceived:reviews.length,
  structurallyCompleteReviewerIntakePackets:rows.length,
  cryptographicallyAuthenticatedIndependentSignatures:0,
  authenticatedAcademicApprovals:0,verifiedPublished:0,
  reviewSignaturesMustBeVerifiedBySchoolAuthority:true,
  publicationDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  rows}
}
if(require.main===module)console.log(JSON.stringify(run()))
module.exports={run,assess,indexOriginals,REASONS}

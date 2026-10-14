#!/usr/bin/env node
'use strict'
// Academic reviewer-evidence INTAKE contract only. Never mints authenticated approval.
const original=require('./attest-grade910-all-original-candidate-revisions.cjs')
const shaPattern=/^[a-f0-9]{64}$/
const nonempty=x=>typeof x==='string'&&x.length>0&&x===x.trim()
const validTimestamp=x=>typeof x==='string'&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,19)===x.slice(0,19)
const reject=x=>{throw Error('ACADEMIC_REVIEW_INTAKE_'+x)}
const REASONS=['curriculumApplicability','textbookEditionAndPrintedPage','questionCorrectness',
 'answerAndOptionCorrectness','marksAndDifficulty','languageAccuracy',
 'duplicatesAndOriginality','sourceProvenance']
function indexOriginals(frozen,documents=original.loadInputs().documents){
 // Bind bilingual review requirements to the SHA-frozen original, never packet-supplied medium.
 const byFile=new Map(documents.map(entry=>[entry.file,entry.data]))
 const result=new Map()
 for(const file of frozen.files){
  const raw=byFile.get(file.originalAuthoredFile)
  const originals=[...(Array.isArray(raw?.drafts)?raw.drafts:[]),
   ...(Array.isArray(raw?.items)?raw.items:[])]
  const byId=new Map(originals.map(q=>[q.id,q]))
  for(const q of file.originalQuestionRevisions){
   const source=byId.get(q.originalQuestionId)
   if(!source)reject('FROZEN_QUESTION_SOURCE_CONTENT_MISSING')
   const sourceMedium=String(source.medium||source.language||raw.medium||'').toLowerCase()
   const en=source.content?.en,ur=source.content?.ur
   const requiresUrduParityReview=sourceMedium==='dual'||
    Boolean(en?.stem&&ur?.stem)
   result.set(q.originalQuestionId,{...q,originalFile:file.originalAuthoredFile,
    sourceSha:file.originalFileSha256,sourceMedium,requiresUrduParityReview})
  }
 }
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
 if(!nonempty(review.independentReviewerId)||!nonempty(review.authorId)||
   review.independentReviewerId===review.authorId)
  reject('REVIEWER_IDENTITY_MISSING_OR_NOT_INDEPENDENT')
 if(['reviewerSubjectQualificationRef','teacherCredentialEvidenceRef',
  'schoolAdoptionEvidenceRef','physicalPageExerciseEvidenceRef',
  'applicableBoardExamYearEvidenceRef'].some(k=>!nonempty(review[k])))
  reject('QUALIFICATION_ADOPTION_OR_PRINTED_SOURCE_MISSING')
 if(!nonempty(review.reviewerSignatureEvidenceRef)||
   !nonempty(review.schoolAcademicApprovalEvidenceRef)||
   !validTimestamp(review.reviewedAt)||!validTimestamp(review.approvedAt)||
   Date.parse(review.approvedAt)<Date.parse(review.reviewedAt))
  reject('SIGNED_REVIEW_OR_SCHOOL_APPROVAL_MISSING')
 if(!Array.isArray(review.checks)||review.checks.length!==REASONS.length||
   review.checks.some(x=>!x||typeof x!=='object'||Array.isArray(x))||
   new Set(review.checks.map(x=>x.name)).size!==REASONS.length||
   REASONS.some(name=>!review.checks.some(x=>x.name===name&&x.decision==='pass'&&
     nonempty(x.evidenceRef)&&x.reviewedQuestionRevisionSha256===review.finalQuestionRevisionSha256&&
     x.reviewedAnswerRevisionSha256===review.finalAnswerRevisionSha256)))
  reject('REQUIRED_SIGNED_REVISION_SPECIFIC_CHECKS_INCOMPLETE')
 if(!['english','urdu','dual'].includes(q.sourceMedium))
  reject('FROZEN_ORIGINAL_MEDIUM_UNRESOLVED')
 if(review.medium!==q.sourceMedium)
  reject(q.requiresUrduParityReview?'FROZEN_DUAL_MEDIUM_DOWNGRADE':
   'FROZEN_ORIGINAL_MEDIUM_MISMATCH')
 if((q.requiresUrduParityReview||review.medium==='dual')&&(
   !nonempty(review.urduTranslationReviewerId)||
   review.urduTranslationReviewerId===review.authorId||
   review.urduTranslationReviewerId===review.independentReviewerId||
   !nonempty(review.urduTranslationReviewEvidenceRef)))
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
 const inputs=original.loadInputs(),frozen=original.assertFrozen(inputs)
 if(!Array.isArray(reviews))reject('INVALID_REVIEW_ARRAY')
 const sourceById=indexOriginals(frozen,inputs.documents),seenRevision=new Set()
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

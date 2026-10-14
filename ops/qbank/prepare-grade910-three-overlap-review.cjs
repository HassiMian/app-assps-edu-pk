#!/usr/bin/env node
'use strict'
// Source-revision-locked possible semantic-overlap research review queue. No auto-duplicate verdict.
const fs=require('node:fs'),path=require('node:path')
const original=require('./attest-grade910-all-original-candidate-revisions.cjs')
const ROOT=path.resolve(__dirname,'../..')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_THREE_ORIGINAL_OVERLAP_REVIEW_TARGETS_20261011.json')
const prior=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_161_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json')
const riskByIds=Object.freeze({
 'IX-CHEM-2025-C07-T05-L01|IX-CHEM-2025-C10-T3-01L':{
  risk:'substantial shared concept; original objectives include acid-rain formation/effects',
  discriminatingOutcome:'Chapter 7 candidate includes specified control considerations and broader consequences; Chapter 10 focuses on formation and effects.',
  facultyAction:'Check actual marks objectives and topic relevance; revise the final independently reviewed version or retain separate items only if genuinely different assessed outcomes are demonstrated.'},
 'IX-CHEM-2025-C11-T1-01L|IX-CHEM-2025-C11-T1-02L':{
  risk:'potential duplicate assessment objective: hydrocarbon saturation and bonding',
  discriminatingOutcome:'First candidate frames family classification; second frames saturated-versus-unsaturated comparison, but much of the marking scheme overlaps.',
  facultyAction:'Teacher to compare final revision wording, distinct content/marks, and reasonable candidate selection policy; do not publish both as independently verified without an originality decision.'},
 'IX-CHEM-2025-C11-T3-01L|IX-CHEM-2025-C11-T3-02L':{
  risk:'potential duplicate assessment objective: IUPAC naming rules for simple alkanes',
  discriminatingOutcome:'First candidate asks nomenclature procedure; second emphasizes structure-to-name reasoning. Current answer criteria closely overlap.',
  facultyAction:'Independent teacher to inspect whether a worked structural interpretation outcome is distinct; otherwise suggest revision or exclusion with a recorded qualified reviewer decision.'}
})
function build(){
 const inputs=original.loadInputs(),frozen=original.assertFrozen(inputs)
 const priorDoc=JSON.parse(fs.readFileSync(prior,'utf8'))
 if(!Array.isArray(priorDoc.semanticOverlapReviewCandidates)||priorDoc.semanticOverlapReviewCandidates.length!==3)
  throw Error('THREE_OVERLAP_PRIOR_MANIFEST_DRIFT')
 const files=new Map(frozen.files.map(f=>[f.originalAuthoredFile,f]))
 const map=new Map()
 for(const d of inputs.documents){
  const seal=files.get(d.file)
  if(!seal)continue
  const revisions=new Map(seal.originalQuestionRevisions.map(q=>[q.originalQuestionId,q]))
  for(const q of [...(d.data?.drafts||[]),...(d.data?.items||[])]){
   const v=revisions.get(q.id)
   if(!v)continue
   map.set(q.id,{id:q.id,originalQuestionRevisionSha256:v.originalQuestionRevisionSha256,
    originalSourceFile:d.file,originalSourceFileSha256:seal.originalFileSha256,
    grade:q.curriculum?.grade??null,subjectId:q.curriculum?.subjectId??null,
    chapter:q.chapter?.number??null,topicId:q.topicId??null,
    marks:q.marks??null,originalMedium:q.medium??null})
  }
 }
 const rows=[]
 for(const pair of priorDoc.semanticOverlapReviewCandidates){
  const key=pair.sourceQuestionIds.join('|')
  const opinion=riskByIds[key]
  if(!opinion||pair.sourceQuestionIds.length!==2)throw Error('OVERLAP_CANDIDATE_ID_DRIFT')
  const sourceRevisions=pair.sourceQuestionIds.map(id=>map.get(id))
  if(sourceRevisions.some(q=>!q||q.grade!==9||q.subjectId!=='chemistry'||q.marks!==5))
   throw Error('OVERLAP_ORIGINAL_SOURCE_IDENTITY_INVALID')
  rows.push({pairId:key,originals:sourceRevisions,
   preliminaryResearchRisk:opinion.risk,
   potentialDifferentiatingLearningOutcome:opinion.discriminatingOutcome,
   qualifiedFacultyReviewQuestion:opinion.facultyAction,
   algorithmicDuplicateVerdict:'NOT_DETERMINED',
   academicIndependentReviewer:null,authenticatedReviewerSignature:null,
   finalQuestionRevisionsToApprove:[],
   approvedAsDistinct:false,academicallyApproved:false,published:false,
   decision:'HOLD_FOR_QUALIFIED_INDEPENDENT_SUBJECT_REVIEW'})
 }
 return {schemaVersion:'assps-grade910-three-sha-frozen-original-overlap-review-v1',
  originalResearchQuestionCandidates:2581,overlapPairsToReview:3,
  uniqueOriginalQuestionIdsToReview:6,
  confirmedDuplicatePairs:0,
  independentFacultyPairDecisions:0,academicallyApproved:0,verifiedPublished:0,
  autoDeletionsOrRewrites:0,publisherSelectable:false,
  notes:'Semantics are editorial research suggestions only; teacher must approve/reject each precise question revision. No source candidate rewritten.',
  pairs:rows}
}
if(require.main===module){
 const result=build()
 if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n')
 console.log(JSON.stringify({pairs:result.overlapPairsToReview,confirmedDuplicates:result.confirmedDuplicatePairs,approved:result.academicallyApproved}))
}
module.exports={build,OUT}

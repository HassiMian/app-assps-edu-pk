#!/usr/bin/env node
'use strict'
// Read-only academic research handoff, not a release or teacher approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const previous=require('./attest-grade910-156-cohort-review-freeze.cjs')
const author=require('./author-chemistry9-ch13-five-original-answers.cjs')
const ROOT=path.resolve(__dirname,'../..')
const DOC=path.join(ROOT,'docs/question-bank')
const SRC=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const LEDGER='ASSPS_GRADE910_161_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json'
const PACKET='ASSPS_CHEMISTRY9_CH13_FIVE_LONG_MODEL_ANSWER_DRAFTS_20261009.json'
const OUTPUT='ASSPS_GRADE910_161_REVISION_AND_FIVE_PENDING_FACULTY_HANDOFF_20261010'
const LEDGER_SHA='7f34937013f7e88240e572221dc10925168ce29f1644121c33645f259ff72a89'
const PACKET_SHA='f546c208ef76c70ffab518e4e1173f7f98857bbaa8367aabd4d4df903d8bcfbd'
const BUNDLE_SHA='2e8bdc9060641a8c35a95f7f4609fd2ce90a39ec7df0541cc6232a35741f979a'
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const err=m=>{throw Error('ACADEMIC161_'+m)}
const remainingSources={
 'chemistry9Chapter11EnglishDrafts2026.json':'e27178c2fabc7fc63fed68f12fdaeb8c1e7dfb085e9962fd3e7ab1e410c4825b',
 'chemistry10Starter2026.json':'ef2917a8fc5ea030992d5f15df2493b7422954463ee4d54c25414fc81af706a1'
}
function loadInputs(){
 return {ledgerBytes:fs.readFileSync(path.join(DOC,LEDGER)),
 packetBytes:fs.readFileSync(path.join(DOC,PACKET)),
 originalChapter13Bytes:fs.readFileSync(author.INPUT),
 registry:JSON.parse(fs.readFileSync(author.REGISTRY)),
 originalOutstanding:Object.fromEntries(Object.keys(remainingSources).map(f=>[f,fs.readFileSync(path.join(SRC,f))]))}
}
function build(x){
 const inherited=previous.attest(previous.loadInputs())
 if(inherited.sourceCryptographicallyMatchedOriginalIds!==156||
    inherited.sourceAuthenticMarkingPointProposals!==798||
    inherited.revisionSpecificApproved!==0||inherited.verifiedPublished!==0)
  err('PREVIOUS_156_REVISION_DRIFT')
 if(!Buffer.isBuffer(x.ledgerBytes)||sha(x.ledgerBytes)!==LEDGER_SHA)err('V14_LEDGER_FINGERPRINT_DRIFT')
 if(!Buffer.isBuffer(x.packetBytes)||sha(x.packetBytes)!==PACKET_SHA)err('CH13_PACKET_FINGERPRINT_DRIFT')
 let ledger,packet,source
 try{ledger=JSON.parse(x.ledgerBytes);packet=JSON.parse(x.packetBytes);source=JSON.parse(x.originalChapter13Bytes)}
 catch(_){err('SOURCE_JSON_INVALID')}
 if(ledger.schemaVersion!=='assps-grade910-161-original-answer-research-coverage-v14'||
  ledger.originalAuthoredQuestionCandidates!==2581||ledger.correctedRubricOnlyOriginals!==166||
  ledger.distinctOriginalIdsWithSeparateAnswerDrafts!==161||
  ledger.separateMarkingPointProposals!==823||ledger.originalRubricOnlyIdsWithoutNewAnswerDraft!==5||
  ledger.sourceGroups.length!==20||ledger.predecessorFrozenResearchAnswerIds!==156||
  ledger.schoolAdoptedTextbookPageVerified!==0||ledger.independentlyHumanReviewed!==0||
  ledger.academicallyApproved!==0||ledger.verifiedPublished!==0||
  ledger.academicReleaseDecision!=='DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
  err('ACADEMIC_COUNT_OR_PUBLICATION_STATUS_DRIFT')
 const expected=author.build({bytes:x.originalChapter13Bytes,source,registry:x.registry})
 if(JSON.stringify(packet)!==JSON.stringify(expected)||packet.items.length!==5)
  err('NEW_CH13_ANSWER_REVISION_DRIFT')
 const draftPins=packet.items.map(q=>{
  if(q.academicallyApproved!==false||q.verifiedPublished!==false||
     q.qualifiedIndependentSubjectReviewed!==false||q.originalPrintedExercisePageVerified!==false||
     q.schoolAdoptedEditionSessionVerified!==false||q.urduEquivalenceReviewed!==false||
     q.independentReviewerId!==null||q.approvedRevisionId!==null)err('FALSE_ACADEMIC_SIGNOFF')
  const revision={originalId:q.questionId,originalSource:packet.originalQuestionFile,
   originalPacket:PACKET,marks:q.marks,language:'English',
   proposedAnswer:q.proposedIndependentEnglishExplanation,
   proposedMarkingCriteria:q.proposedDistinctMarkingPoints}
  return {questionId:q.questionId,proposedRevisionSha256:sha(JSON.stringify(revision)),
   originalQuestionSha256:q.sourceQuestionSha256,oldAnswerSha256:q.sourceAnswerSha256,
   marks:q.marks,independentReviewerId:null,approvedRevisionId:null,approved:false,published:false}
 })
 if(new Set(draftPins.map(q=>q.questionId)).size!==5||
   draftPins.reduce((n,q)=>n+q.marks,0)!==25)err('NEW_FIVE_DRAFT_COUNT_DRIFT')
 const outstanding=[]
 for(const [file,originalSha] of Object.entries(remainingSources)){
  const bytes=x.originalOutstanding?.[file]
  if(!Buffer.isBuffer(bytes)||sha(bytes)!==originalSha)err('PENDING_ORIGINAL_SOURCE_BYTES_DRIFT')
  let d
  try{d=JSON.parse(bytes)}catch(_){err('PENDING_ORIGINAL_JSON_INVALID')}
  for(const q of d.drafts||[]){
   if(!ledger.remainingOriginalQuestionIds.includes(q.id))continue
   if(q.type!=='long'||q.marks!==5||q.review?.status!=='draft'||
     !q.source?.catalogRecordId||!q.source?.pdfSha256||typeof q.content?.en?.answer!=='string')
    err('ORIGINAL_PENDING_QUESTION_CHANGED')
   outstanding.push({questionId:q.id,sourceFile:file,sourceFileSha256:originalSha,
    originalQuestionRevisionSha256:sha(JSON.stringify(q)),
    originalRubricSha256:sha(q.content.en.answer),
    originalPageClaimNOTVerified:q.source.page??null,
    catalogRecordClaim:q.source.catalogRecordId,claimedPdfSha256:q.source.pdfSha256,
    grade:q.grade,marks:q.marks,additionalExplanationExists:false,
    schoolEditionPageVerified:false,qualifiedSubjectReviewed:false,urduEquivalenceReviewed:false,
    independentReviewerId:null,approvedRevisionId:null,academicallyApproved:false,verifiedPublished:false})
  }
 }
 const backlog=[...ledger.remainingOriginalQuestionIds].sort()
 if(outstanding.length!==5||new Set(outstanding.map(x=>x.questionId)).size!==5||
    outstanding.map(q=>q.questionId).sort().join('|')!==backlog.join('|'))
  err('PENDING_ORIGINAL_FIVE_SOURCE_RECONCILIATION_FAILED')
 if(ledger.semanticOverlapReviewCandidates?.length!==3||
  ledger.semanticOverlapReviewCandidates.some(x=>x.independentFacultyDuplicateReview!==false))
  err('FACULTY_ORIGINALITY_APPROVAL_INVENTED')
 return {schemaVersion:'assps-grade910-161-faculty-review-handoff-source-locked-v1',
  inheritedAnswerRevisionPins:156,newAnswerRevisionPins:5,
  distinctExistingOriginalIdsWithSupplementalResearch:161,proposedMarkingCriteria:823,
  originalCandidateCountUnchanged:2581,originalRubricOnlyCountUnchanged:166,
  originalSourceCohorts:20,unansweredOriginalIds:5,
  originalV14LedgerSha256:LEDGER_SHA,newChapter13PacketSha256:PACKET_SHA,
  previous156FrozenManifest:'ASSPS_GRADE910_156_PROPOSED_ANSWER_REVISION_PINS_20261009.json',
  schoolTextbookAdoptedPhysicalPageVerified:false,qualifiedIndependentFacultyReviewed:false,
  qualifiedUrduEquivalenceReviewed:false,academicApprovals:0,verifiedPublished:0,
  releaseDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  newAnswerDraftRevisionPins:draftPins,originalFiveFacultyReviewDocket:outstanding,
  unresolvedPotentialSemanticOverlaps:ledger.semanticOverlapReviewCandidates}
}
function assertPinned(inputs,providedBytes){
 const bytes=providedBytes??fs.readFileSync(path.join(DOC,OUTPUT+'.json'))
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==BUNDLE_SHA)err('FROZEN_FACULTY_INTAKE_SHA_DRIFT')
 let frozen
 try{frozen=JSON.parse(bytes)}catch(_){err('FROZEN_INTAKE_JSON_DRIFT')}
 const regenerated=build(inputs)
 if(JSON.stringify(frozen)!==JSON.stringify(regenerated))err('FROZEN_INTAKE_CONTENT_CHANGED')
 return regenerated
}
function markdown(d){
 return ['# ASSPS Grade IX-X: 161 answer revision pins and five faculty review requests','',
 '**UNAPPROVED academic research. This document is not textbook-adoption or independent teacher approval evidence.**','',
 'Prior 156 versioned answer drafts remain frozen by previous manifest; new five Chapter 13 proposals are revision-addressed.',
 'Total distinct existing original IDs with supplemental draft answers: **161**. Original provisional question count **2,581** unchanged.',
 '','## Five unaddressed original questions: independent subject suitability review required','',
 '| Question ID | Original source | Original question SHA256 | Prior source page claim (not verified) |',
 '|---|---|---|---|',
 ...d.originalFiveFacultyReviewDocket.map(q=>'| '+q.questionId+' | '+q.sourceFile+' | '+q.originalQuestionRevisionSha256+' | '+(q.originalPageClaimNOTVerified??'—')+' |'),
 '','## Five newly authored research answer draft revision fingerprints','',
 '| Original question ID | Proposed draft revision SHA256 |',
 '|---|---|',
 ...d.newAnswerDraftRevisionPins.map(q=>'| '+q.questionId+' | '+q.proposedRevisionSha256+' |'),
 '','Three potential semantic-overlap pairs remain pending qualified faculty originality review.',
 'Actual school-adopted book/edition/academic-session/printed exercise-page proof and Urdu review not present.',
 'No chemical-use procedures or experiment instructions are supplied in this handoff.',
 '**Release decision: '+d.releaseDecision+'.** SaaS Core alone authorizes production.',''
 ].join('\n')
}
function main(){
 const d=build(loadInputs()),p=path.join(DOC,OUTPUT)
 fs.writeFileSync(p+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(p+'.md',markdown(d))
 console.log(JSON.stringify({total:d.distinctExistingOriginalIdsWithSupplementalResearch,
  newRevisions:d.newAnswerDraftRevisionPins.length,pending:d.originalFiveFacultyReviewDocket.length,
  manifestSha:sha(fs.readFileSync(p+'.json')),decision:d.releaseDecision}))
}
if(require.main===module)main()
module.exports={loadInputs,build,assertPinned,markdown,sha,OUTPUT}

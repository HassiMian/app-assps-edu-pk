#!/usr/bin/env node
'use strict'
// Read-only original question semantic-review intake. No automatic duplicate decisions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const routing=require('./attest-grade910-final-five-review-routing.cjs')
const existing=require('./assert-grade910-156-proposal-revisions.cjs')
const ROOT=path.resolve(__dirname,'../..')
const DOC=path.join(ROOT,'docs/question-bank')
const SRC=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const REPORT='ASSPS_GRADE910_161_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json'
const PINNED_LEDGER='7f34937013f7e88240e572221dc10925168ce29f1644121c33645f259ff72a89'
const OUTPUT='ASSPS_GRADE910_THREE_SEMANTIC_PAIRS_IMMUTABLE_FACULTY_DOCKET_20261010'
const FROZEN='2ac61d2db1fa3ab26d988154b4f6a705e40ded7b8b5884ee985d0b694494a4fe'
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const reject=x=>{throw Error('SEMANTIC_PAIR_'+x)}
const reviewQuestions=[
 'Does the Chapter 7 question genuinely assess an emissions-control objective beyond Chapter 10 formation/effects, or do their five-mark answers substantially repeat?',
 'Do these two Chapter 11 hydrocarbon questions demand demonstrably different classification knowledge, examples or mark allocations?',
 'Is naming a branched alkane a genuinely distinct assessment from interpreting a structural formula and validating its IUPAC name?'
]
function loadInputs(){
 const ledgerBytes=fs.readFileSync(path.join(DOC,REPORT))
 const ledger=JSON.parse(ledgerBytes),needed=new Set(ledger.semanticOverlapReviewCandidates.flatMap(p=>p.sourceQuestionIds))
 const groups=ledger.sourceGroups.filter(g=>/chemistry9Chapter(7|10|11)EnglishDrafts2026\.json/.test(g.originalAuthoredSource))
 const snapshots=groups.map(g=>({
  ...g,sourceBytes:fs.readFileSync(path.join(SRC,g.originalAuthoredSource)),
  packetBytes:fs.readFileSync(path.join(DOC,g.researchAnswerPacket))
 }))
 return {ledgerBytes,snapshots}
}
function build({ledgerBytes,snapshots}){
 const previous=routing.assertPinned(routing.loadInputs())
 if(previous.grade9ChemistryRequests!==2||previous.grade10ChemistryRequests!==3||
  previous.academicApproved!==0||previous.verifiedPublished!==0)
  reject('PREVIOUS_REVIEW_ROUTING_GATE_DRIFT')
 if(!Buffer.isBuffer(ledgerBytes)||sha(ledgerBytes)!==PINNED_LEDGER)
  reject('EXISTING_161_LEDGER_RAW_SHA_DRIFT')
 let ledger
 try{ledger=JSON.parse(ledgerBytes)}catch(_){reject('LEDGER_JSON_INVALID')}
 if(ledger.distinctOriginalIdsWithSeparateAnswerDrafts!==161||
  ledger.separateMarkingPointProposals!==823||ledger.sourceGroups.length!==20||
  ledger.academicallyApproved!==0||ledger.verifiedPublished!==0||
  ledger.academicReleaseDecision!=='DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
  reject('EXISTING_RESEARCH_STATUS_DRIFT')
 const flagged=ledger.semanticOverlapReviewCandidates
 if(flagged?.length!==3||snapshots?.length!==3||
  flagged.some(p=>p.independentFacultyDuplicateReview!==false||
   p.sourceQuestionIds?.length!==2||p.separateOriginalQuestionIds!==true))
  reject('FLAGGED_PAIR_SCOPE_CHANGED')
 const manifest=JSON.parse(fs.readFileSync(existing.MANIFEST))
 const revised=new Map(manifest.revisions.map(q=>[q.questionId,q]))
 const evidence=new Map(),seenFiles=new Set()
 for(const snapshot of snapshots){
  const name=snapshot.originalAuthoredSource
  const declared=ledger.sourceGroups.find(g=>g.originalAuthoredSource===name)
  if(!declared||seenFiles.has(name)||declared.researchAnswerPacket!==snapshot.researchAnswerPacket||
   declared.sourceFileSha256!==snapshot.sourceFileSha256)
   reject('COHORT_IDENTITY_DRIFT')
  seenFiles.add(name)
  if(!Buffer.isBuffer(snapshot.sourceBytes)||sha(snapshot.sourceBytes)!==declared.sourceFileSha256)
   reject('ORIGINAL_SOURCE_BYTES_CHANGED')
  let source,packet
  try{source=JSON.parse(snapshot.sourceBytes);packet=JSON.parse(snapshot.packetBytes)}
  catch(_){reject('SOURCE_OR_ANSWER_PACKET_JSON_INVALID')}
  const packetPin=manifest.cohorts.find(c=>c.sourceFile===name&&
   c.proposalPacket===snapshot.researchAnswerPacket)
  if(!packetPin||packetPin.packetContentSha256!==sha(JSON.stringify(packet))||
   source.sourcePdfSha256!==packet.sourceCatalogPdfSha256||
   source.sourceRecordId!==packet.sourceCatalogId||
   packet.originalFileSha256!==sha(snapshot.sourceBytes)||
   !Array.isArray(packet.items)||packet.items.length!==declared.distinctUnapprovedExplanationProposals)
   reject('PINNED_ANSWER_PACKET_OR_SOURCE_IDENTITY_CHANGED')
  for(const q of source.drafts){
   const proposed=packet.items.find(a=>a.questionId===q.id)
   if(!proposed||!revised.has(q.id))continue
   const orig=sha(JSON.stringify(q)),originalRubric=sha(q.content?.en?.answer||'')
   if(proposed.sourceQuestionSha256!==orig||proposed.sourceAnswerSha256!==originalRubric||
    proposed.sourceFileSha256!==sha(snapshot.sourceBytes)||
    proposed.catalogSourceId!==source.sourceRecordId||
    proposed.claimedSourcePdfSha256!==source.sourcePdfSha256)
    reject('QUESTION_SOURCE_OR_ORIGINAL_RUBRIC_CHANGED')
   const rev=sha(JSON.stringify({originalId:q.id,originalSource:name,
    originalPacket:snapshot.researchAnswerPacket,marks:q.marks,language:'English',
    proposedAnswer:proposed.proposedIndependentEnglishExplanation,
    proposedMarkingCriteria:proposed.proposedDistinctMarkingPoints}))
   if(rev!==revised.get(q.id).proposedAnswerRevisionSha256)
    reject('PROPOSED_ANSWER_REVISION_CHANGED')
   if(q.review?.status!=='draft'||Object.values(q.review?.checks||{}).some(v=>v!==false)||
    q.curriculum?.grade!==9||q.curriculum?.subjectId!=='chemistry'||
    q.medium!=='english'||q.marks!==5||
    proposed.academicallyApproved!==false||proposed.verifiedPublished!==false||
    proposed.independentReviewerId!==null||proposed.approvedRevisionId!==null)
    reject('FORGED_FACULTY_REVIEW_OR_ORIGINAL_SCOPE_CHANGED')
   evidence.set(q.id,{questionId:q.id,originalQuestionSha256:orig,
    originalAnswerRubricSha256:originalRubric,proposedAnswerRevisionSha256:rev,
    sourceFile:name,sourceFileSha256:sha(snapshot.sourceBytes),
    claimedCatalogRecordId:source.sourceRecordId,claimedPdfSha256:source.sourcePdfSha256,
    chapterNumber:q.chapter?.number,topicId:q.topicId,
    printedSourcePageClaimUnverified:q.source?.page??null,
    originalAuthoredQuestionStem:q.content.en.stem,
    proposedFiveMarkCriteria:proposed.proposedDistinctMarkingPoints,
    medium:'English',grade:9,marks:5,
    schoolTextbookEditionAndPageVerified:false,qualifiedIndependentReviewerId:null,
    independentlyAcademicReviewed:false,independentUrduEquivalenceReviewed:false,
    approvedRevisionId:null,academicallyApproved:false,published:false})
  }
 }
 const referencedIds=new Set(flagged.flatMap(p=>p.sourceQuestionIds))
 if(referencedIds.size!==6||[...referencedIds].some(id=>!evidence.has(id)))
  reject('MISSING_OR_COLLIDING_ORIGINAL_PAIR_IDS')
 const pairs=flagged.map((flag,i)=>{
  const [left,right]=flag.sourceQuestionIds.map(id=>evidence.get(id))
  if(!left||!right||left.questionId===right.questionId)reject('INVALID_PAIR_ORIGINALS')
  const packet={pairId:'CHEM9-POTENTIAL-OVERLAP-'+String(i+1).padStart(2,'0'),
   status:'POTENTIAL_OVERLAP_AWAITING_QUALIFIED_INDEPENDENT_FACULTY',
   originalUnreviewedFlag:flag.flag,
   originalQuestionIds:[left.questionId,right.questionId],
   questions:[left,right],reviewQuestion:reviewQuestions[i],
   reviewerDecisionOptionsForFutureIndependentReview:[
    'CONFIRM_DUPLICATE_WITH_EVIDENCE',
    'DISTINCT_ASSESSMENT_TARGETS_WITH_RATIONALE',
    'REVISE_ONE_OR_BOTH_WITH_NEW_REVISION_AND_REVIEW'],
   independentFacultyDecision:null,independentReviewerId:null,academicRationale:null,
   sourceEditionAndPrintedPageVerified:false,
   independentQualifiedChemistryReviewCompleted:false,
   reviewerSignature:null,approvalRevisionHash:null,
   independentlyReviewed:false,academicallyApproved:false,verifiedPublished:false}
  return packet
 })
 if(pairs.length!==3||pairs.some(p=>p.questions.length!==2||p.questions.some(q=>q.approvedRevisionId!==null)))
  reject('FACULTY_REVIEW_UNSAFELY_LAUNDERED')
 return {schemaVersion:'assps-grade910-three-overlap-revision-bound-faculty-review-intake-v1',
  exactPreviousOriginal161ReportSha256:PINNED_LEDGER,
  inheritedOriginalResearchQuestionCandidates:2581,
  inheritedSupplementalUnapprovedResearchDraftCount:161,
  inheritedProposedMarkingCriteria:823,
  candidateSourceFilesChecked:3,distinctSourceQuestionRevisionsChecked:6,
  potentialUnadjudicatedPairs:3,
  duplicatePairsConfirmedByIndependentFaculty:0,
  distinctPairsCertifiedByIndependentFaculty:0,
  completeQualifiedIndependentFacultyReviews:0,
  academicallyApproved:0,verifiedPublished:0,
  decision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  caveat:'Lexical/topic overlap flags are academic review requests, not automatic duplicate findings. School-adopted textbook/page/session and board applicability remain unverified.',
  potentialOverlapReviewDockets:pairs}
}
function assertPinned(inputs,overrideBytes){
 const bytes=overrideBytes??fs.readFileSync(path.join(DOC,OUTPUT+'.json'))
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==FROZEN)reject('PINNED_FACULTY_DOCKET_SHA_CHANGED')
 let disk
 try{disk=JSON.parse(bytes)}catch(_){reject('PINNED_FACULTY_DOCKET_JSON_INVALID')}
 const live=build(inputs)
 if(JSON.stringify(disk)!==JSON.stringify(live))reject('REVIEW_DOCKET_CONTENT_DRIFT')
 return live
}
function markdown(d){
 const lines=['# ASSPS Chemistry IX — Three potential conceptual overlaps for independent faculty adjudication','',
  '**No question is declared a duplicate, approved, or published by this report.**',
  'The source-author draft stems, original rubrics and 5-mark proposed criteria are available for a qualified teacher to compare. Source printed page claims do NOT establish actual ASSPS adopted textbooks.',
  'Prior research candidates 2,581 and 161 supplemental unapproved answer drafts remain unchanged.','']
 for(const pair of d.potentialOverlapReviewDockets){
  lines.push('## '+pair.pairId,'',pair.reviewQuestion,'',
   '| Original source ID | Chapter · Topic | Authored candidate stem | Candidate SHA256 | Research answer revision SHA256 |',
   '|---|---|---|---|---|')
  for(const q of pair.questions){
   lines.push('| '+q.questionId+' | '+q.chapterNumber+' · '+q.topicId+' | '+
    q.originalAuthoredQuestionStem.replace(/\|/g,' ')+' | '+q.originalQuestionSha256+
    ' | '+q.proposedAnswerRevisionSha256+' |')
  }
  lines.push('','**Suggested criteria comparison — NOT an independent faculty decision:**','')
  for(const q of pair.questions)
   lines.push('**'+q.questionId+'**: '+q.proposedFiveMarkCriteria.join('; ')+'.')
  lines.push('','Faculty must record an evidence-backed duplicate/distinct/revise decision against BOTH exact revisions, original teaching objectives and actual school-adopted textbook. **No faculty decision exists yet.**','')
 }
 lines.push('Academic review complete 0; confirmed duplicate pairs 0; independently confirmed distinct pairs 0; published 0.',
  '**Release decision: '+d.decision+'.** Paper Studio verified selector HOLD; SaaS Core exclusively controls production.','')
 return lines.join('\n')
}
function main(){
 const result=build(loadInputs()),prefix=path.join(DOC,OUTPUT)
 fs.writeFileSync(prefix+'.json',JSON.stringify(result,null,2)+'\n')
 fs.writeFileSync(prefix+'.md',markdown(result))
 console.log(JSON.stringify({pairs:result.potentialUnadjudicatedPairs,
  originalRevisions:result.distinctSourceQuestionRevisionsChecked,
  independentReview:result.completeQualifiedIndependentFacultyReviews,
  generatedSha256:sha(fs.readFileSync(prefix+'.json')),decision:result.decision}))
}
if(require.main===module)main()
module.exports={loadInputs,build,assertPinned,markdown,sha,OUTPUT}

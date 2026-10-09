#!/usr/bin/env node
'use strict'
// READ-ONLY, cross-cohort academic research integrity attestations.
// A successful attestation does NOT authorize approval, tenant import or publication.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {assertFrozenProposals}=require('./assert-grade910-156-proposal-revisions.cjs')
const ROOT=path.resolve(__dirname,'../..')
const DOC=path.join(ROOT,'docs/question-bank')
const SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const LEDGER='ASSPS_GRADE910_156_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json'
const LEDGER_SHA='39b8cc37e2ded02b7a741c3776158fc984e9f1839d7102ef4c8e907be7cd9786'
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const sha=data=>crypto.createHash('sha256').update(data).digest('hex')
const fail=(code,detail)=>{throw Error('REVIEW_FREEZE_'+code+(detail?':'+detail:''))}
const one=(x,keys)=>{
 const found=keys.filter(k=>Object.hasOwn(x,k))
 if(found.length!==1)fail('SCHEMA_ALIAS_AMBIGUOUS',found.join('|'))
 return x[found[0]]
}
const positiveAllowlist=new Set(['originalQuestionAnswerUnmodified',
 'originalQuestionAndAnswerUnmodified','originalAnswerUnmodified','originalQuestionUnchanged',
 'catalogLabelMediumVerified'])
const questionDigestKeys=['originalQuestionSha256','sourceQuestionSha256']
const answerDigestKeys=['originalAnswerSha256','sourceAnswerSha256']
const sourceDigestKeys=['sourceFileSha256','originalSourceFileSha256']
const pdfDigestKeys=['declaredSourcePdfSha256','declaredPdfSha256','declaredPdfSourceSha256',
 'claimedSourcePdfSha256']
const markingKeys=['proposedSeparateMarkingCriteria','proposedSeparateMarkingPoints',
 'proposedIndependentMarkingPoints','proposedDistinctMarkingPoints']
function loadInputs(){
 const ledgerBytes=fs.readFileSync(path.join(DOC,LEDGER))
 if(sha(ledgerBytes)!==LEDGER_SHA)fail('BASE_SNAPSHOT_RAW_SHA_DRIFT')
 const snapshot=JSON.parse(ledgerBytes)
 const registry=JSON.parse(fs.readFileSync(REGISTRY))
 const groups=snapshot.sourceGroups.map(g=>({
  source:g.originalAuthoredSource,packet:g.researchAnswerPacket,
  bytes:fs.readFileSync(path.join(SOURCE,g.originalAuthoredSource)),
  payload:JSON.parse(fs.readFileSync(path.join(DOC,g.researchAnswerPacket)))
 }))
 return {snapshot,registry,groups}
}
function attest({snapshot,registry,groups}){
 if(snapshot.schemaVersion!=='assps-grade910-156-original-answer-draft-coverage-v13'||
  snapshot.originalAuthoredQuestionCandidates!==2581||
  snapshot.correctedRubricOnlyOriginals!==166||
  snapshot.distinctOriginalIdsWithSeparateAnswerDrafts!==156||
  snapshot.separateMarkingPointProposals!==798||
  snapshot.originalRubricOnlyIdsWithoutNewAnswerDraft!==10||
  snapshot.schoolAdoptedTextbookPageVerified!==0||snapshot.independentlyHumanReviewed!==0||
  snapshot.academicallyApproved!==0||snapshot.verifiedPublished!==0||
  groups.length!==19||snapshot.sourceGroups.length!==19)
  fail('CUMULATIVE_SNAPSHOT_DRIFT')
 const authenticIds=new Set(),rawCandidateIds=new Set(),items=[],cohorts=[],usedFiles=new Set(),usedPackets=new Set()
 const reg=new Map(registry.entries.map(r=>[r.recordId,r]))
 for(let i=0;i<groups.length;i++){
  const g=groups[i],pointer=snapshot.sourceGroups[i]
  if(g.source!==pointer.originalAuthoredSource||g.packet!==pointer.researchAnswerPacket||
   !/^[a-zA-Z0-9_.-]+\.json$/.test(g.source)||!/^[a-zA-Z0-9_.-]+\.json$/.test(g.packet)||
   usedFiles.has(g.source)||usedPackets.has(g.packet))
   fail('GROUP_IDENTITY_OR_PATH_DRIFT',g.source)
  usedFiles.add(g.source);usedPackets.add(g.packet)
  if(!Buffer.isBuffer(g.bytes)||sha(g.bytes)!==pointer.sourceFileSha256)
   fail('SOURCE_RAW_SHA_DRIFT',g.source)
  let original
  try{original=JSON.parse(g.bytes)}catch(_){fail('SOURCE_JSON_INVALID',g.source)}
  const evidence=reg.get(original.sourceRecordId)
  if(!evidence||evidence.academicApproval!==false||
   evidence.pdfSha256!==original.sourcePdfSha256||
   !Array.isArray(original.drafts))fail('PROVISIONAL_CATALOG_IDENTITY_DRIFT',g.source)
  for(const candidate of original.drafts){
   if(typeof candidate.id!=='string'||rawCandidateIds.has(candidate.id))
    fail('DUPLICATE_RAW_SOURCE_QUESTION_ID',String(candidate.id))
   rawCandidateIds.add(candidate.id)
  }
  if(one(g.payload,['originalFileSha256','sourceFileSha256','originalSourceFileSha256'])!==sha(g.bytes))
   fail('PACKET_SOURCE_FINGERPRINT_DRIFT',g.packet)
  if(g.payload.schemaVersion===undefined)fail('PACKET_SCHEMA_ABSENT',g.packet)
  for(const [k,v] of Object.entries(g.payload))
   if(typeof v==='boolean' && v && !positiveAllowlist.has(k))fail('PACKET_FALSE_SIGNOFF',g.packet+':'+k)
  const list=g.payload.items||g.payload.proposals
  if(!Array.isArray(list)||list.length!==pointer.distinctUnapprovedExplanationProposals)
   fail('PACKET_COUNT_DRIFT',g.packet)
  let criteriaCount=0
  const local=new Set()
  for(const q of list){
   const id=q.questionId,sourceRecord=original.drafts.find(x=>x.id===id)
   if(typeof id!=='string'||!sourceRecord||local.has(id)||authenticIds.has(id))
    fail('DUPLICATE_OR_ORPHAN_ORIGINAL_ID',String(id))
   local.add(id);authenticIds.add(id)
   if(one(q,questionDigestKeys)!==sha(JSON.stringify(sourceRecord))||
    one(q,answerDigestKeys)!==sha(sourceRecord.content?.en?.answer||'')||
    one(q,sourceDigestKeys)!==sha(g.bytes)||
    one(q,pdfDigestKeys)!==evidence.pdfSha256||
    sourceRecord.source?.catalogRecordId!==evidence.recordId||
    sourceRecord.source?.pdfSha256!==evidence.pdfSha256)
    fail('ORIGINAL_QUESTION_ANSWER_OR_PDF_SHA_DRIFT',id)
   if(!Number.isInteger(q.marks)||q.marks!==sourceRecord.marks||q.marks<1)
    fail('SOURCE_MARKS_DRIFT',id)
   const criteria=one(q,markingKeys)
   if(!Array.isArray(criteria)||criteria.length!==q.marks||
    new Set(criteria.map(p=>typeof p==='string'?p.trim():JSON.stringify(p))).size!==q.marks||
    criteria.some(v=>typeof v!=='string'||v.trim().length<8))
    fail('RUBRIC_CRITERIA_DRIFT',id)
   criteriaCount+=criteria.length
   const approval=one(q,['approved','academicApproved','academicallyApproved'])
   const publication=one(q,['published','verifiedPublished'])
   const faculty=one(q,['qualifiedSubjectReviewed','answerCorrectnessVerifiedByQualifiedTeacher',
    'teacherScientificAnswerVerified','independentlySubjectReviewed',
    'subjectTeacherCorrectnessVerified','qualifiedIndependentSubjectReviewed'])
   const schoolEdition=one(q,['schoolBookEditionAndPageVerified','schoolEditionAndPrintedPageIndependentlyVerified',
    'schoolEditionAndPhysicalPageVerified','schoolEditionAndPageVerified',
    'schoolTextbookEditionAndPageVerified','schoolAdoptedEditionSessionVerified'])
   const urduParity=one(q,['englishUrduEquivalenceVerified','englishUrduEquivalenceReviewed',
    'independentEnglishUrduEquivalenceReviewed','languageEquivalenceReviewed','urduEquivalenceReviewed'])
   if(approval!==false||publication!==false||faculty!==false||schoolEdition!==false||
    urduParity!==false)fail('FRAUDULENT_OR_MISSING_REVIEW_GATE',id)
   for(const [k,v] of Object.entries(q)){
    if(typeof v==='boolean'&&v===true&&!positiveAllowlist.has(k))
     fail('FALSE_APPROVAL_REVIEW_OR_SOURCE_CLAIM',id+':'+k)
    if(/^(independentReviewerId|approvedRevisionId|approvedQuestionRevisionId)$/.test(k)&&v!==null)
     fail('FABRICATED_HUMAN_REVIEWER_OR_REVISION',id+':'+k)
   }
   if(!Object.hasOwn(q,'independentReviewerId')||q.independentReviewerId!==null||
    !Object.hasOwn(q,'approvedRevisionId')&&!Object.hasOwn(q,'approvedQuestionRevisionId'))
    fail('REVIEWER_PROVENANCE_SCHEMA_MISSING',id)
   items.push({questionId:id,sourceGroup:g.source,originalQuestionSha256:sha(JSON.stringify(sourceRecord)),
    originalRubricSha256:sha(sourceRecord.content?.en?.answer||''),marks:q.marks,printedPageClaimUnverified:sourceRecord.source?.page??null,
    catalogSourceId:evidence.recordId,schoolAdoptionVerified:false,sourcePrintedPageVerified:false,
    qualifiedTeacherReviewed:false,urduEquivalenceReviewed:false,approvedRevisionId:null,
    approved:false,published:false,facultyReviewRequired:true})
  }
  cohorts.push({originalSource:g.source,packet:g.packet,rawSourceSha256:sha(g.bytes),
   distinctExistingOriginalIds:list.length,proposedMarkingCriteria:criteriaCount,
   catalogSourceId:evidence.recordId,catalogPdfHashClaim:evidence.pdfSha256,
   originalSchoolAdoptionCertified:false,approvedForProduction:false})
 }
 assertFrozenProposals(groups)
 if(rawCandidateIds.size!==741||items.length!==156||criteriaTotal(cohorts)!==798||
  new Set(items.map(x=>x.questionId)).size!==156)
  fail('CROSS_COHORT_AGGREGATE_COUNT_DRIFT')
 const remaining=snapshot.remainingOriginalQuestionIds
 if(!Array.isArray(remaining)||remaining.length!==10||new Set(remaining).size!==10||
  remaining.some(id=>authenticIds.has(id)))
  fail('REMAINING_BACKLOG_OR_DUPLICATE_DRIFT')
 const deferred=snapshot.deferredOriginalIds
 if(!Array.isArray(deferred)||deferred.length!==2||
  !deferred.every(id=>remaining.includes(id))||
  !remaining.includes('IX-CHEM-2025-C11-T4-01L')||
  !remaining.includes('IX-CHEM-2025-C11-T4-02L')||
  remaining.filter(id=>id.startsWith('IX-CHEM-2025-C13-')).length!==5||
  remaining.filter(id=>id.startsWith('X-CHEM-')).length!==3)
  fail('DEFERRED_SAFETY_BACKLOG_DRIFT')
 const overlaps=snapshot.semanticOverlapReviewCandidates
 if(!Array.isArray(overlaps)||overlaps.length!==3||
  overlaps.some(pair=>pair.independentFacultyDuplicateReview!==false||
   pair.sourceQuestionIds?.length!==2||
   pair.sourceQuestionIds.some(id=>!authenticIds.has(id))))
  fail('UNREVIEWED_SEMANTIC_OVERLAP_LOST')
 return {schemaVersion:'assps-grade910-cross-cohort-cryptographic-review-freeze-v1',
  basisSnapshot:LEDGER,basisSchema:snapshot.schemaVersion,
  authOriginalQuestionCandidates:snapshot.originalAuthoredQuestionCandidates,
  authenticRawQuestionIdsWithinNineteenSourceCohorts:rawCandidateIds.size,
  authenticProvisionalSourceGroups:cohorts.length,
  sourceCryptographicallyMatchedOriginalIds:items.length,
  sourceAuthenticMarkingPointProposals:criteriaTotal(cohorts),
  remainingWithoutExplanatoryResearch:remaining,
  intentionallyDeferredResearch:deferred,
  potentialSemanticOverlapsPendingFaculty:overlaps,
  humanAdoptedPhysicalTextbookVerified:0,
  independentlyQualifiedHumanReviewed:0,
  revisionSpecificApproved:0,verifiedPublished:0,
  admissionDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  provenanceCaveat:'Original candidate bytes and catalog PDF identity claims reconciled against source records; NOT actual ASSPS-approved textbook/edition/physical printed exercise-page, Urdu correctness, human qualified independent signed academic approval, live tenant/RLS or production certification.',
  sourceGroups:cohorts,questionReviewIntake:items}
}
function criteriaTotal(cohorts){return cohorts.reduce((n,g)=>n+g.proposedMarkingCriteria,0)}
function markdown(d){
 return ['# ASSPS Grade IX-X — 156 original-ID cryptographic reviewer intake','',
  '**FAIL CLOSED: NOT APPROVED, NOT VERIFIED FOR PRODUCTION, NOT A SCHOOL TEXTBOOK CERTIFICATION.**','',
  'Source-linked provisional original IDs with separate answer research drafts: **'+d.sourceCryptographicallyMatchedOriginalIds+'** across **'+d.authenticProvisionalSourceGroups+'** original cohorts.',
  'Source-linked proposed marking points: **'+d.sourceAuthenticMarkingPointProposals+'**.',
  'Original authored candidates remain '+d.authOriginalQuestionCandidates+'; '+d.remainingWithoutExplanatoryResearch.length+' original rubric-only IDs still await explanatory research.',
  'This freeze checks exact original source bytes, question/answer hash, provisional source catalog registry, original marks, packet uniqueness, reviewer-null and false approval and publication flags. **None of these tests certifies the actual school-adopted textbook, exact printed exercise-page or teacher approval.**','',
  '## Pending faculty review / not authored','',
  ...d.remainingWithoutExplanatoryResearch.map(id=>'- '+id),
  '','## Semantic overlaps requiring qualified originality decisions','',
  ...d.potentialSemanticOverlapsPendingFaculty.map(g=>'- '+g.sourceQuestionIds.join(' vs ')+' — faculty reviewed: NO'),
  '','## Cryptographically matched cohorts (NOT curriculum adoption)','',
  '| Source file | IDs | Proposed criteria | Original byte SHA256 |',
  '|---|---:|---:|---|',
  ...d.sourceGroups.map(g=>'| '+g.originalSource+' | '+g.distinctExistingOriginalIds+
   ' | '+g.proposedMarkingCriteria+' | '+g.rawSourceSha256+' |'),
  '','## Release decision','',
  '**'+d.admissionDecision+'**. Qualified Chemistry/other-subject teachers and ASSPS textbook coordinator must independently verify adopted 2026-27 book, pages, answer correctness, Urdu parity, duplicate originality and sign each specific immutable question revision. Core/Paper Studio must separately certify tenant auth/RLS, official paper and print parity. SaaS Core owns production deployment.',''
 ].join('\n')
}
function main(){
 const report=attest(loadInputs())
 const prefix=path.join(DOC,'ASSPS_GRADE910_156_CROSS_COHORT_REVIEW_FREEZE_20261009')
 fs.writeFileSync(prefix+'.json',JSON.stringify(report,null,2)+'\n')
 fs.writeFileSync(prefix+'.md',markdown(report))
 console.log(JSON.stringify({sourceGroups:report.authenticProvisionalSourceGroups,
  questionIds:report.sourceCryptographicallyMatchedOriginalIds,
  points:report.sourceAuthenticMarkingPointProposals,pending:report.remainingWithoutExplanatoryResearch.length,
  overlapPairs:report.potentialSemanticOverlapsPendingFaculty.length,decision:report.admissionDecision}))
}
if(require.main===module)main()
module.exports={attest,loadInputs,markdown,sha}

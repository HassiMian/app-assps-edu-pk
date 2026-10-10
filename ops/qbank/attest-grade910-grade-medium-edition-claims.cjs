#!/usr/bin/env node
'use strict'
// Nonpublishing per-question teaching-grade, language and edition applicability.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const originals=require('./attest-grade910-all-original-candidate-revisions.cjs')
const subjects=require('./attest-grade910-original-subject-provenance.cjs')
const {collectDocuments}=require('./audit-authoring-crossfile-qa.cjs')
const ROOT=path.resolve(__dirname,'../..')
const REG=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const DOC=path.join(ROOT,'docs/question-bank')
const NAME='ASSPS_GRADE910_1135_SOURCE_APPLICABILITY_REVIEW_QUEUE_20261010'
const PIN='bdeb24236695221feb737fbfb5acda6ca113d4e27af478f5d68d788b277bfdef'
const REG_SHA='9241b22e74a4910035de85cb7d5aba837a0995600beb73a8df2f8733ccdbb065'
const SHA=v=>crypto.createHash('sha256').update(v).digest('hex')
const fail=c=>{throw Error('GRADE910_APPLICABILITY_'+c)}
const norm=x=>String(x??'').trim().toLowerCase()
const explicitEdition=v=>/^[12][0-9]{3}(?:-[0-9]{2,4})?$/.test(String(v??'').trim())
function loadInputs(){
 return{originals:originals.loadInputs(),sourceSubject:subjects.loadInputs(),
  documents:collectDocuments(),registryBytes:fs.readFileSync(REG)}
}
function classify(q,record,sourceRecords){
 const originalGrade=Number(q.curriculum?.grade)
 const registeredGrade=Number(record.grade)
 const grade = ![9,10].includes(originalGrade)?'MISSING_OR_INVALID_QUESTION_GRADE':
  ![9,10].includes(registeredGrade)?'REGISTERED_SOURCE_GRADE_UNSPECIFIED_SHARED_SCOPE':
  originalGrade!==registeredGrade?'CONTRADICTORY_GRADE':'GRADE_CATALOG_MATCH'
 if(grade==='CONTRADICTORY_GRADE')fail('EXPLICIT_GRADE_CONTRADICTION:'+q.id)
 const sourceMedium=norm(record.medium),language=norm(q.medium)
 let medium
 if(!['english','urdu','dual'].includes(language))
  medium='ORIGINAL_QUESTION_MEDIUM_MISSING'
 else if(language==='dual'){
  const both=q.source?.languages
  if(!both?.en||!both?.ur)fail('DUAL_ORIGINAL_WITHOUT_SEPARATE_LANGUAGE_CLAIMS:'+q.id)
  for(const [lang,expectedMedium] of [['en','english'],['ur','urdu']]){
   const claimed=both[lang],ref=sourceRecords.get(claimed?.catalogRecordId)
   if(!ref||norm(ref.medium)!==expectedMedium||
      claimed.pdfSha256!==ref.pdfSha256||ref.subject!==record.subject||
      (Number(ref.grade)!==registeredGrade||![9,10].includes(Number(ref.grade))))
     fail('INVALID_DUAL_LANGUAGE_SOURCE_CLAIMS:'+q.id+':'+lang)
  }
  medium='BOTH_LANGUAGE_CATALOG_CLAIMS_PRESENT_INDEPENDENT_PARITY_UNREVIEWED'
 }else if(!['english','urdu'].includes(sourceMedium))
  medium='CATALOG_LABEL_MEDIUM_UNSPECIFIED'
 else if(language!==sourceMedium)
  fail('EXPLICIT_SOURCE_MEDIUM_CONTRADICTION:'+q.id)
 else medium='MEDIUM_CATALOG_MATCH'
 const candidateEdition=String(q.curriculum?.edition??'').trim()
 const registeredEdition=String(record.edition??'').trim()
 const edition= candidateEdition!==registeredEdition?'DRAFT_AND_CATALOG_EDITION_LABEL_DISAGREE':
  !explicitEdition(registeredEdition)?'CATALOG_EDITION_NOT_SESSION_EXPLICIT':
  'EDITIONS_LABEL_MATCH_BUT_SCHOOL_ADOPTION_NOT_CERTIFIED'
 return{grade,medium,edition,
   catalogEditionSessionExplicit:explicitEdition(registeredEdition),
   draftEditionMatchesCatalogLabel:candidateEdition===registeredEdition}
}
function build({originals:orig,sourceSubject,documents,registryBytes}){
 const previous=originals.assertFrozen(orig)
 const subject=subjects.assertFrozen(sourceSubject)
 if(previous.originalAuthoredQuestionCandidates!==2581||previous.originalAuthoredFiles!==73||
    subject.questionSubjectIdMatchesRegisteredCatalogLabel!==2537||
    subject.questionSubjectIdMissingFromOriginal!==44)
   fail('REQUIRED_SOURCE_OR_SUBJECT_ATTESTATION_DRIFT')
 if(!Buffer.isBuffer(registryBytes)||SHA(registryBytes)!==REG_SHA)
  fail('PUBLIC_CATALOG_RAW_BYTES_CHANGED')
 let ledger
 try{ledger=JSON.parse(registryBytes)}catch(_){fail('INVALID_PUBLIC_CATALOG_JSON')}
 if(ledger.entries?.length!==110||ledger.academicApproval!==false)
  fail('PUBLIC_CATALOG_SCOPE_OR_APPROVAL_DRIFT')
 const recordMap=new Map(ledger.entries.map(x=>[x.recordId,x]))
 if(recordMap.size!==110)fail('DUPLICATE_PUBLIC_CATALOG_SOURCE')
 const sourceMap=new Map(previous.files.map(x=>[x.originalAuthoredFile,x]))
 const counts={gradeUnresolved:0,mediumUnresolved:0,mediumDualReview:0,
  mediumWithoutOriginalClaim:0,mediumCatalogUnspecified:0,
  editionDisagreement:0,editionCatalogNonExplicit:0},
  rows=[],ids=new Set()
 let all=0
 for(const doc of documents){
  const questions=[...(doc.data?.drafts||[]),...(doc.data?.items||[])].filter(q=>
   q?.id&&(q.stem||q.question_text||q.questionText||q.content?.en?.stem||q.content?.ur?.stem))
  if(!questions.length)continue
  const file=sourceMap.get(doc.file)
  if(!file||file.originalQuestionCount!==questions.length)
   fail('UNKNOWN_ORIGINAL_SOURCE_FILE:'+doc.file)
  const byId=new Map(file.originalQuestionRevisions.map(q=>[q.originalQuestionId,q]))
  for(const q of questions){
   const frozen=byId.get(q.id)
   if(!frozen||frozen.originalQuestionRevisionSha256!==SHA(JSON.stringify(q))||ids.has(q.id))
    fail('QUESTION_ID_ORIGINAL_REVISION_CHANGED:'+q.id)
   ids.add(q.id);all++
   const sid=q.source?.catalogRecordId||doc.data.sourceRecordId
   const ref=recordMap.get(sid)
   if(!ref||(q.source?.pdfSha256||doc.data.sourcePdfSha256)!==ref.pdfSha256)
    fail('ORIGINAL_SOURCE_CATALOG_PDF_ID_CHANGED:'+q.id)
   const assessment=classify(q,ref,recordMap)
   const problems=[]
   if(assessment.grade!=='GRADE_CATALOG_MATCH'){counts.gradeUnresolved++;problems.push(assessment.grade)}
   if(assessment.medium!=='MEDIUM_CATALOG_MATCH'){
    counts.mediumUnresolved++;problems.push(assessment.medium)
    if(assessment.medium==='BOTH_LANGUAGE_CATALOG_CLAIMS_PRESENT_INDEPENDENT_PARITY_UNREVIEWED')counts.mediumDualReview++
    if(assessment.medium==='ORIGINAL_QUESTION_MEDIUM_MISSING')counts.mediumWithoutOriginalClaim++
    if(assessment.medium==='CATALOG_LABEL_MEDIUM_UNSPECIFIED')counts.mediumCatalogUnspecified++
   }
   if(assessment.edition==='DRAFT_AND_CATALOG_EDITION_LABEL_DISAGREE'){
    counts.editionDisagreement++;problems.push(assessment.edition)
   }
   if(!assessment.catalogEditionSessionExplicit){
    counts.editionCatalogNonExplicit++
    if(assessment.edition!=='DRAFT_AND_CATALOG_EDITION_LABEL_DISAGREE')
     problems.push('CATALOG_EDITION_NOT_SESSION_EXPLICIT')
   }
   if(problems.length)rows.push({
    originalQuestionId:q.id,originalQuestionSha256:frozen.originalQuestionRevisionSha256,
    originalFile:doc.file,originalFileSha256:file.originalFileSha256,
    originalCatalogRecordId:sid,originalCatalogSourceSha256:ref.pdfSha256,
    originalGradeClaim:q.curriculum?.grade??null,catalogGradeLabel:ref.grade,
    originalMediumClaim:q.medium??null,catalogMediumLabel:ref.medium,
    originalEditionLabel:q.curriculum?.edition??null,catalogEditionLabel:ref.edition,
    independentReviewFlags:problems,
    signedSchoolTextbookAdoptionVerified:false,
    actualPhysicalExercisePageVerified:false,independentQualifiedReviewerId:null,
    approvedQuestionRevisionId:null,academicallyApproved:false,verifiedPublished:false})
  }
 }
 if(all!==2581||ids.size!==2581||rows.length!==1135||
   counts.gradeUnresolved!==114||counts.mediumUnresolved!==408||
   counts.mediumDualReview!==48||counts.mediumWithoutOriginalClaim!==50||
   counts.mediumCatalogUnspecified!==310||counts.editionDisagreement!==477||
   counts.editionCatalogNonExplicit!==877)
  fail('ORIGINAL_APPLICABILITY_POPULATION_OR_REASON_COUNT_DRIFT')
 return{schemaVersion:'assps-grade910-original-session-grade-medium-edition-evidence-v1',
   originalQuestionResearchCandidates:2581,originalSourceFiles:73,
   originalQuestionRevisionsNeedingEvidenceReview:1135,
   noClaimedApplicabilityDefectsInCatalogComparison:1446,
   observedFlagsCanOverlap:true,...counts,
   preexistingGradeEnglishMissing:44,
   sharedGradeZeroUrduGrammarOriginals:70,
   allOriginalSourceBytesAndOriginalQuestionTextUnchanged:true,
   sourceCatalogProvenanceIsNotSchoolAdoption:true,
   independentlyTextbookAndExercisePageVerified:0,
   independentlyReviewedAndApproved:0,verifiedPublished:0,
   publicationDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
   candidateReviewQueue:rows}
}
function assertFrozen(inputs,overrideBytes){
 const bytes=overrideBytes??fs.readFileSync(path.join(DOC,NAME+'.json'))
 if(!Buffer.isBuffer(bytes)||SHA(bytes)!==PIN)
  fail('FROZEN_REVIEW_QUEUE_RAW_SHA_DRIFT')
 let saved
 try{saved=JSON.parse(bytes)}catch(_){fail('FROZEN_REVIEW_QUEUE_INVALID_JSON')}
 const actual=build(inputs)
 if(JSON.stringify(saved)!==JSON.stringify(actual))
  fail('ORIGINAL_APPLICABILITY_RESEARCH_REVIEW_DRIFT')
 return actual
}
function markdown(d){
 return ['# ASSPS IX–X: Original source grade, medium and textbook edition evidence queue','',
 '**Research eligibility checks ONLY; not teacher-verified, not school textbook adoption.**','',
 'The 2,581 original question revisions stay intact. 1,135 have overlapping grade, medium and/or edition public-source claim flags; 1,446 have no such flags, but still lack real ASSPS adopted textbook/page and independent academic review.',
 'Grade scope review: 114 originals, including 44 IX English originals with absent grade and 70 Urdu IX/X Grammar originals referencing a deliberately grade-0 shared source.',
 'Medium review: 408 originals, split into 48 dual-language Biology IX questions with separate source claims yet no qualified parity signoff, 50 original questions without a medium field, and 310 questions whose public source catalog medium label is unspecified.',
 'Edition disagreement: 477 originals; catalog session-edition not explicit: 877 originals. These flags can overlap; do not add them as distinct questions.',
 'Do not infer school subject book approval or silently fill missing Grade, medium, edition, printed page, exercise or teacher signoff.',
 '','| Original question ID | Original question SHA256 | Source file | Source ID | Review reasons |',
 '|---|---|---|---|---|',
 ...d.candidateReviewQueue.map(q=>'| '+q.originalQuestionId+' | '+q.originalQuestionSha256+' | '+q.originalFile+' | '+q.originalCatalogRecordId+' | '+q.independentReviewFlags.join(', ')+' |'),
 '','Academic approvals 0; verified published 0. Every proposed source-metadata correction is a NEW question revision subject to qualified review.',
 '**'+d.publicationDecision+'**. SaaS Core exclusively owns production.',''
 ].join('\n')
}
function main(){
 const x=build(loadInputs()),dest=path.join(DOC,NAME)
 fs.writeFileSync(dest+'.json',JSON.stringify(x,null,2)+'\n')
 fs.writeFileSync(dest+'.md',markdown(x))
 console.log(JSON.stringify({total:x.originalQuestionResearchCandidates,reviewQueue:x.originalQuestionRevisionsNeedingEvidenceReview,
  grade:x.gradeUnresolved,medium:x.mediumUnresolved,edition:x.editionDisagreement,
  nonExplicitEdition:x.editionCatalogNonExplicit,sha256:SHA(fs.readFileSync(dest+'.json')),
  academicallyApproved:x.independentlyReviewedAndApproved}))
}
if(require.main===module)main()
module.exports={loadInputs,build,classify,assertFrozen,markdown,NAME,SHA}

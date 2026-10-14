#!/usr/bin/env node
'use strict'
// Read-only source SUBJECT provenance integrity, never school adoption or teacher approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const old=require('./attest-grade910-all-original-candidate-revisions.cjs')
const {collectDocuments}=require('./audit-authoring-crossfile-qa.cjs')
const ROOT=path.resolve(__dirname,'../..')
const REG=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const DOC=path.join(ROOT,'docs/question-bank')
const NAME='ASSPS_GRADE910_44_MISSING_SUBJECT_IDS_SOURCE_BOUND_FACULTY_QUEUE_20261010'
const PIN='6062f396012644cd96d6c46292247593f55fb204882af5c551d1399b9a6f580c'
const REGISTRY_SHA='9241b22e74a4910035de85cb7d5aba837a0995600beb73a8df2f8733ccdbb065'
const hash=b=>crypto.createHash('sha256').update(b).digest('hex')
const bad=c=>{throw Error('GRADE910_SUBJECT_'+c)}
// This is an explicit *published catalog title -> internal subject key* vocabulary.
// It is NOT evidence of the school's actual adopted textbook.
const TITLE_KEYS=Object.freeze({
 'Chemistry':'chemistry','Biology':'biology','Mathematics':'mathematics',
 'Physics':'physics','Urdu':'urdu','English':'english',
 'Tarjuma-tul-Quran':'tarjuma-tul-quran','Physics-Tech':'physics-tech',
 'Art & Model Drawing':'art-model-drawing','Computer Science':'computer-science',
 'Pakistan Studies':'pakistan-studies','Biology-Tech':'biology-tech',
 'Chemistry-Tech':'chemistry-tech','Urdu Quaid-e-Insha':'urdu',
 'Health Sciences-Tech':'health-sciences-tech','General Science-Tech':'general-science-tech',
 'Agriculture Sciences-Tech':'agriculture-sciences-tech',
 'Computer Science & Entrepreneurship-Tech':'computer-science-entrepreneurship-tech',
 'Computer':'computer','Home Economics':'home-economics',
 'Parcha Bafi (Textile and Clothing)':'parcha-bafi-(textile-and-clothing)',
 'Fashion Designing-Tech':'fashion-designing-tech','Islamiat':'islamiat',
 'Ghiza aur Ghizayat':'ghiza-aur-ghizayat',
 'Information & Communication Technologies-Tech':'ict-tech',
 'Communication Skills & Personal Grooming-Tech':'communication-skills-tech'
})
const authored=q=>Boolean(q?.id&&(q.stem||q.question_text||q.questionText||q.content?.en?.stem||q.content?.ur?.stem))
function loadInputs(){
 const raw=fs.readFileSync(REG)
 return {originals:old.loadInputs(),documents:collectDocuments(),registryBytes:raw}
}
function checkSubject(q,record,sourceFile){
 const actual=String(q?.curriculum?.subjectId||'').trim()
 const expected=TITLE_KEYS[record?.subject]
 if(!expected)bad('UNKNOWN_UNMAPPED_PUBLISHED_SOURCE_SUBJECT:'+sourceFile+':'+q?.id)
 if(!actual)return {status:'QUESTION_LEVEL_SUBJECT_MISSING_NEEDS_QUALIFIED_REVIEW',expectedCatalogSubjectId:expected}
 if(actual!==expected)bad('SOURCE_SUBJECT_CONTRADICTION:'+sourceFile+':'+q?.id+':'+actual+'!='+expected)
 return {status:'DRAFT_SUBJECT_ID_MATCHES_UNAPPROVED_CATALOG_LABEL',expectedCatalogSubjectId:expected}
}
function build({originals,documents,registryBytes}){
 const frozen=old.assertFrozen(originals)
 if(frozen.originalAuthoredQuestionCandidates!==2581||frozen.originalAuthoredFiles!==73||
  frozen.academicallyApproved!==0||frozen.verifiedPublished!==0)
  bad('INHERITED_2581_SOURCE_FREEZE_STATUS_DRIFT')
 if(!Buffer.isBuffer(registryBytes)||hash(registryBytes)!==REGISTRY_SHA)
  bad('OFFICIAL_CATALOG_REGISTRY_RAW_SHA_DRIFT')
 let registry
 try{registry=JSON.parse(registryBytes)}catch(_){bad('OFFICIAL_CATALOG_REGISTRY_INVALID_JSON')}
 if(registry.entries?.length!==110||registry.academicApproval!==false)
  bad('CATALOG_NOT_HUMAN_REVIEWED_OR_COUNT_DRIFT')
 const map=new Map(registry.entries.map(s=>[s.recordId,s]))
 if(map.size!==110)bad('DUPLICATE_CATALOG_SOURCE_ID')
 const sources=new Map(frozen.files.map(f=>[f.originalAuthoredFile,f]))
 const missing=[],byFile={},seen=new Set()
 let scanned=0,good=0
 for(const row of documents){
  const items=[...(row.data?.drafts||[]),...(row.data?.items||[])]
  const questions=items.filter(authored)
  if(!questions.length)continue
  const file=sources.get(row.file)
  if(!file||file.originalQuestionCount!==questions.length)bad('ORIGINAL_FILE_NOT_PROVENANCE_FROZEN:'+row.file)
  const originalById=new Map(file.originalQuestionRevisions.map(q=>[q.originalQuestionId,q]))
  for(const q of questions){
   const original=originalById.get(q.id)
   if(seen.has(q.id)||!original||original.originalQuestionRevisionSha256!==hash(JSON.stringify(q)))
    bad('ORIGINAL_QUESTION_REVISION_OR_ID_DRIFT:'+q.id)
   seen.add(q.id);scanned++
   const sourceId=q.source?.catalogRecordId||row.data.sourceRecordId
   const registered=map.get(sourceId)
   if(!registered)bad('UNKNOWN_PRIMARY_PUBLISHED_CATALOG_RECORD:'+q.id)
   const claimedHash=q.source?.pdfSha256||row.data.sourcePdfSha256
   if(claimedHash!==registered.pdfSha256)
    bad('SOURCE_PDF_HASH_OR_PRIMARY_ID_CONTRADICTION:'+q.id)
   const claim=checkSubject(q,registered,row.file)
   if(claim.status==='QUESTION_LEVEL_SUBJECT_MISSING_NEEDS_QUALIFIED_REVIEW'){
    missing.push({
     originalQuestionId:q.id,originalQuestionRevisionSha256:original.originalQuestionRevisionSha256,
     originalSourceFile:row.file,originalSourceFileSha256:file.originalFileSha256,
     registeredSourceId:sourceId,registeredSourceRawCatalogSha256:REGISTRY_SHA,
     claimedCatalogSubject:registered.subject,
     proposedEditorialSubjectKeyForHumanVerification:claim.expectedCatalogSubjectId,
     existingQuestionLevelSubjectId:null,originalAuthoringQuestionModified:false,
     schoolAdoptedTextbookIndependentlyCertified:false,
     independentSubjectTeacherId:null,qualifiedHumanTopicReviewerSigned:false,
     approvedRevisionId:null,academicallyApproved:false,verifiedPublished:false
    })
   }else good++
   byFile[row.file]=(byFile[row.file]||0)+1
  }
 }
 if(scanned!==2581||seen.size!==2581||good!==2537||missing.length!==44||
  new Set(missing.map(q=>q.originalQuestionId)).size!==44||
  new Set(missing.map(q=>q.originalSourceFile)).size!==1||
  missing[0]?.originalSourceFile!=='english9CompetencyOriginals2026.json'||
  Object.keys(byFile).length!==73||missing.some(q=>q.claimedCatalogSubject!=='English'))
  bad('ORIGINAL_SUBJECT_VOCAB_OR_44_MISSING_ID_BASELINE_DRIFT')
 return {schemaVersion:'assps-grade910-original-subject-identity-raw-source-bound-v1',
  originalAuthoredCandidateQuestions:2581,
  originalSourceFilesChecked:73,
  sourceCatalogRegistryRecords:110,
  questionSubjectIdMatchesRegisteredCatalogLabel:2537,
  questionSubjectIdMissingFromOriginal:44,
  sourceSubjectContradictionsAllowed:0,
  missingSubjectIdFileCount:1,
  unapprovedOriginalQuestionIdsUnchanged:true,
  sourceCatalogIsNotSchoolTextbookAdoption:true,
  independentlySourceVerifiedByTeacher:0,
  academicallyApproved:0,verifiedPublished:0,
  publicationDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  missingQuestionLevelSubjectIdentityForTeacherClassification:missing}
}
function assertFrozen(inputs,bytesOverride){
 const bytes=bytesOverride??fs.readFileSync(path.join(DOC,NAME+'.json'))
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)
  bad('FROZEN_SUBJECT_REVIEW_MANIFEST_RAW_SHA_DRIFT')
 let saved
 try{saved=JSON.parse(bytes)}catch(_){bad('FROZEN_SUBJECT_REVIEW_MANIFEST_JSON_INVALID')}
 const current=build(inputs)
 if(JSON.stringify(saved)!==JSON.stringify(current))
  bad('SUBJECT_REVIEW_MANIFEST_CONTENT_DRIFT')
 return current
}
function markdown(d){
 return ['# ASSPS Grade IX-X: 44 original English subject metadata omissions — qualified teacher intake','',
  'Original 2,581 question research records and 73 source files have been checked against exact frozen original SHA256 revisions.',
  '**2,537** existing question-level subject IDs agree with the unapproved public catalog labels. **44** original Grade IX English practice items are missing the question-level subjectId.',
  'Those 44 are separate **RESEARCH TRIAGE**, not academically reviewed or published; DO NOT auto-edit, assign an official textbook grade/year, or seed source questions.',
  'The source catalog title for these original records reads English; this is a candidate classification hint and not signed school textbook adoption.',
  'Changing the question-level subject ID creates a NEW question revision requiring source/answer/difficulty review. Any contradiction (e.g. Chemistry source with physics subjectId) must fail closed.',
  '','| Original question ID | Source file | Original question revision SHA256 | Candidate catalog label | Original status |',
  '|---|---|---|---|---|',
  ...d.missingQuestionLevelSubjectIdentityForTeacherClassification.map(q=>
   '| '+q.originalQuestionId+' | '+q.originalSourceFile+' | '+q.originalQuestionRevisionSha256+
   ' | '+q.claimedCatalogSubject+' | HUMAN REVIEW REQUIRED |'),
  '','Independently signed review **0**, academically approved **0**, verified published **0**.',
  '**'+d.publicationDecision+'**; SaaS Core alone owns production.',''
 ].join('\n')
}
function main(){
 const d=build(loadInputs()),prefix=path.join(DOC,NAME)
 fs.writeFileSync(prefix+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(prefix+'.md',markdown(d))
 console.log(JSON.stringify({
  candidates:d.originalAuthoredCandidateQuestions,consistent:d.questionSubjectIdMatchesRegisteredCatalogLabel,
  missing:d.questionSubjectIdMissingFromOriginal,sha256:hash(fs.readFileSync(prefix+'.json')),
  academicallyApproved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={loadInputs,build,checkSubject,assertFrozen,markdown,NAME,hash}

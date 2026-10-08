#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {collectDocuments,normalizedText}=require('./audit-authoring-crossfile-qa.cjs')
const ROOT=path.resolve(__dirname,'../..')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_REVIEW_TRIAGE_QUEUE_20261008.json')
const SHA=s=>crypto.createHash('sha256').update(s).digest('hex')
function buildReviewQueue(documents,manifest,mcqAudit={},editorialCandidates=[]){
 const editorialById=new Map(editorialCandidates.map(x=>[x.questionId,x]))
 if(editorialById.size!==editorialCandidates.length)throw Error('DUPLICATE_EDITORIAL_CANDIDATE_ID')
 const consumed=new Set()
 const source=new Map((manifest.entries||[]).map(x=>[x.recordId,x]))
 const flaggedFiles=new Set((mcqAudit.filesWithPatterns||[]).map(x=>x.file))
 const seen=new Set(), records=[], collisions=[]
 for(const {file,data} of documents){
  if(!data||typeof data!=='object')continue
  const fileRows=[...(data.drafts||[]),...(data.items||[])]
  for(const q of fileRows){
   if(!q||typeof q!=='object'||!q.id||!normalizedText(q))continue
   const id=String(q.id)
   if(seen.has(id)){collisions.push({id,file});continue}
   seen.add(id)
   const editorial=editorialById.get(id)
   if(editorial){
    if(editorial.parentQuestionSha256!==SHA(JSON.stringify(q))||editorial.approved!==false||
       editorial.proposalStatus!=='PENDING_INDEPENDENT_TRANSLATION_AND_BIOLOGY_REVIEW')
      throw Error('EDITORIAL_PROPOSAL_STALE_OR_UNVERIFIED:'+id)
    consumed.add(id)
   }
   const srcId=String(q.source?.catalogRecordId||q.sourceRecordId||data.sourceRecordId||'').trim()
   const canonical=source.get(srcId)
   const pdfHash=String(q.source?.pdfSha256||q.sourcePdfSha256||data.sourcePdfSha256||'')
   const edition=String(q.curriculum?.edition||q.edition||data.edition||'')
   const grade=q.curriculum?.grade||q.grade||data.grade||canonical?.grade||null
   const subject=String(q.curriculum?.subjectId||q.subjectId||q.subject||data.subject||canonical?.subject||'').trim()
   const medium=String(q.medium||q.language||data.medium||canonical?.medium||'unspecified').toLowerCase()
   const chapter=q.chapter?.number??q.chapterNo??data.chapterNo??null
   const topic=q.topicId??q.topic?.id??q.topic??null
   const page=q.source?.page
   const claimedPage=Number.isInteger(page)&&page>0?page:null
   const hashMatched=Boolean(canonical?.pdfSha256&&pdfHash&&pdfHash===canonical.pdfSha256)
   const blockers=['SCHOOL_APPROVED_EDITION_AND_EXAM_YEAR_UNCONFIRMED',
      'INDEPENDENT_ACADEMIC_REVIEW_MISSING']
   if(!canonical||!hashMatched)blockers.push('OFFICIAL_SOURCE_HASH_OR_IDENTITY_UNVERIFIED')
   if(claimedPage===null)blockers.push('SOURCE_PAGE_CLAIM_MISSING')
   else blockers.push('SOURCE_PAGE_CLAIM_NOT_PHYSICALLY_VERIFIED')
   if(!/^[12][0-9]{3}(-[0-9]{2,4})?$/.test(edition))blockers.push('TEXTBOOK_EDITION_LABEL_UNRESOLVED')
   if(chapter===null)blockers.push('CHAPTER_MAPPING_UNRESOLVED')
   if(topic===null||String(topic).trim()==='')blockers.push('TOPIC_MAPPING_UNRESOLVED')
   if(String(q.type).toLowerCase()==='mcq'&&flaggedFiles.has(file))blockers.push('SOURCE_FILE_MCQ_KEY_PATTERN_EDITORIAL_REVIEW')
   if(q.content?.en&&q.content?.ur)blockers.push('BILINGUAL_EQUIVALENCE_INDEPENDENT_CHECK_MISSING')
   if(q.content?.en&&q.content?.ur && (!String(q.content.ur.stem||'').trim()||!String(q.content.ur.answer||'').trim()))
     blockers.push('URDU_DUAL_CONTENT_COMPLETION_REQUIRED')
   records.push({
    questionId:id,sourceFile:file,questionContentSha256:SHA(JSON.stringify(q)),
    grade,subjectId:subject,medium,chapter,topicId:topic,type:q.type,
    questionSourceRecordId:srcId,
    sourceHashMetadataMatch:hashMatched,
    claimedSourcePage:claimedPage,claimedPageNumbering:'UNSPECIFIED',
    editionClaim:edition||null,
    evidenceTier:'RESEARCH_CANDIDATE_ONLY',
    editorialTranslationCandidate:editorial?{revisionFile:editorial.proposedRevisionFile,revisionFileSha256:editorial.editorialRevisionFileSha256,revisionQuestionSha256:editorial.proposedRevisionSha256,status:editorial.proposalStatus,approved:false}:null,
    blockers,
    status:{sourceVerified:false,independentlyReviewed:false,approved:false,published:false},
    reviewerId:null,academicApproverId:null,revisionApproved:null
   })
  }
 }
 if(consumed.size!==editorialById.size)throw Error('EDITORIAL_CANDIDATE_SOURCE_QUESTION_NOT_FOUND')
 records.sort((a,b)=>String(a.grade).localeCompare(String(b.grade),'en',{numeric:true})||
  a.subjectId.localeCompare(b.subjectId)||a.medium.localeCompare(b.medium)||
  String(a.chapter).localeCompare(String(b.chapter),'en',{numeric:true})||
  a.questionId.localeCompare(b.questionId))
 const issues={},mediums={},types={},bySubject={}
 for(const row of records){
  for(const block of row.blockers)issues[block]=(issues[block]||0)+1
  mediums[row.medium]=(mediums[row.medium]||0)+1
  types[row.type]=(types[row.type]||0)+1
  const key=String(row.grade)+'/'+row.subjectId+'/'+row.medium
  bySubject[key]=(bySubject[key]||0)+1
 }
 return{
  schemaVersion:'assps-grade910-offline-review-queue-v1',
  scope:'OFFLINE_METADATA_ONLY_UNTRUSTED_AUTHORING_RESEARCH_NOT_ACADEMIC_RELEASE',
  currentSchoolTeachingSession:'2026-27 (school timetable only; not textbook adoption)',
  schoolApprovedBookEditionEvidencePresent:false,
  sourceChapterAndExerciseIndependentVerification:false,
  independentHumanSignoffsPresent:false,
  counts:{questionRecords:records.length,stableQuestionIds:seen.size,collisionIds:collisions.length,
   originalAuthoringFiles:new Set(records.map(x=>x.sourceFile)).size,
   sourceVerified:0,independentlyReviewed:0,approved:0,published:0},
  bySubject,byMedium:mediums,byType:types,blockerCounts:issues,
  unapprovedEditorialTranslationProposals:consumed.size,
  collisions,
  records
 }
}
if(require.main===module){
 const manifest=JSON.parse(fs.readFileSync(path.join(STAGING,'officialSourceManifest.json'),'utf8'))
 const mcq=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_MCQ_AUTHORING_QA_20261008.json'),'utf8'))
 const {loadCandidates}=require('./verify-bio9-editorial-translation-proposals.cjs')
 const report=buildReviewQueue(collectDocuments(STAGING),manifest,mcq,loadCandidates())
 if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify({counts:report.counts,byMedium:report.byMedium,blockerCounts:report.blockerCounts,unapprovedEditorialTranslationProposals:report.unapprovedEditorialTranslationProposals,reportPath:process.argv.includes('--write')?OUT:null},null,2))
 if(process.argv.includes('--strict')&&(report.counts.collisionIds||report.counts.approved||report.counts.published))process.exitCode=1
}
module.exports={buildReviewQueue}

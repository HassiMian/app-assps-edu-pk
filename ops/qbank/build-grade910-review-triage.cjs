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
function buildReviewQueue(documents,manifest,mcqAudit={},editorialCandidates=[],mcqEditorialCandidates=[],similarityReview={pairs:[]},physicsReference={rows:[]}){
 const physicsById=new Map((physicsReference.rows||[]).map(x=>[x.questionId,x]))
 if(physicsById.size!==(physicsReference.rows||[]).length)throw Error('PHYSICS_REFERENCE_DUPLICATE_QUESTION')
 const consumedPhysics=new Set()
 const similarityById=new Map()
 for(const pair of similarityReview.pairs||[]){
  if(!['CROSS_CHAPTER_TEMPLATE_SIMILARITY','SAME_CHAPTER_POSSIBLE_REPHRASE'].includes(pair.reason)||
     pair.approved!==false||pair.duplicateConfirmed!==false||pair.questionA===pair.questionB)
   throw Error('UNTRUSTED_SIMILARITY_REVIEW_RECORD')
  for(const [id,ownSha,other] of [[pair.questionA,pair.questionShaA,pair.questionB],[pair.questionB,pair.questionShaB,pair.questionA]]){
   if(!similarityById.has(id))similarityById.set(id,[])
   similarityById.get(id).push({ownSha,other,reason:pair.reason})
  }
 }
 const consumedSimilarity=new Set()
 const mcqCandidates=new Map(mcqEditorialCandidates.map(x=>[x.questionId,x]))
 if(mcqCandidates.size!==mcqEditorialCandidates.length)throw Error('DUPLICATE_CHEMISTRY_MCQ_EDITORIAL_CANDIDATE')
 const consumedMcqs=new Set()
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
   const physics=physicsById.get(id)
   if(physics){
    if(q.type!=='mcq'||String(q.curriculum?.subjectId).toLowerCase()!=='physics'||
       physics.originalQuestionSha256!==SHA(JSON.stringify(q))||
       physics.approved!==false||physics.answerAccuracyHumanVerified!==false||
       physics.independentReviewerId!==null||physics.expectedReferenceConsistentWithStoredKey!==true)
      throw Error('PHYSICS_CONCEPT_REFERENCE_SOURCE_OR_REVIEW_DRIFT:'+id)
    consumedPhysics.add(id)
   }
   const similarity=similarityById.get(id)||[]
   for(const match of similarity)if(match.ownSha!==SHA(JSON.stringify(q)))
    throw Error('STALE_STEM_SIMILARITY_REVIEW_SHA:'+id)
   if(similarity.length)consumedSimilarity.add(id)
   const mcqRevision=mcqCandidates.get(id)
   if(mcqRevision){
    if(q.type!=='mcq'||mcqRevision.parentQuestionSha256!==SHA(JSON.stringify(q))||
       mcqRevision.approved!==false||mcqRevision.reviewStatus!=='PENDING_INDEPENDENT_CHEMISTRY_SOURCE_ANSWER_EDITORIAL_REVIEW')
      throw Error('CHEMISTRY_MCQ_REVISION_SOURCE_DRIFT:'+id)
    consumedMcqs.add(id)
   }
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
   if(similarity.length)blockers.push('NEAR_STEM_TEMPLATE_ORIGINALITY_HUMAN_REVIEW_REQUIRED')
   if(physics)blockers.push('PHYSICS_CONCEPT_ANSWER_HUMAN_REVIEW_REQUIRED')
   if(physics?.contextCaveat)blockers.push('PHYSICS_CONCEPT_SCOPE_QUALIFIER_REVIEW_REQUIRED')
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
    physicsConceptualReferenceCandidate:physics?{referenceQuestionSha256:physics.originalQuestionSha256,expectedAnswerSha256:physics.expectedAnswerSha256,contextCaveat:physics.contextCaveat,reviewStatus:'PENDING_PHYSICS_SUBJECT_SPECIALIST',approved:false}:null,
    nearStemSimilarityReview:similarity.length?{candidatePairs:similarity.length,otherQuestionIds:[...new Set(similarity.map(x=>x.other))].sort(),humanDuplicateVerdict:'PENDING',approved:false}:null,
    editorialMcqRevisionCandidate:mcqRevision?{revisionFile:mcqRevision.revisionFile,revisionFileSha256:mcqRevision.revisionFileSha256,revisionQuestionSha256:mcqRevision.proposedRevisionSha256,status:mcqRevision.reviewStatus,approved:false}:null,
    editorialTranslationCandidate:editorial?{revisionFile:editorial.proposedRevisionFile,revisionFileSha256:editorial.editorialRevisionFileSha256,revisionQuestionSha256:editorial.proposedRevisionSha256,status:editorial.proposalStatus,approved:false}:null,
    blockers,
    status:{sourceVerified:false,independentlyReviewed:false,approved:false,published:false},
    reviewerId:null,academicApproverId:null,revisionApproved:null
   })
  }
 }
 if(consumed.size!==editorialById.size)throw Error('EDITORIAL_CANDIDATE_SOURCE_QUESTION_NOT_FOUND')
 if(consumedMcqs.size!==mcqCandidates.size)throw Error('MCQ_EDITORIAL_CANDIDATE_SOURCE_QUESTION_NOT_FOUND')
 if(consumedSimilarity.size!==similarityById.size)throw Error('NEAR_STEM_REVIEW_REFERENCES_MISSING_ORIGINAL_QUESTION')
 if(consumedPhysics.size!==physicsById.size)throw Error('PHYSICS_CONCEPT_REFERENCES_MISSING_ORIGINAL_QUESTION')
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
  unapprovedMcqRevisionProposals:consumedMcqs.size,
  nearStemOriginalityReviewQuestionCount:consumedSimilarity.size,
  nearStemSimilarityPairs:(similarityReview.pairs||[]).length,
  physicsProvisionalConceptReferences:consumedPhysics.size,
  physicsConceptualScopeCaveats:[...consumedPhysics].filter(id=>physicsById.get(id).contextCaveat).length,
  collisions,
  records
 }
}
if(require.main===module){
 const manifest=JSON.parse(fs.readFileSync(path.join(STAGING,'officialSourceManifest.json'),'utf8'))
 const mcq=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_MCQ_AUTHORING_QA_20261008.json'),'utf8'))
 const {loadCandidates}=require('./verify-bio9-editorial-translation-proposals.cjs')
 const {verify}=require('./verify-chemistry9-mcq-editorial-rev2.cjs')
 const {audit}=require('./audit-scientific-stem-similarity.cjs')
 const documents=collectDocuments(STAGING)
 const {analyze:physicsAudit,SOURCE:physicsSource}=require('./audit-physics9-conceptual-mcq-reference.cjs')
 const physicsReference=physicsAudit(fs.readFileSync(physicsSource))
 const report=buildReviewQueue(documents,manifest,mcq,loadCandidates(),verify(),audit(documents),physicsReference)
 if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify({counts:report.counts,byMedium:report.byMedium,blockerCounts:report.blockerCounts,unapprovedEditorialTranslationProposals:report.unapprovedEditorialTranslationProposals,unapprovedMcqRevisionProposals:report.unapprovedMcqRevisionProposals,nearStemOriginalityReviewQuestionCount:report.nearStemOriginalityReviewQuestionCount,nearStemSimilarityPairs:report.nearStemSimilarityPairs,physicsProvisionalConceptReferences:report.physicsProvisionalConceptReferences,physicsConceptualScopeCaveats:report.physicsConceptualScopeCaveats,reportPath:process.argv.includes('--write')?OUT:null},null,2))
 if(process.argv.includes('--strict')&&(report.counts.collisionIds||report.counts.approved||report.counts.published))process.exitCode=1
}
module.exports={buildReviewQueue}

#!/usr/bin/env node
'use strict'
// Measures ACTUAL authored-candidate distribution; never calls it complete curriculum coverage.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const packets=require('./build-grade910-blind-faculty-packets.cjs')
const prov=require('./audit-grade910-official-vs-archive-source-provenance.cjs')
const book=require('./build-grade910-school-adoption-verification-matrix.cjs')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_ORIGINAL_2581_ASSESSMENT_DEPTH_20261012.json')
const MD=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_SUBJECT_CHAPTER_ASSESSMENT_DEPTH_20261012.md')
const err=x=>{throw Error('ASSPS_GRADE910_ASSESSMENT_DEPTH_'+x)}
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
function text(x){return x==null||x===''?'UNASSIGNED':String(x).toLowerCase()}
function key(q){
 const raw=q.chapter?.number
 return [q.curriculum?.grade===9||q.curriculum?.grade===10?String(q.curriculum.grade):'UNASSIGNED',
 text(q.curriculum?.subjectId),raw!=null&&Number.isInteger(Number(raw))&&Number(raw)>0?String(raw):'UNASSIGNED']
}
function build(){
 const inventory=packets.inventory(),source=prov.make(),adoption=book.build()
 const known=new Map(source.records.map(x=>[x.catalogId,x]))
 if(known.size!==111||adoption.rows.length!==111||inventory.queue.rows.length!==2581)
  err('SOURCE_COHORT_CHANGED')
 const groups=new Map(),gradeTotals={},mediumTotals={},typeTotals={},subjectIds=new Set()
 let missingGrade=0,missingSubject=0,missingChapter=0,missingTopic=0,missingMedium=0,rawTotal=0
 let withPrintedSourcePageClaim=0,archiveRecovered=0,archiveGrade9=0,archiveGrade10=0
 for(const r of inventory.queue.rows){
  const matched=inventory.candidates.get(r.originalQuestionId)
  if(!matched||r.originalQuestionRevisionSha256!==sha(JSON.stringify(matched.q)))
   err('ORIGINAL_AUTHOR_REVISION_DRIFT')
  const q=matched.q,identity=key(q),[grade,subject,chapter]=identity
  const sourceId=r.originalSourceCatalogId,sourceRecord=known.get(sourceId)
  if(!sourceRecord)err('UNRECOGNIZED_SOURCE_BOOK_ID')
  const category=sourceRecord.sourceAcquisitionCategory
  if(category==='ARCHIVE_RECOVERED_NOT_EXACT_OFFICIAL_ASSET_LINK'){
   archiveRecovered++
   if(grade==='9')archiveGrade9++
   if(grade==='10')archiveGrade10++
  }
  if(grade==='UNASSIGNED')missingGrade++
  if(!q.curriculum?.subjectId)missingSubject++
  if(chapter==='UNASSIGNED')missingChapter++
  if(!q.topicId)missingTopic++
  if(!q.medium)missingMedium++
  if(q.source?.page!=null)withPrintedSourcePageClaim++
  gradeTotals[grade]=(gradeTotals[grade]||0)+1
  mediumTotals[q.medium||'UNASSIGNED']=(mediumTotals[q.medium||'UNASSIGNED']||0)+1
  typeTotals[q.type||'UNASSIGNED']=(typeTotals[q.type||'UNASSIGNED']||0)+1
  subjectIds.add(subject)
  const groupKey=identity.join('|')
  if(!groups.has(groupKey))groups.set(groupKey,{
   originalAuthorGradeClaim:grade,originalAuthorSubjectClaim:subject,
   originalAuthorChapterNumber:chapter,candidates:0,questionTypes:{},
   originalMediumCounts:{},difficultyLabels:{},topicIdentityCount:0,
   sourceCatalogIds:new Set(),topicIds:new Set(),
   hasOriginalPrintedPageClaim:0,archiveRecoveredOriginals:0,
   schoolBookAdoptionProven:false,independentlyApprovedQuestionCount:0,
   paperStudioAcademicallyVerifiedSelectable:0
  })
  const g=groups.get(groupKey)
  g.candidates++;g.questionTypes[q.type]=(g.questionTypes[q.type]||0)+1
  const m=q.medium||'UNASSIGNED';g.originalMediumCounts[m]=(g.originalMediumCounts[m]||0)+1
  const dif=q.difficulty||'UNASSIGNED';g.difficultyLabels[dif]=(g.difficultyLabels[dif]||0)+1
  if(q.topicId)g.topicIds.add(text(q.topicId))
  g.sourceCatalogIds.add(sourceId)
  if(q.source?.page!=null)g.hasOriginalPrintedPageClaim++
  if(category==='ARCHIVE_RECOVERED_NOT_EXACT_OFFICIAL_ASSET_LINK')g.archiveRecoveredOriginals++
 }
 const rows=[...groups.values()].map(g=>{
  const sourceIds=[...g.sourceCatalogIds].sort()
  const {topicIds:rawTopics,sourceCatalogIds:rawSources,...safeGroup}=g
  return {...safeGroup,sourceCatalogIds:sourceIds,sourceCatalogCount:sourceIds.length,
   uniqueOriginalTopicIdCount:g.topicIds.size,
   sourceQuestionTypeSignals:{
    mcq:g.questionTypes.mcq||0,short:g.questionTypes.short||0,
    long:g.questionTypes.long||0,numerical:g.questionTypes.numerical||0
   },
   evidenceConcernFlags:[
    ...(g.originalAuthorGradeClaim==='UNASSIGNED'?['ORIGINAL_GRADE_MISSING']:[]),
    ...(g.originalAuthorSubjectClaim==='unassigned'?['ORIGINAL_SUBJECT_MISSING']:[]),
    ...(g.originalAuthorChapterNumber==='UNASSIGNED'?['ORIGINAL_CHAPTER_MISSING']:[]),
    ...(g.archiveRecoveredOriginals>0?['ARCHIVE_SOURCE_NOT_EXACT_OFFICIAL_ASSET_LINK']:[]),
    ...(sourceIds.some(id=>id==='pectaa-catalog-107')?['SHARED_GRADE_URDU_SOURCE']:[]),
    ...((g.questionTypes.mcq||0)>0&&(g.questionTypes.short||0)===0&&(g.questionTypes.long||0)===0
     ?['MCQ_ONLY_CANDIDATE_CHAPTER']:[])
   ],
   sourceAdoptionBySchoolVerified:false,
   qualifiedHumanReviewAndFinalAnswerKeyVerified:false,
   schoolSessionSyllabusChapterConfirmed:false,
   sourceCatalogIds:sourceIds
  }
 }).sort((a,b)=>String(a.originalAuthorGradeClaim).localeCompare(String(b.originalAuthorGradeClaim))||
  String(a.originalAuthorSubjectClaim).localeCompare(String(b.originalAuthorSubjectClaim))||
  Number(a.originalAuthorChapterNumber||999)-Number(b.originalAuthorChapterNumber||999))
 const total=rows.reduce((a,b)=>a+b.candidates,0)
 if(total!==2581||rows.length!==396||missingGrade!==44||missingSubject!==44||
  missingChapter!==44||missingTopic!==44||missingMedium!==50||
  archiveRecovered!==204||withPrintedSourcePageClaim!==1393)
  err('RAW_ACADEMIC_DEPTH_POPULATION_OR_SOURCE_CLAIM_DRIFT')
 const mcqOnly=rows.filter(r=>r.evidenceConcernFlags.includes('MCQ_ONLY_CANDIDATE_CHAPTER')).length
 return{schemaVersion:'assps-grade910-original-assessment-candidate-depth-v1',
  originalQuestionCount:2581,originalBookSourceCount:111,originalSubjectIdCount:subjectIds.size,
  authoredGradeSubjectChapterBuckets:rows.length,
  rawOriginalGradeClaims:gradeTotals,rawOriginalMediumClaims:mediumTotals,
  rawOriginalTypeClaims:typeTotals,
  originalQuestionsMissingGrade:missingGrade,
  originalsMissingFormalCurriculumSubjectId:missingSubject,
  originalQuestionsMissingChapter:missingChapter,
  originalQuestionsMissingTopic:missingTopic,
  originalQuestionsMissingMedium:missingMedium,
  sourceRecordsClaimingNonNullOriginalPdfPage:withPrintedSourcePageClaim,
  genuinePhysicallyValidatedPrintedExercisePageCount:0,
  sourceArchiveRecoveredOriginals:archiveRecovered,
  sourceArchiveRecoveredOriginalGrade9:archiveGrade9,
  sourceArchiveRecoveredOriginalGrade10:archiveGrade10,
  chapterBucketsHavingMcqButNoShortOrLong:mcqOnly,
  sourceOriginalIdSetSha256:sha([...inventory.queue.rows].map(x=>x.originalQuestionId+':'+x.originalQuestionRevisionSha256).sort().join('\n')),
  actualASSPSAdoptedSyllabusChapterCountAuthenticated:0,
  independentFacultyApprovedQuestions:0,verifiedPublishedQuestions:0,
  warning:'These are authoring-data buckets, NOT official chapter completeness or school-adopted syllabus coverage. Topic identity is provisional; neither question count nor the presence of question types proves correctness.',
  rows}
}
function markdown(x){
 const g=x.rawOriginalGradeClaims
 return ['# Grade IX–X provisional content — actual subject/chapter candidate depth','',
  'Source SHA-frozen original candidates: **2,581** across **'+x.authoredGradeSubjectChapterBuckets+' raw grade/subject/chapter authoring buckets** and '+x.originalSubjectIdCount+' original subject IDs.',
  'Original authored Grade 9 claims: '+g[9]+'; Grade 10: '+g[10]+'; Grade UNASSIGNED: '+g.UNASSIGNED+'.',
  'Original medium unspecified: '+x.originalQuestionsMissingMedium+'; original chapter/topic/grade unspecified: '+x.originalQuestionsMissingChapter+'.',
  'Archive-recovered sources (not exact official asset link): '+x.sourceArchiveRecoveredOriginals+' original questions; catalog source grade/subject is not school adoption.',
  'Original authored PDF page claims: '+x.sourceRecordsClaimingNonNullOriginalPdfPage+
   ', but **0 printed textbook exercise/page claims independently certified by school qualified faculty**.',
  'Chapter authoring buckets with MCQ but neither short nor long response type: '+
   x.chapterBucketsHavingMcqButNoShortOrLong+'. This is an editorial depth signal, NOT proof syllabus weakness or that a subject needs a long answer.',
  '', '**No official chapter/year applicability certified, no independently verified answer keys, and 0 teacher-verified selectable questions.**',
  'Do not represent 396 authoring buckets or 2,581 drafts as complete actual 2026–27 ASSPS syllabus. Verify school books, subjects, chapters, English/Urdu parity, teachers and relevant exam year first.',
  '', 'Detailed one-row-per-original-authoring-bucket data: ASSPS_GRADE910_ORIGINAL_2581_ASSESSMENT_DEPTH_20261012.json',''].join('\n')
}
function write(){const x=build()
 fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n')
 fs.writeFileSync(MD,markdown(x))
 return{candidates:2581,buckets:x.authoredGradeSubjectChapterBuckets,
  archiveRefs:x.sourceArchiveRecoveredOriginals,approved:0}}
if(require.main===module)console.log(JSON.stringify(process.argv.includes('--write')?write():build()))
module.exports={key,build,markdown,write,OUT,MD}

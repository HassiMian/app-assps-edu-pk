#!/usr/bin/env node
'use strict'
// Consolidated single original-ID faculty queue. Machine priority != academic correctness or approval.
const fs=require('node:fs'),path=require('node:path')
const ROOT=path.resolve(__dirname,'../..'),DOC=path.join(ROOT,'docs/question-bank')
const OUT=path.join(DOC,'ASSPS_GRADE910_UNIFIED_2581_FACULTY_CONTENT_REVIEW_PRIORITIES_20261011.json')
const SUMMARY=path.join(DOC,'ASSPS_GRADE910_UNIFIED_FACULTY_CONTENT_REVIEW_PRIORITIES_20261011.md')
const old=require('./build-grade910-authoritative-faculty-intake.cjs')
const editorial=require('./build-grade910-all-content-review-docket.cjs')
const fail=x=>{throw Error('ASSPS_FACULTY_QUALITY_'+x)}
function build(){
 const book=old.build(),quality=editorial.build()
 if(book.uniqueOriginalQuestionIds!==2581||book.approved!==0||book.verifiedPublished!==0||
  quality.originalCandidates!==2581||quality.approved!==0||quality.published!==0)
  fail('PRIOR_SOURCE_OR_APPROVAL_CHANGED')
 const base=new Map(book.rows.map(x=>[x.originalQuestionId,x]))
 if(base.size!==2581)fail('DUPLICATED_OLD_ORIGINAL_QUESTIONS')
 const rows=[],tally={P0_CANONICAL_MCQ_KEY_MAPPING:0,
  P1_MARKS_ANSWER_RUBRIC_REVIEW:0,P2_SOURCE_LANGUAGE_ORIGINALITY:0,
  P3_QUALIFIED_GENERAL_REVIEW:0}
 const groupMap=new Map()
 for(const q of quality.rows){
  const b=base.get(q.originalId)
  if(!b||b.originalQuestionRevisionSha256!==q.revisionSha256||
   b.originalFileSha256!==q.sourceFileSha256||
   b.type!==q.questionType||b.originalFile!==q.sourceFile||
   b.sourceCatalogId!==q.originalCatalogId)fail('UNTRUSTED_ORIGINAL_MAPPING:'+q.originalId)
  const risk=q.objectiveEditorialFlags
  const priority=risk.some(x=>['MCQ_KEY_ID_NOT_EXPLICIT','MCQ_OPTIONS_NOT_CANONICALLY_LABELED',
   'MCQ_TEXT_ANSWER_NOT_UNIQUE_OPTION','MCQ_SELECTED_TEXT_ANSWER_DISAGREE'].includes(x))?
   'P0_CANONICAL_MCQ_KEY_MAPPING':
    risk.some(x=>['LONG_REFERENCE_BRIEF_RUBRIC_REVIEW','LONG_REFERENCE_EXTREMELY_BRIEF',
     'NUMERICAL_WORKING_REVIEW','ESSAY_REFERENCE_BRIEF'].includes(x))?
     'P1_MARKS_ANSWER_RUBRIC_REVIEW':
     b.flags.some(x=>x.startsWith('SOURCE_')||x.includes('MISSING')||x.includes('OVERLAP'))?
      'P2_SOURCE_LANGUAGE_ORIGINALITY':'P3_QUALIFIED_GENERAL_REVIEW'
  tally[priority]++
  const group=JSON.stringify([b.gradeClaim,b.subjectClaim])
  if(!groupMap.has(group))groupMap.set(group,{grade:b.gradeClaim??null,subject:b.subjectClaim??null,
   originalCount:0,P0:0,P1:0,P2:0,P3:0})
  const g=groupMap.get(group);g.originalCount++;g[priority.split('_')[0]]++
  rows.push({
   originalQuestionId:b.originalQuestionId,originalQuestionRevisionSha256:b.originalQuestionRevisionSha256,
   originalSourceFile:b.originalFile,originalSourceFileSha256:b.originalFileSha256,
   gradeClaim:b.gradeClaim,subjectClaim:b.subjectClaim,mediumClaim:b.mediumClaim,
   chapterClaim:b.chapterClaim,originalSourceCatalogId:b.sourceCatalogId,
   originalSourcePdfPageClaim:b.sourcePdfPageClaim,
   questionType:b.type,marks:q.marks,
   normalizedAnswerReferenceLength:q.answerLength,
   originalMcqKeyForResearchOnly:q.mcq?.researchedAnswerPositionNotVerified||null,
   editorialSignalFlags:risk,applicabilityAndSourceSignalFlags:b.flags,
   facultyEditorialReviewPriority:priority,originalSourceCandidatePreserved:true,
   originalTeacherApproval:null,independentAcademicAnswerCheckComplete:false,
   correctOptionIndependentlyScientificallyVerified:false,
   qualifiedSourcePageExerciseVerificationComplete:false,
   schoolAdoptedBookForSessionCertified:false,
   academicallyApproved:false,published:false,verifiedPaperStudioSelectable:false})
 }
 if(rows.length!==2581||rows.length!==tally.P0_CANONICAL_MCQ_KEY_MAPPING+
  tally.P1_MARKS_ANSWER_RUBRIC_REVIEW+tally.P2_SOURCE_LANGUAGE_ORIGINALITY+
  tally.P3_QUALIFIED_GENERAL_REVIEW)
  fail('EDITORIAL_QUEUE_PRIORITY_POPULATION_DRIFT')
 rows.sort((a,b)=>a.facultyEditorialReviewPriority.localeCompare(b.facultyEditorialReviewPriority)||
  String(a.gradeClaim).localeCompare(String(b.gradeClaim))||
  String(a.subjectClaim).localeCompare(String(b.subjectClaim))||
  a.originalQuestionId.localeCompare(b.originalQuestionId))
 return{
  schemaVersion:'assps-grade910-one-original-faculty-academic-content-triage-v1',
  researchOriginalCandidates:2581,allSourcesShaPinned:true,priorityCounts:tally,
  originalResearchGradeSubjectGroups:[...groupMap.values()].sort((a,b)=>
   String(a.grade).localeCompare(String(b.grade))||String(a.subject).localeCompare(String(b.subject))),
  publication:'DENY',independentlyApproved:0,verifiedPublished:0,
  definition:'Priority orders independent qualified faculty workload; it cannot distinguish correct from incorrect content nor certify adopted school books. Never auto edit, approve, seed or publish original questions.',
  rows}
}
function markdown(r){
 return ['# ASSPS IX–X — one complete 2,581-original faculty curriculum, answer and source triage','',
  '**Single reviewer-facing research workload. Not approved bank content.** All originals remain source-SHA locked; real independent reviewers and school-adopted editions currently absent.',
  '',
  '| Priority | Original question IDs | Academic meaning |',
  '|---|---:|---|',
  '| P0: canonical MCQ key/option format | '+r.priorityCounts.P0_CANONICAL_MCQ_KEY_MAPPING+' | Source question needs teacher-supervised option schema mapping, never automatic key change |',
  '| P1: answer/marks/rubric evidence | '+r.priorityCounts.P1_MARKS_ANSWER_RUBRIC_REVIEW+' | Inspect numerical working and full-credit long-answer/essay rubric against actual curriculum |',
  '| P2: claimed source/medium/originality | '+r.priorityCounts.P2_SOURCE_LANGUAGE_ORIGINALITY+' | Confirm school edition, original medium/grade/chapter/duplicate concerns |',
  '| P3: general independent answer review | '+r.priorityCounts.P3_QUALIFIED_GENERAL_REVIEW+' | Every remaining original still needs answer, marks and independent signature |',
  '','These four disjoint classes total **2,581**. All source/medium flags, 875 MCQ original keys and chapter/grade/subject claims are carried per original SHA-bound ID. Relative priority is a triage convenience only, not a statement a question is factually incorrect.',
  '',
  '**No approved, published or academically verified/selectable questions.** ASSPS textbook adoption, actual official exam-year, independent academic subject and bilingual teacher review, signed question+answer revisions, Paper Studio and SaaS Core certification remain mandatory.',
  ''].join('\n')
}
function write(){
 const j=build();fs.writeFileSync(OUT,JSON.stringify(j,null,2)+'\n')
 fs.writeFileSync(SUMMARY,markdown(j))
 return{originals:j.researchOriginalCandidates,priorityCounts:j.priorityCounts,approved:0,published:0}
}
if(require.main===module)console.log(JSON.stringify(process.argv.includes('--write')?write():build(),null,2))
module.exports={build,markdown,write,OUT,SUMMARY}

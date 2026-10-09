#!/usr/bin/env node
'use strict'
const fs=require('node:fs'),path=require('node:path')
const {audit,markdown}=require('./audit-grade910-model-answer-readiness.cjs')
const ROOT=path.resolve(__dirname,'../..')
const SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const OUT=path.join(ROOT,'docs/question-bank')
const LEGACY=path.join(OUT,'ASSPS_GRADE910_RUBRIC_ONLY_MODEL_ANSWER_REVIEW_20261009.json')
function revision({documents,prior}){
 const current=audit(documents)
 if(current.totals.originalAuthoredCandidates!==2581||
  current.totals.authoredFiles!==73||current.totals.longQuestions!==564||
  current.totals.rubricOnlyLongAnswers!==166||
  current.totals.excludedNonQuestionEvidenceRows!==58||
  prior?.totals?.rubricOnlyLongAnswers!==165)
  throw Error('GRADE910_RUBRIC_REVISION_BASELINE_MISMATCH')
 const oldIds=new Set(prior.reviewCandidates.map(x=>x.questionId))
 const newIds=new Set(current.reviewCandidates.map(x=>x.questionId))
 if(oldIds.size!==165||newIds.size!==166||
  ![...oldIds].every(id=>newIds.has(id)))
  throw Error('GRADE910_RUBRIC_REVISION_CHANGED_PREVIOUS_FLAGS')
 const added=current.reviewCandidates.filter(x=>!oldIds.has(x.questionId))
 if(added.length!==1||added[0].questionId!=='IX-COMP-U05-L01'||
    added[0].sourceFile!=='computer9Starter2026.json'||
    current.byFile.find(x=>x.sourceFile==='computer9Starter2026.json')?.rubricOnlyLongAnswers!==12)
  throw Error('GRADE910_RUBRIC_UNEXPECTED_NEW_FINDING')
 return {
  ...current,
  schemaVersion:'assps-grade910-model-answer-rubric-phrase-evidence-v2',
  supersedesHistoricalSnapshot:'ASSPS_GRADE910_RUBRIC_ONLY_MODEL_ANSWER_REVIEW_20261009.json',
  historicalOriginalRubricOnlyCount:165,
  correctedOriginalRubricOnlyCount:166,
  newlyDiscoveredOriginalQuestionIds:added.map(x=>x.questionId),
  correctedPublicationStatus:'ZERO_APPROVED_OR_VERIFIED_PUBLISHED',
  caveats:[...current.caveats,
   'This updated evidence supersedes the prior dated 165-question research snapshot. Historical file remains untouched and traceable.',
   'Possible marks: is a marking rubric, not a student-facing explanatory model answer. Existing signed review/publication gates now reject it.']
 }
}
function main(){
 const documents=fs.readdirSync(SOURCE).filter(f=>f.endsWith('.json')).sort().map(filename=>{
  const bytes=fs.readFileSync(path.join(SOURCE,filename))
  return {filename,bytes,data:JSON.parse(bytes)}
 })
 const report=revision({documents,prior:JSON.parse(fs.readFileSync(LEGACY))})
 const filename='ASSPS_GRADE910_REVISED_166_RUBRIC_ONLY_EVIDENCE_20261009'
 fs.writeFileSync(path.join(OUT,filename+'.json'),JSON.stringify(report,null,2)+'\n')
 const prose=['# Grade IX–X — corrected model-answer rubric evidence (v2)','',
 '**Historical 165-item research snapshot preserved. Corrected 166-item snapshot supersedes it.**','',
 'New exact original stable ID: `IX-COMP-U05-L01` (Computer IX), whose long-answer field starts with a marking rubric “Possible marks:” and is not an explanatory answer.',
 '',
 'Review recording and publication readiness both now reject this previously missed rubric-only form. No actual signed human review or approval is fabricated.',
 '',
 markdown(report), '',
 'All original 2,581 authored question source records, answer fields, edition/page ledgers, archived research evidence, papers and database rows are unchanged. Academic selection remains HOLD until verified source and independent approval.','']
 fs.writeFileSync(path.join(OUT,filename+'.md'),prose.join('\n'))
 console.log(JSON.stringify({previous:165,corrected:report.correctedOriginalRubricOnlyCount,newlyFlagged:report.newlyDiscoveredOriginalQuestionIds,approved:report.totals.approved}))
}
if(require.main===module)main()
module.exports={revision}

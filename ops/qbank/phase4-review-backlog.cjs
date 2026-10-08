#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const SCHOOL_CODES_BY_ID=new Map([[1,'assps'],[5,'al-siddique']])

function summarizeSchool(report) {
  if(!report || !Number.isInteger(report.schoolId) || SCHOOL_CODES_BY_ID.get(report.schoolId)!==report.schoolCode)
    throw Error('INVALID_EXPLICIT_SCHOOL_SCOPE')
  if(!Array.isArray(report.chapters) || !Array.isArray(report.grades))
    throw Error('MISSING_VERIFIED_CHAPTER_EVIDENCE')
  if(report.role!=='apex_app_runtime' || report.coverageReady===true && report.readyChapters!==report.inspectedChapters)
    throw Error('GOVERNANCE_EVIDENCE_INVALID')
  const chapterRows=report.chapters.map(chapter=>{
    if(!report.grades.includes(chapter.grade)) throw Error('UNKNOWN_GRADE')
    const missing={mcq:Number(chapter.missing?.mcq || 0),short:Number(chapter.missing?.short || 0),long:Number(chapter.missing?.long || 0)}
    const discovered=Number(chapter.discovered || 0)
    const approved=Number(chapter.approved || 0)
    if(!Number.isInteger(discovered) || approved<0 || approved>discovered)throw Error('INVALID_QUESTION_COUNTS')
    return {schoolId:report.schoolId,schoolCode:report.schoolCode,grade:chapter.grade,
      subject:chapter.subject,chapter:chapter.chapter,
      discovered,approved,needsSourcePageReview:Number(chapter.needsSourcePageReview || 0),
      missing,ready:chapter.ready===true,
      reviewPriority:(!chapter.ready && discovered>0) ? 'SOURCE_AND_ACADEMIC_REVIEW' : (!chapter.ready?'CONTENT_COVERAGE_MISSING':'READY'),
    }
  })
  if(chapterRows.reduce((total,row)=>total+row.discovered,0)!==Number(report.discoveredQuestions))
    throw Error('SOURCE_COUNTS_MISMATCH')
  const subjectGroups=new Map()
  for(const row of chapterRows) {
    const key=row.grade+'|'+row.subject
    const bucket=subjectGroups.get(key) || {schoolId:report.schoolId,schoolCode:report.schoolCode,grade:row.grade,subject:row.subject,chapters:0,ready:0,discovered:0,approved:0,needsSourcePageReview:0}
    bucket.chapters++; bucket.ready+=Number(row.ready);bucket.discovered+=row.discovered
    bucket.approved+=row.approved;bucket.needsSourcePageReview+=row.needsSourcePageReview
    subjectGroups.set(key,bucket)
  }
  const rank=(a,b)=>b.discovered-a.discovered || a.grade.localeCompare(b.grade) || a.subject.localeCompare(b.subject) || String(a.chapter).localeCompare(String(b.chapter),undefined,{numeric:true})
  return {schoolId:report.schoolId,schoolCode:report.schoolCode,inspectedChapters:chapterRows.length,
    approvedQuestions:Number(report.approvedQuestions),discoveredQuestions:Number(report.discoveredQuestions),
    readyChapters:chapterRows.filter(row=>row.ready).length,coverageReady:chapterRows.length>0 && chapterRows.every(row=>row.ready),
    answerKeyQuality:report.mcqAnswerKeys,
    subjectBacklog:[...subjectGroups.values()].sort(rank),chapterBacklog:chapterRows.sort(rank)}
}
function buildReport(input) {
  if(!Array.isArray(input) || input.length!==2)throw Error('TWO_DISTINCT_TENANT_EVIDENCE_REQUIRED')
  const reports=input.map(summarizeSchool)
  if(new Set(reports.map(row=>row.schoolId)).size!==2 || new Set(reports.map(row=>row.schoolCode)).size!==2)
    throw Error('CROSS_TENANT_MERGE_REFUSED')
  return {purpose:'ACADEMIC_REVIEW_BACKLOG_NOT_APPROVAL',generatedAt:new Date().toISOString(),
    automatedPaperCertification:'BLOCKED_UNTIL_SOURCE_PAGE_ACADEMIC_REVIEW',
    tenantSummaries:reports.map(({chapterBacklog,subjectBacklog,...rest})=>rest),
    subjects:reports.flatMap(r=>r.subjectBacklog),
    chapters:reports.flatMap(r=>r.chapterBacklog)}
}
function main() {
  const files=process.argv.slice(2)
  if(files.length!==2)throw Error('Usage: phase4-review-backlog.cjs school1-readiness.json school5-readiness.json')
  const data=buildReport(files.map(file=>JSON.parse(fs.readFileSync(path.resolve(file),'utf8'))))
  console.log(JSON.stringify(data,null,2))
}
if(require.main===module)main()
module.exports={summarizeSchool,buildReport}

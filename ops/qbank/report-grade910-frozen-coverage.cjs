#!/usr/bin/env node
'use strict'
// Immutable authored research coverage only, NOT ASSPS school-adopted or academically approved coverage.
const fs=require('node:fs'),path=require('node:path')
const frozenSource=require('./attest-grade910-all-original-candidate-revisions.cjs')
const OUT=path.resolve(__dirname,'../../docs/question-bank/ASSPS_GRADE910_FROZEN_CANDIDATE_COVERAGE_20261011.json')
function normGrade(q){
 const raw=q.curriculum?.grade??q.grade
 return raw===9||raw==='9'?9:raw===10||raw==='10'?10:null
}
function normChapter(q){
 const raw=q.chapter?.number??q.chapterNo??q.chapterNumber??q.unit??null
 const n=Number(raw)
 return raw!==null&&raw!==''&&Number.isInteger(n)&&n>0?String(n):null
}
function compile(){
 const inputs=frozenSource.loadInputs(),locked=frozenSource.assertFrozen(inputs)
 const filesByName=new Map(locked.files.map(f=>[f.originalAuthoredFile,f]))
 const groups=new Map(),sourceSummary=[]
 let withoutSubject=0,withoutGrade=0,withoutChapter=0,total=0
 for(const d of inputs.documents){
  const l=filesByName.get(d.file)
  if(!l)continue
  const records=[...(d.data?.drafts||[]),...(d.data?.items||[])]
  const lockedIds=new Set(l.originalQuestionRevisions.map(x=>x.originalQuestionId))
  const observed=records.filter(q=>lockedIds.has(q.id))
  if(observed.length!==l.originalQuestionCount)throw Error('COVERAGE_SOURCE_FREEZE_DRIFT')
  sourceSummary.push({file:d.file,originalFileSha256:l.originalFileSha256,questionCount:observed.length})
  for(const q of observed){
   const grade=normGrade(q),subject=String(q.curriculum?.subjectId||q.subjectId||'').trim().toLowerCase()||null
   const chapter=normChapter(q),type=String(q.type||'unknown').toLowerCase()
   if(!grade)withoutGrade++
   if(!subject)withoutSubject++
   if(!chapter)withoutChapter++
   const key=JSON.stringify([grade,subject,chapter])
   if(!groups.has(key))groups.set(key,{grade,subjectId:subject,chapter,questionCount:0,questionTypes:{},academicallyApproved:0,verifiedPublished:0})
   const x=groups.get(key);x.questionCount++;x.questionTypes[type]=(x.questionTypes[type]||0)+1
   total++
  }
 }
 if(total!==2581||sourceSummary.length!==73)throw Error('COVERAGE_ORIGINAL_COHORT_DRIFT')
 const coverage=[...groups.values()].sort((a,b)=>(
   (a.grade??99)-(b.grade??99)||
   (a.subjectId||'~').localeCompare(b.subjectId||'~')||
   Number(a.chapter??999)-Number(b.chapter??999)))
 return {schemaVersion:'assps-grade910-sha-frozen-original-research-coverage-v1',
  originalResearchCandidates:total,filesShaFrozen:73,
  withoutExplicitGrade:withoutGrade,withoutQuestionLevelSubject:withoutSubject,
  withoutNumericChapter:withoutChapter,
  coverageGroupCount:coverage.length,
  researchOnly:true,
  schoolAdoptionProven:false,
  independentTeacherReviewCount:0,academicallyApprovedCount:0,verifiedPublishedCount:0,
  publisherSelectable:false,releaseDecision:'DENY',
  note:'Subject/chapter grouping is original research metadata, not confirmed school textbook applicability or exercise coverage.',
  coverage,originalSources:sourceSummary.sort((a,b)=>a.file.localeCompare(b.file))}
}
if(require.main===module){
 const r=compile()
 if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(r,null,2)+'\n')
 console.log(JSON.stringify({total:r.originalResearchCandidates,groups:r.coverageGroupCount,
  unresolved:{grade:r.withoutExplicitGrade,subject:r.withoutQuestionLevelSubject,chapter:r.withoutNumericChapter},
  released:r.verifiedPublishedCount}))
}
module.exports={compile,OUT}

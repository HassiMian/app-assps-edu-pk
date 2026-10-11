#!/usr/bin/env node
'use strict'
// Read-only academic research coverage by claimed subject and grade; NOT approved school subjects.
const fs=require('node:fs'),path=require('node:path')
const ROOT=path.resolve(__dirname,'../..'),DOC=path.join(ROOT,'docs/question-bank')
const SOURCE=path.join(DOC,'ASSPS_GRADE910_2581_UNIFIED_FACULTY_REVIEW_QUEUE_20261011.json')
const OUT=path.join(DOC,'ASSPS_GRADE910_FACULTY_SUBJECT_REVIEW_MATRIX_20261011.md')
function summarize(){
 const j=JSON.parse(fs.readFileSync(SOURCE,'utf8'))
 if(j.uniqueOriginalQuestionIds!==2581||j.approved!==0||j.verifiedPublished!==0)throw Error('FACULTY_MATRIX_UNSAFE_BASELINE')
 const map=new Map()
 for(const r of j.rows){
  const k=JSON.stringify([r.gradeClaim??'unassigned',r.subjectClaim||'unassigned'])
  if(!map.has(k))map.set(k,{grade:r.gradeClaim??'unassigned',subject:r.subjectClaim||'unassigned',
    candidates:0,mcq:0,originalPageClaimMissing:0,languageClaimMissing:0,unreviewedSourceClaims:0,unresolvedOverlapIds:0})
  const x=map.get(k)
  x.candidates++
  if(r.type==='mcq')x.mcq++
  if(r.sourcePdfPageClaim==null)x.originalPageClaimMissing++
  if(r.mediumClaim==null)x.languageClaimMissing++
  if(r.flags.some(x=>x.startsWith('SOURCE_')))x.unreviewedSourceClaims++
  if(r.flags.includes('INDEPENDENT_OVERLAP_PAIR_ADJUDICATION'))x.unresolvedOverlapIds++
 }
 const rows=[...map.values()].sort((a,b)=>Number(a.grade||99)-Number(b.grade||99)||a.subject.localeCompare(b.subject))
 const n=rows.reduce((a,x)=>a+x.candidates,0)
 if(n!==2581)throw Error('FACULTY_MATRIX_COVERAGE_MISMATCH')
 return rows
}
function markdown(){
 const rows=summarize()
 return ['# ASSPS Grade IX–X — faculty research coverage and verification workload',
  '','**NOT the school-offered subject list, approved textbook roster, approved question counts, or printable school assessment.** Research metadata from immutable original questions only. Every candidate still needs official session/book applicability, correct answer and independent faculty revision review.',
  '','School-adopted textbooks/editions and authenticated teacher assignments: **NOT VERIFIED**. Publication: **DENY**.',
  '','| Grade claim | Subject claim | Candidates | MCQs | Missing source-PDF-page claim | Original medium absent | Source-claim review flags | Original overlap IDs |',
  '|---|---|---:|---:|---:|---:|---:|---:|',
  ...rows.map(r=>'| '+r.grade+' | '+r.subject+' | '+r.candidates+' | '+r.mcq+' | '+r.originalPageClaimMissing+' | '+r.languageClaimMissing+' | '+r.unreviewedSourceClaims+' | '+r.unresolvedOverlapIds+' |'),
  '','Total original research candidates: **2,581**. One original has at most one subject/grade group here, even when it has multiple review reasons. Original source page missing means an original PDF locator is missing, NOT that the candidate is inherently textbook-exercise sourced. Source claim risks can overlap and are not presumed factual errors.',
  '','Qualified reviewer action: certify actual ASSPS textbook adoption for 2026–27 and exam-year scope; check content/answers/marks/Urdu, decide three potential duplicate pairs; independently approve exact final question+answer SHA; never auto-import research into Paper Studio.',
  ''].join('\n')
}
if(require.main===module){
 const md=markdown();if(process.argv.includes('--write'))fs.writeFileSync(OUT,md)
 console.log(JSON.stringify({groupCount:summarize().length,coverage:2581,publication:'BLOCK',wrote:process.argv.includes('--write')}))
}
module.exports={summarize,markdown,OUT}

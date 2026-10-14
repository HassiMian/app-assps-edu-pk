#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const {audit:coreAudit}=require('./audit-core-grade910-numerical-answers.cjs')
const {audit:otherAudit}=require('./audit-additional-grade910-numericals.cjs')
const {auditMathNumericals}=require('./audit-math10-numerical-answers.cjs')
const ROOT=path.resolve(__dirname,'../..')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const REPORT_ROOT=path.join(ROOT,'docs/question-bank')
const OUT=path.join(REPORT_ROOT,'ASSPS_GRADE910_ALL_NUMERICAL_QA_CERTIFICATE_CANDIDATE_20261008.json')
const canonicalReports=[
 'ASSPS_GRADE910_CORE_NUMERICAL_ARITHMETIC_QA_20261008.json',
 'ASSPS_GRADE910_REMAINING_NUMERICAL_ARITHMETIC_QA_20261008.json',
 'ASSPS_MATH10_NUMERICAL_INDEPENDENT_MECHANICAL_QA_20261008.json'
]
function buildSummary(){
 const core=coreAudit(),other=otherAudit(),math10=auditMathNumericals(
   JSON.parse(fs.readFileSync(path.join(STAGING,'mathematics10OriginalReasoningBatch2026.json'),'utf8'))
 )
 const actual=[
  ...core.results.map(q=>({questionId:q.questionId,sourceFile:q.sourceFile,questionContentSha256:q.questionContentSha256,passed:q.passed,mathematicalRecomputationPass:q.mathematicalRecomputationPass,storedAnswerPass:q.storedAnswerTokenCrosscheckPass})),
  ...other.results.map(q=>({questionId:q.questionId,sourceFile:q.sourceFile,questionContentSha256:q.questionContentSha256,passed:q.passed,mathematicalRecomputationPass:q.independentlyRecomputed,storedAnswerPass:q.savedAnswerCrosscheck})),
  ...math10.results.map(q=>({questionId:q.questionId,sourceFile:'mathematics10OriginalReasoningBatch2026.json',questionContentSha256:q.questionContentSha256,passed:q.mechanicalCheckPassed,mathematicalRecomputationPass:q.numericalDerivationValid,storedAnswerPass:q.savedAnswerCrosscheckPassed}))
 ]
 const pinned=canonicalReports.flatMap(file=>JSON.parse(fs.readFileSync(path.join(REPORT_ROOT,file),'utf8')).results.map(x=>[x.questionId,x.questionContentSha256]))
 const pinnedById=new Map(pinned)
 if(pinnedById.size!==pinned.length)throw Error('REPEATED_GOLDEN_ID')
 if(actual.length!==91||new Set(actual.map(x=>x.questionId)).size!==91||pinnedById.size!==91)
   throw Error('NUMERICAL_QA_UNIVERSE_NOT_91_DISJOINT')
 for(const q of actual){
  if(pinnedById.get(q.questionId)!==q.questionContentSha256)throw Error('REVISION_CHANGED_SINCE_PINNED_REPORT:'+q.questionId)
 }
 const allAuthored=[]
 for(const file of fs.readdirSync(STAGING).filter(x=>x.endsWith('.json'))){
  let data
  try{data=JSON.parse(fs.readFileSync(path.join(STAGING,file),'utf8'))}catch{continue}
  for(const q of [...(data.drafts||[]),...(data.items||[])])
   if(q.type==='numerical'&&q.id)allAuthored.push(q.id)
 }
 if(allAuthored.length!==91||new Set(allAuthored).size!==91||
   actual.some(x=>!new Set(allAuthored).has(x.questionId)))throw Error('UNCOVERED_AUTHORING_NUMERICAL_ROWS')
 const byFile={}
 const byGrade={'IX':0,'X':0}
 for(const r of actual){
  byFile[r.sourceFile]=(byFile[r.sourceFile]||0)+1
  const grade=r.questionId.startsWith('IX-')?'IX':r.questionId.startsWith('X-')?'X':null
  if(!grade)throw Error('UNEXPECTED_NUMERICAL_GRADE_ID:'+r.questionId)
  byGrade[grade]++
 }
 return{schemaVersion:'assps-grade910-numerical-full-corpus-qa-v1',
   scope:'AUTOMATED_ARITHMETIC_SPOT_AND_SAVED_ANSWER_CROSSCHECK_NOT_ACADEMIC_APPROVAL',
   sourceUniverse:'73 ORIGINAL AUTHORING FILES (NO EDITORIAL DERIVATIVE DOUBLE_COUNT)',
   counts:{authoredNumericals:allAuthored.length,covered:actual.length,
    arithmeticPassed:actual.filter(x=>x.passed&&x.mathematicalRecomputationPass&&x.storedAnswerPass).length,
    arithmeticFailed:actual.filter(x=>!x.passed||!x.mathematicalRecomputationPass||!x.storedAnswerPass).length,
    sourceVerifiedByPhysicalPage:0,independentlyHumanReviewed:0,approved:0,published:0},
   byGrade,bySourceFile:byFile,
   evidenceSources:canonicalReports,
   schoolBookAdoptionEvidenceCertified:false,
   questionLanguageEquivalenceIndependentlyCertified:false,
   academicReleaseGranted:false,
   records:actual
 }
}
if(require.main===module){
 try{const x=buildSummary()
  if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n')
  console.log(JSON.stringify({counts:x.counts,byGrade:x.byGrade,fileGroups:Object.keys(x.bySourceFile).length},null,2))
  if(x.counts.arithmeticFailed||x.counts.covered!==91)process.exitCode=2
 }catch(e){console.error('ALL_NUMERICAL_QA_INCOMPLETE',e.message);process.exitCode=2}
}
module.exports={buildSummary}

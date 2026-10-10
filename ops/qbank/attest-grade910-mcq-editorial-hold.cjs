#!/usr/bin/env node
'use strict'
// READ ONLY. Original MCQ question text/answers/options are never altered or declared academically verified.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {collectDocuments}=require('./audit-authoring-crossfile-qa.cjs')
const {auditMcqs}=require('./audit-mcq-authoring-structure.cjs')
const ROOT=path.resolve(__dirname,'../..')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const DOC=path.join(ROOT,'docs/question-bank')
const NAME='ASSPS_GRADE910_MCQ_EDITORIAL_PATTERN_HOLD_20261010'
const BUNDLE_SHA='a4908d694b683fd330631268f18f288fe0f7787a48a7c93f29b4114cff402f9f'
const sha=v=>crypto.createHash('sha256').update(v).digest('hex')
const fail=code=>{throw Error('MCQ_EDITORIAL_'+code)}
function loadInputs(){return {documents:collectDocuments(),originalBytes:null}}
function build({documents,originalFileBytes={}}){
 if(!Array.isArray(documents))fail('NO_DOCUMENTS')
 const mcqReport=auditMcqs(documents)
 const counts=mcqReport.optionKeyDistribution
 const total=Object.values(counts).reduce((n,x)=>n+x,0)
 const allPatterns=mcqReport.filesWithPatterns
 const patternCount=allPatterns.reduce((n,f)=>n+f.editorialKeyPatterns.length,0)
 const individualFlags=mcqReport.flagCount-patternCount-(mcqReport.globalCorrectKeyConcentrationRequiresReview?1:0)
 if(total!==875||mcqReport.totalMcqs!==875||counts.A!==785||counts.B!==50||
   counts.C!==33||counts.D!==7||mcqReport.exactTextDerivedLegacyKeys!==24||
   mcqReport.predictablePatternFileCount!==53||patternCount!==53||
   mcqReport.flagCount!==54||individualFlags!==0||
   mcqReport.globalCorrectKeyConcentrationRequiresReview!==true||
   mcqReport.independentMcqEditorialReviewRequired!==true||
   mcqReport.academicallyVerifiedMcqSelectionReady!==false||
   mcqReport.autoReorderedOptions!==false||
   mcqReport.academicallyApproved!==0||mcqReport.published!==0)
   fail('KNOWN_CANDIDATE_BASELINE_OR_RISK_DRIFT')
 const byName=new Map(documents.map(x=>[x.file,x]))
 if(byName.size!==documents.length)fail('DUPLICATE_DOCUMENT_FILE')
 const sourceRiskFiles=allPatterns.map(row=>{
   const doc=byName.get(row.file)
   if(!doc||(!Array.isArray(doc.data?.drafts)&&!Array.isArray(doc.data?.items)))fail('SOURCE_DOCUMENT_NOT_ACCESSIBLE:'+row.file)
   const file=path.join(STAGING,row.file)
   if(!fs.existsSync(file))fail('ORIGINAL_SOURCE_FILE_MISSING')
   const bytes=Object.hasOwn(originalFileBytes,row.file)?originalFileBytes[row.file]:fs.readFileSync(file)
   if(!Buffer.isBuffer(bytes))fail('ORIGINAL_SOURCE_FILE_BYTES_INVALID')
   let actual
   try{actual=JSON.parse(bytes)}catch(_){fail('ORIGINAL_SOURCE_FILE_INVALID_JSON')}
   if(JSON.stringify(actual)!==JSON.stringify(doc.data))fail('SOURCE_AND_AUDIT_SNAPSHOT_DISAGREE')
   return {originalFile:row.file,originalFileSha256:sha(bytes),candidateMcqs:row.mcqs,
     editorialPatterns:row.editorialKeyPatterns.map(p=>({
      firstQuestionId:p.firstQuestionId,lastQuestionId:p.lastQuestionId,
      length:p.length,period:p.period,
      academicCorrectnessDetermined:false,qualifiedReviewerDecision:null})),
     requiredReview:'QUALIFIED_INDEPENDENT_MCQ_ANSWER_AND_DISTRACTOR_REVIEW',
     originalQuestionAndAnswerRevisionsLocked:false,approved:false,published:false}
 })
 if(sourceRiskFiles.length!==53||sourceRiskFiles.some(f=>f.editorialPatterns.length===0))
   fail('SOURCE_RISK_FILES_INCOMPLETE')
 return {schemaVersion:'assps-grade910-original-mcq-pattern-risk-source-locked-v1',
  originalMcqCandidateCount:875,originalCorrectAnswerKeyCounts:{A:785,B:50,C:33,D:7},
  originalCorrectOptionAConcentration:785/875,
  sourceFilesWithPatternConcern:53,
  identifiedPredictableKeySequences:patternCount,
  totalEditorialReviewFlags:mcqReport.flagCount,
  independentlyQualifiedAnswerKeyOrDistractorReviewCount:0,
  schoolTextbookAdoptionAndOriginalExercisePageVerified:false,
  noAutomaticOptionsReordered:true,noOriginalQuestionDataChanged:true,
  academicallyVerifiedMcqsApproved:0,publishedMcqs:0,
  releaseDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  sourceFileResearchRiskQueue:sourceRiskFiles}
}
function assertFrozen(inputs,{manifestBytes}={}){
 let bytes
 try{bytes=manifestBytes??fs.readFileSync(path.join(DOC,NAME+'.json'))}
 catch(_){fail('FROZEN_MANIFEST_MISSING')}
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==BUNDLE_SHA)
  fail('FROZEN_MANIFEST_RAW_SHA_DRIFT')
 let frozen
 try{frozen=JSON.parse(bytes)}catch(_){fail('FROZEN_MANIFEST_JSON_INVALID')}
 const current=build(inputs)
 if(JSON.stringify(current)!==JSON.stringify(frozen))
  fail('EDITORIAL_CANDIDATE_SOURCE_OR_RISK_DRIFT')
 return current
}
function markdown(d){
 return ['# ASSPS IX-X — Unreviewed MCQ answer-key pattern risk and immutable source intake','',
  '**Not proof of wrong answers, nor proof of academic correctness. Research candidate editorial hold.**','',
  '- Original MCQ candidates checked: **875**.',
  '- Original answer-key selections: A **785**, B **50**, C **33**, D **7**.',
  '- Correct-option A share **'+(100*d.originalCorrectOptionAConcentration).toFixed(1)+'%**. This is an editorial-pattern warning, not proof of incorrect science or language.',
  '- Original source files with a predictable correct-option sequence: **53**; qualifying run findings **'+d.identifiedPredictableKeySequences+'**.',
  '- Total aggregate editorial flags: **'+d.totalEditorialReviewFlags+'** (53 source pattern findings plus one global concentration finding).',
  '- Qualified independent MCQ correct-answer/distractor and medium-language review signed **0**. No automatic question/option reordering performed.',
  '','## Files requiring qualified subject editorial review','',
  '| Original source file | SHA256 raw bytes | MCQs | Source pattern(s) |',
  '|---|---|---:|---|',
  ...d.sourceFileResearchRiskQueue.map(row=>'| '+row.originalFile+' | '+row.originalFileSha256+
   ' | '+row.candidateMcqs+' | '+row.editorialPatterns.map(p=>p.firstQuestionId+'..'+p.lastQuestionId).join('; ')+' |'),
  '','Reviewers should verify actual option correctness, independent distractor quality, language and original question revisions before suggesting changes. Reordering options changes the authored revision and requires fresh review.',
  'These source fingerprints are NOT evidence that ASSPS adopted the cited textbook/edition/session; printed exercise pages remain unverified.',
  '**Publication decision: '+d.releaseDecision+'.** Paper Studio academically verified picker remains HOLD; SaaS Core exclusively deploys after certification.',''
 ].join('\n')
}
function main(){
 const result=build(loadInputs()),dest=path.join(DOC,NAME)
 fs.writeFileSync(dest+'.json',JSON.stringify(result,null,2)+'\n')
 fs.writeFileSync(dest+'.md',markdown(result))
 console.log(JSON.stringify({mcq:result.originalMcqCandidateCount,patterns:result.identifiedPredictableKeySequences,
  flaggedFiles:result.sourceFilesWithPatternConcern,flags:result.totalEditorialReviewFlags,
  manifestSha256:sha(fs.readFileSync(dest+'.json')),approved:result.academicallyVerifiedMcqsApproved}))
}
if(require.main===module)main()
module.exports={loadInputs,build,assertFrozen,markdown,NAME,sha}

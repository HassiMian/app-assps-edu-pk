#!/usr/bin/env node
'use strict'
// Read-only original MCQ identity and source byte freeze; NOT human academic approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {collectDocuments}=require('./audit-authoring-crossfile-qa.cjs')
const previous=require('./attest-grade910-mcq-editorial-hold.cjs')
const ROOT=path.resolve(__dirname,'../..')
const SRC=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const DOC=path.join(ROOT,'docs/question-bank')
const NAME='ASSPS_GRADE910_ALL_875_ORIGINAL_MCQ_REVISIONS_SOURCE_SEAL_20261010'
const PIN='13353d76708cd330306e08dc776263caa556555a993c8831aa5ccafa5dd028c8'
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const fail=code=>{throw Error('ALL875_MCQ_'+code)}
function loadInputs(){return{documents:collectDocuments(),originalFileBytes:{}}}
function mcqs(data){return [...(data?.drafts||[]),...(data?.items||[])].filter(q=>q?.type==='mcq')}
function build({documents,originalFileBytes={}}){
 const prior=previous.assertFrozen({documents})
 if(prior.originalMcqCandidateCount!==875||prior.sourceFilesWithPatternConcern!==53||
    prior.academicallyVerifiedMcqsApproved!==0||prior.publishedMcqs!==0||
    prior.releaseDecision!=='DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
  fail('PREVIOUS_EDITORIAL_RELEASE_DRIFT')
 if(!Array.isArray(documents)||new Set(documents.map(x=>x.file)).size!==documents.length)
  fail('INVALID_OR_DUPLICATED_SOURCE_COLLECTION')
 const seen=new Set(),sourceFiles=[]
 const flagged=new Set(prior.sourceFileResearchRiskQueue.map(x=>x.originalFile))
 for(const {file,data} of documents){
  const qs=mcqs(data)
  if(!qs.length)continue
  if(!file||file.includes('/')||file.includes('\\')||!file.endsWith('.json'))
   fail('UNEXPECTED_SOURCE_PATH')
  const filename=path.join(SRC,file)
  if(!fs.existsSync(filename))fail('ORIGINAL_SOURCE_NOT_FOUND')
  const raw=Object.hasOwn(originalFileBytes,file)?originalFileBytes[file]:fs.readFileSync(filename)
  if(!Buffer.isBuffer(raw))fail('RAW_SOURCE_BYTES_INVALID')
  let actual
  try{actual=JSON.parse(raw)}catch(_){fail('ORIGINAL_SOURCE_JSON_INVALID:'+file)}
  if(JSON.stringify(actual)!==JSON.stringify(data))
   fail('SOURCE_DATA_SILENT_IN_MEMORY_REVISION:'+file)
  const revisions=[]
  for(const q of qs){
   if(typeof q.id!=='string'||!q.id.trim()||seen.has(q.id))
    fail('ORIGINAL_QUESTION_ID_DUPLICATE_OR_MISSING')
   seen.add(q.id)
   const key=String(q.correctOptionId||q.correctOption||'').trim().toUpperCase()
   const answers=q.content&&typeof q.content==='object'?
    Object.fromEntries(Object.entries(q.content).filter(([k,v])=>['en','ur'].includes(k)&&v).map(
     ([lang,value])=>[lang,{stemSha256:sha(JSON.stringify(value.stem??null)),
      answerSha256:sha(JSON.stringify(value.answer??null)),
      optionsSha256:sha(JSON.stringify(value.options??null))}]
    )):{legacyOptionsSha256:sha(JSON.stringify(q.options??null)),
       legacyAnswerSha256:sha(JSON.stringify(q.answer??null))}
   revisions.push({questionId:q.id,originalQuestionSha256:sha(JSON.stringify(q)),
    keyedAnswerLabel:key||null,marks:q.marks??null,
    answerAndOptionRevisions:answers,originalReviewStatus:q.review?.status??null,
    humanAcademicReviewVerified:false,academicallyApproved:false,verifiedPublished:false})
  }
  sourceFiles.push({sourceFile:file,originalRawFileSha256:sha(raw),
   originalCandidateMcqs:revisions.length,originalFileHasPredictableKeyPatterns:flagged.has(file),
   originalQuestionRevisions:revisions})
 }
 const total=sourceFiles.reduce((n,f)=>n+f.originalCandidateMcqs,0)
 const riskFiles=sourceFiles.filter(f=>f.originalFileHasPredictableKeyPatterns)
 const noRiskFiles=sourceFiles.filter(f=>!f.originalFileHasPredictableKeyPatterns)
 const noRiskMcqs=noRiskFiles.reduce((n,f)=>n+f.originalCandidateMcqs,0)
 if(total!==875||seen.size!==875||sourceFiles.length!==71||
   riskFiles.length!==53||noRiskFiles.length!==18||noRiskMcqs!==132||
   sourceFiles.some(x=>x.originalQuestionRevisions.length!==x.originalCandidateMcqs))
  fail('CANDIDATE_SOURCE_ROSTER_TOTAL_OR_CLASSIFICATION_DRIFT')
 return {schemaVersion:'assps-grade910-all-original-mcq-research-revision-roster-v1',
  countOfDistinctOriginalMcqResearchCandidates:875,originalMcqSourceFiles:71,
  previousFlaggedMcqSourceFiles:53,previouslyUnsealedNonflaggedMcqSourceFiles:18,
  previouslyUnsealedOriginalMcqQuestionRevisions:132,
  allUnflaggedSourceFilesNowSourceLocked:true,
  qualifiedCorrectAnswerKeysVerifiedByTeacher:0,
  independentlyReviewedOriginalMcqRevisions:0,academicallyApproved:0,verifiedPublished:0,
  textbookEditionPageAndSchoolAdoptionIndependentlyVerified:false,
  changesToOriginalCandidateDataMade:false,
  publicationDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  originalQuestionFiles:sourceFiles}
}
function assertFrozen(input,{frozenBytes}={}){
 let bytes
 try{bytes=frozenBytes??fs.readFileSync(path.join(DOC,NAME+'.json'))}
 catch(_){fail('FROZEN_SOURCE_ROSTER_MISSING')}
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==PIN)
  fail('FROZEN_SOURCE_ROSTER_RAW_SHA_DRIFT')
 let saved
 try{saved=JSON.parse(bytes)}catch(_){fail('FROZEN_SOURCE_ROSTER_JSON_INVALID')}
 const now=build(input)
 if(JSON.stringify(saved)!==JSON.stringify(now))
  fail('ORIGINAL_MCQ_REVISION_OR_SOURCE_BYTES_CHANGED')
 return now
}
function markdown(d){
 return ['# ASSPS Grade IX-X — All 875 original MCQ candidate revisions source-locked','',
 '**Research provenance only, not correct-answer verification, human review, school adoption or publication.**','',
 'Previous 53 flagged MCQ source files were protected. NEW: 18 other MCQ source files / 132 previously uncovered research candidates also locked.',
 'Total 71 original source files, 875 original question IDs; original file-byte and per-question/answer/option SHA256.',
 'No original candidate question/answer or option was changed or automatically rebalanced.','',
 '| Original candidate file | Raw SHA256 | MCQs | Existing editorial pattern flag |',
 '|---|---|---:|---|',
 ...d.originalQuestionFiles.map(f=>'| '+f.sourceFile+' | '+f.originalRawFileSha256+
 ' | '+f.originalCandidateMcqs+' | '+(f.originalFileHasPredictableKeyPatterns?'YES':'NO')+' |'),
 '','All original questions and English/Urdu option correctness need independent qualified faculty review and original revision approvals.',
 'Actual ASSPS 2026-27 adopted printed textbook pages and exam-year applicability not established by catalog hashes.',
 '**Academic release: '+d.publicationDecision+'.** SaaS Core solely controls production.',''
 ].join('\n')
}
function main(){
 const d=build(loadInputs()),prefix=path.join(DOC,NAME)
 fs.writeFileSync(prefix+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(prefix+'.md',markdown(d))
 console.log(JSON.stringify({questionCount:d.countOfDistinctOriginalMcqResearchCandidates,
  totalSourceFiles:d.originalMcqSourceFiles,unflaggedSourceFiles:d.previouslyUnsealedNonflaggedMcqSourceFiles,
  newlyCoveredMcqs:d.previouslyUnsealedOriginalMcqQuestionRevisions,
  manifestSha256:sha(fs.readFileSync(prefix+'.json')),approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={loadInputs,build,assertFrozen,markdown,sha,NAME}

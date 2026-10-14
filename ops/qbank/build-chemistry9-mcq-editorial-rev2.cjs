#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {inspectMcqs}=require('./audit-mcq-key-patterns.cjs')
const ROOT=path.resolve(__dirname,'../..')
const IN=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_CHEMISTRY9_C10_C13_MCQ_EDITORIAL_REV2_20261008.json')
const DOCKET=path.join(ROOT,'docs/question-bank/ASSPS_CHEMISTRY9_C10_C13_MCQ_REV2_REVIEW_DOCKET_20261008.json')
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const FILES=Object.freeze([
 {file:'chemistry9Chapter10EnglishDrafts2026.json',expectedSha256:'c61a997c4da221578b2e3a0c38ac2c02aeab7d72a615be97ccd6250f10a52655',chapter:10,keys:'DBCABD ACDB'.replace(/ /g,'')},
 {file:'chemistry9Chapter13EnglishDrafts2026.json',expectedSha256:'c328c074b6caa9632712fa3007a7e457eac87a62e9bd5085114f35842463dc69',chapter:13,keys:'DCDBACACBA'}
])
function canonicalOptions(options){
 return options.map(x=>String(x.text||'').normalize('NFKC').trim().toLowerCase()).sort()
}
function build(readFile=file=>fs.readFileSync(path.join(IN,file))){
 const originals=[],questions=[],auditRows=[]
 for(const config of FILES){
  const bytes=readFile(config.file)
  if(sha(bytes)!==config.expectedSha256)throw Error('ORIGINAL_AUTHORING_FILE_SHA_CHANGED:'+config.file)
  const d=JSON.parse(bytes)
  if(d.publicationAllowed!==false||d.liveImportAllowed!==false||d.reviewStatus==null)
   throw Error('UNSAFE_PARENT_PUBLICATION_FLAGS:'+config.file)
  const mcqs=(d.drafts||[]).filter(q=>q.type==='mcq')
  if(mcqs.length!==10||config.keys.length!==10)throw Error('MCQ_BATCH_SIZE_DRIFT:'+config.file)
  originals.push({file:config.file,fileSha256:sha(bytes),sourceRecordId:d.sourceRecordId,questionCount:d.drafts.length,mcqCount:mcqs.length,chapter:config.chapter})
  for(const [index,q] of mcqs.entries()){
   if(q.correctOptionId!=='A'||q.content?.en?.options?.length!==4||q.medium!=='english'||
      q.curriculum?.grade!==9||q.chapter?.number!==config.chapter||
      q.source?.catalogRecordId!=='pectaa-catalog-007'||q.review?.status!=='draft'||
      q.content.en.options[0].text!==q.content.en.answer||
      q.review.checks&&Object.values(q.review.checks).some(Boolean))
     throw Error('UNVERIFIED_ORIGINAL_QUESTION_SHAPE:'+q.id)
   const originalOptions=q.content.en.options
   if(new Set(originalOptions.map(x=>x.text.trim().toLowerCase())).size!==4||
      originalOptions.map(x=>x.id).join('')!=='ABCD')throw Error('DUPLICATE_OR_UNLABELED_CHOICES:'+q.id)
   const key=config.keys[index],destination='ABCD'.indexOf(key)
   if(destination<0)throw Error('INVALID_TARGET_KEY')
   const order=Array.from({length:4},(_,i)=>originalOptions[(i-destination+4)%4])
   const options=order.map((x,i)=>({id:'ABCD'[i],text:x.text}))
   if(options[destination].text!==q.content.en.answer ||
      JSON.stringify(canonicalOptions(options))!==JSON.stringify(canonicalOptions(originalOptions)))
    throw Error('ANSWER_OR_DISTRACTOR_CHANGED:'+q.id)
   const revised={...q,content:{...q.content,en:{...q.content.en,options}},
      correctOptionId:key,review:{...q.review,status:'draft',checks:Object.fromEntries(Object.keys(q.review.checks).map(k=>[k,false]))},
      editorialCandidate:{revision:2,sourceQuestionSha256:sha(JSON.stringify(q)),
       reason:'CORRECT_OPTION_POSITION_DISTRIBUTION_REVIEW',independentAnswerReviewRequired:true,
       sourcePageReviewRequired:true,schoolAdoptionVerified:false,
       academicApproval:false,publicationAllowed:false,liveImportAllowed:false}}
   questions.push(revised)
   auditRows.push({questionId:q.id,originalAuthoringFile:config.file,
     originalQuestionSha256:sha(JSON.stringify(q)),proposedQuestionSha256:sha(JSON.stringify(revised)),
     originalCorrectOption:'A',proposedCorrectOption:key,
     answerTextPreserved:true,optionTextMultisetPreserved:true,
     textbookEditionAdopted:false,physicalSourcePageVerified:false,
     independentAnswerVerified:false,independentReviewerId:null,academicApproverId:null,approved:false,published:false})
  }
 }
 const keys=questions.map(x=>x.correctOptionId)
 const counts=Object.fromEntries('ABCD'.split('').map(k=>[k,keys.filter(v=>v===k).length]))
 if(Object.values(counts).some(v=>v!==5))throw Error('REVISED_MCQS_NOT_BALANCED_5_EACH')
 const inspect=inspectMcqs(questions.map(q=>({
  id:q.id,type:'mcq',correctOption:q.correctOptionId,
  options:q.content.en.options.map(o=>o.text)
 })))
 if(inspect.findings.length)throw Error('MCQ_EDITORIAL_PATTERN_REMAINS:'+JSON.stringify(inspect.findings))
 const packageData={
  schemaVersion:'assps-chemistry9-mcq-ch10-ch13-editorial-rev2-v1',
  scope:'20_ORIGINAL_MCQS_OPTION_REORDER_CANDIDATES_HUMAN_ANSWER_REVIEW_PENDING',
  originalFiles:originals,originalUniqueIdsPreserved:true,
  newQuestionCount:0,editedExistingQuestionCount:questions.length,
  grade:9,subject:'chemistry',medium:'english',chapters:[10,13],
  academicSourcePageVerified:false,schoolAdoptedEditionCertified:false,
  independentlyReviewed:false,approved:false,published:false,
  releaseEligible:false,liveImportAllowed:false,
  originalKeyDistribution:{A:20,B:0,C:0,D:0},proposedKeyDistribution:counts,
  originalOptionsPreserved:true,questions
 }
 const packageBytes=Buffer.from(JSON.stringify(packageData,null,2)+'\n')
 const docket={
  schemaVersion:'assps-chemistry9-mcq-ch10-ch13-editorial-docket-v1',
  revisionFile:path.relative(ROOT,OUT),revisionFileSha256:sha(packageBytes),
  sourceFiles:originals,editedExistingQuestionCount:questions.length,
  reviewStatus:'PENDING_INDEPENDENT_CHEMISTRY_SOURCE_ANSWER_EDITORIAL_REVIEW',
  questionSourceVerified:0,independentlyReviewed:0,approved:0,published:0,
  originalKeyDistribution:packageData.originalKeyDistribution,
  proposedKeyDistribution:counts,items:auditRows
 }
 return{packageData,docket,packageBytes,docketBytes:Buffer.from(JSON.stringify(docket,null,2)+'\n')}
}
if(require.main===module){
 try{
 const r=build()
 if(process.argv.includes('--write')){
  fs.writeFileSync(OUT,r.packageBytes)
  fs.writeFileSync(DOCKET,r.docketBytes)
 }
 console.log(JSON.stringify({sourceFiles:r.docket.sourceFiles,
   revisedMCQCount:r.packageData.questions.length,distribution:r.packageData.proposedKeyDistribution,
   revisionSha256:sha(r.packageBytes),docketSha256:sha(r.docketBytes),
   reviewed:0,approved:0,published:0},null,2))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={build,FILES,IN,OUT,DOCKET,canonicalOptions}

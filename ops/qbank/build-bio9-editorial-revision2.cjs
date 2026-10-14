#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {inspectMcqs}=require('./audit-mcq-key-patterns.cjs')
const ROOT=path.resolve(__dirname,'../..')
const IN=path.join(ROOT,'docs/question-bank/ASSPS_BIO9_CH1_ORIGINAL_PRACTICE_DRAFT_20261008.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_BIO9_CH1_ORIGINAL_PRACTICE_REV2_20261008.json')
const DOCKET=path.join(ROOT,'docs/question-bank/ASSPS_BIO9_CH1_ORIGINAL_REV2_REVIEW_DOCKET_20261008.json')
const TARGET_KEYS=['B','D','A','C','B','A','D','B','C','A','D','C']
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const source=fs.readFileSync(IN)
const draft=JSON.parse(source)
if(draft.draftId!=='ASSPS-BIO9-C1-ORIGINAL-EDITORIAL-PILOT-20261008'||draft.questions?.length!==27
 ||draft.academicallyApproved!==false||draft.releaseEligible!==false)throw Error('SOURCE_DRAFT_IDENTITY_NOT_MATCHED')
const reviewItems=[]
let mcqIndex=0
const updated=draft.questions.map(q=>{
 if(q.type!=='mcq'){reviewItems.push({localQuestionId:q.localId,sourceQuestionSha256:sha(JSON.stringify(q)),revisionContentSha256:sha(JSON.stringify(q)),edited:false,academicReview:'PENDING'});return q}
 if(q.correctOption!=='ABCD'[mcqIndex%4]||!Array.isArray(q.options)||q.options.length!==4)throw Error('UNEXPECTED_ORIGINAL_MCQ_LAYOUT:'+q.localId)
 const oldCorrect=q.options['ABCD'.indexOf(q.correctOption)]
 const newIndex='ABCD'.indexOf(TARGET_KEYS[mcqIndex])
 // Rotate option texts, preserving every original option and its identity.
 const oldIndex='ABCD'.indexOf(q.correctOption)
 const offset=(newIndex-oldIndex+4)%4
 const choices=Array.from({length:4},(_,i)=>q.options[(i-offset+4)%4])
 const changed={...q,options:choices,correctOption:TARGET_KEYS[mcqIndex]}
 if(changed.options[newIndex]!==oldCorrect)throw Error('ANSWER_IDENTITY_CHANGED')
 if(JSON.stringify([...changed.options].sort())!==JSON.stringify([...q.options].sort()))throw Error('OPTION_CONTENT_CHANGED')
 reviewItems.push({localQuestionId:q.localId,sourceQuestionSha256:sha(JSON.stringify(q)),revisionContentSha256:sha(JSON.stringify(changed)),edited:true,sourceCorrectOption:q.correctOption,revisionCorrectOption:changed.correctOption,correctAnswerTextSha256:sha(oldCorrect),academicReview:'PENDING'})
 mcqIndex++
 return changed
})
if(mcqIndex!==12)throw Error('EXPECTED_TWELVE_MCQS')
const audit=inspectMcqs(updated)
if(audit.findings.length!==0)throw Error('REVISED_MCQ_EDITORIAL_AUDIT_FAILED:'+JSON.stringify(audit.findings))
const rev={
 ...draft,
 schemaVersion:'assps-bio9-original-practice-revision-v2',
 draftId:'ASSPS-BIO9-C1-ORIGINAL-EDITORIAL-PILOT-20261008-REV2',
 revisionNumber:2,
 parentDraftId:draft.draftId,
 parentDraftSha256:sha(source),
 supersedesForReviewOnly:true,
 curriculumSessionVerified:false,
 sourceExerciseVerified:false,
 independentCurriculumReview:false,
 independentAnswerReview:false,
 academicallyApproved:false,
 productionQuestionBankImportAllowed:false,
 releaseEligible:false,
 scope:'REVISION_2_EDITORIAL_REVIEW_CANDIDATE_NOT_SOURCE_VERIFIED',
 editorialRevision:'Non-periodic MCQ answer positions without changing any answer meaning; no new questions added',
 questions:updated
}
const docket={
 schemaVersion:'assps-biology9-ch1-revision2-review-docket-v1',
 sourceFile:path.basename(IN),parentSha256:sha(source),
 revisionFile:path.basename(OUT),revisionSha256:sha(JSON.stringify(rev,null,2)+'\n'),
 itemCount:updated.length,mcqCount:mcqIndex,independentReviewer:null,
 sourceVerified:0,independentlyReviewed:0,approved:0,published:0,
 mcqEditorialReview:{originalPattern:'ABCD_REPEATED_3_TIMES',newKeyDistribution:audit.correctKeyDistribution,algorithmicFindings:audit.findings,academicCorrectnessCertified:false},
 items:reviewItems.map(x=>({...x,sourcePageVerified:false,answerIndependentlyVerified:false,bilingualEquivalentVerified:false,reviewerId:null,approved:false}))
}
if(process.argv.includes('--write')){
 fs.writeFileSync(OUT,JSON.stringify(rev,null,2)+'\n')
 fs.writeFileSync(DOCKET,JSON.stringify(docket,null,2)+'\n')
}
console.log(JSON.stringify({status:'EDITORIAL_REVISION_ONLY',sourceSha256:sha(source),newFile:OUT,newDocket:DOCKET,questionCount:updated.length,mcqCount:mcqIndex,changedChoices:reviewItems.filter(x=>x.edited).length,keySequence:updated.filter(x=>x.type==='mcq').map(x=>x.correctOption).join(''),academicApproval:0,publication:0},null,2))
module.exports={TARGET_KEYS}

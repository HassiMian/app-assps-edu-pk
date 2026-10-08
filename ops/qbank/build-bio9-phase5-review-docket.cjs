#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const root=path.resolve(__dirname,'../..')
const draftPath=path.join(root,'docs/question-bank/ASSPS_BIO9_CH1_ORIGINAL_PRACTICE_DRAFT_20261008.json')
const docketPath=path.join(root,'docs/question-bank/ASSPS_BIO9_CH1_ACADEMIC_REVIEW_DOCKET_20261008.json')
const draft=JSON.parse(fs.readFileSync(draftPath,'utf8'))
const registry=require(path.join(root,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json'))
const source=registry.entries.find(item=>item.recordId===draft.evidenceSourceRecordId)
if(!source||source.pdfSha256!==draft.evidencePdfSha256||source.grade!==9||
  source.subject.toLowerCase()!=='biology'||draft.questions?.length!==27||
  draft.academicallyApproved!==false||draft.productionQuestionBankImportAllowed!==false||
  draft.releaseEligible!==false||draft.sourceExerciseVerified!==false)
  throw Error('BIO9_EDITORIAL_DRAFT_SOURCE_AND_GOVERNANCE_CANNOT_BE_VERIFIED')
const knownIds=new Set()
const checks=['sourceImageChecked','editionChecked','chapterMatchChecked',
  'curriculumChecked','answerKeyChecked','languageChecked','originalityChecked']
const items=draft.questions.map(q=>{
  if(!q.localId||knownIds.has(q.localId)||!['mcq','short','long'].includes(q.type)||
     !q.questionText||!Number.isInteger(q.marks)||q.marks<1||q.marks>25)
    throw Error('UNSAFE_OR_DUPLICATE_QUESTION_DRAFT:'+q.localId)
  knownIds.add(q.localId)
  if(q.type==='mcq'&&(!Array.isArray(q.options)||q.options.length!==4||
      !['A','B','C','D'].includes(String(q.correctOption||''))))
    throw Error('INVALID_ORIGINAL_DRAFT_MCQ:'+q.localId)
  return {
    localQuestionId:q.localId,questionType:q.type,proposedMarks:q.marks,
    sourceDraftSha256:crypto.createHash('sha256').update(JSON.stringify(q)).digest('hex'),
    editorialState:'pending_independent_review',
    sourcePageEvidenceVerified:false,academicallyReviewed:false,
    independentAnswerVerified:false,eligibleForProductionSeed:false,
    verifiedChecks:Object.fromEntries(checks.map(key=>[key,false])),
  }
})
const result={
  schemaVersion:'assps-biology9-ch1-review-docket-v1',
  draftId:draft.draftId,sourceDraftFile:path.basename(draftPath),
  sourceDraftSha256:crypto.createHash('sha256').update(fs.readFileSync(draftPath)).digest('hex'),
  schoolCode:'assps',schoolId:1,grade:'9th',subject:'Biology',chapterNo:'1',
  sourceRecordId:source.recordId,sourcePdfSha256:source.pdfSha256,
  sourceEdition:source.edition,originalQuestionsOnly:true,
  independentReviewCompleted:false,approvedQuestions:0,
  automaticApprovalAllowed:false,automaticImportAllowed:false,
  draftTotals:{total:items.length,mcq:items.filter(x=>x.questionType==='mcq').length,
    short:items.filter(x=>x.questionType==='short').length,
    long:items.filter(x=>x.questionType==='long').length},
  releasePrerequisite:'Subject expert must inspect textbook source images, answer keys, curriculum mapping, originality and latest Question Bank content revision before governed approval.',
  questions:items,
}
if(result.draftTotals.mcq!==12||result.draftTotals.short!==12||result.draftTotals.long!==3)
  throw Error('BIO9_EDITORIAL_COVERAGE_MISMATCH')
fs.writeFileSync(docketPath,JSON.stringify(result,null,2)+'\n')
console.log('BIOLOGY9_CH1_EDITORIAL_DOCKET_CREATED_27_PENDING_0_APPROVED',docketPath)

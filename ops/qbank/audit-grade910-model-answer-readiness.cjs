#!/usr/bin/env node
'use strict'
// Metadata-only complete-corpus audit. Unverified answer rubrics must not be
// mistaken for independent full model-answer/academic approval evidence.
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const OUT=path.join(ROOT,'docs/question-bank')
const sha=content=>crypto.createHash('sha256').update(content).digest('hex')
const stem=q=>String(q.stem||q.question_text||q.questionText||q.content?.en?.stem||q.content?.ur?.stem||'').trim()
const answer=q=>String(q.answer||q.content?.en?.answer||q.content?.ur?.answer||'').trim()
function audit(documents){
 const ids=new Set(),files=[],byFile=[],reviewCandidates=[]
 let authored=0,longCount=0,flagged=0,otherTypes=0,excluded=0
 for(const {filename,bytes,data} of documents){
  if(!filename||!bytes||!data)throw Error('MODEL_ANSWER_UNREADABLE_DOCUMENT')
  const records=data.drafts||data.items||[]
  if(!Array.isArray(records))continue
  let fileCount=0,fileLong=0,fileRubric=0
  for(const q of records){
   if(!q?.id||!stem(q)){excluded++;continue}
   if(ids.has(q.id))throw Error('MODEL_ANSWER_DUPLICATE_QUESTION_ID:'+q.id)
   ids.add(q.id)
   authored++;fileCount++
   const isLong=q.type==='long'
   if(isLong){longCount++;fileLong++}else otherTypes++
   const isRubric=rubricOnlyLongAnswer(q.type,answer(q))
   if(isRubric){
    flagged++;fileRubric++
    reviewCandidates.push({
     questionId:q.id,sourceFile:filename,sourceFileSha256:sha(bytes),
     questionRevisionCandidateSha256:sha(JSON.stringify(q)),
     originalQuestionType:q.type,marks:q.marks??null,
     chapterNo:q.chapter?.number??null,topicId:q.topicId??null,
     sourceRecordId:q.source?.catalogRecordId||data.sourceRecordId||null,
     risk:'RUBRIC_IN_ANSWER_FIELD_NO_INDEPENDENT_MODEL_ANSWER',
     requiredFacultyAction:'Author an explanatory model answer, keep marking rubric in a separate reviewed field, independently recheck marks/science/language and sign the exact new revision.',
     modelAnswerReviewed:false,originalResearchCandidateOnly:true,
     academicApproved:false,publishedVerified:false
    })
   }
  }
  if(fileCount)files.push(filename)
  if(fileRubric)byFile.push({sourceFile:filename,authoredQuestions:fileCount,longQuestions:fileLong,rubricOnlyLongAnswers:fileRubric})
 }
 byFile.sort((a,b)=>b.rubricOnlyLongAnswers-a.rubricOnlyLongAnswers||a.sourceFile.localeCompare(b.sourceFile))
 reviewCandidates.sort((a,b)=>a.questionId.localeCompare(b.questionId))
 return {
  schemaVersion:'assps-grade910-model-answer-vs-marking-rubric-research-v1',
  scope:'FULL_CORPUS_RESEARCH_ONLY_NOT_HUMAN_REVIEW_OR_APPROVAL',
  totals:{originalAuthoredCandidates:authored,authoredFiles:files.length,
   longQuestions:longCount,rubricOnlyLongAnswers:flagged,
   longAnswersNotFlaggedByEnglishRubricHeuristic:longCount-flagged,
   otherQuestionTypes:otherTypes,excludedNonQuestionEvidenceRows:excluded,
   verifiedFullModelAnswers:0,independentlyHumanReviewed:0,approved:0,publishedVerified:0},
  caveats:[
   'The classifier flags only recognizable English grading directives at the start of an answer; it cannot verify other long answers or Urdu marking directions.',
   'A grading rubric can help an examiner, but an instruction such as Award marks for... is not itself a student-facing explanatory model answer.',
   'Flags are research review candidates; no proposed text changes or automatic answer publication is performed.',
   'The original question and source-file SHA values identify precisely which unmodified provisional draft requires review.',
   'A non-flagged answer is NOT thereby correct, textbook aligned, independent human verified or approved.',
  ],
  byFile,reviewCandidates
 }
}
function markdown(d){
 const t=d.totals
 const lines=[
  '# ASSPS Grade IX–X — Full-corpus long-answer vs marking-rubric review docket',
  '', '**Unapproved original question drafts. No model answer was invented or approved by this audit.**',
  '',`- Original authored research candidates: **${t.originalAuthoredCandidates}** from **${t.authoredFiles}** files.`,
  `- Long questions: **${t.longQuestions}**; answer fields beginning with an English marking instruction rather than an explanatory answer: **${t.rubricOnlyLongAnswers}**.`,
  `- Other long answers not matched by this heuristic: **${t.longAnswersNotFlaggedByEnglishRubricHeuristic}** (**NOT academically verified**).`,
  `- **${t.excludedNonQuestionEvidenceRows}** authoring/exercise-map entries excluded (not written questions).`,
  '- Independent model answer reviewer signoffs **0**, approved **0**, academically verified published **0**.',
  '', '## Faculty review batching — original files', '',
  '| Original authored source file | Draft questions | Long questions | Rubric-only long answers |',
  '|---|---:|---:|---:|'
 ]
 for(const x of d.byFile)lines.push(`| ${x.sourceFile} | ${x.authoredQuestions} | ${x.longQuestions} | ${x.rubricOnlyLongAnswers} |`)
 lines.push('','## Required evidence for each flagged question','',
  '1. Preserve the original source-file SHA and individual original question hash to prevent review transfer to a different revision.',
  '2. A qualified subject teacher authors a complete student-facing explanation; separately records the point-based marking scheme and marks allocation.',
  '3. Independently review scientific content, original textbook chapter/edition/page and English/Urdu language meaning if applicable.',
  '4. New content requires an immutable new revision and independent reviewer signoff before Paper Studio selection; no automatic approvals.',
  '',
  'This is an English-language rubric-start detector, not semantic grading or an audit of every answer. The complete flagged question IDs and SHA fingerprints are in the sibling JSON docket.',
  '', '**Production release and seeding: HOLD pending SaaS Core certification.**','')
 return lines.join('\n')
}
function main(){
 const docs=fs.readdirSync(INPUT).filter(x=>x.endsWith('.json')).sort().map(filename=>{
  const bytes=fs.readFileSync(path.join(INPUT,filename))
  return {filename,bytes,data:JSON.parse(bytes)}
 })
 const docket=audit(docs)
 fs.writeFileSync(path.join(OUT,'ASSPS_GRADE910_RUBRIC_ONLY_MODEL_ANSWER_REVIEW_20261009.json'),JSON.stringify(docket,null,2)+'\n')
 fs.writeFileSync(path.join(OUT,'ASSPS_GRADE910_RUBRIC_ONLY_MODEL_ANSWER_REVIEW_20261009.md'),markdown(docket))
 console.log(JSON.stringify(docket.totals))
}
if(require.main===module)main()
module.exports={audit,markdown}

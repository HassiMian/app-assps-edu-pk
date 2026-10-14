#!/usr/bin/env node
'use strict'
// Student-readable original prose CANDIDATES, NOT textbook-verified academic answers.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const SRC=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/computer10Starter2026.json')
const REG=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUT=path.join(ROOT,'docs/question-bank')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const ORIGINAL_SHA='c6a01619ae6c7ca8adb387fe89777826e1dd13536b2ceb6649bb466969c86c72'
const ANSWERS=Object.freeze({
'X-COMP-U01-L01':{
 answer:'An operating system coordinates programs, memory, files and hardware so that a user request can be completed safely. Process management schedules running programs, gives them processor time and controls their states. Memory management allocates working memory to programs and helps keep one process from unintentionally changing another process’s data. A file system organizes persistent information into named files and folders, with permissions governing appropriate access. System calls give applications a controlled way to request operating-system services, such as reading a file. Device drivers translate operating-system requests into operations understood by hardware devices. These components cooperate when, for example, a student opens and prints a saved document.',
 points:['Process scheduling and resource control','Memory allocation and isolation','File storage, naming and permissions','Controlled system-call interface','Device drivers and one coherent combined example']},
'X-COMP-U02-L01':{
 answer:'An unstable school computer should be assessed in a way that protects students’ records and avoids unnecessary changes. First record the symptoms, recent updates and any visible error messages without exposing private student information. Confirm whether essential files have a usable authorized backup before attempting repairs. Check simple non-destructive causes such as available storage, legitimate software updates or an attached peripheral, and use approved diagnostic tools rather than deleting files. The responsible technician or administrator can then choose the least invasive corrective action appropriate to the diagnosis, while preserving an audit trail. Finally, verify that normal functions and authorized data access have returned and document the outcome for school records.',
 points:['Document symptoms and recent changes','Protect records through authorized backup','Use non-destructive diagnosis','Choose least-invasive authorized remediation','Validate recovery and record results']},
'X-COMP-U03-L01':{
 answer:'A variable is a named reference to a value that a program can use. In Python, an expression combines values, names and operators to calculate another value. The input function reads user-supplied text, and the print function displays a result. Common basic data types include integers for whole numbers, floating-point values for decimal measurements, strings for text and booleans for true-or-false states. For example, a simple program may read a whole-number count, convert the input string into an integer, add one and print the updated count. The conversion matters because adding numbers is different from joining strings, and invalid input should be recognized rather than assumed to be numeric.',
 points:['Explain variable and assignment concept','Define expressions and operators','Distinguish input and output','Recognize strings, integers, floats and booleans','Give original input-conversion-expression-output example']},
'X-COMP-U04-L01':{
 answer:'A score-classification program first reads a score and checks whether it represents a valid number within an agreed range, for example 0 through 100. If the value is outside that range or cannot be interpreted as numeric input, the program reports a clear error instead of assigning a category. For valid scores, a conditional chain compares the value with documented boundaries, such as a higher band of 80–100, a middle band of 50–79 and a lower band of 0–49; these thresholds are illustrative rather than an ASSPS grading policy. The program displays the selected band and then uses repetition to process another student while records remain. A final summary can count the processed valid scores without displaying students’ private identifiers unnecessarily.',
 points:['Read a score with clear input expectations','Validate range and nonnumeric input','Define mutually exclusive conditional boundaries','Repeat classification for multiple records','Display appropriate results while protecting private identifiers']},
'X-COMP-U05-L01':{
 answer:'A responsible attendance analysis begins with a specific question, such as whether class-wide absence patterns change from month to month. A school should use the minimum relevant records for an authorized educational purpose, verify access permissions and avoid collecting unrelated personal details. The data are checked for duplicates, missing dates and inconsistent attendance codes before totals or percentages are calculated. Aggregated charts may then compare attendance rates across periods without exposing the names of individual students. Interpretation must consider relevant factors such as holidays, incomplete records or school calendar changes rather than treating every correlation as a cause. Findings should be shared only with authorized staff and used to improve support for learners rather than to label students unfairly.',
 points:['State a clear question and intended benefit','Collect minimum authorized school data','Check missing values, duplicates and inconsistent codes','Analyze and visualize aggregate patterns','Interpret cautiously and protect individual student privacy']},
'X-COMP-U06-L01':{
 answer:'Rule-based software follows instructions that a programmer specifies explicitly, for example checking whether an entered score lies in a chosen range. It can be predictable and easy to inspect when the rules are clear, but may perform poorly when the needed rules are complicated or constantly changing. Machine learning uses examples or observations to learn statistical patterns and apply them to new cases, such as grouping messages by their likely topic. Learning methods can adapt to complex patterns that are difficult to describe as fixed rules, yet they depend on the quality and relevance of the training data and may make errors that need investigation. A suitable choice depends on the problem, available evidence, transparency and the consequences of mistakes.',
 points:['Define explicit rule-based logic','Explain a rule-based benefit and limitation','Define learning patterns from example data','Explain an ML benefit and limitation','Identify an appropriate-use comparison and oversight need']},
'X-COMP-U07-L01':{
 answer:'Artificial intelligence can assist with learning resources by suggesting practice questions that a teacher checks before use. It can also support accessibility, for example by converting spoken information into text, and help administrators identify trends in non-identifying aggregate school data. These uses should be designed so that private information is not shared without authorization and outputs are checked for mistakes or misleading conclusions. Teachers should consider whether a system treats different learners fairly, explain its limitations and keep final educational decisions under human responsibility. Access controls, secure data handling and ongoing evaluation help prevent misuse. AI is a support tool, not a replacement for professional judgment or student rights.',
 points:['Valid education-support application','Valid accessibility application','Valid aggregate administrative application','Privacy, accuracy, fairness and security safeguards','Human oversight and responsible limitations']},
'X-COMP-U08-L01':{
 answer:'A digital service starts with understanding a genuine problem and who experiences it. A prospective developer can speak with intended users, compare existing solutions and describe a clear value proposition without gathering unnecessary personal information. The next step is to identify the smallest useful set of features for a prototype or minimum viable product. Feedback from a limited, consent-based evaluation can reveal confusing design choices and guide improvements before a broader launch. A basic plan should estimate development and ongoing costs, possible revenue, support needs and realistic risks. A responsible launch provides clear information about the service, protects user data, respects intellectual property and uses accessible, honest communication.',
 points:['Identify user problem and target users','Describe value proposition and alternatives','Specify minimal viable features','Test with consent and improve from feedback','Consider costs, legality, privacy, accessibility and truthful launch']},
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==ORIGINAL_SHA)
  throw Error('COMP10_ORIGINAL_FILE_SHA_CHANGED')
 let original
 try{original=JSON.parse(bytes)}catch(_){throw Error('COMP10_ORIGINAL_FILE_SHA_CHANGED')}
 if(JSON.stringify(original)!==JSON.stringify(source))
  throw Error('COMP10_ORIGINAL_FILE_SHA_CHANGED')
 if(!Array.isArray(source?.drafts)||source.drafts.length!==40||
    source.publicationAllowed!==false||source.liveImportAllowed!==false)
  throw Error('COMP10_SOURCE_NOT_PROVISIONAL')
 const catalog=registry?.entries?.find(e=>e.recordId===source.sourceRecordId)
 if(!catalog||Number(catalog.grade)!==10||
    String(catalog.subject).toLowerCase()!=='computer science'||
    String(catalog.medium).toLowerCase()!=='english'||
    catalog.pdfSha256!==source.sourcePdfSha256)
  throw Error('COMP10_SOURCE_CATALOG_IDENTITY_CHANGED')
 const originalLong=source.drafts.filter(q=>q.type==='long')
 if(originalLong.length!==8||Object.keys(ANSWERS).length!==8)
  throw Error('COMP10_EXPECTED_8_ORIGINAL_LONG_QUESTIONS')
 const ids=new Set()
 const items=originalLong.map(q=>{
  if(!q.id||ids.has(q.id)||!ANSWERS[q.id])
   throw Error('COMP10_MISSING_OR_DUPLICATE_ORIGINAL_ID')
  ids.add(q.id)
  if(q.marks!==5||q.source?.catalogRecordId!==catalog.recordId||
     q.source?.pdfSha256!==catalog.pdfSha256||
     !rubricOnlyLongAnswer(q.type,q.content?.en?.answer))
   throw Error('COMP10_ORIGINAL_IS_NOT_EXPECTED_RUBRIC_ONLY:'+q.id)
  const candidate=ANSWERS[q.id]
  if(typeof candidate.answer!=='string'||candidate.answer.length<230||
     rubricOnlyLongAnswer('long',candidate.answer)||
     !Array.isArray(candidate.points)||candidate.points.length!==5||
     new Set(candidate.points).size!==5||
     candidate.points.some(s=>typeof s!=='string'||s.length<16))
   throw Error('COMP10_ANSWER_OR_MARKS_INCOMPLETE:'+q.id)
  return {
   questionId:q.id,chapterNo:q.chapter?.number,topicId:q.topicId,marks:5,
   originalQuestionSha256:sha(JSON.stringify(q)),
   originalAnswerSha256:sha(q.content.en.answer),
   originalSourceFileSha256:ORIGINAL_SHA,sourceCatalogId:catalog.recordId,
   declaredPdfSha256:catalog.pdfSha256,originalAnswerUnmodified:true,
   proposedOriginalEnglishExplanatoryAnswer:candidate.answer,
   proposedSeparateMarkingCriteria:candidate.points,
   subjectTeacherCorrectnessVerified:false,schoolTextbookEditionAndPageVerified:false,
   englishUrduEquivalenceVerified:false,independentReviewerId:null,
   approvedRevisionId:null,academicApproved:false,published:false,
   status:'INDEPENDENT_AUTHORING_DRAFT_FOR_COMPUTER_X_TEACHER_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-computer10-eight-original-model-answer-drafts-v1',
  scope:'ORIGINAL_RESEARCH_DRAFTS_NOT_APPROVED_OR_PUBLISHED',
  originalSourceFile:'computer10Starter2026.json',
  originalSourceFileSha256:ORIGINAL_SHA,
  sourceRecordId:catalog.recordId,declaredCatalogPdfSha256:catalog.pdfSha256,
  originalCandidateQuestionCount:source.drafts.length,
  originalRubricOnlyLongQuestionCount:originalLong.length,
  newSeparateExplanatoryAnswerProposals:items.length,
  newSeparateMarkingCriterionProposals:items.length*5,
  realTeacherReviewCount:0,sourcePageVerifiedCount:0,academicApprovalCount:0,publishedCount:0,
  caveats:[
   'Explanations have not been checked by qualified ASSPS subject teachers and are not official textbook answer keys.',
   'Source PDF catalog identity is not school textbook adoption, examination year or printed textbook-page/exercise verification.',
   'Original 40 question drafts and all 8 rubric-only original answer fields remain untouched until new immutable revisions are independently approved.',
  ],items
 }
}
function markdown(d){
 return [
  '# ASSPS Grade X Computer Science — eight independently authored long-answer drafts',
  '', '**Provisional original research answers only. Not subject verified, school-source verified, approved or Paper Studio selectable.**','',
  `Existing source: ${d.originalCandidateQuestionCount} original provisional questions including ${d.originalRubricOnlyLongQuestionCount} grading-only long answers. This separate packet contains ${d.newSeparateExplanatoryAnswerProposals} new explanatory proposals and ${d.newSeparateMarkingCriterionProposals} separate marking-point proposals. Source SHA: \`${d.originalSourceFileSha256}\`.`,'',
  ...d.items.flatMap(x=>[
   `### ${x.questionId} — Chapter ${x.chapterNo}: ${x.topicId}`,'',
   x.proposedOriginalEnglishExplanatoryAnswer,'',
   '**Separate proposed five-point marking criteria:** '+x.proposedSeparateMarkingCriteria.join(' · '),''
  ]),
  '## Independent approval requirements','',
  '1. Confirm the actual ASSPS Grade X Computer Science textbook title, printed edition, approved medium, school year and board exam year; the catalog PDF identity is not adoption evidence.',
  '2. Verify original textbook chapter and exercise against the actual printed page/PDF physical page with an authorized independent reviewer.',
  '3. A qualified computer-science subject teacher must check accuracy, ethics, student-accessibility, five-mark fairness and whether each explanation fully answers its exact original question.',
  '4. Independently verify Urdu equivalence where needed; submit a new immutable question revision and obtain separate human academic signoff before any approval.',
  '5. Keep Paper Studio Grade IX/X verified picker empty. SaaS Core alone owns tenant/RLS certification and production deployment.',
  '', '**Independent source/page verification: 0 · Subject-teacher review: 0 · Academically approved: 0 · Published: 0.**',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(SRC),source=JSON.parse(bytes),registry=JSON.parse(fs.readFileSync(REG))
 const d=build({bytes,source,registry})
 fs.writeFileSync(path.join(OUT,'ASSPS_COMPUTER10_EIGHT_LONG_MODEL_ANSWER_DRAFTS_20261009.json'),JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(path.join(OUT,'ASSPS_COMPUTER10_EIGHT_LONG_MODEL_ANSWER_DRAFTS_20261009.md'),markdown(d))
 console.log(JSON.stringify({original:d.originalCandidateQuestionCount,rubricOnly:d.originalRubricOnlyLongQuestionCount,newDrafts:d.newSeparateExplanatoryAnswerProposals,newMarkingPoints:d.newSeparateMarkingCriterionProposals,academicApproved:d.academicApprovalCount}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,ORIGINAL_SHA}

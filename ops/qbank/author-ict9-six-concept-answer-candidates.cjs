#!/usr/bin/env node
'use strict'
// Pure original answer proposals. No textbook adoption, academic approval or production writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/ict9TechStarter2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUTPUT=path.join(ROOT,'docs/question-bank')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const PIN='e1e8043b475e2edd7592ab100a01427a4fce392bab795a0ccfd708ec07773ce4'
const ANSWERS=Object.freeze({
'IX-ICT-C01-L01':{
 answer:'A word processor supports written communication by allowing a school to compose notices, letters, reports and timetables in a consistent format. Styles for headings, paragraphs and lists make longer documents easier to navigate, while tables can present a date sheet or other structured information clearly. Pictures or diagrams may add useful context when they are relevant and properly credited. Presentation software organizes key ideas into a sequence of slides designed for a particular audience, using concise text and meaningful visuals rather than crowded pages. A school can prepare a detailed written notice and a brief assembly presentation about the same event. Clear language, readable layout, accessibility and permission to use any media all contribute to responsible communication.',
 points:['Word processor creates editable school documents','Styles and formatting improve structure','Tables and appropriate images communicate information','Presentation slides organize key points for an audience','Accessibility, clarity and responsible media use']},
'IX-ICT-C02-L01':{
 answer:'A microcontroller is a small programmable computing component that can receive information, apply instructions and control an output. The input might be a reading from a sensor, such as the amount of light in a room, represented as data rather than as a physical action. A program evaluates that information according to a rule or threshold and the microcontroller processes the decision. The output can be a signal to a display or indicator showing an appropriate status. This follows the general input–process–output model used in many computing systems. Any actual hardware activity, connections, power management and testing must be supervised by a qualified teacher following the approved safety arrangements; the model itself does not require construction instructions.',
 points:['Identify a sensor or other input datum','Describe an appropriate program rule','Explain controller processing and decision','Identify a meaningful indicator or output','State safe supervised hardware handling boundary']},
'IX-ICT-C03-L01':{
 answer:'A useful school multimedia poster begins with a clear purpose, for example announcing a reading week, and an identified audience such as parents or students. The designer plans essential content first: event title, dates, venue and how a reader can obtain more information. Information should follow an understandable visual hierarchy so that the main message is quickly noticed and supporting details are easy to find. Images and other media should strengthen the message instead of distracting from it, and the school should use resources it owns or has permission to use. The design should also provide readable text, sufficient contrast and alternatives where necessary for accessibility. A final review checks factual accuracy, spelling, intended display size and whether the message is clear to the target audience.',
 points:['Define communication objective and audience','Plan complete accurate event content','Arrange readable visual hierarchy and spacing','Use lawful relevant images or media','Check accessibility, clarity and final proofreading']},
'IX-ICT-C04-L01':{
 answer:'A responsible small e-commerce website should describe what is being offered in accurate, understandable product or service pages. Visitors need clear navigation and search or category links to find the relevant information without confusion. A cart or order summary should make selected items, quantities and the total cost visible before a customer confirms a request. The website must explain important terms, delivery expectations and how customers can contact support, rather than making misleading claims. Personal information should be collected only when necessary and handled using appropriate access controls and secure payment services rather than exposing confidential details. Readable text, keyboard-friendly controls, useful error messages and testing on different screen sizes improve accessibility and trust.',
 points:['Accurate product or service information','Clear navigation and category structure','Transparent cart and order review flow','Privacy and secure payment handling principles','Accessibility, support and truthful terms']},
'IX-ICT-C05-L01':{
 answer:'Safe troubleshooting starts by describing the problem, noting error messages and identifying when the behaviour first changed. Important school records should be protected through an authorized backup before any operation that could affect stored information. The next step is to check simple, non-destructive possibilities, such as an external connection, available storage or a recent legitimate software change, while avoiding unapproved modifications. A responsible technician examines one plausible cause at a time and chooses the least invasive corrective action supported by the evidence. The computer is then checked for normal function, appropriate access permissions and intact files, and the outcome is recorded for future reference. Any repair involving hazardous electrical or internal hardware work belongs to qualified personnel.',
 points:['Record symptoms and recent changes','Verify authorized backup and data protection','Check non-destructive causes first','Isolate causes and apply least-invasive authorized remedy','Retest, preserve permissions and document findings']},
'IX-ICT-C06-L01':{
 answer:'Artificial intelligence can support education by suggesting differentiated practice material, provided a teacher checks its accuracy and suitability. A second application is accessibility: speech recognition or text-based assistance can help some learners interact with educational information. A third application is analyzing authorized aggregate school data to spot broad trends that may support planning without identifying individual students. AI systems can still produce incorrect or biased outputs, so users should verify important claims and consider whether results treat people fairly. School records and personal messages should not be shared without permission, and security safeguards are needed when connecting external services. Teachers and administrators remain responsible for decisions, explain relevant limitations and allow human review of outcomes.',
 points:['Teacher-checked instructional support example','Accessible speech/text support example','Privacy-preserving aggregate planning example','Bias and accuracy checks','Permission, security and accountable human oversight']},
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)throw Error('ICT9_SOURCE_SHA_CHANGED')
 let saved
 try{saved=JSON.parse(bytes)}catch(_){throw Error('ICT9_SOURCE_SHA_CHANGED')}
 if(JSON.stringify(saved)!==JSON.stringify(source))throw Error('ICT9_SOURCE_SHA_CHANGED')
 if(!Array.isArray(source?.drafts)||source.drafts.length!==30||
   source.publicationAllowed!==false||source.liveImportAllowed!==false)
  throw Error('ICT9_NOT_PROVISIONAL_SOURCE')
 const identity=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!identity||identity.recordId!=='pectaa-catalog-043'||
   identity.pdfSha256!==source.sourcePdfSha256||
   Number(identity.grade)!==9||identity.subject!=='Information & Communication Technologies-Tech'||
   identity.medium!=='UNSPECIFIED_BY_CATALOG_LABEL'||
   identity.edition!=='CURRENT_CATALOG_LABEL_NO_SESSION'||
   identity.academicApproval!==false)
  throw Error('ICT9_UNVERIFIED_CATALOG_IDENTITY_DRIFT')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==6||Object.keys(ANSWERS).length!==6)
  throw Error('ICT9_LONG_COVERAGE_DRIFT')
 const seen=new Set()
 const items=longs.map(q=>{
  if(!q.id||seen.has(q.id)||!ANSWERS[q.id])throw Error('ICT9_ORIGINAL_ID_MISSING_DUPLICATE')
  seen.add(q.id)
  if(q.marks!==5||q.source?.catalogRecordId!==identity.recordId||
   q.source?.pdfSha256!==identity.pdfSha256||
   !rubricOnlyLongAnswer(q.type,q.content?.en?.answer))
    throw Error('ICT9_ORIGINAL_LONG_ANSWER_NOT_RUBRIC_ONLY:'+q.id)
  const draft=ANSWERS[q.id]
  if(typeof draft.answer!=='string'||draft.answer.length<250||
    rubricOnlyLongAnswer('long',draft.answer)||
    !Array.isArray(draft.points)||draft.points.length!==5||
    new Set(draft.points).size!==5||
    draft.points.some(p=>typeof p!=='string'||p.length<18))
    throw Error('ICT9_INCOMPLETE_AUTHORING_PROPOSAL:'+q.id)
  return {
   questionId:q.id,chapterNo:q.chapter?.number,topicId:q.topicId,marks:q.marks,
   sourceQuestionSha256:hash(JSON.stringify(q)),
   sourceAnswerSha256:hash(q.content.en.answer),sourceFileSha256:PIN,
   catalogSourceId:identity.recordId,claimedSourcePdfSha256:identity.pdfSha256,
   originalQuestionUnchanged:true,
   proposedIndependentEnglishExplanation:draft.answer,
   proposedDistinctMarkingPoints:draft.points,
   answerLanguage:'English',catalogMediumVerified:false,
   schoolAdoptedEditionSessionVerified:false,originalPrintedExercisePageVerified:false,
   qualifiedIndependentSubjectReviewed:false,urduEquivalenceReviewed:false,
   independentReviewerId:null,approvedRevisionId:null,academicallyApproved:false,
   verifiedPublished:false,reviewStatus:'RESEARCH_DRAFT_REQUIRES_SCHOOL_ADOPTION_AND_TEACHER_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-ict9-tech-six-original-model-answer-research-v1',
  originalQuestionFile:'ict9TechStarter2026.json',originalFileSha256:PIN,
  sourceCatalogId:identity.recordId,sourceCatalogMediumClaim:identity.medium,
  sourceCatalogEditionClaim:identity.edition,sourceCatalogPdfSha256:identity.pdfSha256,
  originalAuthoredResearchQuestions:source.drafts.length,
  originalRubricOnlyLongQuestions:longs.length,
  newExplanatoryAnswerResearchDrafts:items.length,newFiveMarkPointProposals:items.length*5,
  humanSchoolSourceVerified:0,qualifiedHumanAcademicReviewed:0,
  academicallyApproved:0,verifiedPublished:0,
  caveat:'English prose of original new research answers does not establish approved English-medium book or actual PECTAA edition/session; these source identifiers are catalog metadata only. No original answers have been changed.',
  items
 }
}
function markdown(d){
 return [
  '# ASSPS Grade IX ICT Technology — six new original explanatory answer drafts','',
  '**Research proposals only; no approved English-medium adoption, textbook physical-page review or independent teacher approval.**','',
  `Existing ${d.originalAuthoredResearchQuestions} original candidate questions: all ${d.originalRubricOnlyLongQuestions} long answers previously contained rubric-only text. Six separately authored explanations and ${d.newFiveMarkPointProposals} new distinct marking criteria. Original source SHA-256: \`${d.originalFileSha256}\`.`,'',
  '**Catalog medium is UNSPECIFIED_BY_CATALOG_LABEL and catalog edition lacks a certified school session. Do not infer an ASSPS-adopted English textbook from the English draft answer language.**','',
  ...d.items.flatMap(x=>[
   `### ${x.questionId} — Chapter ${x.chapterNo} · ${x.topicId}`,'',
   x.proposedIndependentEnglishExplanation,'',
   '**Separately proposed five-mark marking criteria:** '+x.proposedDistinctMarkingPoints.join(' · '),''
  ]),
  '## Required independent academic actions','',
  'Verify actual ASSPS-approved subject, textbook edition, academic session/exam year, language medium and physical printed chapter/exercise page; obtain qualified ICT reviewer answer-and-mark signoff and appropriate Urdu-equivalence review. Create a new immutable question revision only after correction; a different authorized reviewer must sign that exact revision. Paper Studio verified selector remains empty pending SaaS Core certification.','',
  '**Human source/page verified 0; independently academic reviewed 0; approved 0; published 0. No production deployment.**',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(SOURCE),source=JSON.parse(bytes)
 const registry=JSON.parse(fs.readFileSync(REGISTRY))
 const d=build({bytes,source,registry})
 fs.writeFileSync(path.join(OUTPUT,'ASSPS_ICT9_SIX_LONG_MODEL_ANSWER_DRAFTS_20261009.json'),JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(path.join(OUTPUT,'ASSPS_ICT9_SIX_LONG_MODEL_ANSWER_DRAFTS_20261009.md'),markdown(d))
 console.log(JSON.stringify({original:d.originalAuthoredResearchQuestions,answers:d.newExplanatoryAnswerResearchDrafts,markingPoints:d.newFiveMarkPointProposals,schoolAdopted:d.humanSchoolSourceVerified,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,PIN}

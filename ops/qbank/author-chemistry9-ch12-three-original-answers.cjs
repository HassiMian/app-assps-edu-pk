#!/usr/bin/env node
'use strict'
// Original curriculum-concept answer drafts only; no exercises, lab instructions or approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry9Chapter12EnglishDrafts2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUTPUT=path.join(ROOT,'docs/question-bank')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const PIN='b566e7b515abb2770106fb49893364189b4d116125cc0630aaa979cafd6300bd'
const ANSWERS=Object.freeze({
'IX-CHEM-2025-C12-12T1-L01':{
 answer:'Standardized measurement units allow scientists to communicate the same quantity unambiguously across classrooms, laboratories and countries. The International System of Units (SI) provides agreed base units and derived units, so results from different people can be compared and reproduced. Correct unit symbols matter because uppercase and lowercase letters may represent different units or prefixes: for example, m means metre whereas M is commonly used for the prefix mega or molar concentration notation in a defined context. Prefixes such as milli and kilo represent powers of ten and make very small or large measured quantities easier to express without changing their meaning. For example, a sample mass of 0.005 kilograms is the same quantity as 5 grams, while a volume stated in millilitres must not be mistaken for litres. Every measured number should have its correct unit where appropriate, and consistent conversion prevents serious interpretation errors.',
 points:['Explain the purpose of standardized SI measurement units','Link common units to valid comparison and reproducibility of observations','Emphasize accurate case-sensitive unit symbols','Explain prefixes as defined decimal scaling factors','Provide a correct, dimensionally consistent chemistry measurement conversion example']
},
'IX-CHEM-2025-C12-12T2-L01':{
 answer:'Reliable laboratory measurement depends on choosing a method and instrument appropriate to the required range and resolution, rather than relying on a large number of decimal places. Before accepting results, a teacher or qualified supervisor should ensure that an instrument is calibrated or its accuracy checked against a suitable reference. Scales should be read from the correct viewing position, using the instrument guidance, to reduce parallax and avoid recording more digits than the scale can justify. Repeating comparable observations helps reveal random variation, and averages can be useful when appropriate without concealing outliers or mistakes. Units, significant figures and observations should be recorded clearly as they are obtained. Conditions that affect measurement, such as temperature or instrument stability, also need to be kept consistent or documented. These are general measurement-quality principles, not permission to handle unfamiliar chemicals or perform an unsupervised experiment.',
 points:['Select an instrument suited to quantity range, resolution and appropriate calibration','Read the indicated scale correctly and avoid parallax or unjustified digits','Use repeated comparable observations to evaluate random variation','Record observations with correct units and appropriate significant figures','Control or document conditions that can alter the measurement']
},
'IX-CHEM-2025-C12-12T3-L01':{
 answer:'Accuracy describes how close a measured value is to a reliable reference or accepted value. Precision describes how closely repeated measurements agree with one another; results can be precise without being accurate. Systematic error is a consistent bias, for example a scale that always reads 2 grams too high, and repeated measurements do not remove that bias simply by averaging. Random error causes unpredictable scatter, such as small differences in repeated readings caused by limited resolution or ordinary variation. Consider a reference mass of 50.0 grams: repeated readings of 52.0, 52.1 and 51.9 grams are fairly precise but not accurate because they cluster around a biased value. Readings of 49.7, 50.3 and 50.0 grams scatter more but average close to the reference; that does not automatically prove the absence of a systematic bias. Accuracy, precision and error sources should be evaluated separately.',
 points:['Correctly define accuracy relative to a reliable reference value','Correctly define precision as agreement among repeated readings','Explain systematic error as persistent directional bias','Explain random error as unpredictable measurement scatter','Use a coherent numeric measurement example distinguishing precision from accuracy and error sources']
}
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)throw Error('CHEM9C12_SOURCE_SHA_DRIFT')
 let parsed
 try{parsed=JSON.parse(bytes)}catch(_){throw Error('CHEM9C12_SOURCE_SHA_DRIFT')}
 if(JSON.stringify(parsed)!==JSON.stringify(source))throw Error('CHEM9C12_SOURCE_SHA_DRIFT')
 if(source.publicationAllowed!==false||source.liveImportAllowed!==false||
  !Array.isArray(source.drafts)||source.drafts.length!==15)
   throw Error('CHEM9C12_MUST_REMAIN_PROVISIONAL')
 const identity=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!identity||identity.recordId!=='pectaa-catalog-007'||identity.grade!==9||
 identity.subject!=='Chemistry'||identity.medium!=='English'||identity.edition!=='2025-26'||
 identity.academicApproval!==false||identity.pdfSha256!==source.sourcePdfSha256)
  throw Error('CHEM9C12_CATALOG_DRIFT_OR_FALSE_APPROVAL')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==3||Object.keys(ANSWERS).length!==3)throw Error('CHEM9C12_LONG_COUNT_DRIFT')
 const seen=new Set()
 const items=longs.map(q=>{
  if(!q.id||seen.has(q.id)||!ANSWERS[q.id])throw Error('CHEM9C12_ORIGINAL_ID_COLLISION')
  seen.add(q.id)
  if(q.chapter?.number!==12||q.marks!==5||q.review?.status!=='draft'||
   q.source?.catalogRecordId!==identity.recordId||q.source?.pdfSha256!==identity.pdfSha256||
   !rubricOnlyLongAnswer('long',q.content?.en?.answer))
   throw Error('CHEM9C12_ORIGINAL_SCOPE_OR_RUBRIC_CHANGED:'+q.id)
  const draft=ANSWERS[q.id]
  if(typeof draft.answer!=='string'||draft.answer.length<280||
   rubricOnlyLongAnswer('long',draft.answer)||!Array.isArray(draft.points)||
   draft.points.length!==q.marks||new Set(draft.points).size!==q.marks||
   draft.points.some(p=>typeof p!=='string'||p.length<18))
   throw Error('CHEM9C12_INVALID_DRAFT_OR_MARKS:'+q.id)
  return {
   questionId:q.id,chapterNo:q.chapter.number,topicId:q.topicId,marks:q.marks,
   sourceQuestionSha256:hash(JSON.stringify(q)),sourceAnswerSha256:hash(q.content.en.answer),
   sourceFileSha256:PIN,catalogSourceId:identity.recordId,claimedSourcePdfSha256:identity.pdfSha256,
   originalQuestionClaimedPageUnverified:q.source.page,originalQuestionUnchanged:true,
   proposedIndependentEnglishExplanation:draft.answer,proposedDistinctMarkingPoints:draft.points,
   answerLanguage:'English',catalogLabelMediumVerified:true,
   schoolAdoptedEditionSessionVerified:false,originalPrintedExercisePageVerified:false,
   qualifiedIndependentSubjectReviewed:false,urduEquivalenceReviewed:false,
   independentReviewerId:null,approvedRevisionId:null,academicallyApproved:false,
   verifiedPublished:false,
   reviewStatus:'RESEARCH_DRAFT_REQUIRES_CH12_PHYSICAL_TEXTBOOK_AND_QUALIFIED_SUBJECT_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-chemistry9-ch12-three-original-answer-research-v1',
  originalQuestionFile:path.basename(INPUT),originalFileSha256:PIN,
  sourceCatalogId:identity.recordId,sourceCatalogMediumClaim:identity.medium,
  sourceCatalogEditionClaim:identity.edition,sourceCatalogPdfSha256:identity.pdfSha256,
  originalAuthoredResearchQuestions:source.drafts.length,
  originalRubricOnlyLongQuestions:longs.length,
  newExplanatoryAnswerResearchDrafts:items.length,newFiveMarkPointProposals:15,
  humanSchoolSourceVerified:0,qualifiedHumanAcademicReviewed:0,academicallyApproved:0,verifiedPublished:0,
  caveat:'Catalog record and preexisting page claims are not independent physical printed page, exercise, school-adopted book, or school session evidence. Research explanations and marking proposals remain unapproved.',
  items
 }
}
function markdown(d){
 return [
 '# Grade IX Chemistry Chapter 12 — three original explanatory research drafts','',
 '**Independent candidate explanations only, not new published questions.**','',
 'Original authored dataset SHA256: '+d.originalFileSha256,
 'Catalog record '+d.sourceCatalogId+'; edition claim '+d.sourceCatalogEditionClaim+'; PDF hash claim '+d.sourceCatalogPdfSha256+'.',
 'Page numbers in source candidate records are NOT independent printed-book or exercise verification.','',
 ...d.items.flatMap((x,i)=>[
  '## '+(i+1)+'. '+x.questionId+'; topic '+x.topicId+'; 5 marks','',
  x.proposedIndependentEnglishExplanation,'','**Five separate proposed one-mark criteria:**',
  ...x.proposedDistinctMarkingPoints.map((p,j)=>(j+1)+'. '+p),''
 ]),
 'Academic review/adoption/page/Urdu/signature/approval/publication all remain unverified or false.',
 'General scientific context: NIST Guide to the SI (units and symbols) https://physics.nist.gov/cuu/Units/ and NIST measurement uncertainty guidance https://www.nist.gov/pml/nist-technical-note-1297 . These are conceptual references, NOT adopted Punjab textbook/page or examination-year evidence.','',
 'No original question/old answer was overwritten, no chemical experiment procedure or laboratory directions supplied, and no Paper Studio verified question was released.',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(INPUT)
 const data=build({bytes,source:JSON.parse(bytes),registry:JSON.parse(fs.readFileSync(REGISTRY))})
 const prefix=path.join(OUTPUT,'ASSPS_CHEMISTRY9_CH12_THREE_LONG_MODEL_ANSWER_DRAFTS_20261009')
 fs.writeFileSync(prefix+'.json',JSON.stringify(data,null,2)+'\n')
 fs.writeFileSync(prefix+'.md',markdown(data))
 console.log(JSON.stringify({drafts:data.items.length,criteria:data.newFiveMarkPointProposals,approved:data.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,PIN,INPUT,REGISTRY}

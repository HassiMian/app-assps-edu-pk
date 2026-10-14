#!/usr/bin/env node
'use strict'
// Original curriculum-concept answer drafts only; no exercises, lab instructions or approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry9Chapter13EnglishDrafts2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUTPUT=path.join(ROOT,'docs/question-bank')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const PIN='c328c074b6caa9632712fa3007a7e457eac87a62e9bd5085114f35842463dc69'
const ANSWERS=Object.freeze({
'IX-CHEM-2025-C13-13T1-L01':{
 answer:'Chemical safety in a school laboratory is based on hazard awareness and clear responsibility, not students independently experimenting with unfamiliar substances. First, the information on official labels and school hazard notices explains why a substance may require special oversight. Second, chemicals belong within a controlled institutional system managed by trained staff, rather than ordinary student access. Third, preventing unplanned exposure and contamination is an essential safety objective. Fourth, protective provisions and supervised classroom rules are selected by responsible adults according to formal risk assessment; protective clothing does not make an activity automatically safe. Fifth, questions about unsafe conditions, unidentified containers or disposal are referred to qualified personnel under the institution’s safety policy. These are five general principles rather than techniques for transporting, preparing, storing or using any chemical.',
 points:['Explain that labels and hazard communication inform awareness of chemical risks','Recognize trained staff responsibility and controlled institutional chemical access','Explain exposure and contamination prevention as safety aims','Recognize supervised risk assessment and limitations of protective provisions','Connect concerns about unidentified substances or disposal to qualified staff and institutional policy']
},
'IX-CHEM-2025-C13-13T2-L01':{
 answer:'A hazard sign communicates the general nature of a potential danger through a standardized visual symbol and often a supporting label. Recognizing that a pictogram describes a category of risk helps students distinguish a warning from proof that a particular activity is harmless. Its meaning can influence a qualified teacher’s assessment of whether an activity is appropriate for a school classroom and which institutional protections are required. Such warnings also inform trained personnel that access, storage authorization and waste decisions must follow the applicable safety policy. Emergency planning uses the same hazard information to identify when expert assistance is needed. A sign alone does not establish severity, safe conditions, permissions, or an approved experimental procedure; qualified staff must also consider the full documented context.',
 points:['Define hazard signs as standardized risk-category communication','Connect a sign to supervised risk assessment rather than declaring the activity safe','Explain that qualified staff determine protective requirements from full risk information','Recognize institutional access, storage and disposal decisions as governed by hazard information','Relate pictograms to emergency preparedness while acknowledging they do not supply complete instructions']
},
'IX-CHEM-2025-C13-13T3-L01':{
 answer:'Personal protective equipment, abbreviated PPE, is one layer of laboratory risk reduction rather than a replacement for safe classroom design, qualified supervision and an approved safety policy. Different risks can affect different body areas, which is why a responsible teacher considers the purpose of a protective item before authorizing a school activity. PPE may reduce some forms of exposure, but it does not eliminate every risk and may have limits of coverage, condition, or suitability. Training and oversight are important because a protective item can create false confidence when its limitations are ignored. Students should never regard the presence of PPE as permission to handle unfamiliar or restricted laboratory materials. The strongest general lesson is that supervision, hazard awareness, institutional controls and appropriate protective provisions must work together.',
 points:['Define PPE and its purpose as one protective layer','Explain that protective needs depend on the documented class of risk','Identify PPE limitations and the absence of complete protection','Relate qualified supervision and training to suitable protective policy','State that PPE does not independently authorize risky chemical activity']
},
'IX-CHEM-2025-C13-13T4-L01':{
 answer:'A school laboratory prepares learners for emergencies through clear safety education overseen by trained adults, rather than by expecting students to improvise with equipment. Students should know who the responsible teacher is, how to recognize official emergency information and why access routes and safety resources must remain unobstructed. Age-appropriate orientation explains the purpose and limitations of emergency equipment without requiring unsupervised student operation. Teacher-led demonstrations or institutional drills can check that students understand directions and know when to seek professional assistance. A consistent reporting culture makes students more likely to flag a concern promptly. These arrangements are part of school-level readiness; the detailed operation of emergency devices and response to particular hazardous chemicals belongs to trained personnel and official procedures.',
 points:['Identify the responsible teacher and official laboratory safety information','Explain the importance of recognizable safety resources and clear access','Distinguish basic purpose-awareness from independent equipment operation','Describe qualified teacher-led orientation or authorized drills as learning supports','Explain timely reporting and escalation as part of an effective safety culture']
},
'IX-CHEM-2025-C13-13T5-L01':{
 answer:'A general school laboratory emergency plan emphasizes protecting people and involving qualified help without presuming the kind of incident or material involved. The first principle is to avoid escalating a potentially unsafe situation or continuing an activity when a serious concern is noticed. The second is prompt communication with the responsible teacher or appropriate school authority. Third, available hazard information and the school emergency plan help trained responders assess what specialist assistance is needed. Fourth, response equipment or medical decisions must remain with authorized personnel following official procedures; a student should not improvise a response to an unidentified hazard. Finally, after immediate safety concerns have been addressed by qualified staff, the school records and reviews the incident to improve prevention. These are conceptual responsibilities, not an instruction sequence for managing dangerous substances.',
 points:['Emphasize not escalating a hazardous situation or continuing unsafe activity','Recognize timely notification of a responsible teacher or school authority','Connect hazard information with the institutional emergency plan','Assign specialist emergency decisions and equipment operation to authorized trained personnel','Explain later documentation and preventive review after safety is restored']
}
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)throw Error('CHEM9C13_SOURCE_SHA_DRIFT')
 let parsed
 try{parsed=JSON.parse(bytes)}catch(_){throw Error('CHEM9C13_SOURCE_SHA_DRIFT')}
 if(JSON.stringify(parsed)!==JSON.stringify(source))throw Error('CHEM9C13_SOURCE_SHA_DRIFT')
 if(source.publicationAllowed!==false||source.liveImportAllowed!==false||
  !Array.isArray(source.drafts)||source.drafts.length!==25)
   throw Error('CHEM9C13_MUST_REMAIN_PROVISIONAL')
 const identity=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!identity||identity.recordId!=='pectaa-catalog-007'||identity.grade!==9||
 identity.subject!=='Chemistry'||identity.medium!=='English'||identity.edition!=='2025-26'||
 identity.academicApproval!==false||identity.pdfSha256!==source.sourcePdfSha256)
  throw Error('CHEM9C13_CATALOG_DRIFT_OR_FALSE_APPROVAL')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==5||Object.keys(ANSWERS).length!==5)throw Error('CHEM9C13_LONG_COUNT_DRIFT')
 const seen=new Set()
 const items=longs.map(q=>{
  if(!q.id||seen.has(q.id)||!ANSWERS[q.id])throw Error('CHEM9C13_ORIGINAL_ID_COLLISION')
  seen.add(q.id)
  if(q.chapter?.number!==13||q.marks!==5||q.review?.status!=='draft'||
   q.source?.catalogRecordId!==identity.recordId||q.source?.pdfSha256!==identity.pdfSha256||
   !rubricOnlyLongAnswer('long',q.content?.en?.answer))
   throw Error('CHEM9C13_ORIGINAL_SCOPE_OR_RUBRIC_CHANGED:'+q.id)
  const draft=ANSWERS[q.id]
  if(typeof draft.answer!=='string'||draft.answer.length<280||
   rubricOnlyLongAnswer('long',draft.answer)||!Array.isArray(draft.points)||
   draft.points.length!==q.marks||new Set(draft.points).size!==q.marks||
   draft.points.some(p=>typeof p!=='string'||p.length<18))
   throw Error('CHEM9C13_INVALID_DRAFT_OR_MARKS:'+q.id)
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
   reviewStatus:'RESEARCH_DRAFT_REQUIRES_CH13_PHYSICAL_TEXTBOOK_AND_QUALIFIED_SUBJECT_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-chemistry9-ch13-five-original-safety-answer-research-v1',
  originalQuestionFile:path.basename(INPUT),originalFileSha256:PIN,
  sourceCatalogId:identity.recordId,sourceCatalogMediumClaim:identity.medium,
  sourceCatalogEditionClaim:identity.edition,sourceCatalogPdfSha256:identity.pdfSha256,
  originalAuthoredResearchQuestions:source.drafts.length,
  originalRubricOnlyLongQuestions:longs.length,
  newExplanatoryAnswerResearchDrafts:items.length,newFiveMarkPointProposals:25,
  humanSchoolSourceVerified:0,qualifiedHumanAcademicReviewed:0,academicallyApproved:0,verifiedPublished:0,
  caveat:'Catalog record and preexisting page claims are not independent physical printed page, exercise, school-adopted book, or school session evidence. Research explanations and marking proposals remain unapproved.',
  items
 }
}
function markdown(d){
 return [
 '# Grade IX Chemistry Chapter 13 — five original explanatory research drafts','',
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
 'General safety education context; no chemical-handling or emergency-equipment operation procedures are supplied. These are conceptual references, NOT adopted Punjab textbook/page or examination-year evidence.','',
 'No original question/old answer was overwritten, no chemical experiment procedure or laboratory directions supplied, and no Paper Studio verified question was released.',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(INPUT)
 const data=build({bytes,source:JSON.parse(bytes),registry:JSON.parse(fs.readFileSync(REGISTRY))})
 const prefix=path.join(OUTPUT,'ASSPS_CHEMISTRY9_CH13_FIVE_LONG_MODEL_ANSWER_DRAFTS_20261009')
 fs.writeFileSync(prefix+'.json',JSON.stringify(data,null,2)+'\n')
 fs.writeFileSync(prefix+'.md',markdown(data))
 console.log(JSON.stringify({drafts:data.items.length,criteria:data.newFiveMarkPointProposals,approved:data.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,PIN,INPUT,REGISTRY}

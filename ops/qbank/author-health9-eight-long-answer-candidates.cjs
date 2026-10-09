#!/usr/bin/env node
'use strict'
// Pure original answer proposals. No textbook adoption, academic approval or production writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/healthSciences9TechStarter2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUTPUT=path.join(ROOT,'docs/question-bank')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const PIN='03990ab80d396a47b45e4e0064712a5f1de4c15ab245a1f8225733e2750ea0dc'
const ANSWERS=Object.freeze({
'IX-HS-C01-L01':{
 answer:'Health sciences combine knowledge about the human body, disease prevention, community conditions and professional care to improve well-being. Prevention includes measures that reduce exposure to avoidable health risks and make everyday settings safer. Healthcare services provide appropriate assessment, support and treatment through trained personnel, and timely access can improve outcomes. Public-health indicators, such as patterns of illness or access to safe water, help communities understand broad needs and evaluate services without identifying private patient information. Different professionals contribute through clinical care, laboratory work, education, research and community outreach within their training. Cooperation between these roles supports evidence-informed decisions, access to care and healthier conditions for the population, not merely treatment after someone becomes ill.',
 points:['Explain preventive health measures','Identify appropriate healthcare services','Define a meaningful population health indicator','Describe trained health professions','Respect confidential patient information and scope of practice']},
'IX-HS-C02-L01':{
 answer:'The gastrointestinal system receives food, breaks it down into smaller components and absorbs many useful nutrients and water. The mouth and stomach contribute to processing and digestion, while the small intestine is the main site for absorbing digested nutrients. The large intestine absorbs additional water and helps form waste for elimination. Supporting public health also means reducing exposure to infections carried by unsafe food or water. Access to clean drinking water, careful food hygiene and regular handwashing are broad prevention principles. Shared food-preparation areas should be kept clean, and anyone seriously unwell should obtain appropriate professional advice rather than relying on unverified remedies. These measures explain how normal digestive function and safer environments both contribute to community well-being.',
 points:['Explain digestion and food processing','Describe nutrient absorption in the small intestine','Describe large-intestine water recovery and waste formation','Identify safe water and food-hygiene principles','Identify hand hygiene and appropriate professional assessment']},
'IX-HS-C03-L01':{
 answer:'The respiratory system moves air into and out of the lungs and allows gases to be exchanged between the air and blood. Oxygen reaches the blood through tiny air sacs called alveoli, while carbon dioxide leaves the blood to be exhaled. Healthy breathing also depends on the quality of the surrounding air and the body’s defenses against infection. Reducing exposure to smoke, vaping aerosols and avoidable air pollutants is an important prevention principle. Respiratory hygiene and vaccination when recommended by qualified health professionals can help reduce some infectious risks. Persistent or severe breathing problems require timely medical assessment. These are broad protective principles, not a substitute for diagnosis or individual treatment advice.',
 points:['Describe ventilation and air movement','Describe oxygen and carbon-dioxide exchange','Identify alveoli and blood relationship','Explain avoiding smoke/vape exposure and airborne irritants','Discuss respiratory hygiene, appropriate vaccination and medical assessment']},
'IX-HS-C04-L01':{
 answer:'The circulatory system transports materials between organs and body tissues. The heart acts as a muscular pump that maintains blood flow through a connected network of vessels. Arteries usually carry blood away from the heart, veins return it toward the heart, and capillaries allow exchange of substances with nearby cells. Blood carries oxygen and many nutrients to tissues and transports carbon dioxide and other waste products toward organs that process or remove them. Circulation also helps distribute hormones and regulate body temperature. The pulmonary circuit moves blood between the heart and lungs for gas exchange, while the systemic circuit supplies other tissues. The system depends on coordinated pumping, transport and exchange rather than one organ acting alone.',
 points:['Describe heart as a blood pump','Differentiate arteries, veins and capillary roles','Describe oxygen and nutrient delivery','Explain carbon dioxide and waste transport','Distinguish pulmonary and systemic circulation']},
'IX-HS-C05-L01':{
 answer:'The urinary system helps maintain internal balance by removing selected waste products and regulating the amount and composition of body fluids. Blood passes through the kidneys, where filtration and additional processing contribute to the formation of urine. The kidneys adjust the water and electrolyte content of the fluid returned to circulation according to the body’s needs. Urine then travels through the ureters to the bladder, where it is stored until released through the urethra. These functions contribute to stable conditions for cells and help remove products of normal metabolism. Symptoms that may indicate urinary illness need evaluation by a qualified healthcare professional rather than assumptions based on a single observation. Good health education emphasizes function, privacy and professional assessment.',
 points:['Explain kidney filtration and urine formation','Describe waste removal from blood','Explain water and electrolyte regulation','Identify ureters, bladder and urethra','Recognize need for appropriate professional assessment']},
'IX-HS-C06-L01':{
 answer:'A responsible first-aid response begins by recognizing that the safety of the scene, the affected person and the helper all matter. A student should alert a trusted adult or an appropriate emergency service promptly rather than attempting actions beyond their training. Calm, respectful communication can help the person understand that assistance has been requested. An untrained bystander should avoid unnecessary movement, giving substances or performing unfamiliar procedures that might create additional risk. The helper should follow instructions from qualified responders and share simple relevant observations when help arrives. School policies, access to professional assistance and supervised first-aid education are important safeguards. These principles describe responsibility and escalation without teaching treatment procedures.',
 points:['Check safety of the environment and people','Contact trusted adults or emergency responders','Stay calm and communicate reassurance','Avoid untrained treatment or unnecessary movement','Follow qualified responders and provide relevant observations']},
'IX-HS-C07-L01':{
 answer:'Regular age-appropriate movement can support cardiovascular health by helping the heart and lungs work effectively during everyday activities. A variety of moderate physical activities also develops strength, coordination, balance and flexibility needed for comfortable movement. Being active can help with concentration, mood, sleep and social connection when activities are enjoyable and inclusive. Safety depends on suitable supervision, learning appropriate technique and recognizing the value of rest and recovery. Activities should be adapted for different abilities and individual health needs, with professional advice where medically appropriate. Physical education should encourage participation and well-being, not extreme exertion, body comparison or competition over appearance. Long-term healthy habits matter more than a single difficult performance.',
 points:['Explain cardiovascular or respiratory benefits','Explain strength, coordination or mobility','Describe mental and social well-being','Explain supervision, safe technique and recovery','Promote inclusive age-appropriate participation without appearance goals']},
'IX-HS-C08-L01':{
 answer:'Adolescence involves growth, learning and changing daily activities, so the body benefits from a sufficient and varied supply of food and fluids. Carbohydrates and fats can provide energy, while protein supports the growth and repair of tissues. Vitamins and minerals contribute to many functions, including maintaining healthy bones, blood and normal metabolism. Water helps regulate temperature and transport substances within the body. Eating a range of foods through regular, balanced meals can make it easier to obtain different nutrients without relying on one supposedly perfect food. Needs can vary with age, activity, health conditions and access to foods, and personalized concerns should be discussed with an appropriate healthcare professional. Good nutrition is about supporting health and development rather than restrictive dieting, weight targets or appearance ideals.',
 points:['Describe adequate energy for growth and daily activity','Explain protein and tissue maintenance','Explain roles of vitamins and minerals','Describe hydration and fluid functions','Support varied regular eating without restrictive or appearance goals']}
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)throw Error('HS9_SOURCE_SHA_CHANGED')
 let saved
 try{saved=JSON.parse(bytes)}catch(_){throw Error('HS9_SOURCE_SHA_CHANGED')}
 if(JSON.stringify(saved)!==JSON.stringify(source))throw Error('HS9_SOURCE_SHA_CHANGED')
 if(!Array.isArray(source?.drafts)||source.drafts.length!==40||
   source.publicationAllowed!==false||source.liveImportAllowed!==false)
  throw Error('HS9_NOT_PROVISIONAL_SOURCE')
 const identity=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!identity||identity.recordId!=='pectaa-catalog-044'||
   identity.pdfSha256!==source.sourcePdfSha256||
   Number(identity.grade)!==9||identity.subject!=='Health Sciences-Tech'||
   identity.medium!=='UNSPECIFIED_BY_CATALOG_LABEL'||
   identity.edition!=='CURRENT_CATALOG_LABEL_NO_SESSION'||
   identity.academicApproval!==false)
  throw Error('HS9_UNVERIFIED_CATALOG_IDENTITY_DRIFT')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==8||Object.keys(ANSWERS).length!==8)
  throw Error('HS9_LONG_COVERAGE_DRIFT')
 const seen=new Set()
 const items=longs.map(q=>{
  if(!q.id||seen.has(q.id)||!ANSWERS[q.id])throw Error('HS9_ORIGINAL_ID_MISSING_DUPLICATE')
  seen.add(q.id)
  if(q.marks!==5||q.source?.catalogRecordId!==identity.recordId||
   q.source?.pdfSha256!==identity.pdfSha256||
   !rubricOnlyLongAnswer(q.type,q.content?.en?.answer))
    throw Error('HS9_ORIGINAL_LONG_ANSWER_NOT_RUBRIC_ONLY:'+q.id)
  const draft=ANSWERS[q.id]
  if(typeof draft.answer!=='string'||draft.answer.length<250||
    rubricOnlyLongAnswer('long',draft.answer)||
    !Array.isArray(draft.points)||draft.points.length!==5||
    new Set(draft.points).size!==5||
    draft.points.some(p=>typeof p!=='string'||p.length<18))
    throw Error('HS9_INCOMPLETE_AUTHORING_PROPOSAL:'+q.id)
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
   verifiedPublished:false,reviewStatus:'RESEARCH_DRAFT_REQUIRES_HEALTH_IX_SCHOOL_ADOPTION_AND_QUALIFIED_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-healthsciences9-eight-model-answer-research-v1',
  originalQuestionFile:'healthSciences9TechStarter2026.json',originalFileSha256:PIN,
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
  '# ASSPS Grade IX Health Sciences Technology — eight new original explanatory answer drafts','',
  '**Research proposals only; no approved English-medium adoption, textbook physical-page review or independent teacher approval.**','',
  `Existing ${d.originalAuthoredResearchQuestions} original candidate questions: all ${d.originalRubricOnlyLongQuestions} long answers previously contained rubric-only text. Eight separately authored explanations and ${d.newFiveMarkPointProposals} new distinct marking criteria. Original source SHA-256: \`${d.originalFileSha256}\`.`,'',
  '**Catalog medium is UNSPECIFIED_BY_CATALOG_LABEL and edition is CURRENT_CATALOG_LABEL_NO_SESSION: independently authored English drafts do not prove school adoption or textbook page.**','',
  ...d.items.flatMap(x=>[
   `### ${x.questionId} — Chapter ${x.chapterNo} · ${x.topicId}`,'',
   x.proposedIndependentEnglishExplanation,'',
   '**Separately proposed five-mark marking criteria:** '+x.proposedDistinctMarkingPoints.join(' · '),''
  ]),
  '## Required independent academic actions','',
  'Verify actual ASSPS-approved subject, textbook edition, academic session/exam year, language medium and physical printed chapter/exercise page; obtain qualified Health Sciences IX reviewer answer-and-mark signoff and appropriate Urdu-equivalence review. Create a new immutable question revision only after correction; a different authorized reviewer must sign that exact revision. Paper Studio verified selector remains empty pending SaaS Core certification.','',
  '**Human source/page verified 0; independently academic reviewed 0; approved 0; published 0. No production deployment.**',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(SOURCE),source=JSON.parse(bytes)
 const registry=JSON.parse(fs.readFileSync(REGISTRY))
 const d=build({bytes,source,registry})
 fs.writeFileSync(path.join(OUTPUT,'ASSPS_HEALTH9_EIGHT_LONG_MODEL_ANSWER_DRAFTS_20261009.json'),JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(path.join(OUTPUT,'ASSPS_HEALTH9_EIGHT_LONG_MODEL_ANSWER_DRAFTS_20261009.md'),markdown(d))
 console.log(JSON.stringify({original:d.originalAuthoredResearchQuestions,answers:d.newExplanatoryAnswerResearchDrafts,markingPoints:d.newFiveMarkPointProposals,schoolAdopted:d.humanSchoolSourceVerified,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,PIN}

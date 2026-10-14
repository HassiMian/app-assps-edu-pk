#!/usr/bin/env node
'use strict'
// Pure original answer proposals. No textbook adoption, academic approval or production writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry9Chapter10EnglishDrafts2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUTPUT=path.join(ROOT,'docs/question-bank')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const PIN='c61a997c4da221578b2e3a0c38ac2c02aeab7d72a615be97ccd6250f10a52655'
const ANSWERS=Object.freeze({
'IX-CHEM-2025-C10-T1-01L':{
 answer:'Earth’s lower atmosphere is a mixture of gases rather than a single pure substance. In dry air, nitrogen makes up approximately 78 percent by volume, oxygen about 21 percent, and smaller amounts include argon, carbon dioxide and other trace gases. Water vapour varies considerably with weather and location. Oxygen is important for aerobic respiration in many organisms and participates in numerous chemical reactions. Nitrogen is an essential element in proteins and genetic material, but most organisms cannot use atmospheric nitrogen gas directly without processes in the nitrogen cycle. Carbon dioxide provides a carbon source for photosynthesis and contributes to the natural greenhouse effect. The atmosphere also helps distribute energy and water around Earth, so even minor components can have important effects.',
 points:['Identify nitrogen as the largest dry-air component','Identify oxygen as the second-largest gas','Distinguish argon, carbon dioxide, other traces and variable water vapour','Explain oxygen in biological respiration','Explain nitrogen-cycle or carbon-dioxide photosynthesis/greenhouse relevance']},
'IX-CHEM-2025-C10-T1-02L':{
 answer:'Different gases in the atmosphere contribute to linked biological and environmental systems. Oxygen is taken up during aerobic cellular respiration, which helps many cells transfer energy from nutrients to usable forms. Carbon dioxide is taken up by photosynthetic plants, algae and some microorganisms when they form organic compounds using light energy. Atmospheric nitrogen is abundant, but biological access to it depends on fixation and other transformations in the nitrogen cycle, rather than direct use of nitrogen gas by most organisms. In the environment, carbon dioxide, water vapour and some other gases absorb and re-emit infrared radiation, producing the natural greenhouse effect. Human-caused changes in greenhouse-gas concentrations can strengthen warming. These examples show why the atmosphere must be understood as a connected system.',
 points:['Correct oxygen and aerobic respiration link','Correct carbon dioxide and photosynthesis link','Explain nitrogen fixation and biological nitrogen availability','Explain atmospheric greenhouse-gas infrared role','Relate gas cycles and environmental changes without conflating processes']},
'IX-CHEM-2025-C10-T2-01L':{
 answer:'Air pollutants include gases and suspended particles that are present at levels capable of harming health or the environment. Fine particulate matter can enter the respiratory system and contributes to health risks, while nitrogen oxides and ground-level ozone can irritate airways. Sulphur dioxide is another important pollutant associated with some fuel combustion and industrial sources. Pollutants may reduce visibility, damage vegetation or contribute to changes in ecosystems and buildings. Some pollutants also take part in atmospheric reactions that form secondary pollution, such as ground-level ozone or acidic deposition. The severity of an effect depends on concentration, duration of exposure and individual circumstances. Reducing emissions and monitoring ambient air quality help protect communities.',
 points:['Identify meaningful gaseous and particulate pollutants','Explain a source or exposure route','Describe respiratory or other human health risks','Identify ecosystem, visibility or material effects','Explain emissions control and monitoring as prevention']},
'IX-CHEM-2025-C10-T2-02L':{
 answer:'Gaseous air pollutants are individual gases dispersed through air, while particulate pollution consists of very small solid particles or liquid droplets suspended in air. Examples of gases include nitrogen dioxide and sulphur dioxide, which may be released from combustion or industrial activities and can irritate respiratory systems or participate in acid-deposition chemistry. Fine particles can arise from dust, combustion and some secondary atmospheric reactions, and high levels can impair air quality and visibility. Both categories may coexist and affect the same communities, but their sources, measurement and control requirements can differ. At a policy level, cleaner transport, lower-emission equipment and good air-quality monitoring can reduce pollution-related exposure.',
 points:['Distinguish gas from suspended particulate matter','Give appropriate gaseous pollutant and source','Explain a relevant gaseous pollutant effect','Give particulate pollutant source and health/visibility effect','Identify suitable broad emissions-control or monitoring measures']},
'IX-CHEM-2025-C10-T3-01L':{
 answer:'Acid deposition occurs when certain air pollutants undergo atmospheric reactions and contribute to acidic precipitation or particles. Sulphur dioxide and nitrogen oxides from various combustion-related sources can be transformed in the atmosphere into sulphuric and nitric acid species. These substances can reach land and water through rain or other deposition. Acid deposition may alter the chemistry of lakes and soils, affecting organisms and the availability of some nutrients. It can also accelerate weathering and corrosion of sensitive building materials. Unpolluted rain is naturally somewhat acidic because dissolved carbon dioxide forms weak carbonic acid, so this background condition should not be confused with stronger pollution-related acid deposition. Reducing the precursor emissions addresses the source of the problem.',
 points:['Identify sulphur dioxide and nitrogen oxide precursors','Describe atmospheric conversion to acidic species','Describe wet or dry deposition','Explain harm to soils or freshwater ecosystems','Explain material damage and distinguish natural weak rain acidity']},
'IX-CHEM-2025-C10-T3-02L':{
 answer:'Reducing acid deposition requires limiting atmospheric emissions of the substances from which it forms, particularly sulphur dioxide and nitrogen oxides. At the planning level, use of appropriately regulated lower-emission energy systems can reduce the amount of precursor pollution entering the air. Industrial and power-generation emission controls can further reduce relevant gases when systems are professionally designed and operated. Cleaner transport policies and improved vehicle emissions standards can also contribute to reducing nitrogen oxide exposure. Reliable air monitoring and enforcement help determine whether measures are effective. Because air pollutants can travel across boundaries, cooperation between regions may be needed. These are policy and scientific principles, not instructions for handling reactive chemicals or operating industrial equipment.',
 points:['Identify precursor emissions to target','Explain broad lower-emission energy measures','Describe professional emissions-control role','Discuss transport/vehicle emission policy','Include monitoring and regional cooperation']},
'IX-CHEM-2025-C10-T4-01L':{
 answer:'The natural greenhouse effect helps keep Earth warm enough for many forms of life. Sunlight reaches the surface, which absorbs energy and emits infrared radiation. Greenhouse gases including water vapour, carbon dioxide and methane absorb and re-emit some infrared radiation, changing the rate at which energy escapes to space. When human activity increases the concentrations of long-lived greenhouse gases, the energy balance changes and the planet can warm over time. Potential consequences include changes in rainfall patterns, heat extremes, melting ice and associated sea-level rise. Actual impacts vary by region and depend on multiple interacting processes. Greenhouse warming is not identical to local air pollution or an immediate rise in temperature whenever a gas is released.',
 points:['Identify relevant greenhouse gases','Describe surface absorption and infrared emission','Explain absorption/re-emission and natural greenhouse effect','Connect increased gas concentrations with enhanced warming','Identify two climate impacts or qualified regional uncertainties']},
'IX-CHEM-2025-C10-T4-02L':{
 answer:'Burning fossil fuels transfers carbon that was stored underground into the atmosphere, much of it as carbon dioxide, which can increase the enhanced greenhouse effect. Deforestation can release carbon stored in vegetation and soils and also reduce the ability of growing forests to take carbon dioxide out of the atmosphere through photosynthesis. These processes affect the carbon cycle and can contribute to long-term climate change. Mitigation refers to limiting the causes of additional warming, for example improving energy efficiency, expanding appropriate low-emission energy supplies and protecting or restoring ecosystems. Such measures need to be evaluated for local social, economic and environmental impacts as well as their climate benefits. A complete explanation distinguishes the carbon source from changes in natural carbon uptake.',
 points:['Explain fossil-fuel carbon dioxide emissions','Explain carbon stores released through deforestation','Describe reduced photosynthetic carbon uptake','Link changing greenhouse-gas concentrations to warming','Identify responsible mitigation and contextual trade-offs']},
'IX-CHEM-2025-C10-T5-01L':{
 answer:'Reducing environmental pollution works best when prevention is combined with reliable measurement and community cooperation. Broad strategies include reducing avoidable emissions from transport and energy systems, maintaining sound waste collection and management, protecting rivers from untreated waste and preventing unnecessary release of harmful materials. Cleaner technologies may reduce pollution at its source, while well-designed public transport and efficient buildings can help lower fuel demand. Public education and clear environmental rules support appropriate everyday choices and accountability. Monitoring water and air quality allows authorities to compare observed results with applicable standards and adjust policies. No single measure solves every type of pollution, so priorities should reflect local health risks, affordability, resources and environmental conditions.',
 points:['Discuss lower-emission transport and energy','Explain responsible waste collection/management','Include protection of water resources','Discuss environmental rules and community education','Relate monitoring and local context to effectiveness']},
'IX-CHEM-2025-C10-T5-02L':{
 answer:'Technology and personal or community choices can reinforce each other when addressing environmental problems. Cleaner energy generation, efficient lighting and lower-emission transport systems can reduce pollution associated with some everyday activities. However, the benefits depend on how people use services, where energy comes from and whether equipment is maintained responsibly. Choosing shared transport when appropriate, avoiding unnecessary energy waste and supporting responsible collection of discarded materials can complement broader engineering measures. Habitat protection and scientifically appropriate planting or restoration programmes may help ecosystems, but they do not replace reductions in major pollution sources. Public institutions can use monitoring data and transparent communication to improve policies. A successful strategy combines technology, everyday behaviour, fair access and evaluation of real environmental outcomes.',
 points:['Identify suitable cleaner technologies','Explain energy or transport user choices','Describe waste/resource conservation behaviour','Discuss ecosystem protection with realistic limits','Explain integrated monitoring, policy and practical evaluation']}
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)throw Error('CHEM9C10_SOURCE_SHA_CHANGED')
 let saved
 try{saved=JSON.parse(bytes)}catch(_){throw Error('CHEM9C10_SOURCE_SHA_CHANGED')}
 if(JSON.stringify(saved)!==JSON.stringify(source))throw Error('CHEM9C10_SOURCE_SHA_CHANGED')
 if(!Array.isArray(source?.drafts)||source.drafts.length!==30||
   source.publicationAllowed!==false||source.liveImportAllowed!==false)
  throw Error('CHEM9C10_NOT_PROVISIONAL_SOURCE')
 const identity=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!identity||identity.recordId!=='pectaa-catalog-007'||
   identity.pdfSha256!==source.sourcePdfSha256||
   Number(identity.grade)!==9||identity.subject!=='Chemistry'||
   identity.medium!=='English'||
   identity.edition!=='2025-26'||
   identity.academicApproval!==false)
  throw Error('CHEM9C10_UNVERIFIED_CATALOG_IDENTITY_DRIFT')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==10||Object.keys(ANSWERS).length!==10)
  throw Error('CHEM9C10_LONG_COVERAGE_DRIFT')
 const seen=new Set()
 const items=longs.map(q=>{
  if(!q.id||seen.has(q.id)||!ANSWERS[q.id])throw Error('CHEM9C10_ORIGINAL_ID_MISSING_DUPLICATE')
  seen.add(q.id)
  if(q.marks!==5||q.source?.catalogRecordId!==identity.recordId||
   q.source?.pdfSha256!==identity.pdfSha256||
   !rubricOnlyLongAnswer(q.type,q.content?.en?.answer))
    throw Error('CHEM9C10_ORIGINAL_LONG_ANSWER_NOT_RUBRIC_ONLY:'+q.id)
  const draft=ANSWERS[q.id]
  if(typeof draft.answer!=='string'||draft.answer.length<250||
    rubricOnlyLongAnswer('long',draft.answer)||
    !Array.isArray(draft.points)||draft.points.length!==5||
    new Set(draft.points).size!==5||
    draft.points.some(p=>typeof p!=='string'||p.length<18))
    throw Error('CHEM9C10_INCOMPLETE_AUTHORING_PROPOSAL:'+q.id)
  return {
   questionId:q.id,chapterNo:q.chapter?.number,topicId:q.topicId,marks:q.marks,
   sourceQuestionSha256:hash(JSON.stringify(q)),
   sourceAnswerSha256:hash(q.content.en.answer),sourceFileSha256:PIN,
   catalogSourceId:identity.recordId,claimedSourcePdfSha256:identity.pdfSha256,
   originalQuestionUnchanged:true,
   proposedIndependentEnglishExplanation:draft.answer,
   proposedDistinctMarkingPoints:draft.points,
   answerLanguage:'English',catalogLabelMediumVerified:true,
   schoolAdoptedEditionSessionVerified:false,originalPrintedExercisePageVerified:false,
   qualifiedIndependentSubjectReviewed:false,urduEquivalenceReviewed:false,
   independentReviewerId:null,approvedRevisionId:null,academicallyApproved:false,
   verifiedPublished:false,reviewStatus:'RESEARCH_DRAFT_REQUIRES_CHEMISTRY_IX_CH10_SOURCE_AND_SUBJECT_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-chemistry9-chapter10-ten-model-answer-research-v1',
  originalQuestionFile:'chemistry9Chapter10EnglishDrafts2026.json',originalFileSha256:PIN,
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
  '# ASSPS Grade IX Chemistry Chapter 10 — ten new original environmental-science explanatory drafts','',
  '**Research proposals only; no approved English-medium adoption, textbook physical-page review or independent teacher approval.**','',
  `Existing ${d.originalAuthoredResearchQuestions} original candidate questions: all ${d.originalRubricOnlyLongQuestions} long answers previously contained rubric-only text. Ten separately authored explanations and ${d.newFiveMarkPointProposals} new distinct marking criteria. Original source SHA-256: \`${d.originalFileSha256}\`.`,'',
  '**Catalog medium is English and edition label 2025-26 but official catalog academicApproval remains false; this does not certify the actual ASSPS adoption/session, textbook physical page or exercise.**','',
  ...d.items.flatMap(x=>[
   `### ${x.questionId} — Chapter ${x.chapterNo} · ${x.topicId}`,'',
   x.proposedIndependentEnglishExplanation,'',
   '**Separately proposed five-mark marking criteria:** '+x.proposedDistinctMarkingPoints.join(' · '),''
  ]),
  '## Required independent academic actions','',
  'Verify actual ASSPS-approved subject, textbook edition, academic session/exam year, language medium and physical printed chapter/exercise page; obtain qualified Chemistry IX teacher answer-and-mark signoff and appropriate Urdu-equivalence review. Create a new immutable question revision only after correction; a different authorized reviewer must sign that exact revision. Paper Studio verified selector remains empty pending SaaS Core certification.','',
  '**Human source/page verified 0; independently academic reviewed 0; approved 0; published 0. No production deployment.**',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(SOURCE),source=JSON.parse(bytes)
 const registry=JSON.parse(fs.readFileSync(REGISTRY))
 const d=build({bytes,source,registry})
 fs.writeFileSync(path.join(OUTPUT,'ASSPS_CHEMISTRY9_CH10_TEN_LONG_MODEL_ANSWER_DRAFTS_20261009.json'),JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(path.join(OUTPUT,'ASSPS_CHEMISTRY9_CH10_TEN_LONG_MODEL_ANSWER_DRAFTS_20261009.md'),markdown(d))
 console.log(JSON.stringify({original:d.originalAuthoredResearchQuestions,answers:d.newExplanatoryAnswerResearchDrafts,markingPoints:d.newFiveMarkPointProposals,schoolAdopted:d.humanSchoolSourceVerified,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,PIN}

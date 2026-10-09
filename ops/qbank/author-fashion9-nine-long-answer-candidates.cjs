#!/usr/bin/env node
'use strict'
// Pure original answer proposals. No textbook adoption, academic approval or production writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/fashionDesigning9TechStarter2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUTPUT=path.join(ROOT,'docs/question-bank')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const PIN='6316e7da32f11a19f7b1b3a0d9092753e3968ed0b5349150c590c786cb466f04'
const ANSWERS=Object.freeze({
'IX-FASH-C01-L01':{
 answer:'Fashion choices arise from the relationship between culture, practical activities, economic circumstances and individual expression. Local traditions can influence familiar fabrics, colours, motifs and occasions for particular garments, but no tradition dictates a single acceptable design for everyone. Lifestyle concerns include climate, mobility, comfort, care needs, school or workplace requirements and the activities for which an item is intended. A market segment identifies a group of customers with related needs, budgets or preferences, helping a designer plan appropriate materials and availability. Personal identity is expressed through chosen colours, details and styles without implying that any physical appearance is superior. A thoughtful designer researches the context, listens to intended users, respects cultural references and makes original decisions that balance function, affordability, accessibility and expression.',
 points:['Define cultural influences without stereotypes','Explain climate or daily activity requirements','Identify market segments as practical customer needs','Account for economic affordability and availability','Describe individual expression without appearance judgments','Include comfort, accessibility and intended use','Explain respectful context-based original design choices']},
'IX-FASH-C02-L01':{
 answer:'Line, shape, colour and texture are visual design elements that communicate how an item looks and feels. Lines can guide the eye toward seams, edges or printed details and help organize a layout. Shapes describe the outlines and arrangements of garment pieces rather than a judgment about the wearer. Colour combinations influence clarity, mood and the visibility of design details; suitable contrast can also make labels or functional features easier to understand. Texture relates to the visual or tactile quality of a material, from smooth to visibly woven surfaces. A designer may combine simple structural lines with a clear colour grouping and a textured fabric panel to make an intended feature easy to recognize. Successful combinations serve the garment’s purpose, user comfort and the communication of the design concept.',
 points:['Explain lines as directional or structural detail','Identify garment shape and arrangement','Describe colour and contrast for communication','Define visual or tactile texture','Relate multiple elements coherently','Include function, clarity and material suitability','Present a neutral original example without judging bodies']},
'IX-FASH-C03-L01':{
 answer:'Design principles provide a way to discuss whether a garment or illustration communicates its intended idea clearly. Balance concerns how visual attention is distributed across the composition and need not require identical left and right sides. Rhythm comes from recurring or gradually changing lines, shapes or colours that guide attention. Proportion compares the relative sizes of design elements, such as pockets and panels, in relation to the overall item, not the value of anyone’s body. Emphasis makes an important feature recognizable, while unity ensures that parts belong to a coherent design. A designer can review these principles alongside safety, durability, ease of movement and user feedback. Different solutions may be valid for different functions and cultural contexts.',
 points:['Define visual balance','Explain rhythm through repetition or progression','Describe proportion of garment or visual elements','Explain emphasis and focal detail','Define unity of the design','Use an original garment-based example','Evaluate practicality and user needs without body comparisons']},
'IX-FASH-C04-L01':{
 answer:'Historic clothing and ornament can provide evidence about the environments, technologies and social practices of earlier communities. Studying regional civilizations involves examining reliable museum records, surviving textiles, archaeological descriptions, paintings and documented craft traditions rather than guessing how everyone dressed. Materials such as cotton, wool and locally available dyes were influenced by climate, resources and trade, while decoration might communicate an occasion, craft technique or community identity. Researchers should identify the time and place of each example and acknowledge that social groups within one region may have differed. Contemporary designers can study weave structures, broad patterns or approaches to decoration as inspiration while producing their own original work. Respectful interpretation gives appropriate credit and avoids presenting a modern invention as an authentic historical garment.',
 points:['Identify credible historical source types','Consider historical period and regional context','Connect available textiles to resources and climate','Describe ornament or craft as cultural evidence','Avoid generalizing all communities as identical','Credit traditional makers and documented sources','Distinguish original contemporary design from historical reconstruction']},
'IX-FASH-C05-L01':{
 answer:'Regional crafts can inspire original fashion design through careful study of the communities, materials and skills from which those crafts developed. A designer can consult reliable descriptions, craft practitioners or authorized visual references to understand the meaning of repeated motifs, weaving techniques or embroidery patterns. Attribution matters because these traditions have creators and communities, not merely decorative symbols available without context. The designer may select a broad design principle, such as geometric repetition, and develop a new arrangement that fits a different purpose or product. Sensitive or ceremonial motifs should be treated cautiously and not misrepresented as an endorsement by a community. Fair collaboration, clear credit, responsible sourcing and original experimentation allow a design to be useful while respecting cultural identity.',
 points:['Research the source community and context','Use appropriate authoritative references','Recognize makers and give attribution','Select a craft principle rather than copying a full design','Transform references into an original solution','Avoid misleading use of significant cultural motifs','Consider fair collaboration and responsible sourcing']},
'IX-FASH-C06-L01':{
 answer:'A fashion sketch communicates the structure and intended features of clothing through a sequence of clear drawing decisions. A beginner can first observe the general arrangement of the garment, including neckline, sleeves, panels and hem, without needing to judge or compare the appearance of a person. Simple light shapes help position those garment components on the page. The learner can check relative placement, labels and garment dimensions, refine the main outlines, and add seams, closures or fabric notes when relevant. A finished sketch should be readable, appropriately labelled and consistent with the intended design rather than relying on exaggerated body ideals. Classroom practice should use ordinary drawing materials responsibly, maintain a tidy well-lit area and follow the teacher’s instructions. This is an illustrative planning workflow, not equipment-operation guidance.',
 points:['Observe the planned garment features','Use simple initial light shapes','Check relative component placement and scale','Refine readable garment outlines','Add useful seams, labels or material notes','Present a clean legible design communication','Use safe supervised classroom drawing practices without body ideals']},
'IX-FASH-C07-L01':{
 answer:'Expressive fashion illustration and technical garment drawing serve different communication purposes. An expressive illustration helps convey an idea, a mood, a colour story or the overall visual direction of a proposed item. It may simplify or stylize clothing details, but there is no academic requirement to present an idealized body or a narrow appearance standard. A technical garment drawing aims to communicate measurable design information accurately, often using consistent front and back views, labelled seams, openings, pockets and other construction features. Its scale, clarity and annotations matter more than decorative expression. Designers may use illustrations during early concept discussions and technical drawings when specifying the garment for collaborative planning and quality checks. Both forms can be assessed for how well they meet their own purpose.',
 points:['State the purpose of expressive illustration','Describe concept, mood or colour communication','State the purpose of technical garment drawing','Identify detail, annotations or front/back view','Contrast stylization versus consistency and accuracy','Explain where each drawing fits in planning','Avoid body-ideal framing and emphasize communication']},
'IX-FASH-C08-L01':{
 answer:'Textile choice should begin with the purpose of the item and the needs of the person who will use it. Comfort involves factors such as softness, ventilation, freedom of movement and the response of fabric to weather conditions. Drape describes how fabric hangs or folds under its own weight and can affect whether a design feature appears as intended. Durability concerns resistance to ordinary wear, stretching, abrasion or repeated care, while care requirements include cleaning, drying and storage suited to the material. The intended use also affects practical considerations such as warmth, absorbency, cost and availability. A designer should compare material samples and credible product information, seek user feedback where appropriate and avoid assuming that one fabric suits every task or person.',
 points:['Define comfort and practical wearing needs','Explain drape as how material hangs or folds','Identify durability and wear resistance','Describe cleaning and care requirements','Connect cloth properties to intended task','Consider climate, cost and availability','Explain informed comparison and user input']},
'IX-FASH-C09-L01':{
 answer:'A safe beginner sewing classroom should have a clear layout that separates ordinary learning materials from equipment requiring teacher supervision. Work surfaces need enough space for reading instructions and handling fabric without crowding or blocked walkways. The teacher should establish who may use each piece of equipment and when to stop and ask for help. Tools that could cause injury must be stored and managed under school safety rules rather than left unattended. Lighting and comfortable work arrangements help learners see and communicate about their tasks without unnecessary strain. Any worn, damaged or unusual equipment should be reported to the teacher and left unused until a qualified person has checked it. The overall goal is careful planning, respectful shared-space behaviour, secure storage and a culture of asking for guidance rather than experimenting with unfamiliar machines.',
 points:['Teacher supervision and clear responsibility','Uncluttered workspace and unobstructed walkways','Suitable lighting and accessible work layout','Safe school-controlled storage of hazardous tools','Responsible fabric and material organization','Report unusual or damaged equipment and stop use','Follow written rules and seek trained guidance without machine instructions']}
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)throw Error('FASH9_SOURCE_SHA_CHANGED')
 let saved
 try{saved=JSON.parse(bytes)}catch(_){throw Error('FASH9_SOURCE_SHA_CHANGED')}
 if(JSON.stringify(saved)!==JSON.stringify(source))throw Error('FASH9_SOURCE_SHA_CHANGED')
 if(!Array.isArray(source?.drafts)||source.drafts.length!==36||
   source.publicationAllowed!==false||source.liveImportAllowed!==false)
  throw Error('FASH9_NOT_PROVISIONAL_SOURCE')
 const identity=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!identity||identity.recordId!=='pectaa-catalog-042'||
   identity.pdfSha256!==source.sourcePdfSha256||
   Number(identity.grade)!==9||identity.subject!=='Fashion Designing-Tech'||
   identity.medium!=='UNSPECIFIED_BY_CATALOG_LABEL'||
   identity.edition!=='2025'||
   identity.academicApproval!==false)
  throw Error('FASH9_UNVERIFIED_CATALOG_IDENTITY_DRIFT')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==9||Object.keys(ANSWERS).length!==9)
  throw Error('FASH9_LONG_COVERAGE_DRIFT')
 const seen=new Set()
 const items=longs.map(q=>{
  if(!q.id||seen.has(q.id)||!ANSWERS[q.id])throw Error('FASH9_ORIGINAL_ID_MISSING_DUPLICATE')
  seen.add(q.id)
  if(q.marks!==7||q.source?.catalogRecordId!==identity.recordId||
   q.source?.pdfSha256!==identity.pdfSha256||
   !rubricOnlyLongAnswer(q.type,q.content?.en?.answer))
    throw Error('FASH9_ORIGINAL_LONG_ANSWER_NOT_RUBRIC_ONLY:'+q.id)
  const draft=ANSWERS[q.id]
  if(typeof draft.answer!=='string'||draft.answer.length<250||
    rubricOnlyLongAnswer('long',draft.answer)||
    !Array.isArray(draft.points)||draft.points.length!==7||
    new Set(draft.points).size!==7||
    draft.points.some(p=>typeof p!=='string'||p.length<18))
    throw Error('FASH9_INCOMPLETE_AUTHORING_PROPOSAL:'+q.id)
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
   verifiedPublished:false,reviewStatus:'RESEARCH_DRAFT_REQUIRES_FASHION_IX_ADOPTION_AND_INDEPENDENT_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-fashion9-tech-nine-original-model-answer-research-v1',
  originalQuestionFile:'fashionDesigning9TechStarter2026.json',originalFileSha256:PIN,
  sourceCatalogId:identity.recordId,sourceCatalogMediumClaim:identity.medium,
  sourceCatalogEditionClaim:identity.edition,sourceCatalogPdfSha256:identity.pdfSha256,
  originalAuthoredResearchQuestions:source.drafts.length,
  originalRubricOnlyLongQuestions:longs.length,
  newExplanatoryAnswerResearchDrafts:items.length,newSevenMarkPointProposals:items.length*7,
  humanSchoolSourceVerified:0,qualifiedHumanAcademicReviewed:0,
  academicallyApproved:0,verifiedPublished:0,
  caveat:'English prose of original new research answers does not establish approved English-medium book or actual PECTAA edition/session; these source identifiers are catalog metadata only. No original answers have been changed.',
  items
 }
}
function markdown(d){
 return [
  '# ASSPS Grade IX Fashion Designing Technology — nine new original explanatory answer drafts','',
  '**Research proposals only; no approved English-medium adoption, textbook physical-page review or independent teacher approval.**','',
  `Existing ${d.originalAuthoredResearchQuestions} original candidate questions: all ${d.originalRubricOnlyLongQuestions} long answers previously contained rubric-only text. Nine separately authored explanations and ${d.newSevenMarkPointProposals} new distinct marking criteria. Original source SHA-256: \`${d.originalFileSha256}\`.`,'',
  '**Catalog medium is UNSPECIFIED_BY_CATALOG_LABEL and catalog edition is labelled 2025; neither certifies an ASSPS-approved medium, academic session or original textbook exercise page.**','',
  ...d.items.flatMap(x=>[
   `### ${x.questionId} — Chapter ${x.chapterNo} · ${x.topicId}`,'',
   x.proposedIndependentEnglishExplanation,'',
   '**Separately proposed seven-mark marking criteria:** '+x.proposedDistinctMarkingPoints.join(' · '),''
  ]),
  '## Required independent academic actions','',
  'Verify actual ASSPS-approved subject, textbook edition, academic session/exam year, language medium and physical printed chapter/exercise page; obtain qualified independent Fashion Designing reviewer answer-and-mark signoff and appropriate Urdu-equivalence review. Create a new immutable question revision only after correction; a different authorized reviewer must sign that exact revision. Paper Studio verified selector remains empty pending SaaS Core certification.','',
  '**Human source/page verified 0; independently academic reviewed 0; approved 0; published 0. No production deployment.**',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(SOURCE),source=JSON.parse(bytes)
 const registry=JSON.parse(fs.readFileSync(REGISTRY))
 const d=build({bytes,source,registry})
 fs.writeFileSync(path.join(OUTPUT,'ASSPS_FASHION9_NINE_LONG_MODEL_ANSWER_DRAFTS_20261009.json'),JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(path.join(OUTPUT,'ASSPS_FASHION9_NINE_LONG_MODEL_ANSWER_DRAFTS_20261009.md'),markdown(d))
 console.log(JSON.stringify({original:d.originalAuthoredResearchQuestions,answers:d.newExplanatoryAnswerResearchDrafts,markingPoints:d.newSevenMarkPointProposals,schoolAdopted:d.humanSchoolSourceVerified,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,PIN}

#!/usr/bin/env node
'use strict'
// Original curriculum-concept answer drafts only; no exercises, lab instructions or approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry9Chapter7EnglishDrafts2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUTPUT=path.join(ROOT,'docs/question-bank')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const PIN='f14cbe295b714aff61d5e4d2876c1c7a015245caf79477520e18d866072dcf88'
const ANSWERS=Object.freeze({
'IX-CHEM-2025-C07-T01-L01':{
answer:'Acids and bases can be distinguished by how they behave in acid-base reactions. In water, acids increase the concentration of hydronium ions, whereas many familiar bases neutralize acids by accepting protons or supplying hydroxide ions. An alkali is specifically a base that dissolves in water and produces a basic aqueous solution; therefore all alkalis are bases, but not every base is an alkali. Hydrochloric acid is one familiar example of an acid, while sodium hydroxide is an alkali. An insoluble basic oxide, such as copper(II) oxide, is a base but not an alkali. Solubility is the key distinction in the last pair, not a claim that all basic substances dissolve in water.',
points:['Explain general acidic behavior in aqueous acid-base reactions','Explain general basic behavior by proton acceptance or neutralization','Define an alkali as a water-soluble base and distinguish the reverse implication','Identify hydrochloric acid as an appropriate acid example','Distinguish soluble sodium hydroxide alkali from insoluble basic copper(II) oxide']
},
'IX-CHEM-2025-C07-T02-L01':{
answer:'The Arrhenius description is intended for aqueous solutions. An Arrhenius acid increases hydronium-ion concentration when dissolved in water, often represented at this level as supplying hydrogen ions; hydrochloric acid illustrates this behavior. An Arrhenius base increases hydroxide-ion concentration in water; sodium hydroxide illustrates the simple case. The solvent matters: the definitions concern what happens in water, rather than providing a complete account of all proton-transfer or electron-pair interactions. Their limitation is that useful acid-base chemistry can also occur in nonaqueous systems or involve species that do not directly fit the simple aqueous hydrogen-ion and hydroxide-ion formulas. Broader Brønsted-Lowry and Lewis descriptions address different aspects of acid-base behavior.',
points:['Define Arrhenius acid in terms of aqueous hydronium-ion increase','Define Arrhenius base in terms of aqueous hydroxide-ion increase','State the essential aqueous-solution condition','Give appropriately classified aqueous acid and base examples','Explain one limitation outside the narrow aqueous definition']
},
'IX-CHEM-2025-C07-T03-L01':{
answer:'In Brønsted-Lowry theory, an acid is a proton donor and a base is a proton acceptor. A typical acid-base reaction transfers a proton from the acid to the base; it need not be described only as hydroxide production in water. When an acid loses a proton, the remaining species is its conjugate base. When a base accepts that proton, the newly formed species is its conjugate acid. Each conjugate pair therefore differs by one proton, and the chemical identities of both pairs must be followed consistently. For example, when ammonia accepts a proton from an acid, ammonium is the conjugate acid of ammonia. The corresponding proton-donating acid forms its own conjugate base.',
points:['Define a Brønsted-Lowry acid as a proton donor','Define a Brønsted-Lowry base as a proton acceptor','Explain proton transfer as the central reaction event','Correctly identify the conjugate base left by the original acid','Correctly identify the conjugate acid formed from the original base']
},
'IX-CHEM-2025-C07-T04-L01':{
answer:'Acids and bases show recognizable families of chemical reactions, although the actual outcome depends on the substances and conditions. At a conceptual level, an acid can react with a suitable active metal to form a salt and hydrogen gas, and it can react with a base or a basic metal oxide in a neutralization process that produces a salt and, where appropriate, water. Acids also react with carbonates or hydrogen carbonates to form a salt, carbon dioxide and water. A base can react with an acid to give neutralization products, while some basic substances react with ammonium salts with formation of ammonia-containing products. These descriptions classify reaction types only; they are not directions for carrying out laboratory reactions or handling reagents.',
points:['Describe typical acid and reactive-metal products at a conceptual level','Describe acid and base or basic-oxide neutralization products','Describe acid and carbonate reaction products conceptually','Describe base-acid neutralization as a property of bases','Identify a further appropriate base reaction class without experimental procedures']
},
'IX-CHEM-2025-C07-T05-L01':{
answer:'Acid deposition develops when emissions such as sulfur dioxide and nitrogen oxides are transformed in the atmosphere into acidic substances. They can be carried by clouds and precipitation or deposited as dry particles and gases, so the process is broader than rain alone. Increased acidity may affect sensitive lakes, soils and aquatic ecosystems, and it can stress forests by altering nutrient availability. Acidic deposition can also accelerate deterioration of limestone-containing structures and certain other materials. An important preventive principle is to reduce emissions of the precursor pollutants through cleaner energy systems and appropriately managed industrial and transport emissions. The overall effects depend on local conditions and natural buffering capacity, rather than occurring equally in every place.',
points:['Connect sulfur dioxide and nitrogen oxides with atmospheric acid formation','Explain wet precipitation and/or dry acidic deposition','Describe a plausible effect on plants, forests, soil or aquatic ecosystems','Describe an effect on buildings, materials or sensitive waters','Identify reducing pollutant precursor emissions as a suitable control principle']
}
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)throw Error('CHEM9C7_SOURCE_SHA_DRIFT')
 let parsed
 try{parsed=JSON.parse(bytes)}catch(_){throw Error('CHEM9C7_SOURCE_SHA_DRIFT')}
 if(JSON.stringify(parsed)!==JSON.stringify(source))throw Error('CHEM9C7_SOURCE_SHA_DRIFT')
 if(source.publicationAllowed!==false||source.liveImportAllowed!==false||
  !Array.isArray(source.drafts)||source.drafts.length!==25)
   throw Error('CHEM9C7_MUST_REMAIN_PROVISIONAL')
 const identity=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!identity||identity.recordId!=='pectaa-catalog-007'||identity.grade!==9||
 identity.subject!=='Chemistry'||identity.medium!=='English'||identity.edition!=='2025-26'||
 identity.academicApproval!==false||identity.pdfSha256!==source.sourcePdfSha256)
  throw Error('CHEM9C7_CATALOG_DRIFT_OR_FALSE_APPROVAL')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==5||Object.keys(ANSWERS).length!==5)throw Error('CHEM9C7_LONG_COUNT_DRIFT')
 const seen=new Set()
 const items=longs.map(q=>{
  if(!q.id||seen.has(q.id)||!ANSWERS[q.id])throw Error('CHEM9C7_ORIGINAL_ID_COLLISION')
  seen.add(q.id)
  if(q.chapter?.number!==7||q.marks!==5||q.review?.status!=='draft'||
   q.source?.catalogRecordId!==identity.recordId||q.source?.pdfSha256!==identity.pdfSha256||
   !rubricOnlyLongAnswer('long',q.content?.en?.answer))
   throw Error('CHEM9C7_ORIGINAL_SCOPE_OR_RUBRIC_CHANGED:'+q.id)
  const draft=ANSWERS[q.id]
  if(typeof draft.answer!=='string'||draft.answer.length<280||
   rubricOnlyLongAnswer('long',draft.answer)||!Array.isArray(draft.points)||
   draft.points.length!==q.marks||new Set(draft.points).size!==q.marks||
   draft.points.some(p=>typeof p!=='string'||p.length<18))
   throw Error('CHEM9C7_INVALID_DRAFT_OR_MARKS:'+q.id)
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
   reviewStatus:'RESEARCH_DRAFT_REQUIRES_CH7_PHYSICAL_TEXTBOOK_AND_QUALIFIED_SUBJECT_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-chemistry9-ch7-five-original-answer-research-v1',
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
 '# Grade IX Chemistry Chapter 7 — five original explanatory research drafts','',
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
 'Scientific background definitions: IUPAC Brønsted acid https://goldbook.iupac.org/terms/view/B00744 and base https://goldbook.iupac.org/terms/view/B00745; EPA acid rain https://www.epa.gov/acidrain/what-acid-rain . These references do NOT certify an ASSPS adopted book or examination-year applicability.','',
 'No original question/old answer was overwritten, no chemical experiment procedure or laboratory directions supplied, and no Paper Studio verified question was released.',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(INPUT)
 const data=build({bytes,source:JSON.parse(bytes),registry:JSON.parse(fs.readFileSync(REGISTRY))})
 const prefix=path.join(OUTPUT,'ASSPS_CHEMISTRY9_CH07_FIVE_LONG_MODEL_ANSWER_DRAFTS_20261009')
 fs.writeFileSync(prefix+'.json',JSON.stringify(data,null,2)+'\n')
 fs.writeFileSync(prefix+'.md',markdown(data))
 console.log(JSON.stringify({drafts:data.items.length,criteria:data.newFiveMarkPointProposals,approved:data.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,PIN,INPUT,REGISTRY}

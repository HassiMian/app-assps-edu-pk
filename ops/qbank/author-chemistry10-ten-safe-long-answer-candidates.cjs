#!/usr/bin/env node
'use strict'
// Pure original answer proposals. No textbook adoption, academic approval or production writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry10Starter2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUTPUT=path.join(ROOT,'docs/question-bank')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const PIN='ef2917a8fc5ea030992d5f15df2493b7422954463ee4d54c25414fc81af706a1'
const ANSWERS=Object.freeze({
'X-CHEM-C14-L01':{
 answer:'Particles in a solid are closely arranged and normally vibrate around relatively fixed positions, giving a solid a fairly definite shape and volume. In a liquid the particles remain close together but can move past one another, so a liquid flows and takes the shape of its container while keeping nearly constant volume. Gas particles are much farther apart, move through the available space and can be compressed substantially. The strength and arrangement of intermolecular attractions help explain these differences, although the actual behaviour also depends on the substance. Heating generally raises average particle kinetic energy. During melting or boiling, supplied energy also changes how particles interact and are arranged; for a pure substance at a fixed pressure, the temperature can remain approximately constant through a phase change.',
 points:['Explain close solid particles and vibration','Describe liquid particle mobility and volume','Describe gas spacing and compressibility','Compare intermolecular attractions appropriately','Explain heating and phase-change energy without claiming continuous temperature rise']},
'X-CHEM-C15-L01':{
 answer:'A mass-to-mass stoichiometric calculation starts from a balanced chemical equation, because the coefficients state the mole ratios of reacting and formed substances. The known mass of a specified substance is divided by its molar mass to find its amount in moles. The balanced coefficient ratio then converts those moles to the amount of the required substance. Multiplying the required moles by its molar mass gives the corresponding mass. Units should cancel correctly at each conversion, and the final mass should be reported with appropriate precision. A predicted theoretical yield assumes the relevant reaction proceeds as described without limiting-reagent or product-loss complications. If more than one reactant amount is provided, the limiting reactant must be identified before computing the theoretical product.',
 points:['Begin with a balanced stoichiometric equation','Convert given mass into moles with molar mass','Apply coefficient-derived mole ratio','Convert product moles to mass and check units','Check precision, theoretical-yield and limiting-reactant assumptions']},
'X-CHEM-C16-L01':{
 answer:'Oxidation and reduction occur together in a redox reaction because electrons lost by one species are gained by another. Oxidation means loss of electrons and often an increase in oxidation number, whereas reduction means gain of electrons and often a decrease in oxidation number. The anode is defined as the electrode at which oxidation occurs and the cathode as the electrode at which reduction occurs. These definitions hold for both galvanic and electrolytic cells; the electrical polarities of the electrodes are not the same in those two kinds of cell. In a galvanic cell, electrons travel through the external conductive path from the anode toward the cathode, while ionic movement within the cell supports charge balance. This is a conceptual explanation rather than guidance for assembling or energizing any apparatus.',
 points:['Oxidation is loss of electrons','Reduction is gain of electrons','Anode oxidation and cathode reduction','Distinguish fixed electrode roles from variable polarity','Explain electron and ion contributions to charge balance']},
'X-CHEM-C17-L01':{
 answer:'Collision theory explains reaction rate by considering how often reactant particles meet and whether a collision has the energy and orientation needed for reaction. Higher concentration generally places more reactant particles in a given volume, increasing opportunities for collisions. Raising temperature usually makes collisions more frequent and increases the fraction of particles energetic enough to overcome the activation barrier. For a reaction involving a solid, a larger exposed surface area can create more sites where reactants encounter the solid. A suitable catalyst offers a different reaction pathway with lower activation energy, increasing reaction rate without being consumed in the overall reaction. The effects depend on the specific reaction and circumstances, so the model should not be applied as an unconditional prediction.',
 points:['Concentration alters collision frequency','Temperature affects energy and successful collisions','Surface area alters contact sites for relevant heterogeneous reactions','Catalyst supplies lower-activation-energy pathway','Connect collision effectiveness to rate with contextual limits']},
'X-CHEM-C19-L01':{
 answer:'Nitrogen is essential in proteins and nucleic acids, so biologically available nitrogen compounds support growth in living organisms. Some nitrogen-containing fertilizers provide nutrients for agriculture, while other nitrogen compounds serve important industrial functions. However, excess reactive nitrogen can enter waterways and contribute to nutrient pollution, and nitrogen oxides in the atmosphere can aggravate air pollution and acid deposition. Sulphur is also important in some amino acids and industrial materials; sulphur compounds are used in manufacturing, including production of widely used industrial chemicals. Burning sulphur-containing fuels can release sulphur dioxide, which contributes to respiratory and environmental problems and may form acidic substances in the atmosphere. Judging benefits and impacts requires responsible management rather than assuming every nitrogen or sulphur compound is harmful or harmless.',
 points:['Explain biological role of nitrogen compounds','Identify agricultural or industrial nitrogen uses','Discuss nitrogen oxide or nutrient-pollution concerns','Identify sulphur compounds or useful industrial roles','Explain sulphur dioxide and acid-deposition impacts']},
'X-CHEM-C20-L01':{
 answer:'Water may be contaminated by disease-causing microorganisms, sewage, agricultural runoff, industrial discharge or naturally occurring substances at unsuitable concentrations. Different types of pollution require different evaluation and control measures; clear-looking water is not automatically safe. At a community level, water quality is improved by protecting catchments and supplies, reducing contamination at its source, and using professionally designed treatment systems appropriate to the actual risks. In a typical utility system, the broad stages can include separation of suspended material, filtration, disinfection and verified monitoring, although exact processes depend on water chemistry and local standards. Qualified operators test the treated water against relevant health-based criteria and maintain distribution infrastructure. Individuals should follow official local drinking-water guidance rather than assuming that one household technique can remove every contaminant.',
 points:['Identify microbial and chemical sources of contamination','Explain prevention and source protection','Describe broad physical clarification or filtration stage','Describe professional disinfection or other appropriate treatment','Explain laboratory monitoring and context-specific potable standards']},
'X-CHEM-C21-L01':{
 answer:'Organic chemistry classifies compounds partly by the types of carbon-containing structures and functional groups they possess, though some carbon-containing substances are conventionally treated as inorganic. A functional group is a characteristic group of atoms that strongly influences a compound’s reactions, such as a hydroxyl group in many alcohols or a carboxyl group in carboxylic acids. A homologous series contains compounds with the same characteristic functional group and a common general formula; successive members typically differ by a CH2 unit. Members often show related chemical reactions while physical properties vary gradually with molecular size. Structural formulae show which atoms are bonded to one another, allowing compounds with the same molecular formula but different connections to be distinguished. These tools together link classification, structure and likely reactivity without assuming every compound behaves identically.',
 points:['Explain functional group and example','Define homologous series with common group/formula','Include CH2 difference between successive homologues','Describe related chemical properties and changing physical properties','Explain structural formula and distinguish connectivity/isomers']},
'X-CHEM-C22-L01':{
 answer:'Alkanes are saturated hydrocarbons containing only single carbon–carbon bonds, while alkenes are unsaturated hydrocarbons with at least one carbon–carbon double bond. For open-chain molecules containing one double bond, a common alkene series has the general formula CnH2n, while acyclic alkanes have CnH2n+2. Both groups are combustible, but their typical patterns of other reactions differ because a double bond can participate in addition reactions. For example, an alkene can add a suitable reagent across its carbon–carbon double bond, whereas an alkane is more commonly discussed in substitution reactions under appropriate conditions. These descriptions compare chemical patterns only and are not laboratory instructions. Structure and other conditions determine actual reaction behaviour.',
 points:['Define saturated single-bond alkanes','Define unsaturated double-bond alkenes','State suitable acyclic general formula distinction','Contrast addition and substitution reaction tendencies','Give conceptual reaction comparison and note conditional reactivity']},
'X-CHEM-C25-L01':{
 answer:'Carbohydrates include simple sugars and larger molecules made by linking sugar units; they can supply energy and, in some organisms, support structural materials such as cellulose. Proteins are polymers of amino acids joined by peptide bonds, and their folded shapes enable functions including enzymes, transport and structural support. Many lipids contain hydrophobic components, such as fatty-acid-containing molecules, and help with long-term energy storage, membranes and signalling; not all lipids are repeating polymers. Nucleic acids such as DNA and RNA are chains of nucleotides that store, transmit or help express genetic information. Each class has diverse examples and properties, so broad structural features matter more than treating every molecule in one class as identical. Comparing building units with roles helps explain why different biomolecules contribute to growth and cell function.',
 points:['Carbohydrates and simple sugar units/energy roles','Proteins from amino acids and major functions','Lipids as diverse hydrophobic molecules, not all polymers','Nucleic acids from nucleotides and information roles','Relate structural variation to differing cellular functions']},
'X-CHEM-C26-L01':{
 answer:'A monomer is a smaller chemical unit that can participate in formation of a larger molecular structure, and a polymer contains many linked repeat units. Polymerization is the chemical process by which appropriate smaller molecules form polymer chains or networks. In addition polymerization, some unsaturated monomers can link while forming a chain without a small-molecule by-product; condensation polymerization can form links accompanied by release of a small molecule in appropriate systems. A repeating unit represents the characteristic section that occurs along a polymer chain, while the material properties also depend on chain length, branching and interactions between chains. Plastics, fibres and other polymers can be useful for packaging or durable goods. Responsible management considers product lifetime, reduced unnecessary waste, appropriate collection and recycling feasibility rather than assuming every polymer is recyclable.',
 points:['Define monomers and polymers','Describe polymerization as chain or network formation','Distinguish addition and condensation conceptually','Explain repeating units and structural influences on properties','Discuss useful applications and realistic waste reduction/recycling considerations']}
})
const DEFERRED_IDS=Object.freeze(['X-CHEM-C18-L01','X-CHEM-C23-L01','X-CHEM-C24-L01'])
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)throw Error('CHEM10_SOURCE_SHA_CHANGED')
 let saved
 try{saved=JSON.parse(bytes)}catch(_){throw Error('CHEM10_SOURCE_SHA_CHANGED')}
 if(JSON.stringify(saved)!==JSON.stringify(source))throw Error('CHEM10_SOURCE_SHA_CHANGED')
 if(!Array.isArray(source?.drafts)||source.drafts.length!==65||
   source.publicationAllowed!==false||source.liveImportAllowed!==false)
  throw Error('CHEM10_NOT_PROVISIONAL_SOURCE')
 const identity=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!identity||identity.recordId!=='pectaa-recovered-chemistry10-en-2026'||
   identity.pdfSha256!==source.sourcePdfSha256||
   Number(identity.grade)!==10||identity.subject!=='Chemistry'||
   identity.medium!=='English'||
   identity.edition!=='2026'||
   identity.academicApproval!==false)
  throw Error('CHEM10_UNVERIFIED_CATALOG_IDENTITY_DRIFT')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==13||Object.keys(ANSWERS).length!==10)
  throw Error('CHEM10_LONG_COVERAGE_DRIFT')
 const actualDeferred=longs.filter(q=>!ANSWERS[q.id]).map(q=>q.id)
 if(actualDeferred.length!==3||actualDeferred.some((id,i)=>id!==DEFERRED_IDS[i]))
  throw Error('CHEM10_UNEXPECTED_DEFERRED_ID_SET')
 const selectedLongs=longs.filter(q=>ANSWERS[q.id])
 if(selectedLongs.length!==10)throw Error('CHEM10_EXPECTED_TEN_SAFE_LONG_ANSWERS')
 const seen=new Set()
 const items=selectedLongs.map(q=>{
  if(!q.id||seen.has(q.id)||!ANSWERS[q.id])throw Error('CHEM10_ORIGINAL_ID_MISSING_DUPLICATE')
  seen.add(q.id)
  if(q.marks!==5||q.source?.catalogRecordId!==identity.recordId||
   q.source?.pdfSha256!==identity.pdfSha256||
   !rubricOnlyLongAnswer(q.type,q.content?.en?.answer))
    throw Error('CHEM10_ORIGINAL_LONG_ANSWER_NOT_RUBRIC_ONLY:'+q.id)
  const draft=ANSWERS[q.id]
  if(typeof draft.answer!=='string'||draft.answer.length<250||
    rubricOnlyLongAnswer('long',draft.answer)||
    !Array.isArray(draft.points)||draft.points.length!==5||
    new Set(draft.points).size!==5||
    draft.points.some(p=>typeof p!=='string'||p.length<18))
    throw Error('CHEM10_INCOMPLETE_AUTHORING_PROPOSAL:'+q.id)
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
   verifiedPublished:false,reviewStatus:'RESEARCH_DRAFT_REQUIRES_CHEMISTRY_X_SCHOOL_ADOPTION_AND_INDEPENDENT_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-chemistry10-ten-safe-concept-answers-v1',
  originalQuestionFile:'chemistry10Starter2026.json',originalFileSha256:PIN,
  sourceCatalogId:identity.recordId,sourceCatalogMediumClaim:identity.medium,
  sourceCatalogEditionClaim:identity.edition,sourceCatalogPdfSha256:identity.pdfSha256,
  originalAuthoredResearchQuestions:source.drafts.length,
  originalRubricOnlyLongQuestions:longs.length,
  originalLongRubricOnlyTotal:longs.length,originalLongQuestionIdsIntentionallyDeferred:actualDeferred,
  newExplanatoryAnswerResearchDrafts:items.length,newFiveMarkPointProposals:items.length*5,
  humanSchoolSourceVerified:0,qualifiedHumanAcademicReviewed:0,
  academicallyApproved:0,verifiedPublished:0,
  caveat:'English prose of original new research answers does not establish approved English-medium book or actual PECTAA edition/session; these source identifiers are catalog metadata only. No original answers have been changed.',
  items
 }
}
function markdown(d){
 return [
  '# ASSPS Grade X Chemistry — ten source-bound conceptual explanatory draft answers','',
  '**Research proposals only; no approved English-medium adoption, textbook physical-page review or independent teacher approval.**','',
  `Existing ${d.originalAuthoredResearchQuestions} original candidate questions: all ${d.originalRubricOnlyLongQuestions} long answers previously contained rubric-only text. Ten source-bound non-procedural explanations and ${d.newFiveMarkPointProposals} new distinct marking criteria. Original source SHA-256: \`${d.originalFileSha256}\`.`,'',
  '**The catalog labels this source English and edition 2026, but academicApproval is false. Claimed catalog identity, chapter TOC page, textbook adoption, printed exercise page and relevant actual examination year are NOT independently verified.**','',
  ...d.items.flatMap(x=>[
   `### ${x.questionId} — Chapter ${x.chapterNo} · ${x.topicId}`,'',
   x.proposedIndependentEnglishExplanation,'',
   '**Separately proposed five-mark marking criteria:** '+x.proposedDistinctMarkingPoints.join(' · '),''
  ]),
  '## Three deferred source questions (NO explanatory draft or invented approval)','',
  ...d.originalLongQuestionIdsIntentionallyDeferred.map(x=>' - '+x),
  '', 'These question IDs include laboratory salt preparation, ethanol preparation and acid reaction content that requires qualified safety/academic review before answer authoring.',
  '', '## Required independent academic actions','',
  'Verify actual ASSPS-approved subject, textbook edition, academic session/exam year, language medium and physical printed chapter/exercise page; obtain qualified independent Chemistry X teacher answer-and-mark signoff and appropriate Urdu-equivalence review. Create a new immutable question revision only after correction; a different authorized reviewer must sign that exact revision. Paper Studio verified selector remains empty pending SaaS Core certification.','',
  '**Human source/page verified 0; independently academic reviewed 0; approved 0; published 0. No production deployment.**',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(SOURCE),source=JSON.parse(bytes)
 const registry=JSON.parse(fs.readFileSync(REGISTRY))
 const d=build({bytes,source,registry})
 fs.writeFileSync(path.join(OUTPUT,'ASSPS_CHEMISTRY10_TEN_SAFE_LONG_MODEL_ANSWER_DRAFTS_20261009.json'),JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(path.join(OUTPUT,'ASSPS_CHEMISTRY10_TEN_SAFE_LONG_MODEL_ANSWER_DRAFTS_20261009.md'),markdown(d))
 console.log(JSON.stringify({original:d.originalAuthoredResearchQuestions,answers:d.newExplanatoryAnswerResearchDrafts,markingPoints:d.newFiveMarkPointProposals,schoolAdopted:d.humanSchoolSourceVerified,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,DEFERRED_IDS,PIN}

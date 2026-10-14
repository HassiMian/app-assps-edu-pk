#!/usr/bin/env node
'use strict'
// An independently authored curriculum-topic research draft, NOT textbook adoption or academic approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const SRC=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/biology9EnglishStarter2026.json')
const REG=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUT=path.join(ROOT,'docs/question-bank')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const ORIGINAL_SHA='e36217adade79b13c5a275c256373929b616219d37a399181d619e016f3e1a4e'
const ANSWERS=Object.freeze({
'IX-BIO-2025-C01-B01-L01':{
 answer:'Biology benefits from ideas and methods developed in other sciences. Biochemistry uses chemistry to explain processes such as enzyme activity and the chemical changes of respiration. Biophysics applies physical principles to biological systems, including the flow of blood or the transmission of light through the eye. Biostatistics uses mathematical methods to summarize biological observations and test patterns in collected data. Computational biology can also organize and compare large genetic datasets. These links make explanations more precise because living systems follow chemical and physical laws and can be investigated quantitatively.',
 points:['Identify a valid link between biology and chemistry','Explain a biochemical application','Link physics to a living system','Use mathematics/statistics for biological evidence','Explain why interdisciplinary methods improve understanding']},
'IX-BIO-2025-C02-B01-L01':{
 answer:'Classification organizes organisms into groups based on shared characteristics and evolutionary relationships. Taxonomic ranks form a nested hierarchy, becoming more specific at lower levels. A commonly used sequence from broad to specific is domain, kingdom, phylum, class, order, family, genus and species; botanists may call phylum a division. For example, members of a genus usually share more characteristics with each other than organisms that belong only to the same family. Using consistent ranks allows scientists to describe biodiversity, compare organisms and communicate about species without relying on local names.',
 points:['State the purpose of classification','Explain nested taxonomic ranks','Domain to phylum/class order','Order to family/genus/species sequence','Specificity and scientific communication']},
'IX-BIO-2025-C03-B01-L01':{
 answer:'Cell theory states that living organisms are composed of one or more cells, that the cell is the basic structural and functional unit of life, and that new cells arise from existing cells. Microscopes made it possible to observe cellular structures and to study dividing cells directly. In multicellular organisms, groups of specialized cells form tissues, and tissues combine to form organs with coordinated functions. Thus microscopy provides evidence about small living structures while cell theory explains how those structures relate to the organization, growth and repair of the whole organism.',
 points:['Living things are made of cells','Cell is basic unit of structure and function','New cells arise from existing cells','Microscopy provided supporting observations','Link cells with tissues and organs']},
'IX-BIO-2025-C04-B01-L01':{
 answer:'During the cell cycle a cell grows, carries out normal activities and prepares for division. In the S phase of interphase, its DNA is replicated so each future daughter cell can receive a complete set of chromosomes. Mitosis then separates the duplicated chromosomes into two nuclei in an ordered process. Cytokinesis divides the cell contents, usually producing two daughter cells with the same chromosome number as the original cell. Repeated divisions increase cell number during growth and help replace damaged or worn-out cells, although the ability of different tissues to regenerate varies.',
 points:['Interphase growth and preparation','DNA replication before division','Separation of chromosomes during mitosis','Cytokinesis and preserved chromosome number','Growth and tissue repair applications']},
'IX-BIO-2025-C05-B01-L01':{
 answer:'Living organisms display several levels of organization. A cell is a basic living unit; cells with similar roles may form a tissue. Different tissues cooperate to make an organ, and organs with related functions form an organ system. Several organ systems together make a complete organism. In a human example, a cardiac muscle cell is part of cardiac muscle tissue; that tissue contributes to the heart, which works within the circulatory system of the human body. Each higher level depends on coordinated activity among the smaller units.',
 points:['Define cellular level','Explain how tissues form','Describe organs from tissues','Identify the organ system and organism levels','Trace a consistent linked human example']},
'IX-BIO-2025-C06-B01-L01':{
 answer:'Carbohydrates include simple sugars and more complex polysaccharides. They often provide readily available energy or contribute to structural materials such as cellulose in plant cell walls. Proteins are polymers of amino acids; their varied structures allow them to serve as enzymes, transporters and supporting materials. Lipids form a diverse group that includes fats and membrane phospholipids rather than one uniform polymer family. Many fats contain glycerol and fatty acids and provide concentrated energy storage. These biomolecules differ in chemical building components and roles, although all are important in normal living cells.',
 points:['Carbohydrate sugars and polysaccharides','Carbohydrate energy or structural roles','Protein amino-acid building units','Protein enzyme/structural roles','Lipid diversity, typical components and energy/membrane roles']},
'IX-BIO-2025-C07-B01-L01':{
 answer:'An enzyme is a biological catalyst with an active site whose chemical shape and properties allow an appropriate substrate to bind. When the substrate associates with the enzyme, an enzyme-substrate complex forms and the reaction can proceed along a pathway with lower activation energy. The products have different interactions with the active site and can be released. The enzyme is not consumed overall in the catalyzed reaction, so it can bind and transform further substrate molecules. Enzymes do not change the overall equilibrium position of a reaction; they can increase the rates at which equilibrium is approached.',
 points:['Define enzyme active site','Explain substrate recognition and binding','Describe enzyme-substrate complex and lower activation energy','Explain product release','Explain enzyme reuse without consumption']},
'IX-BIO-2025-C08-B01-L01':{
 answer:'ATP is a molecule that transfers usable energy between many cellular processes. Energy released by respiration or other energy-yielding pathways can drive the formation of ATP from ADP and inorganic phosphate. When ATP is converted back to ADP and phosphate through hydrolysis, the overall coupled process can make energy available for cellular activities. Cells use such coupling in transport, movement and the construction of larger molecules. The ADP and phosphate can be recycled to form ATP again. The ATP–ADP cycle therefore links energy release with energy-requiring work rather than acting as a store for all cellular energy.',
 points:['ATP and ADP roles','ATP synthesis using energy release','ATP hydrolysis and phosphate','Coupling to cellular work','Recycling of ADP and phosphate']},
'IX-BIO-2025-C09-B01-L01':{
 answer:'Plant roots absorb water and dissolved mineral ions from soil through their absorbing surfaces. Xylem conducts much of this water and its dissolved minerals toward stems and leaves, helping maintain a supply for photosynthesis and other activities. Green leaf cells use light energy, carbon dioxide and water to make organic sugars by photosynthesis. Phloem transports much of the plant’s dissolved organic food from sources such as mature leaves to sinks such as growing roots, fruits or young shoots. Together these tissues link uptake, food production and distribution across the plant.',
 points:['Root uptake of water and minerals','Xylem transport toward shoots','Sugar production by photosynthesis','Phloem movement of organic products','Source-to-sink transport relationship']},
'IX-BIO-2025-C10-B01-L01':{
 answer:'Asexual reproduction produces new individuals from a single parent without fusion of gametes. In plants, natural examples include the production of new plants from runners, bulbs or tubers. Artificial propagation uses selected plant parts or established horticultural methods, such as cuttings or grafting, to maintain desirable traits. New plants produced asexually are generally genetically similar to their parent, although mutation and environmental conditions can introduce differences. This similarity is useful for preserving a productive variety but can also reduce genetic diversity and make many plants vulnerable to the same disease or environmental stress.',
 points:['One-parent reproduction without gamete fusion','Natural propagation examples','Artificial propagation examples as concepts','Expected genetic similarity','Agricultural advantage and diversity limitation']},
'IX-BIO-2025-C11-B01-L01':{
 answer:'Mean, median and mode summarize a dataset in different ways. The mean is the sum of the measured values divided by the number of observations and uses every numerical measurement. The median is the middle value after ordering the observations, or the average of the two middle values for an even-sized dataset. The mode is the value or category that appears most often. For biological measurements with a very large outlier, the median may better represent a typical observation than the mean. The mode can be useful for a frequently occurring category, while mean and median apply mainly to numerical or ordered data.',
 points:['Correct arithmetic mean definition','Order values and calculate median','Identify mode as most frequent','Explain outlier effect on mean','Compare suitability for biological data types']}
})
const SECOND_SET=Object.freeze({
'IX-BIO-2025-C01-B02-L01':{
 answer:'The biological method begins when observations suggest a question about a living system. A hypothesis proposes a testable explanation, and deductions from it lead to predictions about expected observations. An investigation is designed to collect relevant data, distinguish important variables and compare the evidence with the predictions. The results are analyzed before drawing a conclusion about how well the hypothesis is supported. Scientists report limitations and may revise the hypothesis when further observations disagree. This process helps turn isolated observations into explanations that can be evaluated by others.',
 points:['Observation and biological question','Testable hypothesis','Prediction from the hypothesis','Investigation and data analysis','Conclusion, limitations and revision']},
'IX-BIO-2025-C02-B02-L01':{
 answer:'Cellular organisms are grouped into the domains Bacteria, Archaea and Eukarya. Bacteria and Archaea are both made of cells without a membrane-bound nucleus, but they differ in key molecular characteristics. Members of Eukarya have cells with a membrane-bound nucleus; this domain includes plants, animals, fungi and many other organisms. Viruses are not placed directly into the three cellular domains because a virus is not made of cells. It carries genetic information but relies on the machinery of a suitable host cell to reproduce. Its acellular biology therefore requires a different classification approach.',
 points:['Name the three cellular domains','Bacteria as prokaryotic cells','Archaea as distinct prokaryotic lineage','Eukaryotic membrane-bound nuclei','Viruses are acellular and host-dependent']},
'IX-BIO-2025-C03-B02-L01':{
 answer:'The nucleus contains most of the genetic material in a typical eukaryotic cell and regulates activities through gene expression. Mitochondria carry out major stages of aerobic respiration and contribute to ATP production. Ribosomes assemble proteins by reading the information in messenger RNA. The cell membrane is a selectively permeable barrier that regulates exchange and allows cells to respond to external signals. In plants and algae, chloroplasts contain pigments and systems for photosynthesis, converting light energy into chemical energy. These structures cooperate to support cell survival and function.',
 points:['Nucleus and genetic regulation','Mitochondria and aerobic ATP formation','Ribosomes and protein production','Membrane selective transport and signaling','Chloroplasts and photosynthesis']},
'IX-BIO-2025-C04-B02-L01':{
 answer:'Meiosis reduces the number of chromosome sets as sexually reproducing organisms make gametes. DNA is replicated before the first meiotic division, but the cell then passes through two divisions, meiosis I and meiosis II. Homologous chromosomes separate during the first division, whereas sister chromatids usually separate during the second. Recombination and independent assortment can create new combinations of inherited genetic material. When two haploid gametes fuse during fertilization, they restore the diploid chromosome number in the zygote. This cycle helps preserve the normal chromosome count while generating variation among offspring.',
 points:['Reduction of chromosome sets','One DNA replication and two divisions','Homologues versus sister chromatids separation','Recombination and independent assortment','Fertilization restores diploid complement']},
'IX-BIO-2025-C05-B02-L01':{
 answer:'Homeostasis means maintaining internal conditions within ranges that support normal cell function despite changes in the environment. The respiratory system supplies oxygen and removes carbon dioxide, while the circulatory system transports these gases and nutrients around the body. The kidneys control the balance of water, salts and many waste substances. Nervous signals and endocrine hormones detect and coordinate responses to changing conditions. The skin also helps regulate heat loss through blood-vessel responses and sweating. These systems work together through feedback, so a change in one body function can lead to adjustments in several organs.',
 points:['Homeostasis is controlled internal stability','Respiratory gas exchange','Circulatory transport','Kidney water, salt and waste balance','Nervous/endocrine and temperature regulation']},
'IX-BIO-2025-C06-B02-L01':{
 answer:'A gene is a region of DNA carrying sequence information for a functional product. In a protein-coding gene, the DNA sequence is copied into an RNA message during transcription. In a eukaryotic cell, processed messenger RNA can move from the nucleus to ribosomes in the cytoplasm. During translation, ribosomes read the message in codons, and transfer RNA helps supply the corresponding amino acids. The amino acids join into a chain that folds and may be chemically modified to become a functional protein. This links hereditary information to the proteins that carry out many cell activities.',
 points:['DNA genes encode functional information','Transcription to messenger RNA','Messenger RNA reaches ribosomes','Translation by codons and amino-acid delivery','Protein folding and function']},
'IX-BIO-2025-C07-B02-L01':{
 answer:'Enzymes work when a suitable substrate interacts with their active sites, so activity depends on both collisions and the structure of the enzyme. Raising temperature generally increases molecular movement and may increase rate until an optimum is reached; excessive heating can disrupt the protein and reduce its activity. Changes in pH can alter active-site charges and shape, producing a characteristic pH range for each enzyme. Increasing substrate concentration usually increases reaction rate initially, but the rate levels off when available active sites are occupied. Inhibitors reduce activity through interference with binding or another aspect of catalysis.',
 points:['Temperature and the enzyme optimum','High temperature can disrupt structure','pH affects active-site conditions','Substrate concentration causes eventual saturation','Inhibitors interfere with catalysis']},
'IX-BIO-2025-C08-B02-L01':{
 answer:'Photosynthesis uses light energy to form energy-rich organic compounds from carbon dioxide and water, with oxygen released during oxygenic photosynthesis. In plants and many algae, this process takes place in chloroplasts. Aerobic cellular respiration uses organic food molecules and oxygen to transfer energy into ATP, producing carbon dioxide and water. In eukaryotic cells, much of the ATP-producing machinery involved in aerobic respiration operates in mitochondria. Photosynthesis mainly stores incoming light energy in molecules, while respiration helps cells access chemical energy for work. A green plant also respires, even during periods without light.',
 points:['Photosynthetic purpose and light input','Carbon dioxide, water, sugars and oxygen','Photosynthesis located in chloroplasts','Aerobic respiration inputs, outputs and mitochondria','Plants also respire when photosynthesis is absent']},
'IX-BIO-2025-C09-B02-L01':{
 answer:'Stomata are small pores in the surfaces of leaves that allow gases to diffuse between internal air spaces and the atmosphere. Carbon dioxide enters through open stomata and can be used in photosynthesis. Oxygen produced by photosynthesis and water vapour can leave through these pores. Guard cells change their shape as their water content and turgor change, regulating how widely the pores open. Wider openings may improve carbon dioxide uptake but usually increase water loss through transpiration. Stomatal regulation therefore helps plants balance the need for photosynthetic gases against the need to conserve water.',
 points:['Stomata as leaf pores','Carbon dioxide enters for photosynthesis','Oxygen and water vapour exit','Guard-cell turgor controls aperture','Gas uptake versus water-loss trade-off']},
'IX-BIO-2025-C10-B02-L01':{
 answer:'Pollination transfers a pollen grain from an anther to a suitable stigma. If the conditions are suitable, the pollen grain germinates and develops a tube that grows toward an ovule. In flowering plants, male gametes travel through that tube and take part in double fertilization, forming a zygote and the tissue that usually becomes endosperm. The zygote develops into an embryo, and the ovule becomes a seed with protective tissues and food reserves. The surrounding ovary typically develops into a fruit, which can protect the seeds and aid their later dispersal.',
 points:['Pollen moves to a suitable stigma','Pollen germination and tube development','Fertilization and formation of zygote/endosperm','Ovule develops into a seed with embryo','Ovary develops into fruit']},
'IX-BIO-2025-C11-B02-L01':{
 answer:'To present categorical biological data, first define categories that do not overlap, such as several observed types of leaf or species. Count observations within each category and record those counts in a frequency table. On a bar chart, place the distinct category labels along one axis and use a consistent numerical scale for their frequencies on the other. Draw bars of equal width with spaces between them, because categories are separate groups and not continuous intervals. A descriptive title, clearly labeled axes and suitable units where applicable help readers compare the frequencies accurately.',
 points:['Identify separate valid categories','Calculate and tabulate frequency','Select consistent axis scale','Draw equal-width separated bars','Label axes and provide informative title']}
})

function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==ORIGINAL_SHA)
  throw Error('BIO9_ANSWER_SNAPSHOT_CHANGED')
 let original
 try{original=JSON.parse(bytes)}catch(_){throw Error('BIO9_ANSWER_SNAPSHOT_CHANGED')}
 if(JSON.stringify(original)!==JSON.stringify(source))throw Error('BIO9_ANSWER_SNAPSHOT_CHANGED')
 if(!Array.isArray(source.drafts)||source.drafts.length!==66||
   source.publicationAllowed!==false||source.liveImportAllowed!==false)
  throw Error('BIO9_SOURCE_PROVISIONAL_EXPECTED')
 const s=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!s||Number(s.grade)!==9||String(s.subject).toLowerCase()!=='biology'||
   String(s.medium).toLowerCase()!=='english'||s.pdfSha256!==source.sourcePdfSha256)
  throw Error('BIO9_SOURCE_REGISTRY_DRIFT')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==22||Object.keys(ANSWERS).length!==11||Object.keys(SECOND_SET).length!==11)
  throw Error('BIO9_LONG_SOURCE_COVERAGE_DRIFT')
 const seen=new Set(),items=[],deferred=[]
 for(const q of longs){
  if(!q.id||seen.has(q.id))throw Error('BIO9_DUPLICATE_QUESTION_ID')
  seen.add(q.id)
  if(q.marks!==5||q.source?.catalogRecordId!==s.recordId||
     q.source?.pdfSha256!==s.pdfSha256||!rubricOnlyLongAnswer(q.type,q.content?.en?.answer))
   throw Error('BIO9_SOURCE_NOT_ELIGIBLE:'+q.id)
  const proposal=ANSWERS[q.id]||SECOND_SET[q.id]
  if(!proposal){deferred.push(q.id);continue}
  if(proposal.answer.length<200||rubricOnlyLongAnswer('long',proposal.answer)||
     !Array.isArray(proposal.points)||proposal.points.length!==5||
     new Set(proposal.points).size!==5||
     proposal.points.some(x=>typeof x!=='string'||x.length<15))
   throw Error('BIO9_AUTHORING_PROPOSAL_INCOMPLETE:'+q.id)
  items.push({
   questionId:q.id,chapterNo:q.chapter.number,topicId:q.topicId,marks:5,
   originalQuestionSha256:sha(JSON.stringify(q)),
   originalAnswerSha256:sha(q.content.en.answer),
   sourceFileSha256:ORIGINAL_SHA,sourceRecordId:s.recordId,
   declaredSourcePdfSha256:s.pdfSha256,
   originalQuestionAnswerUnmodified:true,
   proposedEnglishModelAnswer:proposal.answer,
   proposedSeparateMarkingCriteria:proposal.points,
   qualifiedSubjectReviewed:false,schoolBookEditionAndPageVerified:false,
   englishUrduEquivalenceVerified:false,independentReviewerId:null,
   approvedQuestionRevisionId:null,approved:false,published:false,
   status:'ORIGINAL_PROVISIONAL_MODEL_ANSWER_AWAITING_BIOLOGY_IX_FACULTY_REVIEW'
  })
 }
 if(items.length!==22||deferred.length!==0||new Set(items.map(q=>q.chapterNo)).size!==11)
  throw Error('BIO9_TWENTY_TWO_LONG_ANSWERS_NOT_COVERED')
 return {
  schemaVersion:'assps-biology9-twenty-two-long-answer-proposals-v1',
  scope:'INDEPENDENTLY_AUTHORED_CANDIDATES_NOT_SCHOOL_SOURCE_VERIFIED',
  sourceFile:'biology9EnglishStarter2026.json',sourceFileSha256:ORIGINAL_SHA,
  claimedPdfSourceId:s.recordId,claimedPdfSha256:s.pdfSha256,
  originalAuthoredQuestions:source.drafts.length,
  originalLongQuestionCount:longs.length,
  newlyAuthoredLongAnswerDrafts:items.length,
  newlyAuthoredSeparateMarkingPoints:items.length*5,
  remainingRubricOnlyLongQuestionIds:deferred,
  qualifiedTeacherReviewed:0,approved:0,published:0,
  caution:'No source-textbook or physical page attestation and no human signoff. No original question or answer field changes.',
  items
 }
}
function markdown(d){
 return [
  '# Grade IX Biology — twenty-two independently authored long-answer proposals',
  '', '**Original teaching drafts only. Zero human academic approvals and zero published answers.**',
  '',`Original authored batch: ${d.originalAuthoredQuestions} questions; ${d.originalLongQuestionCount} rubric-only long answers. Two newly authored explanatory drafts from EACH of 11 original chapters (${d.newlyAuthoredLongAnswerDrafts} total) plus ${d.newlyAuthoredSeparateMarkingPoints} separate five-mark criteria. Original source SHA \`${d.sourceFileSha256}\`.`,
  '',...d.items.flatMap(x=>[
   `### ${x.questionId} — Chapter ${x.chapterNo}: ${x.topicId}`,'',
   x.proposedEnglishModelAnswer,'',
   '**Separate five-point reviewer guide:** '+x.proposedSeparateMarkingCriteria.join(' · '),''
  ]),
  '## Remaining rubric-only original question IDs within this Biology IX batch (none; original source answers unchanged)','',
  ...d.remainingRubricOnlyLongQuestionIds.map(id=>`- ${id}`),
  '', '## Faculty and school release gate','',
  'ASSPS adopted IX Biology session/edition and board exam year must be established using actual school approvals; original printed-page and chapter/exercise source verified independently. Biology subject specialist must check each answer and marks against the adopted book and original question, and Urdu meaning must be independently reviewed where applicable. New question revisions require separate academic signoff. Paper Studio verified selection is EMPTY; SaaS Core alone certifies tenant/RLS and production deployment.',
  '', '**Qualified teacher reviewed 0 · source/page verified 0 · approved 0 · published 0.**',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(SRC),source=JSON.parse(bytes),registry=JSON.parse(fs.readFileSync(REG))
 const d=build({bytes,source,registry})
 fs.writeFileSync(path.join(OUT,'ASSPS_BIOLOGY9_TWENTY_TWO_LONG_MODEL_ANSWER_DRAFTS_20261009.json'),JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(path.join(OUT,'ASSPS_BIOLOGY9_TWENTY_TWO_LONG_MODEL_ANSWER_DRAFTS_20261009.md'),markdown(d))
 console.log(JSON.stringify({original:d.originalAuthoredQuestions,long:d.originalLongQuestionCount,newAnswers:d.newlyAuthoredLongAnswerDrafts,remaining:d.remainingRubricOnlyLongQuestionIds.length,approved:d.approved}))
}
if(require.main===module)main()
module.exports={ANSWERS,SECOND_SET,ORIGINAL_SHA,build,markdown}

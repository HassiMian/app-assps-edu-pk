#!/usr/bin/env node
'use strict'
// Original curriculum-concept answer drafts only; no exercises, lab instructions or approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry9Chapter11EnglishDrafts2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUTPUT=path.join(ROOT,'docs/question-bank')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const PIN='e27178c2fabc7fc63fed68f12fdaeb8c1e7dfb085e9962fd3e7ab1e410c4825b'
const DEFERRED_IDS=Object.freeze(['IX-CHEM-2025-C11-T4-01L','IX-CHEM-2025-C11-T4-02L'])
const ANSWERS=Object.freeze({
'IX-CHEM-2025-C11-T1-01L':{
 answer:'Hydrocarbons are compounds made only of carbon and hydrogen. Carbon atoms can connect to form straight chains, branched chains and rings, which gives rise to different structures even when the elements are the same. Saturated hydrocarbons have no carbon–carbon double or triple bond; an acyclic alkane such as ethane contains carbon–carbon single bonds and is saturated. Unsaturated hydrocarbons contain at least one carbon–carbon multiple bond: ethene has a carbon–carbon double bond, whereas ethyne has a triple bond. The classification should refer to the actual carbon bonding rather than simply counting the number of hydrogen atoms in an unfamiliar formula. Ring structures require an additional caveat: a saturated cycloalkane can have fewer hydrogens than a corresponding acyclic alkane without being unsaturated.',
 points:['Define a hydrocarbon as containing carbon and hydrogen only','Describe carbon chain, branching or ring diversity','Correctly define saturated carbon bonding with no carbon-carbon multiple bond','Distinguish double and triple bonds as forms of unsaturation','Use an accurately classified example and recognize that rings affect hydrogen counts']
},
'IX-CHEM-2025-C11-T1-02L':{
 answer:'Saturated hydrocarbons have carbon–carbon single bonds only and lack carbon–carbon double and triple bonds, while unsaturated hydrocarbons have at least one carbon–carbon multiple bond. Ethane is a simple saturated example; ethene and ethyne illustrate double-bond and triple-bond unsaturation respectively. An acyclic alkane has as many hydrogen atoms as its ordinary open-chain saturated structure permits, so the general formula for these alkanes is CnH(2n+2). By comparison, simple open-chain alkenes with one double bond contain two fewer hydrogens for the same carbon count. Their bonding helps explain why unsaturated hydrocarbons can show characteristic addition reactivity whereas saturated alkanes generally show different reactivity patterns. These are broad classification tendencies, not a claim that a compound is always reactive or that its formula alone identifies all its structural features.',
 points:['Define saturated hydrocarbons through carbon-carbon single bonding','Define unsaturated hydrocarbons through carbon-carbon multiple bonding','Provide a correct saturated and unsaturated example','Relate simple acyclic alkane hydrogen count to that of an equivalent monoalkene','Relate bonding differences to broad chemical reactivity without procedural claims']
},
'IX-CHEM-2025-C11-T2-01L':{
 answer:'A homologous series is a family of structurally related compounds whose successive members differ by a repeating unit and show broadly similar chemical behavior. The acyclic saturated alkanes form one such series and follow the formula CnH(2n+2), where n is the number of carbon atoms. Successive members such as methane, ethane and propane differ by one CH2 unit in their molecular formulas. Because members possess the same general kind of carbon–hydrogen and carbon–carbon single bonding, many of their chemical properties are similar. Physical properties such as boiling point generally vary gradually as the carbon skeleton becomes larger and intermolecular attraction changes. The formula specifically describes ordinary acyclic alkanes; cycloalkanes have a different general formula. A homologous relationship does not imply that every compound has an identical boiling point or molecular shape.',
 points:['Define the meaning of a homologous series','Give the acyclic alkane general formula CnH(2n+2)','Explain the difference of one CH2 unit between successive members','Relate consistent bond patterns to broad chemical similarity','Explain gradual physical-property trends with molecular size and a scope caveat']
},
'IX-CHEM-2025-C11-T2-02L':{
 answer:'A molecular formula states the number of atoms of each element in a molecule, whereas a structural formula also shows how those atoms are connected. For an acyclic alkane with n carbon atoms, the molecular formula is CnH(2n+2). Ethane has two carbons and six hydrogens, so its molecular formula is C2H6 and its condensed structural formula is CH3–CH3. Propane has three carbons and eight hydrogens, so its formula is C3H8 and its condensed structure is CH3–CH2–CH3. These examples occupy consecutive positions in the alkane homologous series and differ by CH2 in formula. The general molecular formula alone cannot always reveal the full carbon skeleton: for example, different branched arrangements can share a molecular formula, a phenomenon called structural isomerism.',
 points:['Distinguish molecular formula from structural connectivity','Apply CnH(2n+2) to an acyclic alkane with the selected carbon count','Give the correct ethane formula and corresponding structure','Give the correct propane formula and corresponding structure','Relate successive members by CH2 and recognize possible structural isomerism']
},
'IX-CHEM-2025-C11-T3-01L':{
 answer:'Naming a simple branched acyclic alkane begins by recognizing the connected carbon skeleton rather than choosing a parent chain only from the way a drawing happens to be laid out. The principal chain is selected as the longest suitable continuous carbon chain, and its number of carbon atoms determines the parent alkane name. Number the chain from the end that gives substituent groups the lowest appropriate set of locants, not automatically from the left of a page. Identify the shorter carbon branches as alkyl substituents, for example methyl, and associate each with its carbon-number locant. Assemble the locant, substituent prefix and parent name consistently; a four-carbon longest chain with a methyl group at carbon two is named 2-methylbutane. Additional IUPAC tie-breaking rules apply to more complicated structures, so this introductory naming summary is not complete for every possible branched compound.',
 points:['Identify an appropriate longest continuous parent carbon chain','Choose the correct parent alkane root from the parent-chain carbon count','Number the parent chain for the lowest relevant substituent locants','Identify and classify an alkyl branch such as a methyl substituent','Construct a coherent simple name such as 2-methylbutane with its locant']
},
'IX-CHEM-2025-C11-T3-02L':{
 answer:'A structural formula conveys the connectivity needed to check the name of a simple alkane, while a molecular formula by itself may be shared by different isomers. To interpret a branched structural formula, follow the longest suitable connected carbon chain and use its length to select the parent name. Next identify each attached shorter alkyl group and compare the possible chain-numbering directions to obtain the lowest appropriate substituent locants. The written name must then agree with the actual positions and counts of the branches: for example, the condensed formula CH3–CH(CH3)–CH2–CH3 represents 2-methylbutane, not straight-chain pentane. Both structures have molecular formula C5H12 but differ in connectivity. Checking the name against the displayed bonds prevents mistakes about whether a methyl group is part of the parent chain or a branch. More complex nomenclature may need additional official IUPAC priority rules.',
 points:['Identify the parent carbon-chain connectivity in a displayed structure','Distinguish an attached alkyl branch from the parent chain','Apply appropriate chain numbering to obtain low substituent locants','Explain how locants map to actual branch positions','Match 2-methylbutane to a correct structural formula and distinguish its constitutional isomer']
}
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)throw Error('CHEM9C11_SOURCE_SHA_DRIFT')
 let parsed
 try{parsed=JSON.parse(bytes)}catch(_){throw Error('CHEM9C11_SOURCE_SHA_DRIFT')}
 if(JSON.stringify(parsed)!==JSON.stringify(source))throw Error('CHEM9C11_SOURCE_SHA_DRIFT')
 if(source.publicationAllowed!==false||source.liveImportAllowed!==false||
  !Array.isArray(source.drafts)||source.drafts.length!==24)
   throw Error('CHEM9C11_MUST_REMAIN_PROVISIONAL')
 const identity=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!identity||identity.recordId!=='pectaa-catalog-007'||identity.grade!==9||
 identity.subject!=='Chemistry'||identity.medium!=='English'||identity.edition!=='2025-26'||
 identity.academicApproval!==false||identity.pdfSha256!==source.sourcePdfSha256)
  throw Error('CHEM9C11_CATALOG_DRIFT_OR_FALSE_APPROVAL')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==8||Object.keys(ANSWERS).length!==6||DEFERRED_IDS.length!==2)
  throw Error('CHEM9C11_LONG_COUNT_DRIFT')
 const seen=new Set()
 for(const q of longs){
  if(!q.id||seen.has(q.id)||(!ANSWERS[q.id]&&!DEFERRED_IDS.includes(q.id)))
   throw Error('CHEM9C11_ORIGINAL_ID_COLLISION')
  seen.add(q.id)
  if(q.chapter?.number!==11||q.marks!==5||q.review?.status!=='draft'||
   q.source?.catalogRecordId!==identity.recordId||q.source?.pdfSha256!==identity.pdfSha256||
   !rubricOnlyLongAnswer('long',q.content?.en?.answer))
   throw Error('CHEM9C11_ORIGINAL_SCOPE_OR_RUBRIC_CHANGED:'+q.id)
 }
 if(new Set([...Object.keys(ANSWERS),...DEFERRED_IDS]).size!==8||
    [...Object.keys(ANSWERS),...DEFERRED_IDS].some(id=>!seen.has(id)))
  throw Error('CHEM9C11_AUTHORED_OR_DEFERRED_SCOPE_DRIFT')
 const items=longs.filter(q=>Boolean(ANSWERS[q.id])).map(q=>{
  if(q.chapter?.number!==11||q.marks!==5||q.review?.status!=='draft'||
   q.source?.catalogRecordId!==identity.recordId||q.source?.pdfSha256!==identity.pdfSha256||
   !rubricOnlyLongAnswer('long',q.content?.en?.answer))
   throw Error('CHEM9C11_ORIGINAL_SCOPE_OR_RUBRIC_CHANGED:'+q.id)
  const draft=ANSWERS[q.id]
  if(typeof draft.answer!=='string'||draft.answer.length<280||
   rubricOnlyLongAnswer('long',draft.answer)||!Array.isArray(draft.points)||
   draft.points.length!==q.marks||new Set(draft.points).size!==q.marks||
   draft.points.some(p=>typeof p!=='string'||p.length<18))
   throw Error('CHEM9C11_INVALID_DRAFT_OR_MARKS:'+q.id)
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
   reviewStatus:'RESEARCH_DRAFT_REQUIRES_CH11_PHYSICAL_TEXTBOOK_AND_QUALIFIED_SUBJECT_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-chemistry9-ch11-six-original-answer-research-v1',
  originalQuestionFile:path.basename(INPUT),originalFileSha256:PIN,
  sourceCatalogId:identity.recordId,sourceCatalogMediumClaim:identity.medium,
  sourceCatalogEditionClaim:identity.edition,sourceCatalogPdfSha256:identity.pdfSha256,
  originalAuthoredResearchQuestions:source.drafts.length,
  originalRubricOnlyLongQuestions:longs.length,
  deferredExistingOriginalIds:DEFERRED_IDS,
  deferredReason:'REACTION_AND_PREPARATION_TOPICS_REQUIRE_QUALIFIED_FACULTY_SAFETY_AND_SOURCE_REVIEW',
  newExplanatoryAnswerResearchDrafts:items.length,newFiveMarkPointProposals:30,
  humanSchoolSourceVerified:0,qualifiedHumanAcademicReviewed:0,academicallyApproved:0,verifiedPublished:0,
  caveat:'Catalog record and preexisting page claims are not independent physical printed page, exercise, school-adopted book, or school session evidence. Research explanations and marking proposals remain unapproved.',
  items
 }
}
function markdown(d){
 return [
 '# Grade IX Chemistry Chapter 11 — six original explanatory research drafts','',
 '**Independent candidate explanations only, not new published questions.**','',
 'Original authored dataset SHA256: '+d.originalFileSha256,
 'Catalog record '+d.sourceCatalogId+'; edition claim '+d.sourceCatalogEditionClaim+'; PDF hash claim '+d.sourceCatalogPdfSha256+'.',
 'Page numbers in source candidate records are NOT independent printed-book or exercise verification.','',
 ...d.items.flatMap((x,i)=>[
  '## '+(i+1)+'. '+x.questionId+'; topic '+x.topicId+'; 5 marks','',
  x.proposedIndependentEnglishExplanation,'','**Five separate proposed one-mark criteria:**',
  ...x.proposedDistinctMarkingPoints.map((p,j)=>(j+1)+'. '+p),''
 ]),
 'Academic review/adoption/page/Urdu/signature/approval/publication all remain unverified or false. Two original reaction/preparation IDs are intentionally not authored pending qualified faculty review: '+DEFERRED_IDS.join(', ')+'.',
 'Independent general chemical terminology reference: OpenStax Chemistry 2e hydrocarbons https://openstax.org/books/chemistry-2e/pages/20-1-hydrocarbons and IUPAC Blue Book simple branched alkane naming https://iupac.qmul.ac.uk/BlueBook/P1.html . These are NOT actual ASSPS-approved Punjab textbook/page or examination-year evidence.','',
 'No original question/old answer was overwritten, no chemical experiment procedure or laboratory directions supplied, and no Paper Studio verified question was released.',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(INPUT)
 const data=build({bytes,source:JSON.parse(bytes),registry:JSON.parse(fs.readFileSync(REGISTRY))})
 const prefix=path.join(OUTPUT,'ASSPS_CHEMISTRY9_CH11_SIX_LONG_MODEL_ANSWER_DRAFTS_20261009')
 fs.writeFileSync(prefix+'.json',JSON.stringify(data,null,2)+'\n')
 fs.writeFileSync(prefix+'.md',markdown(data))
 console.log(JSON.stringify({drafts:data.items.length,criteria:data.newFiveMarkPointProposals,approved:data.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,DEFERRED_IDS,PIN,INPUT,REGISTRY}

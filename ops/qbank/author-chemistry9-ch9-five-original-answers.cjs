#!/usr/bin/env node
'use strict'
// Original curriculum-concept answer drafts only; no exercises, lab instructions or approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry9Chapter9EnglishDrafts2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUTPUT=path.join(ROOT,'docs/question-bank')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const PIN='59f4914435b0e1fd542dc8d0adb9579afdff0e73777f6218cdd17ad015895884'
const ANSWERS=Object.freeze({
'IX-CHEM-2025-C09-T01-L01':{
 answer:'Group 1 elements are alkali metals with a single outer-shell electron, which is relatively easy to remove to form a positive-one ion. From lithium towards heavier group members, additional occupied shells increase atomic size and shielding. The outer electron is therefore held less strongly despite a larger nuclear charge, and the first ionization energy generally falls. Consequently, the tendency to lose that electron and chemical reactivity generally increase down the group. These metals are relatively soft with low melting points compared with many other metals, and their melting points generally decrease down the group. Density does not increase uniformly across every adjacent pair; actual observations may show exceptions. Hydrogen is not an alkali metal, despite its placement in Group 1.',
 points:['Relate progression down Group 1 to increasing atomic size','Explain additional shell shielding and weaker attraction to outer electron','Relate lower first-ionization energy to easier loss of the valence electron','State that chemical reactivity generally increases down the group','Describe a qualified physical-property trend such as decreasing melting points with exceptions']
},
'IX-CHEM-2025-C09-T02-L01':{
 answer:'The halogens in Group 17 are non-metals with seven valence electrons, so they often form negative-one ions by gaining an electron. Going down the group, their atoms become larger and more strongly shielded. The attraction for an incoming electron and their ability to oxidize other substances generally decrease, so elemental halogen reactivity tends to decrease from fluorine toward iodine. At ordinary room conditions, fluorine and chlorine are gases, bromine is a liquid and iodine is a solid; melting and boiling points generally rise as molecular size and intermolecular attraction increase. Density also generally increases down the family. These trends concern the elemental halogens, and exact values, special chemistry of fluorine and different reaction partners require qualification.',
 points:['Explain increasing atomic size and general density trend down Group 17','Describe rising melting/boiling points and changes in physical state','State that elemental halogen chemical reactivity generally decreases down the group','State that halogen oxidizing power generally decreases down the group','Explain broad electron-gain behavior through increasing shielding and weaker outer attraction']
},
'IX-CHEM-2025-C09-T03-L01':{
 answer:'Transition elements are generally metals, so many conduct electricity and heat and show metallic lustre. Many are relatively dense and strong and have high melting points compared with typical main-group metals, although properties vary and exceptions such as mercury must be acknowledged. Their partially occupied d-electron structures in atoms or common ions help explain features including variable oxidation states and often coloured compounds. Several transition metals and their compounds also act as catalysts, increasing reaction rates without being consumed overall. Industrial applications can exploit this catalytic behaviour; iron-containing catalysts in ammonia production are a familiar example. The choice of a catalyst depends on the specific process, and no individual transition element displays every typical feature.',
 points:['Describe metallic character and associated conductivity','Identify comparatively high density as a common but non-universal feature','Describe common strength/high melting-point tendencies with exceptions','Connect some transition elements or compounds to catalytic action','Link a relevant transition-metal catalyst property to an industrial application']
},
'IX-CHEM-2025-C09-T04-L01':{
 answer:'Noble gases are in Group 18 and have especially stable outer-electron arrangements: helium has a filled first shell containing two electrons, while the other familiar noble gases have full valence shells of eight electrons. These configurations make gaining, losing or sharing electrons energetically less favourable in many ordinary circumstances. Consequently, noble gases usually have low chemical reactivity. They exist as individual atoms rather than forming the common diatomic molecules of certain other non-metal groups, and they are therefore described as monatomic gases at ordinary conditions. Chemical inactivity is a tendency, not an absolute rule: compounds of heavier noble gases, especially xenon, are known. The filled-shell idea explains the broad pattern without claiming that no noble-gas reaction is possible.',
 points:['Describe a filled stable outer shell, including the helium two-electron exception','Explain why the filled outer configuration is relatively stable','Connect stability with limited tendency to gain electrons','Connect stability with limited tendency to lose or share electrons','Explain usual monatomic existence and low reactivity without asserting absolute inertness']
},
'IX-CHEM-2025-C09-T05-L01':{
 answer:'Metals generally conduct electrical current and heat well because mobile electrons can transfer charge and energy through a metallic structure. Most are malleable and ductile, so they can be shaped rather than shattering under ordinary mechanical stress, and many have a shiny surface when freshly exposed. Non-metals are more often poor electrical conductors, and solid non-metals are frequently brittle rather than malleable or ductile. Many non-metals have lower density and melting points, although such patterns are not universal and physical state depends on the element. Important exceptions include graphite, a form of carbon that conducts electricity, and mercury, which is a liquid metal at ordinary room temperature. Categories describe typical behavior, not properties shared by every member.',
 points:['Compare usual metallic and non-metallic electrical or thermal conductivity','Compare metallic malleability and ductility with brittle solid non-metals','Describe typical lustre and physical-property contrasts','Distinguish common physical states and variability in density or strength','Correctly discuss a meaningful exception such as conducting graphite or liquid mercury']
}
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)throw Error('CHEM9C9_SOURCE_SHA_DRIFT')
 let parsed
 try{parsed=JSON.parse(bytes)}catch(_){throw Error('CHEM9C9_SOURCE_SHA_DRIFT')}
 if(JSON.stringify(parsed)!==JSON.stringify(source))throw Error('CHEM9C9_SOURCE_SHA_DRIFT')
 if(source.publicationAllowed!==false||source.liveImportAllowed!==false||
  !Array.isArray(source.drafts)||source.drafts.length!==25)
   throw Error('CHEM9C9_MUST_REMAIN_PROVISIONAL')
 const identity=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!identity||identity.recordId!=='pectaa-catalog-007'||identity.grade!==9||
 identity.subject!=='Chemistry'||identity.medium!=='English'||identity.edition!=='2025-26'||
 identity.academicApproval!==false||identity.pdfSha256!==source.sourcePdfSha256)
  throw Error('CHEM9C9_CATALOG_DRIFT_OR_FALSE_APPROVAL')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==5||Object.keys(ANSWERS).length!==5)throw Error('CHEM9C9_LONG_COUNT_DRIFT')
 const seen=new Set()
 const items=longs.map(q=>{
  if(!q.id||seen.has(q.id)||!ANSWERS[q.id])throw Error('CHEM9C9_ORIGINAL_ID_COLLISION')
  seen.add(q.id)
  if(q.chapter?.number!==9||q.marks!==5||q.review?.status!=='draft'||
   q.source?.catalogRecordId!==identity.recordId||q.source?.pdfSha256!==identity.pdfSha256||
   !rubricOnlyLongAnswer('long',q.content?.en?.answer))
   throw Error('CHEM9C9_ORIGINAL_SCOPE_OR_RUBRIC_CHANGED:'+q.id)
  const draft=ANSWERS[q.id]
  if(typeof draft.answer!=='string'||draft.answer.length<280||
   rubricOnlyLongAnswer('long',draft.answer)||!Array.isArray(draft.points)||
   draft.points.length!==q.marks||new Set(draft.points).size!==q.marks||
   draft.points.some(p=>typeof p!=='string'||p.length<18))
   throw Error('CHEM9C9_INVALID_DRAFT_OR_MARKS:'+q.id)
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
   reviewStatus:'RESEARCH_DRAFT_REQUIRES_CH9_PHYSICAL_TEXTBOOK_AND_QUALIFIED_SUBJECT_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-chemistry9-ch9-five-original-answer-research-v1',
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
 '# Grade IX Chemistry Chapter 9 — five original explanatory research drafts','',
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
 'General conceptual cross-check: OpenStax Chemistry 2e representative elements and periodicity https://openstax.org/books/chemistry-2e/pages/18-1-periodicity . These are conceptual references, NOT adopted Punjab textbook/page or examination-year evidence.','',
 'No original question/old answer was overwritten, no chemical experiment procedure or laboratory directions supplied, and no Paper Studio verified question was released.',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(INPUT)
 const data=build({bytes,source:JSON.parse(bytes),registry:JSON.parse(fs.readFileSync(REGISTRY))})
 const prefix=path.join(OUTPUT,'ASSPS_CHEMISTRY9_CH09_FIVE_LONG_MODEL_ANSWER_DRAFTS_20261009')
 fs.writeFileSync(prefix+'.json',JSON.stringify(data,null,2)+'\n')
 fs.writeFileSync(prefix+'.md',markdown(data))
 console.log(JSON.stringify({drafts:data.items.length,criteria:data.newFiveMarkPointProposals,approved:data.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,PIN,INPUT,REGISTRY}

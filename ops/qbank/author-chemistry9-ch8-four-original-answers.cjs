#!/usr/bin/env node
'use strict'
// Original curriculum-concept answer drafts only; no exercises, lab instructions or approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry9Chapter8EnglishDrafts2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUTPUT=path.join(ROOT,'docs/question-bank')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const PIN='39663931ec358ec088a258cc4aecd7d057bce6d5873cbb6857a48706e905cdef'
const ANSWERS=Object.freeze({
'IX-CHEM-2025-C08-T01-L01':{
answer:'The modern periodic table arranges elements by increasing atomic number, which is the number of protons in an atom. Each horizontal row is a period, while each vertical column is a group. As atomic number increases across a period, electrons follow a general pattern of filling occupied shells and subshells. When the next period begins, a new principal energy level becomes occupied in the simple main-group model. Members of a main-group column usually have related outer-electron structures, which helps explain their recurring chemical behavior. These similarities are patterns rather than absolute laws: hydrogen is an important exception to simple Group 1 metal behavior. Atomic number therefore sets the ordering, while electron structure accounts for much of the observed periodicity.',
points:['Explain ascending atomic-number order','Identify horizontal rows as periods','Identify vertical columns as groups','Relate successive periods to occupied principal electron-shell patterns','Relate main-group outer electrons to recurring chemical properties']
},
'IX-CHEM-2025-C08-T02-L01':{
answer:'An electron configuration describes the arrangement of electrons in atomic shells and subshells. For a typical main-group atom, the highest occupied principal energy level indicates its period, while the outer-shell electron pattern gives useful information about its group. The number and arrangement of valence electrons influence the tendency to lose, gain or share electrons in chemical bonding. Elements in a common main-group column often show similar chemical properties because their valence configurations resemble one another. For example, sodium has one electron in its outermost occupied shell, belongs to period three and commonly forms a positive-one ion by losing that electron. This introductory method is a guide, not a universal predictor for transition elements or every compound.',
points:['Use the highest occupied principal energy level to infer the period','Relate main-group valence-electron arrangement to group tendency','Explain how outer electrons influence common ion formation or bonding','Connect shared valence patterns to similar main-group chemistry','Give a consistent sodium or other main-group example']
},
'IX-CHEM-2025-C08-T03-L01':{
answer:'For many main-group elements, position in a periodic-table column gives a useful first prediction of the charge on a common simple ion. Group 1 metals usually lose one outer electron and form positive-one ions, such as sodium ions. Group 2 metals commonly lose two electrons and form positive-two ions, such as magnesium ions. Some Group 16 non-metals form negative-two ions by gaining electrons, as in the oxide ion. Group 17 halogens often gain one electron and form negative-one ions, as chloride does. The underlying idea is that changes in valence electrons can produce a more stable outer arrangement. The pattern is a prediction, not a universal rule: covalent compounds, variable oxidation states and other exceptions require separate explanations.',
points:['Link main-group position to common valence-electron patterns','Explain positive metal ions formed by electron loss','Explain negative non-metal ions formed by electron gain','Provide correct Group 1 positive-one or Group 2 positive-two example','Provide correct Group 16 negative-two or Group 17 negative-one example']
},
'IX-CHEM-2025-C08-T04-L01':{
answer:'Across a typical period from left to right, atomic radius generally decreases because increasing effective nuclear attraction draws electrons in the same broad principal shell closer. Moving down a group, atomic radius usually increases as additional occupied shells and electron shielding place the outer electrons farther from the nucleus. First ionization energy tends to increase across a period, because removing an outer electron becomes more difficult, but it generally decreases down a group as distance and shielding increase. Electronegativity of bonded atoms tends to increase across a period and decrease down a group. These are general trends, not exception-free rules: electron subshell arrangements, pairing and measurement definitions matter, and electronegativity values for noble gases need special care. Effective nuclear charge, shielding and shell structure explain the main patterns.',
points:['State the general decrease of atomic radius across a period','State the general increase of atomic radius down a group','Describe first ionization-energy trends across and down','Describe electronegativity trends across and down','Use effective nuclear attraction, occupied shells and shielding to explain trends with exceptions']
}
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)throw Error('CHEM9C8_SOURCE_SHA_DRIFT')
 let parsed
 try{parsed=JSON.parse(bytes)}catch(_){throw Error('CHEM9C8_SOURCE_SHA_DRIFT')}
 if(JSON.stringify(parsed)!==JSON.stringify(source))throw Error('CHEM9C8_SOURCE_SHA_DRIFT')
 if(source.publicationAllowed!==false||source.liveImportAllowed!==false||
  !Array.isArray(source.drafts)||source.drafts.length!==20)
   throw Error('CHEM9C8_MUST_REMAIN_PROVISIONAL')
 const identity=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!identity||identity.recordId!=='pectaa-catalog-007'||identity.grade!==9||
 identity.subject!=='Chemistry'||identity.medium!=='English'||identity.edition!=='2025-26'||
 identity.academicApproval!==false||identity.pdfSha256!==source.sourcePdfSha256)
  throw Error('CHEM9C8_CATALOG_DRIFT_OR_FALSE_APPROVAL')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==4||Object.keys(ANSWERS).length!==4)throw Error('CHEM9C8_LONG_COUNT_DRIFT')
 const seen=new Set()
 const items=longs.map(q=>{
  if(!q.id||seen.has(q.id)||!ANSWERS[q.id])throw Error('CHEM9C8_ORIGINAL_ID_COLLISION')
  seen.add(q.id)
  if(q.chapter?.number!==8||q.marks!==5||q.review?.status!=='draft'||
   q.source?.catalogRecordId!==identity.recordId||q.source?.pdfSha256!==identity.pdfSha256||
   !rubricOnlyLongAnswer('long',q.content?.en?.answer))
   throw Error('CHEM9C8_ORIGINAL_SCOPE_OR_RUBRIC_CHANGED:'+q.id)
  const draft=ANSWERS[q.id]
  if(typeof draft.answer!=='string'||draft.answer.length<280||
   rubricOnlyLongAnswer('long',draft.answer)||!Array.isArray(draft.points)||
   draft.points.length!==q.marks||new Set(draft.points).size!==q.marks||
   draft.points.some(p=>typeof p!=='string'||p.length<18))
   throw Error('CHEM9C8_INVALID_DRAFT_OR_MARKS:'+q.id)
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
   reviewStatus:'RESEARCH_DRAFT_REQUIRES_CH8_PHYSICAL_TEXTBOOK_AND_QUALIFIED_SUBJECT_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-chemistry9-ch8-four-original-answer-research-v1',
  originalQuestionFile:path.basename(INPUT),originalFileSha256:PIN,
  sourceCatalogId:identity.recordId,sourceCatalogMediumClaim:identity.medium,
  sourceCatalogEditionClaim:identity.edition,sourceCatalogPdfSha256:identity.pdfSha256,
  originalAuthoredResearchQuestions:source.drafts.length,
  originalRubricOnlyLongQuestions:longs.length,
  newExplanatoryAnswerResearchDrafts:items.length,newFiveMarkPointProposals:20,
  humanSchoolSourceVerified:0,qualifiedHumanAcademicReviewed:0,academicallyApproved:0,verifiedPublished:0,
  caveat:'Catalog record and preexisting page claims are not independent physical printed page, exercise, school-adopted book, or school session evidence. Research explanations and marking proposals remain unapproved.',
  items
 }
}
function markdown(d){
 return [
 '# Grade IX Chemistry Chapter 8 — four original explanatory research drafts','',
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
 'General scientific cross-check: OpenStax Chemistry 2e periodic property trends https://openstax.org/books/chemistry-2e/pages/6-5-periodic-variations-in-element-properties and representative main-group elements https://openstax.org/books/chemistry-2e/pages/18-1-periodicity . These are conceptual references, NOT adopted Punjab textbook/page or examination-year evidence.','',
 'No original question/old answer was overwritten, no chemical experiment procedure or laboratory directions supplied, and no Paper Studio verified question was released.',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(INPUT)
 const data=build({bytes,source:JSON.parse(bytes),registry:JSON.parse(fs.readFileSync(REGISTRY))})
 const prefix=path.join(OUTPUT,'ASSPS_CHEMISTRY9_CH08_FOUR_LONG_MODEL_ANSWER_DRAFTS_20261009')
 fs.writeFileSync(prefix+'.json',JSON.stringify(data,null,2)+'\n')
 fs.writeFileSync(prefix+'.md',markdown(data))
 console.log(JSON.stringify({drafts:data.items.length,criteria:data.newFiveMarkPointProposals,approved:data.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,PIN,INPUT,REGISTRY}

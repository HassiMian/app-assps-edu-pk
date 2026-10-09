#!/usr/bin/env node
'use strict'
// Isolated English answer research proposals; no academic approval or live import.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry9Chapter6EnglishDrafts2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUTPUT=path.join(ROOT,'docs/question-bank')
const hash=x=>crypto.createHash('sha256').update(x).digest('hex')
const PIN='f0c65a021ec52c24b2b69879f2fdb34008a94b40e50ad0a04f6391988c7df427'
const ANSWERS=Object.freeze({
 'IX-CHEM-2025-C06-T00-L01':{
  answer:'An irreversible reaction proceeds predominantly in one direction under the stated conditions; its products do not readily reform the original reactants. A reversible reaction can proceed both forwards, forming products, and backwards, reforming reactants. In a closed system, participating substances remain available instead of being lost to the surroundings, allowing a possible reverse reaction. If both directions are feasible under the conditions, the system may develop dynamic equilibrium, where forward and reverse reaction rates are equal even though reactions continue. Closing a system does not, by itself, make an inherently one-way process reversible.',
  points:['Distinguish predominantly one-way irreversible behavior under stated conditions','Explain forward and reverse directions in a reversible reaction','Identify product formation and reformation of reactants','Explain why retaining participating substances can permit reverse reaction','Explain possible dynamic equilibrium without claiming all closed reactions reverse']
 },
 'IX-CHEM-2025-C06-T02-L01':{
  answer:'Initially, a mixture made mainly of reactants usually has a relatively rapid forward reaction and very little reverse reaction because little product is available. As products form, their increasing concentration permits the reverse reaction to become more significant. The forward rate may also decrease as reactants are consumed. In a closed system under fixed conditions, the forward and reverse rates can eventually become equal. This condition is dynamic equilibrium: molecular reactions continue in both directions, while the measurable concentrations remain constant. Equal rates do not require equal amounts of reactant and product, and equilibrium is not a complete stop.',
  points:['Describe why the forward reaction usually dominates initially','Explain formation and accumulation of products','Explain increasing reverse rate as products become available','Define equilibrium by equal forward and reverse rates','Explain continued reactions and constant, not necessarily equal, concentrations']
 },
 'IX-CHEM-2025-C06-T03-L01':{
  answer:'At equilibrium a change in concentration tends to shift the reaction in a direction opposing that disturbance, depending on the balanced equation. A change in temperature favours the direction that absorbs added heat or opposes cooling, so the reaction heat effect matters. Pressure changes affect a gaseous equilibrium when the numbers of gaseous particles differ between the two sides; the balanced equation is essential for predicting its direction. A catalyst increases the rates of both forward and reverse reactions, so equilibrium can be reached sooner without changing the final equilibrium composition at a fixed temperature. These relationships explain why yield and efficiency must be evaluated together rather than assuming one change always increases product formation.',
  points:['Relate concentration changes to an opposing equilibrium shift','Relate temperature effect to reaction heat absorption or release','Qualify pressure response using gaseous stoichiometry','Explain catalyst changes speed but not equilibrium position','Connect reaction-specific equilibrium shifts with yield and efficiency']
 }
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||hash(bytes)!==PIN)throw Error('CHEM9C6_SOURCE_SHA_CHANGED')
 let saved
 try{saved=JSON.parse(bytes)}catch(_){throw Error('CHEM9C6_SOURCE_SHA_CHANGED')}
 if(JSON.stringify(saved)!==JSON.stringify(source))throw Error('CHEM9C6_SOURCE_SHA_CHANGED')
 if(!Array.isArray(source.drafts)||source.drafts.length!==15||
    source.publicationAllowed!==false||source.liveImportAllowed!==false)
  throw Error('CHEM9C6_NOT_PROVISIONAL_SOURCE')
 const identity=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!identity||identity.recordId!=='pectaa-catalog-007'||identity.grade!==9||
    identity.subject!=='Chemistry'||identity.medium!=='English'||
    identity.edition!=='2025-26'||identity.academicApproval!==false||
    identity.pdfSha256!==source.sourcePdfSha256)
  throw Error('CHEM9C6_CATALOG_IDENTITY_DRIFT')
 const longs=source.drafts.filter(q=>q.type==='long')
 if(longs.length!==3||Object.keys(ANSWERS).length!==3)
  throw Error('CHEM9C6_LONG_COVERAGE_DRIFT')
 const seen=new Set()
 const items=longs.map(q=>{
  if(!q.id||seen.has(q.id)||!ANSWERS[q.id])
   throw Error('CHEM9C6_MISSING_OR_DUPLICATE_ORIGINAL_ID')
  seen.add(q.id)
  if(q.chapter?.number!==6||q.marks!==5||
     q.source?.catalogRecordId!==identity.recordId||
     q.source?.pdfSha256!==identity.pdfSha256||
     q.review?.status!=='draft'||!rubricOnlyLongAnswer('long',q.content?.en?.answer))
   throw Error('CHEM9C6_ORIGINAL_RUBRIC_OR_SCOPE_DRIFT:'+q.id)
  const proposed=ANSWERS[q.id]
  if(typeof proposed.answer!=='string'||proposed.answer.length<250||
     rubricOnlyLongAnswer('long',proposed.answer)||
     !Array.isArray(proposed.points)||proposed.points.length!==q.marks||
     new Set(proposed.points).size!==q.marks||
     proposed.points.some(p=>typeof p!=='string'||p.length<18))
   throw Error('CHEM9C6_INCOMPLETE_ANSWER_OR_MARKING_POINTS:'+q.id)
  return {
   questionId:q.id,chapterNo:q.chapter.number,topicId:q.topicId,marks:q.marks,
   sourceQuestionSha256:hash(JSON.stringify(q)),
   sourceAnswerSha256:hash(q.content.en.answer),sourceFileSha256:PIN,
   catalogSourceId:identity.recordId,claimedSourcePdfSha256:identity.pdfSha256,
   sourceQuestionClaimedPhysicalPageUnverified:q.source.page,
   originalQuestionUnchanged:true,
   proposedIndependentEnglishExplanation:proposed.answer,
   proposedDistinctMarkingPoints:proposed.points,
   answerLanguage:'English',catalogLabelMediumVerified:true,
   schoolAdoptedEditionSessionVerified:false,
   originalPrintedExercisePageVerified:false,
   qualifiedIndependentSubjectReviewed:false,urduEquivalenceReviewed:false,
   independentReviewerId:null,approvedRevisionId:null,
   academicallyApproved:false,verifiedPublished:false,
   reviewStatus:'RESEARCH_DRAFT_REQUIRES_CH6_SOURCE_PAGE_AND_QUALIFIED_SUBJECT_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-chemistry9-ch6-three-original-answer-research-v1',
  originalQuestionFile:path.basename(INPUT),originalFileSha256:PIN,
  sourceCatalogId:identity.recordId,sourceCatalogMediumClaim:identity.medium,
  sourceCatalogEditionClaim:identity.edition,sourceCatalogPdfSha256:identity.pdfSha256,
  originalAuthoredResearchQuestions:source.drafts.length,
  originalRubricOnlyLongQuestions:longs.length,
  newExplanatoryAnswerResearchDrafts:items.length,newFiveMarkPointProposals:15,
  humanSchoolSourceVerified:0,qualifiedHumanAcademicReviewed:0,
  academicallyApproved:0,verifiedPublished:0,
  caveat:'Catalog label, source hash, and prior page claims do not independently verify the actual adopted ASSPS textbook, physical page/exercise or academic session. No original answer or publication status changed.',
  items
 }
}
function markdown(d){
 return [
  '# Grade IX Chemistry Chapter 6 — three original long-answer research candidates','',
  '**Faculty-review proposals only. Neither textbook adoption/page nor independent qualified Chemistry/Urdu correctness has been verified.**','',
  'Unchanged original file SHA256: '+d.originalFileSha256,
  'Catalog metadata record: '+d.sourceCatalogId+'; edition label: '+d.sourceCatalogEditionClaim+'; PDF hash claim: '+d.sourceCatalogPdfSha256,
  'This does NOT prove applicability to the school academic session or actual exercise pages.','',
  ...d.items.flatMap((q,i)=>[
   '## '+(i+1)+'. '+q.questionId+' (topic '+q.topicId+', '+q.marks+' marks)','',
   q.proposedIndependentEnglishExplanation,'',
   '**Proposed distinct criteria (1 mark each):**',
   ...q.proposedDistinctMarkingPoints.map((p,j)=>(j+1)+'. '+p),
   ''
  ]),
  '**HOLD:** No adopted book/physical exercise-page evidence, independent Chemistry teacher or Urdu review, signed question revision, approval or verified publication. Original authored records and Paper Studio verified picker unchanged.',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(INPUT),source=JSON.parse(bytes)
 const registry=JSON.parse(fs.readFileSync(REGISTRY))
 const d=build({bytes,source,registry})
 const prefix=path.join(OUTPUT,'ASSPS_CHEMISTRY9_CH06_THREE_LONG_MODEL_ANSWER_DRAFTS_20261009')
 fs.writeFileSync(prefix+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(prefix+'.md',markdown(d))
 console.log(JSON.stringify({drafts:d.items.length,markingPoints:d.newFiveMarkPointProposals,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,PIN,INPUT,REGISTRY}

#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/physics10Starter2026.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUT=path.join(ROOT,'docs/question-bank')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const LOCKED_SHA='cc25a3b4d00fb9233d711f9cdafd19960d5b1c2a7f72a48005ec8677ab26c416'
const ANSWERS=Object.freeze({
'X-PHY-C11-L01':{
 answer:'Conduction is heat transfer through interactions among neighbouring particles, with mobile electrons also helping in many metals; the material as a whole need not flow. Convection transfers thermal energy by the bulk movement of a liquid or gas, often as density differences produce circulation. Radiation transfers energy by electromagnetic waves and therefore does not require a material medium. For example, thermal energy moves along a metal utensil by conduction, through circulating warm water by convection, and from the Sun across space by radiation. These processes may occur together in a real situation.',
 points:['Conduction through material interactions','Electron contribution in metals','Convection by fluid movement','Radiation by electromagnetic waves without medium','One suitable example of each transfer mechanism']},
'X-PHY-C15-L01':{
 answer:'Electric charging involves the movement or redistribution of electrons while total electric charge is conserved. When two materials interact by rubbing, electrons can transfer from one to the other and leave opposite net charges. In charging by contact, charge can be redistributed when an already charged object touches another conductor. Induction differs because a nearby charge changes the distribution of charges within an object without direct contact. Under suitable grounding conditions, that separation can result in a lasting net charge. Positive nuclei normally remain fixed in solid materials; the charge movement is mainly associated with electrons.',
 points:['Conservation of charge','Electron transfer associated with friction','Redistribution through contact','Charge separation without contact during induction','Distinguish grounding and mobile electrons conceptually']},
'X-PHY-C17-L01':{
 answer:'A simple direct-current motor converts electrical energy into mechanical rotation through the magnetic force on a current-carrying conductor. A coil placed in a magnetic field experiences forces on opposite sides that can create a turning effect or torque. As the coil rotates, its orientation changes relative to the field. In the familiar brushed motor, a split-ring commutator reverses the direction of current in the coil approximately every half-turn, allowing the torque to continue acting in the same rotational direction. The magnetic field, electric current and commutator therefore work together to sustain rotation.',
 points:['Electrical to mechanical energy conversion','Current-carrying conductor in magnetic field','Opposing coil-side forces produce torque','Current reversal by split-ring commutator','Continuous turning effect across successive half-turns']},
'X-PHY-C19-L01':{
 answer:'A diode is a semiconductor component that normally allows current to flow much more readily in one direction than the other; this property is useful in rectifying alternating signals. A transistor can be controlled by a smaller electrical input to switch an output or to amplify an appropriate signal. A logic gate implements a logical rule using one or more binary inputs. For example, an AND gate has an output of one only when all its specified inputs are one. Diodes mainly control direction of conduction, transistors provide switching or amplification, and logic gates combine electronic switching devices to process information.',
 points:['Diode direction-dependent conduction','Rectification example','Transistor as switch or amplifier','AND gate input-output rule','Distinguish roles of diode, transistor and logic gate']},
'X-PHY-C21-L01':{
 answer:'Gravity attracts a satellite toward the body that it orbits. Rather than falling straight down, an orbiting satellite has sideways velocity so that its continually changing direction follows a curved path around the body. Gravity provides the inward acceleration necessary for that orbital motion, while an appropriate speed and altitude determine the orbit. Artificial satellites are designed for particular orbits and tasks such as relaying communications, observing weather and supporting navigation systems. Their paths depend on gravitational forces and velocity, while technological instruments use the orbital viewpoint to gather or transmit information.',
 points:['Gravity attracts an orbiting object','Sideways velocity and curved motion','Gravity provides inward/centripetal acceleration','Orbit depends on speed and distance','Communication, weather or navigation application']}
})
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==LOCKED_SHA)
  throw Error('PHY10_SOURCE_REVISION_DRIFT')
 let parsed
 try{parsed=JSON.parse(bytes)}catch(_){throw Error('PHY10_SOURCE_REVISION_DRIFT')}
 if(JSON.stringify(parsed)!==JSON.stringify(source))throw Error('PHY10_SOURCE_REVISION_DRIFT')
 if(!Array.isArray(source.drafts)||source.drafts.length!==60||
    source.liveImportAllowed!==false||source.publicationAllowed!==false)
  throw Error('PHY10_SOURCE_NOT_PROVISIONAL')
 const record=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!record||record.pdfSha256!==source.sourcePdfSha256||Number(record.grade)!==10||
    String(record.subject).toLowerCase()!=='physics'||String(record.medium).toLowerCase()!=='english')
  throw Error('PHY10_SOURCE_REGISTRY_DRIFT')
 const original=source.drafts.filter(x=>x.type==='long')
 if(original.length!==5||Object.keys(ANSWERS).length!==5)
  throw Error('PHY10_MODEL_ANSWER_COUNT_DRIFT')
 const used=new Set()
 const items=original.map(q=>{
  if(!q.id||used.has(q.id)||!ANSWERS[q.id])
   throw Error('PHY10_ORIGINAL_ID_MISSING_OR_DUPLICATE')
  used.add(q.id)
  if(q.marks!==5||q.source?.catalogRecordId!==record.recordId||
     q.source?.pdfSha256!==record.pdfSha256||
     !rubricOnlyLongAnswer(q.type,q.content?.en?.answer))
   throw Error('PHY10_ORIGINAL_CONTENT_NOT_ELIGIBLE:'+q.id)
  const d=ANSWERS[q.id]
  if(typeof d.answer!=='string'||d.answer.length<180||rubricOnlyLongAnswer('long',d.answer)||
     !Array.isArray(d.points)||d.points.length!==5||
     new Set(d.points).size!==5||d.points.some(x=>typeof x!=='string'||x.length<14))
   throw Error('PHY10_ANSWER_DRAFT_INCOMPLETE:'+q.id)
  return {
   questionId:q.id,chapterNo:q.chapter?.number,topicId:q.topicId,marks:q.marks,
   originalQuestionSha256:sha(JSON.stringify(q)),
   originalAnswerSha256:sha(q.content.en.answer),sourceFileSha256:LOCKED_SHA,
   sourceRecordId:record.recordId,declaredPdfSha256:record.pdfSha256,
   originalQuestionAndAnswerUnmodified:true,
   proposedEnglishModelAnswer:d.answer,proposedSeparateMarkingPoints:d.points,
   independentlySubjectReviewed:false,schoolEditionAndPageVerified:false,
   languageEquivalenceReviewed:false,independentReviewerId:null,
   approvedRevisionId:null,approved:false,published:false,
   status:'ORIGINAL_MODEL_ANSWER_PROPOSAL_AWAITING_INDEPENDENT_PHYSICS_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-physics10-long-model-answer-draft-v1',
  scope:'ORIGINAL_PROVISIONAL_ANSWERS_NOT_ACADEMICALLY_VERIFIED',
  originalSourceFile:'physics10Starter2026.json',sourceFileSha256:LOCKED_SHA,
  sourceRecordId:record.recordId,sourcePdfSha256:record.pdfSha256,
  originalQuestions:source.drafts.length,originalLongRubricQuestions:original.length,
  newAnswerDrafts:items.length,newSeparateMarkingPointDrafts:items.length*5,
  independentlyReviewed:0,approved:0,published:0,
  caveat:'An explanatory answer proposal is not a certified textbook answer. Preserve all original question/answer bytes and obtain human science and source approvals before any publication.',
  items
 }
}
function markdown(d){
 return [
  '# ASSPS Grade X Physics — five new proposed explanatory long answers',
  '', '**Independently authored research answers. Not independently teacher-reviewed or approved.**',
  '',`Five original five-mark long questions in the existing ${d.originalQuestions}-question Physics X file; original SHA-256 \`${d.sourceFileSha256}\`.`,
  '',...d.items.flatMap(q=>[
   `### ${q.questionId} — Chapter ${q.chapterNo}, ${q.topicId}`,'',
   q.proposedEnglishModelAnswer,'',
   '**Separate suggested marking points:** '+q.proposedSeparateMarkingPoints.join(' · '),''
  ]),
  '## Required independent academic review','',
  '1. Verify exact ASSPS-adopted textbook edition, grade, academic and examination year, and physical book chapter/exercise page.',
  '2. Qualified Physics teacher checks the five explanations for correctness, conceptual completeness and five-mark scoring fairness.',
  '3. Validate language equivalence where Urdu medium is used, and preserve original authorship evidence.',
  '4. Submit revised immutable question content only after genuine separate approval; Paper Studio verified picker remains EMPTY.',
  '', '**Teacher reviewed 0, source/page certified 0, approved 0, published 0. SaaS Core production certification HOLD.**',''
 ].join('\n')
}
function main(){
 const bytes=fs.readFileSync(SOURCE)
 const source=JSON.parse(bytes)
 const registry=JSON.parse(fs.readFileSync(REGISTRY))
 const d=build({bytes,source,registry})
 fs.writeFileSync(path.join(OUT,'ASSPS_PHYSICS10_FIVE_LONG_MODEL_ANSWER_DRAFTS_20261009.json'),JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(path.join(OUT,'ASSPS_PHYSICS10_FIVE_LONG_MODEL_ANSWER_DRAFTS_20261009.md'),markdown(d))
 console.log(JSON.stringify({original:d.originalQuestions,authored:d.newAnswerDrafts,markingPoints:d.newSeparateMarkingPointDrafts,reviewed:d.independentlyReviewed,approved:d.approved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWERS,LOCKED_SHA}

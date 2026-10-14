#!/usr/bin/env node
'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const FILE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/physics10OriginalApplicationBatch2026.json')
const REG=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const OUT=path.join(ROOT,'docs/question-bank')
const PIN='a214d121e4a6b21fa7e41f7b6d7d7207968b7e7ab0b71145ea68cd9ef4ac5255'
const ID='X-PHY-C17-L03'
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const ANSWER='A permanent magnet retains its magnetic field under ordinary conditions without an external electrical supply, whereas a typical electromagnet obtains a controllable magnetic field from electric current through a coil. The permanent magnet therefore does not have a simple electrical on/off control, while the field of an idealized electromagnet can be switched by controlling its current. The strength of a permanent magnet is not usually changed during use as easily as the strength of an electromagnet, whose field can respond to a change in current. The direction of the magnetic poles of a fixed permanent magnet is normally changed relative to an observer by turning the magnet, while changing the direction of coil current reverses the pole direction in a simple electromagnet. A magnetic compass illustrates a permanent magnet; relays and industrial lifting magnets illustrate useful controllable electromagnets. Material properties, residual magnetization and other operating circumstances can modify these idealized comparisons.'
const POINTS=Object.freeze([
 'Permanent field without current versus current-associated controllable field',
 'Typically not electrically switchable versus switchable coil field',
 'Less readily adjustable versus current-dependent strength',
 'Pole orientation by turning magnet versus reversing coil current direction',
 'Valid compass example versus relay or industrial lifting electromagnet'
])
function build({bytes,source,registry}){
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==PIN)throw Error('PHY10_SINGLE_SOURCE_SHA_CHANGED')
 let parsed;try{parsed=JSON.parse(bytes)}catch(_){throw Error('PHY10_SINGLE_SOURCE_SHA_CHANGED')}
 if(JSON.stringify(parsed)!==JSON.stringify(source))throw Error('PHY10_SINGLE_SOURCE_SHA_CHANGED')
 if(!Array.isArray(source?.drafts)||source.drafts.length!==36||source.publicationAllowed!==false||source.liveImportAllowed!==false)
  throw Error('PHY10_SINGLE_UNEXPECTED_SOURCE_SHAPE')
 const entry=registry?.entries?.find(r=>r.recordId===source.sourceRecordId)
 if(!entry||entry.recordId!=='pectaa-catalog-024'||entry.grade!==10||entry.subject!=='Physics'||
    entry.medium!=='English'||entry.edition!=='2026-27'||entry.pdfSha256!==source.sourcePdfSha256||
    entry.academicApproval!==false)
  throw Error('PHY10_SINGLE_UNAPPROVED_SOURCE_REGISTRY_CHANGED')
 const originals=source.drafts.filter(q=>q.type==='long'&&rubricOnlyLongAnswer(q.type,q.content?.en?.answer))
 if(originals.length!==1||originals[0].id!==ID)throw Error('PHY10_SINGLE_RUBRIC_FLAG_CHANGED')
 const q=originals[0]
 if(q.marks!==5||q.chapter?.number!==17||q.source?.catalogRecordId!==entry.recordId||
    q.source?.pdfSha256!==entry.pdfSha256||POINTS.length!==5||new Set(POINTS).size!==5||
    ANSWER.length<350||rubricOnlyLongAnswer('long',ANSWER))
  throw Error('PHY10_SINGLE_MODEL_PROPOSAL_INVALID')
 const items=[{
  questionId:ID,chapterNo:q.chapter.number,topicId:q.topicId,marks:5,
  sourceFileSha256:PIN,sourceQuestionSha256:sha(JSON.stringify(q)),sourceAnswerSha256:sha(q.content.en.answer),
  catalogSourceId:entry.recordId,claimedSourcePdfSha256:entry.pdfSha256,
  proposedIndependentEnglishExplanation:ANSWER,proposedDistinctMarkingPoints:[...POINTS],
  answerLanguage:'English',catalogLabelMediumVerified:true,
  originalQuestionUnchanged:true,schoolAdoptedEditionSessionVerified:false,originalPrintedExercisePageVerified:false,
  qualifiedIndependentSubjectReviewed:false,urduEquivalenceReviewed:false,independentReviewerId:null,approvedRevisionId:null,
  academicallyApproved:false,verifiedPublished:false,reviewStatus:'UNAPPROVED_PHYSICS_X_ORIGINAL_QUESTION_MODEL_ANSWER_DRAFT'
 }]
 return {
  schemaVersion:'assps-physics10-single-original-magnet-answer-research-v1',
  originalQuestionFile:'physics10OriginalApplicationBatch2026.json',originalFileSha256:PIN,
  sourceCatalogId:entry.recordId,sourceCatalogPdfSha256:entry.pdfSha256,
  originalAuthoredResearchQuestions:source.drafts.length,originalRubricOnlyLongQuestions:1,
  newExplanatoryAnswerResearchDrafts:1,newFiveMarkPointProposals:5,
  humanSchoolSourceVerified:0,qualifiedHumanAcademicReviewed:0,academicallyApproved:0,verifiedPublished:0,
  caveat:'Distinct Grade X original research question only. Similar Grade IX magnet concepts do not certify Grade X curriculum mapping; textbook printed exercise/page and separate independent subject signoff are missing.',
  items
 }
}
function markdown(d){
 const q=d.items[0]
 return ['# ASSPS Physics X — single remaining original magnet-comparison answer draft','',
  'Research-only original Grade X ID; independent review, actual book page and school adoption pending.','',
  'Original source SHA256: '+d.originalFileSha256+'. Original ID: '+q.questionId+' (chapter 17, five marks).','',
  q.proposedIndependentEnglishExplanation,'',
  'Five independently proposed marking criteria: '+q.proposedDistinctMarkingPoints.join(' ; '),'',
  'Academic source/page verified 0. Qualified Physics reviewed 0. Approved 0. Published 0. Production HOLD.',''].join('\n')
}
function main(){
 const bytes=fs.readFileSync(FILE),d=build({bytes,source:JSON.parse(bytes),registry:JSON.parse(fs.readFileSync(REG))})
 const base=path.join(OUT,'ASSPS_PHYSICS10_SINGLE_MAGNET_COMPARISON_DRAFT_20261009')
 fs.writeFileSync(base+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(base+'.md',markdown(d))
 console.log(JSON.stringify({authored:d.newExplanatoryAnswerResearchDrafts,criteria:d.newFiveMarkPointProposals,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={build,markdown,ANSWER,POINTS,ID,PIN}

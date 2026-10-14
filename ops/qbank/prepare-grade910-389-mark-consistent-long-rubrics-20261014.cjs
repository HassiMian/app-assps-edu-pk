#!/usr/bin/env node
'use strict'
// Pre-review worksheet only. Rubric points are NOT checked against real
// textbooks and are never faculty signatures or selectable paper questions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const V2=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_CORRECTION_INTEGRITY_VERIFIED_DOCKET_20261014.json')
const OLD=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_PROCESSED_ACADEMIC_CORRECTIONS_20261014.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_389_SOURCE_MARK_CONSISTENT_RUBRIC_PROPOSALS_20261014.json')
const SUMMARY=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_389_RUBRIC_MARKS_INTEGRITY_AUDIT_20261014.md')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const fail=m=>{throw Error('GRADE910_P2_RUBRIC_'+m)}
const distribution=Object.freeze({4:[2,1,1],5:[2,2,1],7:[3,2,2]})
function originals(){
 const m=new Map()
 for(const file of fs.readdirSync(STAGING).filter(f=>f.endsWith('.json')).sort()){
  let data,raw
  try{raw=fs.readFileSync(path.join(STAGING,file));data=JSON.parse(raw)}catch(_){continue}
  for(const q of data.drafts||data.questions||data.items||[]){
   const id=q.id||q.originalQuestionId||q.questionId
   if(!id)continue
   if(m.has(id))fail('DUPLICATE_QUESTION:'+id)
   m.set(id,{q,sourceFile:file,sourceSha256:hash(raw),revisionSha256:hash(JSON.stringify(q))})
  }
 }
 return m
}
function generate(){
 const integrity=require('./verify-grade910-processed-correction-integrity-20261014.cjs').assess()
 const stored=JSON.parse(fs.readFileSync(V2))
 if(JSON.stringify(integrity)!==JSON.stringify(stored))fail('PRECEDING_584_SOURCE_INTEGRITY_DRIFT')
 const prev=JSON.parse(fs.readFileSync(OLD)).corrections
 const source=originals()
 const targets=integrity.rows.filter(r=>r.signals.includes('LONG_REFERENCE_BRIEF_RUBRIC_REVIEW'))
 if(targets.length!==389)fail('TARGETS_NOT_389')
 const rows=[],byMarks={4:0,5:0,7:0}
 let oldWrong=0
 for(const r of targets){
  const orig=source.get(r.originalId)
  if(!orig)fail('MISSING_ORIGINAL:'+r.originalId)
  if(orig.sourceSha256!==r.sourceFileSha256||orig.revisionSha256!==r.originalRevisionSha256)
   fail('QUESTION_SHA_MISMATCH:'+r.originalId)
  const {q}=orig
  const marks=q.marks,scheme=distribution[marks]
  if(!scheme)fail('UNEXPECTED_OFFICIAL_QUESTION_MARKS:'+r.originalId)
  byMarks[marks]++
  const stem=String(q.stem||q.question_text||q.content?.en?.stem||q.content?.ur?.stem||'').trim()
  const answer=String(q.answer||q.content?.en?.answer||q.content?.ur?.answer||'').trim()
  if(!stem||!answer)fail('INCOMPLETE_SOURCE_TEXT:'+r.originalId)
  const old=prev.find(x=>x.originalId===r.originalId)
  if(!old||old.originalRevisionSha256!==r.originalRevisionSha256)
   fail('PREVIOUS_PACKET_DID_NOT_MATCH:'+r.originalId)
  const oldFour=old.proposedRevision?.structuredModelAnswer?.markingGuide||[]
  if(marks!==4&&oldFour.length===3)oldWrong++
  const rtl=r.medium==='urdu'||q.medium==='urdu'
  const criteria=rtl?[
   {criterion:'سوال کے مرکزی تصور اور درست اصطلاحات کی وضاحت',marks:scheme[0],evidenceStatus:'SUBJECT_SOURCE_VERIFICATION_REQUIRED'},
   {criterion:'سوال میں پوچھے گئے تعلق، عمل، اقسام یا دلیل کی موضوع سے متعلق وضاحت',marks:scheme[1],evidenceStatus:'SUBJECT_SOURCE_VERIFICATION_REQUIRED'},
   {criterion:'بامعنی نتیجہ، موزوں مثال یا وضاحتی نکات اور درست زبان',marks:scheme[2],evidenceStatus:'SUBJECT_SOURCE_VERIFICATION_REQUIRED'}
  ]:[
   {criterion:'Accurate key concept and terminology responsive to the original question',marks:scheme[0],evidenceStatus:'SUBJECT_SOURCE_VERIFICATION_REQUIRED'},
   {criterion:'Source-supported relevant explanation, comparison, steps or reasoning',marks:scheme[1],evidenceStatus:'SUBJECT_SOURCE_VERIFICATION_REQUIRED'},
   {criterion:'Appropriate conclusion, justified example or accurate notation and clarity',marks:scheme[2],evidenceStatus:'SUBJECT_SOURCE_VERIFICATION_REQUIRED'}
  ]
  if(criteria.reduce((s,c)=>s+c.marks,0)!==marks)fail('MARK_SUM_DISAGREEMENT:'+r.originalId)
  rows.push({
   originalId:r.originalId,originalStem:stem,originalAnswerReference:answer,
   originalRevisionSha256:r.originalRevisionSha256,originalFileSha256:r.sourceFileSha256,
   grade:r.grade,subject:r.subject,medium:r.medium,claimedCatalogRecordId:r.claimedCatalogRecordId,
   questionType:r.type,marks,
   originalReferenceDoesNotEstablishTruth:true,
   proposedMarksAwareAssessmentCriteria:criteria,
   totalProposedRubricMarks:criteria.reduce((s,c)=>s+c.marks,0),
   sourceSpecificConceptCheckRequired:true,independentAnswerVerified:false,
   gradeTextbookEditionPhysicallyChecked:false,exercisePrintedPageChecked:false,
   qualifiedTeacherReviewed:false,principalAuthorized:false,academicallyApproved:false,
   published:false,paperStudioSelectable:false
  })
 }
 rows.sort((a,b)=>a.originalId.localeCompare(b.originalId))
 if(byMarks[4]!==38||byMarks[5]!==342||byMarks[7]!==9||oldWrong!==351)
  fail('SOURCE_MARK_DISTRIBUTION_OR_HISTORIC_MISMATCH_DRIFT')
 return{
  schemaVersion:'assps-grade910-389-mark-correct-advisory-rubric-20261014-v1',
  originalCandidateCount:2581,reviewItems:rows.length,exactQuestionAndFileShaChecked:rows.length,
  originalSourceMarkDistribution:byMarks,
  historicGenericFourMarkTemplateWrongQuestionMarkCount:oldWrong,
  proposedCriteriaThatSumToOriginalQuestionMarks:rows.length,
  actualAnswerFactsIndependentlyVerified:0,teacherApproved:0,principalApproved:0,published:0,
  notCertified:'These dimension-based scoring proposals are not a model-answer correctness certificate and must not substitute for source-specific marking facts or an independent faculty decision.',
  rows
 }
}
function write(){
 const x=generate()
 fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n')
 fs.writeFileSync(SUMMARY,[
  '# ASSPS IX–X — 389 P2 long-answer marking integrity',
  '',
  '- Unique exact original question revisions SHA-256 source verified: **389/389**.',
  '- Original marks: **38 four-mark**, **342 five-mark**, **9 seven-mark** questions.',
  '- Historical v1 generic marking guide awarded 4 marks across three headings and thereby mismatched source question marks for **351/389**.',
  '- New rubric drafts: **389/389** criteria add precisely to each actual question mark, with original stem/reference and bilingual dimensions carried along.',
  '- Template dimensions remain **advisory only**; this script has not judged 389 model answers factually true, nor inspected ASSPS actual textbook pages.',
  '- Qualified teacher checked: **0**; Principal signed: **0**; academically approved: **0**; published: **0**.',
  '- The historical v1 wrong-mark rubrics remain preserved but are explicitly superseded by this exact-source-count audit.',
  '',
  '## Required next action',
  'A qualified subject reviewer must separately inspect exact explanation content, original edition and page, mark scheme and English/Urdu, then authenticate any true approved revision; no automatic Paper Studio publication.',''
 ].join('\n'))
 return {count:x.reviewItems,sourceMarks:x.originalSourceMarkDistribution,oldMismatches:x.historicGenericFourMarkTemplateWrongQuestionMarkCount,digest:hash(fs.readFileSync(OUT))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={generate,write,OUT,SUMMARY}

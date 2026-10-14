#!/usr/bin/env node
'use strict'
// Single authoritative, source-hash-bound academic review queue. Not approved content.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'docs/question-bank')
const names={
 base:'ASSPS_GRADE910_CORRECTION_INTEGRITY_VERIFIED_DOCKET_20261014.json',
 numerical:'ASSPS_GRADE910_61_NUMERICAL_INDEPENDENT_RECOMPUTATION_20261014.json',
 english:'ASSPS_GRADE910_ENGLISH9_24_MCQ_INDEPENDENT_AI_ANSWER_REVIEW_20261014.json',
 longP1:'ASSPS_GRADE910_34_PRIORITY_LONG_ANSWER_SPECIFIC_DRAFTS_20261014.json',
 mcq:'ASSPS_GRADE910_68_MCQ_DISTRACTOR_CUE_METRICS_20261014.json',
 curated:'ASSPS_GRADE910_66_CURATED_MCQ_OPTION_REVISION_DRAFTS_20261015.json',
 longP2:'ASSPS_GRADE910_389_SOURCE_MARK_CONSISTENT_RUBRIC_PROPOSALS_20261014.json',
 essay:'ASSPS_GRADE910_EIGHT_ESSAY_SPECIFIC_ADVISORY_RUBRICS_20261014.json'
}
const out=path.join(dir,'ASSPS_GRADE910_584_UNIFIED_ACADEMIC_REVIEW_QUEUE_20261015.json')
const md=path.join(dir,'ASSPS_GRADE910_584_UNIFIED_ACADEMIC_REVIEW_QUEUE_20261015.md')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const fail=x=>{throw Error('GRADE910_REVIEW_QUEUE_'+x)}
const signal={numerical:'NUMERICAL_WORKING_REVIEW',english:'MCQ_KEY_ID_NOT_EXPLICIT',longP1:'LONG_REFERENCE_EXTREMELY_BRIEF',mcq:'MCQ_OPTION_LENGTH_CUE_REVIEW',longP2:'LONG_REFERENCE_BRIEF_RUBRIC_REVIEW',essay:'ESSAY_REFERENCE_BRIEF'}
const expected={numerical:61,english:24,longP1:34,mcq:68,longP2:389,essay:8}
function assemble(){
 const materials=Object.fromEntries(Object.entries(names).map(([k,file])=>{
  const bytes=fs.readFileSync(path.join(dir,file))
  return[k,{file,hash:sha(bytes),doc:JSON.parse(bytes)}]
 }))
 const integrity=require('./verify-grade910-processed-correction-integrity-20261014.cjs').assess()
 if(JSON.stringify(materials.base.doc.rows)!==JSON.stringify(integrity.rows))fail('584_SOURCE_HASH_CHECK')
 const index={}
 for(const name of Object.keys(expected)){
  index[name]=new Map()
  for(const row of materials[name].doc.rows){
   if(index[name].has(row.originalId))fail('DUPLICATE_'+name)
   index[name].set(row.originalId,row)
  }
  if(index[name].size!==expected[name])fail('WRONG_COUNT_'+name)
 }
 const curated=new Map(materials.curated.doc.rows.map(x=>[x.originalId,x]))
 if(curated.size!==66)fail('CURATED_66')
 const rows=[]
 for(const r of integrity.rows){
  const stages=Object.keys(signal).filter(k=>index[k].has(r.originalId))
  if(stages.length!==1)fail('INCOMPLETE_OR_OVERLAPPING_REVIEW_'+r.originalId)
  const stage=stages[0],m=materials[stage],e=index[stage].get(r.originalId)
  if(e.originalRevisionSha256!==r.originalRevisionSha256)fail('REVISION_SHA_DRIFT_'+r.originalId)
  if(stage==='numerical'&&!e.independentComputationAgreesWithSourceReference)fail('NUMERICAL_INCONSISTENCY')
  if(stage==='english'&&!e.originalAnswerMatchesOneOption)fail('ENGLISH_KEY_AMBIGUOUS')
  if(stage==='longP1'&&e.substantiveDraftPoints.length<4)fail('LONG_DRAFT_INCOMPLETE')
  if(stage==='longP2'&&e.totalProposedRubricMarks!==e.marks)fail('RUBRIC_MARKS_MISMATCH')
  if(stage==='essay'&&e.proposedTotalMarks!==e.originalQuestionMarks)fail('ESSAY_MARKS_MISMATCH')
  const c=stage==='mcq'?curated.get(r.originalId):null
  if(c&&(c.originalRevisionSha256!==r.originalRevisionSha256||c.residualStrongLengthCue))fail('CURATED_DRAFT_INVALID')
  rows.push({
   originalId:r.originalId,originalRevisionSha256:r.originalRevisionSha256,
   grade:r.grade,subject:r.subject,medium:r.medium,chapter:r.chapter,type:r.type,
   priority:r.priority,signals:r.signals,
   evidenceStage:stage,evidenceFile:m.file,evidenceFileSha256:m.hash,
   evidenceEntryOriginalId:r.originalId,
   numericalComputedAgreement:stage==='numerical',
   englishLanguageAIReview:stage==='english',
   longAnswerContentAIDraft:stage==='longP1',
   optionLengthAudited:stage==='mcq',
   individuallyCuratedDistractors:Boolean(c),
   newDistractorProposalHash:c?c.proposalSha256:null,
   rubricMatchesSourceMarks:stage==='longP2'||stage==='essay',
   languageAndSubjectQualifiedReview:false,
   adoptedPhysicalTextbookProvenanceVerified:false,
   printedExerciseAndPageVerified:false,
   principalAuthenticatedSignedApproval:false,
   academicallyApproved:false,published:false,paperStudioSelectable:false,
   status:'AI_EDITORIAL_REVIEW_PENDING_GENUINE_SCHOOL_EVIDENCE'
  })
 }
 rows.sort((a,b)=>a.priority.localeCompare(b.priority)||a.originalId.localeCompare(b.originalId))
 const count=(k)=>rows.filter(x=>x.evidenceStage===k).length
 const stats=Object.fromEntries(Object.keys(expected).map(k=>[k,count(k)]))
 if(rows.length!==584||rows.filter(x=>x.priority==='P1').length!==119||
  rows.filter(x=>x.priority==='P2').length!==465||
  rows.filter(x=>x.individuallyCuratedDistractors).length!==66)fail('COVERAGE')
 return{
  schema:'assps-grade910-584-unified-review-queue-v1',
  originalResearchCandidatesPreserved:2581,sourceShaBoundQuestions:584,
  priorityCounts:{P1:119,P2:465},stageCounts:stats,
  curatedDistractorRevisions:66,
  evidenceFiles:Object.fromEntries(Object.values(materials).map(m=>[m.file,m.hash])),
  realQualifiedAcademicReviews:0,adoptionEvidenceApprovals:0,principalSigned:0,
  academicallyApproved:0,published:0,
  release:'HOLD_NO_VERIFIED_QUESTION_SELECTABLE_IN_PAPER_STUDIO',
  explanation:'A source SHA verifies the integrity of an authored research candidate, not an actual adopted textbook passage or the correctness of AI-generated review evidence.',
  rows
 }
}
function write(){
 const data=assemble();fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n')
 fs.writeFileSync(md,[
  '# ASSPS Grade IX–X — single authoritative 584-question academic review queue',
  '', 'Session 2026–27; intended Annual Board 2027. This source-only artifact unifies current editorial evidence, not teacher-certified model answers.',
  '', 'Original candidate questions preserved: **2,581**. Unique original source- and revision-SHA-bound flagged candidates: **584**; P1 **119** and P2 **465**.',
  '',
  '| Evidence lane | Unique research candidates |',
  '|---|---:|','| Independent numerical calculations | 61 |',
  '| Grade IX English AI language checks | 24 |','| Topic-specific priority long-answer AI drafts | 34 |',
  '| MCQ option-length measurements (with 66 curated new-distractor proposals) | 68 |',
  '| Source-mark-consistent P2 rubrics | 389 |','| Topic-specific English/Urdu essay rubrics | 8 |',
  '| **Total with exactly one original-revision-bound evidence record** | **584** |',
  '', 'Approved questions **0**; qualified subject/Urdu reviewers **0**; authenticated Principal signatures **0**; published **0**.',
  'The JSON includes one source ID/revision SHA, one evidence-file SHA, stage and nonpublication flags for every original question. Original data and production records are untouched.',
  '', '**Do not directly seed or expose these drafts in Paper Studio.** Actual adopted textbook pages, genuine independent subject/Urdu review, Principal and SaaS Core authenticated acceptance remain separate institutional evidence.',''
 ].join('\n'))
 return{rows:data.rows.length,stages:data.stageCounts,digest:sha(fs.readFileSync(out))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={assemble,write,out,md}

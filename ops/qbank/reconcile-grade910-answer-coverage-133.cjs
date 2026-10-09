#!/usr/bin/env node
'use strict'
// Additive research-only coverage projection over immutable prior 130-ID snapshot.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const old=require('./reconcile-grade910-authored-answer-coverage.cjs')
const chapter=require('./author-chemistry9-ch6-three-original-answers.cjs')
const ROOT=path.resolve(__dirname,'../..')
const DOC=path.join(ROOT,'docs/question-bank')
const PACKET='ASSPS_CHEMISTRY9_CH06_THREE_LONG_MODEL_ANSWER_DRAFTS_20261009.json'
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
function loadInputs(){
 return {
  oldInputs:old.loadInputs(),
  originalBytes:fs.readFileSync(chapter.INPUT),
  registry:JSON.parse(fs.readFileSync(chapter.REGISTRY)),
  packet:JSON.parse(fs.readFileSync(path.join(DOC,PACKET)))
 }
}
function reconcile({oldInputs,originalBytes,registry,packet}){
 const previous=old.reconcile(oldInputs)
 if(previous.distinctOriginalIdsWithSeparateAnswerDrafts!==130||
    previous.originalRubricOnlyIdsWithoutNewAnswerDraft!==36||
    previous.separateMarkingPointProposals!==668)
  throw Error('COVERAGE133_ORIGINAL_BASE_DRIFT')
 let source
 try{source=JSON.parse(originalBytes)}catch(_){throw Error('COVERAGE133_ORIGINAL_SOURCE_INVALID')}
 const expected=chapter.build({bytes:originalBytes,source,registry})
 if(JSON.stringify(expected)!==JSON.stringify(packet))
  throw Error('COVERAGE133_DRAFT_PACKET_TAMPER_OR_STALE')
 const existing=new Set()
 for(const d of Object.values(oldInputs.packets))
  for(const item of d.items||d.proposals||[]){
   if(existing.has(item.questionId))throw Error('COVERAGE133_PREVIOUS_ID_DUPLICATE')
   existing.add(item.questionId)
  }
 const pending=new Set(previous.remainingOriginalQuestionIds)
 for(const item of packet.items){
  if(existing.has(item.questionId)||!pending.has(item.questionId))
   throw Error('COVERAGE133_NOT_PREVIOUSLY_UNADDRESSED_OR_DUPLICATE:'+item.questionId)
  if(item.academicallyApproved!==false||item.verifiedPublished!==false||
     item.independentReviewerId!==null||item.approvedRevisionId!==null||
     item.qualifiedIndependentSubjectReviewed!==false||
     item.originalPrintedExercisePageVerified!==false||
     item.schoolAdoptedEditionSessionVerified!==false)
   throw Error('COVERAGE133_FALSE_ACADEMIC_APPROVAL')
  pending.delete(item.questionId)
 }
 if(packet.items.length!==3||pending.size!==33)
  throw Error('COVERAGE133_INCORRECT_REMAINING')
 const result={
  ...previous,
  schemaVersion:'assps-grade910-133-original-answer-draft-coverage-v8',
  distinctOriginalIdsWithSeparateAnswerDrafts:previous.distinctOriginalIdsWithSeparateAnswerDrafts+packet.items.length,
  separateMarkingPointProposals:previous.separateMarkingPointProposals+packet.newFiveMarkPointProposals,
  originalRubricOnlyIdsWithoutNewAnswerDraft:pending.size,
  sourceGroups:[...previous.sourceGroups,{
   originalAuthoredSource:packet.originalQuestionFile,
   sourceFileSha256:sha(originalBytes),
   researchAnswerPacket:PACKET,
   distinctUnapprovedExplanationProposals:packet.items.length
  }],
  remainingOriginalQuestionIds:[...pending].sort()
 }
 if(result.distinctOriginalIdsWithSeparateAnswerDrafts!==133||
    result.separateMarkingPointProposals!==683||
    result.academicallyApproved!==0||result.verifiedPublished!==0)
  throw Error('COVERAGE133_TOTAL_OR_APPROVAL_DRIFT')
 return result
}
function markdown(d){
 return [
  '# Grade IX-X — 133 distinct original IDs with separate answer research drafts','',
  '**Unapproved author research, not newly approved Question Bank rows.**','',
  '- Original authored candidate questions: **'+d.originalAuthoredQuestionCandidates+'**, unchanged.',
  '- Original rubric-only long answers: **'+d.correctedRubricOnlyOriginals+'**, unchanged.',
  '- Unique original question IDs now with separate explanatory draft: **'+d.distinctOriginalIdsWithSeparateAnswerDrafts+'**.',
  '- Separate proposed marking criteria: **'+d.separateMarkingPointProposals+'**.',
  '- Still missing separate drafts: **'+d.originalRubricOnlyIdsWithoutNewAnswerDraft+'** original IDs.',
  '- School adopted edition/physical exercise-page reviewed: **0**; independently qualified reviewed: **0**; approved: **0**; verified published: **0**.','',
  '| Unmodified source candidate file | Unique answer drafts | Raw SHA256 |',
  '|---|---:|---|',
  ...d.sourceGroups.map(g=>'| '+g.originalAuthoredSource+' | '+g.distinctUnapprovedExplanationProposals+' | '+g.sourceFileSha256+' |'),
  '','Companion JSON lists all '+d.originalRubricOnlyIdsWithoutNewAnswerDraft+' remaining original IDs, not copyrighted textbook passages.',
  'Catalog metadata and original source page claims cannot certify adopted ASSPS 2026-27 book, medium, physical exercise page, or examination board applicability.',
  'Independent Chemistry/Urdu academic signoff and revision approvals remain **0**. Only SaaS Core may certify production; Paper Studio verified bank stays empty.',''
 ].join('\n')
}
function main(){
 const d=reconcile(loadInputs())
 const prefix=path.join(DOC,'ASSPS_GRADE910_133_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009')
 fs.writeFileSync(prefix+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(prefix+'.md',markdown(d))
 console.log(JSON.stringify({drafts:d.distinctOriginalIdsWithSeparateAnswerDrafts,remaining:d.originalRubricOnlyIdsWithoutNewAnswerDraft,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={loadInputs,reconcile,markdown}

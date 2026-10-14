#!/usr/bin/env node
'use strict'
// New additive v12 research projection, leaving all previous snapshots unchanged.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const previous=require('./reconcile-grade910-answer-coverage-147.cjs')
const author=require('./author-chemistry9-ch12-three-original-answers.cjs')
const DOC=path.resolve(__dirname,'../../docs/question-bank')
const PACKET='ASSPS_CHEMISTRY9_CH12_THREE_LONG_MODEL_ANSWER_DRAFTS_20261009.json'
const hash=x=>crypto.createHash('sha256').update(x).digest('hex')
function loadInputs(){
 return {prior:previous.loadInputs(),bytes:fs.readFileSync(author.INPUT),
  registry:JSON.parse(fs.readFileSync(author.REGISTRY)),
  packet:JSON.parse(fs.readFileSync(path.join(DOC,PACKET)))}
}
function reconcile({prior,bytes,registry,packet}){
 const base=previous.reconcile(prior)
 if(base.originalAuthoredQuestionCandidates!==2581||base.correctedRubricOnlyOriginals!==166||
  base.distinctOriginalIdsWithSeparateAnswerDrafts!==147||
  base.separateMarkingPointProposals!==753||base.originalRubricOnlyIdsWithoutNewAnswerDraft!==19||
  base.academicallyApproved!==0||base.verifiedPublished!==0)
  throw Error('COVERAGE150_PREVIOUS_BASE_DRIFT')
 let source
 try{source=JSON.parse(bytes)}catch(_){throw Error('COVERAGE150_ORIGINAL_SOURCE_INVALID')}
 const exact=author.build({bytes,source,registry})
 if(JSON.stringify(exact)!==JSON.stringify(packet))throw Error('COVERAGE150_PACKET_TAMPERED_OR_STALE')
 const pending=new Set(base.remainingOriginalQuestionIds)
 const historic=new Set()
 for(const original of Object.values(prior.prior.prior.prior.oldInputs.packets))
  for(const q of original.items||original.proposals||[]){
   if(historic.has(q.questionId))throw Error('COVERAGE150_OLD_DUPLICATE')
   historic.add(q.questionId)
  }
 for(const q of [...prior.prior.prior.prior.packet.items,...prior.prior.prior.packet.items,...prior.prior.packet.items,...prior.packet.items]){
  if(historic.has(q.questionId))throw Error('COVERAGE150_PREVIOUS_CH6_COLLISION')
  historic.add(q.questionId)
 }
 for(const q of packet.items){
  if(historic.has(q.questionId)||!pending.has(q.questionId))
   throw Error('COVERAGE150_DUPLICATE_OR_NOT_IN_BACKLOG:'+q.questionId)
  for(const k of ['academicallyApproved','verifiedPublished','schoolAdoptedEditionSessionVerified',
    'originalPrintedExercisePageVerified','qualifiedIndependentSubjectReviewed','urduEquivalenceReviewed'])
    if(q[k]!==false)throw Error('COVERAGE150_FALSE_SIGNOFF:'+q.questionId)
  if(q.independentReviewerId!==null||q.approvedRevisionId!==null)
   throw Error('COVERAGE150_FALSE_REVIEWER:'+q.questionId)
  pending.delete(q.questionId)
 }
 if(packet.items.length!==3||packet.newFiveMarkPointProposals!==15||pending.size!==16)
  throw Error('COVERAGE150_MARKS_OR_REMAINING_DRIFT')
 const d={...base,schemaVersion:'assps-grade910-150-original-answer-draft-coverage-v12',
  distinctOriginalIdsWithSeparateAnswerDrafts:150,
  separateMarkingPointProposals:768,originalRubricOnlyIdsWithoutNewAnswerDraft:16,
  sourceGroups:[...base.sourceGroups,{originalAuthoredSource:packet.originalQuestionFile,
   sourceFileSha256:hash(bytes),researchAnswerPacket:PACKET,
   distinctUnapprovedExplanationProposals:3}],
  remainingOriginalQuestionIds:[...pending].sort()}
 if(d.sourceGroups.reduce((n,g)=>n+g.distinctUnapprovedExplanationProposals,0)!==150||
   d.academicallyApproved!==0||d.verifiedPublished!==0)
  throw Error('COVERAGE150_TOTAL_OR_APPROVAL_DRIFT')
 return d
}
function markdown(d){
 return [
 '# Grade IX-X Academic Master: 150 separate unapproved research-answer proposals','',
 'RESEARCH ONLY. These are 150 distinct existing original question IDs with supplemental English explanations, **not 150 new question rows**, academically reviewed, or published.','',
 '- Original authored question candidates: **'+d.originalAuthoredQuestionCandidates+'**, unchanged.',
 '- Original rubric-only five/seven-mark answer fields: **'+d.correctedRubricOnlyOriginals+'**, unchanged.',
 '- Original IDs with a separate explanatory answer research proposal: **'+d.distinctOriginalIdsWithSeparateAnswerDrafts+'**.',
 '- Separately proposed marking points: **'+d.separateMarkingPointProposals+'**.',
 '- Original IDs still lacking supplemental explanatory answer: **'+d.originalRubricOnlyIdsWithoutNewAnswerDraft+'**.',
 '- School adopted edition/page verified **0**; independently teacher reviewed **0**; academic approved **0**; published **0**.','',
 '| Source research file | Distinct draft proposals | Original SHA256 |',
 '|---|---:|---|',
 ...d.sourceGroups.map(g=>'| '+g.originalAuthoredSource+' | '+g.distinctUnapprovedExplanationProposals+' | '+g.sourceFileSha256+' |'),
 '','Companion JSON contains the '+d.originalRubricOnlyIdsWithoutNewAnswerDraft+' remaining original research IDs, which are 13 Chemistry IX and three deferred Chemistry X procedure questions.',
 'One POTENTIAL semantic overlap explicitly pending faculty review: Chemistry IX Ch7 acid-rain formation/effects versus Ch10 acid-rain formation/effects. Distinct stable question IDs do NOT prove conceptual uniqueness.',
 'Catalog identity and PDF hashes are not equivalent to ASSPS actual textbook adoption, 2026-27 medium/edition/exam year or original printed exercise-page review.',
 'Human Chemistry/Urdu review, revision-bound signature and academic approval remain pending; verified Paper Studio Grade IX/X picker EMPTY, and SaaS Core solely deploys.',''
 ].join('\n')
}
function main(){
 const d=reconcile(loadInputs())
 const p=path.join(DOC,'ASSPS_GRADE910_150_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009')
 fs.writeFileSync(p+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(p+'.md',markdown(d))
 console.log(JSON.stringify({distinct:d.distinctOriginalIdsWithSeparateAnswerDrafts,marking:d.separateMarkingPointProposals,remaining:d.originalRubricOnlyIdsWithoutNewAnswerDraft,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={loadInputs,reconcile,markdown}

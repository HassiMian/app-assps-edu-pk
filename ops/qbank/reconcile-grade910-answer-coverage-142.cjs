#!/usr/bin/env node
'use strict'
// New additive v10 research projection, leaving all previous snapshots unchanged.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const previous=require('./reconcile-grade910-answer-coverage-138.cjs')
const author=require('./author-chemistry9-ch8-four-original-answers.cjs')
const DOC=path.resolve(__dirname,'../../docs/question-bank')
const PACKET='ASSPS_CHEMISTRY9_CH08_FOUR_LONG_MODEL_ANSWER_DRAFTS_20261009.json'
const hash=x=>crypto.createHash('sha256').update(x).digest('hex')
function loadInputs(){
 return {prior:previous.loadInputs(),bytes:fs.readFileSync(author.INPUT),
  registry:JSON.parse(fs.readFileSync(author.REGISTRY)),
  packet:JSON.parse(fs.readFileSync(path.join(DOC,PACKET)))}
}
function reconcile({prior,bytes,registry,packet}){
 const base=previous.reconcile(prior)
 if(base.originalAuthoredQuestionCandidates!==2581||base.correctedRubricOnlyOriginals!==166||
  base.distinctOriginalIdsWithSeparateAnswerDrafts!==138||
  base.separateMarkingPointProposals!==708||base.originalRubricOnlyIdsWithoutNewAnswerDraft!==28||
  base.academicallyApproved!==0||base.verifiedPublished!==0)
  throw Error('COVERAGE142_PREVIOUS_BASE_DRIFT')
 let source
 try{source=JSON.parse(bytes)}catch(_){throw Error('COVERAGE142_ORIGINAL_SOURCE_INVALID')}
 const exact=author.build({bytes,source,registry})
 if(JSON.stringify(exact)!==JSON.stringify(packet))throw Error('COVERAGE142_PACKET_TAMPERED_OR_STALE')
 const pending=new Set(base.remainingOriginalQuestionIds)
 const historic=new Set()
 for(const original of Object.values(prior.prior.oldInputs.packets))
  for(const q of original.items||original.proposals||[]){
   if(historic.has(q.questionId))throw Error('COVERAGE142_OLD_DUPLICATE')
   historic.add(q.questionId)
  }
 for(const q of [...prior.prior.packet.items,...prior.packet.items]){
  if(historic.has(q.questionId))throw Error('COVERAGE142_PREVIOUS_CH6_COLLISION')
  historic.add(q.questionId)
 }
 for(const q of packet.items){
  if(historic.has(q.questionId)||!pending.has(q.questionId))
   throw Error('COVERAGE142_DUPLICATE_OR_NOT_IN_BACKLOG:'+q.questionId)
  for(const k of ['academicallyApproved','verifiedPublished','schoolAdoptedEditionSessionVerified',
    'originalPrintedExercisePageVerified','qualifiedIndependentSubjectReviewed','urduEquivalenceReviewed'])
    if(q[k]!==false)throw Error('COVERAGE142_FALSE_SIGNOFF:'+q.questionId)
  if(q.independentReviewerId!==null||q.approvedRevisionId!==null)
   throw Error('COVERAGE142_FALSE_REVIEWER:'+q.questionId)
  pending.delete(q.questionId)
 }
 if(packet.items.length!==4||packet.newFiveMarkPointProposals!==20||pending.size!==24)
  throw Error('COVERAGE142_MARKS_OR_REMAINING_DRIFT')
 const d={...base,schemaVersion:'assps-grade910-142-original-answer-draft-coverage-v10',
  distinctOriginalIdsWithSeparateAnswerDrafts:142,
  separateMarkingPointProposals:728,originalRubricOnlyIdsWithoutNewAnswerDraft:24,
  sourceGroups:[...base.sourceGroups,{originalAuthoredSource:packet.originalQuestionFile,
   sourceFileSha256:hash(bytes),researchAnswerPacket:PACKET,
   distinctUnapprovedExplanationProposals:4}],
  remainingOriginalQuestionIds:[...pending].sort()}
 if(d.sourceGroups.reduce((n,g)=>n+g.distinctUnapprovedExplanationProposals,0)!==142||
   d.academicallyApproved!==0||d.verifiedPublished!==0)
  throw Error('COVERAGE142_TOTAL_OR_APPROVAL_DRIFT')
 return d
}
function markdown(d){
 return [
 '# Grade IX-X Academic Master: 142 separate unapproved research-answer proposals','',
 'RESEARCH ONLY. These are 142 distinct existing original question IDs with supplemental English explanations, **not 142 new question rows**, academically reviewed, or published.','',
 '- Original authored question candidates: **'+d.originalAuthoredQuestionCandidates+'**, unchanged.',
 '- Original rubric-only five/seven-mark answer fields: **'+d.correctedRubricOnlyOriginals+'**, unchanged.',
 '- Original IDs with a separate explanatory answer research proposal: **'+d.distinctOriginalIdsWithSeparateAnswerDrafts+'**.',
 '- Separately proposed marking points: **'+d.separateMarkingPointProposals+'**.',
 '- Original IDs still lacking supplemental explanatory answer: **'+d.originalRubricOnlyIdsWithoutNewAnswerDraft+'**.',
 '- School adopted edition/page verified **0**; independently teacher reviewed **0**; academic approved **0**; published **0**.','',
 '| Source research file | Distinct draft proposals | Original SHA256 |',
 '|---|---:|---|',
 ...d.sourceGroups.map(g=>'| '+g.originalAuthoredSource+' | '+g.distinctUnapprovedExplanationProposals+' | '+g.sourceFileSha256+' |'),
 '','Companion JSON contains the '+d.originalRubricOnlyIdsWithoutNewAnswerDraft+' remaining original research IDs, which are 21 Chemistry IX and three deferred Chemistry X procedure questions.',
 'One POTENTIAL semantic overlap explicitly pending faculty review: Chemistry IX Ch7 acid-rain formation/effects versus Ch10 acid-rain formation/effects. Distinct stable question IDs do NOT prove conceptual uniqueness.',
 'Catalog identity and PDF hashes are not equivalent to ASSPS actual textbook adoption, 2026-27 medium/edition/exam year or original printed exercise-page review.',
 'Human Chemistry/Urdu review, revision-bound signature and academic approval remain pending; verified Paper Studio Grade IX/X picker EMPTY, and SaaS Core solely deploys.',''
 ].join('\n')
}
function main(){
 const d=reconcile(loadInputs())
 const p=path.join(DOC,'ASSPS_GRADE910_142_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009')
 fs.writeFileSync(p+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(p+'.md',markdown(d))
 console.log(JSON.stringify({distinct:d.distinctOriginalIdsWithSeparateAnswerDrafts,marking:d.separateMarkingPointProposals,remaining:d.originalRubricOnlyIdsWithoutNewAnswerDraft,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={loadInputs,reconcile,markdown}

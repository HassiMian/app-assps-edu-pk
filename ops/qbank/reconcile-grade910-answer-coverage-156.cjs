#!/usr/bin/env node
'use strict'
// New additive v13 research projection, leaving all previous snapshots unchanged.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const previous=require('./reconcile-grade910-answer-coverage-150.cjs')
const author=require('./author-chemistry9-ch11-six-original-answers.cjs')
const DOC=path.resolve(__dirname,'../../docs/question-bank')
const PACKET='ASSPS_CHEMISTRY9_CH11_SIX_LONG_MODEL_ANSWER_DRAFTS_20261009.json'
const hash=x=>crypto.createHash('sha256').update(x).digest('hex')
function loadInputs(){
 return {prior:previous.loadInputs(),bytes:fs.readFileSync(author.INPUT),
  registry:JSON.parse(fs.readFileSync(author.REGISTRY)),
  packet:JSON.parse(fs.readFileSync(path.join(DOC,PACKET)))}
}
function reconcile({prior,bytes,registry,packet}){
 const base=previous.reconcile(prior)
 if(base.originalAuthoredQuestionCandidates!==2581||base.correctedRubricOnlyOriginals!==166||
  base.distinctOriginalIdsWithSeparateAnswerDrafts!==150||
  base.separateMarkingPointProposals!==768||base.originalRubricOnlyIdsWithoutNewAnswerDraft!==16||
  base.academicallyApproved!==0||base.verifiedPublished!==0)
  throw Error('COVERAGE156_PREVIOUS_BASE_DRIFT')
 let source
 try{source=JSON.parse(bytes)}catch(_){throw Error('COVERAGE156_ORIGINAL_SOURCE_INVALID')}
 const exact=author.build({bytes,source,registry})
 if(JSON.stringify(exact)!==JSON.stringify(packet))throw Error('COVERAGE156_PACKET_TAMPERED_OR_STALE')
 const pending=new Set(base.remainingOriginalQuestionIds)
 const historic=new Set()
 for(const original of Object.values(prior.prior.prior.prior.prior.oldInputs.packets))
  for(const q of original.items||original.proposals||[]){
   if(historic.has(q.questionId))throw Error('COVERAGE156_OLD_DUPLICATE')
   historic.add(q.questionId)
  }
 for(const q of [...prior.prior.prior.prior.prior.packet.items,...prior.prior.prior.prior.packet.items,...prior.prior.prior.packet.items,...prior.prior.packet.items,...prior.packet.items]){
  if(historic.has(q.questionId))throw Error('COVERAGE156_PREVIOUS_CH6_COLLISION')
  historic.add(q.questionId)
 }
 for(const q of packet.items){
  if(historic.has(q.questionId)||!pending.has(q.questionId))
   throw Error('COVERAGE156_DUPLICATE_OR_NOT_IN_BACKLOG:'+q.questionId)
  for(const k of ['academicallyApproved','verifiedPublished','schoolAdoptedEditionSessionVerified',
    'originalPrintedExercisePageVerified','qualifiedIndependentSubjectReviewed','urduEquivalenceReviewed'])
    if(q[k]!==false)throw Error('COVERAGE156_FALSE_SIGNOFF:'+q.questionId)
  if(q.independentReviewerId!==null||q.approvedRevisionId!==null)
   throw Error('COVERAGE156_FALSE_REVIEWER:'+q.questionId)
  pending.delete(q.questionId)
 }
 if(packet.items.length!==6||packet.newFiveMarkPointProposals!==30||pending.size!==10)
  throw Error('COVERAGE156_MARKS_OR_REMAINING_DRIFT')
 const expectedDeferred=['IX-CHEM-2025-C11-T4-01L','IX-CHEM-2025-C11-T4-02L']
 if(JSON.stringify(packet.deferredExistingOriginalIds)!==JSON.stringify(expectedDeferred)||
    expectedDeferred.some(id=>!pending.has(id)))
  throw Error('COVERAGE156_DEFERRED_REACTION_IDS_MUST_REMAIN_UNAPPROVED')
 const chapterOverlapPairs=[
  ['IX-CHEM-2025-C11-T1-01L','IX-CHEM-2025-C11-T1-02L'],
  ['IX-CHEM-2025-C11-T3-01L','IX-CHEM-2025-C11-T3-02L']
 ]
 for(const pair of chapterOverlapPairs)
  if(pair.some(id=>!source.drafts.some(q=>q.id===id)))
   throw Error('COVERAGE156_OVERLAP_SOURCE_ID_DRIFT')
 const semanticOverlapReviewCandidates=[
   ...base.semanticOverlapReviewCandidates,
   ...chapterOverlapPairs.map(ids=>({
    sourceQuestionIds:ids,
    flag:'POTENTIAL_CONCEPTUAL_OVERLAP_NOT_CONFIRMED_DUPLICATE',
    separateOriginalQuestionIds:true,
    independentFacultyDuplicateReview:false,
    note:'Adjacent Chapter 11 original stems share hydrocarbon classification or structure-to-naming objectives; independent subject reviewer must distinguish assessment targets before any approved publication.'
   }))
 ]
 const d={...base,schemaVersion:'assps-grade910-156-original-answer-draft-coverage-v13',
  distinctOriginalIdsWithSeparateAnswerDrafts:156,
  separateMarkingPointProposals:798,originalRubricOnlyIdsWithoutNewAnswerDraft:10,
  sourceGroups:[...base.sourceGroups,{originalAuthoredSource:packet.originalQuestionFile,
   sourceFileSha256:hash(bytes),researchAnswerPacket:PACKET,
   distinctUnapprovedExplanationProposals:6}],
  remainingOriginalQuestionIds:[...pending].sort(),semanticOverlapReviewCandidates,deferredOriginalIds:expectedDeferred}
 if(d.sourceGroups.reduce((n,g)=>n+g.distinctUnapprovedExplanationProposals,0)!==156||
   d.academicallyApproved!==0||d.verifiedPublished!==0)
  throw Error('COVERAGE156_TOTAL_OR_APPROVAL_DRIFT')
 return d
}
function markdown(d){
 return [
 '# Grade IX-X Academic Master: 156 separate unapproved research-answer proposals','',
 'RESEARCH ONLY. These are 156 distinct existing original question IDs with supplemental English explanations, **not 156 new question rows**, academically reviewed, or published.','',
 '- Original authored question candidates: **'+d.originalAuthoredQuestionCandidates+'**, unchanged.',
 '- Original rubric-only five/seven-mark answer fields: **'+d.correctedRubricOnlyOriginals+'**, unchanged.',
 '- Original IDs with a separate explanatory answer research proposal: **'+d.distinctOriginalIdsWithSeparateAnswerDrafts+'**.',
 '- Separately proposed marking points: **'+d.separateMarkingPointProposals+'**.',
 '- Original IDs still lacking supplemental explanatory answer: **'+d.originalRubricOnlyIdsWithoutNewAnswerDraft+'**.',
 '- School adopted edition/page verified **0**; independently teacher reviewed **0**; academic approved **0**; published **0**.','',
 '| Source research file | Distinct draft proposals | Original SHA256 |',
 '|---|---:|---|',
 ...d.sourceGroups.map(g=>'| '+g.originalAuthoredSource+' | '+g.distinctUnapprovedExplanationProposals+' | '+g.sourceFileSha256+' |'),
 '','Companion JSON contains the '+d.originalRubricOnlyIdsWithoutNewAnswerDraft+' remaining original research IDs, which are seven Chemistry IX and three deferred Chemistry X procedure questions.',
 'Three potential conceptual overlap comparisons remain pending faculty originality review: old Ch7/Ch10 acid-rain pair; new Ch11 classifications T1-01L versus T1-02L; new Ch11 naming T3-01L versus T3-02L. Distinct stable question IDs do NOT prove conceptual uniqueness.',
 'Chapter 11 reaction and preparation IDs '+d.deferredOriginalIds.join(', ')+' remain expressly deferred to qualified faculty and may not be source-verified or released automatically.',
 'Catalog identity and PDF hashes are not equivalent to ASSPS actual textbook adoption, 2026-27 medium/edition/exam year or original printed exercise-page review.',
 'Human Chemistry/Urdu review, revision-bound signature and academic approval remain pending; verified Paper Studio Grade IX/X picker EMPTY, and SaaS Core solely deploys.',''
 ].join('\n')
}
function main(){
 const d=reconcile(loadInputs())
 const p=path.join(DOC,'ASSPS_GRADE910_156_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009')
 fs.writeFileSync(p+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(p+'.md',markdown(d))
 console.log(JSON.stringify({distinct:d.distinctOriginalIdsWithSeparateAnswerDrafts,marking:d.separateMarkingPointProposals,remaining:d.originalRubricOnlyIdsWithoutNewAnswerDraft,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={loadInputs,reconcile,markdown}

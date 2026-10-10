#!/usr/bin/env node
'use strict'
// Additive academic-research coverage; immutable previous 156-answer snapshot is retained.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const previous=require('./reconcile-grade910-answer-coverage-156.cjs')
const freeze=require('./attest-grade910-156-cohort-review-freeze.cjs')
const handoff=require('./attest-grade910-161-faculty-handoff.cjs')
const author=require('./author-chemistry9-ch13-five-original-answers.cjs')
const DOC=path.resolve(__dirname,'../../docs/question-bank')
const PACKET='ASSPS_CHEMISTRY9_CH13_FIVE_LONG_MODEL_ANSWER_DRAFTS_20261009.json'
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const reject=m=>{throw Error('COVERAGE161_'+m)}
function loadInputs(){
 return {old:previous.loadInputs(),raw:fs.readFileSync(author.INPUT),
  registry:JSON.parse(fs.readFileSync(author.REGISTRY)),
  packet:JSON.parse(fs.readFileSync(path.join(DOC,PACKET)))}
}
function reconcile({old,raw,registry,packet}){
 handoff.assertPinned(handoff.loadInputs())
 const inherited=freeze.attest(freeze.loadInputs())
 if(inherited.sourceCryptographicallyMatchedOriginalIds!==156||
  inherited.sourceAuthenticMarkingPointProposals!==798||
  inherited.admissionDecision!=='DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
  reject('PRIOR_156_REVISION_INTEGRITY_DRIFT')
 const base=previous.reconcile(old)
 if(base.schemaVersion!=='assps-grade910-156-original-answer-draft-coverage-v13'||
  base.originalAuthoredQuestionCandidates!==2581||base.correctedRubricOnlyOriginals!==166||
  base.distinctOriginalIdsWithSeparateAnswerDrafts!==156||
  base.separateMarkingPointProposals!==798||base.originalRubricOnlyIdsWithoutNewAnswerDraft!==10||
  base.sourceGroups.length!==19||base.academicallyApproved!==0||base.verifiedPublished!==0)
  reject('PREVIOUS_BASE_DRIFT')
 let source
 try{source=JSON.parse(raw)}catch(_){reject('ORIGINAL_SOURCE_INVALID')}
 const expected=author.build({bytes:raw,source,registry})
 if(JSON.stringify(packet)!==JSON.stringify(expected))
  reject('NEW_PACKET_TAMPERED_OR_APPROVED')
 const pending=new Set(base.remainingOriginalQuestionIds)
 if(packet.items.length!==5||packet.newFiveMarkPointProposals!==25||pending.size!==10)
  reject('NEW_COHORT_COUNT_DRIFT')
 for(const q of packet.items){
  if(!pending.has(q.questionId)||q.marks!==5||
   q.proposedDistinctMarkingPoints?.length!==5||
   q.schoolAdoptedEditionSessionVerified!==false||
   q.originalPrintedExercisePageVerified!==false||
   q.qualifiedIndependentSubjectReviewed!==false||
   q.urduEquivalenceReviewed!==false||
   q.academicallyApproved!==false||q.verifiedPublished!==false||
   q.independentReviewerId!==null||q.approvedRevisionId!==null)
   reject('DUPLICATE_OR_FALSE_FACULTY_SIGNOFF:'+q.questionId)
  pending.delete(q.questionId)
 }
 const remainder=['IX-CHEM-2025-C11-T4-01L','IX-CHEM-2025-C11-T4-02L',
  'X-CHEM-C18-L01','X-CHEM-C23-L01','X-CHEM-C24-L01']
 if([...pending].sort().join('|')!==remainder.sort().join('|'))
  reject('REMAINING_REVIEW_BACKLOG_DRIFT')
 const groups=[...base.sourceGroups,{originalAuthoredSource:packet.originalQuestionFile,
  sourceFileSha256:sha(raw),researchAnswerPacket:PACKET,
  distinctUnapprovedExplanationProposals:5}]
 const d={...base,schemaVersion:'assps-grade910-161-original-answer-research-coverage-v14',
  distinctOriginalIdsWithSeparateAnswerDrafts:161,separateMarkingPointProposals:823,
  originalRubricOnlyIdsWithoutNewAnswerDraft:5,sourceGroups:groups,
  remainingOriginalQuestionIds:[...pending].sort(),
  predecessorFrozenResearchAnswerIds:156,
  inheritedRevisionManifest:'ASSPS_GRADE910_156_PROPOSED_ANSWER_REVISION_PINS_20261009.json',
  newChapter13ConceptOnly:true,
  academicReleaseDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT'}
 if(groups.length!==20||
   groups.reduce((n,g)=>n+g.distinctUnapprovedExplanationProposals,0)!==161||
   d.schoolAdoptedTextbookPageVerified!==0||d.independentlyHumanReviewed!==0||
   d.academicallyApproved!==0||d.verifiedPublished!==0||
   d.semanticOverlapReviewCandidates.length!==3||
   d.semanticOverlapReviewCandidates.some(x=>x.independentFacultyDuplicateReview!==false))
  reject('AGGREGATE_OR_FACULTY_REVIEW_DRIFT')
 return d
}
function markdown(d){
 return [
 '# Grade IX-X — 161 distinct original question IDs with supplemental unapproved research','',
 '**RESEARCH ONLY. No verified question-picker release or certified school textbook evidence.**','',
 '- Original 2,581 provisional question candidates unchanged; 166 original rubric-only answers unchanged.',
 '- '+d.distinctOriginalIdsWithSeparateAnswerDrafts+' original question IDs have additional draft explanations.',
 '- '+d.separateMarkingPointProposals+' unreviewed proposed marking criteria.',
 '- Previous '+d.predecessorFrozenResearchAnswerIds+' answers remain frozen by their versioned revision manifest.',
 '- Original IDs without supplemental explanations: '+d.originalRubricOnlyIdsWithoutNewAnswerDraft+'.',
 '- Qualified subject/Urdu teacher approved 0; verified published 0.','',
 '## Outstanding original IDs for qualified review','',
 ...d.remainingOriginalQuestionIds.map(x=>'- '+x),
 '','## Source cohorts / draft proposals',
 '| Source file | Proposed explanations | Research source SHA256 |',
 '|---|---:|---|',
 ...d.sourceGroups.map(g=>'| '+g.originalAuthoredSource+' | '+g.distinctUnapprovedExplanationProposals+' | '+g.sourceFileSha256+' |'),
 '','Three earlier potential conceptual-overlap pairs remain unreviewed.',
 'The 2025-26 PECTAA catalog label and old source page assertions do not establish ASSPS school adoption or exam-year applicability.',
 'All new drafts address general classroom safety literacy only; students need qualified supervision.',
 '**Academic release decision: '+d.academicReleaseDecision+'.**',''
 ].join('\n')
}
function main(){
 const d=reconcile(loadInputs()),dest=path.join(DOC,'ASSPS_GRADE910_161_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009')
 fs.writeFileSync(dest+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(dest+'.md',markdown(d))
 console.log(JSON.stringify({answers:d.distinctOriginalIdsWithSeparateAnswerDrafts,
  marks:d.separateMarkingPointProposals,pending:d.originalRubricOnlyIdsWithoutNewAnswerDraft,
  frozen:d.predecessorFrozenResearchAnswerIds,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={loadInputs,reconcile,markdown}

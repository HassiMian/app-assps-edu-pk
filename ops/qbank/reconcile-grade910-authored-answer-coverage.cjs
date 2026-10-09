#!/usr/bin/env node
'use strict'
// Read-only unique-ID and original-fingerprint check. Never marks proposals approved.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const OUT=path.join(ROOT,'docs/question-bank')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const MANIFEST=Object.freeze([
 ['biology9EnglishStarter2026.json','ASSPS_BIOLOGY9_TWENTY_TWO_LONG_MODEL_ANSWER_DRAFTS_20261009.json',22],
 ['biology10EnglishStarter2026.json','ASSPS_BIOLOGY10_TWENTY_LONG_MODEL_ANSWER_DRAFTS_20261009.json',20],
 ['physics9EnglishStarter2026.json','ASSPS_PHYSICS9_ELEVEN_LONG_MODEL_ANSWER_DRAFTS_20261009.json',11],
 ['physics10Starter2026.json','ASSPS_PHYSICS10_FIVE_LONG_MODEL_ANSWER_DRAFTS_20261009.json',5],
 ['computer9Starter2026.json','ASSPS_COMPUTER9_TWELVE_LONG_MODEL_ANSWER_DRAFTS_20261009.json',12],
 ['computer10Starter2026.json','ASSPS_COMPUTER10_EIGHT_LONG_MODEL_ANSWER_DRAFTS_20261009.json',8],
 ['ict9TechStarter2026.json','ASSPS_ICT9_SIX_LONG_MODEL_ANSWER_DRAFTS_20261009.json',6],
 ['pakistanStudies10Starter2026.json','ASSPS_PAKSTUDIES10_EIGHT_LONG_MODEL_ANSWER_DRAFTS_20261009.json',8],
 ['fashionDesigning9TechStarter2026.json','ASSPS_FASHION9_NINE_LONG_MODEL_ANSWER_DRAFTS_20261009.json',9]
])
function reconcile({sources,packets,docket}){
 const flags=docket?.reviewCandidates
 if(!Array.isArray(flags)||flags.length!==166||docket.totals.originalAuthoredCandidates!==2581||
  docket.totals.rubricOnlyLongAnswers!==166)throw Error('COVERAGE_DOCKET_INVALID')
 const originalIds=new Map()
 for(const f of flags){
  if(!f.questionId||originalIds.has(f.questionId))throw Error('COVERAGE_DUPLICATE_ORIGINAL_FLAG')
  originalIds.set(f.questionId,f)
 }
 const seen=new Set(),groups=[]
 let totalCriteria=0
 for(const [filename,packetName,expectedCount] of MANIFEST){
  const raw=sources[filename]?.bytes,d=packets[packetName]
  if(!Buffer.isBuffer(raw)||!d)throw Error('COVERAGE_MISSING_INPUT:'+filename)
  const src=JSON.parse(raw)
  if(!Array.isArray(src.drafts))throw Error('COVERAGE_MISSING_AUTHORED_QUESTIONS:'+filename)
  const qmap=new Map(src.drafts.map(q=>[q.id,q]))
  if(qmap.size!==src.drafts.length)throw Error('COVERAGE_DUPLICATE_ORIGINAL_QUESTION:'+filename)
  const items=d.items||d.proposals
  if(!Array.isArray(items)||items.length!==expectedCount)throw Error('COVERAGE_WRONG_PACKET_SIZE:'+filename)
  for(const item of items){
   const id=item.questionId,q=qmap.get(id),original=originalIds.get(id)
   if(seen.has(id))throw Error('COVERAGE_DUPLICATE_DRAFT_ID:'+id)
   seen.add(id)
   if(!q||q.type!=='long'||!original||original.sourceFile!==filename)
    throw Error('COVERAGE_NOT_ORIGINAL_RUBRIC_FLAG:'+id)
   if(item.marks!==q.marks||item.chapterNo!==q.chapter?.number||item.topicId!==q.topicId)
    throw Error('COVERAGE_CHAPTER_TOPIC_MARKS_CHANGED:'+id)
   const originalAnswer=q.answer||q.content?.en?.answer||q.content?.ur?.answer||''
   const qhash=item.originalQuestionSha256||item.sourceQuestionSha256
   const ahash=item.originalAnswerSha256||item.sourceAnswerSha256
   const fhash=item.originalSourceFileSha256||item.sourceFileSha256
   if(qhash!==sha(JSON.stringify(q))||ahash!==sha(originalAnswer)||
     fhash!==sha(raw)||original.sourceFileSha256!==sha(raw))
    throw Error('COVERAGE_STALE_PROPOSAL_SHA:'+id)
   const answer=item.proposedEnglishModelAnswer||
    item.proposedOriginalEnglishExplanatoryAnswer||item.proposedIndependentEnglishExplanation
   const criteria=item.proposedSeparateMarkingCriteria||
    item.proposedIndependentMarkingPoints||item.proposedSeparateMarkingPoints||
    item.proposedDistinctMarkingPoints
   if(typeof answer!=='string'||answer.length<180||
     !Array.isArray(criteria)||criteria.length!==q.marks||
     new Set(criteria).size!==q.marks)
    throw Error('COVERAGE_MISSING_PROPOSAL_OR_CRITERIA:'+id)
   totalCriteria+=criteria.length
   for(const k of ['approved','academicApproved','academicallyApproved','published',
      'verifiedPublished','qualifiedSubjectReviewed','qualifiedIndependentSubjectReviewed',
      'subjectTeacherCorrectnessVerified','teacherScientificAnswerVerified',
      'answerCorrectnessVerifiedByQualifiedTeacher']){
     if(Object.hasOwn(item,k)&&item[k]!==false)
      throw Error('COVERAGE_FALSE_ACADEMIC_APPROVAL:'+id+':'+k)
   }
   if(item.independentReviewerId!==null)
    throw Error('COVERAGE_FALSE_REVIEWER:'+id)
  }
  groups.push({originalAuthoredSource:filename,sourceFileSha256:sha(raw),
   researchAnswerPacket:packetName,distinctUnapprovedExplanationProposals:expectedCount})
 }
 if(seen.size!==101)throw Error('COVERAGE_WRONG_TOTAL_DRAFTS')
 const remaining=[...originalIds.keys()].filter(id=>!seen.has(id)).sort()
 if(remaining.length!==65)throw Error('COVERAGE_WRONG_REMAINING_COUNT')
 return {
  schemaVersion:'assps-grade910-101-original-answer-draft-coverage-v3',
  scope:'RESEARCH_DRAFT_PROVENANCE_ONLY_NO_ACADEMIC_APPROVAL',
  originalAuthoredQuestionCandidates:2581,originalLongQuestionCount:564,
  correctedRubricOnlyOriginals:166,distinctOriginalIdsWithSeparateAnswerDrafts:seen.size,
  separateMarkingPointProposals:totalCriteria,
  originalRubricOnlyIdsWithoutNewAnswerDraft:remaining.length,
  schoolAdoptedTextbookPageVerified:0,independentlyHumanReviewed:0,
  academicallyApproved:0,verifiedPublished:0,
  caution:'Source hash and authoring completeness do not establish approved edition/medium/session, physical page, independent scientific review or selectable Paper Studio content.',
  sourceGroups:groups,remainingOriginalQuestionIds:remaining
 }
}
function loadInputs(){
 const sources={},packets={}
 for(const [s,p] of MANIFEST){
  sources[s]={bytes:fs.readFileSync(path.join(INPUT,s))}
  packets[p]=JSON.parse(fs.readFileSync(path.join(OUT,p)))
 }
 const docket=JSON.parse(fs.readFileSync(path.join(OUT,'ASSPS_GRADE910_REVISED_166_RUBRIC_ONLY_EVIDENCE_20261009.json')))
 return {sources,packets,docket}
}
function markdown(d){
 return [
  '# ASSPS Grade IX–X — 101 distinct original IDs with separate answer research drafts',
  '', '**Academic draft completeness is not academic approval.**','',
  `- Original question research candidates: **${d.originalAuthoredQuestionCandidates}**, unchanged.`,
  `- Original long-answer rubric-only flags (corrected): **${d.correctedRubricOnlyOriginals}**.`,
  `- DISTINCT original IDs with a separate explanatory research draft: **${d.distinctOriginalIdsWithSeparateAnswerDrafts}**.`,
  `- Separately proposed marking criteria: **${d.separateMarkingPointProposals}**.`,
  `- Original flagged IDs still lacking a separate explanatory draft: **${d.originalRubricOnlyIdsWithoutNewAnswerDraft}**.`,
  '- Qualified subject independently reviewed: **0**; school textbook page verified: **0**; approved: **0**; verified published: **0**.','',
  '| Original source file | Distinct draft answers | SHA256 of original authored source |',
  '|---|---:|---|',
  ...d.sourceGroups.map(g=>`| ${g.originalAuthoredSource} | ${g.distinctUnapprovedExplanationProposals} | \`${g.sourceFileSha256}\` |`),
  '', 'Companion JSON gives 82 remaining stable IDs without reproducing original textbook or question passage. Each counted original question ID, raw source digest, answer digest, chapter/topic and marks was checked. No source file, paper or Question Bank row was modified.',
  '', '**Adopted school book medium, edition, actual exam year, physical exercise pages, independent subject/Urdu review and revision-specific approval remain pending. Paper Studio verified Grade IX–X remains EMPTY; SaaS Core alone deploys.**',''
 ].join('\n')
}
function main(){
 const d=reconcile(loadInputs())
 const base=path.join(OUT,'ASSPS_GRADE910_101_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009')
 fs.writeFileSync(base+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(base+'.md',markdown(d))
 console.log(JSON.stringify({drafts:d.distinctOriginalIdsWithSeparateAnswerDrafts,remaining:d.originalRubricOnlyIdsWithoutNewAnswerDraft,approved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={MANIFEST,reconcile,loadInputs,markdown}

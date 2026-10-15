#!/usr/bin/env node
'use strict'
/*
* Individually written source-revision-bound MCQ distractor drafts.
* Original answers and original 2,581 source questions are never rewritten.
* No human source review or school-specific adoption is inferred.
*/
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const SOURCE=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_CORRECTION_INTEGRITY_VERIFIED_DOCKET_20261014.json')
const CUES=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_68_MCQ_DISTRACTOR_CUE_METRICS_20261014.json')
const CURATED=path.join(__dirname,'editorial/grade910-66-curated-distractor-proposals-20261015.tsv')
const OUTPUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_66_CURATED_MCQ_OPTION_REVISION_DRAFTS_20261015.json')
const SUMMARY=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_66_MCQ_CURATED_DISTRACTOR_RECOVERY_20261015.md')
const SHA=v=>crypto.createHash('sha256').update(v).digest('hex')
const fail=x=>{throw new Error('GRADE910_66_DISTRACTOR_'+x)}
const text=x=>String(typeof x==='string'?x:x?.text??'').normalize('NFKC').trim()
function candidateSource(ids){
 const map=new Map()
 for(const file of fs.readdirSync(STAGING).filter(f=>f.endsWith('.json')).sort()){
  let raw,obj
  try{raw=fs.readFileSync(path.join(STAGING,file));obj=JSON.parse(raw)}catch(_){continue}
  for(const q of obj.drafts||obj.questions||obj.items||[]){
   const id=q.id||q.questionId||q.originalQuestionId
   if(!ids.has(id))continue
   if(map.has(id))fail('DUPLICATE_ORIGINAL_'+id)
   map.set(id,{item:q,file,rawHash:SHA(raw),questionRevisionHash:SHA(JSON.stringify(q))})
  }
 }
 if(map.size!==ids.size)fail('MISSING_SOURCE_CANDIDATES')
 return map
}
function loadCurated(bytes=fs.readFileSync(CURATED)){
 const map=new Map()
 for(const row of bytes.toString('utf8').trim().split(/\r?\n/)){
  const parts=row.split('\t')
  if(parts.length!==4)fail('CURATION_FIELDS_MISSING')
  const [id,...distractors]=parts
  if(map.has(id))fail('DUPLICATE_DRAFT_ID_'+id)
  if(distractors.some(x=>x.trim().length<20))fail('DRAFT_TOO_BRIEF_'+id)
  if(distractors.some(x=>/[ØÙÛÐ]/.test(x)))fail('CORRUPTED_UNICODE_'+id)
  map.set(id,distractors.map(text))
 }
 return map
}
function build({curatedBytes}={}){
 const integrity=require('./verify-grade910-processed-correction-integrity-20261014.cjs').assess()
 if(JSON.stringify(integrity)!==JSON.stringify(JSON.parse(fs.readFileSync(SOURCE))))fail('584_SOURCE_INTEGRITY_DRIFT')
 const legacy=JSON.parse(fs.readFileSync(CUES))
 if(legacy.originalMcqSourceSHARechecked!==68)fail('BASELINE_CUE_METRICS_DRIFT')
 const targets=legacy.rows.filter(x=>x.correctLongerThanOthersByAtLeast50Percent).sort((a,b)=>a.originalId.localeCompare(b.originalId))
 if(targets.length!==66)fail('EXPECTED_66_LENGTH_CUE_TARGETS')
 const source=new Map(integrity.rows.filter(r=>r.signals.includes('MCQ_OPTION_LENGTH_CUE_REVIEW')).map(r=>[r.originalId,r]))
 const originals=candidateSource(new Set(targets.map(t=>t.originalId)))
 const curated=loadCurated(curatedBytes===undefined?undefined:curatedBytes)
 if(curated.size!==targets.length)fail('CURATED_COUNT_NOT_66')
 const assigned=new Map([...targets].sort((a,b)=>SHA('V2|'+a.originalId+'|'+a.originalRevisionSha256).localeCompare(SHA('V2|'+b.originalId+'|'+b.originalRevisionSha256))).map((v,i)=>[v.originalId,i%4]))
 const balanced={A:0,B:0,C:0,D:0},rows=[]
 let residualLengthCues=0,originalStrong=0,correctStrictLongest=0
 for(let i=0;i<targets.length;i++){
  const target=targets[i],id=target.originalId,bound=source.get(id),orig=originals.get(id),wrong=curated.get(id)
  if(!bound||!orig||!wrong)fail('ORIGINAL_OR_CURATED_MISSING_'+id)
  if(bound.originalRevisionSha256!==orig.questionRevisionHash||bound.sourceFileSha256!==orig.rawHash)
   fail('ORIGINAL_FILE_OR_QUESTION_SHA_MISMATCH_'+id)
  const q=orig.item,raw=q.options||q.content?.en?.options||q.content?.ur?.options||[]
  if(!Array.isArray(raw)||raw.length!==4)fail('SOURCE_NOT_FOUR_OPTIONS_'+id)
  const sourceOptions=raw.map(text)
  const originalAnswer=text(q.answer||q.content?.en?.answer||q.content?.ur?.answer)
  const originalMatches=sourceOptions.filter(v=>v.toLowerCase()===originalAnswer.toLowerCase())
  if(originalMatches.length!==1)fail('ORIGINAL_ANSWER_AMBIGUOUS_'+id)
  if(sourceOptions[0].toLowerCase()!==originalAnswer.toLowerCase())
   fail('UNEXPECTED_ORIGINAL_KEY_NOT_A_'+id)
  const variants=[originalAnswer,...wrong]
  if(new Set(variants.map(x=>x.toLocaleLowerCase('en'))).size!==4)
   fail('PROPOSED_DUPLICATE_OPTIONS_'+id)
  const correctIndex=assigned.get(id)
  const rotated=[...wrong].sort((a,b)=>SHA('V2_DISTRACTOR|'+id+'|'+a).localeCompare(SHA('V2_DISTRACTOR|'+id+'|'+b)))
  rotated.splice(correctIndex,0,originalAnswer)
  const options=rotated.map((value,j)=>({id:'ABCD'[j],text:value}))
  const key='ABCD'[correctIndex]
  if(options.filter(o=>o.text===originalAnswer).length!==1||options[correctIndex].id!==key)
   fail('DRAFT_KEY_INVALID_'+id)
  balanced[key]++
  const lengths=options.map(o=>Array.from(o.text).length),correctLength=lengths[correctIndex]
  const other=lengths.filter((_,j)=>j!==correctIndex)
  const mean=other.reduce((a,b)=>a+b,0)/3
  const lengthRatio=correctLength/mean
  const strong=lengthRatio>=1.5
  if(strong)residualLengthCues++
  const longest=correctLength>Math.max(...other)
  if(longest)correctStrictLongest++
  if(!target.correctLongerThanOthersByAtLeast50Percent)fail('NOT_A_STRONG_ORIGINAL')
  originalStrong++
  const revision={
   schemaVersion:'assps-grade910-66-curated-mcq-revision-proposal-v2',
   parentId:id,parentOriginalRevisionSha256:bound.originalRevisionSha256,
   grade:bound.grade,subject:bound.subject,medium:bound.medium,
   originalStem:q.stem||q.content?.en?.stem||q.content?.ur?.stem||'',
   questionType:q.type,marks:q.marks||1,
   options,proposedCorrectOptionId:key,proposedAnswerText:originalAnswer,
   sourceCorrectOptionTextUnchanged:true,
   originalOtherDistractorsReplacedWithManuallyWrittenAlternatives:true,
   shiftedAnswerPositionFromOriginalA:correctIndex!==0,
   noAnswerFactsIndependentlySourceVerified:true,
   languageAndSubjectReviewerRequired:true,
   actualSchoolTextbookEditionVerified:false,teacherApproved:false,
   principalApproved:false,academicallyApproved:false,published:false,
   paperStudioSelectable:false
  }
  const preview={
   originalId:id,originalRevisionSha256:bound.originalRevisionSha256,
   originalSourceFile:orig.file,originalSourceFileSha256:bound.sourceFileSha256,
   originalOptions:sourceOptions,originalReferenceAnswerText:originalAnswer,
   originalOptionLengthRatio:target.correctToOtherMeanRatio,
   draftNewOptionCorrectIndex:correctIndex,draftAnswerPosition:key,
   newOptionLengthRatio:Number(lengthRatio.toFixed(4)),
   residualStrongLengthCue:strong,correctOptionStillStrictlyLongest:longest,
   proposal:revision,proposalSha256:SHA(JSON.stringify(revision)),
   status:'AI_EDITORIAL_DRAFT_NOT_FACT_CHECKED_NOT_APPROVED'
  }
  rows.push(preview)
 }
 if(Math.max(...Object.values(balanced))-Math.min(...Object.values(balanced))>1)
  fail('DRAFT_POSITION_DISTRIBUTION_UNBALANCED')
 return{
  schemaVersion:'assps-grade910-66-mcq-curated-corrections-safe-draft-v2',
  sourceIntegrityLedgerSha256:SHA(fs.readFileSync(SOURCE)),
  originalResearchCandidateCount:2581,originalFlaggedMCQCount:68,
  originalStrongCorrectOptionLengthCues:originalStrong,curatedProposalCount:rows.length,
  newlyAuthoredWrongDistractorTexts:rows.length*3,
  proposedOriginalReferenceAnswerPreserved:rows.length,
  proposedAnswerKeyPositionDistribution:balanced,
  choicePermutationStrategy:'SHA256_QUESTION_REVISION_RANK_BALANCED_THEN_SHA256_LOCAL_DISTRACTOR_PERMUTATION_V2',
  remainingStrongLengthOutliersAfterProposals:residualLengthCues,
  proposedKeyStillStrictlyLongestCount:correctStrictLongest,
  realQualifiedSubjectAndUrduReviewerCount:0,
  verifiedQuestionAnswerCount:0,academicallyApproved:0,published:0,
  reviewerWarning:'Draft options are independently written and the reference answer text is unchanged; neither the original answer nor new distractors are certified against an adopted school textbook. A teacher must verify each distractor remains unambiguously wrong in the actual question context. This is not an approved question bank export.',
  rows
 }
}
function write(){
 const x=build()
 fs.writeFileSync(OUTPUT,JSON.stringify(x,null,2)+'\n')
 const lines=[
 '# ASSPS Grade IX–X — 66 individually curated MCQ distractor revision proposals',
 '',
 'All 66 originally length-cued MCQs are retained in source. This is a separate source-SHA- and question-revision-SHA-bound editorial **DRAFT**, not replacement of approved records.',
 '',
 '- Individually authored replacement distractors: **'+x.newlyAuthoredWrongDistractorTexts+'** (3 per question).',
 '- Original question stems/reference answer text remain unchanged in all **'+x.curatedProposalCount+'/66** drafts.',
 '- Proposed correct answer positions balanced: '+Object.entries(x.proposedAnswerKeyPositionDistribution).map(([k,v])=>k+'='+v).join(', ')+'.',
 '- Original strong correct-option length cues: **'+x.originalStrongCorrectOptionLengthCues+'**.',
 '- Residual strong correct-option length cues with new wording: **'+x.remainingStrongLengthOutliersAfterProposals+'**.',
 '- Correct key still strictly longest in **'+x.proposedKeyStillStrictlyLongestCount+'** drafts (stricter metric than the >=1.5 ratio).',
 '- No real physical school textbook edition, source page, independently qualified subject/Urdu review or Principal review is claimed; academically approved **0**, published **0**.',
 '',
 'Every row contains original full four-option list, official original source/revision SHA, separate alternate answer-key position, three contextual distractor candidates and revision proposal hash.',
 '',
 '## Quality constraints',
 'A longer but scientifically correct distractor would make an MCQ ambiguous. These editorial alternatives must therefore be checked item-by-item by a subject specialist and Urdu reviewer before any source-verified status, publication or Paper Studio selection. Original questions and official papers stay untouched.'
 ]
 fs.writeFileSync(SUMMARY,lines.join('\n')+'\n')
 return{rows:x.rows.length,curated:x.newlyAuthoredWrongDistractorTexts,residualStrong:x.remainingStrongLengthOutliersAfterProposals,stillLongest:x.proposedKeyStillStrictlyLongestCount,distribution:x.proposedAnswerKeyPositionDistribution,digest:SHA(fs.readFileSync(OUTPUT))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={build,write,loadCurated,OUTPUT,SUMMARY,CURATED}

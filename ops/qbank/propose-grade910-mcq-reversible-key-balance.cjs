#!/usr/bin/env node
'use strict'
// 875 research-only reversible MCQ option-order suggestions. NEVER edits candidate source or publishes questions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const prev=require('./attest-grade910-all-mcq-source-revisions.cjs')
const {collectDocuments}=require('./audit-authoring-crossfile-qa.cjs')
const ROOT=path.resolve(__dirname,'../..'),DOC=path.join(ROOT,'docs/question-bank')
const NAME='ASSPS_GRADE910_875_MCQ_REVERSIBLE_OPTION_ORDER_FACULTY_PROPOSALS_20261010'
const PIN='1806798be0090697ee07a4a6616b6f4adb1b43f891ab531b5db51e96b609424b'
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const reject=x=>{throw Error('MCQ_ORDER_REVIEW_'+x)}
const LABELS=['A','B','C','D']
function normalize(s){
 return String(s??'').normalize('NFKC').trim().toLocaleLowerCase('en')
  .replace(/[\s.!?۔؛،]+$/gu,'').replace(/\s+/gu,' ')
}
function inputs(){return{documents:collectDocuments(),previous:prev.loadInputs()}}
function origMcqs(doc){return [...(doc.data?.drafts||[]),...(doc.data?.items||[])].filter(q=>q?.type==='mcq')}
function validateQuestion(q){
 if(!q||q.type!=='mcq'||q.marks!==1||typeof q.id!=='string')
  reject('ORIGINAL_MCQ_SHAPE_CHANGED')
 const parts=Object.entries(q.content||{}).filter(([language,v])=>
  ['en','ur'].includes(language)&&v&&Array.isArray(v.options))
 let originalKey=null,kind=null,optionsPerLanguage=[]
 if(parts.length){
  kind='STRUCTURED_ORIGINAL_FOUR_OPTION_MCQS'
  originalKey=q.correctOptionId
  if(!LABELS.includes(originalKey))reject('ORIGINAL_STRUCTURED_KEY_INVALID:'+q.id)
  for(const [lang,c] of parts){
   if(c.options.length!==4||c.options.some((o,i)=>o?.id!==LABELS[i]||typeof o.text!=='string'||!o.text.trim()))
    reject('ORIGINAL_OPTION_LABEL_OR_TEXT_INVALID:'+q.id+':'+lang)
   const norms=c.options.map(o=>normalize(o.text))
   if(new Set(norms).size!==4)reject('ORIGINAL_DISTRACTOR_TEXT_COLLISION:'+q.id+':'+lang)
   if(norms[LABELS.indexOf(originalKey)]!==normalize(c.answer)||
     norms.filter(o=>o===normalize(c.answer)).length!==1)
    reject('ORIGINAL_ANSWER_AND_KEY_NOT_SEMANTICALLY_LINKED:'+q.id+':'+lang)
   optionsPerLanguage.push({language:lang,optionsSha256:sha(JSON.stringify(c.options)),
    correctAnswerOriginalNormalizedSha256:sha(normalize(c.answer)),
    correctAnswerOptionOriginalSha256:sha(JSON.stringify(c.options[LABELS.indexOf(originalKey)].text))})
  }
 }else{
  kind='LEGACY_ENGLISH_STRING_OPTIONS'
  if(!Array.isArray(q.options)||q.options.length!==4||typeof q.answer!=='string')
   reject('ORIGINAL_LEGACY_OPTIONS_MISSING:'+q.id)
  const norms=q.options.map(normalize)
  if(new Set(norms).size!==4||norms.some(x=>!x))
   reject('ORIGINAL_LEGACY_DISTRACTORS_NOT_DISTINCT:'+q.id)
  const candidates=norms.flatMap((o,i)=>o===normalize(q.answer)?[i]:[])
  if(candidates.length!==1)reject('ORIGINAL_LEGACY_ANSWER_NOT_UNIQUE:'+q.id)
  originalKey=LABELS[candidates[0]]
  optionsPerLanguage=[{language:'en',optionsSha256:sha(JSON.stringify(q.options)),
   correctAnswerOriginalNormalizedSha256:sha(normalize(q.answer)),
   correctAnswerOptionOriginalSha256:sha(JSON.stringify(q.options[candidates[0]]))}]
 }
 if(!optionsPerLanguage.length)reject('MISSING_LANGUAGE_OPTIONS:'+q.id)
 return{originalKey,kind,optionsPerLanguage}
}
function findPattern(keys){
 // Same definition as grade910 authoring QC: 8 consecutive correct keys
 // periodically repeat with period 1, 2, 3 or 4.
 for(let period=1;period<=4;period++){
  for(let start=0;start+8<=keys.length;start++){
   let repeated=true
   for(let j=start+period;j<start+8;j++)
    if(keys[j]!==keys[j-period]){repeated=false;break}
   if(repeated)return {period,start,length:8}
  }
 }
 return null
}
function repairEditorialPatternTargets(candidates,sorted,targets){
 const fileGroups=new Map()
 for(const item of candidates){
  if(!fileGroups.has(item.sourceFile))fileGroups.set(item.sourceFile,[])
  fileGroups.get(item.sourceFile).push(item.id)
 }
 const keysFor=file=>fileGroups.get(file).map(id=>targets.get(id))
 const canonicalFileOrder=[...fileGroups.keys()].sort((a,b)=>a.localeCompare(b))
 let swapCount=0
 for(let guard=0;guard<40;guard++){
  let flagged=null
  for(const file of canonicalFileOrder){
   const issue=findPattern(keysFor(file))
   if(issue){flagged={file,...issue};break}
  }
  if(!flagged)return swapCount
  const ids=fileGroups.get(flagged.file)
  // Middle element of the 8-key periodic run lies in every overlapping 8-run.
  const subjectId=ids[flagged.start+4],subjectKey=targets.get(subjectId)
  let candidateFound=false
  for(const other of sorted){
   if(other.sourceFile===flagged.file||targets.get(other.id)===subjectKey)continue
   const otherKey=targets.get(other.id)
   const beforeOther=findPattern(keysFor(other.sourceFile))
   targets.set(subjectId,otherKey);targets.set(other.id,subjectKey)
   const afterCurrent=findPattern(keysFor(flagged.file))
   const afterOther=findPattern(keysFor(other.sourceFile))
   if(!afterCurrent&&!afterOther){
    candidateFound=true;swapCount++;break
   }
   targets.set(subjectId,subjectKey);targets.set(other.id,otherKey)
  }
  if(!candidateFound)reject('UNRESOLVED_PERIODIC_SEQUENCE_IN_EDITORIAL_TARGETS:'+flagged.file)
 }
 reject('EDIT_TARGET_PATTERN_REPAIR_ITERATION_LIMIT')
}
function build({documents,previous}){
 const frozen=prev.assertFrozen(previous)
 if(frozen.countOfDistinctOriginalMcqResearchCandidates!==875||
  frozen.originalMcqSourceFiles!==71||frozen.academicallyApproved!==0||
  frozen.verifiedPublished!==0)reject('INHERITED_REVIEW_HOLD_DRIFT')
 const sourceMap=new Map(frozen.originalQuestionFiles.map(d=>[d.sourceFile,d]))
 const candidate=[]
 for(const d of documents){
  const source=sourceMap.get(d.file)
  const qs=origMcqs(d)
  if(!source){if(qs.length)reject('UNFROZEN_MCQ_SOURCE_FILE');continue}
  if(qs.length!==source.originalCandidateMcqs)reject('ORIGINAL_SOURCE_COHORT_COUNT_CHANGED')
  const pinned=new Map(source.originalQuestionRevisions.map(q=>[q.questionId,q]))
  for(const q of qs){
   const v=validateQuestion(q),old=pinned.get(q.id)
   if(!old||old.originalQuestionSha256!==sha(JSON.stringify(q)))
    reject('ORIGINAL_QUESTION_REVISION_DRIFT:'+q.id)
   if(old.keyedAnswerLabel&&old.keyedAnswerLabel!==v.originalKey)
    reject('INHERITED_ORIGINAL_CORRECT_KEY_DRIFT:'+q.id)
   candidate.push({id:q.id,sourceFile:d.file,originalFileSha256:source.originalRawFileSha256,
    originalQuestionSha256:old.originalQuestionSha256,...v})
  }
 }
 if(candidate.length!==875||new Set(candidate.map(q=>q.id)).size!==875)
  reject('ORIGINAL_MCQ_GLOBAL_COUNT_OR_ID_DRIFT')
 const sorted=candidate.slice().sort((a,b)=>sha('editorial-v1:'+a.id).localeCompare(sha('editorial-v1:'+b.id))||a.id.localeCompare(b.id))
 const targets=new Map(sorted.map((q,i)=>[q.id,LABELS[i%4]]))
 const editorialCorrectOptionSwaps=repairEditorialPatternTargets(candidate,sorted,targets)
 const originals={A:0,B:0,C:0,D:0},proposed={A:0,B:0,C:0,D:0}
 const proposals=candidate.map(q=>{
  const target=targets.get(q.id)
  originals[q.originalKey]++;proposed[target]++
  const srcIdx=LABELS.indexOf(q.originalKey),destIdx=LABELS.indexOf(target)
  const rotation=(srcIdx-destIdx+4)%4
  const order=LABELS.map((_,i)=>(i+rotation)%4)
  if(order[destIdx]!==srcIdx||new Set(order).size!==4)
   reject('PERMUTATION_INVALID:'+q.id)
  const link={sourceId:q.id,sourceFile:q.sourceFile,
   originalSourceRawSha256:q.originalFileSha256,
   originalQuestionSha256:q.originalQuestionSha256,
   originalAnswerKeyLabel:q.originalKey,
   originalOptionsSchema:q.kind,
   sourceAnswerAndOptions:q.optionsPerLanguage,
   proposedCorrectAnswerLabel:target,
   proposedOriginalOptionIndicesInNewLabelOrder:order}
  return {...link,proposedOptionOrderRevisionSha256:sha(JSON.stringify(link)),
   independentReviewerId:null,originalQuestionCorrectnessIndependentlyValidated:false,
   proposedOptionOrderCheckedByIndependentReviewer:false,
   finalOptionRevisionApproved:false,academicallyApproved:false,verifiedPublished:false}
 })
 if(originals.A!==785||originals.B!==50||originals.C!==33||originals.D!==7||
  proposed.A!==219||proposed.B!==219||proposed.C!==219||proposed.D!==218)
  reject('PREEXISTING_KEY_COUNTS_OR_PROPOSED_BALANCE_DRIFT')
 return{schemaVersion:'assps-grade910-reversible-option-permutation-faculty-intake-v1',
  sourceOriginalMcqCandidates:875,
  structuredOriginalMcqs:proposals.filter(x=>x.originalOptionsSchema==='STRUCTURED_ORIGINAL_FOUR_OPTION_MCQS').length,
  legacyOriginalMcqs:proposals.filter(x=>x.originalOptionsSchema==='LEGACY_ENGLISH_STRING_OPTIONS').length,
  originalCorrectKeyCounts:originals,proposedCorrectKeyCounts:proposed,
  proposedReviewerOnlyAssignmentSwaps:editorialCorrectOptionSwaps,
  remainingProposedPerSourcePeriodicKeyPatterns:0,
  allOriginalSourceFilesAndQuestionRevisionsUnchanged:true,
  noOriginalOptionOrderOrKeyWritten:true,onlyUnapprovedReversibleReviewProposals:true,
  independentlyReviewedOptionRevisions:0,academicallyApproved:0,verifiedPublished:0,
  publicationDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  proposals}
}
function assertFrozen(input,overrideBytes){
 const bytes=overrideBytes??fs.readFileSync(path.join(DOC,NAME+'.json'))
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==PIN)
  reject('FROZEN_TEACHER_REVIEW_PROPOSAL_SHA_CHANGED')
 let disk
 try{disk=JSON.parse(bytes)}catch(_){reject('FROZEN_PROPOSAL_JSON_INVALID')}
 const now=build(input)
 if(JSON.stringify(disk)!==JSON.stringify(now))
  reject('RESEARCH_OPTION_ORDER_PROPOSAL_DRIFT')
 return now
}
function markdown(d){
 return ['# ASSPS Grade IX-X — 875 reversible MCQ answer-option editorial review proposals','',
 '**Teacher review proposals only, not original question source revisions or correct-answer certification.**','',
 'Observed original MCQ labels: A 785, B 50, C 33, D 7 (correct-option A ~89.7%).',
 'Deterministic candidate-only SHA-sorted assignment suggests A 219, B 219, C 219, D 218, with '+d.proposedReviewerOnlyAssignmentSwaps+' reviewer-only target swaps avoiding 8-key periodic sequences within source files.',
 'Existing candidate content/answer keys/option orders are UNTOUCHED. The proposed rotations only adjust display order *after* independent revision-specific teacher review.',
 'Each proposal stores its original question+file SHA and per-language original options/correct-answer SHA; proposed option indices are a bijective four-element rotation, never new factual answer text.',
 'For 851 structured MCQs the original correctOptionId and normalized selected option text match. For 24 original legacy English MCQs a single matching answer option was derived for nonpublishing review; these require independent explicit-key conversion before release.',
 'Six original Chemistry IX answers differ from selected option only in final punctuation; benign terminal punctuation normalization was used but this is NOT independent scientific correctness.',
 'All 18 bilingual structured MCQs share exactly the same proposed index permutation for both language variants; teacher Urdu/English semantic equivalence is NOT certified.',
 '','## Required before any publish or import','',
 'Qualified independent subject and Urdu reviewers must check original scientific truth, distractor quality, option-order output, exact question+answer revision, adopted edition/exercise page and duplicated content.',
 'A displayed proposed balanced distribution is NOT an approved paper pattern, and a mechanical correct-option shuffle may not become verified selection automatically.',
 '','| Evidence | Research-only status |',
 '|---|---|',
 '| Original unique questions | '+d.sourceOriginalMcqCandidates+' |',
 '| Original structured / legacy | '+d.structuredOriginalMcqs+' / '+d.legacyOriginalMcqs+' |',
 '| Candidate permutations | '+d.proposals.length+' |',
 '| Independently signed reviewer approvals | '+d.independentlyReviewedOptionRevisions+' |',
 '| Academically approved / published | 0 / 0 |',
 '| Release | '+d.publicationDecision+' |','',
 'Paper Studio owns final teacher editor/reorder UX, SaaS Core owns deployment. No teacher approval inferred from this document.',''
 ].join('\n')
}
function main(){
 const d=build(inputs()),dest=path.join(DOC,NAME)
 fs.writeFileSync(dest+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(dest+'.md',markdown(d))
 console.log(JSON.stringify({source:d.sourceOriginalMcqCandidates,
  structured:d.structuredOriginalMcqs,legacy:d.legacyOriginalMcqs,
  proposed:d.proposedCorrectKeyCounts,manifestSha256:sha(fs.readFileSync(dest+'.json')),
  academicallyApproved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={inputs,build,normalize,validateQuestion,assertFrozen,markdown,NAME,sha}

#!/usr/bin/env node
'use strict'
// Mechanical MCQ quality evidence, never teacher answer correctness or Urdu semantic equivalence.
const fs=require('node:fs'),path=require('node:path')
const inventory=require('./build-grade910-blind-faculty-packets.cjs')
const OUT=path.resolve(__dirname,'../../docs/question-bank/ASSPS_GRADE910_875_MCQ_LANGUAGE_KEY_INTEGRITY_REVIEW_20261012.json')
const MD=path.resolve(__dirname,'../../docs/question-bank/ASSPS_GRADE910_MCQ_MEDIUM_DISTRACTOR_FACULTY_ACTIONS_20261012.md')
const FLAG=['ORIGINAL_CORRECT_OPTION_ID_NOT_CANONICAL','EMPTY_HINDI_PLACEHOLDER_MUST_NOT_RENDER',
 'NONEMPTY_HINDI_CONTENT_BEYOND_ASSPS_ENGLISH_URDU_SELECTION',
 'PARALLEL_ENGLISH_URDU_FACULTY_EQUIVALENCE_UNVERIFIED',
 'CORRECT_OPTION_ANSWER_TEXT_MISMATCH','DUPLICATED_OR_MALFORMED_OPTIONS']
const fail=x=>{throw Error('ASSPS_GRADE910_MCQ_MEDIUM_INTEGRITY_'+x)}
const normalize=s=>String(s||'').normalize('NFKC').trim().toLocaleLowerCase('en')
 .replace(/[\s.!?۔؛،؟]+$/gu,'').replace(/\s+/gu,' ')
function examine(q){
 if(q?.type!=='mcq'||typeof q?.id!=='string'||!q.id)fail('INVALID_SOURCE_MCQ')
 const f=new Set(),validOptionIds=['A','B','C','D']
 const keyed=validOptionIds.includes(q.correctOptionId)
 if(!keyed)f.add('ORIGINAL_CORRECT_OPTION_ID_NOT_CANONICAL')
 const c=q.content||{},langs=['en','ur'].filter(l=>c[l])
 const bilingual=langs.length===2
 if(bilingual)f.add('PARALLEL_ENGLISH_URDU_FACULTY_EQUIVALENCE_UNVERIFIED')
 if(c.hi){
  const h=c.hi
  if(!String(h.stem||'').trim()&&(!Array.isArray(h.options)||
    h.options.every(z=>!String(z?.text||'').trim())))
   f.add('EMPTY_HINDI_PLACEHOLDER_MUST_NOT_RENDER')
  else f.add('NONEMPTY_HINDI_CONTENT_BEYOND_ASSPS_ENGLISH_URDU_SELECTION')
 }
 for(const l of langs){
  const v=c[l],opts=v.options
  if(!Array.isArray(opts)||opts.length!==4||
   opts.some((o,i)=>o?.id!==validOptionIds[i]||!normalize(o?.text))||
   new Set(opts.map(o=>normalize(o?.text))).size!==4){
   f.add('DUPLICATED_OR_MALFORMED_OPTIONS')
  }
  if(keyed&&Array.isArray(opts)){
   const expected=opts.find(o=>o.id===q.correctOptionId)
   if(!expected||normalize(expected.text)!==normalize(v.answer))
    f.add('CORRECT_OPTION_ANSWER_TEXT_MISMATCH')
  }
 }
 return{originalQuestionId:q.id,mediumClaim:q.medium??null,
  originalAuthoredGrade:q.curriculum?.grade??null,
  originalAuthoredSubject:q.curriculum?.subjectId??null,
  declaredCorrectOptionIdCanonical:keyed,
  englishOptionSetPresent:Boolean(c.en),urduOptionSetPresent:Boolean(c.ur),
  bilingualEnglishUrduPresent:bilingual,
  sourceAnswerCorrectnessTeacherVerified:false,
  independentUrduEquivalenceVerified:false,
  automaticMCQOptionRebalancePermitted:false,
  researchReviewFlags:[...f].sort()}
}
function build(){
 const source=inventory.inventory()
 const rows=[],positions={A:0,B:0,C:0,D:0,UNSET:0}
 for(const locked of source.queue.rows){
  const q=source.candidates.get(locked.originalQuestionId)?.q
  if(!q||q.id!==locked.originalQuestionId)fail('FROZEN_ORIGINAL_ID_NOT_FOUND')
  if(q.type!=='mcq')continue
  if(q.correctOptionId in positions)positions[q.correctOptionId]++
  else positions.UNSET++
  rows.push({...examine(q),
   originalQuestionRevisionSha256:locked.originalQuestionRevisionSha256,
   originalSourceFileSha256:locked.originalSourceFileSha256})
 }
 rows.sort((a,b)=>a.originalQuestionId.localeCompare(b.originalQuestionId))
 const flagged=Object.fromEntries(FLAG.map(key=>[key,rows.filter(r=>r.researchReviewFlags.includes(key)).length]))
 const types=rows.reduce((v,q)=>(v[q.mediumClaim??'UNASSIGNED']=(v[q.mediumClaim??'UNASSIGNED']||0)+1,v),{})
 if(rows.length!==875||positions.A!==785||positions.B!==33||positions.C!==26||
  positions.D!==7||positions.UNSET!==24||rows.filter(r=>r.bilingualEnglishUrduPresent).length!==18||
  flagged.EMPTY_HINDI_PLACEHOLDER_MUST_NOT_RENDER!==16||
  flagged.NONEMPTY_HINDI_CONTENT_BEYOND_ASSPS_ENGLISH_URDU_SELECTION!==2||
  flagged.CORRECT_OPTION_ANSWER_TEXT_MISMATCH!==0||
  flagged.DUPLICATED_OR_MALFORMED_OPTIONS!==0)
  fail('ORIGINAL_MCQ_STEMMED_875_OR_LANGUAGE_COHORT_CHANGED')
 return{schemaVersion:'assps-grade910-original-mcq-language-answer-structural-review-v1',
  originalMCQs:875,sourceOriginals:2581,sourceFrozenRevisionCount:875,
  aggregateOriginalCorrectOptionPositions:positions,originalMediumClaims:types,
  flags:flagged,
  bilingualOriginalEnglishUrduResearchPairs:18,
  englishUrduSemanticEquivalenceIndependentlyCertified:0,
  originalScientificAnswerKeyTeacherCertified:0,
  originalCorrectOptionPositionDistributionIsNotCorrectnessProof:true,
  originalStemOptionAnswerTextReproduced:false,
  originalQuestionChangesMade:false,
  originalSignedHumanAcademicApprovals:0,published:0,
  paperStudioVerifiedSelectable:false,
  releaseDecision:'HOLD_UNTIL_VERIFIED_SCHOOL_ADOPTION_INDEPENDENT_SUBJECT_URDU_REVIEW_AND_SIGNATURES',
  rows}
}
function markdown(x){
 return ['# ASSPS IX–X MCQ / bilingual authoring source-locked faculty QA','',
  'Exactly **875 original MCQ research questions** have unchanged question and source-file SHA256. Their original keyed option positions are A='+x.aggregateOriginalCorrectOptionPositions.A+
  ', B='+x.aggregateOriginalCorrectOptionPositions.B+', C='+x.aggregateOriginalCorrectOptionPositions.C+
  ', D='+x.aggregateOriginalCorrectOptionPositions.D+', 24 original legacy unset.',
  'The A-position skew is an **editorial risk to test design**, NOT a proof that the keys or answers are wrong; no question is rebalanced without independent teacher approval.',
  '',
  '**18 English/Urdu parallel MCQs** require independent subject and Urdu semantic equivalence checks. Exactly 16 have intentionally empty Hindi legacy placeholders; 2 have additional nonempty Hindi fields outside the English/Urdu school-medium publication contract. Do not leak empty placeholders into Urdu/English exam print.',
  'Existing valid structured four-option authoring mechanically has 0 mismatched normalized selected-option answer texts and 0 duplicate/malformed options. This does NOT validate scientific fact, option distractor logic, Urdu translation meaning or approved answer correctness.',
  '',
  'The 24 legacy English unlabeled text-only MCQs remain frozen, requiring manual canonical option and answer review, not automatic guessing or publication.',
  'Full source-locked, metadata-only per-original-ID report: ASSPS_GRADE910_875_MCQ_LANGUAGE_KEY_INTEGRITY_REVIEW_20261012.json.',
  '','Human academic approvals 0, verified published 0, Paper Studio verified selectable 0.'].join('\n')
}
function write(){
 const x=build()
 fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n')
 fs.writeFileSync(MD,markdown(x))
 return{originals:875,needsUrduReview:18,emptyHindiPlaceholders:16,
  legacyUnsetKey:24,approved:0}
}
if(require.main===module)console.log(JSON.stringify(process.argv.includes('--write')?write():build()))
module.exports={examine,build,markdown,write,OUT,MD}

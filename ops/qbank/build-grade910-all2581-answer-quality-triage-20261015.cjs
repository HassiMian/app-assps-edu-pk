#!/usr/bin/env node
'use strict'
// Evidence-bound editorial triage, NOT science truth, school review or approval.
// Does not reproduce original answer text, option text, question stems, or staff data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..'),SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const DOC=path.join(ROOT,'docs/question-bank'),sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const error=x=>{throw Error('GRADE910_FULL_CORPUS_QUALITY_'+x)}
const crosswalkPath=path.join(DOC,'ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json')
const target=path.join(DOC,'ASSPS_GRADE910_2581_SOURCE_SHA_ACADEMIC_QUALITY_RISK_TRIAGE_20261015.json')
const summary=path.join(DOC,'ASSPS_GRADE910_2581_SOURCE_SHA_ACADEMIC_QUALITY_RISK_TRIAGE_20261015.md')
const mcq=require('./audit-mcq-authoring-structure.cjs')
const model=require('./audit-grade910-model-answer-readiness.cjs')
const similarity=require('./audit-scientific-stem-similarity.cjs')
const rubricSignal='RUBRIC_LIKE_LONG_ANSWER_NOT_COMPLETE_MODEL_ANSWER'
const keySignal='ORIGINAL_KEY_A_OVERCONCENTRATION_EDIT_REVIEW_NOT_CORRECTNESS'
function collect(){
 return fs.readdirSync(SOURCE).filter(f=>f.endsWith('.json')).sort().map(filename=>{
  const bytes=fs.readFileSync(path.join(SOURCE,filename))
  return{filename,file:filename,bytes,data:JSON.parse(bytes)}
 })
}
function audit(){
 const originalBytes=fs.readFileSync(crosswalkPath),base=JSON.parse(originalBytes)
 const docs=collect(),index=new Map(base.rows.map(r=>[r.questionId,r]))
 if(index.size!==2581||base.metrics.originalQuestions!==2581)error('UNIVERSE_NOT_FROZEN')
 const m=model.audit(docs),q=mcq.auditMcqs(docs),n=similarity.audit(docs)
 if(m.totals.originalAuthoredCandidates!==2581||q.totalMcqs!==875||
    n.originalQuestionCount!==2581||m.totals.rubricOnlyLongAnswers!==166)
  error('UNVERIFIED_HISTORIC_SOURCE_TOTALS')
 const patterned=new Set(),patternedFiles=new Set()
 for(const f of q.filesWithPatterns){
  if(!f.file)error('PATTERN_SOURCE_FILE_UNRESOLVED')
  const source=docs.find(d=>d.filename===f.file)
  if(!source)error('PATTERN_FILE_NOT_FOUND')
  const items=(source.data.drafts||source.data.items||[]).filter(q=>q?.id&&q.type==='mcq')
  for(const pattern of f.editorialKeyPatterns){
   if(pattern.startIndex<0||pattern.length<8||pattern.startIndex+pattern.length>items.length)
    error('UNVERIFIED_LOCAL_MCQ_PATTERN_RANGE')
   if(items[pattern.startIndex].id!==pattern.firstQuestionId||
     items[pattern.startIndex+pattern.length-1].id!==pattern.lastQuestionId)
    error('LOCAL_MCQ_PATTERN_REORDERED')
   for(const item of items.slice(pattern.startIndex,pattern.startIndex+pattern.length))patterned.add(item.id)
  }
  patternedFiles.add(f.file)
 }
 const rubric=new Map(m.reviewCandidates.map(row=>[row.questionId,row]))
 const pairIds=new Set(n.flaggedQuestionIds),pairCount=new Map()
 for(const p of n.pairs){
  for(const id of [p.questionA,p.questionB])pairCount.set(id,(pairCount.get(id)||0)+1)
 }
 const raw=new Map(),sourceSet=new Map(),sourceFiles=new Set()
 for(const f of docs){
  const rows=f.data.drafts||f.data.items||[]
  if(!rows.some(r=>r&&index.has(r.id)))continue
  const fileSha=sha(f.bytes)
  sourceSet.set(f.filename,fileSha);sourceFiles.add(f.filename)
  for(const item of rows){
   if(!item?.id||!index.has(item.id))continue
   const expected=index.get(item.id)
   if(raw.has(item.id)||expected.originalResearchFileSha256!==fileSha||
      expected.originalRevisionSha256!==sha(JSON.stringify(item))||
      expected.sourceFile!==f.filename)
    error('SOURCE_REVIEW_SHA_DIVERGENCE_'+item.id)
   raw.set(item.id,item)
  }
 }
 if(raw.size!==2581||sourceFiles.size!==73||rubric.size!==166||
    n.pairs.length!==12||pairIds.size!==15)
  error('ORIGINALS_OR_RISK_COUNT_UNEXPECTED')
 const structural=new Map(),perFileSourceMcq=new Map(),docket=[]
 let mcqA=0,mcqCount=0,mcqLetterB=0,mcqLetterC=0,mcqLetterD=0
 for(const source of base.rows){
  const qrow=raw.get(source.questionId)
  if(!qrow)error('ORIGINAL_NOT_FOUND_'+source.questionId)
  const flags=[]
  const isMcq=qrow.type==='mcq'
  let position=null,legacyInferred=false
  if(isMcq){
   mcqCount++
   const s=mcq.assessRecord(qrow)
   position=s.key
   legacyInferred=s.inferredFromAnswer
   if(position==='A'){mcqA++;flags.push(keySignal)}
   if(position==='B')mcqLetterB++
   if(position==='C')mcqLetterC++
   if(position==='D')mcqLetterD++
   if(s.inferredFromAnswer)flags.push('MCQ_SOURCE_ANSWER_TEXT_KEY_POSITION_ONLY_INFERRED')
   for(const code of s.flags){
    flags.push('MCQ_'+code)
    structural.set(code,(structural.get(code)||0)+1)
   }
   const set=perFileSourceMcq.get(source.sourceFile)||{count:0,correctA:0}
   set.count++;if(position==='A')set.correctA++
   perFileSourceMcq.set(source.sourceFile,set)
  }
  const flaggedRubric=rubric.get(source.questionId)
  if(flaggedRubric){
   if(flaggedRubric.questionRevisionCandidateSha256!==source.originalRevisionSha256||
      flaggedRubric.sourceFileSha256!==source.originalResearchFileSha256)
    error('RUBRIC_SIGNAL_SHA_MISMATCH_'+source.questionId)
   flags.push(rubricSignal)
  }
  if(patterned.has(source.questionId))flags.push('SOURCE_CONSECUTIVE_MCQ_KEY_REPEAT_IN_FILE')
  if(pairIds.has(source.questionId))flags.push('POTENTIAL_NEAR_STEM_REUSE_INDEPENDENT_DUPLICATE_REVIEW')
  if(source.proposedRevisionSha256){
   flags.push('REVISED_MCQ_AI_DISTRACTORS_AWAIT_FACTUAL_REVIEW')
   if(source.absoluteCueDistractorCount>0)flags.push('MCQ_NEW_DISTRACTOR_ABSOLUTE_WORD_CUE')
  }
  if(source.questionId==='X-CHEM-C23-L01')flags.push('FACULTY_HELD_INCOMPLETE_SUBSTANTIVE_ANSWER')
  const set=new Set(flags)
  if(flags.length!==set.size)error('DUPLICATED_RISK_CODE')
  const severity={
   FACULTY_HELD_INCOMPLETE_SUBSTANTIVE_ANSWER:500,
   MCQ_NEW_DISTRACTOR_ABSOLUTE_WORD_CUE:190,
   RUBRIC_LIKE_LONG_ANSWER_NOT_COMPLETE_MODEL_ANSWER:180,
   POTENTIAL_NEAR_STEM_REUSE_INDEPENDENT_DUPLICATE_REVIEW:160,
   SOURCE_CONSECUTIVE_MCQ_KEY_REPEAT_IN_FILE:80,
   ORIGINAL_KEY_A_OVERCONCENTRATION_EDIT_REVIEW_NOT_CORRECTNESS:40
  }
  const priority=flags.reduce((p,v)=>p+(severity[v]??100),0)
  docket.push({
   questionId:source.questionId,sourceFile:source.sourceFile,
   originalResearchFileSha256:source.originalResearchFileSha256,
   originalRevisionSha256:source.originalRevisionSha256,
   reviewGrade:source.provisionalReviewGrade,
   reviewSubject:source.provisionalReviewSubject,
   reviewMedium:source.provisionalReviewMedium,
   reviewGroupKey:source.groupKey,
   originalQuestionType:source.questionType,
   hasRelatedEditorialEvidence:Boolean(source.evidenceFileSha256),
   editorialEvidenceSourceSha256:source.evidenceFileSha256,
   sourceCandidateMcqKeyPosition:isMcq?position:null,
   sourceMcqKeyPositionOnlyTextInferred:legacyInferred,
   modelAnswerCompletenessAssessment:isMcq?'NOT_LONG_ANSWER':flaggedRubric?'RUBRIC_HEURISTIC_FLAG':'NOT_INDEPENDENTLY_CHECKED',
   potentialNearStemSimilarities:pairCount.get(source.questionId)||0,
   proposedDistractorRevisionSha256:source.proposedRevisionSha256,
   proposedDistractorAbsoluteWordCueCount:source.absoluteCueDistractorCount,
   flags,editorialPriorityScore:priority,
   qualifiedAnswerAccuracyReviewerVerified:false,
   verifiedAdoptedTextbookEdition:false,
   authenticatedSchoolAcademicApproval:false,
   academicallyApproved:false,paperStudioSelectable:false,published:false
  })
 }
 const grouped=new Map()
 for(const r of docket){
  const group=grouped.get(r.reviewGroupKey)||{
   reviewGroupKey:r.reviewGroupKey,grade:r.reviewGrade,subject:r.reviewSubject,medium:r.reviewMedium,
   questions:0,mcqs:0,originalKeyA:0,rubricHeuristicLongAnswers:0,
   nearSimilarityCandidates:0,curatedDrafts:0,urgentFacultyHeld:0}
  group.questions++
  if(r.originalQuestionType==='mcq')group.mcqs++
  if(r.sourceCandidateMcqKeyPosition==='A')group.originalKeyA++
  if(r.flags.includes(rubricSignal))group.rubricHeuristicLongAnswers++
  if(r.potentialNearStemSimilarities)group.nearSimilarityCandidates++
  if(r.proposedDistractorRevisionSha256)group.curatedDrafts++
  if(r.flags.includes('FACULTY_HELD_INCOMPLETE_SUBSTANTIVE_ANSWER'))group.urgentFacultyHeld++
  grouped.set(r.reviewGroupKey,group)
 }
 const metrics={
  allOriginalSourceQuestions:2581,originalSourceFiles:73,
  flaggedReviewEvidenceCandidates:base.metrics.flaggedCandidates,
  originalMcqCandidates:mcqCount,
  recordedSourceMcqKeys:{A:mcqA,B:mcqLetterB,C:mcqLetterC,D:mcqLetterD},
  sourceMcqAKeyRatioPercent:Math.round(mcqA/mcqCount*10000)/100,
  mcqStructuralFlags:[...structural].map(([reason,count])=>({reason,count})).sort((a,b)=>a.reason.localeCompare(b.reason)),
  mcqEditorPatternFlags:q.flagCount,
  mcqOriginalsInsidePredictableRuns:patterned.size,
  mcqEditorPatternFileCount:q.predictablePatternFileCount,
  originalMcqKeysInferredFromAnswerText:q.exactTextDerivedLegacyKeys,
  originalLongAnswers:m.totals.longQuestions,
  rubricInstructionLikeLongAnswers:rubric.size,
  possibleSourceNearStemPairs:n.pairs.length,
  distinctNearStemQuestions:pairIds.size,
  revisedMcqDrafts:docket.filter(r=>r.proposedDistractorRevisionSha256).length,
  revisedDraftsWithExclusiveWordCues:docket.filter(r=>r.proposedDistractorAbsoluteWordCueCount>0).length,
  heldIncompleteAnswerQuestions:1,gradeSubjectMediumGroups:grouped.size,
  originalQuestionsChanged:0,qualifiedTeacherReviewed:0,academicallyApproved:0,published:0
 }
 if(metrics.recordedSourceMcqKeys.A!==785||metrics.recordedSourceMcqKeys.B!==50||
    metrics.recordedSourceMcqKeys.C!==33||metrics.recordedSourceMcqKeys.D!==7||
    metrics.originalMcqKeysInferredFromAnswerText!==24||
    metrics.originalLongAnswers!==564||metrics.revisedMcqDrafts!==66||
    metrics.gradeSubjectMediumGroups!==56)
  error('KEY_OR_CORPUS_METRICS_DRIFT')
 for(const group of grouped.values()){
  group.sourceKeyRepeatCandidates=docket.filter(r=>r.reviewGroupKey===group.reviewGroupKey&&r.flags.includes('SOURCE_CONSECUTIVE_MCQ_KEY_REPEAT_IN_FILE')).length
  group.topPriorityOriginalIds=docket.filter(r=>r.reviewGroupKey===group.reviewGroupKey).sort((a,b)=>b.editorialPriorityScore-a.editorialPriorityScore||a.questionId.localeCompare(b.questionId)).slice(0,5).map(r=>r.questionId)
 }
 const setHashes=Object.fromEntries([...sourceSet].sort(([a],[b])=>a.localeCompare(b)))
 docket.sort((a,b)=>b.editorialPriorityScore-a.editorialPriorityScore||a.questionId.localeCompare(b.questionId))
 return{
  schema:'assps-grade910-all2581-answer-quality-and-paper-studio-risk-triage-v1',
  sourceCrosswalkSha256:sha(originalBytes),sourceFileHashesSha256:sha(JSON.stringify(setHashes)),
  rule:'HEURISTICS_AND_SOURCE_KEY_COUNTS_ONLY_NOT_ACADEMIC_VERIFICATION',
  metrics,sourceFileHashes:setHashes,
  nearStemPairs:n.pairs.map(p=>({
   idA:p.questionA,idB:p.questionB,
   sourceRevisionA:index.get(p.questionA)?.originalRevisionSha256,
   sourceRevisionB:index.get(p.questionB)?.originalRevisionSha256,
   metric:p.similarity,kind:p.reason,academicallyConfirmedDuplicate:false
  })),
  originalMcqKeyBiasByFile:[...perFileSourceMcq].map(([file,v])=>({file,...v})).sort((a,b)=>a.file.localeCompare(b.file)),
  gradeSubjectMediumGroups:[...grouped.values()].sort((a,b)=>a.reviewGroupKey.localeCompare(b.reviewGroupKey)),
  sourceQuestions:docket
 }
}
function validateOutput(x){
 if(x?.schema!=='assps-grade910-all2581-answer-quality-and-paper-studio-risk-triage-v1'||
    x.sourceQuestions?.length!==2581||x.gradeSubjectMediumGroups?.length!==56||
    x.metrics?.academicallyApproved!==0||x.metrics?.published!==0||
    x.metrics?.originalQuestionsChanged!==0)
  error('QUALITY_DOCKET_NOT_FROZEN_OR_CLAIMS_FALSE_APPROVAL')
 const seen=new Set()
 for(const row of x.sourceQuestions){
  if(seen.has(row.questionId))error('DUPLICATE_SOURCE_QUESTION_ID')
  seen.add(row.questionId)
  if(!/^[a-f0-9]{64}$/.test(row.originalRevisionSha256||'')||
     !/^[a-f0-9]{64}$/.test(row.originalResearchFileSha256||''))
   error('QUALITY_SOURCE_REVISION_SHA_INVALID')
  if(row.academicallyApproved!==false||row.published!==false||
     row.paperStudioSelectable!==false||row.qualifiedAnswerAccuracyReviewerVerified!==false||
     row.verifiedAdoptedTextbookEdition!==false||
     row.authenticatedSchoolAcademicApproval!==false)
   error('UNAUTHENTICATED_REVIEW_OR_PUBLICATION_GRANTED')
  for(const name of ['stem','questionText','options','answer','answerKey',
   'correctAnswer','studentName','reviewerName','signatureImage'])
   if(Object.hasOwn(row,name))error('REVIEW_DOCKET_LEAKS_QUESTION_ANSWER_OR_IDENTITY')
 }
 if(x.nearStemPairs?.some(q=>q.academicallyConfirmedDuplicate!==false))
  error('POTENTIAL_DUPLICATE_FALSELY_CONFIRMED')
 return true
}
function write(){
 const d=audit();validateOutput(d)
 fs.writeFileSync(target,JSON.stringify(d,null,2)+'\n')
 const v=d.metrics
 fs.writeFileSync(summary,[
 '# ASSPS IX-X — 2,581 original questions: academic answer quality triage',
 '',
 '**Research candidate integrity only.** Existing official school adoption, human academic review, authentic signatures and verified publication are **not** certified by this audit.',
 '',
 '| Frozen QA item | Source-derived measurement |','|---|---:|',
 '| Unique original candidate IDs | '+v.allOriginalSourceQuestions+' |',
 '| Original research files | '+v.originalSourceFiles+' |',
 '| MCQ originals | '+v.originalMcqCandidates+' |',
 '| Recorded source keys A, B, C, D | '+Object.values(v.recordedSourceMcqKeys).join(', ')+' |',
 '| Share of source MCQ references recorded at A | '+v.sourceMcqAKeyRatioPercent+'% |',
 '| Legacy source keys positionally inferred from unique textual option matches | '+v.originalMcqKeysInferredFromAnswerText+' |',
 '| MCQ candidates inside locally repeated key-position runs | '+v.mcqOriginalsInsidePredictableRuns+' |',
 '| Long-answer originals | '+v.originalLongAnswers+' |',
 '| Long answers with English rubric/instruction-like answer fields | '+v.rubricInstructionLikeLongAnswers+' |',
 '| Potential near-stem pairs (not confirmed duplicates) | '+v.possibleSourceNearStemPairs+' |',
 '| Distinct questions in those pairs | '+v.distinctNearStemQuestions+' |',
 '| Previously revised MCQ AI editorial proposals | '+v.revisedMcqDrafts+' |',
 '| MCQ proposals with lingering absolute/exclusive wording cues | '+v.revisedDraftsWithExclusiveWordCues+' |',
 '| Single held Chemistry answer not teacher-authored | '+v.heldIncompleteAnswerQuestions+' |',
 '| Grade/subject/medium review groups | '+v.gradeSubjectMediumGroups+' |',
 '| Original questions rewritten / real academic approved / published | 0 / 0 / 0 |',
 '',
 'The A-key concentration reflects how the **original unapproved candidate options were authored**, NOT probability that the answers are factually right. Never auto-correct by merely permuting options. All option changes require new versioned question SHA and an independent qualified answer/distractor review. 66 prior editorial proposals remain separate AI drafts and must never silently replace source records.',
 '',
 'The 166 rubric detection covers only a specific English instruction-looking opening; 398 other long answers were NOT declared complete or correct. The 12 near-stem pairs remain candidate duplicate alerts until independently compared in academic context.',
 '',
 'The source SHA bound per-question JSON roster contains only identifier, field claims, key-position label, flags, provenance hashes and risk severity—no copyrighted question texts or answers, no actual teacher identities, no student marks.',
 '',
 '## All 56 reviewer worklists, ordered by original subject and medium','',
 '| Grade/subject/medium | Candidates | MCQ A references | Repeated key runs | Rubric-like long answers | Curated MCQ drafts | Top risk candidate IDs |',
 '|---|---:|---:|---:|---:|---:|---|',
 ...d.gradeSubjectMediumGroups.map(g=>
  '| '+g.reviewGroupKey+' | '+g.questions+' | '+g.originalKeyA+' | '+g.sourceKeyRepeatCandidates+' | '+g.rubricHeuristicLongAnswers+' | '+g.curatedDrafts+' | '+g.topPriorityOriginalIds.join(', ')+' |'),

 '',
 '**Publication HOLD:** Actual ASSPS textbook adoption and applicable board scheme, review of the exact source revision, qualified independent subject/Urdu signoffs and Principal authentication, Paper Studio live import/Reopen/Print and SaaS Core release certification remain necessary.'
 ].join('\n')+'\n')
 return{...v,digest:sha(fs.readFileSync(target))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={audit,write,validateOutput,target,summary}

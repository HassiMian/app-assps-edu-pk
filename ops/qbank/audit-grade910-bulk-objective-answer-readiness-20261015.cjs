#!/usr/bin/env node
'use strict'
// Exhaustive deterministic structure/revision check. NOT a scientific truth
// classifier. No changes to original sources, answer keys or live question bank.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const verify=require('./attest-grade910-all-original-candidate-revisions.cjs')
const ROOT=path.resolve(__dirname,'../..')
const DIR=path.join(ROOT,'docs/question-bank')
const CROSS=path.join(DIR,'ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json')
const RISK=path.join(DIR,'ASSPS_GRADE910_2581_SOURCE_SHA_ACADEMIC_QUALITY_RISK_TRIAGE_20261015.json')
const OUTPUT=path.join(DIR,'ASSPS_GRADE910_2581_BULK_OBJECTIVE_ANSWER_SCREENING_20261015.json')
const SHA=v=>crypto.createHash('sha256').update(v).digest('hex')
const bad=x=>{throw Error('GRADE910_BULK_OBJECTIVE_'+x)}
const norm=x=>String(x??'').normalize('NFKC').trim().toLocaleLowerCase('en').replace(/[.?!؟۔،]+$/g,'').trim()
const truthy=x=>typeof x==='string'&&x.trim().length>0
function optionFacts(question){
 const langEntries=Object.entries(question.content||{}).filter(([code,x])=>['en','ur'].includes(code)&&x&&typeof x==='object')
 if(!langEntries.length)langEntries.push(['flat',question])
 const checks=[],flags=new Set(),seenLanguage=new Set()
 for(const [language,x] of langEntries){
  if(seenLanguage.has(language))bad('DUPLICATE_MCQ_MEDIUM')
  seenLanguage.add(language)
  const options=x.options
  if(!Array.isArray(options)||options.length!==4){flags.add('DEFINITE_FOUR_OPTIONS_STRUCTURE_FAILURE');checks.push({language,outcome:'FAILED_OPTION_COUNT'});continue}
  const texts=options.map(o=>typeof o==='object'?o?.text:o)
  const labels=options.map((o,i)=>typeof o==='object'?o?.id:'ABCD'[i])
  const answer=norm(x.answer)
  if(texts.some(t=>!truthy(t)))flags.add('DEFINITE_EMPTY_OPTION')
  if(labels.join('')!=='ABCD')flags.add('DEFINITE_INVALID_OPTION_LABELS')
  if(new Set(texts.map(norm)).size!==4)flags.add('DEFINITE_DUPLICATE_OPTION_TEXT')
  if(!answer){flags.add('DEFINITE_EMPTY_STORED_ANSWER');checks.push({language,outcome:'MISSING_STORED_ANSWER'});continue}
  const positions=texts.map((t,i)=>norm(t)===answer?i:-1).filter(i=>i>=0)
  if(positions.length!==1)flags.add(positions.length===0?
    'DEFINITE_ANSWER_NOT_AN_OPTION':'DEFINITE_AMBIGUOUS_ANSWER_OPTION_MATCH')
  const key=typeof question.correctOptionId==='string'?question.correctOptionId.toUpperCase():null
  if(key&&positions.length===1&&labels[positions[0]]!==key)
   flags.add('DEFINITE_ANSWER_VS_CANONICAL_KEY_CONFLICT')
  const valid=positions.length===1&&texts.every(truthy)&&labels.join('')==='ABCD'&&
   new Set(texts.map(norm)).size===4&&(!key||labels[positions[0]]===key)
  checks.push({language,optionCount:options.length,uniqueTextualAnswerPositionMatches:positions.length,
    originalCanonicalOptionIdPresent:!!key,mechanicalOptionConsistency:valid})
 }
 const hi=question.content?.hi
 if(hi&&Array.isArray(hi.options)&&hi.options.every(x=>!norm(typeof x==='object'?x?.text:x))&&
    !norm(hi.stem)&&!norm(hi.answer))flags.add('EMPTY_HINDI_PLACEHOLDER_NOT_TO_RENDER')
 return{checks,flags:[...flags].sort()}
}
function audit(){
 const original=verify.loadInputs(),freeze=verify.assertFrozen(original)
 const sealedFiles=new Map(freeze.files.map(f=>[f.originalAuthoredFile,f]))
 const baseBytes=fs.readFileSync(CROSS),base=JSON.parse(baseBytes)
 const riskBytes=fs.readFileSync(RISK),risk=JSON.parse(riskBytes)
 const lookup=new Map(base.rows.map(q=>[q.questionId,q]))
 const riskMap=new Map(risk.sourceQuestions.map(q=>[q.questionId,q]))
 if(freeze.originalAuthoredQuestionCandidates!==2581||freeze.files.length!==73||
   lookup.size!==2581||riskMap.size!==2581||risk.metrics.originalMcqCandidates!==875)
  bad('FROZEN_AUDIT_BASELINE_CHANGED')
 const observed=new Set(),rows=[],counts={types:{},mechanicalMcqByLanguage:{},
  definiteOptionContradictions:0,placeholderHi:0,missingPrintedPageClaim:0,
  originalSourceQuestionRevisionMatches:0,longRubricHeuristic:0,
  nearStemSuspects:0,originalMcqTextualKeyInferred:0,mcqStructurallyConsistent:0,
  mcqMechanicallyIncomplete:0,sourceReviewed:0,answerScientificallyVerified:0,
  originalSchoolAdoptionVerified:0,teacherApproved:0,paperSelectable:0}
 for(const d of original.documents){
  const f=sealedFiles.get(d.file)
  if(!f)continue
  const byId=new Map(f.originalQuestionRevisions.map(v=>[v.originalQuestionId,v]))
  const buf=fs.readFileSync(path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging',d.file))
  if(SHA(buf)!==f.originalFileSha256)bad('SOURCE_FILE_BYTES_CHANGED')
  for(const q of d.data.drafts||d.data.items||[]){
   if(!byId.has(q.id)||observed.has(q.id))bad('INVENTORY_OR_DUPLICATE_ID')
   const revision=SHA(JSON.stringify(q)),cross=lookup.get(q.id),riskRow=riskMap.get(q.id)
   if(revision!==byId.get(q.id).originalQuestionRevisionSha256||
      cross?.originalRevisionSha256!==revision||
      riskRow?.originalRevisionSha256!==revision||
      cross.originalResearchFileSha256!==f.originalFileSha256||
      riskRow.originalResearchFileSha256!==f.originalFileSha256)
    bad('ORIGINAL_SOURCE_REVISION_OR_RISK_CROSSWALK_DRIFT')
   observed.add(q.id);counts.originalSourceQuestionRevisionMatches++
   const flags=[]
   if(q.source?.page==null||!Number.isSafeInteger(q.source.page)||q.source.page<=0){
    flags.push('UNVERIFIED_PRINTED_PAGE_CLAIM');counts.missingPrintedPageClaim++
   }
   if(!truthy(q.topicId))flags.push('MISSING_OR_UNSPECIFIC_TOPIC_ID')
   if(!Number.isInteger(q.marks)||q.marks<=0)flags.push('DEFINITE_INVALID_MARKS')
   const present=Object.entries(q.content||{}).filter(([c,x])=>['en','ur'].includes(c)&&x&&typeof x==='object')
   if(!present.length)present.push(['flat',q])
   if(present.some(([c,x])=>!truthy(x.stem)))flags.push('DEFINITE_EMPTY_STEM')
   if(present.some(([c,x])=>!truthy(x.answer)))flags.push('DEFINITE_EMPTY_ANSWER')
   if(q.type==='mcq'){
    const info=optionFacts(q)
    flags.push(...info.flags)
    const defective=info.flags.some(f=>f.startsWith('DEFINITE_'))
    if(defective)counts.mcqMechanicallyIncomplete++
    else counts.mcqStructurallyConsistent++
    for(const c of info.checks){
     const v=counts.mechanicalMcqByLanguage[c.language]||{checked:0,consistent:0}
     v.checked++;if(c.mechanicalOptionConsistency)v.consistent++
     counts.mechanicalMcqByLanguage[c.language]=v
    }
    if(info.flags.includes('EMPTY_HINDI_PLACEHOLDER_NOT_TO_RENDER'))counts.placeholderHi++
    if(defective)counts.definiteOptionContradictions++
   }
   const legacyFlags=riskRow.flags||[]
   if(legacyFlags.includes('RUBRIC_LIKE_LONG_ANSWER_NOT_COMPLETE_MODEL_ANSWER'))
    counts.longRubricHeuristic++
   if(legacyFlags.includes('POSSIBLE_NEAR_DUPLICATE_STEM')||riskRow.potentialNearStemSimilarities>0)
    counts.nearStemSuspects++
   if(riskRow.sourceMcqKeyPositionOnlyTextInferred)counts.originalMcqTextualKeyInferred++
   counts.types[q.type]=(counts.types[q.type]||0)+1
   rows.push({
    originalQuestionId:q.id,originalQuestionRevisionSha256:revision,
    originalSourceFileSha256:f.originalFileSha256,sourceFile:d.file,
    grade:cross.provisionalReviewGrade,subject:cross.provisionalReviewSubject,
    medium:cross.provisionalReviewMedium,groupKey:cross.groupKey,
    questionType:q.type,marks:q.marks,
    machineOnlyChecksPerformed:true,
    mechanicallyProvenDefects:flags.filter(x=>x.startsWith('DEFINITE_')),
    unresolvedEvidenceAndEditorialFlags:[...new Set([
      ...flags.filter(x=>!x.startsWith('DEFINITE_')),...legacyFlags])].sort(),
    priorPrincipalOrTeacherFeedbackCanGrantApproval:false,
    independentlyAuthenticatedSubjectAccuracyReview:false,
    authenticatedPrintedPageAndBookAdoption:false,
    academicallyApproved:false,paperStudioSelectable:false,published:false
   })
  }
 }
 if(observed.size!==2581||counts.originalSourceQuestionRevisionMatches!==2581||
    counts.types.mcq!==875||counts.types.long!==564||
    rows.length!==2581||rows.filter(x=>x.originalQuestionId==='X-CHEM-C23-L01').length!==1||
    counts.longRubricHeuristic!==166||
    counts.mcqMechanicallyIncomplete!==0)
   bad('UNEXPECTED_SOURCE_OR_MCQ_ANSWER_COHORT')
 const groups=Object.values(Object.groupBy(rows,r=>r.groupKey)).map(items=>({
  groupKey:items[0].groupKey,grade:items[0].grade,subject:items[0].subject,medium:items[0].medium,
  originalCandidates:items.length,
  knownMachineDefectCount:items.filter(x=>x.mechanicallyProvenDefects.length>0).length,
  pendingPrintedPageEvidence:items.filter(x=>x.unresolvedEvidenceAndEditorialFlags.includes('UNVERIFIED_PRINTED_PAGE_CLAIM')).length,
  rubricLikeLongAnswerRisk:items.filter(x=>x.unresolvedEvidenceAndEditorialFlags.includes('RUBRIC_LIKE_LONG_ANSWER_NOT_COMPLETE_MODEL_ANSWER')).length,
  fullyIndependentlyReviewed:0,academicallyApproved:0
 })).sort((a,b)=>a.groupKey.localeCompare(b.groupKey))
 if(groups.length!==56)bad('FROZEN_REVIEW_GROUPS_CHANGED')
 return{schema:'assps-grade910-full-original-2581-objective-answer-consistency-audit-v1',
  scope:'SOURCE_REVISION_BOUND_DETERMINISTIC_STRUCTURE_ONLY',
  originalResearchQuestions:2581,sourceFiles:73,mcqQuestions:875,
  originalSourceCrosswalkSha256:SHA(baseBytes),priorRiskDocketSha256:SHA(riskBytes),
  QA:counts,groups,rows,independentScientificCorrectnessConfirmed:0,
  schoolAdoptionAuthenticated:0,verified2027BoardApplicability:0,
  principalAuthenticatedSchoolApproval:0,academicallyApproved:0,published:0,
  productionWrites:0,
  clinicalTruthClaim:false,
  note:'MCQ source option and stored answer structural consistency does NOT validate biological/scientific truth; heuristic flags are not established errors. Every item requires qualified independent human review before approval.',
  releaseDecision:'HOLD_PENDING_REAL_2026_27_BOOK_ADOPTION_EXAM_2027_AND_INDEPENDENT_TEACHER_SIGNOFF'}
}
function write(){
 const d=audit()
 fs.writeFileSync(OUTPUT,JSON.stringify(d,null,2)+'\n',{flag:'wx'})
 return{candidates:d.originalResearchQuestions,mcqs:d.mcqQuestions,counts:d.QA,
    reviewGroups:d.groups.length,academicallyApproved:0,published:0}
}
if(require.main===module){try{const result=process.argv.includes('--write')?write():audit(); console.log(JSON.stringify(result))}catch(e){console.error(e.message);process.exitCode=2}}
module.exports={audit,write,optionFacts,OUTPUT}

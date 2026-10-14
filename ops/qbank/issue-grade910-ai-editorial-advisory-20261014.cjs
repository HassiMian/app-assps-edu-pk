#!/usr/bin/env node
'use strict'
// Deterministic pre-review triage. NO fabricated qualified teacher, NO AI academic approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const SRC=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_ALL_2581_CONTENT_ANSWER_EDITORIAL_REVIEW_20261011.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_AI_ADVISORY_CORRECTION_DOCKET_20261014.json')
const MD=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_AI_ADVISORY_CORRECTION_DOCKET_20261014.md')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const severity={
 MCQ_KEY_ID_NOT_EXPLICIT:'P1',MCQ_OPTIONS_NOT_CANONICALLY_LABELED:'P1',
 LONG_REFERENCE_EXTREMELY_BRIEF:'P1',NUMERICAL_WORKING_REVIEW:'P1',
 ESSAY_REFERENCE_BRIEF:'P2',LONG_REFERENCE_BRIEF_RUBRIC_REVIEW:'P2',
 MCQ_OPTION_LENGTH_CUE_REVIEW:'P2'
}
const proposed={
 MCQ_KEY_ID_NOT_EXPLICIT:'Normalize A-D key identity; verify answer against all four authentic options before changing the revision.',
 MCQ_OPTIONS_NOT_CANONICALLY_LABELED:'Restore the four explicit option labels in a new draft, then verify option text and unique key.',
 LONG_REFERENCE_EXTREMELY_BRIEF:'Develop a complete concept/model-answer draft and source-check every explanation and formula.',
 NUMERICAL_WORKING_REVIEW:'Independently recompute with formula, substitutions, unit consistency, significant figures and final answer.',
 ESSAY_REFERENCE_BRIEF:'Create a fuller marking rubric with topic-appropriate criteria, preserving the original evidence.',
 LONG_REFERENCE_BRIEF_RUBRIC_REVIEW:'Expand and fact-check the model answer against the actual adopted edition and chapter.',
 MCQ_OPTION_LENGTH_CUE_REVIEW:'Review distractor plausibility and unintended clueing, preserving one demonstrably correct option.'
}
function build(input=fs.readFileSync(SRC)){
 const r=JSON.parse(input.toString())
 if(!Array.isArray(r.rows)||r.rows.length!==2581||r.originalCandidates!==2581)throw Error('CANDIDATE_CORPUS_SIZE_DRIFT')
 const ids=new Set(),rows=[]
 for(const q of r.rows){
  if(!q.originalId||ids.has(q.originalId)||!/^[0-9a-f]{64}$/.test(q.revisionSha256))
   throw Error('CANDIDATE_REVISION_DUPLICATE_OR_HASH_MISSING')
  ids.add(q.originalId)
  if(q.academicApproved||q.published||q.actualIndependentFacultyAnswerVerified)
   throw Error('RESEARCH_CANDIDATE_MUST_NOT_CLAIM_HUMAN_APPROVAL')
  const flags=q.objectiveEditorialFlags||[]
  if(!Array.isArray(flags)||flags.some(f=>!severity[f]))throw Error('UNRECOGNIZED_EDITORIAL_FLAG')
  if(!flags.length)continue
  const codes=flags.slice().sort()
  rows.push({
   originalId:q.originalId,originalRevisionSha256:q.revisionSha256,
   catalogRecordId:q.originalCatalogId,claimedSourcePdfSha256:q.originalSourcePdfSha256Claim,
   sourceFileSha256:q.sourceFileSha256,grade:q.gradeClaim,subject:q.subjectClaim,
   medium:q.mediumClaim,chapterClaim:q.chapterClaim,type:q.questionType,
   reviewPriority:codes.some(f=>severity[f]==='P1')?'P1':'P2',
   signals:codes,correctionProposals:codes.map(f=>proposed[f]),
   pipelineState:'AI_ASSISTED_EDITORIAL_ADVISORY_NOT_VERIFIED',
   questionCorrectnessVerified:false,answerCorrectnessVerified:false,
   realQualifiedFacultyReviewed:false,principalApproved:false,paperStudioSelectable:false
  })
 }
 rows.sort((a,b)=>a.reviewPriority.localeCompare(b.reviewPriority)||
  Number(a.grade||0)-Number(b.grade||0)||String(a.subject||"UNASSIGNED").localeCompare(String(b.subject||"UNASSIGNED"))||a.originalId.localeCompare(b.originalId))
 const priorityCounts={P1:0,P2:0},subjects={}
 for(const row of rows){priorityCounts[row.reviewPriority]++
  const k=row.grade+':'+row.subject
  subjects[k]=(subjects[k]||0)+1
 }
 if(rows.length!==r.flaggedQuestionIds)throw Error('EDITORIAL_LEDGER_FLAG_TOTAL_DRIFT')
 const output={
  schemaVersion:'assps-grade910-provisional-editorial-advisory-20261014-v1',
  issuingActor:'AUTOMATED_EDITORIAL_PRECHECK_NOT_A_QUALIFIED_HUMAN',
  schoolAcademicSession:'2026-27',intendedAnnualBoardYear:2027,
  inputLedgerSha256:sha(input),originalResearchCandidates:r.rows.length,
  flaggedForCorrectionDraft:rows.length,unflaggedButStillUnverified:r.rows.length-rows.length,
  sourceCatalogsAreNotSchoolAdoptions:true,
  onlyTeacherAndPrincipalMaySupplyRealAcademicApproval:true,
  approved:0,published:0,verifiedQualifiedTeacherReviews:0,
  priorityCounts,editorialSignalCounts:r.signalCounts,
  mcqKeyCounts:r.mcqKeyCounts,originalMcqAProportion:r.originalMcqAProportion,
  flagshipRisks:[
   '89.7% of MCQ original correct options are in position A: answer-position bias, NOT proof the options are incorrect.',
   '584 unique originals have heuristic editorial issues: these are NOT fact-checked or textbook-verified conclusions.',
   'Long-answer rubrics and numerical working have large incomplete-reference queues.',
   'Actual printed edition, school adoption, source page, Urdu equivalence and real faculty correctness checks remain unverified.'
  ],
  subjectFlagCounts:subjects,
  instructions:'Create separate revision-preserving draft corrections; independently verify textbook and subject correctness before any human approval. Do not auto-publish or overwrite candidates.',
  rows
 }
 return output
}
function report(r){
 const a=['# ASSPS IX–X — Automated editorial PRE-REVIEW, not faculty certification','',
 '**14 October 2026. Deterministic rules-based research precheck, not a semantic fact audit, external-source verification or qualified teacher decision. Zero human approvals issued.**','',
 'Original research candidates: **'+r.originalResearchCandidates+'**. Unique candidates with objective editorial flags: **'+r.flaggedForCorrectionDraft+
 '**. No editorial flags: **'+r.unflaggedButStillUnverified+'** (NOT academically verified).',
 'Priority P1: **'+r.priorityCounts.P1+'**. Priority P2: **'+r.priorityCounts.P2+'**.',
 'MCQ original answer keys: '+JSON.stringify(r.mcqKeyCounts)+'. **89.7% A** is a distribution warning, not an incorrect-answer verdict.','',
 '## Observed signals (counts overlap)','']
 for(const [k,n] of Object.entries(r.editorialSignalCounts))a.push('- '+k+': '+n+'. Suggested correction: '+proposed[k])
 a.push('','## Grade/subject correction queue')
 for(const [k,n] of Object.entries(r.subjectFlagCounts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])))a.push('- '+k+': '+n+' flagged originals')
 a.push('','## Authentic source applicability', 'PECTAA curriculum listing: https://pectaa.edu.pk/curriculum-compliance/',
  'Published authority listings show multiple IX/X 2025-26, 2026-27 and historical variants. An official listing is not proof of the textbook edition actually adopted by ASSPS. Grade IX ALP targeting Annual Examination 2026 is not automatically applicable to 2027.',
  'No qualified teacher, principal, textbook printed-page or publisher certification was independently obtained in this deterministic review.',
  'This output has no review approval signature, and no original answer/question rows were changed.', '',
  '## Required human decision and safe status',
  'Corrections must be added as fresh draft revisions; require subject/Urdu real reviewer, source applicability and Principal revision-specific authentication. Paper Workspace only selects separately approved published revisions.',
  'JSON docket contains original question IDs, exact original revision SHA-256, claimed PDF identity, correction proposals, and P1/P2 severity. It is NOT an answer-key truth certificate.', '')
 return a.join('\n')
}
function write(){
 const b=build()
 fs.writeFileSync(OUT,JSON.stringify(b,null,2)+'\n')
 fs.writeFileSync(MD,report(b))
 return{candidates:b.originalResearchCandidates,flagged:b.flaggedForCorrectionDraft,
  priority:b.priorityCounts,approved:0,published:0,docketSha256:sha(fs.readFileSync(OUT))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={build,report,write,SRC,OUT,MD}

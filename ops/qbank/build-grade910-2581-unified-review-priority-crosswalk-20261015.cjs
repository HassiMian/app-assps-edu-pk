#!/usr/bin/env node
'use strict'
// Public-safe academic review routing metadata only. NO question, answers,
// choice texts, user signatures, private staff identities or approval records.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const DOC=path.join(ROOT,'docs/question-bank')
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex')
const fail=x=>{throw Error('GRADE910_2581_REVIEW_CROSSWALK_'+x)}
const name={
 reviewed:'ASSPS_GRADE910_584_UNIFIED_ACADEMIC_REVIEW_QUEUE_20261015.json',
 choices:'ASSPS_GRADE910_66_CURATED_MCQ_OPTION_REVISION_DRAFTS_20261015.json',
 cues:'ASSPS_GRADE910_66_RESIDUAL_OPTION_BIAS_RISKS_20261015.json'
}
const OUT=path.join(DOC,'ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json')
const MD=path.join(DOC,'ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.md')
function read(key){
 const file=path.join(DOC,name[key]),bytes=fs.readFileSync(file)
 return{data:JSON.parse(bytes),sha256:SHA(bytes)}
}
function assemble(){
 const universe=require('./build-grade910-authoritative-faculty-intake.cjs').build()
 const staging=read('reviewed'),choices=read('choices'),cues=read('cues')
 if(universe.researchQuestionCandidates!==2581||universe.uniqueOriginalQuestionIds!==2581||
    universe.approved!==0||universe.verifiedPublished!==0||universe.publisherSelectable!==0)
  fail('FROZEN_UNIVERSE_INVALID')
 if(staging.data.sourceShaBoundQuestions!==584||staging.data.academicallyApproved!==0||
    staging.data.published!==0)fail('584_EVIDENCE_DRIFT')
 if(staging.data.evidenceFiles[name.choices]!==choices.sha256)fail('WRONG_66_DRAFT_ARTIFACT_SHA')
 if(cues.data.aggregate.sourceSha256!==choices.sha256)fail('RESIDUAL_CUE_ARTIFACT_CHANGED')
 if(choices.data.rows.length!==66||cues.data.rows.length!==66)fail('66_CHOICE_OR_RISK_COUNT_DRIFT')
 const reviewIndex=new Map(),choiceIndex=new Map(),riskIndex=new Map()
 for(const r of staging.data.rows){
  if(reviewIndex.has(r.originalId))fail('DUPLICATE_REVIEW_ID')
  if(!/^[a-f0-9]{64}$/.test(r.originalRevisionSha256))fail('BAD_REVIEW_REVISION_SHA')
  reviewIndex.set(r.originalId,r)
 }
 for(const r of choices.data.rows){
  if(choiceIndex.has(r.originalId))fail('DUPLICATE_CHOICE_ID')
  choiceIndex.set(r.originalId,r)
 }
 for(const r of cues.data.rows){
  if(riskIndex.has(r.originalId))fail('DUPLICATE_RISK_ID')
  riskIndex.set(r.originalId,r)
 }
 const stagingDir=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
 const evidenceAuthoring=new Map()
 for(const filename of ['english9CompetencyOriginals2026.json','biology9TopicResearchDrafts.json']){
  const raw=fs.readFileSync(path.join(stagingDir,filename)),obj=JSON.parse(raw)
  const items=obj.items||obj.drafts||[]
  evidenceAuthoring.set(filename,{fileSha256:SHA(raw),items:new Map(items.map(q=>[q.id,q]))})
 }
 const rows=[],seen=new Set(),groups=new Map()
 let unmatched=0
 for(const base of universe.rows){
  const id=base.originalQuestionId
  if(seen.has(id))fail('DUPLICATE_UNIVERSE_ID')
  seen.add(id)
  const evidence=reviewIndex.get(id),curated=choiceIndex.get(id),risk=riskIndex.get(id)
  if(evidence&&evidence.originalRevisionSha256!==base.originalQuestionRevisionSha256)
   fail('SOURCE_REVISION_CHANGED_'+id)
  if(Boolean(curated)!==Boolean(risk)||Boolean(curated)!==Boolean(evidence?.individuallyCuratedDistractors))
   fail('66_CURATED_COHORT_NOT_EQUAL_'+id)
  if(curated&&(
    curated.originalRevisionSha256!==base.originalQuestionRevisionSha256||
    curated.proposalSha256!==evidence.newDistractorProposalHash||
    risk.proposalSha256!==curated.proposalSha256||
    risk.originalRevisionSha256!==base.originalQuestionRevisionSha256))
   fail('CURATED_SOURCE_AND_RISK_CROSSWALK_'+id)
  if(evidence&&evidence.evidenceFileSha256!==staging.data.evidenceFiles[evidence.evidenceFile])
   fail('REVIEW_EVIDENCE_FILE_SHA_MISMATCH_'+id)
  const routing=evidence?.reviewRoutingIdentity
  let routeFromAuthor=null
  if((base.gradeClaim==null||base.subjectClaim==null||base.mediumClaim==null)&&
     !routing?.schoolAdoptionCertified){
   const original=evidenceAuthoring.get(base.originalFile)
   if(original){
    if(original.fileSha256!==base.originalFileSha256)fail('AUTHORING_FILE_SHA_DRIFT_'+id)
    const found=original.items.get(id)
    if(!found)fail('AUTHORING_QUESTION_ID_MISSING_'+id)
    if(base.originalFile==='english9CompetencyOriginals2026.json'){
     if(!id.startsWith('IX-ENG-ORIG-20261008-'))fail('ENGLISH9_AUTHORING_ID_INVALID')
     routeFromAuthor={grade:9,subject:'english',medium:'english',unit:found.unit??null,
      basis:'ENGLISH9_ORIGINAL_AUTHORING_FILE_PROVISIONAL_ROUTE',authoringSourceFileSha256:original.fileSha256}
    }else if(base.originalFile==='biology9TopicResearchDrafts.json'){
     if(!id.startsWith('IX-BIO-EM-RESEARCH-')||
        found.curriculum?.grade!==9||found.curriculum?.subjectId!=='biology'||
        found.curriculum?.languageSource!=='en')
      fail('BIOLOGY_SOURCE_LANGUAGE_ROUTE_UNTRUSTED_'+id)
     routeFromAuthor={grade:9,subject:'biology',medium:'english',unit:found.chapter?.number??null,
      basis:'BIOLOGY9_LANGUAGE_SOURCE_ENGLISH_AUTHORING_ONLY',authoringSourceFileSha256:original.fileSha256}
    }
   }
  }
  const grade=routing?.grade??base.gradeClaim??routeFromAuthor?.grade??null
  const subject=routing?.subject??base.subjectClaim??routeFromAuthor?.subject??null
  const medium=routing?.medium??base.mediumClaim??routeFromAuthor?.medium??null
  const chapter=routing?.unit??base.chapterClaim??routeFromAuthor?.unit??null
  // A review routing field is NOT a school-verified curriculum adoption claim.
  if(grade!=null&&![9,10].includes(grade))fail('GRADE_OUTSIDE_SCOPE_'+id)
  if(!['english','urdu','dual',null].includes(medium))fail('MEDIUM_INVALID_'+id)
  const score=(curated?1000:0)+(evidence?.priority==='P1'?300:0)+
   (evidence?.priority==='P2'?200:0)+(routing?.evidence==='ENGLISH9_AUTHORING_SOURCE_MAP_INFERENCE_ONLY'?90:0)+
   (risk?.multipleIncorrectOptionsCarryExclusiveOrAbsolutePhrasing?55:0)+
   (risk?.correctOptionStrictlyLongest?10:0)
  const groupKey=[grade??'unknown',subject??'unspecified',medium??'unknown'].join('~')
  const requestedChecks=['AUTHENTICATED_SCHOOL_TEXTBOOK_ADOPTION_2026_27',
   'CURRICULUM_AND_2027_EXAM_YEAR_APPLICABILITY',
   'INDEPENDENT_QUESTION_AND_ANSWER_CORRECTNESS',
   'SOURCE_PROVENANCE_AND_CHAPTER_EXERCISE_MATCH',
   'MARKS_DIFFICULTY_AND_DUPLICATE_REVIEW',
   ...(medium==='urdu'?['QUALIFIED_URDU_LANGUAGE_REVIEW']:[]),
   ...(curated?['DRAFT_MCQ_ALL_DISTRACTORS_UNAMBIGUOUSLY_FALSE','DRAFT_MCQ_WORDING_CUE_REVIEW']:[])]
  const row={
   questionId:id,originalRevisionSha256:base.originalQuestionRevisionSha256,
   originalResearchFileSha256:base.originalFileSha256,
   sourceFile:base.originalFile,originalGradeClaim:base.gradeClaim,
   originalSubjectClaim:base.subjectClaim,originalMediumClaim:base.mediumClaim,
   provisionalReviewGrade:grade,provisionalReviewSubject:subject,
   provisionalReviewMedium:medium,provisionalReviewUnit:chapter,
   inferredIdentityFromVerifiedSourceMap:Boolean(routing?.evidence==='ENGLISH9_AUTHORING_SOURCE_MAP_INFERENCE_ONLY'),
   inferredIdentityFromAuthoringMetadata:Boolean(routeFromAuthor),
   inferredAcademicRoutingEvidence:routeFromAuthor,
   schoolAdoptionVerified:false,
   questionType:base.type,sourceCatalogId:base.sourceCatalogId,
   contentOrigin:base.contentOrigin,groupKey,
   reviewLane:evidence?.evidenceStage??'FROZEN_ORIGINAL_NO_EDITORIAL_PROPOSAL',
   editorialPriority:evidence?.priority??'STANDARD',priorityScore:score,
   evidenceFileSha256:evidence?.evidenceFileSha256??null,
   proposedRevisionSha256:curated?.proposalSha256??null,
   strongLengthCueMitigatedInDraft:Boolean(curated)&&!curated.residualStrongLengthCue,
   absoluteCueDistractorCount:risk?.distractorsWithAbsoluteCue??null,
   residualStrictLongestCorrectDraft:risk?.correctOptionStrictlyLongest??null,
   independentHumanAccuracyReview:false,reviewerIdentityVerified:false,
   schoolPrincipalAuthenticatedApproval:false,
   approved:false,published:false,paperStudioSelectable:false,
   requestedChecks
  }
  rows.push(row)
  const g=groups.get(groupKey)||{grade,subject,medium,groupKey,sourceResearchQuestions:0,editorialCandidates:0,
   mcqDistractorQualityDrafts:0,provisionalIdentityCandidates:0}
  g.sourceResearchQuestions++
  if(evidence)g.editorialCandidates++
  if(curated)g.mcqDistractorQualityDrafts++
  if(row.inferredIdentityFromVerifiedSourceMap)g.provisionalIdentityCandidates++
  groups.set(groupKey,g)
 }
 for(const key of reviewIndex.keys())if(!seen.has(key))unmatched++
 if(unmatched||rows.length!==2581||reviewIndex.size!==584||choiceIndex.size!==66||riskIndex.size!==66)
  fail('ORIGINAL_UNIVERSE_NOT_EXACTLY_RECONCILED')
 rows.sort((a,b)=>b.priorityScore-a.priorityScore||a.questionId.localeCompare(b.questionId))
 const batch=[...groups.values()].sort((a,b)=>a.grade-b.grade||String(a.subject).localeCompare(String(b.subject))||
  String(a.medium).localeCompare(String(b.medium)))
 const metrics={
  originalQuestions:rows.length,flaggedCandidates:rows.filter(x=>x.reviewLane!=='FROZEN_ORIGINAL_NO_EDITORIAL_PROPOSAL').length,
  baselineNoNewEditorialProposal:rows.filter(x=>x.reviewLane==='FROZEN_ORIGINAL_NO_EDITORIAL_PROPOSAL').length,
  reviewGroups:batch.length,mcqSpecificOptionRevisions:rows.filter(x=>x.proposedRevisionSha256).length,
  provisionalIdentityReviewRoutes:rows.filter(x=>x.inferredIdentityFromVerifiedSourceMap).length,
  additionallyRoutedFromAuthoringMetadata:rows.filter(x=>x.inferredIdentityFromAuthoringMetadata&&!x.inferredIdentityFromVerifiedSourceMap).length,
  grade9Routing:rows.filter(x=>x.provisionalReviewGrade===9).length,
  grade10Routing:rows.filter(x=>x.provisionalReviewGrade===10).length,
  englishRouting:rows.filter(x=>x.provisionalReviewMedium==='english').length,
  urduRouting:rows.filter(x=>x.provisionalReviewMedium==='urdu').length,
  dualMediumRouting:rows.filter(x=>x.provisionalReviewMedium==='dual').length,
  unknownMediumRouting:rows.filter(x=>x.provisionalReviewMedium==null).length,
  unknownGradeRouting:rows.filter(x=>x.provisionalReviewGrade==null).length,
  draftOptionsWithAbsoluteCue:rows.reduce((s,x)=>s+(x.absoluteCueDistractorCount||0),0),
  withTwoOrMoreAbsoluteCuedDistractors:rows.filter(x=>x.absoluteCueDistractorCount>=2).length,
  adoptedTextbooksAuthenticated:0,schoolSignaturesValidated:0,
  qualifiedTeacherReviewsCompleted:0,approved:0,published:0
 }
 if(metrics.baselineNoNewEditorialProposal!==1997||metrics.provisionalIdentityReviewRoutes!==28||
  metrics.mcqSpecificOptionRevisions!==66||metrics.draftOptionsWithAbsoluteCue!==102||
  metrics.grade9Routing!==1628||metrics.grade10Routing!==953||
  metrics.unknownGradeRouting!==0||metrics.dualMediumRouting!==48||metrics.unknownMediumRouting!==0||
  metrics.additionallyRoutedFromAuthoringMetadata!==22)fail('DETERMINISTIC_METRICS_DRIFT')
 return{
  schema:'assps-grade910-2581-public-safe-source-revision-review-crosswalk-v1',
  rootFrozenUniverseSha256:SHA(Buffer.from(JSON.stringify(universe.rows))),
  frozenEditorialQueueSha256:staging.sha256,curatedOptionDraftsSha256:choices.sha256,
  residualLinguisticRiskSha256:cues.sha256,
  privacy:'NO_QUESTION_STEMS_OPTIONS_REFERENCE_ANSWERS_SIGNED_STAFF_DATA_OR_STUDENT_DATA',
  releaseDecision:'DENY_UNTIL_AUTHENTICATED_SCHOOL_ADOPTION_AND_INDEPENDENT_QUESTION_REVISION_APPROVAL',
  metrics,groups:batch,rows
 }
}
function write(){
 const d=assemble();fs.writeFileSync(OUT,JSON.stringify(d,null,2)+'\n')
 const m=d.metrics
 fs.writeFileSync(MD,[
 '# ASSPS IX–X | One authoritative 2,581-question human academic review crosswalk',
 '',
 'This is a public-safe metadata **review-routing dossier**, not an answer bank or a permission to generate school papers. Grades IX/X for 2026–27; Annual Board 2027 school applicability unverified.',
 '',
 '| Integrity and routing measure | Verified source-level value |','|---|---:|',
 '| Original research candidate IDs SHA-bound | '+m.originalQuestions+' |',
 '| Exactly linked to 584 editorial pre-review dossiers | '+m.flaggedCandidates+' |',
 '| Other original candidates with no new editorial proposal | '+m.baselineNoNewEditorialProposal+' |',
 '| Original-revision-bound 66 MCQ alternative drafts | '+m.mcqSpecificOptionRevisions+' |',
 '| Grade IX / Grade X provisional routing | '+m.grade9Routing+' / '+m.grade10Routing+' |',
 '| English / Urdu / dual / unknown provisional routing | '+m.englishRouting+' / '+m.urduRouting+' / '+m.dualMediumRouting+' / '+m.unknownMediumRouting+' |',
 '| Unknown original or review-routed grade | '+m.unknownGradeRouting+' |',
 '| Flagged Grade IX English original identity fields missing, provisionally routed | '+m.provisionalIdentityReviewRoutes+' |',
 '| Further source-labeled originals provisionally routed (16 English + 6 Biology) | '+m.additionallyRoutedFromAuthoringMetadata+' |',
 '| Review groups by grade, subject and medium | '+m.reviewGroups+' |',
 '| MCQ absolute/exclusive wording option risks | '+m.draftOptionsWithAbsoluteCue+' |',
 '| Groups of MCQs with 2+ such distractors | '+m.withTwoOrMoreAbsoluteCuedDistractors+' |',
 '| Approved / published | **0 / 0** |',
 '',
 'The source-only crosswalk carries no question stems, options, answers, staff signatures or student marks. It preserves original source IDs, original revision/file hashes, reviewer group identity and exact editorial evidence linkage. Research source SHA-256 is NOT textbook edition, exercise page, factual answer or school adoption approval.',
 '',
 'Critical human checks: actual adopted textbook and Annual 2027 scheme, source chapter/page, MCQ distractor accuracy and Urdu equivalence, academic subject specialist decision per exact changed revision, Principal authenticated signoff and Paper Studio/SaaS Core live tenant-security/rollback certification.',
 '',
 '**No production writes or seed, no real reviewer impersonation, no change in existing user or student data. Publication remains HOLD.**',''
 ].join('\n'))
 return{metrics:m,outputSha256:SHA(fs.readFileSync(OUT))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={assemble,write,OUT,MD}

'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const triage=require('../qbank/build-grade910-all2581-answer-quality-triage-20261015.cjs')
let cached
const audit=()=>cached||(cached=triage.audit())
test('exact frozen 73-source 2,581-revision academic quality inventory',()=>{
 const x=audit(),m=x.metrics
 assert.equal(x.sourceQuestions.length,2581)
 assert.equal(new Set(x.sourceQuestions.map(x=>x.questionId)).size,2581)
 assert.equal(m.originalSourceFiles,73)
 assert.equal(m.gradeSubjectMediumGroups,56)
 assert.equal(m.flaggedReviewEvidenceCandidates,584)
 assert.equal(m.originalQuestionsChanged,0)
 assert.equal(m.qualifiedTeacherReviewed,0)
 assert.equal(m.academicallyApproved,0)
 assert.equal(m.published,0)
 assert.equal(Object.keys(x.sourceFileHashes).length,73)
 assert.deepEqual(JSON.parse(fs.readFileSync(triage.target)),x)
})
test('MCQ key position skew is correctly identified without silently rotating the canonical source choices',()=>{
 const x=audit(),m=x.metrics
 assert.equal(m.originalMcqCandidates,875)
 assert.deepEqual(m.recordedSourceMcqKeys,{A:785,B:50,C:33,D:7})
 assert.equal(m.sourceMcqAKeyRatioPercent,89.71)
 assert.equal(m.mcqOriginalsInsidePredictableRuns,724)
 assert.equal(m.mcqEditorPatternFileCount,53)
 assert.equal(m.originalMcqKeysInferredFromAnswerText,24)
 assert.equal(x.sourceQuestions.filter(q=>q.originalQuestionType==='mcq').length,875)
 assert.equal(x.sourceQuestions.filter(q=>q.flags.includes('SOURCE_CONSECUTIVE_MCQ_KEY_REPEAT_IN_FILE')).length,724)
})
test('original long answer model-vs-rubric risk is explicitly separated from real human answer verification',()=>{
 const x=audit(),m=x.metrics
 assert.equal(m.originalLongAnswers,564)
 assert.equal(m.rubricInstructionLikeLongAnswers,166)
 assert.equal(x.sourceQuestions.filter(q=>q.flags.includes('RUBRIC_LIKE_LONG_ANSWER_NOT_COMPLETE_MODEL_ANSWER')).length,166)
 assert.ok(x.sourceQuestions.every(q=>q.qualifiedAnswerAccuracyReviewerVerified===false))
 assert.equal(m.heldIncompleteAnswerQuestions,1)
 assert.ok(x.sourceQuestions.find(q=>q.questionId==='X-CHEM-C23-L01').flags.includes('FACULTY_HELD_INCOMPLETE_SUBSTANTIVE_ANSWER'))
})
test('potential duplication and AI distractor editorial cues cannot be mistaken for academically confirmed bad questions',()=>{
 const x=audit(),m=x.metrics
 assert.equal(m.possibleSourceNearStemPairs,12)
 assert.equal(m.distinctNearStemQuestions,15)
 assert.equal(m.revisedMcqDrafts,66)
 assert.equal(m.revisedDraftsWithExclusiveWordCues,54)
 assert.ok(x.nearStemPairs.every(v=>v.academicallyConfirmedDuplicate===false))
 assert.ok(x.sourceQuestions.every(v=>v.academicallyApproved===false&&v.published===false&&v.paperStudioSelectable===false))
})
test('public academic-risk docket contains no question stems, source answers, student identities or signatures',()=>{
 const x=audit()
 const privateFields=['stem','questionText','question','options','answer','correctAnswer','answerKey','signature','reviewerName','studentId','studentName']
 for(const v of x.sourceQuestions){
  for(const key of privateFields)assert.equal(Object.hasOwn(v,key),false,key)
  assert.match(v.originalRevisionSha256,/^[0-9a-f]{64}$/)
  assert.match(v.originalResearchFileSha256,/^[0-9a-f]{64}$/)
 }
 assert.match(x.rule,/NOT_ACADEMIC_VERIFICATION/)
})
test('tampered reviewer or principal publication privileges are denied, without touching original school data',()=>{
 const x=audit()
 for(const field of ['academicallyApproved','published','paperStudioSelectable','qualifiedAnswerAccuracyReviewerVerified','authenticatedSchoolAcademicApproval']){
  const changed={...x,sourceQuestions:x.sourceQuestions.map((q,i)=>i===0?{...q,[field]:true}:q)}
  assert.throws(()=>triage.validateOutput(changed),/UNAUTHENTICATED_REVIEW_OR_PUBLICATION_GRANTED/)
 }
})
test('candidate answer or student data copied into public quality metadata is rejected',()=>{
 const x=audit()
 const bad={...x,sourceQuestions:x.sourceQuestions.map((q,i)=>i===1?{...q,answer:'DO_NOT_EXPORT'}:q)}
 assert.throws(()=>triage.validateOutput(bad),/REVIEW_DOCKET_LEAKS_QUESTION_ANSWER_OR_IDENTITY/)
})
test('candidate duplicate similarities cannot become qualified findings by a schema edit',()=>{
 const x=audit()
 const bad={...x,nearStemPairs:x.nearStemPairs.map((p,i)=>i? p:{...p,academicallyConfirmedDuplicate:true})}
 assert.throws(()=>triage.validateOutput(bad),/POTENTIAL_DUPLICATE_FALSELY_CONFIRMED/)
})
test('all 56 teacher-facing subject-medium worklist summaries trace exact source candidates',()=>{
 const x=audit()
 const counts=x.gradeSubjectMediumGroups.reduce((tot,g)=>tot+g.questions,0)
 assert.equal(counts,2581)
 for(const g of x.gradeSubjectMediumGroups){
  assert.equal(g.topPriorityOriginalIds.length,Math.min(g.questions,5))
  assert.ok(g.topPriorityOriginalIds.every(id=>x.sourceQuestions.some(q=>q.questionId===id&&q.reviewGroupKey===g.reviewGroupKey)))
 }
 assert.ok(fs.readFileSync(triage.summary,'utf8').includes('All 56 reviewer worklists'))
})

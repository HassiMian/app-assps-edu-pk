'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const m=require('../qbank/audit-grade910-mcq-medium-option-integrity.cjs')
const read=()=>JSON.parse(fs.readFileSync(m.OUT,'utf8'))
test('all 875 original question/source SHA-pinned MCQs are uniquely audited without copying content',()=>{
 const x=read()
 assert.equal(x.originalMCQs,875)
 assert.equal(x.rows.length,875)
 assert.equal(new Set(x.rows.map(r=>r.originalQuestionId)).size,875)
 assert.ok(x.rows.every(r=>/^[0-9a-f]{64}$/.test(r.originalQuestionRevisionSha256)))
 assert.ok(x.rows.every(r=>/^[0-9a-f]{64}$/.test(r.originalSourceFileSha256)))
 assert.ok(x.rows.every(r=>r.sourceAnswerCorrectnessTeacherVerified===false))
 assert.ok(x.rows.every(r=>!Object.hasOwn(r,'stem')&&!Object.hasOwn(r,'answer')&&!Object.hasOwn(r,'options')))
})
test('24 old canonical key gaps and original option-position skew require teacher rather than automated approval',()=>{
 const x=read()
 assert.deepEqual(x.aggregateOriginalCorrectOptionPositions,{A:785,B:33,C:26,D:7,UNSET:24})
 assert.equal(x.flags.ORIGINAL_CORRECT_OPTION_ID_NOT_CANONICAL,24)
 assert.equal(x.originalScientificAnswerKeyTeacherCertified,0)
 assert.equal(x.originalSignedHumanAcademicApprovals,0)
 assert.equal(x.published,0)
 assert.equal(x.paperStudioVerifiedSelectable,false)
})
test('18 bilingual original questions and 16 empty Hindi placeholders have safe publication review flags',()=>{
 const x=read()
 assert.equal(x.bilingualOriginalEnglishUrduResearchPairs,18)
 assert.equal(x.flags.PARALLEL_ENGLISH_URDU_FACULTY_EQUIVALENCE_UNVERIFIED,18)
 assert.equal(x.flags.EMPTY_HINDI_PLACEHOLDER_MUST_NOT_RENDER,16)
 assert.equal(x.flags.NONEMPTY_HINDI_CONTENT_BEYOND_ASSPS_ENGLISH_URDU_SELECTION,2)
 assert.equal(x.englishUrduSemanticEquivalenceIndependentlyCertified,0)
 assert.equal(x.flags.CORRECT_OPTION_ANSWER_TEXT_MISMATCH,0)
 assert.equal(x.flags.DUPLICATED_OR_MALFORMED_OPTIONS,0)
})
test('synthetic mismatched answers and duplicate distractors correctly trigger mechanical warning',()=>{
 const q={id:'synthetic-only-q',type:'mcq',correctOptionId:'C',
  content:{en:{stem:'Dummy question',answer:'Correct',options:[
   {id:'A',text:'Duplicate'}, {id:'B',text:'Duplicate'},{id:'C',text:'Other'},{id:'D',text:'Fourth'}]}}}
 const a=m.examine(q)
 assert.ok(a.researchReviewFlags.includes('CORRECT_OPTION_ANSWER_TEXT_MISMATCH'))
 assert.ok(a.researchReviewFlags.includes('DUPLICATED_OR_MALFORMED_OPTIONS'))
 assert.equal(a.automaticMCQOptionRebalancePermitted,false)
})
test('identical regenerate-from-original report, no academic approval shortcuts or data mutation',()=>{
 const x=read()
 assert.deepEqual(m.build(),x)
 assert.equal(fs.readFileSync(m.MD,'utf8'),m.markdown(x))
 assert.equal(x.originalQuestionChangesMade,false)
})

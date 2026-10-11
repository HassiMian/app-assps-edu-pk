'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const mod=require('../qbank/build-grade910-all-content-review-docket.cjs')
let cache
const result=()=>cache??(cache=mod.build())
test('all 2581 frozen original revisions survive a zero-approval non-text editorial QA audit',()=>{
 const x=result()
 assert.equal(x.originalCandidates,2581)
 assert.equal(x.sourceFiles,73)
 assert.equal(x.approved,0)
 assert.equal(x.published,0)
 assert.equal(x.publisherSelectable,false)
 assert.equal(x.rows.length,2581)
 assert.equal(new Set(x.rows.map(q=>q.originalId)).size,2581)
 assert.ok(x.rows.every(q=>/^[0-9a-f]{64}$/.test(q.revisionSha256)))
 assert.ok(x.rows.every(q=>/^[0-9a-f]{64}$/.test(q.sourceFileSha256)))
})
test('full MCQ keys include all 24 legacy text-inferred research positions but no auto approval',()=>{
 const x=result()
 assert.deepEqual(x.mcqKeyCounts,{A:785,B:50,C:33,D:7,missing:0})
 assert.equal(x.signalCounts.MCQ_KEY_ID_NOT_EXPLICIT,24)
 assert.equal(x.signalCounts.MCQ_OPTIONS_NOT_CANONICALLY_LABELED,24)
 assert.equal(x.rows.filter(q=>q.questionType==='mcq').length,875)
 assert.equal(x.rows.filter(q=>q.questionType==='mcq'&&!q.mcq.canonicallyLabeled).length,24)
 assert.equal(x.rows.filter(q=>q.questionType==='mcq'&&q.mcq?.answerMatchesExactlyOneOption===false).length,0)
})
test('short rubric and working-length triage flags do not claim scientific or marks correctness',()=>{
 const x=result()
 assert.equal(x.signalCounts.LONG_REFERENCE_EXTREMELY_BRIEF,34)
 assert.equal(x.signalCounts.LONG_REFERENCE_BRIEF_RUBRIC_REVIEW,389)
 assert.equal(x.signalCounts.NUMERICAL_WORKING_REVIEW,61)
 assert.equal(x.signalCounts.ESSAY_REFERENCE_BRIEF,8)
 assert.equal(x.signalCounts.MCQ_OPTION_LENGTH_CUE_REVIEW,68)
 assert.equal(x.flaggedQuestionIds,584)
 assert.ok(x.method.includes('NOT verified scientific answer errors'))
})
test('adversarial malformed options, wrong selected answer, duplicate option are all flagged',()=>{
 const good={
  type:'mcq',correctOptionId:'B',
  content:{en:{stem:'Select an example.',answer:'A typical example',options:[
   {id:'A',text:'Another example'},{id:'B',text:'A typical example.'},
   {id:'C',text:'Further example'},{id:'D',text:'Separate example'}]}}
 }
 assert.deepEqual(mod.evaluate(good).objectiveEditorialFlags,[])
 const wrong=structuredClone(good)
 wrong.content.en.answer='Not any option'
 assert.ok(mod.evaluate(wrong).objectiveEditorialFlags.includes('MCQ_SELECTED_TEXT_ANSWER_DISAGREE'))
 const duplicate=structuredClone(good)
 duplicate.content.en.options[2].text='Another example'
 assert.ok(mod.evaluate(duplicate).objectiveEditorialFlags.includes('MCQ_REPEATED_OPTION'))
 const legacy={type:'mcq',stem:'Which is appropriate?',options:['A','B','C','D'],answer:'C'}
 assert.ok(mod.evaluate(legacy).objectiveEditorialFlags.includes('MCQ_KEY_ID_NOT_EXPLICIT'))
 assert.equal(mod.evaluate(legacy).mcq.researchedAnswerPositionNotVerified,'C')
})
test('materialized full editorial worklist matches regenerated frozen research and omits original question text',()=>{
 const x=JSON.parse(fs.readFileSync(mod.OUT,'utf8'))
 assert.deepEqual(x,result())
 assert.equal(fs.readFileSync(mod.SUMMARY,'utf8'),mod.markdown(result()))
 assert.equal(JSON.stringify(x).includes('Which statement best reflects agriculture'),false)
 assert.ok(x.rows.every(q=>!Object.hasOwn(q,'stem')&&!Object.hasOwn(q,'options')&&!Object.hasOwn(q,'answer')))
})

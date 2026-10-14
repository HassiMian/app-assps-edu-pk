const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {assessDraft}=require('../qbank/validate-original-exam-draft.cjs')
const root=path.resolve(__dirname,'../..')
const draft=JSON.parse(fs.readFileSync(path.join(root,'docs/question-bank/ASSPS_BIO9_CH1_ORIGINAL_PRACTICE_DRAFT_20261008.json')))
const anchors=JSON.parse(fs.readFileSync(path.join(root,'docs/question-bank/ASSPS_BIO9_TOC_PAGE_ANCHORS_20261008.json')))
const clone=x=>JSON.parse(JSON.stringify(x))
test('27 originally authored questions form a gated 20-mark sample paper with balanced MCQ keys',()=>{
 const result=assessDraft(draft,anchors)
 assert.equal(result.safe,true)
 assert.deepEqual(result.questionCounts,{mcq:12,short:12,long:3})
 assert.deepEqual(result.mcqKeyCounts,{A:3,B:3,C:3,D:3})
 assert.equal(result.canComposeOriginalTwentyMarkReviewPaper,true)
 assert.equal(result.academicallyApproved,false)
 assert.equal(result.productionImportAllowed,false)
})
test('any premature publishing/academic approval is rejected',()=>{
 for(const field of ['academicallyApproved','productionQuestionBankImportAllowed','releaseEligible','independentAnswerReview']){
  const doc=clone(draft);doc[field]=true
  assert.ok(assessDraft(doc,anchors).findings.includes('DRAFT_POLICY_BYPASS'))
 }
})
test('source chapter evidence cannot be silently reassigned',()=>{
 const doc=clone(draft);doc.chapterSourcePrintedPages=[99,105]
 assert.ok(assessDraft(doc,anchors).findings.includes('CHAPTER_RANGE_DRIFT'))
})
test('duplicate prompts or IDs fail closed',()=>{
 const doc=clone(draft);doc.questions[1].localId=doc.questions[0].localId
 doc.questions[1].questionText=doc.questions[0].questionText
 const x=assessDraft(doc,anchors)
 assert.ok(x.findings.some(a=>a.startsWith('MISSING_OR_DUPLICATE_ID')))
 assert.ok(x.findings.some(a=>a.startsWith('INVALID_OR_DUPLICATE_PROMPT')))
})
test('wrong MCQ key and duplicate options are not published',()=>{
 const doc=clone(draft);doc.questions[0].correctOption='E'
 doc.questions[0].options[1]=doc.questions[0].options[0]
 const x=assessDraft(doc,anchors)
 assert.ok(x.findings.some(a=>a.startsWith('INVALID_MCQ_KEY')))
 assert.ok(x.findings.some(a=>a.startsWith('INVALID_MCQ_OPTIONS')))
})
test('weak long-question marking rubric cannot be treated as paper-ready',()=>{
 const doc=clone(draft);const q=doc.questions.find(x=>x.type==='long')
 q.markingPoints=['yes']
 assert.ok(assessDraft(doc,anchors).findings.some(a=>a.startsWith('INVALID_LONG_RUBRIC')))
})
test('imbalanced answers are rejected before editorial review',()=>{
 const doc=clone(draft)
 for(const q of doc.questions.filter(x=>x.type==='mcq'))q.correctOption='A'
 assert.ok(assessDraft(doc,anchors).findings.includes('MCQ_KEY_DISTRIBUTION_TOO_SKEWED'))
})
test('question-level page references cannot be invented from chapter TOC anchors',()=>{
 const doc=clone(draft);doc.questionLevelSourcePage=7
 assert.ok(assessDraft(doc,anchors).findings.includes('FALSE_PER_QUESTION_SOURCE_PAGE'))
})

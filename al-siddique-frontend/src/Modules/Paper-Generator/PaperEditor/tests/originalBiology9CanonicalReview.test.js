import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createManualAssessmentDocument,
  validateManualAssessmentForRelease,
} from '../../AssessmentStudio/core/manualAssessmentDocument.js'
import {
  DocumentOrigin,
  NodeMarksOrigin,
  createMcqNode,
  validateCanonicalPaperDocument,
} from '../core/PaperDocumentV2.js'

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../../..')
const draft=JSON.parse(fs.readFileSync(
  path.join(repoRoot,'docs/question-bank/ASSPS_BIO9_CH1_ORIGINAL_PRACTICE_DRAFT_20261008.json'),'utf8'))

function createOfflineReviewPaper() {
  const sample=[
    ...draft.questions.filter(q=>q.type==='mcq').slice(0,5),
    ...draft.questions.filter(q=>q.type==='short').slice(0,5),
    ...draft.questions.filter(q=>q.type==='long').slice(0,1),
  ]
  const sections=sample.map((question,index)=>({
    id:question.localId,
    heading:'Question '+(index+1)+' ('+question.marks+' mark'+(question.marks===1?'':'s')+')',
    content:question.questionText +
      (question.type==='mcq'
        ? '\n'+question.options.map((option,i)=>String.fromCharCode(65+i)+'. '+option).join('\n')
        : ''),
    marks:question.marks,
  }))
  const document=createManualAssessmentDocument({
    paper:{
      clientDraftId:'review-bio9-original-no-production-import',
      userAuthored:true,
      assessmentType:'Weekly Assessment',
      scope:{label:'Chapter 1 — The Science of Biology',chapterId:null,learningScopeIds:[]},
      official_section:sections,
    },
    config:{
      title:'Grade 9 Biology — Original Practice Review',
      classLevel:'9th',className:'9th',subject:'Biology',subjectName:'Biology',
      language:'english',totalMarks:20,timeAllowed:'30 minutes',session:'2026-2027',
    },
    paperSettings:{
      schoolName:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
      address:'Sharif Chowk, Rayya Khas, Narowal',
    },
  })
  return {document,sample}
}

test('original draft produces an independent canonical manual PaperDocument with 20 obtainable marks',()=>{
  const {document,sample}=createOfflineReviewPaper()
  assert.equal(sample.length,11)
  assert.equal(document.documentOrigin,DocumentOrigin.USER_AUTHORED)
  assert.equal(document.sourceIdentity,null)
  assert.equal(document.assessment.creationMode,'MANUAL')
  assert.equal(document.sections.length,11)
  assert.equal(document.scoringPlan.maximumObtainableMarks,20)
  assert.equal(document.scoringPlan.balanced,true)
  assert.equal(validateCanonicalPaperDocument(document).valid,true)
  assert.deepEqual(validateManualAssessmentForRelease(document),{valid:true,errors:[]})
})
test('question stems remain separate sections and answer explanations are not put on student-facing paper',()=>{
  const {document,sample}=createOfflineReviewPaper()
  for(const [index,source] of sample.entries()){
    const section=document.sections[index]
    assert.ok(section.nodes[0].content?.includes(source.questionText))
    assert.equal(section.operationalSectionTotal,source.marks)
    if(source.type==='mcq'){
      for(const option of source.options)assert.ok(section.nodes[0].content.includes(option))
      assert.ok(!section.nodes[0].content.includes(source.answerExplanation))
    }
    if(source.type==='long'){
      for(const rubric of source.markingPoints)assert.ok(!section.nodes[0].content.includes(rubric))
    }
  }
})
test('technical PaperDocument validity never changes academic approval or release authorization',()=>{
  const {document}=createOfflineReviewPaper()
  assert.equal(validateManualAssessmentForRelease(document).valid,true)
  assert.equal(draft.academicallyApproved,false)
  assert.equal(draft.productionQuestionBankImportAllowed,false)
  assert.equal(draft.releaseEligible,false)
})

test('canonical MCQ node keeps all options independently addressable, with no student answer-key leakage',()=>{
  const {document,sample}=createOfflineReviewPaper()
  const source=sample[0]
  const node=createMcqNode({
    id:'bio9-structured-'+source.localId,
    stemText:source.questionText,
    operationalNodeMarks:1,
    authoritativeNodeMarks:1,
    nodeMarksOrigin:NodeMarksOrigin.ITEM_LEVEL_EXPLICIT,
    options:source.options.map((text,index)=>({
      id:source.localId+'-opt-'+String.fromCharCode(65+index),
      canonicalLabel:String.fromCharCode(65+index),
      displayLabel:String.fromCharCode(65+index),
      text,
      isCorrect:null,
    })),
  })
  document.sections[0].nodes=[node]
  const evaluation=validateCanonicalPaperDocument(document)
  assert.equal(evaluation.valid,true,JSON.stringify(evaluation.errors))
  assert.equal(document.sections[0].nodes[0].options.length,4)
  assert.ok(document.sections[0].nodes[0].options.every(x=>x.isCorrect===null))
  const originalOtherOption=node.options[1].text
  node.options[0].text='Teacher editing an individual option'
  assert.equal(node.options[1].text,originalOtherOption)
  assert.equal(document.scoringPlan.maximumObtainableMarks,20)
})

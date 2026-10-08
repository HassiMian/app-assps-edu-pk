import test from 'node:test'
import assert from 'node:assert/strict'
import {
  highSchoolGrade, sourcesForQuestion, completeAttestations,
  buildAcademicReviewPacket, REVIEW_FIELDS, ACADEMIC_SCHEMA,
} from '../academicReviewClient.js'

const source={recordId:'pectaa-catalog-009',grade:9,subject:'Biology',
  medium:'English',edition:'2025-26',pdfSha256:'a'.repeat(64)}
const context={currentRevision:3,currentContentHash:'b'.repeat(64),question:{
  classLevel:'9th',subject:'biology',medium:'english',chapterNo:'1',questionType:'mcq',
}}
const allChecked=Object.fromEntries(REVIEW_FIELDS.map(({key})=>[key,true]))
const packet=(changes={})=>buildAcademicReviewPacket({
  context,source,origin:'ORIGINAL',flags:allChecked,
  notes:'Verified the original question, curriculum fit, exact chapter and answer key independently.',
  ...changes,
})
test('Grade9/10 aliases normalize without admitting Grade8',()=>{
  for(const grade of ['9','9th','Grade 9','Class IX'])
    assert.equal(highSchoolGrade(grade),9)
  for(const grade of ['10','10th','Grade 10','Class X'])
    assert.equal(highSchoolGrade(grade),10)
  for(const grade of ['8','9A','11th',''])assert.equal(highSchoolGrade(grade),null)
})
test('Official source selection is pinned to grade subject and language',()=>{
  assert.equal(sourcesForQuestion([source],context.question).length,1)
  assert.equal(sourcesForQuestion([source],{...context.question,subject:'Chemistry'}).length,0)
  assert.equal(sourcesForQuestion([source],{...context.question,medium:'urdu'}).length,0)
  assert.equal(sourcesForQuestion([source],{...context.question,classLevel:'10th'}).length,0)
})
test('Original academic evidence is bound to exact canonical revision and does not fabricate exercise pages',()=>{
  const x=packet()
  assert.equal(x.expectedRevision,3)
  assert.equal(x.expectedContentHash,'b'.repeat(64))
  assert.equal(x.evidence.schemaVersion,ACADEMIC_SCHEMA)
  assert.equal(x.evidence.sourceRecordId,source.recordId)
  assert.equal(x.evidence.sourcePdfSha256,source.pdfSha256)
  assert.equal(x.evidence.sourcePrintedPage,null)
  assert.equal(x.evidence.exerciseReference,null)
  assert.deepEqual(x.evidence.attestations,allChecked)
  assert.ok(!Object.prototype.hasOwnProperty.call(x.evidence,'academicApprovalGranted'))
})
test('Evidence cannot be created with a missing attestation, revision or substantive notes',()=>{
  const flags={...allChecked,answerKeyChecked:false}
  assert.equal(completeAttestations(flags),false)
  assert.throws(()=>packet({flags}),/[Ee]very academic review check/)
  assert.throws(()=>packet({notes:'Checked'}),/at least 45/)
  assert.throws(()=>packet({context:{...context,currentContentHash:'invalid'}}),/SHA-256/)
  assert.throws(()=>packet({source:null}),/verified textbook source/)
})
test('Textbook-derived drafts require printed page and exercise, unlike original drafts',()=>{
  assert.throws(()=>packet({origin:'TEXTBOOK_EXERCISE'}),/printed page and exercise/)
  const x=packet({origin:'TEXTBOOK_EXERCISE',printedPage:'14',exerciseReference:'Exercise 1 Q2'})
  assert.equal(x.evidence.sourcePrintedPage,14)
  assert.equal(x.evidence.exerciseReference,'Exercise 1 Q2')
})
test('Final academic status is never client-controlled',()=>{
  const body=packet()
  for(const field of ['approved','academicApprovalGranted','is_approved','releaseEligible']){
    assert.equal(Object.prototype.hasOwnProperty.call(body.evidence,field),false)
  }
})

test('candidate original author can produce exact revision-bound independent option edits',async()=>{
  const {editableQuestionDraft,buildProvisionalCorrection} = await import('../academicReviewClient.js')
  const original={...context,lifecycleStatus:'candidate',requesterIsOriginalAuthor:true}
  const editor=editableQuestionDraft({
    questionText:'Which process describes a biological observation?',
    options:[{label:'A',text:'Field study'},{label:'B',text:'Guessing'},{label:'C',text:'Assuming'},{label:'D',text:'Copying'}],
    correctOption:'A',answer:'Field study',explanation:'Observation is evidence collection.',marks:1,
    questionType:'mcq',
  })
  const packet=buildProvisionalCorrection({...original,question:{...original.question,questionType:'mcq'}},editor)
  assert.equal(packet.expectedRevision,3)
  assert.equal(packet.expectedContentHash,'b'.repeat(64))
  assert.equal(packet.changes.options.length,4)
  assert.equal(packet.changes.correct_option,'A')
  assert.equal(Object.hasOwn(packet.changes,'school_id'),false)
  assert.equal(Object.hasOwn(packet.changes,'is_approved'),false)
})
test('academic correction editor does not allow reviewer to alter original author source',async()=>{
  const {buildProvisionalCorrection}=await import('../academicReviewClient.js')
  const values={question_text:'A real question',options:['A','B','C','D'],correct_option:'A',marks:1}
  assert.throws(()=>buildProvisionalCorrection({
    ...context,lifecycleStatus:'reviewed',requesterIsOriginalAuthor:true,
    question:{...context.question,questionType:'mcq'},
  },values),/Only the original author/)
  assert.throws(()=>buildProvisionalCorrection({
    ...context,lifecycleStatus:'candidate',requesterIsOriginalAuthor:false,
    question:{...context.question,questionType:'mcq'},
  },values),/Only the original author/)
})
test('invalid corrected MCQ keys, incomplete options or marks fail closed',async()=>{
  const {buildProvisionalCorrection}=await import('../academicReviewClient.js')
  const editable={...context,lifecycleStatus:'candidate',requesterIsOriginalAuthor:true,
    question:{...context.question,questionType:'mcq'}}
  const draft={question_text:'A biology practice question',options:['a','b','c','d'],correct_option:'A',marks:1}
  assert.throws(()=>buildProvisionalCorrection(editable,{...draft,correct_option:'E'}),/four filled options/)
  assert.throws(()=>buildProvisionalCorrection(editable,{...draft,options:['a','b','c']}),/four filled options/)
  assert.throws(()=>buildProvisionalCorrection(editable,{...draft,marks:0}),/between 1 and 25/)
})

test('Exact review lookup uses school-scoped API and rejects malformed IDs',async t=>{
  const api=(await import('../../../services/api.js')).default
  const {academicReviewApi}=await import('../academicReviewClient.js')
  const before=api.get
  const requested=[]
  api.get=async url=>{requested.push(url);return {data:{data:{id:'q_grade9_test',class_level:'9th',subject:'Biology'}}}}
  t.after(()=>{api.get=before})
  const result=await academicReviewApi.getQuestion('q_grade9_test')
  assert.equal(result.id,'q_grade9_test')
  assert.deepEqual(requested,['/api/question-bank/q_grade9_test'])
  await assert.rejects(()=>academicReviewApi.getQuestion('../other-tenant'),/valid school question ID/)
  await assert.rejects(()=>academicReviewApi.getQuestion(''),/valid school question ID/)
  assert.equal(requested.length,1)
})

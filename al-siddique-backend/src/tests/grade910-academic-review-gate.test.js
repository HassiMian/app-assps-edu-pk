const test=require('node:test')
const assert=require('node:assert/strict')
const {ACADEMIC_REVIEW_VERSION,ATTESTATIONS,normalizeGrade,normalizeEvidence,reviewMappingKey}=require('../services/grade910AcademicReviewGate')
const catalog=require('../data/verifiedGrade910SourceRegistry.json')
const source=catalog.entries.find(e=>e.recordId==='pectaa-catalog-009')
const question={classLevel:'9th',subject:'biology',medium:'english',chapterNo:'1'}
const evidence={
 schemaVersion:ACADEMIC_REVIEW_VERSION,sourceRecordId:source.recordId,
 sourcePdfSha256:source.pdfSha256,edition:source.edition,
 chapterNo:'1',questionOrigin:'ORIGINAL',sourcePrintedPage:null,
 exerciseReference:null,
 attestations:Object.fromEntries(ATTESTATIONS.map(k=>[k,true])),
 editorialNotes:'Original question independently checked against chapter learning outcomes, scientifically accurate key, unambiguous wording and age-appropriate language.',
}
const clone=o=>JSON.parse(JSON.stringify(o))
test('grade normalization is strict, supporting only Grade 9 and 10',()=>{
 assert.equal(normalizeGrade('9th'),9);assert.equal(normalizeGrade('10'),10)
 assert.equal(normalizeGrade('8th'),null);assert.equal(normalizeGrade('9A'),null)
})
test('verified Biology 9 original draft can be submitted for independent review but remains unapproved',()=>{
 const x=normalizeEvidence(evidence,question)
 assert.equal(x.sourceRecordId,'pectaa-catalog-009')
 assert.equal(x.academicApprovalGranted,false)
 assert.equal(x.questionOrigin,'ORIGINAL')
})
test('unsigned, incomplete or forged source/subject/grade review evidence is rejected',()=>{
 for(const key of ['sourceRecordId','sourcePdfSha256','edition','chapterNo']){
  const e=clone(evidence);e[key]='UNVERIFIED'
  assert.throws(()=>normalizeEvidence(e,question))
 }
 assert.throws(()=>normalizeEvidence(evidence,{...question,subject:'chemistry'}))
 assert.throws(()=>normalizeEvidence(evidence,{...question,classLevel:'10th'}))
 for(const key of ATTESTATIONS){const e=clone(evidence);e.attestations[key]=false
  assert.throws(()=>normalizeEvidence(e,question),{code:'ACADEMIC_ATTESTATION_INCOMPLETE'})
 }
})
test('original content cannot fabricate an exercise page, and textbook-derived content must cite exercise',()=>{
 const original=clone(evidence);original.sourcePrintedPage=5
 assert.throws(()=>normalizeEvidence(original,question),{code:'FALSE_ORIGINAL_EXERCISE_REFERENCE'})
 const textbook=clone(evidence);textbook.questionOrigin='TEXTBOOK_EXERCISE'
 assert.throws(()=>normalizeEvidence(textbook,question),{code:'MISSING_EXERCISE_PROVENANCE'})
 textbook.sourcePrintedPage=18;textbook.exerciseReference='Exercise 1 A'
 assert.equal(normalizeEvidence(textbook,question).sourcePrintedPage,18)
})
test('review binding is immutable-content-hash and revision scoped',()=>{
 const h='a'.repeat(64)
 assert.equal(reviewMappingKey(2,h),'2:'+h)
 assert.throws(()=>reviewMappingKey(0,h))
 assert.throws(()=>reviewMappingKey(1,'bad'))
})
test('same-school source registry is an identity ledger, never a list of academically approved textbooks',()=>{
 assert.equal(catalog.academicApproval,false)
 assert.equal(catalog.entries.length,22)
 assert.ok(catalog.entries.every(x=>x.academicApproval===false))
})
test('question and answer revision parity cannot be bypassed by keeping stem unchanged',()=>{
 const {approvedSourceMatchesRevision}=require('../services/grade910AcademicReviewGate')
 const source={
   question_type:'mcq',question_text:'Which branch investigates animal behavior?',
   question_text_urdu:'',options:['Zoology','Botany','Chemistry','Geology'],
   correct_option:'A',answer:'Zoology',explanation:'Zoology studies animals.',marks:1,
 }
 const revision={
   questionType:'mcq',questionText:source.question_text,
   questionTextUrdu:'',options:source.options.map((text,i)=>({label:'ABCD'[i],text})),
   correctOption:'A',answer:'Zoology',
   explanation:'Zoology studies animals.',marks:1,
 }
 assert.equal(approvedSourceMatchesRevision(source,revision),true)
 assert.equal(approvedSourceMatchesRevision(source,{...revision,correctOption:'B'}),false)
 assert.equal(approvedSourceMatchesRevision(source,{...revision,answer:'Botany'}),false)
 assert.equal(approvedSourceMatchesRevision(source,{...revision,marks:2}),false)
 assert.equal(approvedSourceMatchesRevision(source,{...revision,options:[...revision.options.slice(0,3),{label:'D',text:'Physics'}]}),false)
})

test('high-school grade aliases cannot bypass independent approval',()=>{
  assert.equal(normalizeGrade('Grade 9'),9)
  assert.equal(normalizeGrade('Class IX'),9)
  assert.equal(normalizeGrade('Class 10'),10)
  assert.equal(normalizeGrade('Grade X'),10)
  assert.equal(normalizeGrade('Class 8'),null)
})

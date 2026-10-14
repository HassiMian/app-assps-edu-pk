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
test('Biology 9 hashed source is blocked without school-specific adopted edition',()=>{
 assert.throws(()=>normalizeEvidence(evidence,question,{tenantId:1}),{code:'SCHOOL_BOOK_ADOPTION_NOT_CERTIFIED'})
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
 assert.throws(()=>normalizeEvidence(textbook,question,{tenantId:1}),{code:'SCHOOL_BOOK_ADOPTION_NOT_CERTIFIED'})
})
test('review binding is immutable-content-hash and revision scoped',()=>{
 const h='a'.repeat(64)
 assert.equal(reviewMappingKey(2,h),'2:'+h)
 assert.throws(()=>reviewMappingKey(0,h))
 assert.throws(()=>reviewMappingKey(1,'bad'))
})
test('same-school source registry is an identity ledger, never a list of academically approved textbooks',()=>{
 assert.equal(catalog.academicApproval,false)
 assert.equal(catalog.entries.length,110)
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
test('a source with a catalog-only edition cannot pass review evidence',()=>{
 const unresolved=catalog.entries.find(x=>x.edition==='CURRENT_CATALOG_LABEL_NO_SESSION')
 assert.ok(unresolved)
 const q={classLevel:String(unresolved.grade),subject:unresolved.subject,medium:unresolved.medium,chapterNo:'1'}
 const e={...clone(evidence),sourceRecordId:unresolved.recordId,sourcePdfSha256:unresolved.pdfSha256,edition:unresolved.edition}
 assert.throws(()=>normalizeEvidence(e,q),{code:'UNVERIFIED_SOURCE_EDITION'})
})
test('older source-review schema v1 does not automatically inherit new edition/page applicability',()=>{
 const e=clone(evidence)
 e.schemaVersion='assps-grade910-independent-review-v1'
 assert.throws(()=>normalizeEvidence(e,question,{tenantId:1}),{code:'INVALID_REVIEW_SCHEMA'})
})

test('identical source/revision MCQ with an internally contradictory answer never qualifies for release',()=>{
 const {approvedSourceMatchesRevision}=require('../services/grade910AcademicReviewGate')
 const original={
  question_type:'mcq',question_text:'Which particle carries positive electric charge?',
  question_text_urdu:'',options:['Proton','Neutron','Photon','Electron'],
  correct_option:'A',answer:'Electron',explanation:'Synthetic intentionally inconsistent key.',marks:1,
 }
 const rev={
  questionType:'mcq',questionText:original.question_text,questionTextUrdu:'',
  options:original.options.map((text,i)=>({label:'ABCD'[i],text})),
  correctOption:original.correct_option,answer:original.answer,
  explanation:original.explanation,marks:1,
 }
 // Existing source/revision parity alone returns true for this unsafe document.
 assert.equal(approvedSourceMatchesRevision(original,rev),false)
})
test('MCQ structural corruption cannot be approved even when both sides agree on corrupt bytes',()=>{
 const {approvedSourceMatchesRevision}=require('../services/grade910AcademicReviewGate')
 const seed={
  question_type:'mcq',question_text:'Synthetic question text?',question_text_urdu:'',
  options:['Alpha','Beta','Gamma','Delta'],correct_option:'A',
  answer:'Alpha',explanation:'Synthetic.',marks:1,
 }
 const mkRev=x=>({questionType:'mcq',questionText:x.question_text,questionTextUrdu:'',
  options:x.options.map((text,i)=>({label:'ABCD'[i],text})),correctOption:x.correct_option,
  answer:x.answer,explanation:x.explanation,marks:1})
 const bad=[
  {...seed,options:['Alpha','Alpha','Gamma','Delta']},
  {...seed,options:['Alpha','Beta','Gamma']},
  {...seed,correct_option:'E'},
  {...seed,answer:''},
  {...seed,answer:'Beta'},
 ]
 for(const source of bad){
  assert.equal(approvedSourceMatchesRevision(source,mkRev(source)),false)
 }
})

test('review capture requires four distinct A-D choices, an unambiguous selected answer and a question stem',()=>{
 const {requireGrade910McqIntegrity,grade910McqIntegrityIssues}=require('../services/grade910AcademicReviewGate')
 const base={questionType:'mcq',questionText:'Which statement is valid?',marks:1,
  options:[{label:'A',text:'Proton'},{label:'B',text:'Neutron'},
           {label:'C',text:'Electron'},{label:'D',text:'Photon'}],
  correctOption:'A',answer:'Proton'}
 assert.equal(requireGrade910McqIntegrity(base),true)
 assert.deepEqual(grade910McqIntegrityIssues(base),[])
 for(const broken of [
  {...base,questionText:''},
  {...base,correctOption:'D',answer:'Proton'},
  {...base,correctOption:'E'},
  {...base,options:base.options.slice(0,3)},
  {...base,options:base.options.map((x,i)=>i===2?{...x,label:'B'}:x)},
  {...base,options:base.options.map((x,i)=>i===2?{...x,text:'PROTON'}:x)},
  {...base,answer:'Not an option'},
 ]){
  assert.throws(()=>requireGrade910McqIntegrity(broken),
    {code:'ACADEMIC_MCQ_ANSWER_OPTION_INCONSISTENT'})
 }
})
test('scientific notation 1+ vs 1- remains distinct when comparing MCQ answers',()=>{
 const {grade910McqIntegrityIssues}=require('../services/grade910AcademicReviewGate')
 const base={questionType:'mcq',questionText:'Which is a cation?',correctOption:'A',answer:'1+',
  options:[{label:'A',text:'1+'},{label:'B',text:'1-'},{label:'C',text:'2-'},{label:'D',text:'0'}]}
 assert.deepEqual(grade910McqIntegrityIssues(base),[])
 assert.ok(grade910McqIntegrityIssues({...base,answer:'1-'}).includes('MCQ_STORED_ANSWER_NOT_SELECTED_OPTION'))
 const variant={questionType:'short',questionText:'Why are cations positive?',answer:'Lost an electron'}
 assert.deepEqual(grade910McqIntegrityIssues(variant),[])
})

test('grade IX/X short/long/numerical revision cannot be academically cleared with a matching blank answer',()=>{
 const {approvedSourceMatchesRevision}=require('../services/grade910AcademicReviewGate')
 const cases=['short','long','numerical']
 for(const type of cases){
  const legacy={question_type:type,question_text:'Explain the principle.',question_text_urdu:'',
   options:[],correct_option:'',answer:'',explanation:'',marks:2}
  const revision={questionType:type,questionText:legacy.question_text,questionTextUrdu:'',
   options:[],correctOption:'',answer:'',explanation:'',marks:2}
  assert.equal(approvedSourceMatchesRevision(legacy,revision),false,`matching empty answer must not clear ${type}`)
 }
})
test('revision-bound academic gate rejects invalid marks and missing question text for any type',()=>{
 const {approvedSourceMatchesRevision}=require('../services/grade910AcademicReviewGate')
 const legacy={question_type:'short',question_text:'Describe evaporation.',question_text_urdu:'',
  options:[],correct_option:'',answer:'Liquid particles escape the surface.',explanation:'',marks:2}
 const revision={questionType:'short',questionText:legacy.question_text,
  questionTextUrdu:'',options:[],correctOption:'',answer:legacy.answer,explanation:'',marks:2}
 assert.equal(approvedSourceMatchesRevision(legacy,revision),true)
 for(const marks of [0,-2,1.5,null,'',null]){
  assert.equal(approvedSourceMatchesRevision({...legacy,marks},{...revision,marks}),false)
 }
 assert.equal(approvedSourceMatchesRevision({...legacy,question_text:''},{...revision,questionText:''}),false)
 assert.equal(approvedSourceMatchesRevision({...legacy,question_type:''},{...revision,questionType:''}),false)
})
test('non-MCQ integrity helper blocks incomplete question independently of school edition',()=>{
 const {requireGrade910MinimumQuestionIntegrity}=require('../services/grade910AcademicReviewGate')
 for(const change of [{answer:''},{questionText:'',questionTextUrdu:''},{marks:0},{marks:2.5},{questionType:''}]){
  assert.throws(()=>requireGrade910MinimumQuestionIntegrity({
   questionType:'long',questionText:'Describe a physical process.',marks:5,answer:'An answer.',...change,
  }),{code:'ACADEMIC_QUESTION_INCOMPLETE'})
 }
 assert.equal(requireGrade910MinimumQuestionIntegrity({
  questionType:'short',questionTextUrdu:'توانائی کیا ہے؟',marks:2,answer:'توانائی کام کرنے کی صلاحیت ہے۔'
 }),true)
})

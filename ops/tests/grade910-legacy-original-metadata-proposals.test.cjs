'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const m=require('../qbank/propose-grade910-original-metadata-remediation.cjs')
let memo
const rows=()=>memo??(memo=m.build())
test('all 50 exact SHA-bound original language metadata gaps have non-mutating proposals',()=>{
 const r=rows()
 assert.equal(r.rows.length,50)
 assert.equal(r.originalQuestionMediumUnstatedCount,50)
 assert.equal(r.sourceInferredEnglishCompetencyGradeAndSubjectCount,44)
 assert.equal(r.sourceInferredBiologyLanguageCount,6)
 assert.equal(r.sourceBiologyBilingualDrafts,2)
 assert.equal(r.sourceBiologyEnglishOnlyDrafts,4)
 assert.equal(new Set(r.rows.map(x=>x.originalQuestionId)).size,50)
 assert.ok(r.rows.every(x=>/^[a-f0-9]{64}$/.test(x.originalQuestionRevisionSha256)))
 assert.ok(r.rows.every(x=>x.existingClaim.medium===null))
 assert.ok(r.rows.every(x=>x.academicResearchProposalOnly.actualSchoolEditionAndExamYear==='UNVERIFIED'))
 assert.equal(r.originalQuestionsChanged,0)
 assert.equal(r.academicallyApproved,0)
})
test('the 44 legacy English competency sources retain absent original per-question pdf SHA',()=>{
 const x=rows().rows.filter(x=>x.academicResearchProposalOnly.subject==='english')
 assert.equal(x.length,44)
 assert.equal(x.filter(x=>x.existingClaim.questionPdfSha256===null).length,44)
 assert.ok(x.every(x=>x.academicResearchProposalOnly.grade===9))
 assert.ok(x.every(x=>x.academicResearchProposalOnly.medium==='english'))
 assert.ok(x.every(x=>x.academicResearchProposalOnly.catalogPdfSha256ForContextOnly.length===64))
})
test('24 English MCQ answer-position inference is unique string matching, not approval',()=>{
 const x=rows().rows.filter(x=>x.academicResearchProposalOnly.originalMcqPositionFromMatchingAnswerText)
 assert.equal(x.length,24)
 assert.ok(x.every(x=>'ABCD'.includes(x.academicResearchProposalOnly.originalMcqPositionFromMatchingAnswerText)))
 assert.ok(x.every(x=>x.academicResearchProposalOnly.originalAnswerAcademicallyCorrect==='UNVERIFIED'))
 assert.ok(x.every(x=>x.academicResearchProposalOnly.originalRevisionMutationAuthorized===false))
})
test('both bilingual Biology candidates retain Urdu language audit and four English-only remain distinct',()=>{
 const x=rows().rows.filter(x=>x.academicResearchProposalOnly.subject==='biology')
 assert.equal(x.filter(y=>y.academicResearchProposalOnly.medium==='dual').length,2)
 assert.equal(x.filter(y=>y.academicResearchProposalOnly.medium==='english').length,4)
 assert.ok(x.every(y=>y.academicResearchProposalOnly.independentReviewerAndSubjectApproval==='REQUIRED'))
})
test('research dossier is deterministic and no question text or answer reproduced',()=>{
 const saved=JSON.parse(fs.readFileSync(m.OUT,'utf8'))
 assert.deepEqual(saved,rows())
 const text=JSON.stringify(saved)
 assert.ok(!text.includes('If the library opens early tomorrow'))
 assert.ok(saved.rows.every(x=>!Object.hasOwn(x,'stem')&&!Object.hasOwn(x,'options')&&!Object.hasOwn(x,'answer')))
 assert.match(fs.readFileSync(m.TXT,'utf8'),/Original changes: 0/)
})
test('invalid legacy or Biology input cannot be accepted as a clean source proposal',()=>{
 const r=rows().rows.find(q=>q.academicResearchProposalOnly.subject==='english')
 assert.throws(()=>m.proposal({id:r.originalQuestionId,stem:'test',answer:'Z',type:'mcq',options:['a','b','c','d']},
  {originalQuestionId:r.originalQuestionId,originalSourceFile:'english9CompetencyOriginals2026.json',
   originalSourceCatalogId:'pectaa-catalog-004',gradeClaim:null,subjectClaim:null},
  {recordId:'pectaa-catalog-004',grade:9,subject:'English',pdfSha256:'a'.repeat(64)}),/LEGACY_MCQ_ANSWER_NO_UNIQUE_TEXT_POSITION/)
})

'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const m=require('../qbank/audit-grade910-school-session-edition-claims.cjs')
let cache
const current=()=>cache??(cache=m.make())
test('all 111 source edition labels are reconciled to 2581 original frozen research references',()=>{
 const x=current()
 assert.equal(x.originalResearchCandidates,2581)
 assert.equal(x.sourceCatalogRecords,111)
 assert.equal(x.records.length,111)
 assert.equal(new Set(x.records.map(z=>z.catalogId)).size,111)
 assert.equal(x.records.reduce((s,r)=>s+r.originalQuestionCount,0),2581)
})
test('publisher edition label year is never treated as school adoption or Annual Exam 2027 scheme proof',()=>{
 const x=current()
 assert.equal(x.onlyPublicationIssuerLabel2026_27NotSchoolAdoption,599)
 assert.equal(x.originalQuestionsWithGradeIXCatalog2025_26Label,844)
 assert.equal(x.recordCountsByEditionStatus.CROSS_GRADE_NO_ASSPS_CLASS_CERTIFICATE.originalQuestionCount,70)
 assert.equal(x.source2026AnnualExamALPNotAutomaticallyExam2027,true)
 assert.equal(x.academicallyApproved,0)
 assert.equal(x.verifiedPublished,0)
 assert.equal(x.paperStudioSelectable,0)
 assert.equal(x.actualSchoolAdoptedBookEvidenceCount,0)
 assert.equal(x.teacherAnswerCorrectnessVerifiedCount,0)
 assert.ok(x.records.every(r=>r.ASSPS2026_27AdoptedEditionVerified===false))
 assert.ok(x.records.every(r=>r.confirmedRelevantAnnualBoardExamYear===null))
})
test('source date labels and cross-grade source flags cannot grant school-verified exam-year status',()=>{
 assert.equal(m.category({gradeCatalogClaim:9,editionCatalogLabel:'2025-26'}),
  'CATALOG_LABEL_2025_26_ASSPS_2026_27_APPLICABILITY_UNKNOWN')
 assert.equal(m.category({gradeCatalogClaim:10,editionCatalogLabel:'2026-27'}),
  'CATALOG_LABEL_EXPLICIT_2026_27_BUT_ASSPS_ADOPTION_UNKNOWN')
 assert.equal(m.category({gradeCatalogClaim:0,editionCatalogLabel:'2023-24'}),
  'CROSS_GRADE_NO_ASSPS_CLASS_CERTIFICATE')
 assert.equal(m.category({gradeCatalogClaim:9,editionCatalogLabel:'2026-09-03'}),
  'OTHER_HISTORICAL_OR_DATED_CATALOG_LABEL_UNCERTIFIED')
})
test('public year applicability report reproducible and contains no copied textbook source stems or answers',()=>{
 const x=current(),stored=JSON.parse(fs.readFileSync(m.OUT,'utf8'))
 assert.deepEqual(x,stored)
 assert.equal(m.markdown(x),fs.readFileSync(m.NOTE,'utf8'))
 assert.ok(x.records.every(r=>!Object.hasOwn(r,'question')&&!Object.hasOwn(r,'answer')))
})

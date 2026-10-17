'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { ledger, validateResearchLedger, classifySyllabusEvidence: classify } =
  require('../qbank/grade910-2027-syllabus-evidence-firewall.cjs')
const base = {sourceId:'pectaa-revised-grade9-alp-annual2026',syllabusMode:'alp',examYear:2027,grade:9,stream:'general'}
const run = changes => classify({...base,...changes})
const denied = result => {
  assert.equal(result.status,'RESEARCH_EVIDENCE_HOLD')
  for (const k of ['paperStudioVerifiedSelectable','academicallyApproved',
    'autoExcludeChaptersOrExercises','schoolAdoptionVerified','originalPdfByteSha256Verified']) {
    assert.equal(result[k],false)
  }
  assert.equal(Object.isFrozen(result),true)
  assert.equal(Object.isFrozen(result.reasons),true)
}
test('five public records have no academic approval',()=>{
  assert.equal(validateResearchLedger(),true)
  assert.equal(ledger.records.length,5)
  assert.equal(ledger.facultyRevisionApprovalCount,0)
  for(const r of ledger.records) {
    assert.equal(r.schoolAdoptionAuthenticated,false)
    assert.equal(r.originalPdfByteSha256,null)
    assert.equal(r.originalPdfBytesVerified,false)
    assert.equal(Object.isFrozen(r),true)
  }
})
const scenarios = [
 ['2026 ALP cannot apply to Annual 2027',{},'SOURCE_ANNUAL_EXAM_YEAR_MISMATCH'],
 ['2026 ALP no false review even matching year',{examYear:2026},'INDEPENDENT_FACULTY_REVISION_APPROVAL_ABSENT'],
 ['2026 IX ALP cannot apply to X',{grade:10,examYear:2026},'SOURCE_GRADE_MISMATCH'],
 ['PECTAA 2026-27 catalog is not school adoption',{sourceId:'pectaa-2026-27-books-index'},'CATALOG_LABEL_NOT_SCHOOL_ADOPTION'],
 ['catalog cannot be an ALP',{sourceId:'pectaa-2026-27-books-index'},'NOT_AN_ALP_NOTIFICATION'],
 ['BISE Lahore syllabus index not Annual 2027 ALP',{sourceId:'bise-lahore-2025-27-ssc-index'},'BOARD_INDEX_NOT_2027_ALP'],
 ['NCC not Gujranwala exam scheme',{sourceId:'ncc-national-learning-outcomes-index'},'NATIONAL_OUTCOMES_NOT_BOARD_SCHEME'],
 ['Tech pairing is not ALP',{sourceId:'pectaa-grade9-tech-model-annual2026',stream:'matric-tech'},'MATRIC_TECH_PAIRING_IS_NOT_ALP'],
 ['Tech pairing has wrong 2027 year',{sourceId:'pectaa-grade9-tech-model-annual2026',stream:'matric-tech'},'SOURCE_ANNUAL_EXAM_YEAR_MISMATCH'],
 ['Tech stream cannot be assumed for school',{sourceId:'pectaa-grade9-tech-model-annual2026',examYear:2026},'MATRIC_TECH_STREAM_NOT_AUTHENTICATED'],
 ['unknown source rejected despite claim',{sourceId:'FAKE',reviewed:true,approved:true},'SOURCE_NOT_IN_TRUSTED_LEDGER'],
 ['unknown syllabus mode rejected',{syllabusMode:'partial'},'INVALID_SYLLABUS_MODE'],
 ['unknown source ID rejected',{sourceId:undefined},'SOURCE_NOT_IN_TRUSTED_LEDGER'],
 ['grade required',{grade:undefined},'GRADE_NOT_VERIFIED'],
 ['year required',{examYear:undefined},'EXAM_YEAR_NOT_VERIFIED'],
 ['invalid year 0',{examYear:0},'EXAM_YEAR_NOT_VERIFIED'],
 ['fractional year',{examYear:2027.5},'EXAM_YEAR_NOT_VERIFIED'],
 ['grade eight invalid',{grade:8},'GRADE_NOT_VERIFIED'],
 ['grade eleven invalid',{grade:11},'GRADE_NOT_VERIFIED'],
 ['2026 ALP cannot be used for 2028',{examYear:2028},'SOURCE_ANNUAL_EXAM_YEAR_MISMATCH']
]
for(const [name,change,reason] of scenarios) test(name,()=>{
  const result=run(change)
  denied(result)
  assert.ok(result.reasons.includes(reason),reason)
})
test('a caller cannot authenticate school or faculty with flags',()=>{
  denied(run({schoolAdoptionEvidence:true,facultyApproved:true,authenticSignedReceipt:true,schoolId:1}))
})
test('a caller cannot promote a current question by client SHA',()=>{
  denied(run({currentLiveRevisionSha256:'a'.repeat(64),paperStudioVerifiedSelectable:true}))
})
test('full mode is only a research default',()=>{
  const r=run({syllabusMode:'full',sourceId:'pectaa-2026-27-books-index'})
  denied(r)
  assert.equal(r.researchDefault,'FULL_BOOK_RESEARCH_ONLY')
})
test('teacher ALP request does not silently become full exam',()=>{
  const r=run()
  denied(r)
  assert.equal(r.researchDefault,'DO_NOT_SILENTLY_SUBSTITUTE_FULL_FOR_ALP')
})
test('even matching 2026 Tech evidence does not approve',()=>{
  denied(run({sourceId:'pectaa-grade9-tech-model-annual2026',examYear:2026,stream:'matric-tech',syllabusMode:'full'}))
})
const poison = (description, mutate, pattern) => test(description,()=>{
  const copy=structuredClone(ledger)
  mutate(copy)
  assert.throws(()=>validateResearchLedger(copy),pattern)
})
poison('forged textbook adoption denied',x=>{x.records[2].schoolAdoptionAuthenticated=true},/PROVENANCE_ASSERTION_REFUSED/)
poison('forged PDF checksum denied',x=>{x.records[0].originalPdfByteSha256='f'.repeat(64)},/PROVENANCE_ASSERTION_REFUSED/)
poison('forged faculty approval denied',x=>{x.facultyRevisionApprovalCount=1},/RELEASE_ASSERTION_REFUSED/)
poison('forged publication denied',x=>{x.verifiedPublicationAllowed=true},/RELEASE_ASSERTION_REFUSED/)
poison('original 2025/376 ID cannot be silently replaced',x=>{x.records[0].notificationId='FAKE'},/2026_YEAR_IDENTITY_REFUSED/)
poison('Annual-2026 ALP cannot be retargeted to 2027',x=>{x.records[0].applicableAnnualExamYear=2027},/2026_YEAR_IDENTITY_REFUSED/)
poison('duplicate authority IDs denied',x=>{x.records[1].id=x.records[0].id},/PROVENANCE_ASSERTION_REFUSED/)
poison('source record deletion denied',x=>{x.records.pop()},/RELEASE_ASSERTION_REFUSED/)
test('existing independently reviewed runtime ALP eligibility code not modified',()=>{
 const p=path.join(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/syllabusPolicy.mjs')
 const data=fs.readFileSync(p,'utf8')
 assert.match(data,/s\.examYear!==examYear/)
 assert.match(data,/syllabusScope/)
})

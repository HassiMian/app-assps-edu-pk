const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const base=path.join(__dirname,'../services/papers/curriculumReviewedEvidenceV6G2')
const en=require(path.join(base,'biology9EnglishEvidenceLedger.json'))
const ur=require(path.join(base,'biology9UrduEvidenceLedger.json'))
const map=require(path.join(base,'biology9Chapter1QuestionPageMapV6G5.json'))
function expected(ledger){
 const rows=[]
 for(const s of ledger.chapters[0].exercise.sections){
  for(const ref of s.questionSourceRefs||[]) rows.push({ref,section:s.label,min:s.firstPhysicalPage,max:s.lastPhysicalPage})
 }
 return rows
}
function verifyMedium(name,ledger){
 const exp=expected(ledger)
 const actual=map.sources[name].items
 assert.equal(actual.length,exp.length)
 const byRef=new Map(actual.map(x=>[x.sourceRef,x]))
 for(const e of exp){
  const a=byRef.get(e.ref)
  assert.ok(a,`missing ${name} ${e.ref}`)
  assert.equal(a.section,e.section)
  assert.ok(a.verifiedPhysicalPage>=e.min&&a.verifiedPhysicalPage<=e.max,`${e.ref} page outside declared section range`)
  assert.equal(a.verificationStatus,'VISUALLY_VERIFIED_EXACT_PAGE')
  assert.equal('questionText' in a,false)
 }
 assert.equal(byRef.size,exp.length)
}
test('English Chapter 1 exact page map covers every source ref without copied question text',()=>verifyMedium('English',en))
test('Urdu Chapter 1 exact page map covers every source ref without copied question text',()=>verifyMedium('Urdu',ur))
test('G5 summary is 50/50 exact and source ledgers remain immutable',()=>{
 assert.equal(map.summary.englishItems,25)
 assert.equal(map.summary.urduItems,25)
 assert.equal(map.summary.totalItems,50)
 assert.equal(map.summary.exactPageMappings,50)
 assert.equal(map.summary.questionTextIncluded,0)
 assert.equal(map.policy.sourceLedgersMutated,false)
 assert.equal(map.summary.sectionRangeCorrectionsRequired,0)
})

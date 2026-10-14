'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {audit,markdown}=require('../qbank/audit-chemistry10-conceptual-review.cjs')
const ROOT=path.resolve(__dirname,'../..')
const FILE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry10Starter2026.json')
const rawBytes=fs.readFileSync(FILE)
const source=JSON.parse(rawBytes)
const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')))
const run=(q=source,raw=rawBytes,r=registry)=>audit({source:q,rawBytes:raw,registry:r})
test('65 real Grade X Chemistry items retained in exact 26/26/13 types with 6 editorial-only flags',()=>{
 const r=run()
 assert.equal(r.provisionalQuestionCount,65)
 assert.deepEqual(r.questionTypes,{mcq:26,short:26,long:13})
 assert.equal(r.proposedIndependentReviewCount,6)
 assert.equal(r.sourcePageHumanVerifiedCount,0)
 assert.equal(r.answerHumanVerifiedCount,0)
 assert.equal(r.approvedCount,0)
 assert.equal(r.findings.length,6)
 assert.equal(new Set(r.findings.map(x=>x.questionId)).size,6)
 assert.ok(r.findings.every(x=>x.originalQuestionSha256.length===64 &&
   x.academicApprovalGranted===false&&x.independentReviewerId===null&&
   x.answerAccuracyIndependentlyHumanVerified===false&&
   x.proposalStatus.startsWith('PENDING_INDEPENDENT_')))
})
test('original question text and answer content are NOT copied into metadata-only review outputs',()=>{
 const report=run()
 const prose=markdown(report)
 assert.ok(prose.includes('original questions/answers unchanged'))
 assert.ok(!prose.includes(source.drafts[0].stem))
 assert.ok(!JSON.stringify(report).includes(source.drafts[0].stem))
 assert.equal(report.findings.find(x=>x.questionId==='X-CHEM-C15-M02').reviewType,
   'UNVERIFIED_TEXTBOOK_CONDITION_AND_PRESSURE')
 assert.equal(report.findings.find(x=>x.questionId==='X-CHEM-C18-M01').reviewType,'SALT_DEFINITION_OVERBROAD')
})
test('fake published status or live import cannot be used as an editorial evidence input',()=>{
 for(const key of ['publicationAllowed','liveImportAllowed']){
  const tampered=structuredClone(source)
  tampered[key]=true
  assert.throws(()=>run(tampered),/CHEM10_STALE_OR_CHANGED_ORIGINAL/)
 }
})
test('a modified existing answer cannot silently inherit manually assessed editorial observations',()=>{
 const tampered=structuredClone(source)
 tampered.drafts.find(q=>q.id==='X-CHEM-C15-M02').answer='Changed answer by another agent'
 assert.throws(()=>run(tampered,Buffer.from(JSON.stringify(tampered))),/CHEM10_STALE_OR_CHANGED_ORIGINAL/)
})
test('an unflagged original draft changing should invalidate corpus-level editorial review snapshot',()=>{
 const tampered=structuredClone(source)
 tampered.drafts.find(q=>q.id==='X-CHEM-C24-M02').answer='Changed to unreviewed answer'
 assert.throws(()=>run(tampered,Buffer.from(JSON.stringify(tampered))),/CHEM10_STALE_OR_CHANGED_ORIGINAL/)
})
test('source PDF identity drift refuses incorrectly classified Grade X Chemistry evidence',()=>{
 const tampered=structuredClone(source);tampered.sourcePdfSha256='0'.repeat(64)
 assert.throws(()=>run(tampered),/CHEM10_STALE_OR_CHANGED_ORIGINAL/)
})
test('tampered per-question official PDF ID and hash do not count as grade-specific evidence',()=>{
 const tampered=structuredClone(source)
 tampered.drafts[1].source.pdfSha256='0'.repeat(64)
 assert.throws(()=>run(tampered),/CHEM10_STALE_OR_CHANGED_ORIGINAL/)
})
test('duplicate/question type changes never inflate or silently replace the 65-question source population',()=>{
 let tampered=structuredClone(source)
 tampered.drafts[1].id=tampered.drafts[0].id
 assert.throws(()=>run(tampered),/CHEM10_STALE_OR_CHANGED_ORIGINAL/)
 tampered=structuredClone(source);tampered.drafts[0].type='essay'
 assert.throws(()=>run(tampered),/CHEM10_STALE_OR_CHANGED_ORIGINAL/)
})
test('missing target question cannot transfer an editorial flag onto the wrong Grade X Chemistry ID',()=>{
 const tampered=structuredClone(source)
 tampered.drafts.find(q=>q.id==='X-CHEM-C15-M02').id='X-CHEM-C15-M02-NEW'
 assert.throws(()=>run(tampered),/CHEM10_REVIEW_CANDIDATE_NOT_IN_CORPUS|CHEM10_STALE_OR_CHANGED_ORIGINAL/)
})

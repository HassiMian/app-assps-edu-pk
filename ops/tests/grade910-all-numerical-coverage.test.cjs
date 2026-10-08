'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const path=require('node:path')
const fs=require('node:fs')
const {GROUPS,audit,baselineCandidate}=require('../qbank/audit-additional-grade910-numericals.cjs')
const {audit:coreAudit}=require('../qbank/audit-core-grade910-numerical-answers.cjs')
const {auditMathNumericals}=require('../qbank/audit-math10-numerical-answers.cjs')
const DIR=path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const GOLDEN=require('../qbank/grade910-other-numerical-golden-sha-20261008.json')
const doc=f=>JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'))
test('all 37 remaining original numerical questions mathematically recalculate and match stored answers',()=>{
 const r=audit()
 assert.equal(r.records,37)
 assert.equal(r.passed,37)
 assert.equal(r.failed,0)
 assert.deepEqual([r.sourceVerified,r.humanReviewed,r.approved,r.published],[0,0,0,0])
 assert.ok(r.results.every(x=>x.passed && !x.academicHumanApproved && !x.sourcePageVerified))
})
test('golden source SHA ledger covers 37 stable IDs, 7 files and refuses silent question changes',()=>{
 const all=Object.values(GROUPS).flatMap(xs=>xs.map(x=>x[0]))
 assert.equal(all.length,37)
 assert.equal(new Set(all).size,37)
 assert.deepEqual(baselineCandidate(),GOLDEN)
 for(const [file,rows] of Object.entries(GROUPS))
  assert.deepEqual(new Set(rows.map(r=>r[0])),new Set(doc(file).drafts.filter(q=>q.type==='numerical').map(q=>q.id)))
})
test('negative Urdu-language stored answer change fails even if numeric formula remains valid',()=>{
 const file='physicsTech9DualStarter2026.json'
 const changed=doc(file)
 const q=changed.drafts.find(q=>q.id==='IX-PHT-U-C03-N01')
 q.content.ur.answer='F=ma=7N۔'
 const r=audit({documents:{[file]:changed}})
 assert.equal(r.passed,36)
 const finding=r.results.find(x=>x.questionId===q.id)
 assert.equal(finding.sourceRevisionMatches,false)
 assert.equal(finding.independentlyRecomputed,true)
 assert.equal(finding.savedAnswerCrosscheck,false)
})
test('negative chemical molecular-count answer and wrong mathematics inverse are not auto-approved',()=>{
 const file='chemistry9Chapter4EnglishDrafts2026.json'
 const changed=doc(file)
 changed.drafts.find(q=>q.id==='IX-CHEM-2025-C04-T06-N17').content.en.answer='3.02 × 10^23 molecules'
 const r=audit({documents:{[file]:changed}})
 assert.equal(r.failed,1)
 const one=r.results.find(x=>x.questionId==='IX-CHEM-2025-C04-T06-N17')
 assert.equal(one.savedAnswerCrosscheck,false)
 assert.equal(one.academicHumanApproved,false)
})
test('numerical stem revisions invalidate cached calculation evidence',()=>{
 const file='mathematics10Starter2026.json',changed=doc(file)
 changed.drafts.find(x=>x.id==='X-MATH-C12-N01').content.en.stem='Edited problem with new probabilities.'
 const r=audit({documents:{[file]:changed}})
 assert.equal(r.passed,36)
 assert.equal(r.results.find(x=>x.questionId==='X-MATH-C12-N01').sourceRevisionMatches,false)
})
test('all 91 numericals in original authoring corpus are covered exactly once across three disjoint batches',()=>{
 const remaining=audit().results
 const core=coreAudit().results
 const original10=doc('mathematics10OriginalReasoningBatch2026.json')
 const earlier=auditMathNumericals(original10).results
 const combined=[...remaining,...core,...earlier]
 assert.equal(combined.length,91)
 assert.equal(new Set(combined.map(x=>x.questionId)).size,91)
 assert.ok(combined.every(x=>x.passed || x.mechanicalCheckPassed))
 // Detect any unaccounted numeric draft across every original authoring JSON document.
 let universe=[]
 for(const file of fs.readdirSync(DIR).filter(x=>x.endsWith('.json'))){
  let d
  try{d=doc(file)}catch{continue}
  for(const q of [...(d.drafts||[]),...(d.items||[])])
   if(q.type==='numerical'&&q.id)universe.push(q.id)
 }
 assert.equal(universe.length,91)
 assert.deepEqual(new Set(combined.map(x=>x.questionId)),new Set(universe))
})
test('a new extra numerical question cannot be silently ignored by existing batch',()=>{
 const file='physicsTech10EnglishStarter2026.json',changed=doc(file)
 changed.drafts.push({...changed.drafts.find(q=>q.type==='numerical'),id:'X-TECH-EXTRA-UNREVIEWED'})
 assert.throws(()=>audit({documents:{[file]:changed}}),/UNACCOUNTED_NUMERICAL/)
})

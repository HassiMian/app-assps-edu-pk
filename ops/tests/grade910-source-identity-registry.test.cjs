'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {build}=require('../qbank/reconcile-grade910-source-identity-registry.cjs')
const manifest=require('../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
const ledger=require('../qbank/catalog-hash-ledger-20261008.json')
const registry=require('../../al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
test('all catalog identities reconcile with source 037 quarantined',()=>{
 const r=build({manifest,ledger,prior:registry,hasCacheRef:ref=>Boolean(ref)})
 assert.equal(r.entries.length,110)
 assert.deepEqual(r.quarantinedSourceIds,['pectaa-catalog-037'])
 assert.equal(r.report.approved,0)
 assert.equal(r.report.published,0)
})
test('published registry contains only identity metadata, not academic approval',()=>{
 assert.equal(registry.entries.length,110)
 assert.equal(new Set(registry.entries.map(x=>x.recordId)).size,110)
 assert.ok(registry.entries.every(x=>x.academicApproval===false))
 assert.equal(registry.editionAdoptionCertification,false)
 assert.equal(registry.questionPageExerciseVerification,false)
 assert.equal(registry.cacheBytesRehashedByThisBuilder,false)
})
test('manifest and hash ledger remain in exact agreement',()=>{
 const m=new Map(manifest.entries.map(x=>[x.recordId,x]))
 const l=new Map(ledger.entries.map(x=>[x.recordId,x]))
 for(const r of registry.entries){
  assert.equal(r.pdfSha256,m.get(r.recordId).pdfSha256)
  assert.equal(r.pdfSha256,l.get(r.recordId).pdfSha256)
  assert.equal(r.edition,m.get(r.recordId).edition)
 }
})

'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {chooseCacheRef,reconcile}=require('../qbank/reconcile-verified-source-cache-refs.cjs')
const row=(recordId,matches)=>({recordId,matchingCachedPdfs:matches})
test('source cache relocation selects exact hash-matched record-specific copy and preserves original reference',()=>{
 const m={entries:[{recordId:'pectaa-catalog-004',pdfSha256:'a'.repeat(64),sourceCacheRef:'20261006/english9.pdf',chapterIndexStatus:'PENDING',academicApproved:false}]}
 const i={catalog:[row('pectaa-catalog-004',['20261008/official-verified/pectaa-catalog-004.pdf'])]}
 const r=reconcile(m,i,{apply:true})
 assert.equal(r.updated,1)
 assert.equal(m.entries[0].sourceCacheRef,'20261008/official-verified/pectaa-catalog-004.pdf')
 assert.deepEqual(m.entries[0].sourceCacheRefHistory,['20261006/english9.pdf'])
 assert.equal(m.entries[0].chapterIndexStatus,'PENDING')
 assert.equal(m.entries[0].academicApproved,false)
})
test('dry-run leaves manifest untouched and missing hashes fail closed',()=>{
 const e={recordId:'pectaa-catalog-037',pdfSha256:null}
 assert.equal(chooseCacheRef(e,null).status,'SOURCE_UNRESOLVED')
 const manifest={entries:[{recordId:'pectaa-catalog-004',pdfSha256:'a'.repeat(64),sourceCacheRef:'old.pdf'}]}
 const r=reconcile(manifest,{catalog:[row('pectaa-catalog-004',['match.pdf'])]})
 assert.equal(r.updated,1)
 assert.equal(manifest.entries[0].sourceCacheRef,'old.pdf')
 assert.equal(chooseCacheRef(manifest.entries[0],row('pectaa-catalog-004',[])).status,'MISSING_HASH_MATCH')
})
test('existing matching cache refs are not edited, even with duplicate byte-identical copies',()=>{
 const e={recordId:'pectaa-catalog-047',pdfSha256:'a'.repeat(64),sourceCacheRef:'copy.pdf'}
 const r=reconcile({entries:[e]},{catalog:[row(e.recordId,['copy.pdf','duplicate.pdf'])]},{apply:true})
 assert.equal(r.valid,1);assert.equal(r.updated,0);assert.equal(e.sourceCacheRef,'copy.pdf')
})

'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const crypto=require('node:crypto')
const {attest,hashStream,pathWithin}=require('../qbank/reattest-grade910-source-bytes.cjs')
const canonicalManifest=require('../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
const canonicalLedger=require('../qbank/catalog-hash-ledger-20261008.json')
const SHA=v=>crypto.createHash('sha256').update(v).digest('hex')
const fixture=()=> {
 const cacheRoot=fs.mkdtempSync(path.join(os.tmpdir(),'assps-pdf-byte-check-'))
 const bytes=Buffer.from('%PDF-1.7\n'+'source-evidence-test-not-a-book'.repeat(10)+'\n%%EOF')
 fs.writeFileSync(path.join(cacheRoot,'book.pdf'),bytes)
 const manifest=structuredClone(canonicalManifest)
 const ledger=structuredClone(canonicalLedger)
 for(let i=0;i<111;i++){
  const digest=i===0?SHA(bytes):null
  manifest.entries[i].pdfSha256=digest
  manifest.entries[i].sourceCacheRef=i===0?'book.pdf':null
  ledger.entries[i].pdfSha256=digest
 }
 return {cacheRoot,bytes,manifest,ledger,clean:()=>fs.rmSync(cacheRoot,{recursive:true,force:true})}
}
test('streamed byte hash matches actual file bytes and PDF magic',async()=>{
 const x=fixture()
 try{
  const h=await hashStream(path.join(x.cacheRoot,'book.pdf'))
  assert.equal(h.sha256,SHA(x.bytes))
  assert.equal(h.bytes,x.bytes.length)
  assert.equal(h.pdfMagic,true)
 }finally{x.clean()}
})
test('full manifest contract remains 111 records and reports no academic approval on synthetic bytes',async()=>{
 const x=fixture()
 try{
  const a=await attest(x)
  assert.equal(a.verifiedSourceCount,1)
  assert.equal(a.uncheckedSourceCount,110)
  assert.equal(a.mismatches,0)
  assert.equal(a.bytesRead,x.bytes.length)
  assert.equal(a.questionSourceVerified,0)
  assert.equal(a.humanReviewApproved,0)
  assert.equal(a.published,0)
 }finally{x.clean()}
})
test('tampered cached bytes are detected as a hash mismatch rather than silently trusted',async()=>{
 const x=fixture()
 try{
  fs.appendFileSync(path.join(x.cacheRoot,'book.pdf'),'tampered')
  const a=await attest(x)
  assert.equal(a.mismatches,1)
  assert.equal(a.summary.SHA256_MISMATCH,1)
 }finally{x.clean()}
})
test('PDF magic must be real even if ledger hash matches bytes',async()=>{
 const x=fixture()
 try{
  const fake=Buffer.from('BAD-FILE-HEADER'.repeat(15))
  fs.writeFileSync(path.join(x.cacheRoot,'book.pdf'),fake)
  x.manifest.entries[0].pdfSha256=SHA(fake)
  x.ledger.entries[0].pdfSha256=SHA(fake)
  const a=await attest(x)
  assert.equal(a.mismatches,1)
  assert.equal(a.summary.PDF_HEADER_INVALID,1)
 }finally{x.clean()}
})
test('metadata conflicts and cache path traversal fail closed',async()=>{
 const x=fixture()
 try{
  x.manifest.entries[0].grade=8
  await assert.rejects(()=>attest(x),/SOURCE_METADATA_LEDGER_DRIFT/)
  x.manifest.entries[0].grade=x.ledger.entries[0].grade
  x.manifest.entries[0].sourceCacheRef='../outside.pdf'
  await assert.rejects(()=>attest(x),/SOURCE_PATH_OUTSIDE_CACHE/)
  assert.throws(()=>pathWithin(x.cacheRoot,'../../etc/passwd'),/SOURCE_PATH_OUTSIDE_CACHE/)
 }finally{x.clean()}
})

const test=require('node:test')
const assert=require('node:assert/strict')
const {summarizeHashes}=require('../qbank/audit-cached-pdf-inventory.cjs')
test('only exact verified SHA links cached PDFs to catalog records',()=>{
  const out=summarizeHashes([{relative:'a.pdf',sha256:'abc'},{relative:'b.pdf',sha256:'def'}],[
    {recordId:'A',pdfSha256:'abc',grade:9},
    {recordId:'B',pdfSha256:'xyz',grade:10},
    {recordId:'C',pdfSha256:null,grade:10},
  ])
  assert.equal(out.catalogHashMatches,1)
  assert.deepEqual(out.missingCachedSourceRecords,['B'])
  assert.deepEqual(out.catalogWithoutExpectedHash,['C'])
  assert.deepEqual(out.cacheFilesNotMatchedToCatalog,['b.pdf'])
  assert.equal(out.academicallyApprovedQuestions,0)
})
test('catalog matching never equals academic permission or question approval',()=>{
  const out=summarizeHashes([{relative:'book.pdf',sha256:'abcd'}],[{recordId:'X',pdfSha256:'abcd'}])
  assert.equal(out.catalog[0].cachedHashVerified,true)
  assert.equal(out.catalog[0].academicApproved,false)
})

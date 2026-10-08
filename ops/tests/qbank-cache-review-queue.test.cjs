const test=require('node:test')
const assert=require('node:assert/strict')
const {asQueue}=require('../qbank/write-cached-pdf-review-queue.cjs')
test('cache queue records hash evidence without granting academic approval',()=>{const q=asQueue({cachedPdfFiles:2,catalogRecords:3,expectedHashCatalogRecords:2,catalogHashMatches:1,missingCachedSourceRecords:['b'],catalogWithoutExpectedHash:['c'],cacheFilesNotMatchedToCatalog:['x.pdf'],catalog:[{recordId:'a',cachedHashVerified:true},{recordId:'b',cachedHashVerified:false}]});assert.equal(q.metrics.exactHashMatches,1);assert.equal(q.reviewQueue.length,1);assert.equal(q.academicApprovalGranted,false);assert.deepEqual(q.missingSourceCatalogIds,['b']);assert.deepEqual(q.unmatchedLocalPdfs,['x.pdf'])})

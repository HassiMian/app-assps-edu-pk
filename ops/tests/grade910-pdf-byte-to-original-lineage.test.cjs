'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const m=require('../qbank/attest-grade910-original-pdf-lineage.cjs')
const {OUT,NOTE}=m
const saved=()=>JSON.parse(fs.readFileSync(OUT,'utf8'))
test('entire frozen 2581 original question SHA identity traced to 111 official catalog records',()=>{
 const r=saved()
 assert.equal(r.originalCandidates,2581)
 assert.equal(r.originalAuthoringFiles,73)
 assert.equal(r.officialCatalogRecords,111)
 assert.equal(r.cachedPdfByteHashMatches,110)
 assert.equal(r.oneNoShaCatalogQuarantined,1)
 assert.equal(r.quarantinedCatalogOriginalQuestionReferences,0)
 assert.equal(r.catalogs.length,111)
 assert.equal(r.rows.length,2581)
 assert.equal(new Set(r.rows.map(q=>q.originalQuestionId)).size,2581)
 assert.equal(r.catalogs.filter(c=>c.sourceByteStatus==='BYTE_SHA256_MATCH').length,110)
})
test('2537 exact original PDF SHA candidates, 44 legacy explicit SHA missing, no actual human approval',()=>{
 const r=saved()
 assert.equal(r.candidateStatusCounts.ORIGINAL_PDF_SHA_EXACT_BYTE_VERIFIED,2537)
 assert.equal(r.candidateStatusCounts.ORIGINAL_QUESTION_PDF_SHA_NOT_DECLARED,44)
 assert.equal(r.questionShaConflicts,0)
 assert.equal(r.sourceQuestionClaimMatchesExistingByteVerifiedCatalog,2537)
 assert.equal(r.missingIndividualQuestionPdfShaClaim,44)
 assert.equal(r.academicallyApproved,0)
 assert.equal(r.verifiedPublished,0)
 assert.equal(r.paperStudioVerifiedSelectable,false)
 assert.ok(r.rows.every(x=>/^[0-9a-f]{64}$/.test(x.originalQuestionRevisionSha256)))
 assert.ok(r.rows.every(x=>x.pageClaimIsHumanPrintedTextbookVerified===false))
})
test('altering an original cached source attestation digest in a synthetic evidence document fails closed',()=>{
 const r=saved()
 const altered={manifestCount:111,verifiedSourceCount:110,uncheckedSourceCount:1,
  mismatches:0,results:r.catalogs.map(x=>({recordId:x.recordId,
   status:x.sourceByteStatus})),bytesRead:r.actualCachePdfBytesHashed}
 altered.results[0].status='BYTE_SHA256_INVALID'
 assert.throws(()=>m.build({byteEvidence:altered}),/PDF_BYTE_ATTESTATION_RESULTS_STATUS_DRIFT/)
})
test('summaries omit original question text and do not confuse PDF bytes with adopted edition',()=>{
 const r=saved(),text=fs.readFileSync(NOTE,'utf8')
 assert.equal(text,m.markdown(r))
 assert.ok(!text.includes('Which statement best reflects agriculture'))
 assert.ok(!JSON.stringify(r.rows).includes('Which statement best reflects agriculture'))
 assert.equal(r.rows.some(x=>x.schoolAdoptedExactEditionVerified),false)
 assert.match(text,/2,537\/2,581/)
})

// PDFINFO TEXT HERE IS SYNTHETIC, not actual original PDF evidence.
// The installed PC currently has no approved pdfinfo.exe; real inspection opt-in.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {parsePdfinfoA4PageInventory,inspectOriginalNativePdf}
 =require('../services/papers/paperPdfPageInventoryPhase3M.js')
const shaPrint='a'.repeat(64),shaTool='b'.repeat(64)
const opts={expectedPdfSha256:shaPrint,inspectorSha256:shaTool}
function pdfinfo(pages=2){
 const chunks=['Title: Fictional fixture only','Pages: '+pages,
  'Encrypted: no','Page size: 595.28 x 841.89 pts (A4)']
 for(let p=1;p<=Math.min(pages,32);p++){
  chunks.push('Page    '+p+' size: 595.28 x 841.89 pts (A4)')
  chunks.push('Page    '+p+' MediaBox: 0.00 0.00 595.28 841.89')
  chunks.push('Page    '+p+' CropBox: 0.00 0.00 595.28 841.89')
 }
 return chunks.join('\n')+'\n'
}
test('2 exact fake PDF inspector page records bind to original PDF+pin SHA without human approval',()=>{
 const proof=parsePdfinfoA4PageInventory(pdfinfo(2),opts)
 assert.equal(proof.status,'PDF_NATIVE_ALL_PAGES_A4_INDEPENDENTLY_INSPECTED')
 assert.equal(proof.verifiedPdfPageCount,2)
 assert.deepEqual(proof.pages.map(p=>p.pageNumber),[1,2])
 assert.equal(proof.originalPdfSha256,shaPrint)
 assert.equal(proof.inspectorExecutableSha256,shaTool)
 assert.equal(proof.actualOriginalBrowserSelectionVerified,false)
 assert.equal(proof.independentlyApproved,false)
 assert.equal(proof.productionCutoverAllowed,false)
})
test('missing later page may NOT pass merely because first page declares A4',()=>{
 const truncated=pdfinfo(2).split('\n').filter(line=>!/^Page\s+2\s+/u.test(line)).join('\n')
 assert.throws(()=>parsePdfinfoA4PageInventory(truncated,opts),/every native page/)
})
test('duplicate page records and absent CropBox or MediaBox reject fail-closed',()=>{
 assert.throws(()=>parsePdfinfoA4PageInventory(pdfinfo(2)+
  'Page 1 size: 595.28 x 841.89 pts\n',opts),/Duplicate/)
 for(const name of ['CropBox','MediaBox']){
  const changed=pdfinfo(2).split('\n').filter(line=>
   !new RegExp('^Page\\s+2\\s+'+name+':').test(line)).join('\n')
  assert.throws(()=>parsePdfinfoA4PageInventory(changed,opts),/every native page/)
 }
})
test('A4 must hold on ALL pages, including portrait geometry and un-clipped CropBox',()=>{
 for(const changed of [
  pdfinfo(2).replace('Page    2 size: 595.28 x 841.89','Page    2 size: 612.0 x 792.0'),
  pdfinfo(2).replace('Page    2 CropBox: 0.00 0.00 595.28 841.89',
   'Page    2 CropBox: 1.00 0.00 594.28 841.89'),
  pdfinfo(2).replace('Page    2 MediaBox: 0.00 0.00 595.28 841.89',
   'Page    2 MediaBox: 0.00 0.00 612.00 792.00'),
 ]){
  assert.throws(()=>parsePdfinfoA4PageInventory(changed,opts),/non-A4|cropped|inconsistent/)
 }
})
test('encrypted, executable-JavaScript, invalid pages, 33 pages or duplicated count reject',()=>{
 for(const changed of [
  pdfinfo(1).replace('Encrypted: no','Encrypted: yes (print:yes)'),
  pdfinfo(1)+'JavaScript: yes\n',
  pdfinfo(1).replace('Pages: 1','Pages: 0'),
  pdfinfo(33),pdfinfo(2)+'Pages: 2\n',
 ])assert.throws(()=>parsePdfinfoA4PageInventory(changed,opts))
})
test('cannot report verified count from missing, substituted or malformed inspector hashes',()=>{
 for(const bad of [
  {...opts,inspectorSha256:''},
  {...opts,expectedPdfSha256:'0'},
 ]){
  assert.throws(()=>parsePdfinfoA4PageInventory(pdfinfo(1),bad),/SHA/)
 }
 assert.throws(()=>parsePdfinfoA4PageInventory('',opts),/metadata/)
})
test('no installed inspector/real original PDF means actual run REFUSES, no auto download/fallback',async()=>{
 await assert.rejects(()=>inspectOriginalNativePdf(),/SHA/)
 await assert.rejects(()=>inspectOriginalNativePdf({
  nativePdfPath:'C:\\fictional-no-such-native-PDF.pdf',
  expectedPrintSha256:shaPrint,
  inspectorExecutablePath:'C:\\fictional-no-such-pdfinfo.exe',
  expectedInspectorSha256:shaTool,
 }))
})

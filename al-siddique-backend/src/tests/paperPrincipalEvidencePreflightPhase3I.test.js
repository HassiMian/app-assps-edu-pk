// Synthetic Phase3D 4-file fixtures only. Real principal artifacts are NOT in repo.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createHash}=require('node:crypto')
const {verifyPrincipalEvidencePreflight}=require('../services/papers/paperPrincipalEvidencePreflight.js')
const sha=v=>createHash('sha256').update(v).digest('hex')
const objSha=v=>sha(Buffer.from(JSON.stringify(v),'utf8'))
const seal=v=>{
 const p={...v};delete p.integrity
 v.integrity={algorithm:'SHA-256',payloadSha256:objSha(p)}
 return v
}
function fakePng(width=794,height=1123){
 // Synthetic fixture matches Phase3D's PNG signature/IHDR/IEND preflight, NOT a real rendered page.
 const p=Buffer.alloc(64)
 Buffer.from([137,80,78,71,13,10,26,10]).copy(p,0)
 p.writeUInt32BE(13,8)
 p.write('IHDR',12,'ascii')
 p.writeUInt32BE(width,16);p.writeUInt32BE(height,20)
 Buffer.from([0,0,0,0,73,69,78,68,174,66,96,130]).copy(p,52)
 return p
}
const fakePdf=()=>Buffer.from('%PDF-1.7\n1 0 obj << /Type /Page /MediaBox [0 0 595.28 841.89] >> endobj\n%%EOF','latin1')
function fixture(family='SAVED_PAPER'){
 const png=fakePng(),pdf=fakePdf(),scope='synthetic-school51'
 let baseline,subject
 if(family==='SAVED_PAPER'){
  const source={id:'synthetic-paper-1',revision:2,teacher:'fixture',questions:[]}
  baseline=seal({
   format:'assps-native-saved-paper-baseline',version:1,scope,
   capturedAt:'2026-10-02T08:00:00.000Z',
   approval:{sourceSelectedExplicitly:true,approvedByServer:false,
    approvalStatus:'DATA_CAPTURE_ONLY',visualEvidenceStatus:'SCREENSHOT_AND_PDF_NOT_CAPTURED',
    renderCutoverAllowed:false},
   identity:{savedPaperId:source.id,sourceType:'SAVED_PAPER',sourceRevision:2,
    nativeRenderer:'OriginalLegacyPaperEditor'},
   sourcePaper:source,sourceSha256:objSha(source),appearanceSha256:'a'.repeat(64),
   canonicalWorkingDraft:{key:null,payload:null,sha256:null,status:'NO_STORED_DRAFT'},
  })
  subject={family:'SAVED_PAPER',paperId:source.id,tenantScope:scope,
   sourceSha256:baseline.sourceSha256,originalRenderer:'OriginalLegacyPaperEditor',
   sourceRevision:2,additionalNativeStateSha256:null}
 }else{
  const teacherSource={id:'ey-starter-english',questions:[{id:'q1',text:'fictional'}]}
  const overlays={},template={resolvedId:'synthetic-native-v2'}
  baseline=seal({
   format:'assps-early-years-reference-overlay-baseline',version:1,tenantScope:scope,
   identity:{paperId:teacherSource.id,nativeRenderer:'EarlyYearsWorksheetEditor/EarlyYearsPaperContainer'},
   approval:{status:'DATA_CAPTURE_ONLY',visualEvidence:'SCREENSHOT_AND_A4_PDF_PENDING',
    renderCutoverAllowed:false,serverApproved:false},
   teacherSource,sourceSha256:objSha(teacherSource),
   overlays,overlaySha256:objSha(overlays),template,templateSha256:objSha(template)
  })
  subject={family:'EARLY_YEARS_REFERENCE',paperId:teacherSource.id,tenantScope:scope,
   sourceSha256:baseline.sourceSha256,
   originalRenderer:'EarlyYearsWorksheetEditor/EarlyYearsPaperContainer',sourceRevision:null,
   additionalNativeStateSha256:baseline.overlaySha256,templateSha256:baseline.templateSha256}
 }
 subject={...subject,baselinePayloadSha256:baseline.integrity.payloadSha256,
  baselineFormat:baseline.format,baselineVersion:baseline.version}
 const manifest=seal({
  format:'assps-native-paper-visual-evidence-manifest',version:1,
  capturedAt:'2026-10-02T09:00:00.000Z',
  subject,
  evidence:{
   screen:{kind:'SCREEN_A4_PNG',filename:'original.png',sha256:sha(png),
    bytes:png.byteLength,width:794,height:1123,aspectRatio:794/1123,
    continuousA4HeightSpans:1,a4RatioCandidate:true},
   print:{kind:'NATIVE_A4_PDF',filename:'native-print.pdf',sha256:sha(pdf),
    bytes:pdf.byteLength,declaredMediaBoxes:1,a4MetadataStatus:'DECLARED_BOXES_A4'},
   baselineDataFile:{sha256:baseline.integrity.payloadSha256,format:baseline.format},
  },
  manualChecks:{nativePreviewChecked:true,nativePrintPdfChecked:true,
   samePaperAndRevisionChecked:true,contentLayoutAndFontsCompared:true,
   retainedThreeOriginalFiles:true,acknowledgeNotApproval:true},
  assurance:{dataBaselineValidated:true,pngSignatureAndGeometryValidated:true,
   pdfMagicAndEofValidated:true,pdfDeclaredBoxesChecked:true,
   manualClaims:'SELF_ATTESTED_NOT_INDEPENDENTLY_VERIFIED',
   actualVisualDifferenceEvaluation:'PENDING_INDEPENDENT_REVIEW',
   approvalStatus:'EVIDENCE_COLLECTED_UNVERIFIED',serverSignaturePresent:false,
   currentProductionCutoverAllowed:false,sourceMutationAllowed:false,
   originalFilesRetainedOutsideManifest:true}
 })
 const args=()=>({baselineRawText:JSON.stringify(baseline),manifestRawText:JSON.stringify(manifest),
  screenPngBytes:png,nativePdfBytes:pdf,
  expectedPaperId:subject.paperId,expectedTenantScope:scope,expectedFamily:family})
 return {png,pdf,baseline,manifest,args}
}
test('synthetic generic Saved Paper 4-file exact fingerprints pass PRE-REVIEW only; NO approval or cutover',()=>{
 const out=verifyPrincipalEvidencePreflight(fixture().args())
 assert.equal(out.status,'FOUR_FILE_IDENTITY_VERIFIED_HUMAN_VISUAL_REVIEW_PENDING')
 assert.equal(out.independentlyApproved,false)
 assert.equal(out.productionCutoverAllowed,false)
 assert.equal(out.sourceMutationAllowed,false)
 assert.equal(out.semanticContentAndFontParityMachineVerified,false)
 assert.equal(out.principalOriginalCaptureProvenanceMachineVerified,false)
 assert.equal(out.pdfA4MachineVerified,true)
})
test('synthetic original EARLY YEARS source/overlay/template also preserved, never machine-approved',()=>{
 const out=verifyPrincipalEvidencePreflight(fixture('EARLY_YEARS_REFERENCE').args())
 assert.equal(out.family,'EARLY_YEARS_REFERENCE')
 assert.equal(out.originalNativeRendererRequired,'EarlyYearsWorksheetEditor/EarlyYearsPaperContainer')
 assert.equal(out.independentlyApproved,false)
})
test('none of four original files may be missing, substituted or swapped',()=>{
 const f=fixture(),a=f.args()
 for(const mutation of [
  {...a,baselineRawText:null},{...a,manifestRawText:null},
  {...a,screenPngBytes:null},{...a,nativePdfBytes:null},
  {...a,screenPngBytes:fakePng(800,1131)},
  {...a,nativePdfBytes:Buffer.concat([f.pdf,Buffer.from(' changed')])}
 ])assert.throws(()=>verifyPrincipalEvidencePreflight(mutation))
})
test('paper, tenant/family mismatch and original source payload change FAIL even with a signed-looking manifest',()=>{
 const f=fixture()
 for(const fields of [
  {expectedPaperId:'someone-elses-paper'},
  {expectedTenantScope:'school52'},
  {expectedFamily:'EARLY_YEARS_REFERENCE'}
 ])assert.throws(()=>verifyPrincipalEvidencePreflight({...f.args(),...fields}),/different paper/)
 f.baseline.sourcePaper.questions.push({id:'unapproved'})
 assert.throws(()=>verifyPrincipalEvidencePreflight(f.args()),/digest invalid/)
})
test('forged visual approval or cutover is rejected EVEN when the attacker recomputes unsigned manifest digest',()=>{
 for(const edit of [
  m=>{m.assurance.approvalStatus='APPROVED'},
  m=>{m.assurance.currentProductionCutoverAllowed=true},
  m=>{m.assurance.serverSignaturePresent=true},
  m=>{m.assurance.actualVisualDifferenceEvaluation='PASSED'},
  m=>{m.manualChecks.contentLayoutAndFontsCompared=false},
 ]){
  const f=fixture()
  edit(f.manifest);seal(f.manifest)
  assert.throws(()=>verifyPrincipalEvidencePreflight(f.args()),/UNVERIFIED/)
 }
})
test('PNG non-A4/invalid signature and native PDF non-A4 metadata are blocked despite matching changed digest',()=>{
 const f=fixture()
 f.png[0]=0
 assert.throws(()=>verifyPrincipalEvidencePreflight(f.args()),/PNG/)
 const g=fixture()
 g.pdf=Buffer.from('%PDF-1.7\n1 0 obj << /MediaBox [0 0 612 792] >> endobj\n%%EOF','latin1')
 g.manifest.evidence.print.sha256=sha(g.pdf)
 g.manifest.evidence.print.bytes=g.pdf.length
 seal(g.manifest)
 assert.throws(()=>verifyPrincipalEvidencePreflight({...g.args(),nativePdfBytes:g.pdf}),/non-A4/)
})
test('PDF with no machine-readable MediaBox is not silently approved as A4, even with exact SHA',()=>{
 const f=fixture()
 f.pdf=Buffer.from('%PDF-1.7\n1 0 obj << /Type /Page >> endobj\n%%EOF','latin1')
 Object.assign(f.manifest.evidence.print,{
  sha256:sha(f.pdf),bytes:f.pdf.length,declaredMediaBoxes:0,
  a4MetadataStatus:'PAGE_GEOMETRY_NOT_MACHINE_VERIFIED'})
 seal(f.manifest)
 const result=verifyPrincipalEvidencePreflight({...f.args(),nativePdfBytes:f.pdf})
 assert.equal(result.pdfA4MachineVerified,false)
 assert.equal(result.independentlyApproved,false)
})
test('self-relabelled source baseline approval is rejected even if all local SHA values recomputed',()=>{
 const f=fixture()
 f.baseline.approval.approvalStatus='APPROVED';seal(f.baseline)
 f.manifest.subject.baselinePayloadSha256=f.baseline.integrity.payloadSha256
 f.manifest.evidence.baselineDataFile.sha256=f.baseline.integrity.payloadSha256
 seal(f.manifest)
 assert.throws(()=>verifyPrincipalEvidencePreflight(f.args()),/elevated approval/)
})

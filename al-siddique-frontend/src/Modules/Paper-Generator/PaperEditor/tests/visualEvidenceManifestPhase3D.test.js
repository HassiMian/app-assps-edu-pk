import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {Buffer} from 'node:buffer'
import {deflateSync} from 'node:zlib'
import official from '../../seed-data/official-first-term-2026-v13.json' with {type:'json'}
import {getEarlyYearsPaperById} from '../earlyYears/data/earlyYearsSourceStore.js'
import {getDefaultEarlyYearsTemplateId} from '../earlyYears/earlyYearsTemplates.js'
import {captureSavedPaperBaseline} from '../core/SavedPaperBaseline.js'
import {captureEarlyYearsReferenceBaseline} from '../earlyYears/specs/EarlyYearsOverlayBaseline.js'
import {resolveNativeBaselineIdentity,createVisualEvidenceManifest,
 verifyVisualEvidenceManifest,VISUAL_EVIDENCE_FORMAT} from '../core/PaperVisualEvidenceManifest.js'
const sha=b=>createHash('sha256').update(b).digest('hex')
const jsonHash=o=>sha(Buffer.from(JSON.stringify(o)))
const clone=o=>JSON.parse(JSON.stringify(o))
const crc32=bytes=>{
 let n=0xffffffff
 for(const b of bytes){
  n^=b
  for(let j=0;j<8;j++)n=(n&1)?(0xedb88320^(n>>>1)):(n>>>1)
 }
 return (n^0xffffffff)>>>0
}
const chunk=(type,data)=>{
 const label=Buffer.from(type,'ascii'),length=Buffer.alloc(4),crc=Buffer.alloc(4)
 length.writeUInt32BE(data.length)
 crc.writeUInt32BE(crc32(Buffer.concat([label,data])))
 return Buffer.concat([length,label,data,crc])
}
const png=(width=794,height=1123)=>{
 const ihdr=Buffer.alloc(13)
 ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2
 const scanline=Buffer.alloc(1+width*3)
 scanline.fill(255,1)
 const image=Buffer.concat(Array.from({length:height},()=>scanline))
 return new Uint8Array(Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),
  chunk('IDAT',deflateSync(image)),chunk('IEND',Buffer.alloc(0))
 ]))
}
const pdf=(media='/MediaBox [0 0 595.28 841.89]')=>new Uint8Array(Buffer.from(
 '%PDF-1.7\n1 0 obj\n<< /Type /Page '+media+' >>\nendobj\ntrailer << /Root 1 0 R >>\n%%EOF\n','ascii'))
const screen=png(),nativePdf=pdf(),scope='tenant-phase3d-checks'
const checks={nativePreviewChecked:true,nativePrintPdfChecked:true,samePaperAndRevisionChecked:true,
 contentLayoutAndFontsCompared:true,retainedThreeOriginalFiles:true,acknowledgeNotApproval:true}
const savedPaper=official.papers.find(p=>p.id.includes('class-7-social-studies'))
const saved=captureSavedPaperBaseline({
 displayedPaper:savedPaper,rawStoreJson:JSON.stringify({savedPapers:[savedPaper]}),
 rawCanonicalDraftsJson:null,tenantScope:scope,explicitAcknowledgement:true,
 capturedAt:'2026-10-02T06:00:00.000Z',
})
const eyPaper=getEarlyYearsPaperById('ey-starter-english-2026')
const early=captureEarlyYearsReferenceBaseline({
 paper:eyPaper,rawOverlayJson:null,rawTemplateMapJson:null,tenantScope:scope,
 displayedTemplateId:getDefaultEarlyYearsTemplateId(eyPaper.classStage),
 displayedOverlays:{},explicitAcknowledgement:true,capturedAt:'2026-10-02T06:00:00.000Z',
})
const parameters=(baseline=saved,extra={})=>({
 baseline,screenPngBytes:screen,screenFilename:'original-preview-a4.png',
 nativePdfBytes:nativePdf,pdfFilename:'original-native-a4.pdf',manualChecks:checks,
 expectedPaperId:baseline.format==='assps-native-saved-paper-baseline'?savedPaper.id:eyPaper.id,
 expectedTenantScope:scope,
 expectedFamily:baseline.format==='assps-native-saved-paper-baseline'?'SAVED_PAPER':'EARLY_YEARS_REFERENCE',
 capturedAt:'2026-10-02T06:30:00.000Z',...extra,
})
const verifyArgs=(p)=>({
 baseline:p.baseline,screenPngBytes:p.screenPngBytes,nativePdfBytes:p.nativePdfBytes,
 expectedPaperId:p.expectedPaperId,expectedTenantScope:p.expectedTenantScope,expectedFamily:p.expectedFamily,
})
test('generic saved paper: binds EXACT native baseline JSON, real-signature A4 PNG and PDF bytes, never approves',async()=>{
 const param=parameters(),snapshot=JSON.stringify(param.baseline)
 const m=await createVisualEvidenceManifest(param)
 assert.equal(m.format,VISUAL_EVIDENCE_FORMAT)
 assert.equal(m.subject.family,'SAVED_PAPER')
 assert.equal(m.subject.baselinePayloadSha256,saved.integrity.payloadSha256)
 assert.equal(m.subject.sourceSha256,saved.sourceSha256)
 assert.equal(m.evidence.screen.sha256,sha(screen))
 assert.equal(m.evidence.print.sha256,sha(nativePdf))
 assert.equal(m.evidence.screen.width,794)
 assert.equal(m.evidence.screen.height,1123)
 assert.equal(m.evidence.print.a4MetadataStatus,'DECLARED_BOXES_A4')
 assert.equal(m.assurance.actualVisualDifferenceEvaluation,'PENDING_INDEPENDENT_REVIEW')
 assert.equal(m.assurance.approvalStatus,'EVIDENCE_COLLECTED_UNVERIFIED')
 assert.equal(m.assurance.currentProductionCutoverAllowed,false)
 assert.equal((await verifyVisualEvidenceManifest(m,verifyArgs(param))).visualApproved,false)
 assert.equal(JSON.stringify(param.baseline),snapshot,'The original baseline must not be rewritten.')
})
test('two-A4-height continuous original Early Years preview is preserved, not artificially cropped into one page',async()=>{
 const originalContinuousSheet=png(794,2232)
 const p=parameters(early,{screenPngBytes:originalContinuousSheet})
 const m=await createVisualEvidenceManifest(p)
 assert.equal(m.evidence.screen.continuousA4HeightSpans,2)
 assert.equal(m.evidence.screen.width,794)
 assert.equal(m.evidence.screen.height,2232)
 assert.equal((await verifyVisualEvidenceManifest(m,verifyArgs(p))).valid,true)
})
test('Early Years reference overlays use distinct source/overlay/template SHA and preserve source identity',async()=>{
 const param=parameters(early),m=await createVisualEvidenceManifest(param)
 assert.equal(m.subject.family,'EARLY_YEARS_REFERENCE')
 assert.equal(m.subject.sourceSha256,early.sourceSha256)
 assert.equal(m.subject.additionalNativeStateSha256,early.overlaySha256)
 assert.equal(m.subject.templateSha256,early.templateSha256)
 assert.equal((await verifyVisualEvidenceManifest(m,verifyArgs(param))).valid,true)
 assert.equal(resolveNativeBaselineIdentity(early).paperId,eyPaper.id)
})
test('wrong paper, school scope, wrong family or absent manual checks fail closed',async()=>{
 for(const changed of [
  {expectedPaperId:'someone-else'}, {expectedTenantScope:'tenant-other'}, {expectedFamily:'EARLY_YEARS_REFERENCE'},
  {manualChecks:{...checks,samePaperAndRevisionChecked:false}}, {manualChecks:{}},
 ]){
  await assert.rejects(()=>createVisualEvidenceManifest(parameters(saved,changed)),/baseline belongs|manual evidence checks/)
 }
})
test('truncated, wrong-ratio, fake extension PNG and non-A4 or truncated PDF cannot produce evidence',async()=>{
 for(const changed of [
  {screenPngBytes:png(1200,900)},{screenPngBytes:screen.subarray(0,90)},
  {screenPngBytes:new Uint8Array(Buffer.from('%PDF-1.7 this-is-not-a-png file'))},
  {nativePdfBytes:pdf('/MediaBox [0 0 612 792]')},
  {nativePdfBytes:pdf('/MediaBox [0 0 595 842] /MediaBox [0 0 612 792]')},
  {nativePdfBytes:new Uint8Array(Buffer.from('%PDF-1.7\nno EOF and no pages here','ascii'))},
  {screenFilename:'preview.jpg'}, {pdfFilename:'print.docx'}
 ]){
  await assert.rejects(()=>createVisualEvidenceManifest(parameters(saved,changed)),/PNG|A4|PDF|file|cropped|extension|Expected separate/)
 }
})
test('changed actual screenshot/PDF bytes invalidates previously sealed evidence despite identical names',async()=>{
 const param=parameters(),manifest=await createVisualEvidenceManifest(param)
 const pngChanged=new Uint8Array(screen);pngChanged[pngChanged.length-20]^=1
 await assert.rejects(()=>verifyVisualEvidenceManifest(manifest,verifyArgs({...param,screenPngBytes:pngChanged})),/Evidence bytes/)
 const pdfChanged=pdf('/MediaBox [0 0 595.30 841.90]')
 await assert.rejects(()=>verifyVisualEvidenceManifest(manifest,verifyArgs({...param,nativePdfBytes:pdfChanged})),/Evidence bytes/)
})
test('relabelled manifest cannot claim approved source, signed reviewer or renderer cutover',async()=>{
 const param=parameters(),original=await createVisualEvidenceManifest(param)
 for(const mutation of [
  m=>{m.assurance.approvalStatus='APPROVED'},
  m=>{m.assurance.currentProductionCutoverAllowed=true},
  m=>{m.assurance.serverSignaturePresent=true},
  m=>{m.assurance.actualVisualDifferenceEvaluation='MATCHED_BY_AI'},
  m=>{m.manualChecks.nativePreviewChecked=false},
 ]){
  const bad=clone(original);mutation(bad)
  bad.integrity.payloadSha256=jsonHash(Object.fromEntries(Object.entries(bad).filter(([k])=>k!=='integrity')))
  await assert.rejects(()=>verifyVisualEvidenceManifest(bad,verifyArgs(param)),/cannot self-approve|manual evidence checks/)
 }
})
test('fake edited source baseline cannot be linked merely by recomputing an unsigned envelope SHA',async()=>{
 const param=parameters(),manifest=await createVisualEvidenceManifest(param)
 const fake=clone(saved);fake.sourcePaper.config.totalMarks=999
 fake.integrity.payloadSha256=jsonHash(Object.fromEntries(Object.entries(fake).filter(([key])=>key!=='integrity')))
 await assert.rejects(()=>verifyVisualEvidenceManifest(manifest,verifyArgs({...param,baseline:fake})),/Baseline paper|hash|identity/i)
})
test('PDF without declared MediaBox remains explicitly NOT MACHINE VERIFIED, and never auto-approved',async()=>{
 const param=parameters(saved,{nativePdfBytes:pdf('')})
 const manifest=await createVisualEvidenceManifest(param)
 assert.equal(manifest.evidence.print.a4MetadataStatus,'PAGE_GEOMETRY_NOT_MACHINE_VERIFIED')
 assert.equal(manifest.assurance.pdfDeclaredBoxesChecked,false)
 assert.equal((await verifyVisualEvidenceManifest(manifest,verifyArgs(param))).cutoverReady,false)
})

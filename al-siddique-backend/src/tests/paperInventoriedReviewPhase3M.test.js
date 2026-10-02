// Fictional source hashes & mock pdfinfo parser result; never actual principal approval.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {makeInventoriedReviewWorkpack,verifyInventoriedWorkpack,
 recordInventoriedPageObservations}=require('../services/papers/paperInventoriedReviewPhase3M.js')
const {parsePdfinfoA4PageInventory}=require('../services/papers/paperPdfPageInventoryPhase3M.js')
const {VISUAL_REVIEW_CHECKS}=require('../services/papers/paperIndependentVisualDocketPhase3L.js')
const pdfSha='d'.repeat(64),binSha='e'.repeat(64)
const fakePreflight=()=>({
 status:'FOUR_FILE_IDENTITY_VERIFIED_HUMAN_VISUAL_REVIEW_PENDING',
 actualFilesSelected:true,independentlyApproved:false,
 productionCutoverAllowed:false,sourceMutationAllowed:false,
 principalApprovalRecorded:false,independentLivePaperProvenanceEstablished:false,
 family:'SAVED_PAPER',paperId:'fixture-paper-1',tenantScope:'fixture-school-51',
 originalNativeRendererRequired:'OriginalNativeRenderer',
 sourceSha256:'a'.repeat(64),baselineSha256:'b'.repeat(64),
 previewSha256:'c'.repeat(64),printSha256:pdfSha,pdfA4MachineVerified:true,
})
const inventory=()=>parsePdfinfoA4PageInventory([
 'Pages: 2','Encrypted: no','Page size: 595.28 x 841.89 pts',
 'Page 1 size: 595.28 x 841.89 pts',
 'Page 1 MediaBox: 0 0 595.28 841.89',
 'Page 1 CropBox: 0 0 595.28 841.89',
 'Page 2 size: 595.28 x 841.89 pts',
 'Page 2 MediaBox: 0 0 595.28 841.89',
 'Page 2 CropBox: 0 0 595.28 841.89',
 ].join('\n'),{expectedPdfSha256:pdfSha,inspectorSha256:binSha})
const workpack=()=>makeInventoriedReviewWorkpack({
 preflight:fakePreflight(),inventory:inventory(),sourceCollectorRef:'fixture-collector'})
const page=id=>({pageNumber:id,
 checks:Object.fromEntries(VISUAL_REVIEW_CHECKS.map(k=>[k,true])),notes:''})
test('new workbook uses only counted full-page A4 inventory, never reviewer manually chosen count',()=>{
 const p=workpack()
 assert.equal(verifyInventoriedWorkpack(p),true)
 assert.equal(p.docket.capture.claimedPdfPages,2)
 assert.equal(p.machineVerifiedInventory.pageCount,2)
 assert.equal(p.machineVerifiedInventory.printSha256,p.docket.evidence.printSha256)
 assert.equal(p.release.independentlyApproved,false)
})
test('different PDF SHA, missing final page, reordered page or false A4 flags refuse workpack',()=>{
 const preflight=fakePreflight(),good=inventory()
 for(const bad of [
  {...good,originalPdfSha256:'f'.repeat(64)},
  {...good,verifiedPdfPageCount:3},
  {...good,pages:good.pages.slice(0,1)},
  {...good,pages:[good.pages[1],good.pages[0]]},
  {...good,pages:[good.pages[0],{...good.pages[1],a4FullSheetVerified:false}]},
 ]){
  assert.throws(()=>makeInventoriedReviewWorkpack({
   preflight,inventory:bad,sourceCollectorRef:'fixture-collector'}),/Actual independently inventoried/)
 }
})
test('signed-looking tampered workbook and self-authorized production status are rejected',()=>{
 const p=workpack();p.machineVerifiedInventory.pageCount=1
 assert.throws(()=>verifyInventoriedWorkpack(p),/changed/)
 const q=workpack();q.release.productionCutoverAllowed=true
 const {createHash}=require('node:crypto')
 const {integrity,...unsigned}=q
 q.integrity.payloadSha256=createHash('sha256').update(JSON.stringify(unsigned)).digest('hex')
 assert.throws(()=>verifyInventoriedWorkpack(q),/release gates/)
})
test('full actual inspector count requires EVERY page review; extra or missing observation denied',()=>{
 const p=workpack()
 for(const items of [[page(1)],[],[page(1),page(1)],[page(1),page(2),page(3)]]){
  assert.throws(()=>recordInventoriedPageObservations({workpack:p,
   observerRef:'other-fixture-observer',pageObservations:items}))
 }
 const report=recordInventoriedPageObservations({
  workpack:p,observerRef:'other-fixture-observer',
  pageObservations:[page(1),page(2)]})
 assert.equal(report.verifiedFullNativePdfPageCount,2)
 assert.equal(report.countAndA4PageGeometryToolVerified,true)
 assert.equal(report.humanSourceProvenanceAndOriginalPrintParityStillPending,true)
 assert.equal(report.reviewerSignatureCryptographicallyVerified,false)
 assert.equal(report.productionCutoverAllowed,false)
 assert.equal(report.sourceMutationAllowed,false)
})

test('combined page observations have an internally matching new checksum after extra inventoried fields',()=>{
 const pack=workpack()
 const observation=recordInventoriedPageObservations({workpack:pack,
  observerRef:'other-fixture-observer',pageObservations:[page(1),page(2)]})
 const {createHash}=require('node:crypto')
 const {integrity,...body}=observation
 assert.equal(integrity.payloadSha256,createHash('sha256').update(JSON.stringify(body)).digest('hex'))
 assert.match(observation.originalPhase3LObservationSha256,/^[a-f0-9]{64}$/u)
})
test('one-shot explicit CLI rejects unavailable actual original/inspector and creates zero paper copies',async()=>{
 const {spawnSync}=require('node:child_process')
 const path=require('node:path')
 const fs=require('node:fs/promises')
 const os=require('node:os')
 const script=path.resolve(__dirname,
  '../../../ops/paper-staging-review/phase3m-CREATE-INVENTORIED-review-workpack.cjs')
 const empty=spawnSync(process.execPath,[script],{encoding:'utf8',timeout:7000})
 assert.equal(empty.status,1)
 assert.match(empty.stderr,/PHASE3M_INVENTORIED_WORKPACK_REFUSED/u)
 assert.equal(empty.stdout,'')
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'assps-phase3m-fake-'))
 try{
  const opts=['--baseline',path.join(temp,'b.json'),'--manifest',path.join(temp,'m.json'),
   '--preview',path.join(temp,'p.png'),'--print',path.join(temp,'p.pdf'),
   '--paper-id','fictional-id','--tenant-scope','fictional-scope',
   '--family','SAVED_PAPER','--pdfinfo-exe',path.join(temp,'pdfinfo.exe'),
   '--pdfinfo-sha256','a'.repeat(64),'--collector-ref','fictional-collector',
   '--output',path.join(temp,'private-workpack.json')]
  const failed=spawnSync(process.execPath,[script,...opts],{encoding:'utf8',timeout:7000})
  assert.equal(failed.status,1)
  assert.equal(failed.stdout,'')
  assert.match(failed.stderr,/PHASE3M_INVENTORIED_WORKPACK_REFUSED/u)
  await assert.rejects(()=>fs.stat(path.join(temp,'private-workpack.json')),/ENOENT/u)
 }finally{await fs.rm(temp,{recursive:true,force:true})}
})
test('source review: inspector is hash-pinned, never installed or run through interpolated shell',()=>{
 const fs=require('node:fs')
 const path=require('node:path')
 const src=fs.readFileSync(path.resolve(__dirname,'../services/papers/paperPdfPageInventoryPhase3M.js'),'utf8')
 const cli=fs.readFileSync(path.resolve(__dirname,
  '../../../ops/paper-staging-review/phase3m-CREATE-INVENTORIED-review-workpack.cjs'),'utf8')
 assert.match(src,/binary\.sha256!==expectedInspectorSha256/u)
 assert.match(src,/shell:false,timeout:15000,maxBuffer:256\*1024/u)
 assert.match(src,/fileDigestStable\(nativePdfPath/u)
 assert.match(cli,/await intakeNativeEvidence\(/u)
 assert.match(cli,/await inspectOriginalNativePdf\(/u)
 assert.match(cli,/await fs\.open\(output,'wx',0o600\)/u)
 assert.doesNotMatch(src+cli,/npm install|pip install|execSync|shell:true|require\(['"][^'"]*config\/database/u)
})

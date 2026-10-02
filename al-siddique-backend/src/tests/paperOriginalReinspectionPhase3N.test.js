// Pure synthetic saved-workpack forgery cases. NO genuine PDF or school data.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createHash}=require('node:crypto')
const {makeInventoriedReviewWorkpack,verifyInventoriedWorkpack}
 =require('../services/papers/paperInventoriedReviewPhase3M.js')
const {compareAgainstFreshlyInspectedOriginal,reinspectSavedNativeWorkpack}
 =require('../services/papers/paperOriginalReinspectionPhase3N.js')
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const fresh=()=>({
 status:'FOUR_FILE_IDENTITY_VERIFIED_HUMAN_VISUAL_REVIEW_PENDING',
 actualFilesSelected:true,independentlyApproved:false,
 productionCutoverAllowed:false,sourceMutationAllowed:false,
 principalApprovalRecorded:false,independentLivePaperProvenanceEstablished:false,
 family:'SAVED_PAPER',paperId:'fictional-page-paper-1',
 tenantScope:'fictional-school51',originalNativeRendererRequired:'OriginalNativePaperEditor',
 sourceSha256:'a'.repeat(64),baselineSha256:'b'.repeat(64),
 previewSha256:'c'.repeat(64),printSha256:'d'.repeat(64),
 pdfA4MachineVerified:true,
})
const inventoried=()=>({
 status:'PDF_NATIVE_ALL_PAGES_A4_INDEPENDENTLY_INSPECTED',
 originalPdfSha256:'d'.repeat(64),inspectorExecutableSha256:'e'.repeat(64),
 verifiedPdfPageCount:2,
 pages:[1,2].map(pageNumber=>({pageNumber,widthPt:595.28,heightPt:841.89,
  a4FullSheetVerified:true})),
 independentlyApproved:false,productionCutoverAllowed:false,sourceMutationAllowed:false,
})
const build=(f=fresh(),i=inventoried())=>
 makeInventoriedReviewWorkpack({preflight:f,inventory:i,
  sourceCollectorRef:'fictional-external-collector'})
const reseal=d=>{
 const {integrity,...body}=d
 d.integrity={algorithm:'SHA-256',payloadSha256:sha(body)}
 return d
}
test('pure comparison against exact same fictional evidence is explicitly NOT a trusted independent reinspection',()=>{
 const workpack=build()
 const compared=compareAgainstFreshlyInspectedOriginal({
  savedWorkpack:workpack,freshIntake:fresh(),freshInventory:inventoried()})
 assert.equal(compared.status,'EXACT_CANONICAL_WORKPACK_COMPARISON_ONLY')
 assert.equal(compared.savedWorkpackMatchesSuppliedInputs,true)
 assert.equal(compared.independentOriginalReinspectionProvenByThisPureHelper,false)
 assert.equal(compared.independentlyApproved,false)
 assert.equal(compared.productionCutoverAllowed,false)
})
test('forged unsigned checksum can pass older self-consistency but FAIL fresh original source SHA reinspection',()=>{
 const altered=structuredClone(build())
 altered.docket.evidence.sourceSha256='f'.repeat(64)
 reseal(altered.docket);reseal(altered)
 assert.equal(verifyInventoriedWorkpack(altered),true,
  'Old self-hash cannot establish actual provenance by itself.')
 assert.throws(()=>compareAgainstFreshlyInspectedOriginal({
  savedWorkpack:altered,freshIntake:fresh(),freshInventory:inventoried()
 }),/differs from ORIGINAL reinspection/)
})
test('forged A4 size remaining within tolerance and recalculated outer hash still refuses EXACT page geometry match',()=>{
 const altered=structuredClone(build())
 altered.machineVerifiedInventory.pages[1].widthPt=594.1
 reseal(altered)
 assert.equal(verifyInventoriedWorkpack(altered),true)
 assert.throws(()=>compareAgainstFreshlyInspectedOriginal({
  savedWorkpack:altered,freshIntake:fresh(),freshInventory:inventoried()
 }),/differs from ORIGINAL reinspection/)
})
test('a stale signed-looking same PDF paired to a newer original source revision is rejected',()=>{
 const saved=build()
 const original={...fresh(),sourceSha256:'f'.repeat(64)}
 assert.throws(()=>compareAgainstFreshlyInspectedOriginal({
  savedWorkpack:saved,freshIntake:original,freshInventory:inventoried()
 }),/differs/)
})
test('different school scope, renderer or family refuses EVEN when saved worksheet hashes are internally consistent',()=>{
 const saved=build()
 for(const changed of [
  {...fresh(),tenantScope:'fictional-school52'},
  {...fresh(),originalNativeRendererRequired:'RecreatedPaperRenderer'},
  {...fresh(),family:'EARLY_YEARS_REFERENCE'},
 ]){
  assert.throws(()=>compareAgainstFreshlyInspectedOriginal({
   savedWorkpack:saved,freshIntake:changed,freshInventory:inventoried()
  }))
 }
})
test('changed binary pin, missing page, reordered page or revised PDF fingerprint fails reinspection comparison',()=>{
 const saved=build()
 for(const changed of [
  {...inventoried(),inspectorExecutableSha256:'f'.repeat(64)},
  {...inventoried(),verifiedPdfPageCount:1,pages:inventoried().pages.slice(0,1)},
  {...inventoried(),pages:[inventoried().pages[1],inventoried().pages[0]]},
  {...inventoried(),originalPdfSha256:'f'.repeat(64)},
 ]){
  assert.throws(()=>compareAgainstFreshlyInspectedOriginal({
   savedWorkpack:saved,freshIntake:fresh(),freshInventory:changed
  }))
 }
})
test('unknown/missing untrusted workpack and claimed APPROVED release flags fail immediately',()=>{
 assert.throws(()=>compareAgainstFreshlyInspectedOriginal({
  savedWorkpack:null,freshIntake:fresh(),freshInventory:inventoried()
 }))
 const forged=build()
 forged.release.productionCutoverAllowed=true;reseal(forged)
 assert.throws(()=>compareAgainstFreshlyInspectedOriginal({
  savedWorkpack:forged,freshIntake:fresh(),freshInventory:inventoried()
 }),/release gates/)
})
test('the authoritative reinspection wrapper refuses missing REAL original files; no fake success',async()=>{
 await assert.rejects(()=>reinspectSavedNativeWorkpack({
  savedWorkpack:build()
 }),/Four separate/)
 await assert.rejects(()=>reinspectSavedNativeWorkpack({
  baselinePath:'C:\\missing-phase3n-original-baseline.json',
  manifestPath:'C:\\missing-phase3n-original-manifest.json',
  previewPath:'C:\\missing-phase3n-original-preview.png',
  printPath:'C:\\missing-phase3n-original-print.pdf',
  expectedPaperId:'fictional-page-paper-1',expectedTenantScope:'fictional-school51',
  expectedFamily:'SAVED_PAPER',inspectorExecutablePath:'C:\\no-trusted-inspector.exe',
  expectedInspectorSha256:'e'.repeat(64),savedWorkpack:build()
 }))
})
test('CLI is read-only, requires explicit original and inspector paths and redacts failure without output artifact',()=>{
 const {spawnSync}=require('node:child_process')
 const fs=require('node:fs')
 const path=require('node:path')
 const script=path.resolve(__dirname,
  '../../../ops/paper-staging-review/phase3n-REINSPECT-saved-review-READ-ONLY.cjs')
 const content=fs.readFileSync(script,'utf8')
 assert.match(content,/reinspectSavedNativeWorkpack/u)
 assert.match(content,/readUntrustedWorksheet/u)
 assert.doesNotMatch(content,/writeFile|fs\.open|execSync|shell:true|require\(['"][^'"]*database/u)
 const missing=spawnSync(process.execPath,[script],{encoding:'utf8',timeout:7000})
 assert.equal(missing.status,1)
 assert.match(missing.stderr,/PHASE3N_REINSPECTION_REFUSED/u)
 assert.equal(missing.stdout,'')
})
test('reviewer cannot get provenance/approval by passing fake inputs to pure comparison or spoofed local hash',()=>{
 const compared=compareAgainstFreshlyInspectedOriginal({
  savedWorkpack:build(),freshIntake:fresh(),freshInventory:inventoried()})
 for(const status of [
  'independentOriginalReinspectionProvenByThisPureHelper','reviewerSignatureVerified',
  'independentlyApproved','actualEncryptedStagingBackupRestored',
  'productionCutoverAllowed','sourceMutationAllowed'
 ])assert.equal(compared[status],false)
})

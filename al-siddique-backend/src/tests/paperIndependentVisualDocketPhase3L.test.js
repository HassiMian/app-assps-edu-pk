// Synthetic-only review contracts. No genuine principal artifact or DB accessed.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createHash}=require('node:crypto')
const {makeVisualReviewDocket,verifyDocket,recordPageObservations,VISUAL_REVIEW_CHECKS}
 =require('../services/papers/paperIndependentVisualDocketPhase3L.js')
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const fake=()=>({
 status:'FOUR_FILE_IDENTITY_VERIFIED_HUMAN_VISUAL_REVIEW_PENDING',
 actualFilesSelected:true,independentlyApproved:false,productionCutoverAllowed:false,
 sourceMutationAllowed:false,principalApprovalRecorded:false,
 independentLivePaperProvenanceEstablished:false,
 family:'SAVED_PAPER',paperId:'fictional-paper-1',tenantScope:'fictional-school51',
 originalNativeRendererRequired:'OriginalNativePaperEditor',
 sourceSha256:'a'.repeat(64),baselineSha256:'b'.repeat(64),
 previewSha256:'c'.repeat(64),printSha256:'d'.repeat(64),
 pdfA4MachineVerified:true,
})
const make=(count=2)=>makeVisualReviewDocket({
 preflight:fake(),claimedPdfPages:count,sourceCollectorRef:'external-collector-A'})
const page=(number,overrides={},notes='')=>({
 pageNumber:number,
 checks:Object.fromEntries(VISUAL_REVIEW_CHECKS.map(k=>[k,true])),
 notes,...overrides,
})
test('cannot make an approval or review docket from synthetic gate flags without exact four-file preflight',()=>{
 for(const input of [undefined,{},{
  ...fake(),actualFilesSelected:false},{
  ...fake(),status:'APPROVED'},{
  ...fake(),principalApprovalRecorded:true},{
  ...fake(),baselineSha256:'not-a-sha'},{
  ...fake(),productionCutoverAllowed:true}])
  assert.throws(()=>makeVisualReviewDocket({preflight:input,
   claimedPdfPages:1,sourceCollectorRef:'external-collector-A'}))
})
test('new worksheet binds four exact fingerprints and preserves human review / release blockers',()=>{
 const docket=make(2)
 assert.equal(verifyDocket(docket),true)
 assert.equal(docket.evidence.baselineSha256,'b'.repeat(64))
 assert.equal(docket.evidence.previewSha256,'c'.repeat(64))
 assert.equal(docket.capture.actualPdfPageCountMachineVerified,false)
 assert.equal(docket.review.status,'AWAITING_INDEPENDENT_PAGE_BY_PAGE_REVIEW')
 assert.equal(docket.review.reviewerSignatureVerified,false)
 assert.equal(docket.gate.productionCutoverAllowed,false)
})
test('refuses omitted/overlarge/untrusted PDF page claims and missing collector reference',()=>{
 for(const claimedPdfPages of [null,0,33,2.5,'2',-1]){
  assert.throws(()=>makeVisualReviewDocket({
   preflight:fake(),claimedPdfPages,sourceCollectorRef:'external-collector-A'}))
 }
 assert.throws(()=>makeVisualReviewDocket({preflight:fake(),claimedPdfPages:1,
  sourceCollectorRef:''}),/collector/)
})
test('unsigned digest and explicit false release flags are invariant to tampering or relabeling',()=>{
 const docket=make()
 docket.evidence.sourceSha256='f'.repeat(64)
 assert.throws(()=>verifyDocket(docket),/modified/)
 const forged=make()
 forged.gate.productionCutoverAllowed=true
 const {integrity,...rest}=forged
 forged.integrity.payloadSha256=hash(rest)
 assert.throws(()=>verifyDocket(forged),/self-approve/)
 const forge2=make()
 forge2.review.status='APPROVED'
 const {integrity:unused,...body}=forge2
 forge2.integrity.payloadSha256=hash(body)
 assert.throws(()=>verifyDocket(forge2),/self-approve/)
})
test('every claimed native PDF page and each checked category is required; duplicate page blocked',()=>{
 const docket=make()
 for(const observations of [
  [],[page(1)],[page(1),page(1)],
  [page(1),page(3)],
  [page(1),{...page(2),checks:{originalSchoolHeaderAndLogo:true}}],
  [page(1),{...page(2),checks:{...page(2).checks,
   originalSchoolHeaderAndLogo:'true'}}],
 ]){
  assert.throws(()=>recordPageObservations({
   docket,observerRef:'external-independent-observer-B',pageObservations:observations}))
 }
 assert.throws(()=>recordPageObservations({
  docket,observerRef:'external-collector-A',pageObservations:[page(1),page(2)]
 }),/distinct/)
})
test('discrepancies MUST carry notes and become hard blockers, even if all other pages pass',()=>{
 const docket=make()
 const failed=page(2,{checks:{...page(2).checks,
  urduJameelNooriAndRtlPunctuation:false}},'Original Urdu option bracket differs.')
 assert.throws(()=>recordPageObservations({docket,
  observerRef:'external-independent-observer-B',
  pageObservations:[page(1),{...failed,notes:''}]}),/discrepancies require notes/)
 const report=recordPageObservations({docket,
  observerRef:'external-independent-observer-B',pageObservations:[page(1),failed]})
 assert.equal(report.discrepancies.length,1)
 assert.equal(report.status,'DISCREPANCIES_RECORDED_RELEASE_BLOCKED')
 assert.ok(report.blockers.includes('VISUAL_REVIEW_DISCREPANCIES_RECORDED'))
 assert.equal(report.productionCutoverAllowed,false)
})
test('even all-TRUE unsigned reviewer checkboxes cannot approve or authorize production',()=>{
 const docket=make()
 const report=recordPageObservations({docket,
  observerRef:'external-independent-observer-B',
  independentlyVerifiedLiveSource:true,pageObservations:[page(1),page(2)]})
 assert.equal(report.status,'SELF_ATTESTED_OBSERVATIONS_AWAITING_INDEPENDENT_VERIFICATION')
 assert.equal(report.sameLiveOriginalSelfReported,true)
 assert.equal(report.actualSourceProvenanceVerifiedByTrustedAuthority,false)
 assert.equal(report.reviewerSignatureCryptographicallyVerified,false)
 assert.equal(report.independentlyApproved,false)
 assert.equal(report.sourceMutationAllowed,false)
 assert.equal(report.productionCutoverAllowed,false)
 assert.equal(report.actualEncryptedStagingBackupVerified,false)
 assert.ok(report.blockers.includes('GENUINE_ENCRYPTED_STAGING_BACKUP_FRESH_CLUSTER_RESTORE_UNVERIFIED'))
})
test('unknown A4 PDF geometry adds explicit blocker, never silently treats metadata absence as A4',()=>{
 const docket=makeVisualReviewDocket({preflight:{...fake(),pdfA4MachineVerified:false},
  claimedPdfPages:1,sourceCollectorRef:'external-collector-A'})
 const report=recordPageObservations({docket,observerRef:'external-independent-observer-B',
  pageObservations:[page(1)]})
 assert.ok(report.blockers.includes('PDF_PAGE_GEOMETRY_NOT_MACHINE_VERIFIED'))
})

test('opt-in handoff CLI never creates worksheet when originals are absent, and redacts failures',async()=>{
 const fs=require('node:fs/promises')
 const os=require('node:os')
 const path=require('node:path')
 const {spawnSync}=require('node:child_process')
 const script=path.resolve(__dirname,'../../../ops/paper-staging-review/phase3l-CREATE-UNAPPROVED-review-docket.cjs')
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'assps-phase3l-fake-'))
 try{
  const empty=spawnSync(process.execPath,[script],{encoding:'utf8',timeout:7000})
  assert.equal(empty.status,1)
  assert.match(empty.stderr,/PHASE3L_DOCKET_CREATION_REFUSED/u)
  assert.equal(empty.stdout,'')
  const output=path.join(root,'private-review.json')
  const opts=[
   '--baseline',path.join(root,'baseline.json'),
   '--manifest',path.join(root,'manifest.json'),
   '--preview',path.join(root,'original.png'),
   '--print',path.join(root,'original.pdf'),
   '--paper-id','fictional-paper-1',
   '--tenant-scope','fictional-school51',
   '--family','SAVED_PAPER',
   '--claimed-pdf-pages','2',
   '--collector-ref','external-collector-A',
   '--output',output,
  ]
  const missing=spawnSync(process.execPath,[script,...opts],{encoding:'utf8',timeout:7000})
  assert.equal(missing.status,1)
  assert.match(missing.stderr,/PHASE3L_DOCKET_CREATION_REFUSED/u)
  assert.equal(missing.stdout,'')
  await assert.rejects(()=>fs.stat(output),/ENOENT/)
 }finally{await fs.rm(root,{recursive:true,force:true})}
})
test('Phase3L CLI source-only guard: no output inside Git or overwriting, no public route',()=>{
 const fs=require('node:fs')
 const path=require('node:path')
 const script=fs.readFileSync(path.resolve(__dirname,
  '../../../ops/paper-staging-review/phase3l-CREATE-UNAPPROVED-review-docket.cjs'),'utf8')
 assert.match(script,/path\.resolve\(output\)\.toLowerCase\(\)\.startsWith\(repo\.toLowerCase\(\)\+path\.sep\)/u)
 assert.match(script,/await intakeNativeEvidence\(/u)
 assert.match(script,/await fs\.open\(output,'wx',0o600\)/u)
 assert.match(script,/productionCutoverAllowed:false,sourceMutationAllowed:false/u)
 assert.doesNotMatch(script,/axios|fetch\(|require\(['"][^'"]*database|UPDATE\s+paper_documents|app\.assps\.edu\.pk/u)
})

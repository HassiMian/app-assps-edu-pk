// Phase3N DORMANT, ORIGINAL REINSPECTION BOUNDARY. Saved unsigned review JSON
// cannot prove its own origin, even after a recalculated local SHA-256 checksum.
// Only this wrapper REOPENS the exact original 4 files and RERUNS an externally
// approved/pinned PDF inspector; no actor/signature/production approval inferred.
const {isDeepStrictEqual}=require('node:util')
const {intakeNativeEvidence}=require('./paperEvidenceIntakePhase3K.js')
const {inspectOriginalNativePdf}=require('./paperPdfPageInventoryPhase3M.js')
const {makeInventoriedReviewWorkpack,verifyInventoriedWorkpack}
 =require('./paperInventoriedReviewPhase3M.js')
const {createHash}=require('node:crypto')
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex')
function compareAgainstFreshlyInspectedOriginal({
 savedWorkpack,freshIntake,freshInventory
}={}){
 // This pure helper is only a comparison. It does NOT independently verify that
 // freshIntake or freshInventory came from any file / inspector. Never return
 // an inspection-complete attestation from this exported comparison helper.
 verifyInventoriedWorkpack(savedWorkpack)
 if(!freshIntake||!freshInventory||
  savedWorkpack.docket?.capture?.sourceCollectorRef===undefined)
  throw new Error('Cannot compare review workpack without independently recovered inputs.')
 const recomputed=makeInventoriedReviewWorkpack({
  preflight:freshIntake,inventory:freshInventory,
  sourceCollectorRef:savedWorkpack.docket.capture.sourceCollectorRef,
 })
 // Compare the ENTIRE canonical structure: binding SHA, paper ID/scope/family,
 // source/renderer, claimed PDF count, every page geometry and ALL release flags.
 // An attacker can rehash their own JSON; they cannot alter a freshly rerun
 // trusted inspector's page count, original printed bytes or baseline manifest.
 if(!isDeepStrictEqual(savedWorkpack,recomputed))
  throw new Error('Saved unsigned review worksheet differs from ORIGINAL reinspection.')
 return Object.freeze({
  status:'EXACT_CANONICAL_WORKPACK_COMPARISON_ONLY',
  savedWorkpackMatchesSuppliedInputs:true,
  independentOriginalReinspectionProvenByThisPureHelper:false,
  reviewerSignatureVerified:false,independentlyApproved:false,
  actualEncryptedStagingBackupRestored:false,
  productionCutoverAllowed:false,sourceMutationAllowed:false,
 })
}
async function reinspectSavedNativeWorkpack({
 baselinePath,manifestPath,previewPath,printPath,
 expectedPaperId,expectedTenantScope,expectedFamily,
 inspectorExecutablePath,expectedInspectorSha256,savedWorkpack
}={}){
 const input={baselinePath,manifestPath,previewPath,printPath,
  expectedPaperId,expectedTenantScope,expectedFamily}
 // Inspect selected original files FIRST; do not trust self-hashed saved fields.
 const freshIntake=await intakeNativeEvidence(input)
 const freshInventory=await inspectOriginalNativePdf({
  nativePdfPath:printPath,expectedPrintSha256:freshIntake.printSha256,
  inspectorExecutablePath,expectedInspectorSha256,
 })
 compareAgainstFreshlyInspectedOriginal({savedWorkpack,freshIntake,freshInventory})
 // Reopen/recheck ALL four original files AFTER the external inspector ran.
 // Phase3K also checks stable original metadata/digests during each intake.
 const second=await intakeNativeEvidence(input)
 for(const name of ['sourceSha256','baselineSha256','previewSha256','printSha256',
  'paperId','tenantScope','family','originalNativeRendererRequired']){
  if(second[name]!==freshIntake[name])
   throw new Error('An original native paper/evidence file changed while performing independent handoff.')
 }
 // A second exact comparison also binds the saved workpack to the final source
 // after the inspector process exits, rather than merely an early snapshot.
 compareAgainstFreshlyInspectedOriginal({
  savedWorkpack,freshIntake:second,freshInventory,
 })
 const refs={sourceSha256:freshIntake.sourceSha256,baselineSha256:freshIntake.baselineSha256,
  previewSha256:freshIntake.previewSha256,printSha256:freshIntake.printSha256,
  inspectorExecutableSha256:freshInventory.inspectorExecutableSha256,
  verifiedPdfPageCount:freshInventory.verifiedPdfPageCount,
  savedWorkpackSha256:savedWorkpack.integrity.payloadSha256}
 const publicSummary={
  status:'PHASE3N_RERUN_MATCHES_SAVED_UNAPPROVED_WORKPACK',
  fullFourOriginalEvidenceFilesRechecked:true,
  actualOriginalPdfAndHashPinnedInspectorReexecuted:true,
  eachOriginalNativePdfPageA4GeometryCompared:true,
  pageCount:freshInventory.verifiedPdfPageCount,
  sourceProvenanceConfirmedInOriginalLiveSignedInBrowser:false,
  independentHumanPageByPageSemanticParityReviewed:false,
  authenticatedReviewerSignatureVerified:false,
  realAuthorizedStagingBackupAndRestoreVerified:false,
  independentProductionReleaseAuthorityGranted:false,
  independentlyApproved:false,productionCutoverAllowed:false,
  sourceMutationAllowed:false,
  // Derived from this invocation; UNSIGNED; absence of a trusted signature still matters.
  localHandoffDigestSha256:sha(JSON.stringify(refs)),
 }
 return Object.freeze(publicSummary)
}
module.exports={compareAgainstFreshlyInspectedOriginal,reinspectSavedNativeWorkpack}

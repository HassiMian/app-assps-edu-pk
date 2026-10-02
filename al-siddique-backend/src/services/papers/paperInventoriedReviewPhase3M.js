// Bind Phase3M independently counted all-A4 native PDF pages to Phase3L
// unsigned human review docket. An inspector result NEVER grants actual approval.
const {createHash}=require('node:crypto')
const {makeVisualReviewDocket,verifyDocket,recordPageObservations}
 =require('./paperIndependentVisualDocketPhase3L.js')
const SHA=/^[a-f0-9]{64}$/u
const digest=x=>createHash('sha256').update(JSON.stringify(x),'utf8').digest('hex')
function checkInventory({preflight,inventory}={}){
 if(!preflight||preflight.actualFilesSelected!==true||
  preflight.status!=='FOUR_FILE_IDENTITY_VERIFIED_HUMAN_VISUAL_REVIEW_PENDING'||
  !SHA.test(preflight.printSha256||'')||!inventory||
  inventory.status!=='PDF_NATIVE_ALL_PAGES_A4_INDEPENDENTLY_INSPECTED'||
  inventory.originalPdfSha256!==preflight.printSha256||
  !SHA.test(inventory.inspectorExecutableSha256||'')||
  !Number.isSafeInteger(inventory.verifiedPdfPageCount)||
  inventory.verifiedPdfPageCount<1||inventory.verifiedPdfPageCount>32||
  !Array.isArray(inventory.pages)||
  inventory.pages.length!==inventory.verifiedPdfPageCount||
  !inventory.pages.every((p,i)=>p?.pageNumber===i+1&&p.a4FullSheetVerified===true&&
    Math.abs(p.widthPt-595.28)<5&&Math.abs(p.heightPt-841.89)<5)||
  inventory.independentlyApproved!==false||
  inventory.productionCutoverAllowed!==false||
  inventory.sourceMutationAllowed!==false)
  throw new Error('Actual independently inventoried full A4 print PDF must match exact Phase3K four-file SHA.')
 return inventory
}
function makeInventoriedReviewWorkpack({preflight,inventory,sourceCollectorRef}={}){
 const proof=checkInventory({preflight,inventory})
 const docket=makeVisualReviewDocket({
  preflight,claimedPdfPages:proof.verifiedPdfPageCount,sourceCollectorRef})
 const pack={
  format:'assps-phase3m-native-page-inventoried-review-workpack',version:1,
  docket,
  machineVerifiedInventory:{
   printSha256:proof.originalPdfSha256,
   trustedInspectorSha256:proof.inspectorExecutableSha256,
   pageCount:proof.verifiedPdfPageCount,
   pages:proof.pages.map(p=>({...p})),
   actualFullPdfPagesAndA4GeometryVerified:true,
   persistedInspectorInvocationCryptographicallyAttested:false,
   originalBrowserSourceProvenanceVerified:false,
   originalPdfTextAndPngSemanticParityVerified:false,
  },
  release:{independentlyApproved:false,actualHumanSignatureVerified:false,
   genuineEncryptedStagingBackupRestored:false,
   productionCutoverAllowed:false,sourceMutationAllowed:false},
 }
 pack.integrity={algorithm:'SHA-256',payloadSha256:digest(pack)}
 return pack
}
function verifyInventoriedWorkpack(pack){
 if(!pack||pack.format!=='assps-phase3m-native-page-inventoried-review-workpack'||
  pack.version!==1||pack.integrity?.algorithm!=='SHA-256')
  throw new Error('Not a Phase3M page-inventoried review workpack.')
 const {integrity,...rest}=pack
 if(!SHA.test(integrity.payloadSha256||'')||integrity.payloadSha256!==digest(rest))
  throw new Error('Unsigned Phase3M review workpack was changed.')
 verifyDocket(pack.docket)
 const inv=pack.machineVerifiedInventory
 if(!SHA.test(inv?.trustedInspectorSha256||'')||
  inv?.printSha256!==pack.docket.evidence.printSha256||
  inv?.actualFullPdfPagesAndA4GeometryVerified!==true||
  inv?.persistedInspectorInvocationCryptographicallyAttested!==false||
  inv?.originalBrowserSourceProvenanceVerified!==false||
  inv?.originalPdfTextAndPngSemanticParityVerified!==false||
  !Number.isSafeInteger(inv.pageCount)||inv.pageCount<1||inv.pageCount>32||
  inv.pageCount!==pack.docket.capture.claimedPdfPages||
  !Array.isArray(inv.pages)||inv.pages.length!==inv.pageCount||
  !inv.pages.every((p,i)=>p.pageNumber===i+1&&p.a4FullSheetVerified===true&&
    Math.abs(p.widthPt-595.28)<5&&Math.abs(p.heightPt-841.89)<5)||
  Object.values(pack.release||{}).some(v=>v!==false)||
  Object.keys(pack.release||{}).length!==5)
  throw new Error('Reviewer checklist cannot bypass actual verified native PDF page coverage or release gates.')
 return true
}
function recordInventoriedPageObservations({workpack,observerRef,pageObservations,
 independentlyVerifiedLiveSource=false}={}){
 verifyInventoriedWorkpack(workpack)
 const report=recordPageObservations({docket:workpack.docket,observerRef,
  pageObservations,independentlyVerifiedLiveSource})
 const combined={...report,
  originalPhase3LObservationSha256:report.integrity.payloadSha256,
  verifiedFullNativePdfPageCount:workpack.machineVerifiedInventory.pageCount,
  countAndA4PageGeometryToolVerified:true,
  humanSourceProvenanceAndOriginalPrintParityStillPending:true,
  reviewerSignatureCryptographicallyVerified:false,independentlyApproved:false,
  productionCutoverAllowed:false,sourceMutationAllowed:false}
 const {integrity,...unsigned}=combined
 combined.integrity={algorithm:'SHA-256',payloadSha256:digest(unsigned)}
 return combined
}
module.exports={makeInventoriedReviewWorkpack,verifyInventoriedWorkpack,
 recordInventoriedPageObservations}

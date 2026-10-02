// Phase3L DORMANT: privacy-minimal page-by-page human REVIEW WORKSHEET.
// Neither file hashes nor unsigned manual observations authorize a live release.
const {createHash}=require('node:crypto')
const sha=x=>createHash('sha256').update(JSON.stringify(x),'utf8').digest('hex')
const fingerprint=/^[a-f0-9]{64}$/u
const checks=Object.freeze([
 'originalSchoolHeaderAndLogo','completeQuestionTextAndOrder',
 'allQuestionMarksAndTotal','mcqOptionsLabelsAndBrackets',
 'urduJameelNooriAndRtlPunctuation','englishTimesNewRomanAndLtr',
 'originalSketchesDiagramsAndAssets','tablesBordersAndAnswerLines',
 'a4MarginsPageBreaksAndNoClipping','originalEditorPngAndNativePdfParity',
])
const fixedBlockers=Object.freeze([
 'LIVE_NATIVE_SOURCE_PROVENANCE_INDEPENDENTLY_UNVERIFIED',
 'INDEPENDENT_HUMAN_VISUAL_SIGNOFF_AND_PROVENANCE_MISSING',
 'AUTHORIZED_PERSISTENT_NONPRODUCTION_STAGING_UNVERIFIED',
 'GENUINE_ENCRYPTED_STAGING_BACKUP_FRESH_CLUSTER_RESTORE_UNVERIFIED',
 'PRODUCTION_AUTH_AND_SECRET_ROUTING_NOT_APPROVED',
])
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const clean=x=>typeof x==='string'&&x.trim()&&x.length<=160
function verifyFingerprintPreflight(preflight){
 if(!isObject(preflight)||
  preflight.status!=='FOUR_FILE_IDENTITY_VERIFIED_HUMAN_VISUAL_REVIEW_PENDING'||
  preflight.actualFilesSelected!==true||
  preflight.independentlyApproved!==false||
  preflight.productionCutoverAllowed!==false||
  preflight.sourceMutationAllowed!==false||
  preflight.principalApprovalRecorded!==false||
  preflight.independentLivePaperProvenanceEstablished!==false||
  !['SAVED_PAPER','EARLY_YEARS_REFERENCE'].includes(preflight.family)||
  !clean(preflight.paperId)||!clean(preflight.tenantScope)||
  !clean(preflight.originalNativeRendererRequired)||
  ![preflight.sourceSha256,preflight.baselineSha256,preflight.previewSha256,
    preflight.printSha256].every(x=>typeof x==='string'&&fingerprint.test(x))||
  typeof preflight.pdfA4MachineVerified!=='boolean')
  throw new Error('Only verified EXACT FOUR original file identities can initiate an unapproved review worksheet.')
 return preflight
}
function makeVisualReviewDocket({preflight,claimedPdfPages,sourceCollectorRef}={}){
 verifyFingerprintPreflight(preflight)
 if(!Number.isSafeInteger(claimedPdfPages)||claimedPdfPages<1||claimedPdfPages>32)
  throw new Error('Explicit MANUALLY CLAIMED PDF page count must be an integer from 1 to 32; not machine verified.')
 if(!clean(sourceCollectorRef))
  throw new Error('External source collector reference required (not an asserted verified identity).')
 const docket={
  format:'assps-phase3l-independent-visual-review-docket',version:1,
  evidence:{family:preflight.family,paperId:preflight.paperId,
   tenantScope:preflight.tenantScope,originalRenderer:preflight.originalNativeRendererRequired,
   sourceSha256:preflight.sourceSha256,baselineSha256:preflight.baselineSha256,
   previewSha256:preflight.previewSha256,printSha256:preflight.printSha256},
  capture:{sourceCollectorRef,claimedPdfPages,
   actualPdfPageCountMachineVerified:false,
   pdfA4DeclaredMetadataVerified:preflight.pdfA4MachineVerified,
   liveSourceAndSameRevisionIndependentlyConfirmed:false},
  checklistItems:[...checks],
  review:{status:'AWAITING_INDEPENDENT_PAGE_BY_PAGE_REVIEW',
   observerIdentityIndependentlyVerified:false,reviewerSignatureVerified:false,
   visualParityIndependentlyCertified:false},
  gate:{principalApprovalRecorded:false,persistentStagingAuthorizationVerified:false,
   actualEncryptedBackupRestoreVerified:false,productionCutoverAllowed:false,
   sourceMutationAllowed:false},
 }
 docket.integrity={algorithm:'SHA-256',payloadSha256:sha(docket)}
 return docket
}
function verifyDocket(docket){
 if(!isObject(docket)||docket.format!=='assps-phase3l-independent-visual-review-docket'||
    docket.version!==1||docket.integrity?.algorithm!=='SHA-256')
  throw new Error('Not a Phase3L review worksheet.')
 const {integrity,...unsigned}=docket
 if(!fingerprint.test(integrity.payloadSha256||'')||sha(unsigned)!==integrity.payloadSha256)
  throw new Error('Phase3L review worksheet was modified: source fingerprint changed.')
 if(!isObject(docket.gate)||Object.values(docket.gate).some(v=>v!==false)||
    docket.review?.status!=='AWAITING_INDEPENDENT_PAGE_BY_PAGE_REVIEW'||
    docket.review?.observerIdentityIndependentlyVerified!==false||
    docket.review?.reviewerSignatureVerified!==false||
    docket.review?.visualParityIndependentlyCertified!==false||
    docket.capture?.actualPdfPageCountMachineVerified!==false||
    docket.capture?.liveSourceAndSameRevisionIndependentlyConfirmed!==false||
    !Number.isSafeInteger(docket.capture.claimedPdfPages)||
    docket.capture.claimedPdfPages<1||docket.capture.claimedPdfPages>32||
    JSON.stringify(docket.checklistItems)!==JSON.stringify(checks)||
    !['SAVED_PAPER','EARLY_YEARS_REFERENCE'].includes(docket.evidence?.family)||
    ![docket.evidence?.sourceSha256,docket.evidence?.baselineSha256,
      docket.evidence?.previewSha256,docket.evidence?.printSha256].every(v=>
      typeof v==='string'&&fingerprint.test(v)))
  throw new Error('Unsigned worksheet may not self-approve, change gate or rewrite checklist.')
 return true
}
function recordPageObservations({docket,observerRef,pageObservations,
 independentlyVerifiedLiveSource=false}={}){
 verifyDocket(docket)
 if(!clean(observerRef)||observerRef===docket.capture.sourceCollectorRef)
  throw new Error('Use distinct external observer reference; actual identity still unverified.')
 if(!Array.isArray(pageObservations)||
  pageObservations.length!==docket.capture.claimedPdfPages)
  throw new Error('Every CLAIMED original native PDF page requires a separate observation.')
 const pages=pageObservations.map((item,i)=>{
  if(!isObject(item)||item.pageNumber!==i+1||
    !isObject(item.checks)||Object.keys(item.checks).length!==checks.length||
    !checks.every(k=>Object.hasOwn(item.checks,k)&&typeof item.checks[k]==='boolean')||
    typeof item.notes!=='string'||item.notes.length>600||
    checks.some(k=>item.checks[k]===false&&!item.notes.trim()))
   throw new Error('Missing, duplicated or invalid page-by-page review checks; discrepancies require notes.')
  return {pageNumber:i+1,checks:Object.fromEntries(checks.map(k=>[k,item.checks[k]])),
   notes:item.notes}
 })
 const discrepancies=pages.flatMap(p=>checks.filter(k=>p.checks[k]===false)
  .map(k=>({pageNumber:p.pageNumber,category:k})))
 const blockers=[...fixedBlockers]
 if(!docket.capture.pdfA4DeclaredMetadataVerified)
  blockers.push('PDF_PAGE_GEOMETRY_NOT_MACHINE_VERIFIED')
 if(discrepancies.length)blockers.push('VISUAL_REVIEW_DISCREPANCIES_RECORDED')
 if(!independentlyVerifiedLiveSource)
  blockers.push('OBSERVER_HAS_NOT_SELF_REPORTED_LIVE_SOURCE_MATCH')
 const report={
  format:'assps-phase3l-unsigned-review-observation',version:1,
  docketSha256:docket.integrity.payloadSha256,
  exactFourFileFingerprints:{...docket.evidence},
  declaredPdfPageCount:docket.capture.claimedPdfPages,
  pdfPagesMachineCounted:false,observerRef,
  sameLiveOriginalSelfReported:independentlyVerifiedLiveSource===true,
  actualSourceProvenanceVerifiedByTrustedAuthority:false,
  pages,discrepancies,
  status:discrepancies.length?'DISCREPANCIES_RECORDED_RELEASE_BLOCKED':
   'SELF_ATTESTED_OBSERVATIONS_AWAITING_INDEPENDENT_VERIFICATION',
  blockers,reviewerSignatureCryptographicallyVerified:false,
  independentlyApproved:false,productionCutoverAllowed:false,
  sourceMutationAllowed:false,actualEncryptedStagingBackupVerified:false,
 }
 report.integrity={algorithm:'SHA-256',payloadSha256:sha(report)}
 return report
}
module.exports={makeVisualReviewDocket,verifyDocket,recordPageObservations,
 VISUAL_REVIEW_CHECKS:checks}

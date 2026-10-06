const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const HASH=/^[0-9a-f]{64}$/
const ID=/^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,127}$/
const text=v=>String(v??'').trim()
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
function validDate(v){const d=new Date(v);return Number.isFinite(d.getTime())&&d.getTime()<=Date.now()+300000}
function failure(status,code,message,issues=[]){const e=new Error(message);e.status=status;e.code=code;e.issues=issues;return e}
function readVerifiedPublisherEvidence(options={}){
  const evidencePath=options.evidencePath||process.env.PAPER_CURRICULUM_PUBLISHER_EVIDENCE_PATH
  const expected=text(options.evidenceSha256||process.env.PAPER_CURRICULUM_PUBLISHER_EVIDENCE_SHA256)
  if(!evidencePath||!fs.existsSync(evidencePath))throw failure(500,'PUBLISHER_EVIDENCE_UNAVAILABLE','Publisher evidence file is unavailable.')
  const bytes=fs.readFileSync(evidencePath),actual=sha(bytes)
  if(!HASH.test(expected)||actual!==expected)throw failure(500,'PUBLISHER_EVIDENCE_SHA_MISMATCH','Publisher evidence hash verification failed.')
  const evidence=JSON.parse(bytes.toString('utf8')),art=evidence?.artifacts?.officialSourceManifest
  if(!art?.file||!HASH.test(text(art.sha256)))throw failure(500,'OFFICIAL_MANIFEST_COORDINATE_INVALID','Official manifest coordinate is invalid.')
  const manifestPath=path.resolve(path.dirname(evidencePath),art.file)
  if(!manifestPath.startsWith(path.resolve(path.dirname(evidencePath))+path.sep)||!fs.existsSync(manifestPath))throw failure(500,'OFFICIAL_MANIFEST_UNAVAILABLE','Official manifest is unavailable.')
  const mbytes=fs.readFileSync(manifestPath)
  if(sha(mbytes)!==art.sha256)throw failure(500,'OFFICIAL_MANIFEST_SHA_MISMATCH','Official manifest hash verification failed.')
  return {evidence,evidencePath,manifest:JSON.parse(mbytes.toString('utf8')),manifestSha256:art.sha256}
}
function ledgerInfo(medium,options={}){
  const name=medium==='English'?'biology9EnglishEvidenceLedger.json':'biology9UrduEvidenceLedger.json'
  const ledgerPath=options.ledgerPaths?.[medium]||path.join(__dirname,'curriculumReviewedEvidenceV6G2',name)
  const bytes=fs.readFileSync(ledgerPath),ledger=JSON.parse(bytes.toString('utf8'))
  return {file:name,path:ledgerPath,sha256:sha(bytes),recordStatus:ledger.recordStatus||null,totals:ledger.totals||null}
}
function validateReview(name,record,entry,ledger,forbidReviewerIds=[]){
  const r=record&&typeof record==='object'?record:{},issues=[]
  if(r.status!=='INDEPENDENTLY_APPROVED')issues.push('STATUS_NOT_INDEPENDENTLY_APPROVED')
  if(!ID.test(text(r.evidenceId)))issues.push('INVALID_EVIDENCE_ID')
  if(!Number.isInteger(Number(r.reviewerId))||Number(r.reviewerId)<=0)issues.push('INVALID_REVIEWER_ID')
  if(forbidReviewerIds.map(text).includes(text(r.reviewerId)))issues.push('REVIEWER_NOT_INDEPENDENT')
  if(!validDate(r.reviewDate))issues.push('INVALID_REVIEW_DATE')
  if(text(r.recordId)!==text(entry.recordId))issues.push('RECORD_ID_MISMATCH')
  if(text(r.pdfSha256)!==text(entry.pdfSha256))issues.push('PDF_SHA_MISMATCH')
  if(text(r.reviewedLedgerSha256)!==ledger.sha256)issues.push('LEDGER_SHA_MISMATCH')
  if(!text(r.approvedEdition)||['VERIFY','UNCONFIRMED','PENDING'].includes(text(r.approvedEdition).toUpperCase()))issues.push('APPROVED_EDITION_REQUIRED')
  if(!['PDF_BYTES_VERIFIED_EDITION_REVIEWED','FULLY_INDEPENDENTLY_VERIFIED'].includes(text(r.downloadStatus)))issues.push('INVALID_DOWNLOAD_STATUS')
  if(r.chapterIndexStatus!=='INDEPENDENTLY_VERIFIED')issues.push('CHAPTER_INDEX_NOT_INDEPENDENTLY_VERIFIED')
  if(r.exerciseIndexStatus!=='INDEPENDENTLY_VERIFIED')issues.push('EXERCISE_INDEX_NOT_INDEPENDENTLY_VERIFIED')
  if(text(r.rationale).length<12)issues.push('RATIONALE_REQUIRED')
  return {name,valid:issues.length===0,issues,record:r}
}
function validatePublisherEditionReviewPreflight(proposal,options={}){
  const {evidence,manifest,manifestSha256}=readVerifiedPublisherEvidence(options)
  const entries=Array.isArray(manifest?.entries)?manifest.entries:[]
  const pair={}
  for(const medium of ['English','Urdu']){
    const matches=entries.filter(e=>e.grade===9&&text(e.subject).toLowerCase()==='biology'&&e.medium===medium)
    if(matches.length!==1)throw failure(409,'OFFICIAL_SOURCE_NOT_UNIQUE',`${medium} official Biology source is not unique.`)
    pair[medium]=matches[0]
  }
  const ledgers={English:ledgerInfo('English',options),Urdu:ledgerInfo('Urdu',options)}
  const forbid=options.forbidReviewerIds||[]
  const reviews={
    English:validateReview('English',proposal?.English,pair.English,ledgers.English,forbid),
    Urdu:validateReview('Urdu',proposal?.Urdu,pair.Urdu,ledgers.Urdu,forbid),
  }
  const b=proposal?.bilingualEquivalence&&typeof proposal.bilingualEquivalence==='object'?proposal.bilingualEquivalence:{},bIssues=[]
  if(b.status!=='INDEPENDENTLY_APPROVED')bIssues.push('STATUS_NOT_INDEPENDENTLY_APPROVED')
  if(!ID.test(text(b.evidenceId)))bIssues.push('INVALID_EVIDENCE_ID')
  if(!Number.isInteger(Number(b.reviewerId))||Number(b.reviewerId)<=0)bIssues.push('INVALID_REVIEWER_ID')
  if(forbid.map(text).includes(text(b.reviewerId)))bIssues.push('REVIEWER_NOT_INDEPENDENT')
  if(!validDate(b.reviewDate))bIssues.push('INVALID_REVIEW_DATE')
  if(text(b.enPdfSha256)!==text(pair.English.pdfSha256))bIssues.push('EN_PDF_SHA_MISMATCH')
  if(text(b.urPdfSha256)!==text(pair.Urdu.pdfSha256))bIssues.push('UR_PDF_SHA_MISMATCH')
  if(text(b.enLedgerSha256)!==ledgers.English.sha256)bIssues.push('EN_LEDGER_SHA_MISMATCH')
  if(text(b.urLedgerSha256)!==ledgers.Urdu.sha256)bIssues.push('UR_LEDGER_SHA_MISMATCH')
  if(text(b.rationale).length<12)bIssues.push('RATIONALE_REQUIRED')
  const issues=[...reviews.English.issues.map(i=>`English:${i}`),...reviews.Urdu.issues.map(i=>`Urdu:${i}`),...bIssues.map(i=>`bilingualEquivalence:${i}`)]
  if(issues.length)throw failure(409,'PUBLISHER_EDITION_REVIEW_INVALID','Publisher edition review proposal is invalid.',issues)
  const patch={}
  for(const medium of ['English','Urdu']){
    const r=reviews[medium].record,e=pair[medium]
    patch[e.recordId]={downloadStatus:text(r.downloadStatus),edition:text(r.approvedEdition),chapterIndexStatus:'INDEPENDENTLY_VERIFIED',exerciseIndexStatus:'INDEPENDENTLY_VERIFIED',questionGenerationStatus:e.questionGenerationStatus}
  }
  return {
    valid:true,architectureVersion:'v6-g15-publisher-edition-review-preflight-1',
    source:{publisherEvidenceSha256:sha(fs.readFileSync(options.evidencePath||process.env.PAPER_CURRICULUM_PUBLISHER_EVIDENCE_PATH)),manifestSha256,sourceCommit:evidence.sourceCommit||null},
    ledgers,
    proposedManifestPatch:patch,
    editionEvidence:{status:'INDEPENDENTLY_APPROVED',evidenceId:text(b.evidenceId),reviewerId:Number(b.reviewerId),enPdfSha256:pair.English.pdfSha256,urPdfSha256:pair.Urdu.pdfSha256},
    invariant:{questionGenerationStatusChanged:false,liveSeedCountChanged:false,questionBankChanged:false},
    policy:{validationOnly:true,manifestMutated:false,persisted:false,academicQuestionReleased:false,publisherApprovalChanged:false,canonicalWriteChanged:false},
    nextAction:'GOVERNED_MANIFEST_PATCH_REVIEW_REQUIRED_BEFORE_ANY_QUESTION_RELEASE',
  }
}
module.exports={validatePublisherEditionReviewPreflight,readVerifiedPublisherEvidence,ledgerInfo}

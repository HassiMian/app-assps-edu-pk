const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {validatePublisherEditionReviewPreflight,readVerifiedPublisherEvidence}=require('./paperPublisherEditionReviewPreflightV6G15')
const HASH=/^[0-9a-f]{64}$/
const ID=/^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,127}$/
const text=v=>String(v??'').trim()
const sha=v=>crypto.createHash('sha256').update(v).digest('hex')
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.keys(v).sort().reduce((o,k)=>(o[k]=stable(v[k]),o),{}):v)
const canonical=v=>JSON.stringify(stable(v))
const validDate=v=>{const d=new Date(v);return Number.isFinite(d.getTime())&&d.getTime()<=Date.now()+300000}
function reviewerIssues(r,forbidden=[]){const x=[];if(!Number.isInteger(Number(r?.reviewerId))||Number(r.reviewerId)<=0)x.push('INVALID_REVIEWER_ID');if(forbidden.map(String).includes(String(r?.reviewerId)))x.push('REVIEWER_NOT_INDEPENDENT');if(!ID.test(text(r?.evidenceId)))x.push('INVALID_EVIDENCE_ID');if(!validDate(r?.reviewDate))x.push('INVALID_REVIEW_DATE');return x}
function buildAcademicPublicationPrecheck(bundle,options={}){
  const issues=[]
  let edition=null
  try{edition=(options.validateEditionReview||validatePublisherEditionReviewPreflight)(bundle?.editionReviewProposal||{},options)}catch(e){const xs=Array.isArray(e.issues)&&e.issues.length?e.issues:[e.code||'EDITION_REVIEW_INVALID'];issues.push(...xs.map(x=>`editionReview:${x}`))}
  const verified=(options.readVerifiedEvidence||readVerifiedPublisherEvidence)(options)
  const basePath=path.join(__dirname,'curriculumReviewedEvidenceV6G2','biology9Chapter1SourceIssues.json')
  const baseBytes=fs.readFileSync(basePath),baseHash=sha(baseBytes),base=JSON.parse(baseBytes)
  if(baseHash!=='8b94fbb99340ca5558c936e7cefe0e628bf083b174bacfc7c4a16d6d5b83f524')issues.push('conflicts:BASE_PIN_MISMATCH')
  const decisions=Array.isArray(bundle?.conflictDecisions)?bundle.conflictDecisions:[]
  for(const src of base.issues||[]){const d=decisions.find(x=>x?.id===src.id);if(!d){issues.push(`${src.id}:DECISION_MISSING`);continue}issues.push(...reviewerIssues(d,options.forbidReviewerIds).map(x=>`${src.id}:${x}`));if(d.status!=='INDEPENDENTLY_RESOLVED')issues.push(`${src.id}:STATUS_NOT_RESOLVED`);if(d.reviewedBaseArtifactSha256!==baseHash)issues.push(`${src.id}:BASE_ARTIFACT_SHA_MISMATCH`);if(!['SOURCE_ACCEPTED_AS_PRESCRIBED','ERRATA_CLARIFICATION_REQUIRED','QUESTION_EXCLUSION_CONFIRMED'].includes(text(d.decision)))issues.push(`${src.id}:INVALID_DECISION`);if(text(d.rationale).length<20)issues.push(`${src.id}:RATIONALE_REQUIRED`)}
  const coveragePath=path.join(__dirname,'curriculumReviewedEvidenceV6G2','biology9ExerciseQuestionPageCoverageV6G6.json')
  const coverage=JSON.parse(fs.readFileSync(coveragePath,'utf8'))
  const q=bundle?.approvedQuestion||{}
  issues.push(...reviewerIssues(q,options.forbidReviewerIds).map(x=>`approvedQuestion:${x}`))
  if(q.status!=='INDEPENDENTLY_APPROVED')issues.push('approvedQuestion:STATUS_NOT_INDEPENDENTLY_APPROVED')
  if(!ID.test(text(q.questionEvidenceId)))issues.push('approvedQuestion:INVALID_QUESTION_EVIDENCE_ID')
  if(!HASH.test(text(q.sourceSnapshotSha256)))issues.push('approvedQuestion:INVALID_SOURCE_SNAPSHOT_SHA')
  if(!['English','Urdu'].includes(q.medium))issues.push('approvedQuestion:INVALID_MEDIUM')
  if(Number(q.grade)!==9||text(q.subject).toLowerCase()!=='biology')issues.push('approvedQuestion:SCOPE_MISMATCH')
  const mapped=q.medium&&coverage?.sources?.[q.medium]?.mapped?.find(x=>x.sourceRef===q.sourceRef)
  if(!mapped)issues.push('approvedQuestion:SOURCE_REF_NOT_EXACTLY_MAPPED')
  const expectedPdf=q.medium==='English'?edition?.editionEvidence?.enPdfSha256:q.medium==='Urdu'?edition?.editionEvidence?.urPdfSha256:null
  if(expectedPdf&&q.sourcePdfSha256!==expectedPdf)issues.push('approvedQuestion:SOURCE_PDF_SHA_MISMATCH')
  if(!expectedPdf)issues.push('approvedQuestion:EDITION_BINDING_UNAVAILABLE')
  const records=Array.isArray(bundle?.publicationRecords)?bundle.publicationRecords:[]
  const recordsDigest=sha(canonical(records))
  const p=bundle?.signedPublication||{}
  if(p.status!=='PUBLISHED_APPROVED')issues.push('signedPublication:STATUS_NOT_PUBLISHED_APPROVED')
  if(p.trustOrigin!=='SERVER_INDEPENDENT_AUDIT')issues.push('signedPublication:TRUST_ORIGIN_INVALID')
  if(p.signatureVerification!=='PINNED_ED25519_VERIFIED')issues.push('signedPublication:SIGNATURE_NOT_PINNED_VERIFIED')
  if(!ID.test(text(p.publicationId)))issues.push('signedPublication:INVALID_PUBLICATION_ID')
  if(!Number.isSafeInteger(Number(p.revision))||Number(p.revision)<=0)issues.push('signedPublication:INVALID_REVISION')
  if(!records.length)issues.push('signedPublication:PUBLICATION_RECORDS_REQUIRED')
  if(p.recordsDigest!==recordsDigest)issues.push('signedPublication:RECORDS_DIGEST_MISMATCH')
  if(Number(p.recordCount)!==records.length||records.length<1)issues.push('signedPublication:RECORD_COUNT_MISMATCH')
  if(p.syntheticFixture!==false)issues.push('signedPublication:SYNTHETIC_FIXTURE_FORBIDDEN')
  return {architectureVersion:'v6-g16-academic-publication-precheck-1',valid:issues.length===0,editionReview:edition?{valid:true,architectureVersion:edition.architectureVersion,editionEvidence:edition.editionEvidence,invariant:edition.invariant}:null,pinnedConflictBase:{sha256:baseHash,issueIds:(base.issues||[]).map(x=>x.id)},approvedQuestionBinding:mapped?{sourceRef:mapped.sourceRef,medium:q.medium,verifiedPhysicalPage:mapped.verifiedPhysicalPage,sourcePdfSha256:q.sourcePdfSha256}:null,publication:{recordsDigest,recordCount:records.length},publisherEvidence:{sourceCommit:verified.evidence?.sourceCommit||null,manifestSha256:verified.manifestSha256},issues:[...new Set(issues)],policy:{validationOnly:true,persisted:false,manifestMutated:false,questionBankChanged:false,academicApprovalChanged:false,publisherApprovalChanged:false,canonicalWriteChanged:false,selfApprovalAllowed:false},nextAction:issues.length?'RESOLVE_EXTERNAL_ACADEMIC_PUBLICATION_EVIDENCE':'ASSEMBLE_SIGNED_PUBLISHER_EVIDENCE_WITHOUT_ENABLING_WRITES'}
}
module.exports={buildAcademicPublicationPrecheck,canonical}

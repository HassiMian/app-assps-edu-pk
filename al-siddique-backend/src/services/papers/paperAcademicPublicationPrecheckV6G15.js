const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')

const HASH=/^[0-9a-f]{64}$/
const ID=/^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,127}$/
const text=v=>String(v??'').trim()
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const validDate=v=>{const d=new Date(v);return Number.isFinite(d.getTime())&&d.getTime()<=Date.now()+300000}
const fail=(status,code,message)=>{const e=new Error(message);e.status=status;e.code=code;return e}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function validReviewer(r,forbidden=[]){const issues=[];if(!Number.isInteger(Number(r?.reviewerId))||Number(r.reviewerId)<=0)issues.push('INVALID_REVIEWER_ID');if(forbidden.map(String).includes(String(r?.reviewerId)))issues.push('REVIEWER_NOT_INDEPENDENT');if(!ID.test(text(r?.evidenceId)))issues.push('INVALID_EVIDENCE_ID');if(!validDate(r?.reviewDate))issues.push('INVALID_REVIEW_DATE');return issues}

function buildAcademicPublicationPrecheck(bundle,{publisherEvidencePath,forbidReviewerIds=[]}={}){
  const evidencePath=publisherEvidencePath||process.env.PAPER_CURRICULUM_PUBLISHER_EVIDENCE_PATH
  if(!evidencePath||!fs.existsSync(evidencePath))throw fail(500,'PUBLISHER_EVIDENCE_UNAVAILABLE','Publisher evidence file is unavailable.')
  const publisher=readJson(evidencePath)
  const manifestArtifact=publisher?.artifacts?.officialSourceManifest
  if(!manifestArtifact?.file||!HASH.test(text(manifestArtifact.sha256)))throw fail(500,'SOURCE_MANIFEST_COORDINATE_INVALID','Official source manifest coordinate is invalid.')
  const manifestPath=path.resolve(path.dirname(evidencePath),manifestArtifact.file)
  if(!manifestPath.startsWith(path.resolve(path.dirname(evidencePath))+path.sep)||!fs.existsSync(manifestPath))throw fail(500,'SOURCE_MANIFEST_UNAVAILABLE','Official source manifest is unavailable.')
  const manifestBytes=fs.readFileSync(manifestPath)
  if(sha(manifestBytes)!==manifestArtifact.sha256)throw fail(500,'SOURCE_MANIFEST_SHA_MISMATCH','Official source manifest hash verification failed.')
  const manifest=JSON.parse(manifestBytes.toString('utf8'))
  const pair={}
  for(const medium of ['English','Urdu']){
    const rows=(manifest.entries||[]).filter(e=>e.grade===9&&String(e.subject).toLowerCase()==='biology'&&e.medium===medium)
    if(rows.length===1)pair[medium]=rows[0]
  }

  const issues=[]
  const edition=bundle?.editionEvidence||{}
  issues.push(...validReviewer(edition,forbidReviewerIds).map(x=>'editionEvidence:'+x))
  if(edition.status!=='INDEPENDENTLY_APPROVED')issues.push('editionEvidence:STATUS_NOT_INDEPENDENTLY_APPROVED')
  if(!pair.English||!pair.Urdu)issues.push('editionEvidence:SOURCE_PAIR_NOT_UNIQUE')
  if(pair.English&&edition.enPdfSha256!==pair.English.pdfSha256)issues.push('editionEvidence:EN_PDF_SHA_MISMATCH')
  if(pair.Urdu&&edition.urPdfSha256!==pair.Urdu.pdfSha256)issues.push('editionEvidence:UR_PDF_SHA_MISMATCH')
  if(text(edition.result)!=='EQUIVALENT_FOR_GRADE9_BIOLOGY')issues.push('editionEvidence:INVALID_EQUIVALENCE_RESULT')
  if(text(edition.rationale).length<20)issues.push('editionEvidence:RATIONALE_REQUIRED')

  const baseIssuePath=path.resolve(__dirname,'curriculumReviewedEvidenceV6G2/biology9Chapter1SourceIssues.json')
  const baseBytes=fs.readFileSync(baseIssuePath)
  const baseHash=sha(baseBytes)
  const base=JSON.parse(baseBytes.toString('utf8'))
  if(baseHash!=='8b94fbb99340ca5558c936e7cefe0e628bf083b174bacfc7c4a16d6d5b83f524')issues.push('conflicts:BASE_PIN_MISMATCH')
  const decisions=Array.isArray(bundle?.conflictDecisions)?bundle.conflictDecisions:[]
  for(const source of base.issues||[]){
    const d=decisions.find(x=>x?.id===source.id)
    if(!d){issues.push(`${source.id}:DECISION_MISSING`);continue}
    issues.push(...validReviewer(d,forbidReviewerIds).map(x=>`${source.id}:${x}`))
    if(d.status!=='INDEPENDENTLY_RESOLVED')issues.push(`${source.id}:STATUS_NOT_RESOLVED`)
    if(d.reviewedBaseArtifactSha256!==baseHash)issues.push(`${source.id}:BASE_ARTIFACT_SHA_MISMATCH`)
    if(!['SOURCE_ACCEPTED_AS_PRESCRIBED','ERRATA_CLARIFICATION_REQUIRED','QUESTION_EXCLUSION_CONFIRMED'].includes(text(d.decision)))issues.push(`${source.id}:INVALID_DECISION`)
    if(text(d.rationale).length<20)issues.push(`${source.id}:RATIONALE_REQUIRED`)
  }

  const publication=bundle?.signedPublication||{}
  if(publication.status!=='PUBLISHED_APPROVED')issues.push('signedPublication:STATUS_NOT_PUBLISHED_APPROVED')
  if(publication.trustOrigin!=='SERVER_INDEPENDENT_AUDIT')issues.push('signedPublication:TRUST_ORIGIN_INVALID')
  if(publication.signatureVerification!=='PINNED_ED25519_VERIFIED')issues.push('signedPublication:SIGNATURE_NOT_PINNED_VERIFIED')
  if(!ID.test(text(publication.publicationId)))issues.push('signedPublication:INVALID_PUBLICATION_ID')
  if(!Number.isSafeInteger(Number(publication.revision))||Number(publication.revision)<=0)issues.push('signedPublication:INVALID_REVISION')
  if(!HASH.test(text(publication.recordsDigest)))issues.push('signedPublication:INVALID_RECORDS_DIGEST')
  if(!Number.isSafeInteger(Number(publication.recordCount))||Number(publication.recordCount)<=0)issues.push('signedPublication:INVALID_RECORD_COUNT')
  if(publication.syntheticFixture!==false)issues.push('signedPublication:SYNTHETIC_FIXTURE_FORBIDDEN')

  const question=bundle?.approvedQuestion||{}
  issues.push(...validReviewer(question,forbidReviewerIds).map(x=>'approvedQuestion:'+x))
  if(question.status!=='INDEPENDENTLY_APPROVED')issues.push('approvedQuestion:STATUS_NOT_INDEPENDENTLY_APPROVED')
  if(!ID.test(text(question.questionEvidenceId)))issues.push('approvedQuestion:INVALID_QUESTION_EVIDENCE_ID')
  if(!HASH.test(text(question.sourceSnapshotSha256)))issues.push('approvedQuestion:INVALID_SOURCE_SNAPSHOT_SHA')
  if(!['English','Urdu'].includes(question.medium))issues.push('approvedQuestion:INVALID_MEDIUM')
  if(Number(question.grade)!==9||text(question.subject).toLowerCase()!=='biology')issues.push('approvedQuestion:SCOPE_MISMATCH')

  return {
    architectureVersion:'v6-g15-academic-publication-precheck-1',
    valid:issues.length===0,
    sourceManifest:{file:manifestArtifact.file,sha256:manifestArtifact.sha256,englishPdfSha256:pair.English?.pdfSha256||null,urduPdfSha256:pair.Urdu?.pdfSha256||null},
    pinnedConflictBase:{file:path.basename(baseIssuePath),sha256:baseHash,issueIds:(base.issues||[]).map(x=>x.id)},
    issues:[...new Set(issues)],
    policy:{validationOnly:true,persisted:false,academicApprovalChanged:false,publisherApprovalChanged:false,canonicalWriteChanged:false,selfApprovalAllowed:false},
    nextAction:issues.length?'RESOLVE_EXTERNAL_ACADEMIC_PUBLICATION_EVIDENCE':'ASSEMBLE_GOVERNED_PUBLISHER_EVIDENCE_WITHOUT_ENABLING_WRITES'
  }
}
module.exports={buildAcademicPublicationPrecheck}

const REVIEW_NAMES = [
  'signedPublisherKeyCustody',
  'independentSubjectGrantLiveSource',
  'isolatedDbCredentialsAndRls',
  'institutionalBackupRestore',
  'teacherStudentResponsePrivacy',
  'multiInstanceIntentSafety',
  'bilingualPrintWordPdfParity',
  'canaryRollbackApproved',
]
const PLACEHOLDER = /^(pending|reviewer|required|todo|tbd|unknown|none|n\/a|na|0+|.*[_-]required)$/i
const HASH = /^[0-9a-f]{64}$/
const ID = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,127}$/

function text(v){ return String(v ?? '').trim() }
function validId(v){ const s=text(v); return ID.test(s) && !PLACEHOLDER.test(s) }
function validDate(v){ const d=new Date(v); return Number.isFinite(d.getTime()) && d.getTime() <= Date.now()+300000 }
function validateReviewRecord(name, review, {grade=9,subject='Biology',forbidReviewerIds=[]}={}) {
  const issues=[]
  const r=review && typeof review==='object' ? review : {}
  if(!REVIEW_NAMES.includes(name)) issues.push('UNKNOWN_REVIEW_NAME')
  if(r.status!=='INDEPENDENTLY_APPROVED') issues.push('STATUS_NOT_INDEPENDENTLY_APPROVED')
  if(!validId(r.evidenceId)) issues.push('INVALID_EVIDENCE_ID')
  if(!Number.isInteger(Number(r.reviewerId)) || Number(r.reviewerId) <= 0) issues.push('INVALID_REVIEWER_ID')
  if(forbidReviewerIds.map(text).includes(text(r.reviewerId))) issues.push('REVIEWER_NOT_INDEPENDENT')
  if(!HASH.test(text(r.reviewedArtifactSha256))) issues.push('INVALID_ARTIFACT_SHA256')
  if(!validDate(r.reviewDate)) issues.push('INVALID_REVIEW_DATE')
  if(Number(r.scope?.grade)!==Number(grade) || text(r.scope?.subject).toLowerCase()!==text(subject).toLowerCase()) issues.push('SCOPE_MISMATCH')
  if(!['APPROVED','APPROVED_WITH_RECORDED_LIMITATIONS'].includes(text(r.result))) issues.push('INVALID_REVIEW_RESULT')
  if(text(r.result)==='APPROVED_WITH_RECORDED_LIMITATIONS' && text(r.limitations).length<12) issues.push('LIMITATIONS_REQUIRED')
  if(text(r.rationale).length<12) issues.push('RATIONALE_REQUIRED')
  return {name,valid:issues.length===0,issues}
}
function validateReviewBundle(bundle, options={}) {
  const reviews=bundle?.operationalReviews || bundle?.reviews || {}
  const results=REVIEW_NAMES.map(name=>validateReviewRecord(name,reviews[name],options))
  return {architectureVersion:'v6-g4-independent-review-intake-1',valid:results.every(x=>x.valid),results,issues:results.flatMap(x=>x.issues.map(i=>`${x.name}:${i}`))}
}
module.exports={REVIEW_NAMES,validateReviewRecord,validateReviewBundle}

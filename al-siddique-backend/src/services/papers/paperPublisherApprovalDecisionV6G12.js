const { verifyPublisherDetachedSignature } = require('./paperPublisherDetachedSignatureV6G11')

const HASH=/^[0-9a-f]{64}$/
const ID=/^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,127}$/
const text=v=>String(v??'').trim()
function validDate(v){const d=new Date(v);return Number.isFinite(d.getTime())&&d.getTime()<=Date.now()+300000}
function failure(status,code,message,issues=[]){const e=new Error(message);e.status=status;e.code=code;e.issues=issues;return e}

function validatePublisherApprovalDecision(reviewBundle,signatureRecord,approvalRecord,options={}) {
  const verifySignature=options.verifyPublisherDetachedSignature||verifyPublisherDetachedSignature
  const signature=verifySignature(reviewBundle,signatureRecord,options)
  const r=approvalRecord&&typeof approvalRecord==='object'?approvalRecord:{}
  const issues=[]
  if(r.status!=='GOVERNED_PRODUCTION_APPROVAL')issues.push('STATUS_NOT_GOVERNED_PRODUCTION_APPROVAL')
  if(r.decision!=='APPROVE_FOR_PRODUCTION')issues.push('DECISION_NOT_APPROVE_FOR_PRODUCTION')
  if(!ID.test(text(r.approvalId)))issues.push('INVALID_APPROVAL_ID')
  if(!Number.isInteger(Number(r.approverUserId))||Number(r.approverUserId)<=0)issues.push('INVALID_APPROVER_USER_ID')
  if((options.forbidApproverIds||[]).map(text).includes(text(r.approverUserId)))issues.push('APPROVER_NOT_INDEPENDENT')
  if(!validDate(r.approvedAt))issues.push('INVALID_APPROVAL_DATE')
  if(Number(r.scope?.grade)!==9||text(r.scope?.subject).toLowerCase()!=='biology')issues.push('SCOPE_MISMATCH')
  if(!HASH.test(text(r.envelopeSha256))||text(r.envelopeSha256)!==signature.envelopeSha256)issues.push('ENVELOPE_SHA_MISMATCH')
  if(!HASH.test(text(r.detachedSignatureSha256))||text(r.detachedSignatureSha256)!==signature.detachedSignatureSha256)issues.push('DETACHED_SIGNATURE_SHA_MISMATCH')
  if(!HASH.test(text(r.publisherPublicKeyFingerprintSha256))||text(r.publisherPublicKeyFingerprintSha256)!==signature.publicKeyFingerprintSha256)issues.push('PUBLISHER_PUBLIC_KEY_FINGERPRINT_MISMATCH')
  if(text(r.rationale).length<12)issues.push('RATIONALE_REQUIRED')
  if(!ID.test(text(r.releaseTicketId)))issues.push('INVALID_RELEASE_TICKET_ID')
  if(issues.length)throw failure(409,'PUBLISHER_APPROVAL_DECISION_INVALID','Governed publisher approval decision is invalid.',issues)
  return {
    valid:true,
    architectureVersion:'v6-g12-publisher-approval-decision-1',
    approval:{approvalId:text(r.approvalId),approverUserId:Number(r.approverUserId),approvedAt:text(r.approvedAt),releaseTicketId:text(r.releaseTicketId),scope:{grade:9,subject:'Biology'},decision:r.decision,rationale:text(r.rationale)},
    bindings:{envelopeSha256:signature.envelopeSha256,detachedSignatureSha256:signature.detachedSignatureSha256,publisherPublicKeyFingerprintSha256:signature.publicKeyFingerprintSha256},
    policy:{validationOnly:true,persisted:false,approvalFlagChanged:false,canonicalWriteChanged:false,signatureCreated:false,privateKeyAccessed:false},
    nextAction:'EXPLICIT_PRODUCTION_APPROVAL_FLAG_CHANGE_REVIEW_REQUIRED',
  }
}

module.exports={validatePublisherApprovalDecision}

const crypto=require('node:crypto')
const HASH=/^[0-9a-f]{64}$/
const ID=/^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,127}$/
const text=v=>String(v??'').trim()
function validDate(v){const d=new Date(v);return Number.isFinite(d.getTime())&&d.getTime()<=Date.now()+300000}
function failure(status,code,message,issues=[]){const e=new Error(message);e.status=status;e.code=code;e.issues=issues;return e}
function fingerprint(publicKey){const der=publicKey.export({type:'spki',format:'der'});return crypto.createHash('sha256').update(der).digest('hex')}
function validatePublisherKeyCustodyPreflight(publicKeyPem,custodyRecord,options={}){
  const pem=text(publicKeyPem)
  if(!pem)throw failure(400,'PUBLISHER_PUBLIC_KEY_REQUIRED','Publisher public key is required.')
  if(/PRIVATE KEY/i.test(pem))throw failure(400,'PRIVATE_KEY_MATERIAL_FORBIDDEN','Private key material must never be submitted to the application server.')
  let key
  try{key=crypto.createPublicKey(pem)}catch{throw failure(400,'PUBLISHER_PUBLIC_KEY_INVALID','Publisher public key could not be parsed.')}
  if(key.asymmetricKeyType!=='ed25519')throw failure(409,'PUBLISHER_PUBLIC_KEY_TYPE_UNSUPPORTED','Publisher public key must be Ed25519.')
  const fp=fingerprint(key)
  const r=custodyRecord&&typeof custodyRecord==='object'?custodyRecord:{}
  const issues=[]
  if(r.status!=='INDEPENDENTLY_APPROVED')issues.push('STATUS_NOT_INDEPENDENTLY_APPROVED')
  if(!ID.test(text(r.evidenceId)))issues.push('INVALID_EVIDENCE_ID')
  if(!Number.isInteger(Number(r.reviewerId))||Number(r.reviewerId)<=0)issues.push('INVALID_REVIEWER_ID')
  if((options.forbidReviewerIds||[]).map(text).includes(text(r.reviewerId)))issues.push('REVIEWER_NOT_INDEPENDENT')
  if(!validDate(r.reviewDate))issues.push('INVALID_REVIEW_DATE')
  if(Number(r.scope?.grade)!==9||text(r.scope?.subject).toLowerCase()!=='biology')issues.push('SCOPE_MISMATCH')
  if(r.keyType!=='Ed25519')issues.push('KEY_TYPE_MISMATCH')
  if(!HASH.test(text(r.publicKeyFingerprintSha256))||text(r.publicKeyFingerprintSha256)!==fp)issues.push('PUBLIC_KEY_FINGERPRINT_MISMATCH')
  if(!['EXTERNAL_OFFLINE','EXTERNAL_HSM'].includes(text(r.privateKeyCustodyMode)))issues.push('INVALID_PRIVATE_KEY_CUSTODY_MODE')
  if(r.privateKeyStoredOnApplicationServer!==false)issues.push('PRIVATE_KEY_SERVER_STORAGE_FORBIDDEN')
  if(r.rotationProcedureApproved!==true)issues.push('ROTATION_PROCEDURE_NOT_APPROVED')
  if(r.revocationProcedureApproved!==true)issues.push('REVOCATION_PROCEDURE_NOT_APPROVED')
  if(!HASH.test(text(r.reviewedArtifactSha256)))issues.push('INVALID_REVIEWED_ARTIFACT_SHA256')
  if(text(r.rationale).length<12)issues.push('RATIONALE_REQUIRED')
  if(issues.length)throw failure(409,'PUBLISHER_KEY_CUSTODY_INVALID','Publisher key custody evidence is invalid.',issues)
  return {
    valid:true,
    architectureVersion:'v6-g14-publisher-key-custody-preflight-1',
    publicKey:{type:'Ed25519',fingerprintSha256:fp,pemAccepted:true},
    custody:{evidenceId:text(r.evidenceId),reviewerId:Number(r.reviewerId),reviewDate:text(r.reviewDate),scope:{grade:9,subject:'Biology'},privateKeyCustodyMode:text(r.privateKeyCustodyMode),reviewedArtifactSha256:text(r.reviewedArtifactSha256),rationale:text(r.rationale)},
    policy:{validationOnly:true,publicKeyPersisted:false,privateKeyAccepted:false,privateKeyAccessed:false,envChanged:false,publisherApprovalChanged:false,canonicalWriteChanged:false},
    nextAction:'SEAL_EXTERNAL_KEY_CUSTODY_EVIDENCE_AS_G9_REVIEW_ARTIFACT_AND_CONFIGURE_PUBLIC_KEY_ONLY',
  }
}
module.exports={validatePublisherKeyCustodyPreflight,fingerprint}

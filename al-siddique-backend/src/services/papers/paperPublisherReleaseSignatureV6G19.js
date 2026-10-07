const crypto=require('node:crypto')
const {buildPublisherReleaseEnvelope}=require('./paperPublisherReleaseEnvelopeV6G17')
const {canonicalJson}=require('./paperPublisherPromotionEnvelopeV6G10')

const HASH=/^[0-9a-f]{64}$/
const text=v=>String(v??'').trim()
const FORBIDDEN_KEYS=new Set(['privatekey','privatekeypem','privatekeyjwk','privatekeyder','secretkey','signingkey','signingprivatekey'])
function failure(status,code,message,extra={}){const e=new Error(message);e.status=status;e.code=code;Object.assign(e,extra);return e}
function keyFingerprint(publicKey){return crypto.createHash('sha256').update(publicKey.export({type:'spki',format:'der'})).digest('hex')}
function containsPrivateKeyMaterial(value,depth=0){
  if(depth>12)return false
  if(typeof value==='string')return /-----BEGIN (?:[A-Z0-9 ]* )?PRIVATE KEY-----/i.test(value)||/-----BEGIN OPENSSH PRIVATE KEY-----/i.test(value)
  if(!value||typeof value!=='object')return false
  if(Array.isArray(value))return value.some(v=>containsPrivateKeyMaterial(v,depth+1))
  for(const [k,v] of Object.entries(value)){
    const nk=String(k).toLowerCase().replace(/[^a-z0-9]/g,'')
    if(FORBIDDEN_KEYS.has(nk))return true
    if(containsPrivateKeyMaterial(v,depth+1))return true
  }
  return false
}
function strictBase64(value){
  const s=text(value)
  if(!s||s.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(s))throw failure(400,'PUBLISHER_SIGNATURE_ENCODING_INVALID','Publisher detached signature must be canonical base64.')
  const b=Buffer.from(s,'base64')
  if(b.length!==64||b.toString('base64')!==s)throw failure(400,'PUBLISHER_SIGNATURE_ENCODING_INVALID','Publisher detached signature encoding or length is invalid.')
  return b
}

function verifyPublisherReleaseDetachedSignature(releaseBundle,signatureRecord,options={}){
  if(containsPrivateKeyMaterial(releaseBundle)||containsPrivateKeyMaterial(signatureRecord))throw failure(400,'PRIVATE_KEY_INPUT_FORBIDDEN','Private key material is forbidden. This verifier accepts public evidence and a detached signature only.')
  const buildRelease=options.buildPublisherReleaseEnvelope||buildPublisherReleaseEnvelope
  const release=buildRelease(releaseBundle||{},options)
  if(!release?.valid||release?.architectureVersion!=='v6-g17-publisher-release-envelope-1')throw failure(409,'G17_RELEASE_ENVELOPE_INVALID','A valid V6-G17 publisher release envelope is required.')
  const publicKeyPem=text(releaseBundle?.publicKeyPem)
  if(!publicKeyPem)throw failure(400,'PUBLISHER_PUBLIC_KEY_REQUIRED','The custody-reviewed publisher public key is required.')
  let publicKey
  try{publicKey=crypto.createPublicKey(publicKeyPem)}catch{throw failure(400,'PUBLISHER_PUBLIC_KEY_INVALID','Publisher public key could not be parsed.')}
  if(publicKey.asymmetricKeyType!=='ed25519')throw failure(409,'PUBLISHER_PUBLIC_KEY_TYPE_UNSUPPORTED','Publisher public key must be Ed25519.')
  const fingerprint=keyFingerprint(publicKey)
  const boundFingerprint=text(release.envelope?.publisherPublicKey?.fingerprintSha256)
  if(!HASH.test(boundFingerprint)||fingerprint!==boundFingerprint)throw failure(409,'G17_PUBLIC_KEY_BINDING_MISMATCH','Publisher public key does not match the key bound into the G17 release envelope.')
  const claimedFingerprint=text(signatureRecord?.publicKeyFingerprintSha256)
  if(claimedFingerprint!==fingerprint)throw failure(409,'PUBLISHER_SIGNATURE_KEY_MISMATCH','Detached signature record does not bind the G17 publisher public key fingerprint.')
  const claimedEnvelopeSha=text(signatureRecord?.envelopeSha256)
  if(claimedEnvelopeSha!==release.envelopeSha256)throw failure(409,'PUBLISHER_SIGNATURE_ENVELOPE_MISMATCH','Detached signature record does not bind the current G17 release envelope hash.')
  const signature=strictBase64(signatureRecord?.signatureBase64)
  const canonical=canonicalJson(release.envelope)
  if(!crypto.verify(null,Buffer.from(canonical),publicKey,signature))throw failure(409,'PUBLISHER_RELEASE_SIGNATURE_INVALID','Detached publisher signature verification failed for the G17 release envelope.')
  return {
    valid:true,
    architectureVersion:'v6-g19-publisher-release-detached-signature-1',
    releaseEnvelopeSha256:release.envelopeSha256,
    publicKeyFingerprintSha256:fingerprint,
    signatureAlgorithm:'Ed25519',
    signatureVerified:true,
    detachedSignatureSha256:crypto.createHash('sha256').update(signature).digest('hex'),
    signedAt:text(signatureRecord?.signedAt)||null,
    signerId:text(signatureRecord?.signerId)||null,
    policy:{verificationOnly:true,signatureCreated:false,privateKeyAccepted:false,privateKeyAccessed:false,signerIdentityAuthenticated:false,persisted:false,academicApprovalChanged:false,publisherApprovalChanged:false,canonicalWriteChanged:false,selfApprovalAllowed:false},
    nextAction:'GOVERNED_PUBLISHER_APPROVAL_REVIEW_REQUIRED_WITH_REAL_EXTERNAL_IDENTITY_EVIDENCE',
  }
}
module.exports={verifyPublisherReleaseDetachedSignature,keyFingerprint,containsPrivateKeyMaterial}

const fs = require('node:fs')
const crypto = require('node:crypto')
const { buildPublisherPromotionEnvelope, canonicalJson } = require('./paperPublisherPromotionEnvelopeV6G10')

const HASH = /^[0-9a-f]{64}$/
const text = v => String(v ?? '').trim()
function failure(status,code,message,extra={}) { const e=new Error(message); e.status=status; e.code=code; Object.assign(e,extra); return e }
function keyFingerprint(publicKey) {
  const der = publicKey.export({type:'spki',format:'der'})
  return crypto.createHash('sha256').update(der).digest('hex')
}

function verifyPublisherDetachedSignature(bundle, signatureRecord, options={}) {
  const buildEnvelope = options.buildPublisherPromotionEnvelope || buildPublisherPromotionEnvelope
  const envelopeResult = buildEnvelope(bundle,options)
  const publicKeyPath = options.publicKeyPath || process.env.PAPER_CURRICULUM_PUBLISHER_PUBLIC_KEY_PATH
  const expectedFingerprint = text(options.publicKeyFingerprintSha256 || process.env.PAPER_CURRICULUM_PUBLISHER_PUBLIC_KEY_FINGERPRINT_SHA256)
  if (!publicKeyPath || !fs.existsSync(publicKeyPath)) throw failure(409,'PUBLISHER_PUBLIC_KEY_UNAVAILABLE','Publisher public key is not configured.')
  if (!HASH.test(expectedFingerprint)) throw failure(409,'PUBLISHER_PUBLIC_KEY_FINGERPRINT_UNAVAILABLE','Publisher public key fingerprint is not configured.')
  let publicKey
  try { publicKey = crypto.createPublicKey(fs.readFileSync(publicKeyPath)) }
  catch { throw failure(500,'PUBLISHER_PUBLIC_KEY_INVALID','Publisher public key could not be parsed.') }
  if (publicKey.asymmetricKeyType !== 'ed25519') throw failure(409,'PUBLISHER_PUBLIC_KEY_TYPE_UNSUPPORTED','Publisher public key must be Ed25519.')
  const actualFingerprint = keyFingerprint(publicKey)
  if (actualFingerprint !== expectedFingerprint) throw failure(409,'PUBLISHER_PUBLIC_KEY_FINGERPRINT_MISMATCH','Publisher public key fingerprint does not match the governed fingerprint.')

  const signatureBase64 = text(signatureRecord?.signatureBase64)
  const keyFingerprintClaim = text(signatureRecord?.publicKeyFingerprintSha256)
  const signedEnvelopeSha256 = text(signatureRecord?.envelopeSha256)
  if (!signatureBase64) throw failure(400,'PUBLISHER_SIGNATURE_REQUIRED','Detached publisher signature is required.')
  if (keyFingerprintClaim !== actualFingerprint) throw failure(409,'PUBLISHER_SIGNATURE_KEY_MISMATCH','Signature record public-key fingerprint does not match the governed key.')
  if (signedEnvelopeSha256 !== envelopeResult.envelopeSha256) throw failure(409,'PUBLISHER_SIGNATURE_ENVELOPE_MISMATCH','Signature record does not bind the current promotion envelope hash.')
  let signature
  try { signature = Buffer.from(signatureBase64,'base64') }
  catch { throw failure(400,'PUBLISHER_SIGNATURE_ENCODING_INVALID','Publisher signature encoding is invalid.') }
  if (!signature.length) throw failure(400,'PUBLISHER_SIGNATURE_ENCODING_INVALID','Publisher signature encoding is invalid.')
  const canonical = canonicalJson(envelopeResult.envelope)
  const verified = crypto.verify(null,Buffer.from(canonical),publicKey,signature)
  if (!verified) throw failure(409,'PUBLISHER_SIGNATURE_INVALID','Detached publisher signature verification failed.')
  return {
    valid:true,
    architectureVersion:'v6-g11-publisher-detached-signature-1',
    envelopeSha256:envelopeResult.envelopeSha256,
    publicKeyFingerprintSha256:actualFingerprint,
    signatureAlgorithm:'Ed25519',
    signatureVerified:true,
    detachedSignatureSha256:crypto.createHash('sha256').update(signature).digest('hex'),
    signedAt:text(signatureRecord?.signedAt)||null,
    signerId:text(signatureRecord?.signerId)||null,
    policy:{verificationOnly:true,signatureCreated:false,privateKeyAccessed:false,persisted:false,publisherApprovalChanged:false,canonicalWriteChanged:false},
    nextAction:'GOVERNED_PUBLISHER_APPROVAL_DECISION_REQUIRED',
  }
}

module.exports={verifyPublisherDetachedSignature,keyFingerprint}

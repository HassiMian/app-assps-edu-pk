const test=require('node:test')
const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const {canonicalJson}=require('../services/papers/paperPublisherPromotionEnvelopeV6G10')
const {verifyPublisherReleaseDetachedSignature,keyFingerprint}=require('../services/papers/paperPublisherReleaseSignatureV6G18')

function fixture(){
  const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519')
  const publicKeyPem=publicKey.export({type:'spki',format:'pem'})
  const fingerprint=keyFingerprint(publicKey)
  const envelope={architectureVersion:'v6-g17-publisher-release-envelope-1',scope:{grade:9,subject:'Biology'},promotionEnvelopeSha256:'1'.repeat(64),publisherEvidenceSha256:'2'.repeat(64),publisherSourceCommit:'3'.repeat(40),publisherPublicKey:{type:'ed25519',fingerprintSha256:fingerprint},custodyEvidence:{evidenceId:'custody-real-external',reviewerId:98,reviewDate:'2026-10-06T12:00:00.000Z',reviewedArtifactSha256:'4'.repeat(64),privateKeyCustodyMode:'EXTERNAL_OFFLINE'},editionEvidence:{status:'INDEPENDENTLY_APPROVED'},conflictBaseSha256:'5'.repeat(64),conflictIssueIds:['a','b'],approvedQuestionBinding:{sourceRef:'p1'},publication:{recordsDigest:'6'.repeat(64),recordCount:1},policy:{envelopeIsApproval:false,signatureCreated:false,privateKeyAccepted:false,privateKeyAccessed:false,persisted:false,publisherApprovalChanged:false,canonicalWriteChanged:false,selfApprovalAllowed:false},requiredNextAction:'REAL_EXTERNAL_SIGNATURE_OVER_G17_RELEASE_ENVELOPE_THEN_GOVERNED_APPROVAL'}
  const canonical=canonicalJson(envelope),envelopeSha256=crypto.createHash('sha256').update(canonical).digest('hex')
  const release={valid:true,architectureVersion:'v6-g17-publisher-release-envelope-1',envelope,envelopeSha256}
  const signature=crypto.sign(null,Buffer.from(canonical),privateKey).toString('base64')
  const record={signatureBase64:signature,publicKeyFingerprintSha256:fingerprint,envelopeSha256,signedAt:'2026-10-06T12:01:00.000Z',signerId:'external-publisher-operator'}
  return {publicKeyPem,release,record,privateKey}
}
test('G18 verifies a real detached Ed25519 signature over exact G17 canonical envelope bytes',()=>{const f=fixture();const r=verifyPublisherReleaseDetachedSignature({publicKeyPem:f.publicKeyPem},f.record,{buildPublisherReleaseEnvelope:()=>f.release});assert.equal(r.valid,true);assert.equal(r.signatureVerified,true);assert.equal(r.policy.privateKeyAccepted,false);assert.equal(r.policy.privateKeyAccessed,false);assert.equal(r.policy.publisherApprovalChanged,false);assert.equal(r.policy.canonicalWriteChanged,false);assert.equal(r.policy.signerIdentityAuthenticated,false)})
test('G18 fails closed when signature record binds a different G17 envelope hash',()=>{const f=fixture();assert.throws(()=>verifyPublisherReleaseDetachedSignature({publicKeyPem:f.publicKeyPem},{...f.record,envelopeSha256:'f'.repeat(64)},{buildPublisherReleaseEnvelope:()=>f.release}),e=>e.code==='PUBLISHER_SIGNATURE_ENVELOPE_MISMATCH')})
test('G18 fails closed on a tampered detached signature',()=>{const f=fixture();const raw=Buffer.from(f.record.signatureBase64,'base64');raw[0]^=1;assert.throws(()=>verifyPublisherReleaseDetachedSignature({publicKeyPem:f.publicKeyPem},{...f.record,signatureBase64:raw.toString('base64')},{buildPublisherReleaseEnvelope:()=>f.release}),e=>e.code==='PUBLISHER_RELEASE_SIGNATURE_INVALID')})
test('G18 rejects private key material before release-envelope verification',()=>{const f=fixture();const privateKeyPem=f.privateKey.export({type:'pkcs8',format:'pem'});assert.throws(()=>verifyPublisherReleaseDetachedSignature({publicKeyPem:f.publicKeyPem,privateKeyPem},f.record,{buildPublisherReleaseEnvelope:()=>{throw Error('must not execute')}}),e=>e.code==='PRIVATE_KEY_INPUT_FORBIDDEN')})

const crypto=require('node:crypto')
const {buildPublisherPromotionEnvelope,canonicalJson}=require('./paperPublisherPromotionEnvelopeV6G10')
const {validatePublisherKeyCustodyPreflight}=require('./paperPublisherKeyCustodyPreflightV6G14')
const {buildAcademicPublicationPrecheck}=require('./paperAcademicPublicationPrecheckV6G16')

function failure(status,code,message,issues=[]){const e=new Error(message);e.status=status;e.code=code;e.issues=issues;return e}
const sha=v=>crypto.createHash('sha256').update(v).digest('hex')

function buildPublisherReleaseEnvelope(input,options={}){
  const body=input&&typeof input==='object'?input:{}
  const promotion=(options.buildPublisherPromotionEnvelope||buildPublisherPromotionEnvelope)(body.reviewBundle||{},options)
  const custody=(options.validatePublisherKeyCustodyPreflight||validatePublisherKeyCustodyPreflight)(body.publicKeyPem,body.custody||{},options)
  const academic=(options.buildAcademicPublicationPrecheck||buildAcademicPublicationPrecheck)(body.academicPublicationBundle||{},options)
  if(!academic?.valid)throw failure(409,'ACADEMIC_PUBLICATION_PRECHECK_BLOCKED','Academic/publication evidence is not independently complete.',academic?.issues||[])
  if(!promotion?.valid)throw failure(409,'PROMOTION_ENVELOPE_BLOCKED','Operational review promotion envelope is not valid.')
  if(!custody?.valid)throw failure(409,'KEY_CUSTODY_PREFLIGHT_BLOCKED','Publisher key custody evidence is not valid.')

  const envelope={
    architectureVersion:'v6-g17-publisher-release-envelope-1',
    scope:{grade:9,subject:'Biology'},
    promotionEnvelopeSha256:promotion.envelopeSha256,
    publisherEvidenceSha256:promotion.envelope?.publisherEvidenceSha256||null,
    publisherSourceCommit:promotion.envelope?.publisherSourceCommit||null,
    publisherPublicKey:{type:custody.publicKey.type,fingerprintSha256:custody.publicKey.fingerprintSha256},
    custodyEvidence:{evidenceId:custody.custody.evidenceId,reviewerId:custody.custody.reviewerId,reviewDate:custody.custody.reviewDate,reviewedArtifactSha256:custody.custody.reviewedArtifactSha256,privateKeyCustodyMode:custody.custody.privateKeyCustodyMode},
    editionEvidence:academic.editionReview?.editionEvidence||null,
    conflictBaseSha256:academic.pinnedConflictBase?.sha256||null,
    conflictIssueIds:academic.pinnedConflictBase?.issueIds||[],
    approvedQuestionBinding:academic.approvedQuestionBinding||null,
    publication:{recordsDigest:academic.publication?.recordsDigest||null,recordCount:Number(academic.publication?.recordCount||0)},
    policy:{
      envelopeIsApproval:false,
      signatureCreated:false,
      privateKeyAccepted:false,
      privateKeyAccessed:false,
      persisted:false,
      publisherApprovalChanged:false,
      canonicalWriteChanged:false,
      selfApprovalAllowed:false,
    },
    requiredNextAction:'REAL_EXTERNAL_SIGNATURE_OVER_G17_RELEASE_ENVELOPE_THEN_GOVERNED_APPROVAL',
  }
  const canonical=canonicalJson(envelope)
  return {valid:true,architectureVersion:envelope.architectureVersion,envelope,envelopeSha256:sha(canonical),canonicalBytes:Buffer.byteLength(canonical),policy:envelope.policy,nextAction:envelope.requiredNextAction}
}

module.exports={buildPublisherReleaseEnvelope}

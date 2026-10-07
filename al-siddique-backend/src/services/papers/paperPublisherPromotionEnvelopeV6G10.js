const crypto = require('node:crypto')
const { REVIEW_NAMES } = require('./paperIndependentReviewIntakeV6G4')
const { buildPublisherPromotionPrecheck } = require('./paperPublisherPromotionPrecheckV6G9')

const text = v => String(v ?? '').trim()
function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((out,key)=>{out[key]=stable(value[key]);return out},{})
  }
  return value
}
function canonicalJson(value) { return JSON.stringify(stable(value)) }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex') }
function failure(status,code,message,extra={}) { const e=new Error(message); e.status=status; e.code=code; Object.assign(e,extra); return e }

function buildPublisherPromotionEnvelope(bundle, options={}) {
  const precheckFn = options.buildPublisherPromotionPrecheck || buildPublisherPromotionPrecheck
  const precheck = precheckFn(bundle,options)
  if (!precheck?.valid) throw failure(409,'PUBLISHER_PROMOTION_PRECHECK_BLOCKED','Publisher promotion precheck is not valid.',{issues:precheck?.issues||[]})
  const reviews = bundle?.operationalReviews || bundle?.reviews || {}
  const reviewRecords = REVIEW_NAMES.map(name=>({
    name,
    status:text(reviews[name]?.status),
    evidenceId:text(reviews[name]?.evidenceId),
    reviewerId:Number(reviews[name]?.reviewerId),
    reviewedArtifactSha256:text(reviews[name]?.reviewedArtifactSha256),
    reviewDate:text(reviews[name]?.reviewDate),
    scope:{grade:Number(reviews[name]?.scope?.grade),subject:text(reviews[name]?.scope?.subject)},
    result:text(reviews[name]?.result),
    rationale:text(reviews[name]?.rationale),
    limitations:text(reviews[name]?.limitations),
  }))
  const envelopeBody = {
    architectureVersion:'v6-g10-publisher-promotion-envelope-1',
    publisherEvidenceSha256:precheck.publisherEvidence.sha256,
    publisherSourceCommit:precheck.publisherEvidence.sourceCommit,
    operationalReviewEvidenceSha256:precheck.operationalReviewEvidence.sha256,
    scope:{grade:9,subject:'Biology'},
    reviews:reviewRecords,
    bindingSummary:precheck.bindings.map(x=>({name:x.name,reviewedArtifactSha256:x.claimedSha256,sealedArtifactSha256:x.expectedSha256,status:x.status})),
    policy:{
      envelopeIsApproval:false,
      signatureCreated:false,
      publisherApprovalChanged:false,
      canonicalWriteChanged:false,
      persistencePerformed:false,
      selfApprovalAllowed:false,
    },
    requiredNextAction:'REAL_EXTERNAL_PUBLISHER_SIGNATURE_AND_GOVERNED_APPROVAL',
  }
  const canonical = canonicalJson(envelopeBody)
  return {
    valid:true,
    architectureVersion:envelopeBody.architectureVersion,
    envelope:envelopeBody,
    envelopeSha256:sha256(canonical),
    canonicalBytes:Buffer.byteLength(canonical),
    policy:envelopeBody.policy,
    nextAction:envelopeBody.requiredNextAction,
  }
}

module.exports={buildPublisherPromotionEnvelope,canonicalJson}

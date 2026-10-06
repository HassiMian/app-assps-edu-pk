const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { validateReviewBundle, REVIEW_NAMES } = require('./paperIndependentReviewIntakeV6G4')

const HASH = /^[0-9a-f]{64}$/
const text = v => String(v ?? '').trim()
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')

function readJson(file) {
  return JSON.parse(fs.readFileSync(file,'utf8'))
}
function fail(status,code,message){const e=new Error(message);e.status=status;e.code=code;return e}

function buildPublisherPromotionPrecheck(bundle, options={}) {
  const evidencePath = options.evidencePath || process.env.PAPER_CURRICULUM_PUBLISHER_EVIDENCE_PATH
  const expectedPublisherSha = text(options.evidenceSha256 || process.env.PAPER_CURRICULUM_PUBLISHER_EVIDENCE_SHA256)
  if (!evidencePath || !fs.existsSync(evidencePath)) throw fail(500,'PUBLISHER_EVIDENCE_UNAVAILABLE','Publisher evidence file is unavailable.')
  const publisherBytes = fs.readFileSync(evidencePath)
  const publisherSha = sha256(publisherBytes)
  if (!HASH.test(expectedPublisherSha) || publisherSha !== expectedPublisherSha) throw fail(500,'PUBLISHER_EVIDENCE_SHA_MISMATCH','Publisher evidence hash verification failed.')
  const publisher = JSON.parse(publisherBytes.toString('utf8'))
  const artifact = publisher?.artifacts?.operationalReviewEvidenceDraft
  if (!artifact?.file || !HASH.test(text(artifact?.sha256))) throw fail(500,'REVIEW_DRAFT_COORDINATE_INVALID','Operational review evidence coordinate is invalid.')
  const reviewPath = path.resolve(path.dirname(evidencePath),artifact.file)
  if (!reviewPath.startsWith(path.resolve(path.dirname(evidencePath))+path.sep)) throw fail(500,'REVIEW_DRAFT_PATH_INVALID','Operational review evidence path escaped its evidence directory.')
  if (!fs.existsSync(reviewPath)) throw fail(500,'REVIEW_DRAFT_UNAVAILABLE','Operational review evidence draft is unavailable.')
  const reviewBytes = fs.readFileSync(reviewPath)
  const reviewSha = sha256(reviewBytes)
  if (reviewSha !== artifact.sha256) throw fail(500,'REVIEW_DRAFT_SHA_MISMATCH','Operational review evidence draft hash verification failed.')
  const draft = JSON.parse(reviewBytes.toString('utf8'))
  const manifests = draft?.reviewArtifactManifests || {}
  const structural = validateReviewBundle(bundle,options)
  const reviews = bundle?.operationalReviews || bundle?.reviews || {}
  const bindings=[]
  for (const name of REVIEW_NAMES) {
    const expected = manifests[name]
    const claimed = text(reviews?.[name]?.reviewedArtifactSha256)
    if (!expected) {
      bindings.push({name,valid:false,expectedSha256:null,claimedSha256:claimed||null,issues:['SEALED_REVIEW_ARTIFACT_NOT_AVAILABLE']})
      continue
    }
    const issues=[]
    if (!HASH.test(text(expected.sha256))) issues.push('SEALED_ARTIFACT_SHA_INVALID')
    if (!claimed) issues.push('CLAIMED_ARTIFACT_SHA_MISSING')
    else if (claimed !== expected.sha256) issues.push('REVIEWED_ARTIFACT_SHA_MISMATCH')
    if (Array.isArray(expected.missing) && expected.missing.length) issues.push('SEALED_ARTIFACT_INCOMPLETE')
    bindings.push({name,valid:issues.length===0,expectedSha256:expected.sha256,claimedSha256:claimed||null,status:expected.status||null,issues})
  }
  const bindingIssues=bindings.flatMap(x=>x.issues.map(i=>`${x.name}:${i}`))
  const valid=structural.valid && bindingIssues.length===0
  return {
    architectureVersion:'v6-g9-publisher-promotion-precheck-1',
    valid,
    structural,
    publisherEvidence:{path:evidencePath,sha256:publisherSha,sourceCommit:publisher.sourceCommit||null},
    operationalReviewEvidence:{file:artifact.file,sha256:reviewSha},
    bindings,
    issues:[...structural.issues,...bindingIssues],
    policy:{validationOnly:true,persisted:false,publisherApprovalChanged:false,canonicalWriteChanged:false,selfApprovalAllowed:false},
    nextAction:valid?'ASSEMBLE_SIGNED_PUBLISHER_EVIDENCE_WITHOUT_ENABLING_WRITES':'RESOLVE_REVIEW_BINDING_ISSUES',
  }
}

module.exports={buildPublisherPromotionPrecheck}

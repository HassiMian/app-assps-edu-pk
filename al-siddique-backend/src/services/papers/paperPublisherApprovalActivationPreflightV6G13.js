const text=v=>String(v??'').trim().toLowerCase()
const envTrue=name=>text(process.env[name])==='true'
const EXPECTED_PRE_APPROVAL_BLOCKERS=['CURRICULUM_PUBLISHER_NOT_PRODUCTION_APPROVED','CANONICAL_REGISTRY_WRITE_DISABLED']
function failure(status,code,message,issues=[]){const e=new Error(message);e.status=status;e.code=code;e.issues=issues;return e}
function sameSet(a,b){const x=[...new Set(a||[])].sort(),y=[...new Set(b||[])].sort();return JSON.stringify(x)===JSON.stringify(y)}

async function buildPublisherApprovalActivationPreflight(reviewBundle,signatureRecord,approvalRecord,options={}) {
  const validateDecision=options.validatePublisherApprovalDecision||require('./paperPublisherApprovalDecisionV6G12').validatePublisherApprovalDecision
  const verifyEvidence=options.verifyCurriculumPublisherEvidence||require('./paperCurriculumPublisherEvidenceV6G').verifyCurriculumPublisherEvidence
  const readReadiness=options.buildCanonicalCutoverReadiness||require('./paperCanonicalCutoverReadinessV6F').buildCanonicalCutoverReadiness
  const decision=validateDecision(reviewBundle,signatureRecord,approvalRecord,options)
  const evidence=await verifyEvidence()
  if(!evidence?.valid) throw failure(409,'PUBLISHER_EVIDENCE_NOT_READY','Publisher evidence is not independently complete.',evidence?.issues||[])
  const publisherApproved=options.publisherProductionApproved!=null?Boolean(options.publisherProductionApproved):envTrue('PAPER_CURRICULUM_PUBLISHER_PRODUCTION_APPROVED')
  const canonicalWriteEnabled=options.canonicalWriteEnabled!=null?Boolean(options.canonicalWriteEnabled):envTrue('PAPER_CANONICAL_REGISTRY_WRITE_ENABLED')
  if(publisherApproved) throw failure(409,'PUBLISHER_APPROVAL_ALREADY_ENABLED','Publisher production approval is already enabled.')
  if(canonicalWriteEnabled) throw failure(409,'CANONICAL_WRITE_MUST_REMAIN_DISABLED','Canonical registry writes must remain disabled during publisher approval activation.')
  const readiness=await readReadiness()
  const blockers=Array.isArray(readiness?.blockers)?readiness.blockers:[]
  if(!sameSet(blockers,EXPECTED_PRE_APPROVAL_BLOCKERS)) throw failure(409,'PRE_APPROVAL_READINESS_UNEXPECTED','Pre-approval readiness contains unexpected blockers.',blockers)
  return {
    valid:true,
    architectureVersion:'v6-g13-publisher-approval-activation-preflight-1',
    decision,
    evidence:{manifestSha:evidence.manifestSha,sourceCommit:evidence.sourceCommit,scope:evidence.scope,approvedQuestionCount:evidence.approvedQuestionCount},
    readiness:{ready:Boolean(readiness?.ready),blockers},
    proposedChange:{name:'PAPER_CURRICULUM_PUBLISHER_PRODUCTION_APPROVED',from:false,to:true},
    invariant:{canonicalRegistryWriteEnabled:false,canonicalWriteMustRemainFalse:true},
    policy:{validationOnly:true,persisted:false,envChanged:false,publisherApprovalChanged:false,canonicalWriteChanged:false},
    nextAction:'GOVERNED_SINGLE_FLAG_ACTIVATION_REQUIRES_EXTERNAL_APPROVAL_RECORD_AND_RELEASE_CONTROL',
  }
}

module.exports={buildPublisherApprovalActivationPreflight,EXPECTED_PRE_APPROVAL_BLOCKERS}

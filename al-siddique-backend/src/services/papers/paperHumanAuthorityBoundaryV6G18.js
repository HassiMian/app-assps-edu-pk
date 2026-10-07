const REQUIRED_TECHNICAL_GATES=[
  'canonicalRegistryPresent','canonicalRuntimeRoleApproved','canonicalWriteDefenseApproved',
  'canonicalPayloadContractApproved','canonicalRendererParityApproved','canonicalRendererEvidenceVerified',
  'backupRestoreDrillApproved','tenantRlsApproved',
]
const EXPECTED_READINESS_BLOCKERS=new Set([
  'CURRICULUM_PUBLISHER_EVIDENCE_INVALID',
  'CURRICULUM_PUBLISHER_NOT_PRODUCTION_APPROVED',
  'CANONICAL_REGISTRY_WRITE_DISABLED',
])
const HUMAN_ISSUE_PATTERNS=[
  /^preflight:NO_APPROVED_LIVE_ACADEMIC_RECORDS$/,
  /^preflight:(EN|UR)_OFFICIAL_PDF_NOT_APPROVED$/,
  /^preflight:(EN|UR)_EDITION_NOT_APPROVED$/,
  /^preflight:(EN|UR)_CHAPTER_INDEX_PENDING$/,
  /^preflight:(EN|UR)_EXERCISE_INDEX_PENDING$/,
  /^preflight:(EN|UR)_ACADEMIC_QUESTION_RELEASE_PENDING$/,
  /^preflight:BILINGUAL_EDITION_EQUIVALENCE_NOT_APPROVED$/,
  /^preflight:GENUINE_SIGNED_CURRICULUM_PUBLICATION_MISSING$/,
  /^preflight:STAGING_REVIEW_[A-Z0-9]+_PENDING$/,
  /^publisher evidence has no independently approved questions$/,
  /^publisher release state incomplete: (liveImportAuthorized|academicSignoffComplete|bilingualSignoffComplete|tenantScopedBankSnapshotReviewed|publisherKeyCustodyApproved)$/,
  /^publisher evidence still declares open issues$/,
]

function classifyPublisherIssue(issue){
  const text=String(issue||'')
  return HUMAN_ISSUE_PATTERNS.some(re=>re.test(text))?'HUMAN_AUTHORITY_REQUIRED':'UNKNOWN'
}

async function buildHumanAuthorityBoundary(options={}){
  const readinessFn=options.buildCanonicalCutoverReadiness||require('./paperCanonicalCutoverReadinessV6F').buildCanonicalCutoverReadiness
  const publisherFn=options.verifyCurriculumPublisherEvidence||require('./paperCurriculumPublisherEvidenceV6G').verifyCurriculumPublisherEvidence
  const readiness=await readinessFn()
  const publisher=await publisherFn()
  const gates=readiness?.gates||{}
  const technicalFailures=REQUIRED_TECHNICAL_GATES.filter(name=>gates[name]!==true)
  const readinessBlockers=Array.isArray(readiness?.blockers)?readiness.blockers:[]
  const unexpectedReadinessBlockers=readinessBlockers.filter(x=>!EXPECTED_READINESS_BLOCKERS.has(x))
  const publisherIssues=Array.isArray(publisher?.issues)?publisher.issues:[]
  const classified=publisherIssues.map(issue=>({issue,category:classifyPublisherIssue(issue)}))
  const unknownPublisherIssues=classified.filter(x=>x.category==='UNKNOWN').map(x=>x.issue)
  const humanAuthorityBlockers=classified.filter(x=>x.category==='HUMAN_AUTHORITY_REQUIRED').map(x=>x.issue)
  const deliberateSafetyLocks=[]
  if(gates.canonicalRegistryWriteEnabled!==true)deliberateSafetyLocks.push('CANONICAL_REGISTRY_WRITE_DISABLED')
  if(gates.curriculumPublisherProductionApproved!==true)deliberateSafetyLocks.push('CURRICULUM_PUBLISHER_PRODUCTION_APPROVAL_FALSE')

  const technicalReady=technicalFailures.length===0&&unexpectedReadinessBlockers.length===0&&unknownPublisherIssues.length===0
  const boundaryReached=technicalReady&&humanAuthorityBlockers.length>0&&deliberateSafetyLocks.includes('CANONICAL_REGISTRY_WRITE_DISABLED')
  return {
    architectureVersion:'v6-g18-human-authority-boundary-1',
    valid:boundaryReached,
    boundaryReached,
    technicalReady,
    technicalFailures,
    unexpectedReadinessBlockers,
    unknownPublisherIssues,
    humanAuthorityBlockers,
    deliberateSafetyLocks,
    readiness:{ready:Boolean(readiness?.ready),blockers:readinessBlockers},
    publisher:{valid:Boolean(publisher?.valid),manifestSha:publisher?.manifestSha||null,sourceCommit:publisher?.sourceCommit||null,approvedQuestionCount:Number(publisher?.approvedQuestionCount||0)},
    policy:{readOnly:true,persisted:false,envChanged:false,approvalChanged:false,canonicalWriteChanged:false,privateKeyAccepted:false,signatureCreated:false},
    nextAction:boundaryReached?'OBTAIN_GENUINE_INDEPENDENT_ACADEMIC_AND_PUBLISHER_AUTHORITY':'RESOLVE_TECHNICAL_OR_UNKNOWN_BLOCKERS_FIRST',
  }
}

module.exports={buildHumanAuthorityBoundary,classifyPublisherIssue,REQUIRED_TECHNICAL_GATES}

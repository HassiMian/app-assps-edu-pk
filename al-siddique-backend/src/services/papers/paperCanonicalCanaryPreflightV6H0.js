// V6-H0 — read-only canonical canary preflight.
// This module MUST NOT write to paper_documents/paper_revisions or change feature flags.
const ADMIN_ROLES = new Set(['super_admin', 'admin', 'principal'])

function unique(values) { return [...new Set(values.filter(Boolean))] }

async function buildCanonicalCanaryPreflight({ schoolId, userId, role, paperId, deps = {} }) {
  const normalizedRole = String(role || '').trim().toLowerCase()
  if (!ADMIN_ROLES.has(normalizedRole)) {
    const err = new Error('Admin or Principal role is required.')
    err.status = 403
    err.code = 'CANARY_ADMIN_REQUIRED'
    throw err
  }
  if (!/^\d+$/.test(String(paperId || ''))) {
    const err = new Error('Invalid paper id.')
    err.status = 400
    err.code = 'INVALID_PAPER_ID'
    throw err
  }

  const readPaper = deps.getProjectedPaper || require('../paperStudioProjectionService').getProjectedPaper
  const reviewDocument = deps.reviewPortalPaperDocument || require('./portalDocumentBoundaryV6C').reviewPortalPaperDocument
  const readReadiness = deps.buildCanonicalCutoverReadiness || require('./paperCanonicalCutoverReadinessV6F').buildCanonicalCutoverReadiness

  const paper = await readPaper({ schoolId, userId, role: normalizedRole, paperId: String(paperId) })
  if (!paper) {
    const err = new Error('Paper not found in your governed school library.')
    err.status = 404
    err.code = 'CANARY_SOURCE_NOT_FOUND'
    throw err
  }

  const review = await reviewDocument(paper.document)
  const sourceApprovedFamily = review?.family === 'approved-curriculum-authoring'
  const sourceStructureValid = review?.reviewStatus === 'STRUCTURE_VALID_STAGING' && !(review?.issues || []).length
  const blockers = []
  if (!sourceApprovedFamily) blockers.push('CANARY_SOURCE_NOT_APPROVED_AUTHORING_FAMILY')
  if (!sourceStructureValid) blockers.push('CANARY_SOURCE_STRUCTURE_NOT_VALID')

  // Infrastructure and publication readiness is only evaluated after the source
  // itself passes the reviewed authoring boundary. Legacy/unknown papers fail
  // locally and never trigger deeper canonical storage inspection.
  const readiness = sourceApprovedFamily && sourceStructureValid ? await readReadiness() : null
  if (readiness) blockers.push(...(Array.isArray(readiness.blockers) ? readiness.blockers : []))

  // V6-C deliberately says canonicalWriteAllowed=false even for structurally valid
  // staging documents. V6-H0 does not override that flag. Production approval is
  // represented only by the independent readiness gates below.
  const eligible = Boolean(sourceApprovedFamily && sourceStructureValid && readiness?.ready === true)

  return {
    architectureVersion: 'v6-h0-canary-preflight-1',
    mode: 'READ_ONLY_CANARY_PREFLIGHT',
    eligible,
    readinessEvaluated: Boolean(readiness),
    writeAttempted: false,
    writeEnabledByThisProbe: false,
    source: {
      paperId: String(paper.id),
      revision: Number(paper.revision || 1),
      ownerUserId: String(paper.author?.userId || ''),
      family: review?.family || 'unknown',
      reviewStatus: review?.reviewStatus || 'UNKNOWN',
      snapshotHash: review?.snapshotHash || null,
      structuralIssues: Array.isArray(review?.issues) ? review.issues : [],
    },
    gates: {
      curriculumPublisherEvidenceVerified: Boolean(readiness?.gates?.curriculumPublisherEvidenceVerified),
      curriculumPublisherProductionApproved: Boolean(readiness?.gates?.curriculumPublisherProductionApproved),
      canonicalRendererEvidenceVerified: Boolean(readiness?.gates?.canonicalRendererEvidenceVerified),
      canonicalRuntimeRoleApproved: Boolean(readiness?.gates?.canonicalRuntimeRoleApproved),
      tenantRlsApproved: Boolean(readiness?.gates?.tenantRlsApproved),
      canonicalPayloadContractApproved: Boolean(readiness?.gates?.canonicalPayloadContractApproved),
      canonicalRegistryWriteEnabled: Boolean(readiness?.gates?.canonicalRegistryWriteEnabled),
    },
    blockers: unique(blockers),
    policy: {
      dualWriteAllowed: false,
      bulkMigrationAllowed: false,
      destructiveMigrationAllowed: false,
      automaticApprovalAllowed: false,
      sourceMutationAllowed: false,
      canaryScope: 'ONE_GOVERNED_PAPER_ONLY',
    },
    nextAction: eligible
      ? 'EXPLICIT_SINGLE_PAPER_CANARY_EXECUTION_REVIEW_REQUIRED'
      : 'RESOLVE_PREFLIGHT_BLOCKERS_WITHOUT_ENABLING_WRITES',
  }
}

module.exports = { buildCanonicalCanaryPreflight }

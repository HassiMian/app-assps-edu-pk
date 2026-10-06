const test = require('node:test')
const assert = require('node:assert/strict')
const { buildCanonicalCanaryPreflight } = require('../services/papers/paperCanonicalCanaryPreflightV6H0')

const paper = { id:'91', revision:4, author:{userId:'17'}, document:{format:'assps-new-authoring-paper'} }
const approvedReview = { family:'approved-curriculum-authoring', reviewStatus:'STRUCTURE_VALID_STAGING', issues:[], snapshotHash:'a'.repeat(64), canonicalWriteAllowed:false }
const legacyReview = { family:'legacy-connect-vault', reviewStatus:'LOSSLESS_ADAPTER_REQUIRED', issues:[], snapshotHash:'b'.repeat(64), canonicalWriteAllowed:false }
const gates = {
  curriculumPublisherEvidenceVerified:true,
  curriculumPublisherProductionApproved:true,
  canonicalRendererEvidenceVerified:true,
  canonicalRuntimeRoleApproved:true,
  tenantRlsApproved:true,
  canonicalPayloadContractApproved:true,
  canonicalRegistryWriteEnabled:true,
}
function deps({review=approvedReview,ready=true,blockers=[]}={}) {
  return {
    getProjectedPaper: async()=>paper,
    reviewPortalPaperDocument: async()=>review,
    buildCanonicalCutoverReadiness: async()=>({ready,gates:{...gates,canonicalRegistryWriteEnabled:ready},blockers}),
  }
}

test('legacy source fails closed even when infrastructure gates are green', async()=>{
  const r=await buildCanonicalCanaryPreflight({schoolId:1,userId:2,role:'admin',paperId:91,deps:deps({review:legacyReview})})
  assert.equal(r.eligible,false)
  assert.equal(r.writeAttempted,false)
  assert.ok(r.blockers.includes('CANARY_SOURCE_NOT_APPROVED_AUTHORING_FAMILY'))
  assert.ok(r.blockers.includes('CANARY_SOURCE_STRUCTURE_NOT_VALID'))
})

test('approved authoring source remains blocked while publisher/write readiness is false', async()=>{
  const r=await buildCanonicalCanaryPreflight({schoolId:1,userId:2,role:'principal',paperId:91,deps:deps({ready:false,blockers:['CURRICULUM_PUBLISHER_EVIDENCE_INVALID','CANONICAL_REGISTRY_WRITE_DISABLED']})})
  assert.equal(r.eligible,false)
  assert.equal(r.writeAttempted,false)
  assert.deepEqual(r.blockers,['CURRICULUM_PUBLISHER_EVIDENCE_INVALID','CANONICAL_REGISTRY_WRITE_DISABLED'])
})

test('fully approved simulated readiness only produces an eligible read-only execution review', async()=>{
  const r=await buildCanonicalCanaryPreflight({schoolId:1,userId:2,role:'super_admin',paperId:91,deps:deps()})
  assert.equal(r.eligible,true)
  assert.equal(r.writeAttempted,false)
  assert.equal(r.writeEnabledByThisProbe,false)
  assert.equal(r.nextAction,'EXPLICIT_SINGLE_PAPER_CANARY_EXECUTION_REVIEW_REQUIRED')
  assert.equal(r.policy.dualWriteAllowed,false)
  assert.equal(r.policy.canaryScope,'ONE_GOVERNED_PAPER_ONLY')
})

test('teacher cannot run governance preflight', async()=>{
  await assert.rejects(()=>buildCanonicalCanaryPreflight({schoolId:1,userId:2,role:'teacher',paperId:91,deps:deps()}), e=>e.status===403&&e.code==='CANARY_ADMIN_REQUIRED')
})

test('missing source is non-leaking 404', async()=>{
  const d=deps(); d.getProjectedPaper=async()=>null
  await assert.rejects(()=>buildCanonicalCanaryPreflight({schoolId:1,userId:2,role:'admin',paperId:91,deps:d}), e=>e.status===404&&e.code==='CANARY_SOURCE_NOT_FOUND')
})

const crypto=require('node:crypto')
const {canonicalJson}=require('./paperPublisherPromotionEnvelopeV6G10')
const sha=v=>crypto.createHash('sha256').update(v).digest('hex')

async function buildCanonicalCanaryRollbackPlan({schoolId,userId,role,paperId,deps={}}){
 const planFn=deps.buildCanonicalCanaryPlan||require('./paperCanonicalCanaryPlanV6H2').buildCanonicalCanaryPlan
 const canaryPlan=await planFn({schoolId,userId,role,paperId,deps:deps.canaryPlanDeps||{}})
 if(!canaryPlan?.valid||!canaryPlan?.intentSha256){const e=new Error('Valid H2 canary plan is required before rollback planning.');e.status=409;e.code='CANARY_ROLLBACK_PLAN_REQUIRES_H2';throw e}
 const source=canaryPlan.source||{},target=canaryPlan.target||{}
 const rollbackIntent={
  architectureVersion:'v6-h3-single-paper-canary-rollback-plan-1',
  schoolId:String(schoolId),actorUserId:String(userId),h2IntentSha256:String(canaryPlan.intentSha256),
  match:{
   sourceRepository:String(source.repository||''),sourcePaperId:String(source.paperId||''),sourceRevision:Number(source.revision||0),sourceSnapshotHash:String(source.snapshotHash||''),
   payloadHash:String(target.payloadHash||''),documentFamily:String(target.documentFamily||''),documentFormat:String(target.documentFormat||''),schemaVersion:Number(target.schemaVersion||0),
  },
  safeguards:{
   maximumDocumentsAffected:1,
   requireCanaryImportedAt:true,
   requireExactPayloadHash:true,
   requireExactSourceBinding:true,
   requireNoExternalPublication:true,
   requireNoDependentCanonicalRevisionBeyondInitial:true,
   preservePaperVaultSource:true,
   preservePaperVaultRevisionHistory:true,
   transactionalExecutionRequired:true,
  },
  verification:{
   before:['EXACTLY_ONE_CANARY_DOCUMENT_MATCHES_BINDING','PAYLOAD_HASH_MATCHES_H2_PLAN','NO_EXTERNAL_PUBLICATION_OR_DELIVERY_DEPENDENCY','ONLY_INITIAL_CANONICAL_REVISION_EXISTS'],
   after:['NO_CANONICAL_DOCUMENT_MATCHES_SOURCE_BINDING','NO_CANONICAL_REVISION_REMAINS_FOR_CANARY_DOCUMENT','PAPER_VAULT_SOURCE_UNCHANGED','PAPER_VAULT_HISTORY_UNCHANGED'],
  },
 }
 const rollbackIntentSha256=sha(canonicalJson(rollbackIntent))
 return {valid:true,...rollbackIntent,rollbackIntentSha256,policy:{planOnly:true,deleteAttempted:false,writeAttempted:false,persisted:false,sourceMutated:false,approvalChanged:false,canonicalWriteChanged:false},nextAction:'EXPLICIT_HUMAN_REVIEW_OF_SINGLE_PAPER_ROLLBACK_PLAN_REQUIRED'}
}
module.exports={buildCanonicalCanaryRollbackPlan}

const crypto=require('node:crypto')
const {canonicalJson}=require('./paperPublisherPromotionEnvelopeV6G10')
const HASH=/^[0-9a-f]{64}$/
const sha=v=>crypto.createHash('sha256').update(v).digest('hex')
function fail(status,code,message,issues=[]){const e=new Error(message);e.status=status;e.code=code;e.issues=issues;return e}

async function buildCanonicalCanaryReviewPacket({schoolId,userId,role,paperId,deps={}}){
 const planFn=deps.buildCanonicalCanaryPlan||require('./paperCanonicalCanaryPlanV6H2').buildCanonicalCanaryPlan
 const rollbackFn=deps.buildCanonicalCanaryRollbackPlan||require('./paperCanonicalCanaryRollbackPlanV6H3').buildCanonicalCanaryRollbackPlan
 const canaryPlan=await planFn({schoolId,userId,role,paperId,deps:deps.canaryPlanDeps||{}})
 if(!canaryPlan?.valid||!HASH.test(String(canaryPlan?.intentSha256||'')))
  throw fail(409,'CANARY_REVIEW_PACKET_REQUIRES_H2','Valid H2 canary plan is required before review-packet assembly.')
 const rollbackPlan=await rollbackFn({schoolId,userId,role,paperId,deps:{...(deps.rollbackPlanDeps||{}),buildCanonicalCanaryPlan:async()=>canaryPlan}})
 if(!rollbackPlan?.valid||!HASH.test(String(rollbackPlan?.rollbackIntentSha256||'')))
  throw fail(409,'CANARY_REVIEW_PACKET_REQUIRES_H3','Valid H3 rollback plan is required before review-packet assembly.')
 if(String(rollbackPlan.h2IntentSha256||'')!==String(canaryPlan.intentSha256))
  throw fail(409,'CANARY_REVIEW_PACKET_PLAN_MISMATCH','H3 rollback plan does not bind the current H2 canary intent.')
 const source=canaryPlan.source||{},target=canaryPlan.target||{},match=rollbackPlan.match||{}
 const mismatches=[]
 const pairs=[
  ['sourceRepository',source.repository,match.sourceRepository],
  ['sourcePaperId',source.paperId,match.sourcePaperId],
  ['sourceRevision',Number(source.revision||0),Number(match.sourceRevision||0)],
  ['sourceSnapshotHash',source.snapshotHash,match.sourceSnapshotHash],
  ['payloadHash',target.payloadHash,match.payloadHash],
  ['documentFamily',target.documentFamily,match.documentFamily],
  ['documentFormat',target.documentFormat,match.documentFormat],
  ['schemaVersion',Number(target.schemaVersion||0),Number(match.schemaVersion||0)],
 ]
 for(const [name,a,b] of pairs)if(String(a??'')!==String(b??''))mismatches.push(name)
 if(mismatches.length)throw fail(409,'CANARY_REVIEW_PACKET_BINDING_MISMATCH','H2 and H3 source/payload bindings differ.',mismatches)
 const packet={
  architectureVersion:'v6-h4-single-paper-canary-review-packet-1',
  schoolId:String(schoolId),actorUserId:String(userId),paperId:String(paperId),
  h2IntentSha256:String(canaryPlan.intentSha256),
  h3RollbackIntentSha256:String(rollbackPlan.rollbackIntentSha256),
  source:{repository:String(source.repository||''),paperId:String(source.paperId||''),revision:Number(source.revision||0),snapshotHash:String(source.snapshotHash||''),ownerUserId:String(source.ownerUserId||'')},
  target:{table:String(target.table||''),documentFamily:String(target.documentFamily||''),documentFormat:String(target.documentFormat||''),schemaVersion:Number(target.schemaVersion||0),payloadHash:String(target.payloadHash||''),initialRevision:Number(target.initialRevision||0),status:String(target.status||'')},
  rollbackSafeguards:rollbackPlan.safeguards||{},
  verification:rollbackPlan.verification||{},
  humanReviewRequirements:[
   'INDEPENDENT_REVIEWER_IDENTITY_MUST_BE_VERIFIED_OUTSIDE_THIS SERVICE',
   'H2_CANARY_INTENT_SHA256_MUST_BE_REVIEWED_EXACTLY',
   'H3_ROLLBACK_INTENT_SHA256_MUST_BE_REVIEWED_EXACTLY',
   'CANARY_EXECUTION_APPROVAL_MUST_BE_EXPLICIT_AND SEPARATE',
   'ROLLBACK_AUTHORITY_MUST_BE_EXPLICIT_AND SEPARATE',
   'SELF_APPROVAL_IS_NOT_ALLOWED',
  ],
 }
 const reviewPacketSha256=sha(canonicalJson(packet))
 return {valid:true,...packet,reviewPacketSha256,policy:{reviewOnly:true,writeAttempted:false,deleteAttempted:false,persisted:false,sourceMutated:false,envChanged:false,approvalChanged:false,canonicalWriteChanged:false,humanIdentityAuthenticated:false,humanApprovalClaim:false,selfApprovalAllowed:false},nextAction:'EXPLICIT_INDEPENDENT_HUMAN_REVIEW_OF_BOUND_H2_H3_PACKET_REQUIRED'}
}
module.exports={buildCanonicalCanaryReviewPacket}

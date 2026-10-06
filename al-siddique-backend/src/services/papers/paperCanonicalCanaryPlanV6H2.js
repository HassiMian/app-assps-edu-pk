const crypto=require('node:crypto')
const {canonicalJson}=require('./paperPublisherPromotionEnvelopeV6G10')
const ADMIN_ROLES=new Set(['super_admin','admin','principal'])
const sha=v=>crypto.createHash('sha256').update(v).digest('hex')
function fail(status,code,message,issues=[]){const e=new Error(message);e.status=status;e.code=code;e.issues=issues;return e}

async function buildCanonicalCanaryPlan({schoolId,userId,role,paperId,deps={}}){
 const normalizedRole=String(role||'').trim().toLowerCase()
 if(!ADMIN_ROLES.has(normalizedRole))throw fail(403,'CANARY_ADMIN_REQUIRED','Admin or Principal role is required.')
 if(!/^\d+$/.test(String(paperId||'')))throw fail(400,'INVALID_PAPER_ID','Invalid paper id.')
 const preflightFn=deps.buildCanonicalCanaryPreflight||require('./paperCanonicalCanaryPreflightV6H0').buildCanonicalCanaryPreflight
 const getPaper=deps.getProjectedPaper||require('../paperStudioProjectionService').getProjectedPaper
 const reviewFn=deps.reviewPortalPaperDocument||require('./portalDocumentBoundaryV6C').reviewPortalPaperDocument
 const preflight=await preflightFn({schoolId,userId,role:normalizedRole,paperId:String(paperId),deps:deps.preflightDeps||{}})
 if(!preflight?.eligible)throw fail(409,'CANARY_PLAN_PREFLIGHT_BLOCKED','Single-paper canary plan cannot be created until H0 is fully eligible.',preflight?.blockers||[])
 const paper=await getPaper({schoolId,userId,role:normalizedRole,paperId:String(paperId)})
 if(!paper)throw fail(404,'CANARY_SOURCE_NOT_FOUND','Paper not found in your governed school library.')
 const review=await reviewFn(paper.document)
 const source={
  repository:'paper_vault',paperId:String(paper.id),revision:Number(paper.revision||1),
  snapshotHash:String(review?.snapshotHash||''),ownerUserId:String(paper.author?.userId||preflight.source?.ownerUserId||''),
 }
 if(source.paperId!==String(preflight.source?.paperId)||source.revision!==Number(preflight.source?.revision)||source.snapshotHash!==String(preflight.source?.snapshotHash||''))
  throw fail(409,'CANARY_SOURCE_CHANGED','Source revision or snapshot changed after preflight. Rerun H0 before planning.')
 const doc=paper.document||{}
 if(review?.family!=='approved-curriculum-authoring'||review?.reviewStatus!=='STRUCTURE_VALID_STAGING'||(review?.issues||[]).length)
  throw fail(409,'CANARY_SOURCE_NOT_CANONICAL_AUTHORING','Source document is no longer a structurally valid approved authoring document.',review?.issues||[])
 if(doc.documentModel!=='PaperDocumentNewAuthoring'||doc.format!=='assps-new-authoring-paper'||!Number.isSafeInteger(Number(doc.schemaVersion))||Number(doc.schemaVersion)<=0)
  throw fail(409,'CANARY_PAYLOAD_DISCRIMINATOR_INVALID','Canonical payload discriminator is invalid.')
 const payloadCanonical=canonicalJson(doc),payloadHash=sha(payloadCanonical)
 const target={
  table:'paper_documents',documentFamily:'approved-curriculum-authoring',documentFormat:'assps-new-authoring-paper',schemaVersion:Number(doc.schemaVersion),
  title:String(paper.name||paper.title||doc.title||'Untitled Paper'),status:'draft',initialRevision:1,payloadHash,
  sourceRepository:source.repository,sourcePaperId:source.paperId,sourceRevision:source.revision,sourceSnapshotHash:source.snapshotHash,
 }
 const rollback={strategy:'DELETE_SINGLE_CANARY_DOCUMENT_BY_SOURCE_BINDING_BEFORE_GENERAL_AVAILABILITY',sourceBinding:{repository:source.repository,paperId:source.paperId,revision:source.revision,snapshotHash:source.snapshotHash},requiresExplicitReview:true}
 const intent={architectureVersion:'v6-h2-single-paper-canary-plan-1',schoolId:String(schoolId),actorUserId:String(userId),source,target,rollback}
 const intentSha256=sha(canonicalJson(intent))
 return {valid:true,...intent,intentSha256,policy:{planOnly:true,writeAttempted:false,persisted:false,sourceMutated:false,flagsChanged:false,approvalChanged:false,canonicalWriteChanged:false,bulkMigrationAllowed:false,dualWriteAllowed:false},nextAction:'EXPLICIT_HUMAN_REVIEW_OF_SINGLE_PAPER_CANARY_PLAN_REQUIRED'}
}
module.exports={buildCanonicalCanaryPlan}

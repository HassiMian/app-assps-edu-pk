// V6-E1: immutable revision-bound delivery capability manifest.
// This service does NOT render/print/publish. It prevents output channels from
// silently consuming mutable/current paper state without revision+hash binding.
const {createHash}=require('node:crypto')
const {getProjectedPaper}=require('../paperStudioProjectionService')
const {readGuardedRevision,digest}=require('./paperVaultRevisionV6D')
const {reviewPortalPaperDocument}=require('./portalDocumentBoundaryV6C')
const {reviewNativePresentation}=require('./nativePresentationPolicyV6E2')
const {assessCanonicalDocxEligibility}=require('./paperCanonicalDocxProjectionV6G21')

const failure=(status,message,code)=>Object.assign(new Error(message),{status,code})
const stableHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const normalizeType=value=>String(value||'').trim().toLowerCase().replace(/[\s-]+/g,'_')
const ONLINE_AUTO_TYPES=new Set(['mcq','multiple_choice','true_false','fill_blank','fill_in_the_blank'])
const ONLINE_REVIEW_TYPES=new Set(['short','short_question','long','long_question','essay','definition','translation','application','letter'])

function legacyQuestionInventory(document){
  const descriptors=Array.isArray(document?.numberedQuestionTypes)?document.numberedQuestionTypes:[]
  const inventory=[]
  for(const type of descriptors){
    const key=String(type?.value||'')
    const kind=normalizeType(key)
    const items=Array.isArray(document?.[key])?document[key]:[]
    inventory.push({key,kind,count:items.length,questionNo:Number(type?.questionNo||0)||null})
  }
  return inventory
}

function canonicalQuestionInventory(document){
  const inventory=[]
  for(const section of Array.isArray(document?.sections)?document.sections:[]){
    const nodes=Array.isArray(section?.nodes)?section.nodes:Array.isArray(section?.items)?section.items:[]
    const counts=new Map()
    for(const node of nodes){const kind=normalizeType(node?.type||node?.kind);counts.set(kind,(counts.get(kind)||0)+1)}
    for(const [kind,count] of counts)inventory.push({key:kind,kind,count,sectionId:section?.id??null})
  }
  return inventory
}

function onlineEligibility(inventory){
  let total=0,autoGradable=0,manualReview=0
  const unsupported=[]
  for(const row of inventory){
    total+=row.count
    if(ONLINE_AUTO_TYPES.has(row.kind))autoGradable+=row.count
    else if(ONLINE_REVIEW_TYPES.has(row.kind))manualReview+=row.count
    else if(row.count)unsupported.push({kind:row.kind||'unknown',count:row.count})
  }
  return {
    totalQuestions:total,
    autoGradableQuestions:autoGradable,
    manualReviewQuestions:manualReview,
    unsupportedQuestions:unsupported.reduce((n,x)=>n+x.count,0),
    unsupportedTypes:unsupported,
    contentEligible:total>0&&unsupported.length===0,
    fullyAutoGradable:total>0&&manualReview===0&&unsupported.length===0,
  }
}

async function resolveRevisionBoundPaper({schoolId,userId,role,paperId,revision,snapshotHash}){
  if(!/^\d+$/.test(String(paperId??'')))throw failure(400,'Invalid paper id.','INVALID_PAPER_ID')
  if(!Number.isInteger(Number(revision))||Number(revision)<1)throw failure(400,'A valid paper revision is required.','REVISION_REQUIRED')
  if(typeof snapshotHash!=='string'||!/^[a-f0-9]{64}$/i.test(snapshotHash))throw failure(400,'A valid revision snapshot hash is required.','SNAPSHOT_HASH_REQUIRED')
  const current=await getProjectedPaper({schoolId,userId,role,paperId})
  if(!current)throw failure(404,'Paper not found in your accessible library.','NOT_FOUND')
  const currentRevision=Number(current.revision||1)
  let document,actualHash,createdAt=null,event='current'
  if(Number(revision)===currentRevision){
    document=current.document
    actualHash=digest(document)
    createdAt=current.updatedAt||null
  }else{
    const historical=await readGuardedRevision({schoolId,userId,role,paperId,revision:Number(revision)})
    document=historical.document
    actualHash=historical.snapshotHash
    createdAt=historical.createdAt
    event=historical.event
  }
  if(actualHash.toLowerCase()!==snapshotHash.toLowerCase())throw failure(409,'Paper revision/hash no longer matches the requested delivery source.','DELIVERY_SOURCE_MISMATCH')
  return {paper:current,document,revision:Number(revision),snapshotHash:actualHash,currentRevision,isCurrent:Number(revision)===currentRevision,createdAt,event}
}

async function buildDeliveryManifest(args){
  const bound=await resolveRevisionBoundPaper(args)
  const review=await reviewPortalPaperDocument(bound.document)
  const inventory=review.family==='legacy-connect-vault'?legacyQuestionInventory(bound.document):canonicalQuestionInventory(bound.document)
  const online=onlineEligibility(inventory)
  const sourceValid=!['SOURCE_INVALID','UNKNOWN_DISCRIMINATOR','UNSUPPORTED'].includes(review.reviewStatus)
  const docxEligibility=assessCanonicalDocxEligibility(review)
  const canonicalDocxAvailable=Boolean(bound.isCurrent&&docxEligibility.eligible)
  let nativePresentation=null
  try{nativePresentation=await reviewNativePresentation(bound.document)}catch{}
  const nativeGoldenApproved=false // explicit future acceptance gate; never infer from source unchanged.
  const rendererReason=nativePresentation?.renderPolicy==='SOURCE_NATIVE_RENDER_ONLY'&&!nativeGoldenApproved?'SOURCE_NATIVE_RENDER_GOLDEN_APPROVAL_PENDING':'CANONICAL_RENDERER_PARITY_PENDING'
  const manifestCore={
    architectureVersion:'v6-e2',paperId:String(bound.paper.id),revision:bound.revision,
    snapshotHash:bound.snapshotHash,currentRevision:bound.currentRevision,isCurrent:bound.isCurrent,
    sourceFamily:review.family,sourceReviewStatus:review.reviewStatus,questionInventory:inventory,nativePresentation,
    channels:{
      preview:{state:sourceValid?'available_compatibility_preview':'blocked',reason:sourceValid?null:'SOURCE_VALIDATION_FAILED'},
      print:{state:'blocked',reason:rendererReason},
      pdf:{state:'blocked',reason:rendererReason},
      word:{state:canonicalDocxAvailable?'available_canonical_docx':'blocked',reason:canonicalDocxAvailable?null:!bound.isCurrent?'CURRENT_REVISION_REQUIRED':docxEligibility.reason,adapter:canonicalDocxAvailable?'V6_G21_SERVER_CANONICAL_DOCX':null,currentRevisionRequired:true},
      onlineTest:{state:'blocked',reason:!sourceValid?'SOURCE_VALIDATION_FAILED':!online.contentEligible?'UNSUPPORTED_QUESTION_TYPES':!bound.isCurrent?'CURRENT_REVISION_REQUIRED':'ONLINE_TEST_PUBLISH_ADAPTER_PENDING',content:online,currentRevisionRequired:true},
    },
    docxProjection:{architectureVersion:'v6-g21-canonical-docx-projection-1',eligible:canonicalDocxAvailable,family:docxEligibility.family,reviewStatus:docxEligibility.reviewStatus},
    canonicalWriteAllowed:false,printApprovalClaim:false,publishApprovalClaim:false,
  }
  return {...manifestCore,deliveryKey:stableHash(manifestCore)}
}

module.exports={buildDeliveryManifest,resolveRevisionBoundPaper,legacyQuestionInventory,canonicalQuestionInventory,onlineEligibility,ONLINE_AUTO_TYPES,ONLINE_REVIEW_TYPES}

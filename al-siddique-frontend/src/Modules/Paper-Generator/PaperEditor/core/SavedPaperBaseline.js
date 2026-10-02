// Phase 3B: an explicit, read-only browser export. NO store edits, no new renderer, no automatic approval.
// Snapshots the EXACT saved object and its independent canonical working-draft overlay when present.
import {sha256Sync} from '../migration/hashUtils.js'
import {createPaperDocumentShadow,assertNativePresentationContract} from './PaperDocumentShadow.js'
export const BASELINE_FORMAT='assps-native-saved-paper-baseline'
export const BASELINE_VERSION=1
const clone=value=>JSON.parse(JSON.stringify(value))
const hash=value=>sha256Sync(JSON.stringify(value))
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const allowedScope=scope=>typeof scope==='string'&&scope.length>0&&scope!=='public'
const parseContainer=(raw,name,optional=false)=>{
 if(optional&&(raw===null||raw===undefined||raw===''))return null
 if(typeof raw!=='string'||!raw.trim())throw new Error(name+' storage is missing; nothing exported.')
 let payload
 try{payload=JSON.parse(raw)}catch{throw new Error(name+' storage is corrupted; no automatic repair or export.')}
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error(name+' container has invalid shape.')
 return payload
}
const locate=(store,id)=>{
 if(!Array.isArray(store.savedPapers))throw new Error('Stored Saved Papers list is missing.')
 const matches=store.savedPapers.filter(p=>p&&String(p.id)===String(id))
 if(matches.length!==1)throw new Error(matches.length?'Duplicate saved ID: export refused.':'Selected paper is not in the current persisted library.')
 return matches[0]
}
function matchingDrafts(raw,sourceId){
 const obj=parseContainer(raw,'Canonical working drafts',true)
 if(!obj)return {snapshot:null,key:null,ambiguous:false}
 const keys=[String(sourceId),'doc__'+String(sourceId)]
 const found=keys.filter(k=>Object.prototype.hasOwnProperty.call(obj,k)&&obj[k]!=null)
 if(found.length>1)throw new Error('Two canonical working drafts match this paper; resolve the ambiguity before export.')
 if(!found.length)return {snapshot:null,key:null,ambiguous:false}
 const key=found[0],draft=obj[key]
 if(!draft||typeof draft!=='object'||Array.isArray(draft)||draft.baseCanonicalDocumentId!==key)
  throw new Error('Working draft ID/content mismatch; export refused to prevent false baseline.')
 return {snapshot:clone(draft),key,ambiguous:false}
}
const bundleFingerprint=bundle=>{
 const payload={...bundle}
 delete payload.integrity
 return hash(payload)
}
/**
 * The caller MUST obtain raw paperStore and raw canonical drafts with
 * getTenantStorageItem(BASE_KEY) (without migrateLegacy). The displayed paper must be byte-equivalent
 * under JSON.stringify to the actually persisted object, or user must reload before capture.
 */
export function captureSavedPaperBaseline({
 displayedPaper,rawStoreJson,rawCanonicalDraftsJson=null,tenantScope,
 explicitAcknowledgement=false,capturedAt=new Date().toISOString(),
}={}){
 if(!explicitAcknowledgement)throw new Error('Explicit read-only baseline acknowledgement is required.')
 if(!allowedScope(tenantScope))throw new Error('Sign in under a school/account scope before baseline export.')
 if(!displayedPaper?.id)throw new Error('Choose a saved paper with an ID.')
 const store=parseContainer(rawStoreJson,'Paper Generator')
 const persisted=locate(store,displayedPaper.id)
 if(!same(displayedPaper,persisted))throw new Error('Displayed paper differs from persisted record. Reopen Saved Papers before capturing.')
 const shadow=createPaperDocumentShadow(persisted,{tenantId:tenantScope})
 assertNativePresentationContract(persisted,shadow)
 const draft=matchingDrafts(rawCanonicalDraftsJson,persisted.id)
 const bundle={
  format:BASELINE_FORMAT,version:BASELINE_VERSION,scope:tenantScope,capturedAt,
  approval:{sourceSelectedExplicitly:true,approvedByServer:false,approvalStatus:'DATA_CAPTURE_ONLY',
   visualEvidenceStatus:'SCREENSHOT_AND_PDF_NOT_CAPTURED',renderCutoverAllowed:false},
  identity:{savedPaperId:String(persisted.id),sourceType:shadow.sourceType,sourceRevision:persisted.revision??null,
   nativeRenderer:shadow.appearance.renderRoute},
  sourcePaper:clone(persisted),sourceSha256:shadow.sourceHashSha256,
  appearanceSha256:shadow.appearanceHashSha256,marksDiagnostics:clone(shadow.marks),
  canonicalWorkingDraft:{key:draft.key,payload:draft.snapshot,
   sha256:draft.snapshot?hash(draft.snapshot):null,status:draft.snapshot?'CAPTURED':'NO_STORED_DRAFT'},
 }
 bundle.integrity={algorithm:'SHA-256',payloadSha256:bundleFingerprint(bundle)}
 return bundle
}
export function verifySavedPaperBaseline(bundle){
 if(!bundle||bundle.format!==BASELINE_FORMAT||bundle.version!==BASELINE_VERSION)
  throw new Error('Not a supported native paper baseline.')
 if(!allowedScope(bundle.scope)||!bundle.identity?.savedPaperId)throw new Error('Missing owner scope or saved ID.')
 if(bundle.approval?.renderCutoverAllowed!==false||
   bundle.approval?.approvalStatus!=='DATA_CAPTURE_ONLY'||
   bundle.approval?.visualEvidenceStatus!=='SCREENSHOT_AND_PDF_NOT_CAPTURED')
  throw new Error('Attempt to relabel an unverified data capture as a visual/production approval.')
 if(bundle.integrity?.algorithm!=='SHA-256'||bundle.integrity.payloadSha256!==bundleFingerprint(bundle))
  throw new Error('Baseline payload digest mismatch; content or metadata changed.')
 const paper=bundle.sourcePaper
 if(String(paper?.id)!==bundle.identity.savedPaperId)throw new Error('Baseline paper identity mismatch.')
 const shadow=createPaperDocumentShadow(paper,{tenantId:bundle.scope})
 assertNativePresentationContract(paper,shadow)
 if(bundle.identity.nativeRenderer!==shadow.appearance.renderRoute||
   bundle.identity.sourceType!==shadow.sourceType||!same(bundle.identity.sourceRevision,paper.revision??null)||
   bundle.sourceSha256!==shadow.sourceHashSha256||bundle.appearanceSha256!==shadow.appearanceHashSha256)
  throw new Error('Baseline paper or presentation hash mismatch.')
 const overlay=bundle.canonicalWorkingDraft
 if(!overlay||typeof overlay!=='object')throw new Error('Working-draft capture status is missing.')
 if(overlay.payload){
  if(![bundle.identity.savedPaperId,'doc__'+bundle.identity.savedPaperId].includes(overlay.key)||
    overlay.payload.baseCanonicalDocumentId!==overlay.key||overlay.status!=='CAPTURED'||
    overlay.sha256!==hash(overlay.payload))
   throw new Error('Canonical working draft was modified or belongs to another paper.')
 }else if(overlay.sha256!==null||overlay.key!==null||overlay.status!=='NO_STORED_DRAFT')
  throw new Error('Invalid missing-draft evidence.')
 return {valid:true,sourceSha256:shadow.sourceHashSha256,
  draftSha256:overlay.sha256,cutoverReady:false}
}
/** Compares ONLY: NEVER restores or saves data from the imported baseline. */
export function compareCurrentSavedPaperWithBaseline(bundle,{rawStoreJson,rawCanonicalDraftsJson=null,tenantScope}={}){
 verifySavedPaperBaseline(bundle)
 if(bundle.scope!==tenantScope)throw new Error('Baseline belongs to a different tenant/account scope.')
 const store=parseContainer(rawStoreJson,'Paper Generator')
 const paper=locate(store,bundle.identity.savedPaperId)
 const sourceChanged=hash(paper)!==bundle.sourceSha256
 const draft=matchingDrafts(rawCanonicalDraftsJson,paper.id)
 const old=bundle.canonicalWorkingDraft
 const draftChanged=draft.key!==old.key||(draft.snapshot?hash(draft.snapshot):null)!==old.sha256
 const keys=[...new Set([...Object.keys(paper),...Object.keys(bundle.sourcePaper)])]
 const changedTopLevel=sourceChanged?keys.filter(k=>!same(paper[k],bundle.sourcePaper[k])):[]
 return {matches:!sourceChanged&&!draftChanged,sourceChanged,draftChanged,changedTopLevel,
  currentSourceSha256:hash(paper),baselineSourceSha256:bundle.sourceSha256,
  currentDraftSha256:draft.snapshot?hash(draft.snapshot):null,baselineDraftSha256:old.sha256,
  sourceId:String(paper.id),writePerformed:false}
}
/** Informational compare-and-swap preflight. This DOES NOT grant write permission. */
export function planIndependentPaperRevision(bundle,{rawStoreJson,rawCanonicalDraftsJson=null,tenantScope,proposedCopy}={}){
 const state=compareCurrentSavedPaperWithBaseline(bundle,{rawStoreJson,rawCanonicalDraftsJson,tenantScope})
 if(!state.matches)throw new Error('Source or working draft changed since baseline; abort stale revision.')
 if(!proposedCopy||typeof proposedCopy!=='object'||Array.isArray(proposedCopy))
  throw new Error('A separately prepared new working copy is required.')
 if(proposedCopy.id!==undefined&&proposedCopy.id!==null&&proposedCopy.id!=='')
  throw new Error('An unsaved independent copy MUST have no persisted ID; source and other saved IDs remain protected.')
 if(proposedCopy.userAuthored!==true||proposedCopy.creationMethod!=='duplicate')
  throw new Error('Only an explicitly duplicated, user-owned working copy may be proposed.')
 if(proposedCopy.printReadiness==='APPROVED'||proposedCopy.status==='approved')
  throw new Error('A proposed copy cannot automatically become an approved paper.')
 return {state:'UNCOMMITTED_PROPOSAL',writeTarget:'NEW_COPY_ONLY',sourceId:bundle.identity.savedPaperId,
  sourceSha256:bundle.sourceSha256,expectedSourceRevision:bundle.identity.sourceRevision,
  expectedDraftSha256:bundle.canonicalWorkingDraft.sha256,proposedCopy:clone(proposedCopy),
  proposedCopySha256:hash(proposedCopy),serverAuthorizationRequired:true,visualApprovalPending:true}
}

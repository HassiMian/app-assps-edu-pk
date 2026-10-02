// Phase 3C: SOURCE-NATIVE Early Years reference-overlay DATA snapshot, no writes or renderer switch.
// This is NOT the independently authored Early Years user-paper library.
import {sha256Sync} from '../../migration/hashUtils.js'
import {getEarlyYearsPaperById} from '../data/earlyYearsSourceStore.js'
import {getDefaultEarlyYearsTemplateId,normalizeEarlyYearsTemplateId} from '../earlyYearsTemplates.js'
import {getSketchAsset} from '../assets/SketchAssetRegistry.js'

export const EARLY_YEARS_BASELINE_FORMAT='assps-early-years-reference-overlay-baseline'
export const EARLY_YEARS_BASELINE_VERSION=1
export const EARLY_YEARS_OVERLAY_KEY='assps-early-years-editor-working-copy-v1'
export const EARLY_YEARS_TEMPLATE_KEY='assps-early-years-template-map-v1'
const clone=x=>JSON.parse(JSON.stringify(x))
const hash=x=>sha256Sync(JSON.stringify(x))
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const readObject=(text,label)=>{
 if(text==null||text==='')return {}
 if(typeof text!=='string')throw new Error(label+' must be raw JSON text.')
 let value
 try{value=JSON.parse(text)}catch{throw new Error(label+' corrupted; export refused rather than silently dropping changes.')}
 if(!object(value))throw new Error(label+' must be an object.')
 return value
}
const checkScope=scope=>{
 if(typeof scope!=='string'||!scope.trim()||scope==='public')throw new Error('A signed-in school/account scope is required.')
}
const sourcePaper=paper=>{
 if(!object(paper)||typeof paper.id!=='string'||!paper.id.startsWith('ey-')||paper.userAuthored)
  throw new Error('Only an original Early Years V2 REFERENCE paper may be captured here.')
 const authoritative=getEarlyYearsPaperById(paper.id)
 if(!authoritative||!same(authoritative,paper))
  throw new Error('The displayed Early Years reference differs from the bundled authoritative source; no baseline created.')
 return authoritative
}
function selectOverlays(raw,paperId){
 const entries=Object.entries(readObject(raw,'Early Years working overlay'))
 const prefix=paperId+'::'
 const selected={}
 for(const [key,value] of entries){
  if(!key.startsWith(prefix))continue
  const questionId=key.slice(prefix.length)
  if(!questionId||!object(value))throw new Error('Invalid overlay for '+key+'; baseline refused.')
  selected[questionId]=clone(value)
 }
 return selected
}
function resolveTemplate(raw,paper){
 const map=readObject(raw,'Legacy Early Years template map')
 const has=Object.prototype.hasOwnProperty.call(map,paper.id)
 const actual=has?map[paper.id]:null
 if(has&&typeof actual!=='string')throw new Error('Saved Early Years template value is invalid.')
 return {storedRaw:has?actual:null,
  resolvedId:normalizeEarlyYearsTemplateId(actual||getDefaultEarlyYearsTemplateId(paper.classStage)),
  storageScope:'LEGACY_UNSCOPED_LOCAL_BROWSER_MAP'}
}
function referencedSketchIds(overlays){
 const values=new Set()
 for(const value of Object.values(overlays)){
  if(typeof value.sketchAssetId==='string'&&value.sketchAssetId)values.add(value.sketchAssetId)
  if(object(value.sketchOverrides)){
   for(const id of Object.values(value.sketchOverrides))
    if(typeof id==='string'&&id)values.add(id)
  }
 }
 return [...values].sort()
}
function captureSketchAssets(overlays){
 return referencedSketchIds(overlays).map(id=>{
  const asset=getSketchAsset(id)
  if(!asset)throw new Error('Referenced sketch '+id+' is unavailable (possibly a lost session upload). Capture blocked.')
  // Snapshot only REFERENCED session-upload assets; builtins remain linked by immutable IDs.
  return {id,isSession:Boolean(asset.isSession),
   ...(asset.isSession?{snapshot:clone(asset),sha256:hash(asset)}:{snapshot:null,sha256:null})}
 })
}
const seal=bundle=>{
 const data={...bundle};delete data.integrity
 return hash(data)
}
export function captureEarlyYearsReferenceBaseline({
 paper,rawOverlayJson=null,rawTemplateMapJson=null,displayedTemplateId,displayedOverlays,
 tenantScope,explicitAcknowledgement=false,capturedAt=new Date().toISOString(),
}={}){
 if(!explicitAcknowledgement)throw new Error('Explicit read-only acknowledgement required.')
 checkScope(tenantScope)
 const teacherSource=sourcePaper(paper)
 const overlays=selectOverlays(rawOverlayJson,paper.id)
 if(!object(displayedOverlays)||!same(displayedOverlays,overlays))
  throw new Error('Current editor overlay differs from PERSISTED data. Reopen the paper; no false exact snapshot.')
 const template=resolveTemplate(rawTemplateMapJson,paper)
 if(displayedTemplateId!==template.resolvedId)
  throw new Error('Displayed template differs from persisted/default template. Reopen the paper before capture.')
 const assets=captureSketchAssets(overlays)
 const knownIds=new Set(['__header__',...(paper.questions||[]).map(q=>q.id)])
 const unknownOverlayIds=Object.keys(overlays).filter(id=>!knownIds.has(id))
 const bundle={
  format:EARLY_YEARS_BASELINE_FORMAT,version:EARLY_YEARS_BASELINE_VERSION,
  tenantScope,capturedAt,
  identity:{paperId:paper.id,sourceCorpusId:'early-years-first-term-2026',
   sourceType:'EARLY_YEARS_REFERENCE_V2',nativeRenderer:'EarlyYearsWorksheetEditor/EarlyYearsPaperContainer'},
  approval:{status:'DATA_CAPTURE_ONLY',visualEvidence:'SCREENSHOT_AND_A4_PDF_PENDING',
   renderCutoverAllowed:false,serverApproved:false},
  teacherSource:clone(teacherSource),sourceSha256:hash(teacherSource),
  overlays,overlaySha256:hash(overlays),template,templateSha256:hash(template),
  sketches:assets,
  audit:{overlayEntries:Object.keys(overlays).length,orphanOverlayKeysPreserved:unknownOverlayIds,
   templateMapKeyIsUnscoped:true,
   sessionSketchesIncluded:assets.filter(a=>a.isSession).length,
   existingOriginalRendererRequired:true}
 }
 bundle.integrity={algorithm:'SHA-256',payloadSha256:seal(bundle)}
 return bundle
}
export function verifyEarlyYearsReferenceBaseline(bundle){
 if(!object(bundle)||bundle.format!==EARLY_YEARS_BASELINE_FORMAT||bundle.version!==EARLY_YEARS_BASELINE_VERSION)
  throw new Error('Not an Early Years V2 reference-overlay baseline.')
 checkScope(bundle.tenantScope)
 if(bundle.approval?.status!=='DATA_CAPTURE_ONLY'||
    bundle.approval.visualEvidence!=='SCREENSHOT_AND_A4_PDF_PENDING'||
    bundle.approval.renderCutoverAllowed!==false||bundle.approval.serverApproved!==false)
  throw new Error('Data-only snapshot cannot be upgraded into visual/production approval.')
 if(bundle.integrity?.algorithm!=='SHA-256'||bundle.integrity.payloadSha256!==seal(bundle))
  throw new Error('Early Years baseline digest mismatch.')
 const src=sourcePaper(bundle.teacherSource)
 if(bundle.identity?.paperId!==src.id||bundle.identity.sourceType!=='EARLY_YEARS_REFERENCE_V2'||
  bundle.identity.nativeRenderer!=='EarlyYearsWorksheetEditor/EarlyYearsPaperContainer'||
  bundle.sourceSha256!==hash(src))
  throw new Error('Authoritative teacher source/identity changed.')
 if(!object(bundle.overlays)||bundle.overlaySha256!==hash(bundle.overlays))
  throw new Error('Overlay digest mismatch.')
 if(bundle.templateSha256!==hash(bundle.template)||
   bundle.template?.resolvedId!==normalizeEarlyYearsTemplateId(
    bundle.template?.storedRaw||getDefaultEarlyYearsTemplateId(src.classStage)))
  throw new Error('Template identity mismatch.')
 const refs=referencedSketchIds(bundle.overlays)
 if(!Array.isArray(bundle.sketches)||!same(bundle.sketches.map(a=>a.id),refs))
  throw new Error('Referenced sketches mismatch.')
 for(const item of bundle.sketches){
  if(!item.isSession){if(item.snapshot!==null||item.sha256!==null)throw new Error('Unexpected builtin sketch payload.');continue}
  if(!object(item.snapshot)||item.snapshot.id!==item.id||item.snapshot.isSession!==true||
    item.sha256!==hash(item.snapshot))throw new Error('Session sketch payload/hash mismatch.')
 }
 return {valid:true,sourceSha256:bundle.sourceSha256,overlaySha256:bundle.overlaySha256,
  templateId:bundle.template.resolvedId,sessionSketchCount:bundle.audit?.sessionSketchesIncluded||0,
  cutoverReady:false}
}
/** READ-ONLY: compares current actual persisted editor state; never imports an overlay into localStorage. */
export function compareEarlyYearsReferenceBaseline(bundle,{
 paper,rawOverlayJson=null,rawTemplateMapJson=null,displayedTemplateId,displayedOverlays,
 tenantScope,
}={}){
 verifyEarlyYearsReferenceBaseline(bundle)
 checkScope(tenantScope)
 if(tenantScope!==bundle.tenantScope)throw new Error('Cannot compare a baseline from another school/account scope.')
 const src=sourcePaper(paper)
 if(src.id!==bundle.identity.paperId)throw new Error('Baseline belongs to a different Early Years paper.')
 const actual=selectOverlays(rawOverlayJson,paper.id)
 const template=resolveTemplate(rawTemplateMapJson,paper)
 const overlayChanged=!same(actual,bundle.overlays)
 const templateChanged=!same(template,bundle.template)
 const screenStale=!object(displayedOverlays)||!same(actual,displayedOverlays)||
  displayedTemplateId!==template.resolvedId
 const assetStatus=bundle.sketches.map(item=>{
  const current=getSketchAsset(item.id)
  return {id:item.id,changed:!current||(item.isSession?hash(current)!==item.sha256:Boolean(current.isSession))}
 })
 const assetsChanged=assetStatus.some(item=>item.changed)
 return {matches:!overlayChanged&&!templateChanged&&!assetsChanged&&!screenStale,
  sourceChanged:hash(src)!==bundle.sourceSha256,overlayChanged,templateChanged,
  screenStale,assetsChanged,assetStatus,
  baselineOverlaySha256:bundle.overlaySha256,currentOverlaySha256:hash(actual),
  baselineTemplateId:bundle.template.resolvedId,currentTemplateId:template.resolvedId,
  writePerformed:false,visualApprovalGranted:false}
}

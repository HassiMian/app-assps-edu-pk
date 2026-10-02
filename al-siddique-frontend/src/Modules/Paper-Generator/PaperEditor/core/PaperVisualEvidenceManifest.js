// Phase 3D: local, read-only EVIDENCE BINDING, never visual auto-approval or PDF renderer replacement.
// Original native baseline, preview PNG and native Print-to-PDF remain three separate retained files.
import {sha256Sync,sha256Async} from '../migration/hashUtils.js'
import {verifySavedPaperBaseline} from './SavedPaperBaseline.js'
import {verifyEarlyYearsReferenceBaseline} from '../earlyYears/specs/EarlyYearsOverlayBaseline.js'

export const VISUAL_EVIDENCE_FORMAT='assps-native-paper-visual-evidence-manifest'
export const VISUAL_EVIDENCE_VERSION=1
const SHA=/^[0-9a-f]{64}$/u
const asObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const asBytes=x=>x instanceof Uint8Array?x:null
const hashJson=x=>sha256Sync(JSON.stringify(x))
const clone=x=>JSON.parse(JSON.stringify(x))
const textSuffix=(bytes,count)=>new TextDecoder('latin1').decode(bytes.subarray(Math.max(0,bytes.length-count)))
const bufferDetails=(bytes,kind)=>{
 if(!asBytes(bytes))throw new Error('Actual '+kind+' file bytes are required.')
 if(bytes.byteLength>24*1024*1024||bytes.byteLength<20)
  throw new Error(kind+' must be a substantive file under 24 MB.')
 if(kind==='SCREEN_A4_PNG'){
  if(![137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))
   throw new Error('Screenshot is not an original PNG (file extension is not trusted).')
  if(![73,72,68,82].every((b,i)=>bytes[12+i]===b)||
   ![0,0,0,0,73,69,78,68,174,66,96,130].every((b,i)=>bytes[bytes.length-12+i]===b))
   throw new Error('Screenshot is incomplete or has no valid PNG IHDR/IEND structure.')
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
  const width=view.getUint32(16),height=view.getUint32(20)
  if(width<650||height<850||width>12000||height>18000||width*height>30_000_000)
   throw new Error('A4 preview screenshot has invalid or insufficient pixel geometry.')
  const ratio=width/height,a4HeightRatio=297/210
  // Native Early Years pages can render as ONE continuous 2-A4-height screen canvas;
  // preserve that ORIGINAL geometry, do not crop it into an artificial new one-page design.
  const apparentSpans=(height/width)/a4HeightRatio
  const continuousA4HeightSpans=Math.round(apparentSpans)
  if(continuousA4HeightSpans<1||continuousA4HeightSpans>4||
   Math.abs(apparentSpans-continuousA4HeightSpans)>0.09)
   throw new Error('Screenshot does not resemble a cropped continuous A4 sheet (1–4 page heights); capture the native sheet, not the app window.')
  return {bytes:bytes.byteLength,width,height,aspectRatio:ratio,
   continuousA4HeightSpans,a4RatioCandidate:true}
 }
 if(![37,80,68,70,45].every((b,i)=>bytes[i]===b)||!/%%EOF/u.test(textSuffix(bytes,2048)))
  throw new Error('Native A4 print file is not a complete PDF (magic/EOF missing).')
 // /MediaBox may be inherited or stored in an object stream; never claim A4 on metadata absence.
 const prefix=new TextDecoder('latin1').decode(bytes.subarray(0,Math.min(bytes.length,1_000_000)))
 const boxes=[...prefix.matchAll(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/gu)]
 const dimensions=boxes.map(m=>({widthPt:Number(m[3])-Number(m[1]),heightPt:Number(m[4])-Number(m[2])}))
 const isA4=p=>Math.abs(p.widthPt-595.28)<5&&Math.abs(p.heightPt-841.89)<5
 if(dimensions.some(box=>!isA4(box)))throw new Error('PDF declares a non-A4 page. Original native Print to PDF at A4 is required.')
 return {bytes:bytes.byteLength,declaredMediaBoxes:dimensions.length,
  a4MetadataStatus:dimensions.length?'DECLARED_BOXES_A4':'PAGE_GEOMETRY_NOT_MACHINE_VERIFIED'}
}
const cleanFilename=name=>{
 if(typeof name!=='string'||name.length>180||!name.trim())throw new Error('Evidence filename missing/too long.')
 return [...name].map(ch=>ch.charCodeAt(0)<32||'\\/:*?"<>|'.includes(ch)?'_':ch).join('')
}
export function resolveNativeBaselineIdentity(bundle){
 if(!asObject(bundle))throw new Error('Choose a native data-baseline JSON first.')
 if(bundle.format==='assps-native-saved-paper-baseline'){
  verifySavedPaperBaseline(bundle)
  return {family:'SAVED_PAPER',paperId:bundle.identity.savedPaperId,tenantScope:bundle.scope,
   sourceSha256:bundle.sourceSha256,originalRenderer:bundle.identity.nativeRenderer,
   sourceRevision:bundle.identity.sourceRevision,
   additionalNativeStateSha256:bundle.canonicalWorkingDraft.sha256}
 }
 if(bundle.format==='assps-early-years-reference-overlay-baseline'){
  verifyEarlyYearsReferenceBaseline(bundle)
  return {family:'EARLY_YEARS_REFERENCE',paperId:bundle.identity.paperId,tenantScope:bundle.tenantScope,
   sourceSha256:bundle.sourceSha256,originalRenderer:bundle.identity.nativeRenderer,
   sourceRevision:null,additionalNativeStateSha256:bundle.overlaySha256,
   templateSha256:bundle.templateSha256}
 }
 throw new Error('Unsupported data-baseline format; no visual manifest created.')
}
const allowedChecks=['nativePreviewChecked','nativePrintPdfChecked','samePaperAndRevisionChecked',
 'contentLayoutAndFontsCompared','retainedThreeOriginalFiles','acknowledgeNotApproval']
const checkAttestation=checks=>{
 if(!asObject(checks)||!allowedChecks.every(k=>checks[k]===true))
  throw new Error('All six manual evidence checks are required; this is not a machine visual approval.')
}
const payloadHash=manifest=>{
 const data={...manifest};delete data.integrity
 return hashJson(data)
}
/** Any unverified mismatch of CURRENT saved paper/overlays must be rejected by the caller
 * before and AFTER async file reads. The manifest still never implies visual approval. */
export async function createVisualEvidenceManifest({
 baseline,screenPngBytes,screenFilename,nativePdfBytes,pdfFilename,
 manualChecks,expectedPaperId,expectedTenantScope,expectedFamily,
 capturedAt=new Date().toISOString(),
}={}){
 const identity=resolveNativeBaselineIdentity(baseline)
 if(!identity.paperId||identity.paperId!==expectedPaperId||
  identity.tenantScope!==expectedTenantScope||identity.family!==expectedFamily)
  throw new Error('Chosen baseline belongs to another paper, family or account scope.')
 checkAttestation(manualChecks)
 const png=bufferDetails(screenPngBytes,'SCREEN_A4_PNG')
 const pdf=bufferDetails(nativePdfBytes,'NATIVE_A4_PDF')
 const name1=cleanFilename(screenFilename),name2=cleanFilename(pdfFilename)
 if(!/\.png$/iu.test(name1)||!/\.pdf$/iu.test(name2))
  throw new Error('Expected separate .png cropped original preview and .pdf native print files.')
 const screenSha256=await sha256Async(screenPngBytes)
 const pdfSha256=await sha256Async(nativePdfBytes)
 if(screenSha256===pdfSha256)throw new Error('Screen and native PDF evidence cannot be the same file.')
 const manifest={
  format:VISUAL_EVIDENCE_FORMAT,version:VISUAL_EVIDENCE_VERSION,capturedAt,
  subject:{...clone(identity),baselinePayloadSha256:baseline.integrity.payloadSha256,
   baselineFormat:baseline.format,baselineVersion:baseline.version},
  evidence:{
   screen:{kind:'SCREEN_A4_PNG',filename:name1,sha256:screenSha256,...png},
   print:{kind:'NATIVE_A4_PDF',filename:name2,sha256:pdfSha256,...pdf},
   baselineDataFile:{sha256:baseline.integrity.payloadSha256,format:baseline.format},
  },
  manualChecks:Object.fromEntries(allowedChecks.map(k=>[k,true])),
  assurance:{dataBaselineValidated:true,pngSignatureAndGeometryValidated:true,
   pdfMagicAndEofValidated:true,pdfDeclaredBoxesChecked:pdf.declaredMediaBoxes>0,
   manualClaims:'SELF_ATTESTED_NOT_INDEPENDENTLY_VERIFIED',
   actualVisualDifferenceEvaluation:'PENDING_INDEPENDENT_REVIEW',
   approvalStatus:'EVIDENCE_COLLECTED_UNVERIFIED',serverSignaturePresent:false,
   currentProductionCutoverAllowed:false,sourceMutationAllowed:false,
   originalFilesRetainedOutsideManifest:true},
 }
 manifest.integrity={algorithm:'SHA-256',payloadSha256:payloadHash(manifest)}
 return manifest
}
/** Validates structure/digests. Original PNG + PDF are also required to prove FILE identity. */
export async function verifyVisualEvidenceManifest(manifest,{baseline,screenPngBytes,nativePdfBytes,
 expectedPaperId,expectedTenantScope,expectedFamily}={}){
 if(!asObject(manifest)||manifest.format!==VISUAL_EVIDENCE_FORMAT||manifest.version!==VISUAL_EVIDENCE_VERSION)
  throw new Error('Not a Phase 3D visual evidence manifest.')
 if(manifest.integrity?.algorithm!=='SHA-256'||manifest.integrity.payloadSha256!==payloadHash(manifest))
  throw new Error('Visual manifest digest mismatch.')
 if(manifest.assurance?.approvalStatus!=='EVIDENCE_COLLECTED_UNVERIFIED'||
  manifest.assurance.actualVisualDifferenceEvaluation!=='PENDING_INDEPENDENT_REVIEW'||
  manifest.assurance.currentProductionCutoverAllowed!==false||
  manifest.assurance.serverSignaturePresent!==false||manifest.assurance.sourceMutationAllowed!==false)
  throw new Error('Manifest cannot self-approve or allow source/production changes.')
 checkAttestation(manifest.manualChecks)
 const identity=resolveNativeBaselineIdentity(baseline)
 if(identity.paperId!==expectedPaperId||identity.tenantScope!==expectedTenantScope||
  identity.family!==expectedFamily||JSON.stringify(manifest.subject)!==
  JSON.stringify({...identity,baselinePayloadSha256:baseline.integrity.payloadSha256,
   baselineFormat:baseline.format,baselineVersion:baseline.version}))
  throw new Error('Baseline identity, scope, exact source/revision or checksum mismatch.')
 if(!SHA.test(manifest.evidence?.screen?.sha256||'')||!SHA.test(manifest.evidence?.print?.sha256||'')||
  manifest.evidence.baselineDataFile?.sha256!==baseline.integrity.payloadSha256)
  throw new Error('Evidence SHA or data-baseline fingerprint invalid.')
 const screen=bufferDetails(screenPngBytes,'SCREEN_A4_PNG')
 const print=bufferDetails(nativePdfBytes,'NATIVE_A4_PDF')
 if(manifest.evidence?.screen?.kind!=='SCREEN_A4_PNG'||manifest.evidence?.print?.kind!=='NATIVE_A4_PDF'||
  manifest.evidence.screen.sha256!==await sha256Async(screenPngBytes)||
  manifest.evidence.print.sha256!==await sha256Async(nativePdfBytes)||
  !Object.entries(screen).every(([k,v])=>manifest.evidence.screen[k]===v)||
  !Object.entries(print).every(([k,v])=>manifest.evidence.print[k]===v))
  throw new Error('Evidence bytes, geometry or recorded SHA changed.')
 return {valid:true,paperId:identity.paperId,tenantScope:identity.tenantScope,
  dataSha256:baseline.integrity.payloadSha256,screenSha256:manifest.evidence.screen.sha256,
  printSha256:manifest.evidence.print.sha256,visualApproved:false,cutoverReady:false}
}

// Phase3I pure, read-only PRE-REVIEW of ACTUAL Phase3D four-file evidence.
// Verifies exact file identity/digests, NEVER visual semantic parity or human signoff.
// Not imported by any active route, service/bootstrap, migrate or production renderer.
const {createHash}=require('node:crypto')
const sha=v=>createHash('sha256').update(v).digest('hex')
const hashJson=v=>sha(Buffer.from(JSON.stringify(v),'utf8'))
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const hashPattern=/^[a-f0-9]{64}$/u
const humanFields=['nativePreviewChecked','nativePrintPdfChecked','samePaperAndRevisionChecked',
 'contentLayoutAndFontsCompared','retainedThreeOriginalFiles','acknowledgeNotApproval']
function parseRaw(raw,label){
 if(typeof raw!=='string'||!raw.trim()||Buffer.byteLength(raw,'utf8')>5*1024*1024)
  throw new Error('Original '+label+' JSON text (max 5 MB) is required.')
 let value
 try{value=JSON.parse(raw)}catch{throw new Error(label+' is not valid JSON.')}
 if(!object(value))throw new Error(label+' must be an unmodified JSON object.')
 return value
}
function payloadHash(obj){
 const copy={...obj};delete copy.integrity
 return hashJson(copy)
}
function verifiedShaPayload(data,label){
 if(data.integrity?.algorithm!=='SHA-256'||!hashPattern.test(data.integrity.payloadSha256||'')||
    data.integrity.payloadSha256!==payloadHash(data))
  throw new Error(label+' digest invalid; do not repair or silently reserialize.')
}
function nativeIdentity(b){
 if(b.version!==1)throw new Error('Unsupported Phase3D source baseline version.')
 let subj
 if(b.format==='assps-native-saved-paper-baseline'){
  if(b.approval?.approvalStatus!=='DATA_CAPTURE_ONLY'||b.approval.renderCutoverAllowed!==false||
     b.approval.approvedByServer!==false||b.approval.visualEvidenceStatus!=='SCREENSHOT_AND_PDF_NOT_CAPTURED')
   throw new Error('Saved native baseline has falsely elevated approval flags.')
  if(!object(b.sourcePaper)||!b.identity?.savedPaperId||String(b.sourcePaper.id)!==b.identity.savedPaperId||
     b.sourceSha256!==hashJson(b.sourcePaper)||!b.scope||b.scope==='public')
   throw new Error('Saved baseline source text, paper ID or signed-in scope mismatch.')
  if(b.canonicalWorkingDraft?.payload&&
    b.canonicalWorkingDraft.sha256!==hashJson(b.canonicalWorkingDraft.payload))
   throw new Error('Saved canonical-working-copy hash changed.')
  subj={family:'SAVED_PAPER',paperId:b.identity.savedPaperId,tenantScope:b.scope,
   sourceSha256:b.sourceSha256,originalRenderer:b.identity.nativeRenderer,
   sourceRevision:b.identity.sourceRevision,
   additionalNativeStateSha256:b.canonicalWorkingDraft.sha256}
 }else if(b.format==='assps-early-years-reference-overlay-baseline'){
  if(b.approval?.status!=='DATA_CAPTURE_ONLY'||b.approval.renderCutoverAllowed!==false||
     b.approval.serverApproved!==false||b.approval.visualEvidence!=='SCREENSHOT_AND_A4_PDF_PENDING')
   throw new Error('Early Years original source has falsely elevated approval flags.')
  if(!object(b.teacherSource)||!b.identity?.paperId||b.teacherSource.id!==b.identity.paperId||
    b.sourceSha256!==hashJson(b.teacherSource)||
    b.overlaySha256!==hashJson(b.overlays)||b.templateSha256!==hashJson(b.template)||
    !b.tenantScope||b.tenantScope==='public')
   throw new Error('Early Years source/overlay/template exact hash or school scope mismatch.')
  subj={family:'EARLY_YEARS_REFERENCE',paperId:b.identity.paperId,
   tenantScope:b.tenantScope,sourceSha256:b.sourceSha256,
   originalRenderer:b.identity.nativeRenderer,sourceRevision:null,
   additionalNativeStateSha256:b.overlaySha256,templateSha256:b.templateSha256}
 }else throw new Error('Unsupported original native source baseline family.')
 if(typeof subj.originalRenderer!=='string'||!subj.originalRenderer)
  throw new Error('Exact original paper renderer is missing.')
 return {...subj,baselinePayloadSha256:b.integrity.payloadSha256,
  baselineFormat:b.format,baselineVersion:b.version}
}
function actualBytes(v,kind){
 if(!(v instanceof Uint8Array)||v.byteLength<32||v.byteLength>24*1024*1024)
  throw new Error('Complete original '+kind+' FILE BYTES required, under 24 MB.')
 return Buffer.from(v.buffer,v.byteOffset,v.byteLength)
}
function screenDetails(bytes){
 if(!Buffer.from([137,80,78,71,13,10,26,10]).equals(bytes.subarray(0,8))||
   bytes.toString('latin1',12,16)!=='IHDR'||
   !Buffer.from([0,0,0,0,73,69,78,68,174,66,96,130]).equals(bytes.subarray(-12)))
  throw new Error('Original cropped preview is not a Phase3D-compatible complete PNG.')
 const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20)
 if(w<650||h<850||w>12000||h>18000||w*h>30_000_000)
  throw new Error('Native preview geometry is invalid or insufficient.')
 const spans=Math.round((h/w)/(297/210))
 if(spans<1||spans>4||Math.abs((h/w)/(297/210)-spans)>0.09)
  throw new Error('Native preview does not preserve 1–4 continuous A4 page spans.')
 return {bytes:bytes.byteLength,width:w,height:h,aspectRatio:w/h,
  continuousA4HeightSpans:spans,a4RatioCandidate:true}
}
function pdfDetails(bytes){
 if(bytes.toString('latin1',0,5)!=='%PDF-'||
   !/%%EOF/u.test(bytes.toString('latin1',Math.max(0,bytes.length-2048))))
  throw new Error('Original print PDF magic/EOF mismatch.')
 const prefix=bytes.toString('latin1',0,Math.min(bytes.length,1000000))
 const boxes=[...prefix.matchAll(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/gu)]
 const sizes=boxes.map(m=>({w:Number(m[3])-Number(m[1]),h:Number(m[4])-Number(m[2])}))
 if(sizes.some(x=>Math.abs(x.w-595.28)>=5||Math.abs(x.h-841.89)>=5))
  throw new Error('Native print PDF explicitly declares a non-A4 page.')
 return {bytes:bytes.byteLength,declaredMediaBoxes:sizes.length,
  a4MetadataStatus:sizes.length?'DECLARED_BOXES_A4':'PAGE_GEOMETRY_NOT_MACHINE_VERIFIED'}
}
const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y)
function verifyPrincipalEvidencePreflight({baselineRawText,manifestRawText,screenPngBytes,
 nativePdfBytes,expectedPaperId,expectedTenantScope,expectedFamily}={}){
 if(!expectedPaperId||!expectedTenantScope||!expectedFamily)
  throw new Error('Independent exact school/paper/family scope selection is required.')
 const baseline=parseRaw(baselineRawText,'baseline')
 const manifest=parseRaw(manifestRawText,'visual evidence manifest')
 verifiedShaPayload(baseline,'Native baseline')
 verifiedShaPayload(manifest,'Phase3D manifest')
 const identity=nativeIdentity(baseline)
 if(identity.paperId!==expectedPaperId||identity.tenantScope!==expectedTenantScope||
    identity.family!==expectedFamily)
  throw new Error('Visual evidence belongs to a different paper/account/family.')
 if(manifest.format!=='assps-native-paper-visual-evidence-manifest'||manifest.version!==1||
    !same(manifest.subject,identity))
  throw new Error('Phase3D manifest does not match exact original baseline source identity.')
 if(!humanFields.every(k=>manifest.manualChecks?.[k]===true)||
    manifest.assurance?.approvalStatus!=='EVIDENCE_COLLECTED_UNVERIFIED'||
    manifest.assurance?.actualVisualDifferenceEvaluation!=='PENDING_INDEPENDENT_REVIEW'||
    manifest.assurance?.serverSignaturePresent!==false||
    manifest.assurance?.currentProductionCutoverAllowed!==false||
    manifest.assurance?.sourceMutationAllowed!==false)
  throw new Error('An unsigned source/manifest must remain UNVERIFIED and unapproved.')
 const png=actualBytes(screenPngBytes,'preview PNG'),pdf=actualBytes(nativePdfBytes,'print PDF')
 const s=screenDetails(png),p=pdfDetails(pdf)
 if(manifest.evidence?.screen?.kind!=='SCREEN_A4_PNG'||
    manifest.evidence?.print?.kind!=='NATIVE_A4_PDF'||
    manifest.evidence.baselineDataFile?.sha256!==baseline.integrity.payloadSha256||
    manifest.evidence.baselineDataFile?.format!==baseline.format||
    !/\.png$/iu.test(manifest.evidence.screen.filename||'')||
    !/\.pdf$/iu.test(manifest.evidence.print.filename||'')||
    manifest.evidence.screen.sha256!==sha(png)||manifest.evidence.print.sha256!==sha(pdf)||
    !Object.entries(s).every(([k,v])=>manifest.evidence.screen[k]===v)||
    !Object.entries(p).every(([k,v])=>manifest.evidence.print[k]===v))
  throw new Error('Original DATA + PNG + native PDF evidence bytes/identity do not match manifest.')
 return Object.freeze({
  status:'FOUR_FILE_IDENTITY_VERIFIED_HUMAN_VISUAL_REVIEW_PENDING',
  paperId:identity.paperId,tenantScope:identity.tenantScope,family:identity.family,
  sourceSha256:identity.sourceSha256,baselineSha256:baseline.integrity.payloadSha256,
  previewSha256:sha(png),printSha256:sha(pdf),
  pdfA4MachineVerified:p.declaredMediaBoxes>0,
  originalNativeRendererRequired:identity.originalRenderer,
  semanticContentAndFontParityMachineVerified:false,
  principalOriginalCaptureProvenanceMachineVerified:false,
  independentlyApproved:false,productionCutoverAllowed:false,sourceMutationAllowed:false,
  nextGate:'Independent human review of original live paper, full native PNG AND all A4 PDF pages plus source provenance, fonts, marks, RTL/MCQ punctuation and clipping.'
 })
}
module.exports={verifyPrincipalEvidencePreflight}

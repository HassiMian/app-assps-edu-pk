// Phase 3D visual EVIDENCE collection. Local only: no source write, no auto approval, no HTTP upload.
import {useEffect,useState} from 'react'
import Portal from '../../../../components/Portal'
import {resolveNativeBaselineIdentity,createVisualEvidenceManifest,
 verifyVisualEvidenceManifest} from './PaperVisualEvidenceManifest.js'

const requiredChecks=[
 ['nativePreviewChecked','I captured a cropped full A4 sheet from the EXISTING native preview, not a regenerated template.'],
 ['nativePrintPdfChecked','The PDF came from the EXISTING native Print / Save as PDF at A4; paper/font/template was unchanged.'],
 ['samePaperAndRevisionChecked','Class, subject, paper ID and version of all three original files refer to this same saved paper.'],
 ['contentLayoutAndFontsCompared','I manually compared original text, numbering, marks, tables, Urdu/Jameel, illustrations, margins and breaks.'],
 ['retainedThreeOriginalFiles','I have retained the original baseline JSON, screenshot PNG and native PDF separately.'],
 ['acknowledgeNotApproval','I understand this produces a data-and-file evidence manifest, NOT a server-signed visual approval or renderer switch.'],
]
const button={border:'1px solid #617994',borderRadius:8,padding:'9px 12px',fontWeight:750,
 fontSize:12,color:'#eaf2fb',background:'#1d3e5c',cursor:'pointer'}
const fileLabel={display:'grid',gap:5,fontSize:12,fontWeight:700}
const MAX_BASE=12*1024*1024,MAX_EVIDENCE=24*1024*1024
const readFile=async(file,limit,label)=>{
 if(!file||file.size<20||file.size>limit)throw new Error(label+' absent, empty or exceeds the allowed size.')
 return new Uint8Array(await file.arrayBuffer())
}
const download=(filename,object)=>{
 const blob=new Blob([JSON.stringify(object,null,2)+'\n'],{type:'application/json;charset=utf-8'})
 const url=URL.createObjectURL(blob),a=document.createElement('a')
 a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a)
 try{a.click()}finally{a.remove();URL.revokeObjectURL(url)}
}
export default function VisualEvidenceManifestDialog({
 family,paperId,tenantScope,compareCurrentBaseline,onClose,
}){
 const [baseFile,setBaseFile]=useState(null),[png,setPng]=useState(null),[pdf,setPdf]=useState(null)
 const [manifestFile,setManifestFile]=useState(null),[checks,setChecks]=useState({})
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [preview,setPreview]=useState(null)
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
 const choosePng=file=>{
  setPng(file);setPreview(file?URL.createObjectURL(file):null)
 }
 const decodePng=async file=>{
  if(!file||file.size<32||file.size>MAX_EVIDENCE)throw new Error('Screenshot PNG absent or exceeds 24 MB.')
  // Bound decoded pixel memory BEFORE createImageBitmap on school PCs with limited RAM.
  const first=new Uint8Array(await file.slice(0,24).arrayBuffer())
  if(![137,80,78,71,13,10,26,10].every((b,i)=>first[i]===b))throw new Error('Not a PNG screenshot.')
  const view=new DataView(first.buffer)
  const width=view.getUint32(16),height=view.getUint32(20)
  if(width<650||height<850||width>12000||height>18000||width*height>30_000_000)
   throw new Error('PNG pixel dimensions exceed safe preview limits or are too small.')
  if(typeof createImageBitmap!=='function')
   throw new Error('This browser cannot independently decode screenshot PNG; use supported Chrome/Edge.')
  let bitmap
  try{bitmap=await createImageBitmap(file)}catch{throw new Error('Original screenshot PNG cannot be decoded; corrupt/forged image blocked.')}
  try{if(bitmap.width<650||bitmap.height<850)throw new Error('Screenshot page resolution is insufficient.')}
  finally{bitmap.close?.()}
 }
 const chosen=baseFile&&png&&pdf
 const allChecks=requiredChecks.every(([key])=>checks[key]===true)
 const prepare=async()=>{
  setError('');setNotice('');setBusy(true)
  try{
   if(!chosen||!allChecks)throw new Error('Select all three original files and complete the six manual checks.')
   if(!/\.json$/iu.test(baseFile.name)||baseFile.size>MAX_BASE)
    throw new Error('Choose your original downloaded baseline .json (under 12 MB).')
   const baseline=JSON.parse(await baseFile.text()),identity=resolveNativeBaselineIdentity(baseline)
   if(identity.paperId!==paperId||identity.tenantScope!==tenantScope||identity.family!==family)
    throw new Error('Baseline is not the currently selected school, paper and native source family.')
   if(compareCurrentBaseline){
    const state=compareCurrentBaseline(baseline)
    if(!state?.matches)throw new Error('Actual saved source, draft, template or overlay CHANGED since baseline. Capture a new DATA baseline first.')
   }
   await decodePng(png)
   const screenPngBytes=await readFile(png,MAX_EVIDENCE,'Screenshot PNG')
   const nativePdfBytes=await readFile(pdf,MAX_EVIDENCE,'Native A4 PDF')
   const props={baseline,screenPngBytes,nativePdfBytes,expectedPaperId:paperId,
    expectedTenantScope:tenantScope,expectedFamily:family}
   const manifest=await createVisualEvidenceManifest({...props,screenFilename:png.name,pdfFilename:pdf.name,
    manualChecks:checks})
   await verifyVisualEvidenceManifest(manifest,props)
   if(compareCurrentBaseline&&!compareCurrentBaseline(baseline)?.matches)
    throw new Error('Current stored paper changed during file processing; output blocked.')
   const fileName='assps-visual-evidence-'+String(paperId).replace(/[^a-zA-Z0-9_-]/gu,'_').slice(0,60)+
    '-'+manifest.integrity.payloadSha256.slice(0,14)+'.json'
   download(fileName,manifest)
   setNotice('Read-only manifest downloaded: '+fileName+
    '. Keep ALL three originals alongside it. This is NOT approval and cannot replace the existing paper.')
  }catch(e){setError('Evidence preparation blocked: '+e.message)}
  finally{setBusy(false)}
 }
 const verifyFiles=async()=>{
  setError('');setNotice('');setBusy(true)
  try{
   if(!manifestFile||!chosen)throw new Error('Select the original baseline, PNG, PDF and exported manifest.')
   if(manifestFile.size>MAX_BASE||!/\.json$/iu.test(manifestFile.name))
    throw new Error('Choose exported visual-evidence manifest .json (under 12 MB).')
   const baseline=JSON.parse(await baseFile.text()),manifest=JSON.parse(await manifestFile.text())
   await decodePng(png)
   const report=await verifyVisualEvidenceManifest(manifest,{baseline,
    screenPngBytes:await readFile(png,MAX_EVIDENCE,'Screenshot PNG'),
    nativePdfBytes:await readFile(pdf,MAX_EVIDENCE,'Native A4 PDF'),expectedPaperId:paperId,
    expectedTenantScope:tenantScope,expectedFamily:family})
   setNotice(report.valid?'VERIFY PASS: the manifest is bound to these three exact original files. Independent visual review and server approval are still pending.':'Verification did not pass.')
  }catch(e){setError('Manifest verification blocked: '+e.message)}
  finally{setBusy(false)}
 }
 return <Portal><div data-visual-evidence-dialog style={{position:'fixed',inset:0,zIndex:10002,
  display:'grid',placeItems:'center',background:'rgba(0,0,0,.86)',padding:15}}>
  <div style={{width:'min(750px,97vw)',maxHeight:'94vh',overflowY:'auto',background:'#092540',
   border:'1px solid #607c9d',borderRadius:14,padding:20,color:'#f1f5f9'}}>
   <header style={{display:'flex',alignItems:'start',justifyContent:'space-between',gap:12}}>
    <div><h2 style={{fontSize:17,color:'#e9c76b',margin:0}}>Bind original A4 visual evidence</h2>
     <p style={{fontSize:12,opacity:.85}}>Selected {family} · {paperId} · {tenantScope}</p></div>
    <button type="button" style={button} onClick={onClose}>Close ×</button>
   </header>
   <p style={{fontSize:12,lineHeight:1.6}}>Select the separately downloaded DATA baseline from this same
    paper, a cropped PNG of the native A4 preview, and its original Print / Save as PDF file.
    File contents are hashed locally; screenshot, PDF and school data are NOT uploaded or embedded
    in the manifest. File extension alone is never trusted.</p>
   <div style={{display:'grid',gap:10}}>
    <label style={fileLabel}>1 · Original native DATA baseline (.json)
     <input data-visual-baseline-json type="file" accept=".json,application/json" onChange={e=>setBaseFile(e.target.files?.[0]||null)}/></label>
    <label style={fileLabel}>2 · Cropped full native A4 preview (.png)
     <input data-visual-screen-png type="file" accept=".png,image/png" onChange={e=>choosePng(e.target.files?.[0]||null)}/></label>
    <label style={fileLabel}>3 · Existing native A4 Print / Save as PDF (.pdf)
     <input data-visual-native-pdf type="file" accept=".pdf,application/pdf" onChange={e=>setPdf(e.target.files?.[0]||null)}/></label>
    {preview&&<div style={{display:'flex',gap:10,alignItems:'start',flexWrap:'wrap'}}>
     <img data-visual-png-preview alt="Chosen original A4 screen evidence" src={preview}
      style={{maxWidth:125,maxHeight:180,objectFit:'contain',border:'1px solid #9ca3af',background:'#fff'}}/>
     <p style={{fontSize:11,opacity:.86,maxWidth:435}}>Inspect this selected image and the original
      PDF independently. Hash matching cannot establish that text, brackets, answer lines or typography visually match.</p></div>}
   </div>
   <div style={{marginTop:11,display:'grid',gap:7}}>
    {requiredChecks.map(([key,label])=><label key={key} style={{display:'flex',gap:8,fontSize:12,lineHeight:1.45}}>
     <input aria-label={key} type="checkbox" checked={checks[key]===true}
      onChange={e=>setChecks(old=>({...old,[key]:e.target.checked}))}/>
     {label}</label>)}
   </div>
   <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:14}}>
    <button data-generate-visual-manifest type="button" style={{...button,background:'#bb9a39',
     color:'#092540',opacity:(busy||!chosen||!allChecks)?0.5:1}}
     disabled={busy||!chosen||!allChecks} onClick={prepare}>
     {busy?'Checking files…':'Download evidence manifest (.json)'}</button>
   </div>
   <div style={{borderTop:'1px solid #47627d',marginTop:14,paddingTop:12}}>
    <label style={{...fileLabel,fontSize:11}}>Optional · Verify downloaded manifest against ALL THREE original files
     <input data-visual-manifest-import type="file" accept=".json,application/json"
      onChange={e=>setManifestFile(e.target.files?.[0]||null)}/></label>
    <button type="button" data-verify-visual-manifest disabled={busy||!manifestFile||!chosen}
     style={{...button,marginTop:8,opacity:(busy||!manifestFile||!chosen)?0.5:1}} onClick={verifyFiles}>
     Verify exact file fingerprints</button>
   </div>
   <p style={{fontSize:11,color:'#f9d881',lineHeight:1.6}}>
    EVIDENCE_COLLECTED_UNVERIFIED only. No pixel-level claim, no automated marks correction,
    no approval, no renderer switch, no original-paper write, and no backend migration.</p>
   {error&&<p role="alert" style={{color:'#fecaca',fontSize:12}}>{error}</p>}
   {notice&&<p role="status" style={{color:'#bbf7d0',fontSize:12}}>{notice}</p>}
  </div>
 </div></Portal>
}

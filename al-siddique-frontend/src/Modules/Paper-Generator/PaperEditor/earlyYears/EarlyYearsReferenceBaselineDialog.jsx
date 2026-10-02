// Read-only snapshot UI for reference Early Years V2 editor, separate from generic Saved Papers.
import {useState} from 'react'
import VisualEvidenceManifestDialog from '../core/VisualEvidenceManifestDialog.jsx'
import Portal from '../../../../components/Portal'
import {getTenantScope,getTenantStorageItem} from '../../../../services/tenantStorage.js'
import {getOverlay,getAllOverlaysForPaper} from './specs/EarlyYearsPresentationOverlay.js'
import {EARLY_YEARS_OVERLAY_KEY,EARLY_YEARS_TEMPLATE_KEY,
 captureEarlyYearsReferenceBaseline,verifyEarlyYearsReferenceBaseline,
 compareEarlyYearsReferenceBaseline} from './specs/EarlyYearsOverlayBaseline.js'

const button={border:'1px solid #7890a9',background:'#214364',borderRadius:8,
 color:'#eef5fe',padding:'9px 11px',fontSize:12,fontWeight:750,cursor:'pointer'}
function readSourceState(paper,templateId){
 // Hydrate the EXISTING editor overlay (without creating a new one, editing or saving).
 getOverlay(paper.id,'__header__')
 return {paper,tenantScope:getTenantScope(),
  rawOverlayJson:getTenantStorageItem(EARLY_YEARS_OVERLAY_KEY),
  // Actual legacy template map is intentionally UNscoped in the existing source renderer.
  rawTemplateMapJson:window.localStorage.getItem(EARLY_YEARS_TEMPLATE_KEY),
  displayedTemplateId:templateId,displayedOverlays:getAllOverlaysForPaper(paper.id)}
}
function downloadJson(name,value){
 const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json;charset=utf-8'})
 const url=URL.createObjectURL(blob),a=document.createElement('a')
 a.href=url;a.download=name;a.style.display='none'
 document.body.appendChild(a)
 try{a.click()}finally{a.remove();URL.revokeObjectURL(url)}
}
export default function EarlyYearsReferenceBaselineDialog({paper,templateId,onClose}){
 const [ack,setAck]=useState(false),[error,setError]=useState('')
 const [message,setMessage]=useState(''),[comparison,setComparison]=useState(null)
 const [visualEvidenceOpen,setVisualEvidenceOpen]=useState(false)
 const capture=()=>{
  setError('');setMessage('');setComparison(null)
  try{
   const bundle=captureEarlyYearsReferenceBaseline({...readSourceState(paper,templateId),
    explicitAcknowledgement:ack})
   verifyEarlyYearsReferenceBaseline(bundle)
   const filename='assps-earlyyears-reference-'+paper.id.replace(/[^a-zA-Z0-9_-]/g,'_')+
    '-'+bundle.sourceSha256.slice(0,12)+'-'+bundle.overlaySha256.slice(0,12)+'.json'
   if(JSON.stringify(bundle).length>12*1024*1024)throw new Error('Snapshot exceeds 12 MB; evidence export blocked.')
   downloadJson(filename,bundle)
   setMessage('Data baseline downloaded: '+filename+'. Keep THIS visible original preview screenshot and native A4 Print to PDF separately; neither has been captured or approved by this JSON.')
  }catch(err){setError(err.message)}
 }
 const compare=async(event)=>{
  const file=event.target.files?.[0]
  event.target.value=''
  if(!file)return
  setError('');setMessage('');setComparison(null)
  if(!/\.json$/iu.test(file.name)||file.size>12*1024*1024){
   setError('Choose a native Early Years .json baseline smaller than 12 MB.');return
  }
  try{
   const bundle=JSON.parse(await file.text())
   const result=compareEarlyYearsReferenceBaseline(bundle,readSourceState(paper,templateId))
   setComparison(result)
  }catch(err){setError('Comparison blocked: '+err.message)}
 }
 return <Portal>
 {visualEvidenceOpen&&<VisualEvidenceManifestDialog family="EARLY_YEARS_REFERENCE"
  paperId={paper.id} tenantScope={getTenantScope()} onClose={()=>setVisualEvidenceOpen(false)}
  compareCurrentBaseline={bundle=>compareEarlyYearsReferenceBaseline(bundle,readSourceState(paper,templateId))} />}
 <div data-early-years-reference-baseline
  style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.8)',
   display:'grid',placeItems:'center',padding:18}}>
  <div style={{background:'#092744',color:'#eff6ff',border:'1px solid #72849c',
   borderRadius:14,width:'min(700px,96vw)',maxHeight:'90vh',overflowY:'auto',padding:20}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:12}}>
    <div><h2 style={{fontSize:18,margin:0,color:'#f8d477'}}>Early Years · Protected Reference Baseline</h2>
     <p style={{fontSize:12,opacity:.86,margin:'7px 0'}}>Reference {paper.classDisplayName} {paper.subject} · {paper.id}</p></div>
    <button type="button" onClick={onClose} style={button}>Close ×</button>
   </div>
   <p style={{fontSize:12,lineHeight:1.65}}>This read-only export contains only the selected, original V2 teacher paper, its exact saved
    question/header overlays, current stored template mapping, and any referenced session-uploaded sketches.
    If an unsaved edit, missing asset or stale template is detected, export is refused. Other school papers are excluded.</p>
   <p style={{fontSize:12,lineHeight:1.65,color:'#fcd34d'}}>
    This is DATA EVIDENCE ONLY, not an exact printed-page or visual approval. The existing template map is a legacy
    shared browser key; the snapshot records that limitation. A referenced custom sketch may be session-only.
    No local data is restored, rewritten, approved or sent to a backend.</p>
   <label style={{display:'flex',gap:9,alignItems:'start',fontSize:12,lineHeight:1.5,padding:'8px 0'}}>
    <input type="checkbox" aria-label="Confirm Early Years reference baseline" checked={ack} onChange={e=>setAck(e.target.checked)}/>
    Confirm the selected paper and template are the ORIGINAL approved pattern. Download a protected,
    read-only DATA copy only; no renderer migration or visual approval.
   </label>
   <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
    <button type="button" data-download-early-years-baseline disabled={!ack} onClick={capture}
     style={{...button,background:'#c8991a',color:'#0a2038',opacity:ack?1:.5}}>
     Download Reference Data (.json)</button>
    <label style={{...button,display:'inline-flex',alignItems:'center',gap:6}}>
     Compare saved .json with current editor
     <input type="file" aria-label="Compare Early Years reference JSON" data-compare-early-years-baseline
      accept=".json,application/json" hidden onChange={compare}/>
    </label>
    <button data-open-visual-evidence type="button" style={button}
     onClick={()=>setVisualEvidenceOpen(true)}>Bind original A4 screenshot + PDF to DATA baseline</button>
   </div>
   <div style={{fontSize:12,lineHeight:1.7,padding:'10px 0',opacity:.9}}>
    For actual visual evidence of THIS edited copy, keep the selected template unchanged,
    take a screenshot of the A4 worksheet preview, and use the existing <strong>Print Worksheet → Save as PDF</strong>
    at A4 / actual scale. If marks conflict, retain the native draft warning; never relabel it approved.
   </div>
   {comparison&&<div data-early-years-baseline-result role="status" style={{fontSize:12,padding:10,
    border:'1px solid #657d97',borderRadius:7}}>
    <strong>{comparison.matches?'MATCH: all persisted reference overlays, template, sketches and visible editor state.':
     'CHANGED: exact-pattern comparison failed; DO NOT replace the original paper.'}</strong>
    <p>Overlay changed: {String(comparison.overlayChanged)} · Template changed: {String(comparison.templateChanged)}
     · Sketch asset changed/missing: {String(comparison.assetsChanged)} · Stale displayed editor: {String(comparison.screenStale)}</p>
   </div>}
   {error&&<p role="alert" style={{fontSize:12,color:'#fecaca'}}>{error}</p>}
   {message&&<p role="status" style={{fontSize:12,color:'#bbf7d0'}}>{message}</p>}
  </div>
 </div></Portal>
}

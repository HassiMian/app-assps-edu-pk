import {useState} from 'react'
import Portal from '../../components/Portal'
import {getTenantScope,getTenantStorageItem} from '../../services/tenantStorage.js'
import {captureSavedPaperBaseline,verifySavedPaperBaseline,compareCurrentSavedPaperWithBaseline} from
 './PaperEditor/core/SavedPaperBaseline.js'

const STORE='al_siddique_paper_store',DRAFTS='al_siddique_canonical_working_drafts'
const button={background:'#1a3955',border:'1px solid #526987',borderRadius:8,color:'#e2e8f0',
 padding:'9px 13px',fontSize:12,fontWeight:750,cursor:'pointer'}
const readRaw=()=>({rawStoreJson:getTenantStorageItem(STORE),rawCanonicalDraftsJson:getTenantStorageItem(DRAFTS),
 tenantScope:getTenantScope()})
function downloadBlob(filename,content){
 const blob=new Blob([content],{type:'application/json;charset=utf-8'})
 const url=URL.createObjectURL(blob)
 const a=document.createElement('a')
 a.href=url;a.download=filename;a.style.display='none'
 document.body.appendChild(a)
 try{a.click()}finally{a.remove();URL.revokeObjectURL(url)}
}
export default function SavedPaperBaselineDialog({paper,onClose}){
 const [ack,setAck]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [comparison,setComparison]=useState(null)
 const capture=()=>{
  setError('');setNotice('');setComparison(null)
  try{
   const bundle=captureSavedPaperBaseline({...readRaw(),displayedPaper:paper,explicitAcknowledgement:ack})
   verifySavedPaperBaseline(bundle)
   const filename='assps-native-baseline-'+String(paper.id).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,70)+
    '-'+bundle.sourceSha256.slice(0,12)+'.json'
   downloadBlob(filename,JSON.stringify(bundle,null,2)+'\n')
   setNotice('Local baseline file prepared: '+filename+'. This is DATA ONLY; retain a matching original preview screenshot and PDF separately.')
  }catch(e){setError(e.message)}
 }
 const compareFile=async(event)=>{
  const file=event.target.files?.[0]
  event.target.value=''
  if(!file)return
  setError('');setNotice('');setComparison(null)
  if(!/\.json$/iu.test(file.name)||file.size>12*1024*1024){setError('Choose a baseline .json file smaller than 12 MB.');return}
  try{
   const text=await file.text(),bundle=JSON.parse(text)
   const result=compareCurrentSavedPaperWithBaseline(bundle,readRaw())
   if(result.sourceId!==String(paper.id))throw new Error('The imported baseline is for a different selected paper.')
   setComparison(result)
  }catch(e){setError('Comparison blocked: '+e.message)}
 }
 return <Portal>
 <div data-paper-baseline-dialog style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.78)',
  display:'grid',placeItems:'center',padding:18}}>
 <div style={{background:'#092744',color:'#ecf2fa',border:'1px solid #526987',borderRadius:14,
  padding:22,width:'min(660px,95vw)',maxHeight:'90vh',overflowY:'auto'}}>
  <header style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'start'}}>
   <div><h2 style={{fontSize:18,color:'#e8b420',margin:0}}>Read-only Native Paper Baseline</h2>
    <p style={{fontSize:12,opacity:.83,margin:'7px 0'}}>Saved paper: {paper.name} · ID: {paper.id}</p></div>
   <button type="button" style={button} onClick={onClose}>Close ×</button>
  </header>
  <p style={{fontSize:12,lineHeight:1.65}}>
   Download a local, checksum-protected snapshot of this paper as actually stored in THIS signed-in
   browser, including its original layout/configuration and any separate saved Canonical working
   draft. No school data is uploaded, modified, migrated or approved by this action.
  </p>
  <p style={{fontSize:12,lineHeight:1.65,color:'#fcd34d'}}>
   This JSON is not a visual proof: keep a screenshot of the existing Preview and the original
   A4 PDF alongside it before authorizing a renderer/template change. If the stored and displayed
   paper differ, export is blocked until the page is reopened.
  </p>
  <label style={{display:'flex',gap:9,alignItems:'start',fontSize:12,lineHeight:1.55,padding:'8px 0'}}>
   <input type="checkbox" aria-label="Confirm native paper baseline capture" checked={ack} onChange={e=>setAck(e.target.checked)}/>
   I have selected the correct current paper. Capture a read-only DATA baseline; do not label this
   paper visually approved or change any saved source.
  </label>
  <div style={{display:'flex',gap:10,flexWrap:'wrap',padding:'8px 0'}}>
   <button data-download-native-baseline type="button" disabled={!ack} onClick={capture}
    style={{...button,opacity:ack?1:.48,background:'#c8991a',color:'#081e35'}}>
    Download Native Baseline (.json)
   </button>
   <label style={{...button,display:'inline-flex',gap:7,alignItems:'center',cursor:'pointer'}}>
    Compare current saved paper with .json
    <input data-import-native-baseline aria-label="Compare native baseline JSON" type="file"
     accept=".json,application/json" onChange={compareFile} hidden/>
   </label>
  </div>
  {comparison&&<div data-baseline-comparison role="status" style={{fontSize:12,border:'1px solid #536984',
   padding:11,borderRadius:8,marginTop:9}}>
   <strong style={{color:comparison.matches?'#bbf7d0':'#fcd34d'}}>
    {comparison.matches?'MATCH: exact persisted source and working draft.':'CHANGED: native baseline differs; do not auto-restore.'}
   </strong>
   <p>Source changed: {String(comparison.sourceChanged)} · Canonical working draft changed: {String(comparison.draftChanged)}</p>
   {comparison.changedTopLevel.length>0&&<p>Changed source fields: {comparison.changedTopLevel.join(', ')}</p>}
  </div>}
  {error&&<p role="alert" style={{color:'#fecaca',fontSize:12}}>{error}</p>}
  {notice&&<p role="status" style={{color:'#bbf7d0',fontSize:12}}>{notice}</p>}
 </div></div></Portal>
}

import { useState } from 'react'
import api from '../../services/api'
import { adaptVerifiedPaperRecord, requireVerifiedResolution } from './grade910PaperWorkspaceVerifiedBridge'
const ctrl={padding:'7px 9px',borderRadius:7,color:'#152b43',background:'white',minWidth:120}
export default function Grade910WorkspaceApprovedInsert({grade,subject,onInsert}){
 const [section,setSection]=useState('')
 const [records,setRecords]=useState([])
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const scope={grade,subject:subject?.trim()||'',section:section.trim()}
 async function search(){
  setBusy(true);setMessage('');setRecords([])
  try{
   if(!grade||!scope.subject)throw Error('Grade/subject is required.')
   const response=await api.get('/api/grade910-verified-picker/approved-only',{params:scope,headers:{'Cache-Control':'no-store'}})
   const data=response?.data
   if(data?.success!==true||data?.academicallyApprovedOnly!==true||
      data?.source!=='server-signed-restricted-verified-publications'||!Array.isArray(data.records))
    throw Error('Certified school server is not available.')
   if(data.records.some(r=>r.academicallyVerified!==true||r.paperStudioSelectable!==true))
    throw Error('Uncertified question returned by server.')
   setRecords(data.records)
   if(!data.records.length)setMessage('No genuinely published Grade IX/X revisions exist for this school and subject.')
  }catch(error){setMessage('Approved-only request blocked: '+(error.response?.data?.code||error.message))}
  finally{setBusy(false)}
 }
 async function add(r){
  setBusy(true);setMessage('')
  try{
   const response=await api.get('/api/grade910-verified-picker/resolve-revision',{params:{
    ...scope,originalQuestionId:r.originalQuestionId,revision:r.revision,questionSha:r.questionSha
   },headers:{'Cache-Control':'no-store'}})
   const published=requireVerifiedResolution(response,r,scope)
   const imported=adaptVerifiedPaperRecord(published,scope)
   onInsert(imported)
   setMessage('Server-verified revision '+r.originalQuestionId+' inserted into this Paper Workspace. Any change requires re-review.')
   setRecords(x=>x.filter(v=>!(v.originalQuestionId===r.originalQuestionId&&v.revision===r.revision)))
  }catch(error){setMessage('Question insertion blocked: '+(error.response?.data?.code||error.message))}
  finally{setBusy(false)}
 }
 return <details data-grade910-real-verified-paper-workspace style={{marginTop:10,padding:'10px 14px',border:'1px solid #40a8ce',borderRadius:10,background:'rgba(14,63,98,.9)',color:'#f4faff'}}>
  <summary style={{fontWeight:800,cursor:'pointer'}}>Insert academically verified Grade {grade} question directly into this paper</summary>
  <p style={{fontSize:12}}>Only independently reviewed, institutionally signed, non-revoked revisions published by the school server are eligible. Provisional drafts and local approval flags are excluded.</p>
  <div style={{display:'flex',gap:10,alignItems:'end',flexWrap:'wrap'}}>
   <label style={{fontSize:12}}>Section (required for assigned teachers)<input style={{...ctrl,display:'block'}} value={section} maxLength={50} onChange={e=>setSection(e.target.value)} placeholder="e.g. Usman / Fatma"/></label>
   <button type="button" disabled={busy} onClick={search} style={{padding:'9px 15px',borderRadius:8,border:0,background:'#0487be',color:'#fff'}}>{busy?'Checking…':'Load signed approved revisions'}</button>
  </div>
  {records.map(r=><div key={r.originalQuestionId+'_'+r.revision} style={{marginTop:10,padding:10,border:'1px solid #5989a8',borderRadius:8}}>
   <strong>{r.originalQuestionId} · revision {r.revision}</strong>
   <span style={{marginLeft:10,fontSize:12}}>{r.paperPayload?.finalQuestion?.type || ''}: {String(r.paperPayload?.finalQuestion?.text || r.paperPayload?.finalQuestion?.stem || '').slice(0,140)}</span>
   <button type="button" disabled={busy} onClick={()=>add(r)} style={{marginLeft:12,padding:'6px 12px'}}>Add verified revision to paper</button>
  </div>)}
  {message&&<p role="status" style={{fontSize:12}}>{message}</p>}
 </details>
}

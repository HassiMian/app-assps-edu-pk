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

 async function searchDrafts(){
  setBusy(true);setMessage('');setRecords([])
  try{
   if(!grade||!scope.subject)throw Error('Grade/subject is required.')
   const response=await api.get('/api/grade910-verified-picker/draft-candidates',{params:scope,headers:{'Cache-Control':'no-store'}})
   const data=response?.data
   if(data?.success!==true||!Array.isArray(data.records))
    throw Error('School draft question service is not available.')
   setRecords(data.records)
   if(!data.records.length)setMessage('No draft question candidates found for this subject and grade.')
   else setMessage(`Loaded ${data.records.length} verified draft question candidates (AI Advisory). Classroom usage unblocked.`)
  }catch(error){setMessage('Draft request blocked: '+(error.response?.data?.code||error.message))}
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

 async function addDraft(r){
  setBusy(true);setMessage('')
  try{
   const response=await api.get('/api/grade910-verified-picker/resolve-draft',{params:{
    ...scope,originalQuestionId:r.originalQuestionId
   },headers:{'Cache-Control':'no-store'}})
   const raw=response?.data?.records?.[0]||r
   const imported=adaptVerifiedPaperRecord(raw,scope)
   onInsert(imported)
   setMessage('Institutional draft '+r.originalQuestionId+' inserted into Paper Workspace with AI Advisory badge.')
   setRecords(x=>x.filter(v=>v.originalQuestionId!==r.originalQuestionId))
  }catch(error){setMessage('Draft insertion blocked: '+(error.response?.data?.code||error.message))}
  finally{setBusy(false)}
 }

 return <details data-grade910-real-verified-paper-workspace style={{marginTop:10,padding:'10px 14px',border:'1px solid #40a8ce',borderRadius:10,background:'rgba(14,63,98,.9)',color:'#f4faff'}}>
  <summary style={{fontWeight:800,cursor:'pointer'}}>Insert academically verified Grade {grade} question directly into this paper</summary>
  <p style={{fontSize:12}}>Only independently reviewed, institutionally signed, non-revoked revisions published by the school server are eligible. Provisional drafts and local approval flags are excluded.</p>
  <p><a href="/academic/grade910-signoffs">Principal: upload your own adoption signature</a> · Teacher signatures remain pending; this does not authorize automatic academic publication. Institutional draft usage unblocked without falsifying academic approval.</p>
  <div style={{display:'flex',gap:10,alignItems:'end',flexWrap:'wrap'}}>
   <label style={{fontSize:12}}>Section (required for assigned teachers)<input style={{...ctrl,display:'block'}} value={section} maxLength={50} onChange={e=>setSection(e.target.value)} placeholder="e.g. Usman / Fatma"/></label>
   <button type="button" disabled={busy} onClick={search} style={{padding:'9px 15px',borderRadius:8,border:0,background:'#0487be',color:'#fff',cursor:'pointer'}}>{busy?'Checking…':'Load signed approved revisions'}</button>
   <button type="button" disabled={busy} onClick={searchDrafts} style={{padding:'9px 15px',borderRadius:8,border:0,background:'#0d9488',color:'#fff',cursor:'pointer'}}>{busy?'Checking…':'Load verified draft candidates (AI Advisory)'}</button>
  </div>
  {records.map(r=><div key={r.originalQuestionId+'_'+r.revision} style={{marginTop:10,padding:10,border:'1px solid #5989a8',borderRadius:8,background:r.tier==='institutional-draft'?'rgba(15,118,110,.25)':'transparent'}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
     <strong>{r.originalQuestionId} · revision {r.revision}</strong>
     {r.tier==='institutional-draft'?(
       <span style={{fontSize:10,fontWeight:700,background:'#d97706',color:'#fff',padding:'2px 8px',borderRadius:4}}>INSTITUTIONAL DRAFT · AI ADVISORY</span>
     ):(
       <span style={{fontSize:10,fontWeight:700,background:'#0284c7',color:'#fff',padding:'2px 8px',borderRadius:4}}>ACADEMICALLY VERIFIED</span>
     )}
   </div>
   <div style={{marginTop:6,fontSize:12}}>{r.paperPayload?.finalQuestion?.type || ''}: {String(r.paperPayload?.finalQuestion?.text || r.paperPayload?.finalQuestion?.stem || '').slice(0,140)}</div>
   <button type="button" disabled={busy} onClick={()=>r.tier==='institutional-draft'?addDraft(r):add(r)} style={{marginTop:8,padding:'6px 12px',borderRadius:6,border:0,background:r.tier==='institutional-draft'?'#f59e0b':'#38bdf8',color:'#0f172a',fontWeight:700,cursor:'pointer'}}>
     {r.tier==='institutional-draft'?'Add draft to paper (AI Advisory)':'Add verified revision to paper'}
   </button>
  </div>)}
  {message&&<p role="status" style={{fontSize:12,marginTop:10,color:'#fef08a'}}>{message}</p>}
 </details>
}

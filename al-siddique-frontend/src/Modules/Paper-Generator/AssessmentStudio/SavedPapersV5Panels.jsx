import {useEffect,useState} from 'react'
import api from '../../../services/api.js'
import {useAuth} from '../../../context/AuthContext.jsx'
import {normalizeAssessmentIndex,normalizeVaultIndex,createIndependentVaultDraft,vaultRecoveryExport} from './core/liveSavedPapersV5.mjs'

const C={surface:'rgba(11,44,77,.92)',border:'rgba(148,163,184,.18)',muted:'#8892A4',text:'#C0C8D8',gold:'#C8991A'}
const actionStyle={padding:'8px 12px',background:'rgba(200,153,26,.15)',color:'#e8b420',border:'1px solid rgba(200,153,26,.35)',borderRadius:8,cursor:'pointer',fontWeight:700}
const cardStyle={padding:16,background:C.surface,border:'1px solid '+C.border,borderRadius:14}
const message=error=>error?.response?.status===403 || error?.response?.status===401
  ? 'Your account is not authorized to access these server papers.'
  : error?.response?.data?.message || error?.message || 'Saved papers are temporarily unavailable.'

export default function SavedPapersV5Panels({localPapers=[],query='',onLoadPaper}){
 const {user}=useAuth()
 const identity=[user?.id,user?.school_id,user?.tenant_id].map(x=>String(x??'')).join(':')
 const [refresh,setRefresh]=useState(0)
 const [saved,setSaved]=useState({identity:'',assessment:[],vault:[],assessmentError:'',vaultError:''})
 const [working,setWorking]=useState('')
 const [actionError,setActionError]=useState('')
 useEffect(()=>{
   let active=true
   if(!user?.id)return()=>{active=false}
   Promise.allSettled([
     api.get('/api/assessment-studio/papers',{skipCache:true}),
     api.get('/api/portal/paper-studio/library',{skipCache:true})
   ]).then(([a,v])=>{
     if(!active)return
     let assessment=[],vault=[],assessmentError='',vaultError=''
     try{
       if(a.status!=='fulfilled')throw a.reason
       if(a.value.data?.success!==true)throw new Error('Invalid assessment list response.')
       assessment=normalizeAssessmentIndex(a.value.data.data,[])
     }catch(error){assessmentError=message(error)}
     try{
       if(v.status!=='fulfilled')throw v.reason
       if(v.value.data?.success!==true)throw new Error('Invalid Vault response.')
       vault=normalizeVaultIndex(v.value.data.data?.vault)
     }catch(error){vaultError=message(error)}
     setSaved({identity,assessment,vault,assessmentError,vaultError})
   })
   return()=>{active=false}
 },[identity,refresh,user?.id])
 const loading=saved.identity!==identity
 const localIds=new Set(localPapers.flatMap(p=>[p?.serverPaperId,p?.canonicalDocument?.id]).filter(Boolean).map(String))
 const q=String(query||'').trim().toLowerCase()
 const matches=(...text)=>!q || text.some(t=>String(t||'').toLowerCase().includes(q))
 const assessment=loading?[]:saved.assessment.filter(x=>!localIds.has(x.serverPaperId)&&matches(x.name,x.status,x.serverPaperId))
 const vault=loading?[]:saved.vault.filter(x=>matches(x.name,x.className,x.subjectName,x.section))
 const handleServer=async item=>{
   if(working||!item.revisionAvailable)return
   setActionError('');setWorking('server-'+item.serverPaperId)
   try{await onLoadPaper?.({...item,documentFormat:'official-v12',config:{examType:'Assessment'}},'build')}
   catch(error){setActionError(message(error))}
   finally{setWorking('')}
 }
 const fetchVault=async item=>{
   const response=await api.get('/api/portal/paper-studio/papers/'+encodeURIComponent(String(item.id)),{skipCache:true})
   return response.data
 }
 const handleVault=async item=>{
   if(working)return
   setActionError('');setWorking('vault-'+item.id)
   try{const response=await fetchVault(item);await onLoadPaper?.(createIndependentVaultDraft(response,item),'build')}
   catch(error){setActionError(message(error))}
   finally{setWorking('')}
 }
 const handleExport=async item=>{
   if(working)return
   setActionError('');setWorking('export-'+item.id)
   try{
     const response=await fetchVault(item)
     const blob=new Blob([vaultRecoveryExport(response,item)],{type:'application/json;charset=utf-8'})
     const url=URL.createObjectURL(blob)
     try{
       const a=document.createElement('a')
       a.href=url
       a.download='ASSPS_Vault_'+String(item.id).replace(/[^A-Za-z0-9_-]/g,'').slice(0,80)+'_Original_CONFIDENTIAL.json'
       document.body.appendChild(a);a.click();a.remove()
     }finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}
   }catch(error){setActionError(message(error))}
   finally{setWorking('')}
 }
 return <div data-saved-v5-source-recovered style={{marginBottom:18}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:12}}>
     <span data-v5-summary style={{fontSize:12,color:C.muted}}>{loading?'Checking server and Vault…':vault.length+' Vault paper(s) · '+assessment.filter(x=>x.revisionAvailable).length+' editable server assessment(s) · '+assessment.filter(x=>!x.revisionAvailable).length+' historical only'}</span>
     <button type="button" style={actionStyle} disabled={loading} onClick={()=>{
       setSaved(prev=>({...prev,identity:''}));setActionError('');setRefresh(n=>n+1)
     }}>Refresh Saved Sources</button>
   </div>
   {actionError&&<p role="alert" style={{color:'#ffcfbf',fontSize:12}}>{actionError}</p>}
   <section aria-label="Paper Vault · Server-Saved School Papers" style={{marginBottom:18}}>
     <h3 style={{fontSize:16,color:C.text,margin:'0 0 8px'}}>Paper Vault · Server-Saved School Papers</h3>
     <p style={{fontSize:12,color:C.muted}}>Source papers are read-only. New editable copies are independent unapproved drafts.</p>
     {!loading&&saved.vaultError&&<p role="alert" style={{color:'#ffcfbf',fontSize:12}}>{saved.vaultError}</p>}
     {!loading&&!saved.vaultError&&vault.length===0&&<p style={{fontSize:12,color:C.muted}}>No matching Vault papers.</p>}
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(275px,1fr))',gap:10}}>
       {vault.map(item=><div data-vault-row={item.id} key={item.id} style={cardStyle}>
         <div style={{fontWeight:700,color:C.text}}>{item.name}</div>
         <p style={{fontSize:12,color:C.muted}}>{item.className} · {item.section} · {item.subjectName} · {item.status} · Vault revision {item.revision}</p>
         <button type="button" disabled={!!working} style={actionStyle} onClick={()=>void handleVault(item)}>{working==='vault-'+item.id?'Verifying Vault…':'Create Editable Copy'}</button>
         <button type="button" disabled={!!working} style={{...actionStyle,marginLeft:8,background:'transparent',color:C.text}} onClick={()=>void handleExport(item)}>{working==='export-'+item.id?'Exporting Original…':'Export Original JSON'}</button>
       </div>)}
     </div>
   </section>
   <section aria-label="Server-Saved Assessments">
     <h3 style={{fontSize:16,color:C.text,margin:'0 0 8px'}}>Server-Saved Assessments · Reopen for Editing</h3>
     {!loading&&saved.assessmentError&&<p role="alert" style={{color:'#ffcfbf',fontSize:12}}>{saved.assessmentError}</p>}
     {!loading&&!saved.assessmentError&&assessment.length===0&&<p style={{fontSize:12,color:C.muted}}>No additional matching server assessments.</p>}
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(275px,1fr))',gap:10}}>
       {assessment.map(item=><div data-server-row={item.serverPaperId} key={item.serverPaperId} style={cardStyle}>
         <div style={{fontWeight:700,color:C.text}}>{item.name}</div>
         <p style={{fontSize:12,color:C.muted}}>Server revision {item.serverRevision} · {item.status} · Not a local backup</p>
         {!item.revisionAvailable&&<p style={{fontSize:12,color:'#ff8295'}}>Historical only — editable revision unavailable.</p>}
         <button type="button" disabled={!!working||!item.revisionAvailable} style={actionStyle} onClick={()=>void handleServer(item)}>{!item.revisionAvailable?'Revision unavailable':working==='server-'+item.serverPaperId?'Verifying server revision…':'Open & Edit'}</button>
       </div>)}
     </div>
   </section>
 </div>
}

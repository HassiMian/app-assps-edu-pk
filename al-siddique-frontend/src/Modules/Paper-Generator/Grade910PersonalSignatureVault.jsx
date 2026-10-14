import { useEffect, useRef, useState } from 'react'
import api from '../../services/api'

const LIMIT=120*1024
const style={background:'#143956',color:'#fff',borderRadius:12,padding:18,marginTop:18,border:'1px solid #7495b1'}
export function signaturePngBytes(data) {
 if (!(data instanceof Uint8Array) || data.length<45 || data.length>LIMIT) return null
 const signature=[137,80,78,71,13,10,26,10]
 if (!signature.every((v,i)=>data[i]===v)) return null
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength)
 if (view.getUint32(8)!==13 || String.fromCharCode(...data.slice(12,16))!=='IHDR')return null
 const width=view.getUint32(16),height=view.getUint32(20)
 if(!width||!height||width>4096||height>2048)return null
 if(![0,2,6].includes(data[25]))return null
 if(view.getUint32(data.length-12)!==0 ||
  String.fromCharCode(...data.slice(data.length-8,data.length-4))!=='IEND'||
  view.getUint32(data.length-4)!==0xae426082)return null
 return {width,height}
}
export default function Grade910PersonalSignatureVault({actorRole,onUseSignature}) {
 const inputVersion=useRef(0)
 const [selected,setSelected]=useState(null)
 const [preview,setPreview]=useState('')
 const [saved,setSaved]=useState([])
 const [message,setMessage]=useState('No personal signature uploaded during this session.')
 const [busy,setBusy]=useState(false)
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
 const onChoose=async(e)=>{
  const file=e.target.files?.[0];e.target.value=''
  const version=++inputVersion.current
  setSelected(null);setPreview('');setMessage('')
  if(!file)return
  if(file.size<45||file.size>LIMIT||file.type!=='image/png'){
   setMessage('Rejected: select your own PNG signature, maximum 120 KB.')
   return
  }
  try{
   const bytes=new Uint8Array(await file.arrayBuffer())
   if(version!==inputVersion.current)return
   const format=signaturePngBytes(bytes)
   if(!format){setMessage('Rejected: file content must be an actual PNG with valid dimensions.');return}
   setSelected(file);setPreview(URL.createObjectURL(file))
   setMessage('Local signature preview ready: '+format.width+' × '+format.height+' pixels. Nothing uploaded yet.')
  }catch{if(version===inputVersion.current)setMessage('Cannot read this signature file.')}
 }
 const upload=async()=>{
  if(!selected||busy)return
  setBusy(true)
  try{
   const r=await api.post('/api/grade910-signoffs/personal-signatures',selected,
    {headers:{'Content-Type':'image/png'}})
   const result=r?.data?.data
   if(!r?.data?.success||!result?.id||result?.storedEncrypted!==true||
    result?.uploadedAsRole!==actorRole)throw Error('NO_VALID_PERSONAL_RECEIPT')
   setSelected(null);setPreview('')
   setMessage('Encrypted personal signature saved. Receipt #'+result.id+
    '. Stored under your own '+actorRole+' role, NOT as an independent review or publication approval.')
  }catch{
   setMessage('Upload was not certified. No valid server receipt; check authenticated school role and signed Core status.')
  }finally{setBusy(false)}
 }
 const load=async()=>{
  try{
   const r=await api.get('/api/grade910-signoffs/personal-signatures')
   if(!r?.data?.success||!Array.isArray(r.data.records))throw Error('NO_SIGNATURE_LIST')
   setSaved(r.data.records)
   setMessage('Personal encrypted signature receipts: '+r.data.records.length)
  }catch{setSaved([]);setMessage('Your private signature vault is unavailable or unconfigured.')}
 }
 const useOwn=async(id)=>{
  try{
   const r=await api.get('/api/grade910-signoffs/personal-signatures/'+encodeURIComponent(id)+'/preview',{responseType:'arraybuffer'})
   const bytes=new Uint8Array(r.data)
   if(!signaturePngBytes(bytes)||!onUseSignature)throw Error('NO_PRIVATE_SIGNATURE_BYTES')
   const blob=new Blob([bytes],{type:'image/png'})
   const reader=new FileReader()
   reader.onload=()=>{
    const value=String(reader.result||'')
    if(!value.startsWith('data:image/png;base64,')){setMessage('Signature was not a usable PNG.');return}
    onUseSignature(value)
    setMessage('Your saved personal signature is selected for this specific PENDING claim. Confirm the review declaration separately.')
   }
   reader.onerror=()=>setMessage('Unable to read your stored personal signature safely.')
   reader.readAsDataURL(blob)
  }catch{setMessage('Unable to use saved signature: authenticated download denied or invalid.')}
 }
 const openOwn=async(id)=>{
  try{
   const r=await api.get('/api/grade910-signoffs/personal-signatures/'+encodeURIComponent(id)+'/preview',{responseType:'arraybuffer'})
   const bytes=new Uint8Array(r.data)
   if(!signaturePngBytes(bytes))throw Error('INVALID_VAULT_BYTES')
   const blob=new Blob([bytes],{type:'image/png'})
   const url=URL.createObjectURL(blob)
   try{
    const a=document.createElement('a')
    a.href=url;a.download='ASSPS-personal-signature-'+id+'.png';a.click()
    setMessage('Your authenticated private signature #'+id+' was downloaded. This does not approve any question.')
   }finally{URL.revokeObjectURL(url)}
  }catch{setMessage('Private signature download denied or failed. No file exposed.')}
 }
 return <section style={style} aria-label="Personal school signature vault">
  <h2 style={{fontSize:18,marginTop:0}}>Personal Signature Vault — Upload Your Own Signature</h2>
  <p>A genuine Principal can upload a personal PNG while signed into their Principal account.
    A school administrator may store a signature only as themselves, never impersonate the Principal.
    Uploading alone does not approve academic questions or issue signed papers.</p>
  <label>Choose your own PNG signature (up to 120 KB)
   <input type="file" accept="image/png,.png" onChange={onChoose} style={{display:'block',marginTop:6}}/>
  </label>
  {preview&&<div style={{padding:10,background:'#fff',borderRadius:8,marginTop:12}}>
   <img src={preview} alt="Selected personal signature — private preview, not submitted" style={{maxWidth:'100%',maxHeight:150}}/>
  </div>}
  <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}>
   <button type="button" onClick={upload} disabled={!selected||busy}>{busy?'Encrypting…':'Save My Signature Privately'}</button>
   <button type="button" onClick={load}>View My Saved Signature Receipts</button>
  </div>
  {message&&<p role="status">{message}</p>}
  {saved.map(item=><div key={item.id} style={{borderTop:'1px solid #638ba5',padding:9}}>
   Receipt #{item.id} · Role: {item.uploadedAsRole} · SHA-256: {item.sha256?.slice(0,12)}… · Personal asset only
   <button type="button" onClick={()=>useOwn(item.id)} style={{marginLeft:10}}>Use for this pending claim</button>
   <button type="button" onClick={()=>openOwn(item.id)} style={{marginLeft:10}}>Download my file</button>
  </div>)}
 </section>
}

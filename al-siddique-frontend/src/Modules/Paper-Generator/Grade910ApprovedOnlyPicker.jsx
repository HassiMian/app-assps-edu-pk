import { useCallback, useState } from 'react'
import api from '../../services/api'
const styles={input:{padding:'10px 12px',width:'100%',borderRadius:8,border:'1px solid #a3bbc9',color:'#123b60'},card:{border:'1px solid #5e8aaa',padding:18,borderRadius:14,background:'#102f50',color:'#fff',marginTop:14}}
const safeFilename=x=>String(x).replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,60)
export default function Grade910ApprovedOnlyPicker(){
 const [grade,setGrade]=useState('9'),[subject,setSubject]=useState('Biology')
 const [section,setSection]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('')
 const [rows,setRows]=useState([]),[selected,setSelected]=useState({})
 const [searched,setSearched]=useState(false),[exactError,setExactError]=useState('')
 const scope={grade:Number(grade),subject:subject.trim(),section:section.trim()}
 const load=useCallback(async()=>{
  setLoading(true);setError('');setRows([]);setSelected({});setSearched(false)
  try{
   if(!subject.trim())throw Error('Subject is required.')
   const res=await api.get('/api/grade910-verified-picker/approved-only',{params:scope,headers:{'Cache-Control':'no-store'}})
   if(!res?.data?.success||res.data.academicallyApprovedOnly!==true||
      res.data.source!=='server-signed-restricted-verified-publications'||!Array.isArray(res.data.records))
     throw Error('Server verification could not be confirmed.')
   const verified=res.data.records.filter(q=>q.academicallyVerified===true&&
    q.paperStudioSelectable===true&&Number(q.grade)===Number(grade)&&
    q.subject?.toLowerCase()===subject.trim().toLowerCase()&&
    /^[0-9a-f]{64}$/.test(q.questionSha||'')&&/^[0-9a-f]{64}$/.test(q.answerSha||'')&&
    /^[0-9a-f]{64}$/.test(q.publicationGrantSha||''))
   if(verified.length!==res.data.records.length)throw Error('Unexpected unverified question in server response.')
   setRows(verified);setSearched(true)
  }catch(e){setError('Approved-only selection unavailable. '+(e?.response?.data?.code||e.message||'Certified server unavailable'))}
  finally{setLoading(false)}
 },[grade,subject,section])
 async function exportVerifiedManifest(){
  setExactError('')
  const wants=rows.filter(r=>selected[r.originalQuestionId+':'+r.revision])
  if(!wants.length)return
  setLoading(true)
  try{
   const checked=[]
   for(const r of wants){
    const response=await api.get('/api/grade910-verified-picker/resolve-revision',{params:{...scope,
      originalQuestionId:r.originalQuestionId,revision:r.revision,questionSha:r.questionSha},
      headers:{'Cache-Control':'no-store'}})
    const result=response.data
    if(!result?.success||result.source!=='server-signed-restricted-verified-publications'||
       result.records?.length!==1||result.records[0].publicationGrantSha!==r.publicationGrantSha||
       result.records[0].answerSha!==r.answerSha)
      throw Error('Revision '+r.originalQuestionId+' failed server re-verification.')
    checked.push({id:r.originalQuestionId,revision:r.revision,
      questionSha:r.questionSha,answerSha:r.answerSha,
      publicationGrantSha:r.publicationGrantSha,sourceCatalogId:r.sourceCatalogId})
   }
   const manifest={schemaVersion:'assps-grade910-paper-studio-approved-only-manifest-v1',
    grade:Number(grade),subject:subject.trim(),section:section.trim(),verifiedAt:new Date().toISOString(),
    note:'This is a revision selection manifest. Revalidate with the server before Paper Studio publication/printing.',
    selected:checked}
   const blob=new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'})
   const url=URL.createObjectURL(blob),a=document.createElement('a')
   a.href=url;a.download='ASSPS_IX_X_verified_paper_selection_'+safeFilename(subject)+'.json'
   a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)
  }catch(e){setExactError('Manifest blocked: '+(e?.response?.data?.code||e.message))}
  finally{setLoading(false)}
 }
 return <main style={{maxWidth:1120,margin:'auto',padding:24,color:'#163f62'}}>
  <h1>Grade IX–X · Academically Verified Questions</h1>
  <p>Approved-only Paper Studio selection. This screen reads the <strong>authenticated, tenant-scoped publication ledger</strong>, not local browser drafts or client-supplied approved labels. Questions must have source/answer revisions, genuine independent reviews, school adoption and an authorized publication grant.</p>
  <section style={styles.card}>
   <h2 style={{marginTop:0,fontSize:18}}>Verified-paper question selector</h2>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
    <label>Grade<select style={styles.input} value={grade} onChange={e=>setGrade(e.target.value)}>
      <option value="9">IX</option><option value="10">X</option></select></label>
    <label>Subject<input style={styles.input} value={subject} onChange={e=>setSubject(e.target.value)}/></label>
    <label>Section (teacher access requires exact assignment)<input style={styles.input} value={section} onChange={e=>setSection(e.target.value)}/></label>
   </div>
   <button type="button" disabled={loading} onClick={load} style={{marginTop:16,padding:12,borderRadius:8,background:'#1585c7',color:'#fff',border:0}}>{loading?'Checking…':'Load approved-only questions'}</button>
   {error&&<p role="alert" style={{color:'#ffe2a8'}}>{error}</p>}
   {searched&&rows.length===0&&<p>No certified questions available for this school, grade, subject and assigned section. Unreviewed questions are deliberately hidden.</p>}
  </section>
  {rows.map(q=><section key={q.originalQuestionId+':'+q.revision} style={styles.card}>
    <label style={{display:'flex',gap:10,alignItems:'start'}}>
      <input type="checkbox" checked={Boolean(selected[q.originalQuestionId+':'+q.revision])} onChange={e=>setSelected(v=>({...v,[q.originalQuestionId+':'+q.revision]:e.target.checked}))}/>
      <span><strong>{q.originalQuestionId} · Revision {q.revision}</strong> — {q.medium}</span>
    </label>
    <p>{String(q.paperPayload?.finalQuestion?.text||q.paperPayload?.finalQuestion?.stem||'Verified source revision (see approved payload)').slice(0,650)}</p>
    <small>Verified publication grant: {q.publicationGrantSha?.slice(0,16)}…</small>
  </section>)}
  {rows.length>0&&<section style={styles.card}>
   <button disabled={loading||!Object.values(selected).some(Boolean)} type="button" onClick={exportVerifiedManifest}>Re-verify and export selected revisions</button>
   {exactError&&<p role="alert">{exactError}</p>}
   <p>This exports a revision-bound manifest for Paper Studio integration. It does not automatically create or publish an examination paper. Re-verification at paper save/print remains a separate requirement.</p>
  </section>}
 </main>
}

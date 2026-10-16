import {useEffect,useState} from 'react'
import api from '../../services/api'
export default function StudentClassInchargePanel({userId}){
 const [snapshot,setSnapshot]=useState(null)
 const [error,setError]=useState('')
 useEffect(()=>{
  let active=true
  api.get('/api/teacher-subjects/class-incharge/my-class')
   .then(({data})=>{if(active&&data?.success){setSnapshot(data.data);setError('')}})
   .catch((e)=>{if(active)setError(
    e.response?.status===404?'Student identity is not yet verified for class in-charge display.':
    'Official class in-charge information is temporarily unavailable.'
   )})
  return()=>{active=false}
 },[userId])
 return <section aria-label="Class in-charge" style={{
  border:'1px solid var(--apex-border-default)',borderRadius:16,padding:'16px 21px',
  background:'var(--apex-bg-surface-solid)',color:'var(--apex-text-primary)'
 }}>
  <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,color:'var(--apex-text-tertiary)'}}>MY CLASS · OFFICIAL SCHOOL RECORD</div>
  {error?<p style={{margin:'7px 0 0',fontSize:13,color:'var(--apex-text-secondary)'}} role="status">{error}</p>:
  !snapshot?<p style={{fontSize:13}} role="status">Loading official class teacher details…</p>:
  snapshot.classIncharges?.length?<>
   <h2 style={{fontSize:19,margin:'7px 0'}}>Class In-charge</h2>
   <p style={{fontSize:12,margin:'4px 0 11px',color:'var(--apex-text-secondary)'}}>{snapshot.className} · {snapshot.section}</p>
   {snapshot.classIncharges.map((p,i)=><div key={i} style={{marginTop:6,fontSize:14,fontWeight:650}}>
    {p.teacher_name} <span style={{fontSize:11,fontWeight:450}}>({p.assignment_role})</span>
   </div>)}
  </>:<p style={{fontSize:13,margin:'9px 0 0'}} role="status">Class in-charge: awaiting official school confirmation.</p>}
 </section>
}

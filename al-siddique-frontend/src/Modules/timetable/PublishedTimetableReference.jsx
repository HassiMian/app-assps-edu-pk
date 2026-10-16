import {useEffect,useMemo,useState} from 'react'
import api from '../../services/api'

const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const clock=x=>{
 if(!x)return '—'
 const [h,m]=x.split(':').map(Number)
 return (h%12||12)+':'+String(m).padStart(2,'0')+(h>=12?' PM':' AM')
}
export default function PublishedTimetableReference(){
 const [model,setModel]=useState(null)
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(true)
 const [group,setGroup]=useState('Four|Blue')
 const [day,setDay]=useState('Monday')
 const groups=useMemo(()=>{
  const values=new Map()
  for(const row of model?.data||[]){
   if(row.class_name==='School-wide')continue
   const key=row.class_name+'|'+(row.section||'')
   values.set(key,{key,label:row.class_name+(row.section?' · '+row.section:'')})
  }
  return [...values.values()]
 },[model])
 useEffect(()=>{
  let mounted=true
  api.get('/api/timetable/reference').then(r=>{
   if(!mounted)return
   const data=r.data
   if(!data?.success || !data?.approvedBellTimings?.regular || !Array.isArray(data?.data)){
    throw Error('Verified source or official bell timings unavailable')
   }
   setModel(data)
  }).catch(e=>{if(mounted)setError(e?.response?.data?.code||e.message||'Timetable unavailable')})
    .finally(()=>{if(mounted)setLoading(false)})
  return ()=>{mounted=false}
 },[])
 const selectedGroup=groups.some(x=>x.key===group)?group:groups[0]?.key
 const [cls,section]=String(selectedGroup||'').split('|')
 const allocations=new Map((model?.data||[]).filter(x=>
  x.class_name===cls&&(x.section||'')===(section||'')).map(x=>[x.period_label,x]))
 const timingKey=day==='Friday'?'friday':'regular'
 const bells=model?.approvedBellTimings?.[timingKey]||[]
 return <section aria-label="Verified institutional timetable" style={{background:'#fff',border:'2px solid #bbd6cb',borderRadius:16,padding:20,color:'#233d36',boxShadow:'0 4px 22px rgba(31,69,55,.07)'}}>
  <header style={{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'space-between',alignItems:'center'}}>
   <div><div style={{fontSize:11,fontWeight:800,letterSpacing:'0.14em',color:'#347968'}}>VERIFIED SCHOOL SCHEDULE</div>
    <h2 style={{fontSize:21,margin:'5px 0',color:'#263d35'}}>Published class timetable & teachers</h2>
    <p style={{fontSize:12,margin:0,color:'#526c60'}}>Read-only database reference with principal-approved regular and Friday bell times. Draft editor below does not publish changes.</p>
   </div>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    <label style={{fontSize:12}}>Class <select value={selectedGroup||''} onChange={e=>setGroup(e.target.value)} style={{padding:8,border:'1px solid #a6c4b8',borderRadius:8,background:'#f7fcf9',marginLeft:5}}>
     {groups.map(g=><option key={g.key} value={g.key}>{g.label}</option>)}
    </select></label>
    <label style={{fontSize:12}}>Day <select value={day} onChange={e=>setDay(e.target.value)} style={{padding:8,border:'1px solid #a6c4b8',borderRadius:8,background:'#f7fcf9',marginLeft:5}}>
     {DAYS.map(d=><option key={d}>{d}</option>)}
    </select></label>
   </div>
  </header>
  {loading?<p role="status">Loading approved timetable…</p>:
   error?<p role="alert" style={{color:'#8a3a2d',background:'#fff4f0',padding:12}}>Timetable not verified: {error}. The displayed draft below is not authoritative.</p>:
   <div style={{overflowX:'auto',marginTop:14}}>
    <table style={{borderCollapse:'collapse',width:'100%',minWidth:520,fontSize:13,background:'#fff',color:'#223d33'}}>
     <thead><tr style={{background:'#e6f3f8'}}>
      {['Period','Official time','Subject','Teacher'].map(x=><th key={x} style={{border:'1px solid #a9c7c6',padding:'10px 9px',textAlign:'left'}}>{x}</th>)}
     </tr></thead><tbody>{bells.map(p=>{
      const a=allocations.get(p.label)
      return <tr key={p.label} style={{background:p.kind==='break'?'#fff5e6':p.kind==='assembly'?'#f2effa':'#fff'}}>
       <th style={{border:'1px solid #bfcec7',padding:'9px',textAlign:'left'}}>{p.label}</th>
       <td style={{border:'1px solid #bfcec7',padding:'9px',whiteSpace:'nowrap'}}>{clock(p.start)} – {clock(p.end)}</td>
       <td style={{border:'1px solid #bfcec7',padding:'9px',fontWeight:600}}>{p.kind!=='teaching'?'—':a?.subject||'Not verified'}</td>
       <td style={{border:'1px solid #bfcec7',padding:'9px'}}>{p.kind!=='teaching'?'—':a?.teacher_display_name||'Not verified'}</td>
      </tr>})}</tbody>
    </table>
    <p style={{fontSize:11,color:'#516a60',margin:'11px 2px 0'}}>Version: {model.approvedTimingVersion} · Staff portal login mappings still require independent identity verification. Class Eight and junior subject schedules are not present in this imported reference.</p>
   </div>}
 </section>
}

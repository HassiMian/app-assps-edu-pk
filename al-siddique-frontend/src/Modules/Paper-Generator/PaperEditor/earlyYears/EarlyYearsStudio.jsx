import { lazy, Suspense, useState } from 'react';
const EarlyYearsWorksheetEditor = lazy(()=>import('./EarlyYearsWorksheetEditor.jsx'))
const EarlyYearsActivityBuilder = lazy(()=>import('./EarlyYearsActivityBuilder.jsx'))
export default function EarlyYearsStudio({initialPaperId,onReturnToSource}) {
 const [mode,setMode]=useState('references')
 const tab=(name,label)=><button type="button" data-pre-class-mode={name} onClick={()=>setMode(name)}
  style={{padding:'9px 15px',border:'1px solid #47627e',borderRadius:8,cursor:'pointer',
   background:mode===name?'#c8991a':'#19334f',color:mode===name?'#071e34':'#e2e8f0',fontWeight:800,fontSize:12}}>{label}</button>
 return <div data-early-years-studio style={{display:'flex',flexDirection:'column',height:'100%',flex:'1 1 auto',minHeight:0,overflow:'hidden',background:'#081b30'}}>
  <nav className="no-print" style={{display:'flex',gap:9,padding:'8px 14px',background:'#0d2845',borderBottom:'1px solid #38516e'}}>
   {tab('references','Reference Papers (Original 9)')}
   {tab('mine','Create New / My Pre-Class Papers')}
  </nav>
  <Suspense fallback={<div style={{padding:20,color:'#e2e8f0'}}>Loading Pre-Class studio…</div>}>
   {mode==='references'?<EarlyYearsWorksheetEditor initialPaperId={initialPaperId} onReturnToSource={onReturnToSource}/>:<EarlyYearsActivityBuilder/>}
  </Suspense>
 </div>
}

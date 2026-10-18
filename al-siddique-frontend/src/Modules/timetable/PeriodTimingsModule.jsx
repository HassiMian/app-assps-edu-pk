import { Link } from 'react-router-dom'
import BellSchedulePanel from '../../components/BellSchedulePanel'
export default function PeriodTimingsModule(){
 return <main style={{minHeight:'100vh',background:'linear-gradient(145deg,#071725,#132d42)',padding:'clamp(20px,4vw,44px)',color:'#effaff'}}>
  <div style={{maxWidth:1050,margin:'auto'}}>
   <div style={{fontSize:11,letterSpacing:3,color:'#67d6db',fontWeight:800}}>SCHOOL OPERATIONS / ACADEMIC HOURS</div>
   <h1 style={{fontSize:36,margin:'9px 0 8px'}}>Period Timings</h1>
   <p style={{color:'#a4bbc9',lineHeight:1.6,maxWidth:750}}>This is the school bell schedule: assembly, duration of each period, and Friday hours. Teacher/subject allocations are maintained independently in Academic Timetable.</p>
   <div style={{display:'flex',flexWrap:'wrap',gap:13,margin:'24px 0'}}>
    <Link style={{color:'#fff',padding:'10px 15px',border:'1px solid #48a0aa',borderRadius:10,textDecoration:'none'}} to="/timetable">Academic Timetable</Link>
    <Link style={{color:'#092133',background:'#bcebe9',padding:'10px 15px',borderRadius:10,fontWeight:700,textDecoration:'none'}} to="/school-documents">Create Official Notice / Print</Link>
   </div>
   <BellSchedulePanel/>
  </div>
 </main>
}

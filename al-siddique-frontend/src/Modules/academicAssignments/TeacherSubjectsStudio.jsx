import {useEffect,useMemo,useState} from 'react'
import api from '../../services/api'
import {useTenantBranding} from '../../context/TenantBrandingContext'
import './teacherSubjectsStudio.css'

const s=(v)=>String(v??'').trim()
const titleCase=(x)=>s(x).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const DEFAULT_SESSION='2026–27'

export default function TeacherSubjectsStudio(){
 const brand=useTenantBranding()
 const [staff,setStaff]=useState([])
 const [catalog,setCatalog]=useState([])
 const [profiles,setProfiles]=useState([])
 const [incharges,setIncharges]=useState([])
 const [classes,setClasses]=useState([])
 const [refSlots,setRefSlots]=useState([])
 const [authorized,setAuthorized]=useState([])
 const [selectedStaff,setSelectedStaff]=useState('')
 const [subjectId,setSubjectId]=useState('')
 const [newSubject,setNewSubject]=useState('')
 const [session,setSession]=useState(DEFAULT_SESSION)
 const [evidence,setEvidence]=useState('')
 const [selectedClass,setSelectedClass]=useState('')
 const [role,setRole]=useState('primary')
 const [mode,setMode]=useState('subjects')
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [search,setSearch]=useState('')
 const chosen=staff.find(x=>String(x.id)===selectedStaff)
 const currentProfiles=profiles.filter(x=>String(x.employee_id)===selectedStaff)
 const relevantSlots=refSlots.filter(x=>x.teacher_display_name?.toLowerCase().includes(s(chosen?.name).split(' ').at(-1)?.toLowerCase()||'~NO_MATCH'))
 const options=useMemo(()=>staff.filter(x=>x?.is_active!==false&&Number(x.user_id)>0).sort((a,b)=>String(a.name).localeCompare(String(b.name))),[staff])
 async function load(){
  setLoading(true)
  try{
   const [e,c,p,i,cl,t,a]=await Promise.all([
    api.get('/api/employees'),
    api.get('/api/teacher-subjects/catalog'),
    api.get('/api/teacher-subjects/profiles'),
    api.get('/api/teacher-subjects/incharges'),
    api.get('/api/teacher-subjects/class-sections'),
    api.get('/api/teacher-subjects/timetable-reference'),
    api.get('/api/teacher-subjects/authorized-assignments'),
   ])
   setStaff(e.data?.data||[]);setCatalog(c.data?.data||[]);setProfiles(p.data?.data||[])
   setIncharges(i.data?.data||[]);setClasses(cl.data?.data||[]);setRefSlots(t.data?.data||[]);setAuthorized(a.data?.data||[])
   setError('')
  }catch(err){
   setError(err.response?.data?.code||'The official teacher subject module is not yet available. No assignments have been changed.')
  }finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])
 async function command(run){
  setBusy(true);setError('');setNotice('')
  try{const msg=await run();setNotice(msg);await load()}
  catch(err){setError(err.response?.data?.errors?.join(' · ')||err.response?.data?.code||err.message||'Operation was rejected.')}
  finally{setBusy(false)}
 }
 const selectedOption=classes.find(x=>[x.class_name,x.section].join('||')===selectedClass)
 const selectedName=chosen?.name||'Select a verified employee'
 return <main className="tsa-page">
  <div className="tsa-head"><div><div className="tsa-overline">ACADEMIC GOVERNANCE / ASSPS</div><h1>Teacher Subjects <em>&</em> Class In-charge</h1>
   <p>One teacher, multiple subjects. Separate class-wise authorizations and verified student-visible in-charge records.</p>
  </div>{brand.logoUrl&&<img src={brand.logoUrl} alt="Current school logo"/>}</div>
  <div className="tsa-metrics">
   <div><strong>{options.length}</strong><span>Active linked staff candidates</span></div>
   <div><strong>{profiles.filter(x=>x.status==='approved').length}</strong><span>Approved profile subject tags</span></div>
   <div><strong>{authorized.length}</strong><span>Official class-subject grants</span></div>
   <div><strong>{incharges.filter(x=>x.status==='approved').length}</strong><span>Approved in-charge records</span></div>
  </div>
  <div className="tsa-tabbar"><button onClick={()=>setMode('subjects')} className={mode==='subjects'?'selected':''}>Multi-Subject Profiles</button><button onClick={()=>setMode('incharge')} className={mode==='incharge'?'selected':''}>Class In-charge</button><button onClick={()=>setMode('reference')} className={mode==='reference'?'selected':''}>Saved Timetable Reference</button></div>
  {error&&<div className="tsa-error" role="alert">{error}</div>}
  {notice&&<div className="tsa-success" role="status">{notice}</div>}
  <div className="tsa-work">
   {mode==='reference'?<section className="tsa-panel"><h2>Reference Timetable</h2><p>Observed assignments are not subject permissions. Teacher labels require identity reconciliation before official grants.</p>
    <input placeholder="Find teacher / subject / class" value={search} onChange={e=>setSearch(e.target.value)}/>
    <div className="tsa-table-wrap"><table><thead><tr><th>Class</th><th>Section</th><th>Period</th><th>Subject</th><th>Printed teacher label</th><th>State</th></tr></thead><tbody>
    {refSlots.filter(x=>JSON.stringify(x).toLowerCase().includes(search.toLowerCase())).map((x,i)=><tr key={i}><td>{x.class_name}</td><td>{x.section||'—'}</td><td>{x.period_label}</td><td>{x.subject}</td><td>{x.teacher_display_name}</td><td><span className="tsa-pill tsa-muted">Reference only</span></td></tr>)}
    </tbody></table></div>
   </section>:<div className="tsa-columns">
    <section className="tsa-panel">
     <h2>{mode==='subjects'?'Assign profile subjects':'Propose class in-charge'}</h2>
     <p>{mode==='subjects'?'Islamiyat and Nazra are distinct canonical subjects. A teacher may have both. This does not grant marks-entry access.':'An approved in-charge is displayed in the matching student’s app. It is not inferred from teaching-period counts.'}</p>
     <label>Verified employee account<select value={selectedStaff} onChange={e=>setSelectedStaff(e.target.value)}><option value="">Select staff member…</option>{options.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
     <div className="tsa-name">{selectedName}<small>Active teacher account must be linked before any proposal</small></div>
     {mode==='subjects'?<>
      <label>Subject<select value={subjectId} onChange={e=>setSubjectId(e.target.value)}><option value="">Choose canonical subject…</option>{catalog.map(x=><option key={x.id} value={x.id}>{x.name_en}{x.name_ur?' / '+x.name_ur:''}</option>)}</select></label>
      <label>Add a school subject to catalog<input value={newSubject} onChange={e=>setNewSubject(e.target.value)} placeholder="e.g. Nazra, Islamiyat, Computer Science"/></label>
      <button disabled={busy||!newSubject.trim()} onClick={()=>command(async()=>{
       const name=newSubject.trim();const key=name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')
       await api.post('/api/teacher-subjects/catalog',{key,name});setNewSubject('')
       return 'School subject added to catalog; no teacher access was granted.'
      })}>Create subject in catalog</button>
     </>:<><label>Official class & section<select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}><option value="">Select class…</option>{classes.map((x,i)=><option key={i} value={[x.class_name,x.section].join('||')}>{x.class_name} · {x.section} ({x.student_count} learners)</option>)}</select></label>
       <label>Class responsibility<select value={role} onChange={e=>setRole(e.target.value)}><option value="primary">Primary In-charge</option><option value="assistant">Assistant In-charge</option></select></label>
     </>}
     <label>Academic session<input value={session} onChange={e=>setSession(e.target.value)} placeholder="2026–27"/></label>
     <label>Official source reference<textarea rows={3} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="Reference to principal-approved roster / documented staff duty allocation (12+ characters)"/></label>
     <button className="tsa-primary" disabled={busy||!selectedStaff||evidence.trim().length<12||(mode==='subjects'?!subjectId:!selectedOption)} onClick={()=>command(async()=>{
      if(mode==='subjects')await api.post('/api/teacher-subjects/proposals',{employeeId:Number(selectedStaff),subjectId:Number(subjectId),academicSession:session,evidenceReference:evidence})
      else await api.post('/api/teacher-subjects/incharges/proposals',{employeeId:Number(selectedStaff),className:selectedOption.class_name,section:selectedOption.section,assignmentRole:role,academicSession:session,evidenceReference:evidence})
      return 'Proposal recorded. Approval is still required; no teaching permission was granted.'
     })}>Save Proposed {mode==='subjects'?'Subject':'In-charge'}</button>
    </section>
    <section className="tsa-panel">
     <div className="tsa-panel-top"><h2>{mode==='subjects'?'Teacher Subject Profile':'In-charge Registry'}</h2><button onClick={load}>Refresh</button></div>
     {mode==='subjects'?<><p>Teacher profile subjects appear as independent tags. Proposed subjects are not published to teaching-access controls.</p>
       {!currentProfiles.length&&<div className="tsa-empty">No subject profile tags saved for this employee.</div>}
       <div className="tsa-chips">{currentProfiles.map(p=><div className="tsa-chip" key={p.id}><div><strong>{p.name_en}</strong><small>{p.status} • {p.academic_session}</small></div>{p.status==='proposed'&&<button disabled={busy} onClick={()=>command(async()=>{await api.post('/api/teacher-subjects/proposals/'+p.id+'/approve',{version:p.version,reviewDeclaration:'I_VERIFIED_TEACHER_SUBJECT_PROFILE'});return 'Profile subject approved. It does not grant class/paper/marks permissions.'})}>Approve profile</button>}</div>)}</div>
      <div className="tsa-note">Existing employee single-value subject field remains untouched for backwards compatibility. Authorized class subjects: {authorized.filter(x=>String(x.employee_id)===selectedStaff).length}</div>
     </>:<><p>Only approved active entries become student-visible. Proposed entries never appear as confirmed.</p>
      {!incharges.length&&<div className="tsa-empty">No class in-charge entries published.</div>}
      <div className="tsa-chips">{incharges.map(x=><div className="tsa-chip" key={x.id}><div><strong>{x.class_name} / {x.section} — {x.teacher_name}</strong><small>{titleCase(x.assignment_role)} · {x.status} · {x.academic_session}</small></div>{x.status==='proposed'&&<button disabled={busy} onClick={()=>command(async()=>{await api.post('/api/teacher-subjects/incharges/'+x.id+'/approve',{version:x.version,reviewDeclaration:'I_VERIFIED_EXACT_CLASS_INCHARGE'});return 'Approved class in-charge; matching verified student logins may now see the assignment.'})}>Approve</button>}</div>)}</div>
     </>}
    </section>
   </div>}
  </div>
  <footer className="tsa-footer">{loading?'Refreshing authorized school data…':'Teacher profile tags ≠ official teaching grants ≠ class in-charge. Missing authorizations are never fabricated.'}</footer>
 </main>
}

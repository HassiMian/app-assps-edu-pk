import { useEffect, useMemo, useState } from 'react'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import './schoolDocumentStudio.css'

const FORMATS=[
 {key:'notice',label:'General Notice',subtitle:'School announcements',title:'Important School Notice',body:'This is to inform all concerned that '},
 {key:'circular',label:'Parent Circular',subtitle:'Announcements for guardians',title:'Circular for Parents',body:'Dear Parents / Guardians,\nWe would like to inform you that '},
 {key:'office_order',label:'Office Order',subtitle:'Formal management directions',title:'Office Order',body:'All concerned staff members are directed to '},
 {key:'memo',label:'Staff Memorandum',subtitle:'Internal instructions',title:'Staff Memorandum',body:'All teaching and administrative staff are informed that '},
 {key:'general_datesheet',label:'General Date Sheet',subtitle:'No student names or IDs',title:'Examination Date Sheet',body:'The following general examination schedule is issued for the selected class.'},
 {key:'academic_timetable',label:'Academic Timetable',subtitle:'Class • subject • teacher',title:'Class Academic Timetable',body:'Please follow the approved class timetable below.'},
 {key:'bell_schedule',label:'Period Timings',subtitle:'Assembly • periods • Friday',title:'Revised School Period Timings',body:'The following school-wide bell timings will be observed.'},
 {key:'consent',label:'Consent Circular',subtitle:'Parent action/permission',title:'Parent Consent Notice',body:'Dear Parents,\nPlease review the following information and provide consent through the approved school process.'},
 {key:'staff_acknowledgement',label:'Staff Acknowledgement',subtitle:'Signature collection form',title:'Staff Instruction & Acknowledgement',body:'All concerned teachers are requested to review these instructions and acknowledge receipt.'},
 {key:'custom',label:'Custom Document',subtitle:'Write your own document',title:'School Communication',body:''}
]
const PRESETS=[
 ['holiday','Holiday / Closure','notice','School Holiday Notice','The school will remain closed on [date/day] on account of [reason]. Classes will resume on [reopening date] according to the regular schedule.','parents'],
 ['hours','Revised School Hours','circular','Revised School Timings','Dear Parents / Guardians,\nPlease note that revised school timings will take effect from [date]. Regular days and Friday timings will follow the officially approved Period Timings schedule.','parents'],
 ['exams','Examination Guidance','circular','First Term Examination Guidelines','Dear Parents / Guardians,\nPlease ensure students arrive on time, bring their required stationery and follow the examination timetable issued by the school.','parents'],
 ['ptm','Parent–Teacher Meeting','circular','Parent–Teacher Meeting','Dear Parents / Guardians,\nYou are invited to attend the Parent–Teacher Meeting on [date], from [start time] to [end time], at the school campus. Your participation is important for discussing student learning.','parents'],
 ['fees','Fee Due Date','notice','Monthly Fee Submission Reminder','Dear Parents / Guardians,\nPlease submit the school fee for [month] by [due date] using the official school payment process. Contact the school office for assistance with your account.','parents'],
 ['admissions','Admissions Open','notice','New Admissions Announcement','Admissions for [academic session] are now open for eligible classes. Parents may contact the school office for admission requirements, available places and official documentation.','school'],
 ['attendance','Attendance & Punctuality','circular','Student Attendance and Punctuality','Dear Parents / Guardians,\nRegular attendance and timely arrival support academic progress. Kindly ensure students report to school before assembly and inform the office of any approved absence.','parents'],
 ['uniform','Uniform / School Dress','circular','School Uniform Guidelines','Dear Parents / Guardians,\nPlease ensure that students attend school in the prescribed neat school uniform. For uniform queries, kindly contact the school office.','parents'],
 ['health','Health Advisory','notice','Student Health Advisory','Dear Parents / Guardians,\nPlease follow the current school health precautions. Students who are unwell should rest at home and seek appropriate medical advice. Any updated school measures will be communicated through official channels.','parents'],
 ['weather','Weather & Safety','notice','School Safety Advisory','Due to [weather/safety situation], the school is issuing the following precautionary instructions. Official operating-hour changes, if any, will be communicated separately.','school'],
 ['event','School Event','notice','School Event Announcement','The school will organize [event name] on [date] at [venue/time]. Students and parents are requested to follow the announced schedule and participation guidelines.','school'],
 ['trip','Educational Visit & Consent','consent','Educational Visit Information and Consent','Dear Parents / Guardians,\nThe school proposes an educational visit to [destination] on [date]. Detailed supervision, transport and consent instructions will be shared through official channels. Participation requires appropriate permission.','parents'],
 ['results','Result / Report Distribution','circular','Academic Report Distribution','Dear Parents / Guardians,\nAcademic reports for [term] will be distributed on [date] at [time]. Please follow the school office instructions for collection and review.','parents'],
 ['staff-meeting','Staff Meeting','memo','Staff Meeting Notice','All teaching and administrative staff are requested to attend the scheduled staff meeting on [date] at [time/venue]. Please come prepared with the relevant academic updates.','staff'],
 ['staff-duty','Teacher Duty Instructions','office_order','Teacher Duty Allocation Notice','All concerned teachers are directed to follow the approved duty roster for [period/date]. Reporting arrangements, supervisory responsibilities and any substitutions will be communicated by the school administration.','staff'],
 ['invigilation','Exam Invigilation','office_order','Examination Invigilation Instructions','All assigned invigilators must report at [time] on [date], follow the approved examination procedures and maintain required confidentiality and attendance records.','staff'],
 ['ack','Staff Receipt & Acknowledgement','staff_acknowledgement','Staff Notice Acknowledgement','All concerned employees are requested to review this official instruction and sign the acknowledgement register after reading. A signature confirms receipt, not automatic agreement to any additional terms.','staff'],
 ['curriculum','Syllabus / Academic Plan','circular','Academic Planning Update','Dear Parents / Guardians,\nUpdated class learning targets and syllabus expectations for [term] are available from the school. Please refer to the authorized classroom diary and academic guidance.','parents'],
]
const LAYOUTS=[{key:'prism',name:'Prism Signature'},{key:'authority',name:'Executive Authority'},{key:'academic',name:'Academic Ledger'},{key:'minimal',name:'Ink-Saving Classic'}]
const initial = kind => {
 const type=FORMATS.find(f=>f.key===kind)||FORMATS[0]
 return {
  document_kind:type.key,title:type.title,language:'english',audience_kind:type.key==='memo'||type.key==='office_order'||type.key==='staff_acknowledgement'?'staff':'school',
  audience_classes:[],layout_key:'prism',source_type:null,source_ref:null,source_revision:null,
  content:{message:type.body,action_required:'',note:'',signer_label:'Principal',issue_date:new Date().toLocaleDateString('en-CA'),schedule_rows:[]}
 }
}
const prettyKind = key => FORMATS.find(f=>f.key===key)?.label||'School Document'
function formatDate(s) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return s||''
 const [y,m,d]=s.split('-');return d+'/'+m+'/'+y
}
function DisplayRows({rows}) {
 if(!rows?.length)return <p className="sd-empty">No verified source rows loaded. Import the school record before printing this document.</p>
 return <table className="sd-print-table"><thead><tr><th>Activity / Date</th><th>Subject / Class</th><th>Time</th></tr></thead>
 <tbody>{rows.map((r,i)=><tr key={i}><td>{r.label || formatDate(r.date)}</td><td>{r.subject||r.class||'—'}</td><td>{r.start}{r.end?' – '+r.end:''}</td></tr>)}</tbody></table>
}
function SchoolPaper({document,branding,previewStatus}) {
 const d=document.content||{}
 return <article className={`sd-paper sd-paper--${document.layout_key}`} lang={document.language==='urdu'?'ur':'en'} dir={document.language==='urdu'?'rtl':'ltr'}>
  <div className="sd-edge"/>
  <header className="sd-paper-head">
   <div className="sd-brandmark">{branding.logoUrl?<img src={branding.logoUrl} alt="School logo" crossOrigin="anonymous" />:<div className="sd-logo-missing">LOGO REQUIRED</div>}</div>
   <div className="sd-head-words"><div className="sd-eyebrow">Official School Communication</div>
    <h1>{branding.schoolName||'School identity not loaded'}</h1>
    <p>{branding.address||'School address not available in SaaS settings'}</p>
   </div>
   <div className="sd-head-mark">ASSPS<br/>DOCUMENTS</div>
  </header>
  <div className="sd-hero"><span>{prettyKind(document.document_kind)}</span><h2>{document.title}</h2><p>For: {document.audience_kind==='selected_classes' ? (document.audience_classes||[]).join(', ')||'Classes not selected' : document.audience_kind}</p></div>
  <div className="sd-metadata"><span><b>Issued</b> {formatDate(d.issue_date)||'—'}</span><span><b>Reference</b> {document.reference_no||'Assigned after publication'}</span><span><b>Academic Session</b> 2026–27</span></div>
  <div className="sd-body">{d.message?.split('\n').map((p,i)=><p key={i}>{p||'\u00a0'}</p>)}</div>
  {['general_datesheet','academic_timetable','bell_schedule'].includes(document.document_kind)&&<DisplayRows rows={d.schedule_rows}/>}
  {d.action_required&&<div className="sd-action"><strong>Action Required</strong><p>{d.action_required}</p></div>}
  {d.note&&<div className="sd-note">{d.note}</div>}
  <footer className="sd-document-footer"><div><div className="sd-signature-line"/><strong>{d.signer_label||'Authorized Signatory'}</strong><small>Signature / Official Stamp</small></div><div className="sd-footer-right">Al Ilmul Ikhlaq<br/><small>Empowering Minds, Shaping Futures</small></div></footer>
  {previewStatus!=='published'&&<div className="sd-draft-watermark">DRAFT · NOT ISSUED</div>}
 </article>
}
export default function SchoolDocumentStudio(){
 const branding=useTenantBranding()
 const {user}=useAuth()
 const [draft,setDraft]=useState(()=>initial('notice'))
 const [selectedId,setSelectedId]=useState(null)
 const [revision,setRevision]=useState(1)
 const [status,setStatus]=useState('draft')
 const [saved,setSaved]=useState([])
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 const [source,setSource]=useState({class:'',section:'',session:'2026–27',term:'First Term'})
 const isLeader=['admin','super_admin','school_admin','principal'].includes(String(user?.role||''))
 const selectedType=FORMATS.find(f=>f.key===draft.document_kind)||FORMATS[0]
 const locked=status!=='draft'
 const canPrint=Boolean(branding.schoolName && branding.logoUrl && !branding.error && (draft.content.message||draft.content.schedule_rows?.length))
 const rows=draft.content.schedule_rows||[]
 const change=(field,value)=>{if(!locked)setDraft(s=>({...s,[field]:value}))}
 const changeBody=(field,value)=>{if(!locked)setDraft(s=>({...s,content:{...s.content,[field]:value}}))}
 const loadLibrary=async()=>{
  try{const res=await api.get('/api/school-documents');setSaved(Array.isArray(res.data?.data)?res.data.data:[])}
  catch(e){setMessage(e.response?.data?.code||'Document library unavailable until the validated Studio backend is published.')}
 }
 useEffect(()=>{void loadLibrary()},[])
 const chooseKind=key=>{setDraft(initial(key));setSelectedId(null);setRevision(1);setStatus('draft');setMessage('')}
 const loadItem=async id=>{
  setBusy(true)
  try{const res=await api.get(`/api/school-documents/${id}`);setDraft(res.data.data);setSelectedId(id);setRevision(res.data.data.revision);setStatus(res.data.data.status);setMessage('Saved document opened.')}
  catch(e){setMessage(e.response?.data?.code||'Cannot open saved document.')}
  finally{setBusy(false)}
 }
 const save=async()=>{
  if(!draft.title?.trim()||(!draft.content.message?.trim()&&!rows.length)){setMessage('A title and body or verified schedule are required.');return}
  setBusy(true)
  try{
   const payload={...draft,revision}
   const response=selectedId?await api.patch(`/api/school-documents/${selectedId}`,payload):await api.post('/api/school-documents',payload)
   const item=response.data.data
   setSelectedId(item.id);setRevision(item.revision);setStatus(item.status);setMessage('Draft saved securely. It has NOT been published.')
   await loadLibrary()
  }catch(e){setMessage(e.response?.data?.errors?.join('; ')||e.response?.data?.code||'Save failed; local draft remains visible.')}
  finally{setBusy(false)}
 }
 const doAction=async action=>{
  if(!selectedId){setMessage('Save this draft before submitting.');return}
  setBusy(true)
  try{const res=await api.post(`/api/school-documents/${selectedId}/${action}`,{revision})
   setStatus(res.data.data.status);setRevision(res.data.data.revision);setDraft(x=>({...x,reference_no:res.data.data.reference_no||x.reference_no}))
   setMessage(`Document state updated: ${res.data.data.status}. No physical signature was generated.`);await loadLibrary()
  }catch(e){setMessage(e.response?.data?.code||'This approval step was not accepted.')}
  finally{setBusy(false)}
 }
 const loadSource=async()=>{
  setBusy(true)
  setMessage('')
  try{
   let transformed=[]
   let type=null,ref=null,rev=null
   if(draft.document_kind==='bell_schedule'){
    const res=await api.get('/api/timetable/bell-schedule')
    const s=res.data?.data
    if(!s?.regular||!s?.friday)throw new Error('Published timings unavailable')
    transformed=[
     ...s.regular.map(x=>({label:'Regular · '+x.label,start:x.start,end:x.end})),
     ...s.friday.map(x=>({label:'Friday · '+x.label,start:x.start,end:x.end}))
    ];type='bell_schedule';ref=s.academic_session;rev=s.version
   }else if(draft.document_kind==='general_datesheet'){
    if(!source.class.trim())throw new Error('Select a class first')
    const res=await api.get('/api/date-sheets',{params:{session:source.session,term:source.term}})
    const list=Array.isArray(res.data?.data)?res.data.data:[]
    transformed=list.filter(r=>String(r.class||'').toLowerCase()===source.class.trim().toLowerCase()&&String(r.section||'')===source.section)
       .map(r=>({date:r.date,label:formatDate(r.date),subject:(r.subjects||[]).join(' / '),start:(r.times||[]).join(', '),class:source.class}))
    type='general_datesheet';ref=[source.session,source.term,source.class,source.section].join('|');rev='live-datesheet-read'
   }else if(draft.document_kind==='academic_timetable'){
    if(!source.class.trim())throw new Error('Select a class first')
    const res=await api.get('/api/timetable',{params:{class:source.class}})
    const list=Array.isArray(res.data?.data)?res.data.data:[]
    transformed=list.filter(r=>String(r.section||'')===source.section).map(r=>({
      label:[r.day_name,r.period_label].filter(Boolean).join(' · '),subject:[r.subject,r.teacher_display_name].filter(Boolean).join(' • '),
      start:String(r.start_time||'').slice(0,5),end:String(r.end_time||'').slice(0,5),class:source.class
    }))
    type='academic_timetable';ref=[source.class,source.section].join('|');rev='live-academic-roster-read'
   }
   if(!transformed.length)throw new Error('No matching verified records found; nothing was inserted')
   setDraft(x=>({...x,source_type:type,source_ref:ref,source_revision:rev,content:{...x.content,schedule_rows:transformed}}))
   setMessage(`Loaded ${transformed.length} official source rows. Review before saving.`)
  }catch(e){setMessage(e?.message||e.response?.data?.message||'Source import failed; no guessed data has been inserted.')}
  finally{setBusy(false)}
 }
 return <main className="sd-app">
  <div className="sd-top"><div><div className="sd-overline">ASSPS · SCHOOL DOCUMENT SYSTEM</div><h1>Notice Studio <span>01</span></h1><p>Formal circulars, class-wide documents, period timings and staff sign-off—built from authenticated school records.</p></div><div className="sd-version">DESIGN SYSTEM<br/><strong>ATELIER / 2026</strong></div></div>
  <div className="sd-viewport">
   <aside className="sd-sidebar"><h3>Document Library</h3>
    <p className="sd-help">Choose a professionally structured document.</p>
    <div className="sd-presets"><label>Ready-to-edit school templates<select defaultValue="" onChange={e=>{const t=PRESETS.find(x=>x[0]===e.target.value);if(!t)return;const next=initial(t[2]);setDraft({...next,title:t[3],audience_kind:t[5],content:{...next.content,message:t[4]}});setSelectedId(null);setRevision(1);setStatus('draft');setMessage('Official content template loaded for editing. Replace bracketed details before approval.')}}><option value="">Choose a notice purpose…</option>{PRESETS.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label></div>
    <div className="sd-kind-list">{FORMATS.map(item=><button key={item.key} className={draft.document_kind===item.key?'active':''} onClick={()=>chooseKind(item.key)}><strong>{item.label}</strong><small>{item.subtitle}</small></button>)}</div>
    <div className="sd-saved"><div className="sd-saved-title"><strong>Saved documents</strong><button onClick={loadLibrary}>Refresh</button></div>{saved.length===0&&<p className="sd-help">No accessible drafts yet.</p>}{saved.map(d=><button key={d.id} onClick={()=>loadItem(d.id)}><span>{d.title}</span><small>{d.status} · rev {d.revision}</small></button>)}</div>
   </aside>
   <div className="sd-workspace"><div className="sd-toolbar"><span>Compose / {selectedType.label}</span><div className="sd-actions"><button disabled={busy||locked} onClick={save}>Save Draft</button>{status==='draft'&&selectedId&&<button disabled={busy} onClick={()=>doAction('submit')}>Request Approval</button>}{status==='submitted'&&isLeader&&<button disabled={busy} onClick={()=>doAction('approve')}>Approve</button>}{status==='approved'&&isLeader&&<button disabled={busy} onClick={()=>doAction('publish')}>Publish</button>}<button disabled={!canPrint} className="sd-print-button" onClick={()=>window.print()}>Print / Save PDF</button></div></div>
    {message&&<div className="sd-info" role="status">{message}</div>}
    {(!branding.logoUrl||branding.error)&&<div className="sd-alert">School logo is unavailable from SaaS branding. Official print is disabled to prevent wrong-school branding. <button onClick={()=>branding.refresh?.()}>Retry School Branding</button></div>}
    <div className="sd-fields">
     <label>Document heading<input disabled={locked} value={draft.title} onChange={e=>change('title',e.target.value)} maxLength={220}/></label>
     <label>Audience<select disabled={locked} value={draft.audience_kind} onChange={e=>change('audience_kind',e.target.value)}>{['school','parents','students','staff','selected_classes'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
     <label>Layout style<select disabled={locked} value={draft.layout_key} onChange={e=>change('layout_key',e.target.value)}>{LAYOUTS.map(x=><option key={x.key} value={x.key}>{x.name}</option>)}</select></label>
     <label>Language<select disabled={locked} value={draft.language} onChange={e=>change('language',e.target.value)}><option value="english">English</option><option value="urdu">Urdu</option><option value="bilingual">Bilingual</option></select></label>
     <label className="wide">Notice content<textarea disabled={locked} rows={4} value={draft.content.message||''} onChange={e=>changeBody('message',e.target.value)}/></label>
     {draft.audience_kind==='selected_classes'&&<label className="wide">Classes (comma separated)<input disabled={locked} value={(draft.audience_classes||[]).join(', ')} onChange={e=>change('audience_classes',e.target.value.split(',').map(x=>x.trim()).filter(Boolean))}/></label>}
     <label className="wide">Required action<textarea disabled={locked} rows={2} value={draft.content.action_required||''} onChange={e=>changeBody('action_required',e.target.value)}/></label>
     <label>Issued date<input disabled={locked} type="date" value={draft.content.issue_date||''} onChange={e=>changeBody('issue_date',e.target.value)}/></label>
     <label>Signature label (not an electronic signature)<input disabled={locked} value={draft.content.signer_label||''} onChange={e=>changeBody('signer_label',e.target.value)}/></label>
     <label className="wide">Additional note<input disabled={locked} value={draft.content.note||''} onChange={e=>changeBody('note',e.target.value)}/></label>
    </div>
    {['general_datesheet','academic_timetable','bell_schedule'].includes(draft.document_kind)&&<div className="sd-import"><h3>Verified School Data</h3><p>Read-only source import. Existing academic data is never changed.</p>{draft.document_kind!=='bell_schedule'&&<div className="sd-source-controls"><input placeholder="Class, e.g. Seven" value={source.class} onChange={e=>setSource(s=>({...s,class:e.target.value}))}/><input placeholder="Section, e.g. Blue" value={source.section} onChange={e=>setSource(s=>({...s,section:e.target.value}))}/>{draft.document_kind==='general_datesheet'&&<><input placeholder="Session" value={source.session} onChange={e=>setSource(s=>({...s,session:e.target.value}))}/><input placeholder="Term" value={source.term} onChange={e=>setSource(s=>({...s,term:e.target.value}))}/></>}</div>}<button disabled={busy||locked} onClick={loadSource}>Import from SaaS Records</button><span>{rows.length} source rows</span></div>}
    <div className="sd-preview-intro"><div><span>PREVIEW MODE</span><h2>Official Print Canvas</h2></div><span>A4 · Authenticated Branding · {status.toUpperCase()}</span></div>
    <SchoolPaper document={draft} branding={branding} previewStatus={status}/>
   </div>
  </div>
 </main>
}

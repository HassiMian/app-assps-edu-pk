import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Printer, RefreshCw, Search, Pencil, ShieldCheck, FileSpreadsheet, ArrowRight, AlertCircle } from 'lucide-react'
import api from '../../services/api'
import {useTenantBranding} from '../../context/TenantBrandingContext'
import './MarksRegister.css'

const text = v => String(v ?? '').trim()
const escapeHtml = v => text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const numberOrNull = v => v === null || v === undefined || text(v) === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null
const scoreState = row => text(row?.result_status || (numberOrNull(row?.marks_obtained) === null ? 'PENDING' : 'SCORED')).toUpperCase()
const displayMark = row => {
 if (!row) return '—'
 const state=scoreState(row)
 if (state!=='SCORED') return state==='PENDING'?'—':state
 const value=numberOrNull(row.marks_obtained)
 return value===null?'—':String(value)
}
const stableName = row => text(row?.student_name || row?.name || row?.student_id)
const classKey = row => text(row?.class || row?.student_class)
const sectionKey = row => text(row?.section || row?.student_section)
const idKey = row => text(row?.student_id)
function sortStudents(a,b) {
 const c=classKey(a).localeCompare(classKey(b),undefined,{numeric:true})
 if(c) return c
 const s=sectionKey(a).localeCompare(sectionKey(b),undefined,{numeric:true})
 if(s) return s
 const ar=text(a?.roll_number),br=text(b?.roll_number)
 if(ar||br){ const r=ar.localeCompare(br,undefined,{numeric:true});if(r)return r }
 return stableName(a).localeCompare(stableName(b),undefined,{numeric:true})
}
const distinct = values => [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))
function buildMatrix(rows) {
 const groups=new Map(), subjects=distinct(rows.map(r=>text(r.subject)))
 for(const row of rows) {
  const id=idKey(row)
  if(!groups.has(id)) groups.set(id,{...row,marks:new Map()})
  groups.get(id).marks.set(text(row.subject),row)
 }
 return {students:[...groups.values()].sort(sortStudents),subjects}
}
function htmlSheet({rows,exam,classFilter,sectionFilter,subjectFilter,schoolName,schoolAddress}) {
 const matrix=buildMatrix(rows)
 const subjects=matrix.subjects
 const printedAt=new Date().toLocaleString('en-GB',{timeZone:'Asia/Karachi',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
 const heading=escapeHtml(exam?.name || 'Examination')
 const meta=[exam?.session, classFilter ? 'Class '+classFilter : 'All selected classes', sectionFilter ? 'Section '+sectionFilter : 'All sections', subjectFilter || 'All recorded subjects'].filter(Boolean).map(escapeHtml).join(' · ')
 const headingRow=subjects.map(s=>'<th>'+escapeHtml(s)+'</th>').join('')
 const tableRows=matrix.students.map((student,i)=>{
   let obtained=0,max=0,numberScored=0
   const cells=subjects.map(s=>{
     const row=student.marks.get(s),n=numberOrNull(row?.marks_obtained),tm=numberOrNull(row?.total_marks)
     if(row && scoreState(row)==='SCORED' && n!==null && tm!==null && tm>0){obtained+=n;max+=tm;numberScored++}
     return '<td class="mark">'+escapeHtml(displayMark(row))+'</td>'
   }).join('')
   const summary=numberScored ? escapeHtml(String(Number(obtained.toFixed(2))))+' / '+escapeHtml(String(Number(max.toFixed(2)))):'—'
   return '<tr><td>'+String(i+1)+'</td><td>'+escapeHtml(student.roll_number || student.gr_number || '—')+'</td><td class="name">'+escapeHtml(stableName(student))+'</td><td>'+escapeHtml(classKey(student))+'</td><td>'+escapeHtml(sectionKey(student) || '—')+'</td>'+cells+'<td class="total">'+summary+'</td></tr>'
 }).join('')
 const doc='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ASSPS Marks Register</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
 '@page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{margin:0;font-family:"Times New Roman",serif;color:#142038;background:#eef2f6}.actions{background:#0b2746;color:white;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;font-family:Arial,sans-serif}.actions button{background:#fff;color:#0b2746;border:0;border-radius:6px;padding:10px 18px;font-weight:bold;cursor:pointer}.paper{background:white;max-width:1250px;margin:18px auto;padding:24px;box-shadow:0 8px 28px #0001}h1{font-size:21px;letter-spacing:.4px;margin:0;text-align:center}h2{font-size:16px;text-align:center;margin:7px 0;color:#123a60}.tagline{font-size:12px;text-align:center;margin:5px;color:#44566a}.rule{border-top:3px double #163b60;margin:14px 0}.info{display:flex;justify-content:space-between;font-size:12px;margin-bottom:12px;gap:16px}table{width:100%;border-collapse:collapse;font-size:11px;table-layout:auto}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{border:1px solid #334458;padding:6px 5px;text-align:center}th{background:#e5edf5;font-weight:700}.name{text-align:left;min-width:135px}.total{font-weight:700}.mark{min-width:39px}.footer{font-size:10px;display:flex;justify-content:space-between;margin-top:17px;color:#42546a}.signature{border-top:1px solid #455c74;width:145px;text-align:center;margin-top:19px}@media print{body{background:white}.actions{display:none}.paper{padding:0;margin:0;max-width:100%;box-shadow:none}thead{display:table-header-group}table{font-size:9.2px}th,td{padding:5px 3px}}'+
 '</style></head><body><div class="actions"><strong>Saved Marks Register · Print Preview</strong><button onclick="window.print()">Print / Save PDF</button></div><div class="paper"><h1>'+escapeHtml(schoolName||'School Examination Office')+'</h1><p class="tagline">Official Examination Marks Register · '+escapeHtml(schoolAddress||'Institutional Records')+'</p><div class="rule"></div><h2>'+heading+'</h2><div class="info"><span>'+meta+'</span><span>Printed: '+escapeHtml(printedAt)+' PKT</span></div><table><thead><tr><th>#</th><th>Roll / GR</th><th>Student Name</th><th>Class</th><th>Section</th>'+headingRow+'<th>Recorded Total</th></tr></thead><tbody>'+tableRows+'</tbody></table><div class="footer"><div>Saved marks only · Blank cells are not zero · ABSENT/EXCUSED retained verbatim</div><div class="signature">Examination Incharge</div></div></div></body></html>'
 return doc
}

export default function MarksRegister(){
 const navigate=useNavigate()
 const schoolBrand=useTenantBranding()
 const [exams,setExams]=useState([])
 const [examId,setExamId]=useState('')
 const [rows,setRows]=useState([])
 const [loading,setLoading]=useState(false)
 const [loadingExams,setLoadingExams]=useState(true)
 const [error,setError]=useState('')
 const [classFilter,setClassFilter]=useState('')
 const [sectionFilter,setSectionFilter]=useState('')
 const [subjectFilter,setSubjectFilter]=useState('')
 const [search,setSearch]=useState('')
 const request=useRef(0)
 const [refreshSeq,setRefreshSeq]=useState(0)
 // Immediately discard stale exam data before starting a different authorized read.
 // The request epoch rejects responses from previous selections or refreshes.
 const selectExam=useCallback(id=>{
  request.current++
  setRows([]);setError('')
  setClassFilter('');setSectionFilter('');setSubjectFilter('')
  setLoading(Boolean(id))
  setExamId(id)
 },[])
 const refreshMarks=()=>{
  if(!examId)return
  request.current++
  setRows([]);setError('');setLoading(true)
  setRefreshSeq(x=>x+1)
 }

 useEffect(()=>{
  let live=true
  api.get('/api/exams',{params:{include_subjects:'1'},marksReviewReadOnly401:true}).then(r=>{
   if(!live)return
   if(!Array.isArray(r.data?.data))throw new Error('Exam catalog unavailable.')
   setExams(r.data.data)
   selectExam(text(r.data.data[0]?.id))
  }).catch(err=>live&&setError(err?.response?.data?.message||err?.message||'Could not load exams.')).finally(()=>live&&setLoadingExams(false))
  return()=>{live=false}
 },[selectExam])
 useEffect(()=>{
  const token=++request.current
  if(!examId)return
  api.get('/api/exams/results',{params:{exam_ids:examId},marksReviewReadOnly401:true}).then(r=>{
   if(token!==request.current)return
   if(!Array.isArray(r.data?.data))throw new Error('Saved marks response was invalid.')
   // The backend owns school-tenant and teacher assignment enforcement.
   setRows(r.data.data.filter(row=>String(row.exam_id)===examId))
  }).catch(err=>token===request.current&&setError(err?.response?.data?.message||err?.message||'Saved marks could not be loaded.')).finally(()=>token===request.current&&setLoading(false))
 },[examId,refreshSeq])
 const currentExam=exams.find(e=>String(e.id)===examId)
 const classes=useMemo(()=>distinct(rows.map(classKey)),[rows])
 const sections=useMemo(()=>distinct(rows.filter(r=>!classFilter||classKey(r)===classFilter).map(sectionKey)),[rows,classFilter])
 const subjects=useMemo(()=>distinct(rows.filter(r=>(!classFilter||classKey(r)===classFilter)&&(!sectionFilter||sectionKey(r)===sectionFilter)).map(r=>text(r.subject))),[rows,classFilter,sectionFilter])
 const visible=useMemo(()=>rows.filter(r=>(!classFilter||classKey(r)===classFilter)&&(!sectionFilter||sectionKey(r)===sectionFilter)&&(!subjectFilter||text(r.subject)===subjectFilter)&&(!search||[stableName(r),r.roll_number,r.gr_number,r.subject].some(x=>text(x).toLowerCase().includes(search.toLowerCase())))).sort((a,b)=>sortStudents(a,b)||text(a.subject).localeCompare(text(b.subject))),[rows,classFilter,sectionFilter,subjectFilter,search])
 const matrix=useMemo(()=>buildMatrix(visible),[visible])
 const recorded=visible.filter(r=>scoreState(r)==='SCORED'&&numberOrNull(r.marks_obtained)!==null).length
 const zero=visible.filter(r=>scoreState(r)==='SCORED'&&numberOrNull(r.marks_obtained)===0).length
 const edit=(student,subject)=>{
  const query=new URLSearchParams({exam_id:examId,class:classKey(student),subject})
  navigate('/exams/marks?'+query.toString())
 }
 const doPrint=()=>{
  if(!visible.length){setError('Select an exam with saved marks before printing.');return}
  const win=window.open('','_blank')
  if(!win){setError('Print window blocked. Allow pop-ups for this school site and try again.');return}
  win.opener=null
  win.document.open()
  win.document.write(htmlSheet({rows:visible,exam:currentExam,classFilter,sectionFilter,subjectFilter,schoolName:schoolBrand.schoolName,schoolAddress:schoolBrand.address}))
  win.document.close()
  win.focus()
 }
 return <main className="mr-page" data-marks-review>
  <div className="mr-header">
   <div><span className="mr-eyebrow"><ShieldCheck size={14}/> EXAMINATION RECORDS</span><h1>Saved Marks Register</h1><p>View verified saved entries, review each student's marks and print professional class sheets.</p></div>
   <div className="mr-actions"><button className="mr-button" onClick={()=>navigate('/exams/marks')}><ArrowRight size={16}/> Marks Entry</button><button className="mr-button mr-primary" disabled={!visible.length||loading} onClick={doPrint}><Printer size={16}/> Print Marks Sheet</button></div>
  </div>
  <div className="mr-info"><ShieldCheck size={16}/> Read-only review never changes a student's saved score. Corrections use the protected marks workflow; an existing official score requires audited Principal revision.</div>
  <div className="mr-controls">
   <label>Examination<select value={examId} onChange={e=>selectExam(e.target.value)} disabled={loadingExams}><option value="">Select examination</option>{exams.map(e=><option key={e.id} value={e.id}>{e.name} {e.session?'· '+e.session:''}</option>)}</select></label>
   <label>Class<select value={classFilter} onChange={e=>{setClassFilter(e.target.value);setSectionFilter('');setSubjectFilter('')}}><option value="">All classes</option>{classes.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Section<select value={sectionFilter} onChange={e=>{setSectionFilter(e.target.value);setSubjectFilter('')}}><option value="">All sections</option>{sections.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Subject<select value={subjectFilter} onChange={e=>setSubjectFilter(e.target.value)}><option value="">All subjects</option>{subjects.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Student / roll #<div className="mr-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search saved entries"/></div></label>
   <button title="Refresh saved data" className="mr-icon" onClick={refreshMarks} disabled={loading||!examId}><RefreshCw size={18}/></button>
  </div>
  {error&&<div className="mr-error"><AlertCircle size={17}/>{error}</div>}
  <div className="mr-stats">
   <div><span>Saved records</span><strong>{visible.length}</strong></div>
   <div><span>Students</span><strong>{matrix.students.length}</strong></div>
   <div><span>Numeric scores</span><strong>{recorded}</strong></div>
   <div><span>Actual zeros</span><strong>{zero}</strong></div>
  </div>
  <div className="mr-panel">
   <div className="mr-panel-top"><div><h2><FileSpreadsheet size={20}/> Official Marks Sheet</h2><p>{currentExam?.name || 'Select an examination'} · {matrix.subjects.length} recorded subject(s)</p></div><span className="mr-readonly"><Eye size={14}/> Live saved records</span></div>
   {loading||loadingExams?<div className="mr-empty">Loading saved examination records…</div>:!visible.length?<div className="mr-empty">No saved entries match these filters. Blank is not zero. Select an examination or change filters.</div>:
   <div className="mr-tablewrap"><table><thead><tr><th>#</th><th>Roll / GR</th><th className="mr-left">Student</th><th>Class</th><th>Section</th>{matrix.subjects.map(s=><th key={s}>{s}</th>)}<th>Saved total</th><th>Action</th></tr></thead><tbody>{matrix.students.map((student,i)=>{
    let max=0,obt=0,n=0
    const cells=matrix.subjects.map(subject=>{
     const row=student.marks.get(subject),score=numberOrNull(row?.marks_obtained),total=numberOrNull(row?.total_marks)
     if(row&&scoreState(row)==='SCORED'&&score!==null&&total!==null&&total>0){max+=total;obt+=score;n++}
     return <td key={subject}><span className={row&&scoreState(row)==='SCORED'?'mr-score':'mr-status'}>{displayMark(row)}</span></td>
    })
    return <tr key={idKey(student)}><td>{i+1}</td><td>{student.roll_number||student.gr_number||'—'}</td><td className="mr-left mr-name">{stableName(student)}</td><td>{classKey(student)}</td><td>{sectionKey(student)||'—'}</td>{cells}<td className="mr-total">{n?Number(obt.toFixed(2))+' / '+Number(max.toFixed(2)):'—'}</td><td><button className="mr-edit" onClick={()=>edit(student,subjectFilter||matrix.subjects.find(s=>student.marks.has(s))||'')}><Pencil size={14}/> Edit</button></td></tr>
   })}</tbody></table></div>}
  </div>
  <div className="mr-footer"><span>Missing subjects stay blank; they are never converted into zero. Existing saved scores remain protected.</span><button onClick={doPrint} disabled={!visible.length} className="mr-button mr-primary"><Printer size={15}/> Print / Save PDF</button></div>
 </main>
}

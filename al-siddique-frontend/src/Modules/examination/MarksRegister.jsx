import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, RefreshCw, Search, Pencil, Save, X, ArrowUpDown, ShieldCheck } from 'lucide-react'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, select, input, sectionHeader } from '../moduleStyles'
import { normalizeMarksExam } from './marksEntryModel'
import {
  availableRegisterValues, registerFilterRows, registerScoreInfo, registerSummary,
  registerRowKey, registerEditGuard, registerSnapshotMatches, orderRegisterRows,
  escapeRegisterHtml,
} from './marksRegisterModel'

const formSelect = { ...select, width: '100%', minWidth: 0 }
const fieldLabel = { fontSize: 12, fontWeight: 800, marginBottom: 6, display: 'block', color: C.muted }
const subjectColumns = ['#', 'GR / Roll', 'Student', 'Father', 'Class', 'Section', 'Subject', 'Obtained', 'Maximum', 'Pass', 'Status', 'Action']
const classesFor = rows => availableRegisterValues(rows, r => r.student_class ?? r.class)
const sectionsFor = rows => availableRegisterValues(rows, r => r.student_section ?? r.section)
const subjectsFor = rows => availableRegisterValues(rows, r => r.subject)
const cellStyle = { padding: '11px 9px', verticalAlign: 'middle', borderBottom: '1px solid var(--apex-border-subtle)' }

function createPrintWindow({ exam, rows, filters }) {
  if (!exam || !rows.length) return false
  const h = escapeRegisterHtml
  const scope = [exam.name, exam.session, filters.className && `Class ${filters.className}`,
    filters.section && `Section ${filters.section}`, filters.subject].filter(Boolean).join(' · ')
  const entries = rows.map((r, i) => {
    const info = registerScoreInfo(r, exam)
    return `<tr><td>${i+1}</td><td>${h(r.gr_number || r.roll_number || '—')}</td><td>${h(r.name ?? r.student_name)}</td><td>${h(r.father_name || '—')}</td><td>${h(r.student_class ?? r.class)}</td><td>${h(r.student_section ?? r.section ?? '—')}</td><td>${h(r.subject)}</td><td>${info.score===null ? '—' : h(info.score)}</td><td>${info.maximum ?? '—'}</td><td>${info.pass ?? '—'}</td><td>${h(info.status)}</td></tr>`
  }).join('')
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Saved Marks Register - ${h(scope)}</title>
  <style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:"Times New Roman",Arial,sans-serif;color:#152639;margin:0}h1{text-align:center;margin:0 0 5px;font-size:16pt}h2{text-align:center;margin:0 0 6px;font-size:12pt}p{text-align:center;margin:4px 0 13px;font-size:9pt}table{width:100%;border-collapse:collapse;font-size:8.8pt}th,td{border:1px solid #405267;padding:5px;text-align:left;vertical-align:top}th{background:#eef2f8}thead{display:table-header-group}tr{break-inside:avoid}.note{text-align:left;margin-top:14px}</style>
  </head><body><h1>AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</h1><h2>Saved Examination Marks Register</h2><p>${h(scope)} | ${rows.length} saved records | ${h(new Date().toLocaleDateString('en-GB'))}</p>
  <table><thead><tr>${subjectColumns.filter(c=>c!=='Action').map(c=>`<th>${h(c)}</th>`).join('')}</tr></thead><tbody>${entries}</tbody></table>
  <p class="note">Read-only printed copy of saved records. Missing scores are not zeros. Corrections must be saved and reloaded before printing.</p>
  <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250))</script></body></html>`
  const popup = window.open('', '_blank')
  if (!popup) return false
  popup.document.open()
  popup.document.write(page)
  popup.document.close()
  return true
}

export default function MarksRegister() {
  const [exams, setExams] = useState([])
  const [session, setSession] = useState('')
  const [examType, setExamType] = useState('')
  const [examId, setExamId] = useState('')
  const [className, setClassName] = useState('')
  const [section, setSection] = useState('')
  const [subject, setSubject] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('class')
  const [rows, setRows] = useState([])
  const [loadedExamId, setLoadedExamId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)
  const requestRef = useRef(0)

  useEffect(() => {
    let alive = true
    api.get('/api/exams', { params: { include_subjects: '1' } })
      .then(r => {
        if (!alive) return
        if (r.data?.success === false || !Array.isArray(r.data?.data)) throw new Error('Invalid exam list')
        const list = r.data.data.map(normalizeMarksExam)
        setExams(list)
        const preferred = list.find(e => /first\s+term/i.test(e.name || '')) || list[0]
        if (preferred) { setSession(preferred.session); setExamType(preferred.type); setExamId(String(preferred.id)) }
      })
      .catch(e => { if (alive) setError(e.response?.data?.message || 'Could not load saved exams.') })
    return () => { alive=false }
  }, [])

  useEffect(() => {
    const requestId = ++requestRef.current
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      setLoading(Boolean(examId))
      setError('')
      setLoadedExamId('')
      setRows([])
    })
    if (!examId) return () => { alive=false }
    // The joined result list contains student class and section. The older
    // /results/:exam_id endpoint does NOT always include those fields.
    api.get('/api/exams/results', { params: { exam_ids: examId } })
      .then(r => {
        if (!alive || requestRef.current !== requestId) return
        if (r.data?.success === false || !Array.isArray(r.data?.data)) throw new Error('Invalid marks response')
        if (r.data.data.some(row => String(row.exam_id) !== String(examId))) throw new Error('Exam isolation mismatch')
        setRows(r.data.data)
        setLoadedExamId(String(examId))
      })
      .catch(e => { if (alive && requestRef.current===requestId) setError(e.response?.data?.message || e.message || 'Could not load saved marks.') })
      .finally(() => { if (alive && requestRef.current===requestId) setLoading(false) })
    return () => { alive=false }
  }, [examId, refreshCount])

  const sessions = useMemo(() => availableRegisterValues(exams,e=>e.session),[exams])
  const sessionExams = useMemo(() => exams.filter(e => !session || e.session===session),[exams,session])
  const types = useMemo(() => availableRegisterValues(sessionExams,e=>e.type),[sessionExams])
  const matchingExams = useMemo(() => sessionExams.filter(e=>!examType || e.type===examType),[sessionExams,examType])
  const exam = matchingExams.find(e=>String(e.id)===examId)
  const activeRows = useMemo(()=>loadedExamId===examId && exam ? rows : [],[rows,loadedExamId,examId,exam])
  const classes = useMemo(()=>classesFor(activeRows),[activeRows])
  const classRows = useMemo(()=>registerFilterRows(activeRows,{className}),[activeRows,className])
  const sections = useMemo(()=>sectionsFor(classRows),[classRows])
  const sectionRows = useMemo(()=>registerFilterRows(classRows,{section}),[classRows,section])
  const subjects = useMemo(()=>subjectsFor(sectionRows),[sectionRows])
  const filtered = useMemo(()=>registerFilterRows(sectionRows,{subject,search}),[sectionRows,subject,search])
  const displayRows = useMemo(()=>orderRegisterRows(filtered,sortBy),[filtered,sortBy])
  const totals = useMemo(()=>registerSummary(filtered,exam),[filtered,exam])
  const locked = saving || !!editing
  const canPrint = !locked && !loading && !!exam && loadedExamId===examId && displayRows.length>0
  const editRow = editing && activeRows.find(r=>registerRowKey(r)===editing.key)
  const editValidation = editing && editRow && exam ? registerEditGuard(editRow, exam, editing.value) : null

  const resetFilters = () => { setClassName(''); setSection(''); setSubject(''); setSearch(''); setSortBy('class') }
  const changeSession = value => {
    setSession(value)
    const first = exams.find(e=>e.session===value)
    setExamType(first?.type || '')
    setExamId(first ? String(first.id) : '')
    resetFilters()
    setNotice('')
  }
  const changeType = value => {
    setExamType(value)
    const first = sessionExams.find(e=>e.type===value)
    setExamId(first ? String(first.id) : '')
    resetFilters()
    setNotice('')
  }
  const changeExam = value => { setExamId(value); resetFilters(); setNotice('') }

  const startEditing = row => {
    if (saving || loading || loadedExamId!==examId) return
    setError('')
    setNotice('')
    const validity = registerEditGuard(row,exam,String(row.marks_obtained))
    if (validity.error) { setError(validity.error); return }
    setEditing({ key:registerRowKey(row), original:{...row}, value:String(row.marks_obtained) })
  }

  const saveCorrection = async () => {
    if (!editing || !editRow || !exam || saving) return
    const entry = registerEditGuard(editRow,exam,editing.value)
    if (entry.error) { setError(entry.error); return }
    if (!registerSnapshotMatches(editing.original,editRow)) { setError('Loaded marks changed. Cancel and refresh first.'); return }
    if (Number(editing.original.marks_obtained)===entry.value) { setEditing(null); setNotice('No change was made.'); return }
    setError('')
    setNotice('')
    setSaving(true)
    let acknowledged = false
    try {
      // Always re-read this exam before correcting an existing row. Teachers
      // may be entering marks while the principal has this page open.
      const response = await api.get('/api/exams/results', { params:{ exam_ids:examId } })
      if (response.data?.success===false || !Array.isArray(response.data?.data)) throw new Error('Current saved marks could not be verified.')
      const current = response.data.data.find(row=>registerRowKey(row)===editing.key)
      if (!registerSnapshotMatches(editing.original,current))
        throw new Error('This mark was changed by another session. Nothing was overwritten. Cancel and refresh to review the latest saved score.')
      const revalidated = registerEditGuard(current,exam,editing.value)
      if (revalidated.error) throw new Error(revalidated.error)
      const result = await api.post('/api/exams/results', { results:[revalidated.payload] })
      if (result.data?.success!==true || Number(result.data?.savedCount)!==1)
        throw new Error('Server did not acknowledge one saved correction. Refresh before further changes.')
      acknowledged = true
      // Never announce a successful correction based solely on a POST response.
      const verify = await api.get('/api/exams/results', { params:{ exam_ids:examId } })
      if (verify.data?.success===false || !Array.isArray(verify.data?.data)) throw new Error('Save was accepted, but post-save reload failed.')
      const latest = verify.data.data.find(row=>registerRowKey(row)===editing.key)
      if (!latest || Number(latest.marks_obtained)!==entry.value || Number(latest.total_marks)!==Number(current.total_marks))
        throw new Error('Server accepted the save but final marks do not match. Refresh and investigate before retrying.')
      setRows(verify.data.data)
      setLoadedExamId(String(examId))
      setNotice(`Verified correction saved: ${current.student_name || current.name || 'Student'} · ${current.subject}: ${editing.original.marks_obtained} → ${entry.value}. Only this subject record was submitted.`)
      setEditing(null)
    } catch(e) {
      const detail = e.response?.data?.message || e.message || 'Correction could not be completed.'
      setError(acknowledged ? `${detail} Server acknowledged the write; refresh and inspect the final record. Do NOT save again blindly.` : detail)
      if (acknowledged) setEditing(null)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ minHeight:'100%',padding:24,background:'var(--apex-shell-gradient)',color:'var(--apex-text-primary)' }}>
      <div style={{ maxWidth:1320,margin:'auto',display:'grid',gap:18 }}>
        <div className="super-module-card" style={{ ...card,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16 }}>
          <div>
            <h1 style={sectionHeader}>Saved Marks Control Center</h1>
            <p style={{color:C.muted,marginTop:7}}>Review, correct and print existing saved examination marks. No automatic zero entry or publication.</p>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {locked ? <span style={{...btnSecondary,opacity:.6,cursor:'not-allowed'}}>Finish edit to leave</span> : <Link to="/exams/marks" style={{...btnSecondary,textDecoration:'none'}}>Marks Entry</Link>}
            <button type="button" style={btnSecondary} disabled={locked || !examId || loading} onClick={()=>setRefreshCount(v=>v+1)}><RefreshCw size={15}/> Reload Saved Marks</button>
            <button type="button" style={btnPrimary} disabled={!canPrint} onClick={()=>{ if(!createPrintWindow({exam,rows:displayRows,filters:{className,section,subject}})) setError('Allow pop-ups to print this register.') }}><Printer size={15}/> Print Filtered List</button>
          </div>
        </div>

        <div className="super-module-card" style={{...card,padding:14}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(165px,1fr))',gap:8}}>
            {[
              ['01','Choose Session & Exam'],
              ['02','Select Class / Section'],
              ['03','Review Saved Scores'],
              ['04','Correct & Verify / Print'],
            ].map(([n,t],i)=><div key={n} style={{padding:'11px 13px',borderRadius:11,background:'rgba(95,151,193,.09)',border:'1px solid rgba(95,151,193,.13)',display:'flex',gap:9,alignItems:'center'}}>
              <strong style={{color:i===3?C.gold:C.silver}}>{n}</strong><span style={{fontWeight:700,fontSize:12}}>{t}</span>
            </div>)}
          </div>
        </div>

        <div className="super-module-card" style={{...card,display:'grid',gap:17}}>
          <div style={{fontWeight:850,fontSize:15,color:C.gold}}>01 · Examination Selection</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(205px,1fr))',gap:13}}>
            <label><span style={fieldLabel}>Academic Session</span><select aria-label="Academic Session" style={formSelect} disabled={locked} value={session} onChange={e=>changeSession(e.target.value)}><option value="">Choose session</option>{sessions.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
            <label><span style={fieldLabel}>Exam / Assessment Type</span><select aria-label="Exam Type" style={formSelect} disabled={locked} value={examType} onChange={e=>changeType(e.target.value)}><option value="">Choose type</option>{types.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
            <label><span style={fieldLabel}>Saved Exam / Term</span><select aria-label="Saved Exam" style={formSelect} disabled={locked} value={examId} onChange={e=>changeExam(e.target.value)}><option value="">Choose saved exam</option>{matchingExams.map(v=><option key={v.id} value={String(v.id)}>{v.name} — {v.class}</option>)}</select></label>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <strong style={{fontSize:15,color:C.gold}}>02 · Cohort & Subject Filters</strong>
            <button type="button" style={{...btnSecondary,fontSize:12,minHeight:0,padding:'7px 12px'}} disabled={locked} onClick={resetFilters}>Reset Filters</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:13}}>
            <label><span style={fieldLabel}>Class</span><select aria-label="Class" style={formSelect} disabled={locked || loading} value={className} onChange={e=>{setClassName(e.target.value);setSection('');setSubject('')}}><option value="">All Classes</option>{classes.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
            <label><span style={fieldLabel}>Section</span><select aria-label="Section" style={formSelect} disabled={locked || loading} value={section} onChange={e=>{setSection(e.target.value);setSubject('')}}><option value="">All Sections</option>{sections.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
            <label><span style={fieldLabel}>Subject</span><select aria-label="Subject" style={formSelect} disabled={locked || loading} value={subject} onChange={e=>setSubject(e.target.value)}><option value="">All Subjects</option>{subjects.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
            <label><span style={fieldLabel}><ArrowUpDown size={13} style={{verticalAlign:'middle'}}/> Sequence / Arrangement</span><select aria-label="Arrange Results" style={formSelect} disabled={locked} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="class">Class → Section → GR / Roll</option><option value="gr">GR / Roll (ascending)</option><option value="subject">Subject (A–Z)</option><option value="high">Highest percentage first</option><option value="low">Lowest percentage first</option>
            </select></label>
          </div>
          <label style={{display:'block',position:'relative'}}><span style={fieldLabel}>Find a Student / GR Number</span><Search size={16} style={{position:'absolute',left:12,bottom:14,color:C.muted}}/><input aria-label="Search saved marks" style={{...input,width:'100%',paddingLeft:38}} disabled={locked} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Student name, GR / roll, or father name" /></label>
        </div>

        {error && <div role="alert" style={{padding:'13px 16px',border:'1px solid rgba(230,76,82,.4)',borderRadius:11,color:C.red,fontWeight:700}}>{error}</div>}
        {notice && <div role="status" style={{padding:'13px 16px',border:'1px solid rgba(36,153,109,.35)',borderRadius:11,color:C.green,fontWeight:700}}>{notice}</div>}

        <div className="super-module-card" style={{...card,display:'grid',gap:14}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div><h2 style={{...sectionHeader,fontSize:19}}>03 · Saved Marks Register</h2><p style={{color:C.muted,fontSize:12,marginTop:4}}>{exam?.name || 'Select exam'} · {exam?.session || 'Select academic session'}</p></div>
            <div style={{display:'flex',flexWrap:'wrap',gap:10,color:C.silver,fontSize:12,fontWeight:800}}>
              <span>{totals.students} students</span><span>{totals.records} saved subjects</span><span>{totals.entered} scored</span><span>{totals.pending} pending</span>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,color:C.muted,fontSize:12}}>
            <ShieldCheck size={16}/> Changes require re-reading the server before saving. Only one existing score is submitted per correction.
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',minWidth:1080,borderCollapse:'collapse',fontSize:13}}>
              <thead><tr style={{background:'rgba(80,140,180,.13)',textAlign:'left'}}>{subjectColumns.map(v=><th key={v} style={{...cellStyle,whiteSpace:'nowrap',fontWeight:800}}>{v}</th>)}</tr></thead>
              <tbody>
                {displayRows.map((row,i)=>{
                  const info=registerScoreInfo(row,exam)
                  const key=registerRowKey(row)
                  const isEditing=editing?.key===key
                  const group=`${row.student_class ?? row.class ?? ''}::${row.student_section ?? row.section ?? ''}`
                  const previous=displayRows[i-1]
                  const previousGroup=previous ? `${previous.student_class ?? previous.class ?? ''}::${previous.student_section ?? previous.section ?? ''}` : ''
                  const showGroup=sortBy==='class' && group!==previousGroup
                  const controls=isEditing ? (
                    <div style={{display:'flex',gap:5}}>
                      <button type="button" aria-label="Save Correction" title="Save and verify correction" disabled={saving || !!editValidation?.error} style={{...btnPrimary,padding:'7px 10px',minHeight:0}} onClick={saveCorrection}><Save size={14}/>{saving?'Saving…':'Save'}</button>
                      <button type="button" aria-label="Cancel Edit" style={{...btnSecondary,padding:'7px 9px',minHeight:0}} disabled={saving} onClick={()=>{setEditing(null);setError('')}}><X size={14}/></button>
                    </div>
                  ):<button type="button" aria-label={`Edit ${row.name ?? row.student_name} ${row.subject}`} style={{...btnSecondary,padding:'7px 10px',minHeight:0,whiteSpace:'nowrap'}} disabled={locked || loading || info.score===null} onClick={()=>startEditing(row)}><Pencil size={13}/> Edit</button>
                  return <Fragment key={key}>{showGroup && <tr><td colSpan={12} style={{padding:'9px 11px',fontWeight:850,background:'rgba(78,147,190,.10)',color:C.silver}}>Class {row.student_class ?? row.class ?? '—'} · Section {row.student_section ?? row.section ?? '—'}</td></tr>}
                    <tr key={key} style={{background:isEditing?'rgba(45,125,199,.09)':undefined}}>
                      <td style={cellStyle}>{i+1}</td><td style={cellStyle}>{row.gr_number || row.roll_number || '—'}</td><td style={{...cellStyle,fontWeight:750}}>{row.name ?? row.student_name}</td><td style={cellStyle}>{row.father_name||'—'}</td><td style={cellStyle}>{row.student_class ?? row.class ?? '—'}</td><td style={cellStyle}>{row.student_section ?? row.section ?? '—'}</td><td style={cellStyle}>{row.subject}</td>
                      <td style={{...cellStyle,minWidth:isEditing?142:70}}>
                        {isEditing ? <div><input aria-label={`Correct marks for ${row.name ?? row.student_name} ${row.subject}`} inputMode="decimal" value={editing.value} onChange={e=>setEditing(old=>({...old,value:e.target.value}))} disabled={saving} style={{...input,width:92,padding:8,fontWeight:850,border:editValidation?.error?'1px solid #d64b59':undefined}}/><div style={{fontSize:10,color:C.muted,marginTop:3}}>Previous: {editing.original.marks_obtained}</div>{editValidation?.error && <div style={{color:C.red,fontSize:10,marginTop:2,maxWidth:225}}>{editValidation.error}</div>}</div> : <strong>{info.score===null?'—':info.score}</strong>}
                      </td>
                      <td style={cellStyle}>{info.maximum??'—'}</td><td style={cellStyle}>{info.pass??'—'}</td><td style={cellStyle}><span style={{fontWeight:700,color:info.status==='FAIL'?C.red:info.status==='PASS'?C.green:C.muted}}>{info.status}</span></td>
                      <td style={cellStyle}>{controls}</td>
                    </tr></Fragment>
                })}
              </tbody>
            </table>
            {!loading && displayRows.length===0 && <div style={{padding:28,textAlign:'center',color:C.muted}}>No saved marks match this session and cohort. Missing student records are not treated as zero.</div>}
            {loading && <div style={{padding:24,textAlign:'center',color:C.muted}}>Loading saved marks from the authenticated server…</div>}
          </div>
          <p style={{fontSize:12,color:C.muted}}>04 · Edit one saved score → Save Correction → server recheck → reload confirmation, or print the filtered list. Class, section, subject, total marks and grades cannot be edited here. Publication status is unchanged.</p>
        </div>
      </div>
    </div>
  )
}

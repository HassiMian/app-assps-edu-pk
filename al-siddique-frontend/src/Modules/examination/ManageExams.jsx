import { useState, useEffect } from 'react'
import { CheckCircle2, Database, Plus, RefreshCw } from 'lucide-react'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from '../moduleStyles'
import { useAcademicStore } from '../../services/useAcademicStore'

const EXAM_TYPES = ['Term Exam', 'Assessment', 'Quiz', 'Annual Exam', 'Monthly Test']
const SESSIONS = ['2026-2027', '2025-2026', '2024-2025']
const emptyForm = { name: '', type: EXAM_TYPES[0], class: 'All Classes', session: SESSIONS[0] }

function typeLabel(value) {
 if (value === 'TE') return 'Term Exam'
 if (value === 'AS') return 'Assessment'
 return value || 'Term Exam'
}

function classLabel(value) {
 return value === 'All Classes' ? value : value
}

function normalizeExam(exam) {
 return {
 ...exam,
 type: typeLabel(exam.type),
 class: exam.class || 'All Classes',
 session: exam.session || SESSIONS[0],
 }
}

export default function ManageExams() {
 const { classNames } = useAcademicStore()
 const CLASS_OPTIONS = ['All Classes', ...classNames]
 const [exams, setExams] = useState([])
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [message, setMessage] = useState('')
 const [form, setForm] = useState(emptyForm)
 const [syncingOfficial, setSyncingOfficial] = useState(false)
 const [setupSummary, setSetupSummary] = useState({})

 const load = async () => {
 setLoading(true)
 setMessage('')
 try {
 const res = await api.get('/api/exams')
 const list = (res.data.data || []).map(normalizeExam)
 setExams(list)
 const summaries = {}
 await Promise.all(list.map(async exam => {
   try {
     const setup = await api.get(`/api/exams/${exam.id}/setup`)
     const data = setup.data?.data || {}
     summaries[exam.id] = {
       enrollments: (data.enrollments || []).length,
       subjects: (data.subjects || []).length,
     }
   } catch {
     summaries[exam.id] = { enrollments:0, subjects:0 }
   }
 }))
 setSetupSummary(summaries)
 } catch {
 setExams([])
 setMessage('Refresh failed. Please check the backend connection.')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 load()
 }, [])

 const set = (key) => (event) => setForm(prev => ({ ...prev, [key]: event.target.value }))

 const addExam = async (event) => {
 event.preventDefault()
 if (!form.name.trim()) return
 setSaving(true)
 setMessage('')
 
 let resolvedType = form.type
 if (form.type === 'Term Exam') resolvedType = 'TE'
 else if (form.type === 'Assessment') resolvedType = 'AS'
 
 try {
 await api.post('/api/exams', {
 name: form.name.trim(),
 type: resolvedType,
 class: form.class,
 session: form.session,
 total_marks: 100,
 pass_marks: 33,
 })
 setForm(emptyForm)
 setMessage('Exam added successfully.')
 await load()
 setTimeout(() => setMessage(''), 3000)
 } catch (err) {
 setMessage(err.response?.data?.message || 'Failed to add exam.')
 } finally {
 setSaving(false)
 }
 }

 const syncOfficialFirstTerm = async () => {
 setSyncingOfficial(true)
 setMessage('')
 try {
   const response = await api.post('/api/exams/official-first-term/sync')
   const data = response.data?.data || {}
   setMessage(`First Term Exam wired successfully: ${data.officialPaperCount ?? 'official'} date-sheet papers, ${data.enrolledClassSections || 0} active class/section(s).`)
   await load()
 } catch (err) {
   setMessage(err.response?.data?.message || 'Failed to synchronize official First Term Exam.')
 } finally {
   setSyncingOfficial(false)
 }
 }

 const currentSessionCount = exams.filter(exam => (exam.session || SESSIONS[0]) === form.session).length

 return (
 <div style={{ minHeight: '100%', padding: 24, background: '#071e34', color: C.silver }}>
 <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 24 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
 <div>
 <h1 style={sectionHeader}>Examination & Assessment</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Create exams by session, class, and type.</p>
 </div>
 <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
 <button type="button" style={{ ...btnPrimary, display:'inline-flex', alignItems:'center', gap:8 }} onClick={syncOfficialFirstTerm} disabled={syncingOfficial}>
 <Database size={16} /> {syncingOfficial ? 'Synchronizing...' : 'Sync Official First Term 2026-27'}
 </button>
 <button type="button" style={btnSecondary} onClick={load} disabled={loading}>
 <RefreshCw size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
 {loading ? 'Refreshing...' : 'Refresh Data'}
 </button>
 </div>
 </div>

 <div className="super-module-card" style={{ ...card, borderColor:'rgba(200,153,26,0.28)', background:'rgba(200,153,26,0.06)' }}>
 <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
 <CheckCircle2 size={19} color={C.gold} style={{ marginTop:2, flexShrink:0 }} />
 <div>
 <div style={{ color:C.gold, fontWeight:900 }}>Canonical First Term workflow</div>
 <div style={{ color:C.muted, fontSize:12, marginTop:4, lineHeight:1.6 }}>The sync action preserves the existing First Term exam, enrolls only active real class/sections, and attaches exactly the official date-sheet subjects. Marks Entry and Result Cards then use the same exam ID.</div>
 </div>
 </div>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
 <div className="super-module-card" style={card}>
 <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Total Scheduled</div>
 <div style={{ color: C.gold, fontSize: 32, fontWeight: 900 }}>{exams.length}</div>
 <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>All sessions</div>
 </div>
 <div className="super-module-card" style={card}>
 <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Selected Session</div>
 <div style={{ color: C.gold, fontSize: 24, fontWeight: 900 }}>{form.session}</div>
 <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>{currentSessionCount} exam(s) in this session</div>
 </div>
 <div className="super-module-card" style={card}>
 <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Session Load</div>
 <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 58 }}>
 {SESSIONS.map(session => {
 const count = exams.filter(exam => (exam.session || SESSIONS[0]) === session).length
 const max = Math.max(...SESSIONS.map(item => exams.filter(exam => (exam.session || SESSIONS[0]) === item).length), 1)
 return (
 <div key={session} style={{ flex: 1, display: 'grid', gap: 6, alignItems: 'end' }}>
 <div style={{ height: `${Math.max(8, (count / max) * 58)}px`, background: count ? `linear-gradient(to top, #0A84FF, ${C.gold})` : 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
 <div style={{ color: C.muted, fontSize: 10, textAlign: 'center' }}>{session.slice(2)}</div>
 </div>
 )
 })}
 </div>
 </div>
 </div>

 <form className="super-module-card" onSubmit={addExam} style={{ ...card, display: 'grid', gap: 18 }}>
 <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 16 }}>
 <div>
 <label style={labelStyle}>Exam Name</label>
 <input style={input} value={form.name} onChange={set('name')} placeholder="e.g. First Term 2026" required />
 </div>
 <div>
 <label style={labelStyle}>Exam Type</label>
 <select style={select} value={form.type} onChange={set('type')}>
 {EXAM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Class</label>
 <select style={select} value={form.class} onChange={set('class')}>
 {CLASS_OPTIONS.map(item => <option key={item} value={item}>{classLabel(item)}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Session</label>
 <select style={select} value={form.session} onChange={set('session')}>
 {SESSIONS.map(session => <option key={session} value={session}>{session}</option>)}
 </select>
 </div>
 </div>
 <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
 <button type="submit" style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 8 }} disabled={saving}>
 <Plus size={16} />
 {saving ? 'Adding...' : 'Add Exam'}
 </button>
 {message && <span style={{ color: message.includes('failed') || message.includes('Failed') ? C.red : C.green, fontWeight: 700 }}>{message}</span>}
 </div>
 </form>

 <div className="super-module-card" style={{ ...card, overflowX: 'auto' }}>
 {loading ? (
 <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Loading exams...</div>
 ) : (
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 {['Exam', 'Type', 'Class Scope', 'Session', 'Wiring'].map(label => (
 <th key={label} style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.06 }}>{label}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {exams.map((exam, i) => (
 <tr key={exam.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding: '14px 16px', color: C.gold, fontWeight: 800 }}>{exam.name}</td>
 <td style={{ padding: '14px 16px', color: C.silver }}>{exam.type || 'Term Exam'}</td>
 <td style={{ padding: '14px 16px' }}>{classLabel(exam.class || 'All Classes')}</td>
 <td style={{ padding: '14px 16px' }}>{exam.session || SESSIONS[0]}</td>
 <td style={{ padding:'14px 16px' }}>
   {setupSummary[exam.id]?.enrollments ? (
     <div><strong style={{ color:C.green }}>{setupSummary[exam.id].enrollments} class/section(s)</strong><div style={{ color:C.muted, fontSize:10, marginTop:2 }}>{setupSummary[exam.id].subjects} scheduled subject rows</div></div>
   ) : <span style={{ color:C.muted }}>Legacy / not wired</span>}
 </td>
 </tr>
 ))}
 {exams.length === 0 && (
 <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: C.muted }}>No exams yet.</td></tr>
 )}
 </tbody>
 </table>
 )}
 </div>
 </div>
 </div>
 )
}

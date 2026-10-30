import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from '../moduleStyles'
import { useAcademicStore } from '../../services/useAcademicStore'
import { resolveExamSession, validateExamCreation, nextAssessmentName } from './examCreationModel'

const EXAM_TYPES = ['Term Exam', 'Assessment', 'Quiz', 'Annual Exam', 'Monthly Test']
const emptyForm = { name: '', type: EXAM_TYPES[0], class: 'All Classes', session: '', total_marks: '', pass_marks: '' }

function typeLabel(value) {
 if (value === 'TE') return 'Term Exam'
 if (value === 'AS') return 'Assessment'
 return value || ''
}

function classLabel(value) {
 return value === 'All Classes' ? value : value
}

function normalizeExam(exam) {
 return {
 ...exam,
 type: typeLabel(exam.type),
 class: exam.class || 'All Classes',
 session: exam.session || '',
 }
}

export default function ManageExams() {
 const navigate = useNavigate()
 const { classNames, sessionStart, sessionEnd } = useAcademicStore()
 const activeSession = sessionStart && sessionEnd ? `${String(sessionStart).slice(0,4)}-${String(sessionEnd).slice(0,4)}` : ''
 const CLASS_OPTIONS = ['All Classes', ...classNames]
 const [exams, setExams] = useState([])
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [message, setMessage] = useState('')
 const [form, setForm] = useState(() => ({ ...emptyForm, session: activeSession }))

 const load = async () => {
 setLoading(true)
 setMessage('')
 try {
 const res = await api.get('/api/exams')
 const saved = (res.data.data || []).map(normalizeExam)
 setExams(saved)
 return true
 } catch {
 setMessage('Refresh failed. Existing loaded exams were preserved; please check the backend connection.')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 load()
 }, [])

 const set = (key) => (event) => {
 const value = event.target.value
 setForm(prev => ({ ...prev, [key]: value }))
 if (message) setMessage('')
 }

 const effectiveSession = resolveExamSession(form.session, activeSession, exams)
 const addExam = async (event) => {
 event.preventDefault()
 const draft = { ...form, session: effectiveSession }
 const error = validateExamCreation(draft)
 if (error) {
 setMessage(error)
 return
 }
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
 session: effectiveSession,
 total_marks: Number(form.total_marks),
 pass_marks: Number(form.pass_marks),
 })
 setForm(prev => ({ ...prev, name: nextAssessmentName(form.name), session: effectiveSession }))
 const refreshed = await load()
 setMessage(refreshed
   ? `${form.name.trim()} added. Select Enter Marks to record scores.`
   : `${form.name.trim()} was created, but the exam list could not refresh. Please refresh before adding it again.`)
 } catch (err) {
 setMessage(err.response?.data?.message || 'Failed to add exam.')
 } finally {
 setSaving(false)
 }
 }

 const sessionOptions = [...new Set([activeSession, ...exams.map(exam => exam.session)].filter(Boolean))]
 const currentSessionCount = exams.filter(exam => exam.session === effectiveSession).length

 return (
 <div style={{ minHeight: '100%', padding: 24, background: 'var(--apex-shell-gradient)', color: C.silver }}>
 <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 24 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
 <div>
 <h1 style={sectionHeader}>Examination & Assessment</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Create exams by session, class, and type.</p>
 </div>
 <button type="button" style={btnSecondary} onClick={load} disabled={loading}>
 <RefreshCw size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
 {loading ? 'Refreshing...' : 'Refresh Data'}
 </button>
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
 {sessionOptions.map(session => {
 const count = exams.filter(exam => exam.session === session).length
 const max = Math.max(...sessionOptions.map(item => exams.filter(exam => exam.session === item).length), 1)
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
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
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
 <select style={select} value={effectiveSession} onChange={set('session')} required>
 <option value="" disabled>Select academic session</option>
 {sessionOptions.map(session => <option key={session} value={session}>{session}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Total Marks</label>
 <input type="number" min="1" step="1" style={input} value={form.total_marks} onChange={set('total_marks')} required />
 </div>
 <div>
 <label style={labelStyle}>Passing Marks</label>
 <input type="number" min="0" step="1" max={form.total_marks || undefined} style={input} value={form.pass_marks} onChange={set('pass_marks')} required />
 </div>
 </div>
 <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
 <button type="submit" style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 8 }} disabled={saving}>
 <Plus size={16} />
 {saving ? 'Adding...' : 'Add Exam'}
 </button>
 {message && <span role="status" style={{ color: message.includes(' added. ') ? C.green : C.red, fontWeight: 700 }}>{message}</span>}
 </div>
 </form>

 <div className="super-module-card" style={{ ...card, overflowX: 'auto' }}>
 {loading ? (
 <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Loading exams...</div>
 ) : message.startsWith('Refresh failed') && exams.length === 0 ? (
 <div style={{ padding: 32, textAlign: 'center', color: C.red }}>{message}</div>
 ) : (
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 {['Exam', 'Type', 'Class', 'Session', 'Action'].map(label => (
 <th key={label} style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.06 }}>{label}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {exams.map((exam, i) => (
 <tr key={exam.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--apex-bg-subtle)' }}>
 <td style={{ padding: '14px 16px', color: C.gold, fontWeight: 800 }}>{exam.name}</td>
 <td style={{ padding: '14px 16px', color: C.silver }}>{exam.type || '—'}</td>
 <td style={{ padding: '14px 16px' }}>{classLabel(exam.class || 'All Classes')}</td>
 <td style={{ padding: '14px 16px' }}>{exam.session || '—'}</td>
 <td style={{ padding: '14px 16px' }}><button type="button" style={btnSecondary} onClick={() => navigate(`/exams/marks?exam_id=${encodeURIComponent(exam.id)}`)}>Enter Marks</button></td>
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

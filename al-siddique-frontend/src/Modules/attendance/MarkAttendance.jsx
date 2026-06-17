import { useEffect, useMemo, useState } from 'react'
import { useAcademicStore } from '../../services/useAcademicStore'
import {
 Calendar,
 CheckCircle2,
 Clock3,
 GraduationCap,
 Loader2,
 Save,
 Search,
 ShieldCheck,
 UserCheck,
 UserMinus,
 UserX,
 Users,
 Zap,
} from 'lucide-react'
import api from '../../services/api'

// Removed hardcoded CLASSES and SECTIONS

const C = {
 gold: '#C8991A',
 goldLight: '#e8b420',
 silver: '#C0C8D8',
 muted: '#8892A4',
 green: '#30D158',
 red: '#FF375F',
 amber: '#FF9F0A',
 blue: '#0A84FF',
 cyan: '#64D2FF',
}

const glass = {
 background: 'rgba(11,44,77,0.92)',
 backdropFilter: 'blur(20px)',
 WebkitBackdropFilter: 'blur(20px)',
 border: '1px solid rgba(148,163,184,0.18)',
 borderRadius: 20,
 boxShadow: '0 22px 50px rgba(0,0,0,0.32)',
}

const fieldStyle = {
 width: '100%',
 minHeight: 58,
 padding: '0 16px',
 borderRadius: 20,
 background: 'rgba(7,22,40,0.92)',
 border: '1px solid rgba(148,163,184,0.18)',
 color: C.silver,
 fontSize: 15,
 fontWeight: 700,
 outline: 'none',
 boxSizing: 'border-box',
}

const statusMeta = {
 present: {
 label: 'Present',
 icon: UserCheck,
 color: C.green,
 bg: 'rgba(48,209,88,0.1)',
 border: 'rgba(48,209,88,0.32)',
 grad: 'linear-gradient(135deg,#30D158,#1A8C3A)',
 },
 absent: {
 label: 'Absent',
 icon: UserX,
 color: C.red,
 bg: 'rgba(255,55,95,0.1)',
 border: 'rgba(255,55,95,0.32)',
 grad: 'linear-gradient(135deg,#FF375F,#C01030)',
 },
 late: {
 label: 'Late',
 icon: Clock3,
 color: C.amber,
 bg: 'rgba(255,159,10,0.1)',
 border: 'rgba(255,159,10,0.32)',
 grad: 'linear-gradient(135deg,#FF9F0A,#C07000)',
 },
 leave: {
 label: 'Leave',
 icon: UserMinus,
 color: C.blue,
 bg: 'rgba(10,132,255,0.1)',
 border: 'rgba(10,132,255,0.32)',
 grad: 'linear-gradient(135deg,#0A84FF,#0356A8)',
 },
}

function Panel({ children, accent = C.blue, style = {}, className = '' }) {
 return (
 <div className={`att-panel att-reveal ${className}`} style={{ ...glass, '--accent': accent, ...style }}>
 <div className="att-panel-glow" style={{ background: `radial-gradient(circle,${accent}22,transparent 70%)` }} />
 {children}
 </div>
 )
}

function StatCard({ state, value, delay }) {
 const meta = statusMeta[state]
 const Icon = meta.icon

 return (
 <div
 className="att-stat-card att-reveal"
 style={{
 ...glass,
 '--accent': meta.color,
 '--glow': `${meta.color}55`,
 animationDelay: delay,
 padding: 24,
 position: 'relative',
 overflow: 'hidden',
 border: `1px solid ${meta.border}`,
 }}
 >
 <div className="att-glow" style={{ background: `radial-gradient(circle,${meta.color}35,transparent 70%)` }} />
 <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
 <div>
 <div style={{ color: meta.color, fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{value}</div>
 <div style={{ color: C.muted, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 14 }}>
 {meta.label}
 </div>
 </div>
 <div style={{ width: 52, height: 52, borderRadius: 20, background: meta.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 22px ${meta.color}55` }}>
 <Icon size={24} color="white" />
 </div>
 </div>
 </div>
 )
}

export default function MarkAttendance() {
 const { classNames: CLASSES, allSections: SECTIONS, sectionsForClass } = useAcademicStore()
 const [selectedClass, setSelectedClass] = useState(CLASSES[0] || 'Starter')
 const [selectedSection, setSelectedSection] = useState('Blue')
 const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
 const [students, setStudents] = useState([])
 const [attendance, setAttendance] = useState({})
 const [loading, setLoading] = useState(false)
 const [saving, setSaving] = useState(false)
 const [message, setMessage] = useState('')

 const loadStudents = () => {
 setLoading(true)
 setMessage('')
 api.get('/api/students', { params: { class: selectedClass, section: selectedSection } })
 .then((res) => {
 const list = res.data.data || []
 setStudents(list)
 setAttendance(list.reduce((acc, student) => ({ ...acc, [student.id]: 'present' }), {}))
 })
 .catch(() => {
 setStudents([])
 setAttendance({})
 })
 .finally(() => setLoading(false))
 }

 useEffect(() => {
 loadStudents()
 }, [])

 useEffect(() => {
 const available = sectionsForClass(selectedClass)
 if (available.length && !available.includes(selectedSection)) {
 setSelectedSection(available[0])
 return
 }
 if (selectedClass) loadStudents()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [selectedClass, selectedSection])

 const updateStatus = (id, status) => setAttendance((prev) => ({ ...prev, [id]: status }))

 const setAll = (status) => {
 setAttendance(students.reduce((acc, student) => ({ ...acc, [student.id]: status }), {}))
 }

 const saveAttendance = async () => {
 setSaving(true)
 try {
 const records = students.map((student) => ({ student_id: student.id, date, status: attendance[student.id] || 'present' }))
 await api.post('/api/attendance/mark', { records })
 setMessage('Attendance saved successfully.')
 setTimeout(() => setMessage(''), 3000)
 } catch {
 setMessage('Failed to save. Try again.')
 } finally {
 setSaving(false)
 }
 }

 const counts = useMemo(() => ({
 present: Object.values(attendance).filter((value) => value === 'present').length,
 absent: Object.values(attendance).filter((value) => value === 'absent').length,
 late: Object.values(attendance).filter((value) => value === 'late').length,
 leave: Object.values(attendance).filter((value) => value === 'leave').length,
 }), [attendance])

 const total = students.length
 const marked = Object.keys(attendance).length
 const attendanceRate = total > 0 ? Math.round((counts.present / total) * 100) : 0

 return (
 <div className="att-shell">
 <style>{`
 .att-shell {
 min-height: 100%;
 color: #f8fafc;
 padding: 24px;
 font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
 }
 .att-inner {
 max-width: 1400px;
 margin: 0 auto;
 display: grid;
 gap: 24px;
 }
 .att-reveal {
 animation: attFadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
 }
 .att-panel {
 position: relative;
 overflow: hidden;
 padding: 28px 32px;
 transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.25s ease;
 }
 .att-panel:hover {
 transform: translateY(-3px);
 border-color: color-mix(in srgb, var(--accent) 36%, transparent) !important;
 box-shadow: 0 22px 48px rgba(0,0,0,0.36), 0 0 26px color-mix(in srgb, var(--accent) 16%, transparent) !important;
 }
 .att-panel-glow {
 position: absolute;
 top: -52px;
 right: -38px;
 width: 210px;
 height: 210px;
 border-radius: 999px;
 pointer-events: none;
 }
 .att-glow {
 position: absolute;
 top: -36px;
 right: -36px;
 width: 136px;
 height: 136px;
 border-radius: 999px;
 pointer-events: none;
 }
 .att-stat-grid {
 display: grid;
 grid-template-columns: repeat(4, minmax(0, 1fr));
 gap: 20px;
 perspective: 1000px;
 }
 .att-stat-card {
 transition: transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.35s ease, border-color 0.25s ease;
 }
 .att-stat-card:hover {
 transform: translateY(-8px) rotateX(-5deg) scale(1.02);
 box-shadow: 0 28px 56px var(--glow), 0 10px 28px rgba(0,0,0,0.5) !important;
 }
 .att-filter-grid {
 display: grid;
 grid-template-columns: minmax(170px, 1fr) minmax(150px, 1fr) minmax(180px, 1fr) auto;
 gap: 16px;
 align-items: end;
 position: relative;
 z-index: 1;
 }
 .att-label {
 display: block;
 color: #8892A4;
 font-size: 11px;
 font-weight: 900;
 text-transform: uppercase;
 letter-spacing: 0.08em;
 margin: 0 0 8px;
 }
 .att-primary,
 .att-soft-btn,
 .att-status-btn {
 transition: transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.28s ease, border-color 0.2s ease, background 0.2s ease;
 }
 .att-primary:hover,
 .att-soft-btn:hover,
 .att-status-btn:hover {
 transform: translateY(-3px);
 }
 .att-primary {
 min-height: 58px;
 display: inline-flex;
 align-items: center;
 justify-content: center;
 gap: 10px;
 border: 0;
 border-radius: 16px;
 padding: 0 22px;
 color: #071e34;
 background: linear-gradient(135deg,#C8991A,#e8b420);
 box-shadow: 0 14px 30px rgba(200,153,26,0.22);
 cursor: pointer;
 font-weight: 900;
 font-size: 14px;
 white-space: nowrap;
 }
 .att-primary:disabled {
 cursor: not-allowed;
 opacity: 0.55;
 transform: none;
 }
 .att-soft-actions {
 display: flex;
 gap: 10px;
 flex-wrap: wrap;
 position: relative;
 z-index: 1;
 justify-content: flex-end;
 }
 .att-soft-btn {
 min-height: 48px;
 display: inline-flex;
 align-items: center;
 justify-content: center;
 gap: 8px;
 border-radius: 14px;
 padding: 0 18px;
 background: rgba(7,22,40,0.88);
 cursor: pointer;
 font-weight: 900;
 font-size: 13px;
 }
 .att-table-wrap {
 position: relative;
 z-index: 1;
 overflow-x: auto;
 }
 .att-table {
 width: 100%;
 border-collapse: separate;
 border-spacing: 0 10px;
 min-width: 760px;
 }
 .att-table th {
 padding: 0 20px 10px;
 text-align: left;
 color: #8892A4;
 font-size: 11px;
 text-transform: uppercase;
 letter-spacing: 0.08em;
 font-weight: 900;
 }
 .att-table td {
 padding: 16px 20px;
 background: rgba(7,30,52,0.36);
 border-top: 1px solid rgba(148,163,184,0.12);
 border-bottom: 1px solid rgba(148,163,184,0.12);
 }
 .att-table td:first-child {
 border-left: 1px solid rgba(148,163,184,0.12);
 border-radius: 16px 0 0 16px;
 }
 .att-table td:last-child {
 border-right: 1px solid rgba(148,163,184,0.12);
 border-radius: 0 16px 16px 0;
 }
 .att-row {
 transition: transform 0.25s ease, filter 0.25s ease;
 }
 .att-row:hover {
 transform: translateY(-2px);
 filter: brightness(1.08);
 }
 .att-status-pill {
 display: inline-flex;
 align-items: center;
 justify-content: center;
 min-width: 92px;
 padding: 8px 14px;
 border-radius: 999px;
 font-size: 13px;
 font-weight: 900;
 text-transform: capitalize;
 }
 .att-status-actions {
 display: flex;
 gap: 10px;
 flex-wrap: wrap;
 }
 .att-status-btn {
 min-width: 92px;
 border-radius: 14px;
 padding: 11px 14px;
 font-size: 13px;
 font-weight: 900;
 cursor: pointer;
 background: rgba(7,30,52,0.32);
 }
 @keyframes attFadeUp {
 from { opacity: 0; transform: translateY(22px) rotateX(8deg); }
 to { opacity: 1; transform: translateY(0) rotateX(0); }
 }
 @keyframes attPulseGlow {
 0%, 100% { opacity: 0.6; transform: scale(1); }
 50% { opacity: 1; transform: scale(1.18); }
 }
 @keyframes attSpin {
 to { transform: rotate(360deg); }
 }
 @media (max-width: 1100px) {
 .att-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
 .att-filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
 }
 @media (max-width: 760px) {
 .att-shell { padding: 16px; }
 .att-panel { padding: 22px; }
 .att-stat-grid, .att-filter-grid { grid-template-columns: 1fr; }
 .att-soft-actions { justify-content: stretch; }
 .att-soft-btn, .att-primary { width: 100%; }
 }
 `}</style>

 <div className="att-inner">
 <Panel accent={C.gold} style={{ background: 'linear-gradient(135deg,rgba(15,23,42,0.88),rgba(15,23,42,0.54))' }}>
 <div style={{ position: 'absolute', bottom: -46, left: -24, width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle,rgba(10,132,255,0.14),transparent 70%)', pointerEvents: 'none' }} />
 <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
 <div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
 <span style={{ width: 8, height: 8, borderRadius: 999, background: C.green, boxShadow: `0 0 8px ${C.green}`, animation: 'attPulseGlow 2s ease-in-out infinite' }} />
 <span style={{ color: C.green, fontSize: 11, fontWeight: 900, letterSpacing: '0.1em' }}>ATTENDANCE LIVE</span>
 </div>
 <h1 style={{ color: C.gold, fontSize: 30, fontWeight: 950, margin: '0 0 5px', letterSpacing: -0.5 }}>Mark Attendance</h1>
 <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Toggle student status with a polished live attendance console.</p>
 </div>
 <button className="att-primary" onClick={saveAttendance} disabled={saving || !students.length}>
 {saving ? <Loader2 size={18} style={{ animation: 'attSpin 0.9s linear infinite' }} /> : <Save size={18} />}
 {saving ? 'Saving...' : 'Save Attendance'}
 </button>
 </div>
 </Panel>

 <Panel accent={C.blue} style={{ padding: 24 }}>
 <div className="att-filter-grid">
 <div>
 <label className="att-label">Class</label>
 <select style={fieldStyle} value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>
 {CLASSES.map((value) => <option key={value} value={value}>{value}</option>)}
 </select>
 </div>
 <div>
 <label className="att-label">Section</label>
 <select style={fieldStyle} value={selectedSection} onChange={(event) => setSelectedSection(event.target.value)}>
 {sectionsForClass(selectedClass).map((value) => <option key={value} value={value}>{value}</option>)}
 </select>
 </div>
 <div>
 <label className="att-label">Date</label>
 <input type="date" style={fieldStyle} value={date} onChange={(event) => setDate(event.target.value)} />
 </div>
 <button type="button" onClick={loadStudents} disabled={loading} className="att-primary">
 {loading ? <Loader2 size={18} style={{ animation: 'attSpin 0.9s linear infinite' }} /> : <Search size={18} />}
 {loading ? 'Loading...' : 'Load'}
 </button>
 </div>
 </Panel>

 <div className="att-stat-grid">
 <StatCard state="present" value={counts.present} delay="0ms" />
 <StatCard state="absent" value={counts.absent} delay="90ms" />
 <StatCard state="late" value={counts.late} delay="180ms" />
 <StatCard state="leave" value={counts.leave} delay="270ms" />
 </div>

 <Panel accent={C.cyan} style={{ padding: 24 }}>
 <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center' }}>
 <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
 <div style={{ width: 52, height: 52, borderRadius: 20, background: 'linear-gradient(135deg,#0A84FF,#64D2FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(10,132,255,0.4)' }}>
 <ShieldCheck size={24} color="white" />
 </div>
 <div>
 <h2 style={{ color: '#f8fafc', fontSize: 18, fontWeight: 900, margin: 0 }}>{selectedClass} - Section {selectedSection}</h2>
 <p style={{ color: C.muted, margin: '6px 0 0', fontSize: 13 }}>
 {marked} marked out of {total} students. Current presence rate is {attendanceRate}%.
 </p>
 </div>
 </div>
 <div className="att-soft-actions">
 <button
 type="button"
 onClick={() => setAll('present')}
 className="att-soft-btn"
 style={{ color: C.green, border: `1px solid ${statusMeta.present.border}` }}
 >
 <UserCheck size={16} /> All Present
 </button>
 <button
 type="button"
 onClick={() => setAll('leave')}
 className="att-soft-btn"
 style={{ color: C.blue, border: `1px solid ${statusMeta.leave.border}` }}
 >
 <UserMinus size={16} /> All Leave
 </button>
 <button
 type="button"
 onClick={() => setAll('absent')}
 className="att-soft-btn"
 style={{ color: C.red, border: `1px solid ${statusMeta.absent.border}` }}
 >
 <UserX size={16} /> All Absent
 </button>
 </div>
 </div>
 </Panel>

 {message && (
 <Panel accent={message.startsWith('Failed') ? C.red : C.green} style={{ padding: '16px 20px' }}>
 <div style={{ position: 'relative', zIndex: 1, color: message.startsWith('Failed') ? C.red : C.green, fontWeight: 900 }}>
 {message}
 </div>
 </Panel>
 )}

 <Panel accent={C.gold} style={{ padding: 30 }}>
 <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
 <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg,#C8991A,#9A7210)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
 <GraduationCap size={20} color="white" />
 </div>
 <div>
 <h3 style={{ color: '#f8fafc', fontSize: 18, fontWeight: 900, margin: 0 }}>Student Roster</h3>
 <p style={{ color: C.muted, fontSize: 12, margin: '4px 0 0' }}>{date}</p>
 </div>
 </div>
 <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.gold, fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
 <Zap size={15} /> Quick Status Mode
 </div>
 </div>

 <div className="att-table-wrap">
 {loading ? (
 <div style={{ padding: 50, textAlign: 'center', color: C.muted, display: 'grid', gap: 14, justifyItems: 'center' }}>
 <Loader2 size={30} color={C.gold} style={{ animation: 'attSpin 0.9s linear infinite' }} />
 Loading students...
 </div>
 ) : (
 <table className="att-table">
 <thead>
 <tr>
 {['Student', 'GR No', 'Status', 'Actions'].map((heading) => (
 <th key={heading}>{heading}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {students.map((student) => {
 const status = attendance[student.id] || 'present'
 const meta = statusMeta[status]
 const StatusIcon = meta.icon

 return (
 <tr key={student.id} className="att-row">
 <td>
 <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
 <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(10,132,255,0.14)', color: C.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
 {(student.name || 'S').slice(0, 1).toUpperCase()}
 </div>
 <div>
 <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 800 }}>{student.name || 'Unnamed Student'}</div>
 <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{student.father_name || student.parent_name || 'Student profile'}</div>
 </div>
 </div>
 </td>
 <td style={{ color: C.gold, fontWeight: 900 }}>{student.gr_number || student.gr || '-'}</td>
 <td>
 <span className="att-status-pill" style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
 <StatusIcon size={14} style={{ marginRight: 6 }} /> {status}
 </span>
 </td>
 <td>
 <div className="att-status-actions">
 {Object.entries(statusMeta).map(([key, item]) => (
 <button
 key={key}
 type="button"
 onClick={() => updateStatus(student.id, key)}
 className="att-status-btn"
 style={{
 color: item.color,
 border: `1px solid ${status === key ? item.color : 'rgba(148,163,184,0.16)'}`,
 background: status === key ? item.bg : 'rgba(7,30,52,0.32)',
 boxShadow: status === key ? `0 8px 22px ${item.color}22` : 'none',
 }}
 >
 {item.label}
 </button>
 ))}
 </div>
 </td>
 </tr>
 )
 })}
 {students.length === 0 && !loading && (
 <tr>
 <td colSpan={4} style={{ textAlign: 'center', color: C.muted, padding: 34 }}>
 <Users size={26} style={{ display: 'block', margin: '0 auto 10px', color: C.gold }} />
 No students in this class or section.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 )}
 </div>
 </Panel>

 <Panel accent={C.green} style={{ padding: 22 }}>
 <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12, color: C.muted, fontSize: 13, fontWeight: 700 }}>
 <Calendar size={17} color={C.green} />
 Attendance defaults to present when a class is loaded, then updates instantly as you mark each student.
 </div>
 </Panel>
 </div>
 </div>
 )
}

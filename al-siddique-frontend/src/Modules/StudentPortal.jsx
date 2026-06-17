import { useState, useEffect } from 'react'
import Portal from '../components/Portal'
import { useAuth } from '../context/AuthContext'
import { useAcademicStore } from '../services/useAcademicStore'
import api from '../services/api'
import { C, card, btnPrimary, btnSecondary, input, labelStyle, sectionHeader } from './moduleStyles'
import {
 BookOpen, TrendingUp, Award, CheckCircle, Eye, X,
 CreditCard, Calendar, BarChart2, RefreshCw, AlertCircle, Send,
} from 'lucide-react'

const SECTIONS = ['Dashboard', 'My Exams', 'Attendance', 'Fee Status', 'Messages']

// Messages not yet stored in SaaS backend — kept as local demo
const INIT_MESSAGES = [
 { id: 1, from: 'School Administration', subject: 'Welcome to the Student Portal', date: '2026-05-01', read: false, body: 'Welcome to Al Siddique Smart School Portal. You can view your exam results, attendance records, and fee status here.' },
 { id: 2, from: 'Principal', subject: 'Annual Sports Day Notice', date: '2026-05-02', read: true, body: 'Annual Sports Day will be held on 2026-05-20. All students must participate. Please wear your house colors.' },
]

//  Helpers 
function normalizeClass(v) { return String(v || '').replace(/^Class\s+/i, '').trim() }

function computeGrade(obtained, total) {
 const pct = total > 0 ? (obtained / total) * 100 : 0
 if (pct >= 90) return 'A+'
 if (pct >= 80) return 'A'
 if (pct >= 70) return 'B+'
 if (pct >= 60) return 'B'
 if (pct >= 50) return 'C'
 if (pct >= 40) return 'D'
 return 'F'
}

const gradeColor = g =>
 g === 'A+' ? '#30D158' : g === 'A' ? C.green : g === 'B+' ? C.gold :
 g === 'B' ? '#FF9F0A' : g === 'C' ? '#0A84FF' : '#FF375F'

function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}

//  Main Component 
export default function StudentPortal() {
 const { user } = useAuth()
 const { subjectsForClass } = useAcademicStore()

 const studentId = user?.entityId // numeric backend ID (used as student_id in SaaS records)
 const studentClass = normalizeClass(user?.class)
 const studentName = user?.name || 'Student'
 const studentDisplay = user?.class || '—'

 //  Real SaaS data 
 const [loading, setLoading] = useState(true)
 const [studentRecord, setStudentRecord] = useState(null) // full record from /api/students
 const [attRecords, setAttRecords] = useState([]) // raw { date, status }
 const [exams, setExams] = useState([]) // exams for this class
 const [results, setResults] = useState([]) // { examId, examName, examType, subject, obtained, total, grade }
 const [fees, setFees] = useState([]) // fee challans for this student
 const [error, setError] = useState('')

 //  Local-only state 
 const [messages, setMessages] = useState(INIT_MESSAGES)
 const [openMsg, setOpenMsg] = useState(null)
 const [notice, setNotice] = useState('')
 const [section, setSection] = useState('Dashboard')

 const unread = messages.filter(m => !m.read).length

 function flash(msg) { setNotice(msg); setTimeout(() => setNotice(''), 3000) }
 function readMsg(msg) {
 setOpenMsg(msg)
 setMessages(p => p.map(m => m.id === msg.id ? { ...m, read: true } : m))
 }

 //  Load real SaaS data 
 async function loadData() {
 setLoading(true)
 setError('')
 try {
 // 1. Find the student's numeric backend ID and GR number
 const studRes = await api.get('/api/students')
 const allStudents = studRes.data?.data || []
 const myRecord = allStudents.find(s =>
 String(s.id) === String(studentId) ||
 s.gr_number === studentId ||
 s.gr_number === user?.username
 )
 if (myRecord) setStudentRecord(myRecord)
 const numericId = myRecord?.id || studentId
 const grNumber = myRecord?.gr_number

 // 2. Attendance — read from demo localStorage (written by Attendance Module)
 const rawAtt = JSON.parse(getStorage()?.getItem('al_siddique_demo_attendance') || '[]')
 const myAtt = rawAtt.filter(a =>
 String(a.student_id) === String(numericId) ||
 (grNumber && String(a.student_id) === String(grNumber))
 )
 setAttRecords(myAtt)

 // 3. Exams for this class
 const examRes = await api.get('/api/exams')
 const allExams = (examRes.data?.data || [])
 const myExams = allExams.filter(e => {
 const ec = normalizeClass(e.class)
 return ec === studentClass || e.class === 'All Classes' || ec === ''
 })
 setExams(myExams)

 // 4. Results: for each exam, fetch marks filtered to this student
 const allResults = []
 await Promise.all(myExams.map(async (exam) => {
 try {
 const res = await api.get(`/api/exams/results/${exam.id}`)
 const rows = (res.data?.data || []).filter(r =>
 String(r.student_id) === String(numericId) ||
 (grNumber && String(r.student_id) === String(grNumber))
 )
 rows.forEach(r => allResults.push({
 examId: exam.id,
 examName: exam.name,
 examType: exam.type,
 subject: r.subject,
 obtained: Number(r.marks_obtained || 0),
 total: Number(r.total_marks || exam.total_marks || 100),
 grade: r.grade || computeGrade(Number(r.marks_obtained || 0), Number(r.total_marks || exam.total_marks || 100)),
 }))
 } catch {}
 }))
 setResults(allResults)

 // 5. Fee challans for this student
 const feeRes = await api.get('/api/fees')
 const allFees = feeRes.data?.data || []
 const myFees = allFees.filter(f =>
 String(f.student_id) === String(numericId) ||
 (grNumber && String(f.student_id) === String(grNumber))
 )
 setFees(myFees)

 } catch (err) {
 setError('Could not load your data. Please check your connection.')
 console.error('StudentPortal load error:', err)
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 loadData()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [studentId])

 //  Computed stats 
 const presentCount = attRecords.filter(a => a.status === 'present').length
 const attTotal = attRecords.length
 const attPct = attTotal > 0 ? Math.round((presentCount / attTotal) * 100) : null

 // Group results by subject (avg across exams)
 const subjectMap = {}
 results.forEach(r => {
 if (!subjectMap[r.subject]) subjectMap[r.subject] = []
 subjectMap[r.subject].push(r)
 })
 const subjectSummary = Object.entries(subjectMap).map(([subject, rows]) => {
 const avgObt = Math.round(rows.reduce((s, r) => s + r.obtained, 0) / rows.length)
 const avgTotal = Math.round(rows.reduce((s, r) => s + r.total, 0) / rows.length)
 const pct = avgTotal > 0 ? Math.round((avgObt / avgTotal) * 100) : 0
 return { subject, pct, grade: computeGrade(avgObt, avgTotal), rows }
 })
 const avgPct = subjectSummary.length > 0 ? Math.round(subjectSummary.reduce((s, x) => s + x.pct, 0) / subjectSummary.length) : null
 const overallGrade = avgPct !== null ? computeGrade(avgPct, 100) : null

 const pendingFees = fees.filter(f => f.status !== 'paid')
 const totalFeeAmt = fees.reduce((s, f) => s + Number(f.amount || 0), 0)
 const paidFeeAmt = fees.reduce((s, f) => s + Math.min(Number(f.paid_amount || 0), Number(f.amount || 0)), 0)

 return (
 <div style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver }}>
 <div style={{ maxWidth: 1220, margin: '0 auto', display: 'grid', gap: 20 }}>

 {/*  Header  */}
 <div className="super-module-card" style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderRadius: 22 }}>
 <div>
 <h1 style={sectionHeader}>Student Portal</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Your live academic data from Al Siddique School.</p>
 </div>
 <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
 <button onClick={loadData} title="Refresh data" style={{ background: 'rgba(200,153,26,0.08)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: C.gold }}>
 <RefreshCw size={15} />
 </button>
 <div style={{ textAlign: 'right' }}>
 <div style={{ fontSize: 18, fontWeight: 700, color: C.gold }}>{studentName}</div>
 <div style={{ color: C.muted, fontSize: 14 }}>
 {studentDisplay}{user?.section ? ` · Section ${user.section}` : ''}
 {studentRecord?.gr_number ? ` · ${studentRecord.gr_number}` : user?.username ? ` · ${user.username}` : ''}
 </div>
 </div>
 </div>
 </div>

 {/*  Tabs  */}
 <div className="super-module-card" style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', borderRadius: 22 }}>
 {SECTIONS.map(s => (
 <button key={s} onClick={() => setSection(s)} style={{
 ...btnSecondary, position: 'relative',
 background: section === s ? `linear-gradient(135deg,${C.gold},${C.goldL})` : undefined,
 color: section === s ? '#071e34' : C.silver, opacity: section === s ? 1 : 0.75,
 borderRadius: 14,
 }}>
 {s}
 {s === 'Messages' && unread > 0 && <Badge n={unread} color={C.red} />}
 {s === 'Fee Status' && pendingFees.length > 0 && <Badge n={pendingFees.length} color="#FF9F0A" />}
 </button>
 ))}
 </div>

 {error && (
 <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(255,55,95,0.08)', border: '1px solid rgba(255,55,95,0.2)', color: '#FF375F', display: 'flex', alignItems: 'center', gap: 10 }}>
 <AlertCircle size={16} /> {error}
 </div>
 )}

 {loading ? (
 <div style={{ ...card, textAlign: 'center', padding: 60, color: C.muted }}>
 <div style={{ fontSize: 13, marginTop: 8 }}>Loading your data from school records…</div>
 </div>
 ) : (
 <>
 {section === 'Dashboard' && <DashboardSection attPct={attPct} attTotal={attTotal} presentCount={presentCount} avgPct={avgPct} overallGrade={overallGrade} subjectSummary={subjectSummary} exams={exams} pendingFees={pendingFees} paidFeeAmt={paidFeeAmt} totalFeeAmt={totalFeeAmt} studentClass={studentDisplay} messages={messages} readMsg={readMsg} />}
 {section === 'My Exams' && <ExamsSection exams={exams} results={results} />}
 {section === 'Attendance' && <AttendanceSection records={attRecords} presentCount={presentCount} attTotal={attTotal} attPct={attPct} />}
 {section === 'Fee Status' && <FeeSection fees={fees} />}
 {section === 'Messages' && <MessagesSection messages={messages} readMsg={readMsg} />}
 </>
 )}

 {notice && (
 <div style={{ color: C.green, fontWeight: 700, textAlign: 'center', padding: 12, background: 'rgba(48,209,88,0.1)', borderRadius: 10, border: '1px solid rgba(48,209,88,0.25)' }}>
  {notice}
 </div>
 )}
 </div>

 {/*  Message Reader Modal  */}
 {openMsg && (
 <Modal onClose={() => setOpenMsg(null)}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
 <div>
 <div style={{ color: C.gold, fontWeight: 700, fontSize: 17 }}>{openMsg.subject}</div>
 <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>From: {openMsg.from} · {openMsg.date}</div>
 </div>
 <button onClick={() => setOpenMsg(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
 </div>
 <div style={{ background: 'rgba(11,44,77,0.92)', borderRadius: 10, padding: 16, color: C.silver, lineHeight: 1.75, fontSize: 14 }}>
 {openMsg.body}
 </div>
 <button onClick={() => setOpenMsg(null)}
 style={{ marginTop: 18, width: '100%', padding: 11, borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.gold},${C.goldL})`, color: '#071e34', fontWeight: 700, cursor: 'pointer' }}>
 Close
 </button>
 </Modal>
 )}
 </div>
 )
}

//  Shared small components 
function Badge({ n, color }) {
 return (
 <span style={{ position: 'absolute', top: -5, right: -5, background: color, color: color === '#FF9F0A' ? '#071e34' : '#fff', borderRadius: '50%', width: 17, height: 17, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
 )
}

function Modal({ children, onClose }) {
 return (
 <Portal>
 <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
 onClick={e => e.target === e.currentTarget && onClose()}>
 <div style={{ background: '#0d2a4e', border: `1px solid rgba(200,153,26,0.3)`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 500 }}>
 {children}
 </div>
 </div>
 </Portal>
 )
}

function EmptyState({ icon, text }) {
 return (
 <div style={{ textAlign: 'center', padding: '48px 24px', color: C.muted }}>
 <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
 <div style={{ fontSize: 14 }}>{text}</div>
 </div>
 )
}

//  Dashboard 
function DashboardSection({ attPct, attTotal, presentCount, avgPct, overallGrade, subjectSummary, exams, pendingFees, paidFeeAmt, totalFeeAmt, studentClass, messages, readMsg }) {
 const stats = [
 {
 icon: <CheckCircle size={30} color={attPct === null ? C.muted : attPct >= 75 ? C.green : '#FF375F'} />,
 value: attPct !== null ? `${attPct}%` : '—',
 label: 'Attendance',
 color: attPct === null ? C.muted : attPct >= 75 ? C.green : '#FF375F',
 sub: attTotal > 0 ? `${presentCount} / ${attTotal} days` : 'No records yet',
 },
 {
 icon: <Award size={30} color={overallGrade ? gradeColor(overallGrade) : C.muted} />,
 value: overallGrade || '—',
 label: 'Overall Grade',
 color: overallGrade ? gradeColor(overallGrade) : C.muted,
 sub: avgPct !== null ? `${avgPct}% average` : 'No results yet',
 },
 {
 icon: <BarChart2 size={30} color="#0A84FF" />,
 value: avgPct !== null ? `${avgPct}%` : '—',
 label: 'Avg Marks',
 color: '#0A84FF',
 sub: subjectSummary.length > 0 ? `${subjectSummary.length} subject(s)` : 'No marks entered yet',
 },
 {
 icon: <CreditCard size={30} color={pendingFees.length > 0 ? '#FF375F' : C.green} />,
 value: pendingFees.length > 0 ? `${pendingFees.length} Due` : 'Clear',
 label: 'Fee Status',
 color: pendingFees.length > 0 ? '#FF375F' : C.green,
 sub: totalFeeAmt > 0 ? `Rs${paidFeeAmt.toLocaleString()} paid of Rs${totalFeeAmt.toLocaleString()}` : 'No challans yet',
 },
 ]

 return (
 <div style={{ display: 'grid', gap: 20 }}>
 {/* Stats */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
 {stats.map((s, i) => (
 <div key={i} style={{ ...card, textAlign: 'center' }}>
 <div style={{ margin: '0 auto 10px' }}>{s.icon}</div>
 <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
 <div style={{ color: C.muted, fontSize: 13 }}>{s.label}</div>
 <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{s.sub}</div>
 </div>
 ))}
 </div>

 {/* Subject Performance */}
 {subjectSummary.length > 0 && (
 <div className="super-module-card" style={card}>
 <h3 style={{ color: C.gold, fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Subject Performance</h3>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
 {subjectSummary.map((s, i) => (
 <div key={i} style={{ textAlign: 'center', background: 'rgba(15,23,42,0.38)', borderRadius: 10, padding: '14px 12px' }}>
 <div style={{ fontWeight: 700, color: C.silver, fontSize: 13 }}>{s.subject}</div>
 <div style={{ fontSize: 22, fontWeight: 800, color: C.gold, marginTop: 6 }}>{s.pct}%</div>
 <div style={{ color: gradeColor(s.grade), fontSize: 12, fontWeight: 700 }}>Grade: {s.grade}</div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Upcoming Exams */}
 {exams.length > 0 && (
 <div className="super-module-card" style={card}>
 <h3 style={{ color: C.gold, fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
 <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Scheduled Exams — {studentClass}
 </h3>
 {exams.map(ex => (
 <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(200,153,26,0.07)', border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
 <div>
 <div style={{ fontWeight: 700, color: C.gold }}>{ex.name}</div>
 <div style={{ color: C.muted, fontSize: 13 }}>
 {ex.type} · Total: {ex.total_marks} marks · Pass: {ex.pass_marks}
 {ex.start_date ? ` · ${ex.start_date}` : ''}
 </div>
 </div>
 <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(200,153,26,0.12)', color: C.gold, fontSize: 12, fontWeight: 700 }}>{ex.session}</span>
 </div>
 ))}
 </div>
 )}

 {/* Unread Messages quick view */}
 {messages.filter(m => !m.read).length > 0 && (
 <div className="super-module-card" style={card}>
 <h3 style={{ color: C.gold, fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Unread Messages</h3>
 {messages.filter(m => !m.read).map(m => (
 <div key={m.id} onClick={() => readMsg(m)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(200,153,26,0.07)', border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, cursor: 'pointer' }}>
 <div>
 <div style={{ fontWeight: 700, color: C.silver }}>{m.subject}</div>
 <div style={{ color: C.muted, fontSize: 13 }}>From: {m.from}</div>
 </div>
 <Eye size={16} color={C.muted} />
 </div>
 ))}
 </div>
 )}

 {subjectSummary.length === 0 && exams.length === 0 && (
 <EmptyState icon="" text="No exam or marks data found yet. Once your teacher enters marks in the SaaS, they will appear here." />
 )}
 </div>
 )
}

//  My Exams 
function ExamsSection({ exams, results }) {
 // Group results by exam
 const byExam = {}
 results.forEach(r => {
 const key = `${r.examId}_${r.examName}`
 if (!byExam[key]) byExam[key] = { examName: r.examName, examType: r.examType, rows: [] }
 byExam[key].rows.push(r)
 })
 const examGroups = Object.values(byExam)

 return (
 <div style={{ display: 'grid', gap: 20 }}>
 {/* Scheduled Exams */}
 <div className="super-module-card" style={card}>
 <h3 style={{ color: C.gold, fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
 <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Scheduled Exams
 </h3>
 {exams.length === 0
 ? <EmptyState icon="" text="No exams scheduled for your class yet." />
 : exams.map(ex => (
 <div key={ex.id} style={{ background: 'rgba(15,23,42,0.38)', borderRadius: 12, padding: 16, marginBottom: 10, border: `1px solid ${C.border}` }}>
 <div style={{ fontWeight: 700, color: C.silver, fontSize: 15 }}>{ex.name}</div>
 <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
 Type: {ex.type} · Total Marks: {ex.total_marks} · Pass Marks: {ex.pass_marks}
 {ex.session ? ` · Session: ${ex.session}` : ''}
 {ex.start_date ? ` · Date: ${ex.start_date}` : ''}
 </div>
 </div>
 ))
 }
 </div>

 {/* Past Results */}
 <div className="super-module-card" style={card}>
 <h3 style={{ color: C.gold, fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
 <Award size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />My Exam Results
 </h3>
 {examGroups.length === 0
 ? <EmptyState icon="" text="No results recorded yet. Your marks will appear here once entered by your teacher." />
 : examGroups.map((group, gi) => {
 const totalObt = group.rows.reduce((s, r) => s + r.obtained, 0)
 const totalPos = group.rows.reduce((s, r) => s + r.total, 0)
 const overallPct = totalPos > 0 ? Math.round((totalObt / totalPos) * 100) : 0
 return (
 <div key={gi} style={{ marginBottom: 20 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '10px 14px', background: 'rgba(200,153,26,0.08)', borderRadius: 10, border: `1px solid ${C.border}` }}>
 <div>
 <div style={{ color: C.gold, fontWeight: 700 }}>{group.examName}</div>
 <div style={{ color: C.muted, fontSize: 12 }}>{group.examType}</div>
 </div>
 <div style={{ textAlign: 'right' }}>
 <div style={{ color: C.gold, fontWeight: 800, fontSize: 18 }}>{overallPct}%</div>
 <div style={{ color: gradeColor(computeGrade(totalObt, totalPos)), fontSize: 13, fontWeight: 700 }}>
 {totalObt}/{totalPos} · {computeGrade(totalObt, totalPos)}
 </div>
 </div>
 </div>
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 {['Subject', 'Marks', 'Total', 'Percentage', 'Grade'].map(h => (
 <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.muted, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {group.rows.map((r, i) => {
 const pct = r.total > 0 ? Math.round((r.obtained / r.total) * 100) : 0
 return (
 <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)', borderBottom: `1px solid ${C.border}22` }}>
 <td style={{ padding: '10px 12px', color: C.silver, fontWeight: 600 }}>{r.subject}</td>
 <td style={{ padding: '10px 12px', color: C.gold, fontWeight: 700 }}>{r.obtained}</td>
 <td style={{ padding: '10px 12px', color: C.muted }}>{r.total}</td>
 <td style={{ padding: '10px 12px', color: C.silver }}>{pct}%</td>
 <td style={{ padding: '10px 12px' }}>
 <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${gradeColor(r.grade)}22`, color: gradeColor(r.grade) }}>{r.grade}</span>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 )
 })
 }
 </div>
 </div>
 )
}

//  Attendance 
function AttendanceSection({ records, presentCount, attTotal, attPct }) {
 const absent = records.filter(a => a.status === 'absent').length
 const late = records.filter(a => a.status === 'late').length
 const leave = records.filter(a => a.status === 'leave').length

 // Sort records by date descending
 const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date))

 const statusColor = s => s === 'present' ? C.green : s === 'absent' ? '#FF375F' : s === 'late' ? '#FF9F0A' : C.muted
 const statusLabel = s => s === 'present' ? 'Present' : s === 'absent' ? 'Absent' : s === 'late' ? 'Late' : s === 'leave' ? 'Leave' : s

 return (
 <div style={{ display: 'grid', gap: 20 }}>
 {/* Summary */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
 {[
 { label: 'Attendance %', value: attPct !== null ? `${attPct}%` : '—', color: attPct !== null ? (attPct >= 75 ? C.green : '#FF375F') : C.muted },
 { label: 'Present Days', value: presentCount, color: C.green },
 { label: 'Absent Days', value: absent, color: '#FF375F' },
 { label: 'Late / Leave', value: late + leave, color: '#FF9F0A' },
 { label: 'Total Days', value: attTotal, color: C.silver },
 ].map((s, i) => (
 <div key={i} style={{ ...card, textAlign: 'center', padding: '18px 12px' }}>
 <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
 <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{s.label}</div>
 </div>
 ))}
 </div>

 {/* Low attendance warning */}
 {attPct !== null && attPct < 75 && (
 <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,55,95,0.08)', border: '1px solid rgba(255,55,95,0.2)', color: '#FF375F', display: 'flex', gap: 10, alignItems: 'center' }}>
 <AlertCircle size={16} />
 <span>Your attendance is below 75%. Please inform your class teacher.</span>
 </div>
 )}

 {/* Records list */}
 <div className="super-module-card" style={card}>
 <h3 style={{ color: C.gold, fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Attendance Records</h3>
 {sorted.length === 0
 ? <EmptyState icon="" text="No attendance records found. Records appear here after your teacher marks attendance." />
 : (
 <div style={{ display: 'grid', gap: 8 }}>
 {sorted.map((r, i) => (
 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(15,23,42,0.35)', borderRadius: 10, borderLeft: `3px solid ${statusColor(r.status)}` }}>
 <div style={{ color: C.silver, fontSize: 14 }}>{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
 <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${statusColor(r.status)}18`, color: statusColor(r.status) }}>
 {statusLabel(r.status)}
 </span>
 </div>
 ))}
 </div>
 )
 }
 </div>
 </div>
 )
}

//  Fee Status 
function FeeSection({ fees }) {
 const statusColor = s => s === 'paid' ? C.green : s === 'partial' ? '#FF9F0A' : '#FF375F'
 const statusLabel = s => s === 'paid' ? 'Paid' : s === 'partial' ? 'Partial' : 'Unpaid'

 const totalAmt = fees.reduce((s, f) => s + Number(f.amount || 0), 0)
 const paidAmt = fees.reduce((s, f) => s + Math.min(Number(f.paid_amount || 0), Number(f.amount || 0)), 0)
 const pendingAmt = totalAmt - paidAmt

 return (
 <div style={{ display: 'grid', gap: 20 }}>
 {/* Summary */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
 {[
 { label: 'Total Charged', value: `Rs ${totalAmt.toLocaleString()}`, color: C.silver },
 { label: 'Amount Paid', value: `Rs ${paidAmt.toLocaleString()}`, color: C.green },
 { label: 'Balance Due', value: `Rs ${pendingAmt.toLocaleString()}`, color: pendingAmt > 0 ? '#FF375F' : C.green },
 { label: 'Challans', value: fees.length, color: C.gold },
 ].map((s, i) => (
 <div key={i} style={{ ...card, textAlign: 'center', padding: '18px 12px' }}>
 <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
 <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{s.label}</div>
 </div>
 ))}
 </div>

 {/* Challans table */}
 <div className="super-module-card" style={card}>
 <h3 style={{ color: C.gold, fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
 <CreditCard size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Fee Challans
 </h3>
 {fees.length === 0
 ? <EmptyState icon="" text="No fee challans found for your account. Ask admin if this seems incorrect." />
 : (
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 {['Challan No', 'Month / Description', 'Amount', 'Paid', 'Balance', 'Status'].map(h => (
 <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.muted, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {fees.map((f, i) => {
 const paid = Math.min(Number(f.paid_amount || 0), Number(f.amount || 0))
 const balance = Math.max(0, Number(f.amount || 0) - paid)
 return (
 <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)', borderBottom: `1px solid ${C.border}22` }}>
 <td style={{ padding: '10px 12px', color: C.silver, fontFamily: 'monospace' }}>{f.challan_no || '—'}</td>
 <td style={{ padding: '10px 12px', color: C.silver }}>{f.month || f.description || '—'}</td>
 <td style={{ padding: '10px 12px', color: C.silver }}>Rs {Number(f.amount || 0).toLocaleString()}</td>
 <td style={{ padding: '10px 12px', color: C.green }}>Rs {paid.toLocaleString()}</td>
 <td style={{ padding: '10px 12px', color: balance > 0 ? '#FF375F' : C.green }}>Rs {balance.toLocaleString()}</td>
 <td style={{ padding: '10px 12px' }}>
 <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${statusColor(f.status)}18`, color: statusColor(f.status) }}>
 {statusLabel(f.status)}
 </span>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 )
 }
 </div>
 </div>
 )
}

//  Messages 
function MessagesSection({ messages, readMsg }) {
 return (
 <div style={{ display: 'grid', gap: 12 }}>
 <div className="super-module-card" style={{ ...card, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <div style={{ color: C.silver, fontWeight: 600 }}>Inbox · {messages.length} messages</div>
 <div style={{ color: C.muted, fontSize: 13 }}>{messages.filter(m => !m.read).length} unread</div>
 </div>
 {messages.map(msg => (
 <div key={msg.id} onClick={() => readMsg(msg)} style={{
 ...card, cursor: 'pointer',
 background: msg.read ? 'rgba(11,44,77,0.35)' : 'rgba(200,153,26,0.08)',
 borderLeft: `3px solid ${msg.read ? C.border : C.gold}`,
 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
 <div style={{ flex: 1 }}>
 <div style={{ fontWeight: msg.read ? 500 : 700, color: msg.read ? C.silver : '#fff' }}>{msg.subject}</div>
 <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>From: {msg.from} · {msg.date}</div>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
 {!msg.read && <div style={{ width: 8, height: 8, background: C.gold, borderRadius: '50%' }} />}
 <Eye size={15} color={C.muted} />
 </div>
 </div>
 </div>
 ))}
 </div>
 )
}

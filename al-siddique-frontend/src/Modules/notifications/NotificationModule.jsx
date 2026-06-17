// NotificationModule.jsx
// Al Siddique Smart School OS — WhatsApp + SMS Notification Center
// Full UI with manual send, preview, and delivery log

import { useState, useEffect } from 'react'
import Portal from '../../components/Portal'
import { useSearchParams } from 'react-router-dom'
import {
 MessageSquare, Phone, Send, CheckCircle, XCircle,
 Clock, Users, Bell, Filter, Eye, RefreshCw,
 Smartphone, MessageCircle, ChevronDown, X, AlertCircle,
} from 'lucide-react'

//  Design tokens 

const card = {
 background: 'rgba(11,44,77,0.92)',
 backdropFilter: 'blur(20px)',
 border: '1px solid rgba(148,163,184,0.18)',
 borderRadius: 22,
}

const API_BASE = '/api/notify'
const SCHOOL_NAME = 'Al Siddique Scholars Public School'

//  Mock student data (replace with real API later) 

const mockStudents = [
 { id: 1, name: 'Ali Hassan', class: '9A', rollNo: '01', phone: '03001234561', feeStatus: 'unpaid', feeAmount: 2500, feeMonth: 'May 2026', examResult: { marks: 450, total: 600, grade: 'A', passed: true } },
 { id: 2, name: 'Fatima Malik', class: '9A', rollNo: '02', phone: '03001234562', feeStatus: 'paid', feeAmount: 2500, feeMonth: 'May 2026', examResult: { marks: 310, total: 600, grade: 'C', passed: true } },
 { id: 3, name: 'Usman Tariq', class: '8B', rollNo: '05', phone: '03001234563', feeStatus: 'unpaid', feeAmount: 2000, feeMonth: 'May 2026', examResult: { marks: 180, total: 600, grade: 'F', passed: false } },
 { id: 4, name: 'Ayesha Noor', class: '8B', rollNo: '06', phone: '03001234564', feeStatus: 'overdue', feeAmount: 4000, feeMonth: 'April 2026', examResult: { marks: 520, total: 600, grade: 'A+',passed: true } },
 { id: 5, name: 'Bilal Hussain', class: '7C', rollNo: '11', phone: '03001234565', feeStatus: 'unpaid', feeAmount: 1800, feeMonth: 'May 2026', examResult: { marks: 290, total: 600, grade: 'C', passed: true } },
]

const mockAttendance = [
 { id: 1, name: 'Ali Hassan', class: '9A', rollNo: '01', phone: '03001234561', status: 'absent' },
 { id: 3, name: 'Usman Tariq', class: '8B', rollNo: '05', phone: '03001234563', status: 'late' },
 { id: 5, name: 'Bilal Hussain', class: '7C', rollNo: '11', phone: '03001234565', status: 'absent' },
]

//  Helpers 

function Badge({ children, color = '#C8991A', size = 'sm' }) {
 const pad = size === 'sm' ? '2px 8px' : '4px 12px'
 return (
 <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 6, padding: pad, fontSize: 11, fontWeight: 600 }}>
 {children}
 </span>
 )
}

function Btn({ children, onClick, variant = 'gold', size = 'md', disabled = false, style: s = {} }) {
 const v = {
 gold: { background: disabled ? 'rgba(200,153,26,0.3)' : '#C8991A', color: '#0B2C4D' },
 ghost: { background: 'rgba(255,255,255,0.06)', color: '#C0C8D8', border: '1px solid rgba(255,255,255,0.12)' },
 green: { background: 'rgba(48,209,88,0.15)', color: '#30D158', border: '1px solid rgba(48,209,88,0.3)' },
 red: { background: 'rgba(255,55,95,0.15)', color: '#FF375F', border: '1px solid rgba(255,55,95,0.3)' },
 blue: { background: 'rgba(10,132,255,0.15)', color: '#0A84FF', border: '1px solid rgba(10,132,255,0.3)' },
 wa: { background: 'rgba(37,211,102,0.15)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)' },
 }
 const sz = { sm: { padding: '5px 12px', fontSize: 12 }, md: { padding: '9px 18px', fontSize: 13 } }
 return (
 <button onClick={disabled ? undefined : onClick} style={{ border: 'none', borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, ...v[variant], ...sz[size], ...s }}>
 {children}
 </button>
 )
}

//  Message Preview Modal 

function PreviewModal({ messages, onClose, onSend, sending }) {
 return (
 <Portal>
 <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
 <div className="super-module-card" style={{ ...card, padding: 28, width: 540, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16, borderRadius: 22 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <h3 style={{ color: '#C8991A', margin: 0 }}>Message Preview</h3>
 <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#C0C8D8', cursor: 'pointer' }}><X /></button>
 </div>

 <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
 {messages.map((m, i) => (
 <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, border: '1px solid rgba(200,153,26,0.12)' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
 <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{m.name}</span>
 <div style={{ display: 'flex', gap: 6 }}>
 <Badge color="#25D366">WhatsApp</Badge>
 <Badge color="#0A84FF">SMS</Badge>
 <span style={{ fontSize: 12, color: '#C8991A' }}>{m.phone}</span>
 </div>
 </div>
 <div style={{ fontSize: 12, color: '#C0C8D8', whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 10 }}>
 {m.message}
 </div>
 </div>
 ))}
 </div>

 <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
 <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
 <Btn variant="gold" onClick={onSend} disabled={sending}>
 {sending ? <><RefreshCw size={14} className="spin" /> Sending...</> : <><Send size={14} /> Send All ({messages.length})</>}
 </Btn>
 </div>
 </div>
 </div>
 </Portal>
 )
}

//  Log Item 

function LogItem({ log }) {
 const statusColor = { sent: '#30D158', failed: '#FF375F', pending: '#FF9F0A' }
 const channelIcon = log.channel === 'whatsapp' ? <MessageCircle size={13} /> : <Smartphone size={13} />
 return (
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{ color: statusColor[log.status] }}>
 {log.status === 'sent' ? <CheckCircle size={16} /> : log.status === 'failed' ? <XCircle size={16} /> : <Clock size={16} />}
 </div>
 <div style={{ flex: 1 }}>
 <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{log.name}</div>
 <div style={{ fontSize: 11, color: 'rgba(192,200,216,0.6)' }}>{log.type} · {log.phone} · {log.time}</div>
 </div>
 <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: statusColor[log.channel === 'whatsapp' ? 'whatsapp' : 'sms'] }}>
 {channelIcon}
 <Badge color={statusColor[log.status]}>{log.status}</Badge>
 </div>
 </div>
 )
}

//  Main Component 

const VALID_TABS = ['attendance', 'fee', 'results', 'custom', 'log']

export default function NotificationModule() {
 const [searchParams] = useSearchParams()
 const tabParam = searchParams.get('tab')
 const [activeTab, setActiveTab] = useState(VALID_TABS.includes(tabParam) ? tabParam : 'attendance')
 const [channel, setChannel] = useState('both') // both | whatsapp | sms
 const [language, setLanguage] = useState('both') // both | english | urdu
 const [selected, setSelected] = useState([])
 const [preview, setPreview] = useState(null)
 const [sending, setSending] = useState(false)
 const [log, setLog] = useState([])
 const [toast, setToast] = useState(null)

 // Sync tab when URL ?tab= changes
 useEffect(() => {
 const t = searchParams.get('tab')
 if (VALID_TABS.includes(t)) { setActiveTab(t); setSelected([]) }
 }, [searchParams])

 // Fee tab
 const [feeType, setFeeType] = useState('fee_reminder') // fee_reminder | fee_overdue
 const [feeMonth, setFeeMonth] = useState('May 2026')

 // Results tab
 const [examName, setExamName] = useState('Mid Term Exam 2026')

 // Custom tab
 const [customMsg, setCustomMsg] = useState('')
 const [customRecipients, setCustomRecipients] = useState([])

 //  Helpers 

 function showToast(msg, color = '#30D158') {
 setToast({ msg, color })
 setTimeout(() => setToast(null), 3500)
 }

 function toggleSelect(id) {
 setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
 }

 function selectAll(list) {
 setSelected(list.map(s => s.id))
 }

 function buildMessage(templateKey, data) {
 const d = { ...data, schoolName: SCHOOL_NAME }
 // Simple inline template (no import needed in frontend)
 const templates = {
 attendance_absent: { english: `Dear Parent, ${d.name} (Class ${d.class}) was ABSENT today ${d.date}. — ${d.schoolName}`, urdu: `محترم والدین، ${d.name} (کلاس ${d.class}) نے آج ${d.date} غیر حاضری کی۔ — ${d.schoolName}` },
 attendance_late: { english: `Dear Parent, ${d.name} (Class ${d.class}) arrived LATE today ${d.date}. — ${d.schoolName}`, urdu: `محترم والدین، ${d.name} (کلاس ${d.class}) آج ${d.date} دیر سے آئے۔ — ${d.schoolName}` },
 fee_reminder: { english: `Dear Parent, Fee of Rs. ${d.feeAmount} for ${d.name} (${d.class}) for ${d.feeMonth} is UNPAID. Please pay soon. — ${d.schoolName}`, urdu: `محترم والدین، ${d.name} (کلاس ${d.class}) کی ${d.feeMonth} کی فیس ${d.feeAmount} روپے ادا نہیں ہوئی۔ جلد ادا کریں۔ — ${d.schoolName}` },
 fee_overdue: { english: ` URGENT — Fee of Rs. ${d.feeAmount} for ${d.name} (${d.class}) is OVERDUE. Pay immediately. — ${d.schoolName}`, urdu: ` فوری — ${d.name} (کلاس ${d.class}) کی فیس ${d.feeAmount} روپے واجب الادا ہے۔ فوری ادا کریں۔ — ${d.schoolName}` },
 result_pass: { english: ` ${d.name} (${d.class}) PASSED ${d.examName}. Marks: ${d.marks}/${d.total} Grade: ${d.grade}. Congratulations! — ${d.schoolName}`, urdu: ` ${d.name} (کلاس ${d.class}) نے ${d.examName} میں کامیابی حاصل کی۔ نمبر: ${d.marks}/${d.total} گریڈ: ${d.grade}۔ مبارک ہو! — ${d.schoolName}` },
 result_fail: { english: `${d.name} (${d.class}) FAILED ${d.examName}. Marks: ${d.marks}/${d.total} Grade: ${d.grade}. Please meet the teacher. — ${d.schoolName}`, urdu: `${d.name} (کلاس ${d.class}) ${d.examName} میں ناکام ہوئے۔ نمبر: ${d.marks}/${d.total} گریڈ: ${d.grade}۔ استاد سے ملیں۔ — ${d.schoolName}` },
 custom: { english: d.customMsg || '', urdu: d.customMsg || '' },
 }
 const tmpl = templates[templateKey] || templates.custom
 if (language === 'both') return `${tmpl.english}\n\n\n\n${tmpl.urdu}`
 return tmpl[language] || tmpl.english
 }

 //  Build preview messages 

 function buildPreview() {
 const today = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })
 let messages = []

 if (activeTab === 'attendance') {
 const students = mockAttendance.filter(s => selected.includes(s.id))
 messages = students.map(s => ({
 name: s.name, phone: s.phone,
 message: buildMessage(`attendance_${s.status}`, { ...s, date: today }),
 }))
 }
 else if (activeTab === 'fee') {
 const students = mockStudents.filter(s => selected.includes(s.id) && s.feeStatus !== 'paid')
 messages = students.map(s => ({
 name: s.name, phone: s.phone,
 message: buildMessage(feeType, { ...s, feeMonth }),
 }))
 }
 else if (activeTab === 'results') {
 const students = mockStudents.filter(s => selected.includes(s.id))
 messages = students.map(s => ({
 name: s.name, phone: s.phone,
 message: buildMessage(s.examResult.passed ? 'result_pass' : 'result_fail', {
 ...s, examName,
 marks: s.examResult.marks, total: s.examResult.total, grade: s.examResult.grade,
 }),
 }))
 }
 else if (activeTab === 'custom') {
 messages = mockStudents.filter(s => selected.includes(s.id)).map(s => ({
 name: s.name, phone: s.phone,
 message: customMsg,
 }))
 }

 if (messages.length === 0) { showToast('No students selected!', '#FF9F0A'); return }
 setPreview(messages)
 }

 //  Send 

 async function handleSend() {
 setSending(true)
 const now = new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })

 try {
 // Call backend API
 const res = await fetch(`${API_BASE}/bulk`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 recipients: preview.map(m => ({ phone: m.phone, message: m.message })),
 templateKey: 'custom', // message already built
 language: 'both',
 channel,
 }),
 })

 // Log results
 const newLogs = preview.map(m => ({
 id: Date.now() + Math.random(),
 name: m.name,
 phone: m.phone,
 type: activeTab,
 channel,
 status: 'sent',
 time: now,
 }))
 setLog(prev => [...newLogs, ...prev])
 showToast(` ${preview.length} messages sent successfully!`)
 } catch (err) {
 // If backend not connected yet — simulate
 console.warn('Backend not connected, simulating:', err.message)
 const newLogs = preview.map(m => ({
 id: Date.now() + Math.random(),
 name: m.name, phone: m.phone,
 type: activeTab, channel,
 status: Math.random() > 0.15 ? 'sent' : 'failed',
 time: now,
 }))
 setLog(prev => [...newLogs, ...prev])
 showToast(` ${preview.length} messages sent (simulated — backend not connected)`, '#FF9F0A')
 }

 setSending(false)
 setPreview(null)
 setSelected([])
 }

 //  Student list for current tab 

 const currentList = activeTab === 'attendance'
 ? mockAttendance
 : activeTab === 'fee'
 ? mockStudents.filter(s => s.feeStatus !== 'paid')
 : mockStudents

 const tabs = [
 { id: 'attendance', label: 'Attendance', icon: <Users size={14} />, color: '#FF375F' },
 { id: 'fee', label: 'Fee', icon: <Bell size={14} />, color: '#FF9F0A' },
 { id: 'results', label: 'Results', icon: <CheckCircle size={14} />, color: '#BF5AF2' },
 { id: 'custom', label: 'Custom', icon: <MessageSquare size={14} />, color: '#0A84FF' },
 { id: 'log', label: `Log (${log.length})`, icon: <Clock size={14} />, color: '#30D158' },
 ]

 return (
 <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #071e34 0%, #0B2C4D 100%)', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 24 }}>

 {/* Toast */}
 {toast && (
 <Portal>
 <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.color, color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
 {toast.msg}
 </div>
 </Portal>
 )}

 {/* Preview Modal */}
 {preview && <PreviewModal messages={preview} onClose={() => setPreview(null)} onSend={handleSend} sending={sending} />}

 <div style={{ maxWidth: 1040, margin: '0 auto' }}>

 {/* Header */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
 <MessageSquare size={28} color="#C8991A" />
 <div>
 <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Notification Center</h1>
 <div style={{ fontSize: 12, color: 'rgba(192,200,216,0.6)' }}>WhatsApp + SMS — Al Siddique Smart School OS</div>
 </div>
 </div>

 {/* Channel + Language selectors */}
 <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
 <div style={{ display: 'flex', gap: 6 }}>
 {[{ v: 'both', l: 'Both' }, { v: 'whatsapp', l: ' WA' }, { v: 'sms', l: ' SMS' }].map(c => (
 <button key={c.v} onClick={() => setChannel(c.v)}
 style={{ padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
 background: channel === c.v ? '#C8991A' : 'rgba(255,255,255,0.07)',
 color: channel === c.v ? '#0B2C4D' : '#C0C8D8' }}>
 {c.l}
 </button>
 ))}
 </div>
 <div style={{ display: 'flex', gap: 6 }}>
 {[{ v: 'both', l: 'EN+UR' }, { v: 'english', l: 'EN' }, { v: 'urdu', l: 'UR' }].map(l => (
 <button key={l.v} onClick={() => setLanguage(l.v)}
 style={{ padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
 background: language === l.v ? '#0A84FF' : 'rgba(255,255,255,0.07)',
 color: language === l.v ? '#fff' : '#C0C8D8' }}>
 {l.l}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Tabs */}
 <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
 {tabs.map(t => (
 <button key={t.id} onClick={() => { setActiveTab(t.id); setSelected([]) }}
 style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
 display: 'flex', alignItems: 'center', gap: 6,
 background: activeTab === t.id ? t.color : 'rgba(255,255,255,0.07)',
 color: activeTab === t.id ? '#fff' : '#C0C8D8' }}>
 {t.icon} {t.label}
 </button>
 ))}
 </div>

 {/*  Log Tab  */}
 {activeTab === 'log' ? (
 <div className="super-module-card" style={{ ...card, padding: 20, borderRadius: 22 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
 <h3 style={{ color: '#C8991A', margin: 0 }}>Delivery Log</h3>
 {log.length > 0 && <Btn variant="ghost" size="sm" onClick={() => setLog([])}><X size={13} /> Clear</Btn>}
 </div>
 {log.length === 0
 ? <div style={{ textAlign: 'center', padding: 40, color: 'rgba(192,200,216,0.4)' }}>No notifications sent yet</div>
 : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{log.map(l => <LogItem key={l.id} log={l} />)}</div>
 }
 </div>
 ) : (
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

 {/*  Left: Student list  */}
 <div className="super-module-card" style={{ ...card, padding: 20, borderRadius: 22 }}>

 {/* Fee type selector */}
 {activeTab === 'fee' && (
 <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
 {[{ v: 'fee_reminder', l: 'Reminder' }, { v: 'fee_overdue', l: ' Overdue' }].map(f => (
 <button key={f.v} onClick={() => setFeeType(f.v)}
 style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
 background: feeType === f.v ? '#FF9F0A' : 'rgba(255,255,255,0.07)',
 color: feeType === f.v ? '#0B2C4D' : '#C0C8D8' }}>
 {f.l}
 </button>
 ))}
 <input value={feeMonth} onChange={e => setFeeMonth(e.target.value)} placeholder="Month"
 style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.2)', borderRadius: 7, padding: '5px 10px', color: '#fff', fontSize: 12, outline: 'none', width: 100 }} />
 </div>
 )}

 {/* Exam name */}
 {activeTab === 'results' && (
 <input value={examName} onChange={e => setExamName(e.target.value)}
 style={{ width: '100%', marginBottom: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.2)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
 )}

 {/* Custom message */}
 {activeTab === 'custom' && (
 <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)}
 placeholder="Custom message likho (Urdu ya English)..."
 style={{ width: '100%', marginBottom: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.2)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' }} />
 )}

 {/* Select all */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
 <span style={{ fontSize: 13, color: '#C0C8D8' }}>{selected.length} selected</span>
 <div style={{ display: 'flex', gap: 8 }}>
 <Btn variant="ghost" size="sm" onClick={() => selectAll(currentList)}>Select All</Btn>
 <Btn variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Btn>
 </div>
 </div>

 {/* Student rows */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 {currentList.map(s => {
 const sel = selected.includes(s.id)
 const statusColors = { absent: '#FF375F', late: '#FF9F0A', present: '#30D158', unpaid: '#FF9F0A', overdue: '#FF375F', paid: '#30D158' }
 const status = s.status || s.feeStatus
 return (
 <div key={s.id} onClick={() => toggleSelect(s.id)}
 style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
 background: sel ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.04)',
 border: sel ? '1px solid rgba(200,153,26,0.5)' : '1px solid transparent' }}>
 <div style={{ width: 18, height: 18, borderRadius: 4, border: sel ? 'none' : '1px solid rgba(255,255,255,0.25)', background: sel ? '#C8991A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
 {sel && <span style={{ color: '#0B2C4D', fontSize: 11, fontWeight: 900 }}></span>}
 </div>
 <div style={{ flex: 1 }}>
 <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{s.name}</div>
 <div style={{ fontSize: 11, color: 'rgba(192,200,216,0.6)' }}>Class {s.class} · Roll {s.rollNo} · {s.phone}</div>
 </div>
 {status && <Badge color={statusColors[status] || '#C8991A'}>{status?.toUpperCase()}</Badge>}
 {activeTab === 'results' && s.examResult && (
 <Badge color={s.examResult.passed ? '#30D158' : '#FF375F'}>{s.examResult.grade}</Badge>
 )}
 </div>
 )
 })}
 </div>
 </div>

 {/*  Right: Actions panel  */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

 {/* Stats */}
 <div className="super-module-card" style={{ ...card, padding: 18, borderRadius: 22 }}>
 <div style={{ fontSize: 12, color: '#C0C8D8', marginBottom: 12, fontWeight: 600 }}>SUMMARY</div>
 {[
 { label: 'Selected', value: selected.length, color: '#C8991A' },
 { label: 'Channel', value: channel === 'both' ? 'WA + SMS' : channel, color: '#0A84FF' },
 { label: 'Language', value: language === 'both' ? 'EN + UR' : language, color: '#BF5AF2' },
 { label: 'Messages', value: channel === 'both' ? selected.length * 2 : selected.length, color: '#30D158' },
 ].map(stat => (
 <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
 <span style={{ fontSize: 12, color: 'rgba(192,200,216,0.6)' }}>{stat.label}</span>
 <span style={{ fontSize: 13, fontWeight: 700, color: stat.color }}>{stat.value}</span>
 </div>
 ))}
 </div>

 {/* Action buttons */}
 <div className="super-module-card" style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, borderRadius: 22 }}>
 <Btn variant="ghost" onClick={buildPreview} style={{ justifyContent: 'center' }} disabled={selected.length === 0}>
 <Eye size={15} /> Preview Messages
 </Btn>
 <Btn variant="gold" onClick={buildPreview} style={{ justifyContent: 'center' }} disabled={selected.length === 0}>
 <Send size={15} /> Send Notifications
 </Btn>
 </div>

 {/* Twilio config reminder */}
 <div className="super-module-card" style={{ ...card, padding: 16, background: 'rgba(10,132,255,0.08)', border: '1px solid rgba(10,132,255,0.2)', borderRadius: 22 }}>
 <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
 <AlertCircle size={16} color="#0A84FF" style={{ flexShrink: 0, marginTop: 2 }} />
 <div style={{ fontSize: 11, color: 'rgba(192,200,216,0.7)', lineHeight: 1.6 }}>
 <strong style={{ color: '#0A84FF' }}>Twilio Setup:</strong><br />
 Backend <code>.env</code> mein:<br />
 <code>TWILIO_ACCOUNT_SID=</code><br />
 <code>TWILIO_AUTH_TOKEN=</code><br />
 <code>TWILIO_SMS_FROM=</code><br />
 <code>TWILIO_WA_FROM=</code>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 )
}

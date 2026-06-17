import { useMemo, useState } from 'react'
import { Printer, Save, Plus, X } from 'lucide-react'
import { useAcademicStore } from '../services/useAcademicStore'
import { useStudentStore } from '../services/useStudentStore'
import { usePaperStore } from './Paper-Generator/usePaperStore'

const STORE_KEY = 'al_siddique_date_sheets'
const TERMS = ['First Term Exam', 'Second Term Exam', 'Annual Exam', 'Monthly Assessment']
const TEMPLATES = [
 { id: 'classic', label: 'Template 1 - Classic' },
 { id: 'premium', label: 'Template 2 - Premium Navy' },
 { id: 'minimal', label: 'Template 3 - Clean Minimal' },
]
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}

function readSheets() {
 try {
 const saved = JSON.parse(getStorage()?.getItem(STORE_KEY) || '[]')
 return Array.isArray(saved) ? saved : []
 } catch {
 return []
 }
}

function writeSheets(rows) {
 const storage = getStorage()
 try { storage?.setItem(STORE_KEY, JSON.stringify(rows)) } catch {}
}

function clsValue(value) {
 return String(value || '').replace(/^Class\s+/i, '')
}

function clsLabel(value) {
 if (!value) return ''
 return /^Class\s/i.test(String(value)) ? value : `Class ${value}`
}

function dayName(date) {
 if (!date) return ''
 const parsed = new Date(`${date}T00:00:00`)
 return Number.isNaN(parsed.getTime()) ? '' : DAYS[parsed.getDay()]
}

function prettyDate(date) {
 if (!date) return ''
 const parsed = new Date(`${date}T00:00:00`)
 return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}



function esc(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]))
}

const styles = {
 page: { minHeight:'100vh', padding:'24px 20px', background:'transparent', color:'#e2e8f0' },
 shell: { maxWidth:1460, margin:'0 auto', background:'rgba(15,23,42,0.4)', backdropFilter:'blur(12px)', borderRadius:22, border:'1px solid rgba(148,163,184,0.1)', overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' },
 body: { padding:'22px 24px 32px' },
 crumb: { color:'rgba(148,163,184,0.6)', fontSize:13, marginBottom:10, fontWeight:500 },
 notice: { background:'rgba(245,166,35,0.1)', color:'#f5a623', border:'1px solid rgba(245,166,35,0.2)', borderRadius:14, padding:'16px 20px', fontSize:14, lineHeight:1.55, fontWeight:600, marginBottom:32, position:'relative' },
 close: { position:'absolute', right:16, top:14, color:'rgba(245,166,35,0.5)', fontWeight:900, cursor:'pointer', fontSize:18 },
 title: { margin:'0 0 20px', fontSize:24, fontWeight:700, color:'#fff', borderBottom:'1px solid rgba(148,163,184,0.1)', paddingBottom:14 },
 formGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:16, alignItems:'end', marginBottom:28 },
 label: { display:'block', fontWeight:600, color:'rgba(148,163,184,0.9)', marginBottom:6, fontSize:13 },
 input: { width:'100%', height:40, border:'1px solid rgba(148,163,184,0.2)', background:'rgba(15,23,42,0.6)', color:'#fff', padding:'0 12px', fontSize:14, borderRadius:12, outline:'none', transition:'all 0.2s', boxShadow:'inset 0 2px 4px rgba(0,0,0,0.1)', colorScheme:'dark' },
 button: { height:40, border:0, borderRadius:12, background:'linear-gradient(135deg, #0A84FF 0%, #22d3ee 100%)', color:'#fff', padding:'0 18px', fontSize:14, cursor:'pointer', fontWeight: 600, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, boxShadow:'0 4px 12px rgba(10,132,255,0.3)', transition:'all 0.2s' },
 warn: { background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)', borderRadius:14, padding:'14px 18px', fontSize:14, margin:'0 0 22px', fontWeight:500, position:'relative' },
 gridWrap: { width:'100%', overflow:'auto', borderTop:'1px solid rgba(148,163,184,0.1)', marginTop:18, maxHeight:'62vh', borderRadius:12 },
 table: { borderCollapse:'collapse', minWidth:1200, width:'max-content', color:'#e2e8f0' },
 th: { background:'rgba(15,23,42,0.8)', color:'#fff', border:'1px solid rgba(148,163,184,0.1)', padding:'12px 14px', verticalAlign:'bottom', minWidth:168, fontSize:13, fontWeight:600 },
 classTh: { background:'rgba(15,23,42,0.8)', color:'#fff', border:'1px solid rgba(148,163,184,0.1)', padding:'12px 14px', minWidth:200, textAlign:'left', verticalAlign:'bottom', fontSize:13, fontWeight:600 },
 td: { border:'1px solid rgba(148,163,184,0.1)', background:'rgba(30,41,59,0.3)', minWidth:168, height:80, padding:10, verticalAlign:'top', position:'relative' },
 classCell: { border:'1px solid rgba(148,163,184,0.1)', background:'rgba(30,41,59,0.3)', minWidth:200, width:200, padding:10, verticalAlign:'top' },
 cellBtn: { width:'100%', minHeight:42, border:'1px solid rgba(148,163,184,0.2)', background:'rgba(15,23,42,0.5)', color:'rgba(148,163,184,0.9)', textAlign:'left', padding:'0 12px', fontSize:13, borderRadius:10, cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', transition:'all 0.2s' },
 dropdown: { position:'absolute', left:10, top:56, width:250, maxHeight:320, overflowY:'auto', background:'#1e293b', border:'1px solid rgba(148,163,184,0.2)', boxShadow:'0 12px 32px rgba(0,0,0,0.5)', zIndex:10, borderRadius:12 },
 searchBox: { width:'calc(100% - 20px)', height:38, border:'1px solid rgba(148,163,184,0.2)', borderRadius:10, margin:10, padding:'0 10px', outline:'none', fontSize:13, background:'rgba(15,23,42,0.6)', color:'#fff' },
 subjectRow: { padding:'10px 16px', color:'#e2e8f0', cursor:'pointer', fontSize:13, borderBottom:'1px solid rgba(148,163,184,0.1)', transition:'all 0.15s' },
 printPanel: { borderTop:'1px solid rgba(148,163,184,0.1)', marginTop:24, paddingTop:20, display:'grid', gap:14, background:'rgba(15,23,42,0.3)', padding:'20px', borderRadius:16 },
 pickerPanel: { background:'rgba(15,23,42,0.5)', border:'1px solid rgba(148,163,184,0.12)', borderRadius:16, padding:'16px 18px', marginBottom:18 },
 chip: { display:'inline-flex', alignItems:'center', gap:6, height:32, padding:'0 12px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:'1px solid', transition:'all 0.18s' },
}

function templateCss(template) {
 const accent = template === 'premium' ? '#C8991A' : template === 'minimal' ? '#0B1F3A' : '#2563EB'
 return `
 @page{size:A4 portrait;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 body{margin:0;background:#e5e7eb;font-family:Arial,sans-serif;color:#102033}.bar{background:#071e34;color:white;padding:10px 16px;display:flex;gap:10px}.bar button{margin-left:auto;background:#C8991A;border:0;border-radius:6px;padding:8px 18px;font-weight:800}
 @media print{body{background:white}.bar{display:none!important}}
 .sheet{position:relative;width:190mm;height:277mm;background:#fff;margin:10mm auto;padding:14mm 15mm;break-after:page;overflow:hidden;border:1px solid #d8e0ea}
 .two .sheet{height:133mm;margin:0;width:190mm;padding:8mm 12mm;break-after:auto}.pair{width:210mm;height:297mm;padding:8mm 10mm;background:white;display:flex;flex-direction:column;gap:6mm;break-after:page}
 .sheet h1{margin:0;color:#0B1F3A;font-size:23pt;text-transform:uppercase}.two .sheet h1{font-size:16pt}
 .head{display:flex;gap:9mm;align-items:center;border-bottom:2px solid ${accent};padding-bottom:5mm;margin-bottom:6mm}.two .head{padding-bottom:3mm;margin-bottom:3mm}
 .logo{width:22mm;height:22mm;border:1px solid #cbd5e1;border-radius:${template === 'minimal' ? '4mm' : '50%'};object-fit:contain;padding:2mm}.meta{margin-left:auto;text-align:right;color:#475569;font-size:9pt;line-height:1.6}.school small{display:block;color:#64748b;font-size:8pt;margin-top:1mm}
 .info{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm;margin-bottom:6mm}.info div{border:1px solid #d8e0ea;background:#f8fafc;padding:2mm}.info span{display:block;color:#64748b;font-size:7pt;text-transform:uppercase;font-weight:800}.info strong{font-size:10pt}
 table{width:100%;border-collapse:collapse;font-size:10pt}th{background:${template === 'premium' ? '#C8991A' : '#0B1F3A'};color:${template === 'premium' ? '#071e34' : '#fff'};font-size:8pt;text-transform:uppercase}th,td{border:1px solid #cbd5e1;padding:3mm;text-align:left}.two table{font-size:8pt}.two th,.two td{padding:1.6mm}
 .foot{position:absolute;left:15mm;right:15mm;bottom:10mm;display:flex;justify-content:space-between;color:#64748b;font-size:8pt}.two .foot{display:none}.premium{border:4mm solid #0B1F3A}.minimal{border:none;border-top:5mm solid #0B1F3A}
 `
}

function buildCard({ student, rows, school, term, session, template }) {
 const logo = school.logo ? `<img class="logo" src="${school.logo}" alt="logo">` : '<div class="logo" style="display:grid;place-items:center;font-weight:900">S</div>'
 const lines = rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(prettyDate(r.date))}</td><td>${esc(dayName(r.date))}</td><td>${esc(r.subjects.join(', '))}</td><td>${esc((r.times || []).filter(Boolean).join(' / ') || '09:00 AM')}</td></tr>`).join('')
 return `<section class="sheet ${template}">
 <div class="head">${logo}<div class="school"><h1>${esc(school.schoolName || 'Al Siddique Scholars Public School')}</h1><small>${esc(school.address || '')}${school.phone ? ` | ${esc(school.phone)}` : ''}</small></div><div class="meta"><b>Date Sheet</b><br>${esc(term)}<br>${esc(session)}</div></div>
 <div class="info"><div><span>Student</span><strong>${esc(student.name)}</strong></div><div><span>GR No</span><strong>${esc(student.gr_number || '-')}</strong></div><div><span>Father</span><strong>${esc(student.father_name || '-')}</strong></div><div><span>Class</span><strong>${esc(clsLabel(student.class))} - ${esc(student.section || 'A')}</strong></div></div>
 <table><thead><tr><th>#</th><th>Date</th><th>Day</th><th>Subject</th><th>Time</th></tr></thead><tbody>${lines}</tbody></table><div class="foot"><span>Prepared by Exam Office</span><span>Controller of Examination</span></div>
 </section>`
}

function openPrint({ students, rows, school, term, session, template, layout }) {
 const ordered = [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)))
 const cards = students.map(student => buildCard({ student, rows: ordered, school, term, session, template }))
 const body = layout === 'two'
 ? cards.reduce((html, card, index) => `${html}${index % 2 === 0 ? '<div class="pair">' : ''}${card}${index % 2 === 1 || index === cards.length - 1 ? '</div>' : ''}`, '')
 : cards.join('')
 const w = window.open('', '_blank', 'width=1120,height=820')
 if (!w) return
 w.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>Date Sheets</title><style>${templateCss(template)}</style></head><body class="${layout === 'two' ? 'two' : ''}"><div class="bar"><strong>${esc(term)} Date Sheets</strong><span>${students.length} students</span><button onclick="window.print()">Print / Save PDF</button></div>${body}</body></html>`)
 w.document.close()
}

let rowIdCounter = 1
function makeRow(classLevel, section = '') {
 return { id: rowIdCounter++, classLevel, section }
}

export default function DateSheet() {
 const { activeClasses, subjectsForClass } = useAcademicStore()
 const { students } = useStudentStore()
 const { paperSettings } = usePaperStore()
 const classOptions = activeClasses.map(c => ({ value: c.level, label: c.name }))
 const [session, setSession] = useState(paperSettings.academicYear || '2026-2027')
 const [term, setTerm] = useState('')
 const [dayCount, setDayCount] = useState(5)
 const [warning, setWarning] = useState('Warning! Please select Session and Term to create a Date Sheet.')
 const [gridReady, setGridReady] = useState(false)
 const [columns, setColumns] = useState([])
 const [cellSubjects, setCellSubjects] = useState({})
 // Each row: { id, classLevel, section }
 const [classRows, setClassRows] = useState([])
 const [openCell, setOpenCell] = useState(null)
 const [subjectSearch, setSubjectSearch] = useState('')
 const [sheets, setSheets] = useState(readSheets)
 const [printClass, setPrintClass] = useState(classOptions[0]?.value || '1')
 const [printSession, setPrintSession] = useState(session)
 const [printTerm, setPrintTerm] = useState(TERMS[0])
 const [template, setTemplate] = useState('classic')
 const [layout, setLayout] = useState('single')

 const search = () => {
 if (!session || !term) {
 setWarning('Please select Session and Term to create a Date Sheet.')
 setGridReady(false)
 return
 }
 const count = Math.max(1, Math.min(20, Number(dayCount) || 1))
 setColumns(Array.from({ length: count }, (_, i) => ({ id: i, date: '', times: ['', '', ''] })))
 setClassRows([])
 setCellSubjects({})
 setWarning('')
 setGridReady(true)
 }

 const addAllClasses = () => {
 setClassRows(classOptions.map(c => makeRow(c.value)))
 }

 const clearAllClasses = () => {
 setClassRows([])
 setCellSubjects({})
 }

 const toggleClassChip = (classValue) => {
 const exists = classRows.some(r => r.classLevel === classValue && r.section === '')
 if (exists) {
 setClassRows(prev => prev.filter(r => !(r.classLevel === classValue && r.section === '')))
 } else {
 setClassRows(prev => [...prev, makeRow(classValue)])
 }
 }

 const addCustomRow = () => {
 setClassRows(prev => [...prev, makeRow(classOptions[0]?.value || '')])
 }

 const removeRow = (id) => {
 setClassRows(prev => prev.filter(r => r.id !== id))
 setCellSubjects(prev => {
 const next = { ...prev }
 Object.keys(next).forEach(k => { if (k.startsWith(`${id}-`)) delete next[k] })
 return next
 })
 }

 const updateRow = (id, patch) => {
 setClassRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
 }

 const updateColumn = (index, patch) => setColumns(prev => prev.map((col, i) => i === index ? { ...col, ...patch } : col))
 const updateTime = (index, timeIndex, value) => setColumns(prev => prev.map((col, i) => i === index ? { ...col, times: col.times.map((t, ti) => ti === timeIndex ? value : t) } : col))

 const cellKey = (rowId, dayIndex) => `${rowId}-${dayIndex}`
 const selected = (rowId, dayIndex) => cellSubjects[cellKey(rowId, dayIndex)] || []
 const toggleSubject = (rowId, dayIndex, subject) => {
 const key = cellKey(rowId, dayIndex)
 setCellSubjects(prev => {
 const current = prev[key] || []
 const next = current.includes(subject) ? current.filter(s => s !== subject) : [...current, subject]
 return { ...prev, [key]: next }
 })
 }

 const saveGrid = () => {
 if (!gridReady) return
 const rows = []
 classRows.forEach(row => {
 columns.forEach((col, dayIndex) => {
 const subjects = selected(row.id, dayIndex)
 if (!subjects.length || !col.date) return
 rows.push({
 id: `${Date.now()}-${row.id}-${dayIndex}`,
 session, term,
 class: row.classLevel,
 section: row.section,
 date: col.date,
 day: dayName(col.date),
 times: col.times,
 subjects,
 })
 })
 })
 const next = [...sheets.filter(s => !(s.session === session && s.term === term)), ...rows]
 setSheets(next)
 writeSheets(next)
 setWarning(rows.length ? `${rows.length} date sheet records saved.` : 'Please select at least one date and subject.')
 }

 const printableRows = sheets.filter(row => row.session === printSession && row.term === printTerm && clsValue(row.class) === clsValue(printClass))
 const printableStudents = students.filter(student => clsValue(student.class) === clsValue(printClass))
 const print = () => {
 if (!printableRows.length) return setWarning('No saved date sheet found for the selected class, session, and term.')
 if (!printableStudents.length) return setWarning('No students found for the selected class.')
 openPrint({ students: printableStudents, rows: printableRows, school: paperSettings, term: printTerm, session: printSession, template, layout })
 }

 return (
 <div style={styles.page}>
 <div style={styles.shell}>
 <div style={styles.body}>
 <div style={styles.crumb}>Dashboard <b style={{ color:'rgba(34,211,238,0.8)', padding:'0 9px' }}>»</b> Create Date Sheet</div>
 <div style={styles.notice}>
 The day of each date is picked automatically. To add multiple subjects on the same date, select more than one subject from the dropdown.
 <span style={styles.close}>×</span>
 </div>

 <h1 style={styles.title}>Create Date Sheet</h1>
 <div style={styles.formGrid}>
 <div><label style={styles.label}>Session</label><select style={styles.input} value={session} onChange={e => setSession(e.target.value)}><option>2026-2027</option><option>2027-2028</option></select></div>
 <div><label style={styles.label}>Term</label><select style={styles.input} value={term} onChange={e => setTerm(e.target.value)}><option value="">Select Term</option>{TERMS.map(item => <option key={item}>{item}</option>)}</select></div>
 <div><label style={styles.label}>Number of Days</label><input type="number" min="1" max="20" style={styles.input} value={dayCount} onChange={e => setDayCount(e.target.value)} /></div>
 <button type="button" style={styles.button} onClick={search}>Search</button>
 </div>

 {warning && <div style={styles.warn}><b>{warning}</b><span style={{ ...styles.close, color:'rgba(239,68,68,0.5)' }}>×</span></div>}

 {gridReady && (
 <>
 {/*  Class Picker Panel  */}
 <div style={styles.pickerPanel}>
 <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:10 }}>
 <span style={{ color:'rgba(148,163,184,0.9)', fontSize:13, fontWeight:600 }}>Select Classes for Date Sheet</span>
 <div style={{ display:'flex', gap:8 }}>
 <button type="button" onClick={addAllClasses} style={{ ...styles.button, height:34, fontSize:13, padding:'0 14px', background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', boxShadow:'0 4px 10px rgba(34,197,94,0.25)' }}>
 All Classes
 </button>
 <button type="button" onClick={clearAllClasses} style={{ ...styles.button, height:34, fontSize:13, padding:'0 14px', background:'rgba(100,116,139,0.2)', color:'#e2e8f0', border:'1px solid rgba(148,163,184,0.2)', boxShadow:'none' }}>
 Clear All
 </button>
 <button type="button" onClick={addCustomRow} style={{ ...styles.button, height:34, fontSize:13, padding:'0 14px' }}>
 <Plus size={14} /> Add Row
 </button>
 </div>
 </div>

 {/* Class chips */}
 <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
 {classOptions.map(opt => {
 const active = classRows.some(r => r.classLevel === opt.value)
 return (
 <button
 key={opt.value}
 type="button"
 onClick={() => toggleClassChip(opt.value)}
 style={{
 ...styles.chip,
 background: active ? 'rgba(34,211,238,0.15)' : 'rgba(15,23,42,0.5)',
 color: active ? '#22d3ee' : 'rgba(148,163,184,0.8)',
 borderColor: active ? 'rgba(34,211,238,0.4)' : 'rgba(148,163,184,0.2)',
 }}
 >
 {opt.label}
 {active && <X size={12} />}
 </button>
 )
 })}
 {classOptions.length === 0 && (
 <span style={{ color:'rgba(148,163,184,0.5)', fontSize:13 }}>No classes configured. Add classes in Academic Setup first.</span>
 )}
 </div>

 {classRows.length > 0 && (
 <div style={{ marginTop:12, color:'rgba(148,163,184,0.6)', fontSize:12 }}>
 {classRows.length} row{classRows.length !== 1 ? 's' : ''} in grid — you can also add section labels below (e.g., A, B, Red, Blue)
 </div>
 )}
 </div>

 {classRows.length === 0 && (
 <div style={{ textAlign:'center', padding:'28px 0', color:'rgba(148,163,184,0.4)', fontSize:14 }}>
 Select classes above to populate the date sheet grid.
 </div>
 )}

 {classRows.length > 0 && (
 <>
 <div style={styles.gridWrap}>
 <table style={styles.table}>
 <thead>
 <tr>
 <th style={styles.classTh}>Class / Section</th>
 {columns.map((col, dayIndex) => (
 <th key={col.id} style={styles.th}>
 <input type="date" style={{ ...styles.input, height:34, fontSize:15, fontWeight:800, marginBottom:6 }} value={col.date} onChange={e => updateColumn(dayIndex, { date:e.target.value })} />
 {col.times.map((time, ti) => (
 <input key={ti} type="time" style={{ ...styles.input, height:30, fontSize:14, marginBottom:5 }} value={time} onChange={e => updateTime(dayIndex, ti, e.target.value)} />
 ))}
 <div style={{ color:'#fff', fontSize:12, marginTop:2 }}>{dayName(col.date)}</div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {classRows.map(row => (
 <tr key={row.id}>
 <td style={styles.classCell}>
 {/* Class selector */}
 <select
 style={{ ...styles.input, height:36, marginBottom:6 }}
 value={row.classLevel}
 onChange={e => updateRow(row.id, { classLevel: e.target.value })}
 >
 {classOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
 </select>
 {/* Section input */}
 <div style={{ display:'flex', gap:6, alignItems:'center' }}>
 <input
 style={{ ...styles.input, height:32, fontSize:13, flex:1 }}
 placeholder="Section (optional)"
 value={row.section}
 onChange={e => updateRow(row.id, { section: e.target.value })}
 />
 <button
 type="button"
 title="Remove this row"
 onClick={() => removeRow(row.id)}
 style={{ flexShrink:0, width:28, height:28, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.1)', color:'#ef4444', borderRadius:6, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
 >
 <X size={13} />
 </button>
 </div>
 {row.section && (
 <div style={{ color:'rgba(34,211,238,0.7)', fontSize:11, marginTop:4, fontWeight:600 }}>
 {clsLabel(row.classLevel)} — {row.section}
 </div>
 )}
 </td>
 {columns.map((col, dayIndex) => {
 const picked = selected(row.id, dayIndex)
 const subjects = subjectsForClass(row.classLevel).filter(subject => subject.toLowerCase().includes(subjectSearch.toLowerCase()))
 const key = cellKey(row.id, dayIndex)
 const isOpen = openCell === key
 return (
 <td key={col.id} style={styles.td}>
 <button
 type="button"
 style={{ ...styles.cellBtn, borderColor:isOpen ? '#22d3ee' : 'rgba(148,163,184,0.2)', color:picked.length ? '#fff' : 'rgba(148,163,184,0.6)', background:picked.length ? 'rgba(34,211,238,0.1)' : 'rgba(15,23,42,0.5)' }}
 onClick={() => { setOpenCell(isOpen ? null : key); setSubjectSearch('') }}
 >
 {picked.length ? picked.join(', ') : 'Select subject'}
 </button>
 {isOpen && (
 <div style={styles.dropdown}>
 <input
 style={styles.searchBox}
 placeholder="Search subject…"
 value={subjectSearch}
 onChange={e => setSubjectSearch(e.target.value)}
 autoFocus
 />
 {subjects.length === 0 && (
 <div style={{ padding:'12px 16px', color:'rgba(148,163,184,0.5)', fontSize:13 }}>No subjects configured for this class.</div>
 )}
 {subjects.map(subject => (
 <div
 key={subject}
 style={{ ...styles.subjectRow, background:picked.includes(subject) ? 'rgba(34,211,238,0.15)' : 'transparent', color:picked.includes(subject) ? '#22d3ee' : '#e2e8f0' }}
 onClick={() => toggleSubject(row.id, dayIndex, subject)}
 >
 {subject}
 </div>
 ))}
 </div>
 )}
 </td>
 )
 })}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:16 }}>
 <button type="button" style={{ ...styles.button, background:'rgba(100,116,139,0.2)', color:'#e2e8f0', border:'1px solid rgba(148,163,184,0.2)', boxShadow:'none' }} onClick={() => setOpenCell(null)}>Close Dropdown</button>
 <button type="button" style={{ ...styles.button, background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', boxShadow:'0 4px 12px rgba(34,197,94,0.3)' }} onClick={saveGrid}><Save size={15} /> Save Date Sheet</button>
 </div>
 </>
 )}
 </>
 )}

 <div style={styles.printPanel}>
 <h2 style={{ ...styles.title, fontSize:20, margin:'0 0 2px', paddingBottom:10 }}>Print Student Date Sheets</h2>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(5, minmax(0, 1fr))', gap:14 }}>
 <div><label style={styles.label}>Class</label><select style={styles.input} value={printClass} onChange={e => setPrintClass(e.target.value)}>{classOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
 <div><label style={styles.label}>Session</label><input style={styles.input} value={printSession} onChange={e => setPrintSession(e.target.value)} /></div>
 <div><label style={styles.label}>Term</label><select style={styles.input} value={printTerm} onChange={e => setPrintTerm(e.target.value)}>{TERMS.map(item => <option key={item}>{item}</option>)}</select></div>
 <div><label style={styles.label}>Template</label><select style={styles.input} value={template} onChange={e => setTemplate(e.target.value)}>{TEMPLATES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
 <div><label style={styles.label}>Layout</label><select style={styles.input} value={layout} onChange={e => setLayout(e.target.value)}><option value="single">1 student per page</option><option value="two">2 students per page</option></select></div>
 </div>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', color:'#64748b', fontSize:14 }}>
 <span>{printableRows.length} saved papers | {printableStudents.length} students</span>
 <button type="button" style={styles.button} onClick={print}><Printer size={15} /> Print</button>
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}

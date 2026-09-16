import { useState, useEffect } from 'react'
import { Printer, Save, Plus, X, Edit2, RotateCcw } from 'lucide-react'
import { classLevelLabel, classLevelsMatch, useAcademicStore } from '../services/useAcademicStore'
import { useStudentStore } from '../services/useStudentStore'
import { usePaperStore } from './Paper-Generator/usePaperStore'
import {
  FINAL_EXAM_PAPER_TIME,
  FINAL_EXAM_SEED_KEY,
  FINAL_EXAM_SEED_VERSION,
  FINAL_EXAM_SESSION,
  FINAL_EXAM_TERM,
  mergeFinalExamRows,
  validateFinalExamRows,
} from './dateSheetFinalExam2026'

const STORE_KEY = 'al_siddique_date_sheets'
const TERMS = ['First Term Exam', 'Second Term Exam', 'Annual Exam', 'Monthly Assessment']
const TEMPLATES = [
  { id: 'classic', label: 'Template 1 - Classic' },
  { id: 'premium', label: 'Template 2 - Premium Navy' },
  { id: 'minimal', label: 'Template 3 - Clean Minimal' },
  { id: 'orange-executive', label: 'Template 4 - Executive Orange' },
  { id: 'yellow-academic', label: 'Template 5 - Academic Yellow' },
  { id: 'purple-royal', label: 'Template 6 - Royal Purple' },
  { id: 'red-formal', label: 'Template 7 - Formal Red' },
  { id: 'pink-modern', label: 'Template 8 - Modern Pink' },
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
    const storage = getStorage()
    const saved = JSON.parse(storage?.getItem(STORE_KEY) || '[]')
    const rows = Array.isArray(saved) ? saved : []
    if (storage?.getItem(FINAL_EXAM_SEED_KEY) === FINAL_EXAM_SEED_VERSION) return rows
    const seeded = mergeFinalExamRows(rows)
    if (validateFinalExamRows(seeded).length) return rows
    storage?.setItem(STORE_KEY, JSON.stringify(seeded))
    storage?.setItem(FINAL_EXAM_SEED_KEY, FINAL_EXAM_SEED_VERSION)
    return seeded
  } catch {
    return []
  }
}

function writeSheets(rows) {
  const storage = getStorage()
  try { storage?.setItem(STORE_KEY, JSON.stringify(rows)) } catch {
    // localStorage can be blocked in private/restricted browser contexts.
  }
}

function sameClass(left, right) {
  if (!left || !right) return false
  const cleanLeft = String(left).replace(/^Class\s+/i, '')
  const cleanRight = String(right).replace(/^Class\s+/i, '')
  return classLevelsMatch(cleanLeft, cleanRight)
}

function clsLabel(value) {
  if (!value) return ''
  return classLevelLabel(value) || (/^Class\s/i.test(String(value)) ? value : `Class ${value}`)
}

function studentClass(student = {}) {
  return student.class || student.class_name || student.className || student.class_level || student.grade
}

function isActiveStudent(student = {}) {
  return student.is_active !== false && String(student.status || 'Active').toLowerCase() !== 'inactive'
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

let rowIdCounter = 1
function makeRow(classLevel, section = '') {
  return { id: rowIdCounter++, classLevel, section }
}

function extractLoadedGrid(sessionVal, termVal, allSheets, classOpts) {
  const matching = (allSheets || []).filter(s => s.session === sessionVal && s.term === termVal)
  if (!matching.length) {
    return null
  }
  const uniqueDates = Array.from(new Set(matching.map(m => m.date).filter(Boolean))).sort()
  const loadedColumns = uniqueDates.map((d, index) => {
    const sample = matching.find(m => m.date === d && Array.isArray(m.times) && m.times.some(Boolean))
    const rawTimes = sample?.times || []
    const times = [rawTimes[0] || FINAL_EXAM_PAPER_TIME || '10:00 AM - 12:00 PM', rawTimes[1] || '', rawTimes[2] || '']
    return { id: index, date: d, times }
  })

  const distinctPairs = []
  const seenPairs = new Set()
  matching.forEach(m => {
    const k = `${m.class}:::${m.section || ''}`
    if (!seenPairs.has(k)) {
      seenPairs.add(k)
      distinctPairs.push({ classLevel: m.class, section: m.section || '' })
    }
  })

  distinctPairs.sort((a, b) => {
    const idxA = classOpts.findIndex(c => sameClass(c.value, a.classLevel))
    const idxB = classOpts.findIndex(c => sameClass(c.value, b.classLevel))
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return String(a.classLevel).localeCompare(String(b.classLevel))
  })

  const loadedClassRows = distinctPairs.map(p => makeRow(p.classLevel, p.section))
  const loadedCellSubjects = {}
  loadedClassRows.forEach(row => {
    loadedColumns.forEach((col, dayIndex) => {
      const rec = matching.find(m => sameClass(m.class, row.classLevel) && (m.section || '') === (row.section || '') && m.date === col.date)
      if (rec && Array.isArray(rec.subjects) && rec.subjects.length) {
        loadedCellSubjects[`${row.id}-${dayIndex}`] = [...rec.subjects]
      }
    })
  })

  return {
    columns: loadedColumns,
    classRows: loadedClassRows,
    cellSubjects: loadedCellSubjects,
    totalRecords: matching.length,
    classCount: distinctPairs.length,
    dateCount: uniqueDates.length,
  }
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
  th: { background:'rgba(15,23,42,0.8)', color:'#fff', border:'1px solid rgba(148,163,184,0.1)', padding:'12px 14px', verticalAlign:'bottom', minWidth:176, fontSize:13, fontWeight:600 },
  classTh: { background:'rgba(15,23,42,0.8)', color:'#fff', border:'1px solid rgba(148,163,184,0.1)', padding:'12px 14px', minWidth:200, textAlign:'left', verticalAlign:'bottom', fontSize:13, fontWeight:600 },
  td: { border:'1px solid rgba(148,163,184,0.1)', background:'rgba(30,41,59,0.3)', minWidth:176, height:80, padding:10, verticalAlign:'top', position:'relative' },
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
  const themes = {
    classic: { accent:'#2563EB', dark:'#0B1F3A', soft:'#EFF6FF', table:'#0B1F3A', tableText:'#FFFFFF', border:'#C9D5E3', card:'#F8FAFC' },
    premium: { accent:'#C8991A', dark:'#0B1F3A', soft:'#FFF7D6', table:'#C8991A', tableText:'#071E34', border:'#0B1F3A', card:'#FFFDF3' },
    minimal: { accent:'#0B1F3A', dark:'#0B1F3A', soft:'#F8FAFC', table:'#0B1F3A', tableText:'#FFFFFF', border:'#0B1F3A', card:'#FFFFFF' },
    'orange-executive': { accent:'#EA580C', dark:'#431407', soft:'#FFF7ED', table:'#9A3412', tableText:'#FFFFFF', border:'#FDBA74', card:'#FFFBF6' },
    'yellow-academic': { accent:'#D97706', dark:'#0F172A', soft:'#FEFCE8', table:'#0F172A', tableText:'#FDE047', border:'#FACC15', card:'#FFFDEB' },
    'purple-royal': { accent:'#7C3AED', dark:'#2E1065', soft:'#F5F3FF', table:'#4C1D95', tableText:'#FFFFFF', border:'#C4B5FD', card:'#FBFAFF' },
    'red-formal': { accent:'#DC2626', dark:'#450A0A', soft:'#FEF2F2', table:'#991B1B', tableText:'#FFFFFF', border:'#FCA5A5', card:'#FFF8F8' },
    'pink-modern': { accent:'#DB2777', dark:'#500724', soft:'#FDF2F8', table:'#BE185D', tableText:'#FFFFFF', border:'#F9A8D4', card:'#FFF7FB' },
  }
  const theme = themes[template] || themes.classic
  const isNew = ['orange-executive', 'yellow-academic', 'purple-royal', 'red-formal', 'pink-modern'].includes(template)
  return `
  @page{size:A4 portrait;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;background:#e5e7eb;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#102033}.bar{background:#071e34;color:white;padding:10px 16px;display:flex;gap:10px}.bar button{margin-left:auto;background:#C8991A;border:0;border-radius:6px;padding:8px 18px;font-weight:800;cursor:pointer}
  @media print{body{background:white}.bar{display:none!important}}
  .sheet{position:relative;width:190mm;height:277mm;background:#fff;margin:10mm auto;padding:12mm 14mm;break-after:page;overflow:hidden;border:1px solid ${theme.border}}
  .two .sheet{height:133mm;margin:0;width:190mm;padding:7mm 11mm;break-after:auto;border:1px solid ${theme.border}}.pair{width:210mm;height:297mm;padding:7mm 10mm;background:white;display:flex;flex-direction:column;gap:5mm;break-after:page}
  .head{display:grid;grid-template-columns:25mm minmax(0,1fr) 46mm;gap:6mm;align-items:center;border-bottom:2.5px solid ${theme.accent};padding-bottom:4mm;margin-bottom:5mm}.two .head{grid-template-columns:18mm minmax(0,1fr) 38mm;gap:4mm;padding-bottom:2.5mm;margin-bottom:2.5mm;border-bottom-width:1.5px}
  .logo{width:24mm;height:24mm;border:1.5px solid ${theme.border};border-radius:${template === 'minimal' ? '4mm' : '50%'};object-fit:contain;padding:2mm;background:white}.two .logo{width:16mm;height:16mm;padding:1.5mm}
  .school h1{margin:0;color:${theme.dark};font-size:${isNew ? '26pt' : '23pt'};line-height:1.02;text-transform:uppercase;font-weight:900;letter-spacing:0.4px}.two .school h1{font-size:16pt;line-height:1.05}
  .school small{display:block;color:#475569;font-size:8pt;margin-top:1.5mm;line-height:1.3;font-weight:600}.two .school small{font-size:6.8pt;margin-top:0.8mm}
  .meta{justify-self:end;width:45mm;text-align:center;border:1.5px solid ${theme.border};background:${theme.soft};border-radius:3mm;padding:2.5mm 3mm;display:flex;flex-direction:column;gap:1.2mm}.two .meta{width:36mm;padding:1.8mm 2mm;border-radius:2mm;gap:0.8mm}
  .meta-kicker{display:block;text-transform:uppercase;font-size:6.8pt;font-weight:900;letter-spacing:0.8px;color:${theme.accent}}.two .meta-kicker{font-size:5.8pt}
  .meta-term{display:block;font-size:11.5pt;font-weight:900;line-height:1.05;color:${theme.dark};text-transform:uppercase}.two .meta-term{font-size:8.5pt}
  .meta-session{display:inline-block;margin:0 auto;font-size:7pt;font-weight:700;color:#475569;background:white;border:1px solid ${theme.border};border-radius:12px;padding:1px 6px}.two .meta-session{font-size:6pt;padding:0 4px}
  .info{display:grid;grid-template-columns:repeat(4,1fr);gap:2.5mm;margin-bottom:5mm}.two .info{gap:1.8mm;margin-bottom:2.8mm}
  .info div{border:1px solid ${theme.border};background:${theme.card};padding:2.2mm 2.8mm;border-radius:2mm}.two .info div{padding:1.4mm 2mm;border-radius:1.5mm}
  .info span{display:block;color:#64748b;font-size:7pt;text-transform:uppercase;font-weight:800;letter-spacing:0.4px}.two .info span{font-size:5.8pt}
  .info strong{display:block;color:${theme.dark};font-size:10.5pt;line-height:1.15;margin-top:0.8mm;font-weight:800}.two .info strong{font-size:8pt;margin-top:0.4mm}
  table{width:100%;border-collapse:collapse;font-size:9.5pt}.two table{font-size:7.5pt}
  th{background:${theme.table};color:${theme.tableText};font-size:8pt;text-transform:uppercase;font-weight:900;letter-spacing:0.5px;padding:2.8mm 3mm}.two th{padding:1.4mm 2mm;font-size:6.8pt}
  td{border:1px solid #cbd5e1;padding:2.8mm 3mm;text-align:left;vertical-align:middle}.two td{padding:1.3mm 2mm}
  td:first-child,th:first-child{text-align:center;width:8mm}.two td:first-child,.two th:first-child{width:6mm}
  th:nth-child(2),td:nth-child(2){width:31mm;font-weight:700}.two th:nth-child(2),td:nth-child(2){width:24mm}
  th:nth-child(3),td:nth-child(3){width:27mm}.two th:nth-child(3),td:nth-child(3){width:22mm}
  th:nth-child(5),td:nth-child(5){width:42mm;font-weight:800;color:${theme.dark}}.two th:nth-child(5),td:nth-child(5){width:34mm}
  .foot{position:absolute;left:14mm;right:14mm;bottom:9mm;display:flex;justify-content:space-between;color:#64748b;font-size:8pt;font-weight:700}.two .foot{display:none}
  .foot span{border-top:1.5px solid #94a3b8;padding-top:1.5mm;min-width:44mm;text-align:center}
  .premium{border:4mm solid #0B1F3A}.minimal{border:none;border-top:5mm solid #0B1F3A}
  .orange-executive{border-top:6mm solid #EA580C;background:linear-gradient(180deg,#FFFDF9 0%,#FFFFFF 18%)}.orange-executive .head{background:linear-gradient(90deg,#FFF7ED 0%,#FFFFFF 70%);padding:4mm;border-radius:3mm;border-bottom:1.5mm solid #EA580C}.orange-executive .info div{border-left:1.5mm solid #EA580C}
  .yellow-academic{border-left:5mm solid #D97706;border-top:1px solid #FDE047}.yellow-academic .head{background:#FEFCE8;border:1.2px solid #FACC15;padding:4mm;border-radius:3mm}.yellow-academic .meta{background:#0F172A;border-color:#0F172A}.yellow-academic .meta-term{color:#FDE047}.yellow-academic .meta-kicker{color:#FBBF24}.yellow-academic .meta-session{background:#1E293B;color:#FEF08A;border-color:#334155}
  .purple-royal{border:2mm solid #4C1D95}.purple-royal .head{background:#F5F3FF;padding:4mm;border-radius:3mm;border-bottom:1.2mm solid #7C3AED}.purple-royal .meta{background:#4C1D95;border-color:#3B0764}.purple-royal .meta-term{color:#FFFFFF}.purple-royal .meta-kicker{color:#DDD6FE}.purple-royal .meta-session{background:#581C87;color:#E9D5FF;border-color:#6B21A8}.purple-royal .info div{border-color:#C4B5FD}
  .red-formal{border-top:5mm solid #991B1B;border-bottom:2mm solid #991B1B}.red-formal .head{background:#FEF2F2;padding:4mm;border-radius:3mm;border-bottom:1.5mm solid #DC2626}.red-formal .info div{background:#FFF5F5;border-color:#FCA5A5}
  .pink-modern{border:none;border-top:4mm solid #DB2777;box-shadow:inset 0 0 0 1.2px #F9A8D4}.pink-modern .head{background:#FDF2F8;border:1.2px solid #F9A8D4;border-radius:4mm;padding:4mm}.pink-modern .logo{border-radius:5mm}.pink-modern tbody tr:nth-child(even){background:#FFF7FB}
  `
}

function buildCard({ student, rows, school, term, session, template }) {
  const logo = school.logo ? `<img class="logo" src="${school.logo}" alt="logo">` : '<div class="logo" style="display:grid;place-items:center;font-weight:900">S</div>'
  const lines = rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(prettyDate(r.date))}</td><td>${esc(dayName(r.date))}</td><td>${esc(r.subjects.join(', '))}</td><td>${esc((r.times || []).filter(Boolean).join(' / '))}</td></tr>`).join('')
  return `<section class="sheet ${template}">
  <div class="head">
    ${logo}
    <div class="school">
      <h1>${esc(school.schoolName || 'Al Siddique Scholars Public School')}</h1>
      <small>${esc(school.address || 'Sharif Chowk, Rayya Khas, Narowal')}${school.phone ? ` | Ph: ${esc(school.phone)}` : ''}</small>
    </div>
    <div class="meta">
      <span class="meta-kicker">Date Sheet</span>
      <strong class="meta-term">${esc(term)}</strong>
      <span class="meta-session">Session ${esc(session)}</span>
    </div>
  </div>
  <div class="info">
    <div><span>Student</span><strong>${esc(student.name)}</strong></div>
    <div><span>GR No</span><strong>${esc(student.gr_number || '-')}</strong></div>
    <div><span>Father</span><strong>${esc(student.father_name || '-')}</strong></div>
    <div><span>Class</span><strong>${esc(clsLabel(student.class))} - ${esc(student.section || 'A')}</strong></div>
  </div>
  <table><thead><tr><th>#</th><th>Date</th><th>Day</th><th>Subject</th><th>Time</th></tr></thead><tbody>${lines}</tbody></table>
  <div class="foot"><span>Prepared by Exam Office</span><span>Controller of Examination</span></div>
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

export default function DateSheet() {
  const { activeClasses, subjectsForClass } = useAcademicStore()
  const { students } = useStudentStore()
  const { paperSettings } = usePaperStore()
  const classOptions = activeClasses.map(c => ({ value: c.level, label: c.name }))
  const [session, setSession] = useState(paperSettings.academicYear || FINAL_EXAM_SESSION)
  const [term, setTerm] = useState(FINAL_EXAM_TERM)
  const [dayCount, setDayCount] = useState(12)
  const [warning, setWarning] = useState('')
  const [gridReady, setGridReady] = useState(false)
  const [columns, setColumns] = useState([])
  const [cellSubjects, setCellSubjects] = useState({})
  // Each row: { id, classLevel, section }
  const [classRows, setClassRows] = useState([])
  const [openCell, setOpenCell] = useState(null)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [sheets, setSheets] = useState(readSheets)
  const [printClass, setPrintClass] = useState(classOptions[0]?.value || '1')
  const [printSession, setPrintSession] = useState(paperSettings.academicYear || FINAL_EXAM_SESSION)
  const [printTerm, setPrintTerm] = useState(FINAL_EXAM_TERM)
  const [template, setTemplate] = useState('classic')
  const [layout, setLayout] = useState('single')

  const loadDateSheet = (targetSession, targetTerm) => {
    if (!targetSession || !targetTerm) {
      setWarning('Please select Session and Term to create or edit a Date Sheet.')
      setGridReady(false)
      return
    }
    setSession(targetSession)
    setTerm(targetTerm)
    const loaded = extractLoadedGrid(targetSession, targetTerm, sheets, classOptions)
    if (loaded) {
      setColumns(loaded.columns)
      setClassRows(loaded.classRows)
      setCellSubjects(loaded.cellSubjects)
      setDayCount(loaded.columns.length)
      setGridReady(true)
      setWarning(`Loaded ${loaded.totalRecords} date sheet records (${loaded.classCount} classes, ${loaded.dateCount} dates) for ${targetTerm} (${targetSession}). You can now edit dates, times, and subjects directly.`)
    } else {
      const count = Math.max(1, Math.min(20, Number(dayCount) || 5))
      setColumns(Array.from({ length: count }, (_, i) => ({ id: i, date: '', times: [FINAL_EXAM_PAPER_TIME || '10:00 AM - 12:00 PM', '', ''] })))
      setClassRows([])
      setCellSubjects({})
      setGridReady(true)
      setWarning(`No existing date sheet found for ${targetTerm} (${targetSession}). New blank grid prepared — select classes to begin.`)
    }
  }

  const search = () => {
    loadDateSheet(session, term)
  }

  useEffect(() => {
    if (session && term) {
      loadDateSheet(session, term)
    }
  }, [])

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

  const addColumn = () => {
    setColumns(prev => [
      ...prev,
      { id: Date.now(), date: '', times: [FINAL_EXAM_PAPER_TIME || '10:00 AM - 12:00 PM', '', ''] }
    ])
  }

  const removeColumn = (colIndex) => {
    setColumns(prev => prev.filter((_, i) => i !== colIndex))
    setCellSubjects(prev => {
      const next = {}
      Object.entries(prev).forEach(([k, val]) => {
        const lastDash = k.lastIndexOf('-')
        const rId = k.slice(0, lastDash)
        const d = Number(k.slice(lastDash + 1))
        if (d < colIndex) {
          next[k] = val
        } else if (d > colIndex) {
          next[`${rId}-${d - 1}`] = val
        }
      })
      return next
    })
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
          section: row.section || '',
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
    setWarning(rows.length ? `Successfully saved ${rows.length} date sheet records for ${term} (${session}).` : 'Please select at least one date and subject.')
  }

  const restoreDefaultSeed = () => {
    if (typeof window !== 'undefined' && !window.confirm('Restore official First Term Exam 2026-2027 staggered timetable? Any custom changes made to First Term Exam will be replaced by the official schedule.')) return
    const storage = getStorage()
    storage?.removeItem(FINAL_EXAM_SEED_KEY)
    const seeded = mergeFinalExamRows([])
    const cleaned = sheets.filter(s => !(s.session === FINAL_EXAM_SESSION && s.term === FINAL_EXAM_TERM))
    const combined = [...cleaned, ...seeded]
    writeSheets(combined)
    storage?.setItem(FINAL_EXAM_SEED_KEY, FINAL_EXAM_SEED_VERSION)
    setSheets(combined)
    setSession(FINAL_EXAM_SESSION)
    setTerm(FINAL_EXAM_TERM)
    const loaded = extractLoadedGrid(FINAL_EXAM_SESSION, FINAL_EXAM_TERM, combined, classOptions)
    if (loaded) {
      setColumns(loaded.columns)
      setClassRows(loaded.classRows)
      setCellSubjects(loaded.cellSubjects)
      setDayCount(loaded.columns.length)
      setGridReady(true)
      setWarning('Restored official First Term Exam 2026-2027 staggered timetable with 77 papers.')
    }
  }

  const printableRows = sheets.filter(row => row.session === printSession && row.term === printTerm && sameClass(row.class, printClass))
  const printableStudents = students.filter(student => isActiveStudent(student) && sameClass(studentClass(student), printClass))
  const printablePreviewRows = [...printableRows].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const print = () => {
    if (!printableRows.length) return setWarning('No saved date sheet found for the selected class, session, and term.')
    if (!printableStudents.length) return setWarning('No students found for the selected class.')
    openPrint({ students: printableStudents, rows: printableRows, school: paperSettings, term: printTerm, session: printSession, template, layout })
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.body}>
          <div style={styles.crumb}>Dashboard <b style={{ color:'rgba(34,211,238,0.8)', padding:'0 9px' }}>»</b> Create &amp; Edit Date Sheet</div>
          <div style={styles.notice}>
            The day of each date is picked automatically. You can edit dates, times, and subjects directly in the grid. To add multiple subjects on the same date, select more than one subject from the dropdown.
            <span style={styles.close}>×</span>
          </div>

          <h1 style={styles.title}>Create &amp; Edit Date Sheet</h1>
          <div style={styles.formGrid}>
            <div><label style={styles.label}>Session</label><select style={styles.input} value={session} onChange={e => setSession(e.target.value)}><option>2026-2027</option><option>2027-2028</option></select></div>
            <div><label style={styles.label}>Term</label><select style={styles.input} value={term} onChange={e => setTerm(e.target.value)}><option value="">Select Term</option>{TERMS.map(item => <option key={item}>{item}</option>)}</select></div>
            <div><label style={styles.label}>Number of Days</label><input type="number" min="1" max="20" style={styles.input} value={dayCount} onChange={e => setDayCount(e.target.value)} /></div>
            <button type="button" style={styles.button} onClick={search}><Edit2 size={14} /> Search / Edit</button>
          </div>

          {warning && <div style={styles.warn}><b>{warning}</b><span style={{ ...styles.close, color:'rgba(239,68,68,0.5)' }}>×</span></div>}

          {gridReady && (
            <>
              {/*  Class Picker & Toolbar Panel  */}
              <div style={styles.pickerPanel}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:10 }}>
                  <span style={{ color:'rgba(148,163,184,0.9)', fontSize:13, fontWeight:600 }}>Manage Classes &amp; Schedule Dates</span>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button type="button" onClick={addAllClasses} style={{ ...styles.button, height:34, fontSize:13, padding:'0 14px', background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', boxShadow:'0 4px 10px rgba(34,197,94,0.25)' }}>
                      All Classes
                    </button>
                    <button type="button" onClick={clearAllClasses} style={{ ...styles.button, height:34, fontSize:13, padding:'0 14px', background:'rgba(100,116,139,0.2)', color:'#e2e8f0', border:'1px solid rgba(148,163,184,0.2)', boxShadow:'none' }}>
                      Clear All
                    </button>
                    <button type="button" onClick={addCustomRow} style={{ ...styles.button, height:34, fontSize:13, padding:'0 14px' }}>
                      <Plus size={14} /> Add Class Row
                    </button>
                    <button type="button" onClick={addColumn} style={{ ...styles.button, height:34, fontSize:13, padding:'0 14px', background:'linear-gradient(135deg, #0A84FF 0%, #22d3ee 100%)' }}>
                      <Plus size={14} /> Add Exam Date
                    </button>
                    {session === FINAL_EXAM_SESSION && term === FINAL_EXAM_TERM && (
                      <button type="button" onClick={restoreDefaultSeed} style={{ ...styles.button, height:34, fontSize:13, padding:'0 14px', background:'rgba(245,166,35,0.15)', color:'#f5a623', border:'1px solid rgba(245,166,35,0.3)', boxShadow:'none' }}>
                        <RotateCcw size={13} /> Restore Default Timetable
                      </button>
                    )}
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
                    {classRows.length} class row{classRows.length !== 1 ? 's' : ''} &amp; {columns.length} exam date{columns.length !== 1 ? 's' : ''} — edit subjects, dates, or times below.
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
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                                <span style={{ fontSize:11, color:'rgba(34,211,238,0.9)', fontWeight:800, textTransform:'uppercase', letterSpacing:0.5 }}>Day {dayIndex + 1}</span>
                                {columns.length > 1 && (
                                  <button
                                    type="button"
                                    title="Remove this date column"
                                    onClick={() => removeColumn(dayIndex)}
                                    style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:4, cursor:'pointer', width:20, height:20, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:0 }}
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                              <input type="date" style={{ ...styles.input, height:34, fontSize:13, fontWeight:700, marginBottom:6 }} value={col.date} onChange={e => updateColumn(dayIndex, { date:e.target.value })} />
                              {col.times.map((time, ti) => (
                                <input
                                  key={ti}
                                  type="text"
                                  placeholder={`Time slot ${ti + 1}`}
                                  style={{ ...styles.input, height:28, fontSize:12, marginBottom:4 }}
                                  value={time}
                                  onChange={e => updateTime(dayIndex, ti, e.target.value)}
                                />
                              ))}
                              <div style={{ color:'#22d3ee', fontSize:12, marginTop:4, fontWeight:700 }}>{dayName(col.date) || '—'}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {classRows.map(row => (
                          <tr key={row.id}>
                            <td style={styles.classCell}>
                              <select
                                style={{ ...styles.input, height:36, marginBottom:6 }}
                                value={row.classLevel}
                                onChange={e => updateRow(row.id, { classLevel: e.target.value })}
                              >
                                {classOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                              </select>
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
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14 }}>
              <div><label style={styles.label}>Class</label><select style={styles.input} value={printClass} onChange={e => setPrintClass(e.target.value)}>{classOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
              <div><label style={styles.label}>Session</label><input style={styles.input} value={printSession} onChange={e => setPrintSession(e.target.value)} /></div>
              <div><label style={styles.label}>Term</label><select style={styles.input} value={printTerm} onChange={e => setPrintTerm(e.target.value)}>{TERMS.map(item => <option key={item}>{item}</option>)}</select></div>
              <div><label style={styles.label}>Template</label><select style={styles.input} value={template} onChange={e => setTemplate(e.target.value)}>{TEMPLATES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
              <div><label style={styles.label}>Layout</label><select style={styles.input} value={layout} onChange={e => setLayout(e.target.value)}><option value="single">1 student per page</option><option value="two">2 students per page</option></select></div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', color:'#64748b', fontSize:14, flexWrap:'wrap', gap:10 }}>
              <span>{printableRows.length} saved papers | {printableStudents.length} students</span>
              <button type="button" style={styles.button} onClick={print}><Printer size={15} /> Print</button>
            </div>
            {printablePreviewRows.length > 0 && (
              <div style={{ border:'1px solid rgba(148,163,184,0.12)', borderRadius:14, overflow:'hidden', background:'rgba(15,23,42,0.35)' }}>
                <div style={{ padding:'12px 16px', color:'#e2e8f0', fontWeight:700, borderBottom:'1px solid rgba(148,163,184,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                  <div>
                    <span style={{ fontSize:15, color:'#fff' }}>{clsLabel(printClass)} - {printTerm} preview</span>
                    <span style={{ color:'rgba(148,163,184,0.7)', fontSize:12, marginLeft:10 }}>({printablePreviewRows.length} papers scheduled)</span>
                  </div>
                  <button
                    type="button"
                    style={{ ...styles.button, height:32, fontSize:12, padding:'0 14px', background:'linear-gradient(135deg, #0A84FF 0%, #22d3ee 100%)' }}
                    onClick={() => {
                      loadDateSheet(printSession, printTerm)
                      window.scrollTo({ top: 120, behavior: 'smooth' })
                    }}
                  >
                    <Edit2 size={13} /> Edit This Date Sheet
                  </button>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, color:'#cbd5e1' }}>
                  <thead>
                    <tr style={{ background:'rgba(15,23,42,0.55)', color:'#94a3b8', textTransform:'uppercase', fontSize:11 }}>
                      <th style={{ textAlign:'left', padding:'9px 12px' }}>Date</th>
                      <th style={{ textAlign:'left', padding:'9px 12px' }}>Day</th>
                      <th style={{ textAlign:'left', padding:'9px 12px' }}>Subject</th>
                      <th style={{ textAlign:'left', padding:'9px 12px' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printablePreviewRows.map(row => (
                      <tr key={row.id} style={{ borderTop:'1px solid rgba(148,163,184,0.08)' }}>
                        <td style={{ padding:'10px 12px', fontWeight:700 }}>{prettyDate(row.date)}</td>
                        <td style={{ padding:'10px 12px' }}>{dayName(row.date)}</td>
                        <td style={{ padding:'10px 12px', color:'#fff', fontWeight:700 }}>{(row.subjects || []).join(', ')}</td>
                        <td style={{ padding:'10px 12px' }}>{(row.times || []).filter(Boolean).join(' / ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

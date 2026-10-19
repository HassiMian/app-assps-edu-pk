import { useState, useEffect } from 'react'
import { Printer, Save, Plus, X, Edit2, Smartphone, Share2, Grid } from 'lucide-react'
import { classLevelLabel, classLevelsMatch, useAcademicStore } from '../services/useAcademicStore'
import { useStudentStore } from '../services/useStudentStore'
import { usePaperStore } from './Paper-Generator/usePaperStore'
import api from '../services/api'
import { pickDateSheetSession, dateSheetSessionOptions } from './dateSheetSession'

function academicSessionLabel(sessionStart, sessionEnd) {
  const start = String(sessionStart || '').slice(0, 4)
  const end = String(sessionEnd || '').slice(0, 4)
  return /^\d{4}$/.test(start) && /^\d{4}$/.test(end) ? `${start}-${end}` : ''
}

const TERMS = ['First Term Exam', 'Second Term Exam', 'Annual Exam', 'Monthly Assessment']
const TEMPLATES = [
  { id: 'classic', label: 'Template 1 - Classic Royal' },
  { id: 'premium', label: 'Template 2 - Premium Navy Gold' },
  { id: 'minimal', label: 'Template 3 - Clean Minimal' },
  { id: 'orange-executive', label: 'Template 4 - Executive Orange' },
  { id: 'yellow-academic', label: 'Template 5 - Academic Yellow' },
  { id: 'purple-royal', label: 'Template 6 - Royal Purple' },
  { id: 'red-formal', label: 'Template 7 - Formal Red' },
  { id: 'pink-modern', label: 'Template 8 - Modern Pink' },
]
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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

function parseDateParts(dateStr) {
  if (!dateStr) return { dayNum: '—', month: '—', dayAbbr: '—', fullDay: '—' }
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return { dayNum: '—', month: '—', dayAbbr: '—', fullDay: '—' }
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return {
    dayNum: String(d.getDate()).padStart(2, '0'),
    month: months[d.getMonth()],
    dayAbbr: days[d.getDay()],
    fullDay: fullDays[d.getDay()]
  }
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
    const times = [rawTimes[0] || '', rawTimes[1] || '', rawTimes[2] || '']
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
  page: { minHeight:'100vh', padding:'24px 20px', background:'transparent', color:'var(--app-text)' },
  shell: { maxWidth:1460, margin:'0 auto', background:'var(--app-surface)', backdropFilter:'blur(12px)', borderRadius:22, border:'1px solid var(--app-border)', overflow:'hidden', boxShadow:'var(--app-shadow)' },
  body: { padding:'22px 24px 32px' },
  crumb: { color:'var(--app-muted)', fontSize:13, marginBottom:10, fontWeight:500 },
  notice: { background:'rgba(245,166,35,0.1)', color:'#f5a623', border:'1px solid rgba(245,166,35,0.2)', borderRadius:14, padding:'16px 20px', fontSize:14, lineHeight:1.55, fontWeight:600, marginBottom:32, position:'relative' },
  close: { position:'absolute', right:16, top:14, color:'rgba(245,166,35,0.5)', fontWeight:900, cursor:'pointer', fontSize:18 },
  title: { margin:'0 0 20px', fontSize:24, fontWeight:700, color:'var(--app-text)', borderBottom:'1px solid rgba(148,163,184,0.1)', paddingBottom:14 },
  formGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:16, alignItems:'end', marginBottom:28 },
  label: { display:'block', fontWeight:600, color:'var(--app-muted)', marginBottom:6, fontSize:13 },
  input: { width:'100%', height:40, border:'1px solid var(--app-border)', background:'var(--app-input)', color:'var(--app-text)', padding:'0 12px', fontSize:14, borderRadius:12, outline:'none', transition:'all 0.2s', boxShadow:'inset 0 2px 4px rgba(0,0,0,0.1)', colorScheme:'normal' },
  button: { height:40, border:0, borderRadius:12, background:'linear-gradient(135deg, #0A84FF 0%, #22d3ee 100%)', color:'#fff', padding:'0 18px', fontSize:14, cursor:'pointer', fontWeight: 600, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, boxShadow:'0 4px 12px rgba(10,132,255,0.3)', transition:'all 0.2s' },
  warn: { background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)', borderRadius:14, padding:'14px 18px', fontSize:14, margin:'0 0 22px', fontWeight:500, position:'relative' },
  gridWrap: { width:'100%', overflow:'auto', borderTop:'1px solid rgba(148,163,184,0.1)', marginTop:18, maxHeight:'62vh', borderRadius:12 },
  table: { borderCollapse:'collapse', minWidth:1200, width:'max-content', color:'var(--app-text)' },
  th: { background:'var(--app-bg-soft)', color:'var(--app-text)', border:'1px solid var(--app-border)', padding:'12px 14px', verticalAlign:'bottom', minWidth:176, fontSize:13, fontWeight:600 },
  classTh: { background:'var(--app-bg-soft)', color:'var(--app-text)', border:'1px solid var(--app-border)', padding:'12px 14px', minWidth:200, textAlign:'left', verticalAlign:'bottom', fontSize:13, fontWeight:600 },
  td: { border:'1px solid var(--app-border)', background:'var(--app-surface)', minWidth:176, height:80, padding:10, verticalAlign:'top', position:'relative' },
  classCell: { border:'1px solid var(--app-border)', background:'var(--app-surface)', minWidth:200, width:200, padding:10, verticalAlign:'top' },
  cellBtn: { width:'100%', minHeight:42, border:'1px solid var(--app-border)', background:'var(--app-surface)', color:'var(--app-muted)', textAlign:'left', padding:'0 12px', fontSize:13, borderRadius:10, cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', transition:'all 0.2s' },
  dropdown: { position:'absolute', left:10, top:56, width:250, maxHeight:320, overflowY:'auto', background:'var(--app-surface-strong)', border:'1px solid var(--app-border)', boxShadow:'0 12px 32px rgba(0,0,0,0.5)', zIndex:10, borderRadius:12 },
  searchBox: { width:'calc(100% - 20px)', height:38, border:'1px solid var(--app-border)', borderRadius:10, margin:10, padding:'0 10px', outline:'none', fontSize:13, background:'var(--app-input)', color:'var(--app-text)' },
  subjectRow: { padding:'10px 16px', color:'var(--app-text)', cursor:'pointer', fontSize:13, borderBottom:'1px solid rgba(148,163,184,0.1)', transition:'all 0.15s' },
  printPanel: { borderTop:'1px solid rgba(148,163,184,0.1)', marginTop:24, paddingTop:20, display:'grid', gap:14, background:'var(--app-surface)', padding:'20px', borderRadius:16 },
  pickerPanel: { background:'var(--app-surface)', border:'1px solid var(--app-border)', borderRadius:16, padding:'16px 18px', marginBottom:18 },
  chip: { display:'inline-flex', alignItems:'center', gap:6, height:32, padding:'0 12px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:'1px solid', transition:'all 0.18s' },
}

function templateCss(template, layout = 'single') {
  const themes = {
    classic: { accent:'#2563EB', dark:'#0B1F3A', soft:'#EFF6FF', table:'#0B1F3A', tableText:'#FFFFFF', border:'#C9D5E3', card:'#F8FAFC', cardBorder:'#CBD5E1' },
    premium: { accent:'#C8991A', dark:'#0B1F3A', soft:'#FFF7D6', table:'#C8991A', tableText:'#071E34', border:'#0B1F3A', card:'#FFFDF3', cardBorder:'#E2D9B8' },
    minimal: { accent:'#0B1F3A', dark:'#0B1F3A', soft:'#F8FAFC', table:'#0B1F3A', tableText:'#FFFFFF', border:'#0B1F3A', card:'#FFFFFF', cardBorder:'#E2E8F0' },
    'orange-executive': { accent:'#EA580C', dark:'#431407', soft:'#FFF7ED', table:'#9A3412', tableText:'#FFFFFF', border:'#FDBA74', card:'#FFFBF6', cardBorder:'#FED7AA' },
    'yellow-academic': { accent:'#D97706', dark:'#0F172A', soft:'#FEFCE8', table:'#0F172A', tableText:'#FDE047', border:'#FACC15', card:'#FFFDEB', cardBorder:'#FEF08A' },
    'purple-royal': { accent:'#7C3AED', dark:'#2E1065', soft:'#F5F3FF', table:'#4C1D95', tableText:'#FFFFFF', border:'#C4B5FD', card:'#FBFAFF', cardBorder:'#DDD6FE' },
    'red-formal': { accent:'#DC2626', dark:'#450A0A', soft:'#FEF2F2', table:'#991B1B', tableText:'#FFFFFF', border:'#FCA5A5', card:'#FFF8F8', cardBorder:'#FECACA' },
    'pink-modern': { accent:'#DB2777', dark:'#500724', soft:'#FDF2F8', table:'#BE185D', tableText:'#FFFFFF', border:'#F9A8D4', card:'#FFF7FB', cardBorder:'#FBCFE8' },
  }
  const theme = themes[template] || themes.classic
  const isNew = ['orange-executive', 'yellow-academic', 'purple-royal', 'red-formal', 'pink-modern'].includes(template)

  return `
  @page { size: ${layout === 'whatsapp-status' ? '430px 880px' : layout === 'whatsapp-group' ? '560px 650px' : 'A4 portrait'}; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; background: #0b1329; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #102033; }
  .bar { background: #0B1F3A; color: white; padding: 12px 20px; display: flex; align-items: center; gap: 14px; position: sticky; top: 0; z-index: 100; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .bar button { background: linear-gradient(135deg, #C8991A 0%, #E6B83B 100%); color: #07172C; border: 0; border-radius: 8px; padding: 9px 20px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(200,153,26,0.35); }
  @media print { body { background: white; } .bar { display: none !important; } }

  /* Standard A4 Sheets */
  .sheet { position: relative; width: 190mm; min-height: 277mm; background: #fff; margin: 10mm auto; padding: 10mm 13mm; break-after: page; border: 1px solid ${theme.border}; border-radius: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
  .two .sheet { min-height: 133mm; height: auto; margin: 0; width: 190mm; padding: 6mm 10mm; break-after: auto; border: 1px solid ${theme.border}; }
  .pair { width: 210mm; min-height: 297mm; padding: 7mm 10mm; background: white; display: flex; flex-direction: column; gap: 5mm; break-after: page; margin: 10mm auto; }

  .head { display: grid; grid-template-columns: 24mm minmax(0,1fr) 46mm; gap: 6mm; align-items: center; border-bottom: 2.5px solid ${theme.accent}; padding-bottom: 3.5mm; margin-bottom: 4mm; }
  .two .head { grid-template-columns: 16mm minmax(0,1fr) 38mm; gap: 4mm; padding-bottom: 2mm; margin-bottom: 2.5mm; border-bottom-width: 1.5px; }
  .logo { width: 23mm; height: 23mm; border: 1.5px solid ${theme.border}; border-radius: 50%; object-fit: contain; padding: 1.5mm; background: white; }
  .two .logo { width: 15mm; height: 15mm; padding: 1mm; }
  .school h1 { margin: 0; color: ${theme.dark}; font-size: ${isNew ? '23pt' : '20pt'}; line-height: 1.05; text-transform: uppercase; font-weight: 900; letter-spacing: 0.3px; }
  .two .school h1 { font-size: 14pt; line-height: 1.05; }
  .school small { display: block; color: #475569; font-size: 8pt; margin-top: 1.2mm; line-height: 1.3; font-weight: 600; }
  .two .school small { font-size: 6.5pt; margin-top: 0.6mm; }
  .meta { justify-self: end; width: 45mm; text-align: center; border: 1.5px solid ${theme.border}; background: ${theme.soft}; border-radius: 3mm; padding: 2.5mm 3mm; display: flex; flex-direction: column; gap: 1.2mm; }
  .two .meta { width: 36mm; padding: 1.6mm 2mm; border-radius: 2mm; gap: 0.8mm; }
  .meta-kicker { display: block; text-transform: uppercase; font-size: 6.8pt; font-weight: 900; letter-spacing: 0.8px; color: ${theme.accent}; }
  .two .meta-kicker { font-size: 5.6pt; }
  .meta-term { display: block; font-size: 10.5pt; font-weight: 900; line-height: 1.05; color: ${theme.dark}; text-transform: uppercase; }
  .two .meta-term { font-size: 8pt; }
  .meta-session { display: inline-block; margin: 0 auto; font-size: 7pt; font-weight: 700; color: #475569; background: white; border: 1px solid ${theme.border}; border-radius: 12px; padding: 1px 6px; }
  .two .meta-session { font-size: 6pt; padding: 0 4px; }
  .info { display: grid; grid-template-columns: repeat(4,1fr); gap: 2.5mm; margin-bottom: 4mm; }
  .two .info { gap: 1.8mm; margin-bottom: 2.5mm; }
  .info div { border: 1px solid ${theme.border}; background: ${theme.card}; padding: 2mm 2.5mm; border-radius: 2mm; }
  .two .info div { padding: 1.2mm 1.8mm; border-radius: 1.5mm; }
  .info span { display: block; color: #64748b; font-size: 6.8pt; text-transform: uppercase; font-weight: 800; letter-spacing: 0.4px; }
  .two .info span { font-size: 5.6pt; }
  .info strong { display: block; color: ${theme.dark}; font-size: 9.8pt; line-height: 1.15; margin-top: 0.6mm; font-weight: 800; }
  .two .info strong { font-size: 7.8pt; margin-top: 0.3mm; }

  /* Attractive Date / Day / Time Schedule Cards */
  .schedule-cards-list { display: flex; flex-direction: column; gap: 6px; margin-top: 3mm; margin-bottom: 4mm; }
  .exam-card-item {
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${theme.card};
    border: 1.2px solid ${theme.cardBorder};
    border-radius: 10px;
    padding: 7px 12px;
    position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .exam-card-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3.5px;
    background: ${theme.accent};
    border-radius: 10px 0 0 10px;
  }
  .exam-date-box {
    flex-shrink: 0;
    width: 48px;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    text-align: center;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .exam-date-month {
    background: ${theme.dark};
    color: #FFFFFF;
    font-size: 6.5pt;
    font-weight: 900;
    letter-spacing: 0.6px;
    padding: 1.5px 0;
    text-transform: uppercase;
  }
  .exam-date-num {
    font-size: 14pt;
    font-weight: 900;
    line-height: 1.05;
    color: ${theme.dark};
    padding: 2px 0 0;
  }
  .exam-date-day {
    font-size: 6.5pt;
    font-weight: 800;
    color: #64748B;
    text-transform: uppercase;
    padding-bottom: 2px;
  }
  .exam-details {
    flex: 1;
    min-width: 0;
  }
  .exam-pill-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }
  .exam-paper-tag {
    font-size: 6.5pt;
    font-weight: 800;
    text-transform: uppercase;
    color: ${theme.accent};
    background: ${theme.soft};
    border: 1px solid ${theme.border};
    padding: 0 5px;
    border-radius: 3px;
  }
  .exam-weekday-text {
    font-size: 7.2pt;
    color: #64748B;
    font-weight: 700;
  }
  .exam-subject-title {
    font-size: 10.5pt;
    font-weight: 900;
    color: #0F172A;
    line-height: 1.15;
    letter-spacing: -0.1px;
  }
  .exam-timing-pill {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    color: #0F172A;
    padding: 4px 9px;
    border-radius: 16px;
    font-size: 7.5pt;
    font-weight: 800;
  }
  .foot { display: flex; justify-content: space-between; color: #64748b; font-size: 7.8pt; font-weight: 700; margin-top: 4mm; padding-top: 2mm; border-top: 1.2px solid #cbd5e1; }
  .two .foot { display: none; }
  .foot span { min-width: 44mm; text-align: center; }

  /* 📱 WHATSAPP STATUS (9:16 Vertical Story) */
  .sheet.whatsapp-status {
    width: 410px;
    min-height: 730px;
    margin: 20px auto;
    background: linear-gradient(180deg, #07172C 0%, #0B1F3A 40%, #0A1C34 100%);
    color: #FFFFFF;
    border-radius: 24px;
    padding: 20px 18px;
    border: 2px solid rgba(200, 153, 26, 0.5);
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    position: relative;
    break-after: page;
  }
  .sheet.whatsapp-status .head { border-bottom: 1.5px solid rgba(200, 153, 26, 0.4); padding-bottom: 10px; margin-bottom: 10px; }
  .sheet.whatsapp-status .school h1 { color: #FFFFFF; font-size: 15pt; letter-spacing: 0.3px; }
  .sheet.whatsapp-status .school small { color: #94A3B8; font-size: 7pt; }
  .sheet.whatsapp-status .meta { background: rgba(200, 153, 26, 0.15); border-color: rgba(200, 153, 26, 0.4); width: auto; padding: 4px 10px; border-radius: 8px; }
  .sheet.whatsapp-status .meta-kicker { color: #FDE047; }
  .sheet.whatsapp-status .meta-term { color: #FFFFFF; font-size: 8.5pt; }
  .sheet.whatsapp-status .meta-session { background: #07172C; color: #FDE047; border-color: rgba(200, 153, 26, 0.3); }
  .sheet.whatsapp-status .ws-class-banner {
    background: linear-gradient(90deg, #C8991A 0%, #E6B83B 100%);
    color: #07172C;
    font-size: 10.5pt;
    font-weight: 900;
    text-transform: uppercase;
    text-align: center;
    padding: 6px 12px;
    border-radius: 8px;
    margin-bottom: 10px;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 10px rgba(200,153,26,0.3);
  }
  .sheet.whatsapp-status .exam-card-item {
    background: rgba(15, 33, 58, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    padding: 5px 9px;
    gap: 10px;
  }
  .sheet.whatsapp-status .exam-date-box {
    background: #0B1F3A;
    border-color: rgba(200, 153, 26, 0.5);
    width: 44px;
  }
  .sheet.whatsapp-status .exam-date-month {
    background: #C8991A;
    color: #07172C;
    font-size: 6pt;
  }
  .sheet.whatsapp-status .exam-date-num {
    color: #FFFFFF;
    font-size: 13pt;
  }
  .sheet.whatsapp-status .exam-date-day {
    color: #94A3B8;
    font-size: 6pt;
  }
  .sheet.whatsapp-status .exam-subject-title {
    color: #FFFFFF;
    font-size: 9.8pt;
  }
  .sheet.whatsapp-status .exam-paper-tag {
    background: rgba(200, 153, 26, 0.2);
    color: #FDE047;
    border-color: rgba(200, 153, 26, 0.4);
    font-size: 6pt;
  }
  .sheet.whatsapp-status .exam-weekday-text {
    color: #94A3B8;
    font-size: 6.8pt;
  }
  .sheet.whatsapp-status .exam-timing-pill {
    background: rgba(200, 153, 26, 0.15);
    border-color: rgba(200, 153, 26, 0.4);
    color: #FEF08A;
    font-size: 6.8pt;
    padding: 3px 7px;
  }
  .sheet.whatsapp-status .foot {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 8px;
    color: #94A3B8;
    font-size: 6.8pt;
  }

  /* 💬 WHATSAPP GROUP CARD (Compact 1:1 or 4:5 Feed Post) */
  .sheet.whatsapp-group {
    width: 520px;
    min-height: 520px;
    margin: 20px auto;
    background: #FFFFFF;
    color: #0F172A;
    border-radius: 18px;
    padding: 18px 20px;
    border: 2px solid ${theme.accent};
    box-shadow: 0 16px 36px rgba(0,0,0,0.15);
    position: relative;
    break-after: page;
  }
  .sheet.whatsapp-group .ws-class-banner {
    background: ${theme.dark};
    color: #FFFFFF;
    font-size: 11pt;
    font-weight: 900;
    text-transform: uppercase;
    text-align: center;
    padding: 6px 12px;
    border-radius: 8px;
    margin-bottom: 12px;
  }
  .sheet.whatsapp-group .schedule-cards-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .sheet.whatsapp-group .exam-card-item {
    padding: 5px 8px;
    gap: 8px;
  }
  .sheet.whatsapp-group .exam-date-box {
    width: 42px;
  }
  .sheet.whatsapp-group .exam-date-num {
    font-size: 12pt;
  }
  .sheet.whatsapp-group .exam-subject-title {
    font-size: 9pt;
  }
  .sheet.whatsapp-group .exam-timing-pill {
    font-size: 6.8pt;
    padding: 2px 6px;
  }
  .sheet.whatsapp-group .foot {
    border-top: 1px solid #CBD5E1;
    padding-top: 8px;
  }
  `
}

function buildCard({ student, rows, school, term, session, template, layout = 'single' }) {
  const logo = school.logo ? `<img class="logo" src="${school.logo}" alt="logo">` : '<div class="logo" style="display:grid;place-items:center;font-weight:900">S</div>'
  const isWhatsApp = layout === 'whatsapp-status' || layout === 'whatsapp-group'

  const cardItems = rows.map((r, i) => {
    const parts = parseDateParts(r.date)
    const timeFormatted = (r.times || []).filter(Boolean).join(' / ') || '10:00 AM - 12:00 PM'
    return `
      <div class="exam-card-item">
        <div class="exam-date-box">
          <div class="exam-date-month">${esc(parts.month)}</div>
          <div class="exam-date-num">${esc(parts.dayNum)}</div>
          <div class="exam-date-day">${esc(parts.dayAbbr)}</div>
        </div>
        <div class="exam-details">
          <div class="exam-pill-row">
            <span class="exam-paper-tag">Paper ${i + 1}</span>
            <span class="exam-weekday-text">${esc(parts.fullDay)}</span>
          </div>
          <div class="exam-subject-title">${esc(r.subjects.join(', '))}</div>
        </div>
        <div class="exam-timing-pill">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>${esc(timeFormatted)}</span>
        </div>
      </div>
    `
  }).join('')

  const studentInfo = !isWhatsApp ? `
    <div class="info">
      <div><span>Student</span><strong>${esc(student?.name || 'All Students')}</strong></div>
      <div><span>GR No</span><strong>${esc(student?.gr_number || '-')}</strong></div>
      <div><span>Father</span><strong>${esc(student?.father_name || '-')}</strong></div>
      <div><span>Class</span><strong>${esc(clsLabel(student?.class))}${student?.section ? ` - ${esc(student.section)}` : ''}</strong></div>
    </div>
  ` : `
    <div class="ws-class-banner">
      ${esc(clsLabel(student?.class || 'All Classes'))}${student?.section ? ` - Section ${esc(student.section)}` : ''} • Date Sheet
    </div>
  `

  return `
    <section class="sheet ${template} ${layout}">
      <div class="head">
        ${logo}
        <div class="school">
          <h1>${esc(school.schoolName || school.name || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL')}</h1>
          <small>${esc(school.address || 'Sharif Chowk, Rayya Khas, Narowal')}${school.phone ? ` | Ph: ${esc(school.phone)}` : ' | Ph: 03001291959'}</small>
        </div>
        <div class="meta">
          <span class="meta-kicker">Date Sheet</span>
          <strong class="meta-term">${esc(term)}</strong>
          <span class="meta-session">Session ${esc(session)}</span>
        </div>
      </div>
      ${studentInfo}
      <div class="schedule-cards-list">
        ${cardItems}
      </div>
      <div class="foot">
        <span>Reporting: 08:15 AM • Exam Starts: 08:30 AM</span>
        <span>Controller of Examination</span>
      </div>
    </section>
  `
}

function openPrint({ students, rows, school, term, session, template, layout }) {
  const ordered = [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const cards = (layout === 'whatsapp-status' || layout === 'whatsapp-group')
    ? [buildCard({ student: students[0], rows: ordered, school, term, session, template, layout })]
    : students.map(student => buildCard({ student, rows: ordered, school, term, session, template, layout }))

  const body = layout === 'two'
    ? cards.reduce((html, card, index) => `${html}${index % 2 === 0 ? '<div class="pair">' : ''}${card}${index % 2 === 1 || index === cards.length - 1 ? '</div>' : ''}`, '')
    : cards.join('')

  const titlePrefix = layout === 'whatsapp-status' ? 'WhatsApp Status Date Sheet' : layout === 'whatsapp-group' ? 'WhatsApp Group Date Sheet' : 'Date Sheets'
  const w = window.open('', '_blank', 'width=1120,height=820')
  if (!w) return
  w.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>${titlePrefix}</title><style>${templateCss(template, layout)}</style></head><body class="${layout}"><div class="bar"><strong>${esc(term)} ${titlePrefix}</strong><span>${cards.length} card(s)</span><button onclick="window.print()">Print / Save as PDF</button></div>${body}</body></html>`)
  w.document.close()
}

export default function DateSheet() {
  const { activeClasses, subjectsForClass, sessionStart, sessionEnd } = useAcademicStore()
  const activeAcademicSession = academicSessionLabel(sessionStart, sessionEnd)
  const { students } = useStudentStore()
  const { paperSettings } = usePaperStore()
  const classOptions = activeClasses.map(c => ({ value: c.level, label: c.name }))
  const [session, setSession] = useState(() => pickDateSheetSession(activeAcademicSession, paperSettings.academicYear))
  const [term, setTerm] = useState(TERMS[0])
  const [dayCount, setDayCount] = useState(12)
  const [warning, setWarning] = useState('')
  const [gridReady, setGridReady] = useState(false)
  const [columns, setColumns] = useState([])
  const [cellSubjects, setCellSubjects] = useState({})
  const [classRows, setClassRows] = useState([])
  const [openCell, setOpenCell] = useState(null)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [sheets, setSheets] = useState([])
  const [syncState, setSyncState] = useState('loading')
  const [printClass, setPrintClass] = useState(classOptions[0]?.value || '1')
  const [printSession, setPrintSession] = useState(() => pickDateSheetSession(activeAcademicSession, paperSettings.academicYear))
  const [printTerm, setPrintTerm] = useState(TERMS[0])
  const [template, setTemplate] = useState('classic')
  const [layout, setLayout] = useState('whatsapp-status')
  const [previewMode, setPreviewMode] = useState('cards') // 'cards' | 'table'
  const sessionOptions = dateSheetSessionOptions(sheets, activeAcademicSession, paperSettings.academicYear, session, printSession)

  const loadDateSheet = (targetSession, targetTerm, sourceRows = sheets) => {
    if (!targetSession || !targetTerm) {
      setWarning('Please select Session and Term to create or edit a Date Sheet.')
      setGridReady(false)
      return
    }
    setSession(targetSession)
    setTerm(targetTerm)
    const loaded = extractLoadedGrid(targetSession, targetTerm, sourceRows, classOptions)
    if (loaded) {
      setColumns(loaded.columns)
      setClassRows(loaded.classRows)
      setCellSubjects(loaded.cellSubjects)
      setDayCount(loaded.columns.length)
      setGridReady(true)
      setWarning(`Loaded ${loaded.totalRecords} date sheet records (${loaded.classCount} classes, ${loaded.dateCount} dates) for ${targetTerm} (${targetSession}). You can now edit dates, times, and subjects directly.`)
    } else {
      const count = Math.max(1, Math.min(20, Number(dayCount) || 5))
      setColumns(Array.from({ length: count }, (_, i) => ({ id: i, date: '', times: ['', '', ''] })))
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
    let cancelled = false
    async function hydrateServerSheets() {
      try {
        const response = await api.get('/api/date-sheets', { skipCache:true })
        const serverRows = Array.isArray(response.data?.data) ? response.data.data : []
        if (cancelled) return
        setSheets(serverRows)
        setSyncState('synced')
        const restoredSession = pickDateSheetSession(activeAcademicSession, paperSettings.academicYear, serverRows)
        const restoredTerm = serverRows.some(row => row.session === restoredSession && row.term === term)
          ? term : (serverRows.find(row => row.session === restoredSession)?.term || term)
        setPrintSession(restoredSession)
        setPrintTerm(restoredTerm)
        loadDateSheet(restoredSession, restoredTerm, serverRows)
      } catch (err) {
        console.error('Date sheet server sync failed', err)
        if (!cancelled) {
          setSyncState('error')
          setWarning(err.response?.data?.message || 'Date sheet server is unavailable. Existing loaded date sheet data was preserved; no browser cache was promoted into live tenant data.')
        }
      }
    }
    void hydrateServerSheets()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      { id: Date.now(), date: '', times: ['', '', ''] }
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

  const saveGrid = async () => {
    if (!gridReady) return
    const rows = []
    classRows.forEach(row => {
      columns.forEach((col, dayIndex) => {
        const subjects = selected(row.id, dayIndex)
        if (!subjects.length || !col.date) return
        rows.push({
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
    if (!rows.length) {
      setWarning('Please select at least one date and subject.')
      return
    }
    setSyncState('saving')
    try {
      const response = await api.put('/api/date-sheets/bulk', { session, term, rows })
      const savedRows = Array.isArray(response.data?.data) ? response.data.data : []
      const next = [...sheets.filter(s => !(s.session === session && s.term === term)), ...savedRows]
      setSheets(next)
      setSyncState('synced')
      setWarning(`Successfully saved ${savedRows.length} date sheet records for ${term} (${session}).`)
    } catch (err) {
      console.error('Date sheet save failed', err)
      setSyncState('error')
      setWarning(err.response?.data?.message || 'Date sheet could not be saved to the server.')
    }
  }

  const printableRows = sheets.filter(row => row.session === printSession && row.term === printTerm && sameClass(row.class, printClass))
  const printableStudents = students.filter(student => isActiveStudent(student) && sameClass(studentClass(student), printClass))
  const printablePreviewRows = [...printableRows].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  
  const print = () => {
    if (!printableRows.length) return setWarning('No saved date sheet found for the selected class, session, and term.')
    if (!printableStudents.length && !layout.startsWith('whatsapp')) return setWarning('No students found for the selected class.')
    openPrint({ 
      students: printableStudents.length ? printableStudents : [{ name: 'All Students', class: printClass, section: '' }], 
      rows: printableRows, 
      school: paperSettings, 
      term: printTerm, 
      session: printSession, 
      template, 
      layout 
    })
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.body}>
          <div style={styles.crumb}>Dashboard <b style={{ color:'rgba(34,211,238,0.8)', padding:'0 9px' }}>»</b> Create &amp; Edit Date Sheet <span style={{ marginLeft:10, color:syncState==='synced'?'#22c55e':syncState==='saving'?'#f5a623':'#ef4444' }}>· {syncState==='synced'?'Server synced':syncState==='saving'?'Saving…':'Sync issue'}</span></div>
          <div style={styles.notice}>
            The day of each date is picked automatically. You can edit dates, times, and subjects directly in the grid. To add multiple subjects on the same date, select more than one subject from the dropdown.
            <span style={styles.close}>×</span>
          </div>

          <h1 style={styles.title}>Create &amp; Edit Date Sheet</h1>
          <div style={styles.formGrid}>
            <div><label style={styles.label}>Session</label><select aria-label="Date sheet session" style={styles.input} value={session} onChange={e => setSession(e.target.value)}>{sessionOptions.map(option => <option value={option} key={option}>{option}</option>)}</select></div>
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
                  <span style={{ color:'var(--app-muted)', fontSize:13, fontWeight:600 }}>Manage Classes &amp; Schedule Dates</span>
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
                  <div style={{ marginTop:12, color:'var(--app-muted)', fontSize:12 }}>
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
                          {columns.map((col, dayIndex) => {
                            const parts = parseDateParts(col.date)
                            return (
                              <th key={col.id} style={{ ...styles.th, background:'var(--app-surface)', borderTop:'3px solid #22d3ee' }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                    <span style={{ fontSize:10, color:'#22d3ee', fontWeight:900, textTransform:'uppercase', background:'rgba(34,211,238,0.12)', padding:'2px 6px', borderRadius:4 }}>Day {dayIndex + 1}</span>
                                    {col.date && <span style={{ fontSize:10, color:'var(--app-muted)', fontWeight:700 }}>{parts.month} {parts.dayNum}</span>}
                                  </div>
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
                                <div style={{ color:'#22d3ee', fontSize:12, marginTop:4, fontWeight:800 }}>{dayName(col.date) || '—'}</div>
                              </th>
                            )
                          })}
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
                                    style={{ ...styles.cellBtn, borderColor:isOpen ? '#22d3ee' : 'rgba(148,163,184,0.2)', color:picked.length ? 'var(--app-text)' : 'var(--app-muted)', background:picked.length ? 'rgba(34,211,238,0.1)' : 'var(--app-input)' }}
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
                                          style={{ ...styles.subjectRow, background:picked.includes(subject) ? 'rgba(34,211,238,0.15)' : 'transparent', color:picked.includes(subject) ? '#0d84b3' : 'var(--app-text)' }}
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
                    <button type="button" style={{ ...styles.button, background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', boxShadow:'0 4px 12px rgba(34,197,94,0.3)' }} onClick={() => void saveGrid()}><Save size={15} /> Save Date Sheet</button>
                  </div>
                </>
              )}
            </>
          )}

          {/* PRINT & WHATSAPP CARD EXPORT PANEL */}
          <div style={styles.printPanel}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, borderBottom:'1px solid rgba(148,163,184,0.1)', paddingBottom:12 }}>
              <div>
                <h2 style={{ ...styles.title, fontSize:20, margin:0, paddingBottom:0, borderBottom:0 }}>
                  Date Sheet Cards &amp; Print Studio
                </h2>
                <div style={{ color:'var(--app-muted)', fontSize:13, marginTop:3 }}>
                  Share stunning Date, Day &amp; Time cards directly to WhatsApp Status or Groups, or print official student slips.
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:700, color:'rgba(34,211,238,0.9)' }}>PREVIEW MODE:</span>
                <button
                  type="button"
                  onClick={() => setPreviewMode('cards')}
                  style={{
                    padding:'6px 12px',
                    borderRadius:8,
                    fontSize:12,
                    fontWeight:800,
                    cursor:'pointer',
                    border:'1px solid',
                    background: previewMode==='cards' ? '#0A84FF' : 'rgba(15,23,42,0.4)',
                    color: previewMode==='cards' ? '#fff' : 'var(--app-muted)',
                    borderColor: previewMode==='cards' ? '#0A84FF' : 'rgba(148,163,184,0.2)',
                    display:'inline-flex', alignItems:'center', gap:5
                  }}
                >
                  <Smartphone size={13} /> Attractive Cards
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('table')}
                  style={{
                    padding:'6px 12px',
                    borderRadius:8,
                    fontSize:12,
                    fontWeight:800,
                    cursor:'pointer',
                    border:'1px solid',
                    background: previewMode==='table' ? '#0A84FF' : 'rgba(15,23,42,0.4)',
                    color: previewMode==='table' ? '#fff' : 'var(--app-muted)',
                    borderColor: previewMode==='table' ? '#0A84FF' : 'rgba(148,163,184,0.2)',
                    display:'inline-flex', alignItems:'center', gap:5
                  }}
                >
                  <Grid size={13} /> Classic Table
                </button>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14 }}>
              <div><label style={styles.label}>Class</label><select style={styles.input} value={printClass} onChange={e => setPrintClass(e.target.value)}>{classOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
              <div><label style={styles.label}>Session</label><select aria-label="Print date sheet session" style={styles.input} value={printSession} onChange={e => setPrintSession(e.target.value)}>{sessionOptions.map(option => <option value={option} key={option}>{option}</option>)}</select></div>
              <div><label style={styles.label}>Term</label><select style={styles.input} value={printTerm} onChange={e => setPrintTerm(e.target.value)}>{TERMS.map(item => <option key={item}>{item}</option>)}</select></div>
              <div><label style={styles.label}>Theme / Template</label><select style={styles.input} value={template} onChange={e => setTemplate(e.target.value)}>{TEMPLATES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
              <div>
                <label style={styles.label}>Sharing &amp; Print Size</label>
                <select style={{ ...styles.input, fontWeight:700, borderColor:'#22d3ee' }} value={layout} onChange={e => setLayout(e.target.value)}>
                  <option value="whatsapp-status">📱 WhatsApp Status (9:16 Story)</option>
                  <option value="whatsapp-group">💬 WhatsApp Group Post (Compact Feed)</option>
                  <option value="single">📄 1 student per page (A4 Document)</option>
                  <option value="two">📑 2 students per page (A4 Half Slip)</option>
                </select>
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', color:'var(--app-muted)', fontSize:14, flexWrap:'wrap', gap:10, paddingTop:8, borderTop:'1px solid rgba(148,163,184,0.1)' }}>
              <span>{printableRows.length} saved papers scheduled | {printableStudents.length} students</span>
              <div style={{ display:'flex', gap:10 }}>
                {layout.startsWith('whatsapp') ? (
                  <button type="button" style={{ ...styles.button, background:'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', boxShadow:'0 4px 14px rgba(37,211,102,0.35)' }} onClick={print}>
                    <Share2 size={15} /> Open WhatsApp View / Save PDF
                  </button>
                ) : (
                  <button type="button" style={styles.button} onClick={print}>
                    <Printer size={15} /> Print Student Slips
                  </button>
                )}
              </div>
            </div>

            {/* LIVE PREVIEW CONTAINER */}
            {printablePreviewRows.length > 0 && (
              <div style={{ border:'1px solid rgba(148,163,184,0.16)', borderRadius:16, overflow:'hidden', background:'rgba(15,23,42,0.45)', marginTop:6 }}>
                <div style={{ padding:'12px 18px', color:'var(--app-text)', fontWeight:700, borderBottom:'1px solid rgba(148,163,184,0.12)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, background:'rgba(15,23,42,0.3)' }}>
                  <div>
                    <span style={{ fontSize:15, color:'var(--app-text)', fontWeight:800 }}>{clsLabel(printClass)} — {printTerm} Date Sheet</span>
                    <span style={{ color:'var(--app-muted)', fontSize:12, marginLeft:10 }}>({printablePreviewRows.length} examination papers)</span>
                    <span style={{ display:'inline-block', marginLeft:10, fontSize:11, padding:'2px 8px', borderRadius:12, background:layout.startsWith('whatsapp')?'rgba(37,211,102,0.15)':'rgba(10,132,255,0.15)', color:layout.startsWith('whatsapp')?'#25D366':'#0A84FF', fontWeight:800 }}>
                      {layout === 'whatsapp-status' ? '9:16 WhatsApp Status Story' : layout === 'whatsapp-group' ? 'Compact WhatsApp Group Post' : 'A4 Print Document'}
                    </span>
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

                {/* CARDS PREVIEW */}
                {previewMode === 'cards' ? (
                  <div style={{ padding:20, maxWidth: layout === 'whatsapp-status' ? 440 : layout === 'whatsapp-group' ? 760 : '100%', margin:'0 auto' }}>
                    {/* Header Banner for WhatsApp */}
                    <div style={{
                      background: layout === 'whatsapp-status' ? 'linear-gradient(135deg, #0B1F3A 0%, #07172C 100%)' : 'rgba(30,41,59,0.6)',
                      border: '1.5px solid rgba(200,153,26,0.35)',
                      borderRadius: 14,
                      padding: '14px 18px',
                      marginBottom: 14,
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}>
                      <div style={{ color:'#FDE047', fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:1.2, marginBottom:4 }}>
                        AL SIDDIQUE SCHOLARS PUBLIC SCHOOL
                      </div>
                      <div style={{ color:'#FFFFFF', fontSize:16, fontWeight:900, textTransform:'uppercase' }}>
                        {clsLabel(printClass)} • {printTerm}
                      </div>
                      <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12, marginTop:3 }}>
                        Academic Session {printSession} • Examination Schedule
                      </div>
                    </div>

                    {/* Cards Grid */}
                    <div style={{
                      display: layout === 'whatsapp-group' ? 'grid' : 'flex',
                      gridTemplateColumns: layout === 'whatsapp-group' ? 'repeat(auto-fit, minmax(320px, 1fr))' : undefined,
                      flexDirection: layout === 'whatsapp-group' ? undefined : 'column',
                      gap: 10
                    }}>
                      {printablePreviewRows.map((row, idx) => {
                        const parts = parseDateParts(row.date)
                        const timesStr = (row.times || []).filter(Boolean).join(' / ') || '10:00 AM - 12:00 PM'
                        return (
                          <div
                            key={row.id}
                            style={{
                              display:'flex',
                              alignItems:'center',
                              gap:14,
                              background:'rgba(30,41,59,0.7)',
                              border:'1.5px solid rgba(255,255,255,0.1)',
                              borderRadius:14,
                              padding:'10px 14px',
                              position:'relative',
                              boxShadow:'0 4px 10px rgba(0,0,0,0.15)',
                              transition:'all 0.2s ease'
                            }}
                          >
                            {/* Accent indicator line */}
                            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:'#22d3ee', borderRadius:'14px 0 0 14px' }} />

                            {/* Calendar Badge */}
                            <div style={{
                              flexShrink:0,
                              width:52,
                              background:'#0F172A',
                              border:'1.5px solid rgba(34,211,238,0.4)',
                              borderRadius:10,
                              textAlign:'center',
                              overflow:'hidden',
                              boxShadow:'0 2px 6px rgba(0,0,0,0.3)'
                            }}>
                              <div style={{ background:'linear-gradient(135deg, #0A84FF 0%, #22d3ee 100%)', color:'#0F172A', fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:0.8, padding:'2px 0' }}>
                                {parts.month}
                              </div>
                              <div style={{ fontSize:18, fontWeight:900, lineHeight:1.1, color:'#FFFFFF', padding:'3px 0 1px' }}>
                                {parts.dayNum}
                              </div>
                              <div style={{ fontSize:9, fontWeight:800, color:'#94A3B8', textTransform:'uppercase', paddingBottom:3 }}>
                                {parts.dayAbbr}
                              </div>
                            </div>

                            {/* Subject & Paper Info */}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                                <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', color:'#22d3ee', background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.25)', padding:'1px 6px', borderRadius:4 }}>
                                  Paper {idx + 1}
                                </span>
                                <span style={{ fontSize:11, color:'#94A3B8', fontWeight:700 }}>
                                  {parts.fullDay}
                                </span>
                              </div>
                              <div style={{ fontSize:14, fontWeight:900, color:'#FFFFFF', lineHeight:1.2, letterSpacing:-0.2 }}>
                                {(row.subjects || []).join(', ')}
                              </div>
                            </div>

                            {/* Time Pill */}
                            <div style={{
                              flexShrink:0,
                              display:'inline-flex',
                              alignItems:'center',
                              gap:5,
                              background:'rgba(15,23,42,0.8)',
                              border:'1px solid rgba(255,255,255,0.15)',
                              color:'#FDE047',
                              padding:'5px 10px',
                              borderRadius:20,
                              fontSize:11,
                              fontWeight:800,
                              whiteSpace:'nowrap'
                            }}>
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              <span>{timesStr}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* WhatsApp Footer note */}
                    <div style={{ marginTop:14, textAlign:'center', color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:600 }}>
                      Reporting: 08:15 AM • Exam Starts: 08:30 AM • Sharif Chowk, Rayya Khas, Narowal
                    </div>
                  </div>
                ) : (
                  /* CLASSIC TABLE PREVIEW */
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, color:'var(--app-text)' }}>
                    <thead>
                      <tr style={{ background:'var(--app-bg-soft)', color:'var(--app-text)', textTransform:'uppercase', fontSize:11 }}>
                        <th style={{ textAlign:'left', padding:'9px 12px' }}>Date</th>
                        <th style={{ textAlign:'left', padding:'9px 12px' }}>Day</th>
                        <th style={{ textAlign:'left', padding:'9px 12px' }}>Subject</th>
                        <th style={{ textAlign:'left', padding:'9px 12px' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printablePreviewRows.map(row => (
                        <tr key={row.id} style={{ borderTop:'1px solid rgba(148,163,184,0.08)' }}>
                          <td style={{ padding:'10px 12px', fontWeight:700, color:'var(--app-text)' }}>{prettyDate(row.date)}</td>
                          <td style={{ padding:'10px 12px', color:'var(--app-text)' }}>{dayName(row.date)}</td>
                          <td style={{ padding:'10px 12px', color:'var(--app-text)', fontWeight:700 }}>{(row.subjects || []).join(', ')}</td>
                          <td style={{ padding:'10px 12px', color:'var(--app-text)' }}>{(row.times || []).filter(Boolean).join(' / ') || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

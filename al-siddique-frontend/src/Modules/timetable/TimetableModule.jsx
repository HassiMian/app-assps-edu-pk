import { useEffect, useMemo, useState } from 'react'
import { useAcademicStore } from '../../services/useAcademicStore'
import { usePaperStore } from '../Paper-Generator/usePaperStore'

// Dynamic lists will be used from the store.
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TEACHERS = ['Mr. Aamir', 'Ms. Saba', 'Mr. Bilal', 'Ms. Hira', 'Mr. Naveed', 'Ms. Farah', 'Mr. Qasim', 'Ms. Sana']
const ACADEMIC_KEY = 'al_siddique_academic'

function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}

const loadAcademicPeriods = () => {
 try {
 const saved = JSON.parse(getStorage()?.getItem(ACADEMIC_KEY) || '{}')
 return Number(saved.periodsPerDay || 8)
 } catch {
 return 8
 }
}



const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const printTimetableDocument = ({ school, schoolClass, section, periods, days, assignments }) => {
 const title = `${schoolClass} - Section ${section} Timetable`
 const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
 const schoolName = school?.schoolName || 'Al Siddique Scholars Public School'
 const schoolUrdu = school?.showUrduHeader ? school?.schoolUrdu : ''
 const logo = school?.logo
 const rows = days.map(day => `
 <tr>
 <th class="day-cell">${escapeHtml(day)}</th>
 ${periods.map(period => {
 const item = assignments[day]?.[period] || {}
 return `
 <td>
 <strong>${escapeHtml(item.subject || 'English')}</strong>
 <span>${escapeHtml(item.teacher || 'Mr. Aamir')}</span>
 </td>
 `
 }).join('')}
 </tr>
 `).join('')

 const html = `<!doctype html>
<html>
<head>
 <meta charset="utf-8" />
 <title>${escapeHtml(title)}</title>
 <style>
 @page { size: A4 landscape; margin: 9mm; }
 * { box-sizing: border-box; }
 body { margin: 0; background: #eef2f7; color: #101827; font-family: Arial, sans-serif; }
 .toolbar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #071e34; color: #d9dee8; box-shadow: 0 6px 18px rgba(15,23,42,.22); }
 .toolbar strong { color: #e8b420; }
 .toolbar button { margin-left: auto; border: 0; border-radius: 7px; padding: 9px 18px; background: #c8991a; color: #071e34; font-weight: 800; cursor: pointer; }
 .sheet { width: 279mm; min-height: 190mm; margin: 14px auto; padding: 10mm; background: white; box-shadow: 0 16px 45px rgba(15,23,42,.18); }
 header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #c8991a; padding-bottom: 9px; margin-bottom: 10px; }
 .logo { width: 54px; height: 54px; object-fit: contain; border: 1px solid #d9dee8; border-radius: 10px; padding: 3px; }
 .fallback-logo { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 10px; background: #0b2c4d; color: #c8991a; font-size: 24px; font-weight: 900; }
 h1 { margin: 0; color: #0b2c4d; font-size: 21px; line-height: 1.1; }
 .urdu { margin-top: 3px; color: #334155; font-size: 14px; direction: rtl; font-family: "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif; }
 .meta { margin-left: auto; text-align: right; color: #475569; font-size: 11px; line-height: 1.7; }
 .title-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; margin: 10px 0 9px; }
 .title-row h2 { margin: 0; color: #c8991a; font-size: 17px; }
 .badge { border: 1px solid #d9dee8; border-radius: 999px; padding: 6px 10px; color: #0b2c4d; font-size: 11px; font-weight: 800; }
 table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #cbd5e1; }
 th, td { border: 1px solid #cbd5e1; padding: 6px 5px; vertical-align: middle; text-align: center; }
 thead th { background: #0b2c4d; color: white; font-size: 10.5px; letter-spacing: .02em; }
 .day-cell { width: 25mm; background: #f8fafc; color: #0b2c4d; font-size: 11px; text-align: left; }
 td strong { display: block; color: #101827; font-size: 10.5px; line-height: 1.2; }
 td span { display: block; margin-top: 3px; color: #64748b; font-size: 9px; line-height: 1.2; }
 footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 10px; color: #64748b; font-size: 10px; }
 @media print {
 body { background: white; }
 .toolbar { display: none; }
 .sheet { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
 }
 </style>
</head>
<body>
 <div class="toolbar"><strong>Timetable Print Preview</strong><span>${escapeHtml(title)}</span><button onclick="window.print()">Print / Save PDF</button></div>
 <main class="sheet">
 <header>
 ${logo ? `<img class="logo" src="${logo}" alt="">` : '<div class="fallback-logo">A</div>'}
 <div>
 <h1>${escapeHtml(schoolName)}</h1>
 ${schoolUrdu ? `<div class="urdu">${escapeHtml(schoolUrdu)}</div>` : ''}
 <div style="color:#64748b;font-size:11px;margin-top:4px">${escapeHtml(school?.address || '')}</div>
 </div>
 <div class="meta">
 <div><strong>Session:</strong> ${escapeHtml(school?.examYear || '2026-2027')}</div>
 <div><strong>Date:</strong> ${escapeHtml(today)}</div>
 <div><strong>Phone:</strong> ${escapeHtml(school?.phone || '')}</div>
 </div>
 </header>
 <section class="title-row">
 <h2>${escapeHtml(title)}</h2>
 <div class="badge">${periods.length} periods per day</div>
 </section>
 <table>
 <thead>
 <tr>
 <th class="day-cell">Day</th>
 ${periods.map(period => `<th>${escapeHtml(period)}</th>`).join('')}
 </tr>
 </thead>
 <tbody>${rows}</tbody>
 </table>
 <footer>
 <span>Generated by OS Siddique Smart School OS</span>
 <span>Principal / Coordinator Signature: ____________________</span>
 </footer>
 </main>
</body>
</html>`

 const printWindow = window.open('', '_blank', 'width=1200,height=850')
 if (!printWindow) {
 alert('Popup blocked. Please allow popups in your browser and try printing again.')
 return
 }
 printWindow.document.open()
 printWindow.document.write(html)
 printWindow.document.close()
 printWindow.focus()
}

const card = {
 background: 'rgba(11,44,77,0.6)',
 border: '1px solid rgba(200,153,26,0.2)',
 borderRadius: 22,
 backdropFilter: 'blur(18px)',
 color: '#C0C8D8',
}

const labelStyle = {
 display: 'block',
 fontSize: 12,
 color: '#8892A4',
 marginBottom: 8,
 letterSpacing: '0.06em',
 textTransform: 'uppercase',
}

const inputStyle = {
 width: '100%',
 padding: '12px 14px',
 borderRadius: 14,
 border: '1px solid rgba(148,163,184,0.18)',
 background: 'rgba(7,30,52,0.75)',
 color: '#C0C8D8',
 fontSize: 14,
 outline: 'none',
}

function TimetableModule() {
 const { classNames: classOptions, activeClasses, subjectsForClass, allSections } = useAcademicStore()
 const { paperSettings } = usePaperStore()
 
 const [schoolClass, setSchoolClass] = useState(classOptions[0] || 'Starter')
 
 const selectedAcademicClass = activeClasses.find(c => c.name === schoolClass)
 const sectionOptions = selectedAcademicClass?.sections?.length ? selectedAcademicClass.sections : (allSections.length ? allSections : ['A'])
 const subjectOptions = selectedAcademicClass ? subjectsForClass(selectedAcademicClass.level) : ['English']
 
 const [section, setSection] = useState(sectionOptions[0] || 'A')
 const [numPeriods, setNumPeriods] = useState(loadAcademicPeriods)
 const [assignments, setAssignments] = useState(() => {
 const initialPeriods = loadAcademicPeriods()
 const initial = {}
 DAYS.forEach(day => {
 initial[day] = {}
 for (let i = 1; i <= initialPeriods; i++) {
 const period = `Period ${i}`
 initial[day][period] = { subject: subjectOptions[0], teacher: TEACHERS[0] }
 }
 })
 return initial
 })

 const periods = useMemo(() => {
 const arr = []
 for (let i = 1; i <= numPeriods; i++) {
 arr.push(`Period ${i}`)
 }
 return arr
 }, [numPeriods])

 const timetableMinWidth = Math.max(980, 132 + periods.length * 154)

 useEffect(() => {
 if (classOptions.length && !classOptions.includes(schoolClass)) setSchoolClass(classOptions[0])
 }, [classOptions, schoolClass])

 useEffect(() => {
 if (sectionOptions.length && !sectionOptions.includes(section)) setSection(sectionOptions[0])
 }, [sectionOptions, section])

 const handleChange = (day, period, key, value) => {
 setAssignments(prev => ({
 ...prev,
 [day]: {
 ...prev[day],
 [period]: {
 ...prev[day][period],
 [key]: value,
 },
 },
 }))
 }

 const activeLessonCount = useMemo(() => {
 return DAYS.reduce((count, day) => count + periods.reduce((inner, period) => inner + (assignments[day]?.[period]?.subject ? 1 : 0), 0), 0)
 }, [assignments, periods])

 const printTimetable = () => {
 printTimetableDocument({
 school: paperSettings,
 schoolClass,
 section,
 periods,
 days: DAYS,
 assignments,
 })
 }

 return (
 <div style={{ minHeight: '100vh', background: '#071e34', color: '#C0C8D8', padding: 24, fontFamily: 'Inter, sans-serif' }}>
 <div style={{ width: '100%', maxWidth: 1600, margin: '0 auto', display: 'grid', gap: 22, minWidth: 0 }}>
 <div className="super-module-card" style={{ ...card, padding: 28, boxShadow: '0 18px 40px rgba(0,0,0,0.24)', borderRadius: 24 }}>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
 <div>
 <div style={{ color: '#C8991A', fontSize: 28, fontWeight: 600, marginBottom: 10 }}>Timetable Manager</div>
 <div style={{ color: '#8892A4', fontSize: 14 }}>Choose class, section, and number of periods, then assign subjects and teachers across the school week.</div>
 </div>
 <button onClick={printTimetable} style={{
 background: 'linear-gradient(135deg, #C8991A, #e8b420)',
 color: '#071e34',
 border: 'none',
 borderRadius: 14,
 padding: '14px 22px',
 cursor: 'pointer',
 fontWeight: 700,
 fontSize: 14,
 }}>Print Timetable</button>
 </div>
 </div>

 <div style={{ display: 'grid', gap: 22 }}>
 <div className="super-module-card timetable-controls" style={{ ...card, padding: 24, display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) minmax(160px,1fr) minmax(160px,0.7fr)', gap: 20 }}>
 <div>
 <span style={labelStyle}>Class</span>
 <select value={schoolClass} onChange={e => setSchoolClass(e.target.value)} style={inputStyle}>
 {classOptions.map(item => <option key={item} value={item}>{item}</option>)}
 </select>
 </div>
 <div>
 <span style={labelStyle}>Section</span>
 <select value={section} onChange={e => setSection(e.target.value)} style={inputStyle}>
 {sectionOptions.map(item => <option key={item} value={item}>{item}</option>)}
 </select>
 </div>
 <div>
 <span style={labelStyle}>Number of Periods</span>
 <select value={numPeriods} onChange={e => setNumPeriods(Number(e.target.value))} style={inputStyle}>
 {[4, 5, 6, 7, 8, 9, 10].map(num => <option key={num} value={num}>{num} Periods</option>)}
 </select>
 </div>
 </div>

 <div className="super-module-card" style={{ ...card, padding: 24, minWidth: 0 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
 <div>
 <div style={{ color: '#C8991A', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Current Selection</div>
 <div style={{ color: '#C0C8D8' }}>{schoolClass} · Section {section}</div>
 </div>
 <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
 <div style={{ color: '#8892A4', fontSize: 13 }}>Assigned lessons</div>
 <div style={{ background: 'rgba(200,153,26,0.16)', color: '#C8991A', borderRadius: 14, padding: '8px 14px', fontWeight: 700 }}>{activeLessonCount}</div>
 </div>
 </div>

 <div className="os-scroll-x timetable-scroll" style={{ overflowX: 'auto', overflowY: 'hidden', width: '100%', maxWidth: '100%', paddingBottom: 12 }}>
 <div style={{ minWidth: timetableMinWidth }}>
 <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
 <colgroup>
 <col style={{ width: 132 }} />
 {periods.map(period => <col key={period} style={{ width: `${(timetableMinWidth - 132) / periods.length}px` }} />)}
 </colgroup>
 <thead>
 <tr>
 <th style={{ padding: '12px 12px', textAlign: 'left', color: '#C8991A', borderBottom: '1px solid rgba(200,153,26,0.2)', position: 'sticky', left: 0, zIndex: 3, background: '#10223b' }}>Day</th>
 {periods.map(period => (
 <th key={period} style={{ padding: '12px 10px', textAlign: 'center', color: '#C8991A', borderBottom: '1px solid rgba(200,153,26,0.2)' }}>{period}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {DAYS.map(day => (
 <tr key={day} style={{ borderTop: '1px solid rgba(200,153,26,0.12)' }}>
 <td style={{ padding: '12px 12px', fontWeight: 700, color: '#fff', background: '#08243e', position: 'sticky', left: 0, zIndex: 2 }}>{day}</td>
 {periods.map(period => (
 <td key={period} style={{ padding: 8, verticalAlign: 'top' }}>
 <div style={{ display: 'grid', gap: 8, padding: 10, borderRadius: 14, background: 'rgba(11,44,77,0.92)', border: '1px solid rgba(200,153,26,0.12)' }}>
 <div>
 <span style={labelStyle}>Subject</span>
 <select value={assignments[day][period]?.subject || subjectOptions[0]} onChange={e => handleChange(day, period, 'subject', e.target.value)} style={inputStyle}>
 {subjectOptions.map(subject => <option key={subject} value={subject}>{subject}</option>)}
 </select>
 </div>
 <div>
 <span style={labelStyle}>Teacher</span>
 <select value={assignments[day][period]?.teacher || TEACHERS[0]} onChange={e => handleChange(day, period, 'teacher', e.target.value)} style={inputStyle}>
 {TEACHERS.map(teacher => <option key={teacher} value={teacher}>{teacher}</option>)}
 </select>
 </div>
 </div>
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}

export default TimetableModule

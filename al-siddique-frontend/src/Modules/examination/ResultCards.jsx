import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import { C, card, btnPrimary, btnSecondary, select, sectionHeader } from '../moduleStyles'
import {
 DEFAULT_RESULT_OPTIONS,
 ResultCardPreview,
 ResultCardPrintToolbar,
 ResultCardTemplateSelector,
 buildResultCardData,
 openResultPrintWindow,
 resultCardPrintCss,
} from './resultCardTemplates'

function gradeLabel(pct) {
 if (pct >= 90) return 'A+'
 if (pct >= 80) return 'A'
 if (pct >= 70) return 'B'
 if (pct >= 60) return 'C'
 if (pct >= 50) return 'D'
 return 'F'
}

const TEACHER_REMARK_PRESETS = [
 'Excellent performance. Keep up the outstanding effort and consistency.',
 'Good progress shown. Continue regular revision and classroom participation.',
 'Satisfactory result. More written practice will help improve confidence.',
 'Needs improvement. Please focus on weak subjects with guided practice.',
 'Irregular preparation affected performance. Regular homework and revision are required.',
]

//  Template designs 
const TEMPLATES = [
 { id: 'geometric', label: 'Geometric Frame', color: '#C8991A', accent: '#8B6914' },
 { id: 'diagonal', label: 'Diagonal Stripe', color: '#0A84FF', accent: '#055EC0' },
 { id: 'circle', label: 'Circle & Arc', color: '#BF5AF2', accent: '#8A30BB' },
 { id: 'ribbon', label: 'Ribbon Fold', color: '#FF375F', accent: '#CC1A40' },
 { id: 'board-pattern', label: 'Board Pattern', color: '#333333', accent: '#111111' },
 { id: 'performance-analytics', label: 'Performance Analytics', color: '#4F46E5', accent: '#3730A3' },
 { id: 'modern-hexagon', label: 'Modern Hexagon', color: '#EC4899', accent: '#BE185D' },
 { id: 'minimal-corporate', label: 'Minimal Corporate', color: '#111111', accent: '#000000' },
 { id: 'playful-primary', label: 'Playful Primary', color: '#FF9A9E', accent: '#FECFEF' },
]

//  Print result card 
function printResultCard(student, exam, studentMarks, opts, school) {
 const t = TEMPLATES.find(t => t.id === opts.template) || TEMPLATES[0]
 const totalObtained = studentMarks.reduce((s, r) => s + Number(r.marks_obtained || 0), 0)
 const totalPossible = studentMarks.length * (exam?.total_marks || 100)
 const pct = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0
 const grade = gradeLabel(pct)
 const today = opts.resultDate || new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

 const html = `<!DOCTYPE html><html><head><title>Result Card - ${student.name}</title>
 <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
 <style>
 body{margin:0;padding:30px;font-family:Arial,sans-serif;background:#fff;color:#000;}
 .card{max-width:700px;margin:0 auto;border:3px solid ${t.color};border-radius:12px;overflow:hidden;}
 .header{background:linear-gradient(135deg,${t.color},${t.accent});color:#fff;padding:20px;text-align:center;}
 .header img{height:60px;object-fit:contain;margin-bottom:8px;}
 .header h1{margin:0;font-size:20px;}
 .header p{margin:4px 0 0;font-size:12px;opacity:0.9;}
 .badge{display:inline-block;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-top:8px;}
 .student-row{display:flex;justify-content:space-between;padding:14px 20px;background:#f9f7f0;border-bottom:2px solid ${t.color};}
 .student-row div{font-size:13px;}
 .student-row strong{font-size:14px;}
 table{width:100%;border-collapse:collapse;}
 th{background:${t.color};color:#fff;padding:10px 14px;text-align:left;font-size:12px;}
 td{padding:9px 14px;border-bottom:1px solid #eee;font-size:13px;}
 tr:nth-child(even) td{background:#fafafa;}
 .summary{display:flex;justify-content:space-between;padding:16px 20px;background:${t.color}14;border-top:2px solid ${t.color};}
 .summary-item{text-align:center;}
 .summary-item .val{font-size:24px;font-weight:900;color:${t.color};}
 .summary-item .lbl{font-size:11px;color:#555;margin-top:2px;}
 .footer{display:flex;justify-content:space-between;padding:16px 20px;border-top:1px solid #ddd;}
 .footer div{text-align:center;font-size:11px;color:#555;}
 .footer div span{display:block;border-top:1px solid #333;width:120px;margin:32px auto 4px;}
 @media print{body{padding:10px;}.card{border-radius:0;}}
 </style></head><body>
 <div class="card">
 <div class="header">
 ${school.logo ? `<img src="${school.logo.startsWith('http') || school.logo.startsWith('blob:') || school.logo.startsWith('data:') ? school.logo : (school.logo.startsWith('/') ? 'https://api.assps.edu.pk' + school.logo : 'https://api.assps.edu.pk/' + school.logo)}" alt="logo">` : ''}
 <div style="font-family:'Noto Nastaliq Urdu',serif;font-size:18px;direction:rtl;margin-bottom:4px">${school.urdu || ''}</div>
 <h1>${school.name || 'Al Siddique Scholars Public School'}</h1>
 <p>${school.address || ''}</p>
 <div class="badge"> RESULT CARD  ${exam?.name || ''}</div>
 </div>

 <div class="student-row">
 <div>Student Name: <strong>${student.name}</strong><br>Class/Section: <strong>${exam?.class || '—'}</strong></div>
 <div style="text-align:right">Father Name: <strong>${student.father_name || '—'}</strong><br>Session: <strong>2026-2027</strong> &nbsp; Reg No: <strong>${student.gr_number || '—'}</strong></div>
 </div>

 <table>
 <thead><tr>
 <th>S.No</th><th>Subject</th><th>Total</th><th>Obtained</th><th>Percentage</th><th>Grade</th>
 </tr></thead>
 <tbody>
 ${studentMarks.map((r, i) => {
 const rowPct = totalPossible > 0 ? Math.round((Number(r.marks_obtained) / (exam?.total_marks || 100)) * 100) : 0
 return `<tr>
 <td>${i + 1}</td>
 <td>${r.subject}</td>
 <td>${exam?.total_marks || 100}</td>
 <td style="font-weight:700">${r.marks_obtained}</td>
 <td>${rowPct}%</td>
 <td style="font-weight:700;color:${rowPct >= 50 ? 'green' : 'red'}">${gradeLabel(rowPct)}</td>
 </tr>`
 }).join('')}
 <tr style="font-weight:700;background:#f0ead8">
 <td colspan="2">TOTAL</td>
 <td>${totalPossible}</td>
 <td>${totalObtained}</td>
 <td>${pct}%</td>
 <td>${grade}</td>
 </tr>
 </tbody>
 </table>

 <div class="summary">
 <div class="summary-item"><div class="val">1st</div><div class="lbl">Position</div></div>
 <div class="summary-item"><div class="val">${grade}</div><div class="lbl">Grade</div></div>
 <div class="summary-item"><div class="val" style="color:${pct>=50?'green':'red'}">${pct>=50?'Pass':'Fail'}</div><div class="lbl">Remarks</div></div>
 <div class="summary-item"><div class="val" style="font-size:14px">${today}</div><div class="lbl">Result Date</div></div>
 </div>

 <div style="padding:10px 20px;background:#fffcf0;border-top:1px solid #eee;font-size:12px;">
 <strong>Teacher Remarks:</strong> With more hard work he/she can make his/her position better in future.
 </div>

 <div class="footer">
 <div><span></span>Class Teacher</div>
 <div><span></span>Principal</div>
 </div>
 </div>
 <script>window.onload=()=>window.print()</script>
 </body></html>`

 const w = window.open('', '_blank', 'width=800,height=700')
 w.document.write(html)
 w.document.close()
}

//  Parameters Modal 
function ParametersModal({ student, exam, studentMarks, school, onClose }) {
 const [template, setTemplate] = useState('geometric')
 const [dispAttendance, setDispAttendance] = useState('No')
 const [dispPerformance, setDispPerformance] = useState('No')
 const [dispBlank, setDispBlank] = useState('No')
 const [resultDate, setResultDate] = useState(new Date().toISOString().slice(0,10))
 const [dispSummary, setDispSummary] = useState('No')
 const [showAdvanced, setShowAdvanced] = useState(false)
 const [headingSize, setHeadingSize] = useState('23px')
 const [tableSize, setTableSize] = useState('12px')
 const [nameSize, setNameSize] = useState('17px')

 const selStyle = { padding:'8px 12px', borderRadius:8, background:'rgba(11,44,77,0.6)', border:'1px solid rgba(200,153,26,0.2)', color:'#C0C8D8', fontSize:13, outline:'none', width:'100%' }
 const inpStyle = { ...selStyle, width:'100%' }

 return createPortal(
 <div style={{ position:'fixed', inset:0, background:'rgba(7,30,52,0.85)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
 <div style={{ background:'#0D2C4A', border:'1px solid rgba(200,153,26,0.25)', borderRadius:18, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.6)' }}>
 <div style={{ background:'linear-gradient(135deg,#C8991A,#e8b420)', padding:'16px 24px', borderRadius:'18px 18px 0 0' }}>
 <h2 style={{ margin:0, color:'#071e34', fontSize:16, fontWeight:800 }}>Choose Parameters to Display in Result Cards</h2>
 </div>

 <div style={{ padding:24, display:'flex', flexDirection:'column', gap:20 }}>
 {/* Template Selection */}
 <div>
 <div style={{ color:'#C8991A', fontSize:12, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>
  Select Template Design — <span style={{ color:'#C0C8D8' }}>{TEMPLATES.find(t=>t.id===template)?.label}</span>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
 {TEMPLATES.map(t => (
 <div key={t.id} onClick={()=>setTemplate(t.id)}
 style={{ cursor:'pointer', border:`2px solid ${template===t.id?t.color:'rgba(148,163,184,0.18)'}`, borderRadius:10, overflow:'hidden', background:'rgba(15,23,42,0.46)' }}>
 <div style={{ height:64, background:`linear-gradient(135deg,${t.color}30,${t.accent}15)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:t.color, fontWeight:700 }}>
 {t.id==='geometric'?'':t.id==='diagonal'?'':t.id==='circle'?'⊙':''}
 </div>
 <div style={{ padding:'6px', textAlign:'center', fontSize:10, color:template===t.id?'#C8991A':'#8892A4', fontWeight:600 }}>{t.label}</div>
 </div>
 ))}
 </div>
 </div>

 {/* Display Options */}
 <div>
 <div style={{ color:'#C8991A', fontSize:12, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}> Display Options</div>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
 <div><label style={{ color:'#8892A4', fontSize:11, display:'block', marginBottom:5 }}>Display Attendance</label><select style={selStyle} value={dispAttendance} onChange={e=>setDispAttendance(e.target.value)}><option>No</option><option>Yes</option></select></div>
 <div><label style={{ color:'#8892A4', fontSize:11, display:'block', marginBottom:5 }}>Academic Performance</label><select style={selStyle} value={dispPerformance} onChange={e=>setDispPerformance(e.target.value)}><option>No</option><option>Yes</option></select></div>
 <div><label style={{ color:'#8892A4', fontSize:11, display:'block', marginBottom:5 }}>Display Blank Subjects</label><select style={selStyle} value={dispBlank} onChange={e=>setDispBlank(e.target.value)}><option>No</option><option>Yes</option></select></div>
 </div>
 </div>

 {/* Result Settings */}
 <div>
 <div style={{ color:'#C8991A', fontSize:12, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}> Result Settings</div>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
 <div><label style={{ color:'#8892A4', fontSize:11, display:'block', marginBottom:5 }}>Result Declaration Date</label><input type="date" style={inpStyle} value={resultDate} onChange={e=>setResultDate(e.target.value)}/></div>
 <div><label style={{ color:'#8892A4', fontSize:11, display:'block', marginBottom:5 }}>Display Result Summary</label><select style={selStyle} value={dispSummary} onChange={e=>setDispSummary(e.target.value)}><option>No</option><option>Yes</option></select></div>
 </div>
 <div style={{ marginTop:10, padding:'10px 14px', background:'rgba(200,153,26,0.06)', border:'1px solid rgba(148,163,184,0.18)', borderRadius:8, fontSize:11, color:'#8892A4' }}>
  Selected items will be displayed on the result card<br/>
 <span style={{ color:'rgba(192,200,216,0.6)' }}>Percentage, Grade, Position, Overall Grade, Total Marks, Obtained Marks, Remark</span>
 </div>
 </div>

 {/* Advanced Settings toggle */}
 <div>
 <button onClick={()=>setShowAdvanced(a=>!a)} style={{ background:'none', border:'none', color:'#C8991A', cursor:'pointer', fontSize:13, fontWeight: 600, padding:0 }}>
  Advanced Settings {showAdvanced?'':''}
 </button>
 {showAdvanced && (
 <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
 <div><label style={{ color:'#8892A4', fontSize:11, display:'block', marginBottom:5 }}>Heading Font Size</label><select style={selStyle} value={headingSize} onChange={e=>setHeadingSize(e.target.value)}>{['18px','20px','23px','26px'].map(s=><option key={s}>{s}</option>)}</select></div>
 <div><label style={{ color:'#8892A4', fontSize:11, display:'block', marginBottom:5 }}>Table Font Size</label><select style={selStyle} value={tableSize} onChange={e=>setTableSize(e.target.value)}>{['10px','11px','12px','13px','14px'].map(s=><option key={s}>{s}</option>)}</select></div>
 <div><label style={{ color:'#8892A4', fontSize:11, display:'block', marginBottom:5 }}>Name Font Size</label><select style={selStyle} value={nameSize} onChange={e=>setNameSize(e.target.value)}>{['14px','15px','16px','17px','18px','20px'].map(s=><option key={s}>{s}</option>)}</select></div>
 </div>
 )}
 </div>
 </div>

 <div style={{ display:'flex', gap:12, padding:'16px 24px', borderTop:'1px solid rgba(148,163,184,0.18)' }}>
 <button onClick={onClose} style={{ ...btnSecondary, flex:1, justifyContent:'center' }}> Close</button>
 <button onClick={()=>{
 printResultCard(student, exam, studentMarks,
 { template, resultDate:new Date(resultDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) },
 school)
 onClose()
 }} style={{ ...btnPrimary, flex:1, justifyContent:'center' }}> Generate Report Cards</button>
 </div>
 </div>
 </div>,
 document.body
 )
}

//  Main Component 
function ProfessionalParametersModal({ cards, student, exam, studentMarks, school, onClose }) {
 const [options, setOptions] = useState(DEFAULT_RESULT_OPTIONS)
 const [remarksOpen, setRemarksOpen] = useState(false)
 const previewRef = useRef(null)
 const [scale, setScale] = useState(1)
 const sourceCards = cards?.length ? cards : [{ student, exam, studentMarks }]
 const dataList = sourceCards
 .filter(item => item?.student && item?.exam && item?.studentMarks?.length)
 .map(item => buildResultCardData({ ...item, options, school }))
 const data = dataList[0]

 useEffect(() => {
 const el = previewRef.current
 if (!el) return
 const calc = () => {
 const available = el.clientWidth - 36
 setScale(Math.min(1, available / 794))
 }
 calc()
 const ro = new ResizeObserver(calc)
 ro.observe(el)
 return () => ro.disconnect()
 }, [])

 return createPortal(
 <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
 style={{ position:'fixed', inset:0, background:'rgba(7,30,52,0.88)', backdropFilter:'blur(10px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'22px' }}>
 <div onMouseDown={(e) => e.stopPropagation()}
 style={{ width:'min(1320px, 100%)', maxHeight:'calc(100vh - 44px)', background:'#0D2C4A', border:'1px solid rgba(200,153,26,0.25)', borderRadius:18, boxShadow:'0 24px 60px rgba(0,0,0,0.6)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
 <style>{resultCardPrintCss}</style>
 <div className="result-modal-head no-print" style={{ flexShrink:0 }}>
 <div>
 <h2>Professional Result Card Designer</h2>
 <p>Select template, choose marks columns, preview, then print or save as PDF. {dataList.length > 1 ? `${dataList.length} result cards ready.` : ''}</p>
 </div>
 <button onClick={onClose}>Close</button>
 </div>

 <div className="result-designer no-print" style={{ flex:1, minHeight:0 }}>
 <aside className="result-options-panel">
 <h3>Templates</h3>
 <ResultCardTemplateSelector value={options.template} onChange={(template) => setOptions(prev => ({ ...prev, template }))} />
 <h3>Marks & Print Options</h3>
 <ResultCardPrintToolbar
 options={options}
 setOptions={setOptions}
 onPrint={() => openResultPrintWindow(dataList)}
 onExportPdf={() => openResultPrintWindow(dataList, true)}
 />
 <div style={{ marginTop:14, border:'1px solid rgba(148,163,184,0.18)', borderRadius:14, overflow:'hidden', background:'rgba(7,30,52,0.35)' }}>
 <button
 type="button"
 onClick={() => setRemarksOpen(v => !v)}
 style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, padding:'11px 13px', border:'none', background:'transparent', color:'#C8991A', cursor:'pointer', fontWeight:900, fontSize:12 }}
 >
 Teacher Remarks
 <span style={{ color:'#8892A4' }}>{remarksOpen ? 'Hide' : 'Edit'}</span>
 </button>
 {remarksOpen && (
 <div style={{ padding:'0 13px 13px', display:'grid', gap:10 }}>
 <div style={{ display:'grid', gap:6 }}>
 {TEACHER_REMARK_PRESETS.map(text => (
 <button
 type="button"
 key={text}
 onClick={() => setOptions(prev => ({ ...prev, includeTeacherRemarks:true, teacherRemarks:text }))}
 style={{ textAlign:'left', padding:'8px 10px', borderRadius:10, border:'1px solid rgba(148,163,184,0.14)', background: options.teacherRemarks === text ? 'rgba(200,153,26,0.16)' : 'rgba(15,23,42,0.42)', color:'#C0C8D8', cursor:'pointer', fontSize:11, lineHeight:1.4 }}
 >
 {text}
 </button>
 ))}
 </div>
 <textarea
 value={options.teacherRemarks || ''}
 onChange={e => setOptions(prev => ({ ...prev, teacherRemarks:e.target.value }))}
 placeholder="Write custom teacher remarks..."
 rows={4}
 style={{ width:'100%', resize:'vertical', borderRadius:10, border:'1px solid rgba(148,163,184,0.18)', background:'#071e34', color:'#C0C8D8', padding:'10px 12px', outline:'none', fontSize:12, lineHeight:1.5 }}
 />
 <div style={{ color:'#8892A4', fontSize:11, lineHeight:1.5 }}>
 Rule-based presets. No AI required, and this text can be fully customized before print.
 </div>
 </div>
 )}
 </div>
 </aside>
 <main className="result-preview-panel" ref={previewRef}>
 {data ? (
 <>
 {dataList.length > 1 && (
 <div style={{ marginBottom:12, color:'#C8991A', fontWeight:800, textAlign:'center' }}>
 Previewing first card. Print/PDF will include all {dataList.length} cards.
 </div>
 )}
 <div className="result-preview-scale" style={{ transform:`scale(${scale})`, transformOrigin:'top left', width:'794px' }}>
 <ResultCardPreview data={data} />
 </div>
 </>
 ) : (
 <div style={{ color:'#C0C8D8', padding:24 }}>No printable result cards found.</div>
 )}
 </main>
 </div>
 </div>
 </div>,
 document.body
 )
}

export default function ResultCards() {
 const [exams, setExams] = useState([])
 const [results, setResults] = useState([])
 const [selectedExam, setSelectedExam] = useState('')
 const [selectedStudent, setSelectedStudent] = useState('')
 const [outputMode, setOutputMode] = useState('single')
 const [printCards, setPrintCards] = useState([])
 const [loading, setLoading] = useState(false)
 const [showParams, setShowParams] = useState(false)
 const { paperSettings } = usePaperStore()

 useEffect(() => {
 api.get('/api/exams').then(r => {
 const list = r.data.data || []
 setExams(list)
 if (list.length) setSelectedExam(String(list[0].id))
 }).catch(() => {})
 }, [])

 const loadResults = () => {
 if (!selectedExam) return
 setLoading(true)
 setResults([])
 setSelectedStudent('')
 api.get(`/api/exams/results/${selectedExam}`)
 .then(r => {
 const list = r.data.data || []
 setResults(list)
 const ids = [...new Set(list.map(r => r.student_id))]
 if (ids.length) setSelectedStudent(String(ids[0]))
 })
 .catch(() => setResults([]))
 .finally(() => setLoading(false))
 }

 useEffect(() => {
 if (selectedExam) loadResults()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [selectedExam])

 const buildStudentsFromRows = (rows = []) => {
  const map = new Map()
  rows.forEach(r => {
  const id = String(r.student_id)
  if (!map.has(id)) {
  map.set(id, {
  id: r.student_id,
  name: r.name || r.student_name || r.studentName || `Student #${r.student_id}`,
  gr_number: r.gr_number || r.gr || '',
  roll_number: r.roll_number || r.rollNo || '',
  father_name: r.father_name || r.fatherName || '',
  photo: r.photo || '',
  subjectsCount: 0,
  })
  }
  map.get(id).subjectsCount += 1
  })
  return [...map.values()]
  }
 const buildPrintCards = (rows = results, examObj = exam, scopeStudents = buildStudentsFromRows(rows)) =>
 scopeStudents.map(s => ({
 student: s,
 exam: examObj,
 studentMarks: rows.filter(r => String(r.student_id) === String(s.id)),
 })).filter(item => item.studentMarks.length > 0)

 const students = buildStudentsFromRows(results)
 const studentMarks = results.filter(r => String(r.student_id) === selectedStudent)
 const student = students.find(s => String(s.id) === selectedStudent)
 const exam = exams.find(e => String(e.id) === selectedExam)
 const classPrintCards = buildPrintCards(results, exam, students)
 const totalObtained = studentMarks.reduce((s, r) => s + Number(r.marks_obtained || 0), 0)
 const totalPossible = studentMarks.reduce((s, r) => s + Number(r.total_marks || exam?.total_marks || 100), 0)
 const pct = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0
 const selectedStudentLabel = student
 ? `${student.name}${student.gr_number ? ` - ${student.gr_number}` : student.roll_number ? ` - Roll ${student.roll_number}` : ''}`
 : ''
 const printTargetValue = outputMode === 'single' && selectedStudent ? `student:${selectedStudent}` : outputMode
 const handlePrintTargetChange = (value) => {
 if (value === 'class' || value === 'all') {
 setOutputMode(value)
 return
 }
 if (value.startsWith('student:')) {
 setOutputMode('single')
 setSelectedStudent(value.replace('student:', ''))
 }
 }
 const canPrint = outputMode === 'single'
 ? !!student && studentMarks.length > 0
 : outputMode === 'class'
 ? classPrintCards.length > 0
 : exams.length > 0

 const openDesigner = async () => {
 if (outputMode === 'single') {
 if (!student || !studentMarks.length) return alert('Select student with marks first')
 setPrintCards([{ student, exam, studentMarks }])
 setShowParams(true)
 return
 }
 if (outputMode === 'class') {
 if (!classPrintCards.length) return alert('No class result cards found for this exam')
 setPrintCards(classPrintCards)
 setShowParams(true)
 return
 }

 setLoading(true)
 try {
 const all = await Promise.all(exams.map(async (item) => {
 const res = await api.get(`/api/exams/results/${item.id}`)
 const rows = res.data.data || []
 return buildPrintCards(rows, item, buildStudentsFromRows(rows))
 }))
 const flat = all.flat()
 if (!flat.length) return alert('No marks found in any class/exam')
 setPrintCards(flat)
 setShowParams(true)
 } catch {
 alert('Could not load all classes result cards')
 } finally {
 setLoading(false)
 }
 }
 const stepPill = (num, title, active, done) => (
 <div style={{
 display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:14,
 background: done ? 'rgba(48,209,88,0.12)' : active ? 'rgba(200,153,26,0.14)' : 'rgba(15,23,42,0.38)',
 border:`1px solid ${done ? 'rgba(48,209,88,0.35)' : active ? 'rgba(200,153,26,0.36)' : C.border}`,
 color: done ? C.green : active ? C.gold : C.muted,
 fontWeight:800, fontSize:12,
 }}>
 <span style={{
 width:24, height:24, borderRadius:999, display:'grid', placeItems:'center',
 background: done ? C.green : active ? C.gold : 'rgba(148,163,184,0.16)',
 color: done || active ? '#071e34' : C.muted,
 fontSize:12, fontWeight:900,
 }}>{done ? '' : num}</span>
 {title}
 </div>
 )

 const school = {
 name: paperSettings.schoolName,
 urdu: paperSettings.schoolUrdu,
 address: paperSettings.address,
 phone: paperSettings.phone,
 logo: paperSettings.logo,
 principalSignature: paperSettings.principalSignature,
 showUrduHeader: paperSettings.showUrduHeader !== false,
 }

 return (
 <div style={{ minHeight:'100%', padding:24, background:'#071e34', color:C.silver }}>
 <div style={{ maxWidth:1180, margin:'0 auto', display:'grid', gap:24 }}>

 <div className="super-module-card" style={{ ...card, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:16, alignItems:'center' }}>
 <div>
 <h1 style={sectionHeader}>Result Cards</h1>
 <p style={{ color:C.muted, marginTop:8 }}>Choose single student, whole class, or all classes, then print professional A4 result cards.</p>
 </div>
 <button style={{ ...btnPrimary, opacity: canPrint ? 1 : 0.55, cursor: canPrint ? 'pointer' : 'not-allowed' }} onClick={openDesigner}>
  Generate Report Cards
 </button>
 </div>

 <div className="super-module-card" style={{ ...card, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
 {stepPill(1, 'Select Exam / Term', true, !!selectedExam)}
 {stepPill(2, 'Select Print Target', students.length > 0 || loading, students.length > 0)}
 {stepPill(3, 'Preview & Print', canPrint, false)}
 </div>

 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:18, alignItems:'stretch' }}>
 <div className="super-module-card" style={{ ...card, display:'flex', flexDirection:'column', gap:12 }}>
 <div style={{ color:C.gold, fontSize:13, fontWeight:900 }}>1. Exam / Term</div>
 <div style={{ color:C.muted, fontSize:12 }}>Select the exam whose saved marks should appear on result cards.</div>
 <select style={select} value={selectedExam} onChange={e=>{ setSelectedExam(e.target.value); setResults([]); setSelectedStudent('') }}>
 <option value="">Select exam</option>
 {exams.map(e=><option key={e.id} value={e.id}>{e.name} - {e.class}</option>)}
 </select>
 {exam && (
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:'auto' }}>
 <div style={{ padding:10, borderRadius:12, background:'rgba(255,255,255,0.04)' }}>
 <div style={{ color:C.muted, fontSize:10, fontWeight:800 }}>TYPE</div>
 <div style={{ color:C.silver, fontWeight:800 }}>{exam.type || 'Exam'}</div>
 </div>
 <div style={{ padding:10, borderRadius:12, background:'rgba(255,255,255,0.04)' }}>
 <div style={{ color:C.muted, fontSize:10, fontWeight:800 }}>MARKS</div>
 <div style={{ color:C.silver, fontWeight:800 }}>{exam.total_marks || 100}</div>
 </div>
 </div>
 )}
 </div>

 <div className="super-module-card" style={{ ...card, display:'flex', flexDirection:'column', gap:12 }}>
 <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center' }}>
 <div style={{ color:C.gold, fontSize:13, fontWeight:900 }}>2. Print Target</div>
 <button type="button" onClick={loadResults} disabled={loading || !selectedExam} style={{ ...btnSecondary, minHeight:0, padding:'7px 12px', fontSize:12 }}>
 {loading ? 'Loading...' : 'Refresh'}
 </button>
 </div>
 <div style={{ color:C.muted, fontSize:12 }}>
 {loading ? 'Loading students with marks...' : students.length ? `${students.length} student(s) found for this exam.` : 'No students loaded yet.'}
 </div>
 <select
 style={{ ...select, fontSize:15, fontWeight:800, opacity: students.length ? 1 : 0.65 }}
 value={printTargetValue}
 onChange={e=>handlePrintTargetChange(e.target.value)}
 disabled={!students.length || loading}
 >
 <option value="">{loading ? 'Loading targets...' : students.length ? 'Select print target' : 'No students with marks'}</option>
 <option value="class">Whole Class - Class {exam?.class || '-'} ({classPrintCards.length} cards)</option>
 <option value="all">All Classes - all saved result cards</option>
 {students.map(s => {
 const suffix = s.gr_number ? s.gr_number : s.roll_number ? `Roll ${s.roll_number}` : `${s.subjectsCount} subjects`
 return <option key={s.id} value={`student:${s.id}`}>Student - {s.name} - {suffix}</option>
 })}
 </select>
 {(student || outputMode !== 'single') && (
 <div style={{ marginTop:'auto', padding:12, borderRadius:14, background:'rgba(10,132,255,0.08)', border:'1px solid rgba(10,132,255,0.18)' }}>
 <div style={{ color:C.silver, fontWeight:800, fontSize:15 }}>
 {outputMode === 'single' ? selectedStudentLabel : outputMode === 'class' ? `${classPrintCards.length} cards for ${exam?.class || 'selected class'}` : 'All classes will be loaded before print'}
 </div>
 <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>
 {outputMode === 'single' ? `${studentMarks.length} subject marks ready` : outputMode === 'class' ? 'One A4 page per student in this exam/class' : 'All exams/classes with saved marks will be printed'}
 </div>
 </div>
 )}
 </div>

 <div className="super-module-card" style={{ ...card, display:'flex', flexDirection:'column', gap:12 }}>
 <div style={{ color:C.gold, fontSize:13, fontWeight:900 }}>3. Output</div>
 <div style={{ color:C.muted, fontSize:12 }}>Preview checks totals before opening print templates.</div>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
 <div style={{ padding:12, borderRadius:14, background:'rgba(48,209,88,0.08)' }}>
 <div style={{ color:C.muted, fontSize:10, fontWeight:800 }}>OBTAINED</div>
 <div style={{ color:C.green, fontSize:20, fontWeight:900 }}>{outputMode === 'single' ? (totalObtained || '-') : outputMode === 'class' ? classPrintCards.length : 'All'}</div>
 </div>
 <div style={{ padding:12, borderRadius:14, background:'rgba(200,153,26,0.08)' }}>
 <div style={{ color:C.muted, fontSize:10, fontWeight:800 }}>PERCENT</div>
 <div style={{ color:C.gold, fontSize:20, fontWeight:900 }}>{outputMode === 'single' ? (totalPossible ? `${pct}%` : '-') : outputMode === 'class' ? 'Cards' : 'Classes'}</div>
 </div>
 </div>
 <button style={{ ...btnPrimary, marginTop:'auto', justifyContent:'center', opacity: canPrint ? 1 : 0.55, cursor: canPrint ? 'pointer' : 'not-allowed' }} onClick={openDesigner} disabled={!canPrint || loading}>
 Print / Export Card
 </button>
 </div>
 </div>

 <div className="super-module-card" style={{ display:'none' }}>
 <div style={{ flex:'1 1 240px' }}>
 <div style={{ color:C.muted, fontSize:12, fontWeight:700, marginBottom:8 }}>Select Exam</div>
 <select style={select} value={selectedExam} onChange={e=>{ setSelectedExam(e.target.value); setResults([]); setSelectedStudent('') }}>
 {exams.map(e=><option key={e.id} value={e.id}>{e.name} ({e.class})</option>)}
 </select>
 </div>
 <button type="button" onClick={loadResults} disabled={loading || !selectedExam} style={{ ...btnPrimary, padding:'12px 20px' }}>
 {loading ? '…' : ' Load Results'}
 </button>
 {students.length > 0 && (
 <div style={{ flex:'1 1 240px' }}>
 <div style={{ color:C.muted, fontSize:12, fontWeight:700, marginBottom:8 }}>Select Student</div>
 <select style={select} value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)}>
 {students.map(s=><option key={s.id} value={s.id}>{s.name} ({s.gr_number})</option>)}
 </select>
 </div>
 )}
 </div>

 {loading ? (
 <div className="super-module-card" style={{ ...card, padding:40, textAlign:'center', color:C.muted }}>Loading results…</div>
 ) : student && studentMarks.length > 0 ? (
 <div className="super-module-card" style={{ ...card, background:'rgba(11,44,77,0.72)', borderRadius:20, padding:28, color:'#fff' }}>
 <div style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:24, alignItems:'center', flexWrap:'wrap' }}>
 <div>
 <div style={{ color:C.gold, fontWeight:800, fontSize:22 }}>Result Card Preview</div>
 <div style={{ color:C.silver, marginTop:6 }}>{selectedStudentLabel}</div>
 <div style={{ color:C.muted, marginTop:4, fontSize:13 }}>{exam?.name} · {exam?.class}</div>
 </div>
 <button style={btnSecondary} onClick={openDesigner}> Print with Template</button>
 </div>
 <div style={{ display:'grid', gap:10, marginBottom:18 }}>
 {studentMarks.map(row=>(
 <div key={row.id || row.subject} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 14px', borderRadius:12, background:'rgba(255,255,255,0.04)' }}>
 <span style={{ color:C.silver }}>{row.subject}</span>
 <span style={{ color:Number(row.marks_obtained)>=(exam?.pass_marks||33)?C.green:C.red, fontWeight:700 }}>
 {row.marks_obtained} / {row.total_marks || exam?.total_marks || 100}
 </span>
 </div>
 ))}
 </div>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:16, borderRadius:20, background:'rgba(255,255,255,0.08)' }}>
 <div><div style={{ color:C.gold, fontWeight:800 }}>Total</div><div style={{ color:C.silver }}>{totalObtained} / {totalPossible}</div></div>
 <div style={{ textAlign:'right' }}>
 <div style={{ color:pct>=(exam?.pass_marks||33)?C.green:C.red, fontSize:32, fontWeight:800 }}>{pct}%</div>
 <div style={{ color:C.muted }}>Grade: {gradeLabel(pct)}</div>
 </div>
 </div>
 </div>
 ) : (
 <div className="super-module-card" style={{ ...card, padding:40, textAlign:'center', color:C.muted }}>
 {selectedExam?'No marks found for this exam. Go to Marks Sheet, load students, enter marks, then come back here.':'Select an exam to start generating result cards.'}
 </div>
 )}
 </div>

 {showParams && printCards.length > 0 && (
 <ProfessionalParametersModal
 cards={printCards}
 student={printCards[0]?.student}
 exam={printCards[0]?.exam}
 studentMarks={printCards[0]?.studentMarks}
 school={school}
 onClose={()=>setShowParams(false)}
 />
 )}
 </div>
 )
}

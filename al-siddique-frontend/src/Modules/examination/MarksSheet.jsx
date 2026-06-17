import { useState, useEffect } from 'react'
import { RefreshCw, Save, Search } from 'lucide-react'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from '../moduleStyles'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import { useAcademicStore } from '../../services/useAcademicStore'

const FALLBACK_EXAM_TYPES = ['Term Exam', 'Assessment', 'Quiz', 'Annual Exam', 'Monthly Test']

function classLabel(value) {
 return value ? `Class ${value}` : 'Select class'
}

function normalizeClass(value) {
 return String(value || '').replace(/^Class\s+/i, '')
}

function typeLabel(value) {
 if (value === 'TE') return 'Term Exam'
 if (value === 'AS') return 'Assessment'
 return value || 'Term Exam'
}

function normalizeExam(exam) {
 return {
 ...exam,
 type: typeLabel(exam.type),
 class: exam.class === 'All Classes' ? exam.class : normalizeClass(exam.class),
 session: exam.session || '2026-2027',
 }
}

export default function MarksSheet() {
 const { classNames, subjectsForClass } = useAcademicStore()
 const { paperSettings } = usePaperStore()
 const [exams, setExams] = useState([])
 const [students, setStudents] = useState([])
 const [selectedExamType, setSelectedExamType] = useState('')
 const [selectedClass, setSelectedClass] = useState('')
 const [selectedSubject, setSelectedSubject] = useState('')
 const [selectedExamId, setSelectedExamId] = useState('')
 const [totalMarks, setTotalMarks] = useState(100)
 const [passMarks, setPassMarks] = useState(33)
 const [marks, setMarks] = useState({})
 const [saving, setSaving] = useState(false)
 const [loadingData, setLoadingData] = useState(false)
 const [refreshing, setRefreshing] = useState(false)
 const [message, setMessage] = useState('')

 const loadExams = async () => {
 setRefreshing(true)
 try {
 const res = await api.get('/api/exams')
 const list = (res.data.data || []).map(normalizeExam)
 setExams(list)
 if (!selectedExamType && list.length) setSelectedExamType(list[0].type || FALLBACK_EXAM_TYPES[0])
 } catch {
 setExams([])
 setMessage('Refresh failed. Please check the backend connection.')
 } finally {
 setRefreshing(false)
 }
 }

 useEffect(() => {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 loadExams()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 const examTypes = Array.from(new Set([...FALLBACK_EXAM_TYPES, ...exams.map(exam => exam.type).filter(Boolean)]))
 const matchingExams = exams.filter(exam => {
 const typeOk = !selectedExamType || (exam.type || FALLBACK_EXAM_TYPES[0]) === selectedExamType
 const classOk = !selectedClass || normalizeClass(exam.class) === selectedClass || exam.class === 'All Classes'
 return typeOk && classOk
 })
 const selectedExam = exams.find(exam => String(exam.id) === String(selectedExamId)) || matchingExams[0]

 const syncExamDefaults = (nextExam) => {
 setStudents([])
 setMarks({})
 setSelectedExamId(nextExam ? String(nextExam.id) : '')
 if (nextExam) {
 setTotalMarks(Number(nextExam.total_marks || 100))
 setPassMarks(Number(nextExam.pass_marks || 33))
 }
 }

 const changeExamType = (value) => {
 const nextExam = exams.find(exam => (exam.type || FALLBACK_EXAM_TYPES[0]) === value && (!selectedClass || normalizeClass(exam.class) === selectedClass || exam.class === 'All Classes'))
 setSelectedExamType(value)
 syncExamDefaults(nextExam)
 }

 const changeClass = (value) => {
 const nextExam = exams.find(exam => (!selectedExamType || (exam.type || FALLBACK_EXAM_TYPES[0]) === selectedExamType) && (normalizeClass(exam.class) === value || exam.class === 'All Classes'))
 setSelectedClass(value)
 syncExamDefaults(nextExam)
 }

 const refreshData = async () => {
 setStudents([])
 setMarks({})
 setMessage('')
 await loadExams()
 }

  const searchStudents = async () => {
  if (!selectedExamType || !selectedClass || !selectedSubject) {
  setMessage('Please select exam type, class, and subject first.')
  return
  }

  setLoadingData(true)
  setMessage('')
  try {
  const queryClass = selectedClass.startsWith('Class ') ? selectedClass : 'Class ' + selectedClass
  const exam = selectedExam
  const [studRes, markRes] = await Promise.all([
  api.get('/api/students', { params: { class: queryClass } }),
  exam ? api.get(`/api/exams/results/${exam.id}`) : Promise.resolve({ data: { data: [] } }),
  ])
  const studentList = studRes.data.data || []
  setStudents(studentList)
  if (studentList.length === 0) {
  setMessage(`No students found registered in ${queryClass}. Please add students first.`)
  } else {
  setMessage('')
  }
  const loaded = {}
  for (const row of (markRes.data.data || [])) {
  if (row.subject === selectedSubject) loaded[row.student_id] = row.marks_obtained
  }
  setMarks(loaded)
  if (exam) {
  setTotalMarks(Number(exam.total_marks || totalMarks || 100))
  setPassMarks(Number(exam.pass_marks || passMarks || 33))
  }
  } catch (err) {
  setStudents([])
  setMarks({})
  const errMsg = err.response?.data?.message || err.message || 'Server error.'
  setMessage(`Search failed: ${errMsg}. Please verify the backend service status.`)
  } finally {
  setLoadingData(false)
  }
  }

  const updateMark = (studentId, value) => {
    const cleaned = typeof value === 'string' ? value.replace(/^0+(?=\d)/, '') : value
    setMarks(prev => ({ ...prev, [studentId]: cleaned }))
  }

  const saveMarks = async () => {
  if (!selectedExamType || !selectedClass || !selectedSubject || !students.length) return

  setSaving(true)
  setMessage('')
  try {
  const exam = selectedExam
  let examId = exam?.id
  if (!examId) {
  let resolvedType = selectedExamType
  if (selectedExamType === 'Term Exam') resolvedType = 'TE'
  else if (selectedExamType === 'Assessment') resolvedType = 'AS'

  const created = await api.post('/api/exams', {
  name: `${selectedExamType} - Class ${selectedClass}`,
  type: resolvedType,
  class: selectedClass,
  session: '2026-2027',
  total_marks: Number(totalMarks),
  pass_marks: Number(passMarks),
  })
  examId = created.data.data?.id
  await loadExams()
  }

  const results = students
  .filter(student => marks[student.id] !== undefined && marks[student.id] !== '')
  .map(student => ({
  exam_id: Number(examId),
  student_id: student.id,
  student_name: student.name,
  subject: selectedSubject,
  marks_obtained: Number(marks[student.id]),
  total_marks: Number(totalMarks),
  pass_marks: Number(passMarks),
  }))

 await api.post('/api/exams/results', { results })
 setMessage('Marks saved successfully.')
 setTimeout(() => setMessage(''), 3000)
  } catch (err) {
  setMessage(err.response?.data?.message || 'Failed to save marks.')
  } finally {
  setSaving(false)
  }
  }

  const fetchClassStudents = async () => {
  if (students.length) return students
  if (!selectedClass) return []
  try {
  const queryClass = selectedClass.startsWith('Class ') ? selectedClass : 'Class ' + selectedClass
  const res = await api.get('/api/students', { params: { class: queryClass } })
  return res.data.data || []
  } catch {
  return []
  }
  }

 const printBlankSheet = async (mode) => {
 if (!selectedClass) {
 setMessage('Please select class first.')
 return
 }
 const list = await fetchClassStudents()
 if (!list.length) {
 setMessage('Students could not be loaded for blank sheet.')
 return
 }
 const schoolName = (paperSettings.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL').toUpperCase()
 const logo = paperSettings.logo || ''
 const addr = paperSettings.address || ''
 const phone = paperSettings.phone || ''
 const columns = mode === 'subject'
 ? [selectedSubject || 'Subject Marks']
 : mode === 'all_subjects'
 ? (subjectsForClass(classLabel(selectedClass))?.length ? subjectsForClass(classLabel(selectedClass)) : ['Subject 1', 'Subject 2'])
 : (matchingExams.length ? matchingExams.map((exam, index) => exam.name || `${typeLabel(exam.type)} ${index + 1}`) : ['Assessment 1', 'Assessment 2', 'Assessment 3', 'Assessment 4', 'Assessment 5'])
 const title = mode === 'subject'
 ? `${selectedSubject || 'Subject'} Blank Mark Sheet`
 : mode === 'all_subjects'
 ? 'All Subjects Blank Mark Sheet'
 : 'All Assessments Blank Mark Sheet'
 const headCells = columns.map(col => `<th>${col}<br><small>${totalMarks || 100}</small></th>`).join('')
 const rows = list.map((student, i) => `<tr><td>${i + 1}</td><td>${student.name || ''}</td><td>${student.gr_number || '-'}</td><td>${student.father_name || '-'}</td>${columns.map(() => '<td class="mark"></td>').join('')}</tr>`).join('')
 const logoHtml = logo ? `<img src="${logo.startsWith('http') || logo.startsWith('blob:') || logo.startsWith('data:') ? logo : (logo.startsWith('/') ? 'https://api.assps.edu.pk' + logo : 'https://api.assps.edu.pk/' + logo)}" alt="logo">` : `<div class="logo-fallback">A</div>`
 const w = window.open('', '_blank', 'width=1100,height=760')
 w.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>${title}</title><style>
 *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;background:#eef2f7;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 @page{size:A4 landscape;margin:8mm}@media print{body{background:white}.no-print{display:none!important;height:0!important;overflow:hidden!important}}
 .bar.no-print{background:#071e34;color:white;padding:12px 18px;display:flex;gap:12px;align-items:center}.bar button{margin-left:auto;background:#C8991A;border:0;border-radius:8px;padding:9px 18px;font-weight:800;cursor:pointer}
 .page{background:white;margin:14px auto;padding:16px;max-width:1120px;box-shadow:0 12px 30px rgba(15,23,42,.16)}
 .head{display:flex;align-items:center;gap:14px;border-bottom:3px solid #13224A;padding-bottom:10px;margin-bottom:10px}
 .head img,.logo-fallback{width:62px;height:62px;object-fit:contain;border:1px solid #CBD5E1;border-radius:50%;padding:5px;display:grid;place-items:center;font-weight:900;color:#13224A}
 h1{margin:0;font-size:22px;line-height:1}.sub{font-size:12px;color:#475569;margin-top:4px}.meta{margin-left:auto;text-align:right;font-size:12px;color:#334155;line-height:1.6}
 table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #334155;padding:6px 7px;text-align:left}th{background:#13224A;color:white;text-transform:uppercase;font-size:10px}th small{color:#FACC15}.mark{height:30px;min-width:74px}
 </style></head><body><div class="bar no-print"><strong>${title}</strong><button onclick="window.print()">Print / Save PDF</button></div><section class="page">
 <div class="head">${logoHtml}<div><h1>${schoolName}</h1><div class="sub">${addr}${phone ? ` | ${phone}` : ''}</div></div><div class="meta"><b>${title}</b><br>Class ${selectedClass}<br>${selectedExamType || 'All Exam Types'}${selectedSubject ? ` | ${selectedSubject}` : ''}</div></div>
 <table><thead><tr><th>#</th><th>Student</th><th>GR No</th><th>Father Name</th>${headCells}</tr></thead><tbody>${rows}</tbody></table>
 </section></body></html>`)
 w.document.close()
 }

 return (
 <div style={{ minHeight: '100%', background: '#071e34', color: C.silver, padding: 24 }}>
 <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 24 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
 <div>
 <h1 style={sectionHeader}>Marks Sheet</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Select exam type, class, and subject, then add marks student by student.</p>
 </div>
 <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
 <button type="button" style={btnSecondary} onClick={refreshData} disabled={refreshing}>
 <RefreshCw size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
 {refreshing ? 'Refreshing...' : 'Refresh Data'}
 </button>
 <button type="button" style={btnSecondary} onClick={() => printBlankSheet('subject')}>Print Blank Subject Sheet</button>
 <button type="button" style={btnSecondary} onClick={() => printBlankSheet('all_subjects')}>Print Blank All Subjects</button>
 <button type="button" style={btnSecondary} onClick={() => printBlankSheet('all')}>Print Blank All Assessments</button>
 <button style={btnPrimary} onClick={saveMarks} disabled={saving || !students.length}>
 <Save size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
 {saving ? 'Saving...' : 'Save All Marks'}
 </button>
 </div>
 </div>

 <div className="super-module-card" style={{ ...card, display: 'grid', gap: 18 }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
 <div>
 <label style={labelStyle}>Exam Type</label>
 <select style={select} value={selectedExamType} onChange={e => changeExamType(e.target.value)}>
 <option value="">Select exam type</option>
 {examTypes.map(type => <option key={type} value={type}>{type}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Class</label>
 <select style={select} value={selectedClass} onChange={e => changeClass(e.target.value)}>
 <option value="">Select class</option>
 {classNames.map(cls => <option key={normalizeClass(cls)} value={normalizeClass(cls)}>{cls}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Subject</label>
 <select style={select} value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setStudents([]); setMarks({}) }}>
 <option value="">Select subject</option>
 {(selectedClass ? subjectsForClass(classLabel(selectedClass)) : []).map(subject => <option key={subject} value={subject}>{subject}</option>)}
 </select>
 </div>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, alignItems: 'end' }}>
 <div>
 <label style={labelStyle}>Total Marks</label>
 <input type="number" min="1" style={input} value={totalMarks} onChange={e => setTotalMarks(e.target.value)} />
 </div>
 <div>
 <label style={labelStyle}>Passing Marks</label>
 <input type="number" min="0" style={input} value={passMarks} onChange={e => setPassMarks(e.target.value)} />
 </div>
 <button type="button" onClick={searchStudents} disabled={loadingData} style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center', minHeight: 46 }}>
 <Search size={17} />
 {loadingData ? 'Searching...' : 'Search Students'}
 </button>
 </div>

 {selectedExam && (
 <div style={{ color: C.muted, fontSize: 13 }}>
 Using exam: <strong style={{ color: C.silver }}>{selectedExam.name}</strong> · {classLabel(normalizeClass(selectedExam.class))} · {selectedExam.session || '2026-2027'}
 </div>
 )}
 </div>

 {message && <div className="super-module-card" style={{ ...card, borderColor: message.includes('failed') || message.includes('could not') || message.includes('Please') ? C.red : C.green, color: message.includes('failed') || message.includes('could not') || message.includes('Please') ? C.red : C.green }}>{message}</div>}

 <div className="super-module-card" style={{ ...card, overflowX: 'auto' }}>
 {students.length === 0 ? (
 <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
 Select exam type, class, and subject, then click Search Students.
 </div>
 ) : (
 <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 <th style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 12 }}>Student</th>
 <th style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 12 }}>GR No</th>
 <th style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 12 }}>Father Name</th>
 <th style={{ padding: '14px 16px', textAlign: 'center', color: C.muted, fontSize: 12 }}>{selectedSubject} Marks</th>
 </tr>
 </thead>
 <tbody>
 {students.map((student, i) => (
 <tr key={student.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding: '14px 16px', color: C.gold, fontWeight: 800 }}>{student.name}</td>
 <td style={{ padding: '14px 16px' }}>{student.gr_number || '-'}</td>
 <td style={{ padding: '14px 16px' }}>{student.father_name || '-'}</td>
 <td style={{ padding: '10px 12px', textAlign: 'center' }}>
 <input
 type="number"
 min="0"
 max={Number(totalMarks) || 100}
 value={marks[student.id] ?? ''}
 onChange={e => updateMark(student.id, e.target.value)}
 onFocus={e => e.target.select()}
 style={{ ...input, width: 110, margin: '0 auto', textAlign: 'center' }}
 />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </div>
 </div>
 )
}

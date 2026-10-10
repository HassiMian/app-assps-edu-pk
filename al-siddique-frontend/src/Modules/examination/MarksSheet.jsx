import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Save, Search } from 'lucide-react'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from '../moduleStyles'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import { useAcademicStore } from '../../services/useAcademicStore'
import {
 normalizeMarksClass, normalizeMarksExam, matchesMarksExam, pickMarksExam,
 marksEntryClasses, filterMarksStudents, validateMarksBatch
} from './marksEntryModel'

const FALLBACK_EXAM_TYPES = ['Term Exam', 'Assessment', 'Quiz', 'Annual Exam', 'Monthly Test']

function classLabel(value) {
 return value ? `Class ${value}` : 'Select class'
}

const normalizeClass = normalizeMarksClass
const typeLabel = value => value === 'TE' ? 'Term Exam' : value === 'AS' ? 'Assessment' : String(value || '')

export default function MarksSheet() {
 const { classNames, subjectsForClass } = useAcademicStore()
 const { paperSettings } = usePaperStore()
 const [exams, setExams] = useState([])
 const [students, setStudents] = useState([])
 const [selectedExamType, setSelectedExamType] = useState('')
 const [selectedClass, setSelectedClass] = useState('')
 const [selectedSubject, setSelectedSubject] = useState('')
 const [selectedExamId, setSelectedExamId] = useState('')
 const [totalMarks, setTotalMarks] = useState('')
 const [passMarks, setPassMarks] = useState('')
 const [marks, setMarks] = useState({})
 const [editedMarks, setEditedMarks] = useState({})
 const [saving, setSaving] = useState(false)
 const [loadingData, setLoadingData] = useState(false)
 const [refreshing, setRefreshing] = useState(false)
 const [message, setMessage] = useState('')
 const [marksLoaded, setMarksLoaded] = useState(false)
 const examFetchSeq = useRef(0)
 const rosterFetchSeq = useRef(0)
 const marksEditRevision = useRef(0)

 const loadExams = async () => {
 const request = ++examFetchSeq.current
 setRefreshing(true)
 try {
 const res = await api.get('/api/exams')
 if (!Array.isArray(res.data?.data)) throw new Error('Exam catalog did not return a valid list.')
 const list = res.data.data.map(normalizeMarksExam)
 if (request !== examFetchSeq.current) return false
 setExams(list)
 const preferred = list.find(e => /\bfirst\s+term\b/i.test(e.name || '')) || list[0]
 setSelectedExamType(old => old && list.some(e=>e.type===old) ? old : (preferred?.type || ''))
 setSelectedExamId(old => list.some(e=>String(e.id)===old) ? old : (preferred ? String(preferred.id) : ''))
 return true
 } catch (err) {
 if (request === examFetchSeq.current)
 setMessage(err?.response?.data?.message || err?.message || 'Cannot load exams. Existing data preserved.')
 return false
 } finally {
 if (request === examFetchSeq.current) setRefreshing(false)
 }
 }

 useEffect(() => {
 let active = true
 queueMicrotask(() => { if (active) void loadExams() })
 return () => { active = false; examFetchSeq.current += 1; rosterFetchSeq.current += 1 }
 }, [])

 const examTypes = Array.from(new Set([...exams.map(exam=>exam.type).filter(Boolean),...FALLBACK_EXAM_TYPES]))
 const classes = marksEntryClasses(classNames, exams)
 const matchingExams = exams.filter(exam => matchesMarksExam(exam,selectedExamType,selectedClass))
 const selectedExam = matchingExams.find(exam => String(exam.id) === selectedExamId) || null

 const resetRoster = () => {
 rosterFetchSeq.current += 1
 marksEditRevision.current += 1
 setStudents([])
 setMarks({})
 setEditedMarks({})
 setMarksLoaded(false)
 setMessage('')
 }
 const syncExamDefaults = nextExam => {
 resetRoster()
 setSelectedExamId(nextExam ? String(nextExam.id) : '')
 setTotalMarks(nextExam?.total_marks ?? '')
 setPassMarks(nextExam?.pass_marks ?? '')
 }
 const changeExamType = value => {
 setSelectedExamType(value)
 syncExamDefaults(pickMarksExam(exams,value,selectedClass))
 }
 const changeClass = value => {
 setSelectedClass(value)
 setSelectedSubject('')
 syncExamDefaults(pickMarksExam(exams,selectedExamType,value))
 }
 const changeSavedExam = value => {
 syncExamDefaults(matchingExams.find(e=>String(e.id)===value))
 }

 const refreshData = async () => {
 const refreshed = await loadExams()
 if (refreshed) resetRoster()
 }

 const loadRoster = async canonicalClass => {
 // Tenant/teacher restrictions remain enforced by the backend on BOTH requests.
 const response = await api.get('/api/students', { params: { class: canonicalClass } })
 if (!Array.isArray(response.data?.data)) throw new Error('Student roster response was invalid.')
 let list = filterMarksStudents(response.data.data,canonicalClass)
 if (!list.length) {
 // The legacy database can hold 'Class One' alongside 'One'. Backend
 // equality on the filtered request misses those rows. Search only within
 // the SAME authenticated tenant/teacher-scoped API, never another tenant.
 const fallback = await api.get('/api/students')
 if (!Array.isArray(fallback.data?.data)) throw new Error('Student roster fallback response was invalid.')
 list = filterMarksStudents(fallback.data.data,canonicalClass)
 }
 return list
 }

 const searchStudents = async () => {
 if (!selectedExam || !selectedClass || !selectedSubject) {
 setMessage('Select a saved exam, class, and subject before searching students.')
 return
 }
 const request = ++rosterFetchSeq.current
 setLoadingData(true)
 setMessage('')
 setMarksLoaded(false)
 try {
 const studentsForClass = await loadRoster(selectedClass)
 if (request !== rosterFetchSeq.current) return
 setStudents(studentsForClass)
 if (!studentsForClass.length) {
 setMarks({})
 setMessage(`No authorized registered students found in Class ${selectedClass}. Check Admissions, academic class labels, or teacher class assignments.`)
 return
 }
 // Do not discard a valid roster if a separate results query fails.
 try {
 const result = await api.get(`/api/exams/results/${selectedExam.id}`)
 if (request !== rosterFetchSeq.current) return
 if (!Array.isArray(result.data?.data)) throw new Error('Saved marks response was invalid.')
 const allowed = new Set(studentsForClass.map(student=>String(student.id)))
 const loaded = {}
 for (const row of result.data.data) {
 if (String(row.subject).trim() === selectedSubject && allowed.has(String(row.student_id)))
 loaded[row.student_id] = row.marks_obtained
 }
 setMarks(loaded)
 setEditedMarks({})
 setMarksLoaded(true)
 setTotalMarks(selectedExam.total_marks ?? '')
 setPassMarks(selectedExam.pass_marks ?? '')
 setMessage(`Loaded ${studentsForClass.length} students for ${selectedExam.name || 'saved exam'}. Existing entered marks were restored.`)
 } catch (err) {
 if (request !== rosterFetchSeq.current) return
 setMarks({})
 setMessage(`Students loaded, but saved marks could not be verified: ${err.response?.data?.message || err.message}. Saving is disabled until you search again.`)
 }
 } catch (err) {
 if (request !== rosterFetchSeq.current) return
 setMessage(`Student search failed: ${err.response?.data?.message || err.message || 'Server unavailable'}`)
 } finally {
 if (request === rosterFetchSeq.current) setLoadingData(false)
 }
 }

 const updateMark = (studentId, value) => {
    marksEditRevision.current += 1
    setMessage('')
    const cleaned = typeof value === 'string' ? value.replace(/^0+(?=\d)/, '') : value
    setMarks(prev => ({ ...prev, [studentId]: cleaned }))
    setEditedMarks(prev => ({ ...prev, [studentId]: cleaned }))
  }

 const saveMarks = async () => {
 if (saving) return
 if (!marksLoaded) {
 setMessage('Load the student roster and existing marks before saving.')
 return
 }
 const {error,rows} = validateMarksBatch({
 exam:selectedExam, selectedClass, students, subject:selectedSubject, marks:editedMarks, totalMarks, passMarks
 })
 if (error) {setMessage(error);return}
 const submittedRevision=marksEditRevision.current
 const submittedScope=rosterFetchSeq.current
 setSaving(true)
 setMessage('')
 try {
 const response = await api.post('/api/exams/results', {results:rows})
 if (response.data?.success !== true || Number(response.data?.savedCount) !== rows.length)
 throw new Error('Save acknowledgement did not match the submitted marks. Refresh before retrying.')
 if (submittedScope === rosterFetchSeq.current) {
 if (submittedRevision === marksEditRevision.current) {
 setEditedMarks({})
 setMessage(`Saved ${rows.length} edited student mark${rows.length===1?'':'s'} in ${selectedExam.name}. Other marks were left unchanged.`)
 } else setMessage('Earlier edits saved; newer unsaved changes remain in the editor.')
 }
 } catch (err) {
 if (submittedScope === rosterFetchSeq.current)
 setMessage(err.response?.data?.message || err.message || 'Failed to save marks. Existing records have not been cleared.')
 } finally {
 setSaving(false)
 }
 }

 const fetchClassStudents = async () => {
 if (students.length) return students
 if (!selectedClass) return []
 try { return await loadRoster(selectedClass) }
 catch { return [] }
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
 .bar.no-print{background:#256FE8;color:white;padding:12px 18px;display:flex;gap:12px;align-items:center}.bar button{margin-left:auto;background:#C8991A;border:0;border-radius:8px;padding:9px 18px;font-weight:800;cursor:pointer}
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
 <div style={{ minHeight: '100%', background: 'var(--apex-shell-gradient)', color: 'var(--apex-text-primary)', padding: 24 }}>
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
 <button style={btnPrimary} onClick={saveMarks} disabled={saving || !marksLoaded || !selectedExam || !students.length}>
 <Save size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
 {saving ? 'Saving...' : 'Save All Marks'}
 </button>
 </div>
 </div>

 <div className="super-module-card" style={{ ...card, display: 'grid', gap: 18 }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
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
 {classes.map(cls => <option key={cls} value={cls}>{classLabel(cls)}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Saved Exam / Term</label>
 <select name="savedExam" style={select} value={selectedExamId} onChange={e => changeSavedExam(e.target.value)}>
 <option value="">Select an existing exam</option>
 {matchingExams.map(ex => (
 <option key={ex.id} value={ex.id}>{ex.name} · {ex.session || 'Session not set'} · {ex.class || 'All Classes'}</option>
 ))}
 </select>
 {!matchingExams.length && <div style={{ color:C.red, fontSize:12, marginTop:5 }}>
 No saved exam matches this class/type. Create or verify the First Term Exam in Manage Exams; marks entry will not create duplicates.
 </div>}
 </div>
 <div>
 <label style={labelStyle}>Subject</label>
 <select style={select} value={selectedSubject} onChange={e => { resetRoster(); setSelectedSubject(e.target.value) }}>
 <option value="">Select subject</option>
 {(selectedClass ? subjectsForClass(selectedClass) : []).map(subject => <option key={subject} value={subject}>{subject}</option>)}
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
 <button type="button" onClick={searchStudents} disabled={loadingData || !selectedExam || !selectedClass || !selectedSubject} style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center', minHeight: 46 }}>
 <Search size={17} />
 {loadingData ? 'Searching...' : 'Search Students'}
 </button>
 </div>

 {selectedExam && (
 <div style={{ color: C.muted, fontSize: 13 }}>
 Using exam: <strong style={{ color: C.silver }}>{selectedExam.name}</strong> · {classLabel(normalizeClass(selectedExam.class))} · {selectedExam.session || 'Session not set'}
 </div>
 )}
 </div>

 {message && <div className="super-module-card" style={{ ...card, borderColor: message.includes('failed') || message.includes('could not') || message.includes('Please') ? C.red : C.green, color: message.includes('failed') || message.includes('could not') || message.includes('Please') ? C.red : C.green }}>{message}</div>}

 <div className="super-module-card" style={{ ...card, overflowX: 'auto' }}>
 {students.length === 0 ? (
 <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
 Select the saved First Term Exam, class and subject, then click Search Students. Blank marks will not be saved as zero.
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
 <tr key={student.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--apex-bg-subtle)' }}>
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

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, RefreshCw, Save, Search } from 'lucide-react'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from '../moduleStyles'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import { isOfficialFirstTermExam, requiredFirstTermPassMarks } from './firstTermMarksPolicy'

const CLASS_ORDER = ['Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Hifaz Class']

function examTypeLabel(value) {
  if (value === 'TE') return 'Term Exam'
  if (value === 'AS') return 'Assessment'
  if (value === 'monthly') return 'Monthly Test'
  if (value === 'weekly') return 'Quiz / Weekly'
  return value || 'Exam'
}

function sortClasses(items = []) {
  return [...items].sort((a, b) => {
    const ai = CLASS_ORDER.indexOf(a)
    const bi = CLASS_ORDER.indexOf(b)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.localeCompare(b)
  })
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

export default function MarksSheet() {
  const { paperSettings } = usePaperStore()
  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState('')
  const [setup, setSetup] = useState({ enrollments: [], subjects: [], exam: null })
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState({})
  const [totalMarks, setTotalMarks] = useState('')
  const [passMarks, setPassMarks] = useState('')
  const [passingPercent, setPassingPercent] = useState('33')
  const [loadingSetup, setLoadingSetup] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState('info')

  const selectedExam = exams.find(exam => String(exam.id) === String(selectedExamId)) || setup.exam || null

  const classes = useMemo(() => sortClasses([
    ...new Set((setup.enrollments || []).map(row => String(row.class_name || '').trim()).filter(Boolean))
  ]), [setup.enrollments])

  const sections = useMemo(() => [
    ...new Set((setup.enrollments || [])
      .filter(row => row.class_name === selectedClass)
      .map(row => String(row.section || '').trim()))
  ].sort((a,b)=>a.localeCompare(b)), [setup.enrollments, selectedClass])

  const scheduledSubjects = useMemo(() =>
    (setup.subjects || [])
      .filter(row => row.class_name === selectedClass && String(row.section || '').trim() === selectedSection)
      .sort((a,b) => String(a.exam_date || '').localeCompare(String(b.exam_date || '')) || Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    [setup.subjects, selectedClass, selectedSection]
  )

  const selectedSubject = scheduledSubjects.find(row => String(row.id) === String(selectedSubjectId)) || null
  const firstTermPolicy = isOfficialFirstTermExam(selectedExam)
  const validPassingPercent = String(passingPercent).trim() !== ''
    && Number.isFinite(Number(passingPercent)) && Number(passingPercent) >= 1 && Number(passingPercent) <= 100
    && Math.round(Number(passingPercent) * 100) / 100 === Number(passingPercent)
  const requiredPassMarks = firstTermPolicy && validPassingPercent
    ? requiredFirstTermPassMarks(totalMarks, passingPercent) : null
  const effectivePassMarks = firstTermPolicy ? (requiredPassMarks ?? '') : passMarks
  const passSchemeMismatch = firstTermPolicy && selectedSubject?.pass_marks != null
    && requiredPassMarks !== null
    && (Number(selectedSubject.pass_marks) !== requiredPassMarks
      || (selectedSubject.pass_percentage != null
        && Number(selectedSubject.pass_percentage) !== Number(passingPercent)))
  const enteredCount = students.filter(student => marks[student.id] !== undefined && marks[student.id] !== '').length

  function setStatus(text, kind = 'info') {
    setMessage(text)
    setMessageKind(kind)
  }

  async function loadExams({ preserve = true } = {}) {
    setRefreshing(true)
    try {
      const response = await api.get('/api/exams')
      const list = Array.isArray(response.data?.data) ? response.data.data : []
      setExams(list)
      const existing = preserve ? selectedExamId : ''
      const preferred = list.find(exam => String(exam.id) === String(existing))
        || list.find(exam => String(exam.name || '').toLowerCase() === 'first term exam' && exam.session === '2026-2027')
        || list[0]
      setSelectedExamId(preferred ? String(preferred.id) : '')
      if (!preferred) setStatus('No exam is available. Create or synchronize an exam in Manage Exams first.', 'error')
    } catch (error) {
      setExams([])
      setSelectedExamId('')
      setStatus(error.response?.data?.message || 'Could not load exams.', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadExams({ preserve:false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedExamId) {
      setSetup({ enrollments:[], subjects:[], exam:null })
      setStudents([])
      setMarks({})
      return
    }
    let cancelled = false
    async function loadSetup() {
      setLoadingSetup(true)
      setStudents([])
      setMarks({})
      try {
        const response = await api.get(`/api/exams/${selectedExamId}/setup`)
        if (cancelled) return
        const data = response.data?.data || { enrollments:[], subjects:[], exam:null }
        setSetup(data)
        const nextClasses = sortClasses([...new Set((data.enrollments || []).map(row => row.class_name).filter(Boolean))])
        const nextClass = nextClasses[0] || ''
        const nextSections = [...new Set((data.enrollments || []).filter(row => row.class_name === nextClass).map(row => String(row.section || '').trim()))]
        setSelectedClass(nextClass)
        setSelectedSection(nextSections[0] || '')
        setSelectedSubjectId('')
        if (!nextClasses.length) {
          setStatus('This exam is not wired to class sections yet. Open Manage Exams and synchronize the official First Term setup.', 'error')
        } else {
          setStatus('', 'info')
        }
      } catch (error) {
        if (cancelled) return
        setSetup({ enrollments:[], subjects:[], exam:null })
        setSelectedClass('')
        setSelectedSection('')
        setSelectedSubjectId('')
        setStatus(error.response?.data?.message || 'Could not load exam setup.', 'error')
      } finally {
        if (!cancelled) setLoadingSetup(false)
      }
    }
    void loadSetup()
    return () => { cancelled = true }
  }, [selectedExamId])

  useEffect(() => {
    if (!selectedClass) {
      setSelectedSection('')
      return
    }
    if (!sections.includes(selectedSection)) {
      setSelectedSection(sections[0] || '')
    }
    setStudents([])
    setMarks({})
  }, [selectedClass, sections, selectedSection])

  useEffect(() => {
    if (!scheduledSubjects.length) {
      setSelectedSubjectId('')
      setStudents([])
      setMarks({})
      return
    }
    const current = scheduledSubjects.find(row => String(row.id) === String(selectedSubjectId))
    const next = current || scheduledSubjects[0]
    setSelectedSubjectId(String(next.id))
    setTotalMarks(next.total_marks == null ? '' : String(next.total_marks))
    setPassMarks(next.pass_marks == null ? '' : String(next.pass_marks))
    setPassingPercent(next.pass_percentage == null ? '33' : String(next.pass_percentage))
    setStudents([])
    setMarks({})
  }, [scheduledSubjects, selectedSubjectId])

  useEffect(() => {
    if (!selectedSubject) return
    setTotalMarks(selectedSubject.total_marks == null ? '' : String(selectedSubject.total_marks))
    setPassMarks(selectedSubject.pass_marks == null ? '' : String(selectedSubject.pass_marks))
    setPassingPercent(selectedSubject.pass_percentage == null ? '33' : String(selectedSubject.pass_percentage))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId])

  async function loadRoster({ quiet = false } = {}) {
    if (!selectedExamId || !selectedClass || selectedSection === undefined || !selectedSubject) {
      if (!quiet) setStatus('Select exam, class, section and scheduled subject first.', 'error')
      return
    }
    setLoadingStudents(true)
    if (!quiet) setStatus('', 'info')
    try {
      const [studentResponse, resultResponse] = await Promise.all([
        api.get(`/api/exams/${selectedExamId}/roster`, { params:{ class:selectedClass, section:selectedSection } }),
        api.get(`/api/exams/results/${selectedExamId}`),
      ])
      const roster = Array.isArray(studentResponse.data?.data) ? studentResponse.data.data : []
      const savedRows = Array.isArray(resultResponse.data?.data) ? resultResponse.data.data : []
      const loadedMarks = {}
      savedRows.forEach(row => {
        if (String(row.subject || '').toLowerCase() === String(selectedSubject.subject || '').toLowerCase()) {
          loadedMarks[row.student_id] = String(row.marks_obtained ?? '')
        }
      })
      setStudents(roster)
      setMarks(loadedMarks)
      if (!roster.length) {
        setStatus(`No active students are registered in ${selectedClass}${selectedSection ? ' - ' + selectedSection : ''}.`, 'error')
      } else if (quiet) {
        setStatus('', 'info')
      } else {
        setStatus(`${roster.length} active student(s) loaded. ${Object.keys(loadedMarks).length} saved mark(s) restored.`, 'success')
      }
    } catch (error) {
      setStudents([])
      setMarks({})
      setStatus(error.response?.data?.message || 'Students could not be loaded for this exam.', 'error')
    } finally {
      setLoadingStudents(false)
    }
  }

  useEffect(() => {
    if (selectedExamId && selectedClass && selectedSubject) {
      void loadRoster({ quiet:true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamId, selectedClass, selectedSection, selectedSubjectId])

  function updateMark(studentId, value) {
    if (value === '') {
      setMarks(prev => ({ ...prev, [studentId]: '' }))
      return
    }
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return
    setMarks(prev => ({ ...prev, [studentId]: value }))
  }

  async function saveMarks() {
    if (!selectedExamId || !selectedClass || !selectedSubject || !students.length) {
      return setStatus('Load the selected class roster before saving marks.', 'error')
    }
    const total = Number(totalMarks)
    const pass = Number(effectivePassMarks)
    if (firstTermPolicy && !validPassingPercent) {
      return setStatus('Choose a passing percentage between 1 and 100 (up to 2 decimal places). Default is 33%.', 'error')
    }
    if (String(totalMarks).trim() === '' || !Number.isFinite(total) || total <= 0) {
      return setStatus('Set the actual total marks from this scheduled paper before saving.', 'error')
    }
    if (String(effectivePassMarks).trim() === '' || !Number.isFinite(pass) || pass < 0 || pass > total) {
      return setStatus('Set valid passing marks for the actual paper total before saving.', 'error')
    }
    if (passSchemeMismatch) {
      return setStatus('Saved marks scheme conflicts with the selected passing percentage. Contact the examination administrator before saving.', 'error')
    }

    const rows = []
    for (const student of students) {
      const raw = marks[student.id]
      if (raw === undefined || raw === '') continue
      const obtained = Number(raw)
      if (!Number.isFinite(obtained) || obtained < 0 || obtained > total) {
        return setStatus(`Invalid marks for ${student.name}. Enter a value from 0 to ${total}.`, 'error')
      }
      rows.push({
        exam_id: Number(selectedExamId),
        student_id: student.id,
        subject: selectedSubject.subject,
        marks_obtained: obtained,
        total_marks: total,
        pass_marks: pass,
        ...(firstTermPolicy ? { pass_percentage: Number(passingPercent) } : {}),
      })
    }
    if (!rows.length) return setStatus('Enter at least one student mark before saving.', 'error')

    setSaving(true)
    setStatus('', 'info')
    try {
      await api.post('/api/exams/results', { results:rows })
      const verifyResponse = await api.get(`/api/exams/results/${selectedExamId}`)
      const verifyRows = (verifyResponse.data?.data || []).filter(row =>
        String(row.subject || '').toLowerCase() === String(selectedSubject.subject || '').toLowerCase()
      )
      const byStudent = new Map(verifyRows.map(row => [String(row.student_id), Number(row.marks_obtained)]))
      const verified = rows.every(row => byStudent.has(String(row.student_id)) && byStudent.get(String(row.student_id)) === Number(row.marks_obtained))
      if (!verified) {
        setStatus('Server responded, but marks verification did not match. Do not continue to result cards until this is resolved.', 'error')
        return
      }
      setSetup(prev => ({
        ...prev,
        subjects: prev.subjects.map(row => String(row.id) === String(selectedSubject.id)
          ? { ...row, total_marks:total, pass_marks:pass, ...(firstTermPolicy ? { pass_percentage:Number(passingPercent) } : {}) }
          : row)
      }))
      setStatus(`Saved and verified marks for ${rows.length} student(s).`, 'success')
    } catch (error) {
      setStatus(error.response?.data?.message || 'Failed to save marks.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function printBlankSheet(allSubjects = false) {
    if (!students.length) await loadRoster()
    const roster = students
    if (!roster.length) return setStatus('Load students before printing a blank marks sheet.', 'error')
    const columns = allSubjects ? scheduledSubjects : [selectedSubject].filter(Boolean)
    if (!columns.length) return setStatus('No scheduled subjects found for this class/section.', 'error')

    const schoolName = (paperSettings.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL').toUpperCase()
    const address = paperSettings.address || ''
    const phone = paperSettings.phone || ''
    const headerCells = columns.map(row => `<th>${row.subject}<br><small>${formatDate(row.exam_date)}</small></th>`).join('')
    const rowsHtml = roster.map((student,index) => `<tr><td>${index+1}</td><td>${student.name}</td><td>${student.gr_number || '-'}</td><td>${student.father_name || '-'}</td>${columns.map(()=>'<td></td>').join('')}</tr>`).join('')
    const win = window.open('', '_blank', 'width=1100,height=780')
    if (!win) return
    win.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>Blank Marks Sheet</title><style>
      @page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#111;margin:0}.head{text-align:center;margin-bottom:14px}.head h1{font-size:20px;margin:0}.sub{font-size:11px;margin-top:4px}.meta{margin-top:8px;font-weight:700;font-size:13px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #333;padding:6px}th{background:#eee}td{height:26px}small{font-weight:400}</style></head><body>
      <div class="head"><h1>${schoolName}</h1><div class="sub">${address}${phone ? ' | '+phone : ''}</div><div class="meta">${selectedExam?.name || 'Exam'} · ${selectedClass}${selectedSection ? ' - '+selectedSection : ''}</div></div>
      <table><thead><tr><th>#</th><th>Student</th><th>GR No</th><th>Father Name</th>${headerCells}</tr></thead><tbody>${rowsHtml}</tbody></table>
      </body></html>`)
    win.document.close()
  }

  const messageColor = messageKind === 'error' ? C.red : messageKind === 'success' ? C.green : C.muted

  return (
    <div style={{ minHeight:'100%', background:'#071e34', color:C.silver, padding:24 }}>
      <div style={{ maxWidth:1240, margin:'0 auto', display:'grid', gap:20 }}>
        <div className="super-module-card" style={{ ...card, display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:16, alignItems:'center' }}>
          <div>
            <h1 style={sectionHeader}>Marks Entry</h1>
            <p style={{ color:C.muted, marginTop:8 }}>One workflow: exam → actual class/section → scheduled date-sheet subject → students → verified marks.</p>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <button type="button" style={btnSecondary} onClick={()=>loadExams()} disabled={refreshing}>
              <RefreshCw size={16} style={{ marginRight:7, verticalAlign:'middle' }} /> {refreshing ? 'Refreshing...' : 'Refresh Exams'}
            </button>
            <button type="button" style={btnSecondary} onClick={()=>printBlankSheet(false)} disabled={!selectedSubject}>Print Subject Sheet</button>
            <button type="button" style={btnSecondary} onClick={()=>printBlankSheet(true)} disabled={!scheduledSubjects.length}>Print Class Sheet</button>
            <button type="button" style={btnPrimary} onClick={saveMarks} disabled={saving || !students.length || !selectedSubject}>
              <Save size={16} style={{ marginRight:7, verticalAlign:'middle' }} /> {saving ? 'Saving & Verifying...' : 'Save All Marks'}
            </button>
          </div>
        </div>

        <div className="super-module-card" style={{ ...card, display:'grid', gap:18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:14 }}>
            <div>
              <label style={labelStyle}>1. Exam / Term</label>
              <select style={select} value={selectedExamId} onChange={e=>setSelectedExamId(e.target.value)} disabled={refreshing}>
                <option value="">Select exam</option>
                {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.name} · {exam.session || ''} · {examTypeLabel(exam.type)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>2. Class</label>
              <select style={select} value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} disabled={!classes.length || loadingSetup}>
                <option value="">Select class</option>
                {classes.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>3. Section</label>
              <select style={select} value={selectedSection} onChange={e=>setSelectedSection(e.target.value)} disabled={!selectedClass || !sections.length}>
                {sections.map(value => <option key={value || '__none'} value={value}>{value || 'No Section'}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>4. Scheduled Subject</label>
              <select style={select} value={selectedSubjectId} onChange={e=>{setSelectedSubjectId(e.target.value);setStudents([]);setMarks({})}} disabled={!scheduledSubjects.length}>
                <option value="">Select subject</option>
                {scheduledSubjects.map(row => <option key={row.id} value={row.id}>{row.subject} · {formatDate(row.exam_date)}</option>)}
              </select>
            </div>
          </div>

          {selectedSubject && (
            <div style={{ display:'grid', gridTemplateColumns:firstTermPolicy ? '1.4fr repeat(3,minmax(125px,0.45fr)) auto' : '1.4fr repeat(2,minmax(150px,0.45fr)) auto', gap:14, alignItems:'end' }}>
              <div style={{ padding:'10px 12px', borderRadius:12, background:'rgba(10,132,255,0.07)', border:'1px solid rgba(10,132,255,0.17)' }}>
                <div style={{ color:C.muted, fontSize:10, fontWeight:800 }}>DATE SHEET PAPER</div>
                <div style={{ color:C.silver, fontWeight:800, marginTop:3, display:'flex', alignItems:'center', gap:7 }}>
                  <CalendarDays size={15} color={C.gold} /> {selectedSubject.subject} · {formatDate(selectedSubject.exam_date)} · {selectedSubject.paper_time || 'Time not set'}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Total Marks</label>
                <input type="number" min="1" placeholder="Actual paper total" aria-label="Total Marks" style={input} value={totalMarks} disabled={selectedSubject.total_marks !== null && selectedSubject.total_marks !== undefined} onChange={e=>setTotalMarks(e.target.value)} />
              </div>
              {firstTermPolicy && <div>
                <label style={labelStyle}>Passing Percentage (default 33%)</label>
                <input type="number" min="1" max="100" step="0.01" aria-label="Passing Percentage" style={input}
                  value={passingPercent}
                  disabled={selectedSubject.total_marks != null || selectedSubject.pass_marks != null || selectedSubject.pass_percentage != null}
                  onChange={e=>setPassingPercent(e.target.value)} />
              </div>}
              <div>
                <label style={labelStyle}>{firstTermPolicy ? 'Calculated Passing Marks (rounded up)' : 'Passing Marks'}</label>
                <input type="number" min="0" max={Number(totalMarks)>0 ? Number(totalMarks) : undefined} placeholder={firstTermPolicy ? 'Calculated from actual paper total' : 'Required passing marks'} aria-label="Passing Marks" style={input} value={effectivePassMarks} disabled={firstTermPolicy || (selectedSubject.pass_marks !== null && selectedSubject.pass_marks !== undefined)} onChange={e=>setPassMarks(e.target.value)} />
              </div>
              <button type="button" onClick={()=>loadRoster()} disabled={loadingStudents} style={{ ...btnPrimary, minHeight:46, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Search size={16} /> {loadingStudents ? 'Loading...' : 'Refresh Students'}
              </button>
            </div>
          )}

          {selectedSubject && (selectedSubject.total_marks == null || selectedSubject.pass_marks == null) && (
            <div role="status" style={{ color:C.gold, fontSize:12, lineHeight:1.6 }}>
              Paper marks are not configured. Enter the actual Total Marks from the printed paper. {firstTermPolicy ? 'Choose the passing percentage (33% by default); passing marks are calculated automatically and rounded up for Written, Oral and Quran/Nazra alike.' : 'Enter the approved passing marks.'} The first verified save locks this subject's marks scheme; a generic 100/33 is never assumed.
            </div>
          )}
          {passSchemeMismatch && <div role="alert" style={{ color:C.red, fontSize:12 }}>Saved passing marks/percentage conflict with the selected scheme. Entry is blocked pending examination administrator review.</div>}
          {selectedSubject?.total_marks !== null && selectedSubject?.total_marks !== undefined && (
            <div style={{ color:C.muted, fontSize:11 }}>Grading is locked for this scheduled subject after the first successful marks save: {selectedSubject.total_marks} total / {selectedSubject.pass_marks ?? 'unconfigured'} pass{firstTermPolicy ? ` · ${selectedSubject.pass_percentage ?? 33}%` : ''}.</div>
          )}
        </div>

        {message && <div className="super-module-card" style={{ ...card, color:messageColor, borderColor:messageColor, display:'flex', gap:9, alignItems:'center' }}>
          {messageKind === 'success' && <CheckCircle2 size={18} />} {message}
        </div>}

        <div className="super-module-card" style={{ ...card, overflowX:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:12 }}>
            <div>
              <div style={{ color:C.gold, fontSize:14, fontWeight:900 }}>Student Marks Sheet</div>
              <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>
                {students.length ? `${students.length} active students · ${enteredCount} marks entered` : 'Choose a scheduled subject to load the real roster.'}
              </div>
            </div>
            {selectedExam && <div style={{ color:C.muted, fontSize:11, textAlign:'right' }}>{selectedExam.name}<br/>{selectedClass}{selectedSection ? ' · '+selectedSection : ''}</div>}
          </div>

          {!students.length ? (
            <div style={{ padding:42, textAlign:'center', color:C.muted }}>
              {loadingStudents ? 'Loading students...' : loadingSetup ? 'Loading exam setup...' : 'No roster loaded for the current selection.'}
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
              <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {['#','Student','GR No','Father Name', selectedSubject?.subject ? `${selectedSubject.subject} Marks` : 'Marks'].map(label =>
                  <th key={label} style={{ padding:'12px 14px', textAlign:label.includes('Marks')?'center':'left', color:C.muted, fontSize:11, textTransform:'uppercase' }}>{label}</th>
                )}
              </tr></thead>
              <tbody>
                {students.map((student,index) => {
                  const value = marks[student.id] ?? ''
                  const invalid = value !== '' && (Number(value) < 0 || Number(value) > Number(totalMarks))
                  return <tr key={student.id} style={{ background:index%2 ? 'rgba(11,44,77,0.20)' : 'transparent', borderBottom:'1px solid rgba(148,163,184,0.08)' }}>
                    <td style={{ padding:'11px 14px', color:C.muted }}>{index+1}</td>
                    <td style={{ padding:'11px 14px', color:C.gold, fontWeight:800 }}>{student.name}</td>
                    <td style={{ padding:'11px 14px' }}>{student.gr_number || '-'}</td>
                    <td style={{ padding:'11px 14px' }}>{student.father_name || '-'}</td>
                    <td style={{ padding:'8px 12px', textAlign:'center' }}>
                      <input type="number" min="0" max={Number(totalMarks)>0 ? Number(totalMarks) : undefined} step="0.01"
                        aria-label={`Marks for ${student.name}`}
                        value={value}
                        disabled={String(totalMarks).trim() === '' || String(effectivePassMarks).trim() === '' || passSchemeMismatch}
                        onChange={e=>updateMark(student.id,e.target.value)}
                        onFocus={e=>e.target.select()}
                        style={{ ...input, width:118, margin:'0 auto', textAlign:'center', borderColor:invalid?C.red:undefined }}
                      />
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

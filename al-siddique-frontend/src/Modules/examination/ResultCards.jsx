import './premiumResultCardDesigner.css'
import { summarizeResultRows, formatResultCell, meetsResultPassMark } from './resultPreviewIntegrity'
import { getResultLogoDiagnostic } from './resultLogoDiagnostics'
import { summarizePrintBatch } from './resultPrintPlanning'
import { buildResultStudents } from './resultStudentIdentity'
import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import { useAcademicStore } from '../../services/useAcademicStore'
import { sortSchoolClasses, schoolClassOrderKey } from '../../services/schoolClassOrder'
import { C, card, btnPrimary, btnSecondary, select, sectionHeader } from '../moduleStyles'
import {
  ResultCardPreview, ResultCardPrintToolbar, ResultCardTemplateSelector,
} from './premiumResultCardTemplates'
import {DEFAULT_RESULT_OPTIONS, buildResultCardData} from './premiumResultCardData'
import {openResultPrintWindow, resultCardPrintCss} from './premiumResultCardPrint'

function gradeLabel(pct, bands = []) {
  const value = Math.max(0, Math.min(100, Number(pct) || 0))
  const match = (Array.isArray(bands) ? bands : []).find(row => value >= Number(row.from) && value <= Number(row.to))
  return match?.label || '—'
}

const TEACHER_REMARK_PRESETS = [
  'Excellent performance. Keep up the outstanding effort and consistency.',
  'Good progress shown. Continue regular revision and classroom participation.',
  'Satisfactory result. More written practice will help improve confidence.',
  'Needs improvement. Please focus on weak subjects with guided practice.',
  'Irregular preparation affected performance. Regular homework and revision are required.',
]

const FIRST_TERM_EXAM_9_ORDER_KEYS = new Set([
  'starter', 'mover', 'flyer', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'
])
const CANONICAL_STARTER_TO_EIGHT = [
  'Starter', 'Mover', 'Flyer', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'
]

export function isFirstTermExamNine(examObj) {
  if (!examObj) return false
  const idNum = Number(examObj.id)
  return idNum === 9 || (idNum === 9 && /first\s+term/i.test(String(examObj.name || '')))
}

export function isClassAllowedForExam(examObj, className) {
  if (!isFirstTermExamNine(examObj)) return true
  if (!className) return false
  const key = schoolClassOrderKey(className)
  return FIRST_TERM_EXAM_9_ORDER_KEYS.has(key)
}

// Modal Component
export function ProfessionalParametersModal({ cards, student, exam, studentMarks, school, gradeBands, onClose }) {
  const [options, setOptions] = useState(() => ({...DEFAULT_RESULT_OPTIONS, template:'signature-editorial', autoTermColumns:true}))
  const [remarksOpen, setRemarksOpen] = useState(false)
  const previewRef = useRef(null)
  const [scale, setScale] = useState(1)
  const sourceCards = cards?.length ? cards : [{ student, exam, studentMarks }]
  const dataList = sourceCards
    .filter(item => item?.student && item?.exam && item?.studentMarks?.length)
    .map(item => buildResultCardData({ ...item, options: { ...options, gradeBands }, school }))
  const data = dataList[0]
  const batchInfo = summarizePrintBatch(dataList)
  const printBatch = (pdf = false) => {
    if (!dataList.length) { window.alert('No result cards are ready for printing.'); return }
    if (batchInfo.absentLogo) { window.alert(`${batchInfo.absentLogo} result card(s) have no school logo configured. Set the correct logo in SaaS School/Paper Settings before printing.`); return }
    if (batchInfo.missingStudent || batchInfo.missingSubject) { window.alert('A student identity or subject name is missing from the authenticated result records. Verify the saved records before printing.'); return }
    if (batchInfo.unscoredCards) { window.alert(`${batchInfo.unscoredCards} result card(s) have no recorded complete subject marks. Enter actual student marks first; blank worksheets can be printed from Marks Sheet without inventing result grades.`); return }
    if (batchInfo.ungraded) { window.alert(`${batchInfo.ungraded} complete subject result(s) have no matching school grade band. Review the school's approved grade settings before printing.`); return }
    if (data?.options?.template && ['signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier'].includes(data.options.template)) {
      const renderedSchoolLogo = previewRef.current?.querySelector('.result-card-a4 img[data-result-school-logo]')
      if (!renderedSchoolLogo?.complete || !renderedSchoolLogo.naturalWidth) {
        window.alert('The school logo configured in SaaS settings has not loaded. Check the school logo URL and retry. Print was stopped to prevent incorrect result cards.')
        return
      }
    }
    if (batchInfo.pending && !window.confirm(`${batchInfo.pending} subject result(s) are missing or invalid and will display Pending/—. Verify marks before printing ${batchInfo.cards} card(s). Continue?`)) return
    openResultPrintWindow(dataList, pdf)
  }

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
      style={{ position:'fixed', inset:0, background:'var(--apex-bg-overlay)', backdropFilter:'blur(10px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'22px' }}>
      <div className="result-premium-shell" onMouseDown={(e) => e.stopPropagation()}
        style={{ width:'min(1320px, 100%)', maxHeight:'calc(100vh - 44px)', background:'#F6F8FA', border:'1px solid #DFE7EC', borderRadius:18, boxShadow:'0 24px 60px rgba(0,0,0,0.6)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <style>{resultCardPrintCss}</style>
        <div className="result-modal-head no-print" style={{ flexShrink:0 }}>
          <div>
            <h2>Professional Result Card Designer</h2>
            <p>Select template, choose marks columns, preview, then print or save as PDF. {dataList.length > 1 ? `${dataList.length} result cards in preview.` : ''}</p>
          </div>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="result-designer no-print" style={{ flex:1, minHeight:0 }}>
          <aside className="result-options-panel">
            <h3>Templates</h3>
            {getResultLogoDiagnostic(school?.logo) && <p className="result-logo-diagnostic" role="status">{getResultLogoDiagnostic(school?.logo)}</p>}
            <ResultCardTemplateSelector value={options.template} onChange={(template) => setOptions(prev => ({ ...prev, template }))} />
            <h3>Marks & Print Options</h3>
            <p className="result-print-readiness" role="status">{batchInfo.cards} card(s) · {batchInfo.scored} recorded subject(s){batchInfo.pending ? ` · ${batchInfo.pending} pending/invalid` : ''}{batchInfo.absentLogo ? ` · ${batchInfo.absentLogo} missing SaaS school logo` : ''}{batchInfo.ungraded ? ` · ${batchInfo.ungraded} ungraded subject(s)` : ''}{batchInfo.missingStudent || batchInfo.missingSubject ? ' · missing record identity' : ''}</p>
            <ResultCardPrintToolbar
              options={options}
              setOptions={setOptions}
              onPrint={() => printBatch(false)}
              onExportPdf={() => printBatch(true)}
            />
            <div style={{ marginTop:14, border:'1px solid #DCE6EE', borderRadius:11, overflow:'hidden', background:'#F9FBFC' }}>
              <button
                type="button"
                onClick={() => setRemarksOpen(v => !v)}
                style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, padding:'11px 13px', border:'none', background:'transparent', color:'#265D79', cursor:'pointer', fontWeight:900, fontSize:12 }}
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
                        onClick={() => setOptions(prev => ({ ...prev, includeTeacherRemarks:true, teacherRemarks:text, teacherRemarksEdited:true }))}
                        style={{ textAlign:'left', padding:'8px 10px', borderRadius:10, border:'1px solid #DAE6ED', background: (options.teacherRemarksEdited ? options.teacherRemarks : data?.result?.teacherRemarks) === text ? '#E9F5FA' : '#FFFFFF', color:'#27465C', cursor:'pointer', fontSize:11, lineHeight:1.4 }}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={options.teacherRemarksEdited ? (options.teacherRemarks ?? '') : (data?.result?.teacherRemarks ?? options.teacherRemarks ?? '')}
                    onChange={e => setOptions(prev => ({ ...prev, teacherRemarks:e.target.value,teacherRemarksEdited:true }))}
                    placeholder="Write custom teacher remarks..."
                    rows={4}
                    style={{ width:'100%', resize:'vertical', borderRadius:10, border:'1px solid #C9DCE7', background:'#FFFFFF', color:'#23465D', padding:'10px 12px', outline:'none', fontSize:12, lineHeight:1.5 }}
                  />
                  <div style={{ color:'#8892A4', fontSize:11, lineHeight:1.5 }}>
                    {dataList.length > 1 ? `Editing teacher feedback here applies to all ${dataList.length} printed cards. Leave unchanged to preserve each exam's original remarks.` : 'Original exam feedback is preserved unless you edit it. Presets are optional.'}
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
  const [loadedExamId, setLoadedExamId] = useState('')
  const [selectedExam, setSelectedExam] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedPrintClass, setSelectedPrintClass] = useState('')
  const [selectedPrintSection, setSelectedPrintSection] = useState('')
  const [outputMode, setOutputMode] = useState('single')
  const [printCards, setPrintCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [showParams, setShowParams] = useState(false)
  const [gradeBands, setGradeBands] = useState([])
  const [loadError, setLoadError] = useState('')
  const latestResultRequest = useRef(0)
  const { paperSettings } = usePaperStore()
  const { classNames: academicClassNames, sectionsForClass } = useAcademicStore()

  useEffect(() => {
    Promise.all([api.get('/api/exams'), api.get('/api/exams/grade-settings')])
      .then(([examResponse, gradeResponse]) => {
        const list = examResponse.data.data || []
        setExams(list)
        setGradeBands(Array.isArray(gradeResponse.data?.data) ? gradeResponse.data.data : [])
        if (list.length) setSelectedExam(String(list[0].id))
        setLoadError('')
      })
      .catch(err => {
        setLoadError(err.response?.data?.message || 'Exams or grading policy could not be loaded.')
      })
  }, [])

  const loadResults = () => {
    if (!selectedExam) return
    const requestExamId = String(selectedExam)
    const requestId = ++latestResultRequest.current
    setLoading(true)
    setSelectedStudent('')
    setSelectedPrintClass('')
    setSelectedPrintSection('')
    setPrintCards([])
    setLoadError('')
    api.get(`/api/exams/results/${requestExamId}`)
      .then(r => {
        if (latestResultRequest.current !== requestId) return
        if (r.data?.success === false || !Array.isArray(r.data?.data)) throw new Error('Invalid result response')
        const list = r.data.data
        setResults(list)
        setLoadedExamId(requestExamId)
        const isEx9 = Number(requestExamId) === 9
        const validStudents = buildResultStudents(list).filter(s => !isEx9 || isClassAllowedForExam({ id: requestExamId }, s.className || s.class))
        if (validStudents.length) setSelectedStudent(String(validStudents[0].id))
      })
      .catch(err => {
        if (latestResultRequest.current !== requestId) return
        setLoadError(err.response?.data?.message || 'Exam results could not be loaded. Existing loaded results were preserved for their original exam.')
      })
      .finally(() => { if (latestResultRequest.current === requestId) setLoading(false) })
  }

  const handleExamChange = (examId) => {
    setSelectedExam(examId)
    setSelectedStudent('')
    setSelectedPrintClass('')
    setSelectedPrintSection('')
    setPrintCards([])
    setShowParams(false)
    setLoadError('')
  }

  useEffect(() => {
    setSelectedStudent('')
    setSelectedPrintClass('')
    setSelectedPrintSection('')
    setPrintCards([])
    setShowParams(false)
    const scheduled = window.setTimeout(() => {
      if (selectedExam) loadResults()
    }, 0)
    return () => window.clearTimeout(scheduled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam])

  const exam = exams.find(e => String(e.id) === String(selectedExam))
  const isExamNine = isFirstTermExamNine(exam)

  const activeResults = String(loadedExamId) === String(selectedExam) ? results : []
  const allLoadedStudents = useMemo(() => buildResultStudents(activeResults), [activeResults])
  const students = useMemo(() => {
    if (!isExamNine) return allLoadedStudents
    return allLoadedStudents.filter(s => isClassAllowedForExam(exam, s.className || s.class))
  }, [allLoadedStudents, isExamNine, exam])

  const availablePrintClasses = useMemo(() => {
    if (isExamNine) {
      const found = new Set()
      ;(academicClassNames || []).forEach(c => {
        if (isClassAllowedForExam(exam, c)) found.add(c)
      })
      students.forEach(s => {
        const c = s.className || s.class
        if (c && isClassAllowedForExam(exam, c)) found.add(c)
      })
      if (found.size === 0) return CANONICAL_STARTER_TO_EIGHT
      return sortSchoolClasses(Array.from(found))
    }

    const classSet = new Set()
    if (exam?.class && !/^all\s+classes$/i.test(String(exam.class).trim())) {
      classSet.add(exam.class)
    }
    ;(academicClassNames || []).forEach(c => classSet.add(c))
    students.forEach(s => {
      const c = s.className || s.class
      if (c) classSet.add(c)
    })
    return sortSchoolClasses(Array.from(classSet))
  }, [isExamNine, exam, academicClassNames, students])

  const availableSections = useMemo(() => {
    if (!selectedPrintClass) return []
    const sectionSet = new Set()
    try {
      const storeSections = typeof sectionsForClass === 'function' ? sectionsForClass(selectedPrintClass) : []
      ;(storeSections || []).forEach(sec => {
        if (sec && sec !== 'All') sectionSet.add(sec)
      })
    } catch {}
    const targetKey = schoolClassOrderKey(selectedPrintClass)
    students.forEach(s => {
      const sKey = schoolClassOrderKey(s.className || s.class)
      if (sKey === targetKey && s.section && s.section !== '-') {
        sectionSet.add(s.section)
      }
    })
    return Array.from(sectionSet).sort()
  }, [selectedPrintClass, sectionsForClass, students])

  const buildPrintCards = (rows = activeResults, examObj = exam, scopeStudents = students) =>
    scopeStudents.map(s => {
      const authenticatedClass = s.className || s.class || ''
      const safeClass = /^all\s+classes$/i.test(authenticatedClass.trim()) ? '' : authenticatedClass
      const sanitizedStudent = {
        ...s,
        className: safeClass,
        class: safeClass,
      }
      return {
        student: sanitizedStudent,
        exam: examObj,
        studentMarks: rows.filter(r => String(r.student_id) === String(s.id)),
      }
    }).filter(item => item.studentMarks.length > 0)

  const classPrintCards = useMemo(() => {
    if (outputMode !== 'class' || !selectedPrintClass) return []
    const targetKey = schoolClassOrderKey(selectedPrintClass)
    const matchingStudents = students.filter(s => {
      const sClass = s.className || s.class || ''
      if (schoolClassOrderKey(sClass) !== targetKey) return false
      if (selectedPrintSection && selectedPrintSection !== 'All') {
        return String(s.section || '').trim().toLowerCase() === String(selectedPrintSection).trim().toLowerCase()
      }
      return true
    })
    return buildPrintCards(activeResults, exam, matchingStudents)
  }, [outputMode, selectedPrintClass, selectedPrintSection, students, activeResults, exam])

  const allExamPrintCards = useMemo(() => {
    return buildPrintCards(activeResults, exam, students)
  }, [activeResults, exam, students])

  const studentMarks = activeResults.filter(r => String(r.student_id) === selectedStudent)
  const student = students.find(s => String(s.id) === selectedStudent)
  const { obtained: totalObtained, possible: totalPossible, percentage: pct, pending: pendingSubjects } = summarizeResultRows(studentMarks, exam)
  const selectedStudentLabel = student
    ? `${student.name}${student.className ? ` (Class ${student.className})` : ''}${student.gr_number ? ` - ${student.gr_number}` : student.roll_number ? ` - Roll ${student.roll_number}` : ''}`
    : ''

  const printTargetValue = outputMode === 'single' && selectedStudent ? `student:${selectedStudent}` : outputMode

  const handlePrintTargetChange = (value) => {
    if (value === 'class') {
      setOutputMode('class')
      if (!selectedPrintClass) {
        if (exam?.class && !/^all\s+classes$/i.test(String(exam.class).trim()) && isClassAllowedForExam(exam, exam.class)) {
          setSelectedPrintClass(exam.class)
        } else if (availablePrintClasses.length > 0) {
          setSelectedPrintClass(availablePrintClasses[0])
        }
      }
      return
    }
    if (value === 'all') {
      setOutputMode('all')
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
    ? !!selectedPrintClass && classPrintCards.length > 0
    : outputMode === 'all'
    ? (allExamPrintCards.length > 0 || exams.length > 0)
    : false

  const openDesigner = async () => {
    if (outputMode === 'single') {
      if (!student || !studentMarks.length) return alert('Select student with marks first')
      const singleCards = buildPrintCards(activeResults, exam, [student])
      if (!singleCards.length) return alert('No valid marks found for selected student')
      setPrintCards(singleCards)
      setShowParams(true)
      return
    }

    if (outputMode === 'class') {
      if (!selectedPrintClass) return alert('Please select a class to print.')
      if (!classPrintCards.length) return alert(`No result cards found for Class ${selectedPrintClass}${selectedPrintSection ? ` Section ${selectedPrintSection}` : ''} with saved marks.`)
      setPrintCards(classPrintCards)
      setShowParams(true)
      return
    }

    if (outputMode === 'all') {
      if (allExamPrintCards.length > 0 && (isExamNine || /^all\s+classes$/i.test(String(exam?.class || '')) || exams.length <= 1)) {
        setPrintCards(allExamPrintCards)
        setShowParams(true)
        return
      }

      setLoading(true)
      try {
        const examIds = exams.map(item => Number(item.id)).filter(Number.isInteger)
        if (!examIds.length) return alert('No exams are available to load.')
        const response = await api.get('/api/exams/results', { params: { exam_ids: examIds.join(',') } })
        const rows = Array.isArray(response.data?.data) ? response.data.data : []
        const byExam = new Map()
        rows.forEach(row => {
          const key = String(row.exam_id)
          if (!byExam.has(key)) byExam.set(key, [])
          byExam.get(key).push(row)
        })
        const flat = exams.flatMap(item => {
          const examRows = byExam.get(String(item.id)) || []
          const isEx9 = isFirstTermExamNine(item)
          const scopeStudents = buildResultStudents(examRows).filter(s => !isEx9 || isClassAllowedForExam(item, s.className || s.class))
          return buildPrintCards(examRows, item, scopeStudents)
        })
        if (!flat.length) return alert('No marks found in any class/exam')
        setPrintCards(flat)
        setShowParams(true)
      } catch {
        alert('Could not load all classes result cards')
      } finally {
        setLoading(false)
      }
      return
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
        color: done || active ? '#fff' : C.muted,
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
    email: paperSettings.email,
    academicYear: paperSettings.examYear,
    logo: paperSettings.logo,
    principalSignature: paperSettings.principalSignature,
    showUrduHeader: paperSettings.showUrduHeader !== false,
  }

  return (
    <div style={{ minHeight:'100%', padding:24, background:'var(--apex-shell-gradient)', color:'var(--apex-text-primary)' }}>
      <div style={{ maxWidth:1180, margin:'0 auto', display:'grid', gap:24 }}>

        <div className="super-module-card" style={{ ...card, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:16, alignItems:'center' }}>
          <div>
            <h1 style={sectionHeader}>Result Cards</h1>
            <p style={{ color:C.muted, marginTop:8 }}>Choose single student, whole class (with explicit class isolation), or all classes, then print professional A4 result cards.</p>
          </div>
          <button
            id="result-cards-generate-top-btn"
            style={{ ...btnPrimary, opacity: canPrint ? 1 : 0.55, cursor: canPrint ? 'pointer' : 'not-allowed' }}
            onClick={openDesigner}
            disabled={!canPrint || loading}
          >
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
            <select
              id="result-cards-exam-select"
              style={select}
              value={selectedExam}
              onChange={e => handleExamChange(e.target.value)}
            >
              <option value="">Select exam</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name} - {e.class}</option>)}
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
              id="result-cards-print-target-select"
              style={{ ...select, fontSize:15, fontWeight:800, opacity: students.length ? 1 : 0.65 }}
              value={printTargetValue}
              onChange={e => handlePrintTargetChange(e.target.value)}
              disabled={!students.length || loading}
            >
              <option value="">{loading ? 'Loading targets...' : students.length ? 'Select print target' : 'No students with marks'}</option>
              <option value="class">Whole Class {selectedPrintClass ? `— Class ${selectedPrintClass}` : ''} ({classPrintCards.length} cards)</option>
              <option value="all">All Classes — all saved result cards ({allExamPrintCards.length} cards)</option>
              {students.map(s => {
                const suffix = s.gr_number ? s.gr_number : s.roll_number ? `Roll ${s.roll_number}` : `${s.subjectsCount} subjects`
                const classLabel = s.className ? ` - Class ${s.className}` : ''
                return <option key={s.id} value={`student:${s.id}`}>Student - {s.name}{classLabel} - {suffix}</option>
              })}
            </select>

            {outputMode === 'class' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:10, marginTop:4, padding:12, borderRadius:14, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <label htmlFor="result-cards-class-select" style={{ display:'block', fontSize:11, fontWeight:800, color:C.gold, marginBottom:6 }}>
                    CLASS * {isExamNine ? '(Starter–Eight)' : ''}
                  </label>
                  <select
                    id="result-cards-class-select"
                    style={{ ...select, width:'100%', fontSize:13, fontWeight:700 }}
                    value={selectedPrintClass}
                    onChange={e => {
                      setSelectedPrintClass(e.target.value)
                      setSelectedPrintSection('')
                    }}
                  >
                    <option value="">Select Class to print</option>
                    {availablePrintClasses.map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="result-cards-section-select" style={{ display:'block', fontSize:11, fontWeight:800, color:C.silver, marginBottom:6 }}>
                    SECTION (OPTIONAL)
                  </label>
                  <select
                    id="result-cards-section-select"
                    style={{ ...select, width:'100%', fontSize:13, fontWeight:700 }}
                    value={selectedPrintSection}
                    onChange={e => setSelectedPrintSection(e.target.value)}
                    disabled={!selectedPrintClass}
                  >
                    <option value="">All Sections</option>
                    {availableSections.map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {(student || outputMode !== 'single') && (
              <div style={{ marginTop:'auto', padding:12, borderRadius:14, background:'rgba(10,132,255,0.08)', border:'1px solid rgba(10,132,255,0.18)' }}>
                <div style={{ color:C.silver, fontWeight:800, fontSize:15 }}>
                  {outputMode === 'single'
                    ? selectedStudentLabel
                    : outputMode === 'class'
                    ? `${classPrintCards.length} card(s) for Class ${selectedPrintClass || '(Select Class)'}${selectedPrintSection ? ` / Section ${selectedPrintSection}` : ''}`
                    : `${allExamPrintCards.length} card(s) across all classes`}
                </div>
                <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>
                  {outputMode === 'single'
                    ? `${studentMarks.length} subject marks ready`
                    : outputMode === 'class'
                    ? 'One A4 page per student in selected class and section'
                    : 'All enrolled exam classes with saved marks will be printed'}
                </div>
              </div>
            )}
          </div>

          <div className="super-module-card" style={{ ...card, display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ color:C.gold, fontSize:13, fontWeight:900 }}>3. Output</div>
            <div style={{ color:C.muted, fontSize:12 }}>Preview checks totals before opening print templates.</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ padding:12, borderRadius:14, background:'rgba(48,209,88,0.08)' }}>
                <div style={{ color:C.muted, fontSize:10, fontWeight:800 }}>CARDS / OBTAINED</div>
                <div style={{ color:C.green, fontSize:20, fontWeight:900 }}>
                  {outputMode === 'single' ? (totalPossible ? totalObtained : '—') : outputMode === 'class' ? classPrintCards.length : allExamPrintCards.length}
                </div>
              </div>
              <div style={{ padding:12, borderRadius:14, background:'rgba(200,153,26,0.08)' }}>
                <div style={{ color:C.muted, fontSize:10, fontWeight:800 }}>PERCENT / TARGET</div>
                <div style={{ color:C.gold, fontSize:20, fontWeight:900 }}>
                  {outputMode === 'single' ? (pct === null ? 'Pending' : `${pct}%`) : outputMode === 'class' ? (selectedPrintClass ? `Class ${selectedPrintClass}` : 'Select Class') : 'All Classes'}
                </div>
              </div>
            </div>
            <button
              id="result-cards-open-designer-btn"
              style={{ ...btnPrimary, marginTop:'auto', justifyContent:'center', opacity: canPrint ? 1 : 0.55, cursor: canPrint ? 'pointer' : 'not-allowed' }}
              onClick={openDesigner}
              disabled={!canPrint || loading}
            >
              Print / Export Card
            </button>
          </div>
        </div>

        {loadError && (
          <div className="super-module-card" style={{ ...card, padding:16, marginBottom:12, color:C.red, borderColor:'rgba(255,55,95,0.35)' }}>{loadError}</div>
        )}
        {loading ? (
          <div className="super-module-card" style={{ ...card, padding:40, textAlign:'center', color:C.muted }}>Loading results…</div>
        ) : loadError && String(loadedExamId) !== String(selectedExam) ? (
          <div className="super-module-card" style={{ ...card, padding:40, textAlign:'center', color:C.muted }}>Results for this exam are temporarily unavailable.</div>
        ) : outputMode === 'class' && selectedPrintClass ? (
          <div className="super-module-card" style={{ ...card, background:'var(--apex-bg-surface)', borderRadius:20, padding:28, color:'#fff' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:20, alignItems:'center', flexWrap:'wrap' }}>
              <div>
                <div style={{ color:C.gold, fontWeight:800, fontSize:22 }}>Whole Class Print: Class {selectedPrintClass}{selectedPrintSection ? ` / Section ${selectedPrintSection}` : ''}</div>
                <div style={{ color:C.silver, marginTop:6 }}>{classPrintCards.length} student result card(s) ready for A4 printing</div>
                <div style={{ color:C.muted, marginTop:4, fontSize:13 }}>{exam?.name} · Authenticated Class Isolation</div>
              </div>
              <button style={btnSecondary} onClick={openDesigner} disabled={!canPrint || loading}>
                Print Class {selectedPrintClass} Cards
              </button>
            </div>
            {classPrintCards.length > 0 ? (
              <div style={{ display:'grid', gap:8 }}>
                {classPrintCards.slice(0, 10).map((c, idx) => (
                  <div key={c.student.id || idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,0.04)' }}>
                    <span style={{ color:C.silver, fontWeight:700 }}>
                      {idx + 1}. {c.student.name} {c.student.roll_number ? `(Roll: ${c.student.roll_number})` : ''} {c.student.gr_number ? `[${c.student.gr_number}]` : ''}
                    </span>
                    <span style={{ color:C.gold, fontSize:12, fontWeight:800 }}>
                      Class: {c.student.className} {c.student.section ? `/ ${c.student.section}` : ''} · {c.studentMarks.length} subjects
                    </span>
                  </div>
                ))}
                {classPrintCards.length > 10 && (
                  <div style={{ color:C.muted, fontSize:12, textAlign:'center', marginTop:6 }}>
                    + {classPrintCards.length - 10} more students in Class {selectedPrintClass}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color:C.muted, textAlign:'center', padding:20 }}>
                No students with recorded marks found for Class {selectedPrintClass}{selectedPrintSection ? ` Section ${selectedPrintSection}` : ''}.
              </div>
            )}
          </div>
        ) : student && studentMarks.length > 0 ? (
          <div className="super-module-card" style={{ ...card, background:'var(--apex-bg-surface)', borderRadius:20, padding:28, color:'#fff' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:24, alignItems:'center', flexWrap:'wrap' }}>
              <div>
                <div style={{ color:C.gold, fontWeight:800, fontSize:22 }}>Result Card Preview</div>
                <div style={{ color:C.silver, marginTop:6 }}>{selectedStudentLabel}</div>
                <div style={{ color:C.muted, marginTop:4, fontSize:13 }}>{exam?.name} · {student.className ? `Class ${student.className}` : exam?.class}</div>
              </div>
              <button style={btnSecondary} onClick={openDesigner}> Print with Template</button>
            </div>
            <div style={{ display:'grid', gap:10, marginBottom:18 }}>
              {studentMarks.map(row=>(
                <div key={row.id || row.subject} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 14px', borderRadius:12, background:'rgba(255,255,255,0.04)' }}>
                  <span style={{ color:C.silver }}>{row.subject}</span>
                  <span style={{ color:meetsResultPassMark(row.marks_obtained, exam?.pass_marks) === null ? C.muted : meetsResultPassMark(row.marks_obtained, exam?.pass_marks) ? C.green : C.red, fontWeight:700 }}>
                    {formatResultCell(row.marks_obtained)} / {formatResultCell(row.total_marks ?? exam?.total_marks)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:16, borderRadius:20, background:'rgba(255,255,255,0.08)' }}>
              <div><div style={{ color:C.gold, fontWeight:800 }}>Total</div><div style={{ color:C.silver }}>{totalPossible ? `${totalObtained} / ${totalPossible}` : 'Pending marks'}</div></div>
              <div style={{ textAlign:'right' }}>
                <div style={{ color:pct === null || pendingSubjects || studentMarks.some(row => meetsResultPassMark(row.marks_obtained, exam?.pass_marks) === null) ? C.muted : studentMarks.every(row => meetsResultPassMark(row.marks_obtained, exam?.pass_marks)) ? C.green : C.red, fontSize:32, fontWeight:800 }}>{pct === null ? 'Pending' : `${pct}%`}</div>
                <div style={{ color:C.muted }}>Grade: {pct === null ? '—' : gradeLabel(pct, gradeBands)}{pendingSubjects ? ` · ${pendingSubjects} subject(s) pending` : ''}</div>
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
          gradeBands={gradeBands}
          onClose={()=>setShowParams(false)}
        />
      )}
    </div>
  )
}

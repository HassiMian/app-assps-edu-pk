import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, RefreshCw, Search } from 'lucide-react'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, select, input, sectionHeader } from '../moduleStyles'
import { normalizeMarksExam } from './marksEntryModel'
import {
  availableRegisterValues, registerFilterRows, registerScoreInfo,
  registerSummary, escapeRegisterHtml,
} from './marksRegisterModel'

const pretty = (value, label) => value || label
const fieldLabel = { fontSize: 12, fontWeight: 750, marginBottom: 6, display: 'block', color: C.muted }
const formSelect = { ...select, width: '100%', minWidth: 0 }
const classesFor = rows => availableRegisterValues(rows, row => row.student_class ?? row.class)
const sectionsFor = rows => availableRegisterValues(rows, row => row.student_section ?? row.section)
const subjectsFor = rows => availableRegisterValues(rows, row => row.subject)

function printMarksRegister({ exam, rows, filters }) {
  if (!rows.length) return false
  const escape = escapeRegisterHtml
  const heading = [exam.name, exam.session, filters.className && `Class ${filters.className}`,
    filters.section && `Section ${filters.section}`, filters.subject].filter(Boolean).join(' · ')
  const entries = rows.map((row, index) => {
    const score = registerScoreInfo(row, exam)
    return `<tr><td>${index + 1}</td><td>${escape(row.gr_number || row.roll_number || '—')}</td><td>${escape(row.name ?? row.student_name)}</td><td>${escape(row.father_name || '—')}</td><td>${escape(row.student_class ?? row.class)}</td><td>${escape(row.student_section ?? row.section ?? '—')}</td><td>${escape(row.subject)}</td><td class="center">${score.score === null ? '—' : escape(score.score)}</td><td class="center">${score.maximum === null ? '—' : escape(score.maximum)}</td><td class="center">${score.pass === null ? '—' : escape(score.pass)}</td><td>${escape(score.status)}</td></tr>`
  }).join('')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(heading)} - Saved Marks Register</title>
  <style>@page{size:A4 landscape;margin:11mm}*{box-sizing:border-box}body{font-family:"Times New Roman",Arial,sans-serif;color:#152639;margin:0}h1{text-align:center;margin:0 0 6px;font-size:17pt}h2{text-align:center;margin:0 0 5px;font-size:12pt}p{text-align:center;margin:4px 0 14px;font-size:9pt}table{width:100%;border-collapse:collapse;font-size:9pt}th,td{border:1px solid #405267;padding:6px 5px;text-align:left;vertical-align:top}th{background:#edf3fa;font-weight:bold}thead{display:table-header-group}tr{break-inside:avoid}.center{text-align:center}.note{margin-top:12px;font-size:9pt;text-align:left}@media print{button{display:none}}</style>
  </head><body><h1>AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</h1><h2>Saved Marks Register</h2><p>${escape(heading)} | ${rows.length} saved subject record(s)</p>
  <table><thead><tr><th>#</th><th>GR / Roll</th><th>Student</th><th>Father</th><th>Class</th><th>Section</th><th>Subject</th><th>Obtained</th><th>Maximum</th><th>Pass Mark</th><th>Status</th></tr></thead><tbody>${entries}</tbody></table>
  <p class="note">Authenticated saved records only. Students/subjects with no saved record are not represented. A missing score is not zero. Generated from the currently selected exam and filters.</p>
  <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),200))</script></body></html>`
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.open()
  win.document.write(html)
  win.document.close()
  return true
}

export default function MarksRegister() {
  const [exams, setExams] = useState([])
  const [examId, setExamId] = useState('')
  const [session, setSession] = useState('')
  const [examType, setExamType] = useState('')
  const [className, setClassName] = useState('')
  const [section, setSection] = useState('')
  const [subject, setSubject] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [loadedExamId, setLoadedExamId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshCounter, setRefreshCounter] = useState(0)
  const requestRef = useRef(0)

  useEffect(() => {
    let alive = true
    api.get('/api/exams', { params: { include_subjects: '1' } })
      .then(response => {
        if (!alive) return
        if (response.data?.success === false || !Array.isArray(response.data?.data)) throw new Error('Invalid exam catalog.')
        const list = response.data.data.map(normalizeMarksExam)
        setExams(list)
        const preferred = list.find(e => /first\s+term/i.test(e.name || '')) || list[0]
        if (preferred) {
          setSession(preferred.session)
          setExamType(preferred.type)
          setExamId(String(preferred.id))
        }
      })
      .catch(err => { if (alive) setError(err?.response?.data?.message || 'Could not load saved examinations.') })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const requestId = ++requestRef.current
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      setRows([])
      setLoadedExamId('')
      setClassName('')
      setSection('')
      setSubject('')
      setSearch('')
      setLoading(Boolean(examId))
      setError('')
    })
    if (!examId) return () => { alive = false }
    api.get(`/api/exams/results/${encodeURIComponent(examId)}`)
      .then(response => {
        if (!alive || requestRef.current !== requestId) return
        if (response.data?.success === false || !Array.isArray(response.data?.data)) throw new Error('Invalid marks response.')
        setRows(response.data.data)
        setLoadedExamId(String(examId))
      })
      .catch(err => {
        if (alive && requestRef.current === requestId)
          setError(err?.response?.data?.message || err.message || 'Could not load saved marks.')
      })
      .finally(() => { if (alive && requestRef.current === requestId) setLoading(false) })
    return () => { alive = false }
  }, [examId, refreshCounter])

  const sessions = useMemo(() => availableRegisterValues(exams, e => e.session), [exams])
  const sessionExams = useMemo(() => exams.filter(e => !session || e.session === session), [exams, session])
  const types = useMemo(() => availableRegisterValues(sessionExams, e => e.type), [sessionExams])
  const matchingExams = useMemo(() => sessionExams.filter(e => !examType || e.type === examType), [sessionExams, examType])
  const exam = matchingExams.find(e => String(e.id) === examId)
  const activeRows = useMemo(() => loadedExamId === examId && exam ? rows : [], [loadedExamId, examId, exam, rows])
  const classes = useMemo(() => classesFor(activeRows), [activeRows])
  const classRows = useMemo(() => registerFilterRows(activeRows, { className }), [activeRows, className])
  const sections = useMemo(() => sectionsFor(classRows), [classRows])
  const sectionRows = useMemo(() => registerFilterRows(classRows, { section }), [classRows, section])
  const subjects = useMemo(() => subjectsFor(sectionRows), [sectionRows])
  const filteredRows = useMemo(() => registerFilterRows(sectionRows, { subject, search }), [sectionRows, subject, search])
  const totals = useMemo(() => registerSummary(filteredRows, exam), [filteredRows, exam])
  const canPrint = !!exam && !loading && loadedExamId === examId && filteredRows.length > 0
  const currentFilters = { className, section, subject, search }

  const chooseSession = value => {
    setSession(value)
    const candidate = exams.find(e => e.session === value)
    setExamType(candidate?.type || '')
    setExamId(candidate ? String(candidate.id) : '')
  }
  const chooseType = value => {
    setExamType(value)
    const candidate = sessionExams.find(e => e.type === value)
    setExamId(candidate ? String(candidate.id) : '')
  }
  return (
    <div style={{ minHeight: '100%', padding: 24, background: 'var(--apex-shell-gradient)', color: 'var(--apex-text-primary)' }}>
      <div style={{ maxWidth: 1250, margin: 'auto', display: 'grid', gap: 18 }}>
        <div className="super-module-card" style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div><h1 style={sectionHeader}>View &amp; Print Saved Marks</h1><p style={{ color: C.muted, marginTop: 8 }}>Read-only register. Filter by session, assessment, term, class, section and subject. Saved zero is shown as 0; missing is never changed to zero.</p></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/exams/marks" style={{ ...btnSecondary, textDecoration: 'none' }}>Marks Entry</Link>
            <button style={btnSecondary} onClick={() => setRefreshCounter(v => v + 1)} disabled={!examId || loading}><RefreshCw size={15} /> Refresh</button>
            <button style={btnPrimary} disabled={!canPrint} onClick={() => { if (!printMarksRegister({ exam, rows: filteredRows, filters: currentFilters })) setError('Allow pop-ups to print the saved marks register.') }}><Printer size={15} /> Print Selected List</button>
          </div>
        </div>
        <div className="super-module-card" style={{ ...card }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 12 }}>
            <label><span style={fieldLabel}>Academic Session</span><select aria-label="Academic Session" style={formSelect} value={session} onChange={e => chooseSession(e.target.value)}>{sessions.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
            <label><span style={fieldLabel}>Exam / Assessment Type</span><select aria-label="Exam Type" style={formSelect} value={examType} onChange={e => chooseType(e.target.value)}>{types.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
            <label><span style={fieldLabel}>Saved Exam / Term</span><select aria-label="Saved Exam" style={formSelect} value={examId} onChange={e => setExamId(e.target.value)}>{matchingExams.map(e => <option key={e.id} value={e.id}>{e.name} — {e.class}</option>)}</select></label>
            <label><span style={fieldLabel}>Class</span><select aria-label="Class" style={formSelect} value={className} onChange={e => { setClassName(e.target.value); setSection(''); setSubject('') }}><option value="">All Classes</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
            <label><span style={fieldLabel}>Section</span><select aria-label="Section" style={formSelect} value={section} onChange={e => { setSection(e.target.value); setSubject('') }}><option value="">All Sections</option>{sections.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
            <label><span style={fieldLabel}>Subject</span><select aria-label="Subject" style={formSelect} value={subject} onChange={e => setSubject(e.target.value)}><option value="">All Subjects</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
          </div>
          <div style={{ marginTop: 14, position: 'relative' }}><Search size={17} style={{ position: 'absolute', top: 12, left: 12, color: C.muted }} /><input aria-label="Search saved marks" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find student name, GR, roll or father name..." style={{ ...input, width: '100%', paddingLeft: 38 }} /></div>
        </div>
        {error && <div role="alert" style={{ color: '#EB465A', fontWeight: 700 }}>{error}</div>}
        <div className="super-module-card" style={{ ...card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ ...sectionHeader, fontSize: 19 }}>Saved Marks Register — {pretty(exam?.name, 'Select exam')}</h2>
            <span style={{ color: C.muted }}>{loading ? 'Loading verified marks...' : `${totals.students} students · ${totals.records} subject records · ${totals.entered} numeric scores · ${totals.pending} pending/special`}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900, fontSize: 13 }}>
              <thead><tr style={{ textAlign: 'left', background: 'rgba(90,140,180,0.12)' }}>{['#','GR / Roll','Student','Father','Class','Section','Subject','Obtained','Maximum','Pass Mark','Status'].map(h => <th key={h} style={{ padding: 12, borderBottom: '1px solid var(--apex-border-subtle)' }}>{h}</th>)}</tr></thead>
              <tbody>{filteredRows.map((row, i) => {
                const score = registerScoreInfo(row, exam)
                return <tr key={row.id ?? `${row.student_id}-${row.subject}-${i}`} style={{ borderBottom: '1px solid var(--apex-border-subtle)' }}>
                  <td style={{ padding: 10 }}>{i + 1}</td><td>{row.gr_number || row.roll_number || '—'}</td><td style={{ fontWeight: 700 }}>{row.name ?? row.student_name}</td><td>{row.father_name || '—'}</td><td>{row.student_class ?? row.class}</td><td>{row.student_section ?? row.section ?? '—'}</td><td>{row.subject}</td>
                  <td style={{ fontWeight: 800 }}>{score.score === null ? '—' : score.score}</td><td>{score.maximum ?? '—'}</td><td>{score.pass ?? '—'}</td><td>{score.status}</td>
                </tr>
              })}</tbody>
            </table>
            {!loading && !filteredRows.length && <p style={{ padding: 28, textAlign: 'center', color: C.muted }}>No authenticated saved mark records match these filters. Empty does not mean zero marks.</p>}
          </div>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>Only server-returned saved subject records are listed. This is not a complete enrollment sheet and does not publish or modify results. Authoritative subject policy supplies maxima/pass thresholds when available.</p>
        </div>
      </div>
    </div>
  )
}

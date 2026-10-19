import { useEffect, useMemo, useState } from 'react'
import { useAcademicStore } from '../../services/useAcademicStore'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import api from '../../services/api'
import BellSchedulePanel from '../../components/BellSchedulePanel'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const printTimetableDocument = ({ school, schoolClass, section, periods, days, assignments }) => {
  const title = `Class ${schoolClass} - Section ${section} Timetable`
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const schoolName = school?.schoolName || 'School'
  const schoolUrdu = school?.showUrduHeader && school?.schoolUrdu ? school.schoolUrdu : ''
  const schoolAddress = school?.address || ''
  const academicSession = school?.examYear || ''
  const logo = school?.logo

  const rows = days.map(day => `
    <tr>
      <th class="day-cell">${escapeHtml(day)}</th>
      ${periods.map(period => {
        const item = assignments[day]?.[period] || {}
        return `
          <td>
            <strong>${escapeHtml(item.subject || '—')}</strong>
            <span>${escapeHtml(item.teacher || 'Unassigned')}</span>
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
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef2f7; color: #101827; font-family: Inter, Arial, sans-serif; }
    .toolbar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 12px; padding: 12px 18px; background: #0c2c4a; color: #fff; box-shadow: 0 6px 18px rgba(15,23,42,.22); }
    .toolbar strong { color: #38bdf8; font-size: 15px; }
    .toolbar span { color: #94a3b8; font-size: 13px; }
    .toolbar button { margin-left: auto; border: 0; border-radius: 8px; padding: 9px 18px; background: #256FE8; color: #fff; font-weight: 700; cursor: pointer; }
    .sheet { width: 280mm; min-height: 194mm; margin: 14px auto; padding: 8mm 10mm; background: white; box-shadow: 0 16px 45px rgba(15,23,42,.18); }
    header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 10px; }
    .logo { width: 56px; height: 56px; object-fit: contain; border: 1px solid #d9dee8; border-radius: 10px; padding: 3px; }
    .fallback-logo { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 10px; background: #0b2c4d; color: #38bdf8; font-size: 24px; font-weight: 900; }
    h1 { margin: 0; color: #0b2c4d; font-size: 20px; line-height: 1.1; font-weight: 800; }
    .urdu { margin-top: 3px; color: #334155; font-size: 14px; direction: rtl; font-family: "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif; }
    .meta { margin-left: auto; text-align: right; color: #475569; font-size: 11px; line-height: 1.6; }
    .title-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; margin: 10px 0 9px; }
    .title-row h2 { margin: 0; color: #0284c7; font-size: 16px; font-weight: 700; }
    .badge { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 999px; padding: 4px 12px; color: #0b2c4d; font-size: 11px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #cbd5e1; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 5px; vertical-align: middle; text-align: center; }
    thead th { background: #0b2c4d; color: white; font-size: 11px; letter-spacing: .02em; padding: 8px 4px; }
    .day-cell { width: 26mm; background: #f8fafc; color: #0b2c4d; font-size: 11px; font-weight: 700; text-align: left; padding-left: 8px; }
    td strong { display: block; color: #0f172a; font-size: 11px; line-height: 1.2; font-weight: 700; }
    td span { display: block; margin-top: 3px; color: #475569; font-size: 9.5px; line-height: 1.2; }
    footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 14px; color: #64748b; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .sheet { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <strong>Official Academic Timetable</strong>
    <span>${escapeHtml(title)}${academicSession ? ` · Academic Session ${escapeHtml(academicSession)}` : ''}</span>
    <button onclick="window.print()">Print / Save PDF</button>
  </div>
  <main class="sheet">
    <header>
      ${logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="">` : '<div class="fallback-logo">S</div>'}
      <div>
        <h1>${escapeHtml(schoolName)}</h1>
        ${schoolUrdu ? `<div class="urdu">${escapeHtml(schoolUrdu)}</div>` : ''}
        ${schoolAddress ? `<div style="color:#64748b;font-size:11px;margin-top:4px">${escapeHtml(schoolAddress)}</div>` : ''}
      </div>
      <div class="meta">
        ${academicSession ? `<div><strong>Academic Session:</strong> ${escapeHtml(academicSession)}</div>` : ''}
        <div><strong>Print Date:</strong> ${escapeHtml(today)}</div>
        <div><strong>Status:</strong> Approved Official Timetable</div>
      </div>
    </header>
    <section class="title-row">
      <h2>${escapeHtml(title)}</h2>
      <div class="badge">${periods.length} Academic Periods (Preserving Period 5)</div>
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
      <span>${escapeHtml(schoolName)} · Official Timetable</span>
      <span>Principal Authorization: ____________________</span>
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
  background: 'var(--apex-bg-surface, #0f2942)',
  border: '1px solid var(--apex-border-subtle, rgba(56, 189, 248, 0.15))',
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  background: 'var(--apex-bg-subtle, rgba(15, 23, 42, 0.6))',
  border: '1px solid var(--apex-border-default, rgba(56, 189, 248, 0.25))',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--apex-text-tertiary, #94a3b8)',
}

export default function TimetableModule() {
  const { activeClasses, subjectsForClass } = useAcademicStore()
  const paperSettings = usePaperStore(state => state.settings)

  const classOptions = useMemo(() => {
    return activeClasses?.length ? activeClasses.map(c => c.name) : ['Four', 'Five', 'Six', 'Seven', 'Pre-Nine', 'Nine']
  }, [activeClasses])

  const [schoolClass, setSchoolClass] = useState(classOptions[0] || 'Five')
  
  const selectedAcademicClass = activeClasses?.find(c => c.name === schoolClass)
  const sectionOptions = useMemo(() => {
    if (selectedAcademicClass?.sections?.length) return selectedAcademicClass.sections
    if (schoolClass === 'Nine') return ['Usman', 'Fatima']
    return ['Blue', 'Green']
  }, [selectedAcademicClass, schoolClass])
  
  const [section, setSection] = useState(sectionOptions[0] || (schoolClass === 'Nine' ? 'Usman' : 'Blue'))
  const resolvedSection = sectionOptions.includes(section) ? section : (sectionOptions[0] || (schoolClass === 'Nine' ? 'Usman' : 'Blue'))
  const [numPeriods, setNumPeriods] = useState(8)
  const [teacherOptions, setTeacherOptions] = useState([])
  const [teacherLoadError, setTeacherLoadError] = useState('')
  const [saveStatus, setSaveStatus] = useState({ loading: false, success: '', error: '' })
  const [showWorkloadModal, setShowWorkloadModal] = useState(false)
  const [showBellsModal, setShowBellsModal] = useState(false)
  const [workloadData, setWorkloadData] = useState(null)
  const [loadingTimetable, setLoadingTimetable] = useState(false)

  // Subject options for class
  const subjectOptions = useMemo(() => {
    if (selectedAcademicClass) {
      const list = subjectsForClass(selectedAcademicClass.level)
      if (list && list.length) return list
    }
    return ['English', 'Urdu', 'Mathematics', 'Science', 'Social Studies', 'Islamiyat', 'Nazra', 'Computer Science', 'Physics', 'Chemistry', 'Biology', 'Tarjuma']
  }, [selectedAcademicClass, subjectsForClass])

  // Timetable grid assignments: { [day]: { [period]: { subject, teacher, teacher_id, start_time, end_time } } }
  const [assignments, setAssignments] = useState(() => {
    const initial = {}
    DAYS.forEach(day => {
      initial[day] = {}
      for (let i = 1; i <= 8; i++) {
        initial[day][`Period ${i}`] = { subject: '', teacher: '', teacher_id: null }
      }
    })
    return initial
  })

  // 1. Load active teachers list
  useEffect(() => {
    let cancelled = false
    async function loadTeachers() {
      try {
        setTeacherLoadError('')
        const response = await api.get('/api/employees')
        const rows = Array.isArray(response.data?.data) ? response.data.data : []
        const teachers = rows
          .filter(e => e?.is_active !== false)
          .map(e => ({
            id: e.user_id || e.id,
            name: String(e.name || e.full_name || '').trim(),
            designation: e.designation || 'Teacher'
          }))
          .filter(t => t.name)
        if (!cancelled) setTeacherOptions(teachers)
      } catch (err) {
        if (!cancelled) setTeacherLoadError(err.response?.data?.message || 'Teacher list could not be loaded.')
      }
    }
    loadTeachers()
    return () => { cancelled = true }
  }, [])

  // 2. Fetch official timetable records whenever class or section changes
  useEffect(() => {
    let cancelled = false
    async function fetchTimetable() {
      if (!schoolClass) return
      setLoadingTimetable(true)
      setSaveStatus({ loading: false, success: '', error: '' })
      try {
        const res = await api.get('/api/timetable', {
          params: { class: schoolClass, section: resolvedSection || undefined }
        })
        const rows = Array.isArray(res.data?.data) ? res.data.data : []
        if (cancelled) return

        // Populate assignments
        const next = {}
        DAYS.forEach(day => {
          next[day] = {}
          for (let i = 1; i <= numPeriods; i++) {
            next[day][`Period ${i}`] = { subject: '', teacher: '', teacher_id: null }
          }
        })

        rows.forEach(r => {
          const day = r.day_name
          const period = r.period_label
          if (next[day] && next[day][period] !== undefined) {
            next[day][period] = {
              subject: r.subject || '',
              teacher: r.teacher_display_name || '',
              teacher_id: r.teacher_id || null,
              start_time: r.start_time || '',
              end_time: r.end_time || '',
            }
          }
        })
        setAssignments(next)
      } catch (err) {
        if (!cancelled) {
          console.warn('Timetable fetch error:', err.message)
        }
      } finally {
        if (!cancelled) setLoadingTimetable(false)
      }
    }
    fetchTimetable()
    return () => { cancelled = true }
  }, [schoolClass, resolvedSection, numPeriods])

  // Handle cell edits
  const handleChange = (day, period, field, value) => {
    setAssignments(prev => {
      const current = prev[day]?.[period] || {}
      let updated = { ...current, [field]: value }
      if (field === 'teacher') {
        const found = teacherOptions.find(t => t.name === value)
        updated.teacher_id = found ? found.id : null
      }
      return {
        ...prev,
        [day]: {
          ...prev[day],
          [period]: updated
        }
      }
    })
  }

  // Handle save
  const handleSaveTimetable = async () => {
    setSaveStatus({ loading: true, success: '', error: '' })
    try {
      const payloadAssignments = []
      DAYS.forEach(day => {
        for (let i = 1; i <= numPeriods; i++) {
          const p = `Period ${i}`
          const item = assignments[day]?.[p]
          if (item && item.subject) {
            payloadAssignments.push({
              day_name: day,
              period_label: p,
              period_number: i,
              subject: item.subject,
              teacher_display_name: item.teacher || '',
              teacher_id: item.teacher_id || null,
              start_time: item.start_time || null,
              end_time: item.end_time || null
            })
          }
        }
      })

      const res = await api.post('/api/timetable/save', {
        class_name: schoolClass,
        section: resolvedSection,
        num_periods: numPeriods,
        assignments: payloadAssignments
      })

      setSaveStatus({
        loading: false,
        success: res.data?.message || `Successfully saved ${payloadAssignments.length} timetable entries for Class ${schoolClass} (${resolvedSection})!`,
        error: ''
      })
    } catch (err) {
      setSaveStatus({
        loading: false,
        success: '',
        error: err.response?.data?.message || err.message || 'Failed to save timetable.'
      })
    }
  }

  // Handle workload modal open
  const handleOpenWorkload = async () => {
    setShowWorkloadModal(true)
    try {
      const res = await api.get('/api/timetable/workload')
      if (res.data?.data) {
        setWorkloadData(res.data.data)
      }
    } catch (err) {
      console.warn('Workload fetch error:', err.message)
    }
  }

  const periods = useMemo(() => {
    const arr = []
    for (let i = 1; i <= numPeriods; i++) {
      arr.push(`Period ${i}`)
    }
    return arr
  }, [numPeriods])

  const timetableMinWidth = Math.max(980, 132 + periods.length * 154)

  const activeLessonCount = useMemo(() => {
    return DAYS.reduce((count, day) => count + periods.reduce((inner, period) => inner + (assignments[day]?.[period]?.subject ? 1 : 0), 0), 0)
  }, [assignments, periods])

  const printTimetable = () => {
    printTimetableDocument({
      school: paperSettings,
      schoolClass,
      section: resolvedSection,
      periods,
      days: DAYS,
      assignments,
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--apex-shell-gradient, #07121f)', color: 'var(--apex-text-primary, #fff)', padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 1600, margin: '0 auto', display: 'grid', gap: 22, minWidth: 0 }}>
        
        {/* Header banner */}
        <div className="super-module-card" style={{ ...card, padding: 28, boxShadow: '0 18px 40px rgba(0,0,0,0.24)', borderRadius: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ background: 'linear-gradient(135deg, #0284c7, #0d9488)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, letterSpacing: 1.2 }}>
                  ACADEMIC 2026–27
                </span>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>Official Approved Timetable Master</span>
              </div>
              <div style={{ color: 'var(--apex-action-primary, #38bdf8)', fontSize: 28, fontWeight: 700, margin: '4px 0' }}>Academic Timetable Manager</div>
              <div style={{ color: 'var(--apex-text-tertiary, #94a3b8)', fontSize: 14 }}>Full 8-period academic schedule, combined classes, teacher allocations, bell timings, and conflict detection.</div>
              {teacherLoadError && <p role="alert" style={{ color: '#fca5a5', fontSize: 13, margin: '8px 0 0' }}>{teacherLoadError}</p>}
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button
                onClick={() => setShowBellsModal(true)}
                style={{
                  background: 'rgba(2, 132, 199, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: 12,
                  padding: '12px 18px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <span>🔔</span> Period Timings
              </button>

              <button
                onClick={handleOpenWorkload}
                style={{
                  background: 'rgba(13, 148, 136, 0.15)',
                  color: '#2dd4bf',
                  border: '1px solid rgba(45, 212, 191, 0.3)',
                  borderRadius: 12,
                  padding: '12px 18px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <span>📊</span> Staff Workload
              </button>

              <button
                onClick={handleSaveTimetable}
                disabled={saveStatus.loading}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 22px',
                  cursor: saveStatus.loading ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                }}
              >
                {saveStatus.loading ? 'Saving...' : '💾 Save Timetable'}
              </button>

              <button
                onClick={printTimetable}
                style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 22px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                }}
              >
                🖨️ Print Timetable
              </button>
            </div>
          </div>
        </div>

        {/* Save alerts */}
        {saveStatus.success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: '12px 18px', color: '#6ee7b7', fontSize: 13, fontWeight: 600 }}>
            ✓ {saveStatus.success}
          </div>
        )}
        {saveStatus.error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: '12px 18px', color: '#fca5a5', fontSize: 13, fontWeight: 600 }}>
            ✕ {saveStatus.error}
          </div>
        )}

        {/* Controls Bar */}
        <div className="super-module-card timetable-controls" style={{ ...card, padding: 24, borderRadius: 20, display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) minmax(160px,1fr) minmax(160px,0.7fr)', gap: 20 }}>
          <div>
            <span style={labelStyle}>Class</span>
            <select value={schoolClass} onChange={e => setSchoolClass(e.target.value)} style={inputStyle}>
              {classOptions.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <span style={labelStyle}>Section</span>
            <select value={resolvedSection} onChange={e => setSection(e.target.value)} style={inputStyle}>
              {sectionOptions.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <span style={labelStyle}>Number of Periods</span>
            <select value={numPeriods} onChange={e => setNumPeriods(Number(e.target.value))} style={inputStyle}>
              {[6, 7, 8, 9, 10].map(num => <option key={num} value={num}>{num} Periods (Preserving Period 5)</option>)}
            </select>
          </div>
        </div>

        {/* Timetable Grid Card */}
        <div className="super-module-card" style={{ ...card, padding: 24, borderRadius: 20, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
            <div>
              <div style={{ color: 'var(--apex-action-primary, #38bdf8)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                Class {schoolClass} · Section {resolvedSection}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>
                {loadingTimetable ? 'Loading official schedule from database...' : `Loaded approved 2026–27 allocations (${activeLessonCount} assigned periods)`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ color: 'var(--apex-text-tertiary, #94a3b8)', fontSize: 13 }}>Assigned lessons:</div>
              <div style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderRadius: 12, padding: '6px 14px', fontWeight: 800 }}>
                {activeLessonCount} / {DAYS.length * numPeriods}
              </div>
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
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#38bdf8', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', position: 'sticky', left: 0, zIndex: 3, background: 'var(--apex-bg-subtle, #0a192f)' }}>
                      Day
                    </th>
                    {periods.map(period => (
                      <th key={period} style={{ padding: '12px 10px', textAlign: 'center', color: '#38bdf8', borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
                        {period}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map(day => (
                    <tr key={day} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#f8fafc', background: 'var(--apex-bg-subtle, #0a192f)', position: 'sticky', left: 0, zIndex: 2 }}>
                        {day}
                      </td>
                      {periods.map(period => {
                        const cell = assignments[day]?.[period] || {}
                        return (
                          <td key={period} style={{ padding: 6, verticalAlign: 'top' }}>
                            <div style={{
                              display: 'grid',
                              gap: 6,
                              padding: 8,
                              borderRadius: 12,
                              background: cell.subject ? 'rgba(56, 189, 248, 0.06)' : 'var(--apex-bg-surface, #0f2942)',
                              border: cell.subject ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(255,255,255,0.06)'
                            }}>
                              <div>
                                <select
                                  value={cell.subject || ''}
                                  onChange={e => handleChange(day, period, 'subject', e.target.value)}
                                  style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, height: 32 }}
                                >
                                  <option value="">— Subject —</option>
                                  {subjectOptions.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                </select>
                              </div>
                              <div>
                                <select
                                  value={cell.teacher || ''}
                                  onChange={e => handleChange(day, period, 'teacher', e.target.value)}
                                  style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, height: 32 }}
                                >
                                  <option value="">— Unassigned —</option>
                                  {teacherOptions.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                              </div>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Period Timings Modal */}
      {showBellsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{ maxWidth: 860, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button
              onClick={() => setShowBellsModal(false)}
              style={{
                position: 'absolute',
                top: 14,
                right: 18,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                fontSize: 18,
                width: 32,
                height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              ✕
            </button>
            <BellSchedulePanel />
          </div>
        </div>
      )}

      {/* Staff Workload & Clash Modal */}
      {showWorkloadModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            maxWidth: 960,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#0d2238',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 20,
            padding: 28,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            position: 'relative',
            color: '#fff'
          }}>
            <button
              onClick={() => setShowWorkloadModal(false)}
              style={{
                position: 'absolute',
                top: 14,
                right: 18,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                fontSize: 18,
                width: 32,
                height: 32,
                borderRadius: '50%',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <div style={{ marginBottom: 20 }}>
              <span style={{ background: '#0284c7', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, letterSpacing: 1.2 }}>
                ACADEMIC AUDIT
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 4px', color: '#f8fafc' }}>
                Staff Teaching Workload & Conflict Analysis
              </h2>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>
                Verified teacher assignments across all classes, sections, and weekdays. Combined-class arrangements are approved.
              </div>
            </div>

            {/* Clash Alerts */}
            {workloadData?.clashes?.length > 0 && (
              <div style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <h4 style={{ color: '#fde047', margin: '0 0 8px', fontSize: 14 }}>
                  ⚠️ Multi-Section Scheduling Notes ({workloadData.clashes.length})
                </h4>
                <div style={{ display: 'grid', gap: 6 }}>
                  {workloadData.clashes.map((c, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#fef08a' }}>
                      • <strong>{c.teacher_display_name}</strong> on {c.day_name} at {c.period_label}: teaching classes {c.classes?.join(', ')} ({c.note || 'Combined arrangement'})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workload Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    <th style={{ padding: '10px 12px', color: '#38bdf8', fontSize: 13 }}>Teacher Name</th>
                    <th style={{ padding: '10px 12px', color: '#38bdf8', fontSize: 13 }}>Weekly Periods</th>
                    <th style={{ padding: '10px 12px', color: '#38bdf8', fontSize: 13 }}>Primary Subjects</th>
                    <th style={{ padding: '10px 12px', color: '#38bdf8', fontSize: 13 }}>Classes Taught</th>
                  </tr>
                </thead>
                <tbody>
                  {workloadData?.workload?.map((w, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#f8fafc' }}>{w.teacher_display_name}</td>
                      <td style={{ padding: '10px 12px', color: '#38bdf8', fontWeight: 700 }}>{w.total_periods}</td>
                      <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 13 }}>{w.subjects?.join(', ') || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 13 }}>{w.classes?.join(', ') || '—'}</td>
                    </tr>
                  ))}
                  {(!workloadData || !workloadData.workload?.length) && (
                    <tr>
                      <td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>
                        Loading workload records...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

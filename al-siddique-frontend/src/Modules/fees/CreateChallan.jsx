import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from '../moduleStyles'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import { useAcademicStore } from '../../services/useAcademicStore'
import { printChallan, printBatchChallans } from './ViewChallans'
import SearchableStudentPicker from './SearchableStudentPicker'
import SmartExistingChallanPanel from './SmartExistingChallanPanel'
import { trackRecentChallan } from './feeWorkflowStorage'
import { FEE_HEADS, MONTHS, defaultFeeAmounts, sumFeeAmounts } from './feeConstants'

export default function CreateChallan() {
  const navigate = useNavigate()
  const { classNames: CLASSES, sectionsForClass } = useAcademicStore()
  const [mode, setMode] = useState('single')
  const { paperSettings } = usePaperStore()
  const school = {
    name: paperSettings.schoolName,
    urdu: paperSettings.schoolUrdu,
    address: paperSettings.address,
    logo: paperSettings.logo,
    showUrduHeader: paperSettings.showUrduHeader,
  }
  const [createdChallans, setCreatedChallans] = useState([])
  const [feeSettings, setFeeSettings] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [studentRecord, setStudentRecord] = useState(null)
  const [classFilter, setClassFilter] = useState('')
  const [existingChallan, setExistingChallan] = useState(null)
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()])
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [dueDate, setDueDate] = useState('')
  const [discount, setDiscount] = useState(0)
  const [selectedHeads, setSelectedHeads] = useState(FEE_HEADS.reduce((a, h) => ({ ...a, [h]: true }), {}))
  const [amounts, setAmounts] = useState(defaultFeeAmounts())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [clsClass, setClsClass] = useState('')
  const [clsSection, setClsSection] = useState('')
  const [clsMonth, setClsMonth] = useState(MONTHS[new Date().getMonth()])
  const [clsYear, setClsYear] = useState(String(new Date().getFullYear()))
  const [clsDueDate, setClsDueDate] = useState('')
  const [clsHeads, setClsHeads] = useState(FEE_HEADS.reduce((a, h) => ({ ...a, [h]: true }), {}))
  const [clsAmounts, setClsAmounts] = useState(defaultFeeAmounts())
  const [clsDiscount, setClsDiscount] = useState(0)
  const [clsSaving, setClsSaving] = useState(false)
  const [clsMessage, setClsMessage] = useState('')
  const [clsError, setClsError] = useState('')

  useEffect(() => {
    api.get('/api/fees/settings').then((r) => setFeeSettings(r.data?.data?.classSettings || [])).catch(() => setFeeSettings([]))
  }, [])

  useEffect(() => {
    if (!CLASSES.length) return
    setClsClass((prev) => (CLASSES.includes(prev) ? prev : CLASSES[0]))
  }, [CLASSES])

  const classMonthlyFee = (className) => {
    const found = feeSettings.find((item) => item.class_name === className && item.active !== false)
    return Number(found?.monthly_fee || 2500)
  }

  const applyStudentFeeAuto = async (student) => {
    if (!student?.id) return
    setStudentRecord(student)
    const fee = classMonthlyFee(student.class)
    setAmounts((prev) => ({ ...defaultFeeAmounts(fee), ...prev, 'Monthly Fee': fee }))
    try {
      const profileRes = await api.get(`/api/students/${student.id}/fee-profile`)
      const p = profileRes.data?.data
      if (p) {
        setAmounts({
          'Monthly Fee': Number(p.monthly_fee || fee),
          'Admission Fee': Number(p.admission_fee || 0),
          'Registration Fee': Number(p.registration_fee || 0),
          'Library Fee': Number(p.library_fee || 0),
          'Transport Fee': Number(p.transport_fee || 0),
          'Exam Fee': Number(p.exam_fee || 0),
          'Other Charges': Number(p.other_charges || 0),
        })
      }
    } catch { /* profile optional */ }
  }

  useEffect(() => {
    if (!selectedStudent || !month || !year) {
      setExistingChallan(null)
      return
    }
    api.get('/api/fees/existing', { params: { student_id: selectedStudent, month, year } })
      .then((r) => setExistingChallan(r.data?.exists ? r.data.data : null))
      .catch(() => setExistingChallan(null))
  }, [selectedStudent, month, year])

  const total = useMemo(() => Math.max(0, sumFeeAmounts(amounts, selectedHeads) - Number(discount || 0)), [amounts, selectedHeads, discount])
  const clsTotal = useMemo(() => Math.max(0, sumFeeAmounts(clsAmounts, clsHeads) - Number(clsDiscount || 0)), [clsAmounts, clsHeads, clsDiscount])

  const sectionOptions = clsClass ? (sectionsForClass(clsClass).length ? sectionsForClass(clsClass) : ['Blue']) : ['Blue']

  useEffect(() => {
    if (!clsClass) return
    const fee = classMonthlyFee(clsClass)
    setClsAmounts((prev) => ({ ...prev, 'Monthly Fee': fee }))
    const sections = sectionsForClass(clsClass)
    if (sections.length && !sections.includes(clsSection)) setClsSection(sections[0])
  }, [clsClass, feeSettings]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (event) => {
    event.preventDefault()
    if (!selectedStudent) return
    if (existingChallan) {
      setError('Challan already exists for this month. Use the actions below or pick another month.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const gross = sumFeeAmounts(amounts, selectedHeads)
      const resp = await api.post('/api/fees', {
        student_id: Number(selectedStudent),
        month,
        year: Number(year),
        amount: gross,
        discount: Number(discount || 0),
        due_date: dueDate || null,
      })
      const ch = resp.data?.data || {}
      const row = {
        ...ch,
        name: studentRecord?.name,
        gr_number: studentRecord?.gr_number,
        class: studentRecord?.class,
        section: studentRecord?.section,
        father_name: studentRecord?.father_name,
        month,
        year: Number(year),
        amount: ch.amount || total,
        due_date: dueDate || null,
        status: 'unpaid',
      }
      setCreatedChallans([row])
      trackRecentChallan(studentRecord)
      setMessage(`Challan created for ${studentRecord?.name || 'student'} — Rs. ${total.toLocaleString()}`)
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.data) {
        setExistingChallan(err.response.data.data)
        setError('Current challan found for this month.')
      } else {
        setError(err.response?.data?.message || 'Failed to create challan.')
      }
    } finally {
      setSaving(false)
    }
  }

  const submitClassChallans = async () => {
    setClsSaving(true)
    setClsMessage('')
    setClsError('')
    try {
      const r = await api.get('/api/students', { params: { class: clsClass, section: clsSection } })
      const list = r.data.data || []
      if (!list.length) {
        setClsError(`No students found in ${clsClass} — ${clsSection}.`)
        setClsSaving(false)
        return
      }
      let created = 0
      let skipped = 0
      const allCreated = []
      const gross = sumFeeAmounts(clsAmounts, clsHeads)
      for (const s of list) {
        try {
          const resp = await api.post('/api/fees', {
            student_id: s.id,
            month: clsMonth,
            year: Number(clsYear),
            amount: gross,
            discount: Number(clsDiscount || 0),
            due_date: clsDueDate || null,
          })
          const ch = resp.data?.data || {}
          allCreated.push({
            ...ch,
            name: s.name,
            gr_number: s.gr_number,
            class: s.class || clsClass,
            section: s.section || clsSection,
            father_name: s.father_name,
            month: clsMonth,
            year: Number(clsYear),
            amount: ch.amount || clsTotal,
            status: 'unpaid',
          })
          created++
        } catch (err) {
          if (err.response?.status === 409) skipped++
          else skipped++
        }
      }
      setCreatedChallans(allCreated)
      setClsMessage(`Created ${created} challans. ${skipped > 0 ? `${skipped} skipped (already exist).` : ''}`)
    } catch {
      setClsError('Failed to load students.')
    } finally {
      setClsSaving(false)
    }
  }

  const tabStyle = (active) => ({
    padding: '10px 22px',
    borderRadius: 10,
    border: active ? 'none' : '1px solid rgba(148,163,184,0.18)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 13,
    background: active ? 'linear-gradient(135deg,#C8991A,#e8b420)' : 'rgba(11,44,77,0.92)',
    color: active ? '#071e34' : '#8892A4',
  })

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 24 }}>
        <div className="super-module-card" style={{ ...card, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
          <div>
            <h1 style={sectionHeader}>Create Challan</h1>
            <p style={{ color: C.muted, marginTop: 8 }}>Search students quickly — no long dropdown scroll.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={tabStyle(mode === 'single')} onClick={() => { setMode('single'); setCreatedChallans([]) }}>Single Student</button>
            <button type="button" style={tabStyle(mode === 'class')} onClick={() => { setMode('class'); setCreatedChallans([]) }}>Class Wise</button>
          </div>
        </div>

        {mode === 'single' && (
          <form className="super-module-card" onSubmit={submit} style={{ ...card, display: 'grid', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <SearchableStudentPicker
                  value={selectedStudent}
                  onChange={setSelectedStudent}
                  onStudentSelect={applyStudentFeeAuto}
                  classFilter={classFilter}
                  onClassFilterChange={setClassFilter}
                />
              </div>
              <div>
                <label style={labelStyle}>Month</label>
                <select style={select} value={month} onChange={(e) => { setMonth(e.target.value); setError('') }}>
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Year</label>
                <select style={select} value={year} onChange={(e) => { setYear(e.target.value); setError('') }}>
                  {['2024', '2025', '2026', '2027'].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input type="date" style={input} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            {studentRecord && (
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(7,30,52,0.45)', fontSize: 13, color: C.muted }}>
                Auto-filled: <strong style={{ color: C.silver }}>{studentRecord.class} / {studentRecord.section}</strong>
                {' · '}Monthly Rs. {classMonthlyFee(studentRecord.class).toLocaleString()}
              </div>
            )}

            <SmartExistingChallanPanel
              challan={existingChallan}
              school={school}
              onEdit={() => navigate('/fees/view')}
              onRegenerate={async (ch) => {
                await api.post(`/api/fees/${ch.id}/regenerate`, { amount: ch.amount, discount: ch.discount, due_date: ch.due_date })
                setMessage('Challan regenerated')
                setExistingChallan(null)
              }}
              onDismiss={() => setExistingChallan(null)}
            />

            <div style={{ display: 'grid', gap: 16 }}>
              {FEE_HEADS.map((head) => (
                <div key={head} style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.silver, fontWeight: 700 }}>
                    <input type="checkbox" checked={selectedHeads[head]} onChange={() => setSelectedHeads((prev) => ({ ...prev, [head]: !prev[head] }))} />
                    {head}
                  </label>
                  <input style={{ ...input, opacity: selectedHeads[head] ? 1 : 0.4 }} type="number" value={amounts[head]}
                    disabled={!selectedHeads[head]} onChange={(e) => setAmounts((prev) => ({ ...prev, [head]: Number(e.target.value) }))} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 16, alignItems: 'center' }}>
              <div>
                <label style={labelStyle}>Discount (Rs.)</label>
                <input style={input} type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div>
                <div style={{ color: C.muted, fontSize: 13 }}>Total</div>
                <div style={{ color: C.gold, fontSize: 28, fontWeight: 800 }}>Rs. {total.toLocaleString()}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="submit" style={btnPrimary} disabled={saving || !selectedStudent || !!existingChallan}>
                {saving ? 'Creating…' : 'Create Challan'}
              </button>
              {message && <span style={{ color: C.green, fontWeight: 700 }}>{message}</span>}
              {error && <span style={{ color: C.red, fontWeight: 700 }}>{error}</span>}
            </div>
          </form>
        )}

        {mode === 'class' && (
          <div className="super-module-card" style={{ ...card, display: 'grid', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              <div>
                <label style={labelStyle}>Class</label>
                <select style={select} value={clsClass} onChange={(e) => setClsClass(e.target.value)}>
                  {CLASSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Section</label>
                <select style={select} value={clsSection} onChange={(e) => setClsSection(e.target.value)}>
                  {sectionOptions.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Month</label>
                <select style={select} value={clsMonth} onChange={(e) => setClsMonth(e.target.value)}>
                  {MONTHS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Year</label>
                <select style={select} value={clsYear} onChange={(e) => setClsYear(e.target.value)}>
                  {['2024', '2025', '2026', '2027'].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input type="date" style={input} value={clsDueDate} onChange={(e) => setClsDueDate(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" style={btnPrimary} onClick={submitClassChallans} disabled={clsSaving}>
                {clsSaving ? 'Creating…' : `Create for ${clsClass}`}
              </button>
              {clsMessage && <span style={{ color: C.green, fontWeight: 700 }}>{clsMessage}</span>}
              {clsError && <span style={{ color: C.red, fontWeight: 700 }}>{clsError}</span>}
            </div>
          </div>
        )}

        {createdChallans.length > 0 && (
          <div className="super-module-card" style={{ ...card, display: 'grid', gap: 16 }}>
            <div style={{ color: C.gold, fontWeight: 800 }}>Created ({createdChallans.length})</div>
            {createdChallans.length > 1 && (
              <button type="button" style={btnSecondary} onClick={() => printBatchChallans(createdChallans, school)}>Print all</button>
            )}
            {createdChallans.map((ch, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span>{ch.name} · {ch.month} {ch.year} · Rs. {Number(ch.amount).toLocaleString()}</span>
                <button type="button" style={btnSecondary} onClick={() => printChallan(ch, school)}>Print voucher</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

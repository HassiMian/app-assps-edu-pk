import { useEffect, useMemo, useState } from 'react'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import './schoolDocumentStudio.css'

const STANDARD_FORMATS = [
  { key: 'notice', label: 'General Notice', subtitle: 'School announcements', title: 'Important School Notice', body: 'This is to inform all concerned that ', audience: 'school' },
  { key: 'circular', label: 'Parent Circular', subtitle: 'Announcements for guardians', title: 'Circular for Parents', body: 'Dear Parents / Guardians,\nWe would like to inform you that ', audience: 'parents' },
  { key: 'office_order', label: 'Office Order', subtitle: 'Formal management directions', title: 'Office Order', body: 'All concerned staff members are directed to ', audience: 'staff' },
  { key: 'memo', label: 'Staff Memorandum', subtitle: 'Internal instructions', title: 'Staff Memorandum', body: 'All teaching and administrative staff are informed that ', audience: 'staff' },
  { key: 'general_datesheet', label: 'General Date Sheet', subtitle: 'No student names or IDs', title: 'Examination Date Sheet', body: 'The following general examination schedule is issued for the selected class.', audience: 'students' },
  { key: 'academic_timetable', label: 'Academic Timetable', subtitle: 'Class • subject • teacher', title: 'Class Academic Timetable', body: 'Please follow the approved class timetable below.', audience: 'students' },
  { key: 'bell_schedule', label: 'Period Timings', subtitle: 'Assembly • periods • Friday', title: 'Revised School Period Timings', body: 'The following school-wide bell timings will be observed.', audience: 'school' },
  { key: 'consent', label: 'Consent Circular', subtitle: 'Parent action/permission', title: 'Parent Consent Notice', body: 'Dear Parents,\nPlease review the following information and provide consent through the approved school process.', audience: 'parents' },
  { key: 'staff_acknowledgement', label: 'Staff Acknowledgement', subtitle: 'Signature collection form', title: 'Staff Instruction & Acknowledgement', body: 'All concerned teachers are requested to review these instructions and acknowledge receipt.', audience: 'staff' },
  { key: 'custom', label: 'Custom Document', subtitle: 'Write your own document', title: 'School Communication', body: '', audience: 'school' }
]

const HR_FORMATS = [
  { key: 'staff_punctuality', label: 'Punctuality Notice', subtitle: 'Late-arrival record & policy guidance', title: 'Notice Regarding Punctuality & Reporting Time', body: 'It has been recorded that you reported late on the date specified below. All staff members are required to report by 08:15 AM prior to the morning assembly.', audience: 'staff_private' },
  { key: 'staff_absence', label: 'Absence Clarification', subtitle: 'Unauthorized absence inquiry', title: 'Explanation Request Regarding Absence', body: 'School records indicate that you remained absent on the specified date without prior sanctioned leave or formal notification to the administration.', audience: 'staff_private' },
  { key: 'duty_concern', label: 'Duty Performance Concern', subtitle: 'Supervision / classroom instruction', title: 'Notice Concerning Assigned Duty Compliance', body: 'This notice is issued regarding the performance and fulfillment of your assigned institutional duties.', audience: 'staff_private' },
  { key: 'staff_warning', label: 'Formal Written Warning', subtitle: 'Institutional policy non-compliance', title: 'Formal Written Warning', body: 'Following previous administrative discussions and observed non-compliance with institutional regulations, this formal written warning is placed on record.', audience: 'staff_private' },
  { key: 'show_cause', label: 'Show Cause Notice', subtitle: 'Formal institutional explanation request', title: 'Show Cause Notice', body: 'You are hereby directed to submit a written explanation within the stipulated deadline as to why administrative action should not be taken in connection with the incident noted below.', audience: 'staff_private' },
  { key: 'improvement_plan', label: 'Performance Improvement', subtitle: 'Structured coaching & milestone review', title: 'Staff Professional Improvement Plan', body: 'In accordance with institutional standards, the following structured improvement plan has been established to support your professional responsibilities.', audience: 'staff_private' },
  { key: 'staff_appreciation', label: 'Letter of Appreciation', subtitle: 'Professional excellence recognition', title: 'Letter of Commendation & Appreciation', body: 'The management of Al Siddique Scholars Public School takes pleasure in commending your dedicated service and academic excellence.', audience: 'staff_private' }
]

const ALL_FORMATS = [...STANDARD_FORMATS, ...HR_FORMATS]

const PRESETS=[
 ['holiday','Holiday / Closure','notice','School Holiday Notice','The school will remain closed on [date/day] on account of [reason]. Classes will resume on [reopening date] according to the regular schedule.','parents'],
 ['hours','Revised School Hours','circular','Revised School Timings','Dear Parents / Guardians,\nPlease note that revised school timings will take effect from [date]. Regular days and Friday timings will follow the officially approved Period Timings schedule.','parents'],
 ['exams','Examination Guidance','circular','First Term Examination Guidelines','Dear Parents / Guardians,\nPlease ensure students arrive on time, bring their required stationery and follow the examination timetable issued by the school.','parents'],
 ['ptm','Parent–Teacher Meeting','circular','Parent–Teacher Meeting','Dear Parents / Guardians,\nYou are invited to attend the Parent–Teacher Meeting on [date], from [start time] to [end time], at the school campus. Your participation is important for discussing student learning.','parents'],
 ['fees','Fee Due Date','notice','Monthly Fee Submission Reminder','Dear Parents / Guardians,\nPlease submit the school fee for [month] by [due date] using the official school payment process. Contact the school office for assistance with your account.','parents'],
 ['admissions','Admissions Open','notice','New Admissions Announcement','Admissions for [academic session] are now open for eligible classes. Parents may contact the school office for admission requirements, available places and official documentation.','school'],
 ['attendance','Attendance & Punctuality','circular','Student Attendance and Punctuality','Dear Parents / Guardians,\nRegular attendance and timely arrival support academic progress. Kindly ensure students report to school before assembly and inform the office of any approved absence.','parents'],
 ['uniform','Uniform / School Dress','circular','School Uniform Guidelines','Dear Parents / Guardians,\nPlease ensure that students attend school in the prescribed neat school uniform. For uniform queries, kindly contact the school office.','parents'],
 ['health','Health Advisory','notice','Student Health Advisory','Dear Parents / Guardians,\nPlease follow the current school health precautions. Students who are unwell should rest at home and seek appropriate medical advice. Any updated school measures will be communicated through official channels.','parents'],
 ['weather','Weather & Safety','notice','School Safety Advisory','Due to [weather/safety situation], the school is issuing the following precautionary instructions. Official operating-hour changes, if any, will be communicated separately.','school'],
 ['event','School Event','notice','School Event Announcement','The school will organize [event name] on [date] at [venue/time]. Students and parents are requested to follow the announced schedule and participation guidelines.','school'],
 ['trip','Educational Visit & Consent','consent','Educational Visit Information and Consent','Dear Parents / Guardians,\nThe school proposes an educational visit to [destination] on [date]. Detailed supervision, transport and consent instructions will be shared through official channels. Participation requires appropriate permission.','parents'],
 ['results','Result / Report Distribution','circular','Academic Report Distribution','Dear Parents / Guardians,\nAcademic reports for [term] will be distributed on [date] at [time]. Please follow the school office instructions for collection and review.','parents'],
 ['staff-meeting','Staff Meeting','memo','Staff Meeting Notice','All teaching and administrative staff are requested to attend the scheduled staff meeting on [date] at [time/venue]. Please come prepared with the relevant academic updates.','staff'],
 ['staff-duty','Teacher Duty Instructions','office_order','Teacher Duty Allocation Notice','All concerned teachers are directed to follow the approved duty roster for [period/date]. Reporting arrangements, supervisory responsibilities and any substitutions will be communicated by the school administration.','staff'],
 ['invigilation','Exam Invigilation','office_order','Examination Invigilation Instructions','All assigned invigilators must report at [time] on [date], follow the approved examination procedures and maintain required confidentiality and attendance records.','staff'],
 ['ack','Staff Receipt & Acknowledgement','staff_acknowledgement','Staff Notice Acknowledgement','All concerned employees are requested to review this official instruction and sign the acknowledgement register after reading. A signature confirms receipt, not automatic agreement to any additional terms.','staff'],
 ['curriculum','Syllabus / Academic Plan','circular','Academic Planning Update','Dear Parents / Guardians,\nUpdated class learning targets and syllabus expectations for [term] are available from the school. Please refer to the authorized classroom diary and academic guidance.','parents'],
]
const LAYOUTS=[{key:'prism',name:'Prism Signature'},{key:'authority',name:'Executive Authority'},{key:'academic',name:'Academic Ledger'},{key:'minimal',name:'Ink-Saving Classic'}]

const initialDoc = (kind) => {
  const item = ALL_FORMATS.find(f => f.key === kind) || ALL_FORMATS[0]
  const isHr = HR_FORMATS.some(f => f.key === kind)
  return {
    document_kind: item.key,
    title: item.title,
    language: 'english',
    audience_kind: item.audience || (isHr ? 'staff_private' : 'school'),
    audience_classes: [],
    target_employee_id: null,
    target_employee_name: '',
    layout_key: isHr ? 'authority' : 'prism',
    source_type: null,
    source_ref: null,
    source_revision: null,
    content: {
      message: item.body,
      incident_date: '',
      incident_description: '',
      policy_reference: isHr ? 'Staff Code of Conduct & Operational Regulations 2026' : '',
      action_required: '',
      response_deadline: '',
      note: '',
      signer_label: 'Principal',
      issue_date: new Date().toLocaleDateString('en-CA'),
      schedule_rows: []
    }
  }
}

const prettyKind = (key) => ALL_FORMATS.find(f => f.key === key)?.label || 'School Document'

function formatDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(s || ''))) return s || ''
  const parts = String(s).slice(0, 10).split('-')
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function DisplayRows({ rows }) {
  if (!rows?.length) return <p className="sd-empty">No verified source rows loaded. Import the school record before printing this document.</p>
  return (
    <table className="sd-print-table">
      <thead>
        <tr>
          <th>Activity / Date</th>
          <th>Subject / Class</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td>{r.label || formatDate(r.date)}</td>
            <td>{r.subject || r.class || '—'}</td>
            <td>{r.start}{r.end ? ' – ' + r.end : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SchoolPaper({ document, branding, previewStatus, onAcknowledge }) {
  const d = document.content || {}
  const isHr = HR_FORMATS.some(f => f.key === document.document_kind) || document.audience_kind === 'staff_private'

  return (
    <article
      className={`sd-paper sd-paper--${document.layout_key || 'prism'}`}
      lang={document.language === 'urdu' ? 'ur' : 'en'}
      dir={document.language === 'urdu' ? 'rtl' : 'ltr'}
    >
      <div className="sd-edge" />
      {previewStatus === 'draft' && <div className="sd-draft-watermark">DRAFT / UNAPPROVED</div>}

      <header className="sd-paper-head">
        <div className="sd-brandmark">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="School Logo" />
          ) : (
            <div className="sd-logo-missing">AL-SIDDIQUE</div>
          )}
        </div>
        <div className="sd-head-words">
          <div className="sd-eyebrow">
            {isHr ? 'CONFIDENTIAL PERSONNEL RECORD — PRIVATE & RESTRICTED' : (branding.schoolName || 'OFFICIAL SCHOOL RECORD')}
          </div>
          <h1>{branding.schoolName || 'School Notice'}</h1>
          <p>{branding.address || ''}</p>
        </div>
        <div className="sd-head-mark">
          OFFICIAL RECORD<br />
          {document.reference_no ? (
            <strong style={{ color: '#0284c7' }}>{document.reference_no}</strong>
          ) : (
            'AUTHENTICATED SAAS'
          )}
        </div>
      </header>

      <section className="sd-hero">
        <span>{prettyKind(document.document_kind)}</span>
        <h2>{document.title || 'Official Document'}</h2>
        <p>Audience: {(document.audience_kind || 'school').replace('_', ' ')}</p>
      </section>

      {/* Target Employee Bar for HR Notices */}
      {isHr && (document.target_employee_name || d.incident_date || d.policy_reference) && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderLeft: '4px solid #0284c7',
          padding: '12px 16px',
          margin: '16px 0',
          borderRadius: 6,
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12 }}>
            {document.target_employee_name && (
              <div>
                <strong style={{ color: '#475569', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>Addressed Employee</strong>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{document.target_employee_name}</span>
              </div>
            )}
            {d.incident_date && (
              <div>
                <strong style={{ color: '#475569', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>Incident / Observation Date</strong>
                <span style={{ fontSize: 13, color: '#0f172a' }}>{formatDate(d.incident_date)}</span>
              </div>
            )}
            {d.policy_reference && (
              <div>
                <strong style={{ color: '#475569', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>Institutional Policy Reference</strong>
                <span style={{ fontSize: 12, color: '#334155' }}>{d.policy_reference}</span>
              </div>
            )}
            {d.response_deadline && (
              <div>
                <strong style={{ color: '#b91c1c', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>Written Response Deadline</strong>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>{formatDate(d.response_deadline)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sd-metadata">
        <div>
          <b>Issued Date</b>
          <span>{formatDate(d.issue_date)}</span>
        </div>
        <div>
          <b>Authorization</b>
          <span>{d.signer_label || 'Principal'}</span>
        </div>
        <div>
          <b>Document Status</b>
          <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{previewStatus}</span>
        </div>
      </div>

      <div className="sd-body">
        {d.message && <p style={{ whiteSpace: 'pre-line' }}>{d.message}</p>}
        {d.incident_description && (
          <div style={{ margin: '14px 0', padding: '10px 14px', background: '#f1f5f9', borderRadius: 6, borderLeft: '3px solid #64748b' }}>
            <strong style={{ display: 'block', fontSize: 11, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>Observed Incident / Details</strong>
            <div style={{ whiteSpace: 'pre-line', color: '#1e293b' }}>{d.incident_description}</div>
          </div>
        )}
      </div>

      <DisplayRows rows={d.schedule_rows} />

      {d.action_required && (
        <div className="sd-action">
          <strong>Required Action / Clarification</strong>
          <p style={{ whiteSpace: 'pre-line' }}>{d.action_required}</p>
        </div>
      )}

      {d.note && (
        <div className="sd-note">
          <strong>Institutional Note:</strong> {d.note}
        </div>
      )}

      {/* Recipient Acknowledgment Section */}
      {document.acknowledged_at ? (
        <div style={{
          marginTop: 24,
          padding: '12px 16px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid #10b981',
          borderRadius: 8,
          fontSize: 12,
          fontFamily: 'Arial, sans-serif'
        }}>
          <strong style={{ color: '#047857', display: 'block', marginBottom: 4 }}>
            ✓ Employee Receipt Acknowledged
          </strong>
          <div style={{ color: '#065f46' }}>
            Confirmed on {new Date(document.acknowledged_at).toLocaleString('en-GB')}.
            {document.employee_notes && <span> Note: "{document.employee_notes}"</span>}
          </div>
          <small style={{ color: '#6b7280', display: 'block', marginTop: 4 }}>
            Receipt acknowledgment confirms notice delivery and does not constitute admission of fault or automatic agreement.
          </small>
        </div>
      ) : isHr && previewStatus === 'published' ? (
        <div style={{
          marginTop: 24,
          padding: '14px 18px',
          background: '#fffbeb',
          border: '1px solid #f59e0b',
          borderRadius: 8,
          fontSize: 12,
          fontFamily: 'Arial, sans-serif'
        }}>
          <strong style={{ color: '#b45309', display: 'block', marginBottom: 6 }}>
            Formal Employee Receipt & Acknowledgment Register
          </strong>
          <p style={{ color: '#78350f', margin: '0 0 10px' }}>
            The recipient employee is requested to review this confidential notice and acknowledge receipt. Acknowledging receipt confirms notification delivery only.
          </p>
          {onAcknowledge && (
            <button
              onClick={onAcknowledge}
              style={{
                background: '#d97706',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Sign & Acknowledge Receipt
            </button>
          )}
        </div>
      ) : null}

      <footer className="sd-document-footer">
        <div>
          <div className="sd-signature-line" />
          <strong>{d.signer_label || 'Principal'}</strong>
          <small>{branding.schoolName || 'School Office'}</small>
        </div>
        <div className="sd-footer-right">
          Officially Issued Communication
        </div>
      </footer>
    </article>
  )
}

export default function SchoolDocumentStudio() {
  const branding = useTenantBranding()
  const { user } = useAuth()
  const isLeader = ['admin', 'super_admin', 'school_admin', 'principal'].includes(String(user?.role || ''))

  const [activeTab, setActiveTab] = useState('general') // 'general' | 'hr'
  const [draft, setDraft] = useState(() => initialDoc('notice'))
  const [selectedId, setSelectedId] = useState(null)
  const [status, setStatus] = useState('draft')
  const [revision, setRevision] = useState(1)
  const [saved, setSaved] = useState([])
  const [employees, setEmployees] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [ackModalOpen, setAckModalOpen] = useState(false)
  const [ackNotes, setAckNotes] = useState('')

  const [source, setSource] = useState({ class: '', section: '', session: '2026-2027', term: 'First Term' })

  // Detect unresolved placeholders
  const unresolvedPlaceholders = useMemo(() => {
    const text = `${draft.title} ${draft.content?.message || ''} ${draft.content?.action_required || ''}`
    const matches = text.match(/\[([^[\]]+)\]/g)
    return matches ? [...new Set(matches)] : []
  }, [draft.title, draft.content])

  // 1. Load document library
  const loadLibrary = async () => {
    try {
      const res = await api.get('/api/school-documents')
      const rows = Array.isArray(res.data?.data) ? res.data.data : []
      setSaved(rows)
    } catch (e) {
      console.warn('Documents library load error:', e.message)
    }
  }

  // 2. Load employees list for HR selector
  const loadEmployees = async () => {
    try {
      const res = await api.get('/api/school-documents/employees/list')
      const rows = Array.isArray(res.data?.data) ? res.data.data : []
      setEmployees(rows)
    } catch (e) {
      console.warn('Employees list load error:', e.message)
    }
  }

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) { loadLibrary(); if (isLeader) loadEmployees() } })
    return () => { active = false }
  }, [isLeader])

  const chooseKind = (kind) => {
    const next = initialDoc(kind)
    setDraft(next)
    setSelectedId(null)
    setRevision(1)
    setStatus('draft')
    setMessage(`Switched to ${prettyKind(kind)}. Replace bracketed fields before approval.`)
  }

  const change = (key, val) => setDraft(d => ({ ...d, [key]: val }))
  const changeBody = (key, val) => setDraft(d => ({ ...d, content: { ...d.content, [key]: val } }))

  const handleSelectEmployee = (empId) => {
    const found = employees.find(e => String(e.id) === String(empId))
    if (found) {
      setDraft(d => ({
        ...d,
        target_employee_id: found.id,
        target_employee_name: found.name,
        audience_kind: 'staff_private'
      }))
    } else {
      setDraft(d => ({
        ...d,
        target_employee_id: null,
        target_employee_name: ''
      }))
    }
  }

  const save = async () => {
    setBusy(true)
    setMessage('')
    try {
      const payload = {
        title: draft.title,
        document_kind: draft.document_kind,
        language: draft.language,
        audience_kind: draft.audience_kind,
        audience_classes: draft.audience_classes,
        target_employee_id: draft.target_employee_id,
        target_employee_name: draft.target_employee_name,
        layout_key: draft.layout_key,
        content: draft.content,
        source_type: draft.source_type,
        source_ref: draft.source_ref,
        source_revision: draft.source_revision
      }

      let res
      if (selectedId) {
        res = await api.put(`/api/school-documents/${selectedId}`, payload)
      } else {
        res = await api.post('/api/school-documents', payload)
      }

      const doc = res.data?.data
      if (doc) {
        setSelectedId(doc.id)
        setStatus(doc.status)
        setRevision(doc.revision)
        setDraft(doc)
      }
      setMessage(`Successfully saved draft revision ${doc?.revision || revision}.`)
      loadLibrary()
    } catch (e) {
      setMessage(e.response?.data?.message || e.message || 'Save failed.')
    } finally {
      setBusy(false)
    }
  }

  const doAction = async (action) => {
    if (!selectedId) return
    if (action === 'publish' && unresolvedPlaceholders.length > 0) {
      setMessage(`Cannot publish: Replace all unresolved placeholders first: ${unresolvedPlaceholders.join(', ')}`)
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const res = await api.post(`/api/school-documents/${selectedId}/transition`, {
        action,
        revision
      })
      const doc = res.data?.data
      if (doc) {
        setStatus(doc.status)
        setRevision(doc.revision)
        setDraft(doc)
      }
      setMessage(`Document successfully moved to status: ${doc?.status || action}.`)
      loadLibrary()
    } catch (e) {
      setMessage(e.response?.data?.message || e.message || `Action ${action} failed.`)
    } finally {
      setBusy(false)
    }
  }

  const loadItem = (id) => {
    const item = saved.find(x => x.id === id)
    if (!item) return
    setSelectedId(item.id)
    setStatus(item.status)
    setRevision(item.revision)
    setDraft(item)
    const isHr = HR_FORMATS.some(f => f.key === item.document_kind) || item.audience_kind === 'staff_private'
    setActiveTab(isHr ? 'hr' : 'general')
    setMessage(`Loaded "${item.title}" (${item.status}, rev ${item.revision}).`)
  }

  const handleAcknowledgeReceipt = async () => {
    if (!selectedId) return
    setBusy(true)
    try {
      const res = await api.post(`/api/school-documents/${selectedId}/acknowledge`, {
        notes: ackNotes,
        receipt_only: true
      })
      if (res.data?.data) {
        setDraft(res.data.data)
      }
      setAckModalOpen(false)
      setAckNotes('')
      setMessage('Receipt acknowledgment successfully recorded on the official register.')
      loadLibrary()
    } catch (e) {
      setMessage(e.response?.data?.message || e.message || 'Acknowledgment submission failed.')
    } finally {
      setBusy(false)
    }
  }

  // Source import (Academic Timetable, Bell Schedule, Date Sheet)
  const loadSource = async () => {
    setBusy(true)
    setMessage('')
    try {
      let transformed = []
      let type = null, ref = null, rev = null

      if (draft.document_kind === 'bell_schedule') {
        const res = await api.get('/api/timetable/bells')
        const s = res.data?.data || {}
        transformed = [
          ...(s.regular || []).map(x => ({ label: 'Regular · ' + x.label, start: x.start, end: x.end })),
          ...(s.friday || []).map(x => ({ label: 'Friday · ' + x.label, start: x.start, end: x.end }))
        ]
        type = 'bell_schedule'
        ref = s.academic_session || '2026–27'
        rev = s.version || 'assps-school1-bells-20261016-v1'
      } else if (draft.document_kind === 'academic_timetable') {
        if (!source.class.trim()) throw new Error('Specify a class name first')
        const res = await api.get('/api/timetable', { params: { class: source.class } })
        const list = Array.isArray(res.data?.data) ? res.data.data : []
        transformed = list
          .filter(r => !source.section || String(r.section || '').toLowerCase() === source.section.trim().toLowerCase())
          .map(r => ({
            label: [r.day_name, r.period_label].filter(Boolean).join(' · '),
            subject: [r.subject, r.teacher_display_name].filter(Boolean).join(' • '),
            start: String(r.start_time || '').slice(0, 5),
            end: String(r.end_time || '').slice(0, 5),
            class: source.class
          }))
        type = 'academic_timetable'
        ref = [source.class, source.section].filter(Boolean).join('|')
        rev = 'live-academic-roster-read'
      } else if (draft.document_kind === 'general_datesheet') {
        if (!source.class.trim()) throw new Error('Specify a class name first')
        const res = await api.get('/api/date-sheets', { params: { session: source.session, term: source.term } })
        const list = Array.isArray(res.data?.data) ? res.data.data : []
        transformed = list
          .filter(r => String(r.class || '').toLowerCase() === source.class.trim().toLowerCase())
          .map(r => ({
            date: r.date,
            label: formatDate(r.date),
            subject: (r.subjects || []).join(' / '),
            start: (r.times || []).join(', '),
            class: source.class
          }))
        type = 'general_datesheet'
        ref = [source.session, source.term, source.class].join('|')
        rev = 'live-datesheet-read'
      }

      if (!transformed.length) throw new Error('No matching verified records found; nothing was imported.')
      setDraft(x => ({
        ...x,
        source_type: type,
        source_ref: ref,
        source_revision: rev,
        content: { ...x.content, schedule_rows: transformed }
      }))
      setMessage(`Loaded ${transformed.length} official source rows. Review before saving.`)
    } catch (e) {
      setMessage(e.message || e.response?.data?.message || 'Source import failed.')
    } finally {
      setBusy(false)
    }
  }

  const selectedFormatList = activeTab === 'hr' ? HR_FORMATS : STANDARD_FORMATS
  const isHr = activeTab === 'hr' || draft.audience_kind === 'staff_private' || HR_FORMATS.some(f => f.key === draft.document_kind)
  const locked = status === 'published'

  return (
    <main className="sd-app">
      {/* Top Header */}
      <div className="sd-top">
        <div>
          <div className="sd-overline">ASSPS · SCHOOL DOCUMENT SYSTEM</div>
          <h1>Notice Studio <span>01</span></h1>
          <p>Formal circulars, class-wide documents, period timings, and confidential staff HR notices—built directly from authenticated school records.</p>
        </div>
        <div className="sd-version">
          DESIGN SYSTEM<br />
          <strong>ATELIER / 2026</strong>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="sd-viewport">
        {/* Sidebar */}
        <aside className="sd-sidebar">
          {/* Workspace Mode Toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
            <button
              onClick={() => setActiveTab('general')}
              style={{
                background: activeTab === 'general' ? '#0284c7' : 'rgba(255,255,255,0.06)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 10px',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer'
              }}
            >
              School Notices
            </button>
            <button
              onClick={() => setActiveTab('hr')}
              style={{
                background: activeTab === 'hr' ? '#0d9488' : 'rgba(255,255,255,0.06)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 10px',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer'
              }}
            >
              Staff HR Cases
            </button>
          </div>

          <h3>{activeTab === 'hr' ? 'Staff HR Kinds' : 'Document Library'}</h3>
          <p className="sd-help">
            {activeTab === 'hr'
              ? 'Confidential personnel notices, punctuality records, warnings, and show-cause directives.'
              : 'Choose a professionally structured official school document.'}
          </p>

          {activeTab === 'general' && (
            <div className="sd-presets">
              <label>
                Ready-to-edit templates
                <select
                  defaultValue=""
                  onChange={e => {
                    const t = PRESETS.find(x => x[0] === e.target.value)
                    if (!t) return
                    const next = initialDoc(t[2])
                    setDraft({
                      ...next,
                      title: t[3],
                      audience_kind: t[5],
                      content: { ...next.content, message: t[4] }
                    })
                    setSelectedId(null)
                    setRevision(1)
                    setStatus('draft')
                    setMessage('Official template loaded. Replace bracketed details before requesting approval.')
                  }}
                >
                  <option value="">Choose a notice purpose…</option>
                  {PRESETS.map(x => <option key={x[0]} value={x[0]}>{x[1]}</option>)}
                </select>
              </label>
            </div>
          )}

          {/* Formats list */}
          <div className="sd-kind-list">
            {selectedFormatList.map(item => (
              <button
                key={item.key}
                className={draft.document_kind === item.key ? 'active' : ''}
                onClick={() => chooseKind(item.key)}
              >
                <strong>{item.label}</strong>
                <small>{item.subtitle}</small>
              </button>
            ))}
          </div>

          {/* Saved Documents */}
          <div className="sd-saved">
            <div className="sd-saved-title">
              <strong>Saved documents</strong>
              <button onClick={loadLibrary}>Refresh</button>
            </div>
            {saved.length === 0 && <p className="sd-help">No accessible drafts yet.</p>}
            {saved.map(d => (
              <button key={d.id} onClick={() => loadItem(d.id)}>
                <span>{d.title}</span>
                <small>{d.status} · rev {d.revision} · {d.document_kind}</small>
              </button>
            ))}
          </div>
        </aside>

        {/* Workspace Center */}
        <div className="sd-workspace">
          {/* Action Toolbar */}
          <div className="sd-toolbar">
            <span>Compose / {prettyKind(draft.document_kind)}</span>
            <div className="sd-actions">
              <button disabled={busy || locked} onClick={save}>
                Save Draft
              </button>
              {status === 'draft' && selectedId && (
                <button disabled={busy} onClick={() => doAction('submit')}>
                  Request Approval
                </button>
              )}
              {status === 'submitted' && isLeader && (
                <button disabled={busy} onClick={() => doAction('approve')}>
                  Approve
                </button>
              )}
              {status === 'approved' && isLeader && (
                <button
                  disabled={busy || unresolvedPlaceholders.length > 0}
                  onClick={() => doAction('publish')}
                  title={unresolvedPlaceholders.length > 0 ? `Unresolved: ${unresolvedPlaceholders.join(', ')}` : ''}
                >
                  Publish
                </button>
              )}
              <button
                disabled={status === 'draft'}
                className="sd-print-button"
                onClick={() => window.print()}
              >
                Print / Save PDF
              </button>
            </div>
          </div>

          {/* Messages & Alerts */}
          {message && <div className="sd-info" role="status">{message}</div>}

          {unresolvedPlaceholders.length > 0 && (
            <div style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#fde047', fontSize: 12 }}>
              ⚠️ Unresolved template fields found: <strong>{unresolvedPlaceholders.join(', ')}</strong>. You must replace all bracketed items before publishing.
            </div>
          )}

          {(!branding.logoUrl || branding.error) && (
            <div className="sd-alert">
              School logo is unavailable from SaaS branding. Official print is disabled to prevent wrong-school branding.
              <button onClick={() => branding.refresh?.()}>Retry School Branding</button>
            </div>
          )}

          {/* Form Fields */}
          <div className="sd-fields">
            <label className="wide">
              Document heading
              <input
                disabled={locked}
                value={draft.title}
                onChange={e => change('title', e.target.value)}
                maxLength={220}
              />
            </label>

            {/* If HR mode, show employee selector */}
            {isHr ? (
              <label>
                Target Employee
                <select
                  disabled={locked}
                  value={draft.target_employee_id || ''}
                  onChange={e => handleSelectEmployee(e.target.value)}
                >
                  <option value="">— Select Verified Staff Member —</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.emp_id || `ID: ${emp.id}`}) — {emp.designation || 'Teacher'}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Audience
                <select
                  disabled={locked}
                  value={draft.audience_kind}
                  onChange={e => change('audience_kind', e.target.value)}
                >
                  {['school', 'parents', 'students', 'staff', 'selected_classes'].map(x => (
                    <option key={x} value={x}>{x.replaceAll('_', ' ')}</option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Layout style
              <select
                disabled={locked}
                value={draft.layout_key}
                onChange={e => change('layout_key', e.target.value)}
              >
                {LAYOUTS.map(x => <option key={x.key} value={x.key}>{x.name}</option>)}
              </select>
            </label>

            <label>
              Language
              <select
                disabled={locked}
                value={draft.language}
                onChange={e => change('language', e.target.value)}
              >
                <option value="english">English</option>
                <option value="urdu">Urdu</option>
                <option value="bilingual">Bilingual</option>
              </select>
            </label>

            <label>
              Issued date
              <input
                disabled={locked}
                type="date"
                value={draft.content?.issue_date || ''}
                onChange={e => changeBody('issue_date', e.target.value)}
              />
            </label>

            {/* HR specific fields */}
            {isHr && (
              <>
                <label>
                  Incident / Observation Date
                  <input
                    disabled={locked}
                    type="date"
                    value={draft.content?.incident_date || ''}
                    onChange={e => changeBody('incident_date', e.target.value)}
                  />
                </label>

                <label>
                  Response Deadline
                  <input
                    disabled={locked}
                    type="date"
                    value={draft.content?.response_deadline || ''}
                    onChange={e => changeBody('response_deadline', e.target.value)}
                  />
                </label>

                <label className="wide">
                  Institutional Policy Reference
                  <input
                    disabled={locked}
                    value={draft.content?.policy_reference || ''}
                    onChange={e => changeBody('policy_reference', e.target.value)}
                    placeholder="e.g. Staff Code of Conduct Sec. 4.2 / Punctuality Policy 2026"
                  />
                </label>

                <label className="wide">
                  Incident Description / Observed Facts
                  <textarea
                    disabled={locked}
                    rows={3}
                    value={draft.content?.incident_description || ''}
                    onChange={e => changeBody('incident_description', e.target.value)}
                    placeholder="Accurate, factual description of the incident or attendance record..."
                  />
                </label>
              </>
            )}

            <label className="wide">
              Notice content
              <textarea
                disabled={locked}
                rows={4}
                value={draft.content?.message || ''}
                onChange={e => changeBody('message', e.target.value)}
              />
            </label>

            {draft.audience_kind === 'selected_classes' && (
              <label className="wide">
                Classes (comma separated)
                <input
                  disabled={locked}
                  value={(draft.audience_classes || []).join(', ')}
                  onChange={e => change('audience_classes', e.target.value.split(',').map(x => x.trim()).filter(Boolean))}
                />
              </label>
            )}

            <label className="wide">
              Required action / Explanation requested
              <textarea
                disabled={locked}
                rows={2}
                value={draft.content?.action_required || ''}
                onChange={e => changeBody('action_required', e.target.value)}
              />
            </label>

            <label>
              Signature label
              <input
                disabled={locked}
                value={draft.content?.signer_label || ''}
                onChange={e => changeBody('signer_label', e.target.value)}
              />
            </label>

            <label className="wide">
              Additional note
              <input
                disabled={locked}
                value={draft.content?.note || ''}
                onChange={e => changeBody('note', e.target.value)}
              />
            </label>
          </div>

          {/* Read-Only Source Import */}
          {['general_datesheet', 'academic_timetable', 'bell_schedule'].includes(draft.document_kind) && (
            <div className="sd-import">
              <h3>Verified School Data Import</h3>
              <p>Read-only source import. Academic records in the system are never modified by Notice Studio.</p>
              {draft.document_kind !== 'bell_schedule' && (
                <div className="sd-source-controls">
                  <input
                    placeholder="Class, e.g. Five"
                    value={source.class}
                    onChange={e => setSource(s => ({ ...s, class: e.target.value }))}
                  />
                  <input
                    placeholder="Section, e.g. Blue"
                    value={source.section}
                    onChange={e => setSource(s => ({ ...s, section: e.target.value }))}
                  />
                  {draft.document_kind === 'general_datesheet' && (
                    <>
                      <input
                        placeholder="Session"
                        value={source.session}
                        onChange={e => setSource(s => ({ ...s, session: e.target.value }))}
                      />
                      <input
                        placeholder="Term"
                        value={source.term}
                        onChange={e => setSource(s => ({ ...s, term: e.target.value }))}
                      />
                    </>
                  )}
                </div>
              )}
              <button disabled={busy || locked} onClick={loadSource}>
                Import from SaaS Records
              </button>
              <span>{draft.content?.schedule_rows?.length || 0} source rows loaded</span>
            </div>
          )}

          {/* Preview Canvas */}
          <div className="sd-preview-intro">
            <div>
              <span>PREVIEW MODE</span>
              <h2>Official Print Canvas</h2>
            </div>
            <span>A4 · Authenticated Branding · {status.toUpperCase()}</span>
          </div>

          <SchoolPaper
            document={draft}
            branding={branding}
            previewStatus={status}
            onAcknowledge={() => setAckModalOpen(true)}
            currentUserId={user?.id}
          />
        </div>
      </div>

      {/* Acknowledgment Modal */}
      {ackModalOpen && (
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
            background: '#0d2238',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 20,
            padding: 28,
            maxWidth: 540,
            width: '100%',
            color: '#fff',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, color: '#38bdf8' }}>
              Employee Receipt Acknowledgment
            </h3>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
              By acknowledging receipt, you confirm that you have received and reviewed this official communication. This acknowledges delivery only and does not constitute agreement to any allegations or automatic acceptance of penalties.
            </p>
            <label style={{ display: 'block', margin: '16px 0 6px', fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
              Employee Response / Remarks (Optional):
            </label>
            <textarea
              rows={4}
              value={ackNotes}
              onChange={e => setAckNotes(e.target.value)}
              placeholder="Enter any initial written remarks or explanation..."
              style={{
                width: '100%',
                background: '#071828',
                border: '1px solid #38556a',
                color: '#edfaff',
                borderRadius: 9,
                padding: '10px 12px',
                fontSize: 13,
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => setAckModalOpen(false)}
                disabled={busy}
                style={{
                  background: 'transparent',
                  border: '1px solid #64748b',
                  color: '#cbd5e1',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAcknowledgeReceipt}
                disabled={busy}
                style={{
                  background: '#0284c7',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '9px 20px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                {busy ? 'Submitting...' : 'Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

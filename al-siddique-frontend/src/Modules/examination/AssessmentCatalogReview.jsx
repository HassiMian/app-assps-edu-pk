import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, ShieldCheck, X } from 'lucide-react'
import api from '../../services/api'
import { C, btnSecondary } from '../moduleStyles'

// Principal-facing read-only ledger. No catalog staging, approval or marks writes.
// The server enforces school/role scope and owns all academic evidence decisions.
export default function AssessmentCatalogReview({ exam, onClose }) {
  const epoch = useRef(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [ledger, setLedger] = useState(null)
  const [coverage, setCoverage] = useState(null)
  const examId = Number(exam?.id)
  const refresh = useCallback(async () => {
    const seq = ++epoch.current
    setLoading(true)
    setError('')
    setPreview(null)
    setLedger(null)
    setCoverage(null)
    if (!Number.isSafeInteger(examId) || examId <= 0) {
      setError('Select an existing saved Assessment to review.')
      setLoading(false)
      return
    }
    try {
      const endpoint = `/api/academic-approvals/assessment-catalog/${examId}`
      const [proposal, current, cohortReport] = await Promise.all([
        api.get(`${endpoint}/preview`, { skipCache: true }),
        api.get(`${endpoint}/offerings`, { skipCache: true }),
        api.get('/api/academic-approvals/assessment-catalog/cohort-coverage', { skipCache: true }),
      ])
      if (seq !== epoch.current) return
      const p = proposal?.data?.data
      const l = current?.data?.data
      const coverageSnapshot = cohortReport?.data?.data
      if (proposal?.data?.success !== true || Number(p?.examId) !== examId || current?.data?.success !== true || Number(l?.examId) !== examId) {
        throw new Error('Authenticated catalog review returned inconsistent evidence. No action taken.')
      }
      setPreview(p)
      setLedger(l)
      // Old backend cohort routes use assignment-only shortcuts. Never treat
      // that weaker report as verified teacher+employee+reviewed timetable proof.
      setCoverage(cohortReport?.data?.success === true &&
        coverageSnapshot?.verifiedTeachingPolicy === 'active_teacher_employee_and_reviewed_timetable'
          ? coverageSnapshot : null)
    } catch (cause) {
      if (seq === epoch.current) {
        setError(cause?.response?.data?.code || cause?.response?.data?.message || cause?.message || 'Catalog review unavailable.')
      }
    } finally {
      if (seq === epoch.current) setLoading(false)
    }
  }, [examId])
  useEffect(() => {
    void refresh()
    return () => { epoch.current += 1 }
  }, [refresh])

  const gapsKnown = Array.isArray(preview?.uncoveredCohorts) && Number.isInteger(Number(preview?.totalActiveStudentCohorts))
  const uncovered = gapsKnown ? preview.uncoveredCohorts : []
  const trustedCoverage = coverage && Array.isArray(coverage.cohorts) &&
    Number.isSafeInteger(Number(coverage.uncoveredStudents)) &&
    Number.isSafeInteger(Number(coverage.totalActiveStudents))
  const matchingCoverage = trustedCoverage &&
    Number(coverage.uncoveredCohorts) === uncovered.length &&
    Number(coverage.cohorts.length) === Number(preview?.totalActiveStudentCohorts)
  const fullCoverage = gapsKnown && matchingCoverage &&
    Number(coverage.uncoveredStudents) === 0 && preview?.canStageFullCoverage === true && uncovered.length === 0
  const existingOfferings = Number(ledger?.totalOfferings || 0)
  const candidates = Array.isArray(preview?.candidates) ? preview.candidates : []
  return (
    <section aria-label={`${exam?.name || 'Assessment'} academic subject catalog review`}
      style={{ marginTop: 20, padding: 20, border: `1px solid ${C.border}`, borderRadius: 14, background: 'var(--apex-bg-surface)' }}>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ color: C.gold, fontWeight: 800 }}>Academic catalog — {exam?.name}</div>
          <div style={{ color: C.muted, fontSize: 12 }}>Read-only Principal verification. This screen cannot stage, approve or change marks.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={btnSecondary} disabled={loading} onClick={refresh}>
            <RefreshCw size={14} style={{ verticalAlign: 'middle' }} /> Refresh
          </button>
          <button type="button" style={btnSecondary} onClick={onClose} aria-label="Close assessment catalog review"><X size={16} /></button>
        </div>
      </div>
      {loading && <p role="status" style={{ color: C.muted }}>Verifying exact school assessment catalog and signed source readiness…</p>}
      {error && <p role="alert" style={{ color: C.red }}>Read-only review unavailable: {error}. No database changes were made.</p>}
      {preview && ledger && <>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 16 }}>
          <span>Verified candidate subjects: <strong>{Number(preview.verifiedCandidateCount) || 0}</strong></span>
          <span>Candidate cohorts: <strong>{Number(preview.activeCohorts) || 0}</strong></span>
          <span>Existing active offerings: <strong>{existingOfferings}</strong></span>
          <span>Pending approvals: <strong>{Number(ledger.pendingCount) || 0}</strong></span>
          {trustedCoverage && <span>Students needing verified teaching evidence: <strong>{Number(coverage.uncoveredStudents) || 0}</strong> / {Number(coverage.totalActiveStudents) || 0}</span>}
        </div>
        <p role="status" style={{ marginTop: 12, color: fullCoverage ? C.green : C.red, fontWeight: 700 }}>
          {fullCoverage ? 'All active student cohorts are represented. Independent authorized source staging and Principal approval are still required.'
            : !gapsKnown || !matchingCoverage ? 'Strict teacher-evidence coverage certification is missing or inconsistent. Catalog staging must remain blocked.'
            : `${uncovered.length} active class-section cohort(s) are not represented. Full-coverage catalog staging must remain blocked.`}
        </p>
        {gapsKnown && uncovered.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {uncovered.map((cohort, i) => <span key={`${cohort.className}:${cohort.section}:${i}`}
            style={{ padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}>
            {cohort.className} — {cohort.section}
          </span>)}
        </div>}
        {trustedCoverage && Number(coverage.uncoveredStudents) > 0 && <div style={{ marginTop: 14, overflowX: 'auto' }}>
          <strong style={{ fontSize: 13 }}>Verified teaching-source gaps — administrative review only</strong>
          <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{['Class', 'Section', 'Students', 'Active assignments', 'Reviewed timetable entries'].map(name =>
              <th key={name} style={{ padding: 7, textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>{name}</th>)}</tr></thead>
            <tbody>{coverage.cohorts.filter(cohort => !cohort.has_subject_assignment).map((cohort,i) =>
              <tr key={`${cohort.class_name}:${cohort.section}:${i}`}>
                <td style={{ padding: 7 }}>{cohort.class_name}</td>
                <td style={{ padding: 7 }}>{cohort.section}</td>
                <td style={{ padding: 7 }}>{Number(cohort.active_students) || 0}</td>
                <td style={{ padding: 7 }}>{Number(cohort.active_assignment_records) || 0}</td>
                <td style={{ padding: 7 }}>{Number(cohort.reviewed_timetable_rows) || 0}</td>
              </tr>)}</tbody>
          </table>
        </div>}
        {candidates.length > 0 && <div style={{ maxHeight: 240, overflow: 'auto', marginTop: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{['Class', 'Section', 'Subject'].map(item => <th key={item} style={{ textAlign: 'left', padding: 8, borderBottom: `1px solid ${C.border}` }}>{item}</th>)}</tr></thead>
            <tbody>{candidates.map((item, i) => <tr key={`${item.class_name}:${item.section}:${item.subject}:${i}`}>
              <td style={{ padding: 8 }}>{item.class_name}</td><td style={{ padding: 8 }}>{item.section}</td><td style={{ padding: 8 }}>{item.subject}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        <p style={{ color: C.muted, fontSize: 12, display: 'flex', gap: 6, marginTop: 14 }}>
          <ShieldCheck size={14} /> Only a genuinely signed Principal/Administrator source-approval workflow may stage or approve these records. This preview is not an approval receipt.
        </p>
      </>}
    </section>
  )
}

import { useMemo, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const MANAGERS = new Set(['principal', 'admin', 'school_admin', 'super_admin'])
const clean = value => String(value || '').trim().toLowerCase()
function officialCohort(source, className, section) {
  const cohorts = source?.allocations || []
  return cohorts.find(item =>
    clean(item.class_name) === clean(className) &&
    (item.class_name !== 'Nine' || clean(item.section) === clean(section))
  ) || null
}
export default function ApprovedTimetableReference({ schoolClass, section }) {
  const { user } = useAuth()
  const [source, setSource] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const allowed = MANAGERS.has(String(user?.role || '').toLowerCase())
  const cohort = useMemo(() => officialCohort(source, schoolClass, section),
    [source, schoolClass, section])
  if (!allowed) return null
  async function load() {
    setError('')
    setLoading(true)
    try {
      const r = await api.get('/api/timetable/approved-source', { skipCache: true })
      if (!r.data?.success || !r.data?.reference_only || r.data.publication_authorized) {
        throw new Error('The official timetable reference was not safely verified.')
      }
      setSource(r.data.data)
    } catch (e) {
      setSource(null)
      setError(e.response?.data?.code || e.message || 'Official source unavailable.')
    } finally {
      setLoading(false)
    }
  }
  const regular = source?.regular_bells?.filter(x => x.label.startsWith('Period ')) || []
  const friday = source?.friday_bells?.filter(x => x.label.startsWith('Period ')) || []
  return <section aria-label="Approved timetable source reference" style={{
    border:'1px solid #94a3b8',borderRadius:16,padding:16,
    background:'var(--apex-bg-surface)',display:'grid',gap:12
  }}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
      <div>
        <strong>Approved Print Source — Verification Preview</strong>
        <p style={{fontSize:13,color:'var(--apex-text-secondary)',margin:'5px 0'}}>
          Reference only. This does not save, publish, approve an employee, or assign a class section.
        </p>
      </div>
      <button type="button" disabled={loading} onClick={load} style={{
        border:'1px solid var(--apex-border-default)',borderRadius:10,padding:'9px 13px',
        background:'var(--apex-bg-subtle)',color:'var(--apex-text-primary)',cursor:'pointer'
      }}>{loading ? 'Loading…' : 'Load Official Reference'}</button>
    </div>
    {error && <p role="alert" style={{color:'var(--apex-action-danger)'}}>{error}</p>}
    {source && !cohort && <p role="status">
      No verified print-source timetable exists for the selected class and section.
      The current editor remains unchanged.
    </p>}
    {source && cohort && <div>
      {cohort.section_verified === false && <p role="status" style={{
        borderLeft:'3px solid #b45309',padding:'8px 12px'
      }}>The source approves the Class {cohort.class_name} subject pattern but does not
        confirm assignment to Section {section || 'unspecified'}. Section and
        employee authorization require independent verification.</p>}
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:650}}>
          <thead><tr>{['Period','Approved subject','Printed teacher','Regular (Mon–Thu, Sat)','Friday'].map(x=>
            <th key={x} style={{padding:9,borderBottom:'1px solid #94a3b8',textAlign:'left'}}>{x}</th>)}
          </tr></thead>
          <tbody>{cohort.periods.map((p,i)=><tr key={p.period}>
            <td style={{padding:9,borderBottom:'1px solid #cbd5e1'}}>{p.period}</td>
            <td style={{padding:9,borderBottom:'1px solid #cbd5e1'}}>{p.subject}</td>
            <td style={{padding:9,borderBottom:'1px solid #cbd5e1'}}>{p.teacher_display_name}</td>
            <td style={{padding:9,borderBottom:'1px solid #cbd5e1'}}>{regular[i]?.start}–{regular[i]?.end}</td>
            <td style={{padding:9,borderBottom:'1px solid #cbd5e1'}}>{friday[i]?.start}–{friday[i]?.end}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p style={{fontSize:12,color:'var(--apex-text-tertiary)'}}>
        Source: {source.source_document}. Break: 11:55–12:20 on regular days; no Friday break.
        No production timetable data is modified by this preview.
      </p>
    </div>}
  </section>
}

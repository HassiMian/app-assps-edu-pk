import { useEffect, useState } from 'react'
import api from '../services/api'

// School-wide bell slots are loaded from the authenticated SaaS Core source,
// never inferred from stale client-side class or period assignments.
export default function BellSchedulePanel() {
  const [schedule, setSchedule] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api.get('/api/timetable/bell-schedule')
      .then(({ data }) => {
        if (active && data?.success && data?.data) setSchedule(data.data)
      })
      .catch(() => { if (active) setError('Official bell timetable is not available for this school account.') })
    return () => { active = false }
  }, [])
  if (error) return <p role="status" style={{ color: 'var(--apex-action-danger)' }}>{error}</p>
  if (!schedule) return <p role="status">Loading official school timings…</p>
  const groups = [
    { title: 'Regular Days (Monday–Thursday, Saturday)', key: 'regular' },
    { title: 'Friday (No Break)', key: 'friday' },
  ]
  return (
    <section aria-label="Official School Timings" style={{ padding: 20, borderRadius: 18, background: 'var(--apex-bg-surface-solid)', color: 'var(--apex-text-primary)', border: '1px solid var(--apex-border-default)' }}>
      <h2 style={{ fontSize: 19, margin: '0 0 4px' }}>Official School Timings</h2>
      <p style={{ fontSize: 12, opacity: .7, marginTop: 0 }}>Academic Session {schedule.academic_session} · Asia/Karachi · Version {schedule.version}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))', gap: 18 }}>
        {groups.map(group => (
          <div key={group.key}>
            <h3 style={{ fontSize: 15 }}>{group.title}</h3>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
              <thead><tr><th scope="col" style={{ textAlign: 'left' }}>Activity</th><th scope="col" style={{ textAlign: 'right' }}>Time</th></tr></thead>
              <tbody>{(schedule[group.key] || []).map(slot => (
                <tr key={slot.label}>
                  <td style={{ padding: '7px 2px', borderBottom: '1px solid var(--apex-border-subtle)' }}>{slot.label}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid var(--apex-border-subtle)' }}>{slot.start} – {slot.end}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, opacity: .7 }}>Bell times are shared across classes. Subjects and teachers remain determined by the separate approved class roster.</p>
    </section>
  )
}

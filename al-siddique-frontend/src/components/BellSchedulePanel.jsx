import { useState, useEffect } from 'react'
import api from '../services/api'

export default function BellSchedulePanel() {
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('regular') // 'regular' or 'friday'

  useEffect(() => {
    let cancelled = false
    async function fetchBells() {
      try {
        const res = await api.get('/api/timetable/bells')
        if (!cancelled && res.data?.data) {
          setSchedule(res.data.data)
        }
      } catch (err) {
        console.warn('Could not fetch bell schedule via API, using fallback:', err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchBells()
    return () => { cancelled = true }
  }, [])

  if (loading) return <p role="status">Loading official bell schedule…</p>
  if (!schedule) return <p role="alert">Official bell schedule is unavailable for this school. No fallback schedule will be shown.</p>
  const regularSlots = schedule?.regular || [
    { label: 'Assembly', start: '08:30', end: '08:45', note: 'School-wide morning assembly' },
    { label: 'Period 1', start: '08:45', end: '09:25', note: 'First academic period (40 mins)' },
    { label: 'Period 2', start: '09:25', end: '09:55', note: 'Second academic period (30 mins)' },
    { label: 'Period 3', start: '09:55', end: '10:25', note: 'Third academic period (30 mins)' },
    { label: 'Period 4', start: '10:25', end: '10:55', note: 'Fourth academic period (30 mins)' },
    { label: 'Period 5', start: '10:55', end: '11:25', note: 'Fifth academic period (30 mins)' },
    { label: 'Period 6', start: '11:25', end: '11:55', note: 'Sixth academic period (30 mins)' },
    { label: 'Break', start: '11:55', end: '12:20', note: 'School-wide 25-minute break' },
    { label: 'Period 7', start: '12:20', end: '12:50', note: 'Seventh academic period (30 mins)' },
    { label: 'Period 8', start: '12:50', end: '13:30', note: 'Eighth academic period (40 mins)' }
  ]

  const fridaySlots = schedule?.friday || [
    { label: 'Assembly', start: '08:30', end: '08:45', note: 'School-wide morning assembly' },
    { label: 'Period 1', start: '08:45', end: '09:20', note: 'First academic period (35 mins)' },
    { label: 'Period 2', start: '09:20', end: '09:50', note: 'Second academic period (30 mins)' },
    { label: 'Period 3', start: '09:50', end: '10:15', note: 'Third academic period (25 mins)' },
    { label: 'Period 4', start: '10:15', end: '10:40', note: 'Fourth academic period (25 mins)' },
    { label: 'Period 5', start: '10:40', end: '11:05', note: 'Fifth academic period (25 mins)' },
    { label: 'Period 6', start: '11:05', end: '11:30', note: 'Sixth academic period (25 mins)' },
    { label: 'Period 7', start: '11:30', end: '12:00', note: 'Seventh academic period (30 mins)' },
    { label: 'Period 8', start: '12:00', end: '12:30', note: 'Eighth academic period (30 mins, No break)' }
  ]

  const activeSlots = tab === 'regular' ? regularSlots : fridaySlots

  return (
    <div style={{
      background: 'rgba(15, 41, 66, 0.7)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      borderRadius: 20,
      padding: '24px 28px',
      boxShadow: '0 16px 36px rgba(0,0,0,0.3)',
      color: '#fff',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: 'linear-gradient(135deg, #0284c7, #0d9488)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 8,
              letterSpacing: 1.2
            }}>
              OFFICIAL 2026–27
            </span>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>
              Version: {schedule?.version || 'assps-school1-bells-20261016-v1'}
            </span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 4px', color: '#f8fafc' }}>
            {tab === 'regular' ? 'Monday–Thursday & Saturday Bell Schedule' : 'Friday Special Bell Schedule'}
          </h2>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            {tab === 'regular' ? 'Total school time: 08:30 AM – 01:30 PM (8 Academic Periods + Assembly + 25m Break)' : 'Total school time: 08:30 AM – 12:30 PM (8 Academic Periods + Assembly, No Break)'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12 }}>
          <button
            onClick={() => setTab('regular')}
            style={{
              background: tab === 'regular' ? '#0284c7' : 'transparent',
              color: tab === 'regular' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Regular (Mon–Thu, Sat)
          </button>
          <button
            onClick={() => setTab('friday')}
            style={{
              background: tab === 'friday' ? '#0d9488' : 'transparent',
              color: tab === 'friday' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Friday (Half Day)
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <th style={{ padding: '12px 14px', color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>Activity / Period</th>
              <th style={{ padding: '12px 14px', color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>Start Time</th>
              <th style={{ padding: '12px 14px', color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>End Time</th>
              <th style={{ padding: '12px 14px', color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {activeSlots.map((slot, idx) => {
              const isSpecial = slot.label === 'Assembly' || slot.label === 'Break'
              return (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: isSpecial ? 'rgba(56, 189, 248, 0.08)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)')
                  }}
                >
                  <td style={{ padding: '12px 14px', fontWeight: isSpecial ? 800 : 600, color: isSpecial ? '#38bdf8' : '#f1f5f9' }}>
                    {slot.label}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#93c5fd', fontSize: 14 }}>
                    {slot.start}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#93c5fd', fontSize: 14 }}>
                    {slot.end}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 13 }}>
                    {slot.note || (isSpecial ? 'School-wide scheduled activity' : 'Standard subject instruction')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { C, card, btnSecondary, sectionHeader } from '../moduleStyles'

export default function FeeReporting() {
 const [challans, setChallans] = useState([])
 const [loading, setLoading] = useState(true)
 const [year, setYear] = useState(String(new Date().getFullYear()))

 useEffect(() => {
 api.get('/api/fees')
 .then(r => setChallans(r.data.data || []))
 .catch(() => setChallans([]))
 .finally(() => setLoading(false))
 }, [])

 const filtered = challans.filter(c => String(c.year) === year)

 const byMonth = useMemo(() => {
 const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
 return months.map(m => {
 const items = filtered.filter(c => c.month === m)
 return {
 month: m.slice(0, 3),
 collected: items.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount || 0), 0),
 pending: items.filter(c => c.status !== 'paid').reduce((s, c) => s + Number(c.amount || 0), 0),
 }
 }).filter(r => r.collected + r.pending > 0)
 }, [filtered])

 const totalCollected = byMonth.reduce((s, r) => s + r.collected, 0)
 const totalPending = byMonth.reduce((s, r) => s + r.pending, 0)
 const maxValue = Math.max(...byMonth.map(r => r.collected + r.pending), 1)

 return (
 <div style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver }}>
 <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 22 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, borderRadius: 22 }}>
 <div>
 <h1 style={sectionHeader}>Fee Reporting</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Visualize fee collection progress and pending accounts.</p>
 </div>
 <button style={btnSecondary}>Download Report</button>
 </div>

 {loading ? (
 <div className="super-module-card" style={{ ...card, padding: 40, textAlign: 'center', color: C.muted }}>Loading…</div>
 ) : (
 <>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
 {[
 { label: 'Total Collected', value: `Rs. ${(totalCollected / 1000).toFixed(1)}K`, color: C.green },
 { label: 'Total Pending', value: `Rs. ${(totalPending / 1000).toFixed(1)}K`, color: C.red },
 { label: 'Collection Rate', value: totalCollected + totalPending > 0 ? `${Math.round((totalCollected / (totalCollected + totalPending)) * 100)}%` : '—', color: C.gold },
 ].map(item => (
 <div key={item.label} style={{ ...card, borderColor: item.color, borderRadius: 20, padding: 20 }}>
 <div style={{ color: item.color, fontSize: 28, fontWeight: 800 }}>{item.value}</div>
 <div style={{ color: C.muted, marginTop: 8 }}>{item.label}</div>
 </div>
 ))}
 </div>

 <div className="super-module-card" style={{ ...card, padding: 20, display: 'grid', gap: 20, borderRadius: 22 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
 <div style={{ color: C.gold, fontWeight: 700 }}>Monthly Collection Overview · {year}</div>
 <select style={{ width: 140, padding: '12px 14px', borderRadius: 14, background: 'rgba(7,22,40,0.92)', border: `1px solid ${C.border}`, color: C.silver, cursor: 'pointer' }}
 value={year} onChange={e => setYear(e.target.value)}>
 {['2024', '2025', '2026', '2027'].map(y => <option key={y} value={y}>{y}</option>)}
 </select>
 </div>
 {byMonth.length === 0 ? (
 <div style={{ padding: 28, textAlign: 'center', color: C.muted }}>No data for {year}.</div>
 ) : (
 <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, minHeight: 220 }}>
 {byMonth.map(item => {
 const total = item.collected + item.pending
 const height = Math.max(36, (total / maxValue) * 180)
 return (
 <div key={item.month} style={{ flex: 1, display: 'grid', gap: 10, alignItems: 'end', minHeight: 220 }}>
 <div style={{ height, borderRadius: 20, background: 'rgba(255,255,255,0.08)', display: 'grid', alignContent: 'end' }}>
 <div style={{ height: `${(item.collected / total) * 100}%`, background: `linear-gradient(180deg, ${C.green}, ${C.gold})`, borderRadius: '0 0 20px 20px' }} />
 </div>
 <div style={{ textAlign: 'center', color: C.muted, fontSize: 12 }}>{item.month}</div>
 </div>
 )
 })}
 </div>
 )}
 </div>
 </>
 )}
 </div>
 </div>
 )
}

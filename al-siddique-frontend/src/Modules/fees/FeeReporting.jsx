import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { C, card, btnSecondary, sectionHeader } from '../moduleStyles'


function downloadFeeReport(rows, year) {
 const headers = ['Challan No','Student','GR No','Class','Section','Month','Year','Amount','Paid Amount','Status']
 const data = rows.map(item => [
 item.challan_no || item.id || '', item.student_name || item.name || '', item.gr_number || item.gr || '',
 item.class || '', item.section || '', item.month || '', item.year || '', Number(item.amount || 0),
 Number(item.paid_amount || 0), item.status || '',
 ])
 const csv = [headers, ...data].map(row => row.map(value => `"${String(value ?? '').replace(/"/g,'""')}"`).join(',')).join('\n')
 const blob = new Blob([csv], { type:'text/csv;charset=utf-8' })
 const url = URL.createObjectURL(blob)
 const link = document.createElement('a')
 link.href = url
 link.download = `fee-report-${year}.csv`
 link.click()
 URL.revokeObjectURL(url)
}

export default function FeeReporting() {
 const [challans, setChallans] = useState([])
 const [loading, setLoading] = useState(true)
 const [year, setYear] = useState(String(new Date().getFullYear()))
 const [loadError, setLoadError] = useState('')

 useEffect(() => {
 setLoadError('')
 api.get('/api/fees')
 .then(r => setChallans(r.data.data || []))
 .catch(err => { setLoadError(err.response?.data?.message || 'Fee report data could not be loaded. Existing loaded data was preserved.') })
 .finally(() => setLoading(false))
 }, [])

 const years = useMemo(() => {
 const set = new Set(challans.map(item => String(item.year || '')).filter(Boolean))
 set.add(String(new Date().getFullYear()))
 return [...set].sort((a,b)=>Number(b)-Number(a))
 }, [challans])
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
 <div style={{ minHeight:'100vh', padding:24, background:'var(--apex-shell-gradient)', color:C.silver }}>
 <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 22 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, borderRadius: 22 }}>
 <div>
 <h1 style={sectionHeader}>Fee Reporting</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Visualize fee collection progress and pending accounts.</p>
 </div>
 <button style={btnSecondary} onClick={()=>downloadFeeReport(filtered,year)} disabled={!filtered.length}>Download Report</button>
 </div>

 {loading ? (
 <div className="super-module-card" style={{ ...card, padding: 40, textAlign: 'center', color: C.muted }}>Loading…</div>
 ) : loadError && challans.length === 0 ? (
 <div className="super-module-card" style={{ ...card, padding:32, textAlign:'center', color:'var(--apex-action-danger)' }}>{loadError}</div>
 ) : (
 <>
 {loadError && <div className="super-module-card" style={{ ...card, padding:16, color:'var(--apex-action-danger)' }}>{loadError}</div>}
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
 <select style={{ width: 140, padding: '12px 14px', borderRadius: 14, background:'var(--apex-bg-surface-solid)', border: `1px solid ${C.border}`, color: C.silver, cursor: 'pointer' }}
 value={year} onChange={e => setYear(e.target.value)}>
 {years.map(y => <option key={y} value={y}>{y}</option>)}
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
 <div style={{ height, borderRadius: 20, background:'var(--apex-bg-subtle)', display: 'grid', alignContent: 'end' }}>
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

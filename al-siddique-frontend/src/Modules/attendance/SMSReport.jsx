import { useState } from 'react'
import { C, card, btnPrimary, btnSecondary, select, labelStyle, sectionHeader } from '../moduleStyles'

const LOGS = [
 { id: 1, recipient: 'Ahmed Raza', phone: '0300-1234567', date: '2026-05-18', status: 'Delivered', message: 'Attendance alert sent.' },
 { id: 2, recipient: 'Fatima Noor', phone: '0301-2345678', date: '2026-05-18', status: 'Failed', message: 'Payment reminder failed.' },
 { id: 3, recipient: 'Bilal Hassan', phone: '0302-3456789', date: '2026-05-17', status: 'Delivered', message: 'Result card notification.' },
 { id: 4, recipient: 'Ayesha Malik', phone: '0303-4567890', date: '2026-05-16', status: 'Delivered', message: 'Fee reminder sent.' },
]
const STATUSES = ['All', 'Delivered', 'Failed']

const badgeStyle = (status) => {
 if (status === 'Delivered') return { background: 'rgba(48,209,88,0.14)', color: C.green }
 if (status === 'Failed') return { background: 'rgba(255,55,95,0.14)', color: C.red }
 return { background: 'rgba(200,153,26,0.14)', color: C.gold }
}

export default function SMSReport() {
 const [selectedStatus, setSelectedStatus] = useState('All')
 const [search, setSearch] = useState('')

 const filtered = LOGS.filter((item) => {
 const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus
 const matchesSearch = item.recipient.toLowerCase().includes(search.toLowerCase()) || item.phone.includes(search)
 return matchesStatus && matchesSearch
 })

 return (
 <div style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver }}>
 <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 24 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
 <div>
 <h1 style={sectionHeader}>SMS Report</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Track message delivery logs and retry failed sends.</p>
 </div>
 <button style={btnPrimary}>Retry Failed SMS</button>
 </div>

 <div className="super-module-card" style={{ ...card, display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 20, alignItems: 'flex-end' }}>
 <div>
 <label style={labelStyle}>Search Recipient</label>
 <input style={{ ...select, padding: '12px 14px' }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recipient name or phone" />
 </div>
 <div>
 <label style={labelStyle}>Status</label>
 <select style={select} value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
 {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
 </select>
 </div>
 <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
 <span style={{ color: C.muted, fontSize: 13, paddingTop: 6 }}>{filtered.length} log entries</span>
 </div>
 </div>

 <div className="super-module-card" style={{ ...card, overflowX: 'auto' }}>
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 {['Recipient', 'Phone', 'Date', 'Status', 'Message', 'Action'].map((header) => (
 <th key={header} style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.06 }}>{header}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {filtered.map((item, index) => (
 <tr key={item.id} style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding: '14px 16px', color: C.silver }}>{item.recipient}</td>
 <td style={{ padding: '14px 16px', color: C.gold }}>{item.phone}</td>
 <td style={{ padding: '14px 16px', color: C.muted }}>{item.date}</td>
 <td style={{ padding: '14px 16px' }}><span style={{ padding: '6px 12px', borderRadius: 14, ...badgeStyle(item.status), fontWeight: 700 }}>{item.status}</span></td>
 <td style={{ padding: '14px 16px', color: C.silver }}>{item.message}</td>
 <td style={{ padding: '14px 16px' }}><button style={{ ...btnSecondary, minWidth: 100 }}>Retry</button></td>
 </tr>
 ))}
 {filtered.length === 0 && (
 <tr>
 <td colSpan={6} style={{ padding: 28, textAlign: 'center', color: C.muted }}>No SMS logs match this filter.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )
}

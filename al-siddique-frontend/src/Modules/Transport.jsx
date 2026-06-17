import { useState } from 'react'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from './moduleStyles'

const ROUTES = [
 { id: 1, name: 'North Ridge', vehicle: 'Bus 101', capacity: 36, status: 'Active' },
 { id: 2, name: 'South Garden', vehicle: 'Bus 207', capacity: 30, status: 'Active' },
]
const STATUS_OPTIONS = ['Active', 'Paused', 'Maintenance']

export default function Transport() {
 const [routes, setRoutes] = useState(ROUTES)
 const [newRoute, setNewRoute] = useState({ name: '', vehicle: '', capacity: 30, status: 'Active' })
 const [message, setMessage] = useState('')

 const addRoute = (event) => {
 event.preventDefault()
 setRoutes((prev) => [...prev, { ...newRoute, id: Date.now() }])
 setNewRoute({ name: '', vehicle: '', capacity: 30, status: 'Active' })
 setMessage('Route added successfully.')
 setTimeout(() => setMessage(''), 2800)
 }

 return (
 <div style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver }}>
 <div style={{ maxWidth: 1220, margin: '0 auto', display: 'grid', gap: 22 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderRadius: 22 }}>
 <div>
 <h1 style={sectionHeader}>Transport Management</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Plan vehicle routes and monitor the school transport fleet.</p>
 </div>
 <button style={btnPrimary}>Fleet Dashboard</button>
 </div>

 <form className="super-module-card" onSubmit={addRoute} style={{ ...card, display: 'grid', gap: 18, borderRadius: 22 }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
 <div>
 <label style={labelStyle}>Route Name</label>
 <input style={input} value={newRoute.name} onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })} required />
 </div>
 <div>
 <label style={labelStyle}>Vehicle</label>
 <input style={input} value={newRoute.vehicle} onChange={(e) => setNewRoute({ ...newRoute, vehicle: e.target.value })} required />
 </div>
 <div>
 <label style={labelStyle}>Seating Capacity</label>
 <input type="number" style={input} value={newRoute.capacity} onChange={(e) => setNewRoute({ ...newRoute, capacity: Number(e.target.value) })} />
 </div>
 <div>
 <label style={labelStyle}>Status</label>
 <select style={select} value={newRoute.status} onChange={(e) => setNewRoute({ ...newRoute, status: e.target.value })}>
 {STATUS_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
 </select>
 </div>
 </div>
 <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
 <button type="submit" style={btnPrimary}>Add Route</button>
 <button type="button" style={btnSecondary}>Refresh</button>
 {message && <span style={{ color: C.green, fontWeight: 700 }}>{message}</span>}
 </div>
 </form>

 <div className="super-module-card" style={{ ...card, overflowX: 'auto', borderRadius: 22 }}>
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 {['Route', 'Vehicle', 'Capacity', 'Status', 'Action'].map((label) => (
 <th key={label} style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.06 }}>{label}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {routes.map((route, index) => (
 <tr key={route.id} style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding: '14px 16px', color: C.gold }}>{route.name}</td>
 <td style={{ padding: '14px 16px' }}>{route.vehicle}</td>
 <td style={{ padding: '14px 16px' }}>{route.capacity}</td>
 <td style={{ padding: '14px 16px' }}><span style={{ padding: '6px 12px', borderRadius: 14, background: route.status === 'Active' ? 'rgba(48,209,88,0.14)' : 'rgba(255,159,10,0.14)', color: route.status === 'Active' ? C.green : C.gold, fontWeight: 700 }}>{route.status}</span></td>
 <td style={{ padding: '14px 16px' }}><button style={btnSecondary}>Edit</button></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )
}

import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from './moduleStyles'

const STATUS_OPTIONS = ['Active', 'Paused', 'Maintenance']
const emptyRoute = { name: '', vehicle: '', capacity: 30, status: 'Active' }

export default function Transport() {
 const [routes, setRoutes] = useState([])
 const [form, setForm] = useState(emptyRoute)
 const [editingId, setEditingId] = useState(null)
 const [message, setMessage] = useState('')
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)

 async function loadRoutes() {
 setLoading(true)
 try {
 const response = await api.get('/api/transport')
 setRoutes(Array.isArray(response.data?.data) ? response.data.data : [])
 } catch (err) {
 console.error('Failed to load transport routes', err)
 setMessage(err.response?.data?.message || 'Transport routes could not be refreshed. Existing loaded routes were preserved.')
 } finally { setLoading(false) }
 }

 useEffect(() => {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 void loadRoutes()
 }, [])

 const saveRoute = async (event) => {
 event.preventDefault()
 if (saving) return
 setSaving(true)
 setMessage('')
 try {
 const payload = { ...form, capacity: Number(form.capacity) }
 const response = editingId
 ? await api.put(`/api/transport/${editingId}`, payload)
 : await api.post('/api/transport', payload)
 const saved = response.data?.data
 setRoutes(prev => editingId ? prev.map(item => item.id === saved.id ? saved : item) : [...prev, saved])
 setForm(emptyRoute)
 setEditingId(null)
 setMessage(editingId ? 'Route updated successfully.' : 'Route added successfully.')
 } catch (err) {
 setMessage(err.response?.data?.message || 'Transport route could not be saved.')
 } finally {
 setSaving(false)
 setTimeout(() => setMessage(''), 3000)
 }
 }

 const editRoute = route => {
 setEditingId(route.id)
 setForm({ name: route.name || '', vehicle: route.vehicle || '', capacity: Number(route.capacity || 0), status: route.status || 'Active' })
 window.scrollTo({ top: 0, behavior: 'smooth' })
 }

 const stats = useMemo(() => ({
 total: routes.length,
 active: routes.filter(item => item.status === 'Active').length,
 capacity: routes.reduce((sum, item) => sum + Number(item.capacity || 0), 0),
 }), [routes])

 return (
 <div style={{ minHeight:'100vh', padding:24, background:'var(--apex-shell-gradient)', color:C.silver }}>
 <div style={{ maxWidth:1220, margin:'0 auto', display:'grid', gap:22 }}>
 <div className="super-module-card" style={{ ...card, borderRadius:22, display:'grid', gap:18 }}>
 <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:16, alignItems:'center' }}>
 <div><h1 style={sectionHeader}>Transport Management</h1><p style={{ color:C.muted, marginTop:8 }}>Verified route and vehicle records for the school transport fleet.</p></div>
 <button type="button" style={btnSecondary} onClick={() => void loadRoutes()}>Refresh</button>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
 {[['Routes',stats.total],['Active',stats.active],['Seat Capacity',stats.capacity]].map(([label,value]) => <div key={label} style={{ padding:16, borderRadius:16, background:'var(--apex-bg-subtle)', border:'1px solid var(--apex-border-subtle)' }}><div style={{ color:C.muted, fontSize:11, textTransform:'uppercase', fontWeight:800 }}>{label}</div><div style={{ color:C.silver, fontSize:24, fontWeight:800, marginTop:5 }}>{value}</div></div>)}
 </div>
 </div>

 <form className="super-module-card" onSubmit={saveRoute} style={{ ...card, display:'grid', gap:18, borderRadius:22 }}>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16 }}>
 <div><label style={labelStyle}>Route Name</label><input style={input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
 <div><label style={labelStyle}>Vehicle</label><input style={input} value={form.vehicle} onChange={e=>setForm({...form,vehicle:e.target.value})} required /></div>
 <div><label style={labelStyle}>Capacity</label><input style={input} type="number" min="0" max="500" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})} required /></div>
 <div><label style={labelStyle}>Status</label><select style={select} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{STATUS_OPTIONS.map(item=><option key={item}>{item}</option>)}</select></div>
 </div>
 <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
 <button type="submit" style={btnPrimary} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update Route' : 'Add Route'}</button>
 {editingId && <button type="button" style={btnSecondary} onClick={()=>{setEditingId(null);setForm(emptyRoute)}}>Cancel Edit</button>}
 {message && <span style={{ color:message.includes('success') ? C.green : C.red, fontWeight:700 }}>{message}</span>}
 </div>
 </form>

 <div className="super-module-card" style={{ ...card, overflowX:'auto', borderRadius:22 }}>
 {loading ? <div style={{ padding:24, color:C.muted }}>Loading transport routes…</div> : <table style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>{['Route','Vehicle','Capacity','Status','Action'].map(label=><th key={label} style={{ padding:'14px 16px', textAlign:'left', color:C.muted, fontSize:12, textTransform:'uppercase' }}>{label}</th>)}</tr></thead>
 <tbody>{routes.map((route,index)=><tr key={route.id} style={{ background:index%2 ? 'var(--apex-bg-subtle)' : 'transparent' }}>
 <td style={{ padding:'14px 16px', color:'var(--apex-action-primary)', fontWeight:700 }}>{route.name}</td><td style={{ padding:'14px 16px' }}>{route.vehicle}</td><td style={{ padding:'14px 16px' }}>{route.capacity}</td>
 <td style={{ padding:'14px 16px' }}><span style={{ padding:'6px 12px', borderRadius:999, background:route.status==='Active'?'color-mix(in srgb,var(--apex-action-success) 10%,transparent)':'var(--apex-bg-subtle)', color:route.status==='Active'?C.green:C.gold, fontWeight:700 }}>{route.status}</span></td>
 <td style={{ padding:'14px 16px' }}><button style={btnSecondary} onClick={()=>editRoute(route)}>Edit</button></td>
 </tr>)}{!routes.length&&<tr><td colSpan={5} style={{ padding:28,textAlign:'center',color:C.muted }}>No transport routes recorded yet.</td></tr>}</tbody>
 </table>}
 </div>
 </div>
 </div>
 )
}

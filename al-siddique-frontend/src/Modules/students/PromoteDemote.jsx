import { useState, useEffect } from 'react'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, labelStyle, select, sectionHeader } from '../moduleStyles'
import { useAcademicStore } from '../../services/useAcademicStore'

export default function PromoteDemote() {
 const { classNames: CLASSES } = useAcademicStore()
 const [students, setStudents] = useState([])
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [selectedIds, setSelectedIds] = useState([])
 const [message, setMessage] = useState('')
 const [targetClass, setTargetClass] = useState(CLASSES.length > 0 ? CLASSES[CLASSES.length - 1] : '')

 useEffect(() => {
 api.get('/api/students')
 .then(r => setStudents(r.data.data || []))
 .catch(() => setStudents([]))
 .finally(() => setLoading(false))
 }, [])

 const toggleStudent = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
 const toggleAll = () => setSelectedIds(selectedIds.length === students.length ? [] : students.map(s => s.id))

 const applyChange = async (direction) => {
 if (!selectedIds.length) return
 setSaving(true)
 try {
 const updates = students
 .filter(s => selectedIds.includes(s.id))
 .map(s => {
 const idx = CLASSES.indexOf(s.class)
 const newClass = direction === 'promote'
 ? CLASSES[Math.min(idx + 1, CLASSES.length - 1)]
 : CLASSES[Math.max(idx - 1, 0)]
 return api.put(`/api/students/${s.id}`, { ...s, class: newClass })
 })
 await Promise.all(updates)
 const res = await api.get('/api/students')
 setStudents(res.data.data || [])
 setSelectedIds([])
 setMessage(direction === 'promote' ? 'Students promoted successfully.' : 'Students demoted successfully.')
 setTimeout(() => setMessage(''), 3000)
 } catch {
 setMessage('Update failed. Try again.')
 } finally {
 setSaving(false)
 }
 }

 const bulkMove = async () => {
 if (!selectedIds.length) return
 setSaving(true)
 try {
 const updates = students
 .filter(s => selectedIds.includes(s.id))
 .map(s => api.put(`/api/students/${s.id}`, { ...s, class: targetClass }))
 await Promise.all(updates)
 const res = await api.get('/api/students')
 setStudents(res.data.data || [])
 setSelectedIds([])
 setMessage(`Selected students moved to ${targetClass}`)
 setTimeout(() => setMessage(''), 3000)
 } catch {
 setMessage('Update failed. Try again.')
 } finally {
 setSaving(false)
 }
 }

 return (
 <div style={{ minHeight: '100vh', background: '#071e34', color: C.silver, padding: 24 }}>
 <div style={{ maxWidth: 1220, margin: '0 auto', display: 'grid', gap: 22 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, borderRadius: 22 }}>
 <div>
 <h1 style={sectionHeader}>Promote / Demote Students</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Bulk update class assignments with one click.</p>
 </div>
 <button style={btnSecondary}>Export Status</button>
 </div>

 <div className="super-module-card" style={{ ...card, display: 'grid', gap: 18, borderRadius: 22 }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'end' }}>
 <div>
 <label style={labelStyle}>Move to Class</label>
 <select style={select} value={targetClass} onChange={e => setTargetClass(e.target.value)}>
 {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>
 <button type="button" onClick={bulkMove} disabled={saving || !selectedIds.length} style={btnPrimary}>
 {saving ? 'Saving…' : 'Move Selected'}
 </button>
 <div />
 </div>
 <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
 <button type="button" onClick={() => applyChange('promote')} disabled={saving || !selectedIds.length} style={btnPrimary}>Promote ↑</button>
 <button type="button" onClick={() => applyChange('demote')} disabled={saving || !selectedIds.length} style={{ ...btnSecondary, borderColor: C.red, color: C.red }}>Demote ↓</button>
 <span style={{ color: C.muted, alignSelf: 'center', fontSize: 13 }}>{selectedIds.length} selected</span>
 </div>

 {message && <div style={{ padding: 14, borderRadius: 14, background: 'rgba(48,209,88,0.12)', border: `1px solid rgba(48,209,88,0.25)`, color: C.green }}>{message}</div>}

 <div style={{ overflowX: 'auto' }}>
 {loading ? (
 <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Loading students…</div>
 ) : (
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 <th style={{ padding: '14px 16px' }}>
 <input type="checkbox" checked={selectedIds.length === students.length && students.length > 0} onChange={toggleAll} />
 </th>
 {['Student', 'GR No', 'Class', 'Section'].map(l => (
 <th key={l} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.06 }}>{l}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {students.map((s, i) => (
 <tr key={s.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding: '14px 16px' }}>
 <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleStudent(s.id)} />
 </td>
 <td style={{ padding: '14px 16px', color: C.silver }}>{s.name}</td>
 <td style={{ padding: '14px 16px', color: C.gold }}>{s.gr_number}</td>
 <td style={{ padding: '14px 16px' }}>{s.class}</td>
 <td style={{ padding: '14px 16px' }}>{s.section}</td>
 </tr>
 ))}
 {students.length === 0 && (
 <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: C.muted }}>No students found.</td></tr>
 )}
 </tbody>
 </table>
 )}
 </div>
 </div>
 </div>
 </div>
 )
}

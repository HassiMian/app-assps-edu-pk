import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { C, card, btnPrimary, input, select, labelStyle, sectionHeader } from '../moduleStyles'
import { useAcademicStore } from '../../services/useAcademicStore'

export default function StudentReports() {
 const { classNames } = useAcademicStore()
 const CLASSES = ['All Classes', ...classNames]
 const [students, setStudents] = useState([])
 const [loading, setLoading] = useState(false)
 const [search, setSearch] = useState('')
 const [selectedClass, setSelectedClass] = useState('All Classes')

 const loadStudents = () => {
 setLoading(true)
 const params = {}
 if (selectedClass !== 'All Classes') params.class = selectedClass
 if (search) params.search = search
 api.get('/api/students', { params })
 .then(r => setStudents(r.data.data || []))
 .catch(() => setStudents([]))
 .finally(() => setLoading(false))
 }

 useEffect(() => { loadStudents() }, [])

 return (
 <div style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver }}>
 <div style={{ maxWidth: 1220, margin: '0 auto', display: 'grid', gap: 22 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderRadius: 22 }}>
 <div>
 <h1 style={sectionHeader}>Student Reports</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>View all registered students with class, section and contact info.</p>
 </div>
 <button style={btnPrimary} onClick={() => { 
 setSearch(''); setSelectedClass('All Classes');
 setLoading(true);
 api.get('/api/students', { params: {} })
 .then(r => setStudents(r.data.data || []))
 .catch(() => setStudents([]))
 .finally(() => setLoading(false))
 }}>Reset Filters</button>
 </div>

 <div className="super-module-card" style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', borderRadius: 22 }}>
 <div style={{ flex: '2 1 220px' }}>
 <label style={labelStyle}>Search</label>
 <input style={input} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadStudents()} placeholder="Search by name, GR or father name" />
 </div>
 <div style={{ flex: '1 1 180px' }}>
 <label style={labelStyle}>Class</label>
 <select style={select} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
 {CLASSES.map(v => <option key={v} value={v}>{v}</option>)}
 </select>
 </div>
 <button type="button" onClick={loadStudents} disabled={loading} style={{ ...btnPrimary, padding: '12px 20px' }}>
 {loading ? '…' : ' Search'}
 </button>
 </div>

 <div className="super-module-card" style={{ ...card, overflowX: 'auto', borderRadius: 22 }}>
 {loading ? (
 <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Loading students…</div>
 ) : (
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 {['GR No', 'Student Name', 'Father Name', 'Class', 'Section', 'Phone'].map(h => (
 <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.06 }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {students.map((s, i) => (
 <tr key={s.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding: '14px 16px', color: C.gold }}>{s.gr_number}</td>
 <td style={{ padding: '14px 16px', color: C.silver }}>
 <Link to={`/students?viewId=${s.id}`} style={{ color: C.blue, textDecoration: 'none', fontWeight: 700 }}>
 {s.name}
 </Link>
 </td>
 <td style={{ padding: '14px 16px' }}>{s.father_name}</td>
 <td style={{ padding: '14px 16px' }}>{s.class}</td>
 <td style={{ padding: '14px 16px' }}>{s.section}</td>
 <td style={{ padding: '14px 16px' }}>{s.parent_phone || '—'}</td>
 </tr>
 ))}
 {students.length === 0 && (
 <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: C.muted }}>No students found.</td></tr>
 )}
 </tbody>
 </table>
 )}
 </div>
 <div style={{ color: C.muted, fontSize: 13 }}>{students.length} students</div>
 </div>
 </div>
 )
}

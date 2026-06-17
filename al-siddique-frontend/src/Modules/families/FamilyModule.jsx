// src/Modules/families/FamilyModule.jsx — Al Siddique Smart School OS
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { useFamilyStore } from '../../services/useFamilyStore'
import { C } from '../moduleStyles'
import { ChevronDown, Users } from 'lucide-react'

const card = {
 background: 'rgba(15,23,42,0.6)',
 backdropFilter: 'blur(20px)',
 border: '1px solid rgba(200,153,26,0.15)',
 borderRadius: 20,
 padding: 20,
}

const inp = {
 width: '100%', padding: '10px 14px', borderRadius: 10,
 boxSizing: 'border-box',
 background: 'rgba(7,30,52,0.7)', border: `1px solid ${C.border}`,
 color: C.silver, fontSize: 14, outline: 'none',
}

function normalizeText(value) {
 return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function normalizePhone(value) {
 return String(value || '').replace(/\D/g, '').slice(-10)
}

function studentKey(student = {}) {
 const gr = String(student.gr || student.gr_number || '').trim().toLowerCase()
 if (gr) return `gr:${gr}`
 return [
 normalizeText(student.name),
 normalizeText(student.father || student.father_name),
 normalizePhone(student.phone || student.contact || student.parent_phone),
 ].join('|')
}

function dedupeStudents(students = []) {
 const byKey = new Map()
 students.forEach(student => {
 const key = studentKey(student)
 const current = byKey.get(key)
 if (!current || Number(student.id || 0) > Number(current.id || 0)) byKey.set(key, student)
 })
 return Array.from(byKey.values())
}

function FamilyCard({ family, students, onAddStudent, onRemove, navigate }) {
 const [expanded, setExpanded] = useState(false)
 const memberDetails = (family.students || [])
 .map(fs => students.find(s => String(s.id) === String(fs.id)) || fs)

 const totalFee = memberDetails.reduce((sum, s) => sum + Number(s.fee_amount || 0), 0)

 return (
 <div style={{ ...card, transition: 'all .2s' }}>
 {/* Header */}
 <div
 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 12 }}
 onClick={() => setExpanded(e => !e)}
 >
 <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
 <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(200,153,26,0.15)', border: '1.5px solid rgba(200,153,26,0.35)', display: 'grid', placeItems: 'center', color: C.gold }}>
 <Users size={20} />
 </div>
 <div>
 <div style={{ color: C.gold, fontWeight: 800, fontSize: 15 }}>{family.fatherName || 'Unknown Parent'}</div>
 <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
 <span style={{ background: 'rgba(10,132,255,0.12)', border: '1px solid rgba(10,132,255,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: '#0A84FF', fontWeight: 700 }}>{family.code}</span>
 <span style={{ color: C.muted, fontSize: 12 }}>{family.students.length} child{family.students.length !== 1 ? 'ren' : ''}</span>
 {family.phone && <span style={{ color: C.muted, fontSize: 12 }}> {family.phone}</span>}
 </div>
 </div>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
 {totalFee > 0 && <div style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>Rs. {totalFee.toLocaleString()}</div>}
 <ChevronDown size={18} style={{ color: C.muted, transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none' }} />
 </div>
 </div>

 {/* Children Table */}
 {expanded && (
 <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
 {memberDetails.length === 0
 ? <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No students linked yet.</div>
 : (
 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 {['GR No', 'Name', 'Class / Sec', 'Contact', 'Fee Status', ''].map(h => (
 <th key={h} style={{ padding: '7px 10px', color: C.muted, textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {memberDetails.map((s, i) => (
 <tr key={s.id || i} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
 <td style={{ padding: '8px 10px', color: C.gold, fontWeight: 700 }}>{s.gr || s.gr_number || '—'}</td>
 <td style={{ padding: '8px 10px' }}>
 <span
 style={{ color: C.silver, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(10,132,255,0.4)' }}
 onClick={() => navigate(`/students?view=${s.id}`)}
 onMouseEnter={e => e.currentTarget.style.color = '#0A84FF'}
 onMouseLeave={e => e.currentTarget.style.color = C.silver}
 >{s.name}</span>
 </td>
 <td style={{ padding: '8px 10px', color: C.muted }}>{s.class || '—'} {s.section ? `/ ${s.section}` : ''}</td>
 <td style={{ padding: '8px 10px', color: C.muted }}>{s.phone || s.contact || '—'}</td>
 <td style={{ padding: '8px 10px' }}>
 <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(48,209,88,0.1)', color: '#30D158', border: '1px solid rgba(48,209,88,0.2)' }}>Active</span>
 </td>
 <td style={{ padding: '8px 10px' }}>
 <button
 onClick={() => onRemove(family.code, s.id)}
 style={{ background: 'rgba(255,55,95,0.12)', border: '1px solid rgba(255,55,95,0.25)', color: '#FF375F', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
 >Remove</button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 <button
 onClick={() => onAddStudent(family.code)}
 style={{ marginTop: 10, background: 'rgba(200,153,26,0.12)', border: '1px solid rgba(200,153,26,0.3)', color: C.gold, borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
 >+ Add Student to this Family</button>
 </div>
 )}
 </div>
 )
}

export default function FamilyModule() {
 const navigate = useNavigate()
 const [searchParams] = useSearchParams()
 const [students, setStudents] = useState([])
 const [loading, setLoading] = useState(true)
 // Pre-fill search from ?code=FAM-XXXX query param (from ViewChallans click)
 const [search, setSearch] = useState(() => searchParams.get('code') || '')
 const [showCreate, setShowCreate] = useState(false)
 const [newFatherName, setNewFatherName] = useState('')
 const [newPhone, setNewPhone] = useState('')
 const [addStudentFamilyCode, setAddStudentFamilyCode] = useState(null)
 const [addStudentSearch, setAddStudentSearch] = useState('')

 const {
 families, autoDetectFamilies, getFamilyForStudent,
 createFamily, addStudentToFamily, removeStudentFromFamily,
 } = useFamilyStore()

 // Load students from API
 useEffect(() => {
 api.get('/api/students')
 .then(r => {
 const list = r.data?.data || r.data || []
 const mapped = dedupeStudents(list.map(s => ({
 id: s.id,
 gr: s.gr_number || s.gr,
 name: s.name,
 father: s.father_name || s.father,
 phone: s.parent_phone || s.phone || s.contact,
 class: s.class,
 section: s.section,
 contact: s.parent_phone || s.contact,
 // Include DB fields for reliable family detection
 family_code: s.family_code || null,
 father_cnic: s.father_cnic || null,
 })))
 setStudents(mapped)
 autoDetectFamilies(mapped.map(s => ({
 id: s.id, name: s.name, father: s.father,
 phone: s.phone, contact: s.contact,
 family_code: s.family_code,
 father_cnic: s.father_cnic,
 })))
 })
 .catch(() => setStudents([]))
 .finally(() => setLoading(false))
 }, [autoDetectFamilies])

 const filteredFamilies = useMemo(() => {
 if (!search.trim()) return families
 const q = search.toLowerCase()
 return families.filter(f =>
 f.fatherName?.toLowerCase().includes(q) ||
 f.code?.toLowerCase().includes(q) ||
 f.phone?.includes(q) ||
 f.students.some(s => (s.name || '').toLowerCase().includes(q))
 )
 }, [families, search])

 const unlinkedStudents = useMemo(() =>
 students.filter(s => !getFamilyForStudent(s.id)),
 [students, getFamilyForStudent]
 )

 const handleCreateFamily = () => {
 if (!newFatherName.trim()) return
 createFamily(newFatherName.trim(), newPhone.trim())
 setNewFatherName('')
 setNewPhone('')
 setShowCreate(false)
 }

 const handleAddStudent = (familyCode) => {
 setAddStudentFamilyCode(familyCode)
 setAddStudentSearch('')
 }

 const confirmAddStudent = (student) => {
 addStudentToFamily(addStudentFamilyCode, { id: student.id, name: student.name })
 setAddStudentFamilyCode(null)
 }

 const searchResults = useMemo(() => {
 if (!addStudentSearch.trim()) return []
 const q = addStudentSearch.toLowerCase()
 return students.filter(s =>
 s.name?.toLowerCase().includes(q) ||
 s.gr?.toLowerCase().includes(q) ||
 s.father?.toLowerCase().includes(q)
 ).slice(0, 8)
 }, [students, addStudentSearch])

 return (
 <div style={{ minHeight: '100vh', background: '#071e34', color: C.silver, fontFamily: 'Inter, sans-serif', padding: '24px 24px' }}>
 {/* Header */}
 <div style={{ ...card, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderRadius: 22 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
 <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(200,153,26,0.15)', border: '1.5px solid rgba(200,153,26,0.35)', display: 'grid', placeItems: 'center', color: C.gold }}>
 <Users size={26} />
 </div>
 <div>
 <h1 style={{ margin: 0, fontSize: 26, color: '#fff', fontFamily: "'Playfair Display', serif", fontWeight: 800 }}>Family Management</h1>
 <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>Group students by family, track fees & communicate with parents.</p>
 </div>
 </div>
 <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
 <button
 onClick={() => { autoDetectFamilies(students.map(s => ({ id: s.id, name: s.name, father: s.father, phone: s.phone, contact: s.contact }))); }}
 style={{ background: 'rgba(10,132,255,0.14)', border: '1px solid rgba(10,132,255,0.3)', color: '#0A84FF', borderRadius: 12, padding: '10px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
 > Auto-Detect Families</button>
 <button
 onClick={() => setShowCreate(true)}
 style={{ background: `linear-gradient(135deg, ${C.gold}, #e8b420)`, border: 'none', color: '#071e34', borderRadius: 12, padding: '10px 18px', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}
 >+ New Family</button>
 </div>
 </div>

 {/* Stats */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
 {[
 { label: 'Total Families', value: families.length, color: C.gold, icon: '' },
 { label: 'Linked Students', value: families.reduce((sum, f) => sum + f.students.length, 0), color: '#0A84FF', icon: '' },
 { label: 'Unlinked Students', value: unlinkedStudents.length, color: C.red, icon: '' },
 { label: 'Multi-Child Families', value: families.filter(f => f.students.length > 1).length, color: C.green, icon: '' },
 ].map(stat => (
 <div key={stat.label} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
 <div style={{ fontSize: 28 }}>{stat.icon}</div>
 <div>
 <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
 <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{stat.label}</div>
 </div>
 </div>
 ))}
 </div>

 {/* Search */}
 <div style={{ marginBottom: 20 }}>
 <input
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Search by family code, parent name, phone, or child name..."
 style={{ ...inp, borderRadius: 12, padding: '12px 18px', fontSize: 14 }}
 />
 </div>

 {/* Family list */}
 {loading ? (
 <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Loading students and detecting families…</div>
 ) : filteredFamilies.length === 0 ? (
 <div style={{ ...card, textAlign: 'center', padding: 60, color: C.muted }}>
 <div style={{ fontSize: 48, marginBottom: 12 }}></div>
 <div style={{ fontSize: 16, fontWeight: 700, color: C.silver }}>No families found</div>
 <div style={{ fontSize: 13, marginTop: 8 }}>Click "Auto-Detect Families" to group students by parent, or create a family manually.</div>
 </div>
 ) : (
 <div style={{ display: 'grid', gap: 12 }}>
 {filteredFamilies.map(family => (
 <FamilyCard
 key={family.code}
 family={family}
 students={students}
 onAddStudent={handleAddStudent}
 onRemove={removeStudentFromFamily}
 navigate={navigate}
 />
 ))}
 </div>
 )}

 {/* Unlinked students notice */}
 {unlinkedStudents.length > 0 && (
 <div style={{ ...card, marginTop: 20, borderColor: 'rgba(255,159,10,0.3)', background: 'rgba(255,159,10,0.06)' }}>
 <div style={{ color: '#FF9F0A', fontWeight: 700, fontSize: 14, marginBottom: 10 }}> {unlinkedStudents.length} student{unlinkedStudents.length !== 1 ? 's' : ''} not linked to any family</div>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
 {unlinkedStudents.slice(0, 12).map(s => (
 <span key={s.id} style={{ background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.2)', borderRadius: 20, padding: '3px 12px', fontSize: 12, color: '#FF9F0A' }}>
 {s.name} ({s.class})
 </span>
 ))}
 {unlinkedStudents.length > 12 && <span style={{ color: C.muted, fontSize: 12, padding: '3px 0' }}>…and {unlinkedStudents.length - 12} more</span>}
 </div>
 <button
 onClick={() => { autoDetectFamilies(students.map(s => ({ id: s.id, name: s.name, father: s.father, phone: s.phone, contact: s.contact }))); }}
 style={{ marginTop: 12, background: 'rgba(255,159,10,0.15)', border: '1px solid rgba(255,159,10,0.3)', color: '#FF9F0A', borderRadius: 8, padding: '7px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
 >Auto-link these students</button>
 </div>
 )}

 {/* Create Family Modal */}
 {showCreate && (
 <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(7,30,52,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
 onClick={() => setShowCreate(false)}>
 <div style={{ ...card, maxWidth: 440, width: '100%', margin: 16 }} onClick={e => e.stopPropagation()}>
 <h3 style={{ margin: '0 0 20px', color: C.gold, fontSize: 18, fontWeight: 800 }}>Create New Family</h3>
 <div style={{ display: 'grid', gap: 14 }}>
 <div>
 <label style={{ color: C.muted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Father / Guardian Name *</label>
 <input value={newFatherName} onChange={e => setNewFatherName(e.target.value)} placeholder="e.g. Muhammad Ali" style={inp} autoFocus />
 </div>
 <div>
 <label style={{ color: C.muted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Phone Number</label>
 <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="e.g. 0300-1234567" style={inp} />
 </div>
 </div>
 <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
 <button onClick={() => setShowCreate(false)} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 10, padding: '9px 20px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
 <button onClick={handleCreateFamily} disabled={!newFatherName.trim()} style={{ background: newFatherName.trim() ? `linear-gradient(135deg,${C.gold},#e8b420)` : 'rgba(148,163,184,0.18)', border: 'none', color: '#071e34', borderRadius: 10, padding: '9px 20px', cursor: newFatherName.trim() ? 'pointer' : 'not-allowed', fontWeight: 600 }}>Create Family</button>
 </div>
 </div>
 </div>
 )}

 {/* Add Student to Family Modal */}
 {addStudentFamilyCode && (
 <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(7,30,52,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
 onClick={() => setAddStudentFamilyCode(null)}>
 <div style={{ ...card, maxWidth: 480, width: '100%', margin: 16 }} onClick={e => e.stopPropagation()}>
 <h3 style={{ margin: '0 0 6px', color: C.gold, fontSize: 18, fontWeight: 800 }}>Add Student</h3>
 <p style={{ color: C.muted, fontSize: 13, margin: '0 0 16px' }}>Family: <strong style={{ color: C.silver }}>{addStudentFamilyCode}</strong></p>
 <input
 value={addStudentSearch}
 onChange={e => setAddStudentSearch(e.target.value)}
 placeholder="Search by name, GR No, or father name…"
 style={{ ...inp, marginBottom: 12 }}
 autoFocus
 />
 <div style={{ maxHeight: 280, overflowY: 'auto' }}>
 {searchResults.length === 0 && addStudentSearch && (
 <div style={{ color: C.muted, textAlign: 'center', padding: '20px 0', fontSize: 13 }}>No students found</div>
 )}
 {searchResults.map(s => (
 <div key={s.id}
 onClick={() => confirmAddStudent(s)}
 style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, background: 'rgba(11,44,77,0.5)', border: `1px solid ${C.border}`, transition: 'all .15s' }}
 onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(200,153,26,0.4)'}
 onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
 >
 <div>
 <div style={{ color: C.silver, fontWeight: 700, fontSize: 13 }}>{s.name}</div>
 <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{s.gr} · {s.class} {s.section} · Father: {s.father}</div>
 </div>
 <span style={{ color: C.gold, fontSize: 13, fontWeight: 700 }}>+ Add</span>
 </div>
 ))}
 </div>
 <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
 <button onClick={() => setAddStudentFamilyCode(null)} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 10, padding: '9px 20px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}

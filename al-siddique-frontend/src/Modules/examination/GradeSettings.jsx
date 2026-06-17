import { useState } from 'react'
import { C, card, btnPrimary, btnSecondary, input, sectionHeader } from '../moduleStyles'

const initialGrades = [
 { label: 'A+', from: 90, to: 100 },
 { label: 'A', from: 80, to: 89 },
 { label: 'B', from: 70, to: 79 },
 { label: 'C', from: 60, to: 69 },
 { label: 'D', from: 50, to: 59 },
 { label: 'F', from: 0, to: 49 },
]

export default function GradeSettings() {
 const [grades, setGrades] = useState(initialGrades)
 const [message, setMessage] = useState('')

 const updateGrade = (index, key, value) => {
 setGrades((prev) => prev.map((item, idx) => idx === index ? { ...item, [key]: Number(value) } : item))
 }

 const save = () => {
 setMessage('Grade settings updated successfully.')
 setTimeout(() => setMessage(''), 2800)
 }

 return (
 <div style={{ minHeight: '100vh', background: '#071e34', color: C.silver, padding: 24 }}>
 <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 24 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
 <div>
 <h1 style={sectionHeader}>Grade Settings</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Configure grade boundaries and preserve grading consistency.</p>
 </div>
 <button onClick={save} style={btnPrimary}>Save Grades</button>
 </div>

 <div className="super-module-card" style={{ ...card, overflowX: 'auto' }}>
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 {['Grade', 'From', 'To', 'Action'].map((label) => (
 <th key={label} style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.06 }}>{label}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {grades.map((grade, index) => (
 <tr key={grade.label} style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding: '14px 16px', color: C.gold }}>{grade.label}</td>
 <td style={{ padding: '14px 16px' }}><input type="number" value={grade.from} onChange={(e) => updateGrade(index, 'from', e.target.value)} style={{ ...input, width: 96 }} /></td>
 <td style={{ padding: '14px 16px' }}><input type="number" value={grade.to} onChange={(e) => updateGrade(index, 'to', e.target.value)} style={{ ...input, width: 96 }} /></td>
 <td style={{ padding: '14px 16px' }}><button style={btnSecondary}>Reset</button></td>
 </tr>
 ))}
 </tbody>
 </table>
 {message && <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: 'rgba(48,209,88,0.12)', border: `1px solid rgba(48,209,88,0.2)`, color: C.green }}>{message}</div>}
 </div>
 </div>
 </div>
 )
}

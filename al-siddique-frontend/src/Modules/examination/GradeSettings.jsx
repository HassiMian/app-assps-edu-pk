import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, input, sectionHeader } from '../moduleStyles'

const DEFAULT_GRADES = [
 { label:'A+', from:90, to:100 },
 { label:'A', from:80, to:89 },
 { label:'B', from:70, to:79 },
 { label:'C', from:60, to:69 },
 { label:'D', from:50, to:59 },
 { label:'F', from:0, to:49 },
]

export default function GradeSettings() {
 const [grades, setGrades] = useState(DEFAULT_GRADES)
 const [message, setMessage] = useState('')
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)

 useEffect(() => {
 let cancelled = false
 async function load() {
 try {
 const response = await api.get('/api/exams/grade-settings', { skipCache:true })
 if (!cancelled && Array.isArray(response.data?.data)) setGrades(response.data.data)
 } catch (err) {
 console.error('Grade settings load failed', err)
 if (!cancelled) setMessage(err.response?.data?.message || 'Grade settings could not be loaded.')
 } finally { if (!cancelled) setLoading(false) }
 }
 void load()
 return () => { cancelled = true }
 }, [])

 const updateGrade = (index, key, value) => {
 setGrades(prev => prev.map((item, idx) => idx === index ? { ...item, [key]: key === 'label' ? value : Number(value) } : item))
 }
 const addGrade = () => setGrades(prev => [...prev, { label:'', from:0, to:0 }])
 const removeGrade = index => setGrades(prev => prev.filter((_, idx) => idx !== index))

 const validation = useMemo(() => {
 const coverage = Array.from({ length:101 }, () => 0)
 const errors = []
 const labels = new Set()
 grades.forEach((grade,index) => {
 const label = String(grade.label || '').trim().toLowerCase()
 if (!label) errors.push(`Row ${index + 1}: label required`)
 if (labels.has(label)) errors.push(`Row ${index + 1}: duplicate label`)
 labels.add(label)
 if (!Number.isInteger(grade.from) || !Number.isInteger(grade.to) || grade.from < 0 || grade.to > 100 || grade.from > grade.to) errors.push(`Row ${index + 1}: invalid range`)
 else for (let pct=grade.from; pct<=grade.to; pct += 1) coverage[pct] += 1
 })
 if (coverage.some(v=>v===0)) errors.push('Every percentage 0–100 must be covered.')
 if (coverage.some(v=>v>1)) errors.push('Grade ranges must not overlap.')
 return errors
 }, [grades])

 const save = async () => {
 if (validation.length) return setMessage(validation[0])
 setSaving(true); setMessage('')
 try {
 const response = await api.put('/api/exams/grade-settings', { grades })
 if (Array.isArray(response.data?.data)) setGrades(response.data.data)
 setMessage('Grade settings saved to the server.')
 } catch (err) {
 setMessage(err.response?.data?.fieldErrors?.[0] || err.response?.data?.message || 'Grade settings could not be saved.')
 } finally { setSaving(false) }
 }

 return (
 <div style={{ minHeight:'100vh', background:'var(--apex-shell-gradient)', color:C.silver, padding:24 }}>
 <div style={{ maxWidth:1180, margin:'0 auto', display:'grid', gap:24 }}>
 <div className="super-module-card" style={{ ...card, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
 <div><h1 style={sectionHeader}>Grade Settings</h1><p style={{ color:C.muted, marginTop:8 }}>Server-authoritative grade boundaries used consistently across examination workflows.</p></div>
 <div style={{ display:'flex', gap:10 }}><button onClick={addGrade} style={btnSecondary}>Add Grade</button><button onClick={()=>void save()} style={btnPrimary} disabled={saving || loading || validation.length>0}>{saving?'Saving…':'Save Grades'}</button></div>
 </div>

 <div className="super-module-card" style={{ ...card, overflowX:'auto' }}>
 {loading ? <div style={{ padding:24, color:C.muted }}>Loading grade settings…</div> : <table style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>{['Grade','From','To','Action'].map(label=><th key={label} style={{ padding:'14px 16px', textAlign:'left', color:C.muted, fontSize:12, textTransform:'uppercase' }}>{label}</th>)}</tr></thead>
 <tbody>{grades.map((grade,index)=><tr key={`${grade.label}-${index}`} style={{ background:index%2?'var(--apex-bg-subtle)':'transparent' }}>
 <td style={{ padding:'12px 16px' }}><input style={{ ...input, width:90 }} value={grade.label} onChange={e=>updateGrade(index,'label',e.target.value)} /></td>
 <td style={{ padding:'12px 16px' }}><input style={{ ...input, width:100 }} type="number" min="0" max="100" value={grade.from} onChange={e=>updateGrade(index,'from',e.target.value)} /></td>
 <td style={{ padding:'12px 16px' }}><input style={{ ...input, width:100 }} type="number" min="0" max="100" value={grade.to} onChange={e=>updateGrade(index,'to',e.target.value)} /></td>
 <td style={{ padding:'12px 16px' }}><button style={{ ...btnSecondary, color:'var(--apex-action-danger)' }} onClick={()=>removeGrade(index)} disabled={grades.length<=1}>Remove</button></td>
 </tr>)}</tbody>
 </table>}
 </div>
 {validation.length>0 && <div style={{ ...card, borderColor:'color-mix(in srgb,var(--apex-action-danger) 35%,var(--apex-border-default))', color:'var(--apex-action-danger)', fontSize:13 }}>{validation[0]}</div>}
 {message && <div style={{ color:message.includes('saved')?'var(--apex-action-success)':'var(--apex-action-danger)', fontWeight:700, fontSize:13 }}>{message}</div>}
 </div>
 </div>
 )
}

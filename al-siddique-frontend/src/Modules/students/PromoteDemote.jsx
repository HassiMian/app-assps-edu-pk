import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, labelStyle, select, sectionHeader } from '../moduleStyles'
import { useAcademicStore } from '../../services/useAcademicStore'

function exportCsv(rows) {
 const table = [['GR No','Student','Class','Section'], ...rows.map(s => [s.gr_number || '', s.name || '', s.class || '', s.section || ''])]
 const csv = table.map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(',')).join('\n')
 const blob = new Blob([csv], { type:'text/csv;charset=utf-8' })
 const url = URL.createObjectURL(blob)
 const link = document.createElement('a')
 link.href = url
 link.download = `student-class-status-${new Date().toISOString().slice(0,10)}.csv`
 link.click()
 URL.revokeObjectURL(url)
}

export default function PromoteDemote() {
 const { activeClasses } = useAcademicStore()
 const [students, setStudents] = useState([])
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [selectedIds, setSelectedIds] = useState([])
 const [message, setMessage] = useState('')
 const [targetClass, setTargetClass] = useState(activeClasses[0]?.name || '')
 const [targetSection, setTargetSection] = useState(activeClasses[0]?.sections?.[0] || '')

 const classNames = useMemo(() => activeClasses.map(item => item.name), [activeClasses])
 const selectedTarget = useMemo(() => activeClasses.find(item => item.name === targetClass) || null, [activeClasses, targetClass])

 useEffect(() => {
 let cancelled = false
 api.get('/api/students').then(r => { if (!cancelled) setStudents(r.data?.data || []) }).catch(() => { if (!cancelled) setStudents([]) }).finally(() => { if (!cancelled) setLoading(false) })
 return () => { cancelled = true }
 }, [])

 useEffect(() => {
 const sections = selectedTarget?.sections || []
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setTargetSection(current => sections.includes(current) ? current : (sections[0] || ''))
 }, [selectedTarget])

 const toggleStudent = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev,id])
 const toggleAll = () => setSelectedIds(selectedIds.length === students.length ? [] : students.map(s => s.id))

 const reloadStudents = async () => {
 const response = await api.get('/api/students', { skipCache:true })
 setStudents(response.data?.data || [])
 }

 const classForStudent = student => activeClasses.find(item => item.name === student.class || item.level === student.class) || null
 const resolveSectionForTarget = (student, target) => {
 const sections = target?.sections || []
 if (!sections.length) throw new Error(`${target?.name || 'Target class'} has no configured section.`)
 if (sections.includes(student.section)) return student.section
 if (sections.length === 1) return sections[0]
 throw new Error(`${student.name}: choose an explicit section before moving into ${target.name}; multiple sections exist.`)
 }

 const submitAssignments = async (assignments, successMessage) => {
 setSaving(true); setMessage('')
 try {
 await api.post('/api/students/bulk-class-assignment', { assignments })
 await reloadStudents()
 setSelectedIds([])
 setMessage(successMessage)
 } catch (err) {
 setMessage(err.response?.data?.message || err.message || 'Update failed.')
 } finally { setSaving(false) }
 }

 const applyChange = async direction => {
 if (!selectedIds.length) return
 try {
 const assignments = students.filter(s => selectedIds.includes(s.id)).map(student => {
 const current = classForStudent(student)
 const currentIndex = activeClasses.findIndex(item => item.level === current?.level)
 if (currentIndex < 0) throw new Error(`${student.name}: current class is not in Academic Setup.`)
 const nextIndex = direction === 'promote' ? currentIndex + 1 : currentIndex - 1
 if (nextIndex < 0 || nextIndex >= activeClasses.length) throw new Error(`${student.name}: no ${direction === 'promote' ? 'higher' : 'lower'} configured class is available.`)
 const target = activeClasses[nextIndex]
 return { student_id:student.id, class:target.name, section:resolveSectionForTarget(student,target) }
 })
 await submitAssignments(assignments, direction === 'promote' ? 'Selected students promoted successfully.' : 'Selected students demoted successfully.')
 } catch (err) { setMessage(err.message) }
 }

 const bulkMove = async () => {
 if (!selectedIds.length || !selectedTarget) return
 if (!targetSection || !(selectedTarget.sections || []).includes(targetSection)) return setMessage('Select a valid target section from Academic Setup.')
 const assignments = students.filter(s => selectedIds.includes(s.id)).map(student => ({ student_id:student.id, class:selectedTarget.name, section:targetSection }))
 await submitAssignments(assignments, `Selected students moved to ${selectedTarget.name} · ${targetSection}.`)
 }

 return (
 <div style={{ minHeight:'100vh', background:'var(--apex-shell-gradient)', color:C.silver, padding:24 }}>
 <div style={{ maxWidth:1220, margin:'0 auto', display:'grid', gap:22 }}>
 <div className="super-module-card" style={{ ...card, display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:16, borderRadius:22 }}>
 <div><h1 style={sectionHeader}>Promote / Demote Students</h1><p style={{ color:C.muted, marginTop:8 }}>Atomic, Academic-Setup-validated class transitions. A batch either completes fully or does not change records.</p></div>
 <button style={btnSecondary} onClick={()=>exportCsv(students)} disabled={!students.length}>Export Status</button>
 </div>

 <div className="super-module-card" style={{ ...card, display:'grid', gap:18, borderRadius:22 }}>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:16, alignItems:'end' }}>
 <div><label style={labelStyle}>Move to Class</label><select style={select} value={targetClass} onChange={e=>setTargetClass(e.target.value)}>{classNames.map(name=><option key={name} value={name}>{name}</option>)}</select></div>
 <div><label style={labelStyle}>Target Section</label><select style={select} value={targetSection} onChange={e=>setTargetSection(e.target.value)}>{(selectedTarget?.sections||[]).map(section=><option key={section} value={section}>{section}</option>)}</select></div>
 <button type="button" onClick={()=>void bulkMove()} disabled={saving||!selectedIds.length||!targetSection} style={btnPrimary}>{saving?'Saving…':'Move Selected'}</button>
 </div>
 <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
 <button type="button" onClick={()=>void applyChange('promote')} disabled={saving||!selectedIds.length} style={btnPrimary}>Promote ↑</button>
 <button type="button" onClick={()=>void applyChange('demote')} disabled={saving||!selectedIds.length} style={{ ...btnSecondary,borderColor:C.red,color:C.red }}>Demote ↓</button>
 <span style={{ color:C.muted,alignSelf:'center',fontSize:13 }}>{selectedIds.length} selected</span>
 </div>
 {message&&<div style={{ padding:14,borderRadius:14,background:message.includes('success')||message.includes('moved')?'color-mix(in srgb,var(--apex-action-success) 8%,transparent)':'color-mix(in srgb,var(--apex-action-danger) 8%,transparent)',border:'1px solid var(--apex-border-default)',color:message.includes('success')||message.includes('moved')?C.green:C.red }}>{message}</div>}

 <div style={{ overflowX:'auto' }}>{loading?<div style={{ padding:40,textAlign:'center',color:C.muted }}>Loading students…</div>:<table style={{ width:'100%',borderCollapse:'collapse' }}>
 <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}><th style={{ padding:'14px 16px' }}><input type="checkbox" checked={selectedIds.length===students.length&&students.length>0} onChange={toggleAll}/></th>{['Student','GR No','Class','Section'].map(label=><th key={label} style={{ padding:'14px 16px',textAlign:'left',fontSize:12,color:C.muted,textTransform:'uppercase' }}>{label}</th>)}</tr></thead>
 <tbody>{students.map((s,index)=><tr key={s.id} style={{ background:index%2?'var(--apex-bg-subtle)':'transparent' }}><td style={{ padding:'14px 16px' }}><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={()=>toggleStudent(s.id)}/></td><td style={{ padding:'14px 16px' }}>{s.name}</td><td style={{ padding:'14px 16px',color:'var(--apex-action-primary)' }}>{s.gr_number}</td><td style={{ padding:'14px 16px' }}>{s.class}</td><td style={{ padding:'14px 16px' }}>{s.section}</td></tr>)}{!students.length&&<tr><td colSpan={5} style={{ padding:28,textAlign:'center',color:C.muted }}>No students found.</td></tr>}</tbody>
 </table>}</div>
 </div>
 </div>
 </div>
 )
}

// SavedPapersTab.jsx — Al Siddique Smart School OS

import { useState } from 'react'
import Portal from '../../components/Portal'
import { usePaperStore } from './usePaperStore'
import { useAuth } from '../../context/AuthContext'

const C = {
 card: 'rgba(11,44,77,0.92)', gold: '#C8991A', goldL: '#e8b420',
 silver: '#C0C8D8', muted: '#8892A4', green: '#30D158',
 red: '#FF375F', border: 'rgba(148,163,184,0.18)',
}

function fmtDate(iso) {
 try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
 catch { return iso }
}

function categoryStats(paper = {}) {
 const legacy = {
 mcq: paper.selectedMCQ || [],
 short: paper.selectedShort || [],
 long: paper.selectedLong || [],
 }
 const byType = { ...legacy }
 Object.entries(paper.selectedQuestions || {}).forEach(([type, payload]) => {
 const questions = Array.isArray(payload) ? payload : (Array.isArray(payload?.questions) ? payload.questions : [])
 if (questions.length) byType[type] = questions
 })
 const totalQuestions = Object.values(byType).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0)
 const totalMarks = Object.entries(byType).reduce((sum, [type, list]) => {
 const payload = paper.selectedQuestions?.[type]
 const fallbackMarks = Number(payload?.marks) || (type === 'mcq' ? 1 : type === 'long' ? 5 : 2)
 return sum + (Array.isArray(list) ? list.reduce((inner, q) => inner + (Number(q?.marks) || fallbackMarks), 0) : 0)
 }, 0)
 return {
 mcqCount: legacy.mcq.length,
 shortCount: legacy.short.length,
 longCount: legacy.long.length,
 totalQuestions,
 totalMarks,
 }
}

export default function SavedPapersTab({ onLoadPaper }) {
 const { savedPapers, deleteSavedPaper, renameSavedPaper } = usePaperStore()
 const { isTeacher } = useAuth()
 const [renaming, setRenaming] = useState(null) // paper id
 const [renameVal, setRenameVal] = useState('')
 const [search, setSearch] = useState('')
 const [confirmDelete, setConfirmDelete] = useState(null)

 const filtered = savedPapers.filter(p => {
 // Role-based visibility
 if (isTeacher && p.teacherHidden) return false

 const nameMatch = !search || p.name?.toLowerCase()?.includes(search.toLowerCase())
 const subMatch = p.config?.subject?.toLowerCase()?.includes(search.toLowerCase())
 const clsMatch = p.config?.classLevel?.toLowerCase()?.includes(search.toLowerCase())
 return nameMatch || subMatch || clsMatch
 })

 function startRename(paper) {
 setRenaming(paper.id)
 setRenameVal(paper.name)
 }

 function submitRename() {
 if (renameVal.trim()) renameSavedPaper(renaming, renameVal.trim())
 setRenaming(null)
 }

 return (
 <div>
 {/* Delete confirm modal */}
 {confirmDelete && (
 <Portal>
 <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
 <div style={{ background: '#071e34', border: `1px solid ${C.border}`, borderRadius: 18, padding: 28, width: 360, textAlign: 'center' }}>
 <div style={{ fontSize: 40, marginBottom: 12 }}></div>
 <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete Paper?</div>
 <div style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>"{confirmDelete.name}" will be permanently deleted.</div>
 <div style={{ display: 'flex', gap: 10 }}>
 <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: 'rgba(15,23,42,0.46)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 0', color: C.silver, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
 <button onClick={() => { deleteSavedPaper(confirmDelete.id); setConfirmDelete(null) }}
 style={{ flex: 1, background: 'rgba(255,55,95,0.2)', border: '1px solid rgba(255,55,95,0.4)', borderRadius: 10, padding: '10px 0', color: C.red, fontWeight: 700, cursor: 'pointer' }}>
 Delete
 </button>
 </div>
 </div>
 </div>
 </Portal>
 )}

 {/* Header */}
 <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '18px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
 <div style={{ fontSize: 36 }}></div>
 <div style={{ flex: 1 }}>
 <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>Saved Papers</div>
 <div style={{ color: C.muted, fontSize: 13 }}>{savedPapers.length} paper{savedPapers.length !== 1 ? 's' : ''} saved — click any to load and print</div>
 </div>
 <input value={search} onChange={e => setSearch(e.target.value)} placeholder=" Search papers..."
 style={{ background: 'rgba(11,44,77,0.6)', border: `1px solid ${C.border}`, borderRadius: 12, color: C.silver, padding: '10px 16px', fontSize: 13, outline: 'none', width: 220 }} />
 </div>

 {filtered.length === 0 ? (
 <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 60, textAlign: 'center' }}>
 <div style={{ fontSize: 48, marginBottom: 16 }}></div>
 <div style={{ color: C.silver, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
 {savedPapers.length === 0 ? 'No saved papers yet' : 'No papers match your search'}
 </div>
 <div style={{ color: C.muted, fontSize: 14 }}>
 {savedPapers.length === 0 ? 'Generate a paper and click "Save Paper" in the preview.' : 'Try a different search term.'}
 </div>
 </div>
 ) : (
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
 {filtered.map(paper => {
 const stats = categoryStats(paper)

 return (
 <div key={paper.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden' }}>

 {/* Top color strip */}
 <div style={{ height: 4, background: `linear-gradient(90deg, ${C.gold}, ${C.goldL})` }} />

 <div style={{ padding: '18px 20px' }}>
 {/* Paper name - editable */}
 {renaming === paper.id ? (
 <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
 <input value={renameVal} onChange={e => setRenameVal(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && submitRename()}
 autoFocus
 style={{ flex: 1, background: 'rgba(11,44,77,0.7)', border: `1px solid ${C.gold}`, borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 14, outline: 'none' }} />
 <button onClick={submitRename} style={{ background: C.gold, border: 'none', borderRadius: 8, padding: '6px 12px', color: '#071e34', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}></button>
 <button onClick={() => setRenaming(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 10px', color: C.silver, cursor: 'pointer', fontSize: 12 }}></button>
 </div>
 ) : (
 <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 8, cursor: 'pointer' }}
 onDoubleClick={() => startRename(paper)}>
 {paper.name}
 </div>
 )}

 {/* Meta */}
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
 {paper.config?.classLevel && (
 <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(148,163,184,0.18)', color: C.gold, border: `1px solid rgba(200,153,26,0.3)`, fontWeight: 600 }}>
 Class {paper.config.classLevel}
 </span>
 )}
 {paper.config?.subject && (
 <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(10,132,255,0.1)', color: '#0A84FF', border: '1px solid rgba(10,132,255,0.2)', fontWeight: 600 }}>
 {paper.config.subject}
 </span>
 )}
 {paper.config?.examType && (
 <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(192,200,216,0.1)', color: C.silver, border: `1px solid ${C.border}` }}>
 {paper.config.examType}
 </span>
 )}
 </div>

 {/* Stats */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
 {[
 ['MCQ', stats.mcqCount, '#0A84FF'],
 ['Short', stats.shortCount, '#30D158'],
 ['Long', stats.longCount, '#BF5AF2'],
 ['Total', stats.totalMarks, C.gold],
 ].map(([label, count, color]) => (
 <div key={label} style={{ background: 'rgba(7,30,52,0.5)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
 <div style={{ color, fontWeight: 800, fontSize: 16 }}>{count}</div>
 <div style={{ color: C.muted, fontSize: 10 }}>{label === 'Total' ? 'marks' : label}</div>
 </div>
 ))}
 </div>

 <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
  {fmtDate(paper.createdAt)}
 </div>

 {/* Actions */}
 <div style={{ display: 'flex', gap: 8 }}>
 <button onClick={() => onLoadPaper(paper)}
 style={{ flex: 1, background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, border: 'none', borderRadius: 10, padding: '9px 0', color: '#071e34', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
  Load & Preview
 </button>
 <button onClick={() => startRename(paper)}
 style={{ background: 'rgba(15,23,42,0.46)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.silver, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
 
 </button>
 <button onClick={() => setConfirmDelete(paper)}
 style={{ background: 'rgba(255,55,95,0.1)', border: '1px solid rgba(255,55,95,0.25)', borderRadius: 10, padding: '9px 12px', color: C.red, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
 
 </button>
 </div>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>
 )
}

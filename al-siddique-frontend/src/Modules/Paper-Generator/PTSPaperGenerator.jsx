// PTSPaperGenerator.jsx — PTS clone, dark SaaS theme
import { useEffect, useState, useRef } from 'react'
import { Maximize, Minimize, ZoomIn, ZoomOut } from 'lucide-react'
import Portal from '../../components/Portal'
import { SYLLABI, CLASSES, SUBJECTS, CHAPTERS, QUESTIONS } from './data/questionBank'
import { usePaperStore } from './usePaperStore'
import PaperRichTextEditor, { PaperRichTextRenderer } from './PaperRichTextEditor'
import { PaperSelectionToolbar } from './PaperInlineEditor.jsx'
import { classLevelLabel, classLevelsMatch, useAcademicStore } from '../../services/useAcademicStore'
import { splitQuestionsBalancedVertical } from './PaperEditor/layouts/shortQuestionLayoutEngine.js'
import { resolveMcqColumns, normalizeQuestionOptions } from './PaperEditor/layouts/mcqLayoutEngine.js'
import { getDisplayOptionLabel } from './PaperEditor/layouts/urduRtlEngine.js'
import { isUrduScriptPaper, URDU_FONT_STACK } from './resolvePaperRoute.js'
import { inferOfficialSectionKind, parseMcqRows as parseOfficialMcqRows, extractMarksLabel, stripTrailingMarks, splitContentWithMarkers } from './officialSectionSemantics.js'
import OfficialSectionRenderer from './PaperEditor/official/OfficialSectionRenderer.jsx'
import { auditOfficialPaperForPrint, paperPrintBlockMessage } from './officialPaperRules.js'
import { applyAsspsPaperRules, buildMarksLedger, buildPaperRuleProfile, normalizeSectionOrder, replaceQuestionSerial, replaceSectionMarks, resolveSectionTotalMarks, stampWorkingCopy, validatePaperDraft } from './paperSystemRules.js'

function storeQToTemplate(q) {
 return {
 id: q.id, type: q.type,
 medium: q.medium || (q.textUrdu ? 'dual' : 'english'),
 en: q.text, ur: q.textUrdu || q.text,
 priority: q.priority, chapterId: q.chapter,
 options: (q.options || []).map(o => ({
 key: o.label, en: o.text, ur: o.textUrdu || o.text,
 correct: o.label === q.answer,
 })),
 }
}

function questionMatchesMedium(q, medium) {
 const qMedium = q.medium || (q.textUrdu || q.ur ? 'dual' : 'english')
 if (medium === 'dual') return qMedium === 'dual' || (!!(q.text || q.en) && !!(q.textUrdu || q.ur))
 if (medium === 'urdu') return qMedium === 'urdu' || qMedium === 'dual' || !!(q.textUrdu || q.ur)
 return qMedium === 'english' || qMedium === 'dual' || !!(q.text || q.en)
}

//  App dark theme (matching the rest of the OS) 
const D = {
 bg: 'var(--pg-bg, #071e34)',
 card: 'var(--pg-card, rgba(11,44,77,0.92))',
 cardS: 'var(--pg-card-strong, rgba(11,44,77,0.80))',
 gold: 'var(--pg-gold, #C8991A)', goldL:'var(--pg-gold-light, #e8b420)',
 silver: 'var(--pg-text, #C0C8D8)', muted:'var(--pg-muted, #8892A4)',
 green: 'var(--pg-green, #30D158)', red:'var(--pg-red, #FF375F)',
 orange: 'var(--pg-orange, #FF9F0A)', blue:'var(--pg-blue, #0A84FF)',
 border: 'var(--pg-border, rgba(148,163,184,0.18))',
 borderHov:'var(--pg-border-hover, rgba(200,153,26,0.45))',
}

const blur = 'blur(20px)'
const watermarkPreviewStyle = (logo, opacity, scale = 1.18) => ({
 position: 'absolute',
 top: '52%',
 left: '50%',
 width: `${145 * scale}mm`,
 height: `${145 * scale}mm`,
 transform: 'translate(-50%, -50%)',
 backgroundImage: `url('${logo}')`,
 backgroundRepeat: 'no-repeat',
 backgroundPosition: 'center',
 backgroundSize: 'contain',
 opacity,
 zIndex: 1,
 pointerEvents: 'none',
})

function PreviewWatermark({ logo, show, opacity, scale }) {
 if (!show || !logo || opacity <= 0) return null
 return <div className="preview-wm" style={watermarkPreviewStyle(logo, opacity, scale)} />
}

const themeVars = (mode) => mode === 'light'
 ? {
 '--pg-bg': 'linear-gradient(135deg, #f7f9fc 0%, #edf3f8 48%, #e7eff8 100%)',
 '--pg-card': 'rgba(255,255,255,0.68)',
 '--pg-card-strong': 'rgba(255,255,255,0.82)',
 '--pg-gold': '#9a6500',
 '--pg-gold-light': '#c78505',
 '--pg-text': '#162235',
 '--pg-muted': '#5d6b7e',
 '--pg-green': '#138a36',
 '--pg-red': '#d32246',
 '--pg-orange': '#c26b00',
 '--pg-blue': '#075fb8',
 '--pg-border': 'rgba(15,35,60,0.16)',
 '--pg-border-hover': 'rgba(161,111,0,0.36)',
 '--pg-toolbar': 'rgba(248,252,255,0.94)',
 '--pg-canvas': '#d8e1eb',
 '--pg-chip': 'rgba(255,255,255,0.86)',
 '--pg-option-bg': '#ffffff',
 '--pg-option-text': '#162235',
 }
 : {
 '--pg-bg': '#071e34',
 '--pg-card': 'rgba(11,44,77,0.92)',
 '--pg-card-strong': 'rgba(11,44,77,0.80)',
 '--pg-gold': '#C8991A',
 '--pg-gold-light': '#e8b420',
 '--pg-text': '#C0C8D8',
 '--pg-muted': '#8892A4',
 '--pg-green': '#30D158',
 '--pg-red': '#FF375F',
 '--pg-orange': '#FF9F0A',
 '--pg-blue': '#0A84FF',
 '--pg-border': 'rgba(148,163,184,0.18)',
 '--pg-border-hover': 'rgba(200,153,26,0.45)',
 '--pg-toolbar': 'rgba(7,25,48,0.97)',
 '--pg-canvas': '#1e2a3a',
 '--pg-chip': 'rgba(11,44,77,0.92)',
 '--pg-option-bg': '#0a1e35',
 '--pg-option-text': '#e6eef8',
 }

function getInitialPaperTheme() {
 try {
 const stored = window.localStorage?.getItem('al_siddique_theme')
 const rootTheme = document.documentElement?.dataset?.theme
 return stored === 'light' || rootTheme === 'light' ? 'light' : 'dark'
 } catch {
 return 'dark'
 }
}

const ThemeToggle = ({ mode, onToggle }) => (
 <button onClick={onToggle} style={{
 background: mode === 'light' ? 'rgba(7,95,184,0.10)' : 'rgba(255,255,255,0.06)',
 border:`1px solid ${D.border}`,
 color:D.silver,
 borderRadius:9,
 padding:'8px 12px',
 fontSize:12,
 fontWeight:800,
 cursor:'pointer',
 whiteSpace:'nowrap',
 }}>
 {mode === 'light' ? 'Light Mode' : 'Dark Mode'}
 </button>
)

//  Dark UI primitives 
const DCard = ({ children, style={}, ...rest }) => (
 <div {...rest} style={{
 background:D.card, backdropFilter:blur, border:`1px solid ${D.border}`,
 borderRadius:20, boxShadow:'0 8px 24px rgba(7,30,52,0.22)', ...style,
 }}>{children}</div>
)

const GoldBtn = ({ children, onClick, style={}, disabled=false }) => (
 <button onClick={onClick} disabled={disabled} style={{
 background: disabled ? 'rgba(148,163,184,0.18)' : `linear-gradient(135deg,${D.gold},${D.goldL})`,
 color: disabled ? D.muted : '#071e34',
 border:'none', borderRadius:10, padding:'10px 24px', fontWeight:700, fontSize:14,
 cursor: disabled ? 'not-allowed' : 'pointer', transition:'all .15s', ...style,
 }}>{children}</button>
)

const DBtn = ({ children, onClick, color='gold', style={}, disabled=false }) => {
 const bg = {
 gold: `linear-gradient(135deg,${D.gold},${D.goldL})`,
 green: `linear-gradient(135deg,#1b5e20,#2e7d32)`,
 red: `linear-gradient(135deg,#b71c1c,#c62828)`,
 ghost: 'rgba(15,23,42,0.46)',
 }[color]
 const fg = color === 'ghost' ? D.silver : (color === 'gold' ? '#071e34' : 'white')
 return (
 <button onClick={onClick} disabled={disabled} style={{
 background: disabled ? 'rgba(15,23,42,0.38)' : bg,
 color: disabled ? D.muted : fg,
 border: color==='ghost' ? `1px solid ${D.border}` : 'none',
 borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13,
 cursor: disabled ? 'not-allowed' : 'pointer', transition:'all .15s', ...style,
 }}>{children}</button>
 )
}

const DBreadcrumb = ({ steps }) => (
 <div style={{ background:'rgba(15,23,42,0.46)', borderBottom:`1px solid ${D.border}`,
 padding:'9px 24px', fontSize:13, color:D.muted, display:'flex', gap:6, alignItems:'center' }}>
 <span style={{ color:D.gold, cursor: steps[0]?.onClick ? 'pointer' : 'default' }}
 onClick={steps[0]?.onClick}>Dashboard</span>
 {steps.map((s,i) => (
 <span key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
 <span style={{ color:D.border }}>/</span>
 <span
 style={{ color: i===steps.length-1 ? D.silver : D.muted, cursor: s.onClick ? 'pointer' : 'default' }}
 onClick={s.onClick}>{s.label}</span>
 </span>
 ))}
 </div>
)

const GoBack = ({ onClick }) => (
 <button onClick={onClick} style={{
 background:'rgba(15,23,42,0.46)', border:`1px solid ${D.border}`, borderRadius:9,
 padding:'8px 18px', fontSize:13, color:D.muted, cursor:'pointer',
 display:'flex', alignItems:'center', gap:5, transition:'all .15s',
 }}>← Go Back</button>
)

const pbStyle = `1px solid ${D.border}`
const dinp = { background:'rgba(11,44,77,0.6)', border: pbStyle, borderRadius:9,
 color:D.silver, padding:'9px 12px', fontSize:14, outline:'none', boxSizing:'border-box', width:'100%' }

//  Step 1  Syllabus 
function SyllabusStep({ onSelect }) {
 return (
 <div>
 <h2 style={{ color:D.gold, fontSize:20, fontWeight:700, margin:'0 0 22px',
 fontFamily:"'Playfair Display',serif" }}>Select Syllabus</h2>
 <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
 {SYLLABI.map(s => (
 <div key={s.id} onClick={() => onSelect(s.id)} style={{
 width:180, padding:'28px 20px', textAlign:'center', cursor:'pointer',
 background:D.card, backdropFilter:blur,
 border:`2px solid ${D.border}`, borderRadius:20,
 boxShadow:'0 8px 24px rgba(7,30,52,0.22)', transition:'all .2s',
 }}
 onMouseEnter={e => { e.currentTarget.style.borderColor=D.gold; e.currentTarget.style.boxShadow=`0 8px 32px rgba(148,163,184,0.18)` }}
 onMouseLeave={e => { e.currentTarget.style.borderColor=D.border; e.currentTarget.style.boxShadow='0 8px 24px rgba(7,30,52,0.22)' }}>
 <div style={{ fontSize:38, marginBottom:10 }}></div>
 <div style={{ fontWeight:800, fontSize:18, color:D.gold, marginBottom:4 }}>{s.name}</div>
 <div style={{ color:D.muted, fontSize:12, marginBottom:18 }}>{s.subtitle}</div>
 <div style={{ width:30, height:30, borderRadius:'50%',
 background:`linear-gradient(135deg,${D.gold},${D.goldL})`,
 display:'grid', placeItems:'center', margin:'0 auto', fontSize:15, color:'#071e34', fontWeight:700 }}></div>
 </div>
 ))}
 </div>
 </div>
 )
}

//  Step 2  Class 
function ClassStep({ syllabusId, onSelect, onBack }) {
 const { activeClasses } = useAcademicStore()
 const classes = activeClasses.map(c => ({
 id: `academic:${c.level}`,
 level: c.level,
 label: c.name,
 syllabusId,
 }))
 return (
 <div>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
 <h2 style={{ color:D.gold, fontSize:20, fontWeight:700, margin:0, fontFamily:"'Playfair Display',serif" }}>Select Class</h2>
 <GoBack onClick={onBack} />
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px,1fr))', gap:14 }}>
 {classes.length === 0 ? (
 <DCard style={{ padding:40, textAlign:'center' }}>
 <div style={{ color:D.muted }}>No live SaaS classes found for this tenant.</div>
 </DCard>
 ) : classes.map(c => (
 <div key={c.id} onClick={() => onSelect(c.id)} style={{
 padding:'22px 10px', textAlign:'center', cursor:'pointer',
 background:D.card, backdropFilter:blur,
 border:`2px solid ${D.border}`, borderRadius:14, transition:'all .2s',
 }}
 onMouseEnter={e => { e.currentTarget.style.borderColor=D.gold; e.currentTarget.style.background=D.cardS }}
 onMouseLeave={e => { e.currentTarget.style.borderColor=D.border; e.currentTarget.style.background=D.card }}>
 <div style={{ fontWeight:800, fontSize:20, color:D.gold, marginBottom:6 }}>{c.label}</div>
 <div style={{ color:D.muted, fontSize:11, marginBottom:14 }}>
 {SYLLABI.find(s=>s.id===syllabusId)?.name}
 </div>
 <div style={{ width:24, height:24, borderRadius:'50%',
 background:`linear-gradient(135deg,${D.gold},${D.goldL})`,
 display:'grid', placeItems:'center', margin:'0 auto', fontSize:12, color:'#071e34', fontWeight:700 }}></div>
 </div>
 ))}
 </div>
 </div>
 )
}

//  Step 3  Subject 
function SubjectStep({ syllabusId, classId, onSelect, onBack }) {
 const { subjects: storeSubjects } = usePaperStore()
 const { subjectsForClass } = useAcademicStore()
 const classLevel = classId?.startsWith('academic:') ? classId.slice(9) : CLASSES.find(c => c.id===classId)?.level
 const academicSubjects = subjectsForClass(classLevel)
 const staticSubjects = classId?.startsWith('academic:')
 ? []
 : SUBJECTS.filter(s => s.syllabusId===syllabusId && s.classId===classId)
 const fromStore = classLevel
 ? storeSubjects.filter(s => !s.classLevel || classLevelsMatch(s.classLevel, classLevel))
 : []

 const staticNames = staticSubjects.map(s => s.name.toLowerCase())
 const extraStore = fromStore.filter(s => !staticNames.includes(s.name.toLowerCase()))
 const extraAcademic = academicSubjects.filter(name => {
 const lower = String(name).toLowerCase()
 return !staticNames.includes(lower) && !extraStore.some(s => s.name.toLowerCase() === lower)
 })

 const allSubjects = [
 ...staticSubjects,
 ...extraStore.map(s => ({
 id: `store:${s.id}`,
 name: s.name, edition: s.publisher || classLevelLabel(s.classLevel),
 color: D.gold, emoji: '',
 })),
 ...extraAcademic.map(name => ({
 id: `academic-subject:${classLevel}:${name}`,
 name,
 edition: classLevelLabel(classLevel),
 color: D.gold,
 emoji: '',
 })),
 ]

 return (
 <div>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
 <h2 style={{ color:D.gold, fontSize:20, fontWeight:700, margin:0, fontFamily:"'Playfair Display',serif" }}>Select Subject</h2>
 <GoBack onClick={onBack} />
 </div>
 {allSubjects.length === 0 ? (
 <DCard style={{ padding:40, textAlign:'center' }}>
 <div style={{ fontSize:40, marginBottom:12 }}></div>
 <div style={{ color:D.muted }}>No subjects added for this class yet.</div>
 <div style={{ color:D.muted, fontSize:12, marginTop:8 }}>Add subjects in the Question Bank first.</div>
 </DCard>
 ) : (
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:16 }}>
 {allSubjects.map(s => (
 <div key={s.id} onClick={() => onSelect(s.id)} style={{
 cursor:'pointer', overflow:'hidden', border:`2px solid ${D.border}`,
 borderRadius:20, background:D.card, backdropFilter:blur, transition:'all .2s',
 }}
 onMouseEnter={e => { e.currentTarget.style.borderColor=s.color; e.currentTarget.style.transform='translateY(-3px)' }}
 onMouseLeave={e => { e.currentTarget.style.borderColor=D.border; e.currentTarget.style.transform='none' }}>
 <div style={{ height:90, background:`linear-gradient(135deg,${s.color}cc,${s.color}66)`,
 display:'grid', placeItems:'center', fontSize:40 }}>{s.emoji}</div>
 <div style={{ padding:'12px 14px 14px' }}>
 <div style={{ fontWeight:700, fontSize:14, color:D.silver, marginBottom:3 }}>{s.name}</div>
 <div style={{ color:D.muted, fontSize:12, marginBottom:12 }}>{s.edition}</div>
 <div style={{ width:22, height:22, borderRadius:'50%', background:s.color, color:'white',
 display:'grid', placeItems:'center', fontSize:11, fontWeight:700 }}></div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )
}

//  Step 4  Chapters 
function ChapterStep({ subjectId, selectedChapters, selectedTopics, onChange, onNext, onBack }) {
 const isStore = subjectId.startsWith('store:')
 const { questions: storeQs } = usePaperStore()

 if (isStore) {
 const storeSubjId = subjectId.slice(6)
 const chapterList = [...new Set(storeQs.filter(q => q.subjectId===storeSubjId && q.chapter).map(q => q.chapter))].sort()
 const allSel = chapterList.length > 0 && chapterList.every(c => selectedChapters.has(c))
 const toggleAll = () => allSel ? onChange(new Set(), new Set()) : onChange(new Set(chapterList), new Set())
 const toggleCh = ch => {
 const nc = new Set(selectedChapters)
 nc.has(ch) ? nc.delete(ch) : nc.add(ch)
 onChange(nc, new Set())
 }
 return (
 <div>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
 <h2 style={{ color:D.gold, fontSize:20, fontWeight:700, margin:0, fontFamily:"'Playfair Display',serif" }}>Select Chapters</h2>
 <div style={{ display:'flex', gap:10 }}>
 <GoBack onClick={onBack} />
 <GoldBtn onClick={onNext} disabled={!selectedChapters.size}>Next →</GoldBtn>
 </div>
 </div>
 {chapterList.length === 0 ? (
 <DCard style={{ padding:40, textAlign:'center' }}>
 <div style={{ fontSize:40, marginBottom:12 }}></div>
 <div style={{ color:D.muted }}>No chapters found. Add questions with chapters in the Question Bank first.</div>
 </DCard>
 ) : (
 <>
 <DCard style={{ padding:'12px 18px', marginBottom:14, cursor:'pointer' }} onClick={toggleAll}>
 <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontWeight:700, color:D.gold }}>
 <input type="checkbox" checked={allSel} onChange={()=>{}} style={{ width:16, height:16, cursor:'pointer', accentColor:D.gold }} />
 SELECT ALL CHAPTERS
 </label>
 </DCard>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:10 }}>
 {chapterList.map(ch => (
 <DCard key={ch} style={{ padding:'12px 16px', cursor:'pointer',
 background: selectedChapters.has(ch) ? 'rgba(200,153,26,0.12)' : D.card }}
 onClick={() => toggleCh(ch)}>
 <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
 <input type="checkbox" checked={selectedChapters.has(ch)} onChange={()=>{}}
 style={{ width:15, height:15, cursor:'pointer', accentColor:D.gold }} />
 <span style={{ fontWeight:700, fontSize:14, color:D.gold }}>{ch}</span>
 </label>
 </DCard>
 ))}
 </div>
 </>
 )}
 </div>
 )
 }

 const chapters = CHAPTERS.filter(c => c.subjectId === subjectId)
 const allCh = chapters.map(c=>c.id)
 const allTp = chapters.flatMap(c=>c.topics.map(t=>t.id))
 const allSel = allCh.every(id=>selectedChapters.has(id))

 const toggleAll = () => allSel ? onChange(new Set(), new Set())
 : onChange(new Set(allCh), new Set(allTp))

 const toggleCh = ch => {
 const nc = new Set(selectedChapters), nt = new Set(selectedTopics)
 if (nc.has(ch.id)) { nc.delete(ch.id); ch.topics.forEach(t=>nt.delete(t.id)) }
 else { nc.add(ch.id); ch.topics.forEach(t=>nt.add(t.id)) }
 onChange(nc, nt)
 }
 const toggleTp = (ch, tp) => {
 const nc = new Set(selectedChapters), nt = new Set(selectedTopics)
 if (nt.has(tp.id)) { nt.delete(tp.id); if (!ch.topics.some(t=>nt.has(t.id))) nc.delete(ch.id) }
 else { nt.add(tp.id); nc.add(ch.id) }
 onChange(nc, nt)
 }

 return (
 <div>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
 <h2 style={{ color:D.gold, fontSize:20, fontWeight:700, margin:0, fontFamily:"'Playfair Display',serif" }}>Select Chapters</h2>
 <div style={{ display:'flex', gap:10 }}>
 <GoBack onClick={onBack} />
 <GoldBtn onClick={onNext} disabled={!selectedChapters.size}>Next →</GoldBtn>
 </div>
 </div>
 <DCard style={{ padding:'12px 18px', marginBottom:14, cursor:'pointer' }} onClick={toggleAll}>
 <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontWeight:700, color:D.gold }}>
 <input type="checkbox" checked={allSel} onChange={()=>{}} style={{ width:16, height:16, cursor:'pointer', accentColor:D.gold }} />
 SELECT ALL CHAPTERS
 </label>
 </DCard>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:14 }}>
 {chapters.map(ch => (
 <DCard key={ch.id} style={{ padding:0, overflow:'hidden' }}>
 <div onClick={() => toggleCh(ch)} style={{
 padding:'12px 16px', cursor:'pointer', transition:'background .15s',
 background: selectedChapters.has(ch.id) ? 'rgba(200,153,26,0.12)' : 'transparent',
 display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${D.border}`,
 }}>
 <input type="checkbox" checked={selectedChapters.has(ch.id)} onChange={()=>{}} style={{ width:15, height:15, cursor:'pointer', accentColor:D.gold }} />
 <span style={{ fontWeight:700, fontSize:14, color:D.gold }}>CHAP {ch.n}: {ch.en}</span>
 </div>
 <div style={{ padding: '6px' }}>
 {ch.topics.map(tp => (
 <div key={tp.id} onClick={(e) => { e.stopPropagation(); toggleTp(ch, tp); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: selectedTopics.has(tp.id) ? D.gold : D.muted, borderRadius: 8, transition: 'all 0.2s', background: selectedTopics.has(tp.id) ? 'rgba(200,153,26,0.08)' : 'transparent', marginBottom: 2 }}>
 <input type="checkbox" checked={selectedTopics.has(tp.id)} onChange={() => {}} style={{ width: 14, height: 14, cursor: 'pointer', accentColor: D.gold }} />
 <span>{tp.en}</span>
 </div>
 ))}
 </div>
 </DCard>
 ))}
 </div>
 </div>
 )
}

//  Step 5  Question Panel 
const PRIORITIES = [
 { v:'all', l:'All selected' },
 { v:'exercise', l:'Exercise' },
 { v:'past', l:'Past Papers' },
 { v:'additional',l:'Additional' },
]
const MEDIUMS = [
 { v:'dual', l:'DUAL MEDIUM' },
 { v:'urdu', l:'URDU MEDIUM' },
 { v:'english', l:'ENGLISH MEDIUM' },
]

function QuestionPanel({ subjectId, selectedChapters, paper, onPaperChange, onBack, overrideConfig, loadedPaper, uiTheme='dark', onToggleTheme }) {
 const isLoaded = !!overrideConfig
 const isStore = !isLoaded && subjectId.startsWith('store:')
 const { subjects: storeSubjects, questions: storeQs, savePaper, updateSavedPaper, importPaperQuestionsToBank, getFilteredQuestionTypes, questionTypes: allQuestionTypes, paperSettings } = usePaperStore()
 const storeSubjId = isStore ? subjectId.slice(6) : null
 const storeSubjectInfo = isStore ? storeSubjects.find(s => s.id === storeSubjId) : null

 const subject = isLoaded
 ? { name: overrideConfig.subjectName || overrideConfig.subject || '', color: D.gold, emoji: '', edition: '' }
 : isStore
 ? { name: storeSubjectInfo?.name || '', color: D.gold, emoji: '', edition: storeSubjectInfo?.publisher || '' }
 : SUBJECTS.find(s=>s.id===subjectId)
 
 let questionTypes = getFilteredQuestionTypes(subject?.name || '')
 // Ensure that any type with active questions is always shown, even if filtered out by subject
 if (paper && allQuestionTypes) {
 const activeTypes = new Set(allQuestionTypes.filter(t => paper[t.value]?.length > 0).map(t => t.value))
 questionTypes = allQuestionTypes.filter(t => questionTypes.some(qt => qt.value === t.value) || activeTypes.has(t.value))
 }
 if (paper?.official_section?.length && !questionTypes.some(type => type.value === 'official_section')) {
  questionTypes = [...questionTypes, { value:'official_section', label:'Official Questions', labelUrdu:'امتحانی سوالات', marks:0 }]
 }

 const editorSettings = loadedPaper?.editorSettings || {}

 const isOfficialPaper = Boolean(loadedPaper?.documentFormat === 'pts-native-v13' || loadedPaper?.documentFormat === 'official-v12' || loadedPaper?.official_section?.length)
 const ruleProfile = buildPaperRuleProfile(loadedPaper || { config:overrideConfig || {} })
 const [tmpl, setTmpl] = useState(editorSettings.template || 'classic')
 const [printMode, setPrintMode] = useState(editorSettings.printMode || 'a4')
 const [mcqLayout, setMcqLayout] = useState(editorSettings.mcqLayout || (isOfficialPaper ? ruleProfile.presentation.mcqLayout : 'compact-grid'))
 const [shortLayout, setShortLayout] = useState(editorSettings.shortLayout || (isOfficialPaper ? ruleProfile.presentation.shortLayout : '2-column-balanced'))
 const [language, setLanguage] = useState(()=> overrideConfig?.language || 'english')
 const [paperCode, setPaperCode] = useState(()=> overrideConfig?.paperCode || String(Math.floor(1000+Math.random()*9000)))
 const [timeAllwd, setTimeAllwd] = useState(()=> overrideConfig?.timeAllowed || '30 minutes')
 const [examDate, setExamDate] = useState(()=> overrideConfig?.examDate || new Date().toLocaleDateString('en-GB').replace(/\//g,'-'))
 const [headerClass, setHeaderClass] = useState(()=> overrideConfig?.className || overrideConfig?.classLevel || '')
 const [headerSubject, setHeaderSubject] = useState(()=> overrideConfig?.subjectName || overrideConfig?.subject || '')
 const [headerTotalMarks, setHeaderTotalMarks] = useState(()=> Number(overrideConfig?.totalMarks || 0))
 const [headerTitle, setHeaderTitle] = useState(()=> overrideConfig?.title || '')
 const [headerExamType, setHeaderExamType] = useState(()=> overrideConfig?.examType || '')
 const [headerSession, setHeaderSession] = useState(()=> overrideConfig?.session || '')
 const [headerAddress, setHeaderAddress] = useState(()=> overrideConfig?.address || overrideConfig?.campus || '')
 const [marksAuthorityEdited, setMarksAuthorityEdited] = useState(false)
 const [printBub, setPrintBub] = useState(true)
 const [printAns, setPrintAns] = useState(false)
 const [modalOpen, setModalOpen] = useState(!loadedPaper)

 const [qType, setQType] = useState(questionTypes[0]?.value || 'mcq')
 const [priority, setPriority] = useState('all')
 const [medium, setMedium] = useState('dual')
 const [required, setRequired] = useState(10)
 const [ignore, setIgnore] = useState(0)
 const [eachM, setEachM] = useState(() => questionTypes.find(t=>t.value===qType)?.marks || 1)
 const [blankL, setBlankL] = useState(0)
 const [twoPerL, setTwoPerL] = useState(true)
 const [results, setResults] = useState([])
 const [searched, setSearched] = useState(false)
 const [selIds, setSelIds] = useState(new Set())
 const [limitWarn, setLimitWarn] = useState(false)

 const [editMode, setEditMode] = useState(false)
 const [selectedSectionId, setSelectedSectionId] = useState('')
 const [activeEditable, setActiveEditable] = useState(null)
 const [letterSp, setLetterSp] = useState(editorSettings.letterSpacing || 0)
 const [wordSp, setWordSp] = useState(editorSettings.wordSpacing || 0)
 const [engLineH, setEngLineH] = useState(editorSettings.englishLineHeight || (isOfficialPaper ? ruleProfile.presentation.englishLineHeight : 1.5))
 const [urdLineH, setUrdLineH] = useState(editorSettings.urduLineHeight || (isOfficialPaper ? ruleProfile.presentation.urduLineHeight : 2.0))
 const [showAnsLines, setShowAnsLines] = useState(Boolean(editorSettings.showAnswerLines))
 const [fontColor, setFontColor] = useState(editorSettings.fontColor || '#1a1a1a')
 const [fontFamily, setFontFamily] = useState(() => {
  if (editorSettings.fontFamily) return editorSettings.fontFamily
  const isUrduPaper = isUrduScriptPaper({ config: overrideConfig || loadedPaper?.config, ...loadedPaper })
  return isUrduPaper ? URDU_FONT_STACK : "'Times New Roman', Times, serif"
 })
 const [baseFontSz, setBaseFontSz] = useState(editorSettings.fontSize || (isOfficialPaper ? ruleProfile.presentation.bodyFontSize : 13))
 const [headFontSz, setHeadFontSz] = useState(editorSettings.headingSize || (isOfficialPaper ? ruleProfile.presentation.headingFontSize : 14))
 const [fontBold, setFontBold] = useState(Boolean(editorSettings.fontBold))
 const [fontItalic, setFontItalic] = useState(Boolean(editorSettings.fontItalic))
 const [fontUnderline, setFontUnderline] = useState(Boolean(editorSettings.fontUnderline))
 const [textAlign, setTextAlign] = useState(editorSettings.textAlign || 'start')
 const [qBorderStyle, setQBorderStyle] = useState(editorSettings.questionBorder || (isOfficialPaper ? ruleProfile.presentation.questionBorder : 'none'))
 const [pageBorder, setPageBorder] = useState(editorSettings.pageBorder || (isOfficialPaper ? ruleProfile.presentation.pageBorder : 'none'))
 const [showUrduHeaders, setShowUrduHeaders] = useState(Boolean(editorSettings.showUrduHeaders))
 const [showSectionLine, setShowSectionLine] = useState(editorSettings.showSectionLine !== undefined ? Boolean(editorSettings.showSectionLine) : isOfficialPaper)
 const [showWatermark, setShowWatermark] = useState(false)
 const [watermarkOpacity, setWatermarkOpacity] = useState(0.08)
 const [watermarkScale, setWatermarkScale] = useState(1.18)
 const canvasRef = useRef(null)
 const [canvasSize, setCanvasSize] = useState({ width:794, height:1123 })
 const [zoomMode, setZoomMode] = useState('fit-width')
 const [zoomPercent, setZoomPercent] = useState(100)
 const [isFullscreen, setIsFullscreen] = useState(false)

 useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return undefined
  const observer = new ResizeObserver(([entry]) => setCanvasSize({ width:entry.contentRect.width, height:entry.contentRect.height }))
  observer.observe(canvas)
  return () => observer.disconnect()
 }, [])

 useEffect(() => {
  const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
  document.addEventListener('fullscreenchange', onFullscreenChange)
  return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
 }, [])

 let derivedSubjectName = '', derivedClassName = ''
 if (isLoaded) {
  derivedSubjectName = overrideConfig.subjectName || overrideConfig.subject || ''
  derivedClassName = overrideConfig.className || overrideConfig.classLevel || ''
 } else if (isStore) {
  derivedSubjectName = storeSubjectInfo?.name || ''
  derivedClassName = storeSubjectInfo?.classLevel || ''
 } else {
  const subj = SUBJECTS.find(s=>s.id===subjectId)
  derivedSubjectName = subj?.name || ''
  derivedClassName = CLASSES.find(c=>c.id===subj?.classId)?.label || ''
 }
 const subjectName = headerSubject || derivedSubjectName
 const className = headerClass || derivedClassName
 const cfg = {
    ...(overrideConfig || {}),
    title: headerTitle || overrideConfig?.title || '',
    examType: headerExamType || overrideConfig?.examType || '',
    session: headerSession || overrideConfig?.session || '',
    address: headerAddress || overrideConfig?.address || overrideConfig?.campus || '',
    className,
    subjectName,
    paperCode,
    timeAllowed: timeAllwd,
    examDate,
    language,
    classLevel: className,
    subject: subjectName,
    totalMarks: Number(headerTotalMarks || 0),
  }
 const liveAuditPaper = {
  ...(loadedPaper || {}),
  ...paper,
  config: cfg,
  official_section: paper.official_section || loadedPaper?.official_section || [],
  printReadiness: marksAuthorityEdited ? 'READY' : loadedPaper?.printReadiness,
 }
 const marksLedger = isOfficialPaper ? buildMarksLedger(liveAuditPaper) : { headerTotal:Number(headerTotalMarks || 0), questionTotal:0, balanced:false, difference:0 }
 const draftQuality = isOfficialPaper ? validatePaperDraft(liveAuditPaper) : { ready:true, issues:[], errorCount:0, warningCount:0, academicQuestionCount:0 }
 const printAudit = isOfficialPaper ? auditOfficialPaperForPrint(liveAuditPaper) : { blocked:false, issues:[] }
 const templateVariant = ({
  academic:'academic', modern:'modern', emerald:'emerald', gold:'gold', coral:'coral', violet:'violet', minimal:'minimal', editorial:'editorial',
  // Compatibility aliases keep previously saved papers opening without migration.
  classic:'academic', elite:'gold', 'docx-assessment':'academic', 'royal-elite':'gold', 'board-blue':'modern', 'compact-classic':'academic',
  'serif-gold':'gold', 'clean-minimal':'coral', 'exam-grid':'violet', 'scholar-classic':'academic',
 }[tmpl] || 'academic')
 const half = printMode === 'half'
 const fitWidthZoom = (canvasSize.width - 24) / 794
 const fitPageZoom = Math.min(fitWidthZoom, (canvasSize.height - 24) / 1123)
 const previewZoom = Math.max(0.35, Math.min(1.75, zoomMode === 'fit-width' ? fitWidthZoom : zoomMode === 'fit-page' ? fitPageZoom : zoomPercent / 100))
 const stepZoom = step => {
  setZoomPercent(Math.max(50, Math.min(175, Math.round(previewZoom * 100 / 10) * 10 + step)))
  setZoomMode('custom')
 }
 const totalQs = questionTypes.reduce((sum, t) => sum + (paper[t.value]?.length || 0), 0)
 const pageBorderMap = { none: 'none', thin: '1px solid #111', thick: '3px solid #111', double: '4px double #111' }
 const pageBorderStyle = pageBorderMap[pageBorder] || 'none'
 const updatePaperQuestion = (type, id, changes) => {
  if (Object.prototype.hasOwnProperty.call(changes || {}, 'marks')) setMarksAuthorityEdited(true)
  onPaperChange(current => ({ ...current, [type]:(current[type] || []).map(question => question.id === id ? { ...question, ...changes } : question) }))
 }
 const resequenceOfficial = sections => normalizeSectionOrder(
  sections,
  isUrduScriptPaper({ config:cfg, ...paper })
 )
 const deleteOfficialSection = id => {
  if (String(selectedSectionId||'') === String(id||'')) { setSelectedSectionId(''); setActiveEditable(null) }
  onPaperChange(current => ({ ...current, official_section:resequenceOfficial((current.official_section || []).filter(section => section.id !== id)) }))
 }
 const duplicateOfficialSection = id => onPaperChange(current => {
  const sections = [...(current.official_section || [])]
  const index = sections.findIndex(section => section.id === id)
  if (index < 0) return current
  const copy = { ...sections[index], id:`${sections[index].id || 'section'}-copy-${Date.now()}` }
  sections.splice(index + 1, 0, copy)
  return { ...current, official_section:resequenceOfficial(sections) }
 })
 const moveOfficialSection = (id, delta) => onPaperChange(current => {
  const sections = [...(current.official_section || [])]
  const from = sections.findIndex(section => section.id === id)
  const to = Math.max(0, Math.min(sections.length - 1, from + Number(delta || 0)))
  if (from < 0 || from === to) return current
  const [item] = sections.splice(from, 1); sections.splice(to, 0, item)
  return { ...current, official_section:resequenceOfficial(sections) }
 })
 const addOfficialSection = () => onPaperChange(current => {
  const sections = [...(current.official_section || [])]
  const academicCount = sections.filter(section => inferOfficialSectionKind(section) !== 'marker').length
  const serial = academicCount + 1
  const urdu = isUrduScriptPaper({ config:cfg, ...current })
  const heading = urdu ? `سوال نمبر ${serial}: نیا سوال۔` : `Q${serial}. New Question`
  sections.push({ id:`${loadedPaper?.id || 'paper'}-manual-${Date.now()}`, type:'official_section', medium:urdu?'urdu':'english', heading, text:heading, textUrdu:urdu?heading:'', content:'', marks:0, sourceOrder:sections.length + 1, priority:'manual' })
  return { ...current, official_section:resequenceOfficial(sections) }
 })
 const applyWorkspaceRules = () => {
  if (!isOfficialPaper) return
  const next = applyAsspsPaperRules({ ...liveAuditPaper, config:cfg, official_section:paper.official_section || [] })
  onPaperChange(current => ({
   ...current,
   official_section: next.official_section,
   selectedQuestions: next.selectedQuestions,
   paperSystemVersion: next.paperSystemVersion,
   paperSystem: next.paperSystem,
  }))
  setMcqLayout(next.editorSettings.mcqLayout)
  setShortLayout(next.editorSettings.shortLayout)
  setPageBorder(next.editorSettings.pageBorder)
  setQBorderStyle(next.editorSettings.questionBorder)
  setFontFamily(next.editorSettings.fontFamily)
  setBaseFontSz(next.editorSettings.fontSize)
  setHeadFontSz(next.editorSettings.headingSize)
  setEngLineH(next.editorSettings.englishLineHeight)
  setUrdLineH(next.editorSettings.urduLineHeight)
  setShowSectionLine(next.editorSettings.showSectionLine)
 }
 const selectedSection = (paper.official_section || []).find(section => String(section.id||'') === String(selectedSectionId||'')) || null
 const selectedSectionKind = selectedSection ? inferOfficialSectionKind(selectedSection) : 'auto'
 const selectedSectionMarks = selectedSection ? resolveSectionTotalMarks(selectedSection) : 0
 const toggleEditMode = () => setEditMode(current => {
  const next = !current
  if (!next) { setSelectedSectionId(''); setActiveEditable(null) }
  return next
 })
 const updateSelectedSection = changes => selectedSection && updatePaperQuestion('official_section', selectedSection.id, changes)
 const tplProps = { paper, cfg, printBubble:printBub, printAns, half, editMode, letterSp, wordSp, engLineH, urdLineH, showAnsLines, fontColor, fontFamily, baseFontSz, headFontSz, fontBold, fontItalic, fontUnderline, textAlign, qBorderStyle, showUrduHeaders, showSectionLine, questionTypes, settings: paperSettings, pbStyle: pageBorderStyle, onQuestionChange:updatePaperQuestion, onDeleteSection:deleteOfficialSection, onDuplicateSection:duplicateOfficialSection, onMoveSection:moveOfficialSection, onAddSection:addOfficialSection, onSelectSection:setSelectedSectionId, selectedSectionId, onActiveEditable:setActiveEditable, mcqLayout, shortLayout }

 function doSearch() {
 const addedIds = new Set((paper[qType]||[]).map(q=>q.id))
 let pool
 if (isStore) {
 pool = storeQs.filter(q => q.subjectId === storeSubjId && q.type === qType && (!selectedChapters.size || selectedChapters.has(q.chapter)) && questionMatchesMedium(q, medium) && (priority==='all' || !q.priority || q.priority==='all' || q.priority===priority) && !addedIds.has(q.id)).map(storeQToTemplate)
 } else {
 const cids = [...selectedChapters]
 pool = QUESTIONS.filter(q => q.type===qType && cids.includes(q.chapterId) && questionMatchesMedium(q, medium) && (priority==='all' || q.priority===priority) && !addedIds.has(q.id))
 }
 if (ignore>0) pool = pool.slice(ignore)
 setResults(pool); setSearched(true); setSelIds(new Set()); setLimitWarn(false)
 }

 function randomSelect() {
 const n = Math.min(required, results.length)
 setSelIds(new Set([...results].sort(()=>Math.random()-.5).slice(0,n).map(q=>q.id)))
 }

 function addSelected() {
 if (!selIds.size) return
 const toAdd = results.filter(q=>selIds.has(q.id))
 const updated = { ...paper, [qType]:[...(paper[qType]||[]),...toAdd], [`${qType}_marks`]:eachM }
 onPaperChange(updated)
 setResults(results.filter(q=>!selIds.has(q.id)))
 setSelIds(new Set())
 setModalOpen(false)
 }

 function toggleQ(id) {
 const n = new Set(selIds)
 if (n.has(id)) { n.delete(id); setLimitWarn(false) }
 else if (n.size >= required) { setLimitWarn(true); return }
 else { n.add(id); setLimitWarn(false) }
 setSelIds(n)
 }

 function doSave() {
 if (!totalQs) return
 const name = `${subjectName} ${className} — ${new Date().toLocaleDateString('en-GB')}`
 const selectedQuestions = {}
 questionTypes.forEach(t => { selectedQuestions[t.value] = { questions: paper[t.value] || [], marks: paper[`${t.value}_marks`] || t.marks || 1 } })
 const editorState = {
  template:tmpl, printMode, questionBorder:qBorderStyle, pageBorder,
  showAnswerLines:showAnsLines, showUrduHeaders, showSectionLine,
  fontColor, fontFamily, fontSize:baseFontSz, headingSize:headFontSz,
  fontBold, fontItalic, fontUnderline, textAlign,
  urduLineHeight:urdLineH, englishLineHeight:engLineH, letterSpacing:letterSp, wordSpacing:wordSp,
  mcqLayout, shortLayout,
 }
 const payloadBase = {
       ...paper,
       name: loadedPaper?.name || name,
       config: { ...(loadedPaper?.config || {}), ...cfg },
       selectedMCQ: paper.mcq || [],
       selectedShort: paper.short || [],
       selectedLong: paper.long || [],
       teacherHidden: overrideConfig?.teacherHidden || false,
       editorSettings:editorState,
       printReadiness: isOfficialPaper && !printAudit.blocked ? 'READY' : (loadedPaper?.printReadiness || paper.printReadiness),
       selectedQuestions,
     }
 const payload = isOfficialPaper ? stampWorkingCopy(payloadBase, loadedPaper || payloadBase) : payloadBase
 const saved = loadedPaper?.id ? updateSavedPaper(loadedPaper.id, payload) : savePaper(payload)
  if (!saved) return // Failed due to quota exceeded
  
  const questionBankMeta = loadedPaper?.questionBankSubjectMeta || {
  name: overrideConfig?.subjectName || overrideConfig?.subject || subjectName || '',
  classLevel: overrideConfig?.classLevel || className || '',
  publisher: overrideConfig?.publisher || (storeSubjectInfo?.publisher || ''),
  }
  const shouldImport = Boolean(loadedPaper?.importToQuestionBank || overrideConfig?.importToQuestionBank)
  if (shouldImport) {
  importPaperQuestionsToBank({
  subjectId: loadedPaper?.questionBankSubjectId || overrideConfig?.questionBankSubjectId || '',
  subjectMeta: questionBankMeta,
  selectedMCQ: paper.mcq || [],
  selectedShort: paper.short || [],
  selectedLong: paper.long || [],
  selectedQuestions,
  medium: loadedPaper?.config?.language || loadedPaper?.config?.medium || overrideConfig?.language || overrideConfig?.medium || 'english',
  source: loadedPaper?.paperSource || overrideConfig?.paperSource || 'paper',
  })
  }
  alert(`Paper saved! "${payload.name}" (${totalQs} questions)`)
 }

 async function doPrint() {
 if (draftQuality.errorCount > 0) {
  alert(['PRINT BLOCKED — paper quality gate found errors.', ...draftQuality.issues.filter(issue=>issue.level==='error').map(issue=>`• ${issue.text}`)].join('\n'))
  return
 }
 if (printAudit.blocked) {
  alert(paperPrintBlockMessage(printAudit))
  return
 }
 if (editMode) {
  setEditMode(false)
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
 }
 const canvas = document.getElementById('paper-canvas')
 if (!canvas) return
 if (half && [...canvas.querySelectorAll('.half-paper')].some(page => page.scrollHeight > page.clientHeight + 1)) {
  alert('This paper does not fit twice on A4. Select Single A4 to print without cutting content.')
  return
 }
 const old = document.getElementById('__print_frame')
 if (old) old.remove()
 const iframe = document.createElement('iframe')
 iframe.id = '__print_frame'
 iframe.style.cssText = 'position:fixed;top:0;left:-9999px;width:210mm;height:297mm;border:0;background:white'
 document.body.appendChild(iframe)
 const doc = iframe.contentDocument || iframe.contentWindow.document
 const printable = canvas.cloneNode(true)
 printable.querySelectorAll('script,iframe,object,embed,form').forEach(node => node.remove())
 printable.querySelectorAll('*').forEach(node => {
  for (const attribute of [...node.attributes]) {
   if (/^on/i.test(attribute.name) || ((attribute.name === 'href' || attribute.name === 'src') && /^\s*javascript:/i.test(attribute.value))) node.removeAttribute(attribute.name)
  }
  node.removeAttribute('contenteditable')
 })
 doc.open()
 const wmCss = (showWatermark && paperSettings?.logo && watermarkOpacity > 0) ? `body::before { content: ""; position: fixed; top: 52%; left: 50%; transform: translate(-50%, -50%); width: ${145 * watermarkScale}mm; height: ${145 * watermarkScale}mm; background-image: url('${paperSettings.logo}'); background-repeat: no-repeat; background-position: center; background-size: contain; opacity: ${watermarkOpacity}; z-index: 0; pointer-events: none; } body > * { position: relative; z-index: 1; } .preview-wm { display: none !important; }` : ''
 doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
@font-face{
  font-family:'ASSPS Jameel Noori';
  src:
    local('Jameel Noori Nastaleeq'),
    local('Jameel Noori Nastaleeq Kasheeda'),
    url('/fonts/JameelNooriNastaleeqKasheeda.ttf') format('truetype');
  font-style: normal;
  font-weight: 400 900;
  font-display: block;
}
@font-face{
  font-family:'Jameel Noori Nastaleeq';
  src:
    local('Jameel Noori Nastaleeq'),
    local('Jameel Noori Nastaleeq Kasheeda'),
    url('/fonts/JameelNooriNastaleeqKasheeda.ttf') format('truetype');
  font-style: normal;
  font-weight: 400 900;
  font-display: block;
}
[dir="rtl"], .urdu, .urdu-text, [data-urdu="true"], [dir="rtl"] * {
  font-family: 'ASSPS Jameel Noori', 'Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq Kasheeda', 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif !important;
}
*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0;background:white}@page{size:A4 portrait;margin:4mm}body{width:100%}#paper-canvas{display:block!important;width:100%!important;height:auto!important;min-height:0!important;overflow:visible!important;padding:0!important;background:#fff!important}.preview-container{zoom:1!important;width:100%!important;min-height:0!important;height:auto!important;aspect-ratio:auto!important;box-shadow:none!important;margin:0!important;overflow:visible!important;break-after:page}.preview-container:last-child{break-after:auto}${half ? '.preview-container{height:288mm!important;min-height:288mm!important}.half-paper{height:144mm!important;overflow:hidden!important;break-inside:avoid!important}' : ''}.preview-container>[data-premium-template]{width:100%!important;min-height:0!important}[contenteditable]{outline:none!important;border:none!important;background:transparent!important}.no-print,[data-edit-guide]{display:none!important}table{border-collapse:collapse}hr{display:block}${wmCss}</style></head><body>${printable.outerHTML}</body></html>`)
 doc.close()
 try {
  if (doc.fonts) {
   await Promise.race([
    Promise.all([
     doc.fonts.load("16px 'ASSPS Jameel Noori'"),
     doc.fonts.load("16px 'Jameel Noori Nastaleeq'"),
     doc.fonts.ready,
    ]),
    new Promise(resolve => setTimeout(resolve, 2000))
   ])
  }
 } catch (err) {
  console.warn('Urdu print font preload warning in doPrint:', err)
 }
 try { iframe.contentWindow.focus(); iframe.contentWindow.print() } catch(e) { console.error('iframe print failed:', e) }
 setTimeout(() => { if (document.body.contains(iframe)) iframe.remove() }, 3000)
 }

 const tinp = { background:'rgba(11,44,77,0.6)', border:`1px solid ${D.border}`, borderRadius:8, color:D.silver, padding:'7px 10px', fontSize:12, outline:'none', boxSizing:'border-box' }
 const filterInp = { background:'rgba(11,44,77,0.6)', border:`1px solid ${D.border}`, borderRadius:8, color:D.silver, padding:'7px 10px', fontSize:13, outline:'none', boxSizing:'border-box' }
 const filterSel = { ...filterInp, cursor:'pointer' }

 return (
 <div className="pts-generator-surface" style={{ display:'flex', flexDirection:'column', minHeight:'calc(100vh - 82px)', height:'calc(100vh - 82px)', width:'100%', position:'relative', ...themeVars(uiTheme) }}>
 <style>{`.pts-generator-surface select option, .pts-generator-surface select optgroup { background: var(--pg-option-bg, #0a1e35); color: var(--pg-option-text, #e6eef8); }`}</style>
 <div style={{ background:'var(--pg-toolbar, rgba(7,25,48,0.97))', backdropFilter:blur, borderBottom:`1px solid ${D.border}`, padding:'12px 20px', flexShrink:0 }}>
 <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
 <div style={{display:'flex',alignItems:'center',gap:7}}>
  <span style={{fontSize:11,color:D.muted,fontWeight:800}}>Template</span>
  <select aria-label="Paper template" value={tmpl} onChange={e=>setTmpl(e.target.value)} style={{...tinp,minWidth:170,cursor:'pointer',fontWeight:700,color:D.gold}}>
   {TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
  </select>
 </div>
 <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
 <ThemeToggle mode={uiTheme} onToggle={onToggleTheme} />
 {PRINT_MODES.map(m=>(<button key={m.id} onClick={()=>setPrintMode(m.id)} style={{ padding:'8px 16px', borderRadius:9, border:`1px solid ${D.border}`, cursor:'pointer', fontWeight:600, fontSize:12, transition:'all .15s', background: printMode===m.id ? `rgba(48,209,88,0.15)` : 'rgba(15,23,42,0.46)', color: printMode===m.id ? D.green : D.muted, borderColor: printMode===m.id ? `rgba(48,209,88,0.4)` : D.border, }}>{printMode===m.id?' ':' '}{m.label}</button>))}
 </div>
 </div>
 <div data-paper-header-controls style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
 {[['Class', headerClass, setHeaderClass, 70, 'text'], ['Subject', headerSubject, setHeaderSubject, 120, 'text'], ['Paper Code', paperCode, setPaperCode, 105, 'text'], ['Time Allowed', timeAllwd, setTimeAllwd, 110, 'text'], ['Exam Date', examDate, setExamDate, 110, 'text']].map(([lbl, val, set, w, type])=>(
 <div key={lbl} style={{ display:'flex', gap:6, alignItems:'center' }}>
 <span style={{ fontSize:12, color:D.muted, fontWeight:600 }}>{lbl}</span>
 <input type={type} value={val} onChange={e=>set(e.target.value)} style={{ ...tinp, width:w }} />
 </div>
 ))}
 <div style={{ display:'flex', gap:6, alignItems:'center' }}>
 <span style={{ fontSize:12, color:D.muted, fontWeight:600 }}>Total Marks</span>
 <input aria-label="Total Marks" type="number" min="0" value={headerTotalMarks || ''} onChange={e=>{ setHeaderTotalMarks(Math.max(0,Number(e.target.value)||0)); setMarksAuthorityEdited(true) }} style={{ ...tinp, width:72 }} />
 </div>
 <div style={{ display:'flex', gap:6, alignItems:'center' }}>
 <span style={{ fontSize:12, color:D.muted, fontWeight:600 }}>Language</span>
 <select value={language} onChange={e=>setLanguage(e.target.value)} style={{ ...tinp, cursor:'pointer', width:120 }}><option value="english">English</option><option value="urdu">Urdu (اردو)</option><option value="dual">Dual Medium</option></select>
 </div>
 <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12, color:D.silver }}><input type="checkbox" checked={printBub} onChange={e=>setPrintBub(e.target.checked)} style={{ accentColor:D.gold }} />Bubble Sheet</label>
 <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12, color:D.silver }}><input type="checkbox" checked={printAns} onChange={e=>setPrintAns(e.target.checked)} style={{ accentColor:D.gold }} />Answer Keys</label>
 <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12, color:D.silver }}><input type="checkbox" checked={showAnsLines} onChange={e=>setShowAnsLines(e.target.checked)} style={{ accentColor:D.gold }} />Ans Lines</label>
 <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
 <DBtn color="ghost" onClick={onBack} style={{ padding:'8px 14px', fontSize:12 }}>← Back</DBtn>
 {isOfficialPaper && <button data-edit-paper-toggle type="button" onClick={toggleEditMode} style={{ padding:'8px 15px', borderRadius:9, border:`1px solid ${editMode?'#ef4444':D.border}`, cursor:'pointer', fontWeight:800, fontSize:12, background:editMode?'rgba(239,68,68,.16)':'rgba(11,44,77,.92)', color:editMode?'#fecaca':D.silver }}>{editMode?'Done Editing':'Edit Paper'}</button>}
 <button onClick={()=>setModalOpen(true)} style={{ background:`linear-gradient(135deg,#0A84FF,#0055cc)`, color:'white', border:'none', borderRadius:10, padding:'8px 18px', fontWeight: 600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7, }}> Question Menu {totalQs > 0 && (<span style={{ background:'rgba(255,255,255,0.25)', borderRadius:9, padding:'1px 8px', fontSize:11, fontWeight: 600 }}>{totalQs}</span>)}</button>
 <DBtn color="green" onClick={doSave} disabled={!totalQs} style={{ padding:'8px 16px', fontSize:13 }}> Save</DBtn>
 <GoldBtn onClick={doPrint} style={{ padding:'8px 20px', fontSize:13 }}> Print</GoldBtn>
 </div>
 </div>
 <details data-paper-metadata-editor style={{ marginTop:8 }}>
 <summary style={{ cursor:'pointer', color:D.gold, fontSize:12, fontWeight:800, userSelect:'none' }}>Paper Information — edit all header fields</summary>
 <div style={{ display:'grid', gridTemplateColumns:'2fr 1.4fr 1fr', gap:10, marginTop:8, alignItems:'end' }}>
  <label style={{ fontSize:11, color:D.muted, fontWeight:700 }}>Paper / Exam Title<input value={headerTitle} onChange={e=>setHeaderTitle(e.target.value)} style={{...tinp,width:'100%',marginTop:4}} /></label>
  <label style={{ fontSize:11, color:D.muted, fontWeight:700 }}>Exam Type<input value={headerExamType} onChange={e=>setHeaderExamType(e.target.value)} style={{...tinp,width:'100%',marginTop:4}} /></label>
  <label style={{ fontSize:11, color:D.muted, fontWeight:700 }}>Session<input value={headerSession} onChange={e=>setHeaderSession(e.target.value)} style={{...tinp,width:'100%',marginTop:4}} /></label>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr auto', gap:10, marginTop:8, alignItems:'end' }}>
  <label style={{ fontSize:11, color:D.muted, fontWeight:700 }}>Campus / Address<input value={headerAddress} onChange={e=>setHeaderAddress(e.target.value)} placeholder={paperSettings?.address || 'Sharif Chowk, Rayya Khas, Narowal'} style={{...tinp,width:'100%',marginTop:4}} /></label>
  {isOfficialPaper && <div data-marks-ledger style={{ border:`1px solid ${marksLedger.balanced?'rgba(48,209,88,.45)':'rgba(255,159,10,.55)'}`, borderRadius:8, padding:'7px 9px', background:marksLedger.balanced?'rgba(48,209,88,.08)':'rgba(255,159,10,.08)', fontFamily:'Arial,sans-serif' }}><div style={{fontSize:10,color:D.muted,fontWeight:800}}>MARKS LEDGER</div><div style={{fontSize:12,color:marksLedger.balanced?D.green:D.orange,fontWeight:900}}>Header {marksLedger.headerTotal || 0} / Questions {marksLedger.questionTotal || 0}</div></div>}
  {isOfficialPaper && <button type="button" disabled={!marksLedger.questionTotal || marksLedger.headerTotal===marksLedger.questionTotal} onClick={()=>{setHeaderTotalMarks(marksLedger.questionTotal);setMarksAuthorityEdited(true)}} style={{...tinp,cursor:'pointer',fontWeight:800,color:D.gold,minWidth:128}}>Use Question Total</button>}
 </div>
 {isOfficialPaper && <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) auto', gap:10, marginTop:8, alignItems:'start' }}>
  <div data-paper-quality-gate style={{ border:`1px solid ${draftQuality.errorCount?'rgba(255,55,95,.55)':draftQuality.warningCount?'rgba(255,159,10,.55)':'rgba(48,209,88,.45)'}`, borderRadius:8, padding:'8px 10px', background:draftQuality.errorCount?'rgba(255,55,95,.08)':draftQuality.warningCount?'rgba(255,159,10,.08)':'rgba(48,209,88,.08)', fontFamily:'Arial,sans-serif' }}>
   <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}><b style={{ fontSize:11, color:draftQuality.errorCount?D.red:draftQuality.warningCount?D.orange:D.green }}>PAPER QUALITY GATE</b><span style={{ fontSize:11, color:D.silver }}>{draftQuality.academicQuestionCount} questions · {draftQuality.errorCount} errors · {draftQuality.warningCount} warnings</span></div>
   {draftQuality.issues.length > 0 && <div style={{ marginTop:5, fontSize:10, color:D.muted }}>{draftQuality.issues.slice(0,4).map(issue=><div key={`${issue.code}-${issue.question||0}-${issue.item||0}`}>• {issue.text}</div>)}{draftQuality.issues.length>4&&<div>• +{draftQuality.issues.length-4} more issue(s)</div>}</div>}
  </div>
  <button data-apply-assps-rules type="button" onClick={applyWorkspaceRules} style={{...tinp,cursor:'pointer',fontWeight:900,color:D.gold,minWidth:158,padding:'9px 12px'}}>Apply ASSPS Rules</button>
 </div>}
 <div style={{ marginTop:7, fontSize:10, color:D.muted }}>School name and logo are locked to school branding. Every other paper field is editable. Official source data stays locked; Save writes an editable working copy.</div>
 </details>
 <details style={{ marginTop:8 }}>
 <summary style={{ cursor:'pointer', color:D.silver, fontSize:12, fontWeight:700, userSelect:'none' }}>Paper Style &amp; Layout</summary>
 <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'center', marginTop:10 }}>
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Letter Sp</span>
 <input type="range" min={0} max={3} step={0.5} value={letterSp} onChange={e=>setLetterSp(Number(e.target.value))} style={{ width:70, accentColor:D.gold }} />
 <span style={{ fontSize:11, color:D.gold, minWidth:22 }}>{letterSp}px</span>
 </div>
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Word Sp</span>
 <input type="range" min={0} max={8} step={0.5} value={wordSp} onChange={e=>setWordSp(Number(e.target.value))} style={{ width:70, accentColor:D.gold }} />
 <span style={{ fontSize:11, color:D.gold, minWidth:22 }}>{wordSp}px</span>
 </div>
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Line H (En)</span>
 <input type="range" min={1} max={3} step={0.1} value={engLineH} onChange={e=>setEngLineH(Number(e.target.value))} style={{ width:70, accentColor:D.gold }} />
 <span style={{ fontSize:11, color:D.gold, minWidth:26 }}>{engLineH}</span>
 </div>
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Line H (Ur)</span>
 <input type="range" min={1.5} max={4} step={0.1} value={urdLineH} onChange={e=>setUrdLineH(Number(e.target.value))} style={{ width:70, accentColor:D.gold }} />
 <span style={{ fontSize:11, color:D.gold, minWidth:26 }}>{urdLineH}</span>
 </div>
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Font</span>
 <select value={fontFamily} onChange={e=>setFontFamily(e.target.value)} style={{ background:'rgba(11,44,77,0.7)', border:`1px solid ${D.border}`, borderRadius:6, color:D.silver, padding:'4px 8px', fontSize:11, outline:'none', cursor:'pointer' }}>
 <option value="">Default</option>
 <option value="'Times New Roman', serif">Times New Roman</option>
 <option value="'Arial', sans-serif">Arial</option>
 <option value="'Verdana', sans-serif">Verdana</option>
 <option value="'Georgia', serif">Georgia</option>
 <option value="'Cambria', serif">Cambria</option>
 <option value="'Calibri', sans-serif">Calibri</option>
 <option value="'Garamond', serif">Garamond</option>
 <option value="'Book Antiqua', serif">Book Antiqua</option>
 <option value="'ASSPS Jameel Noori', 'Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq Kasheeda', 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif">Jameel Noori Nastaleeq</option>
 <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
 <option value="'Palatino Linotype', serif">Palatino Linotype</option>
 </select>
 </div>
 <div role="group" aria-label="Whole-paper text style" style={{ display:'flex', gap:3 }}>
 {[['B',fontBold,setFontBold,{fontWeight:900}],['I',fontItalic,setFontItalic,{fontStyle:'italic'}],['U',fontUnderline,setFontUnderline,{textDecoration:'underline'}]].map(([label,active,setter,textStyle])=><button key={label} title={`${label==='B'?'Bold':label==='I'?'Italic':'Underline'} whole paper`} onClick={()=>setter(!active)} style={{ width:30, height:28, borderRadius:5, border:`1px solid ${active?D.gold:D.border}`, background:active?'rgba(200,153,26,.2)':'rgba(11,44,77,.7)', color:active?D.gold:D.silver, cursor:'pointer', ...textStyle }}>{label}</button>)}
 </div>
 <div role="group" aria-label="Text alignment" style={{ display:'flex', gap:3 }}>
 {[['start','Left'],['center','Center'],['end','Right'],['justify','Justify']].map(([value,label])=><button key={value} title={`${label} align`} onClick={()=>setTextAlign(value)} style={{ padding:'4px 7px', borderRadius:5, border:`1px solid ${textAlign===value?D.gold:D.border}`, background:textAlign===value?'rgba(200,153,26,.2)':'rgba(11,44,77,.7)', color:textAlign===value?D.gold:D.silver, cursor:'pointer', fontSize:10 }}>{label[0]}</button>)}
 </div>
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Color</span>
 <input type="color" value={fontColor} onChange={e=>setFontColor(e.target.value)} style={{ width:30, height:26, padding:2, borderRadius:6, border:`1px solid ${D.border}`, background:'transparent', cursor:'pointer' }} />
 </div>
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Size</span>
 <input type="number" min={8} max={16} value={baseFontSz} onChange={e=>setBaseFontSz(Number(e.target.value))} style={{ width:46, background:'rgba(11,44,77,0.7)', border:`1px solid ${D.border}`, borderRadius:6, color:D.gold, padding:'3px 6px', fontSize:12, outline:'none', fontWeight:700, textAlign:'center' }} />
 </div>
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Head Size</span>
 <input type="number" min={8} max={24} value={headFontSz} onChange={e=>setHeadFontSz(Number(e.target.value))} style={{ width:46, background:'rgba(11,44,77,0.7)', border:`1px solid ${D.border}`, borderRadius:6, color:D.gold, padding:'3px 6px', fontSize:12, outline:'none', fontWeight:700, textAlign:'center' }} />
 </div>
 </div>
 <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'center', marginTop:8, paddingTop:8, borderTop:`1px solid ${D.border}` }}>
 <span style={{ fontSize:11, color:D.gold, fontWeight:700, letterSpacing:'0.04em' }}>STRUCTURE</span>
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Q Border</span>
 <div style={{ display:'flex', gap:3 }}>
 {[['none','None'],['box','Box'],['table','Table']].map(([v,l])=>(<button key={v} onClick={()=>setQBorderStyle(v)} style={{ padding:'3px 10px', borderRadius:6, border:`1px solid ${qBorderStyle===v?D.gold:D.border}`, cursor:'pointer', fontWeight:qBorderStyle===v?700:400, fontSize:11, background: qBorderStyle===v?`rgba(200,153,26,0.2)`:'rgba(11,44,77,0.92)', color: qBorderStyle===v?D.gold:D.muted, }}>{l}</button>))}
 </div>
 </div>
 <div style={{ width:1, height:18, background:D.border }} />
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>MCQ Layout</span>
 <div style={{ display:'flex', gap:3 }}>
 {[['compact-grid','Grid'],['matrix-table','Table'],['classic','Classic']].map(([v,l])=>(<button key={v} onClick={()=>setMcqLayout(v)} style={{ padding:'3px 9px', borderRadius:6, border:`1px solid ${mcqLayout===v?D.gold:D.border}`, cursor:'pointer', fontWeight:mcqLayout===v?700:400, fontSize:11, background: mcqLayout===v?`rgba(200,153,26,0.2)`:'rgba(11,44,77,0.92)', color: mcqLayout===v?D.gold:D.muted }}>{l}</button>))}
 </div>
 </div>
 <div style={{ width:1, height:18, background:D.border }} />
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Short Qs</span>
 <div style={{ display:'flex', gap:3 }}>
 {[['2-column-balanced','2-Col (1-5|6-10)'],['1-column','1-Col'],['table','Table']].map(([v,l])=>(<button key={v} onClick={()=>setShortLayout(v)} style={{ padding:'3px 9px', borderRadius:6, border:`1px solid ${shortLayout===v?D.gold:D.border}`, cursor:'pointer', fontWeight:shortLayout===v?700:400, fontSize:11, background: shortLayout===v?`rgba(200,153,26,0.2)`:'rgba(11,44,77,0.92)', color: shortLayout===v?D.gold:D.muted }}>{l}</button>))}
 </div>
 </div>
 <div style={{ width:1, height:18, background:D.border }} />
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Page Border</span>
 <div style={{ display:'flex', gap:3 }}>
 {[['none','None'],['thin','Thin'],['thick','Thick'],['double','Double']].map(([v,l])=>(<button key={v} onClick={()=>setPageBorder(v)} style={{ padding:'3px 10px', borderRadius:6, border:`1px solid ${pageBorder===v?D.gold:D.border}`, cursor:'pointer', fontWeight:pageBorder===v?700:400, fontSize:11, background: pageBorder===v?`rgba(200,153,26,0.2)`:'rgba(11,44,77,0.92)', color: pageBorder===v?D.gold:D.muted, }}>{l}</button>))}
 </div>
 </div>
 <div style={{ width:1, height:18, background:D.border }} />
 <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12, color:D.silver }}><input type="checkbox" checked={showWatermark} onChange={e=>setShowWatermark(e.target.checked)} style={{ accentColor:D.gold }} />Logo WM</label>
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Watermark</span>
 <input type="range" min={0.03} max={0.22} step={0.01} value={watermarkOpacity} onChange={e=>setWatermarkOpacity(Number(e.target.value))} style={{ width:70, accentColor:D.gold }} />
 </div>
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>WM Size</span>
 <input type="range" min={0.8} max={1.6} step={0.05} value={watermarkScale} onChange={e=>setWatermarkScale(Number(e.target.value))} style={{ width:70, accentColor:D.gold }} />
 </div>
 <div style={{ width:1, height:18, background:D.border }} />
 <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12, color:D.silver }}><input type="checkbox" checked={showUrduHeaders} onChange={e=>setShowUrduHeaders(e.target.checked)} style={{ accentColor:D.gold }} />حصہ معروضی / انشائیہ</label>
 <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12, color:D.silver }}><input type="checkbox" checked={showSectionLine} onChange={e=>setShowSectionLine(e.target.checked)} style={{ accentColor:D.gold }} />Section Lines</label>
 </div>
 </details>
 <div role="toolbar" aria-label="Paper preview zoom" style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:5, marginTop:8, borderTop:`1px solid ${D.border}`, paddingTop:8 }}>
 <button type="button" title="Zoom out" aria-label="Zoom out" onClick={()=>stepZoom(-10)} style={{ width:30, height:30, display:'grid', placeItems:'center', background:'rgba(11,44,77,.8)', color:D.silver, border:`1px solid ${D.border}`, borderRadius:5, cursor:'pointer' }}><ZoomOut size={16} /></button>
 <span aria-live="polite" style={{ minWidth:42, textAlign:'center', color:D.silver, fontSize:12 }}>{Math.round(previewZoom * 100)}%</span>
 <button type="button" title="Zoom in" aria-label="Zoom in" onClick={()=>stepZoom(10)} style={{ width:30, height:30, display:'grid', placeItems:'center', background:'rgba(11,44,77,.8)', color:D.silver, border:`1px solid ${D.border}`, borderRadius:5, cursor:'pointer' }}><ZoomIn size={16} /></button>
 {[['fit-width','Fit Width'],['fit-page','Fit Page'],['custom','100%']].map(([mode,label])=><button key={label} type="button" onClick={()=>{ setZoomMode(mode); if (mode==='custom') setZoomPercent(100) }} aria-pressed={zoomMode===mode && (mode!=='custom' || zoomPercent===100)} style={{ height:30, padding:'0 9px', border:`1px solid ${D.border}`, borderRadius:5, background:zoomMode===mode?'rgba(200,153,26,.2)':'rgba(11,44,77,.8)', color:zoomMode===mode?D.gold:D.silver, cursor:'pointer', fontSize:11 }}>{label}</button>)}
 <button type="button" title={isFullscreen?'Exit full screen':'Full screen'} aria-label={isFullscreen?'Exit full screen':'Full screen'} onClick={()=>isFullscreen?document.exitFullscreen?.():document.querySelector('.pts-generator-surface')?.requestFullscreen?.()} style={{ width:30, height:30, display:'grid', placeItems:'center', background:'rgba(11,44,77,.8)', color:D.silver, border:`1px solid ${D.border}`, borderRadius:5, cursor:'pointer' }}>{isFullscreen?<Minimize size={16} />:<Maximize size={16} />}</button>
 </div>
 </div>
 <PaperSelectionToolbar editMode={editMode} active={activeEditable} />
 {editMode && isOfficialPaper && <div className="no-print" data-section-inspector style={{ position:'fixed', right:14, top:150, zIndex:11500, width:300, maxHeight:'calc(100vh - 185px)', overflowY:'auto', padding:12, border:'1px solid #ef4444', borderRadius:12, background:'rgba(7,25,48,.98)', color:D.silver, boxShadow:'0 10px 34px rgba(0,0,0,.42)', fontFamily:'Arial,sans-serif', direction:'ltr' }}>
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:10 }}>
   <div><b style={{ color:'#fecaca', fontSize:12 }}>EDIT PAPER</b><div style={{ color:D.muted, fontSize:10, marginTop:2 }}>{selectedSection ? 'Question settings — paper layout stays fixed' : 'Click any question or editable line'}</div></div>
   {selectedSection && <button type="button" aria-label="Close question inspector" onClick={()=>{setSelectedSectionId('');setActiveEditable(null)}} style={{border:0,background:'transparent',color:D.muted,fontSize:18,cursor:'pointer'}}>×</button>}
  </div>
  {selectedSection ? <>
   <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
    <label style={{fontSize:10,fontWeight:800,color:D.muted}}>Question No.
     <input type="number" min="1" value={Number(selectedSection.sourceOrder||1)} onChange={e=>{const next=Math.max(1,Number(e.target.value)||1);const heading=replaceQuestionSerial(selectedSection.heading||'',next,isUrduScriptPaper({config:cfg,...paper}));updateSelectedSection({sourceOrder:next,heading,text:heading,textUrdu:isUrduScriptPaper({config:cfg,...paper})?heading:''})}} style={{...tinp,width:'100%',marginTop:3}} />
    </label>
    <label style={{fontSize:10,fontWeight:800,color:D.muted}}>Marks
     <input type="number" min="0" value={selectedSectionMarks||''} onChange={e=>{const next=Math.max(0,Number(e.target.value)||0);const urdu=isUrduScriptPaper({config:cfg,...paper});const heading=replaceSectionMarks(selectedSection.heading||'',next,urdu);updateSelectedSection({marks:next,operationalMarks:next,marksManuallyEdited:true,heading,text:heading,textUrdu:urdu?heading:''})}} style={{...tinp,width:'100%',marginTop:3}} />
    </label>
   </div>
   <label style={{display:'block',fontSize:10,fontWeight:800,color:D.muted,marginTop:8}}>Question Type
    <select value={selectedSection.layoutPreset||'auto'} onChange={e=>updateSelectedSection({layoutPreset:e.target.value})} style={{...tinp,width:'100%',marginTop:3,cursor:'pointer'}}>
     <option value="auto">Auto ({selectedSectionKind})</option><option value="mcq">MCQ</option><option value="short">Short Questions</option><option value="long">Long Question</option><option value="fill_blank">Fill Blanks</option><option value="true_false">True / False</option><option value="matching">Matching</option><option value="pair_table">Word Pair Table</option><option value="table">Table</option><option value="list">List</option><option value="vertical_math">Math Operations</option><option value="math_compare">Math Compare</option><option value="math_number_name">Number Names</option><option value="math_place_value">Place Value</option><option value="math_order">Number Order</option><option value="math_table">Math Table</option>
    </select>
   </label>
   <label style={{display:'block',fontSize:10,fontWeight:800,color:D.muted,marginTop:8}}>Section Divider
    <select value={selectedSection.showDivider===true?'show':selectedSection.showDivider===false?'hide':'inherit'} onChange={e=>updateSelectedSection({showDivider:e.target.value==='inherit'?undefined:e.target.value==='show'})} style={{...tinp,width:'100%',marginTop:3,cursor:'pointer'}}>
     <option value="inherit">Use global setting</option><option value="show">Show divider</option><option value="hide">Hide divider</option>
    </select>
   </label>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
    <label style={{fontSize:10,fontWeight:800,color:D.muted}}>Answer Lines<input type="number" min="0" max="20" value={Number(selectedSection.answerLines||0)} onChange={e=>updateSelectedSection({answerLines:Math.max(0,Number(e.target.value)||0)})} style={{...tinp,width:'100%',marginTop:3}} /></label>
    <label style={{fontSize:10,fontWeight:800,color:D.muted}}>Lines / Item<input type="number" min="0" max="5" value={Number(selectedSection.answerLinesPerItem||0)} onChange={e=>updateSelectedSection({answerLinesPerItem:Math.max(0,Number(e.target.value)||0)})} style={{...tinp,width:'100%',marginTop:3}} /></label>
   </div>
   <div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:10}}>
    <button type="button" onClick={()=>moveOfficialSection(selectedSection.id,-1)} style={{...tinp,cursor:'pointer',padding:'6px 9px'}}>↑ Up</button>
    <button type="button" onClick={()=>moveOfficialSection(selectedSection.id,1)} style={{...tinp,cursor:'pointer',padding:'6px 9px'}}>↓ Down</button>
    <button type="button" onClick={()=>duplicateOfficialSection(selectedSection.id)} style={{...tinp,cursor:'pointer',padding:'6px 9px'}}>Duplicate</button>
    <button type="button" onClick={()=>deleteOfficialSection(selectedSection.id)} style={{...tinp,cursor:'pointer',padding:'6px 9px',color:'#fca5a5',borderColor:'rgba(239,68,68,.5)'}}>Delete</button>
   </div>
   <details style={{marginTop:10}}>
    <summary style={{fontSize:10,color:D.muted,cursor:'pointer',fontWeight:800}}>Advanced raw content</summary>
    <textarea aria-label="Selected question raw content" value={selectedSection.content||''} onChange={e=>updateSelectedSection({content:e.target.value})} style={{...tinp,width:'100%',minHeight:110,resize:'vertical',marginTop:6,direction:isUrduScriptPaper({config:cfg,...paper})?'rtl':'ltr',fontFamily:isUrduScriptPaper({config:cfg,...paper})?URDU_FONT_STACK:"'Times New Roman',serif"}} />
   </details>
  </> : <div style={{fontSize:11,lineHeight:1.55,color:D.muted}}>The paper will not move in Edit mode. Click a question to open structural controls. Click its text to type directly. Select text to use the floating Word-style formatting bar.</div>}
  <button type="button" onClick={addOfficialSection} style={{...tinp,width:'100%',marginTop:10,cursor:'pointer',fontWeight:900,color:D.gold}}>+ Add Question</button>
 </div>}
 <div id="paper-canvas" ref={canvasRef} style={{ flex:1, minHeight:0, overflowY:'auto', background:'var(--pg-canvas, #1e2a3a)', padding:'12px', display:'flex', flexDirection:'column', alignItems:'center', gap: half ? 8 : 0 }}>
 {totalQs === 0 ? (
 <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:60 }}>
 <div style={{ fontSize:72, marginBottom:16, opacity:0.4 }}></div>
 <div style={{ fontSize:22, fontWeight:700, color:D.silver, marginBottom:10 }}>Paper Preview</div>
 <div style={{ fontSize:14, color:D.muted, maxWidth:380, lineHeight:1.7 }}>Click <strong style={{color:'#4da6ff'}}>Question Menu</strong> to add questions.<br/>Your paper will appear here live as you add them.</div>
 <button onClick={()=>setModalOpen(true)} style={{ marginTop:28, background:`linear-gradient(135deg,#0A84FF,#0055cc)`, color:'white', border:'none', borderRadius:12, padding:'13px 34px', fontWeight: 600, fontSize:16, cursor:'pointer', boxShadow:'0 6px 20px rgba(10,132,255,0.35)', }}> Open Question Menu</button>
 </div>
 ) : half ? (
 <div className="preview-container" style={{ width:794, height:1123, zoom:previewZoom, flexShrink:0, background:'white', boxShadow:'0 4px 20px rgba(0,0,0,0.35)', overflow:'hidden', position:'relative' }}>
 {[0,1].map(index=><div key={index} className="half-paper" style={{ height:544, overflow:'hidden', borderBottom:index===0?'1px dashed #b9c5d0':'none', position:'relative' }}><PreviewWatermark logo={paperSettings?.logo} show={showWatermark} opacity={watermarkOpacity} scale={watermarkScale} /><PremiumPaperTemplate {...tplProps} variant={templateVariant} half={true} /></div>)}
 </div>
 ) : (
 <div className="preview-container" style={{ width:794, minHeight:1123, zoom:previewZoom, flexShrink:0, background:'white', boxShadow:'0 4px 24px rgba(0,0,0,0.4)', overflowX:'hidden', position:'relative' }}><PreviewWatermark logo={paperSettings?.logo} show={showWatermark} opacity={watermarkOpacity} scale={watermarkScale} /><PremiumPaperTemplate {...tplProps} variant={templateVariant} half={false} /></div>
 )}
 </div>
 <style>{`@media print { body { display: none !important; } }`}</style>
 {modalOpen && (
 <Portal>
 <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', justifyContent:'flex-end' }}>
 <div style={{ position:'absolute', inset:0, background:'rgba(7,18,36,0.60)', backdropFilter:'blur(3px)' }} onClick={()=>setModalOpen(false)} />
 <div style={{ position:'relative', width:700, maxWidth:'92vw', height:'100%', background:'rgba(5,20,42,0.99)', backdropFilter:blur, borderLeft:`1px solid ${D.border}`, display:'flex', flexDirection:'column', boxShadow:'-10px 0 50px rgba(0,0,0,0.6)' }}>
 <div style={{ padding:'16px 22px', borderBottom:`1px solid ${D.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
 <div><div style={{ fontSize:17, fontWeight:700, color:D.gold }}> Question Menu</div><div style={{ fontSize:12, color:D.muted, marginTop:3 }}>{subject?.name}{questionTypes.map(t => (<span key={t.value}>&nbsp;·&nbsp;{t.label} <strong style={{color: t.value==='mcq'?D.blue:t.value==='short'?D.orange:D.gold}}>{(paper[t.value]||[]).length}</strong></span>))}</div></div>
 <button onClick={()=>setModalOpen(false)} style={{ background:'rgba(255,59,48,0.12)', border:`1px solid rgba(255,59,48,0.35)`, borderRadius:9, padding:'7px 14px', color:'#FF375F', fontWeight: 600, fontSize:14, cursor:'pointer', letterSpacing:'0.02em', }}> Close</button>
 </div>
 <div style={{ padding:'14px 22px', borderBottom:`1px solid ${D.border}`, flexShrink:0 }}>
 <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end', marginBottom:10 }}>
 <div style={{ minWidth:195 }}><div style={{ fontSize:11, color:D.muted, fontWeight:600, marginBottom:4 }}>Question Type</div><select value={qType} onChange={e=>{ const val = e.target.value; setQType(val); setEachM(questionTypes.find(t=>t.value===val)?.marks || 1) }} style={{...filterSel,width:'100%'}}>{questionTypes.map(t=><option key={t.value} value={t.value}>{t.label} ({t.labelUrdu})</option>)}</select></div>
 <div style={{ minWidth:135 }}><div style={{ fontSize:11, color:D.muted, fontWeight:600, marginBottom:4 }}>Priority</div><select value={priority} onChange={e=>setPriority(e.target.value)} style={{...filterSel,width:'100%'}}>{PRIORITIES.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}</select></div>
 <div style={{ minWidth:135 }}><div style={{ fontSize:11, color:D.muted, fontWeight:600, marginBottom:4 }}>Medium</div><select value={medium} onChange={e=>setMedium(e.target.value)} style={{...filterSel,width:'100%'}}>{MEDIUMS.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}</select></div>
 <GoldBtn onClick={doSearch} style={{ padding:'8px 26px', alignSelf:'flex-end', fontSize:13 }}>SEARCH</GoldBtn>
 </div>
 <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
 {[['Required *', required, setRequired, 72], ['Skip', ignore, setIgnore, 60], ['Each Marks', eachM, setEachM, 66], ['Blank Lines',blankL, setBlankL, 66]].map(([lbl,val,set,w])=>(<div key={lbl}><div style={{ fontSize:11, color:D.muted, fontWeight:600, marginBottom:3 }}>{lbl}</div><input type="number" min={0} value={val} onChange={e=>set(+e.target.value)} style={{ ...filterInp, width:w }} /></div>))}
 <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13, color:D.silver }}><input type="checkbox" checked={twoPerL} onChange={e=>setTwoPerL(e.target.checked)} style={{ width:14, height:14, accentColor:D.gold }} />2 Per Line</label>
 {searched && (<div style={{ fontSize:12, color:D.muted, marginLeft:4 }}><strong style={{color:D.gold}}>{selIds.size}</strong> / <strong style={{color:D.silver}}>{required}</strong> selected{limitWarn && (<span style={{ marginLeft:8, color:'#FF375F', fontWeight:700 }}> Max {required}</span>)}</div>)}
 </div>
 </div>
 <div style={{ flex:1, overflowY:'auto', padding:'16px 22px' }}>
 {!searched ? (<div style={{ textAlign:'center', padding:'55px 20px', color:D.muted }}><div style={{ fontSize:44, marginBottom:14, opacity:0.6 }}></div><div style={{ fontSize:15, fontWeight:600, color:D.silver }}>Select type &amp; priority, then click SEARCH</div></div>) : results.length===0 ? (<div style={{ textAlign:'center', padding:'55px 20px', color:D.muted }}><div style={{ fontSize:44, marginBottom:14, opacity:0.6 }}></div><div style={{ fontSize:15, fontWeight:600, color:D.silver }}>No questions found</div><div style={{ fontSize:12, marginTop:8 }}>Try different type, priority, or chapters.</div></div>) : (<div style={{ background:'rgba(15,23,42,0.46)', backdropFilter:blur, border:`1px solid ${D.border}`, borderRadius:12, overflow:'hidden' }}>{qType==='mcq' ? <MCQList qs={results} medium={medium} selIds={selIds} onToggle={toggleQ} twoPerL={twoPerL} /> : <TextList qs={results} medium={medium} selIds={selIds} onToggle={toggleQ} twoPerL={twoPerL} />}</div>)}
 </div>
 {searched && results.length > 0 && (<div style={{ padding:'14px 22px', borderTop:`1px solid ${D.border}`, display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0, background:'rgba(7,25,48,0.95)' }}><DBtn color="red" onClick={randomSelect} style={{ padding:'10px 28px', fontSize:13 }}> Random Select</DBtn><DBtn color="green" onClick={addSelected} disabled={!selIds.size} style={{ padding:'10px 28px', fontSize:13 }}> ADD TO PAPER {selIds.size > 0 && `(${selIds.size})`}</DBtn></div>)}
 </div>
 </div>
 </Portal>
 )}
 </div>
 )
}

function MCQList({ qs, medium, selIds, onToggle, twoPerL }) {
 const rows = twoPerL ? chunk(qs,2) : qs.map(q=>[q])
 return (
 <div>
 {rows.map((pair,pi) => (
 <div key={pi} style={{ display:'grid', gridTemplateColumns:pair.length===2?'1fr 1fr':'1fr', borderBottom:`1px solid ${D.border}` }}>
 {pair.map((q,qi) => (
 <div key={q.id} onClick={()=>onToggle(q.id)} style={{ padding:'10px 14px', cursor:'pointer', transition:'background .12s', background: selIds.has(q.id) ? 'rgba(200,153,26,0.18)' : 'transparent', borderLeft: qi===1?`1px solid ${D.border}`:'none' }}>
 <div style={{ display:'flex', gap:8 }}>
 <div style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${selIds.has(q.id)?D.gold:D.muted}`, background:selIds.has(q.id)?D.gold:'transparent', flexShrink:0, marginTop:2, display:'grid', placeItems:'center', color:'#071e34', fontSize:10, fontWeight:900 }}>{selIds.has(q.id)&&''}</div>
 <div style={{ flex:1 }}>
 <div style={{ fontSize:13, color:selIds.has(q.id)?D.gold:D.silver, fontWeight:500, lineHeight:1.5 }}>{medium==='urdu'?q.ur:q.en}</div>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginTop:6 }}>{q.options?.map(o=>(<div key={o.key} style={{ fontSize:11, color:D.muted }}>({o.key}) {medium==='urdu'?o.ur:o.en}</div>))}</div>
 </div>
 </div>
 </div>
 ))}
 </div>
 ))}
 </div>
 )
}

function TextList({ qs, medium, selIds, onToggle, twoPerL }) {
 const rows = twoPerL ? chunk(qs,2) : qs.map(q=>[q])
 return (
 <div>
 {rows.map((pair,pi) => (
 <div key={pi} style={{ display:'grid', gridTemplateColumns:pair.length===2?'1fr 1fr':'1fr', borderBottom:`1px solid ${D.border}` }}>
 {pair.map((q,qi) => (
 <div key={q.id} onClick={()=>onToggle(q.id)} style={{ padding:'12px 14px', cursor:'pointer', transition:'background .12s', background: selIds.has(q.id) ? 'rgba(200,153,26,0.18)' : 'transparent', borderLeft: qi===1?`1px solid ${D.border}`:'none' }}>
 <div style={{ display:'flex', gap:10 }}>
 <div style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${selIds.has(q.id)?D.gold:D.muted}`, background:selIds.has(q.id)?D.gold:'transparent', flexShrink:0, marginTop:1, display:'grid', placeItems:'center', color:'#071e34', fontSize:10, fontWeight:900 }}>{selIds.has(q.id)&&''}</div>
 <div style={{ fontSize:13, color:selIds.has(q.id)?D.gold:D.silver, fontWeight:500, lineHeight:1.5 }}>{medium==='urdu'?q.ur:q.en}</div>
 </div>
 </div>
 ))}
 </div>
 ))}
 </div>
 )
}

function chunk(arr, size) {
 const res = []
 for (let i=0; i<arr.length; i+=size) res.push(arr.slice(i,i+size))
 return res
}

function parseOfficialContentBlocks(content = '') {
 const lines = String(content).replace(/\r\n/g, '\n').split('\n')
 const blocks = []
 let paragraph = []
 let table = []
 const flushParagraph = () => {
  if (paragraph.length) blocks.push({ type:'text', text:paragraph.join('\n').trimEnd() })
  paragraph = []
 }
 const flushTable = () => {
  if (table.length) blocks.push({ type:'table', rows:table })
  table = []
 }
 lines.forEach(line => {
  const trimmed = line.trim()
  if (/^\|.*\|$/.test(trimmed)) {
   flushParagraph()
   const cells = trimmed.slice(1, -1).split('|').map(cell => cell.trim())
   if (!cells.every(cell => /^:?-{3,}:?$/.test(cell))) table.push(cells)
   return
  }
  flushTable()
  paragraph.push(line)
 })
 flushParagraph()
 flushTable()
 return blocks.filter(block => block.type === 'table' ? block.rows.length : block.text.trim())
}

function parseMcqRows(content = '') {
 const lines = String(content).split(/\r?\n/).map(line => line.trim()).filter(Boolean)
 const rows = []
 for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
  const line = lines[lineIndex]
  const questionMatch = line.match(/^(\d+)[.)]\s*(.*)$/)
  if (!questionMatch) continue
  const optionPattern = /(?:^|\s)(?:\(([a-dA-Dا-د])\)|([a-dA-Dا-د])[.)])\s*/g
  const inlineOptions = [...questionMatch[2].matchAll(optionPattern)]
  const optionSource = inlineOptions.length >= 2 ? questionMatch[2] : lines[lineIndex + 1] || ''
  const matches = [...optionSource.matchAll(optionPattern)]
  if (matches.length < 2) continue
  const prompt = optionSource === questionMatch[2] ? questionMatch[2].slice(0, matches[0].index).trim() : questionMatch[2]
  const options = matches.map((match, index) => ({
   label:(match[1] || match[2]).toUpperCase(),
   text:optionSource.slice(match.index + match[0].length, matches[index + 1]?.index).trim(),
  }))
  rows.push({ number:questionMatch[1], prompt, options })
  if (optionSource !== questionMatch[2]) lineIndex += 1
 }
 return rows.length ? rows : []
}

function parseVerticalSums(content = '') {
 const lines = String(content).split(/\r?\n/)
 const rows = []
 for (let index = 0; index < lines.length - 1; index += 1) {
  const tops = lines[index].trim().split(/\s{2,}/).filter(value => /^\d+$/.test(value))
  const bottoms = [...lines[index + 1].matchAll(/([+\-x×÷])\s*(\d+)/g)]
  if (tops.length >= 2 && tops.length === bottoms.length) {
   rows.push(tops.map((top, sumIndex) => ({ top, operator:bottoms[sumIndex][1], bottom:bottoms[sumIndex][2] })))
   index += 2
  }
 }
 return rows
}

function TextWithAnswerLines({ text }) {
 return String(text).split(/(_{4,}|□|â–¡|☐)/g).map((part, index) => /^_{4,}$/.test(part)
  ? <span key={index} data-answer-line style={{ display:'inline-block', width:`${Math.min(210, Math.max(88, part.length * 4.4))}px`, borderBottom:'1px solid currentColor', height:'0.95em', verticalAlign:'baseline' }} />
  : /^(?:□|â–¡|☐)$/.test(part) ? <span key={index} data-answer-box style={{ display:'inline-block', width:30, height:26, border:'1.5px solid currentColor', borderRadius:2, verticalAlign:'middle', margin:'0 5px', background:'#fff' }} />
  : <span key={index}>{part}</span>)
}

function TrueFalseGrid({ content, isUrdu, fs, qFs, themeColor }) {
 const rows = String(content).split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => ({
  number:(line.match(/^(\d+)[.)]/)?.[1] || index + 1),
  text:line.replace(/^\d+[.)]\s*/, '').replace(/(?:□|â–¡|☐|\[\s*\]|_{3,})\s*$/, '').trim(),
 }))
 return <table data-true-false-grid style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', direction:isUrdu?'rtl':'ltr', fontSize:`${qFs}px` }}><thead><tr style={{ background:`${themeColor}12`, color:themeColor }}><th style={{ width:38, border:`1px solid ${themeColor}77`, padding:5 }}>#</th><th style={{ border:`1px solid ${themeColor}77`, padding:5, textAlign:isUrdu?'right':'left' }}>{isUrdu?'بیان':'Statement'}</th><th style={{ width:64, border:`1px solid ${themeColor}77`, padding:5 }}>T / F</th></tr></thead><tbody>{rows.map(row => <tr key={row.number}><td style={{ border:`1px solid ${themeColor}77`, padding:6, textAlign:'center', fontWeight:700 }}>{row.number}</td><td style={{ border:`1px solid ${themeColor}77`, padding:`${6*fs}px ${8*fs}px` }}>{row.text}</td><td aria-label="Write T or F" style={{ height:42, border:`1.5px solid ${themeColor}`, background:'#fff' }} /></tr>)}</tbody></table>
}

function MultiplicationTableGrid({ heading, content, fs, qFs, themeColor }) {
 const tablePhrase = String(heading).match(/tables?\s+(?:of\s+)?(.+?)(?:\.|\(|$)/i)?.[1] || ''
 const values = [...tablePhrase.matchAll(/\b(\d+)\b/g)].map(match => Number(match[1])).filter(number => number > 0 && number < 20)
 const numbers = [...new Set(values)]
 const tables = numbers.length ? numbers.slice(0, 2) : [2, 3]
 return <table data-multiplication-grid style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', direction:'ltr', fontSize:`${qFs}px` }}><thead><tr>{tables.map(number => <th key={number} style={{ border:`1px solid ${themeColor}99`, background:`${themeColor}12`, color:themeColor, padding:7 }}>Table of {number}</th>)}</tr></thead><tbody>{Array.from({ length:10 }, (_, index) => <tr key={index}>{tables.map(number => <td key={number} style={{ border:`1px solid ${themeColor}66`, padding:`${4*fs}px ${12*fs}px`, textAlign:'center', height:`${25*fs}px`, fontWeight:600 }}>{number} × {index + 1} = <span style={{ display:'inline-block', width:70, borderBottom:`1px solid ${themeColor}`, height:'1em' }} /></td>)}</tr>)}</tbody></table>
}

function NumberedResponseList({ content, isUrdu, fs, qFs }) {
 const lines = String(content).split(/\r?\n/).map(line => line.trim()).filter(Boolean)
 const numberUnlabelledAnswers = lines.length > 1 && lines.every(line => /^\d+\s*=/.test(line))
 return <div data-numbered-response-list>{lines.map((line, index) => {
  if (/^#\s*/.test(line)) return <div key={index} data-section-label style={{ gridColumn:'1 / -1', fontWeight:800, fontSize:`${qFs + 1}px`, padding:`${5*fs}px 0`, borderBottom:'1px solid currentColor' }}>{line.replace(/^#\s*/, '')}</div>
  const match = line.match(/^((?:\d+|[ivxlcdm]+|[a-z]))[.)]\s*(.*)$/i)
  const serial = match?.[1] || (numberUnlabelledAnswers ? String(index + 1) : '')
  const body = match?.[2] || line
  return <div key={index} style={{ display:'grid', gridTemplateColumns:serial?(isUrdu?'minmax(0,1fr) 34px':'34px minmax(0,1fr)'):'minmax(0,1fr)', columnGap:7, alignItems:'start', marginBottom:`${2*fs}px`, direction:'ltr', breakInside:'avoid' }}>{serial && <span dir="ltr" style={{ gridColumn:isUrdu?2:1, gridRow:1, textAlign:'center', fontWeight:800, whiteSpace:'nowrap' }}>{serial}.</span>}<div dir={isUrdu?'rtl':'ltr'} style={{ gridColumn:serial?(isUrdu?1:2):1, gridRow:1, fontSize:`${qFs}px`, lineHeight:isUrdu?1.8:1.4, textAlign:isUrdu?'right':'left', unicodeBidi:'plaintext' }}><TextWithAnswerLines text={body} /></div></div>
 })}</div>
}

function ColumnResponseGrid({ content, isUrdu, fs, qFs, themeColor, columns=2 }) {
 const lines = String(content).split(/\r?\n/).map(line => line.trim()).filter(Boolean).filter(line => !/^#\s*/.test(line))
 return <div data-column-response-grid style={{ display:'grid', gridTemplateColumns:`repeat(${Math.max(1, Math.min(4, columns))}, minmax(0, 1fr))`, borderTop:`1px solid ${themeColor}`, borderLeft:`1px solid ${themeColor}`, direction:isUrdu?'rtl':'ltr' }}>{lines.map((line,index) => {
  const body = line.replace(/^(?:\d+|[ivxlcdm]+|[a-z])[.)]\s*/i, '')
  return <div key={index} style={{ borderRight:`1px solid ${themeColor}`, borderBottom:`1px solid ${themeColor}`, padding:`${5*fs}px`, fontSize:`${qFs}px`, lineHeight:isUrdu?1.8:1.4, textAlign:isUrdu?'right':'left', breakInside:'avoid' }}><b dir="ltr" style={{ display:'inline-block', marginInlineEnd:6 }}>{index+1}.</b><TextWithAnswerLines text={body} /></div>
 })}</div>
}

function ShortResponseLayout({ content, isUrdu, fs, qFs, themeColor, layout='1-column' }) {
 const lines = String(content).split(/\r?\n/).map(line => line.trim()).filter(Boolean)
 const clean = lines.map((line,index) => {
  const match = line.match(/^((?:\d+|[ivxlcdm]+|[a-z]))[.)]\s*(.*)$/i)
  return { serial:match?.[1] || String(index+1), body:match?.[2] || line }
 })
 if (layout === 'table') return <table data-short-layout="table" style={{ width:'100%', borderCollapse:'collapse', fontSize:`${qFs}px`, direction:isUrdu?'rtl':'ltr' }}><tbody>{clean.map(item => <tr key={item.serial}><td style={{ width:42, border:`1px solid ${themeColor}77`, padding:5, textAlign:'center', fontWeight:800 }}>{item.serial}.</td><td style={{ border:`1px solid ${themeColor}77`, padding:`${5*fs}px ${7*fs}px`, textAlign:isUrdu?'right':'left' }}><TextWithAnswerLines text={item.body} /></td></tr>)}</tbody></table>
 const twoCol = layout === '2-column-balanced'
 return <div data-short-layout={layout} style={twoCol ? { display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:`${4*fs}px ${16*fs}px` } : {}}>{clean.map(item => <div key={item.serial} style={{ display:'grid', gridTemplateColumns:isUrdu?'1fr 34px':'34px 1fr', gap:7, alignItems:'start', marginBottom:`${4*fs}px`, breakInside:'avoid' }}><b dir="ltr" style={{ gridColumn:isUrdu?2:1, textAlign:'center' }}>{item.serial}.</b><div dir={isUrdu?'rtl':'ltr'} style={{ gridColumn:isUrdu?1:2, textAlign:isUrdu?'right':'left', lineHeight:isUrdu?1.8:1.45 }}><TextWithAnswerLines text={item.body} /></div></div>)}</div>
}

function OfficialMcqLayout({ rows, isUrdu, fs, qFs, themeColor, layout='matrix-table' }) {
 if (!rows.length) return null
 const maxOptions = Math.max(2, ...rows.map(row => row.options.length))
 if (layout === 'classic') return <div data-mcq-layout="classic">{rows.map(row => <div key={row.number} style={{ marginBottom:`${7*fs}px`, breakInside:'avoid' }}><div style={{ fontWeight:700, textAlign:isUrdu?'right':'left' }}><b dir="ltr">{row.number}.</b> {row.prompt}</div><div style={{ marginTop:3, textAlign:isUrdu?'right':'left' }}>{row.options.map(opt => <span key={opt.label} style={{ marginInlineEnd:18 }}><b dir="ltr">({opt.label})</b> {opt.text}</span>)}</div></div>)}</div>
 if (layout === 'compact-grid') return <div data-mcq-layout="grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:`${7*fs}px` }}>{rows.map(row => <div key={row.number} style={{ border:`1px solid ${themeColor}66`, padding:`${6*fs}px`, breakInside:'avoid' }}><div style={{ fontWeight:700, marginBottom:4 }}><b dir="ltr">{row.number}.</b> {row.prompt}</div><div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:4 }}>{row.options.map(opt => <div key={opt.label}><b dir="ltr">({opt.label})</b> {opt.text}</div>)}</div></div>)}</div>
 return <table data-mcq-layout="matrix-table" style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', direction:isUrdu?'rtl':'ltr', fontSize:`${qFs}px` }}><thead><tr><th style={{ width:38, border:`1px solid ${themeColor}88`, padding:5 }}>#</th><th style={{ width:'42%', border:`1px solid ${themeColor}88`, padding:5, textAlign:isUrdu?'right':'left' }}>{isUrdu?'سوال':'Question'}</th>{Array.from({length:maxOptions},(_,i)=><th key={i} style={{ border:`1px solid ${themeColor}88`, padding:5 }}>{String.fromCharCode(65+i)}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.number} style={{ breakInside:'avoid' }}><td style={{ border:`1px solid ${themeColor}88`, padding:5, textAlign:'center', fontWeight:800 }}>{row.number}</td><td style={{ border:`1px solid ${themeColor}88`, padding:`${5*fs}px`, textAlign:isUrdu?'right':'left', fontWeight:600 }}>{row.prompt}</td>{Array.from({length:maxOptions},(_,i)=>{ const opt=row.options[i]; return <td key={i} style={{ border:`1px solid ${themeColor}88`, padding:`${5*fs}px`, textAlign:isUrdu?'right':'left' }}>{opt ? <><b dir="ltr">({opt.label})</b> {opt.text}</> : null}</td> })}</tr>)}</tbody></table>
}

function StructuredOfficialContent({ question, blocks, isUrdu, fs, qFs, themeColor, mcqLayout='matrix-table', shortLayout='1-column' }) {
 const heading = String(question.heading || '')
 const inferredKind = inferOfficialSectionKind(question)
 const requestedLayout = question.layoutPreset || 'auto'
 const kind = requestedLayout === 'mcq' ? 'mcq' : requestedLayout === 'true-false' ? 'true_false' : requestedLayout === 'columns' ? 'matching' : requestedLayout === 'table' ? 'table' : inferredKind
 if (requestedLayout === 'rich') return <PaperRichTextRenderer value={question.richContent} fallbackText={question.content} direction={isUrdu?'rtl':'ltr'} />
 if (kind === 'marker') return <>{splitContentWithMarkers(question.content).map((part,i) => part.type === 'marker' ? <div key={i} data-section-label style={{ fontWeight:900, textAlign:'center', padding:`${5*fs}px`, borderBottom:`1px solid ${themeColor}` }}>{part.text}</div> : null)}</>
 if (kind === 'mcq') {
  const rows = parseOfficialMcqRows(question.content)
  if (rows.length) return <OfficialMcqLayout rows={rows} isUrdu={isUrdu} fs={fs} qFs={qFs} themeColor={themeColor} layout={question.mcqLayout || mcqLayout} />
 }
 if (kind === 'true_false') return <TrueFalseGrid content={question.content} isUrdu={isUrdu} fs={fs} qFs={qFs} themeColor={themeColor} />
 if (kind === 'vertical_math' || /(?:write\s+the\s+tables?|table\s+of|پہاڑ)/i.test(heading)) {
  if (/(?:write\s+the\s+tables?|table\s+of|پہاڑ)/i.test(heading)) return <MultiplicationTableGrid heading={heading} content={question.content} fs={fs} qFs={qFs} themeColor={themeColor} />
  const sums = parseVerticalSums(question.content)
  if (sums.length) return <table data-vertical-math-grid style={{ width:'100%', borderCollapse:'separate', borderSpacing:`${7*fs}px`, tableLayout:'fixed', direction:'ltr', margin:`${4*fs}px 0`, fontFamily:"'Cambria Math','Times New Roman',serif" }}><tbody>{sums.map((sumRow,rowIndex)=><tr key={rowIndex}>{sumRow.map((sum,index)=><td key={index} style={{ border:`1px solid ${themeColor}55`, padding:`${7*fs}px`, textAlign:'right', fontSize:`${Math.max(qFs+2,14)}px`, fontWeight:700 }}><div>{sum.top}</div><div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:8 }}><span>{sum.operator}</span><span>{sum.bottom}</span></div><div style={{ borderTop:`1.5px solid ${themeColor}`, height:`${17*fs}px`, marginTop:3 }} /></td>)}</tr>)}</tbody></table>
 }
 if (kind === 'short') return <ShortResponseLayout content={question.content} isUrdu={isUrdu} fs={fs} qFs={qFs} themeColor={themeColor} layout={question.shortLayout || shortLayout} />
 if (kind === 'matching' || kind === 'table') {
  const tableBlock = blocks.find(block => block.type === 'table')
  if (tableBlock) return <table data-source-table style={{ width:'100%', borderCollapse:'collapse', margin:`${5*fs}px 0`, fontSize:`${qFs}px`, tableLayout:'fixed', direction:isUrdu?'rtl':'ltr' }}><tbody>{tableBlock.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,cellIndex)=><td key={cellIndex} style={{ border:`1px solid ${themeColor}99`, padding:`${5*fs}px ${7*fs}px`, textAlign:isUrdu?'right':'left', fontWeight:rowIndex===0?700:500 }}><TextWithAnswerLines text={cell} /></td>)}</tr>)}</tbody></table>
  if (kind === 'matching') return <ColumnResponseGrid content={question.content} isUrdu={isUrdu} fs={fs} qFs={qFs} themeColor={themeColor} columns={2} />
 }
 const plainLines = String(question.content || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
 if (plainLines.length >= 2 && !blocks.some(block => block.type === 'table')) return <NumberedResponseList content={question.content} isUrdu={isUrdu} fs={fs} qFs={qFs} />
 return blocks.map((block,blockIndex) => block.type === 'table'
  ? <table key={blockIndex} data-source-table style={{ width:'100%', borderCollapse:'collapse', margin:`${5*fs}px 0`, fontSize:`${qFs}px`, tableLayout:'fixed', direction:isUrdu?'rtl':'ltr' }}><tbody>{block.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,cellIndex)=><td key={cellIndex} style={{ border:`1px solid ${themeColor}99`, padding:`${5*fs}px ${7*fs}px`, textAlign:isUrdu?'right':'left', fontWeight:rowIndex===0?700:500 }}><TextWithAnswerLines text={cell} /></td>)}</tr>)}</tbody></table>
  : <div key={blockIndex} style={{ whiteSpace:'pre-wrap', fontSize:`${qFs}px`, lineHeight:isUrdu?1.9:1.5, marginBottom:`${5*fs}px`, textAlign:isUrdu?'right':'left' }}><TextWithAnswerLines text={block.text} /></div>)
}

function OfficialSections({ questions, isUrdu, editMode, fs, qFs, themeColor, onQuestionChange, mcqLayout='matrix-table', shortLayout='1-column', qBorderStyle='none', showAnsLines=false, showSectionLine=true }) {
 const ordered = [...questions].sort((a,b) => Number(a.sourceOrder || 0) - Number(b.sourceOrder || 0))
 return <div style={{ direction:isUrdu?'rtl':'ltr' }}>{ordered.map((question,index) => {
  const blocks = parseOfficialContentBlocks(question.content)
  const kind = inferOfficialSectionKind(question)
  const rawHeading = String(question.heading || '').trim()
  const hasSerial = /^(?:Q(?:uestion)?\s*\d+|سوال(?:\s+نمبر)?\s*\d+)/i.test(rawHeading)
  const cleanHeading = stripTrailingMarks(rawHeading)
  const displayHeading = hasSerial ? cleanHeading : `${isUrdu ? `سوال نمبر ${index+1}:` : `Q${index+1}.`} ${cleanHeading}`.trim()
  const marksLabel = extractMarksLabel(rawHeading, question.marks)
  const answerLines = Number.isFinite(Number(question.answerLines)) ? Number(question.answerLines) : (showAnsLines && ['short','long','list'].includes(kind) ? 1 : 0)
  const borderStyle = qBorderStyle === 'box' ? { border:`1px solid ${themeColor}55`, borderRadius:5, padding:`${7*fs}px` } : qBorderStyle === 'table' ? { border:`1.5px solid ${themeColor}`, padding:`${6*fs}px` } : {}
  const controlStyle = { width:'100%', boxSizing:'border-box', border:`1px solid ${themeColor}66`, borderRadius:6, padding:7, background:'#fff', color:'#111', fontFamily:'inherit', direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left' }
  if (kind === 'marker' && !rawHeading) return <div key={question.id || index}>{splitContentWithMarkers(question.content).map((part,i) => part.type === 'marker' ? <div key={i} data-section-label style={{ fontWeight:900, textAlign:'center', padding:`${5*fs}px`, marginBottom:`${5*fs}px`, borderBottom:`1px solid ${themeColor}` }}>{part.text}</div> : null)}</div>
  return <section key={question.id || index} data-official-section data-section-kind={kind} style={{ marginBottom:`${10*fs}px`, breakInside:'avoid', ...borderStyle }}>
   {editMode
    ? <input aria-label={`Question ${index+1} heading`} value={question.heading || ''} onChange={event => onQuestionChange?.(question.id,{ heading:event.target.value, text:event.target.value, textUrdu:isUrdu?event.target.value:'' })} style={{ ...controlStyle, fontWeight:800, marginBottom:6 }} />
    : <div data-official-heading data-language={isUrdu?'urdu':'english'} style={{ display:'grid', gridTemplateColumns:isUrdu?'auto minmax(0,1fr)':'minmax(0,1fr) auto', gap:10, alignItems:'center', paddingBottom:`${4*fs}px`, marginBottom:`${6*fs}px`, borderBottom:showSectionLine?`2px solid ${themeColor}`:'1px solid #d7dee7', fontWeight:800, fontSize:`${Math.max(qFs+1,13)}px`, lineHeight:isUrdu?1.9:1.35, direction:'ltr' }}>
      {isUrdu ? <>{marksLabel && <span data-marks-badge style={{ justifySelf:'start', minWidth:52, whiteSpace:'nowrap', color:themeColor, border:`1px solid ${themeColor}`, borderRadius:4, padding:'2px 7px', textAlign:'center', direction:'ltr', fontFamily:'Arial,sans-serif', fontSize:`${Math.max(10,qFs*.66)}px` }}>{marksLabel}</span>}<span dir="rtl" style={{ textAlign:'right', justifySelf:'stretch' }}>{displayHeading}</span></> : <><span dir="ltr" style={{ textAlign:'left', justifySelf:'stretch' }}>{displayHeading}</span>{marksLabel && <span data-marks-badge style={{ justifySelf:'end', minWidth:52, whiteSpace:'nowrap', color:themeColor, border:`1px solid ${themeColor}`, borderRadius:4, padding:'2px 7px', textAlign:'center', direction:'ltr', fontFamily:'Arial,sans-serif', fontSize:`${Math.max(10,qFs*.66)}px` }}>{marksLabel}</span>}</>}
     </div>}
   {editMode && <div className="no-print" style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6, fontFamily:'Arial,sans-serif', direction:'ltr', fontSize:11, color:themeColor }}><label>Answer lines <input type="number" min="0" max="12" value={answerLines} onChange={e=>onQuestionChange?.(question.id,{answerLines:Math.max(0,Number(e.target.value)||0)})} style={{...controlStyle,width:60,padding:4}} /></label><label>Layout <select value={question.layoutPreset || 'auto'} onChange={e=>onQuestionChange?.(question.id,{layoutPreset:e.target.value})} style={{...controlStyle,width:140,padding:4,direction:'ltr'}}><option value="auto">Auto</option><option value="mcq">MCQ</option><option value="list">List</option><option value="columns">Columns</option><option value="table">Table</option><option value="true-false">True / False</option><option value="rich">Rich Text</option></select></label></div>}
   {editMode
    ? question.layoutPreset === 'rich' ? <PaperRichTextEditor ariaLabel={`Question ${index+1} rich content`} value={question.richContent} fallbackText={question.content} direction={isUrdu?'rtl':'ltr'} onChange={richContent=>onQuestionChange?.(question.id,{richContent})} /> : <textarea aria-label={`Question ${index+1} content`} value={question.content || ''} onChange={event=>onQuestionChange?.(question.id,{content:event.target.value})} style={{...controlStyle,minHeight:Math.max(95,String(question.content||'').split('\n').length*22),resize:'vertical',lineHeight:isUrdu?1.9:1.5}} />
    : <><StructuredOfficialContent question={question} blocks={blocks} isUrdu={isUrdu} fs={fs} qFs={qFs} themeColor={themeColor} mcqLayout={mcqLayout} shortLayout={shortLayout} />{answerLines > 0 && <div data-configurable-answer-lines>{Array.from({length:answerLines},(_,lineIndex)=><div key={lineIndex} style={{ height:`${21*fs}px`, borderBottom:'1px solid #7b8794' }} />)}</div>}</>}
  </section>
 })}</div>
}

//  Shared Section Renderer 
function SectionRenderer({ type, paper, isUrdu, isDual, editMode, editStyle, fs, qFs, qFsSm, qFsHead, qBorderStyle, mcqLayout='matrix-table', shortLayout='1-column', urdLineH, engLineH, letterSp, wordSp=0, textAlign='start', fontFamily='', printAns, showAnsLines, showSectionLine=true, qn, half, themeColor='#1a237e', urduHeader='', onQuestionChange, onDeleteSection, onDuplicateSection, onMoveSection, onAddSection, onSelectSection, selectedSectionId, onActiveEditable }) {
 const qs = paper[type.value] || []
 if (qs.length === 0) return null
 if (type.value === 'official_section') return <OfficialSectionRenderer questions={qs} isUrdu={isUrdu} editMode={editMode} fs={fs} qFs={qFs} headingFs={qFsHead} themeColor={themeColor} qBorderStyle={qBorderStyle} mcqLayout={mcqLayout} shortLayout={shortLayout} showAnsLines={showAnsLines} showSectionLine={showSectionLine} urdLineH={urdLineH} engLineH={engLineH} letterSp={letterSp} wordSp={wordSp} textAlign={textAlign} fontFamily={fontFamily} onQuestionChange={(id, changes) => onQuestionChange?.(type.value, id, changes)} onDeleteSection={onDeleteSection} onDuplicateSection={onDuplicateSection} onMoveSection={onMoveSection} onAddSection={onAddSection} onSelectSection={onSelectSection} selectedSectionId={selectedSectionId} onActiveEditable={onActiveEditable} />
 const marks = paper[`${type.value}_marks`] || type.marks || 1
 const isMcq = type.value === 'mcq'
 
 function getT(item) {
 const e = item.en || item.text || ''
 const u = item.ur || item.textUrdu || item.text || ''
 return isUrdu ? (u||e) : (isDual && e && u ? e + ' / ' + u : (e||u))
 }
 function commitQuestionText(question, value) {
  onQuestionChange?.(type.value, question.id, isUrdu
   ? { ur:value, textUrdu:value }
   : { en:value, text:value })
 }
 function commitOptionText(question, optionIndex, value) {
  const options = (question.options || []).map((option, index) => index === optionIndex
   ? { ...option, ...(isUrdu ? { ur:value, textUrdu:value } : { en:value, text:value }) }
   : option)
  onQuestionChange?.(type.value, question.id, { options })
 }
 
 return (
 <div key={type.value} style={{ marginBottom:`${10*fs}px` }}>
 {urduHeader && <div style={{ textAlign:'center', fontFamily:URDU_FONT_STACK, fontSize:`${14*fs}px`, fontWeight:800, color:'#1a237e', marginBottom:`${5*fs}px`, direction:'rtl' }}>{urduHeader}</div>}
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:`${6*fs}px`, paddingBottom:`${4*fs}px`, borderBottom:`2.1px solid ${themeColor}`, direction: isUrdu ? 'rtl' : 'ltr' }}>
 {isUrdu ? (
 <>
 <span style={{ fontWeight:700, fontSize:`${12*fs}px`, fontFamily:URDU_FONT_STACK }}>سوال نمبر {qn}. {type.labelUrdu}</span>
 <span style={{ fontWeight:700, fontSize:`${10*fs}px`, color:themeColor }}>({marks} × {qs.length} = {qs.length*marks})</span>
 </>
 ) : (
 <>
 <span style={{ fontWeight:800, fontSize:`${12*fs}px`, color:'#333' }}>Q{qn}. {type.label}</span>
 <span style={{ fontWeight:700, fontSize:`${11*fs}px`, color:themeColor }}>({marks} × {qs.length} = {qs.length*marks})</span>
 </>
 )}
 </div>

 {isMcq ? (
 qBorderStyle==='table' ? (
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:`${qFs}px` }}>
 <thead><tr style={{ background:`${themeColor}11` }}>
 <th style={{ border:`1px solid ${themeColor}88`, padding:`${3*fs}px`, textAlign:'center', width:'5%' }}>No.</th>
 <th style={{ border:`1px solid ${themeColor}88`, padding:`${3*fs}px ${5*fs}px` }}>{isUrdu?'سوال':'Question'}</th>
 {['A','B','C','D'].map(l=><th key={l} style={{ border:`1px solid ${themeColor}88`, padding:`${3*fs}px`, textAlign:'center', width:'11%' }}>({l})</th>)}
 </tr></thead>
 <tbody>{qs.map((q,i)=>(
 <tr key={q.id || `${type.value}-row-${i}`}>
 <td style={{ border:`1px solid ${themeColor}88`, padding:`${3*fs}px`, textAlign:'center', fontWeight:700, color:themeColor }}>{i+1}.</td>
 <td style={{ border:`1px solid ${themeColor}88`, padding:`${3*fs}px ${5*fs}px`, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left', fontFamily:isUrdu?URDU_FONT_STACK:'inherit', lineHeight:isUrdu?urdLineH:engLineH }}>
 <span contentEditable={editMode} suppressContentEditableWarning onBlur={event => commitQuestionText(q, event.currentTarget.textContent || '')} style={editStyle}>{getT(q)}</span>
 </td>
 {q.options?.map((opt, optIndex)=>(
 <td key={opt.key || opt.label || `${type.value}-opt-${i}-${optIndex}`} style={{ border:`1px solid ${themeColor}88`, padding:`${3*fs}px`, textAlign:'center', fontSize:`${qFsSm}px` }}>
 <span contentEditable={editMode} suppressContentEditableWarning onBlur={event => commitOptionText(q, optIndex, event.currentTarget.textContent || '')} style={editStyle}>{getT(opt)}</span>
 {printAns&&opt.correct&&<span style={{color:'#c00',fontWeight:700}}> </span>}
 </td>
 ))}
 </tr>
 ))}</tbody>
 </table>
 ) : (
 qs.map((q,i)=>(
 <div key={q.id || `${type.value}-card-${i}`} style={{ marginBottom:`${8*fs}px`, ...(qBorderStyle==='box'?{border:`1px solid ${themeColor}44`,borderRadius:`${3*fs}px`,padding:`${6*fs}px ${8*fs}px`}:{}) }}>
 <div style={{ fontWeight:700, fontSize:`${qFs}px`, marginBottom:`${3*fs}px`, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left', fontFamily:isUrdu?URDU_FONT_STACK:'inherit', lineHeight:isUrdu?urdLineH:engLineH, letterSpacing:`${letterSp}px` }}>
 <span style={{ color:themeColor }}>{i+1}.</span>{' '}<span contentEditable={editMode} suppressContentEditableWarning onBlur={event => commitQuestionText(q, event.currentTarget.textContent || '')} style={editStyle}>{getT(q)}</span>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:`repeat(${half?2:4},1fr)`, gap:`${2*fs}px`, paddingLeft:isUrdu?0:`${14*fs}px`, paddingRight:isUrdu?`${14*fs}px`:0 }}>
 {q.options?.map((opt, optIndex)=>(
 <div key={opt.key || opt.label || `${type.value}-choice-${i}-${optIndex}`} style={{ fontSize:`${qFsSm}px`, direction:isUrdu?'rtl':'ltr', fontFamily:isUrdu?URDU_FONT_STACK:'inherit', lineHeight:isUrdu?urdLineH:engLineH, letterSpacing:`${letterSp}px` }}>
 <strong style={{color:themeColor}}>({opt.key || opt.label || String.fromCharCode(65 + optIndex)})</strong>{' '}
 <span contentEditable={editMode} suppressContentEditableWarning onBlur={event => commitOptionText(q, optIndex, event.currentTarget.textContent || '')} style={editStyle}>{getT(opt)}</span>
 {printAns&&opt.correct&&<span style={{color:'#c00',fontWeight:700}}> </span>}
 </div>
 ))}
 </div>
 </div>
 ))
 )
 ) : (
 qBorderStyle==='table' ? (
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:`${qFs}px` }}>
 <thead><tr style={{ background:`${themeColor}11` }}>
 <th style={{ border:`1px solid ${themeColor}88`, padding:`${3*fs}px`, textAlign:'center', width:'6%' }}>No.</th>
 <th style={{ border:`1px solid ${themeColor}88`, padding:`${3*fs}px ${5*fs}px` }}>{isUrdu?'سوال':'Question'}</th>
 </tr></thead>
 <tbody>{qs.map((q,i)=>(
 <tr key={q.id || `${type.value}-table-${i}`}>
 <td style={{ border:`1px solid ${themeColor}88`, padding:`${5*fs}px`, textAlign:'center', fontWeight:700, color:themeColor, verticalAlign:'top' }}>{i+1}.</td>
 <td style={{ border:`1px solid ${themeColor}88`, padding:`${5*fs}px`, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left', fontFamily:isUrdu?URDU_FONT_STACK:'inherit', lineHeight:isUrdu?urdLineH:engLineH, minHeight:`${20*fs}px` }}>
 <span contentEditable={editMode} suppressContentEditableWarning onBlur={event => commitQuestionText(q, event.currentTarget.textContent || '')} style={editStyle}>{getT(q)}</span>
 </td>
 </tr>
 ))}</tbody>
 </table>
 ) : (
 <div style={{ display: (type.value==='short'||type.value.includes('short')) ? 'grid' : 'block', gridTemplateColumns: (type.value==='short'||type.value.includes('short')) ? '1fr 1fr' : 'none', gap:`${4*fs}px ${14*fs}px` }}>
 {qs.map((q,i)=>(
 <div key={q.id || `${type.value}-item-${i}`} style={{ fontSize:`${qFs}px`, marginBottom: (type.value==='short'||type.value.includes('short')) ? 0 : `${12*fs}px`, ...(qBorderStyle==='box'?{border:`1px solid ${themeColor}44`,borderRadius:`${3*fs}px`,padding: (type.value==='short'||type.value.includes('short')) ? `${5*fs}px ${7*fs}px` : `${6*fs}px ${8*fs}px`}:{}) }}>
 <div style={{ fontWeight: (type.value==='short'||type.value.includes('short')) ? 600 : 700, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left', fontFamily:isUrdu?URDU_FONT_STACK:'inherit', lineHeight:isUrdu?urdLineH:engLineH, letterSpacing:`${letterSp}px` }}>
 <span style={{ color:themeColor, fontWeight: 600 }}>{i+1}.</span>{' '}<span contentEditable={editMode} suppressContentEditableWarning onBlur={event => commitQuestionText(q, event.currentTarget.textContent || '')} style={editStyle}>{getT(q)}</span>
 </div>
 {showAnsLines && ((type.value==='short'||type.value.includes('short')) ? (
 <div style={{ borderBottom:`1px solid ${themeColor}44`, marginTop:`${4*fs}px`, marginBottom:`${4*fs}px`, height:`${14*fs}px` }} />
 ) : (
 [...Array(6)].map((_,li)=>(
 <div key={li} style={{ borderBottom:`1px solid ${themeColor}22`, height:`${20*fs}px` }} />
 ))
 ))}
 </div>
 ))}
 </div>
 )
 )}
 </div>
 )
}

function Logo({ size=50, src=null }) {
 if (src) {
 return (
 <img
 src={src}
 style={{ width: size, height: size, objectFit: 'contain', display: 'block', margin: '0 auto' }}
 alt="logo"
 />
 )
 }
 return (<div style={{ width:size, height:size, borderRadius:'50%', background:'#1a237e', display:'grid', placeItems:'center', color:'white', fontWeight:900, fontSize:size*0.45 }}>AS</div>)
}

function editablePaperProps(edit) { return edit ? { 'data-manual-edit': 'true' } : {} }

function paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp=0, wordSp=0 }) {
 return {
  lineHeight: isUrdu ? urdLineH : engLineH,
  letterSpacing: `${letterSp}px`,
  wordSpacing: `${wordSp}px`
 }
}

//  Template 1: AS Classic (exact PDF replica) 
function ClassicTemplate({ paper, cfg, printBubble, printAns, half, editMode=false, letterSp=0, engLineH=1.5, urdLineH=2.0, showAnsLines=false, fontColor='#1a1a1a', fontFamily='', baseFontSz=11, headFontSz=11, qBorderStyle='none', showUrduHeaders=false, showSectionLine=false, questionTypes=[], settings, pbStyle, onQuestionChange }) {
 const total = paper.official_section?.length && Number(cfg.totalMarks) ? Number(cfg.totalMarks) : questionTypes.reduce((sum, t) => sum + (paper[t.value]?.length || 0) * (paper[`${t.value}_marks`] || t.marks || 1), 0)
 const isUrdu = isUrduScriptPaper({ config: cfg, ...paper })
 const isDual = cfg.language === 'dual'
 const editStyle = editMode ? { outline:'1.5px dashed #cc0000', borderRadius:2, minWidth:20, display:'inline-block' } : {}
 const fs = (half ? 0.82 : 1) * (baseFontSz / 11)
 const hFs = (half ? 0.82 : 1) * (headFontSz / 11)
  const qFs = 11 * fs
 const qFsSm = Math.max(7, 10 * fs)
 const qFsHead = 12 * fs
 const wrap = { width:'100%', background:'white', color: fontColor, fontFamily: isUrdu ? URDU_FONT_STACK : (fontFamily || 'Arial, sans-serif'), fontSize: `${baseFontSz*fs}px`, direction: isUrdu ? 'rtl' : 'ltr', padding: half ? '3mm 3mm' : '4mm 6mm', boxSizing:'border-box', border: pbStyle, minHeight:half?'':'297mm', ...paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp }) }
 const cell = { border:'1px solid #aaa', padding:`${Math.round(3*fs)}px ${Math.round(7*fs)}px` }
 const cellLbl = { color:'#666', fontSize:`${9*fs}px` }
 const cellVal = { fontWeight:700, fontSize:`${10*fs}px` }
 let qn = 0
 const mcqs = paper['mcq'] || []

 return (
 <div {...editablePaperProps(editMode)} style={wrap}>
 <div style={{ textAlign:'center', marginBottom:`${4*fs}px` }}>
 <div style={{ fontSize:`${(half?22:28)*hFs}px`, fontWeight:900, color:'#1a237e', letterSpacing:1, textTransform:'uppercase' }}>
 {(settings?.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL').toUpperCase()}
 </div>
 <div style={{ fontSize:`${11*hFs}px`, color:'#444' }}>
 {settings?.address || 'SHARIF CHOWK, RAYYA KHAS PH: 0300-1291959'}
 </div>
 </div>
 <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:`${5*fs}px` }}>
 <tbody>
 <tr>
 <td rowSpan={2} style={{ ...cell, width: half?44:64, textAlign:'center', verticalAlign:'middle' }}><Logo size={half?38:52} src={settings?.logo} /></td>
 <td style={cell}><div style={cellLbl}>{isUrdu?'طالب علم کا نام':'Student Name'}</div><div style={{ borderBottom:'1px solid #888', minWidth: half?55:80, height:`${14*fs}px` }} /></td>
 <td style={cell}><div style={cellLbl}>{isUrdu?'رول نمبر':'Roll Number'}</div><div style={{ borderBottom:'1px solid #888', minWidth:40, height:`${14*fs}px` }} /></td>
 <td style={{ ...cell, minWidth:60 }}><div style={cellLbl}>{isUrdu?'جماعت':'Class Name'}</div><div style={cellVal}>{cfg.className}</div></td>
 <td style={{ ...cell, minWidth:60 }}><div style={cellLbl}>{isUrdu?'پیپر کوڈ':'Paper Code'}</div><div style={cellVal}>{cfg.paperCode}</div></td>
 </tr>
 <tr>
 <td style={cell}><div style={cellLbl}>{isUrdu?'مضمون':'Subject Name'}</div><div style={cellVal}>{cfg.subjectName}</div></td>
 <td style={cell}><div style={cellLbl}>{isUrdu?'وقت':'Time Allowed'}</div><div style={cellVal}>{cfg.timeAllowed}</div></td>
 <td style={cell}><div style={cellLbl}>{isUrdu?'کل نمبر':'Total Marks'}</div><div style={cellVal}>{total}</div></td>
 <td style={cell}><div style={cellLbl}>{isUrdu?'تاریخ':'Exam Date'}</div><div style={cellVal}>{cfg.examDate}</div></td>
 </tr>
 </tbody>
 </table>
 <div data-edit-guide style={{ border: editMode ? '2px dashed #cc0000' : 'none', padding:`${7*fs}px ${10*fs}px`, position:'relative' }}>
 <div style={{ position:'relative', zIndex:1 }}>
 {printBubble && mcqs.length>0 && (
 <div style={{ marginBottom:`${8*fs}px` }}>
 <div style={{ display:'grid', gridTemplateColumns:`repeat(${half?4:5},1fr)`, gap:`${3*fs}px ${8*fs}px` }}>
 {mcqs.map((q,i)=>(<div key={q.id} style={{ display:'flex', alignItems:'center', gap:`${3*fs}px`, fontSize:`${10*fs}px`, fontWeight:700 }}><span style={{ minWidth:`${16*fs}px` }}>{i+1}.</span>{['A','B','C','D'].map(lt=>(<span key={lt} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:`${16*fs}px`, height:`${16*fs}px`, borderRadius:'50%', border:'1.5px solid #333', fontSize:`${8*fs}px`, fontWeight:700, color: printAns && q.options?.find(o=>o.key===lt)?.correct ? 'white' : '#333', background: printAns && q.options?.find(o=>o.key===lt)?.correct ? '#c00':'transparent', }}>{lt}</span>))}</div>))}
 </div>
 <div style={{ borderBottom:'1px solid #ccc', marginTop:`${6*fs}px` }} />
 </div>
 )}
 {questionTypes.map((type, idx) => {
 const qs = paper[type.value] || []
 if (qs.length === 0) return null
 qn++
 return (<SectionRenderer key={type.value} type={type} paper={paper} isUrdu={isUrdu} isDual={isDual} editMode={editMode} editStyle={editStyle} fs={fs} qFs={qFs} qFsSm={qFsSm} qFsHead={qFsHead} qBorderStyle={qBorderStyle} urdLineH={urdLineH} engLineH={engLineH} letterSp={letterSp} printAns={printAns} showAnsLines={showAnsLines} qn={qn} half={half} onQuestionChange={onQuestionChange} urduHeader={showUrduHeaders ? (type.value==='mcq'?'حصہ معروضی':'حصہ انشائیہ') : ''} />)
 })}
 </div>
 </div>
 </div>
 )
}

//  Template 2: Modern Pro 
function ModernTemplate({ paper, cfg, printBubble, printAns, half, editMode=false, letterSp=0, wordSp=0, engLineH=1.5, urdLineH=2.0, showAnsLines=false, fontColor='#1a1a1a', fontFamily='', baseFontSz=11, headFontSz=11, qBorderStyle='none', showUrduHeaders=false, showSectionLine=false, questionTypes=[], settings, pbStyle, onQuestionChange }) {
 const total = paper.official_section?.length && Number(cfg.totalMarks) ? Number(cfg.totalMarks) : questionTypes.reduce((sum, t) => sum + (paper[t.value]?.length || 0) * (paper[`${t.value}_marks`] || t.marks || 1), 0)
 const isUrdu = isUrduScriptPaper({ config: cfg, ...paper })
 const isDual = cfg.language === 'dual'
 const editStyle = editMode ? { outline:'1.5px dashed #1565c0', borderRadius:2, minWidth:20, display:'inline-block' } : {}
 const fs = (half ? 0.82 : 1) * (baseFontSz / 11)
 const hFs = (half ? 0.82 : 1) * (headFontSz / 11)
  const qFs = 11 * fs
 const qFsSm = Math.max(7, 10 * fs)
 const qFsHead = 12 * fs
 let qn = 0
 const mcqs = paper['mcq'] || []
 const themeColor = '#1565c0'

 return (
 <div {...editablePaperProps(editMode)} style={{ width:'100%', background:'white', color: fontColor, fontFamily: isUrdu ? URDU_FONT_STACK : (fontFamily || 'Arial, sans-serif'), fontSize:`${baseFontSz*fs}px`, direction:isUrdu?'rtl':'ltr', padding:half?'3mm 3mm':'4mm 6mm', boxSizing:'border-box', border: pbStyle, minHeight:half?'':'297mm', ...paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp, wordSp }) }}>
 <div style={{ background:'linear-gradient(135deg,#1a237e 0%,#0d47a1 60%,#1565c0 100%)', padding:`${(half?10:14)*fs}px ${(half?12:18)*fs}px`, marginBottom:`${6*fs}px`, borderRadius:`${4*fs}px` }}><div style={{ textAlign:'center', color:'white', fontSize:`${(half?20:26)*hFs}px`, fontWeight:900, letterSpacing:1, marginBottom:`${3*fs}px`, textTransform:'uppercase' }}>{(settings?.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL').toUpperCase()}</div><div style={{ textAlign:'center', color:'rgba(255,255,255,0.8)', fontSize:`${10*fs}px` }}>{settings?.address || 'SHARIF CHOWK, RAYYA KHAS PH: 0300-1291959'}</div></div>
 <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:`${8*fs}px`, border:'1px solid #e0e0e0', fontSize:`${10*fs}px` }}>
 <tbody>
 <tr style={{ background:'#e8eaf6' }}>
 <td rowSpan={2} style={{ border:'1px solid #c5cae9', padding:`${4*fs}px`, textAlign:'center', verticalAlign:'middle' }}><Logo size={half?36:50} src={settings?.logo} /></td>
 {[ ['Student Name', null], ['Roll Number', null], ['Class', cfg.className], ['Paper Code', cfg.paperCode] ].map(([lbl,val])=>(<td key={lbl} style={{ border:'1px solid #c5cae9', padding:`${3*fs}px ${6*fs}px` }}><div style={{ color:'#5c6bc0', fontWeight:700, fontSize:`${9*fs}px` }}>{lbl}</div>{val ? <div style={{ fontWeight:700, fontSize:`${11*fs}px`, color:'#1a237e' }}>{val}</div> : <div style={{ borderBottom:'2px solid #1a237e', height:`${14*fs}px`, marginTop:`${2*fs}px` }} />}</td>))}
 </tr>
 <tr>{[ ['Subject', cfg.subjectName], ['Time', cfg.timeAllowed], ['Total Marks', String(total)], ['Exam Date', cfg.examDate] ].map(([lbl,val])=>(<td key={lbl} style={{ border:'1px solid #c5cae9', padding:`${3*fs}px ${6*fs}px` }}><div style={{ color:'#5c6bc0', fontWeight:700, fontSize:`${9*fs}px` }}>{lbl}</div><div style={{ fontWeight:700, fontSize:`${11*fs}px`, color:'#1a237e' }}>{val}</div></td>))}</tr>
 </tbody>
 </table>
 <div style={{ position:'relative' }}><div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', zIndex:0, overflow:'hidden' }}><div style={{ transform:'rotate(-30deg)', opacity:0.04, textAlign:'center' }}><div style={{ fontSize:half?80:120, fontWeight:900, color:'#1a237e', lineHeight:1 }}></div></div></div>
 <div style={{ position:'relative', zIndex:1 }}>
 {printBubble && mcqs.length>0 && (
 <div style={{ background:'#f5f5f5', border:'1px solid #e0e0e0', borderRadius:`${4*fs}px`, padding:`${6*fs}px`, marginBottom:`${8*fs}px` }}>
 <div style={{ display:'grid', gridTemplateColumns:`repeat(${half?4:5},1fr)`, gap:`${4*fs}px ${10*fs}px` }}>
 {mcqs.map((q,i)=>(<div key={q.id} style={{ display:'flex', alignItems:'center', gap:`${4*fs}px`, fontSize:`${10*fs}px`, fontWeight:700 }}><span style={{ color:'#1565c0', minWidth:`${18*fs}px` }}>{i+1}.</span>{['A','B','C','D'].map(lt=>(<span key={lt} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:`${16*fs}px`, height:`${16*fs}px`, borderRadius:'50%', border:'1.5px solid #1565c0', fontSize:`${8*fs}px`, fontWeight:700, color: printAns&&q.options?.find(o=>o.key===lt)?.correct?'white':'#1565c0', background:printAns&&q.options?.find(o=>o.key===lt)?.correct?'#1565c0':'transparent' }}>{lt}</span>))}</div>))}
 </div>
 </div>
 )}
 {questionTypes.map((type, idx) => {
 const qs = paper[type.value] || []
 if (qs.length === 0) return null
 qn++
 return (<SectionRenderer key={type.value} type={type} paper={paper} isUrdu={isUrdu} isDual={isDual} editMode={editMode} editStyle={editStyle} fs={fs} qFs={qFs} qFsSm={qFsSm} qFsHead={qFsHead} qBorderStyle={qBorderStyle} urdLineH={urdLineH} engLineH={engLineH} letterSp={letterSp} printAns={printAns} showAnsLines={showAnsLines} qn={qn} half={half} themeColor={themeColor} onQuestionChange={onQuestionChange} urduHeader={showUrduHeaders ? (type.value==='mcq'?'حصہ معروضی':'حصہ انشائیہ') : ''} />)
 })}
 </div>
 </div>
 </div>
 )
}

//  Template 3: Elite Premium 
function EliteTemplate({ paper, cfg, printBubble, printAns, half, editMode=false, letterSp=0, wordSp=0, engLineH=1.5, urdLineH=2.0, showAnsLines=false, fontColor='#1a1a1a', fontFamily='', baseFontSz=11, headFontSz=11, qBorderStyle='none', showUrduHeaders=false, showSectionLine=false, questionTypes=[], settings, pbStyle, onQuestionChange }) {
 const total = paper.official_section?.length && Number(cfg.totalMarks) ? Number(cfg.totalMarks) : questionTypes.reduce((sum, t) => sum + (paper[t.value]?.length || 0) * (paper[`${t.value}_marks`] || t.marks || 1), 0)
 const isUrdu = isUrduScriptPaper({ config: cfg, ...paper })
 const isDual = cfg.language === 'dual'
 const editStyle = editMode ? { outline:'1.5px dashed #B8860B', borderRadius:2, minWidth:20, display:'inline-block' } : {}
 const fs = (half ? 0.82 : 1) * (baseFontSz / 11)
 const hFs = (half ? 0.82 : 1) * (headFontSz / 11)
  const qFs = 11 * fs
 const qFsSm = Math.max(7, 10 * fs)
 const qFsHead = 12 * fs
 const gold = '#B8860B', goldL = '#DAA520'
 let qn = 0
 const mcqs = paper['mcq'] || []

 return (
 <div {...editablePaperProps(editMode)} style={{ width:'100%', background:'#fffef8', color: fontColor, fontFamily: isUrdu ? URDU_FONT_STACK : (fontFamily || "'Georgia', Times, serif"), fontSize:`${baseFontSz*fs}px`, direction:isUrdu?'rtl':'ltr', padding:half?'3mm 3mm':'4mm 6mm', boxSizing:'border-box', border: pbStyle, minHeight:half?'':'297mm', ...paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp, wordSp }) }}>
 <div style={{ background:'#0a0a14', padding:`${(half?12:16)*fs}px ${(half?14:20)*fs}px`, marginBottom:`${8*fs}px` }}><div style={{ textAlign:'center', color:goldL, fontSize:`${(half?20:26)*hFs}px`, fontWeight:700, letterSpacing:2, marginBottom:`${4*fs}px`, fontFamily:"Georgia, serif", textTransform:'uppercase' }}>{(settings?.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL').toUpperCase()}</div><div style={{ textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><div style={{ flex:1, height:1, background:`linear-gradient(to right, transparent, ${gold})` }} /><div style={{ color:'#aaa', fontSize:`${9*hFs}px`, letterSpacing:1 }}>{settings?.address || 'SHARIF CHOWK, RAYYA KHAS PH: 0300-1291959'}</div><div style={{ flex:1, height:1, background:`linear-gradient(to left, transparent, ${gold})` }} /></div></div>
 <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:`${8*fs}px`, fontSize:`${10*fs}px` }}>
 <tbody>
 <tr>
 <td rowSpan={2} style={{ border:`1px solid ${gold}`, padding:`${5*fs}px`, textAlign:'center', verticalAlign:'middle', background:'#fffef8' }}><Logo size={half?36:50} src={settings?.logo} /></td>
 {[ ['Student Name', null], ['Roll Number', null], ['Class', cfg.className], ['Paper Code', cfg.paperCode] ].map(([lbl,val])=>(<td key={lbl} style={{ border:`1px solid ${gold}`, padding:`${3*fs}px ${7*fs}px` }}><div style={{ color:gold, fontWeight:700, fontSize:`${8*fs}px`, letterSpacing:'0.06em', textTransform:'uppercase' }}>{lbl}</div>{val ? <div style={{ fontWeight:700, fontSize:`${11*fs}px` }}>{val}</div> : <div style={{ borderBottom:`1.5px solid ${gold}`, height:`${14*fs}px`, marginTop:`${2*fs}px` }} />}</td>))}
 </tr>
 <tr>{[ ['Subject', cfg.subjectName], ['Time', cfg.timeAllowed], ['Total Marks', String(total)], ['Date', cfg.examDate] ].map(([lbl,val])=>(<td key={lbl} style={{ border:`1px solid ${gold}`, padding:`${3*fs}px ${7*fs}px` }}><div style={{ color:gold, fontWeight:700, fontSize:`${8*fs}px`, letterSpacing:'0.06em', textTransform:'uppercase' }}>{lbl}</div><div style={{ fontWeight:700, fontSize:`${11*fs}px` }}>{val}</div></td>))}</tr>
 </tbody>
 </table>
 <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:`${8*fs}px` }}><div style={{ flex:1, height:1, background:gold }} /><div style={{ color:gold, fontSize:`${10*fs}px` }}></div><div style={{ flex:1, height:1, background:gold }} /></div>
 <div style={{ position:'relative' }}><div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', zIndex:0, overflow:'hidden' }}><div style={{ transform:'rotate(-20deg)', opacity:0.04 }}><Logo size={half?160:240} src={settings?.logo} /></div></div>
 <div style={{ position:'relative', zIndex:1 }}>
 {printBubble && mcqs.length>0 && (
 <div style={{ border:`1px solid ${gold}`, borderRadius:`${4*fs}px`, padding:`${6*fs}px`, marginBottom:`${8*fs}px`, background:'#fffdf0' }}>
 <div style={{ display:'grid', gridTemplateColumns:`repeat(${half?4:5},1fr)`, gap:`${4*fs}px ${10*fs}px` }}>
 {mcqs.map((q,i)=>(<div key={q.id} style={{ display:'flex', alignItems:'center', gap:`${4*fs}px`, fontSize:`${10*fs}px`, fontWeight:700 }}><span style={{ color:gold, minWidth:`${18*fs}px`, fontFamily:'Georgia,serif' }}>{i+1}.</span>{['A','B','C','D'].map(lt=>(<span key={lt} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:`${16*fs}px`, height:`${16*fs}px`, borderRadius:'50%', border:`1.5px solid ${gold}`, fontSize:`${8*fs}px`, fontWeight:700, color:printAns&&q.options?.find(o=>o.key===lt)?.correct?'white':gold, background:printAns&&q.options?.find(o=>o.key===lt)?.correct?gold:'transparent' }}>{lt}</span>))}</div>))}
 </div>
 </div>
 )}
 {questionTypes.map((type, idx) => {
 const qs = paper[type.value] || []
 if (qs.length === 0) return null
 qn++
 return (<SectionRenderer key={type.value} type={type} paper={paper} isUrdu={isUrdu} isDual={isDual} editMode={editMode} editStyle={editStyle} fs={fs} qFs={qFs} qFsSm={qFsSm} qFsHead={qFsHead} qBorderStyle={qBorderStyle} urdLineH={urdLineH} engLineH={engLineH} letterSp={letterSp} printAns={printAns} showAnsLines={showAnsLines} qn={qn} half={half} themeColor={gold} onQuestionChange={onQuestionChange} urduHeader={showUrduHeaders ? (type.value==='mcq'?'حصہ معروضی':'حصہ انشائیہ') : ''} />)
 })}
 </div>
 </div>
 </div>
 )
}

//  Template 4: Emerald Green 
function EmeraldTemplate({ paper, cfg, printBubble, printAns, half, editMode=false, letterSp=0, wordSp=0, engLineH=1.5, urdLineH=2.0, showAnsLines=false, fontColor='#1a1a1a', fontFamily='', baseFontSz=11, headFontSz=11, qBorderStyle='none', showUrduHeaders=false, showSectionLine=false, questionTypes=[], settings, pbStyle, onQuestionChange }) {
 const total = paper.official_section?.length && Number(cfg.totalMarks) ? Number(cfg.totalMarks) : questionTypes.reduce((sum, t) => sum + (paper[t.value]?.length || 0) * (paper[`${t.value}_marks`] || t.marks || 1), 0)
 const isUrdu = isUrduScriptPaper({ config: cfg, ...paper })
 const isDual = cfg.language === 'dual'
 const fs = (half ? 0.82 : 1) * (baseFontSz / 11)
 const hFs = (half ? 0.82 : 1) * (headFontSz / 11)
  const qFs = 11 * fs
 const qFsSm = Math.max(7, 10 * fs)
 const qFsHead = 12 * fs
 const teal = '#00695c', tealL = '#00897b', mint = '#e0f2f1'
 const editStyle = editMode ? { outline:'1.5px dashed #00897b', borderRadius:2, minWidth:20, display:'inline-block' } : {}
 let qn = 0
 const mcqs = paper['mcq'] || []

 return (
 <div {...editablePaperProps(editMode)} style={{ width:'100%', background:'#f9fffe', color: fontColor, fontFamily: isUrdu ? URDU_FONT_STACK : (fontFamily || 'Arial, sans-serif'), fontSize:`${baseFontSz*fs}px`, direction:isUrdu?'rtl':'ltr', padding:half?'3mm 3mm':'4mm 6mm', boxSizing:'border-box', border: pbStyle, minHeight:half?'':'297mm', ...paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp, wordSp }) }}>
 <div style={{ background:`linear-gradient(90deg,${teal} 0%,${tealL} 50%,#26a69a 100%)`, borderRadius:`${4*fs}px`, overflow:'hidden', marginBottom:`${7*fs}px` }}><div style={{ padding:`${(half?10:14)*fs}px ${(half?12:18)*fs}px`, display:'flex', alignItems:'center', gap:`${10*fs}px` }}><Logo size={half?36:50} src={settings?.logo} /><div style={{ flex:1, textAlign:'center' }}><div style={{ color:'white', fontSize:`${(half?20:26)*hFs}px`, fontWeight:900, letterSpacing:1, textTransform:'uppercase' }}>{(settings?.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL').toUpperCase()}</div><div style={{ color:'rgba(255,255,255,0.8)', fontSize:`${10*fs}px`, marginTop:2 }}>{settings?.address || 'SHARIF CHOWK, RAYYA KHAS PH: 0300-1291959'}</div></div></div></div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:`${4*fs}px`, marginBottom:`${8*fs}px` }}>{[ ['Student Name', null], ['Subject', cfg.subjectName], ['Class', cfg.className], ['Date', cfg.examDate], ['Roll Number', null], ['Time', cfg.timeAllowed], ['Total Marks', String(total)], ['Paper Code', cfg.paperCode] ].map(([lbl,val])=>(<div key={lbl} style={{ background:mint, borderRadius:`${3*fs}px`, border:`1px solid ${tealL}44`, padding:`${3*fs}px ${6*fs}px` }}><div style={{ color:teal, fontWeight:700, fontSize:`${8*fs}px`, textTransform:'uppercase', letterSpacing:'0.05em' }}>{lbl}</div>{val ? <div style={{ fontWeight:700, fontSize:`${10*fs}px`, color:'#004d40' }}>{val}</div> : <div style={{ borderBottom:`1.5px solid ${teal}`, height:`${12*fs}px`, marginTop:`${2*fs}px` }} />}</div>))}</div>
 <div style={{ border:`2px solid ${teal}`, borderRadius:`${6*fs}px`, padding:`${8*fs}px`, position:'relative', overflow:'hidden' }}><div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', overflow:'hidden' }}><div style={{ transform:'rotate(-30deg)', opacity:0.04, fontSize:half?70:110, fontWeight:900, color:teal, lineHeight:1, textAlign:'center' }}></div></div>
 <div style={{ position:'relative' }}>
 {printBubble && mcqs.length>0 && (
 <div style={{ background:mint, border:`1px solid ${tealL}44`, borderRadius:`${4*fs}px`, padding:`${5*fs}px`, marginBottom:`${8*fs}px` }}>
 <div style={{ display:'grid', gridTemplateColumns:`repeat(${half?4:5},1fr)`, gap:`${3*fs}px ${8*fs}px` }}>
 {mcqs.map((q,i)=>(<div key={q.id} style={{ display:'flex', alignItems:'center', gap:`${3*fs}px`, fontSize:`${10*fs}px`, fontWeight:700 }}><span style={{ color:teal, minWidth:`${16*fs}px` }}>{i+1}.</span>{['A','B','C','D'].map(lt=>(<span key={lt} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:`${16*fs}px`, height:`${16*fs}px`, borderRadius:`${3*fs}px`, border:`1.5px solid ${teal}`, fontSize:`${8*fs}px`, fontWeight:700, color: printAns&&q.options?.find(o=>o.key===lt)?.correct?'white':teal, background: printAns&&q.options?.find(o=>o.key===lt)?.correct?teal:'transparent' }}>{lt}</span>))}</div>))}
 </div>
 </div>
 )}
 {questionTypes.map((type, idx) => {
 const qs = paper[type.value] || []
 if (qs.length === 0) return null
 qn++
 return (<SectionRenderer key={type.value} type={type} paper={paper} isUrdu={isUrdu} isDual={isDual} editMode={editMode} editStyle={editStyle} fs={fs} qFs={qFs} qFsSm={qFsSm} qFsHead={qFsHead} qBorderStyle={qBorderStyle} urdLineH={urdLineH} engLineH={engLineH} letterSp={letterSp} printAns={printAns} showAnsLines={showAnsLines} qn={qn} half={half} themeColor={teal} onQuestionChange={onQuestionChange} urduHeader={showUrduHeaders ? (type.value==='mcq'?'حصہ معروضی':'حصہ انشائیہ') : ''} />)
 })}
 </div>
 </div>
 </div>
 )
}

const PREMIUM_PAPER_THEMES = {
 academic:{ accent:'#123b67', soft:'#edf4fa', line:'#9bb5ce', heading:'Georgia, serif', label:'Academic Navy', header:'rule' },
 modern:{ accent:'#0877a6', soft:'#eaf8fc', line:'#86c9df', heading:'Arial, sans-serif', label:'Modern Cyan', header:'bar' },
 emerald:{ accent:'#08715f', soft:'#eaf8f4', line:'#8ccbbe', heading:'Arial, sans-serif', label:'Emerald Fresh', header:'split' },
 gold:{ accent:'#a56f00', soft:'#fff8df', line:'#dac27c', heading:'Georgia, serif', label:'Royal Gold', header:'crest' },
 coral:{ accent:'#c34442', soft:'#fff0ed', line:'#e3aaa2', heading:'Arial, sans-serif', label:'Coral Studio', header:'corner' },
 violet:{ accent:'#6941a5', soft:'#f5effc', line:'#bfa8dc', heading:'Georgia, serif', label:'Violet Scholar', header:'badge' },
 minimal:{ accent:'#242b31', soft:'#fff', line:'#aab3ba', heading:'Georgia, serif', label:'Minimal Monochrome', header:'stack' },
 editorial:{ accent:'#39566a', soft:'#eaf0f3', line:'#a6bbc6', heading:'Georgia, serif', label:'Editorial Slate', header:'masthead' },
}

function PremiumPaperTemplate({ variant='academic', paper, cfg, printBubble, printAns, half, editMode=false, letterSp=0, wordSp=0, engLineH=1.5, urdLineH=2.0, showAnsLines=false, fontColor='#172033', fontFamily="'Times New Roman', Times, serif", baseFontSz=13, headFontSz=14, fontBold=false, fontItalic=false, fontUnderline=false, textAlign='start', qBorderStyle='none', showUrduHeaders=false, showSectionLine=true, questionTypes=[], settings, pbStyle, onQuestionChange, onDeleteSection, onDuplicateSection, onMoveSection, onAddSection, onSelectSection, selectedSectionId, onActiveEditable, mcqLayout='matrix-table', shortLayout='1-column' }) {
 const theme = PREMIUM_PAPER_THEMES[variant] || PREMIUM_PAPER_THEMES.academic
 const isUrdu = isUrduScriptPaper({ config: cfg, ...paper })
 const isDual = cfg.language === 'dual'
 const total = paper.official_section?.length && Number(cfg.totalMarks) ? Number(cfg.totalMarks) : questionTypes.reduce((sum, type) => sum + (paper[type.value]?.length || 0) * (paper[`${type.value}_marks`] || type.marks || 1), 0)
 const fs = (half ? 0.82 : 1) * (baseFontSz / 11)
 const qFs = baseFontSz * (isUrdu ? 1.6 : 4 / 3) * (half ? 0.82 : 1)
 const contentFont = isUrdu ? URDU_FONT_STACK : (fontFamily || 'Arial, sans-serif')
 const schoolName = (settings?.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL').toUpperCase()
 const examBadge = cfg.title || [cfg.examType, cfg.session].filter(Boolean).join(' ') || 'EXAMINATION'
 const compositions = {
  academic:{ columns:'60px minmax(0,1fr) 218px', background:'#fff', radius:0, logo:1, title:2, badge:3, titleAlign:'center', border:`3px solid ${theme.accent}` },
  modern:{ columns:'1fr 64px', background:theme.soft, radius:10, logo:2, title:1, badge:3, titleAlign:'left', border:`8px solid ${theme.accent}`, badgeColumn:'1 / -1' },
  emerald:{ columns:'60px minmax(0,1fr) 218px', background:'#f7fffc', radius:12, logo:1, title:2, badge:3, titleAlign:'left', border:`2px solid ${theme.accent}` },
  gold:{ columns:'54px minmax(0,1fr) 218px', background:'#fffdf5', radius:0, logo:1, title:2, badge:3, titleAlign:'center', border:`3px double ${theme.accent}` },
  coral:{ columns:'218px minmax(0,1fr) 60px', background:'#fff7f5', radius:8, logo:3, title:2, badge:1, titleAlign:'left', border:`10px solid ${theme.accent}` },
  violet:{ columns:'minmax(0,1fr) 218px', background:'#faf7ff', radius:14, logo:3, title:1, badge:2, titleAlign:'left', border:`3px solid ${theme.accent}`, logoColumn:'1 / -1' },
  minimal:{ columns:'1fr', background:'#fff', radius:0, logo:1, title:2, badge:3, titleAlign:'center', border:`1px solid ${theme.accent}`, logoColumn:'1', titleColumn:'1', badgeColumn:'1' },
  editorial:{ columns:'minmax(0,1fr) 64px', background:'#fff', radius:0, logo:2, title:1, badge:3, titleAlign:'left', border:`5px solid ${theme.accent}`, badgeColumn:'1 / -1' },
 }
 const composition = compositions[variant] || compositions.academic
 const metadata = [
  ['Student Name', ''], ['Roll Number', ''], ['Class', cfg.className], ['Paper Code', cfg.paperCode],
  ['Subject', cfg.subjectName], ['Time Allowed', cfg.timeAllowed], ['Total Marks', String(total)], ['Exam Date', cfg.examDate],
 ]
 const visibleQuestionTypes = questionTypes.filter(type => (paper[type.value] || []).length)
 return <div {...editablePaperProps(editMode)} data-premium-template={variant} style={{ width:'100%', minHeight:half?'':'297mm', boxSizing:'border-box', padding:half?'4mm':'7mm 8mm', background:'#fff', color:fontColor, border:pbStyle, fontFamily:contentFont, fontSize:`${qFs}px`, fontWeight:fontBold?700:400, fontStyle:fontItalic?'italic':'normal', textDecoration:fontUnderline?'underline':'none', textAlign, direction:isUrdu?'rtl':'ltr', ...paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp, wordSp }) }}>
  <header style={{ direction:'ltr', borderTop:composition.border, borderBottom:`2px solid ${theme.accent}`, borderLeft:variant==='modern'||variant==='coral'?composition.border:'none', padding:`${5 * fs}px ${8 * fs}px`, background:composition.background, borderRadius:composition.radius, display:'grid', gridTemplateColumns:composition.columns, alignItems:'center', gap:8 }}>
   <div style={{ order:composition.logo, gridColumn:composition.logoColumn || 'auto', display:'grid', placeItems:'center' }}><Logo size={half?42:54} src={settings?.logo} /></div>
   <div style={{ order:composition.title, gridColumn:composition.titleColumn || 'auto', textAlign:composition.titleAlign, minWidth:0 }}><div style={{ color:theme.accent, fontFamily:theme.heading, fontWeight:800, fontSize:`${Math.min(24, (half?18:22) * Math.max(.9, headFontSz/14))}px`, lineHeight:1.15 }}>{schoolName}</div><div style={{ color:'#526174', fontSize:`${9 * fs}px`, marginTop:4 }}>{cfg.address || settings?.address || 'Sharif Chowk, Rayya Khas, Narowal | 03001291959'}</div></div>
   <div style={{ order:composition.badge, gridColumn:composition.badgeColumn || 'auto', justifySelf:variant==='minimal'?'center':'stretch', background:variant==='editorial'?theme.accent:theme.soft, border:`1px solid ${theme.line}`, borderRadius:variant==='emerald'?8:2, padding:'5px 8px', color:variant==='editorial'?'#fff':theme.accent, fontWeight:800, textAlign:variant==='editorial'?'left':'center', fontSize:`${9 * fs}px`, lineHeight:1.25, whiteSpace:'nowrap' }}>{examBadge}</div>
  </header>
  <table data-student-info style={{ direction:'ltr', width:'100%', borderCollapse:'collapse', tableLayout:'fixed', margin:`${7 * fs}px 0 ${10 * fs}px`, fontFamily:'Arial, sans-serif' }}><tbody>
   {chunk(metadata, 4).map((row, rowIndex) => <tr key={rowIndex}>{row.map(([label, value]) => <td key={label} style={{ border:`1px solid ${theme.line}`, padding:`${4 * fs}px ${6 * fs}px`, background:rowIndex === 0 ? '#fff' : theme.soft, textAlign:'left', verticalAlign:'top' }}><div style={{ color:theme.accent, fontWeight:800, fontSize:`${7.5 * fs}px`, textTransform:'uppercase' }}>{label}</div>{value ? <div style={{ color:'#172033', fontWeight:700, fontSize:`${10 * fs}px`, direction:'ltr' }}>{value}</div> : <div style={{ borderBottom:`1px solid ${theme.accent}`, height:`${13 * fs}px` }} />}</td>)}</tr>)}
  </tbody></table>
  <main style={{ position:'relative', zIndex:2 }}>
   {visibleQuestionTypes.map((type, typeIndex) => (
    <SectionRenderer key={type.value} type={type} paper={paper} isUrdu={isUrdu} isDual={isDual} editMode={editMode} editStyle={{}} fs={fs} qFs={qFs} qFsSm={Math.max(8,10*fs)} qFsHead={headFontSz * (isUrdu ? 1.6 : 4 / 3) * (half ? 0.82 : 1)} qBorderStyle={qBorderStyle} mcqLayout={mcqLayout} shortLayout={shortLayout} urdLineH={urdLineH} engLineH={engLineH} letterSp={letterSp} wordSp={wordSp} textAlign={textAlign} fontFamily={contentFont} printAns={printAns} showAnsLines={showAnsLines} showSectionLine={showSectionLine} qn={typeIndex + 1} half={half} themeColor={theme.accent} onQuestionChange={onQuestionChange} onDeleteSection={onDeleteSection} onDuplicateSection={onDuplicateSection} onMoveSection={onMoveSection} onAddSection={onAddSection} onSelectSection={onSelectSection} selectedSectionId={selectedSectionId} onActiveEditable={onActiveEditable} urduHeader={showUrduHeaders ? (type.value === 'mcq' ? 'حصہ معروضی' : 'حصہ انشائیہ') : ''} />
   ))}
  </main>
 </div>
}

function AcademicClassicTemplate(props) {
 return <ClassicTemplate {...props} qBorderStyle={props.qBorderStyle === 'none' ? 'table' : props.qBorderStyle} fontFamily={props.fontFamily || "'Times New Roman', serif"} fontColor={props.fontColor || '#111827'} />
}

//  Template 5: Docx Assessment 
function DocxAssessmentTemplate({ paper, cfg, printBubble, printAns, half, editMode=false, letterSp=0, wordSp=0, engLineH=1.5, urdLineH=2.0, showAnsLines=false, fontColor='#1a1a1a', fontFamily='', baseFontSz=11, headFontSz=11, qBorderStyle='none', showUrduHeaders=false, showSectionLine=false, questionTypes=[] , pbStyle, onQuestionChange }) {
 const total = paper.official_section?.length && Number(cfg.totalMarks) ? Number(cfg.totalMarks) : questionTypes.reduce((sum, t) => sum + (paper[t.value]?.length || 0) * (paper[`${t.value}_marks`] || t.marks || 1), 0)
 const isUrdu = isUrduScriptPaper({ config: cfg, ...paper })
 const isDual = cfg.language === 'dual'
 const fs = (half ? 0.82 : 1) * (baseFontSz / 11)
 const hFs = (half ? 0.82 : 1) * (headFontSz / 11)
  const qFs = 11 * fs
 const qFsSm = Math.max(7, 10 * fs)
 const qFsHead = 12 * fs
 const editStyle = editMode ? { outline:'1px dashed #444', minWidth:20, display:'inline-block' } : {}
 let qn = 0
 const mcqs = paper['mcq'] || []

 return (
 <div {...editablePaperProps(editMode)} style={{ width:'100%', background:'white', color: fontColor, fontFamily: isUrdu ? URDU_FONT_STACK : (fontFamily || "'Times New Roman', Times, serif"), fontSize:`${baseFontSz*fs}px`, direction:isUrdu?'rtl':'ltr', padding:half?'8mm 6mm':'12mm 15mm', boxSizing:'border-box', border: pbStyle, minHeight:half?'':'297mm', ...paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp, wordSp }) }}>
 <div style={{ borderBottom:'2px solid #000', paddingBottom:5, marginBottom:15 }}><div style={{ fontSize:`${(half?18:24)*fs}px`, fontWeight:700, textAlign:'center' }}>ASSESSMENT PAPER</div><div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontWeight:700, fontSize:`${11*fs}px` }}><span>Subject: {cfg.subjectName}</span><span>Class: {cfg.className}</span><span>Marks: {total}</span></div></div>
 <div style={{ marginBottom:15, display:'flex', justifyContent:'space-between', fontSize:`${10*fs}px` }}><span>Student Name: __________________________</span><span>Date: {cfg.examDate}</span></div>
 {questionTypes.map((type, idx) => {
 const qs = paper[type.value] || []
 if (qs.length === 0) return null
 qn++
 return (<SectionRenderer key={type.value} type={type} paper={paper} isUrdu={isUrdu} isDual={isDual} editMode={editMode} editStyle={editStyle} fs={fs} qFs={qFs} qFsSm={qFsSm} qFsHead={qFsHead} qBorderStyle={qBorderStyle} urdLineH={urdLineH} engLineH={engLineH} letterSp={letterSp} printAns={printAns} showAnsLines={showAnsLines} qn={qn} half={half} themeColor="#000" onQuestionChange={onQuestionChange} urduHeader={showUrduHeaders ? (type.value==='mcq'?'حصہ معروضی':'حصہ انشائیہ') : ''} />)
 })}
 </div>
 )
}

const TEMPLATES = [
 { id:'academic', label:'Academic Navy', desc:'Formal navy rules and balanced academic typography' },
 { id:'modern', label:'Modern Cyan', desc:'Fresh cyan band with crisp sans-serif structure' },
 { id:'emerald', label:'Emerald Fresh', desc:'Calm green accents with generous white space' },
 { id:'gold', label:'Royal Gold', desc:'Warm gold details on a clean white sheet' },
 { id:'coral', label:'Coral Studio', desc:'Contemporary coral accents and clean geometry' },
 { id:'violet', label:'Violet Scholar', desc:'Refined violet details with a scholarly serif heading' },
 { id:'minimal', label:'Minimal Monochrome', desc:'Centered monochrome masthead with fine rules' },
 { id:'editorial', label:'Editorial Slate', desc:'Left-aligned editorial masthead and slate examination strip' },
]
const PRINT_MODES = [
 { id:'a4', label:'Single A4', desc:'Full A4 paper (210mm × 297mm)' },
 { id:'half', label:'2 per A4', desc:'Two half-A4 papers stacked on one sheet' },
]

const OFFICIAL_TEMPLATE_THEMES = [
 { id:'academic', label:'Academic Navy', accent:'#123b67', soft:'#eaf2fa', border:'#9eb6cf' },
 { id:'classic', label:'Classic Gold', accent:'#9a6a00', soft:'#fff8df', border:'#d6bd72' },
 { id:'modern', label:'Modern Blue', accent:'#075985', soft:'#e8f7fc', border:'#7fc5df' },
 { id:'elite', label:'Elite Charcoal', accent:'#28323c', soft:'#f0f2f4', border:'#a8b0b8' },
 { id:'emerald', label:'Emerald', accent:'#06695b', soft:'#e6f7f3', border:'#88c9bc' },
]

function OfficialExamPaperEditor({ loadedPaper, onReturnToSource }) {
 const { paperSettings, updateSavedPaper } = usePaperStore()
 const [draft, setDraft] = useState(() => structuredClone(loadedPaper))
 const [template, setTemplate] = useState('academic')
 const [editing, setEditing] = useState(false)
 const [status, setStatus] = useState('')
 const printRef = useRef(null)
 const theme = OFFICIAL_TEMPLATE_THEMES.find(item => item.id === template) || OFFICIAL_TEMPLATE_THEMES[0]
 const isUrdu = isUrduScriptPaper(draft)

 const updateConfig = (key, value) => setDraft(current => ({
  ...current,
  config: { ...current.config, [key]: value },
 }))

 const updateSection = (index, key, value) => setDraft(current => ({
  ...current,
  sections: current.sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, [key]: value } : section),
 }))

 function saveChanges() {
  const saved = updateSavedPaper(draft.id, {
   name: draft.name,
   config: draft.config,
   sections: draft.sections,
   template,
  })
  if (!saved) {
   setStatus('Save failed. Your current draft is still open.')
   return
  }
  setDraft(saved)
  setStatus('Saved. Reopening this paper will retain every correction.')
  setEditing(false)
 }

 async function printPaper() {
  const node = printRef.current
  if (!node) return
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="UTF-8"><style>
@font-face{
  font-family:'ASSPS Jameel Noori';
  src:
    local('Jameel Noori Nastaleeq'),
    local('Jameel Noori Nastaleeq Kasheeda'),
    url('/fonts/JameelNooriNastaleeqKasheeda.ttf') format('truetype');
  font-style: normal;
  font-weight: 400 900;
  font-display: block;
}
@font-face{
  font-family:'Jameel Noori Nastaleeq';
  src:
    local('Jameel Noori Nastaleeq'),
    local('Jameel Noori Nastaleeq Kasheeda'),
    url('/fonts/JameelNooriNastaleeqKasheeda.ttf') format('truetype');
  font-style: normal;
  font-weight: 400 900;
  font-display: block;
}
[dir="rtl"], .urdu, .urdu-text, [data-urdu="true"], .official-paper[dir="rtl"], .official-paper[dir="rtl"] * {
  font-family: 'ASSPS Jameel Noori', 'Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq Kasheeda', 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif !important;
}
@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#fff}textarea,input,button,.official-qa-notes{display:none!important}.official-paper{width:100%!important;min-height:auto!important;box-shadow:none!important;margin:0!important}.official-section{break-inside:avoid}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body>${node.outerHTML}</body></html>`)
  doc.close()
  try {
   if (doc.fonts) {
    await Promise.race([
     Promise.all([
      doc.fonts.load("16px 'ASSPS Jameel Noori'"),
      doc.fonts.load("16px 'Jameel Noori Nastaleeq'"),
      doc.fonts.ready,
     ]),
     new Promise(resolve => setTimeout(resolve, 2000))
    ])
   }
  } catch (err) {
   console.warn('Urdu print font preload warning in printPaper:', err)
  }
  frame.contentWindow?.focus()
  frame.contentWindow?.print()
  setTimeout(() => frame.remove(), 3000)
 }

 const inputStyle = { width:'100%', boxSizing:'border-box', border:`1px solid ${theme.border}`, borderRadius:6, padding:'8px 10px', font:'inherit', color:'#111827', background:'#fff' }

 return (
  <div style={{ minHeight:'100vh', background:'#071e34', color:D.silver, padding:20 }}>
   <div style={{ maxWidth:1120, margin:'0 auto 16px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
    <button onClick={onReturnToSource} style={{ background:'rgba(255,255,255,.08)', color:D.silver, border:`1px solid ${D.border}`, borderRadius:8, padding:'9px 14px', cursor:'pointer' }}>Back to Saved Papers</button>
    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
     {OFFICIAL_TEMPLATE_THEMES.map(item => <button key={item.id} onClick={() => setTemplate(item.id)} style={{ background:item.id === template ? item.accent : 'rgba(255,255,255,.06)', color:item.id === template ? '#fff' : D.silver, border:`1px solid ${item.id === template ? item.accent : D.border}`, borderRadius:8, padding:'9px 12px', cursor:'pointer', fontWeight:700 }}>{item.label}</button>)}
    </div>
    <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
     <button onClick={() => setEditing(value => !value)} style={{ background:editing ? '#f59e0b' : 'rgba(255,255,255,.08)', color:editing ? '#111827' : '#fff', border:'none', borderRadius:8, padding:'9px 14px', cursor:'pointer', fontWeight:800 }}>{editing ? 'Cancel Editing' : 'Edit Every Field'}</button>
     <button onClick={saveChanges} style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', cursor:'pointer', fontWeight:800 }}>Save Corrections</button>
     <button onClick={printPaper} style={{ background:theme.accent, color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', cursor:'pointer', fontWeight:800 }}>Print / PDF</button>
    </div>
   </div>
   {status && <div style={{ maxWidth:1120, margin:'0 auto 12px', color:status.startsWith('Saved') ? '#86efac' : '#fca5a5', fontWeight:700 }}>{status}</div>}
   {(draft.sourceTotalNote || draft.qaNotes) && <details className="official-qa-notes" style={{ maxWidth:1120, margin:'0 auto 12px', background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.35)', borderRadius:8, padding:'10px 12px', color:'#fde68a' }}>
    <summary style={{ cursor:'pointer', fontWeight:800 }}>Source QA notes - review before final printing</summary>
    {draft.sourceTotalNote && <div style={{ marginTop:8 }}>{draft.sourceTotalNote}</div>}
    {draft.qaNotes && <pre style={{ margin:'8px 0 0', whiteSpace:'pre-wrap', fontFamily:'inherit' }}>{draft.qaNotes}</pre>}
   </details>}
   <div ref={printRef} className="official-paper" dir={isUrdu ? 'rtl' : 'ltr'} style={{ width:'210mm', minHeight:'297mm', margin:'0 auto', background:'#fff', color:'#111827', padding:'12mm', boxSizing:'border-box', boxShadow:'0 12px 40px rgba(0,0,0,.4)', fontFamily:isUrdu ? URDU_FONT_STACK : "'Times New Roman', serif", borderTop:`8px solid ${theme.accent}` }}>
    <header style={{ display:'grid', gridTemplateColumns:'80px 1fr 150px', gap:14, alignItems:'center', borderBottom:`3px solid ${theme.accent}`, paddingBottom:12, marginBottom:12 }}>
     <div style={{ width:72, height:72, display:'grid', placeItems:'center', background:'#fff' }}>{paperSettings?.logo ? <img src={paperSettings.logo} alt="School logo" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} /> : <strong style={{ color:theme.accent }}>ASSPS</strong>}</div>
     <div style={{ textAlign:isUrdu ? 'right' : 'left' }}>
      <div style={{ fontSize:24, fontWeight:900, color:theme.accent, lineHeight:1.15 }}>AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</div>
      <div style={{ fontSize:11, marginTop:5 }}>{paperSettings?.address || 'Sharif Chowk, Rayya Khas, Narowal'}</div>
     </div>
     <div style={{ background:theme.soft, border:`1px solid ${theme.border}`, padding:10, textAlign:'center' }}>
      <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase' }}>{draft.config?.examType}</div>
      <div style={{ fontSize:13, fontWeight:900, color:theme.accent, marginTop:4 }}>{draft.config?.session}</div>
     </div>
    </header>

    <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr 1fr', gap:6, marginBottom:16 }}>
     {[
      ['Paper Name', 'name', draft.name],
      ['Class', 'classLevel', draft.config?.classLevel],
      ['Subject', 'subject', draft.config?.subject],
      ['Total Marks', 'totalMarks', draft.config?.totalMarks],
     ].map(([label, key, value]) => <div key={key} style={{ background:theme.soft, border:`1px solid ${theme.border}`, padding:8, minHeight:52 }}>
      <div style={{ color:theme.accent, fontSize:9, fontWeight:900, textTransform:'uppercase', marginBottom:4 }}>{label}</div>
      {editing ? (key === 'name' ? <input value={value || ''} onChange={event => setDraft(current => ({ ...current, name:event.target.value }))} style={inputStyle} /> : <input value={value ?? ''} onChange={event => updateConfig(key, key === 'totalMarks' ? Number(event.target.value) : event.target.value)} style={inputStyle} />) : <div style={{ fontWeight:800, fontSize:12 }}>{value}</div>}
     </div>)}
    </div>

    <main>
     {draft.sections.map((section, index) => <section className="official-section" key={section.id || index} style={{ marginBottom:18 }}>
      {editing ? <input value={section.heading} onChange={event => updateSection(index, 'heading', event.target.value)} style={{ ...inputStyle, fontWeight:900, color:theme.accent, marginBottom:6, direction:isUrdu ? 'rtl' : 'ltr' }} /> : <h2 style={{ margin:'0 0 7px', padding:'6px 10px', background:theme.soft, color:theme.accent, borderLeft:isUrdu ? 'none' : `5px solid ${theme.accent}`, borderRight:isUrdu ? `5px solid ${theme.accent}` : 'none', fontSize:15, lineHeight:isUrdu ? 2 : 1.35 }}>{section.heading}</h2>}
      {editing ? <textarea value={section.content} onChange={event => updateSection(index, 'content', event.target.value)} dir={isUrdu ? 'rtl' : 'ltr'} style={{ ...inputStyle, minHeight:Math.max(110, section.content.split('\n').length * 24), resize:'vertical', lineHeight:isUrdu ? 2 : 1.55, fontFamily:'inherit' }} /> : <pre style={{ margin:0, padding:'0 10px', fontFamily:'inherit', fontSize:13, lineHeight:isUrdu ? 2.1 : 1.55, direction:isUrdu ? 'rtl' : 'ltr', textAlign:isUrdu ? 'right' : 'left', whiteSpace:'pre-wrap', overflowWrap:'anywhere' }}>{section.content}</pre>}
     </section>)}
    </main>
   </div>
  </div>
 )
}

//  Main Component 
function PTSPaperGeneratorCore({ loadedPaper, onReturnToSource = null }) {
 const [uiTheme, setUiTheme] = useState(getInitialPaperTheme)
 const [step, setStep] = useState(() => loadedPaper ? 'questions' : 'syllabus')
 const [syllabusId, setSyllabusId] = useState(null)
 const [classId, setClassId] = useState(null)
 const [subjectId, setSubjectId] = useState(null)
 const [selChapters, setSelChapters] = useState(new Set())
 const [selTopics, setSelTopics] = useState(new Set())
 const { questionTypes } = usePaperStore()
 const [paper, setPaper] = useState(() => {
 if (loadedPaper) {
 const p = { ...loadedPaper }
 questionTypes.forEach(t => {
 if (!p[t.value]) {
 const savedCategory = loadedPaper.selectedQuestions?.[t.value]
 const savedQuestions = Array.isArray(savedCategory) ? savedCategory : (Array.isArray(savedCategory?.questions) ? savedCategory.questions : [])
 if (savedQuestions.length) p[t.value] = savedQuestions
 else if (t.value === 'mcq') p.mcq = loadedPaper.selectedMCQ || []
 else if (t.value === 'short') p.short = loadedPaper.selectedShort || []
 else if (t.value === 'long') p.long = loadedPaper.selectedLong || []
 else p[t.value] = []
 }
 if (!p[`${t.value}_marks`]) {
 const savedCategory = loadedPaper.selectedQuestions?.[t.value]
 const savedMarks = Number(savedCategory?.marks)
 if (savedMarks) p[`${t.value}_marks`] = savedMarks
 else if (t.value === 'mcq') p.mcq_marks = loadedPaper.mcq_marks || 1
 else if (t.value === 'short') p.short_marks = loadedPaper.short_marks || 2
 else if (t.value === 'long') p.long_marks = loadedPaper.long_marks || 5
 else p[`${t.value}_marks`] = t.marks || 1
 }
 })
 return p
 }
 const initial = {}
 questionTypes.forEach(t => { initial[t.value] = []; initial[`${t.value}_marks`] = t.marks || 1 })
 return initial
 })

 const crumbs = {
 syllabus: [{ label:'Syllabus Selection' }],
 class: [{ label:'Syllabus Selection', onClick:()=>setStep('syllabus') }, { label:'Class Selection' }],
 subject: [{ label:'Syllabus Selection', onClick:()=>setStep('syllabus') }, { label:'Class', onClick:()=>setStep('class') }, { label:'Subject Selection' }],
 chapters: [{ label:'Syllabus Selection', onClick:()=>setStep('syllabus') }, { label:'Class', onClick:()=>setStep('class') }, { label:'Subject', onClick:()=>setStep('subject') }, { label:'Select Chapters' }],
 questions: [{ label:'Build Paper' }],
 }

 useEffect(() => {
 const syncTheme = () => setUiTheme(getInitialPaperTheme())
 const observer = new MutationObserver(syncTheme)
 observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
 window.addEventListener('storage', syncTheme)
 return () => {
 observer.disconnect()
 window.removeEventListener('storage', syncTheme)
 }
 }, [])

 return (
 <div className="pts-paper-generator-shell" data-paper-theme={uiTheme} style={{ background:D.bg, minHeight:'100vh', fontFamily:'Inter, Segoe UI, sans-serif', position:'relative', ...themeVars(uiTheme) }}>
 <DBreadcrumb steps={crumbs[step]||[]} />
 {step !== 'questions' && (<div style={{ position:'absolute', top:8, right:18, zIndex:5 }}><ThemeToggle mode={uiTheme} onToggle={() => setUiTheme(m => m === 'dark' ? 'light' : 'dark')} /></div>)}
 <div style={{ padding:'24px', maxWidth:1100, margin:'0 auto' }}>
 {step==='syllabus' && (<SyllabusStep onSelect={id => { setSyllabusId(id); setStep('class') }} />)}
 {step==='class' && (<ClassStep syllabusId={syllabusId} onSelect={id => { setClassId(id); setStep('subject') }} onBack={() => setStep('syllabus')} />)}
 {step==='subject' && (<SubjectStep syllabusId={syllabusId} classId={classId} onSelect={id => { setSubjectId(id); setStep('chapters') }} onBack={() => setStep('class')} />)}
 {step==='chapters' && (<ChapterStep subjectId={subjectId} selectedChapters={selChapters} selectedTopics={selTopics} onChange={(c,t) => { setSelChapters(c); setSelTopics(t) }} onNext={() => setStep('questions')} onBack={() => setStep('subject')} />)}
 {step==='questions' && (<QuestionPanel subjectId={subjectId || 'loaded'} selectedChapters={selChapters} paper={paper} onPaperChange={setPaper} overrideConfig={loadedPaper?.config || null} loadedPaper={loadedPaper || null} uiTheme={uiTheme} onToggleTheme={() => setUiTheme(m => m === 'dark' ? 'light' : 'dark')} onBack={() => {
 if (loadedPaper && onReturnToSource) onReturnToSource();
 else setStep(loadedPaper ? 'syllabus' : 'chapters');
 }} />)}
 </div>
 </div>
 )
}

export default function PTSPaperGenerator(props) {
 // Official first-term papers use the full Paper Studio surface so all templates,
 // spacing, borders, structured MCQs/tables and print settings share one renderer.
 return <PTSPaperGeneratorCore {...props} />
}

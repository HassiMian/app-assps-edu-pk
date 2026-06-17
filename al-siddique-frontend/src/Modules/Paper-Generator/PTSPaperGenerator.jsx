// PTSPaperGenerator.jsx — PTS clone, dark SaaS theme
import { useEffect, useState, useRef } from 'react'
import Portal from '../../components/Portal'
import { SYLLABI, CLASSES, SUBJECTS, CHAPTERS, QUESTIONS } from './data/questionBank'
import { usePaperStore } from './usePaperStore'
import { classLevelLabel, classLevelsMatch, useAcademicStore } from '../../services/useAcademicStore'

// Normalize a store question to the template question format
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
 const { subjects: storeSubjects, questions: storeQs, savePaper, importPaperQuestionsToBank, getFilteredQuestionTypes, questionTypes: allQuestionTypes, paperSettings } = usePaperStore()
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

 const [tmpl, setTmpl] = useState('classic')
 const [printMode, setPrintMode] = useState('a4')
 const [language, setLanguage] = useState(()=> overrideConfig?.language || 'english')
 const [paperCode, setPaperCode] = useState(()=> overrideConfig?.paperCode || String(Math.floor(1000+Math.random()*9000)))
 const [timeAllwd, setTimeAllwd] = useState(()=> overrideConfig?.timeAllowed || '30 minutes')
 const [examDate, setExamDate] = useState(()=> overrideConfig?.examDate || new Date().toLocaleDateString('en-GB').replace(/\//g,'-'))
 const [printBub, setPrintBub] = useState(true)
 const [printAns, setPrintAns] = useState(false)
 const [modalOpen, setModalOpen] = useState(true)

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
 const [letterSp, setLetterSp] = useState(0)
 const [engLineH, setEngLineH] = useState(1.5)
 const [urdLineH, setUrdLineH] = useState(2.0)
 const [showAnsLines, setShowAnsLines] = useState(false)
 const [fontColor, setFontColor] = useState('#1a1a1a')
 const [fontFamily, setFontFamily] = useState('')
 const [baseFontSz, setBaseFontSz] = useState(11)
 const [headFontSz, setHeadFontSz] = useState(11)
 const [qBorderStyle, setQBorderStyle] = useState('none')
 const [pageBorder, setPageBorder] = useState('none')
 const [showUrduHeaders, setShowUrduHeaders] = useState(false)
 const [showSectionLine, setShowSectionLine] = useState(false)
 const [showWatermark, setShowWatermark] = useState(false)
 const [watermarkOpacity, setWatermarkOpacity] = useState(0.08)
 const [watermarkScale, setWatermarkScale] = useState(1.18)

 let subjectName = '', className = ''
 if (isLoaded) {
 subjectName = overrideConfig.subjectName || overrideConfig.subject || ''
 className = overrideConfig.className || overrideConfig.classLevel || ''
 } else if (isStore) {
 subjectName = storeSubjectInfo?.name || ''
 className = storeSubjectInfo?.classLevel || ''
 } else {
 const subj = SUBJECTS.find(s=>s.id===subjectId)
 subjectName = subj?.name || ''
 className = CLASSES.find(c=>c.id===subj?.classId)?.label || ''
 }

 const cfg = { 
    className, 
    subjectName, 
    paperCode, 
    timeAllowed: timeAllwd, 
    examDate, 
    language,
    classLevel: className,
    subject: subjectName
  }
 const TemplateComp = {
 classic: ClassicTemplate,
 academic: AcademicClassicTemplate,
 'docx-assessment': DocxAssessmentTemplate,
 modern: ModernTemplate,
 elite: EliteTemplate,
 emerald: EmeraldTemplate,
 'royal-elite': (props) => <EliteTemplate {...props} fontFamily={props.fontFamily || "'Garamond', 'Georgia', serif"} />,
 'board-blue': (props) => <ModernTemplate {...props} qBorderStyle={props.qBorderStyle === 'none' ? 'table' : props.qBorderStyle} />,
 'compact-classic': (props) => <ClassicTemplate {...props} baseFontSz={Math.max(9, (props.baseFontSz || 11) - 1)} headFontSz={Math.max(9, (props.headFontSz || 11) - 1)} />,
 'serif-gold': (props) => <EliteTemplate {...props} fontFamily={props.fontFamily || "'Book Antiqua', 'Georgia', serif"} />,
 'clean-minimal': (props) => <ModernTemplate {...props} fontFamily={props.fontFamily || "'Calibri', 'Arial', sans-serif"} />,
 'exam-grid': (props) => <AcademicClassicTemplate {...props} qBorderStyle="table" />,
 'scholar-classic': (props) => <ClassicTemplate {...props} fontFamily={props.fontFamily || "'Cambria', 'Times New Roman', serif"} />,
 }[tmpl]
 const half = printMode === 'half'
 const totalQs = questionTypes.reduce((sum, t) => sum + (paper[t.value]?.length || 0), 0)
 const pageBorderMap = { none: 'none', thin: '1px solid #111', thick: '3px solid #111', double: '4px double #111' }
 const pageBorderStyle = pageBorderMap[pageBorder] || 'none'
 const tplProps = { paper, cfg, printBubble:printBub, printAns, half, editMode, letterSp, engLineH, urdLineH, showAnsLines, fontColor, fontFamily, baseFontSz, headFontSz, qBorderStyle, showUrduHeaders, showSectionLine, questionTypes, settings: paperSettings, pbStyle: pageBorderStyle }

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
 const saved = savePaper({ 
       name, 
       config: cfg, 
       ...paper, 
       selectedMCQ: paper.mcq || [],
       selectedShort: paper.short || [],
       selectedLong: paper.long || [],
       selectedQuestions, 
       teacherHidden: overrideConfig?.teacherHidden || false 
     })
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
  alert(`Paper saved! "${name}" (${totalQs} questions)`)
 }

 function doPrint() {
 const canvas = document.getElementById('paper-canvas')
 if (!canvas) return
 const old = document.getElementById('__print_frame')
 if (old) old.remove()
 const iframe = document.createElement('iframe')
 iframe.id = '__print_frame'
 iframe.style.cssText = 'position:fixed;top:0;left:-9999px;width:210mm;height:297mm;border:0;background:white'
 document.body.appendChild(iframe)
 const doc = iframe.contentDocument || iframe.contentWindow.document
 doc.open()
 const wmCss = (showWatermark && paperSettings?.logo && watermarkOpacity > 0) ? `body::before { content: ""; position: fixed; top: 52%; left: 50%; transform: translate(-50%, -50%); width: ${145 * watermarkScale}mm; height: ${145 * watermarkScale}mm; background-image: url('${paperSettings.logo}'); background-repeat: no-repeat; background-position: center; background-size: contain; opacity: ${watermarkOpacity}; z-index: 0; pointer-events: none; } body > * { position: relative; z-index: 1; } .preview-wm { display: none !important; }` : ''
 doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet"><style>*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0;background:white}@page{size:A4 portrait;margin:4mm}body{display:flex;flex-direction:column;align-items:center;width:100%}[contenteditable]{outline:none!important;border:none!important;background:transparent!important}table{border-collapse:collapse}[data-edit-guide]{border:none!important}hr{display:block}.preview-container{min-height:auto!important;box-shadow:none!important;margin:0!important;width:100%!important}${wmCss}</style></head><body>${canvas.innerHTML}</body></html>`)
 doc.close()
 setTimeout(() => {
 try { iframe.contentWindow.focus(); iframe.contentWindow.print() } catch(e) { console.error('iframe print failed:', e) }
 setTimeout(() => { if (document.body.contains(iframe)) iframe.remove() }, 3000)
 }, 1200)
 }

 const tinp = { background:'rgba(11,44,77,0.6)', border:`1px solid ${D.border}`, borderRadius:8, color:D.silver, padding:'7px 10px', fontSize:12, outline:'none', boxSizing:'border-box', border: pageBorderStyle }
 const filterInp = { background:'rgba(11,44,77,0.6)', border:`1px solid ${D.border}`, borderRadius:8, color:D.silver, padding:'7px 10px', fontSize:13, outline:'none', boxSizing:'border-box', border: pageBorderStyle }
 const filterSel = { ...filterInp, cursor:'pointer' }

 return (
 <div className="pts-generator-surface" style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', position:'relative', ...themeVars(uiTheme) }}>
 <style>{`.pts-generator-surface select option, .pts-generator-surface select optgroup { background: var(--pg-option-bg, #0a1e35); color: var(--pg-option-text, #e6eef8); }`}</style>
 <div style={{ background:'var(--pg-toolbar, rgba(7,25,48,0.97))', backdropFilter:blur, borderBottom:`1px solid ${D.border}`, padding:'12px 20px', flexShrink:0 }}>
 <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
 {TEMPLATES.map(t=>(<button key={t.id} onClick={()=>setTmpl(t.id)} style={{ padding:'9px 18px', borderRadius:10, border:'none', cursor:'pointer', fontWeight: 600, fontSize:13, transition:'all .15s', background: tmpl===t.id ? `linear-gradient(135deg,${D.gold},${D.goldL})` : 'rgba(11,44,77,0.92)', color: tmpl===t.id ? '#071e34' : D.muted, boxShadow: tmpl===t.id ? `0 4px 14px rgba(200,153,26,0.3)` : 'none', }}>{t.label}</button>))}
 <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
 <ThemeToggle mode={uiTheme} onToggle={onToggleTheme} />
 {PRINT_MODES.map(m=>(<button key={m.id} onClick={()=>setPrintMode(m.id)} style={{ padding:'8px 16px', borderRadius:9, border:`1px solid ${D.border}`, cursor:'pointer', fontWeight:600, fontSize:12, transition:'all .15s', background: printMode===m.id ? `rgba(48,209,88,0.15)` : 'rgba(15,23,42,0.46)', color: printMode===m.id ? D.green : D.muted, borderColor: printMode===m.id ? `rgba(48,209,88,0.4)` : D.border, }}>{printMode===m.id?' ':' '}{m.label}</button>))}
 </div>
 </div>
 <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
 {[['Paper Code', paperCode, setPaperCode, 70, 'text'], ['Time Allowed', timeAllwd, setTimeAllwd, 110, 'text'], ['Exam Date', examDate, setExamDate, 110, 'text']].map(([lbl, val, set, w, type])=>(
 <div key={lbl} style={{ display:'flex', gap:6, alignItems:'center' }}>
 <span style={{ fontSize:12, color:D.muted, fontWeight:600 }}>{lbl}</span>
 <input type={type} value={val} onChange={e=>set(e.target.value)} style={{ ...tinp, width:w }} />
 </div>
 ))}
 <div style={{ display:'flex', gap:6, alignItems:'center' }}>
 <span style={{ fontSize:12, color:D.muted, fontWeight:600 }}>Language</span>
 <select value={language} onChange={e=>setLanguage(e.target.value)} style={{ ...tinp, cursor:'pointer', width:120 }}><option value="english">English</option><option value="urdu">Urdu (اردو)</option><option value="dual">Dual Medium</option></select>
 </div>
 <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12, color:D.silver }}><input type="checkbox" checked={printBub} onChange={e=>setPrintBub(e.target.checked)} style={{ accentColor:D.gold }} />Bubble Sheet</label>
 <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12, color:D.silver }}><input type="checkbox" checked={printAns} onChange={e=>setPrintAns(e.target.checked)} style={{ accentColor:D.gold }} />Answer Keys</label>
 <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12, color:D.silver }}><input type="checkbox" checked={showAnsLines} onChange={e=>setShowAnsLines(e.target.checked)} style={{ accentColor:D.gold }} />Ans Lines</label>
 <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
 <DBtn color="ghost" onClick={onBack} style={{ padding:'8px 14px', fontSize:12 }}>← Back</DBtn>
 <button onClick={()=>setModalOpen(true)} style={{ background:`linear-gradient(135deg,#0A84FF,#0055cc)`, color:'white', border:'none', borderRadius:10, padding:'8px 18px', fontWeight: 600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7, }}> Question Menu {totalQs > 0 && (<span style={{ background:'rgba(255,255,255,0.25)', borderRadius:9, padding:'1px 8px', fontSize:11, fontWeight: 600 }}>{totalQs}</span>)}</button>
 <DBtn color="green" onClick={doSave} disabled={!totalQs} style={{ padding:'8px 16px', fontSize:13 }}> Save</DBtn>
 <GoldBtn onClick={doPrint} style={{ padding:'8px 20px', fontSize:13 }}> Print</GoldBtn>
 </div>
 </div>
 <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'center', marginTop:10, paddingTop:10, borderTop:`1px solid ${D.border}` }}>
 <button onClick={()=>setEditMode(p=>!p)} style={{ padding:'6px 14px', borderRadius:9, border:`1px solid ${D.border}`, cursor:'pointer', fontWeight: 600, fontSize:12, background: editMode ? `linear-gradient(135deg,${D.gold},${D.goldL})` : 'rgba(11,44,77,0.92)', color: editMode ? '#071e34' : D.silver, }}>{editMode ? ' Done Edit' : ' Manual Edit'}</button>
 <div style={{ display:'flex', gap:5, alignItems:'center' }}>
 <span style={{ fontSize:11, color:D.muted, fontWeight:600 }}>Letter Sp</span>
 <input type="range" min={0} max={3} step={0.5} value={letterSp} onChange={e=>setLetterSp(Number(e.target.value))} style={{ width:70, accentColor:D.gold }} />
 <span style={{ fontSize:11, color:D.gold, minWidth:22 }}>{letterSp}px</span>
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
 </select>
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
 </div>
 <div id="paper-canvas" style={{ flex:1, overflowY:'auto', background:'var(--pg-canvas, #1e2a3a)', padding:'24px', display:'flex', flexDirection:'column', alignItems:'center', gap: half ? 8 : 0 }}>
 {totalQs === 0 ? (
 <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:60 }}>
 <div style={{ fontSize:72, marginBottom:16, opacity:0.4 }}></div>
 <div style={{ fontSize:22, fontWeight:700, color:D.silver, marginBottom:10 }}>Paper Preview</div>
 <div style={{ fontSize:14, color:D.muted, maxWidth:380, lineHeight:1.7 }}>Click <strong style={{color:'#4da6ff'}}>Question Menu</strong> to add questions.<br/>Your paper will appear here live as you add them.</div>
 <button onClick={()=>setModalOpen(true)} style={{ marginTop:28, background:`linear-gradient(135deg,#0A84FF,#0055cc)`, color:'white', border:'none', borderRadius:12, padding:'13px 34px', fontWeight: 600, fontSize:16, cursor:'pointer', boxShadow:'0 6px 20px rgba(10,132,255,0.35)', }}> Open Question Menu</button>
 </div>
 ) : half ? (
 <>
 <div className="preview-container" style={{ width:794, minHeight:1123, flexShrink:0, background:'white', boxShadow:'0 4px 20px rgba(0,0,0,0.35)', overflowX:'hidden', position: 'relative' }}><PreviewWatermark logo={paperSettings?.logo} show={showWatermark} opacity={watermarkOpacity} scale={watermarkScale} /><TemplateComp {...tplProps} half={true} /></div>
 <div className="preview-container" style={{ width:794, minHeight:1123, flexShrink:0, background:'white', boxShadow:'0 4px 20px rgba(0,0,0,0.35)', overflowX:'hidden', position: 'relative' }}><PreviewWatermark logo={paperSettings?.logo} show={showWatermark} opacity={watermarkOpacity} scale={watermarkScale} /><TemplateComp {...tplProps} half={true} /></div>
 </>
 ) : (
 <div className="preview-container" style={{ width:794, minHeight:1123, flexShrink:0, background:'white', boxShadow:'0 4px 24px rgba(0,0,0,0.4)', overflowX:'hidden', position: 'relative' }}><PreviewWatermark logo={paperSettings?.logo} show={showWatermark} opacity={watermarkOpacity} scale={watermarkScale} /><TemplateComp {...tplProps} half={false} /></div>
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

//  Shared Section Renderer 
function SectionRenderer({ type, paper, isUrdu, isDual, editMode, editStyle, fs, qFs, qFsSm, qFsHead, qBorderStyle, urdLineH, engLineH, letterSp, printAns, showAnsLines, qn, half, themeColor='#1a237e', urduHeader='' }) {
 const qs = paper[type.value] || []
 if (qs.length === 0) return null
 const marks = paper[`${type.value}_marks`] || type.marks || 1
 const isMcq = type.value === 'mcq'
 
 function getT(item) {
 const e = item.en || item.text || ''
 const u = item.ur || item.textUrdu || item.text || ''
 return isUrdu ? (u||e) : (isDual && e && u ? e + ' / ' + u : (e||u))
 }
 
 return (
 <div key={type.value} style={{ marginBottom:`${10*fs}px` }}>
 {urduHeader && <div style={{ textAlign:'center', fontFamily:'Noto Nastaliq Urdu,serif', fontSize:`${14*fs}px`, fontWeight:800, color:'#1a237e', marginBottom:`${5*fs}px`, direction:'rtl' }}>{urduHeader}</div>}
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:`${6*fs}px`, paddingBottom:`${4*fs}px`, borderBottom:`2.1px solid ${themeColor}`, direction: isUrdu ? 'rtl' : 'ltr' }}>
 {isUrdu ? (
 <>
 <span style={{ fontWeight:700, fontSize:`${12*fs}px`, fontFamily:'Noto Nastaliq Urdu,serif' }}>سوال نمبر {qn}. {type.labelUrdu}</span>
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
 <td style={{ border:`1px solid ${themeColor}88`, padding:`${3*fs}px ${5*fs}px`, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left', fontFamily:isUrdu?'Noto Nastaliq Urdu,serif':'inherit', lineHeight:isUrdu?urdLineH:engLineH }}>
 <span contentEditable={editMode} suppressContentEditableWarning style={editStyle}>{getT(q)}</span>
 </td>
 {q.options?.map((opt, optIndex)=>(
 <td key={opt.key || opt.label || `${type.value}-opt-${i}-${optIndex}`} style={{ border:`1px solid ${themeColor}88`, padding:`${3*fs}px`, textAlign:'center', fontSize:`${qFsSm}px` }}>
 <span contentEditable={editMode} suppressContentEditableWarning style={editStyle}>{getT(opt)}</span>
 {printAns&&opt.correct&&<span style={{color:'#c00',fontWeight:700}}> </span>}
 </td>
 ))}
 </tr>
 ))}</tbody>
 </table>
 ) : (
 qs.map((q,i)=>(
 <div key={q.id || `${type.value}-card-${i}`} style={{ marginBottom:`${8*fs}px`, ...(qBorderStyle==='box'?{border:`1px solid ${themeColor}44`,borderRadius:`${3*fs}px`,padding:`${6*fs}px ${8*fs}px`}:{}) }}>
 <div style={{ fontWeight:700, fontSize:`${qFs}px`, marginBottom:`${3*fs}px`, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left', fontFamily:isUrdu?'Noto Nastaliq Urdu,serif':'inherit', lineHeight:isUrdu?urdLineH:engLineH, letterSpacing:`${letterSp}px` }}>
 <span style={{ color:themeColor }}>{i+1}.</span>{' '}<span contentEditable={editMode} suppressContentEditableWarning style={editStyle}>{getT(q)}</span>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:`repeat(${half?2:4},1fr)`, gap:`${2*fs}px`, paddingLeft:isUrdu?0:`${14*fs}px`, paddingRight:isUrdu?`${14*fs}px`:0 }}>
 {q.options?.map((opt, optIndex)=>(
 <div key={opt.key || opt.label || `${type.value}-choice-${i}-${optIndex}`} style={{ fontSize:`${qFsSm}px`, direction:isUrdu?'rtl':'ltr', fontFamily:isUrdu?'Noto Nastaliq Urdu,serif':'inherit', lineHeight:isUrdu?urdLineH:engLineH, letterSpacing:`${letterSp}px` }}>
 <strong style={{color:themeColor}}>({opt.key || opt.label || String.fromCharCode(65 + optIndex)})</strong>{' '}
 <span contentEditable={editMode} suppressContentEditableWarning style={editStyle}>{getT(opt)}</span>
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
 <td style={{ border:`1px solid ${themeColor}88`, padding:`${5*fs}px`, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left', fontFamily:isUrdu?'Noto Nastaliq Urdu,serif':'inherit', lineHeight:isUrdu?urdLineH:engLineH, minHeight:`${20*fs}px` }}>
 <span contentEditable={editMode} suppressContentEditableWarning style={editStyle}>{getT(q)}</span>
 </td>
 </tr>
 ))}</tbody>
 </table>
 ) : (
 <div style={{ display: (type.value==='short'||type.value.includes('short')) ? 'grid' : 'block', gridTemplateColumns: (type.value==='short'||type.value.includes('short')) ? '1fr 1fr' : 'none', gap:`${4*fs}px ${14*fs}px` }}>
 {qs.map((q,i)=>(
 <div key={q.id || `${type.value}-item-${i}`} style={{ fontSize:`${qFs}px`, marginBottom: (type.value==='short'||type.value.includes('short')) ? 0 : `${12*fs}px`, ...(qBorderStyle==='box'?{border:`1px solid ${themeColor}44`,borderRadius:`${3*fs}px`,padding: (type.value==='short'||type.value.includes('short')) ? `${5*fs}px ${7*fs}px` : `${6*fs}px ${8*fs}px`}:{}) }}>
 <div style={{ fontWeight: (type.value==='short'||type.value.includes('short')) ? 600 : 700, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left', fontFamily:isUrdu?'Noto Nastaliq Urdu,serif':'inherit', lineHeight:isUrdu?urdLineH:engLineH, letterSpacing:`${letterSp}px` }}>
 <span style={{ color:themeColor, fontWeight: 600 }}>{i+1}.</span>{' '}<span contentEditable={editMode} suppressContentEditableWarning style={editStyle}>{getT(q)}</span>
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
 style={{ width: size, height: size, objectFit: 'contain', display: 'block', margin: '0 auto', background: '#fff', borderRadius: '50%', padding: '2px' }}
 alt="logo"
 />
 )
 }
 return (<div style={{ width:size, height:size, borderRadius:'50%', background:'#1a237e', display:'grid', placeItems:'center', color:'white', fontWeight:900, fontSize:size*0.45 }}>AS</div>)
}

function editablePaperProps(edit) { return edit ? { 'data-manual-edit': 'true' } : {} }

function paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp }) {
 return { lineHeight: isUrdu ? urdLineH : engLineH, letterSpacing: `${letterSp}px` }
}

//  Template 1: AS Classic (exact PDF replica) 
function ClassicTemplate({ paper, cfg, printBubble, printAns, half, editMode=false, letterSp=0, engLineH=1.5, urdLineH=2.0, showAnsLines=false, fontColor='#1a1a1a', fontFamily='', baseFontSz=11, headFontSz=11, qBorderStyle='none', showUrduHeaders=false, showSectionLine=false, questionTypes=[], settings, pbStyle }) {
 const total = questionTypes.reduce((sum, t) => sum + (paper[t.value]?.length || 0) * (paper[`${t.value}_marks`] || t.marks || 1), 0)
 const isUrdu = cfg.language === 'urdu'
 const isDual = cfg.language === 'dual'
 const editStyle = editMode ? { outline:'1.5px dashed #cc0000', borderRadius:2, minWidth:20, display:'inline-block' } : {}
 const fs = (half ? 0.82 : 1) * (baseFontSz / 11)
 const hFs = (half ? 0.82 : 1) * (headFontSz / 11)
  const qFs = 11 * fs
 const qFsSm = Math.max(7, 10 * fs)
 const qFsHead = 12 * fs
 const wrap = { width:'100%', background:'white', color: fontColor, fontFamily: fontFamily || 'Arial, sans-serif', fontSize: `${baseFontSz*fs}px`, direction: isUrdu ? 'rtl' : 'ltr', padding: half ? '3mm 3mm' : '4mm 6mm', boxSizing:'border-box', border: pbStyle, minHeight:half?'':'297mm', ...paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp }) }
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
 return (<SectionRenderer key={type.value} type={type} paper={paper} isUrdu={isUrdu} isDual={isDual} editMode={editMode} editStyle={editStyle} fs={fs} qFs={qFs} qFsSm={qFsSm} qFsHead={qFsHead} qBorderStyle={qBorderStyle} urdLineH={urdLineH} engLineH={engLineH} letterSp={letterSp} printAns={printAns} showAnsLines={showAnsLines} qn={qn} half={half} urduHeader={showUrduHeaders ? (type.value==='mcq'?'حصہ معروضی':'حصہ انشائیہ') : ''} />)
 })}
 </div>
 </div>
 </div>
 )
}

//  Template 2: Modern Pro 
function ModernTemplate({ paper, cfg, printBubble, printAns, half, editMode=false, letterSp=0, engLineH=1.5, urdLineH=2.0, showAnsLines=false, fontColor='#1a1a1a', fontFamily='', baseFontSz=11, headFontSz=11, qBorderStyle='none', showUrduHeaders=false, showSectionLine=false, questionTypes=[], settings, pbStyle }) {
 const total = questionTypes.reduce((sum, t) => sum + (paper[t.value]?.length || 0) * (paper[`${t.value}_marks`] || t.marks || 1), 0)
 const isUrdu = cfg.language === 'urdu'
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
 <div {...editablePaperProps(editMode)} style={{ width:'100%', background:'white', color: fontColor, fontFamily: fontFamily || 'Arial, sans-serif', fontSize:`${baseFontSz*fs}px`, direction:isUrdu?'rtl':'ltr', padding:half?'3mm 3mm':'4mm 6mm', boxSizing:'border-box', border: pbStyle, minHeight:half?'':'297mm', ...paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp }) }}>
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
 return (<SectionRenderer key={type.value} type={type} paper={paper} isUrdu={isUrdu} isDual={isDual} editMode={editMode} editStyle={editStyle} fs={fs} qFs={qFs} qFsSm={qFsSm} qFsHead={qFsHead} qBorderStyle={qBorderStyle} urdLineH={urdLineH} engLineH={engLineH} letterSp={letterSp} printAns={printAns} showAnsLines={showAnsLines} qn={qn} half={half} themeColor={themeColor} urduHeader={showUrduHeaders ? (type.value==='mcq'?'حصہ معروضی':'حصہ انشائیہ') : ''} />)
 })}
 </div>
 </div>
 </div>
 )
}

//  Template 3: Elite Premium 
function EliteTemplate({ paper, cfg, printBubble, printAns, half, editMode=false, letterSp=0, engLineH=1.5, urdLineH=2.0, showAnsLines=false, fontColor='#1a1a1a', fontFamily='', baseFontSz=11, headFontSz=11, qBorderStyle='none', showUrduHeaders=false, showSectionLine=false, questionTypes=[], settings, pbStyle }) {
 const total = questionTypes.reduce((sum, t) => sum + (paper[t.value]?.length || 0) * (paper[`${t.value}_marks`] || t.marks || 1), 0)
 const isUrdu = cfg.language === 'urdu'
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
 <div {...editablePaperProps(editMode)} style={{ width:'100%', background:'#fffef8', color: fontColor, fontFamily: fontFamily || "'Georgia', Times, serif", fontSize:`${baseFontSz*fs}px`, direction:isUrdu?'rtl':'ltr', padding:half?'3mm 3mm':'4mm 6mm', boxSizing:'border-box', border: pbStyle, minHeight:half?'':'297mm', ...paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp }) }}>
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
 return (<SectionRenderer key={type.value} type={type} paper={paper} isUrdu={isUrdu} isDual={isDual} editMode={editMode} editStyle={editStyle} fs={fs} qFs={qFs} qFsSm={qFsSm} qFsHead={qFsHead} qBorderStyle={qBorderStyle} urdLineH={urdLineH} engLineH={engLineH} letterSp={letterSp} printAns={printAns} showAnsLines={showAnsLines} qn={qn} half={half} themeColor={gold} urduHeader={showUrduHeaders ? (type.value==='mcq'?'حصہ معروضی':'حصہ انشائیہ') : ''} />)
 })}
 </div>
 </div>
 </div>
 )
}

//  Template 4: Emerald Green 
function EmeraldTemplate({ paper, cfg, printBubble, printAns, half, editMode=false, letterSp=0, engLineH=1.5, urdLineH=2.0, showAnsLines=false, fontColor='#1a1a1a', fontFamily='', baseFontSz=11, headFontSz=11, qBorderStyle='none', showUrduHeaders=false, showSectionLine=false, questionTypes=[], settings, pbStyle }) {
 const total = questionTypes.reduce((sum, t) => sum + (paper[t.value]?.length || 0) * (paper[`${t.value}_marks`] || t.marks || 1), 0)
 const isUrdu = cfg.language === 'urdu'
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
 <div {...editablePaperProps(editMode)} style={{ width:'100%', background:'#f9fffe', color: fontColor, fontFamily: fontFamily || 'Arial, sans-serif', fontSize:`${baseFontSz*fs}px`, direction:isUrdu?'rtl':'ltr', padding:half?'3mm 3mm':'4mm 6mm', boxSizing:'border-box', border: pbStyle, minHeight:half?'':'297mm', ...paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp }) }}>
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
 return (<SectionRenderer key={type.value} type={type} paper={paper} isUrdu={isUrdu} isDual={isDual} editMode={editMode} editStyle={editStyle} fs={fs} qFs={qFs} qFsSm={qFsSm} qFsHead={qFsHead} qBorderStyle={qBorderStyle} urdLineH={urdLineH} engLineH={engLineH} letterSp={letterSp} printAns={printAns} showAnsLines={showAnsLines} qn={qn} half={half} themeColor={teal} urduHeader={showUrduHeaders ? (type.value==='mcq'?'حصہ معروضی':'حصہ انشائیہ') : ''} />)
 })}
 </div>
 </div>
 </div>
 )
}

function AcademicClassicTemplate(props) {
 return <ClassicTemplate {...props} qBorderStyle={props.qBorderStyle === 'none' ? 'table' : props.qBorderStyle} fontFamily={props.fontFamily || "'Times New Roman', serif"} fontColor={props.fontColor || '#111827'} />
}

//  Template 5: Docx Assessment 
function DocxAssessmentTemplate({ paper, cfg, printBubble, printAns, half, editMode=false, letterSp=0, engLineH=1.5, urdLineH=2.0, showAnsLines=false, fontColor='#1a1a1a', fontFamily='', baseFontSz=11, headFontSz=11, qBorderStyle='none', showUrduHeaders=false, showSectionLine=false, questionTypes=[] , pbStyle }) {
 const total = questionTypes.reduce((sum, t) => sum + (paper[t.value]?.length || 0) * (paper[`${t.value}_marks`] || t.marks || 1), 0)
 const isUrdu = cfg.language === 'urdu'
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
 <div {...editablePaperProps(editMode)} style={{ width:'100%', background:'white', color: fontColor, fontFamily: fontFamily || "'Times New Roman', Times, serif", fontSize:`${baseFontSz*fs}px`, direction:isUrdu?'rtl':'ltr', padding:half?'8mm 6mm':'12mm 15mm', boxSizing:'border-box', border: pbStyle, minHeight:half?'':'297mm', ...paperTextFlow({ isUrdu, engLineH, urdLineH, letterSp }) }}>
 <div style={{ borderBottom:'2px solid #000', paddingBottom:5, marginBottom:15 }}><div style={{ fontSize:`${(half?18:24)*fs}px`, fontWeight:700, textAlign:'center' }}>ASSESSMENT PAPER</div><div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontWeight:700, fontSize:`${11*fs}px` }}><span>Subject: {cfg.subjectName}</span><span>Class: {cfg.className}</span><span>Marks: {total}</span></div></div>
 <div style={{ marginBottom:15, display:'flex', justifyContent:'space-between', fontSize:`${10*fs}px` }}><span>Student Name: __________________________</span><span>Date: {cfg.examDate}</span></div>
 {questionTypes.map((type, idx) => {
 const qs = paper[type.value] || []
 if (qs.length === 0) return null
 qn++
 return (<SectionRenderer key={type.value} type={type} paper={paper} isUrdu={isUrdu} isDual={isDual} editMode={editMode} editStyle={editStyle} fs={fs} qFs={qFs} qFsSm={qFsSm} qFsHead={qFsHead} qBorderStyle={qBorderStyle} urdLineH={urdLineH} engLineH={engLineH} letterSp={letterSp} printAns={printAns} showAnsLines={showAnsLines} qn={qn} half={half} themeColor="#000" urduHeader={showUrduHeaders ? (type.value==='mcq'?'حصہ معروضی':'حصہ انشائیہ') : ''} />)
 })}
 </div>
 )
}

const TEMPLATES = [
 { id:'docx-assessment', label:'DOCX Assessment', desc:'Exact clone of supplied Word paper format' },
 { id:'academic', label:'Academic Classic', desc:'Formal table-first paper layout' },
 { id:'classic', label:' AS Classic', desc:'Red dashed border, exact PDF replica' },
 { id:'modern', label:' Modern Pro', desc:'Gradient header, colored sections' },
 { id:'elite', label:' Elite Premium', desc:'Dark header, gold accents, Georgia serif' },
 { id:'emerald', label:' Emerald', desc:'Teal green header, fresh clean layout' },
 { id:'royal-elite', label:' Royal Elite', desc:'Elite layout with formal serif styling' },
 { id:'board-blue', label:' Board Blue', desc:'Structured table-heavy blue exam style' },
 { id:'compact-classic', label:' Compact Classic', desc:'Dense classic layout for tight papers' },
 { id:'serif-gold', label:' Serif Gold', desc:'Gold-accent paper with Book Antiqua feel' },
 { id:'clean-minimal', label:' Clean Minimal', desc:'Modern clean sheet with minimal structure' },
 { id:'exam-grid', label:' Exam Grid', desc:'Academic table-first grid layout' },
 { id:'scholar-classic', label:' Scholar Classic', desc:'Cambria-based classic exam surface' },
]
const PRINT_MODES = [
 { id:'a4', label:'Single A4', desc:'Full A4 paper (210mm × 297mm)' },
 { id:'half', label:'2 per A4', desc:'Two half-A4 papers stacked on one sheet' },
]

//  Main Component 
export default function PTSPaperGenerator({ loadedPaper, onReturnToSource = null }) {
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

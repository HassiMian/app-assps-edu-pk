// HandwrittenScannerTab.jsx — backend-managed AI scan flow
// Subjects / Class / Publisher are pulled from the Question Bank store
import { useState, useMemo, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { usePaperStore } from './usePaperStore'
import { classLevelLabel, classLevelsMatch, normalizeClassLevel, sortClassLevels, useAcademicStore } from '../../services/useAcademicStore'
import { scanHandwrittenPaper, MODEL_OPTIONS, DEFAULT_MODEL, getAiConfig, testAiConnection } from './geminiService'
import PaperAiJobsPanel from './PaperAiJobsPanel'

const C = {
 card:'rgba(11,44,77,0.92)', gold:'#C8991A', goldL:'#e8b420',
 silver:'#C0C8D8', muted:'#8892A4', green:'#30D158',
 red:'#FF375F', blue:'#0A84FF', purple:'#BF5AF2',
 border:'rgba(148,163,184,0.18)',
}
const EXAM_TYPES = ['Mid Term','Final Term','Monthly Test','Weekly Test','Unit Test','Assessment','Annual']

const normalize = (q, marks) => ({
 ...q,
 id: q.id || `q_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
 en: q.text || '', ur: q.textUrdu || q.text || '',
 marks: q.marks || marks, chapter: q.chapter || '',
 options: (q.options||[]).map(o=>({...o, en:o.text||'', ur:o.textUrdu||o.text||''}))
})

function Inp({ label, style={}, ...p }) {
 return (
 <div>
 {label && <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:5}}>{label}</div>}
 <input {...p} style={{width:'100%',background:'rgba(11,44,77,0.7)',border:`1px solid ${C.border}`,borderRadius:10,color:C.silver,padding:'9px 12px',fontSize:13,outline:'none',boxSizing:'border-box',...style}} />
 </div>
 )
}

function Sel({ label, children, ...p }) {
 return (
 <div>
 {label && <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:5}}>{label}</div>}
 <select {...p} style={{width:'100%',background:'rgba(11,44,77,0.7)',border:`1px solid ${C.border}`,borderRadius:10,color:C.silver,padding:'9px 12px',fontSize:13,outline:'none',cursor:'pointer',boxSizing:'border-box',WebkitAppearance:'none',MozAppearance:'none',appearance:'none'}}>
 {children}
 </select>
 </div>
 )
}

const Portal = ({children}) => ReactDOM.createPortal(children, document.body)

//  Publisher input with QB suggestions datalist 
function PublisherInput({ value, onChange, suggestions = [] }) {
 return (
 <div>
 <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:5}}>Publisher</div>
 <input
 list="qb-publishers"
 value={value}
 onChange={onChange}
 placeholder="e.g. Punjab Text Book Board"
 style={{
 width:'100%', background:'rgba(11,44,77,0.7)',
 border:`1px solid ${value ? C.gold+'88' : C.border}`,
 borderRadius:10, color:C.silver, padding:'9px 12px',
 fontSize:13, outline:'none', boxSizing:'border-box',
 }}
 />
 <datalist id="qb-publishers">
 {suggestions.map(p => <option key={p} value={p} />)}
 </datalist>
 <div style={{fontSize:10,color:C.muted,marginTop:4}}>
  Type manually — suggestions from your Question Bank
 </div>
 </div>
 )
}

export default function HandwrittenScannerTab({ onProceedToPreview }) {
 const store = usePaperStore()
 const { paperSettings, updatePaperSettings, addQuestion: storeAddQ } = store
 const { activeClasses, subjectsForClass } = useAcademicStore()

 //  Config state 
 const [classLevel, setClassLevel] = useState('')
 const [subjectId, setSubjectId] = useState('') // QB subject id
 const [subjectName, setSubjectName] = useState('')
 const [publisher, setPublisher] = useState('')
 const [examType, setExamType] = useState('Assessment')
 const [chapterNumber, setChapterNumber] = useState('')
 const [chapterName, setChapterName] = useState('')

 //  Scan state 
 const [images, setImages] = useState([])
 const [scanning, setScanning] = useState(false)
 const [progressMsg, setProgressMsg] = useState('')
 const [aiError, setAiError] = useState('')
 const [scannedData, setScannedData] = useState(null)
 const [savedToBank, setSavedToBank] = useState(false)

 //  Unique publishers from QB subjects 
 const qbPublishers = useMemo(() => [
 ...new Set(store.subjects.map(s => s.publisher).filter(Boolean))
 ], [store.subjects])

 //  AI config state 
 const [showApiKey, setShowApiKey] = useState(false)
 const [modelInput, setModelInput] = useState(paperSettings.geminiModel || DEFAULT_MODEL)
 const [aiConfig, setAiConfig] = useState(null)
 const [testingAi, setTestingAi] = useState(false)
 const fileRef = useRef(null)

 useEffect(() => {
 getAiConfig().then(setAiConfig).catch(() => setAiConfig(null))
 }, [])

 //  Derived: subjects from Question Bank filtered by class 
 const qbSubjects = store.subjects // all QB subjects

 // Classes that actually have subjects in the QB
 const classesWithSubjects = useMemo(() => {
 const levels = [...new Set(qbSubjects.map(s => normalizeClassLevel(s.classLevel)).filter(Boolean))]
 return sortClassLevels(levels)
 }, [qbSubjects])

 // All classes for dropdown: merge academic classes with QB classes so AI tools never lose a configured class.
 const allClassOptions = useMemo(() => {
 const seen = new Set()
 const merged = []
 activeClasses.forEach(c => {
 const lvl = normalizeClassLevel(c.level)
 if (!lvl || seen.has(lvl)) return
 seen.add(lvl)
 merged.push({ value: lvl, label: c.name || classLevelLabel(lvl) })
 })
 classesWithSubjects.forEach(lvl => {
 if (seen.has(lvl)) return
 const ac = activeClasses.find(c => classLevelsMatch(c.level, lvl))
 seen.add(lvl)
 merged.push({ value: lvl, label: ac ? ac.name : classLevelLabel(lvl) })
 })
 return merged.length > 0
 ? merged
 : ['1','2','3','4','5','6','7','8','9','10'].map(n => ({ value:n, label:`Class ${n}` }))
 }, [classesWithSubjects, activeClasses])

 const academicSubjectOptions = useMemo(() => {
 if (!classLevel) return []
 return subjectsForClass(classLevel)
 .map(name => String(name || '').trim())
 .filter(Boolean)
 .map(name => ({ id: `academic:${normalizeClassLevel(classLevel)}:${name.toLowerCase()}`, name, classLevel, publisher: '', isAcademicOnly: true }))
 }, [subjectsForClass, classLevel])

 // Subjects filtered by selected class; QB and academic configured subjects are merged.
 const filteredSubjects = useMemo(() => {
 const fromBank = !classLevel ? qbSubjects : qbSubjects.filter(s => !s.classLevel || classLevelsMatch(s.classLevel, classLevel))
 const seen = new Set(fromBank.map(s => `${String(s.name || '').trim().toLowerCase()}|${normalizeClassLevel(s.classLevel || classLevel)}`))
 const merged = [...fromBank]
 academicSubjectOptions.forEach(s => {
 const key = `${String(s.name || '').trim().toLowerCase()}|${normalizeClassLevel(s.classLevel || classLevel)}`
 if (!seen.has(key)) merged.push(s)
 })
 return merged
 }, [qbSubjects, classLevel, academicSubjectOptions])

 // Selected QB subject object
 const selectedSubject = useMemo(() =>
 filteredSubjects.find(s => s.id === subjectId) || null,
 [filteredSubjects, subjectId]
 )
 const resolvedSubjectName = useMemo(() => {
 const typed = subjectName.trim()
 return selectedSubject?.name || typed || ''
 }, [selectedSubject, subjectName])
 const resolvedSubjectMeta = useMemo(() => ({
 name: resolvedSubjectName,
 classLevel,
 publisher,
 }), [resolvedSubjectName, classLevel, publisher])

 // When class changes, reset subject if it no longer matches
 useEffect(() => {
 if (subjectId && selectedSubject && classLevel && !classLevelsMatch(selectedSubject.classLevel, classLevel)) {
 setSubjectId('')
 }
 setSubjectName('')
 }, [classLevel])

 // When subject changes, pre-fill publisher only if field is empty
 useEffect(() => {
 if (selectedSubject?.publisher && !publisher) {
 setPublisher(selectedSubject.publisher)
 }
 }, [subjectId])

 //  Image management 
 const addImages = (files) => {
 const imgs = Array.from(files).filter(f => f.type.startsWith('image/'))
 setImages(prev => [...prev, ...imgs.map((f,i) => ({ file:f, id:`img_${Date.now()}_${i}`, name:f.name }))])
 }
 const removeImage = (id) => setImages(p => p.filter(x => x.id !== id))
 const moveImage = (id, dir) => {
 setImages(prev => {
 const idx = prev.findIndex(x => x.id === id)
 if (idx < 0) return prev
 const n = [...prev]; const to = idx + dir
 if (to < 0 || to >= n.length) return prev
 ;[n[idx], n[to]] = [n[to], n[idx]]; return n
 })
 }

 //  Scan 
 const handleScan = async () => {
 if (!images.length) return
 setSavedToBank(false)
 setScanning(true); setAiError(''); setProgressMsg('Starting AI scan...')
 try {
 const subjectName = resolvedSubjectName || ''
 const result = await scanHandwrittenPaper(
 { classLevel, subject: subjectName, publisher, examType, chapterNumber, chapterName },
 images.map(i => i.file),
 (msg) => setProgressMsg(msg),
 paperSettings.geminiModel || DEFAULT_MODEL
 )
 setScannedData({
 selectedMCQ: (result.mcq || []).map(q => normalize(q, 1)),
 selectedShort: (result.short || []).map(q => normalize(q, 2)),
 selectedLong: (result.long || []).map(q => normalize(q, 5)),
 fromScan: true,
 })
 } catch (e) {
 setAiError(e.message || 'Scan failed. Please try again.')
 }
 setScanning(false)
 }

 //  Save to Question Bank 
 const handleSaveToBank = () => {
 if (!scannedData || !resolvedSubjectName) return
 const chapterVal = chapterName.trim() ? (chapterNumber.trim() ? `Chapter ${chapterNumber.trim()}: ${chapterName.trim()}` : chapterName.trim()) : (chapterNumber.trim() ? `Chapter ${chapterNumber.trim()}` : '')
 const result = store.importPaperQuestionsToBank({
 subjectId: selectedSubject?.isAcademicOnly ? '' : subjectId,
 subjectMeta: resolvedSubjectMeta,
 selectedMCQ: scannedData.selectedMCQ || [],
 selectedShort: scannedData.selectedShort || [],
 selectedLong: scannedData.selectedLong || [],
 medium: 'english',
 chapter: chapterVal,
 source: 'handwritten-scan',
 })
 if (result.total > 0) setSavedToBank(true)
 }

 //  Proceed to Preview 
 const handleProceed = () => {
 if (!scannedData) return
 onProceedToPreview?.({
 ...scannedData,
 config: {
 classLevel,
 subject: resolvedSubjectName,
 publisher,
 examType,
 medium: 'english',
 title: `${resolvedSubjectName || 'Paper'} Scanned Paper`,
 }
 ,
 questionBankSubjectId: selectedSubject?.isAcademicOnly ? '' : (subjectId || ''),
 questionBankSubjectMeta: resolvedSubjectMeta,
 })
 }

 const onDrop = (e) => { e.preventDefault(); addImages(e.dataTransfer.files) }

 const totalScanned = scannedData
 ? (scannedData.selectedMCQ?.length||0) + (scannedData.selectedShort?.length||0) + (scannedData.selectedLong?.length||0)
 : 0

 return (
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, minHeight:'70vh' }}>

 {/*  Server AI Modal  */}
 {showApiKey && (
 <Portal>
 <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center' }}>
 <div style={{ background:'#071e34', border:`1px solid ${C.border}`, borderRadius:20, padding:32, width:480, boxShadow:'0 20px 50px rgba(0,0,0,0.6)' }}>
 <div style={{ color:C.gold, fontWeight:800, fontSize:18, marginBottom:6 }}> Server AI Configuration</div>
 <div style={{ color:C.muted, fontSize:13, marginBottom:8 }}>
 AI scanning runs on the backend only. No API key is stored in the browser.
 </div>
 <div style={{ color:C.silver, fontSize:13, marginBottom:16 }}>
 Current model: <strong style={{ color:'#fff' }}>{paperSettings.geminiModel || aiConfig?.models?.primary || DEFAULT_MODEL}</strong>
 </div>
 <div style={{ marginBottom:20 }}>
 <div style={{ fontSize:11, color:C.muted, fontWeight:600, marginBottom:5 }}>Preferred Model</div>
 <select value={modelInput} onChange={e => setModelInput(e.target.value)}
 style={{ width:'100%', background:'rgba(11,44,77,0.7)', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'9px 12px', fontSize:13, outline:'none', cursor:'pointer' }}>
 {MODEL_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
 </select>
 </div>
 <div style={{ display:'flex', gap:10 }}>
 <button onClick={() => setShowApiKey(false)}
 style={{ flex:1, background:'rgba(15,23,42,0.46)', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 0', color:C.silver, fontWeight: 600, cursor:'pointer' }}>Cancel</button>
 <button onClick={() => { updatePaperSettings({ geminiModel: modelInput }); setShowApiKey(false) }}
 style={{ flex:1, background:`linear-gradient(135deg,${C.gold},${C.goldL})`, border:'none', borderRadius:10, padding:'10px 0', color:'#071e34', fontWeight: 600, cursor:'pointer' }}>Save</button>
 </div>
 <button onClick={async () => {
 setTestingAi(true)
 try {
 const result = await testAiConnection(paperSettings.geminiModel || DEFAULT_MODEL)
 alert(result.message || 'Connected successfully!')
 } catch (err) { alert(err.message || 'AI connection test failed.') }
 finally { setTestingAi(false) }
 }} disabled={testingAi}
 style={{ width:'100%', marginTop:12, background:'rgba(10,132,255,0.15)', border:`1px solid rgba(10,132,255,0.3)`, borderRadius:10, padding:'10px 0', color:C.blue, fontWeight:700, cursor:'pointer' }}>
 {testingAi ? 'Testing...' : 'Test AI Connection'}
 </button>
 {aiConfig?.configured === false && (
 <div style={{ marginTop:10, color:C.red, fontSize:12 }}>
 Backend AI is not configured. Set GEMINI_API_KEY on the server to enable scanning.
 </div>
 )}
 </div>
 </div>
 </Portal>
 )}

 {/*  LEFT: Controls  */}
 <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

 {/*  Paper Configuration  */}
 <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
 <div style={{ color:C.gold, fontWeight:800, fontSize:14, marginBottom:4 }}> Paper Configuration</div>
 <div style={{ color:C.muted, fontSize:11, marginBottom:14 }}>
 Select from your Question Bank subjects — publisher auto-fills.
 </div>

 <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

 {/* Class */}
 <Sel label="Class" value={classLevel} onChange={e => { setClassLevel(e.target.value); setSubjectId('') }}>
 <option value="">All Classes</option>
 {allClassOptions.map(c => (
 <option key={c.value} value={c.value}>{c.label}</option>
 ))}
 </Sel>

 {/* Subject — from QB */}
 <div>
 <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:5}}>
 Subject
 {qbSubjects.length > 0 && (
 <span style={{ marginLeft:6, color:C.gold, fontWeight:700 }}>
 · {filteredSubjects.length} in Question Bank
 </span>
 )}
 </div>
 {filteredSubjects.length > 0 ? (
 <select
 value={subjectId}
 onChange={e => {
 const nextId = e.target.value
 const nextSubject = filteredSubjects.find(s => s.id === nextId)
 setSubjectId(nextId)
 setSubjectName(nextSubject?.isAcademicOnly ? nextSubject.name : '')
 }}
 style={{
 width:'100%', background:'rgba(11,44,77,0.7)',
 border:`1px solid ${subjectId ? C.gold+'88' : C.border}`,
 borderRadius:10, color: subjectId ? C.silver : C.muted,
 padding:'9px 12px', fontSize:13, outline:'none', cursor:'pointer',
 boxSizing:'border-box', WebkitAppearance:'none',
 }}
 >
 <option value="">— Select Subject —</option>
 {filteredSubjects.map(s => (
 <option key={s.id} value={s.id}>
 {s.name}{s.classLevel ? ` · ${classLevelLabel(s.classLevel)}` : ''}{s.publisher ? ` (${s.publisher})` : ''}
 </option>
 ))}
 </select>
 ) : (
 /* Fallback: free text if QB is empty */
 <Inp
 value={subjectName || subjectId}
 onChange={e => {
 setSubjectId('')
 setSubjectName(e.target.value)
 }}
 placeholder="e.g. Mathematics (add subjects in Question Bank)"
 />
 )}
 {filteredSubjects.length > 0 && (
 <div style={{ marginTop: 8 }}>
 <Inp
 value={subjectName}
 onChange={e => {
 setSubjectId('')
 setSubjectName(e.target.value)
 }}
 placeholder="Or type a new subject name to create it"
 />
 </div>
 )}
 </div>

 {/* Chapter No. & Name */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
 <Inp label="Chapter No. (optional)" value={chapterNumber} onChange={e => setChapterNumber(e.target.value)} placeholder="e.g. 7" />
 <Inp label="Chapter Name (optional)" value={chapterName} onChange={e => setChapterName(e.target.value)} placeholder="e.g. Bioenergetics" />
 </div>

 {/* Publisher — manual input with QB suggestions */}
 <PublisherInput
 value={publisher}
 onChange={e => setPublisher(e.target.value)}
 suggestions={qbPublishers}
 />

 {/* Exam Type */}
 <Sel label="Exam Type" value={examType} onChange={e => setExamType(e.target.value)}>
 {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
 </Sel>
 </div>
 </div>

 {/*  Upload  */}
 <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
 <div style={{ color:C.gold, fontWeight:800, fontSize:14, marginBottom:14 }}> Upload Handwritten Paper</div>
 <div
 onDrop={onDrop} onDragOver={e => e.preventDefault()}
 onClick={() => fileRef.current?.click()}
 style={{ border:`2px dashed ${C.border}`, borderRadius:12, padding:'24px 16px', textAlign:'center', cursor:'pointer', background:'rgba(255,255,255,0.02)', transition:'border-color 0.2s' }}
 >
 <div style={{ fontSize:32, marginBottom:8 }}></div>
 <div style={{ color:C.silver, fontSize:13, fontWeight:600 }}>Click or drag images here</div>
 <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>JPG, PNG, WEBP — any number of pages</div>
 <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }}
 onChange={e => addImages(e.target.files)} />
 </div>

 {images.length > 0 && (
 <div style={{ marginTop:14 }}>
 <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
 <span style={{ color:C.silver, fontSize:12, fontWeight:700 }}>Pages ({images.length})</span>
 <span style={{ color:C.muted, fontSize:11 }}> to reorder</span>
 </div>
 <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
 {images.map((img, i) => (
 <div key={img.id} style={{ display:'flex', gap:8, alignItems:'center', padding:'8px 10px', background:'rgba(255,255,255,0.03)', borderRadius:8, border:`1px solid ${C.border}` }}>
 <div style={{ width:22, height:22, borderRadius:6, background:C.gold, display:'grid', placeItems:'center', color:'#071e34', fontWeight:800, fontSize:11, flexShrink:0 }}>{i+1}</div>
 <div style={{ flex:1, overflow:'hidden' }}>
 <div style={{ color:C.silver, fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{img.name}</div>
 </div>
 <button onClick={() => moveImage(img.id, -1)} disabled={i===0} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:14, opacity:i===0?0.3:1 }}></button>
 <button onClick={() => moveImage(img.id, 1)} disabled={i===images.length-1} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:14, opacity:i===images.length-1?0.3:1 }}></button>
 <button onClick={() => removeImage(img.id)} style={{ background:'none', border:'none', color:C.red, cursor:'pointer', fontSize:16 }}></button>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* AI Status */}
 <div style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 14px',
 background: aiConfig?.configured ? 'rgba(48,209,88,0.06)' : 'rgba(255,55,95,0.06)',
 border: `1px solid ${aiConfig?.configured ? 'rgba(48,209,88,0.25)' : 'rgba(255,55,95,0.25)'}`, borderRadius:10 }}>
 <span style={{ fontSize:18 }}>{aiConfig?.configured ? '' : ''}</span>
 <div style={{ flex:1 }}>
 <div style={{ fontSize:13, color: aiConfig?.configured ? C.green : C.red, fontWeight:700 }}>
 {aiConfig?.configured ? `AI Ready (${paperSettings.geminiModel || DEFAULT_MODEL})` : 'Backend AI Not Configured'}
 </div>
 <div style={{ fontSize:11, color:C.muted }}>
 {aiConfig?.configured ? 'AI scanning is ready.' : 'Set GEMINI_API_KEY on the backend to enable scanning.'}
 </div>
 </div>
 <button onClick={() => { setModelInput(paperSettings.geminiModel || DEFAULT_MODEL); setShowApiKey(true) }}
 style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 12px', color:C.silver, fontSize:12, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}>
  AI Config
 </button>
 </div>

 <PaperAiJobsPanel title="Scanner Jobs" />

 {/* Error */}
 {aiError && (
 <div style={{ padding:'12px 14px', background:'rgba(255,55,95,0.08)', border:'1px solid rgba(255,55,95,0.3)', borderRadius:10, color:C.red, fontSize:13 }}>
  {aiError}
 <button onClick={() => { setModelInput(paperSettings.geminiModel || DEFAULT_MODEL); setShowApiKey(true) }}
 style={{ marginTop:8, display:'block', background:'none', border:`1px solid ${C.red}`, borderRadius:6, padding:'4px 12px', color:C.red, fontSize:12, cursor:'pointer' }}>
  Open AI Config
 </button>
 </div>
 )}

 {/* Progress */}
 {scanning && (
 <div style={{ padding:'12px 14px', background:'rgba(10,132,255,0.08)', border:'1px solid rgba(10,132,255,0.3)', borderRadius:10, color:C.blue, fontSize:13 }}>
  {progressMsg}
 </div>
 )}

 {/* Scan Button */}
 <button onClick={handleScan} disabled={scanning || !images.length}
 style={{ background: images.length && !scanning ? `linear-gradient(135deg,${C.blue},#0055cc)` : 'rgba(10,132,255,0.15)',
 color: images.length && !scanning ? '#fff' : C.muted,
 border:'none', borderRadius:14, padding:'14px 0', fontWeight:800, fontSize:15,
 cursor: images.length && !scanning ? 'pointer' : 'not-allowed', transition:'all 0.2s' }}>
 {scanning ? (progressMsg || 'Scanning...') : 'Scan with AI'}
 </button>

 {/* Post-Scan Actions */}
 {scannedData && (
 <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
 {/* Save to Question Bank */}
 {resolvedSubjectName && !savedToBank && (
 <button onClick={handleSaveToBank}
 style={{ background:`linear-gradient(135deg,rgba(48,209,88,0.2),rgba(48,209,88,0.1))`,
 color:C.green, border:`1px solid rgba(48,209,88,0.4)`,
 borderRadius:14, padding:'12px 0', fontWeight:800, fontSize:14, cursor:'pointer' }}>
  Save {totalScanned} Questions to Question Bank
 <div style={{ fontSize:11, fontWeight:600, marginTop:3, opacity:0.8 }}>
 → {resolvedSubjectName}{classLevel ? ` · ${classLevelLabel(classLevel)}` : ''}{publisher ? ` · ${publisher}` : ''}
 </div>
 </button>
 )}
 {savedToBank && (
 <div style={{ padding:'12px 14px', background:'rgba(48,209,88,0.08)', border:'1px solid rgba(48,209,88,0.3)', borderRadius:12, color:C.green, fontSize:13, fontWeight:700, textAlign:'center' }}>
  {totalScanned} questions saved to Question Bank!
 </div>
 )}
 {/* Proceed to Paper Preview */}
 <button onClick={handleProceed}
 style={{ background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', border:'none', borderRadius:14, padding:'14px 0', fontWeight:800, fontSize:15, cursor:'pointer' }}>
  Proceed to Preview ({totalScanned} questions)
 </button>
 </div>
 )}
 </div>

 {/*  RIGHT: Info + Results  */}
 <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
 {scannedData ? (
 <div style={{ background:C.card, border:`1px solid rgba(48,209,88,0.3)`, borderRadius:16, padding:24 }}>
 <div style={{ color:C.green, fontWeight:800, fontSize:18, marginBottom:16 }}> Scan Complete!</div>

 {/* Summary */}
 {[['MCQ', scannedData.selectedMCQ, C.blue], ['Short', scannedData.selectedShort, C.gold], ['Long', scannedData.selectedLong, C.purple]].map(([label, qs, color]) => (
 <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
 <span style={{ color:C.muted, fontSize:13 }}>{label} Questions</span>
 <span style={{ color, fontWeight:700, fontSize:13 }}>{qs?.length || 0}</span>
 </div>
 ))}

 {/* Config summary */}
 <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
 {[
 ['Subject', resolvedSubjectName || '—', C.gold ],
 ['Class', classLevel ? classLevelLabel(classLevel) : '—', C.silver ],
 ['Publisher', publisher || '—', C.muted ],
 ['Exam Type', examType, C.blue ],
 ].map(([k,v,col]) => (
 <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
 <span style={{ color:C.muted }}>{k}</span>
 <span style={{ color:col, fontWeight:600 }}>{v}</span>
 </div>
 ))}
 </div>

 {/* Question preview list */}
 {totalScanned > 0 && (
 <div style={{ marginTop:16 }}>
 <div style={{ color:C.silver, fontWeight:700, fontSize:12, marginBottom:8 }}>Preview (first 5)</div>
 <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:240, overflowY:'auto' }}>
 {[...(scannedData.selectedMCQ||[]), ...(scannedData.selectedShort||[]), ...(scannedData.selectedLong||[])].slice(0,5).map((q,i) => (
 <div key={q.id||i} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px' }}>
 <div style={{ fontSize:11, color:C.muted, marginBottom:3 }}>Q{i+1} · {q.type||'short'} · {q.marks||1} mark</div>
 <div style={{ fontSize:12, color:C.silver, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
 {q.text || q.en || '—'}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 <div style={{ marginTop:14, color:C.muted, fontSize:12 }}>
 Review in the Preview Editor before printing, or save directly to the Question Bank above.
 </div>
 </div>
 ) : (
 <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:32, flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, textAlign:'center' }}>
 <div style={{ fontSize:56 }}></div>
 <div style={{ color:'#fff', fontWeight:800, fontSize:20 }}>Handwritten AI Scanner</div>
 <div style={{ color:C.muted, fontSize:13, maxWidth:320, lineHeight:1.7 }}>
 Upload photos of any handwritten or poorly printed paper.<br/>
 <strong style={{ color:C.green }}>AI Scanner</strong> reads messy handwriting, extracts Urdu, and structures everything for editing.
 </div>
 {/* Subject hint */}
 {selectedSubject && (
 <div style={{ width:'100%', background:'rgba(200,153,26,0.08)', border:`1px solid rgba(200,153,26,0.25)`, borderRadius:10, padding:'10px 14px' }}>
 <div style={{ fontSize:12, color:C.gold, fontWeight:700 }}>Selected Subject</div>
 <div style={{ fontSize:13, color:C.silver, marginTop:3 }}>
 {selectedSubject.name}
 {selectedSubject.classLevel ? ` · ${classLevelLabel(selectedSubject.classLevel)}` : ''}
 {selectedSubject.publisher ? ` · ${selectedSubject.publisher}` : ''}
 </div>
 </div>
 )}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, width:'100%' }}>
 {[
 [' From Question Bank','Subject, class & publisher auto-fill'],
 [' Urdu OCR','Reads Nastaliq & messy handwriting'],
 [' Auto-Classify','Sorts into MCQ, Short & Long'],
 [' Save to QB','Directly adds scanned Qs to Question Bank'],
 ].map(([t,d])=>(
 <div key={t} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, borderRadius:10, padding:12 }}>
 <div style={{ color:C.silver, fontWeight:700, fontSize:12 }}>{t}</div>
 <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>{d}</div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 )
}

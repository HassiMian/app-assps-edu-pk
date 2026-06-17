/**
 * PhotoProfessionalizer
 * 
 * AI-driven "Identity Professionalizer" panel.
 * Uploads a raw student photo → calls the FastAPI microservice (port 8765)
 * → displays before/after comparison slider + retouch controls.
 *
 * Requires: photo-ai-service running (python main.py in photo-ai-service/)
 */

import { useState, useRef, useCallback, useEffect } from 'react'

const AI_SERVICE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8765'
  : 'https://api.assps.edu.pk/ai'

//  Step indicator 
function Steps({ current }) {
 const steps = ['Upload', 'Process', 'Review & Save']
 return (
 <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
 {steps.map((s, i) => (
 <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
 <div style={{
 width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: 11, fontWeight: 800,
 background: i < current ? '#30D158' : i === current ? 'linear-gradient(135deg,#C8991A,#E8B420)' : 'rgba(11,44,77,0.6)',
 color: i <= current ? '#071e34' : '#8892A4',
 border: i === current ? 'none' : '1px solid rgba(200,153,26,0.2)',
 }}>
 {i < current ? '' : i + 1}
 </div>
 <div style={{ color: i === current ? '#C8991A' : '#8892A4', fontSize: 11, fontWeight: i === current ? 700 : 400, marginLeft: 6, whiteSpace: 'nowrap' }}>
 {s}
 </div>
 {i < steps.length - 1 && (
 <div style={{ flex: 1, height: 1, background: i < current ? '#30D158' : 'rgba(200,153,26,0.12)', margin: '0 10px' }} />
 )}
 </div>
 ))}
 </div>
 )
}

//  Before / After comparison slider 
function CompareSlider({ before, after, width = 560, height = 700 }) {
 const [pos, setPos] = useState(50)
 const containerRef = useRef()
 const dragging = useRef(false)

 const move = (clientX) => {
 const rect = containerRef.current?.getBoundingClientRect()
 if (!rect) return
 const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100))
 setPos(pct)
 }

 return (
 <div
 ref={containerRef}
 style={{ position: 'relative', width, height, borderRadius: 14, overflow: 'hidden', cursor: 'ew-resize', userSelect: 'none', flexShrink: 0 }}
 onMouseDown={() => { dragging.current = true }}
 onMouseUp={() => { dragging.current = false }}
 onMouseLeave={() => { dragging.current = false }}
 onMouseMove={(e) => { if (dragging.current) move(e.clientX) }}
 onTouchMove={(e) => move(e.touches[0].clientX)}
 >
 {/* AFTER (processed) — full width below */}
 <img src={after} alt="After" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

 {/* BEFORE — clipped to left of slider */}
 <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${pos}%` }}>
 <img src={before} alt="Before" style={{ width, height, objectFit: 'cover', position: 'absolute', left: 0, top: 0 }} />
 </div>

 {/* Slider handle */}
 <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, transform: 'translateX(-50%)', width: 2, background: '#C8991A', pointerEvents: 'none' }}>
 <div style={{
 position: 'absolute', top: '50%', left: '50%',
 transform: 'translate(-50%, -50%)',
 width: 38, height: 38, borderRadius: '50%',
 background: '#C8991A',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
 fontSize: 14,
 }}>⇔</div>
 </div>

 {/* Labels */}
 <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.55)', borderRadius: 5, padding: '3px 8px', color: '#fff', fontSize: 10, fontWeight: 700 }}>ORIGINAL</div>
 <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(13,148,136,0.85)', borderRadius: 5, padding: '3px 8px', color: '#fff', fontSize: 10, fontWeight: 700 }}>AI PROCESSED</div>
 </div>
 )
}

//  Slider control 
function SliderControl({ label, icon, value, onChange, min = 0, max = 100, color = '#C8991A' }) {
 return (
 <div>
 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
 <span style={{ color: '#8892A4', fontSize: 12, fontWeight: 600 }}>{icon} {label}</span>
 <span style={{ color, fontSize: 12, fontWeight: 800 }}>{value}%</span>
 </div>
 <input
 type="range" min={min} max={max} value={value}
 onChange={(e) => onChange(Number(e.target.value))}
 style={{ width: '100%', accentColor: color, cursor: 'pointer' }}
 />
 </div>
 )
}

//  Processing animation 
function ProcessingOverlay({ stage }) {
 const stages = [
 { key: 'bg', label: 'Removing background…', icon: '' },
 { key: 'face', label: 'Detecting face & gender…', icon: '' },
 { key: 'retouch',label: 'Applying skin retouching…', icon: '' },
 { key: 'uniform',label: 'Compositing school uniform…', icon: '' },
 { key: 'hires', label: 'Rendering 4K output…', icon: '' },
 ]
 const idx = stages.findIndex(s => s.key === stage)

 return (
 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', gap: 24 }}>
 {/* Spinner ring */}
 <div style={{
 width: 72, height: 72, borderRadius: '50%',
 border: '4px solid rgba(200,153,26,0.15)',
 borderTop: '4px solid #C8991A',
 animation: 'spin 1s linear infinite',
 }} />

 <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
 {stages.map((s, i) => (
 <div key={s.key} style={{
 display: 'flex', alignItems: 'center', gap: 10,
 opacity: i > idx ? 0.3 : 1,
 transition: 'opacity 0.4s',
 }}>
 <div style={{
 width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: 12,
 background: i < idx ? 'rgba(48,209,88,0.2)' : i === idx ? 'rgba(200,153,26,0.2)' : 'rgba(255,255,255,0.05)',
 border: `1px solid ${i < idx ? '#30D158' : i === idx ? '#C8991A' : 'rgba(255,255,255,0.08)'}`,
 }}>
 {i < idx ? '' : s.icon}
 </div>
 <span style={{ color: i === idx ? '#C8991A' : i < idx ? '#30D158' : '#8892A4', fontSize: 13, fontWeight: i === idx ? 700 : 400 }}>
 {s.label}
 </span>
 {i === idx && <div style={{ marginLeft: 'auto', fontSize: 10, color: '#C8991A', animation: 'pulse 1.2s ease infinite' }}></div>}
 </div>
 ))}
 </div>

 <style>{`
 @keyframes spin { to { transform: rotate(360deg) } }
 @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.2 } }
 `}</style>
 </div>
 )
}

//  Template status badge 
function ServiceStatus({ status }) {
 const color = status === 'online' ? '#30D158' : status === 'no-templates' ? '#FF9F0A' : '#FF375F'
 const label = status === 'online' ? 'AI Service Online' : status === 'no-templates' ? 'Templates Missing' : 'AI Service Offline'
 const dot = status === 'online' ? '' : status === 'no-templates' ? '' : ''
 return (
 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
 <span style={{ color, fontSize: 10 }}>{dot}</span>
 <span style={{ color, fontSize: 11, fontWeight: 700 }}>{label}</span>
 </div>
 )
}

//  Main component 
export default function PhotoProfessionalizer({ studentId, studentName, studentGender = 'auto', onSave }) {
 const [step, setStep] = useState(0) // 0=upload 1=processing 2=review
 const [rawPhoto, setRawPhoto] = useState(null) // original file URL
 const [rawFile, setRawFile] = useState(null) // original File object
 const [result, setResult] = useState(null) // { preview, file_url, detected_gender, resolution }
 const [dragging, setDragging] = useState(false)
 const [stage, setStage] = useState('bg') // processing stage label
 const [error, setError] = useState('')

 // Retouch controls
 const [retouch, setRetouch] = useState(50)
 const [fairness, setFairness] = useState(30)
 const [genderOverride, setGenderOverride] = useState(studentGender === 'female' ? 'female' : studentGender === 'male' ? 'male' : 'auto')

 // Service health
 const [serviceStatus, setServiceStatus] = useState('checking')

 const fileRef = useRef()

 // Check service health on mount
 useEffect(() => {
 fetch(`${AI_SERVICE}/health`, { signal: AbortSignal.timeout(3000) })
 .then(r => r.json())
 .then(data => {
 const allTemplates = Object.values(data.templates || {}).every(Boolean)
 setServiceStatus(allTemplates ? 'online' : 'no-templates')
 })
 .catch(() => setServiceStatus('offline'))
 }, [])

 const loadFile = (file) => {
 if (!file || !file.type.startsWith('image/')) return
 setRawPhoto(URL.createObjectURL(file))
 setRawFile(file)
 setResult(null)
 setError('')
 }

 const onDrop = useCallback((e) => {
 e.preventDefault(); setDragging(false)
 loadFile(e.dataTransfer.files[0])
 }, [])

 //  Simulate stage progression during API call 
 const STAGES = ['bg', 'face', 'retouch', 'uniform', 'hires']
 const runStages = () => {
 let i = 0
 setStage(STAGES[0])
 const id = setInterval(() => {
 i++
 if (i < STAGES.length) setStage(STAGES[i])
 else clearInterval(id)
 }, 1800)
 return id
 }

 //  Process 
 const processPhoto = async (file = rawFile) => {
 if (!file) return
 setStep(1); setError('')
 const stageTimer = runStages()

 const formData = new FormData()
 formData.append('file', file)
 formData.append('gender', genderOverride)
 formData.append('retouch', (retouch / 100).toFixed(2))
 formData.append('fairness', (fairness / 100).toFixed(2))

 try {
 const res = await fetch(`${AI_SERVICE}/api/photo/professionalise`, {
 method: 'POST',
 body: formData,
 })
 clearInterval(stageTimer)

 if (!res.ok) {
 const err = await res.json()
 throw new Error(err.detail?.message || err.detail || 'Processing failed')
 }
 const data = await res.json()
 setResult(data)
 setStep(2)
 } catch (e) {
 clearInterval(stageTimer)
 setError(e.message)
 setStep(0)
 }
 }

 //  Re-process with updated sliders 
 const reprocess = async () => {
 if (!rawFile) return
 setStep(1); setError('')
 const stageTimer = runStages()

 const formData = new FormData()
 formData.append('file', rawFile)
 formData.append('gender', genderOverride)
 formData.append('retouch', (retouch / 100).toFixed(2))
 formData.append('fairness', (fairness / 100).toFixed(2))

 try {
 const res = await fetch(`${AI_SERVICE}/api/photo/professionalise`, { method: 'POST', body: formData })
 clearInterval(stageTimer)
 if (!res.ok) throw new Error('Reprocessing failed')
 const data = await res.json()
 setResult(data)
 setStep(2)
 } catch (e) {
 clearInterval(stageTimer)
 setError(e.message)
 setStep(2)
 }
 }

 const card = {
 background: 'rgba(11,44,77,0.5)', backdropFilter: 'blur(20px)',
 border: '1px solid rgba(200,153,26,0.15)', borderRadius: 16, padding: 24,
 }
 const btn = (color = '#C8991A') => ({
 background: `linear-gradient(135deg, ${color}, ${color}bb)`,
 border: 'none', borderRadius: 10, color: color === '#C8991A' ? '#071e34' : '#fff',
 padding: '10px 22px', fontWeight: 800, fontSize: 13, cursor: 'pointer',
 display: 'flex', alignItems: 'center', gap: 7,
 })

 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
 {/* Header */}
 <div style={{ ...card }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
 <div>
 <h2 style={{ color: '#C8991A', fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: 0.4 }}>
  Identity Professionalizer
 </h2>
 <p style={{ color: '#8892A4', margin: '6px 0 0', fontSize: 13 }}>
 AI-powered school portrait generator — automatically applies official school uniform
 {studentName && <> for <strong style={{ color: '#C0C8D8' }}>{studentName}</strong></>}
 </p>
 </div>
 <ServiceStatus status={serviceStatus} />
 </div>
 </div>

 {/* Steps */}
 <Steps current={step} />

 {/*  STEP 0: Upload  */}
 {step === 0 && (
 <div style={{ display: 'grid', gridTemplateColumns: rawPhoto ? '1fr 1.1fr' : '1fr', gap: 20 }}>
 {/* Drop Zone */}
 <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
 <div
 onClick={() => fileRef.current.click()}
 onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
 onDragLeave={() => setDragging(false)}
 onDrop={onDrop}
 style={{
 border: `2px dashed ${dragging ? '#C8991A' : rawPhoto ? 'rgba(48,209,88,0.4)' : 'rgba(200,153,26,0.25)'}`,
 borderRadius: 14, padding: 20, cursor: 'pointer',
 background: dragging ? 'rgba(200,153,26,0.07)' : 'rgba(7,30,52,0.3)',
 transition: 'all 0.2s',
 display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
 minHeight: 180,
 }}
 >
 {rawPhoto ? (
 <img src={rawPhoto} alt="Preview" style={{ maxHeight: 260, maxWidth: '100%', borderRadius: 10, objectFit: 'contain' }} />
 ) : (
 <>
 <span style={{ fontSize: 40 }}></span>
 <div style={{ color: 'rgba(200,153,26,0.7)', fontWeight: 700, fontSize: 14 }}>Drop student photo here</div>
 <div style={{ color: '#8892A4', fontSize: 12 }}>or click to browse — JPEG / PNG / WebP</div>
 </>
 )}
 </div>
 <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => loadFile(e.target.files[0])} />
 {rawPhoto && (
 <button onClick={() => { setRawPhoto(null); setRawFile(null) }}
 style={{ background: 'none', border: '1px solid rgba(255,99,71,0.3)', borderRadius: 8, color: '#FF6347', fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}>
  Remove photo
 </button>
 )}
 </div>

 {/* Options panel — only when photo is loaded */}
 {rawPhoto && (
 <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 20 }}>
 <div>
 <div style={{ color: '#C8991A', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Uniform Template</div>
 <div style={{ display: 'flex', gap: 8 }}>
 {['auto', 'male', 'female'].map(g => (
 <button key={g} onClick={() => setGenderOverride(g)}
 style={{
 flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, textTransform: 'capitalize',
 background: genderOverride === g ? 'linear-gradient(135deg,#C8991A,#E8B420)' : 'rgba(11,44,77,0.6)',
 color: genderOverride === g ? '#071e34' : '#8892A4',
 }}>
 {g === 'auto' ? ' Auto' : g === 'male' ? ' Boys' : ' Girls'}
 </button>
 ))}
 </div>
 {genderOverride === 'auto' && (
 <p style={{ color: '#8892A4', fontSize: 11, margin: '8px 0 0' }}>
 AI will auto-detect gender from the face and apply the correct uniform template.
 </p>
 )}
 </div>

 <div>
 <div style={{ color: '#C8991A', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Retouching</div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
 <SliderControl label="Skin Smoothing" icon="" value={retouch} onChange={setRetouch} color="#0D9488" />
 <SliderControl label="Brightness / Fairness" icon="" value={fairness} onChange={setFairness} color="#C8991A" />
 </div>
 <p style={{ color: '#8892A4', fontSize: 11, margin: '10px 0 0', lineHeight: 1.6 }}>
 Bilateral skin smoothing preserves 100% facial structure — eyes, nose, and jawline remain unchanged.
 </p>
 </div>

 <div style={{ background: 'rgba(13,148,136,0.08)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(13,148,136,0.2)', fontSize: 11, color: '#8892A4', lineHeight: 1.7 }}>
 <strong style={{ color: '#0D9488' }}>AI Pipeline:</strong> Background removal (rembg) → Face detection (InsightFace) → Skin retouch (OpenCV bilateral) → Uniform composite → 4K output
 </div>

 {error && (
 <div style={{ background: 'rgba(255,55,95,0.1)', border: '1px solid rgba(255,55,95,0.3)', borderRadius: 10, padding: '10px 14px', color: '#FF375F', fontSize: 12 }}>
  {error}
 {serviceStatus === 'offline' && <><br/><span style={{ opacity: 0.7 }}>Make sure the Photo AI service is running: <code>python main.py</code> in photo-ai-service/</span></>}
 {serviceStatus === 'no-templates' && <><br/><span style={{ opacity: 0.7 }}>Upload uniform templates via Settings → Photo AI</span></>}
 </div>
 )}

 <button onClick={() => processPhoto()} disabled={serviceStatus === 'offline'} style={btn()}>
  Generate Professional Portrait
 </button>
 </div>
 )}
 </div>
 )}

 {/*  STEP 1: Processing  */}
 {step === 1 && (
 <div style={{ ...card }}>
 <ProcessingOverlay stage={stage} />
 </div>
 )}

 {/*  STEP 2: Review & Save  */}
 {step === 2 && result && (
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
 {/* Before / After Slider */}
 <div style={{ ...card }}>
 <div style={{ color: '#C8991A', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
 Before / After — drag the slider to compare
 </div>
 <div style={{ display: 'flex', justifyContent: 'center' }}>
 <CompareSlider before={rawPhoto} after={result.preview} width={480} height={580} />
 </div>

 {/* Meta chips */}
 <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
 {[
 { label: `Gender: ${result.detected_gender}`, color: '#0A84FF' },
 { label: `${result.resolution?.[0]} × ${result.resolution?.[1]} px`, color: '#30D158' },
 { label: 'AI Uniform Applied', color: '#0D9488' },
 { label: '300 DPI Print Ready', color: '#C8991A' },
 ].map(chip => (
 <span key={chip.label} style={{
 padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
 background: `${chip.color}18`, color: chip.color, border: `1px solid ${chip.color}33`,
 }}>
 {chip.label}
 </span>
 ))}
 </div>
 </div>

 {/* Controls */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
 {/* Retouch controls */}
 <div style={{ ...card }}>
 <div style={{ color: '#C8991A', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
 Retouch Controls
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
 <SliderControl label="Skin Smoothing" icon="" value={retouch} onChange={setRetouch} color="#0D9488" />
 <SliderControl label="Brightness / Fairness" icon="" value={fairness} onChange={setFairness} color="#C8991A" />
 </div>
 <button onClick={reprocess} style={{ ...btn('#0D9488'), marginTop: 16, width: '100%', justifyContent: 'center' }}>
  Apply Changes
 </button>
 </div>

 {/* Gender override */}
 <div style={{ ...card }}>
 <div style={{ color: '#C8991A', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Template</div>
 <div style={{ display: 'flex', gap: 6 }}>
 {['auto', 'male', 'female'].map(g => (
 <button key={g} onClick={() => setGenderOverride(g)}
 style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, textTransform: 'capitalize',
 background: genderOverride === g ? 'linear-gradient(135deg,#C8991A,#E8B420)' : 'rgba(11,44,77,0.6)',
 color: genderOverride === g ? '#071e34' : '#8892A4' }}>
 {g === 'auto' ? '' : g === 'male' ? '' : ''} {g.charAt(0).toUpperCase() + g.slice(1)}
 </button>
 ))}
 </div>
 </div>

 {/* Save actions */}
 <div style={{ ...card }}>
 <div style={{ color: '#C8991A', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Save</div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 <a href={result.file_url} download={`${studentName || 'student'}_portrait.png`} target="_blank" rel="noreferrer">
 <button style={{ ...btn('#C8991A'), width: '100%', justifyContent: 'center' }}>
  Download 4K PNG
 </button>
 </a>
 {onSave && (
 <button onClick={() => onSave(result.preview, result.file_url)} style={{ ...btn('#30D158'), width: '100%', justifyContent: 'center' }}>
  Save to Student Profile
 </button>
 )}
 <button onClick={() => { setStep(0); setResult(null) }}
 style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#8892A4', fontSize: 12, padding: '9px', cursor: 'pointer' }}>
  Start Over
 </button>
 </div>
 </div>

 {error && (
 <div style={{ background: 'rgba(255,55,95,0.1)', border: '1px solid rgba(255,55,95,0.3)', borderRadius: 10, padding: '10px 14px', color: '#FF375F', fontSize: 12 }}>
  {error}
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 )
}

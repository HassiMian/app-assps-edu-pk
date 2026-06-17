/**
 * PhotoUploadAI
 * 
 * Drag-and-drop photo upload with AI uniform application.
 * Calls the FastAPI photo-ai-service (localhost:8765) which uses the real
 * school uniform template PNGs (male_uniform.png / female_uniform.png).
 */

import { useState, useRef, useCallback, useEffect } from 'react'

const AI_SERVICE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8765'
  : 'https://api.assps.edu.pk/ai'

//  Processing stages shown while API is running 
const STAGES = [
 { label: 'Removing background…', ms: 0 },
 { label: 'Detecting face & gender…', ms: 2200 },
 { label: 'Retouching skin…', ms: 4000 },
 { label: 'Applying school uniform…', ms: 5800 },
 { label: 'Rendering high-res output…', ms: 7500 },
]

function ProcessingBar({ active }) {
 const [stageIdx, setStageIdx] = useState(0)
 const timerRef = useRef([])

 // kick off stage timers when `active` goes true
 useEffect(() => {
 if (active) {
 setStageIdx(0)
 timerRef.current = STAGES.slice(1).map((s, i) =>
 setTimeout(() => setStageIdx(i + 1), s.ms)
 )
 } else {
 timerRef.current.forEach(clearTimeout)
 }
 return () => timerRef.current.forEach(clearTimeout)
 }, [active])

 if (!active) return null
 return (
 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '20px 10px' }}>
 {/* Spinner */}
 <div style={{
 width: 48, height: 48, borderRadius: '50%',
 border: '4px solid rgba(200,153,26,0.15)',
 borderTop: '4px solid #C8991A',
 animation: 'spin 0.9s linear infinite',
 }} />
 <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
 {STAGES.map((s, i) => (
 <div key={i} style={{
 display: 'flex', alignItems: 'center', gap: 8,
 opacity: i > stageIdx ? 0.3 : 1,
 transition: 'opacity 0.4s',
 }}>
 <div style={{
 width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
 display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
 background: i < stageIdx ? 'rgba(48,209,88,0.2)' : i === stageIdx ? 'rgba(200,153,26,0.2)' : 'transparent',
 border: `1px solid ${i < stageIdx ? '#30D158' : i === stageIdx ? '#C8991A' : 'rgba(255,255,255,0.1)'}`,
 color: i < stageIdx ? '#30D158' : '#C8991A',
 }}>
 {i < stageIdx ? '' : i === stageIdx ? '' : ''}
 </div>
 <span style={{ fontSize: 11, color: i === stageIdx ? '#C8991A' : i < stageIdx ? '#30D158' : '#8892A4', fontWeight: i === stageIdx ? 700 : 400 }}>
 {s.label}
 </span>
 </div>
 ))}
 </div>
 <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
 </div>
 )
}

//  Main component 
export default function PhotoUploadAI({
 value,
 onChange,
 size = 130,
 label = 'Student Photo',
 gender = 'auto', // 'auto' | 'male' | 'female'
 retouch = 0.5,
 fairness = 0.3,
}) {
 const [dragging, setDragging] = useState(false)
 const [processing, setProcessing] = useState(false)
 const [rawPhoto, setRawPhoto] = useState(value || null) // original object URL
 const [rawFile, setRawFile] = useState(null) // original File
 const [finalPhoto, setFinalPhoto] = useState(value || null) // processed result
 const [uniformApplied, setUniformApplied] = useState(false)
 const [error, setError] = useState('')
 const [errorType, setErrorType] = useState('service') // 'service' | 'rejected'
 const [serviceOnline, setServiceOnline] = useState(true)
 const fileRef = useRef()

 const W = size
 const H = Math.round(size * 1.25)

 const loadFile = (file) => {
 if (!file || !file.type.startsWith('image/')) return
 const url = URL.createObjectURL(file)
 setRawPhoto(url)
 setRawFile(file)
 setFinalPhoto(url)
 setUniformApplied(false)
 setError('')
 setErrorType('service')
 onChange?.(url)
 }

 //  Call the real FastAPI service 
 const applyUniform = async () => {
 if (!rawFile) return
 setProcessing(true)
 setError('')

 const formData = new FormData()
 formData.append('file', rawFile)
 formData.append('gender', gender)
 formData.append('retouch', retouch.toFixed(2))
 formData.append('fairness', fairness.toFixed(2))

 try {
 const res = await fetch(`${AI_SERVICE}/api/photo/professionalise`, {
 method: 'POST',
 body: formData,
 })

 if (res.status === 422) {
 const err = await res.json().catch(() => ({}))
 setErrorType('rejected')
 throw new Error(err?.detail?.message || 'Photo rejected. Please use a clear front-facing photo.')
 }

 if (!res.ok) {
 const err = await res.json().catch(() => ({}))
 throw new Error(err?.detail?.message || err?.detail || `Service error ${res.status}`)
 }

 const data = await res.json()
 setFinalPhoto(data.preview)
 setUniformApplied(true)
 setServiceOnline(true)
 setError('')
 onChange?.(data.preview)
 } catch (e) {
 const msg = e.message || ''
 const isNetworkError = msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Load failed')
 if (isNetworkError) {
 setErrorType('service')
 setServiceOnline(false)
 setError('Cannot reach AI service. Make sure photo-ai-service/start.bat is running, then refresh the page.')
 } else {
 if (errorType !== 'rejected') setErrorType('service')
 setError(msg)
 }
 } finally {
 setProcessing(false)
 }
 }

 const revert = () => {
 setFinalPhoto(rawPhoto)
 setUniformApplied(false)
 onChange?.(rawPhoto)
 }

 const onDrop = useCallback((e) => {
 e.preventDefault()
 setDragging(false)
 loadFile(e.dataTransfer.files[0])
 }, [])

 return (
 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: W }}>

 {/* Label */}
 <div style={{ color: '#8892A4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, alignSelf: 'flex-start' }}>
 {label}
 </div>

 {/* Photo / Drop zone */}
 {processing ? (
 <div style={{ width: W, minHeight: H, background: 'rgba(7,30,52,0.5)', borderRadius: 12, border: '1px solid rgba(200,153,26,0.2)', overflow: 'hidden' }}>
 <ProcessingBar active />
 </div>
 ) : finalPhoto ? (
 <div style={{ position: 'relative' }}>
 <img
 src={finalPhoto}
 alt="Student"
 style={{
 width: W, height: H, objectFit: 'cover',
 objectPosition: uniformApplied ? 'center 28%' : 'center',
 borderRadius: 12, display: 'block',
 border: uniformApplied
 ? '2px solid rgba(13,148,136,0.6)'
 : '2px solid rgba(200,153,26,0.35)',
 boxShadow: uniformApplied
 ? '0 0 20px rgba(13,148,136,0.25)'
 : '0 4px 18px rgba(0,0,0,0.4)',
 }}
 />
 {/* AI badge — bottom strip, never covers face */}
 {uniformApplied && (
 <div style={{
 position: 'absolute', bottom: 30, left: 0, right: 0,
 background: 'rgba(13,148,136,0.82)',
 padding: '2px 0', color: '#fff', fontSize: 9, fontWeight: 800,
 letterSpacing: 1, textAlign: 'center',
 }}>
  AI UNIFORM APPLIED
 </div>
 )}
 {/* Change photo */}
 <button
 onClick={() => fileRef.current.click()}
 style={{
 position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)',
 background: 'rgba(7,30,52,0.9)', border: '1px solid rgba(200,153,26,0.4)',
 borderRadius: 6, color: '#C8991A', fontSize: 10, fontWeight: 700,
 padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
 }}
 >
 Change Photo
 </button>
 </div>
 ) : (
 <div
 onClick={() => fileRef.current.click()}
 onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
 onDragLeave={() => setDragging(false)}
 onDrop={onDrop}
 style={{
 width: W, height: H, borderRadius: 12, cursor: 'pointer',
 border: `2px dashed ${dragging ? '#C8991A' : 'rgba(200,153,26,0.28)'}`,
 background: dragging ? 'rgba(200,153,26,0.09)' : 'rgba(7,30,52,0.45)',
 display: 'flex', flexDirection: 'column',
 alignItems: 'center', justifyContent: 'center', gap: 8,
 transition: 'all 0.2s',
 }}
 >
 <span style={{ fontSize: 30 }}></span>
 <span style={{ color: 'rgba(200,153,26,0.65)', fontSize: 10, textAlign: 'center', padding: '0 10px', lineHeight: 1.4 }}>
 Click or drag<br />student photo
 </span>
 </div>
 )}

 <input
 ref={fileRef} type="file" accept="image/*"
 style={{ display: 'none' }}
 onChange={(e) => loadFile(e.target.files[0])}
 />

 {/* AI Uniform button — only when photo loaded and not yet processed */}
 {rawFile && !uniformApplied && !processing && (
 <button
 onClick={applyUniform}
 style={{
 width: W,
 background: serviceOnline
 ? 'linear-gradient(135deg, #0D9488, #0B7A70)'
 : 'rgba(255,55,95,0.15)',
 border: serviceOnline
 ? '1px solid rgba(13,148,136,0.45)'
 : '1px solid rgba(255,55,95,0.3)',
 borderRadius: 9, color: '#fff',
 fontSize: 11, fontWeight: 700, padding: '9px 8px',
 cursor: 'pointer',
 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
 boxShadow: serviceOnline ? '0 4px 14px rgba(13,148,136,0.3)' : 'none',
 }}
 >
  AI Apply School Uniform
 </button>
 )}

 {/* Error — two distinct styles: photo rejected vs service offline */}
 {error && (
 <div style={{
 width: W,
 background: errorType === 'rejected'
 ? 'rgba(255,159,10,0.12)'
 : 'rgba(255,55,95,0.10)',
 border: errorType === 'rejected'
 ? '1px solid rgba(255,159,10,0.4)'
 : '1px solid rgba(255,55,95,0.25)',
 borderRadius: 8,
 padding: '7px 9px',
 color: errorType === 'rejected' ? '#FF9F0A' : '#FF375F',
 fontSize: 10, lineHeight: 1.6,
 }}>
 {errorType === 'rejected' ? ' ' : ' '}{error}
 {errorType === 'rejected' && (
 <div style={{ marginTop: 4, opacity: 0.8 }}>
 Tips: face camera directly · good lighting · avoid blur
 </div>
 )}
 </div>
 )}

 {/* Revert */}
 {uniformApplied && !processing && (
 <button
 onClick={revert}
 style={{
 width: W, background: 'transparent',
 border: '1px solid rgba(255,255,255,0.1)',
 borderRadius: 8, color: 'rgba(255,255,255,0.35)',
 fontSize: 10, padding: '5px', cursor: 'pointer',
 }}
 >
  Revert to Original
 </button>
 )}
 </div>
 )
}

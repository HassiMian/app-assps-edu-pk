// src/Modules/attendance/SmartAttendance.jsx — Al Siddique Smart School OS
import { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import api from '../../services/api'
import { C, card, btnSecondary, sectionHeader } from '../moduleStyles'
import { ScanFace } from 'lucide-react'

const GCard = ({ children, style = {} }) => (
 <div className="super-module-card" style={{ ...card, padding: 24, ...style }}>
 {children}
 </div>
)

const Lbl = ({ children }) => <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{children}</div>

export default function SmartAttendance() {
 const videoRef = useRef(null)
 const canvasRef = useRef(null)
 const streamRef = useRef(null)
 const rafRef = useRef(null)
 const lastScan = useRef({}) 

 const mode = 'qr'
 const [scanning, setScanning] = useState(false)
 const [type, setType] = useState('student') 
 const [log, setLog] = useState([])
 const [statusMsg, setStatusMsg] = useState('')

 const addLog = useCallback((entry) => {
 setLog(prev => [entry, ...prev].slice(0, 50))
 }, [])

 const markAttendance = useCallback(async (code) => {
 const now = Date.now()
 if (lastScan.current[code] && now - lastScan.current[code] < 5000) return
 lastScan.current[code] = now

 try {
 if (type === 'student') {
 await api.post('/api/attendance/mark-by-gr', { gr_number: code, status: 'present' })
 addLog({ time: new Date().toLocaleTimeString(), code, label: 'Student', status: 'present', ok: true })
 } else {
 await api.post('/api/attendance/employee/mark', { emp_id: code, status: 'present' })
 addLog({ time: new Date().toLocaleTimeString(), code, label: 'Employee', status: 'present', ok: true })
 }
 setStatusMsg(`Success: ${code} marked!`)
 } catch (err) {
 const msg = err.response?.data?.message || 'Not found'
 addLog({ time: new Date().toLocaleTimeString(), code, label: type === 'student' ? 'Student' : 'Employee', status: msg, ok: false })
 setStatusMsg(`Error: ${msg}`)
 }
 setTimeout(() => setStatusMsg(''), 3000)
 }, [type, addLog])

 const tick = useCallback(() => {
 const video = videoRef.current
 const canvas = canvasRef.current
 if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
 rafRef.current = requestAnimationFrame(tick)
 return
 }
 canvas.height = video.videoHeight
 canvas.width = video.videoWidth
 const ctx = canvas.getContext('2d')
 ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
 
 const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
 const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
 if (code?.data) markAttendance(code.data)

 rafRef.current = requestAnimationFrame(tick)
 }, [markAttendance])

 const startCamera = useCallback(async () => {
 setStatusMsg('')
 try {
 const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
 streamRef.current = stream
 if(videoRef.current) videoRef.current.srcObject = stream
 await videoRef.current.play()
 setScanning(true)
 rafRef.current = requestAnimationFrame(tick)
 } catch (err) {
 setStatusMsg('Error: Camera access denied: ' + err.message)
 }
 }, [tick])

 const stopCamera = useCallback(() => {
 cancelAnimationFrame(rafRef.current)
 if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
 setScanning(false)
 }, [])

 useEffect(() => () => stopCamera(), [stopCamera])


 return (
 <div style={{ minHeight: '100vh', background: 'var(--apex-shell-gradient)', color: 'var(--apex-text-primary)', padding: 24, fontFamily: 'Inter, sans-serif' }}>
 <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gap: 24 }}>

 {/* Header */}
 <GCard style={{ display: 'flex', flexWrap:'wrap', justifyContent: 'space-between', alignItems: 'center', gap:16 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
 <div style={{ width: 50, height: 50, borderRadius: 15, background: 'rgba(200,153,26,0.16)', border: `1px solid rgba(200,153,26,0.35)`, display: 'grid', placeItems: 'center', color: C.gold }}>
 <ScanFace size={24} />
 </div>
 <div>
 <h1 style={sectionHeader}>Smart Attendance</h1>
 <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>Verified QR/barcode attendance. Facial and biometric modes remain disabled until a trusted identity-provider integration is connected.</p>
 </div>
 </div>
 <div style={{ display: 'flex', gap: 4, background: 'var(--apex-bg-subtle)', borderRadius: 10, padding: 4, flexWrap:'wrap' }}>
 {[{id:'qr',label:'QR/Barcode Scan',available:true},{id:'facial',label:'Facial AI · Not configured',available:false},{id:'fingerprint',label:'Biometric · Not configured',available:false}].map(m => (
 <button key={m.id} disabled={!m.available}
 title={m.available ? 'Verified server-backed attendance scanner' : 'Requires a verified identity-provider integration before it can mark attendance'}
 style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: m.available ? 'default' : 'not-allowed', fontWeight: 700, fontSize: 12,
 background: m.available ? 'var(--apex-action-primary)' : 'transparent',
 color: m.available ? '#fff' : 'var(--apex-text-tertiary)', opacity:m.available ? 1 : .62, transition:'all 0.2s' }}>
 {m.label}
 </button>
 ))}
 </div>
 </GCard>

 <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
 {/* Main Scanner Panel */}
 <GCard>
 <div style={{ marginBottom: 22 }}>
 <Lbl>Identification Category</Lbl>
 <div style={{ display: 'flex', gap: 10 }}>
 {[{id:'student',label:' Student'},{id:'employee',label:' Staff'}].map(t => (
 <button key={t.id} onClick={() => setType(t.id)} 
 style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${type === t.id ? C.gold : C.border}`, 
 background: type === t.id ? 'rgba(200,153,26,0.1)' : 'rgba(15,23,42,0.3)', 
 color: type === t.id ? C.gold : C.muted, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition:'all 0.2s' }}>
 {t.label}
 </button>
 ))}
 </div>
 </div>

 {/* Viewport */}
 {mode === 'qr' && (
 <div style={{ position: 'relative', background: '#000', borderRadius: 20, overflow: 'hidden', marginBottom: 20, aspectRatio: '16/10', border: `2px solid ${scanning ? C.gold : C.border}`, boxShadow:'0 12px 32px rgba(0,0,0,0.4)' }}>
 <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }} playsInline muted />
 <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
 {!scanning && (
 <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: C.muted }}>
 <div style={{ fontSize: 64, filter:'drop-shadow(0 0 12px rgba(200,153,26,0.3))' }}></div>
 <button onClick={startCamera} style={{ background: 'var(--apex-action-primary)', border: 'none', color: '#fff', padding: '12px 32px', borderRadius: 14, fontWeight: 600, cursor: 'pointer', fontSize:15 }}>Start Intelligence Scanner</button>
 </div>
 )}
 {scanning && mode === 'qr' && (
 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
 <div style={{ width: 220, height: 220, border: '2px solid #C8991A', borderRadius: 16, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}/>
 <div style={{ position: 'absolute', width: '100%', height: 3, background: 'rgba(200,153,26,0.8)', top: '50%', transform: 'translateY(-50%)', animation: 'qr-scan 2.5s infinite linear', boxShadow:'0 0 15px #C8991A' }}/>
 </div>
 )}
 {scanning && mode === 'facial' && (
 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
 <div style={{ width: 220, height: 280, borderRadius: '50%', border: '2px dashed #0A84FF', boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}/>
 <div style={{ position:'absolute', top:'15%', color:C.blue, fontSize:12, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5 }}>Align Face Within Oval</div>
 </div>
 )}
 </div>
 )}



 {statusMsg && (
 <div style={{ background: statusMsg.startsWith('Error') ? 'rgba(255,55,95,0.12)' : 'rgba(48,209,88,0.12)', padding: '14px', borderRadius: 12, color: statusMsg.startsWith('Error') ? C.red : C.green, fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 14, border: `1px solid ${statusMsg.startsWith('Error') ? 'rgba(255,55,95,0.2)' : 'rgba(48,209,88,0.2)'}` }}>
 {statusMsg}
 </div>
 )}
 
 {scanning && <button onClick={stopCamera} style={btnSecondary}> Close Scanner</button>}
 </GCard>

 {/* Activity Log Panel */}
 <div style={{ display: 'grid', gridTemplateRows: '1fr auto', gap: 24 }}>
 <GCard style={{ display: 'flex', flexDirection: 'column' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
 <div style={{ color: C.gold, fontWeight: 800, fontSize: 16 }}>Live Activity Log</div>
 <button onClick={() => setLog([])} style={{ fontSize: 11, color: C.muted, background: 'rgba(255,255,255,0.05)', border: 'none', padding:'4px 10px', borderRadius:6, cursor: 'pointer' }}>Clear All</button>
 </div>
 
 <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 460, paddingRight:6 }} className="custom-scroll">
 {log.length === 0 ? (
 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13, textAlign: 'center', gap: 16, opacity:0.6 }}>
 <div style={{ fontSize: 52 }}></div>
 Waiting for scanner activity...
 </div>
 ) : log.map((e, i) => (
 <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px', borderRadius: 14, background: 'rgba(15,23,42,0.4)', border: `1px solid ${e.ok ? 'rgba(48,209,88,0.1)' : 'rgba(255,55,95,0.1)'}`, animation:'slideIn 0.3s ease' }}>
 <div style={{ width: 10, height: 10, borderRadius: '50%', background: e.ok ? C.green : C.red, boxShadow:`0 0 8px ${e.ok ? C.green : C.red}` }} />
 <div style={{ flex: 1 }}>
 <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{e.code}</div>
 <div style={{ color: C.muted, fontSize: 12, marginTop:2 }}>{e.label} • {e.status}</div>
 </div>
 <div style={{ color: C.muted, fontSize: 11, fontWeight:600 }}>{e.time}</div>
 </div>
 ))}
 </div>
 </GCard>

 {/* Stats Summary */}
 <GCard style={{ padding:'20px' }}>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
 {[
 { lbl: 'Success', val: log.filter(e=>e.ok).length, col: C.green },
 { lbl: 'Failed', val: log.filter(e=>!e.ok).length, col: C.red },
 { lbl: 'Total', val: log.length, col: C.gold }
 ].map(s => (
 <div key={s.lbl} style={{ textAlign: 'center', background:'var(--apex-bg-subtle)', padding:'12px', borderRadius:12, border:`1px solid ${C.border}` }}>
 <div style={{ color: s.col, fontSize: 24, fontWeight: 900 }}>{s.val}</div>
 <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing:1, marginTop:4, fontWeight:700 }}>{s.lbl}</div>
 </div>
 ))}
 </div>
 </GCard>
 </div>
 </div>

 {/* Requirements Section */}
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:24 }}>
 <GCard style={{ background: 'rgba(10,132,255,0.04)', border: `1px solid rgba(10,132,255,0.12)` }}>
 <h3 style={{ color: C.blue, fontSize: 15, margin: '0 0 16px', fontWeight:800 }}> Smart Setup Requirements</h3>
 <div style={{ display: 'grid', gap: 16 }}>
 {[
 { t: 'Digital Identity QR', d: 'Print student/staff cards via Cards Generator with QR enabled.', i: '' },
 { t: 'Biometric Integration', d: 'Not configured. Enable only after a verified hardware/provider adapter is connected.', i: '' },
 { t: 'Facial Recognition', d: 'Not configured. No face match can mark attendance until a verified server-side identity service is connected.', i: '' }
 ].map(r => (
 <div key={r.t} style={{ display:'flex', gap:12 }}>
 <span style={{ fontSize:18 }}>{r.i}</span>
 <div>
 <div style={{ color: 'var(--apex-text-primary)', fontSize: 13, fontWeight: 700 }}>{r.t}</div>
 <div style={{ color: C.muted, fontSize: 12, marginTop: 2, lineHeight:1.5 }}>{r.d}</div>
 </div>
 </div>
 ))}
 </div>
 </GCard>
 <GCard style={{ background: 'rgba(48,209,88,0.04)', border: `1px solid rgba(48,209,88,0.12)` }}>
 <h3 style={{ color: C.green, fontSize: 15, margin: '0 0 16px', fontWeight:800 }}> Daily Statistics Overview</h3>
 <div style={{ height: 100, display:'flex', alignItems:'flex-end', gap:8, paddingBottom:10 }}>
 {[60, 45, 80, 55, 90, 70, 85].map((h, i) => (
 <div key={i} style={{ flex:1, height: `${h}%`, background: `linear-gradient(to top, ${C.green}33, ${C.green})`, borderRadius:'4px 4px 0 0' }} />
 ))}
 </div>
 <div style={{ color:C.muted, fontSize:12, textAlign:'center', marginTop:10 }}>Attendance consistency over the last 7 days</div>
 </GCard>
 </div>
 </div>
 <style>{`
 @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
 @keyframes qr-scan { 0% { top: 0%; } 100% { top: 100%; } }
 @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
 .custom-scroll::-webkit-scrollbar { width: 4px; }
 .custom-scroll::-webkit-scrollbar-track { background: transparent; }
 .custom-scroll::-webkit-scrollbar-thumb { background: rgba(200,153,26,0.3); border-radius: 10px; }
 `}</style>
 </div>
 )
}

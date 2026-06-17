import { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import api from '../../services/api'
import { QrCode } from 'lucide-react'

const C = {
 bg: '#071e34', card: 'rgba(11,44,77,0.92)', gold: '#C8991A', goldL: '#e8b420',
 silver: '#C0C8D8', muted: '#8892A4', green: '#30D158', red: '#FF375F',
 blue: '#0A84FF', border: 'rgba(148,163,184,0.18)',
}

const GCard = ({ children, style = {} }) => (
 <div className="super-module-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, ...style }}>
 {children}
 </div>
)

export default function QRAttendance() {
 const videoRef = useRef(null)
 const canvasRef = useRef(null)
 const streamRef = useRef(null)
 const rafRef = useRef(null)
 const lastScan = useRef({}) // debounce: key → timestamp

 const [scanning, setScanning] = useState(false)
 const [type, setType] = useState('student') // 'student' | 'employee'
 const [log, setLog] = useState([])
 const [camError, setCamError] = useState('')
 const [manualId, setManualId] = useState('')
 const [manualStatus,setManualStatus]= useState('')

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
 } catch (err) {
 const msg = err.response?.data?.message || 'Not found'
 addLog({ time: new Date().toLocaleTimeString(), code, label: type === 'student' ? 'Student' : 'Employee', status: msg, ok: false })
 }
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
 setCamError('')
 try {
 const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
 streamRef.current = stream
 videoRef.current.srcObject = stream
 await videoRef.current.play()
 setScanning(true)
 rafRef.current = requestAnimationFrame(tick)
 } catch (err) {
 setCamError('Camera access denied or not available: ' + err.message)
 }
 }, [tick])

 const stopCamera = useCallback(() => {
 cancelAnimationFrame(rafRef.current)
 if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
 setScanning(false)
 }, [])

 useEffect(() => () => stopCamera(), [stopCamera])

 const handleManual = async () => {
 if (!manualId.trim()) return
 setManualStatus('Marking…')
 const code = manualId.trim()
 try {
 if (type === 'student') {
 await api.post('/api/attendance/mark-by-gr', { gr_number: code, status: 'present' })
 } else {
 await api.post('/api/attendance/employee/mark', { emp_id: code, status: 'present' })
 }
 addLog({ time: new Date().toLocaleTimeString(), code, label: type === 'student' ? 'Student' : 'Employee', status: 'present', ok: true })
 setManualStatus('Marked present!')
 } catch (err) {
 const msg = err.response?.data?.message || 'Not found'
 setManualStatus(msg)
 addLog({ time: new Date().toLocaleTimeString(), code, label: type === 'student' ? 'Student' : 'Employee', status: msg, ok: false })
 }
 setManualId('')
 setTimeout(() => setManualStatus(''), 3000)
 }

 return (
 <div className="super-module-card" style={{ minHeight: '100vh', background: C.bg, color: C.silver, padding: 24, fontFamily: 'Inter, sans-serif' }}>
 <div className="super-module-card" style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 22 }}>

 {/* Header */}
 <GCard style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
 <div className="super-module-card" style={{ width: 50, height: 50, borderRadius: 15, background: 'rgba(200,153,26,0.16)', border: `1px solid rgba(200,153,26,0.35)`, display: 'grid', placeItems: 'center', color: C.gold }}>
 <QrCode size={24} />
 </div>
 <div>
 <h1 style={{ margin: 0, fontSize: 24, color: '#fff', fontFamily: "'Playfair Display', serif", fontWeight: 800 }}>QR Attendance</h1>
 <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>Scan student or employee ID card QR codes to mark attendance instantly</p>
 </div>
 </GCard>

 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
 {/* Camera Panel */}
 <GCard>
 <div className="super-module-card" style={{ marginBottom: 16 }}>
 <div className="super-module-card" style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Scan Type</div>
 <div className="super-module-card" style={{ display: 'flex', gap: 4, background: 'rgba(7,30,52,0.5)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
 {[{id:'student',label:' Student'},{id:'employee',label:' Employee'}].map(t => (
 <button key={t.id} onClick={() => setType(t.id)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: type === t.id ? `linear-gradient(135deg,${C.gold},${C.goldL})` : 'transparent', color: type === t.id ? '#071e34' : C.muted, transition: 'all 0.15s' }}>{t.label}</button>
 ))}
 </div>
 </div>

 {/* Video */}
 <div className="super-module-card" style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: 14, aspectRatio: '4/3' }}>
 <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }} playsInline muted />
 <canvas ref={canvasRef} style={{ display: 'none' }} />
 {!scanning && (
 <div className="super-module-card" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: C.muted }}>
 <div className="super-module-card" style={{ fontSize: 48 }}></div>
 <div className="super-module-card" style={{ fontSize: 14 }}>Camera off</div>
 </div>
 )}
 {scanning && (
 <div className="super-module-card" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
 <div className="super-module-card" style={{ width: 160, height: 160, border: '2px solid #C8991A', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }}/>
 </div>
 )}
 </div>

 {camError && <div className="super-module-card" style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{camError}</div>}

 <div className="super-module-card" style={{ display: 'flex', gap: 10 }}>
 {!scanning
 ? <button onClick={startCamera} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.gold},${C.goldL})`, color: '#071e34', fontWeight: 600, cursor: 'pointer' }}> Start Scanner</button>
 : <button onClick={stopCamera} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: 'rgba(255,55,95,0.15)', color: C.red, border: `1px solid rgba(255,55,95,0.3)`, fontWeight: 600, cursor: 'pointer' }}> Stop Scanner</button>
 }
 </div>

 {/* Manual Entry */}
 <div className="super-module-card" style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
 <div className="super-module-card" style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Manual Entry</div>
 <div className="super-module-card" style={{ display: 'flex', gap: 8 }}>
 <input value={manualId} onChange={e => setManualId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManual()} placeholder={type === 'student' ? 'GR Number (e.g. GR-4005)' : 'Employee ID'} style={{ flex: 1, background: 'rgba(11,44,77,0.6)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.silver, padding: '10px 13px', fontSize: 13, outline: 'none' }}/>
 <button onClick={handleManual} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.gold},${C.goldL})`, color: '#071e34', fontWeight: 600, cursor: 'pointer' }}>Mark</button>
 </div>
 {manualStatus && <div className="super-module-card" style={{ color: manualStatus === 'Marked present!' ? C.green : C.red, fontSize: 12, marginTop: 8, fontWeight: 600 }}>{manualStatus}</div>}
 </div>
 </GCard>

 {/* Attendance Log */}
 <GCard style={{ display: 'flex', flexDirection: 'column' }}>
 <div className="super-module-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
 <div className="super-module-card" style={{ color: C.gold, fontWeight: 800, fontSize: 15 }}>Attendance Log</div>
 {log.length > 0 && <button onClick={() => setLog([])} style={{ fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>}
 </div>
 {log.length === 0
 ? <div className="super-module-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13, textAlign: 'center' }}>Scan a QR code or use manual entry<br/>to record attendance</div>
 : <div className="super-module-card" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
 {log.map((e, i) => (
 <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: e.ok ? 'rgba(48,209,88,0.08)' : 'rgba(255,55,95,0.08)', border: `1px solid ${e.ok ? 'rgba(48,209,88,0.2)' : 'rgba(255,55,95,0.2)'}` }}>
 <div className="super-module-card" style={{ fontSize: 18 }}>{e.ok ? '' : ''}</div>
 <div className="super-module-card" style={{ flex: 1, minWidth: 0 }}>
 <div className="super-module-card" style={{ color: e.ok ? C.green : C.red, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.code}</div>
 <div className="super-module-card" style={{ color: C.muted, fontSize: 11 }}>{e.label} · {e.status}</div>
 </div>
 <div className="super-module-card" style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>{e.time}</div>
 </div>
 ))}
 </div>
 }
 <div className="super-module-card" style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 16 }}>
 <div className="super-module-card" style={{ textAlign: 'center' }}>
 <div className="super-module-card" style={{ color: C.green, fontSize: 22, fontWeight: 900 }}>{log.filter(e => e.ok).length}</div>
 <div className="super-module-card" style={{ color: C.muted, fontSize: 11 }}>Marked</div>
 </div>
 <div className="super-module-card" style={{ textAlign: 'center' }}>
 <div className="super-module-card" style={{ color: C.red, fontSize: 22, fontWeight: 900 }}>{log.filter(e => !e.ok).length}</div>
 <div className="super-module-card" style={{ color: C.muted, fontSize: 11 }}>Failed</div>
 </div>
 <div className="super-module-card" style={{ textAlign: 'center' }}>
 <div className="super-module-card" style={{ color: C.gold, fontSize: 22, fontWeight: 900 }}>{log.length}</div>
 <div className="super-module-card" style={{ color: C.muted, fontSize: 11 }}>Total</div>
 </div>
 </div>
 </GCard>
 </div>

 {/* How it works */}
 <GCard style={{ background: 'rgba(10,132,255,0.06)', border: `1px solid rgba(10,132,255,0.2)` }}>
 <div className="super-module-card" style={{ color: C.blue, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>ℹ How QR Attendance Works</div>
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
 {[
 ['1. Print ID Cards', 'Generate student or employee ID cards from the Cards Generator. Each card has a unique QR code.'],
 ['2. Scan QR Code', 'Open this page, select Student or Employee, start the camera and hold the QR code in front of it.'],
 ['3. Instant Mark', 'Attendance is recorded via API. The log shows success/failure for each scan in real time.'],
 ].map(([title, desc]) => (
 <div key={title}>
 <div className="super-module-card" style={{ color: C.silver, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{title}</div>
 <div className="super-module-card" style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>{desc}</div>
 </div>
 ))}
 </div>
 </GCard>

 </div>
 </div>
 )
}

import { useState, useMemo } from 'react'
import Portal from '../../components/Portal'
import api from '../../services/api'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import { useAcademicStore } from '../../services/useAcademicStore'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from '../moduleStyles'
import { printChallan } from '../fees/ViewChallans'
import PhotoUploadAI from '../../components/PhotoUploadAI'

// Removed hardcoded CLASSES and SECTIONS
const FEE_HEADS = ['Monthly Fee', 'Exam Fee', 'Registration Fee', 'Library Fee', 'Transport Fee']
const DEFAULT_AMOUNTS = { 'Monthly Fee': 1500, 'Exam Fee': 500, 'Registration Fee': 1000, 'Library Fee': 200, 'Transport Fee': 800 }
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const blank = { name: '', father_name: '', mother_name: '', father_cnic: '', father_occupation: '', locality: '', studentClass: 'Starter', section: 'Blue', date_of_birth: '', parent_phone: '', parent_whatsapp: '', b_form_number: '', blood_group: '', religion: '', previous_school: '', gender: 'male', address: '', photo: null }

function printAdmissionForm(student, school) {
 const sn = school.schoolName || 'Al Siddique Scholars Public School'
 const su = school.schoolUrdu || 'الصدیق اسکالرز پبلک اسکول'
 const sa = school.address || 'Sharif Chowk, Rayya Khas, Narowal'
 const sl = school.logo || ''
 const showUrdu = school.showUrduHeader !== false

 const logoHtml = sl
 ? `<img src="${sl}" style="height:85px;object-fit:contain;display:block;margin:0 auto 8px">`
 : `<div style="width:80px;height:80px;border-radius:50%;border:3px solid #071e34;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:28px;color:#071e34;background:#fff">A</div>`

 const html = `
 <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admission Form - ${student.name}</title>
 <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
 <style>
 body{margin:0;padding:40px;font-family:Arial,sans-serif;color:#000;line-height:1.6}
 .card{max-width:800px;margin:0 auto;border:2px solid #071e34;padding:30px;position:relative;min-height:270mm}
 .header{text-align:center;margin-bottom:30px;border-bottom:3px double #071e34;padding-bottom:15px}
 .photo-box{position:absolute;right:30px;top:140px;width:120px;height:150px;border:1px solid #000;display:flex;align-items:center;justify-content:center;font-size:12px;background:#f9f9f9}
 h1{margin:10px 0 5px;font-size:24px;text-transform:uppercase;color:#071e34}
 .urdu{font-family:'Noto Nastaliq Urdu',serif;font-size:20px;direction:rtl;margin-bottom:8px}
 .form-title{background:#071e34;color:#fff;padding:8px;text-align:center;font-weight:bold;font-size:18px;margin-bottom:30px;letter-spacing:2px}
 .section{margin-bottom:25px}
 .section-title{border-bottom:1px solid #071e34;font-weight:bold;margin-bottom:15px;color:#071e34;text-transform:uppercase;font-size:14px}
 .row{display:flex;gap:20px;margin-bottom:15px}
 .field{flex:1;border-bottom:1px solid #ddd;padding-bottom:4px}
 .field label{font-size:11px;color:#666;display:block;font-weight:bold;text-transform:uppercase}
 .field span{font-size:15px;font-weight:bold;color:#000}
 .footer{margin-top:50px;display:flex;justify-content:space-between}
 .sig{width:200px;text-align:center;border-top:1px solid #000;padding-top:8px;font-size:13px;font-weight:bold}
 </style></head><body>
 <div class="card">
 <div class="header">
 ${logoHtml}
 ${showUrdu ? `<div class="urdu">${su}</div>` : ''}
 <h1>${sn}</h1>
 <div style="font-size:12px;color:#444">${sa}</div>
 </div>
 
 <div class="form-title">STUDENT ADMISSION FORM</div>
 
 <div class="photo-box">
 ${student.photo ? `<img src="${student.photo}" style="width:100%;height:100%;object-fit:cover">` : 'Passport Size Photo'}
 </div>

 <div class="section">
 <div class="section-title">Student Information</div>
 <div class="row">
 <div class="field"><label>Full Name</label><span>${student.name}</span></div>
 <div class="field" style="max-width:200px"><label>GR Number</label><span>${student.gr_number}</span></div>
 </div>
 <div class="row">
 <div class="field"><label>Father / Guardian Name</label><span>${student.father_name}</span></div>
 <div class="field"><label>Date of Birth</label><span>${student.date_of_birth || '—'}</span></div>
 </div>
 <div class="row">
 <div class="field"><label>Class Admitted</label><span>${student.class}</span></div>
 <div class="field"><label>Section</label><span>${student.section || '—'}</span></div>
 <div class="field"><label>Gender</label><span>${student.gender}</span></div>
 </div>
 </div>

 <div class="section">
 <div class="section-title">Contact & Address</div>
 <div class="row">
 <div class="field"><label>Parent Phone</label><span>${student.parent_phone}</span></div>
 <div class="field"><label>Address</label><span>${student.address || '—'}</span></div>
 </div>
 </div>

 <div class="section" style="margin-top:40px">
 <div class="section-title">Declaration</div>
 <p style="font-size:12px;color:#333;text-align:justify">
 I hereby declare that the information provided above is correct to the best of my knowledge. 
 I agree to abide by the rules and regulations of the institution as mentioned in the school policy. 
 I understand that the admission is subject to the verification of documents and clearance of dues.
 </p>
 </div>

 <div class="footer">
 <div class="sig">Parent / Guardian Signature</div>
 <div class="sig">Principal / Office Incharge</div>
 </div>

 </div>
 <script>window.onload=()=>window.print()</script>
 </body></html>
 `
 const w = window.open('', '_blank', 'width=900,height=800')
 w.document.write(html)
 w.document.close()
}

export default function AdmissionsModule() {
 const { classNames, sectionsForClass, localities } = useAcademicStore()
 const { paperSettings } = usePaperStore()
 const safeClassNames = Array.isArray(classNames) && classNames.length ? classNames : ['Starter']
 const safeLocalities = Array.isArray(localities) ? localities : []
 const safeSectionsForClass = (className) => {
 const sections = sectionsForClass(className)
 return Array.isArray(sections) ? sections : []
 }
 const [activeTab, setActiveTab] = useState('form') // 'form' | 'applications'
 const [step, setStep] = useState('form') // 'form' | 'fee' | 'done'
 const [form, setForm] = useState(blank)
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')
 const [admitted, setAdmitted] = useState(null)

 // Fee setup state
 const [feeMonth, setFeeMonth] = useState(MONTHS[new Date().getMonth()])
 const [feeYear, setFeeYear] = useState(String(new Date().getFullYear()))
 const [feeDueDate, setFeeDueDate] = useState('')
 const [feeSelected, setFeeSelected] = useState(FEE_HEADS.reduce((a,h)=>({...a,[h]:true}),{}))
 const [feeAmounts, setFeeAmounts] = useState({...DEFAULT_AMOUNTS})
 const [feeDiscount, setFeeDiscount] = useState(0)
 const [feeSaving, setFeeSaving] = useState(false)
 const [feeError, setFeeError] = useState('')

 const [policyOpen, setPolicyOpen] = useState(false)

 // Website applications state
 const [applications, setApplications] = useState([])
 const [appsLoading, setAppsLoading] = useState(false)
 const [appsFilter, setAppsFilter] = useState('pending')
 const [appsError, setAppsError] = useState('')
 const [actionLoading, setActionLoading] = useState(null)
 const [actionMsg, setActionMsg] = useState('')
 const [sendCredentials, setSendCredentials] = useState(true)
 const [generatedCredentials, setGeneratedCredentials] = useState(null)

 const selectedSections = safeSectionsForClass(form.studentClass)
 const safeSectionNames = selectedSections.length ? selectedSections : ['Blue']

 async function fetchApplications(status) {
 const s = status || appsFilter
 setAppsLoading(true); setAppsError('')
 try {
 const res = await api.get(`/api/admissions${s !== 'all' ? `?status=${s}` : ''}`)
 setApplications(res.data.data || [])
 } catch (err) {
 setAppsError(err.response?.data?.message || 'Failed to load applications')
 } finally { setAppsLoading(false) }
 }

 function switchToApplications() {
 setActiveTab('applications')
 fetchApplications('pending')
 setAppsFilter('pending')
 }

 async function approveApplication(id) {
 setActionLoading(id + '_approve'); setActionMsg(''); setGeneratedCredentials(null);
 try {
 const res = await api.post(`/api/admissions/${id}/approve`, { send_credentials: sendCredentials })
 setActionMsg(` ${res.data.message}`)
 if (res.data.credentials) setGeneratedCredentials(res.data.credentials);
 fetchApplications()
 } catch (err) {
 setActionMsg(' ' + (err.response?.data?.message || 'Approve failed'))
 } finally { setActionLoading(null) }
 }

 async function rejectApplication(id) {
 setActionLoading(id + '_reject'); setActionMsg('')
 try {
 await api.put(`/api/admissions/${id}/status`, { status: 'rejected' })
 setActionMsg('Application rejected.')
 fetchApplications()
 } catch (err) {
 setActionMsg(' ' + (err.response?.data?.message || 'Reject failed'))
 } finally { setActionLoading(null) }
 }

 async function restoreApplication(id) {
 setActionLoading(id + '_restore'); setActionMsg('')
 try {
 await api.put(`/api/admissions/${id}/status`, { status: 'pending' })
 fetchApplications()
 } catch (err) {
 setActionMsg(' ' + (err.response?.data?.message || 'Restore failed'))
 } finally { setActionLoading(null) }
 }

 const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

 const feeTotal = useMemo(() => {
 const sub = FEE_HEADS.reduce((sum,h) => feeSelected[h] ? sum + Number(feeAmounts[h]||0) : sum, 0)
 return Math.max(0, sub - Number(feeDiscount||0))
 }, [feeAmounts, feeSelected, feeDiscount])

 async function handleSubmitAdmission(e) {
 e.preventDefault()
 setLoading(true)
 setError('')
 try {
 const res = await api.post('/api/students', {
 name: form.name, father_name: form.father_name,
 mother_name: form.mother_name, father_cnic: form.father_cnic,
 father_occupation: form.father_occupation, locality: form.locality,
 class: form.studentClass, section: form.section,
 date_of_birth: form.date_of_birth || null,
 parent_phone: form.parent_phone, parent_whatsapp: form.parent_whatsapp,
 b_form_number: form.b_form_number, blood_group: form.blood_group, religion: form.religion, previous_school: form.previous_school,
 gender: form.gender, address: form.address,
 gr_number: `GR-${Math.floor(1000 + Math.random() * 9000)}`,
 photo: form.photo || null,
 send_credentials: sendCredentials
 })
 const s = res.data.data
 setAdmitted(s)
 if (res.data.credentials) setGeneratedCredentials(res.data.credentials);
 setStep('fee')
 } catch (err) {
 setError(err.response?.data?.message || 'Admission failed. Try again.')
 } finally { setLoading(false) }
 }

 async function handleCreateChallan() {
  if (!admitted) return
  setFeeSaving(true)
  setFeeError('')
  try {
  await api.post('/api/fees', {
  student_id: admitted.id,
  month: feeMonth, year: Number(feeYear),
  amount: feeTotal,
  due_date: feeDueDate || null,
  })
  const challanToPrint = {
  id: admitted.id,
  challan_no: admitted.gr_number || `CH-${Math.floor(100000 + Math.random() * 900000)}`,
  student_id: admitted.id,
  name: admitted.name,
  father_name: admitted.father_name,
  gr_number: admitted.gr_number,
  class: admitted.class,
  section: admitted.section,
  month: feeMonth,
  year: Number(feeYear),
  amount: feeSelected['Monthly Fee'] ? (feeAmounts['Monthly Fee'] || 0) : 0,
  discount: Number(feeDiscount || 0),
  admission_fee: feeSelected['Registration Fee'] ? (feeAmounts['Registration Fee'] || 0) : 0,
  other_fee: (feeSelected['Exam Fee'] ? (feeAmounts['Exam Fee'] || 0) : 0) +
             (feeSelected['Library Fee'] ? (feeAmounts['Library Fee'] || 0) : 0) +
             (feeSelected['Transport Fee'] ? (feeAmounts['Transport Fee'] || 0) : 0),
  prev_month_fee: 0,
  status: 'unpaid',
  due_date: feeDueDate || null
  }
  const school = {
  name: paperSettings?.schoolName,
  urdu: paperSettings?.schoolUrdu,
  address: paperSettings?.address,
  phone: paperSettings?.phone,
  logo: paperSettings?.logo,
  showUrduHeader: paperSettings?.showUrduHeader,
  }
  printChallan(challanToPrint, school, 1, 3)
  setStep('done')
  } catch (err) {
  setFeeError(err.response?.data?.message || 'Failed to create challan.')
  } finally { setFeeSaving(false) }
  }

 function skipChallan() { setStep('done') }
 function resetAll() { setStep('form'); setForm(blank); setAdmitted(null); setError(''); setFeeError(''); setGeneratedCredentials(null); }

 return (
 <div style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver }}>
 <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 22 }}>

 {/* Policy Modal */}
 {policyOpen && (
 <Portal>
 <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:9999,
 display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
 <div className="super-module-card" style={{ ...card, maxWidth:560, width:'100%', display:'flex', flexDirection:'column', gap:16, borderRadius: 22 }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
 <h3 style={{ color:C.gold, margin:0, fontSize:18 }}> Admissions Policy</h3>
 <button onClick={()=>setPolicyOpen(false)} style={{ background:'none', border:'none', color:C.silver, fontSize:20, cursor:'pointer' }}></button>
 </div>
 <div style={{ color:C.silver, lineHeight:1.9, fontSize:14 }}>
 <p><strong style={{color:C.gold}}>1. Eligibility:</strong> Students must meet the age criteria for the class applied.</p>
 <p><strong style={{color:C.gold}}>2. Documents Required:</strong> Birth certificate, B-form / CNIC copy, previous school reports (if applicable).</p>
 <p><strong style={{color:C.gold}}>3. Registration Fee:</strong> Non-refundable registration fee must be paid at the time of admission.</p>
 <p><strong style={{color:C.gold}}>4. GR Number:</strong> A unique GR number is auto-generated upon successful admission.</p>
 <p><strong style={{color:C.gold}}>5. Parent Contact:</strong> A valid parent/guardian phone number is mandatory for all communications.</p>
 <p><strong style={{color:C.gold}}>6. Fee Challan:</strong> Monthly fee challan must be cleared by the 10th of each month.</p>
 </div>
 <button onClick={()=>setPolicyOpen(false)} style={btnPrimary}>Close</button>
 </div>
 </div>
 </Portal>
 )}

 {/* Header */}
 <div className="super-module-card" style={{ ...card, display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:16, borderRadius: 22 }}>
 <div>
 <h1 style={sectionHeader}>Student Admissions</h1>
 <p style={{ color:C.muted, marginTop:8 }}>Register new students or review website applications.</p>
 </div>
 <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
 {/* Tab switcher */}
 {[{id:'form',label:' New Admission'},{id:'applications',label:' Website Applications'}].map(tab=>(
 <button key={tab.id} onClick={()=> tab.id==='applications' ? switchToApplications() : setActiveTab('form')}
 style={{ padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
 background: activeTab===tab.id ? `linear-gradient(135deg,${C.gold},#e8b420)` : 'rgba(11,44,77,0.92)',
 color: activeTab===tab.id ? '#071e34' : C.muted }}>
 {tab.label}
 </button>
 ))}
 {activeTab === 'form' && ['form','fee','done'].map((s,i)=>(
 <div key={s} style={{ display:'flex', alignItems:'center', gap:6 }}>
 {i>0 && <span style={{ color:C.border }}>›</span>}
 <span style={{
 padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:700,
 background: step===s ? `linear-gradient(135deg,${C.gold},#e8b420)` : step>s ? 'rgba(48,209,88,0.15)' : 'rgba(11,44,77,0.92)',
 color: step===s ? '#071e34' : step>s ? C.green : C.muted,
 }}>{i===0?'1. Admission':i===1?'2. Fee Setup':'3. Done'}</span>
 </div>
 ))}
 <button onClick={()=>setPolicyOpen(true)} style={btnSecondary}> Policy</button>
 </div>
 </div>

 {/*  WEBSITE APPLICATIONS TAB  */}
 {activeTab === 'applications' && (
 <div className="super-module-card" style={{ ...card, display:'grid', gap:20, borderRadius: 22 }}>
 {/* Filter bar */}
 <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
 <span style={{ color:C.gold, fontWeight:700, fontSize:15 }}> Online Admission Applications</span>
 
 <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.silver, fontSize: 13, cursor: 'pointer', marginLeft: 20 }}>
   <input type="checkbox" checked={sendCredentials} onChange={(e) => setSendCredentials(e.target.checked)} />
   Auto-Send Super App Credentials
 </label>

 <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
 {['pending','approved','rejected','all'].map(f=>(
 <button key={f} onClick={()=>{ setAppsFilter(f); fetchApplications(f) }}
 style={{ padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
 background: appsFilter===f ? `linear-gradient(135deg,${C.gold},#e8b420)` : 'rgba(11,44,77,0.92)',
 color: appsFilter===f ? '#071e34' : C.muted, textTransform:'capitalize' }}>
 {f}
 </button>
 ))}
 <button onClick={()=>fetchApplications()} style={btnSecondary}> Refresh</button>
 </div>
 </div>

 {/* Action message */}
 {actionMsg && (
 <div style={{ padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:700,
 background: actionMsg.startsWith(' ') ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)',
 color: actionMsg.startsWith(' ') ? C.green : C.red, border:`1px solid ${actionMsg.startsWith(' ') ? 'rgba(48,209,88,0.3)' : 'rgba(255,69,58,0.3)'}` }}>
 {actionMsg}
 </div>
 )}

 {generatedCredentials && (
    <div style={{ background: 'rgba(200,153,26,0.1)', border: `1px solid ${C.gold}`, borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: C.gold, margin: '0 0 12px 0', fontSize: 16 }}>🔑 Super App Login Credentials Generated</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {generatedCredentials.parent && (
          <div style={{ background: 'rgba(7,30,52,0.6)', padding: 12, borderRadius: 8 }}>
            <strong style={{ color: C.silver, display: 'block', marginBottom: 4 }}>Parent Portal</strong>
            <div style={{ fontSize: 13, color: C.muted }}>Email: <span style={{ color: '#fff' }}>{generatedCredentials.parent.email}</span></div>
            <div style={{ fontSize: 13, color: C.muted }}>Password: <span style={{ color: '#fff' }}>{generatedCredentials.parent.password}</span></div>
          </div>
        )}
        {generatedCredentials.student && (
          <div style={{ background: 'rgba(7,30,52,0.6)', padding: 12, borderRadius: 8 }}>
            <strong style={{ color: C.silver, display: 'block', marginBottom: 4 }}>Student Portal</strong>
            <div style={{ fontSize: 13, color: C.muted }}>Email: <span style={{ color: '#fff' }}>{generatedCredentials.student.email}</span></div>
            <div style={{ fontSize: 13, color: C.muted }}>Password: <span style={{ color: '#fff' }}>{generatedCredentials.student.password}</span></div>
          </div>
        )}
      </div>
    </div>
 )}

 {/* Loading */}
 {appsLoading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading applications…</div>}
 {appsError && <div style={{ color:C.red, fontWeight:700 }}>{appsError}</div>}

 {/* Table */}
 {!appsLoading && !appsError && (
 applications.length === 0
 ? <div style={{ textAlign:'center', padding:40, color:C.muted }}>No {appsFilter === 'all' ? '' : appsFilter} applications found.</div>
 : <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
 <thead>
 <tr style={{ borderBottom:`1px solid rgba(200,153,26,0.2)` }}>
 {['#','Student Name','Father Name','Class','Phone','WhatsApp','Date','Status','Actions'].map(h=>(
 <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:C.gold, fontWeight:700, whiteSpace:'nowrap' }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {applications.map((app, idx) => {
 const statusColor = app.status==='approved' ? C.green : app.status==='rejected' ? C.red : C.gold
 const isActing = actionLoading && actionLoading.startsWith(String(app.id))
 return (
 <tr key={app.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.15s' }}
 onMouseEnter={e=>e.currentTarget.style.background='rgba(200,153,26,0.05)'}
 onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
 <td style={{ padding:'10px 12px', color:C.muted }}>{idx+1}</td>
 <td style={{ padding:'10px 12px', color:C.silver, fontWeight:600 }}>{app.student_name}</td>
 <td style={{ padding:'10px 12px', color:C.muted }}>{app.father_name || '—'}</td>
 <td style={{ padding:'10px 12px', color:C.silver }}>{app.class_applying}</td>
 <td style={{ padding:'10px 12px', color:C.muted }}>{app.parent_phone}</td>
 <td style={{ padding:'10px 12px', color:C.muted }}>{app.whatsapp_number || '—'}</td>
 <td style={{ padding:'10px 12px', color:C.muted, whiteSpace:'nowrap' }}>
 {new Date(app.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
 </td>
 <td style={{ padding:'10px 12px' }}>
 <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
 background:`${statusColor}22`, color:statusColor, border:`1px solid ${statusColor}55`, textTransform:'capitalize' }}>
 {app.status}
 </span>
 </td>
 <td style={{ padding:'10px 12px' }}>
 <div style={{ display:'flex', gap:6, flexWrap:'nowrap' }}>
 {app.status === 'pending' && <>
 <button disabled={!!isActing} onClick={()=>approveApplication(app.id)}
 style={{ padding:'4px 12px', borderRadius:8, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
 background:'rgba(48,209,88,0.18)', color:C.green, opacity:isActing?0.5:1 }}>
 {actionLoading===`${app.id}_approve` ? '…' : ' Approve'}
 </button>
 <button disabled={!!isActing} onClick={()=>rejectApplication(app.id)}
 style={{ padding:'4px 12px', borderRadius:8, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
 background:'rgba(255,69,58,0.18)', color:C.red, opacity:isActing?0.5:1 }}>
 {actionLoading===`${app.id}_reject` ? '…' : ' Reject'}
 </button>
 </>}
 {app.status === 'rejected' && (
 <button disabled={!!isActing} onClick={()=>restoreApplication(app.id)}
 style={{ padding:'4px 12px', borderRadius:8, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
 background:'rgba(200,153,26,0.18)', color:C.gold, opacity:isActing?0.5:1 }}>
 {actionLoading===`${app.id}_restore` ? '…' : ' Restore'}
 </button>
 )}
 {app.status === 'approved' && (
 <span style={{ color:C.muted, fontSize:12 }}>Enrolled</span>
 )}
 </div>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 )}

 {/*  STEP 1: ADMISSION FORM  */}
 {activeTab === 'form' && step === 'form' && (
 <form className="super-module-card" onSubmit={handleSubmitAdmission} style={{ ...card, display:'grid', gap:20, borderRadius: 22 }}>

 {/* Photo upload section */}
 <div style={{ display:'flex', gap:24, padding:'16px 18px', background:'rgba(7,30,52,0.35)', borderRadius:14, border:'1px solid rgba(200,153,26,0.12)', alignItems:'flex-start' }}>
 <PhotoUploadAI
 value={form.photo}
 onChange={v => setForm(f => ({ ...f, photo: v }))}
 size={110}
 label="Student Photo"
 />
 <div style={{ flex:1, paddingTop:4 }}>
 <div style={{ color:C.gold, fontSize:13, fontWeight:800, marginBottom:6 }}>Official School Photo</div>
 <div style={{ color:C.muted, fontSize:12, lineHeight:1.8 }}>
 Upload the student's photo for their school record and ID card.<br/>
 Click <span style={{color:'#0D9488',fontWeight:700}}> AI Apply School Uniform</span> to automatically dress the student in the official school coat — the result is ID-card ready.
 </div>
 </div>
 </div>

 <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:20 }}>
 <div>
 <label style={labelStyle}>Student Full Name *</label>
 <input style={input} value={form.name} onChange={set('name')} placeholder="e.g. Ahmed Ali" required />
 </div>
 <div>
 <label style={labelStyle}>Student B-Form / CNIC</label>
 <input style={input} value={form.b_form_number} onChange={set('b_form_number')} placeholder="XXXXX-XXXXXXX-X" maxLength={15} />
 </div>
 <div>
 <label style={labelStyle}>Father / Guardian Name *</label>
 <input style={input} value={form.father_name} onChange={set('father_name')} placeholder="e.g. Muhammad Riaz" required />
 </div>
 <div>
 <label style={labelStyle}>Father CNIC</label>
 <input style={input} value={form.father_cnic} onChange={set('father_cnic')} placeholder="XXXXX-XXXXXXX-X" maxLength={15} />
 </div>
 <div>
 <label style={labelStyle}>Mother Name</label>
 <input style={input} value={form.mother_name} onChange={set('mother_name')} placeholder="e.g. Fatima Bibi" />
 </div>
 <div>
 <label style={labelStyle}>Father Occupation (Optional)</label>
 <input style={input} value={form.father_occupation} onChange={set('father_occupation')} placeholder="e.g. Business" />
 </div>
 <div>
 <label style={labelStyle}>Locality / Town</label>
 <select style={select} value={form.locality} onChange={set('locality')}>
 <option value="">-- Select Locality --</option>
 {safeLocalities.map(loc=><option key={loc} value={loc}>{loc}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Class *</label>
 <select style={select} value={form.studentClass} onChange={e => {
 const nextClass = e.target.value
 const nextSections = safeSectionsForClass(nextClass)
 setForm(prev => ({ ...prev, studentClass: nextClass, section: nextSections[0] || 'Blue' }))
 }}>
 {safeClassNames.map(v=><option key={v} value={v}>{v}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Section</label>
 <select style={select} value={form.section} onChange={set('section')}>
 {safeSectionNames.map(v=><option key={v} value={v}>{v}</option>)}
 </select>
 </div>
 <div style={{ gridColumn: '1 / -1' }}>
 <label style={labelStyle}>Previous School (Optional)</label>
 <input style={input} value={form.previous_school} onChange={set('previous_school')} placeholder="e.g. Allied School" />
 </div>
 <div>
 <label style={labelStyle}>Date of Birth</label>
 <input type="date" style={input} value={form.date_of_birth} onChange={set('date_of_birth')} />
 </div>
 <div>
 <label style={labelStyle}>Gender</label>
 <select style={select} value={form.gender} onChange={set('gender')}>
 <option value="male">Male</option>
 <option value="female">Female</option>
 </select>
 </div>
 <div>
 <label style={labelStyle}>Blood Group</label>
 <select style={select} value={form.blood_group} onChange={set('blood_group')}>
 <option value="">-- Select --</option>
 <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
 <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
 </select>
 </div>
 <div>
 <label style={labelStyle}>Religion</label>
 <input style={input} value={form.religion} onChange={set('religion')} placeholder="e.g. Islam" />
 </div>
 <div>
 <label style={labelStyle}>Parent Phone *</label>
 <input style={input} value={form.parent_phone} onChange={set('parent_phone')} placeholder="03XXXXXXXXX" required />
 </div>
 <div>
 <label style={labelStyle}>Parent WhatsApp</label>
 <input style={input} value={form.parent_whatsapp} onChange={set('parent_whatsapp')} placeholder="03XXXXXXXXX" />
 </div>
 <div>
 <label style={labelStyle}>Address</label>
 <input style={input} value={form.address} onChange={set('address')} placeholder="Home address" />
 </div>
 </div>
 <div style={{ display:'flex', gap:12, alignItems:'center', marginTop: 10 }}>
 <button type="submit" style={btnPrimary} disabled={loading}>
 {loading ? 'Submitting…' : ' Submit Admission →'}
 </button>
 <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.silver, fontSize: 13, cursor: 'pointer', marginLeft: 10 }}>
   <input type="checkbox" checked={sendCredentials} onChange={(e) => setSendCredentials(e.target.checked)} />
   Auto-Send Super App Credentials via WhatsApp
 </label>
 {error && <span style={{ color:C.red, fontWeight:700 }}>{error}</span>}
 </div>
 </form>
 )}

 {/*  STEP 2: FEE SETUP  */}
 {activeTab === 'form' && step === 'fee' && admitted && (
 <div className="super-module-card" style={{ ...card, display:'grid', gap:20, borderRadius: 22 }}>
 <div style={{ background:'rgba(48,209,88,0.1)', border:'1px solid rgba(48,209,88,0.3)', borderRadius:10, padding:'12px 18px', color:C.green, fontWeight:700 }}>
  Admission successful! <span style={{color:C.silver,fontWeight:400}}>
 {admitted.name} — GR: <strong>{admitted.gr_number}</strong> | {form.studentClass} — {form.section}
 </span>
 </div>

 <h3 style={{ color:C.gold, margin:0, fontSize:16 }}> Set Fee & Create Challan</h3>

 <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
 <div>
 <label style={labelStyle}>Month</label>
 <select style={select} value={feeMonth} onChange={e=>setFeeMonth(e.target.value)}>
 {MONTHS.map(m=><option key={m}>{m}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Year</label>
 <select style={select} value={feeYear} onChange={e=>setFeeYear(e.target.value)}>
 {['2024','2025','2026','2027'].map(y=><option key={y}>{y}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Due Date</label>
 <input type="date" style={input} value={feeDueDate} onChange={e=>setFeeDueDate(e.target.value)} />
 </div>
 </div>

 <div style={{ display:'grid', gap:12 }}>
 {FEE_HEADS.map(head=>(
 <div key={head} style={{ display:'grid', gridTemplateColumns:'1fr 200px', gap:12, alignItems:'center' }}>
 <label style={{ display:'flex', alignItems:'center', gap:10, color:C.silver, fontWeight:700, cursor:'pointer' }}>
 <input type="checkbox" checked={feeSelected[head]}
 onChange={()=>setFeeSelected(p=>({...p,[head]:!p[head]}))} />
 {head}
 </label>
 <input style={{...input, opacity:feeSelected[head]?1:0.4}} type="number"
 value={feeAmounts[head]} disabled={!feeSelected[head]}
 onChange={e=>setFeeAmounts(p=>({...p,[head]:Number(e.target.value)}))} />
 </div>
 ))}
 </div>

 <div style={{ display:'grid', gridTemplateColumns:'1fr 180px', gap:16, alignItems:'center' }}>
 <div>
 <label style={labelStyle}>Discount (Rs.)</label>
 <input style={input} type="number" value={feeDiscount} onChange={e=>setFeeDiscount(e.target.value)} />
 </div>
 <div>
 <div style={{ color:C.muted, fontSize:13 }}>Total</div>
 <div style={{ color:C.gold, fontSize:28, fontWeight:800 }}>Rs. {feeTotal.toLocaleString()}</div>
 </div>
 </div>

 <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
 <button style={btnPrimary} onClick={handleCreateChallan} disabled={feeSaving}>
 {feeSaving ? 'Creating…' : ' Create & Print Challan'}
 </button>
 <button style={btnSecondary} onClick={skipChallan}>Skip for now</button>
 {feeError && <span style={{ color:C.red, fontWeight:700 }}>{feeError}</span>}
 </div>
 </div>
 )}

 {/*  STEP 3: DONE  */}
 {activeTab === 'form' && step === 'done' && (
 <div className="super-module-card" style={{ ...card, padding:40 }}>
 <div style={{ display:'flex', gap:28, alignItems:'center', flexWrap:'wrap' }}>
 {/* Student photo preview */}
 {form.photo ? (
 <img src={form.photo} alt={admitted?.name} style={{ width:110, height:138, objectFit:'cover', borderRadius:14, border:'3px solid rgba(48,209,88,0.4)', flexShrink:0, boxShadow:'0 6px 24px rgba(0,0,0,0.4)' }} />
 ) : (
 <div style={{ width:110, height:138, borderRadius:14, background:'rgba(48,209,88,0.08)', border:'2px dashed rgba(48,209,88,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:52, flexShrink:0 }}></div>
 )}
 <div style={{ flex:1 }}>
 <h2 style={{ color:C.green, fontSize:22, fontWeight:800, margin:'0 0 8px' }}>Admission Complete!</h2>
 <p style={{ color:C.muted, margin:'0 0 6px' }}>
 <strong style={{color:C.silver}}>{admitted?.name}</strong> has been successfully admitted.
 </p>
 <p style={{ color:C.muted, margin:'0 0 20px', fontSize:13 }}>
 GR Number: <strong style={{color:C.gold}}>{admitted?.gr_number}</strong> &nbsp;|&nbsp;
 {admitted?.class} — Section {admitted?.section}
 </p>

 {generatedCredentials && (
    <div style={{ background: 'rgba(200,153,26,0.1)', border: `1px solid ${C.gold}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <h3 style={{ color: C.gold, margin: '0 0 12px 0', fontSize: 15 }}>🔑 Super App Credentials</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {generatedCredentials.parent && (
          <div>
            <strong style={{ color: C.silver, display: 'block', marginBottom: 4, fontSize: 13 }}>Parent Portal</strong>
            <div style={{ fontSize: 12, color: C.muted }}>Email: <span style={{ color: '#fff' }}>{generatedCredentials.parent.email}</span></div>
            <div style={{ fontSize: 12, color: C.muted }}>Password: <span style={{ color: '#fff' }}>{generatedCredentials.parent.password}</span></div>
          </div>
        )}
        {generatedCredentials.student && (
          <div>
            <strong style={{ color: C.silver, display: 'block', marginBottom: 4, fontSize: 13 }}>Student Portal</strong>
            <div style={{ fontSize: 12, color: C.muted }}>Email: <span style={{ color: '#fff' }}>{generatedCredentials.student.email}</span></div>
            <div style={{ fontSize: 12, color: C.muted }}>Password: <span style={{ color: '#fff' }}>{generatedCredentials.student.password}</span></div>
          </div>
        )}
      </div>
    </div>
 )}

 <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
 <button style={btnPrimary} onClick={resetAll}> Add Another Student</button>
 <button style={btnSecondary} onClick={() => printAdmissionForm(admitted, paperSettings)}> Print Admission Form</button>
 <button style={btnSecondary} onClick={() => { setStep('fee'); setFeeError('') }}> Create Challan</button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Admissions Checklist */}
 {activeTab === 'form' && step === 'form' && (
 <div className="super-module-card" style={{ ...card, borderRadius: 22 }}>
 <h2 style={{ color:C.gold, margin:0, marginBottom:14, fontSize:18 }}>Admissions Checklist</h2>
 <ul style={{ color:C.silver, lineHeight:1.8, paddingLeft:20, margin:0 }}>
 <li>Collect admission form, medical information and guardian contact.</li>
 <li>Assign class and section using available seats.</li>
 <li>Generate GR number and admission voucher instantly.</li>
 <li>Send welcome SMS once admission is confirmed.</li>
 </ul>
 </div>
 )}
 </div>
 </div>
 )
}

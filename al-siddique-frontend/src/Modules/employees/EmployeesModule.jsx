import { useState, useEffect, useMemo } from 'react'
import Portal from '../../components/Portal'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { DonutChart, BarChart, ChartLegend } from '../../components/Charts'
import { useUserStore } from '../../services/useUserStore'
import { PERMISSION_GROUPS, ALL_PERMISSIONS, DEFAULT_TEACHER_PERMISSIONS } from '../../services/permissions'
import { BadgeCheck, BriefcaseBusiness, Clock3, Percent, UserCheck, Users, VenusAndMars, Wallet } from 'lucide-react'

const DEFAULT_DESIGNATIONS = ['Principal','Vice Principal','Teacher','Subject Teacher','PTI','Librarian','Clerk','Accountant','IT Staff','Peon','Security Guard','Driver','Sweeper','Cook']
const DEFAULT_SUBJECTS = ['Mathematics','English','Urdu','Science','Social Studies','Islamiyat','Computer Science','Arts','Physical Education','Library','Administration','N/A']

const DESIG_KEY = 'al_siddique_designations'
const SUBJECT_KEY = 'al_siddique_emp_subjects'

function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}

const loadList = (key, def) => {
 try {
 const raw = getStorage()?.getItem(key)
 if (!raw) return def
 const parsed = JSON.parse(raw)
 return Array.isArray(parsed) ? parsed.filter(Boolean) : def
 } catch {
 return def
 }
}
const persistList = (key, list) => {
 const storage = getStorage()
 try { storage?.setItem(key, JSON.stringify(list)) } catch {}
}
const emptyToNull = value => value === '' ? null : value
const cleanEmployeePayload = (form) => {
 const payload = { ...form, is_active: form.status === 'Active', salary: Number(form.salary) || 0 }
 ;['dob', 'join_date', 'probation_end'].forEach(field => {
 payload[field] = emptyToNull(payload[field])
 })
 return payload
}
const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-']
const RELIGIONS = ['Islam','Christianity','Hinduism','Other']
const PROVINCES = ['Punjab','Sindh','KPK','Balochistan','Gilgit-Baltistan','AJK','ICT']
const EDU_LEVELS = ['Matric','Intermediate','Diploma','B.Ed','Bachelor','Master','M.Phil','PhD']
const BANKS = ['HBL','UBL','MCB','NBP','ABL','Bank Alfalah','Meezan Bank','Faysal Bank','JS Bank','Standard Chartered','Other']
const CONTRACT_TYPES= ['Permanent','Contract','Part-time','Probation','Intern']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const APP_MODULES = [
 { key:'students', label:'Students Module', icon:'users' },
 { key:'fees', label:'Fees & Challans', icon:'card' },
 { key:'attendance', label:'Attendance', icon:'calendar' },
 { key:'employees', label:'Employee Management', icon:'briefcase' },
 { key:'academic', label:'Academic Setup', icon:'book' },
 { key:'reports', label:'Reports & Analytics', icon:'chart' },
 { key:'certificates', label:'Certificates', icon:'award' },
 { key:'paper_gen', label:'Paper Generator', icon:'paper' },
 { key:'settings', label:'Settings', icon:'settings' },
]

const SALARY_RECORDS = []

const EMPTY_FORM = {
 name:'', father_name:'', gender:'Male', dob:'', blood_group:'', religion:'Islam',
 photo:'',
 cnic:'', marital_status:'Single', nationality:'Pakistani',
 phone:'', alt_phone:'', email:'',
 address_street:'', address_city:'', address_tehsil:'', address_district:'', address_province:'Punjab',
 emergency_name:'', emergency_relation:'', emergency_phone:'', emergency_address:'',
 emp_id:'', designation:'', department:'', subject:'', contract_type:'Permanent',
 join_date: new Date().toISOString().split('T')[0], probation_end:'', salary:'',
 highest_education:'', degree_title:'', institution:'', graduation_year:'',
 experience_years:'0', previous_employer:'', previous_role:'',
 bank_name:'', account_number:'', account_title:'', iban:'', branch_name:'',
 app_access:[], status:'Active',
}

const transformEmployee = (e) => ({
 id: e.id, emp_id: e.emp_id || '',
 name: e.name || '', father_name: e.father_name || '',
 photo: e.photo || e.image || e.profile_photo || e.profilePhoto || e.profileImage || e.profile_image || e.photo_url || e.photoUrl || e.image_url || e.imageUrl || e.employee_photo || e.employeePhoto || e.staff_photo || e.staffPhoto || '',
 gender: e.gender || '', dob: e.dob ? e.dob.split('T')[0] : '',
 blood_group: e.blood_group || '', religion: e.religion || 'Islam',
 cnic: e.cnic || '', marital_status: e.marital_status || '', nationality: e.nationality || 'Pakistani',
 phone: e.phone || '', alt_phone: e.alt_phone || '', email: e.email || '',
 address_street: e.address_street || '', address_city: e.address_city || '',
 address_tehsil: e.address_tehsil || '', address_district: e.address_district || '',
 address_province: e.address_province || '',
 emergency_name: e.emergency_name || '', emergency_relation: e.emergency_relation || '',
 emergency_phone: e.emergency_phone || '', emergency_address: e.emergency_address || '',
 designation: e.designation || '', department: e.department || '',
 subject: e.subject || '', contract_type: e.contract_type || '',
 join_date: e.join_date ? e.join_date.split('T')[0] : '',
 probation_end: e.probation_end ? e.probation_end.split('T')[0] : '',
 salary: Number(e.salary) || 0,
 highest_education: e.highest_education || '', degree_title: e.degree_title || '',
 institution: e.institution || '', graduation_year: e.graduation_year || '',
 experience_years: e.experience_years || '', previous_employer: e.previous_employer || '',
 previous_role: e.previous_role || '',
 bank_name: e.bank_name || '', account_number: e.account_number || '',
 account_title: e.account_title || '', iban: e.iban || '', branch_name: e.branch_name || '',
 app_access: Array.isArray(e.app_access) ? e.app_access : [],
 user_id: e.user_id || null,
 portal_username: e.portal_username || '',
 portal_password: e.portal_password || '',
 portal_role: e.portal_role || 'teacher',
 portal_permissions: Array.isArray(e.portal_permissions) ? e.portal_permissions : [],
 portal_active: e.portal_active !== undefined ? Boolean(e.portal_active) : true,
 status: e.is_active !== undefined ? (e.is_active ? 'Active' : 'Inactive') : (e.status || 'Active'),
})

//  Color palette 
const C = {
 card:'rgba(11,44,77,0.92)', gold:'#C8991A', goldL:'#e8b420',
 silver:'#C0C8D8', muted:'#8892A4', green:'#30D158', red:'#FF375F',
 orange:'#FF9F0A', blue:'#0A84FF', border:'rgba(148,163,184,0.18)',
}

//  Small UI pieces 
const GCard = ({ children, style={} }) => (
 <div className="super-module-card" style={{ background:C.card, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:`1px solid ${C.border}`, borderRadius:20, padding:24, boxShadow:'0 22px 50px rgba(0,0,0,0.32)', position:'relative', overflow:'hidden', ...style }}>
 {children}
 </div>
)

const TabBtn = ({ active, onClick, children }) => (
 <button onClick={onClick} style={{
 background: active ? `linear-gradient(135deg,${C.gold},${C.goldL})` : 'rgba(15,23,42,0.46)',
 color: active ? '#071e34' : C.silver, fontWeight:700, fontSize:14,
 padding:'11px 22px', borderRadius:14, border: active ? 'none' : `1px solid ${C.border}`,
 cursor:'pointer', transition:'all 0.18s',
 }}>{children}</button>
)

const Lbl = ({ children }) => (
 <label style={{ color:C.muted, fontSize:12, fontWeight:600, display:'block', marginBottom:6, letterSpacing:'0.06em' }}>{children}</label>
)

const Inp = ({ style={}, ...props }) => (
 <input {...props} style={{ width:'100%', background:'rgba(11,44,77,0.6)', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'10px 13px', fontSize:14, outline:'none', boxSizing:'border-box', ...style }} />
)

const Sel = ({ style={}, children, ...props }) => (
 <select {...props} style={{ width:'100%', background:'rgba(11,44,77,0.6)', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'10px 13px', fontSize:14, outline:'none', cursor:'pointer', boxSizing:'border-box', ...style }}>
 {children}
 </select>
)

const StatusBadge = ({ status }) => {
 const map = {
 Active: { icon:'✓', color:C.green, bg:'rgba(48,209,88,0.16)' },
 Inactive:{ icon:'×', color:C.red, bg:'rgba(255,55,95,0.16)' },
 Paid: { icon:'✓', color:C.green, bg:'rgba(48,209,88,0.16)' },
 Pending: { icon:'…', color:C.orange, bg:'rgba(255,159,10,0.16)' },
 Present: { icon:'✓', color:C.green, bg:'rgba(48,209,88,0.16)' },
 Absent: { icon:'×', color:C.red, bg:'rgba(255,55,95,0.16)' },
 Leave: { icon:'!', color:C.orange, bg:'rgba(255,159,10,0.16)' },
 }[status] || { icon:'i', color:C.muted, bg:'rgba(255,255,255,0.08)' }
 return (
 <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:map.bg, color:map.color, padding:'5px 11px', borderRadius:20, fontWeight:700, fontSize:12 }}>
 {map.icon} {status}
 </span>
 )
}

const StatCard = ({ icon, label, value, color }) => (
 <GCard style={{ display:'flex', alignItems:'center', gap:16, padding:'20px 22px', background:`linear-gradient(145deg, ${color}18, rgba(11,44,77,0.96) 48%, rgba(7,30,52,0.98))`, border:`1px solid ${color}35`, borderRadius:22, boxShadow:`0 18px 42px rgba(0,0,0,0.22), 0 0 28px ${color}12` }}>
 <div className="super-module-card" style={{ width:50, height:50, borderRadius:16, background:`linear-gradient(135deg, ${color}2e, rgba(255,255,255,0.045))`, border:`1px solid ${color}55`, display:'grid', placeItems:'center', color, flexShrink:0, boxShadow:`0 12px 24px ${color}18` }}>{icon}</div>
 <div>
 <div className="super-module-card" style={{ color, fontSize:24, fontWeight:850, letterSpacing:-0.3 }}>{value}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:12, marginTop:4, fontWeight:650 }}>{label}</div>
 </div>
 </GCard>
)

const SDiv = ({ icon, title }) => (
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:8, margin:'6px 0 14px', paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>
 <span style={{ fontSize:16 }}>{icon}</span>
 <span style={{ color:C.gold, fontWeight:700, fontSize:12, letterSpacing:'0.06em', textTransform:'uppercase' }}>{title}</span>
 </div>
)

//  Employee Form Modal (Add / Edit) 
function EmployeeFormModal({ isOpen, onClose, onSave, initialData, designations, subjects }) {
 const [tab, setTab] = useState(0)
 const [form, setForm] = useState(EMPTY_FORM)

 useEffect(() => {
 if (isOpen) { setForm(initialData ? { ...EMPTY_FORM, ...initialData } : { ...EMPTY_FORM }); setTab(0) }
 }, [isOpen, initialData])

 const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
 const loadPhoto = (file) => {
 if (!file || !file.type?.startsWith('image/')) return
 const reader = new FileReader()
 reader.onload = () => set('photo', reader.result || '')
 reader.readAsDataURL(file)
 }
 const toggleAccess = (k) => setForm(p => ({
 ...p, app_access: p.app_access.includes(k) ? p.app_access.filter(x => x !== k) : [...p.app_access, k]
 }))

 if (!isOpen) return null

 const TABS = [
 { icon:'ID', label:'Personal' },
 { icon:'PIN', label:'Address' },
 { icon:'JOB', label:'Employment' },
 { icon:'EDU', label:'Education' },
 { icon:'BANK', label:'Bank' },
 { icon:'APP', label:'App Access' },
 ]

 return (
 <Portal>
 <div className="super-module-card" style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(7,30,52,0.97)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
 <GCard style={{ width:'100%', maxWidth:820, maxHeight:'93vh', display:'flex', flexDirection:'column', padding:0, overflow:'hidden' }}>

 {/* Header */}
 <div className="super-module-card" style={{ padding:'18px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
 <h2 style={{ color:C.gold, fontSize:19, margin:0, fontFamily:"'Playfair Display',serif" }}>
 {initialData ? 'Edit Employee' : 'Add New Employee'}
 </h2>
 <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, background:'rgba(255,55,95,0.15)', border:`1px solid rgba(255,55,95,0.3)`, color:C.red, cursor:'pointer', fontSize:18 }}>×</button>
 </div>

 {/* Tab bar */}
 <div className="super-module-card" style={{ display:'flex', gap:4, padding:'10px 24px', borderBottom:`1px solid ${C.border}`, flexShrink:0, flexWrap:'wrap' }}>
 {TABS.map((t, i) => (
 <button key={i} onClick={() => setTab(i)} style={{
 padding:'7px 14px', borderRadius:9, border:'none', cursor:'pointer', fontWeight:700, fontSize:12, transition:'all 0.14s',
 background: tab === i ? `linear-gradient(135deg,${C.gold},${C.goldL})` : 'rgba(11,44,77,0.92)',
 color: tab === i ? '#071e34' : C.muted,
 }}>{t.icon} {t.label}</button>
 ))}
 </div>

 {/* Scrollable content */}
 <div className="super-module-card" style={{ flex:1, overflowY:'auto', padding:'22px 24px' }}>

 {/*  Tab 0: Personal  */}
 {tab === 0 && (
 <div className="super-module-card" style={{ display:'grid', gap:14 }}>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'92px 1fr', gap:16, alignItems:'center', padding:'14px', border:`1px solid ${C.border}`, borderRadius:14, background:'rgba(7,30,52,0.34)' }}>
 <div className="super-module-card" style={{ width:86, height:102, borderRadius:14, overflow:'hidden', border:`1px solid ${form.photo ? C.gold : C.border}`, background:'rgba(15,23,42,0.7)', display:'flex', alignItems:'center', justifyContent:'center', color:C.gold, fontWeight:900, fontSize:24 }}>
 {form.photo
 ? <img src={form.photo} alt="Employee" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
 : (form.name || 'ID').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'ID'
 }
 </div>
 <div>
 <Lbl>Employee Photo</Lbl>
 <input
 type="file"
 accept="image/*"
 onChange={e=>loadPhoto(e.target.files?.[0])}
 style={{ width:'100%', background:'rgba(11,44,77,0.6)', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'10px 13px', fontSize:13, outline:'none', boxSizing:'border-box' }}
 />
 <div style={{ display:'flex', gap:8, marginTop:8 }}>
 <Inp value={form.photo} onChange={e=>set('photo', e.target.value)} placeholder="or paste image URL / /uploads/photo.jpg" style={{ fontSize:12, padding:'8px 10px' }} />
 {form.photo && (
 <button type="button" onClick={()=>set('photo','')} style={{ border:`1px solid rgba(255,55,95,0.32)`, background:'rgba(255,55,95,0.1)', color:C.red, borderRadius:9, padding:'0 12px', fontWeight: 600, cursor:'pointer' }}>
 Remove
 </button>
 )}
 </div>
 </div>
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
 <div><Lbl>Full Name *</Lbl><Inp value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Muhammad Ali" /></div>
 <div><Lbl>Father / Husband Name</Lbl><Inp value={form.father_name} onChange={e=>set('father_name',e.target.value)} placeholder="Muhammad Ibrahim" /></div>
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
 <div><Lbl>Gender</Lbl>
 <Sel value={form.gender} onChange={e=>set('gender',e.target.value)}>
 <option value="">Select</option>{['Male','Female'].map(v=><option key={v}>{v}</option>)}
 </Sel>
 </div>
 <div><Lbl>Date of Birth</Lbl><Inp type="date" value={form.dob} onChange={e=>set('dob',e.target.value)} /></div>
 <div><Lbl>Blood Group</Lbl>
 <Sel value={form.blood_group} onChange={e=>set('blood_group',e.target.value)}>
 <option value="">Select</option>{BLOOD_GROUPS.map(v=><option key={v}>{v}</option>)}
 </Sel>
 </div>
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
 <div><Lbl>Religion</Lbl>
 <Sel value={form.religion} onChange={e=>set('religion',e.target.value)}>
 {RELIGIONS.map(v=><option key={v}>{v}</option>)}
 </Sel>
 </div>
 <div><Lbl>Marital Status</Lbl>
 <Sel value={form.marital_status} onChange={e=>set('marital_status',e.target.value)}>
 <option value="">Select</option>{['Single','Married','Divorced','Widowed'].map(v=><option key={v}>{v}</option>)}
 </Sel>
 </div>
 <div><Lbl>Nationality</Lbl><Inp value={form.nationality} onChange={e=>set('nationality',e.target.value)} placeholder="Pakistani" /></div>
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
 <div><Lbl>CNIC Number</Lbl><Inp value={form.cnic} onChange={e=>set('cnic',e.target.value)} placeholder="12345-1234567-1" maxLength={15} /></div>
 <div><Lbl>Employment Status</Lbl>
 <Sel value={form.status} onChange={e=>set('status',e.target.value)}>
 {['Active','Inactive'].map(v=><option key={v}>{v}</option>)}
 </Sel>
 </div>
 </div>
 </div>
 )}

 {/*  Tab 1: Address & Contact  */}
 {tab === 1 && (
 <div className="super-module-card" style={{ display:'grid', gap:14 }}>
 <SDiv icon="" title="Contact Information" />
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
 <div><Lbl>Phone Number *</Lbl><Inp value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="0300-1234567" /></div>
 <div><Lbl>Alternate Phone</Lbl><Inp value={form.alt_phone} onChange={e=>set('alt_phone',e.target.value)} placeholder="0321-0000000" /></div>
 <div><Lbl>Email Address</Lbl><Inp type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="name@email.com" /></div>
 </div>

 <SDiv icon="" title="Residential Address" />
 <div><Lbl>Street / House No. / Mohallah</Lbl><Inp value={form.address_street} onChange={e=>set('address_street',e.target.value)} placeholder="House #45, Street 7, Mohallah..." /></div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
 <div><Lbl>City</Lbl><Inp value={form.address_city} onChange={e=>set('address_city',e.target.value)} placeholder="Lahore" /></div>
 <div><Lbl>Tehsil</Lbl><Inp value={form.address_tehsil} onChange={e=>set('address_tehsil',e.target.value)} placeholder="Model Town" /></div>
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
 <div><Lbl>District</Lbl><Inp value={form.address_district} onChange={e=>set('address_district',e.target.value)} placeholder="Lahore" /></div>
 <div><Lbl>Province</Lbl>
 <Sel value={form.address_province} onChange={e=>set('address_province',e.target.value)}>
 {PROVINCES.map(v=><option key={v}>{v}</option>)}
 </Sel>
 </div>
 </div>

 <SDiv icon="" title="Emergency Contact" />
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
 <div><Lbl>Contact Name</Lbl><Inp value={form.emergency_name} onChange={e=>set('emergency_name',e.target.value)} placeholder="Contact person name" /></div>
 <div><Lbl>Relation</Lbl><Inp value={form.emergency_relation} onChange={e=>set('emergency_relation',e.target.value)} placeholder="Father / Brother / Wife" /></div>
 <div><Lbl>Phone</Lbl><Inp value={form.emergency_phone} onChange={e=>set('emergency_phone',e.target.value)} placeholder="0300-0000000" /></div>
 </div>
 <div><Lbl>Emergency Contact Address (if different)</Lbl><Inp value={form.emergency_address} onChange={e=>set('emergency_address',e.target.value)} placeholder="Emergency contact address" /></div>
 </div>
 )}

 {/*  Tab 2: Employment  */}
 {tab === 2 && (
 <div className="super-module-card" style={{ display:'grid', gap:14 }}>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
 <div><Lbl>Employee ID</Lbl><Inp value={form.emp_id} onChange={e=>set('emp_id',e.target.value)} placeholder="EMP-001" /></div>
 <div><Lbl>Designation *</Lbl>
 <Sel value={form.designation} onChange={e=>set('designation',e.target.value)}>
 <option value="">Select Designation</option>{designations.map(d=><option key={d}>{d}</option>)}
 </Sel>
 </div>
 <div><Lbl>Department</Lbl><Inp value={form.department} onChange={e=>set('department',e.target.value)} placeholder="e.g. Science Dept." /></div>
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
 <div><Lbl>Subject / Specialization</Lbl>
 <Sel value={form.subject} onChange={e=>set('subject',e.target.value)}>
 <option value="">Select Subject</option>{subjects.map(s=><option key={s}>{s}</option>)}
 </Sel>
 </div>
 <div><Lbl>Contract Type</Lbl>
 <Sel value={form.contract_type} onChange={e=>set('contract_type',e.target.value)}>
 {CONTRACT_TYPES.map(v=><option key={v}>{v}</option>)}
 </Sel>
 </div>
 <div><Lbl>Status</Lbl>
 <Sel value={form.status} onChange={e=>set('status',e.target.value)}>
 {['Active','Inactive'].map(v=><option key={v}>{v}</option>)}
 </Sel>
 </div>
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
 <div><Lbl>Joining Date *</Lbl><Inp type="date" value={form.join_date} onChange={e=>set('join_date',e.target.value)} /></div>
 <div><Lbl>Probation End Date</Lbl><Inp type="date" value={form.probation_end} onChange={e=>set('probation_end',e.target.value)} /></div>
 <div><Lbl>Monthly Salary (Rs) *</Lbl><Inp type="number" value={form.salary} onChange={e=>set('salary',e.target.value)} placeholder="35000" min="0" /></div>
 </div>
 </div>
 )}

 {/*  Tab 3: Education & Experience  */}
 {tab === 3 && (
 <div className="super-module-card" style={{ display:'grid', gap:14 }}>
 <SDiv icon="" title="Educational Qualification" />
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
 <div><Lbl>Highest Education Level</Lbl>
 <Sel value={form.highest_education} onChange={e=>set('highest_education',e.target.value)}>
 <option value="">Select Level</option>{EDU_LEVELS.map(v=><option key={v}>{v}</option>)}
 </Sel>
 </div>
 <div><Lbl>Degree / Certificate Title</Lbl><Inp value={form.degree_title} onChange={e=>set('degree_title',e.target.value)} placeholder="e.g. B.Sc Mathematics" /></div>
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
 <div><Lbl>Institution / University</Lbl><Inp value={form.institution} onChange={e=>set('institution',e.target.value)} placeholder="University of Punjab" /></div>
 <div><Lbl>Graduation Year</Lbl><Inp type="number" value={form.graduation_year} onChange={e=>set('graduation_year',e.target.value)} placeholder="2018" min="1950" max="2030" /></div>
 </div>

 <SDiv icon="" title="Work Experience" />
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
 <div><Lbl>Total Experience (Years)</Lbl><Inp type="number" value={form.experience_years} onChange={e=>set('experience_years',e.target.value)} placeholder="5" min="0" /></div>
 <div><Lbl>Previous Employer</Lbl><Inp value={form.previous_employer} onChange={e=>set('previous_employer',e.target.value)} placeholder="Previous school / org name" /></div>
 <div><Lbl>Previous Role</Lbl><Inp value={form.previous_role} onChange={e=>set('previous_role',e.target.value)} placeholder="Previous position title" /></div>
 </div>
 </div>
 )}

 {/*  Tab 4: Bank Details  */}
 {tab === 4 && (
 <div className="super-module-card" style={{ display:'grid', gap:14 }}>
 <SDiv icon="" title="Salary Bank Account" />
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
 <div><Lbl>Bank Name</Lbl>
 <Sel value={form.bank_name} onChange={e=>set('bank_name',e.target.value)}>
 <option value="">Select Bank</option>{BANKS.map(v=><option key={v}>{v}</option>)}
 </Sel>
 </div>
 <div><Lbl>Account Number</Lbl><Inp value={form.account_number} onChange={e=>set('account_number',e.target.value)} placeholder="0000000000000000" /></div>
 </div>
 <div><Lbl>Account Title (Full Name on Account)</Lbl><Inp value={form.account_title} onChange={e=>set('account_title',e.target.value)} placeholder="Account holder full name" /></div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
 <div><Lbl>IBAN</Lbl><Inp value={form.iban} onChange={e=>set('iban',e.target.value)} placeholder="PK00XXXX0000000000000000" /></div>
 <div><Lbl>Branch Name / Code</Lbl><Inp value={form.branch_name} onChange={e=>set('branch_name',e.target.value)} placeholder="Main Branch, Lahore" /></div>
 </div>
 </div>
 )}

 {/*  Tab 5: App Access  */}
 {tab === 5 && (
 <div className="super-module-card" style={{ display:'grid', gap:14 }}>
 <SDiv icon="" title="Software & App Access Control" />
 <p style={{ color:C.muted, fontSize:13, margin:'0 0 8px' }}>Select which modules this employee can access in the system.</p>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
 {APP_MODULES.map(mod => {
 const checked = form.app_access.includes(mod.key)
 return (
 <label key={mod.key} style={{
 display:'flex', alignItems:'center', gap:10, padding:'13px 14px', borderRadius:11, cursor:'pointer',
 background: checked ? 'rgba(200,153,26,0.13)' : 'rgba(15,23,42,0.46)',
 border:`1px solid ${checked ? C.gold : C.border}`, transition:'all 0.14s',
 }}>
 <input type="checkbox" checked={checked} onChange={()=>toggleAccess(mod.key)} style={{ width:15, height:15, accentColor:C.gold }} />
 <span style={{ fontSize:17 }}>{mod.icon}</span>
 <span style={{ color: checked ? C.gold : C.silver, fontWeight:600, fontSize:12 }}>{mod.label}</span>
 </label>
 )
 })}
 </div>

 <div className="super-module-card" style={{ marginTop:10 }}>
 <p style={{ color:C.muted, fontSize:12, marginBottom:8 }}>Quick Presets:</p>
 <div className="super-module-card" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
 {[
 { label:'Teacher', keys:['students','attendance','certificates','paper_gen'] },
 { label:'Admin/Clerk',keys:['students','fees','attendance','certificates','paper_gen'] },
 { label:'Accounts', keys:['fees','reports','students'] },
 { label:'Full Access',keys:APP_MODULES.map(m=>m.key) },
 { label:'Clear All', keys:[] },
 ].map(p => (
 <button key={p.label} type="button"
 onClick={() => setForm(prev => ({ ...prev, app_access: p.keys }))}
 style={{ padding:'6px 13px', borderRadius:8, border:`1px solid ${C.border}`, background:'rgba(11,44,77,0.92)', color:C.silver, cursor:'pointer', fontSize:12, fontWeight:600 }}>
 {p.label}
 </button>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="super-module-card" style={{ padding:'14px 24px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
 <div className="super-module-card" style={{ display:'flex', gap:8 }}>
 <button onClick={() => setTab(t => Math.max(0, t-1))} disabled={tab===0} style={{
 padding:'9px 16px', borderRadius:9, border:`1px solid ${C.border}`,
 background:'rgba(11,44,77,0.92)', color: tab===0 ? C.muted : C.silver, cursor: tab===0 ? 'default':'pointer', fontWeight:600,
 }}>← Back</button>
 {tab < 5 && <button onClick={() => setTab(t => t+1)} style={{ padding:'9px 16px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', cursor:'pointer', fontWeight: 600 }}>Next →</button>}
 </div>
 <div className="super-module-card" style={{ display:'flex', gap:10 }}>
 <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, background:'rgba(255,55,95,0.12)', border:`1px solid rgba(255,55,95,0.3)`, color:C.red, cursor:'pointer', fontWeight:600 }}>Cancel</button>
 <button onClick={() => {
 if (!form.name || !form.designation || !form.phone) { alert('Required: Full Name, Designation, Phone'); return }
 onSave(form)
 }} style={{ padding:'9px 22px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', cursor:'pointer', fontWeight:700 }}>
  {initialData ? 'Update Employee' : 'Add Employee'}
 </button>
 </div>
 </div>
 </GCard>
 </div>
 </Portal>
 )
}

//  Employee Profile Modal (View) 
function EmployeeProfileModal({ employee, onClose, onEdit }) {
 if (!employee) return null

 const Row = ({ label, value }) => !value ? null : (
 <div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:11, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
 <div className="super-module-card" style={{ color:C.silver, fontWeight:600, fontSize:14 }}>{value}</div>
 </div>
 )

 const Section = ({ icon, title, cols=3, children }) => (
 <div className="super-module-card" style={{ marginBottom:24 }}>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
 <span>{icon}</span>
 <span style={{ color:C.gold, fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:'0.06em' }}>{title}</span>
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:16 }}>{children}</div>
 </div>
 )

 const fullAddress = [employee.address_street, employee.address_city, employee.address_tehsil, employee.address_district, employee.address_province].filter(Boolean).join(', ')

 return (
 <Portal>
 <div className="super-module-card" style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(7,30,52,0.97)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
 <GCard style={{ width:'100%', maxWidth:920, maxHeight:'93vh', display:'flex', flexDirection:'column', padding:0, overflow:'hidden' }}>

 {/* Profile header */}
 <div className="super-module-card" style={{ padding:'20px 28px', background:'linear-gradient(135deg,rgba(200,153,26,0.14),rgba(7,30,52,0.5))', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:16 }}>
 <div className="super-module-card" style={{ width:62, height:62, borderRadius:18, background:'linear-gradient(135deg,#C8991A,#8a6610)', display:'flex', alignItems:'center', justifyContent:'center', color:'#071e34', fontWeight:900, fontSize:26, border:`2px solid ${C.gold}` }}>
 {employee.name.charAt(0)}
 </div>
 <div>
 <h2 style={{ color:'#fff', fontSize:22, margin:0, fontFamily:"'Playfair Display',serif" }}>{employee.name}</h2>
 <div className="super-module-card" style={{ color:C.gold, fontSize:13, marginTop:4 }}>{employee.designation}{employee.department ? ` · ${employee.department}` : ''}</div>
 {employee.emp_id && <div className="super-module-card" style={{ color:C.muted, fontSize:12, marginTop:2 }}>ID: {employee.emp_id}</div>}
 </div>
 </div>
 <div className="super-module-card" style={{ display:'flex', gap:10, alignItems:'center' }}>
 <StatusBadge status={employee.status} />
 <button onClick={() => onEdit(employee)} style={{ padding:'8px 16px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', cursor:'pointer', fontWeight: 600, fontSize:13 }}> Edit</button>
 <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, background:'rgba(255,55,95,0.15)', border:`1px solid rgba(255,55,95,0.3)`, color:C.red, cursor:'pointer', fontSize:18 }}>×</button>
 </div>
 </div>

 {/* Content */}
 <div className="super-module-card" style={{ flex:1, overflowY:'auto', padding:28 }}>
 <Section icon="" title="Personal Information" cols={3}>
 <Row label="Father / Husband" value={employee.father_name} />
 <Row label="Gender" value={employee.gender} />
 <Row label="Date of Birth" value={employee.dob} />
 <Row label="CNIC" value={employee.cnic} />
 <Row label="Blood Group" value={employee.blood_group} />
 <Row label="Religion" value={employee.religion} />
 <Row label="Marital Status" value={employee.marital_status} />
 <Row label="Nationality" value={employee.nationality} />
 </Section>

 <Section icon="" title="Contact & Address" cols={3}>
 <Row label="Phone" value={employee.phone} />
 <Row label="Alternate Phone"value={employee.alt_phone} />
 <Row label="Email" value={employee.email} />
 {fullAddress && (
 <div className="super-module-card" style={{ gridColumn:'1 / -1' }}>
 <div className="super-module-card" style={{ color:C.muted, fontSize:11, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>Address</div>
 <div className="super-module-card" style={{ color:C.silver, fontWeight:600 }}>{fullAddress}</div>
 </div>
 )}
 </Section>

 {(employee.emergency_name || employee.emergency_phone) && (
 <Section icon="" title="Emergency Contact" cols={3}>
 <Row label="Name" value={employee.emergency_name} />
 <Row label="Relation" value={employee.emergency_relation} />
 <Row label="Phone" value={employee.emergency_phone} />
 {employee.emergency_address && <div className="super-module-card" style={{ gridColumn:'1 / -1' }}><Row label="Address" value={employee.emergency_address} /></div>}
 </Section>
 )}

 <Section icon="" title="Employment Details" cols={3}>
 <Row label="Employee ID" value={employee.emp_id} />
 <Row label="Designation" value={employee.designation} />
 <Row label="Department" value={employee.department} />
 <Row label="Subject" value={employee.subject} />
 <Row label="Contract Type" value={employee.contract_type} />
 <Row label="Joining Date" value={employee.join_date} />
 <Row label="Probation End" value={employee.probation_end} />
 <Row label="Monthly Salary" value={employee.salary ? `Rs. ${Number(employee.salary).toLocaleString()}` : null} />
 </Section>

 {(employee.highest_education || employee.previous_employer) && (
 <Section icon="" title="Education & Experience" cols={3}>
 <Row label="Highest Education" value={employee.highest_education} />
 <Row label="Degree Title" value={employee.degree_title} />
 <Row label="Institution" value={employee.institution} />
 <Row label="Graduation Year" value={employee.graduation_year} />
 <Row label="Experience (Years)" value={employee.experience_years} />
 <Row label="Previous Employer" value={employee.previous_employer} />
 <Row label="Previous Role" value={employee.previous_role} />
 </Section>
 )}

 {(employee.bank_name || employee.account_number) && (
 <Section icon="" title="Bank Details" cols={3}>
 <Row label="Bank" value={employee.bank_name} />
 <Row label="Account Number" value={employee.account_number} />
 <Row label="Account Title" value={employee.account_title} />
 <Row label="IBAN" value={employee.iban} />
 <Row label="Branch" value={employee.branch_name} />
 </Section>
 )}

 {employee.app_access && employee.app_access.length > 0 && (
 <div>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
 <span></span>
 <span style={{ color:C.gold, fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:'0.06em' }}>App Access</span>
 </div>
 <div className="super-module-card" style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
 {APP_MODULES.filter(m => employee.app_access.includes(m.key)).map(m => (
 <span key={m.key} style={{ padding:'6px 14px', borderRadius:20, background:'rgba(200,153,26,0.12)', border:`1px solid rgba(200,153,26,0.3)`, color:C.gold, fontWeight:600, fontSize:12 }}>
 {m.icon} {m.label}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>
 </GCard>
 </div>
 </Portal>
 )
}

//  Directory Tab 
function DirectoryTab({ employees, search, setSearch, designationFilter, setDesignationFilter, totalSalary, activeEmployees, onAdd, onView, onEdit, onDelete, designations }) {
  const userRaw = localStorage.getItem('al_siddique_user')
  let isDemo = false
  try {
    if (userRaw) {
      const userObj = JSON.parse(userRaw)
      isDemo = userObj?.email === 'demo@assps.edu.pk'
    }
  } catch (e) {}
 const workforceStats = useMemo(() => {
 const males = employees.filter(e => e.gender === 'Male').length
 const females = employees.length - males
 const mPct = employees.length > 0 ? Math.round((males / employees.length) * 100) : 0
 return { males, females, mPct }
 }, [employees])

 return (
 <div className="super-module-card" style={{ display:'grid', gap:24 }}>
 {/* Workforce Dashboard */}
 <div className="super-module-card" style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:20 }}>
 <GCard>
 <div className="super-module-card" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
 <h3 style={{ color:"#C8991A", fontSize:16, fontWeight:800, margin:0 }}> Gender Ratio</h3>
 <span style={{ fontSize:10, color:C.muted }}>WORKFORCE</span>
 </div>
 {(() => {
 const { mPct, males, females } = workforceStats
 const fPct = 100 - mPct
 const r = 45, circ = Math.PI * r
 return (
 <div className="super-module-card" style={{ display:"flex", justifyContent:"space-around", alignItems:"center" }}>
 <div className="super-module-card" style={{ textAlign:'center' }}>
 <svg width="100" height="60" viewBox="0 0 100 60">
 <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
 <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke={C.blue} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${circ * mPct / 100} ${circ}`} />
 <text x="50" y="45" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="900">{mPct}%</text>
 </svg>
 <div className="super-module-card" style={{ color:C.blue, fontSize:11, fontWeight:700 }}>Male Staff</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:9 }}>{males} Employees</div>
 </div>
 <div className="super-module-card" style={{ textAlign:'center' }}>
 <svg width="100" height="60" viewBox="0 0 100 60">
 <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
 <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke={C.red} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${circ * fPct / 100} ${circ}`} />
 <text x="50" y="45" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="900">{fPct}%</text>
 </svg>
 <div className="super-module-card" style={{ color:C.red, fontSize:11, fontWeight:700 }}>Female Staff</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:9 }}>{females} Employees</div>
 </div>
 </div>
 )
 })()}
 </GCard>

 <GCard>
 <div className="super-module-card" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
 <h3 style={{ color:"#C8991A", fontSize:16, fontWeight:800, margin:0 }}> Staffing by Role</h3>
 <div className="super-module-card" style={{ fontSize:10, color:C.muted, fontWeight:700 }}>INSTITUTIONAL HIERARCHY</div>
 </div>
 <div className="super-module-card" style={{ display:"flex", alignItems:"flex-end", gap:10, height:80 }}>
 {['Teacher', 'Subject Teacher', 'IT Staff', 'Security Guard', 'Peon', 'Other'].map(role => {
 const count = employees.filter(e => e.designation === role || (role==='Other' && !['Teacher', 'Subject Teacher', 'IT Staff', 'Security Guard', 'Peon'].includes(e.designation))).length
 const max = Math.max(...[1], ...employees.map(e => employees.filter(x => x.designation === e.designation).length))
 const h = (count / max) * 100
 return (
 <div key={role} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
 <div className="super-module-card" style={{ width:"100%", height:`${Math.max(5, h)}%`, background:count>0?`linear-gradient(to top, ${C.gold}, ${C.orange})` : "rgba(255,255,255,0.03)", borderRadius:"3px 3px 0 0" }} />
 <span style={{ fontSize:8, color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", width:"100%", textAlign:"center" }}>{role}</span>
 </div>
 )
 })}
 </div>
 </GCard>
 </div>

 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
 <StatCard icon="" label="Total Employees" value={employees.length} color={C.blue} />
 <StatCard icon="" label="Active Staff" value={activeEmployees} color={C.green} />
 <StatCard icon="" label="Monthly Salary" value={`Rs.${(totalSalary/1000).toFixed(0)}K`} color={C.gold} />
 <StatCard icon="" label="Staff Contacts" value={employees.length} color={C.orange} />
 </div>

 <GCard>
 <div className="super-module-card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
 <h3 style={{ color:C.gold, fontSize:18, margin:0, fontFamily:"'Playfair Display',serif" }}>Staff Directory</h3>
 <button onClick={onAdd} style={{ background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', border:'none', padding:'10px 18px', borderRadius:11, cursor:'pointer', fontWeight: 600 }}> Add Employee</button>
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
 <div><Lbl>Search</Lbl><Inp placeholder="Search by name, CNIC, phone, designation…" value={search} onChange={e=>setSearch(e.target.value)} /></div>
 <div><Lbl>Filter by Designation</Lbl>
 <Sel value={designationFilter} onChange={e=>setDesignationFilter(e.target.value)}>
 <option value="All">All Designations</option>{designations.map(d=><option key={d}>{d}</option>)}
 </Sel>
 </div>
 </div>
 </GCard>

 <GCard style={{ padding:0, overflow:'hidden' }}>
 <table style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead>
 <tr style={{ background:'rgba(7,30,52,0.95)', borderBottom:`1px solid ${C.border}` }}>
 {['Employee','CNIC','Designation','Contact','Contract','Salary','Status','Actions'].map(col => (
 <th key={col} style={{ padding:'13px 15px', textAlign:'left', color:C.gold, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase' }}>{col}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {employees.length === 0 ? (
 <tr><td colSpan={8} style={{ padding:42, textAlign:'center', color:C.muted }}>No employees found.</td></tr>
 ) : employees.map((emp, i) => (
 <tr key={emp.id} style={{ background: i%2===0 ? 'transparent' : 'rgba(11,44,77,0.2)', borderBottom:`1px solid rgba(200,153,26,0.05)` }}>
 <td style={{ padding:'12px 15px' }}>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:10 }}>
 <div className="super-module-card" style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#C8991A,#8a6610)', display:'flex', alignItems:'center', justifyContent:'center', color:'#071e34', fontWeight:900, fontSize:15, flexShrink:0 }}>
 {emp.name.charAt(0)}
 </div>
 <div>
 <div className="super-module-card" style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{emp.name}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:11 }}>{emp.emp_id ? `ID: ${emp.emp_id}` : `Joined ${emp.join_date || '—'}`}</div>
 </div>
 </div>
 </td>
 <td style={{ padding:'12px 15px', color:C.muted, fontSize:13, fontFamily:'monospace' }}>{emp.cnic || '—'}</td>
 <td style={{ padding:'12px 15px' }}>
 <div className="super-module-card" style={{ color:C.silver, fontWeight:600 }}>{emp.designation || '—'}</div>
 {emp.subject && emp.subject !== 'N/A' && <div className="super-module-card" style={{ color:C.muted, fontSize:11 }}>{emp.subject}</div>}
 </td>
 <td style={{ padding:'12px 15px' }}>
 <div className="super-module-card" style={{ color:C.silver }}>{emp.phone || '—'}</div>
 {emp.email && <div className="super-module-card" style={{ color:C.muted, fontSize:11 }}>{emp.email}</div>}
 </td>
 <td style={{ padding:'12px 15px', color:emp.contract_type ? C.silver : C.muted }}>{emp.contract_type || '—'}</td>
 <td style={{ padding:'12px 15px', color:C.gold, fontWeight:700 }}>Rs. {emp.salary.toLocaleString()}</td>
 <td style={{ padding:'12px 15px' }}><StatusBadge status={emp.status} /></td>
 <td style={{ padding:'12px 15px' }}>
 <div className="super-module-card" style={{ display:'flex', gap:6 }}>
 <button onClick={() => onView(emp)} style={{ padding:'5px 11px', borderRadius:8, border:`1px solid rgba(10,132,255,0.3)`, background:'rgba(10,132,255,0.12)', color:C.blue, cursor:'pointer', fontSize:12, fontWeight:600 }}> View</button>
 {!isDemo && (
 <>
 <button onClick={() => onEdit(emp)} style={{ padding:'5px 11px', borderRadius:8, border:`1px solid rgba(200,153,26,0.3)`, background:'rgba(200,153,26,0.12)', color:C.gold, cursor:'pointer', fontSize:12, fontWeight:600 }}> Edit</button>
 <button onClick={() => onDelete(emp)} style={{ padding:'5px 11px', borderRadius:8, border:`1px solid rgba(255,55,95,0.28)`, background:'rgba(255,55,95,0.08)', color:C.red, cursor:'pointer', fontSize:12, fontWeight:600 }}> Delete</button>
 </>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </GCard>
 </div>
 )
}

//  Attendance Tab (placeholder) 
function AttendanceTab() {
 return (
 <GCard style={{ textAlign:'center', padding:60 }}>
 <div className="super-module-card" style={{ fontSize:34, marginBottom:20, fontWeight:900, color:C.blue }}>ATT</div>
 <h3 style={{ color:C.gold, margin:'0 0 12px', fontFamily:"'Playfair Display',serif" }}>Employee Attendance</h3>
 <p style={{ color:C.muted, margin:0 }}>Coming Soon — Employee attendance tracking system</p>
 </GCard>
 )
}

//  Salary Tab 
function SalaryTab({ employees=[] }) {
 const [selectedMonth, setSelectedMonth] = useState('April')
 const [selectedYear, setSelectedYear] = useState('2026')

 const records = SALARY_RECORDS.filter(r => r.month === selectedMonth && r.year === parseInt(selectedYear))
 const totalPaid = records.filter(r => r.status==='Paid').reduce((s,r) => s+r.net, 0)
 const pending = records.filter(r => r.status==='Pending').reduce((s,r) => s+r.net, 0)
 const paidCount = records.filter(r => r.status==='Paid').length

 return (
 <div className="super-module-card" style={{ display:'grid', gap:24 }}>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
 <StatCard icon={<Wallet size={22} />} label="Total Paid" value={`Rs.${(totalPaid/1000).toFixed(0)}K`} color={C.green} />
 <StatCard icon={<Clock3 size={22} />} label="Pending Payment" value={`Rs.${(pending/1000).toFixed(0)}K`} color={C.orange} />
 <StatCard icon={<BadgeCheck size={22} />} label="Salaries Paid" value={paidCount} color={C.blue} />
 <StatCard icon={<Percent size={22} />} label="Payment Rate" value={`${records.length ? Math.round((paidCount/records.length)*100) : 0}%`} color={C.gold} />
 </div>

 <GCard>
 <div className="super-module-card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
 <h3 style={{ color:C.gold, fontSize:18, margin:0, fontFamily:"'Playfair Display',serif" }}>Salary Sheet</h3>
 <div className="super-module-card" style={{ display:'flex', gap:12 }}>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:8 }}>
 <Lbl>Month</Lbl>
 <Sel value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={{ width:130 }}>
 {MONTHS.map(m=><option key={m}>{m}</option>)}
 </Sel>
 </div>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:8 }}>
 <Lbl>Year</Lbl>
 <Sel value={selectedYear} onChange={e=>setSelectedYear(e.target.value)} style={{ width:100 }}>
 {['2024','2025','2026','2027'].map(y=><option key={y}>{y}</option>)}
 </Sel>
 </div>
 </div>
 </div>
 </GCard>

 <GCard style={{ padding:0, overflow:'hidden' }}>
 <table style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead>
 <tr style={{ background:'rgba(7,30,52,0.95)', borderBottom:`1px solid ${C.border}` }}>
 {['Employee','Basic Salary','Allowances','Deductions','Net Salary','Status'].map(col => (
 <th key={col} style={{ padding:'13px 15px', textAlign:'left', color:C.gold, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase' }}>{col}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {records.length === 0 ? (
 <tr><td colSpan={6} style={{ padding:42, textAlign:'center', color:C.muted }}>No salary records found. Dummy salary data has been removed; generate payroll to populate this sheet.</td></tr>
 ) : records.map((rec, i) => {
 const emp = employees.find(e => e.id === rec.employeeId)
 return (
 <tr key={rec.id} style={{ background: i%2===0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding:'13px 15px' }}>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:10 }}>
 <div className="super-module-card" style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#C8991A,#8a6610)', display:'flex', alignItems:'center', justifyContent:'center', color:'#071e34', fontWeight:900, fontSize:13 }}>
 {emp?.name?.charAt(0) || '?'}
 </div>
 <div>
 <div className="super-module-card" style={{ color:'#fff', fontWeight:600 }}>{emp?.name || 'Unknown'}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:11 }}>{emp?.designation}</div>
 </div>
 </div>
 </td>
 <td style={{ padding:'13px 15px', color:C.silver }}>Rs. {rec.basic.toLocaleString()}</td>
 <td style={{ padding:'13px 15px', color:C.green }}>Rs. {rec.allowances.toLocaleString()}</td>
 <td style={{ padding:'13px 15px', color:C.red }}>Rs. {rec.deductions.toLocaleString()}</td>
 <td style={{ padding:'13px 15px', color:C.gold, fontWeight:700 }}>Rs. {rec.net.toLocaleString()}</td>
 <td style={{ padding:'13px 15px' }}><StatusBadge status={rec.status} /></td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </GCard>
 </div>
 )
}

//  Settings Tab 
function ListManager({ title, icon, items, onUpdate, defaults, placeholder }) {
 const [newItem, setNewItem] = useState('')
 const [editIdx, setEditIdx] = useState(null)
 const [editVal, setEditVal] = useState('')

  const userRaw = localStorage.getItem('al_siddique_user')
  let isDemo = false
  try {
    if (userRaw) {
      const userObj = JSON.parse(userRaw)
      isDemo = userObj?.email === 'demo@assps.edu.pk'
    }
  } catch (e) {}

 function add() {
 const v = newItem.trim()
 if (!v || items.includes(v)) return
 onUpdate([...items, v]); setNewItem('')
 }

 function remove(item) {
 onUpdate(items.filter(x => x !== item))
 }

 function startEdit(i) { setEditIdx(i); setEditVal(items[i]) }
 function saveEdit() {
 if (!editVal.trim()) return
 const updated = [...items]; updated[editIdx] = editVal.trim()
 onUpdate(updated); setEditIdx(null)
 }

 return (
 <GCard>
 <div className="super-module-card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:10 }}>
 <span style={{ fontSize:20 }}>{icon}</span>
 <div>
 <div className="super-module-card" style={{ color:C.gold, fontWeight:700, fontSize:16 }}>{title}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:12, marginTop:2 }}>{items.length} items · drag to reorder</div>
 </div>
 </div>
 {!isDemo && (
 <button onClick={() => onUpdate(defaults)} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid rgba(255,55,95,0.3)`, background:'rgba(255,55,95,0.1)', color:C.red, cursor:'pointer', fontSize:12, fontWeight:600 }}>
  Reset to Defaults
 </button>
 )}
 </div>

 {/* Add new */}
 <div className="super-module-card" style={{ display:'flex', gap:10, marginBottom:20 }}>
 <Inp
 value={newItem} onChange={e=>setNewItem(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && add()}
 placeholder={placeholder}
 style={{ flex: 1 }}
 />
 {!isDemo && (
 <button onClick={add} style={{ padding:'10px 20px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', fontWeight: 600, cursor:'pointer', whiteSpace:'nowrap' }}>
 + Add
 </button>
 )}
 </div>

 {/* List */}
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:8 }}>
 {items.map((item, i) => (
 <div key={item} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:10, background:'rgba(11,44,77,0.92)', border:`1px solid ${C.border}` }}>
 {editIdx === i ? (
 <>
 <input value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveEdit()}
 style={{ flex:1, background:'rgba(11,44,77,0.8)', border:`1px solid ${C.gold}`, borderRadius:7, color:C.silver, padding:'4px 8px', fontSize:13, outline:'none' }} autoFocus />
 <button onClick={saveEdit} style={{ background:'none', border:'none', color:C.green, cursor:'pointer', fontSize:15, fontWeight: 600 }}></button>
 <button onClick={()=>setEditIdx(null)} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:15 }}></button>
 </>
 ) : (
 <>
 <span style={{ flex:1, color:C.silver, fontSize:13, fontWeight:600 }}>{item}</span>
 {!isDemo && (
 <>
 <button onClick={()=>startEdit(i)} title="Edit" style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:13 }}></button>
 <button onClick={()=>remove(item)} title="Delete" style={{ background:'none', border:'none', color:'rgba(255,55,95,0.6)', cursor:'pointer', fontSize:14, fontWeight: 600 }}>×</button>
 </>
 )}
 </>
 )}
 </div>
 ))}
 </div>
 </GCard>
 )
}

function SettingsTab({ designations, onUpdateDesignations, subjects, onUpdateSubjects }) {
 return (
 <div className="super-module-card" style={{ display:'grid', gap:24 }}>
 <GCard style={{ padding:'16px 22px' }}>
 <div className="super-module-card" style={{ color:C.silver, fontSize:14 }}>
  <strong style={{ color:C.gold }}>Admin Settings</strong> — Customize designations and subject specializations used across the Employee module. Changes save instantly.
 </div>
 </GCard>
 <ListManager
 title="Employee Designations"
 icon=""
 items={designations}
 onUpdate={onUpdateDesignations}
 defaults={DEFAULT_DESIGNATIONS}
 placeholder="e.g. Lab Technician, Nurse…"
 />
 <ListManager
 title="Subject Specializations"
 icon=""
 items={subjects}
 onUpdate={onUpdateSubjects}
 defaults={DEFAULT_SUBJECTS}
 placeholder="e.g. Physics, Chemistry…"
 />
 </div>
 )
}

//  Main Module 
//  Staff Permissions Tab 
function StaffPermissionsTab({ employees }) {
 const { users, setPermissions, getByEntity } = useUserStore()
 const [selectedEmpId, setSelectedEmpId] = useState(null)
 const [localPerms, setLocalPerms] = useState([])
 const [saved, setSaved] = useState(false)

 const selectedEmp = employees.find(e => e.id === selectedEmpId)
 const storeUser = selectedEmpId ? getByEntity(selectedEmpId, 'teacher') : null
 const dbUser = selectedEmp?.portal_username ? {
 id: `db_${selectedEmp.id}`,
 username: selectedEmp.portal_username,
 email: selectedEmp.email,
 permissions: selectedEmp.portal_permissions?.length ? selectedEmp.portal_permissions : DEFAULT_TEACHER_PERMISSIONS,
 } : null
 const accessUser = storeUser || dbUser

 useEffect(() => {
 if (accessUser) setLocalPerms(accessUser.permissions || [...DEFAULT_TEACHER_PERMISSIONS])
 else if (selectedEmpId) setLocalPerms([...DEFAULT_TEACHER_PERMISSIONS])
 }, [selectedEmpId, accessUser?.id])

 const toggle = (key) => {
 setLocalPerms(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])
 setSaved(false)
 }

 const toggleGroup = (group) => {
 const keys = group.perms.map(p => p.key)
 const allOn = keys.every(k => localPerms.includes(k))
 if (allOn) setLocalPerms(p => p.filter(k => !keys.includes(k)))
 else setLocalPerms(p => [...new Set([...p, ...keys])])
 setSaved(false)
 }

 const handleSave = async () => {
 if (!accessUser) { alert('Please generate a Login ID for this employee first (Login Access tab).'); return }
 if (storeUser) setPermissions(storeUser.id, localPerms)
 try {
 await api.put(`/api/employees/${selectedEmp.id}`, { portal_permissions: localPerms, app_access: localPerms })
 setSaved(true)
 setTimeout(() => setSaved(false), 2000)
 } catch (err) {
 alert('Permissions save failed: ' + (err.response?.data?.message || err.message))
 }
 }

 const handleSelectAll = () => { setLocalPerms(ALL_PERMISSIONS.map(p => p.key)); setSaved(false) }
 const handleClearAll = () => { setLocalPerms([]); setSaved(false) }
 const handleDefault = () => { setLocalPerms([...DEFAULT_TEACHER_PERMISSIONS]); setSaved(false) }

 return (
 <GCard>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:12 }}>
 <div>
 <h2 style={{ color:C.gold, fontSize:18, fontWeight:800, margin:'0 0 4px' }}> Staff Access Permissions</h2>
 <p style={{ color:C.muted, fontSize:13, margin:0 }}>Grant or restrict access to specific features for each staff member</p>
 </div>
 </div>

 {/* Employee selector */}
 <div style={{ marginBottom:24 }}>
 <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Select Staff Member</div>
 <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
 {employees.map(emp => {
 const u = getByEntity(emp.id, 'teacher')
 return (
 <button key={emp.id} onClick={() => { setSelectedEmpId(emp.id); setSaved(false) }} style={{
 padding:'8px 14px', borderRadius:10, border:`1px solid ${selectedEmpId===emp.id?C.gold:C.border}`,
 background: selectedEmpId===emp.id ? `linear-gradient(135deg,${C.gold},${C.goldL})` : 'rgba(15,23,42,0.5)',
 color: selectedEmpId===emp.id ? '#071e34' : C.silver,
 cursor:'pointer', fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:6,
 }}>
 {emp.name}
 <span style={{ fontSize:10, opacity:0.7 }}>{emp.designation ? `· ${emp.designation}` : ''}</span>
 {u ? <span style={{ color:selectedEmpId===emp.id?'#071e34':C.green, fontSize:10 }}></span> : <span style={{ color:selectedEmpId===emp.id?'#071e34':C.red, fontSize:10 }}></span>}
 </button>
 )
 })}
 </div>
 </div>

 {selectedEmp ? (
 <>
 {/* Header for selected employee */}
 <div style={{ background:'rgba(200,153,26,.08)', border:`1px solid ${C.gold}33`, borderRadius:14, padding:'14px 18px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
 <div>
 <div style={{ color:C.gold, fontWeight:800, fontSize:15 }}>{selectedEmp.name}</div>
 <div style={{ color:C.muted, fontSize:12, marginTop:2 }}>{selectedEmp.designation} {accessUser ? `· Login ID: ${accessUser.username}` : '·  No login ID yet — generate one in the Login Access tab first'}</div>
 </div>
 <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
 <button onClick={handleDefault} style={{ background:'rgba(10,132,255,.12)', color:C.blue, border:`1px solid ${C.blue}33`, padding:'7px 14px', borderRadius:9, fontSize:12, cursor:'pointer', fontWeight:600 }}> Teacher Defaults</button>
 <button onClick={handleSelectAll} style={{ background:'rgba(48,209,88,.1)', color:C.green, border:`1px solid ${C.green}33`, padding:'7px 14px', borderRadius:9, fontSize:12, cursor:'pointer', fontWeight:600 }}> Select All</button>
 <button onClick={handleClearAll} style={{ background:'rgba(255,55,95,.1)', color:C.red, border:`1px solid ${C.red}33`, padding:'7px 14px', borderRadius:9, fontSize:12, cursor:'pointer', fontWeight:600 }}> Clear All</button>
 </div>
 </div>

 {/* Permission groups */}
 <div style={{ display:'grid', gap:16 }}>
 {PERMISSION_GROUPS.map(group => {
 const allOn = group.perms.every(p => localPerms.includes(p.key))
 const someOn = group.perms.some(p => localPerms.includes(p.key))
 return (
 <div key={group.group} style={{ background:'rgba(7,30,52,0.5)', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
 {/* Group header */}
 <div style={{ padding:'12px 18px', background:'rgba(11,44,77,0.6)', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${C.border}` }}>
 <div style={{ display:'flex', alignItems:'center', gap:10 }}>
 <span style={{ fontSize:18 }}>{group.icon}</span>
 <span style={{ color:C.silver, fontWeight:700, fontSize:14 }}>{group.group}</span>
 <span style={{ color:C.muted, fontSize:11 }}>({group.perms.filter(p=>localPerms.includes(p.key)).length}/{group.perms.length})</span>
 </div>
 <button onClick={() => toggleGroup(group)} style={{
 padding:'5px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
 background: allOn ? `rgba(48,209,88,.15)` : someOn ? 'rgba(255,159,10,.15)' : 'rgba(255,255,255,.06)',
 color: allOn ? C.green : someOn ? C.orange : C.muted,
 }}>{allOn ? ' Sab On' : someOn ? '~ Kuch On' : 'Sab Off'}</button>
 </div>
 {/* Permission items */}
 <div style={{ padding:'8px 12px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:4 }}>
 {group.perms.map(perm => {
 const on = localPerms.includes(perm.key)
 return (
 <label key={perm.key} onClick={() => toggle(perm.key)} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, cursor:'pointer', background: on ? 'rgba(200,153,26,.08)' : 'transparent', transition:'background 0.15s' }}>
 <div style={{
 width:20, height:20, borderRadius:6, border:`2px solid ${on?C.gold:C.border}`,
 background: on ? `linear-gradient(135deg,${C.gold},${C.goldL})` : 'transparent',
 display:'grid', placeItems:'center', flexShrink:0, transition:'all 0.15s',
 }}>
 {on && <span style={{ color:'#071e34', fontSize:12, fontWeight:900 }}></span>}
 </div>
 <span style={{ color: on ? C.silver : C.muted, fontSize:13, lineHeight:1.3 }}>{perm.label}</span>
 </label>
 )
 })}
 </div>
 </div>
 )
 })}
 </div>

 {/* Save bar */}
 <div style={{ marginTop:20, display:'flex', justifyContent:'flex-end', alignItems:'center', gap:12 }}>
 <span style={{ color:C.muted, fontSize:12 }}>{localPerms.length} permissions selected</span>
 <button onClick={handleSave} style={{
 background: saved ? 'rgba(48,209,88,.2)' : `linear-gradient(135deg,${C.gold},${C.goldL})`,
 color: saved ? C.green : '#071e34',
 border: saved ? `1px solid ${C.green}` : 'none',
 padding:'11px 28px', borderRadius:12, fontWeight:800, fontSize:14, cursor:'pointer',
 }}>
 {saved ? ' Saved!' : ' Save Permissions'}
 </button>
 </div>
 </>
 ) : (
 <div style={{ textAlign:'center', padding:'48px 24px', color:C.muted }}>
 <div style={{ fontSize:34, marginBottom:16, fontWeight:900, color:C.gold }}>KEY</div>
 <div style={{ fontSize:15, fontWeight:600 }}>Select a staff member to configure their module permissions</div>
 <div style={{ fontSize:13, marginTop:8 }}>Each employee can be granted access to specific modules independently</div>
 </div>
 )}
 </GCard>
 )
}

//  Login Access Tab 
function LoginAccessTab({ employees }) {
 const { users, generateTeacher, regenerateTeacher, resetPassword, toggleBlock, deleteAccess, getByEntity } = useUserStore()
 const [showPass, setShowPass] = useState({})
 const [resetTarget, setResetTarget] = useState(null)
 const [newPass, setNewPass] = useState('')
 const [copied, setCopied] = useState(null)

  const userRaw = localStorage.getItem('al_siddique_user')
  let isDemo = false
  try {
    if (userRaw) {
      const userObj = JSON.parse(userRaw)
      isDemo = userObj?.email === 'demo@assps.edu.pk'
    }
  } catch (e) {}

 const dbPortalUsers = employees
 .filter(emp => emp.portal_username)
 .map(emp => ({
 id: `db_${emp.id}`,
 username: emp.portal_username,
 email: emp.email,
 password: emp.portal_password || '',
 role: emp.portal_role || 'teacher',
 entityId: emp.id,
 name: emp.name,
 designation: emp.designation,
 isActive: emp.portal_active,
 permissions: emp.portal_permissions || DEFAULT_TEACHER_PERMISSIONS,
 lastLogin: null,
 dbBacked: true,
 }))
 const localTeacherUsers = users.filter(u => u.role === 'teacher')
 const teacherUsers = [
 ...localTeacherUsers,
 ...dbPortalUsers.filter(dbUser => !localTeacherUsers.some(localUser => localUser.entityId === dbUser.entityId)),
 ]

 const copyText = (text, key) => {
 navigator.clipboard.writeText(text).catch(() => {})
 setCopied(key)
 setTimeout(() => setCopied(null), 1800)
 }

 const handleBulkGenerate = () => {
 if (!window.confirm(`${employees.length} employees k liye login IDs generate karain?`)) return
 employees.forEach(emp => generateTeacher(emp))
 }

 const handleReset = async (u) => {
 if (!newPass.trim()) return
 resetPassword(u.id, newPass.trim())
 if (u.dbBacked) {
 try {
 await api.put('/api/auth/users/password', { email: u.email, newPassword: newPass.trim() })
 } catch (err) {
 alert('Database password update failed: ' + (err.response?.data?.message || err.message))
 return
 }
 }
 setResetTarget(null)
 setNewPass('')
 }

 const handleToggleAccess = async (u, emp) => {
 if (u.dbBacked) {
 await api.put(`/api/employees/${emp.id}`, { portal_active: !u.isActive })
 window.location.reload()
 return
 }
 toggleBlock(u.id)
 }

 const handleDeleteAccess = async (u, emp) => {
 if (!window.confirm('Permanently block this login access?')) return
 if (u.dbBacked) {
 await api.put(`/api/employees/${emp.id}`, { portal_active: false, portal_permissions: [] })
 window.location.reload()
 return
 }
 deleteAccess(u.id)
 }

 const printCredentials = (u, emp) => {
 const w = window.open('', '_blank', 'width=420,height=320')
 w.document.write(`<html><head><title>Login Card</title><style>
 body{font-family:Arial,sans-serif;padding:28px;background:#f8f9fa;margin:0}
 .card{background:#fff;border:2px solid #C8991A;border-radius:14px;padding:22px;max-width:360px}
 h2{color:#C8991A;margin:0 0 4px;font-size:17px}
 p{color:#444;font-size:12px;margin:0 0 18px}
 .row{display:flex;justify-content:space-between;padding:8px 12px;background:#f0f4ff;border-radius:8px;margin-bottom:8px}
 .lbl{color:#888;font-size:11px;font-weight:600}
 .val{color:#1a1a2e;font-size:14px;font-weight:700}
 </style></head><body>
 <div class="card">
 <h2>Al Siddique OS — Staff Login</h2>
 <p>${u.name} · ${u.designation || 'Teacher'}</p>
 <div class="row"><span class="lbl">Login ID</span><span class="val">${u.username}</span></div>
 <div class="row"><span class="lbl">Password</span><span class="val">${u.password}</span></div>
 <div class="row"><span class="lbl">Portal</span><span class="val">alsiddique.edu.pk</span></div>
 </div></body></html>`)
 w.document.close()
 setTimeout(() => w.print(), 400)
 }

 return (
 <GCard>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
 <div>
 <h2 style={{ color:C.gold, fontSize:17, fontWeight:800, margin:0 }}> Teacher Login Access</h2>
 <p style={{ color:C.muted, fontSize:13, margin:'4px 0 0' }}>Manage login IDs and passwords for all staff members</p>
 </div>
 <div style={{ display:'flex', gap:10 }}>
 <button onClick={handleBulkGenerate} style={{ background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', fontWeight: 600, fontSize:13, padding:'10px 18px', borderRadius:11, border:'none', cursor:'pointer' }}>
  Generate for All
 </button>
 </div>
 </div>

 {/* Stats */}
 <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
 {[
 { label:'Total Staff', val:employees.length, color:C.blue },
 { label:'Access Generated', val:teacherUsers.length, color:C.green },
 { label:'Active', val:teacherUsers.filter(u=>u.isActive).length, color:C.gold },
 { label:'Blocked', val:teacherUsers.filter(u=>!u.isActive).length, color:C.red },
 ].map(s => (
 <div key={s.label} style={{ background:`rgba(${s.color==='#0A84FF'?'10,132,255':s.color==='#30D158'?'48,209,88':s.color==='#C8991A'?'200,153,26':'255,55,95'},.1)`, border:`1px solid ${s.color}33`, borderRadius:12, padding:'12px 18px', flex:1, minWidth:100 }}>
 <div style={{ color:s.color, fontSize:22, fontWeight:800 }}>{s.val}</div>
 <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{s.label}</div>
 </div>
 ))}
 </div>

 {/* Table */}
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead>
 <tr style={{ borderBottom:`1px solid ${C.border}` }}>
 {['Employee','Designation','Login ID','Password','Status','Last Login','Actions'].map(h => (
 <th key={h} style={{ color:C.muted, fontSize:11, fontWeight:700, padding:'8px 12px', textAlign:'left', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {employees.map(emp => {
 const localUser = getByEntity(emp.id, 'teacher')
 const dbUser = emp.portal_username ? dbPortalUsers.find(item => item.entityId === emp.id) : null
 const u = localUser || dbUser
 return (
 <tr key={emp.id} style={{ borderBottom:`1px solid ${C.border}22` }}>
 <td style={{ padding:'10px 12px' }}>
 <div style={{ color:C.silver, fontWeight:700, fontSize:13 }}>{emp.name}</div>
 <div style={{ color:C.muted, fontSize:11 }}>{emp.emp_id}</div>
 </td>
 <td style={{ padding:'10px 12px', color:C.muted, fontSize:12 }}>{emp.designation}</td>
 <td style={{ padding:'10px 12px' }}>
 {u ? (
 <div style={{ display:'flex', alignItems:'center', gap:6 }}>
 <span style={{ background:'rgba(10,132,255,.12)', color:C.blue, padding:'4px 10px', borderRadius:8, fontWeight:700, fontSize:13, fontFamily:'monospace' }}>{u.username}</span>
 <button onClick={() => copyText(u.username, `un_${u.id}`)} style={{ background:'none', border:'none', cursor:'pointer', color:copied===`un_${u.id}`?C.green:C.muted, fontSize:13 }}>{copied===`un_${u.id}`?'':''}</button>
 </div>
 ) : <span style={{ color:C.muted, fontSize:12 }}>—</span>}
 </td>
 <td style={{ padding:'10px 12px' }}>
 {u ? (
 <div style={{ display:'flex', alignItems:'center', gap:6 }}>
 <span style={{ fontFamily:'monospace', fontSize:13, color:C.silver }}>
 {showPass[u.id] ? u.password : '••••••••'}
 </span>
 <button onClick={() => setShowPass(p=>({...p,[u.id]:!p[u.id]}))} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:12 }}>
 {showPass[u.id]?'':''}
 </button>
 <button onClick={() => copyText(u.password, `pw_${u.id}`)} style={{ background:'none', border:'none', cursor:'pointer', color:copied===`pw_${u.id}`?C.green:C.muted, fontSize:13 }}>
 {copied===`pw_${u.id}`?'':''}
 </button>
 </div>
 ) : <span style={{ color:C.muted, fontSize:12 }}>—</span>}
 </td>
 <td style={{ padding:'10px 12px' }}>
 {u ? (
 <span style={{ background:u.isActive?'rgba(48,209,88,.12)':'rgba(255,55,95,.12)', color:u.isActive?C.green:C.red, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
 {u.isActive ? ' Active' : ' Blocked'}
 </span>
 ) : <span style={{ color:C.muted, fontSize:11 }}>No Access</span>}
 </td>
 <td style={{ padding:'10px 12px', color:C.muted, fontSize:11 }}>
 {u?.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-PK') : '—'}
 </td>
 <td style={{ padding:'10px 12px' }}>
 <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
 {!u ? (
 <button onClick={() => generateTeacher(emp)} style={{ background:`rgba(200,153,26,.15)`, color:C.gold, border:`1px solid ${C.gold}44`, padding:'5px 10px', borderRadius:8, fontSize:11, fontWeight: 600, cursor:'pointer', whiteSpace:'nowrap' }}>
 + Generate
 </button>
 ) : (<>
 <button onClick={() => regenerateTeacher(emp)} style={{ background:'rgba(10,132,255,.1)', color:C.blue, border:`1px solid ${C.blue}33`, padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>
  Reset
 </button>
 <button onClick={() => { setResetTarget(u); setNewPass('') }} style={{ background:'rgba(255,159,10,.1)', color:C.orange, border:`1px solid ${C.orange}33`, padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>
  New Pass
 </button>
 <button onClick={() => handleToggleAccess(u, emp)} style={{ background:u.isActive?'rgba(255,55,95,.1)':'rgba(48,209,88,.1)', color:u.isActive?C.red:C.green, border:`1px solid ${(u.isActive?C.red:C.green)}33`, padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>
 {u.isActive?' Block':' Unblock'}
 </button>
 <button onClick={() => printCredentials(u, emp)} style={{ background:'rgba(191,90,242,.1)', color:'#BF5AF2', border:'1px solid #BF5AF233', padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>
  Print
 </button>
 {!isDemo && (
 <button onClick={() => handleDeleteAccess(u, emp)} style={{ background:'rgba(255,55,95,.08)', color:C.red, border:`1px solid ${C.red}22`, padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>
  Remove
 </button>
 )}
 </>)}
 </div>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>

 {/* Custom password reset modal */}
 {resetTarget && (
 <div style={{ position:'fixed', inset:0, background:'rgba(7,30,52,.85)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
 <div style={{ background:'#0B2C4D', border:`1px solid ${C.border}`, borderRadius:18, padding:28, width:340 }}>
 <h3 style={{ color:C.gold, margin:'0 0 6px', fontSize:16 }}>Set New Password</h3>
 <p style={{ color:C.muted, fontSize:12, margin:'0 0 16px' }}>{resetTarget.name} — {resetTarget.username}</p>
 <input value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Naya password likhen..."
 style={{ width:'100%', background:'rgba(11,44,77,.8)', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'10px 13px', fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:16 }} />
 <div style={{ display:'flex', gap:10 }}>
 <button onClick={()=>setResetTarget(null)} style={{ flex:1, padding:'10px', borderRadius:10, background:'rgba(255,55,95,.1)', color:C.red, border:`1px solid ${C.red}33`, cursor:'pointer', fontWeight: 600 }}>Cancel</button>
 <button onClick={()=>handleReset(resetTarget)} style={{ flex:1, padding:'10px', borderRadius:10, background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', border:'none', cursor:'pointer', fontWeight: 600 }}>Save</button>
 </div>
 </div>
 </div>
 )}
 </GCard>
 )
}

function EmployeesModule() {
 const [searchParams] = useSearchParams()
 const [tab, setTab] = useState('directory')
 const [employees, setEmployees] = useState([])
 const [employeeLoadError, setEmployeeLoadError] = useState('')
 const [search, setSearch] = useState('')
 const [designationFilter,setDesignationFilter]= useState('All')
 const [modalMode, setModalMode] = useState(null) // 'add' | 'edit'
 const [viewEmp, setViewEmp] = useState(null)
 const [editEmp, setEditEmp] = useState(null)
 const [designations, setDesignations] = useState(() => loadList(DESIG_KEY, DEFAULT_DESIGNATIONS))
 const [subjects, setSubjects] = useState(() => loadList(SUBJECT_KEY, DEFAULT_SUBJECTS))
 const { generateTeacher } = useUserStore()

 const updateDesignations = list => { setDesignations(list); persistList(DESIG_KEY, list) }
 const updateSubjects = list => { setSubjects(list); persistList(SUBJECT_KEY, list) }

 const reload = () =>
  api.get('/api/employees')
  .then(r => {
  setEmployeeLoadError('')
  setEmployees((r.data?.data || []).map(transformEmployee))
  })
  .catch(err => {
  const message = err.response?.data?.message || err.message || 'Could not load employees'
  setEmployeeLoadError(message)
  setEmployees([])
  console.error('Could not load employees', err)
  })

 useEffect(() => { reload() }, [])

 useEffect(() => {
 if (searchParams.get('add') === '1') {
 setEditEmp(null)
 setModalMode('add')
 }
 }, [searchParams])

 const saveEmployee = async (form) => {
 try {
 const payload = cleanEmployeePayload(form)
 if (editEmp) {
 await api.put(`/api/employees/${editEmp.id}`, payload)
 } else {
 const res = await api.post('/api/employees', payload)
 const saved = res.data?.data || payload
 // Auto-generate login credentials for new employee
 generateTeacher(saved)
 }
 await reload()
 setModalMode(null)
 setEditEmp(null)
 } catch (err) {
 alert('Failed to save: ' + (err.response?.data?.message || err.message))
 }
 }

 const deleteEmployee = async (emp) => {
 if (!emp?.id) return
 if (!window.confirm(`Delete ${emp.name}? This will also block their teacher portal login access.`)) return
 try {
 await api.delete(`/api/employees/${emp.id}`)
 await reload()
 } catch (err) {
 alert('Failed to delete: ' + (err.response?.data?.message || err.message))
 }
 }

 const filtered = useMemo(() => {
 const q = search.toLowerCase()
 return employees.filter(e => {
 const matchSearch = !search ||
 e.name.toLowerCase().includes(q) ||
 e.cnic.includes(q) ||
 e.phone.includes(q) ||
 e.designation.toLowerCase().includes(q)
 const matchDesig = designationFilter === 'All' || e.designation === designationFilter
 return matchSearch && matchDesig
 })
 }, [employees, search, designationFilter])

 const totalSalary = filtered.reduce((s, e) => s + e.salary, 0)
 const activeCount = filtered.filter(e => e.status === 'Active').length

 // Dashboard computed values
 const empActiveCount = employees.filter(e => e.status === 'Active').length;
 const empMaleCount = employees.filter(e => e.gender === 'Male').length;
 const empFemaleCount = employees.filter(e => e.gender === 'Female').length;
 const inactiveCount = employees.length - empActiveCount;

 // Department distribution (top 5 by first word of designation)
 const deptCounts = {};
 employees.forEach(e => {
 const dept = (e.designation || 'Unknown').split(' ')[0];
 deptCounts[dept] = (deptCounts[dept] || 0) + 1;
 });
 const deptBars = Object.entries(deptCounts)
 .sort((a, b) => b[1] - a[1])
 .slice(0, 5)
 .map(([name, count], i) => ({
 label: name.slice(0, 5),
 value: count,
 color: ['#30D158','#0A84FF','#C8991A','#BF5AF2','#FF375F'][i % 5],
 }));

 const empDashCard = { background: 'rgba(11,44,77,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 22, padding: 20 };
 const empDashTitle = { color: '#C0C8D8', fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 };

 return (
 <div className="super-module-card" style={{ minHeight:'100vh', background:'#071e34', color:C.silver, fontFamily:'Inter,sans-serif' }}>

 <EmployeeFormModal
 isOpen={modalMode === 'add' || modalMode === 'edit'}
 onClose={() => { setModalMode(null); setEditEmp(null) }}
 onSave={saveEmployee}
 initialData={editEmp}
 designations={designations}
 subjects={subjects}
 />
 <EmployeeProfileModal
 employee={viewEmp}
 onClose={() => setViewEmp(null)}
 onEdit={emp => { setViewEmp(null); setEditEmp(emp); setModalMode('edit') }}
 />

 <div className="super-module-card" style={{ padding:'24px 24px' }}>
 <div className="super-module-card" style={{ padding:'22px 26px', borderRadius:26, background:'linear-gradient(135deg,rgba(11,44,77,0.92),rgba(7,30,52,0.98))', border:`1px solid ${C.border}`, display:'flex', flexWrap:'wrap', gap:18, justifyContent:'space-between', alignItems:'center' }}>
 <div className="super-module-card" style={{ display:'flex', gap:16, alignItems:'center' }}>
 <div className="super-module-card" style={{ width:54, height:54, borderRadius:20, display:'grid', placeItems:'center', background:'rgba(200,153,26,0.16)', border:`1px solid rgba(200,153,26,0.35)`, color:C.gold }}>
 <BriefcaseBusiness size={25} />
 </div>
 <div>
 <h1 style={{ margin:0, fontSize:27, color:'#fff', fontFamily:"'Playfair Display',serif", fontWeight:800 }}>Employee Management</h1>
 <p style={{ margin:'5px 0 0', color:C.muted, fontSize:13 }}>Staff directory, attendance & salary management.</p>
 </div>
 </div>
 <div className="super-module-card" style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
 <TabBtn active={tab==='directory'} onClick={()=>setTab('directory')}> Directory</TabBtn>
 <TabBtn active={tab==='attendance'} onClick={()=>setTab('attendance')}> Attendance</TabBtn>
 <TabBtn active={tab==='salary'} onClick={()=>setTab('salary')}> Salary Sheet</TabBtn>
 <TabBtn active={tab==='login'} onClick={()=>setTab('login')}> Login Access</TabBtn>
 <TabBtn active={tab==='permissions'} onClick={()=>setTab('permissions')}> Permissions</TabBtn>
 <TabBtn active={tab==='settings'} onClick={()=>setTab('settings')}> Settings</TabBtn>
  </div>
  </div>

  {employeeLoadError && (
  <div style={{ marginTop:16, padding:'12px 16px', borderRadius:14, border:'1px solid rgba(255,159,10,0.28)', background:'rgba(255,159,10,0.10)', color:'#ffd37a', fontSize:13, fontWeight:700 }}>
  Employees could not be loaded from SaaS: {employeeLoadError}
  </div>
  )}

  {tab === 'directory' && (
 <div className="super-module-card" style={{ margin: '26px 0 0' }}>
 {/*  Employee Dashboard  */}
 {/* Stats Cards */}
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
 {[
 { label: 'Total Employees', value: employees.length, Icon: Users, color: C.blue },
 { label: 'Active', value: empActiveCount, Icon: UserCheck, color: C.green },
 { label: 'Male Staff', value: empMaleCount, Icon: VenusAndMars, color: C.gold },
 { label: 'Female Staff', value: empFemaleCount, Icon: VenusAndMars, color: C.red },
 ].map(c => (
 <div key={c.label} style={{ ...empDashCard, background: `linear-gradient(145deg, ${c.color}18, rgba(11,44,77,0.96) 52%, rgba(7,30,52,0.98))`, border:`1px solid ${c.color}33`, padding: '18px 20px', display:'flex', alignItems:'center', gap:14 }}>
 <div className="super-module-card" style={{ width:46, height:46, borderRadius:15, display:'grid', placeItems:'center', background:`${c.color}1f`, border:`1px solid ${c.color}44`, color:c.color }}>
 <c.Icon size={22} />
 </div>
 <div>
 <div className="super-module-card" style={{ color: c.color, fontSize: 28, fontWeight: 850, letterSpacing:-0.4 }}>{c.value}</div>
 <div className="super-module-card" style={{ color: 'rgba(192,200,216,0.72)', fontSize: 11, fontWeight:650 }}>{c.label}</div>
 </div>
 </div>
 ))}
 </div>

 {/* Charts */}
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 20 }}>
 {/* Status Donut */}
 <div style={empDashCard}>
 <div style={empDashTitle}> Employment Status</div>
 <div className="super-module-card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
 <DonutChart
 segments={[
 { value: empActiveCount, color: '#30D158' },
 { value: inactiveCount, color: '#FF375F' },
 ]}
 size={110}
 strokeWidth={14}
 label={String(employees.length)}
 sublabel="total"
 />
 <ChartLegend items={[
 { label: 'Active', color: '#30D158', value: empActiveCount },
 { label: 'Inactive', color: '#FF375F', value: inactiveCount },
 ]} />
 </div>
 </div>

 {/* Department Bar */}
 <div style={empDashCard}>
 <div style={empDashTitle}> Top Designations</div>
 {deptBars.length > 0
 ? <BarChart bars={deptBars} height={110} showValues={true} />
 : <div className="super-module-card" style={{ color: '#8892A4', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No data yet</div>
 }
 </div>
 </div>
 </div>

 )}
<div className="super-module-card" style={{ paddingTop:26 }}>
 {tab === 'directory' && (
 <DirectoryTab
 employees={filtered}
 search={search} setSearch={setSearch}
 designationFilter={designationFilter} setDesignationFilter={setDesignationFilter}
 totalSalary={totalSalary} activeEmployees={activeCount}
 onAdd={() => { setEditEmp(null); setModalMode('add') }}
 onView={emp => setViewEmp(emp)}
 onEdit={emp => { setEditEmp(emp); setModalMode('edit') }}
 onDelete={deleteEmployee}
 designations={designations}
 />
 )}
 {tab === 'attendance' && <AttendanceTab />}
 {tab === 'salary' && <SalaryTab employees={employees} />}
 {tab === 'login' && <LoginAccessTab employees={employees} />}
 {tab === 'permissions' && <StaffPermissionsTab employees={employees} />}
 {tab === 'settings' && (
 <SettingsTab
 designations={designations} onUpdateDesignations={updateDesignations}
 subjects={subjects} onUpdateSubjects={updateSubjects}
 />
 )}
 </div>
 </div>
 </div>
 )
}

export default EmployeesModule

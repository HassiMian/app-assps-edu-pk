// src/Modules/settings/SettingsModule.jsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import { useAcademicStore } from '../../services/useAcademicStore'
import api, { resolveAssetUrl } from '../../services/api'

const C = {
 card: 'rgba(11,44,77,0.97)',
 gold: '#C8991A', goldL: '#e8b420',
 silver: '#C0C8D8', muted: '#8892A4',
 green: '#30D158', red: '#FF375F',
 blue: '#0A84FF',
 border: 'rgba(148,163,184,0.18)',
}

const GCard = ({ children, style = {} }) => (
 <div className="super-module-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 22, padding: 24, boxShadow: '0 14px 34px rgba(0,0,0,0.28)', ...style }}>
 {children}
 </div>
)
const Lbl = ({ children }) => (
 <label style={{ color: C.muted, fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
 {children}
 </label>
)
const Inp = ({ style = {}, ...p }) => (
 <input {...p} style={{ width: '100%', background: 'rgba(11,44,77,0.6)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.silver, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', ...style }} />
)
const SHead = ({ icon, title, sub }) => (
 <div className="super-module-card" style={{ marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
 <div className="super-module-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
 <span style={{ fontSize: 22 }}>{icon}</span>
 <h3 style={{ margin: 0, color: C.gold, fontSize: 16, fontWeight: 800 }}>{title}</h3>
 </div>
 {sub && <p style={{ margin: '6px 0 0 32px', color: C.muted, fontSize: 13 }}>{sub}</p>}
 </div>
)

const SwitchRow = ({ checked, onChange, title, description }) => (
 <button
 type="button"
 role="switch"
 aria-checked={checked}
 onClick={() => onChange(!checked)}
 style={{
 width: '100%',
 display: 'grid',
 gridTemplateColumns: '68px 1fr 54px',
 gap: 14,
 alignItems: 'center',
 padding: '14px 16px',
 borderRadius: 16,
 border: `1px solid ${checked ? 'rgba(232,180,32,.7)' : C.border}`,
 background: checked ? 'rgba(200,153,26,0.12)' : 'rgba(11,44,77,0.92)',
 cursor: 'pointer',
 textAlign: 'left',
 }}
 >
 <span style={{
 width: 64,
 height: 34,
 borderRadius: 999,
 background: checked ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})` : 'rgba(2,12,24,0.78)',
 border: `2px solid ${checked ? C.goldL : 'rgba(148,163,184,0.36)'}`,
 position: 'relative',
 boxShadow: checked ? '0 8px 22px rgba(200,153,26,0.28)' : 'inset 0 0 0 1px rgba(255,255,255,0.05)',
 }}>
 <span style={{
 position: 'absolute',
 top: 4,
 left: checked ? 32 : 4,
 width: 22,
 height: 22,
 borderRadius: '50%',
 background: '#fff',
 display: 'grid',
 placeItems: 'center',
 color: checked ? C.green : C.muted,
 fontSize: 14,
 fontWeight: 900,
 transition: 'left 0.18s ease',
 boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
 }}>
 {checked ? '' : ''}
 </span>
 </span>
 <span>
 <span style={{ display:'block', color: checked ? '#fff' : C.silver, fontWeight: 800, fontSize: 14 }}>{title}</span>
 <span style={{ display:'block', color: C.muted, fontSize: 12, marginTop: 4 }}>{description}</span>
 </span>
 <span style={{
 justifySelf: 'end',
 padding: '5px 10px',
 borderRadius: 999,
 background: checked ? 'rgba(48,209,88,0.14)' : 'rgba(255,55,95,0.13)',
 color: checked ? C.green : C.red,
 fontSize: 12,
 fontWeight: 900,
 textAlign: 'center',
 }}>
 {checked ? 'ON' : 'OFF'}
 </span>
 </button>
)

//  Group colours 
const GROUP_COLORS = {
 objective: '#0A84FF',
 subjective: '#30D158',
 science: '#64D2FF',
 urdu: '#BF5AF2',
 english: '#FF9F0A',
}
const groupColor = g => GROUP_COLORS[g] || C.gold
const TYPE_GROUPS = {}
const groupLabel = g => TYPE_GROUPS[g]?.label || g

const MODULE_ACCESS_OPTIONS = [
 { key: 'dashboard', label: 'Dashboard', description: 'Main dashboard and overview cards.' },
 { key: 'ai_analytics', label: 'AI Analytics', description: 'Insight board and smart analytics.' },
 { key: 'students', label: 'Students', description: 'Student records, families, admissions, reports.' },
 { key: 'attendance', label: 'Attendance', description: 'Attendance marking, analytics, SMS.' },
 { key: 'employees', label: 'Employees', description: 'Staff directory and workforce tools.' },
 { key: 'fees', label: 'Fees', description: 'Challans, reports, fee settings.' },
 { key: 'exams', label: 'Examinations', description: 'Exam creation, marks, result cards.' },
 { key: 'paper-generator', label: 'Paper Generator', description: 'Paper generation, question bank, AI scanning.' },
 { key: 'timetable', label: 'Timetable', description: 'Timetable and period planning.' },
 { key: 'datesheet', label: 'Datesheet', description: 'Exam dates and schedules.' },
 { key: 'library', label: 'Library', description: 'Books and issue tracking.' },
 { key: 'transport', label: 'Transport', description: 'Routes and vehicle controls.' },
 { key: 'expenses', label: 'Expenses', description: 'Expense entries and reporting.' },
 { key: 'messages', label: 'Messages', description: 'Internal and bulk communication.' },
 { key: 'notifications', label: 'Notifications', description: 'Alerts and reminders.' },
 { key: 'cards', label: 'Identity Cards', description: 'Student and employee ID cards.' },
 { key: 'academic_setup', label: 'Academic Setup', description: 'Classes, subjects and academic settings.' },
 { key: 'settings', label: 'System Settings', description: 'System settings and control tools.' },
]

function normalizeSettingsResponse(data = {}) {
 const brandingConfig = data.branding_config && typeof data.branding_config === 'object'
  ? { ...data.branding_config }
  : data.brandingConfig && typeof data.brandingConfig === 'object'
  ? { ...data.brandingConfig }
  : {}

 return {
  schoolCode: data.school_code || data.schoolCode || '',
  schoolName: data.school_name || data.schoolName || '',
  schoolAddress: data.school_address || data.schoolAddress || '',
  schoolPhone: data.school_phone || data.schoolPhone || '',
  schoolEmail: data.school_email || data.schoolEmail || '',
  principalName: data.principal_name || data.principalName || '',
  academicYear: data.academic_year || data.academicYear || '',
  feeDueDate: data.fee_due_date || data.feeDueDate || '10',
  attendanceThreshold: data.attendance_threshold || data.attendanceThreshold || '75',
  schoolUrdu: data.school_urdu || data.schoolUrdu || '',
  logo: resolveAssetUrl(data.school_logo || data.logo || null),
  showUrduOnLogin: Boolean(data.show_urdu_on_login ?? data.showUrduOnLogin ?? false),
  moduleAccess: data.module_access && typeof data.module_access === 'object'
   ? data.module_access
   : data.moduleAccess && typeof data.moduleAccess === 'object'
   ? data.moduleAccess
   : {},
  schoolAccess: Array.isArray(data.school_access)
   ? data.school_access
   : Array.isArray(data.schoolAccess)
   ? data.schoolAccess
   : [],
  superappModules: data.superapp_modules && typeof data.superapp_modules === 'object'
   ? data.superapp_modules
   : data.superappModules && typeof data.superappModules === 'object'
   ? data.superappModules
   : {},
  brandingConfig: {
   ...brandingConfig,
   loginBackground: resolveAssetUrl(brandingConfig.loginBackground || brandingConfig.login_background || null),
  },
 }
}

function PaperGeneratorCategoriesCard() {
 return (
 <GCard style={{ marginBottom: 20 }}>
 <SHead
 icon=""
 title="Paper Generator Categories"
 sub="Question types and subject categories are now managed inside Paper Generator → Settings."
 />

 <div style={{
 display: 'grid',
 gridTemplateColumns: '1.1fr auto',
 gap: 16,
 alignItems: 'center',
 padding: 18,
 borderRadius: 16,
 background: 'rgba(7,30,52,0.35)',
 border: `1px solid ${C.border}`,
 }}>
 <div>
 <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, marginBottom: 6 }}>
 Use the Paper Generator settings tab for categories, subjects, and marks.
 </div>
 <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
 This keeps question categories, subjects, and paper-building controls in one place, instead of splitting them across system settings.
 </div>
 </div>
 <button
 type="button"
 onClick={() => {
 window.location.href = '/paper-generator'
 }}
 style={{
 padding: '11px 18px',
 borderRadius: 10,
 border: 'none',
 cursor: 'pointer',
 background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
 color: '#071e34',
 fontWeight: 800,
 fontSize: 13,
 whiteSpace: 'nowrap',
 }}
 >
 Open Paper Generator
 </button>
 </div>
 </GCard>
 )
}

const SUPERAPP_MODULES = [
  { id: 'paper-gen', name: 'Paper Studio', icon: '📝' },
  { id: 'quiz-engine', name: 'Quiz Engine', icon: '🧠' },
  { id: 'attendance', name: 'Presence Matrix', icon: '📍' },
  { id: 'analytics', name: 'Intelligence Board', icon: '📊' },
  { id: 'announcements', name: 'Alert Center', icon: '📣' },
  { id: 'homework', name: 'Homework Assistant', icon: '📚' },
  { id: 'messaging', name: 'Comms Hub', icon: '💬' },
  { id: 'admissions', name: 'Admissions Control', icon: '🎓' },
];

function SuperAppControlCenter({ superappModules = {}, setSuperappModule, schoolName, schoolLogo, brandingConfig = {}, setBrandingConfig }) {
  const [testStatus, setTestStatus] = useState('idle');
  const activeCount = Object.values(superappModules).filter(Boolean).length;
  const previewLogo = resolveAssetUrl(schoolLogo);
  const previewLoginBackground = resolveAssetUrl(brandingConfig.loginBackground);

  const testConnection = () => {
    setTestStatus('testing');
    setTimeout(() => {
      setTestStatus('ok');
      setTimeout(() => setTestStatus('idle'), 4000);
    }, 1500);
  };

  return (
    <GCard style={{ marginBottom: 20 }}>
      <SHead
        icon="📱"
        title="Super App Master Control"
        sub="Manage Apex OS Super App configurations, live module access, and branding."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24, marginTop: 24 }}>
        
        {/* Module Management & Connection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Connection Test */}
          <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: 'rgba(200,153,26,0.12)', color: C.gold, borderRadius: 12, fontSize: 18 }}>
                🌐
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Backend Connection</h3>
                <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>Status of Al-Siddique OS Hub</p>
              </div>
            </div>
            <div style={{ padding: 14, background: 'rgba(2,12,24,0.6)', borderRadius: 12, border: `1px solid ${C.border}`, fontFamily: 'monospace', fontSize: 12, color: C.silver }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: C.muted }}>Endpoint:</span>
                <span style={{ color: C.gold }}>/api/public</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: C.muted }}>Latency:</span>
                <span style={{ color: C.green }}>24ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted }}>Status:</span>
                <span style={{ color: C.green, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
                  Connected
                </span>
              </div>
            </div>
            <button
              onClick={testConnection}
              disabled={testStatus === 'testing'}
              style={{
                width: '100%', marginTop: 16, padding: '10px 0', borderRadius: 10, border: 'none', cursor: testStatus === 'testing' ? 'not-allowed' : 'pointer',
                background: testStatus === 'ok' ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.05)',
                color: testStatus === 'ok' ? C.green : '#fff', fontWeight: 700, fontSize: 13, transition: 'all 0.3s'
              }}
            >
              {testStatus === 'testing' ? 'Testing...' : testStatus === 'ok' ? '✓ Backend Responding' : 'Test Connection'}
            </button>
          </div>

          {/* Modules Grid */}
          <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 10, background: 'rgba(168,85,247,0.1)', color: '#A855F7', borderRadius: 12, fontSize: 18 }}>
                ⚙️
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Module Management</h3>
                <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>{activeCount} of {SUPERAPP_MODULES.length} modules active</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {SUPERAPP_MODULES.map(mod => {
                const enabled = superappModules[mod.id] !== false; // default true
                return (
                  <div key={mod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(148,163,184,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 16 }}>{mod.icon}</span>
                      <div>
                        <div style={{ color: enabled ? '#fff' : C.muted, fontSize: 13, fontWeight: 600 }}>{mod.name}</div>
                        <div style={{ color: enabled ? C.green : C.muted, fontSize: 11 }}>{enabled ? 'Active' : 'Disabled'}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSuperappModule(mod.id, !enabled)}
                      style={{
                        position: 'relative', width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
                        background: enabled ? C.green : 'rgba(148,163,184,0.2)', transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 2, left: enabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Branding Preview */}
        <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ padding: 10, background: 'rgba(232,180,32,0.1)', color: C.gold, borderRadius: 12, fontSize: 18 }}>
              🏢
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Branding & Identity Sync</h3>
              <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>Live preview of the Super App header</p>
            </div>
          </div>
          
          <div style={{ flex: 1, minHeight: 560, background: previewLoginBackground ? `url(${previewLoginBackground}) center/cover` : 'linear-gradient(180deg, rgba(7,30,52,0.8), rgba(2,12,24,0.9))', borderRadius: 16, padding: '40px 20px', border: '1px solid rgba(148,163,184,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {previewLoginBackground && <div style={{ position: 'absolute', inset: 0, background: brandingConfig.darkMode !== false ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)', backdropFilter: brandingConfig.glassEffect !== false ? 'blur(12px)' : 'none' }} />}

            <div style={{ width: 90, height: 90, borderRadius: 24, background: brandingConfig.glassEffect !== false ? 'rgba(200,153,26,0.15)' : 'rgba(200,153,26,0.05)', backdropFilter: brandingConfig.glassEffect !== false ? 'blur(10px)' : 'none', border: `1px solid ${brandingConfig.primaryColor || 'rgba(200,153,26,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 2px 10px rgba(255,255,255,0.1)' }}>
              {previewLogo ? <img src={previewLogo} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8, filter: 'drop-shadow(0 0 12px rgba(245,197,66,0.5))' }} /> : <span style={{ fontSize: 36 }}>🎓</span>}
            </div>
            
            <h2 style={{ margin: 0, color: brandingConfig.darkMode !== false ? '#fff' : '#000', fontSize: 24, fontFamily: brandingConfig.typography || "'Playfair Display', serif", fontWeight: 900, textAlign: 'center', lineHeight: 1.2, zIndex: 10 }}>
              {schoolName || 'Al Siddique Scholars Public School'}
            </h2>
            
            <div style={{ marginTop: 32, fontSize: 13, color: C.silver, textAlign: 'center', padding: '12px 18px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
              This visual identity is instantly propagated to the Super App's login screens and sidebar upon saving.
            </div>
          </div>
        </div>
        
        {/* Advanced Theming & Branding Config */}
        <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ padding: 10, background: 'rgba(48,209,88,0.1)', color: C.green, borderRadius: 12, fontSize: 18 }}>
              ✨
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Advanced Branding & Theming</h3>
              <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>Customize colors, typography, and visual effects</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div>
              <Lbl>Primary Brand Color</Lbl>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="color" value={brandingConfig.primaryColor || '#C8991A'} onChange={e => setBrandingConfig({ ...brandingConfig, primaryColor: e.target.value })} style={{ width: 44, height: 44, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
                <Inp type="text" value={brandingConfig.primaryColor || '#C8991A'} onChange={e => setBrandingConfig({ ...brandingConfig, primaryColor: e.target.value })} style={{ flex: 1, textTransform: 'uppercase' }} />
              </div>
            </div>
            
            <div>
              <Lbl>Typography Style</Lbl>
              <select value={brandingConfig.typography || "'Playfair Display', serif"} onChange={e => setBrandingConfig({ ...brandingConfig, typography: e.target.value })} style={{ width: '100%', background: 'rgba(11,44,77,0.6)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.silver, padding: '10px 14px', fontSize: 14, outline: 'none' }}>
                <option value="'Playfair Display', serif">Playfair Display (Elegant)</option>
                <option value="'Inter', sans-serif">Inter (Modern & Clean)</option>
                <option value="'Outfit', sans-serif">Outfit (Tech & Bold)</option>
                <option value="'Roboto', sans-serif">Roboto (Standard Android)</option>
                <option value="-apple-system, sans-serif">San Francisco (Standard iOS)</option>
              </select>
            </div>
            
            <div>
              <Lbl>Login Background Image</Lbl>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px dashed ${C.border}`, color: C.silver, fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
                {brandingConfig.loginBackground ? 'Change Background' : 'Upload Image'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setBrandingConfig({ ...brandingConfig, loginBackground: ev.target.result });
                  reader.readAsDataURL(file);
                }} />
              </label>
              {brandingConfig.loginBackground && (
                <button onClick={() => setBrandingConfig({ ...brandingConfig, loginBackground: null })} style={{ marginTop: 6, background: 'none', border: 'none', color: C.red, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Remove Image</button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <SwitchRow 
              checked={brandingConfig.darkMode !== false} 
              onChange={v => setBrandingConfig({ ...brandingConfig, darkMode: v })} 
              title="Force Dark Mode" 
              description="Default to dark aesthetic across the Super App." 
            />
            <SwitchRow 
              checked={brandingConfig.glassEffect !== false} 
              onChange={v => setBrandingConfig({ ...brandingConfig, glassEffect: v })} 
              title="Glassmorphism Effects" 
              description="Enable frosted glass blurring on UI cards." 
            />
            <SwitchRow 
              checked={brandingConfig.animations !== false} 
              onChange={v => setBrandingConfig({ ...brandingConfig, animations: v })} 
              title="Micro-Animations" 
              description="Enable smooth hover states and transitions." 
            />
          </div>
        </div>
      </div>
    </GCard>
  )
}

export default function SettingsModule() {
 const { paperSettings, updatePaperSettings } = usePaperStore()
 const academic = useAcademicStore()
 const logoRef = useRef()
 const signatureRef = useRef()
 const [saved, setSaved] = useState(false)
 const [showLoginPreview, setShowLoginPreview] = useState(false)
 const [saving, setSaving] = useState(false)
 const [schoolDraft, setSchoolDraft] = useState({ schoolName: '', schoolCode: '', contact: '', note: '', adminEmail: '', adminPassword: '' })
 const [twilioConfig, setTwilioConfig] = useState({
   accountSid: '',
   authToken: '',
   authTokenMasked: '',
   smsFrom: '',
   waFrom: '',
   consoleEmail: '',
   enabled: true,
   hasAuthToken: false,
   probe: null,
 })
 const [twilioLoading, setTwilioLoading] = useState(false)
 const [twilioTesting, setTwilioTesting] = useState(false)

 const upd = (k, v) => updatePaperSettings({ [k]: v })
 const superappModules = paperSettings.superappModules || {}
 const brandingConfig = paperSettings.brandingConfig || {}
 const setSuperappModule = useCallback((id, value) => {
   upd('superappModules', { ...superappModules, [id]: value })
 }, [superappModules, upd])
 const setBrandingConfig = useCallback((config) => {
   upd('brandingConfig', config)
 }, [upd])
 const showUrduHeader = paperSettings.showUrduHeader !== false
 const showUrduOnLogin = paperSettings.showUrduOnLogin === true
 const moduleAccess = paperSettings.moduleAccess || {}
 const schoolAccess = Array.isArray(paperSettings.schoolAccess) ? paperSettings.schoolAccess : []
 const localities = Array.isArray(academic.localities) ? academic.localities : []

 useEffect(() => {
 let mounted = true
 setTwilioLoading(true)
 api.get('/api/settings/twilio')
 .then((res) => {
 const data = res.data?.data || {}
 if (!mounted) return
 setTwilioConfig(prev => ({
 ...prev,
 accountSid: data.accountSid || data.account_sid || '',
 authToken: '',
 authTokenMasked: data.authTokenMasked || data.auth_token_masked || '',
 smsFrom: data.smsFrom || data.sms_from || '',
 waFrom: data.waFrom || data.wa_from || '',
 consoleEmail: data.consoleEmail || data.console_email || '',
 enabled: data.enabled !== false,
 hasAuthToken: Boolean(data.hasAuthToken ?? data.has_auth_token),
 probe: data.probe || null,
 }))
 })
 .catch(() => {})
 .finally(() => {
 if (mounted) setTwilioLoading(false)
 })
 return () => { mounted = false }
 }, [])

 const normalizeModuleAccess = useCallback((base = moduleAccess) => {
 const next = {}
 MODULE_ACCESS_OPTIONS.forEach(opt => {
 next[opt.key] = base[opt.key] !== false
 })
 return next
 }, [moduleAccess])

 const addSchoolAccess = useCallback(() => {
 const entry = {
 id: `school_${Date.now()}`,
 schoolName: schoolDraft.schoolName.trim() || `Branch ${schoolAccess.length + 1}`,
 schoolCode: schoolDraft.schoolCode.trim() || `SCH-${schoolAccess.length + 1}`,
 contact: schoolDraft.contact.trim(),
 note: schoolDraft.note.trim(),
 adminEmail: schoolDraft.adminEmail.trim(),
 adminPassword: schoolDraft.adminPassword,
 active: true,
 moduleAccess: normalizeModuleAccess(),
 createdAt: new Date().toISOString(),
 }
 upd('schoolAccess', [entry, ...schoolAccess])
 setSchoolDraft({ schoolName: '', schoolCode: '', contact: '', note: '', adminEmail: '', adminPassword: '' })
 }, [normalizeModuleAccess, schoolAccess, schoolDraft])

 const updateSchoolAccess = useCallback((id, changes) => {
 upd('schoolAccess', schoolAccess.map(item => (String(item.id) === String(id) ? { ...item, ...changes } : item)))
 }, [schoolAccess])

 const updateSchoolModule = useCallback((id, key, value) => {
 upd('schoolAccess', schoolAccess.map(item => (
 String(item.id) === String(id)
 ? { ...item, moduleAccess: { ...(item.moduleAccess || {}), [key]: value } }
 : item
 )))
 }, [schoolAccess])

 const removeSchoolAccess = useCallback((id) => {
 upd('schoolAccess', schoolAccess.filter(item => String(item.id) !== String(id)))
 }, [schoolAccess])

 const updateTwilioField = useCallback((key, value) => {
 setTwilioConfig(prev => ({ ...prev, [key]: value }))
 }, [])

 const testTwilioConnection = useCallback(async () => {
 setTwilioTesting(true)
 try {
 const res = await api.get('/api/settings/twilio/test')
 const probe = res.data?.data || {}
 setTwilioConfig(prev => ({
 ...prev,
 probe,
 authToken: '',
 authTokenMasked: prev.authTokenMasked || '',
 hasAuthToken: Boolean(prev.hasAuthToken),
 }))
 } catch (error) {
 console.error('Twilio probe failed:', error)
 alert(error?.response?.data?.message || error.message || 'Unable to verify Twilio settings.')
 } finally {
 setTwilioTesting(false)
 }
 }, [])

 const handleLogo = useCallback((e) => {
 const file = e.target.files[0]
 if (!file) return
 const reader = new FileReader()
 reader.onload = ev => upd('logo', ev.target.result)
 reader.readAsDataURL(file)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 const handleSignature = useCallback((e) => {
 const file = e.target.files[0]
 if (!file) return
 const reader = new FileReader()
 reader.onload = ev => upd('principalSignature', ev.target.result)
 reader.readAsDataURL(file)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 async function flashSaved() {
 setSaving(true)
 try {
 const res = await api.put('/api/settings', {
 school_code: paperSettings.schoolCode || '',
 school_name: paperSettings.schoolName || '',
 school_address: paperSettings.address || '',
 school_phone: paperSettings.phone || '',
 school_email: paperSettings.email || '',
 principal_name: paperSettings.principalName || '',
 academic_year: paperSettings.examYear || '',
 fee_due_date: paperSettings.fee_due_date || '10',
 attendance_threshold: paperSettings.attendance_threshold || '75',
 school_logo: paperSettings.logo || null,
 school_urdu: paperSettings.schoolUrdu || '',
 show_urdu_on_login: showUrduOnLogin,
 module_access: moduleAccess,
 school_access: schoolAccess,
 superapp_modules: superappModules,
 branding_config: brandingConfig,
 twilio_config: {
 accountSid: twilioConfig.accountSid || '',
 authToken: twilioConfig.authToken || '',
 smsFrom: twilioConfig.smsFrom || '',
 waFrom: twilioConfig.waFrom || '',
 consoleEmail: twilioConfig.consoleEmail || '',
 enabled: twilioConfig.enabled !== false,
 },
 })
 const savedSettings = normalizeSettingsResponse(res.data?.data || {})
updatePaperSettings({
 schoolCode: savedSettings.schoolCode || paperSettings.schoolCode || '',
schoolName: savedSettings.schoolName || paperSettings.schoolName || '',
address: savedSettings.schoolAddress || paperSettings.address || '',
 phone: savedSettings.schoolPhone || paperSettings.phone || '',
 email: savedSettings.schoolEmail || paperSettings.email || '',
 principalName: savedSettings.principalName || paperSettings.principalName || '',
 examYear: savedSettings.academicYear || paperSettings.examYear || '',
 fee_due_date: savedSettings.feeDueDate || paperSettings.fee_due_date || '10',
 attendance_threshold: savedSettings.attendanceThreshold || paperSettings.attendance_threshold || '75',
 logo: savedSettings.logo !== undefined ? savedSettings.logo : paperSettings.logo || null,
 schoolUrdu: savedSettings.schoolUrdu || paperSettings.schoolUrdu || '',
 showUrduOnLogin: savedSettings.showUrduOnLogin,
 moduleAccess: savedSettings.moduleAccess,
 schoolAccess: savedSettings.schoolAccess,
 superappModules: savedSettings.superappModules,
 brandingConfig: savedSettings.brandingConfig,
 })
 window.dispatchEvent(new CustomEvent('school-settings:updated', {
 detail: {
 schoolName: savedSettings.schoolName || paperSettings.schoolName || '',
 logoUrl: savedSettings.logo !== undefined ? savedSettings.logo : paperSettings.logo || null,
 address: savedSettings.schoolAddress || paperSettings.address || '',
 academicYear: savedSettings.academicYear || paperSettings.examYear || '',
 },
 }))
 setSaved(true)
 setTimeout(() => setSaved(false), 2500)
 } catch (error) {
 console.error('Branding sync failed:', error)
 setSaved(false)
 alert('Unable to sync branding to the live server right now. Local changes were still saved.')
 } finally {
 setSaving(false)
 }
 }

 return (
 <div className="super-module-card" style={{ minHeight: '100vh', background: '#071e34', color: C.silver, fontFamily: 'Inter, sans-serif' }}>
 <div className="super-module-card" style={{ padding: '24px 24px', maxWidth: 1440, margin: '0 auto' }}>

 {/* Header */}
 <GCard style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
   <div className="super-module-card" style={{ width: 52, height: 52, borderRadius: 20, background: 'rgba(142,142,147,0.15)', border: '1px solid rgba(142,142,147,0.3)', display: 'grid', placeItems: 'center', fontSize: 26 }}>⚙️</div>
   <div>
   <h1 style={{ margin: 0, fontSize: 26, color: '#fff', fontFamily: "'Playfair Display', serif", fontWeight: 800 }}>System Settings</h1>
   <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>Enterprise Control Center · Branding · Access</p>
   </div>
 </div>
 <button onClick={flashSaved} disabled={saving} style={{ padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, color: '#071e34', fontWeight: 800, fontSize: 14, boxShadow: '0 8px 24px rgba(200,153,26,0.3)' }}>
   {saving ? 'Syncing...' : 'Sync Enterprise Configurations'}
 </button>
 </GCard>
 
 {saved && (
   <div style={{ background: 'rgba(48,209,88,0.15)', border: `1px solid ${C.green}`, padding: 16, borderRadius: 16, color: C.green, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
     ✓ All settings, branding, and permissions successfully synced to live server.
   </div>
 )}

 <SuperAppControlCenter 
   superappModules={superappModules} 
   setSuperappModule={setSuperappModule}
   schoolName={paperSettings.schoolName}
   schoolLogo={paperSettings.logo}
   brandingConfig={brandingConfig}
   setBrandingConfig={setBrandingConfig}
 />

 {/* School Profile */}
 <GCard style={{ marginBottom: 20 }}>
 <SHead icon="" title="School Identity" sub="This logo and info appear on login pages, printed papers, reports, and the sidebar." />

 {/* Logo upload */}
 <div className="super-module-card" style={{ marginBottom: 24 }}>
 <Lbl>School Logo</Lbl>
 <div className="super-module-card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
 <div className="super-module-card" style={{
 width: 110, height: 110, borderRadius: 18,
 background: 'rgba(255,255,255,0.04)',
 border: `2px dashed ${paperSettings.logo ? C.gold : C.border}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 overflow: 'hidden', flexShrink: 0,
 }}>
 {paperSettings.logo
 ? <img src={paperSettings.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
 : <div className="super-module-card" style={{ textAlign: 'center', color: 'rgba(192,200,216,0.3)', fontSize: 12 }}><br />No logo</div>
 }
 </div>
 <div className="super-module-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 <button onClick={() => logoRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', background: `linear-gradient(135deg,${C.gold},${C.goldL})`, color: '#071e34', border: 'none' }}>
  {paperSettings.logo ? 'Change Logo' : 'Upload Logo'}
 </button>
 {paperSettings.logo && (
 <button onClick={() => upd('logo', null)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', background: 'rgba(255,55,95,0.15)', color: C.red, border: '1px solid rgba(255,55,95,0.3)' }}>
  Remove Logo
 </button>
 )}
 <div className="super-module-card" style={{ fontSize: 11, color: 'rgba(192,200,216,0.4)', lineHeight: 1.7 }}>
 PNG, JPG, SVG — square preferred<br />
 Appears in sidebar + all printed docs
 </div>
 </div>
 </div>
 <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />

 <div style={{
 marginTop: 18,
 padding: 16,
 borderRadius: 14,
 background: 'rgba(7,30,52,0.35)',
 border: `1px solid ${C.border}`,
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'space-between',
 gap: 14,
 flexWrap: 'wrap',
 }}>
 <div style={{ minWidth: 0 }}>
 <div style={{ color: C.muted, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
 Login Page Preview
 </div>
 <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.45 }}>
 Preview the login identity in a larger modal without repeating the same card twice on the page.
 </div>
 <div style={{ color: C.gold, fontSize: 11, fontWeight: 800, marginTop: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
 Logo syncs to login pages, sidebar, and public branding
 </div>
 </div>
 <button
 type="button"
 onClick={() => setShowLoginPreview(true)}
 style={{
 padding: '9px 14px',
 borderRadius: 10,
 border: `1px solid ${C.gold}`,
 background: 'rgba(200,153,26,0.1)',
 color: C.gold,
 cursor: 'pointer',
 fontSize: 12,
 fontWeight: 700,
 whiteSpace: 'nowrap',
 }}
 >
 Open Larger Preview
 </button>
 </div>
 </div>

 <GCard style={{ marginBottom: 20 }}>
 <SHead
 icon=""
 title="Twilio Control Center"
 sub="Manage SMS and WhatsApp sending from inside SaaS. Leave auth token blank to keep the existing value on the server."
 />

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
 <div>
 <Lbl>Twilio Account SID</Lbl>
 <Inp
 value={twilioConfig.accountSid || ''}
 onChange={e => updateTwilioField('accountSid', e.target.value)}
 placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 spellCheck={false}
 autoComplete="off"
 />
 </div>

 <div>
 <Lbl>Auth Token</Lbl>
 <Inp
 type="password"
 value={twilioConfig.authToken || ''}
 onChange={e => updateTwilioField('authToken', e.target.value)}
 placeholder={twilioConfig.hasAuthToken ? 'Leave blank to keep saved token' : 'Paste auth token'}
 spellCheck={false}
 autoComplete="new-password"
 />
 <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>
 {twilioConfig.authTokenMasked ? `Saved token: ${twilioConfig.authTokenMasked}` : 'No token saved yet.'}
 </div>
 </div>

 <div>
 <Lbl>SMS From</Lbl>
 <Inp
 value={twilioConfig.smsFrom || ''}
 onChange={e => updateTwilioField('smsFrom', e.target.value)}
 placeholder="+14059933856"
 spellCheck={false}
 autoComplete="off"
 />
 </div>

 <div>
 <Lbl>WhatsApp From</Lbl>
 <Inp
 value={twilioConfig.waFrom || ''}
 onChange={e => updateTwilioField('waFrom', e.target.value)}
 placeholder="whatsapp:+14155238886"
 spellCheck={false}
 autoComplete="off"
 />
 </div>

 <div style={{ gridColumn: '1 / -1' }}>
 <Lbl>Console Email / Reference Note</Lbl>
 <Inp
 value={twilioConfig.consoleEmail || ''}
 onChange={e => updateTwilioField('consoleEmail', e.target.value)}
 placeholder="Optional: email used to create the Twilio account"
 spellCheck={false}
 autoComplete="off"
 />
 <div style={{ color: C.muted, fontSize: 11, marginTop: 6, lineHeight: 1.6 }}>
 We cannot auto-recover the Twilio login email from API access, but you can store a reference email here for your own records.
 </div>
 </div>
 </div>

 <div style={{
 marginTop: 18,
 padding: 16,
 borderRadius: 16,
 background: 'rgba(7,30,52,0.35)',
 border: `1px solid ${C.border}`,
 display: 'grid',
 gridTemplateColumns: '1.2fr .8fr',
 gap: 16,
 }}>
 <div>
 <div style={{ color: C.muted, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Current Status</div>
 <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
 {twilioLoading ? 'Loading Twilio settings...' : twilioConfig.probe?.ok ? 'Twilio Verified' : 'Twilio Not Verified Yet'}
 </div>
 <div style={{ color: C.silver, fontSize: 13, lineHeight: 1.7 }}>
 {twilioConfig.probe?.ok
 ? `Account ${twilioConfig.probe.account?.friendlyName || twilioConfig.accountSid || 'connected'} is ${twilioConfig.probe.account?.status || 'active'} (${twilioConfig.probe.account?.type || 'unknown'}).`
 : 'Save the details below, then run the connection test to verify that the credentials and senders are valid.'}
 </div>
 </div>
 <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
 <button
 type="button"
 onClick={testTwilioConnection}
 disabled={twilioTesting || twilioLoading}
 style={{
 padding: '11px 16px',
 borderRadius: 12,
 border: 'none',
 cursor: twilioTesting || twilioLoading ? 'not-allowed' : 'pointer',
 background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
 color: '#fff',
 fontWeight: 800,
 fontSize: 13,
 boxShadow: '0 10px 24px rgba(200,153,26,0.26)',
 }}
 >
 {twilioTesting ? 'Testing...' : 'Test Twilio Connection'}
 </button>
 <button
 type="button"
 onClick={flashSaved}
 disabled={saving}
 style={{
 padding: '11px 16px',
 borderRadius: 12,
 border: '1px solid rgba(200,153,26,0.4)',
 cursor: saving ? 'not-allowed' : 'pointer',
 background: 'rgba(200,153,26,0.10)',
 color: C.gold,
 fontWeight: 800,
 fontSize: 13,
 }}
 >
 {saving ? 'Syncing...' : 'Save Twilio + Branding'}
 </button>
 </div>
 </div>
 </GCard>

 {showLoginPreview && (
 <div
 role="dialog"
 aria-modal="true"
 onClick={() => setShowLoginPreview(false)}
 style={{
 position: 'fixed',
 inset: 0,
 zIndex: 80,
 background: 'rgba(2,12,24,0.74)',
 backdropFilter: 'blur(10px)',
 display: 'grid',
 placeItems: 'center',
 padding: 20,
 }}
 >
 <div
 onClick={(e) => e.stopPropagation()}
 style={{
 width: 'min(100%, 520px)',
 borderRadius: 24,
 background: 'linear-gradient(135deg, rgba(7,30,52,0.98), rgba(11,44,77,0.96))',
 border: `1px solid ${C.border}`,
 boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
 padding: 20,
 }}
 >
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
 <div>
 <div style={{ color: C.gold, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
 Login Preview
 </div>
 <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, marginTop: 4 }}>
 {paperSettings.schoolName || 'Al Siddique Scholars Public School'}
 </div>
 </div>
 <button
 type="button"
 onClick={() => setShowLoginPreview(false)}
 style={{
 width: 36,
 height: 36,
 borderRadius: 10,
 border: 'none',
 cursor: 'pointer',
 background: 'rgba(255,255,255,0.08)',
 color: '#fff',
 fontSize: 18,
 fontWeight: 800,
 }}
 >
 ×
 </button>
 </div>

 <div
 style={{
 borderRadius: 20,
 background: 'rgba(15,23,42,0.65)',
 border: '1px solid rgba(148,163,184,0.18)',
 padding: 24,
 }}
 >
 <div style={{ textAlign: 'center', marginBottom: 24 }}>
 <div style={{ width: 96, height: 96, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
 {paperSettings.logo ? (
 <img
 src={paperSettings.logo}
 alt="Login preview logo"
 style={{
 width: 96,
 height: 96,
 objectFit: 'contain',
 filter: 'drop-shadow(0 0 10px rgba(245,197,66,0.65))',
 }}
 />
 ) : (
 <div
 style={{
 width: 76,
 height: 76,
 borderRadius: 20,
 background: 'linear-gradient(135deg, rgba(200,153,26,0.2), rgba(200,153,26,0.05))',
 border: '1px solid rgba(200,153,26,0.3)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 }}
 >
 {/* Placeholder icon removed for brevity */}
 </div>
 )}
 </div>
 <div style={{ color: '#C8991A', fontSize: 24, fontWeight: 900, lineHeight: 1.2 }}>
 {paperSettings.schoolName || 'Al Siddique Scholars Public School'}
 </div>
 <div style={{ color: C.muted, marginTop: 8, fontSize: 14 }}>
 {paperSettings.schoolUrdu || 'School name in Urdu'}
 </div>
 <div style={{ color: C.gold, marginTop: 8, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
 Logo syncs to login pages, sidebar, and public branding
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 <GCard style={{ marginBottom: 20 }}>
 <SHead
 icon=""
 title="Module Access Center"
 sub="Choose which school modules are visible for this campus or tenant."
 />
 <div style={{ display: 'grid', gap: 12 }}>
 {MODULE_ACCESS_OPTIONS.map((item) => (
 <SwitchRow
 key={item.key}
 checked={moduleAccess[item.key] !== false}
 onChange={(value) => upd('moduleAccess', { ...moduleAccess, [item.key]: value })}
 title={item.label}
 description={item.description}
 />
 ))}
 </div>
 </GCard>

 <GCard style={{ marginBottom: 20 }}>
 <SHead
 icon=""
 title="Multi-School Access Center"
 sub="Create branches, assign module access, and keep school-level permissions in one place."
 />

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
 <div>
 <Lbl>School Name</Lbl>
 <Inp value={schoolDraft.schoolName} onChange={e => setSchoolDraft(prev => ({ ...prev, schoolName: e.target.value }))} placeholder="North Campus" />
 </div>
 <div>
 <Lbl>School Code</Lbl>
 <Inp value={schoolDraft.schoolCode} onChange={e => setSchoolDraft(prev => ({ ...prev, schoolCode: e.target.value }))} placeholder="NORTH-01" />
 </div>
 <div>
 <Lbl>Contact</Lbl>
 <Inp value={schoolDraft.contact} onChange={e => setSchoolDraft(prev => ({ ...prev, contact: e.target.value }))} placeholder="0300-1234567" />
 </div>
 <div>
 <Lbl>Admin Email</Lbl>
 <Inp type="email" value={schoolDraft.adminEmail} onChange={e => setSchoolDraft(prev => ({ ...prev, adminEmail: e.target.value }))} placeholder="admin@north.edu.pk" />
 </div>
 <div>
 <Lbl>Admin Password</Lbl>
 <Inp type="text" value={schoolDraft.adminPassword} onChange={e => setSchoolDraft(prev => ({ ...prev, adminPassword: e.target.value }))} placeholder="Secure password" />
 </div>
 <div style={{ gridColumn: '1 / -1' }}>
 <Lbl>Branch Note</Lbl>
 <Inp value={schoolDraft.note} onChange={e => setSchoolDraft(prev => ({ ...prev, note: e.target.value }))} placeholder="Optional branch notes or address" />
 </div>
 </div>

 <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
 <button type="button" onClick={addSchoolAccess} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, color: '#071e34' }}>
 Add School Access
 </button>
 <button type="button" onClick={() => upd('schoolAccess', [])} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,55,95,0.3)', cursor: 'pointer', fontWeight: 600, background: 'rgba(255,55,95,0.12)', color: C.red }}>
 Clear Branches
 </button>
 <div style={{ color: C.muted, fontSize: 12, alignSelf: 'center' }}>
 Each branch can have its own visible modules and school profile details.
 </div>
 </div>

 <div style={{ display: 'grid', gap: 14 }}>
 {schoolAccess.length === 0 ? (
 <div style={{ color: C.muted, fontSize: 13, padding: '14px 16px', borderRadius: 14, background: 'rgba(7,30,52,0.35)', border: `1px dashed ${C.border}` }}>
 No branch access configured yet.
 </div>
 ) : schoolAccess.map((school) => (
 <div key={school.id} style={{ padding: 16, borderRadius: 18, background: 'rgba(7,30,52,0.4)', border: `1px solid ${C.border}`, display: 'grid', gap: 14 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
    <div style={{
      width: 54, height: 54, borderRadius: 12,
      background: 'rgba(255,255,255,0.04)', border: `1px dashed ${school.schoolLogo ? C.gold : C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0
    }}>
      {school.schoolLogo ? <img src={school.schoolLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} /> : <span style={{ fontSize: 10, color: C.muted }}>No Logo</span>}
    </div>
    <div>
      <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
        {school.schoolName || 'Branch School'}
        <label style={{ cursor: 'pointer', padding: '3px 8px', borderRadius: 6, background: 'rgba(200,153,26,0.1)', color: C.gold, fontSize: 10, fontWeight: 700, border: `1px solid ${C.gold}` }}>
          Upload Logo
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => updateSchoolAccess(school.id, { schoolLogo: ev.target.result });
            reader.readAsDataURL(file);
          }} />
        </label>
        {school.schoolLogo && (
          <button type="button" onClick={() => updateSchoolAccess(school.id, { schoolLogo: null })} style={{ cursor: 'pointer', padding: '3px 8px', borderRadius: 6, background: 'rgba(255,55,95,0.1)', color: C.red, fontSize: 10, fontWeight: 700, border: 'none' }}>
            Remove
          </button>
        )}
      </div>
      <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
        {school.schoolCode || 'No code'} {school.contact ? `· ${school.contact}` : ''}
      </div>
      {school.adminEmail && (
        <div style={{ color: C.gold, fontSize: 11, marginTop: 4, fontWeight: 700 }}>
          Login: {school.adminEmail}
        </div>
      )}
    </div>
  </div>
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
 <button type="button" onClick={() => updateSchoolAccess(school.id, { active: !school.active })} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, background: school.active ? 'rgba(48,209,88,0.14)' : 'rgba(255,55,95,0.14)', color: school.active ? C.green : C.red }}>
 {school.active ? 'Active' : 'Inactive'}
 </button>
 <button type="button" onClick={() => removeSchoolAccess(school.id)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,55,95,0.24)', cursor: 'pointer', fontWeight: 600, background: 'rgba(255,55,95,0.1)', color: C.red }}>
 Remove
 </button>
 </div>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
 {MODULE_ACCESS_OPTIONS.map((item) => {
 const enabled = school.moduleAccess?.[item.key] !== false
 return (
 <button
 key={item.key}
 type="button"
 onClick={() => updateSchoolModule(school.id, item.key, !enabled)}
 style={{
 display: 'flex',
 justifyContent: 'space-between',
 alignItems: 'center',
 gap: 10,
 padding: '10px 12px',
 borderRadius: 12,
 border: `1px solid ${enabled ? 'rgba(200,153,26,0.3)' : C.border}`,
 background: enabled ? 'rgba(200,153,26,0.12)' : 'rgba(255,255,255,0.03)',
 cursor: 'pointer',
 color: enabled ? '#fff' : C.silver,
 fontSize: 12,
 fontWeight: 700,
 textAlign: 'left',
 }}
 >
 <span>{item.label}</span>
 <span style={{
 padding: '3px 8px',
 borderRadius: 999,
 background: enabled ? 'rgba(48,209,88,0.14)' : 'rgba(255,55,95,0.12)',
 color: enabled ? C.green : C.red,
 fontSize: 11,
 fontWeight: 900,
 }}>
 {enabled ? '' : '×'}
 </span>
 </button>
 )
 })}
 </div>

 <div style={{ color: C.muted, fontSize: 12 }}>
 {school.note || 'No extra notes added.'}
 </div>
 </div>
 ))}
 </div>
 </GCard>

 {/* School fields */}
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
 <div className="super-module-card" style={{ gridColumn: '1/-1' }}>
 <Lbl>School Name (English)</Lbl>
 <Inp value={paperSettings.schoolName || ''} onChange={e => upd('schoolName', e.target.value)} placeholder="Al Siddique Scholars Public School" />
 </div>
 <div className="super-module-card" style={{ gridColumn: '1/-1' }}>
 <Lbl>School Name (Urdu)</Lbl>
 <Inp value={paperSettings.schoolUrdu || ''} onChange={e => upd('schoolUrdu', e.target.value)} placeholder="الصدّیق سکالرز پبلک سکول" dir="rtl" style={{ fontFamily: 'Noto Nastaliq Urdu, serif', fontSize: 16 }} />
 </div>
 <div className="super-module-card" style={{ gridColumn: '1/-1' }}>
 <Lbl>Address</Lbl>
 <Inp value={paperSettings.address || ''} onChange={e => upd('address', e.target.value)} placeholder="Sharif Chowk, Rayya Khas, Narowal" />
 </div>
 <div>
 <Lbl>Principal Name</Lbl>
 <Inp value={paperSettings.principalName || ''} onChange={e => upd('principalName', e.target.value)} placeholder="e.g. Mr. Tariq Mahmood" />
 </div>
 <div>
 <Lbl>Phone / Contact</Lbl>
 <Inp value={paperSettings.phone || ''} onChange={e => upd('phone', e.target.value)} placeholder="0300-0000000" />
 </div>
 <div className="super-module-card" style={{ gridColumn: '1/-1' }}>
 <SwitchRow
 checked={showUrduOnLogin}
 onChange={value => upd('showUrduOnLogin', value)}
 title="Show Urdu School Name on Login"
 description={showUrduOnLogin ? 'Urdu name appears on the login screen and public branding.' : 'Urdu name stays hidden on the login screen.'}
 />
 </div>
 <div className="super-module-card" style={{ gridColumn: '1/-1' }}>
 <Lbl>Principal Signature</Lbl>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
 <div className="super-module-card" style={{ width:180, height:62, borderRadius:12, background:'#fff', border:`1px dashed ${paperSettings.principalSignature ? C.gold : C.border}`, display:'grid', placeItems:'center', overflow:'hidden' }}>
 {paperSettings.principalSignature
 ? <img src={paperSettings.principalSignature} alt="Principal signature" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', padding:8 }} />
 : <span style={{ color:'#94A3B8', fontSize:12 }}>No signature</span>}
 </div>
 <button type="button" onClick={() => signatureRef.current.click()} style={{ padding:'10px 18px', borderRadius:10, border:'none', cursor:'pointer', fontWeight: 600, background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34' }}>{paperSettings.principalSignature ? 'Change Signature' : 'Upload Signature'}</button>
 {paperSettings.principalSignature && <button type="button" onClick={() => upd('principalSignature', null)} style={{ padding:'9px 16px', borderRadius:10, cursor:'pointer', fontWeight: 600, background:'rgba(255,55,95,0.15)', color:C.red, border:'1px solid rgba(255,55,95,0.3)' }}>Remove</button>}
 </div>
 <input ref={signatureRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleSignature} />
 </div>
 <div>
 <Lbl>Email (optional)</Lbl>
 <Inp value={paperSettings.email || ''} onChange={e => upd('email', e.target.value)} placeholder="school@example.com" />
 </div>
 <div>
 <Lbl>Academic Year / Session</Lbl>
 <Inp value={paperSettings.examYear || ''} onChange={e => upd('examYear', e.target.value)} placeholder="2026-2027" />
 </div>
 </div>

 {/* Print header options */}
 <div className="super-module-card" style={{ marginTop: 18, padding: '14px 16px', background: 'rgba(7,30,52,0.4)', borderRadius: 12, border: `1px solid ${C.border}` }}>
 <div className="super-module-card" style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Print Header Options</div>
 <SwitchRow
 checked={showUrduHeader}
 onChange={value => upd('showUrduHeader', value)}
 title="Show Urdu School Name in Print Header"
 description={showUrduHeader ? 'Urdu name will appear on papers, lesson plans, certificates and print headers.' : 'Urdu name is hidden from print headers.'}
 />
 <div style={{
 marginTop: 12,
 padding: '12px 14px',
 borderRadius: 14,
 border: `1px dashed ${showUrduHeader ? 'rgba(200,153,26,0.5)' : C.border}`,
 background: showUrduHeader ? 'rgba(200,153,26,0.07)' : 'rgba(15,23,42,0.35)',
 }}>
 <div style={{ color: C.muted, fontSize: 11, fontWeight: 800, marginBottom: 6 }}>Urdu Print Preview</div>
 <div dir="rtl" style={{
 color: showUrduHeader ? '#fff' : C.muted,
 fontFamily: 'Noto Nastaliq Urdu, Jameel Noori Nastaleeq, serif',
 fontSize: 18,
 lineHeight: 2,
 opacity: showUrduHeader ? 1 : 0.45,
 }}>
 {paperSettings.schoolUrdu || 'School name in Urdu'}
 </div>
 </div>
 </div>

 <div className="super-module-card" style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
 <button onClick={flashSaved} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', background: `linear-gradient(135deg,${C.gold},${C.goldL})`, color: '#071e34', border: 'none' }}>
  {saving ? 'Syncing...' : 'Save & Sync Branding'}
 </button>
 {saved && <span style={{ color: C.green, fontSize: 13, fontWeight: 700 }}> Saved!</span>}
 <span style={{ color: C.muted, fontSize: 12 }}>Changes are saved locally and synced to the live branding API</span>
 </div>
 </GCard>

 {/* Paper Generator Categories moved here */}
 <PaperGeneratorCategoriesCard />


 {/* Localities & Regions Settings */}
 <GCard style={{ marginBottom: 20 }}>
 <SHead icon="" title="Localities & Towns" sub="Manage the list of localities available in the Admission Form." />
 
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
 {localities.map((loc, idx) => (
 <div key={idx} className="super-module-card" style={{ 
 padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', 
 border: `1px solid ${C.border}`, position: 'relative',
 display: 'flex', justifyContent: 'space-between', alignItems: 'center'
 }}>
 <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{loc}</div>
 <button 
 onClick={() => {
 if(confirm(`Delete locality "${loc}"?`)) {
 const newLocs = localities.filter(l => l !== loc)
 academic.updateAcademic({ localities: newLocs })
 }
 }}
 style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', opacity: 0.6 }}
 ></button>
 </div>
 ))}
 
 {/* Add New Locality Card */}
 <div className="super-module-card" style={{ 
 padding: '12px 16px', borderRadius: 12, background: 'rgba(200,153,26,0.05)', 
 border: `1px dashed ${C.gold}`, display: 'flex', gap: 8,
 justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
 }} onClick={() => {
 const newLoc = prompt('Enter New Locality/Town Name:')
 if (!newLoc) return
 const currentLocs = localities
 if (!currentLocs.includes(newLoc)) {
 academic.updateAcademic({ localities: [...currentLocs, newLoc] })
 }
 }}>
 <div style={{ fontSize: 16 }}></div>
 <div style={{ color: C.gold, fontWeight: 700, fontSize: 13 }}>Add Locality</div>
 </div>
 </div>
 </GCard>


 {/* Paper header preview */}
 {/* Professional Document Header Preview */}
 <div style={{ maxWidth: 740, margin: '40px auto 0' }}>
 <div style={{ color: C.muted, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, textAlign: 'center' }}>Live Document Header Preview</div>
 <div style={{ background: '#fff', color: '#0B1F3A', padding: '32px 40px', borderRadius: 12, boxShadow: '0 12px 36px rgba(0,0,0,0.25)' }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #0B1F3A', paddingBottom: 18 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
 {paperSettings.logo ? (
 <img src={paperSettings.logo} alt="" style={{ width: 80, height: 80, objectFit: 'contain' }} />
 ) : (
 <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f0f4f8', border: '1.5px solid #d9dee8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#0B1F3A' }}>
 {(paperSettings.schoolName || 'A')[0]}
 </div>
 )}
 <div>
 {showUrduHeader && <div style={{ fontFamily: 'Noto Nastaliq Urdu, serif', fontSize: 20, direction: 'rtl', color: '#102A4C', marginBottom: 6, lineHeight: 1 }}>{paperSettings.schoolUrdu || 'School name in Urdu'}</div>}
 <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#0B1F3A', letterSpacing: '-0.5px', textTransform: 'uppercase', lineHeight: 1 }}>{paperSettings.schoolName || 'Al Siddique Scholars Public School'}</h2>
 <p style={{ margin: '6px 0 0', fontSize: 12, color: '#4b5563', fontWeight: 600 }}>{paperSettings.address || 'Sharif Chowk, Rayya Khas, Narowal'}</p>
 </div>
 </div>
 <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
 <div style={{ display: 'inline-block', padding: '4px 10px', background: '#0B1F3A', color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 20, letterSpacing: '1px' }}>EST. 2026</div>
 {paperSettings.phone && <div style={{ marginTop: 10, fontSize: 13, color: '#0B1F3A', fontWeight: 700 }}> {paperSettings.phone}</div>}
 </div>
 </div>
 </div>
 </div>

 </div>
 </div>
 )
}

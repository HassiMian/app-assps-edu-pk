import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Search, Bell, LogOut, CheckCheck, X, Menu, Settings2, BookOpen, Moon, Sun } from 'lucide-react'
import { useStudentStore } from '../../services/useStudentStore'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../services/api'

const MODULE_SEARCH_ITEMS = [
 { id:'dashboard', type:'Module', title:'Dashboard', subtitle:'School overview, stats, shortcuts', path:'/dashboard', keywords:['home','overview','stats','analytics'] },
 { id:'students', type:'Module', title:'Students', subtitle:'Admissions, profiles, lists, certificates', path:'/students', keywords:['student','gr','admission','profile','certificate','parent'] },
 { id:'attendance', type:'Module', title:'Attendance', subtitle:'Mark attendance, analytics, SMS report', path:'/attendance', keywords:['attendance','absent','present','sms'] },
 { id:'employees', type:'Module', title:'Employees', subtitle:'Staff directory, attendance, payroll', path:'/employees', keywords:['teacher','staff','employee','salary','payroll'] },
 { id:'fees', type:'Module', title:'Fees', subtitle:'Challans, payments, discounts, reports', path:'/fees/view', keywords:['fee','challan','payment','paid','discount','voucher','defaulter'] },
 { id:'exams', type:'Module', title:'Examinations', subtitle:'Exams, marks entry, result cards', path:'/examination', keywords:['exam','marks','result','grade','assessment'] },
 { id:'result-cards', type:'Action', title:'Result Cards', subtitle:'Print professional result cards', path:'/examination/results', keywords:['result card','report card','remarks','teacher remarks','print result'] },
 { id:'paper', type:'Module', title:'Paper Generator', subtitle:'Manual and AI-assisted paper generation', path:'/paper-generator', keywords:['paper','question','ai paper','lesson plan','syllabus'] },
 { id:'timetable', type:'Module', title:'Timetable', subtitle:'Class schedule and periods', path:'/timetable', keywords:['timetable','period','schedule','teacher assignment'] },
 { id:'cards', type:'Module', title:'ID Cards', subtitle:'Student and staff ID cards', path:'/cards', keywords:['id card','card','barcode','qr'] },
 { id:'settings', type:'Module', title:'System Settings', subtitle:'School logo, Urdu name, print headers', path:'/settings', keywords:['settings','logo','urdu','school profile','signature'] },
]
function nameTokens(value = '') {
 return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 1)
}

function findMentionedStudent(query, students) {
 const q = query.toLowerCase()
 return students
 .map(s => {
 const names = [s.name, s.father_name, s.father, s.gr_number, s.gr].filter(Boolean)
 const score = names.reduce((total, name) => {
 const text = String(name).toLowerCase()
 if (q.includes(text)) return total + 20
 return total + nameTokens(text).reduce((sum, token) => sum + (q.includes(token) ? 4 : 0), 0)
 }, 0)
 return { student:s, score }
 })
 .filter(item => item.score > 0)
 .sort((a,b) => b.score - a.score)[0]?.student
}

function buildAssistantSuggestion(query, students) {
 const q = query.toLowerCase()
 const wantsFee = /\b(fee|fees|challan|voucher|paid|balance|discount)\b/.test(q)
 const wantsMarks = /\b(mark|marks|assessment|exam|result|grade|score)\b/.test(q)
 if (!wantsFee && !wantsMarks) return null
 const student = findMentionedStudent(q, students)
 if (!student) {
 return {
 kind:'assistant',
 id:`assistant-${wantsFee ? 'fee' : 'marks'}-missing`,
 title:'Add a student name to search',
 subtitle:wantsFee ? 'Open Fees to view verified challan data.' : 'Open Examinations to view verified result data.',
 badge:'Navigate',
 path:wantsFee ? '/fees/view' : '/examination/results',
 score:100,
 }
 }
 return {
 kind:'assistant',
 id:`assistant-${wantsFee ? 'fee' : 'marks'}-${student.id}`,
 title:wantsFee ? `Open ${student.name}'s fee records` : `Open ${student.name}'s result records`,
 subtitle:wantsFee ? 'Verified amounts and payment status are shown in the Fees module.' : 'Verified marks are shown in the Examination module.',
 badge:wantsFee ? 'Fees' : 'Results',
 path:wantsFee ? '/fees/view' : '/examination/results',
 score:120,
 }
}

function notificationIcon(type = '') {
 const normalized = String(type || '').toLowerCase()
 if (normalized.includes('fee')) return '\u{1F4B0}'
 if (normalized.includes('attendance')) return '\u{1F4C5}'
 if (normalized.includes('exam') || normalized.includes('result')) return '\u{1F4DD}'
 if (normalized.includes('admission')) return '\u{1F3EB}'
 if (normalized.includes('success')) return '\u2705'
 return '\u{1F514}'
}

function normalizeNotification(n) {
 return {
 id: n.id,
 icon: n.icon || notificationIcon(n.type || n.title),
 title: n.title || 'Notification',
 body: n.body || n.message || '',
 time: n.time || (n.sent_at ? new Date(n.sent_at).toLocaleString('en-PK') : ''),
 unread: n.unread !== false && !n.read_at,
 }
}

export default function Topbar({ onMenuToggle, isMobile }) {
 const { user, logout } = useAuth()
 const branding = useTenantBranding()
 const { isLight, toggleTheme } = useTheme()
 const navigate = useNavigate()
 const { students: rawStudents } = useStudentStore()
 const [focused, setFocused] = useState(false)
 const [searchText, setSearchText] = useState('')
 const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
 const [showDropdown, setShowDropdown] = useState(false)
 const [showUserMenu, setShowUserMenu] = useState(false)
 const [showNotifs, setShowNotifs] = useState(false)
 const [notifs, setNotifs] = useState([])
 const [notifsLoading, setNotifsLoading] = useState(false)
 const menuRef = useRef()
 const bellRef = useRef()
 const searchRef = useRef()

 const suggestions = searchText.trim().length > 0
 ? (() => {
 const q = searchText.toLowerCase()
 const tokens = q.split(/\s+/).filter(Boolean)
 const scoreText = (values = []) => tokens.reduce((score, token) => (
 score + values.reduce((inner, value) => {
 const text = String(value || '').toLowerCase()
 if (!text) return inner
 if (text === token) return inner + 6
 if (text.startsWith(token)) return inner + 4
 if (text.includes(token)) return inner + 2
 return inner
 }, 0)
 ), 0)
 const studentMatches = rawStudents
 .map(s => ({
 kind:'student',
 id:`student-${s.id}`,
 title:s.name || 'Unnamed Student',
 subtitle:`${s.gr_number || s.gr || 'No GR'} · ${s.class || ''} ${s.section || ''} · ${s.father_name || s.father || 'No father name'}`,
 badge:s.fee_status || s.fee || 'Student',
 photo:s.photo,
 path:`/students?view=${encodeURIComponent(s.id || s.gr_number || s.gr || '')}`,
 score:scoreText([s.name, s.gr_number, s.gr, s.father_name, s.father, s.class, s.section]),
 }))
 .filter(item => item.score > 0)
 const moduleMatches = MODULE_SEARCH_ITEMS
 .map(item => ({
 kind:'module',
 id:`module-${item.id}`,
 title:item.title,
 subtitle:item.subtitle,
 badge:item.type,
 path:item.path,
 score:scoreText([item.title, item.subtitle, item.path, ...(item.keywords || [])]),
 }))
 .filter(item => item.score > 0)
 const assistant = buildAssistantSuggestion(q, rawStudents)
 return [assistant, ...moduleMatches, ...studentMatches].filter(Boolean).sort((a,b) => b.score - a.score).slice(0, 8)
 })()
 : []

 useEffect(() => {
 if (!showDropdown) return
 const handler = (e) => {
 if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false)
 }
 document.addEventListener('mousedown', handler)
 return () => document.removeEventListener('mousedown', handler)
 }, [showDropdown])

 const syncNotifications = async () => {
 setNotifsLoading(true)
 try {
 const res = await api.get('/api/notify/inbox')
 const rows = Array.isArray(res.data?.data) ? res.data.data : []
 setNotifs(rows.map(normalizeNotification))
 } catch {
 setNotifs([])
 } finally {
 setNotifsLoading(false)
 }
 }

 useEffect(() => {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 void syncNotifications()
 const handleFocus = () => syncNotifications()
 window.addEventListener('focus', handleFocus)
 return () => window.removeEventListener('focus', handleFocus)
 }, [])

 const unreadCount = notifs.filter(n => n.unread).length

 const markAllRead = async () => {
 try {
 await api.put('/api/notify/read-all')
 setNotifs(n => n.map(x => ({ ...x, unread: false })))
 } catch { /* leave local inbox unchanged if read-all fails */ }
 }
 const markRead = async (id) => {
 setNotifs(items => items.map(item => item.id === id ? { ...item, unread:false } : item))
 try { await api.put(`/api/notify/${id}/read`) }
 catch { void syncNotifications() }
 }
 const dismiss = async (id) => {
 setNotifs(items => items.filter(item => item.id !== id))
 try { await api.put(`/api/notify/${id}/archive`) }
 catch { void syncNotifications() }
 }

 useEffect(() => {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 if (!isMobile) setMobileSearchOpen(false)
 }, [isMobile])

 useEffect(() => {
 if (!showUserMenu) return
 const handler = (e) => {
 if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false)
 }
 document.addEventListener('mousedown', handler)
 return () => document.removeEventListener('mousedown', handler)
 }, [showUserMenu])

 useEffect(() => {
 if (!showNotifs) return
 const handler = (e) => {
 if (bellRef.current && !bellRef.current.contains(e.target)) setShowNotifs(false)
 }
 document.addEventListener('mousedown', handler)
 return () => document.removeEventListener('mousedown', handler)
 }, [showNotifs])

 const today = new Date().toLocaleDateString('en-PK', {
 weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
 })
 const shortSchoolName = branding?.schoolName || 'APEX'
 const schoolInitials = shortSchoolName
 .split(/\s+/)
 .filter(Boolean)
 .slice(0, 2)
 .map(part => part[0])
 .join('')
 .toUpperCase() || 'A'

 const glassCard = {
 background: 'var(--apex-bg-surface)',
 backdropFilter: 'blur(20px)',
 WebkitBackdropFilter: 'blur(20px)',
 border: '1px solid var(--apex-border-default)',
 borderRadius: 18,
 }

 const iconButton = {
 width: 44,
 height: 44,
 borderRadius: 16,
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 background: 'linear-gradient(135deg, color-mix(in srgb, var(--apex-action-primary) 18%, var(--apex-bg-surface-solid)), color-mix(in srgb, var(--apex-action-secondary) 10%, var(--apex-bg-surface-solid)))',
 border: '1px solid var(--apex-border-default)',
 boxShadow: 'var(--apex-shadow-sm)',
 cursor: 'pointer',
 transition: 'all 0.2s ease',
 }
 const ThemeIcon = isLight ? Moon : Sun

 return (
 <header className="super-topbar" style={{
 display: 'flex',
 alignItems: 'center',
 gap: isMobile ? 10 : 20,
 padding: isMobile ? '10px 14px' : '14px 24px',
 height: isMobile ? 64 : 78,
 flexShrink: 0,
 position: 'relative',
 zIndex: 100,
 background: 'color-mix(in srgb, var(--apex-bg-surface) 94%, transparent)',
 backdropFilter: 'blur(40px)',
 WebkitBackdropFilter: 'blur(40px)',
 borderBottom: '1px solid var(--apex-border-subtle)',
 boxShadow: 'var(--apex-shadow-md)',
 fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
 overflow: 'visible',
 }}>
 {/* Mobile hamburger */}
 {isMobile && onMenuToggle && (
 <button
 onClick={onMenuToggle}
 style={{
 width: 40, height: 40, borderRadius: 12, flexShrink: 0,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 background: 'var(--apex-bg-subtle)',
 border: '1px solid var(--apex-border-default)',
 cursor: 'pointer', color: 'var(--apex-text-primary)',
 }}
 >
 <Menu size={20} />
 </button>
 )}
 {isMobile && (
 <div className="super-topbar-mobile-brand">
 <div className="super-topbar-mobile-logo">
 {branding?.logoUrl ? <img src={branding.logoUrl} alt="" /> : schoolInitials}
 </div>
 <div className="super-topbar-mobile-copy">
 <div>{shortSchoolName}</div>
 <span>{new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}</span>
 </div>
 </div>
 )}
 {/* Search */}
 {!isMobile && (
 <div ref={searchRef} style={{ position: 'relative', flex: focused ? 1 : undefined, width: focused ? undefined : 320, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
 <div className="super-search-box" style={{
 display: 'flex',
 alignItems: 'center',
 gap: 12,
 padding: '11px 18px',
 borderRadius: 18,
 ...glassCard,
 boxShadow: focused ? 'var(--apex-shadow-md)' : 'var(--apex-shadow-sm)',
 }}>
 <Search size={16} color="var(--apex-text-tertiary)" />
 <input
 type="text"
 value={searchText}
 placeholder="Search students, fees, results, paper..."
 onChange={e => { setSearchText(e.target.value); setShowDropdown(true) }}
 onFocus={() => { setFocused(true); if (searchText.trim()) setShowDropdown(true) }}
 onBlur={() => setFocused(false)}
 style={{
 background: 'transparent',
 border: 'none',
 outline: 'none',
 color: 'var(--apex-text-primary)',
 fontSize: 14,
 width: '100%',
 fontWeight: '500',
 fontFamily: 'inherit',
 }}
 />
 {searchText && (
 <X size={14} color="var(--apex-text-tertiary)" style={{ cursor: 'pointer', flexShrink: 0 }}
 onMouseDown={() => { setSearchText(''); setShowDropdown(false) }} />
 )}
 </div>

 {showDropdown && suggestions.length > 0 && (
 <div className="super-search-dropdown" style={{
 position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
 background: 'color-mix(in srgb, var(--apex-bg-surface-solid) 97%, transparent)', backdropFilter: 'blur(24px)',
 border: '1px solid var(--apex-border-default)', borderRadius: 14,
 zIndex: 9999, boxShadow: 'var(--apex-shadow-lg)', overflow: 'hidden',
 }}>
 <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid var(--apex-border-subtle)' }}>
 <span style={{ color: 'var(--apex-text-tertiary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
 Smart search assistant · {suggestions.length} match{suggestions.length > 1 ? 'es' : ''}
 </span>
 </div>
 {suggestions.map(s => (
 <div key={s.id}
 onMouseDown={() => {
 navigate(s.path)
 setSearchText(s.title || '')
 setShowDropdown(false)
 }}
 style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--apex-border-subtle)', transition: 'background 0.15s' }}
 onMouseEnter={e => e.currentTarget.style.background = 'var(--apex-bg-subtle)'}
 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
 >
 <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,color-mix(in srgb,var(--apex-action-primary) 14%,var(--apex-bg-surface-solid)),color-mix(in srgb,var(--apex-action-secondary) 9%,var(--apex-bg-surface-solid)))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
 {s.kind === 'student' ? (s.photo || '') : s.kind === 'assistant' ? 'AI' : ''}
 </div>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ color: 'var(--apex-text-primary)', fontWeight: 600, fontSize: 13 }}>{s.title}</div>
 <div style={{ color: 'var(--apex-text-tertiary)', fontSize: 11, marginTop: 2 }}>
 {s.subtitle}
 </div>
 </div>
 <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, flexShrink: 0,
 background: s.badge === 'Paid' ? 'rgba(48,209,88,0.12)' : 'rgba(255,159,10,0.12)',
 color: s.badge === 'Paid' ? '#30D158' : '#FF9F0A',
 border: `1px solid ${s.badge === 'Paid' ? 'rgba(48,209,88,0.25)' : 'rgba(255,159,10,0.25)'}`,
 }}>
 {s.badge || 'Open'}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {isMobile && (
 <button
 onClick={() => setMobileSearchOpen(v => !v)}
 aria-label="Open search"
 style={{ ...iconButton, width:40, height:40, borderRadius:12, flexShrink:0 }}
 >
 <Search size={18} color="var(--apex-text-primary)" />
 </button>
 )}


 {/* Date — hidden on mobile */}
 {!isMobile && (
 <div style={{
 color: 'var(--apex-text-tertiary)',
 fontSize: 13,
 marginLeft: 'auto',
 whiteSpace: 'nowrap',
 fontWeight: '500',
 }}>
 {today}
 </div>
 )}

 {/* Session — hidden on mobile */}
 {!isMobile && (
 <div style={{
 display: 'flex',
 alignItems: 'center',
 gap: 8,
 padding: '8px 14px',
 borderRadius: 14,
 background: 'color-mix(in srgb, var(--apex-action-highlight) 8%, var(--apex-bg-surface-solid))',
 border: '1px solid color-mix(in srgb, var(--apex-action-highlight) 22%, var(--apex-border-default))',
 }}>
 <span style={{
 color: 'var(--apex-action-highlight)',
 fontSize: 13,
 fontWeight: '700',
 letterSpacing: '-0.2px',
 }}>
 2026-2027
 </span>
 </div>
 )}

 {user?.email === 'demo@assps.edu.pk' && (
 <div style={{
 display: 'flex',
 alignItems: 'center',
 gap: 6,
 padding: '8px 14px',
 borderRadius: 14,
 background: 'color-mix(in srgb, var(--apex-action-danger) 8%, var(--apex-bg-surface-solid))',
 border: '1px solid color-mix(in srgb, var(--apex-action-danger) 26%, var(--apex-border-default))',
 boxShadow: 'var(--apex-shadow-sm)',
 }}>
 <span style={{
 width: 6,
 height: 6,
 borderRadius: '50%',
 background: 'var(--apex-action-danger)',
 boxShadow: '0 0 8px color-mix(in srgb, var(--apex-action-danger) 55%, transparent)',
 }} />
 <span style={{
 color: 'var(--apex-action-danger)',
 fontSize: 12,
 fontWeight: '700',
 textTransform: 'uppercase',
 letterSpacing: '0.5px',
 }}>
 Demo Mode
 </span>
 </div>
 )}

 <button
 type="button"
 className="lightos-theme-toggle header-action-btn"
 onClick={toggleTheme}
 aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
 title={isLight ? 'Dark Mode' : 'Light Mode'}
 style={{ ...iconButton, flexShrink: 0 }}
 >
 <ThemeIcon size={18} color={isLight ? '#061A3A' : '#f8fafc'} />
 </button>

 {/* Bell */}
 <div ref={bellRef} style={{ position: 'relative', flexShrink: 0 }}>
 <div
 onClick={() => {
 setShowNotifs(v => {
 const next = !v
 if (next) syncNotifications()
 return next
 })
 }}
 style={{ ...iconButton, position: 'relative' }}
 onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
 onMouseLeave={e => e.currentTarget.style.opacity = '1'}
 >
 <Bell size={18} color="#f8fafc" />
 {unreadCount > 0 && (
 <div style={{
 position: 'absolute', top: 8, right: 8,
 minWidth: 16, height: 16, borderRadius: 8,
 background: 'var(--apex-action-primary)', border: '1.5px solid var(--apex-bg-surface-solid)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: 9, fontWeight: 800, color: '#fff', lineHeight: 1,
 padding: '0 3px',
 }}>
 {unreadCount}
 </div>
 )}
 </div>

 {showNotifs && (
 <div style={{
 position: 'absolute', right: 0, top: 'calc(100% + 10px)',
 width: isMobile ? 'min(92vw, 340px)' : 340, zIndex: 9999,
 background: 'color-mix(in srgb, var(--apex-bg-surface-solid) 97%, transparent)',
 backdropFilter: 'blur(24px)',
 border: '1px solid rgba(200,153,26,0.25)',
 borderRadius: 16,
 boxShadow: 'var(--apex-shadow-lg)',
 overflow: 'hidden',
 }}>
 {/* Header */}
 <div style={{
 display: 'flex', alignItems: 'center', justifyContent: 'space-between',
 padding: '14px 16px',
 borderBottom: '1px solid var(--apex-border-subtle)',
 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
 <Bell size={15} color="var(--apex-action-primary)" />
 <span style={{ color: 'var(--apex-text-primary)', fontWeight: 700, fontSize: 14 }}>Notifications</span>
 {unreadCount > 0 && (
 <span style={{
 background: 'color-mix(in srgb, var(--apex-action-primary) 9%, var(--apex-bg-surface-solid))', color: 'var(--apex-action-primary)',
 border: '1px solid var(--apex-border-default)',
 borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700,
 }}>{unreadCount} new</span>
 )}
 </div>
 <button
 onClick={markAllRead}
 title="Mark all read"
 style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--apex-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: 0 }}
 >
 <CheckCheck size={13} /> Mark all read
 </button>
 </div>

 {/* Items */}
 <div style={{ maxHeight: 340, overflowY: 'auto' }}>
 {notifsLoading ? (
 <div style={{ padding: 32, textAlign: 'center', color: 'var(--apex-text-tertiary)', fontSize: 13 }}>
 Loading notifications...
 </div>
 ) : notifs.length === 0 ? (
 <div style={{ padding: 32, textAlign: 'center', color: 'var(--apex-text-tertiary)', fontSize: 13 }}>
 No notifications
 </div>
 ) : notifs.map(n => (
 <div key={n.id} style={{
 display: 'flex', alignItems: 'flex-start', gap: 10,
 padding: '11px 16px',
 borderBottom: '1px solid var(--apex-border-subtle)',
 background: n.unread ? 'color-mix(in srgb, var(--apex-action-primary) 6%, transparent)' : 'transparent',
 transition: 'background 0.15s',
 }}
 role="button"
 tabIndex={0}
 onClick={() => { if (n.unread) void markRead(n.id) }}
 onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && n.unread) void markRead(n.id) }}
 onMouseEnter={e => e.currentTarget.style.background = 'var(--apex-bg-subtle)'}
 onMouseLeave={e => e.currentTarget.style.background = n.unread ? 'color-mix(in srgb, var(--apex-action-primary) 6%, transparent)' : 'transparent'}
 >
 <span style={{ fontSize: 20, lineHeight: 1.3, flexShrink: 0 }}>{n.icon}</span>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
 <span style={{ color: 'var(--apex-text-primary)', fontSize: 13, fontWeight: 600 }}>{n.title}</span>
 {n.unread && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--apex-action-primary)', flexShrink: 0 }} />}
 </div>
 <p style={{ color: 'var(--apex-text-tertiary)', fontSize: 12, margin: '2px 0 4px', lineHeight: 1.4 }}>{n.body}</p>
 <span style={{ color: 'var(--apex-text-tertiary)', fontSize: 11 }}>{n.time}</span>
 </div>
 <button
 onClick={(e) => { e.stopPropagation(); void dismiss(n.id) }}
 style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--apex-text-tertiary)', padding: 2, flexShrink: 0 }}
 onMouseEnter={e => e.currentTarget.style.color = 'var(--apex-action-danger)'}
 onMouseLeave={e => e.currentTarget.style.color = 'var(--apex-text-tertiary)'}
 >
 <X size={13} />
 </button>
 </div>
 ))}
 </div>

 {/* Footer */}
 <div style={{ padding: '10px 16px', borderTop: '1px solid var(--apex-border-subtle)' }}>
 <button
 onClick={() => { navigate('/notifications'); setShowNotifs(false) }}
 style={{
 width: '100%', padding: '9px', borderRadius: 10, border: '1px solid var(--apex-border-default)',
 background: 'color-mix(in srgb, var(--apex-action-primary) 7%, var(--apex-bg-surface-solid))', color: 'var(--apex-action-primary)', fontSize: 13, fontWeight: 600,
 cursor: 'pointer', transition: 'all 0.15s',
 }}
 onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--apex-action-primary) 12%, var(--apex-bg-surface-solid))'}
 onMouseLeave={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--apex-action-primary) 7%, var(--apex-bg-surface-solid))'}
 >
 View All Notifications →
 </button>
 </div>
 </div>
 )}
 </div>

 {/* User */}
 <div style={{ position: 'relative', flexShrink: 0 }} ref={menuRef}>
 <div
 onClick={() => setShowUserMenu(m => !m)}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: isMobile ? 0 : 12,
 padding: isMobile ? 0 : '8px 14px',
 borderRadius: 18,
 cursor: 'pointer',
 transition: 'all 0.2s ease',
 }}
 onMouseEnter={e => {
 e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
 e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.15)'
 }}
 onMouseLeave={e => {
 e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
 e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.1)'
 }}
 >
 <div style={{
 width: 40,
 height: 40,
 borderRadius: 12,
 background: 'linear-gradient(135deg, var(--apex-action-primary), color-mix(in srgb, var(--apex-action-primary) 76%, var(--apex-action-secondary)))',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 color: '#fff',
 fontSize: 16,
 fontWeight: '800',
 border: '1px solid rgba(255, 255, 255, 0.1)',
 }}>
 {user?.name?.[0] || 'A'}
 </div>
 {!isMobile && <div>
 <div style={{ color: 'var(--apex-text-primary)', fontSize: 14, fontWeight: '600', lineHeight: 1.3, marginBottom: '2px' }}>
 {user?.name?.split(' ').slice(0, 2).join(' ') || 'Admin'}
 </div>
 <div style={{ color: 'var(--apex-action-highlight)', fontSize: 12, fontWeight: '500' }}>
 {user?.designation || 'Principal'}
 </div>
 </div>
 }
 </div>

 {showUserMenu && (
 <div style={{
 position: 'absolute', right: 0, top: 'calc(100% + 8px)',
 background: 'color-mix(in srgb, var(--apex-bg-surface-solid) 97%, transparent)', border: '1px solid var(--apex-border-default)',
 borderRadius: 16, zIndex: 9999, minWidth: 200,
 boxShadow: 'var(--apex-shadow-lg)', overflow: 'hidden',
 }}>
 <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{ color: 'var(--apex-text-primary)', fontWeight: 700, fontSize: 14 }}>{user?.name || 'Admin'}</div>
 <div style={{ color: 'var(--apex-text-tertiary)', fontSize: 12 }}>{user?.designation || 'Principal'}</div>
 </div>
 {[
 { icon: <Settings2 size={14} />, label: 'System Settings', path: '/settings' },
 { icon: <BookOpen size={14} />, label: 'Academic Setup', path: '/academic' },
 ].map(item => (
 <div key={item.path} onClick={() => { navigate(item.path); setShowUserMenu(false) }}
 style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', cursor: 'pointer', color: 'var(--apex-text-secondary)', fontSize: 13, borderBottom: '1px solid var(--apex-border-subtle)' }}
 onMouseEnter={e => e.currentTarget.style.background = 'var(--apex-bg-subtle)'}
 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
 >
 <span style={{ display: 'inline-flex', alignItems: 'center' }}>{item.icon}</span><span>{item.label}</span>
 </div>
 ))}
 <div onClick={() => { logout(); navigate('/login'); setShowUserMenu(false) }}
 style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', cursor: 'pointer', color: 'var(--apex-action-danger)', fontSize: 13 }}
 onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--apex-action-danger) 7%, var(--apex-bg-surface-solid))'}
 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
 >
 <LogOut size={14}/><span>Sign Out</span>
 </div>
 </div>
 )}
 </div>
 {isMobile && mobileSearchOpen && (
 <div ref={searchRef} className="super-mobile-search-panel">
 <div className="super-search-box">
 <Search size={16} color="var(--apex-text-tertiary)" />
 <input
 type="text"
 autoFocus
 value={searchText}
 placeholder="Search..."
 onChange={e => { setSearchText(e.target.value); setShowDropdown(true) }}
 onFocus={() => { if (searchText.trim()) setShowDropdown(true) }}
 />
 <X size={16} color="#8892A4" style={{ cursor:'pointer', flexShrink:0 }} onMouseDown={() => { setSearchText(''); setShowDropdown(false); setMobileSearchOpen(false) }} />
 </div>
 {showDropdown && suggestions.length > 0 && (
 <div className="super-search-dropdown super-mobile-search-results">
 {suggestions.map(s => (
 <div key={s.id} className="super-mobile-search-item" onMouseDown={() => { navigate(s.path); setSearchText(s.title || ''); setShowDropdown(false); setMobileSearchOpen(false) }}>
 <div>
 <strong>{s.title}</strong>
 <span>{s.subtitle}</span>
 </div>
 <em>{s.badge || 'Open'}</em>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </header>
 )
}

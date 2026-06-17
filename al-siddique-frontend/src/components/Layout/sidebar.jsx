import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import { usePaperStore } from '../../Modules/Paper-Generator/usePaperStore'
import { hasPermission, ADMIN_ROLES } from '../../services/permissions'
import {
 Home,
 Users2,
 CalendarCheck,
 CreditCard,
 BookOpen,
 CalendarDays,
 FileText,
 Briefcase,
 Book,
 Bus,
 Wallet,
 MessageCircle,
 Bell,
 UserCheck,
 IdCard,
 Settings2,
 Sparkles,
 ChevronDown,
 LogOut,
 Brain,
 ScrollText,
} from 'lucide-react'

const ROLE_SETS = {
 leadership: ['super_admin', 'admin', 'principal'],
 adminOffice: ['super_admin', 'admin', 'principal', 'accountant'],
 academicStaff: ['super_admin', 'admin', 'principal', 'teacher'],
 schoolStaff: ['super_admin', 'admin', 'principal', 'teacher', 'accountant'],
 family: ['super_admin', 'admin', 'principal', 'parent'],
 learner: ['super_admin', 'admin', 'principal', 'student'],
 all: ['super_admin', 'admin', 'principal', 'teacher', 'accountant', 'parent', 'student'],
}

const MENU_GROUPS = [
 {
 label: null,
 items: [
 { icon: Home, label: 'Dashboard', path: '/dashboard', color: '#FF9F0A', roles: ROLE_SETS.all },
 { icon: Brain, label: 'AI Analytics', path: '/ai-analytics', color: '#22d3ee', highlight: true, roles: ROLE_SETS.leadership, permKey: 'ai_analytics' },
 ],
 },
 {
 label: 'STUDENTS & STAFF',
 items: [
 { icon: Users2, label: 'Students', color: '#30D158', roles: ROLE_SETS.schoolStaff, permKey: 'students_view', children: [
 { label: 'Student Records', path: '/students', roles: ROLE_SETS.schoolStaff, permKey: 'students_view' },
 { label: 'Families', path: '/families', roles: ROLE_SETS.schoolStaff, permKey: 'families' },
 { label: 'Admissions', path: '/students/admissions', roles: ROLE_SETS.leadership, permKey: 'admissions' },
 { label: 'Student Reports', path: '/students/reports', roles: ROLE_SETS.schoolStaff, permKey: 'student_reports' },
 { label: 'Promote / Demote', path: '/students/promote', roles: ROLE_SETS.leadership, permKey: 'promote' },
 ]},
 { icon: CalendarCheck, label: 'Attendance', color: '#0A84FF', roles: ROLE_SETS.academicStaff, permKey: 'attendance_mark', children: [
 { label: 'Mark Attendance', path: '/attendance/mark', roles: ROLE_SETS.academicStaff, permKey: 'attendance_mark' },
 { label: 'Analytics', path: '/attendance/analytics', roles: ROLE_SETS.leadership, permKey: 'attendance_analytics' },
 { label: 'SMS Report', path: '/attendance/sms', roles: ROLE_SETS.leadership, permKey: 'attendance_sms' },
 ]},
 { icon: Briefcase, label: 'Employees', path: '/employees', color: '#30D158', roles: ROLE_SETS.leadership, permKey: 'employees' },
 ],
 },
 {
 label: 'ACADEMICS',
 items: [
 { icon: CreditCard, label: 'Fees', color: '#FF375F', roles: ROLE_SETS.adminOffice, permKey: 'fees_view', children: [
 { label: 'Create Challan', path: '/fees/create', roles: ROLE_SETS.adminOffice, permKey: 'fees_create' },
 { label: 'View Challans', path: '/fees/view', roles: ROLE_SETS.adminOffice, permKey: 'fees_view' },
 { label: 'Fee Reports', path: '/fees/reports', roles: ROLE_SETS.adminOffice, permKey: 'fees_reports' },
 { label: 'Fee Settings', path: '/fees/settings', roles: ROLE_SETS.adminOffice, permKey: 'fees_settings' },
 ]},
 { icon: Sparkles, label: 'Examinations', color: '#BF5AF2', roles: ROLE_SETS.academicStaff, permKey: 'exams_manage', children: [
 { label: 'Manage Exams', path: '/exams', roles: ROLE_SETS.academicStaff, permKey: 'exams_manage' },
 { label: 'Marks Entry', path: '/exams/marks', roles: ROLE_SETS.academicStaff, permKey: 'exams_marks' },
 { label: 'Result Cards', path: '/exams/results', roles: ROLE_SETS.academicStaff, permKey: 'exams_results' },
 { label: 'Grade Setup', path: '/exams/grades', roles: ROLE_SETS.leadership, permKey: 'exams_grades' },
 ]},
 { icon: ScrollText, label: 'Paper Generator', path: '/paper-generator', color: '#A78BFA', roles: ROLE_SETS.academicStaff, permKey: 'paper_generator' },
 { icon: CalendarDays, label: 'Timetable', path: '/timetable', color: '#FF9F0A', roles: ROLE_SETS.academicStaff, permKey: 'timetable' },
 { icon: FileText, label: 'Datesheet', path: '/datesheet', color: '#64D2FF', roles: ROLE_SETS.academicStaff, permKey: 'datesheet' },
 ],
 },
 {
 label: 'OPERATIONS',
 items: [
 { icon: Book, label: 'Library', path: '/library', color: '#FF9F0A', roles: ROLE_SETS.schoolStaff, permKey: 'library' },
 { icon: Bus, label: 'Transport', path: '/transport', color: '#0A84FF', roles: ROLE_SETS.adminOffice, permKey: 'transport' },
 { icon: Wallet, label: 'Expenses', path: '/expenses', color: '#FF375F', roles: ROLE_SETS.adminOffice, permKey: 'expenses' },
 { icon: MessageCircle, label: 'Messages', path: '/messages', color: '#30D158', roles: ROLE_SETS.schoolStaff, permKey: 'messages' },
 ],
 },
 {
 label: 'COMMUNICATIONS',
 items: [
 { icon: Bell, label: 'Notifications', color: '#25D366', roles: ROLE_SETS.schoolStaff, permKey: 'notifications', children: [
 { label: 'Attendance Alerts', path: '/notifications?tab=attendance', roles: ROLE_SETS.schoolStaff, permKey: 'notifications' },
 { label: 'Fee Reminders', path: '/notifications?tab=fee', roles: ROLE_SETS.adminOffice, permKey: 'notifications' },
 { label: 'Exam Results', path: '/notifications?tab=results', roles: ROLE_SETS.academicStaff, permKey: 'notifications' },
 ]},
 { icon: UserCheck, label: 'Family Portals', color: '#64D2FF', roles: [...ROLE_SETS.family, 'student'], children: [
 { label: 'Parents Portal', path: '/parents', roles: ROLE_SETS.family },
 { label: 'Student Portal', path: '/student-portal', roles: ROLE_SETS.learner },
 ]},
 { icon: IdCard, label: 'Identity Studio', path: '/cards', color: '#BF5AF2', roles: ROLE_SETS.schoolStaff, permKey: 'cards' },
 ],
 },
 {
 label: 'SYSTEM',
 items: [
 { icon: BookOpen, label: 'Academic Forge', path: '/academic', color: '#FF9F0A', roles: ROLE_SETS.leadership, permKey: 'academic_setup' },
 { icon: Settings2, label: 'Command Center Settings', path: '/settings', color: '#8E8E93', roles: ROLE_SETS.leadership, permKey: 'settings' },
 ],
 },
]

function Sidebar({ collapsed, setCollapsed, isHovered, setIsHovered }) {
 const [open, setOpen] = useState(() => {
 try {
 const saved = JSON.parse(sessionStorage.getItem('al_siddique_sidebar_open') || '[]')
 return Array.isArray(saved) ? saved : []
 } catch {
 return []
 }
 })
 const navRef = useRef(null)
 const location = useLocation()

 const effectiveCollapsed = collapsed && !isHovered
 const saveSidebarPosition = () => {
 const nav = navRef.current
 if (!nav) return
 sessionStorage.setItem('al_siddique_sidebar_scroll', String(nav.scrollTop))
 }

 // Restore and save scroll position for sidebar
 useEffect(() => {
 const nav = navRef.current
 if (!nav) return

 const savedScroll = sessionStorage.getItem('al_siddique_sidebar_scroll')
 if (savedScroll) {
 const targetScroll = parseInt(savedScroll, 10)
 let attempts = 0
 let rafId = 0
 const restore = () => {
 if (!navRef.current || !Number.isFinite(targetScroll)) return
 navRef.current.scrollTop = targetScroll
 attempts += 1
 if (attempts < 8) rafId = requestAnimationFrame(restore)
 }
 rafId = requestAnimationFrame(restore)
 return () => { if (rafId) cancelAnimationFrame(rafId) }
 }
 }, [location.pathname, location.search, effectiveCollapsed, open.length])

 useEffect(() => {
 const nav = navRef.current
 if (!nav) return

 let timeoutId
 const handleScroll = (e) => {
 if (timeoutId) clearTimeout(timeoutId)
 timeoutId = setTimeout(() => {
 sessionStorage.setItem('al_siddique_sidebar_scroll', e.target.scrollTop.toString())
 }, 50)
 }
 
 nav.addEventListener('scroll', handleScroll, { passive: true })
 return () => {
 sessionStorage.setItem('al_siddique_sidebar_scroll', String(nav.scrollTop))
 nav.removeEventListener('scroll', handleScroll)
 if (timeoutId) clearTimeout(timeoutId)
 }
 }, [])

 const { user, logout } = useAuth()
 const navigate = useNavigate()
 const branding = useTenantBranding()
 const { paperSettings } = usePaperStore()
 const uploadedLogo = branding?.logoUrl || paperSettings?.logo
 const schoolName = branding?.schoolName || paperSettings?.schoolName || 'School OS'
 const role = user?.role || 'admin'
 const inactiveIcon = 'rgba(224,229,238,0.94)'
 const inactiveText = 'rgba(224,229,238,0.92)'

 const isAdmin = ADMIN_ROLES.includes(role)
 const isStaff = !isAdmin && role !== 'student' && role !== 'parent'

 const canSee = (item) => {
 if (item.roles?.length && !item.roles.includes(role)) return false
 if (isStaff && item.permKey) return hasPermission(user, item.permKey)
 return true
 }

 const visibleGroups = MENU_GROUPS.map(group => ({
 ...group,
 items: group.items
 .filter(canSee)
 .map(item => item.children
 ? { ...item, children: item.children.filter(canSee) }
 : item)
 .filter(item => !item.children || item.children.length > 0)
 })).filter(group => group.items.length > 0)

 useEffect(() => {
 const activeParents = visibleGroups
 .flatMap(group => group.items)
 .filter(item => item.children?.some(child => child.path === location.pathname || child.path === `${location.pathname}${location.search}`))
 .map(item => item.label)

 if (!activeParents.length) return
 setOpen(prev => Array.from(new Set([...prev, ...activeParents])))
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [location.pathname, location.search])

 useEffect(() => {
 sessionStorage.setItem('al_siddique_sidebar_open', JSON.stringify(open))
 }, [open])

 const toggle = (label) =>
 setOpen(p => p.includes(label) ? p.filter(l => l !== label) : [...p, label])

 // Render a single nav item (leaf)
 const renderLeaf = (item) => (
 <NavLink
 key={item.path}
 to={item.path}
 onMouseDown={saveSidebarPosition}
 onClick={saveSidebarPosition}
 className={() => ''}
 style={({ isActive }) => ({
 display: 'flex',
 alignItems: 'center',
 gap: effectiveCollapsed ? 0 : 8,
 padding: effectiveCollapsed ? '8px' : '7px 9px',
 borderRadius: 9,
 textDecoration: 'none',
 transition: 'transform 0.24s cubic-bezier(0.34,1.2,0.64,1), background 0.24s ease, box-shadow 0.24s ease',
 position: 'relative',
 cursor: 'pointer',
 justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
 background: isActive
 ? `linear-gradient(135deg, ${item.color}24 0%, rgba(15,23,42,0.26) 100%)`
 : 'transparent',
 borderLeft: isActive
 ? `3px solid ${item.color}`
 : '3px solid transparent',
 marginLeft: -3,
 color: isActive ? item.color : 'rgba(192,200,216,0.75)',
 boxShadow: isActive ? `0 8px 18px ${item.color}10` : 'none',
 })}
 >
 {({ isActive }) => (
 <>
 <div className="super-sidebar-brand-logo" style={{
 width: effectiveCollapsed ? 38 : 32, height: effectiveCollapsed ? 38 : 32, borderRadius: 10, flexShrink: 0,
 background: isActive ? `${item.color}26` : 'rgba(255,255,255,0.045)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 transition: 'all 0.2s',
 boxShadow: isActive ? `0 0 12px ${item.color}24` : 'none',
 }}>
 <item.icon size={effectiveCollapsed ? 19 : 16} color={isActive ? item.color : inactiveIcon} />
 </div>
 {!effectiveCollapsed && (
 <span style={{
 fontSize: 12, fontWeight: isActive ? 700 : 600, whiteSpace: 'nowrap',
 color: isActive ? item.color : inactiveText,
 }}>
 {item.label}
 </span>
 )}
 </>
 )}
 </NavLink>
 )

 // Render a parent item with sub-menu
 const renderParent = (item) => {
 const isOpen = open.includes(item.label)
 return (
 <div key={item.label}>
 <div
 onClick={() => {
 saveSidebarPosition()
 if (!effectiveCollapsed) toggle(item.label)
 }}
 style={{
 display: 'flex', alignItems: 'center',
 gap: effectiveCollapsed ? 0 : 8,
 padding: effectiveCollapsed ? '8px' : '7px 9px',
 borderRadius: 9,
 cursor: 'pointer',
 transition: 'transform 0.24s cubic-bezier(0.34,1.2,0.64,1), background 0.24s ease, box-shadow 0.24s ease',
 justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
 background: isOpen ? `linear-gradient(135deg, ${item.color}18, rgba(15,23,42,0.28))` : 'transparent',
 borderLeft: '3px solid transparent',
 marginLeft: -3,
 boxShadow: isOpen ? `0 8px 18px ${item.color}10` : 'none',
 }}
 >
 <div style={{
 width: effectiveCollapsed ? 38 : 32, height: effectiveCollapsed ? 38 : 32, borderRadius: 10, flexShrink: 0,
 background: isOpen ? `${item.color}22` : 'rgba(255,255,255,0.045)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 transition: 'all 0.2s',
 }}>
 <item.icon size={effectiveCollapsed ? 19 : 16} color={isOpen ? item.color : inactiveIcon} />
 </div>
 {!effectiveCollapsed && (
 <>
 <span style={{ fontSize: 12, fontWeight: isOpen ? 700 : 600, flex: 1, color: inactiveText, whiteSpace: 'nowrap' }}>
 {item.label}
 </span>
 <ChevronDown
 size={14}
 color="rgba(192,200,216,0.4)"
 style={{ transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
 />
 </>
 )}
 </div>

 {!effectiveCollapsed && isOpen && (
 <div style={{
 marginLeft: 22,
 borderLeft: `2px solid ${item.color}30`,
 paddingLeft: 10,
 paddingTop: 3,
 paddingBottom: 3,
 display: 'flex',
 flexDirection: 'column',
 gap: 2,
 }}>
 {item.children.map(child => (
 <NavLink
 key={child.path}
 to={child.path}
 onMouseDown={saveSidebarPosition}
 onClick={saveSidebarPosition}
 style={({ isActive }) => ({
 display: 'block',
 padding: '6px 9px',
 borderRadius: 7,
 textDecoration: 'none',
 fontSize: 11.5,
 fontWeight: isActive ? 700 : 500,
 color: isActive ? item.color : 'rgba(136,146,164,0.9)',
 background: isActive ? `${item.color}15` : 'transparent',
 transition: 'all 0.15s',
 })}
 >
 {child.label}
 </NavLink>
 ))}
 </div>
 )}
 </div>
 )
 }

 return (
 <aside
 onMouseEnter={() => setIsHovered?.(true)}
 onMouseLeave={() => setIsHovered?.(false)}
 className={`super-sidebar h-screen flex flex-col rounded-r-2xl transition-all duration-300 ${effectiveCollapsed ? 'w-[68px]' : 'w-56'}`}
 style={{
 position: 'relative',
 zIndex: 1,
 width: '100%',
 maxWidth: '100%',
 transform: 'translateZ(0)',
 height: '100dvh',
 minHeight: '100dvh',
 background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(10,28,49,0.98) 100%)',
 borderRight: '1px solid rgba(148,163,184,0.18)',
 boxShadow: '10px 0 28px rgba(0,0,0,0.30), -1px 0 0 rgba(200,153,26,0.12) inset',
 overflow: 'hidden',
 filter: 'none',
 }}
 >
 {/* Gradient overlay hint */}
 <div style={{
 position: 'absolute', top: 0, left: 0, right: 0, height: 200, pointerEvents: 'none',
 background: 'radial-gradient(circle at 18% 12%, rgba(10,132,255,0.18), transparent 34%), radial-gradient(circle at 74% 6%, rgba(200,153,26,0.12), transparent 30%)',
 borderRadius: '0 0 50% 0',
 }} />
 <div style={{
 position: 'absolute',
 bottom: 110,
 left: -80,
 width: 220,
 height: 220,
 borderRadius: '50%',
 background: 'radial-gradient(circle, rgba(48,209,88,0.1), transparent 70%)',
 pointerEvents: 'none',
 }} />

 {/* Brand Header */}
 <div style={{
 padding: effectiveCollapsed ? '18px 10px' : '18px 16px 16px',
 display: 'flex', alignItems: 'center', gap: 10,
 borderBottom: '1px solid rgba(148,163,184,0.12)',
 justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
 flexShrink: 0,
 }}>
 <div style={{
 width: effectiveCollapsed ? 48 : 40, height: effectiveCollapsed ? 48 : 40,
 borderRadius: effectiveCollapsed ? 14 : 12,
 background: uploadedLogo ? '#fff' : 'linear-gradient(135deg, #0A84FF, #22d3ee)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 boxShadow: '0 10px 26px rgba(10,132,255,0.34), 0 0 18px rgba(34,211,238,0.16)',
 flexShrink: 0,
 overflow: 'hidden',
 padding: uploadedLogo ? 4 : 0,
 transition: 'all 0.3s',
 }}>
 {uploadedLogo
 ? <img src={uploadedLogo} alt="School logo" style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }} />
 : <Brain size={effectiveCollapsed ? 26 : 22} color="#fff" />}
 </div>
  {!effectiveCollapsed && (
  <div style={{ minWidth: 0 }}>
  <h1 className="super-sidebar-brand-title" style={{ 
    fontSize: 15, 
    fontWeight: 800, 
    margin: 0, 
    letterSpacing: '-0.3px', 
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    background: 'linear-gradient(90deg, #fff 0%, #C8991A 50%, #fff 100%)',
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'shimmer 4s linear infinite',
    filter: 'drop-shadow(0 0 8px rgba(200,153,26,0.3))'
  }}>
  {schoolName}
  </h1>
  <style>{`
    @keyframes shimmer {
      to { background-position: 200% center; }
    }
  `}</style>
  <div style={{ fontSize: 9, color: 'rgba(200,153,26,0.7)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
  Smart School Portal
  </div>
  <div style={{ fontSize: 10, color: 'rgba(192,200,216,0.5)', marginTop: 3 }}>
  School operations at a glance
  </div>
  </div>
  )}
  </div>

 {/* Nav */}
 <nav
 ref={navRef}
 className="custom-scrollbar"
 style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: effectiveCollapsed ? '12px 8px' : '12px 16px', display: 'flex', flexDirection: 'column', gap: 0, scrollbarWidth: 'thin', scrollbarColor: 'rgba(200,153,26,0.25) transparent' }}
 >
 {visibleGroups.map((group, gi) => (
 <div key={gi} style={{ marginBottom: 8 }}>
 {/* Group label divider */}
 {group.label && !effectiveCollapsed && (
 <div className="super-sidebar-user-card" style={{
 display: 'flex', alignItems: 'center', gap: 8,
 padding: '10px 4px 6px',
 marginTop: gi === 0 ? 0 : 4,
 }}>
 <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, rgba(200,153,26,0.06), rgba(200,153,26,0.18))' }} />
 <span style={{
 fontSize: 9, fontWeight: 800, letterSpacing: '1.2px',
 color: 'rgba(200,153,26,0.45)',
 textTransform: 'uppercase', whiteSpace: 'nowrap',
 background: 'rgba(200,153,26,0.06)',
 border: '1px solid rgba(200,153,26,0.12)',
 borderRadius: 999,
 padding: '3px 8px',
 }}>
 {group.label}
 </span>
 <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, rgba(200,153,26,0.18), rgba(200,153,26,0.06))' }} />
 </div>
 )}
 {/* Items */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
 {group.items.map(item =>
 item.children ? renderParent(item) : renderLeaf(item)
 )}
 </div>
 </div>
 ))}
 </nav>

 {/* User & Actions */}
 <div style={{
 padding: effectiveCollapsed ? '12px 8px' : '12px 14px',
 borderTop: '1px solid rgba(148,163,184,0.12)',
 display: 'flex', flexDirection: 'column', gap: 8,
 flexShrink: 0,
 }}>
 {!effectiveCollapsed && (
 <div style={{
 padding: '10px 12px',
 background: 'rgba(11,44,77,0.92)',
 border: '1px solid rgba(148,163,184,0.16)',
 borderRadius: 18,
 display: 'flex', alignItems: 'center', gap: 10,
 }}>
 <div style={{
 width: 34, height: 34, borderRadius: '50%',
 background: 'linear-gradient(135deg, #0A84FF, #22d3ee)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0,
 }}>
 {user?.name?.[0] || 'A'}
 </div>
 <div style={{ minWidth: 0 }}>
 <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
 {user?.name || 'Admin User'}
 </div>
 <div style={{ color: 'rgba(200,153,26,0.7)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
 {user?.designation || 'Master'}
 </div>
 </div>
 </div>
 )}
 <div style={{ display: 'flex', gap: 6 }}>
 <button
 onClick={() => { logout(); navigate('/login') }}
 style={{
 flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
 background: 'rgba(255,55,95,0.1)', color: '#FF375F',
 border: '1px solid rgba(255,55,95,0.2)', borderRadius: 12,
 padding: effectiveCollapsed ? '10px 0' : '9px 12px',
 fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
 }}
 >
 <LogOut size={14} /> {!effectiveCollapsed && 'Logout'}
 </button>
 <button
 onClick={() => setCollapsed(!collapsed)}
 style={{
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 padding: '9px 11px', borderRadius: 12,
 background: 'rgba(11,44,77,0.92)',
 border: '1px solid rgba(148,163,184,0.16)',
 color: 'rgba(192,200,216,0.6)', cursor: 'pointer', transition: 'all 0.2s',
 fontSize: 13,
 }}
 >
 {collapsed ? '→' : '←'}
 </button>
 </div>
 </div>
 </aside>
 )
}

export default Sidebar

import { Component, Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TenantBrandingProvider } from './context/TenantBrandingContext'
import { ThemeProvider } from './context/ThemeContext'
import { hasPermission, ADMIN_ROLES } from './services/permissions'
import { normalizeAppRole } from './utils/role'
import PremiumProgressLoader from './components/PremiumProgressLoader'

function lazyRetry(importer, name) {
  return lazy(() =>
    importer().catch((error) => {
      const storageKey = `al_siddique_lazy_retry_${name}`
      const storage = typeof window !== 'undefined' ? window.sessionStorage : null
      const alreadyRetried = storage?.getItem(storageKey) === '1'

      if (!alreadyRetried && typeof window !== 'undefined') {
        try { storage?.setItem(storageKey, '1') } catch {}
        // Use replace so browser back-button works; do NOT use reload() — causes blank loop
        const freshUrl = window.location.pathname + window.location.search
        window.location.replace(freshUrl)
        return new Promise(() => {})
      }

      // Second attempt failed — throw so AppErrorBoundary shows recovery UI
      throw error
    })
  )
}

const LoginPage = lazyRetry(() => import('./pages/LoginPage'), 'LoginPage')
const ForcePasswordChangePage = lazyRetry(() => import('./pages/ForcePasswordChangePage'), 'ForcePasswordChangePage')
const AppLayout = lazyRetry(() => import('./components/Layout/AppLayout'), 'AppLayout')
const Dashboard = lazyRetry(() => import('./pages/Dashboard'), 'Dashboard')
const AIAnalytics = lazyRetry(() => import('./pages/AIAnalytics'), 'AIAnalytics')

const PaperGenerator = lazyRetry(() => import('./Modules/Paper-Generator/PaperGenerator'), 'PaperGenerator')
const UnifiedPaperGenerator = lazyRetry(() => import('./Modules/Paper-Generator/UnifiedPaperGenerator'), 'UnifiedPaperGenerator')
const OnlineTest = lazyRetry(() => import('./Modules/Paper-Generator/OnlineTest'), 'OnlineTest')
const QuestionBank = lazyRetry(() => import('./Modules/Paper-Generator/QuestionBank'), 'QuestionBank')
const StudentModule = lazyRetry(() => import('./Modules/students/StudentModule'), 'StudentModule')
const AdmissionsModule = lazyRetry(() => import('./Modules/students/AdmissionsModule'), 'AdmissionsModule')
const StudentReports = lazyRetry(() => import('./Modules/students/StudentReports'), 'StudentReports')
const PromoteDemote = lazyRetry(() => import('./Modules/students/PromoteDemote'), 'PromoteDemote')
const StudentPortal = lazyRetry(() => import('./Modules/StudentPortal'), 'StudentPortal')
const AttendanceModule = lazyRetry(() => import('./Modules/attendance/AttendanceModule'), 'AttendanceModule')
const MarkAttendance = lazyRetry(() => import('./Modules/attendance/MarkAttendance'), 'MarkAttendance')
const Analytics = lazyRetry(() => import('./Modules/attendance/Analytics'), 'AttendanceAnalytics')
const SMSReport = lazyRetry(() => import('./Modules/attendance/SMSReport'), 'SMSReport')
const QRAttendance = lazyRetry(() => import('./Modules/attendance/SmartAttendance'), 'QRAttendance')
const FeeModule = lazyRetry(() => import('./Modules/fees/FeeModule'), 'FeeModule')
const CreateChallan = lazyRetry(() => import('./Modules/fees/CreateChallan'), 'CreateChallan')
const ViewChallans = lazyRetry(() => import('./Modules/fees/ViewChallans'), 'ViewChallans')
const FeeReporting = lazyRetry(() => import('./Modules/fees/FeeReporting'), 'FeeReporting')
const FeeSettings = lazyRetry(() => import('./Modules/fees/FeeSettings'), 'FeeSettings')
const ExaminationModule = lazyRetry(() => import('./Modules/examination/ExaminationModule'), 'ExaminationModule')
const ManageExams = lazyRetry(() => import('./Modules/examination/ManageExams'), 'ManageExams')
const MarksSheet = lazyRetry(() => import('./Modules/examination/MarksSheet'), 'MarksSheet')
const ResultCards = lazyRetry(() => import('./Modules/examination/ResultCards'), 'ResultCards')
const GradeSettings = lazyRetry(() => import('./Modules/examination/GradeSettings'), 'GradeSettings')
const TimetableModule = lazyRetry(() => import('./Modules/timetable/TimetableModule'), 'TimetableModule')
const EmployeesModule = lazyRetry(() => import('./Modules/employees/EmployeesModule'), 'EmployeesModule')
const Library = lazyRetry(() => import('./Modules/Library'), 'Library')
const Transport = lazyRetry(() => import('./Modules/Transport'), 'Transport')
const Expenses = lazyRetry(() => import('./Modules/Expenses'), 'Expenses')
const NotificationModule = lazyRetry(() => import('./Modules/notifications/NotificationModule'), 'NotificationModule')
const Messages = lazyRetry(() => import('./Modules/Messages'), 'Messages')
const ParentsPortal = lazyRetry(() => import('./Modules/ParentsPortal'), 'ParentsPortal')
const DateSheet = lazyRetry(() => import('./Modules/DateSheet'), 'DateSheet')
const SettingsModule = lazyRetry(() => import('./Modules/settings/SettingsModule'), 'SettingsModule')
const CardsGeneratorModule = lazyRetry(() => import('./Modules/cards/CardsGeneratorModule'), 'CardsGeneratorModule')
const AcademicSetupModule = lazyRetry(() => import('./Modules/academic/AcademicSetupModule'), 'AcademicSetupModule')
const FamilyModule = lazyRetry(() => import('./Modules/families/FamilyModule'), 'FamilyModule')
const SubscriptionRequests = lazyRetry(() => import('./Modules/subscriptions/SubscriptionRequests'), 'SubscriptionRequests')

const ComingSoon = ({ name }) => (
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
 <div style={{
 textAlign: 'center', padding: 40,
 background: 'rgba(11,44,77,0.5)', borderRadius: 20,
 border: '1px solid rgba(200,153,26,0.2)',
 }}>
 <div style={{ fontSize: 52, marginBottom: 16 }}></div>
 <h2 style={{ color: '#C8991A', marginBottom: 8, fontSize: 22 }}>{name}</h2>
 <p style={{ color: '#8892A4', fontSize: 15 }}>This module is coming soon!</p>
 </div>
 </div>
)

const AppRouteLoader = ({ label = 'Loading module...' }) => (
  <PremiumProgressLoader />
)

function WindowScrollRestoration() {
 const location = useLocation()

 useEffect(() => {
 if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
 }, [])

 useEffect(() => {
 const key = `al_siddique_window_scroll_${location.pathname}${location.search}`
 const saved = sessionStorage.getItem(key)
 const target = saved != null ? parseInt(saved, 10) : 0
 let raf1 = 0
 let raf2 = 0
 const restore = () => window.scrollTo({ top: Number.isFinite(target) ? target : 0, left: 0, behavior: 'auto' })
 raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(restore) })

 const onScroll = () => sessionStorage.setItem(key, String(window.scrollY))
 const onPageShow = (event) => { if (event.persisted) restore() }
 window.addEventListener('scroll', onScroll, { passive: true })
 window.addEventListener('pageshow', onPageShow)

 return () => {
 sessionStorage.setItem(key, String(window.scrollY))
 window.removeEventListener('scroll', onScroll)
 window.removeEventListener('pageshow', onPageShow)
 if (raf1) cancelAnimationFrame(raf1)
 if (raf2) cancelAnimationFrame(raf2)
 }
 }, [location.pathname, location.search])

 return null
}

const ROLES = {
 leadership: ['super_admin', 'admin', 'principal'],
 adminOffice: ['super_admin', 'admin', 'principal', 'accountant'],
 academicStaff: ['super_admin', 'admin', 'principal', 'teacher'],
 schoolStaff: ['super_admin', 'admin', 'principal', 'teacher', 'accountant'],
 family: ['super_admin', 'admin', 'principal', 'parent'],
 learner: ['super_admin', 'admin', 'principal', 'student'],
 all: ['super_admin', 'admin', 'principal', 'teacher', 'accountant', 'parent', 'student'],
}

function UnauthorizedModule() {
 return (
 <div className="super-module-error">
 <div className="super-module-error__glow" />
 <div className="super-module-error__kicker">ACCESS CONTROL</div>
 <h2>You do not have access to this module.</h2>
 <p>Contact your administrator to request access.</p>
 </div>
 )
}

function ProtectedRoute({ children, roles = ROLES.all, permKey, allowMustChange = false }) {
 const { user, loading } = useAuth()
 if (loading) return <AppRouteLoader label="Restoring session..." />
 if (!user) return <Navigate to="/login" replace />

 if ((user?.mustChangePassword || user?.must_change_password) && !allowMustChange) {
 return <Navigate to="/change-password" replace />
 }

 const role = normalizeAppRole(user?.role)
 if (roles?.length && !roles.includes(role)) {
 return <AppLayout><UnauthorizedModule /></AppLayout>
 }

 const isStaff = !ADMIN_ROLES.includes(role) && role !== 'student' && role !== 'parent'
 if (isStaff && permKey && !hasPermission(user, permKey)) {
 return <AppLayout><UnauthorizedModule /></AppLayout>
 }

 return children
}

class RouteErrorBoundary extends Component {
 constructor(props) {
 super(props)
 this.state = { error: null }
 }

 static getDerivedStateFromError(error) {
 return { error }
 }

 componentDidCatch(error, info) {
 console.error('Module render error:', error, info)
 }

 componentDidUpdate(prevProps) {
 if (prevProps.children !== this.props.children && this.state.error) {
 this.setState({ error: null })
 }
 }

 render() {
 if (!this.state.error) return this.props.children

 return (
 <div className="super-module-error">
 <div className="super-module-error__glow" />
 <div className="super-module-error__kicker">MODULE RECOVERY</div>
 <h2>Module could not render</h2>
 <p>{this.state.error?.message || 'A screen error occurred.'}</p>
 <button
 type="button"
 onClick={() => {
 this.setState({ error: null })
 window.location.reload()
 }}
 style={{
 marginTop: 18,
 padding: '10px 18px',
 borderRadius: 14,
 border: '1px solid rgba(200,153,26,0.28)',
 background: 'linear-gradient(135deg, #C8991A, #e5b82f)',
 color: '#071e34',
 fontSize: 14,
 fontWeight: 500,
 letterSpacing: '0.01em',
 fontFamily: '"Aptos", "Avenir Next", "Segoe UI", sans-serif',
 cursor: 'pointer',
 boxShadow: '0 10px 22px rgba(200,153,26,0.18)',
 }}
 >
 Try Again
 </button>
 </div>
 )
 }
}

class AppErrorBoundary extends Component {
 constructor(props) {
 super(props)
 this.state = { error: null }
 }

 static getDerivedStateFromError(error) {
 return { error }
 }

 componentDidCatch(error, info) {
 console.error('APEX app shell render error:', error, info)
 }

 render() {
 if (this.state.error) {
 return (
 <div style={{
 minHeight: '100vh',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 padding: 24,
 background: '#071e34',
 color: '#f8fafc',
 fontFamily: 'Inter, system-ui, sans-serif',
 }}>
 <div style={{
 width: 'min(520px, 100%)',
 borderRadius: 24,
 padding: 28,
 background: 'rgba(15,23,42,0.82)',
 border: '1px solid rgba(148,163,184,0.22)',
 boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
 }}>
 <div style={{ color: '#C8991A', fontSize: 12, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
 APEX Recovery Mode
 </div>
 <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>The app shell hit a render error.</h1>
 <p style={{ color: '#94A3B8', lineHeight: 1.6 }}>
 The dashboard is protected from going blank. Reload the page, and check the browser console for the logged developer error.
 </p>
 <button
 onClick={() => window.location.reload()}
 style={{
 border: 0,
 borderRadius: 12,
 padding: '11px 18px',
 background: 'linear-gradient(135deg,#C8991A,#9A7210)',
 color: '#071e34',
 fontWeight: 900,
 cursor: 'pointer',
 }}
 >
 Reload APEX
 </button>
 </div>
 </div>
 )
 }

 return this.props.children
 }
}

const InnerRouteLoader = () => (
  <PremiumProgressLoader />
)

const W = ({ children, roles = ROLES.all, permKey }) => (
 <ProtectedRoute roles={roles} permKey={permKey}>
 <AppLayout>
 <Suspense fallback={<InnerRouteLoader />}>
 <RouteErrorBoundary>{children}</RouteErrorBoundary>
 </Suspense>
 </AppLayout>
 </ProtectedRoute>
)

const WPasswordChange = ({ children }) => (
 <ProtectedRoute allowMustChange={true}>
 <Suspense fallback={<InnerRouteLoader />}>
 <RouteErrorBoundary>{children}</RouteErrorBoundary>
 </Suspense>
 </ProtectedRoute>
)

function AppRoutes() {
 return (
 <Suspense fallback={<AppRouteLoader />}>
 <Routes>
 <Route path="/login" element={<LoginPage />} />
 <Route path="/change-password" element={<WPasswordChange><ForcePasswordChangePage /></WPasswordChange>} />
 <Route path="/" element={<Navigate to="/dashboard" replace />} />

 <Route path="/dashboard" element={<W><Dashboard /></W>} />
 <Route path="/ai-analytics" element={<W roles={ROLES.leadership} permKey="ai_analytics"><AIAnalytics /></W>} />

 <Route path="/paper-generator" element={<W roles={ROLES.academicStaff} permKey="paper_generator"><PaperGenerator /></W>} />
 <Route path="/paper-generator/unified" element={<W roles={ROLES.academicStaff} permKey="paper_generator"><UnifiedPaperGenerator /></W>} />
 <Route path="/paper-generator/saved" element={<Navigate to="/paper-generator" replace />} />
 <Route path="/online-test/:examId" element={<W roles={[...ROLES.academicStaff, 'student']}><OnlineTest /></W>} />

 <Route path="/students" element={<W roles={ROLES.schoolStaff} permKey="students_view"><StudentModule /></W>} />
 <Route path="/students/admissions" element={<W roles={ROLES.leadership} permKey="admissions"><AdmissionsModule /></W>} />
 <Route path="/students/reports" element={<W roles={ROLES.schoolStaff} permKey="student_reports"><StudentReports /></W>} />
 <Route path="/students/promote" element={<W roles={ROLES.leadership} permKey="promote"><PromoteDemote /></W>} />
 <Route path="/student-portal" element={<W roles={ROLES.learner}><StudentPortal /></W>} />
 <Route path="/student" element={<W roles={ROLES.learner}><StudentPortal /></W>} />

 <Route path="/attendance" element={<W roles={ROLES.academicStaff} permKey="attendance_view"><AttendanceModule /></W>} />
 <Route path="/attendance/mark" element={<W roles={ROLES.academicStaff} permKey="attendance_mark"><MarkAttendance /></W>} />
 <Route path="/attendance/analytics" element={<W roles={ROLES.leadership} permKey="attendance_analytics"><Analytics /></W>} />
 <Route path="/attendance/sms" element={<W roles={ROLES.leadership} permKey="attendance_sms"><SMSReport /></W>} />
 <Route path="/attendance/qr-scan" element={<W roles={ROLES.academicStaff} permKey="attendance_qr"><QRAttendance /></W>} />

 <Route path="/fees" element={<W roles={ROLES.adminOffice} permKey="fees_view"><FeeModule /></W>} />
 <Route path="/fees/create" element={<W roles={ROLES.adminOffice} permKey="fees_create"><CreateChallan /></W>} />
 <Route path="/fees/challans" element={<W roles={ROLES.adminOffice} permKey="fees_view"><ViewChallans /></W>} />
 <Route path="/fees/view" element={<W roles={ROLES.adminOffice} permKey="fees_view"><ViewChallans /></W>} />
 <Route path="/fees/reporting" element={<W roles={ROLES.adminOffice} permKey="fees_reports"><FeeReporting /></W>} />
 <Route path="/fees/reports" element={<W roles={ROLES.adminOffice} permKey="fees_reports"><FeeReporting /></W>} />
 <Route path="/fees/settings" element={<W roles={ROLES.adminOffice} permKey="fees_settings"><FeeSettings /></W>} />
 <Route path="/fees/proofs" element={<W roles={ROLES.adminOffice} permKey="fees_view"><FeeModule /></W>} />

 <Route path="/examination" element={<W roles={ROLES.academicStaff} permKey="exams_manage"><ExaminationModule /></W>} />
 <Route path="/examination/manage" element={<W roles={ROLES.academicStaff} permKey="exams_manage"><ManageExams /></W>} />
 <Route path="/examination/marks" element={<W roles={ROLES.academicStaff} permKey="exams_marks"><MarksSheet /></W>} />
 <Route path="/examination/results" element={<W roles={ROLES.academicStaff} permKey="exams_results"><ResultCards /></W>} />
 <Route path="/examination/cards" element={<W roles={ROLES.academicStaff} permKey="exams_results"><ResultCards /></W>} />
 <Route path="/exams" element={<W roles={ROLES.academicStaff} permKey="exams_manage"><ManageExams /></W>} />
 <Route path="/exams/marks" element={<W roles={ROLES.academicStaff} permKey="exams_marks"><MarksSheet /></W>} />
 <Route path="/exams/results" element={<W roles={ROLES.academicStaff} permKey="exams_results"><ResultCards /></W>} />
 <Route path="/exams/grades" element={<W roles={ROLES.leadership} permKey="exams_grades"><GradeSettings /></W>} />

 <Route path="/timetable" element={<W roles={ROLES.academicStaff} permKey="timetable"><TimetableModule /></W>} />
 <Route path="/question-bank" element={<W roles={ROLES.academicStaff} permKey="question_bank"><QuestionBank /></W>} />
 <Route path="/employees" element={<W roles={ROLES.leadership} permKey="employees"><EmployeesModule /></W>} />
 <Route path="/employees/*" element={<W roles={ROLES.leadership} permKey="employees"><EmployeesModule /></W>} />
 <Route path="/notifications" element={<W roles={ROLES.schoolStaff} permKey="notifications"><NotificationModule /></W>} />
 <Route path="/transport" element={<W roles={ROLES.adminOffice} permKey="transport"><Transport /></W>} />
 <Route path="/expenses" element={<W roles={ROLES.adminOffice} permKey="expenses"><Expenses /></W>} />
 <Route path="/messages" element={<W roles={ROLES.schoolStaff} permKey="messages"><Messages /></W>} />
 <Route path="/parents" element={<W roles={ROLES.family}><ParentsPortal /></W>} />
 <Route path="/parent-portal" element={<W roles={ROLES.family}><ParentsPortal /></W>} />
 <Route path="/library" element={<W roles={ROLES.schoolStaff} permKey="library"><Library /></W>} />
 <Route path="/datesheet" element={<W roles={ROLES.academicStaff} permKey="datesheet"><DateSheet /></W>} />
 <Route path="/cards" element={<W roles={ROLES.schoolStaff} permKey="cards"><CardsGeneratorModule /></W>} />
 <Route path="/academic" element={<W roles={ROLES.leadership} permKey="academic_setup"><AcademicSetupModule /></W>} />
 <Route path="/id-cards" element={<W roles={ROLES.schoolStaff} permKey="cards"><ComingSoon name="ID Cards Generator" /></W>} />
 <Route path="/academic-setup" element={<W roles={ROLES.leadership} permKey="academic_setup"><AcademicSetupModule /></W>} />
 <Route path="/families" element={<W roles={ROLES.schoolStaff} permKey="families"><FamilyModule /></W>} />
 <Route path="/settings" element={<W roles={ROLES.leadership} permKey="settings"><SettingsModule /></W>} />
 <Route path="/admin/subscription-requests" element={<W roles={['super_admin']}><SubscriptionRequests /></W>} />

 <Route path="*" element={<Navigate to="/dashboard" replace />} />
 </Routes>
 </Suspense>
 )
}

export default function App() {
 return (
 <AppErrorBoundary>
 <BrowserRouter>
 <ThemeProvider>
 <AuthProvider>
 <TenantBrandingProvider>
 <WindowScrollRestoration />
 <AppRoutes />
 </TenantBrandingProvider>
 </AuthProvider>
 </ThemeProvider>
 </BrowserRouter>
 </AppErrorBoundary>
 )
}

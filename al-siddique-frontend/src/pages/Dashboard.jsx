import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Book,
  Calendar,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  MessageCircle,
  ShieldAlert,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useTenantBranding } from '../context/TenantBrandingContext'
import { BarChart, ChartLegend, DonutChart } from '../components/Charts'
import SchoolHero from '../components/SchoolHero'
import { AttendanceStatsCard, AdmissionWithdrawalStatsCard } from '../components/dashboard/DashboardAnalyticsCards'

const ATTENDANCE_DATA = [
  { day: 'Mon', pct: 94 },
  { day: 'Tue', pct: 88 },
  { day: 'Wed', pct: 78 },
  { day: 'Thu', pct: 90 },
  { day: 'Fri', pct: 60 },
  { day: 'Sat', pct: 72 },
]

const QUICK_ACTIONS = [
  { label: 'Add Student', icon: UserPlus, path: '/students?add=1', color: '#0A84FF', grad: 'linear-gradient(135deg,#0A84FF,#0060D0)' },
  { label: 'Attendance', icon: CheckCircle2, path: '/attendance/mark', color: '#30D158', grad: 'linear-gradient(135deg,#30D158,#1A8C3A)' },
  { label: 'Create Challan', icon: CreditCard, path: '/fees/create', color: '#C8991A', grad: 'linear-gradient(135deg,#C8991A,#9A7210)' },
  { label: 'Paper Generator', icon: FileText, path: '/paper-generator', color: '#BF5AF2', grad: 'linear-gradient(135deg,#BF5AF2,#8E3AC0)' },
  { label: 'Add Employee', icon: Users, path: '/employees?add=1', color: '#FF9F0A', grad: 'linear-gradient(135deg,#FF9F0A,#C07000)' },
  { label: 'View Reports', icon: BarChart3, path: '/students/reports', color: '#64D2FF', grad: 'linear-gradient(135deg,#64D2FF,#2299CC)' },
  { label: 'Send Message', icon: MessageCircle, path: '/messages', color: '#FF375F', grad: 'linear-gradient(135deg,#FF375F,#C01030)' },
  { label: 'AI Analytics', icon: Zap, path: '/ai-analytics', color: '#30D158', grad: 'linear-gradient(135deg,#34C759,#248A3D)' },
]

const EVENTS = [
  { title: 'Mid-Term Exams', date: 'May 15, 2026', icon: Book, color: '#BF5AF2' },
  { title: 'Fee Due Date', date: 'May 10, 2026', icon: CreditCard, color: '#C8991A' },
  { title: 'Parent Meeting', date: 'May 20, 2026', icon: MessageCircle, color: '#0A84FF' },
  { title: 'Sports Day', date: 'May 25, 2026', icon: Trophy, color: '#30D158' },
]

const glass = {
  background: 'rgba(15,23,42,0.58)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 20,
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: '0 22px 50px rgba(0,0,0,0.32)',
}

const cardColors = ['#0A84FF', '#30D158', '#C8991A', '#BF5AF2']

import { motion } from 'framer-motion'

function StatCard({ stat, index, hidden, onToggle }) {
  const Icon = stat.icon
  const delay = index * 0.1

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
      className="super-stat-card"
      style={{
        ...glass,
        '--accent': stat.color,
        '--glow': stat.shadow,
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${stat.color}35`,
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="super-glow" style={{ background: `radial-gradient(circle,${stat.color}35,transparent 70%)` }} />
      <div className="super-glow super-glow-low" style={{ background: `radial-gradient(circle,${stat.color}18,transparent 72%)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <p style={{ color: '#94A3B8', fontSize: 11, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
              {stat.label}
            </p>
            {stat.sensitive && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onToggle(stat.label)}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  width: 24,
                  height: 24,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.color,
                }}
                aria-label="Toggle sensitive value"
              >
                {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </motion.button>
            )}
          </div>
          <p style={{ color: stat.color, fontSize: 34, fontWeight: 900, margin: '0 0 8px', letterSpacing: -1 }}>
            {hidden ? '******' : stat.value}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <ArrowUpRight size={13} style={{ color: stat.color }} />
            <span style={{ color: stat.color, fontSize: 11, fontWeight: 800 }}>{stat.sub}</span>
          </div>
        </div>
        <motion.div
          whileHover={{ rotate: 10, scale: 1.05 }}
          style={{
            width: 52,
            height: 52,
            borderRadius: 20,
            background: stat.grad,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 22px ${stat.shadow}`,
            flexShrink: 0,
          }}
        >
          <Icon size={24} color="white" />
        </motion.div>
      </div>
    </motion.div>
  )
}

function Panel({ children, accent = '#0A84FF', className = '', style = {}, delay = 0 }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={`super-panel ${className}`} 
      style={{ ...glass, '--accent': accent, ...style }}
    >
      <div className="super-panel-glow" style={{ background: `radial-gradient(circle,${accent}22,transparent 70%)` }} />
      {children}
    </motion.div>
  )
}

function studentDobParts(student) {
  const raw = student.date_of_birth || student.dob || ''
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), label: d.toLocaleDateString('en-GB') }
}

function whatsappHref(student, schoolName) {
  const phone = String(student.whatsapp || student.parent_phone || student.phone || '').replace(/\D/g, '')
  const normalized = phone.startsWith('92') ? phone : phone.startsWith('0') ? `92${phone.slice(1)}` : phone
  const msg = `Happy Birthday ${student.name}! May your day be full of happiness, success and beautiful memories. Best wishes from ${schoolName}.`
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}` : ''
}

function printBirthdayCertificate(student) {
  const today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Birthday Certificate</title>
  <style>
    @page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;background:#eef2f7;font-family:Inter,Arial,sans-serif;color:#102033}
    .page{width:297mm;height:210mm;padding:13mm;background:
      radial-gradient(circle at 12% 18%,rgba(255,184,77,.28),transparent 32mm),
      radial-gradient(circle at 84% 22%,rgba(45,156,219,.24),transparent 34mm),
      linear-gradient(135deg,#fffaf0,#f8fbff 55%,#fff)}
    .cert{height:100%;border:2.4mm solid #0b2c4d;border-radius:10mm;padding:12mm;position:relative;overflow:hidden;box-shadow:inset 0 0 0 1mm #c8991a}
    .cert:before{content:"";position:absolute;inset:8mm;border:1px solid rgba(200,153,26,.35);border-radius:7mm}
    .ribbon{position:absolute;left:-24mm;top:18mm;width:88mm;height:18mm;background:#c8991a;transform:rotate(-35deg)}
    .school{font-size:8mm;font-family:Georgia,serif;color:#0b2c4d;font-weight:700;text-align:center;letter-spacing:.2mm}
    .eyebrow{text-align:center;color:#c8991a;font-size:4mm;font-weight:900;letter-spacing:1.2mm;margin-top:5mm;text-transform:uppercase}
    h1{text-align:center;font-size:17mm;line-height:1;margin:5mm 0 3mm;color:#0b2c4d;font-family:Georgia,serif}
    .name{text-align:center;font-size:13mm;font-weight:900;color:#c8991a;margin:7mm 0 5mm}
    .body{text-align:center;font-size:5mm;line-height:1.65;max-width:205mm;margin:0 auto;color:#334155}
    .stars{display:flex;justify-content:center;gap:5mm;font-size:9mm;margin:7mm 0;color:#f39c12}
    .foot{position:absolute;left:18mm;right:18mm;bottom:13mm;display:flex;justify-content:space-between;align-items:flex-end;color:#64748b;font-size:3.5mm}
    .sig{text-align:center;color:#334155}.sig span{display:block;width:48mm;border-top:.35mm solid #334155;margin-bottom:2mm}
    @media print{body{background:white}.page{box-shadow:none}}
  </style></head><body><section class="page"><div class="cert"><div class="ribbon"></div>
    <div class="school">${schoolName}</div>
    <div class="eyebrow">Certificate of Birthday Wishes</div>
    <h1>Happy Birthday</h1>
    <div class="name">${student.name || 'Dear Student'}</div>
    <p class="body">With warm wishes, prayers and pride, we celebrate your special day. May this year bring confidence, learning, kindness and bright success in every step.</p>
    <div class="stars">✦ ✦ ✦</div>
    <div class="foot"><div>${today}<br/>Class ${student.class || '-'} ${student.section || ''}</div><div class="sig"><span></span>Principal Signature</div></div>
  </div></section><script>window.onload=()=>setTimeout(()=>window.print(),500)</script></body></html>`
  const w = window.open('', '_blank', 'width=1120,height=780')
  w.document.write(html)
  w.document.close()
}

export default function Dashboard() {
  const branding = useTenantBranding()
  const schoolName = branding?.schoolName || 'Al Siddique Scholars Public School'
  const navigate = useNavigate()
  const [date, setDate] = useState(new Date())
  const [hidden, setHidden] = useState({})
  const [stats, setStats] = useState(null)
  const [students, setStudents] = useState([])
  const [classData, setClassData] = useState([])
  const [loading, setLoading] = useState(true)
  const [dashApi, setDashApi] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true)
        const [studentRes, dashRes] = await Promise.all([
          api.get('/api/students'),
          api.get('/api/dashboard/stats').catch(() => ({ data: {} })),
        ])
        const allStudents = studentRes.data.data || []
        const dash = dashRes.data || {}
        setDashApi(dash)

        const presentCount = Number(dash.today_present ?? 0)
        const attPct = Number(dash.today_pct ?? (allStudents.length > 0 ? Math.round((presentCount / allStudents.length) * 100) : 0))

        const feeRes = await api.get('/api/fees/summary').catch(() => api.get('/api/fees'))
        const feeSummary = feeRes.data?.data?.collected !== undefined ? feeRes.data.data : null
        const allFees = feeSummary ? [] : (feeRes.data.data || [])
        const paidTotal = feeSummary ? Number(feeSummary.collected || 0) : allFees.filter((fee) => fee.status === 'paid').reduce((sum, fee) => sum + Number(fee.paid_amount || fee.amount || 0), 0)
        const pendingTotal = feeSummary ? Number(feeSummary.pending || 0) : allFees.filter((fee) => fee.status !== 'paid').reduce((sum, fee) => sum + Number(fee.amount || 0), 0)
        const pendingFees = feeSummary
          ? Array.from({ length: Number(feeSummary.unpaid_students || 0) })
          : allFees.filter((fee) => fee.status !== 'paid')

        const empRes = await api.get('/api/employees').catch(() => ({ data: { data: [] } }))
        const empCount = (empRes.data.data || []).length

        const classCounts = {}
        allStudents.forEach((student) => {
          const className = student.class || 'Unassigned'
          classCounts[className] = (classCounts[className] || 0) + 1
        })
        const classArr = Object.entries(classCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => String(a.name).localeCompare(String(b.name)))

        setStats({
          totalStudents: allStudents.length,
          attPct,
          presentCount,
          paidTotal,
          pendingTotal,
          empCount,
          pendingCount: feeSummary ? Number(feeSummary.unpaid_students || 0) : pendingFees.length,
          overdueChallans: feeSummary ? Number(feeSummary.overdue_challans || 0) : 0,
        })
        setStudents(allStudents)
        setClassData(classArr)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  const dashboardStats = useMemo(() => {
    if (!stats) return []
    return [
      {
        label: 'Total Students',
        value: String(stats.totalStudents),
        sub: 'Active enrolments',
        icon: GraduationCap,
        color: cardColors[0],
        grad: 'linear-gradient(135deg,#0A84FF,#0060D0)',
        shadow: 'rgba(10,132,255,0.45)',
      },
      {
        label: "Today's Attendance",
        value: `${stats.attPct}%`,
        sub: `${stats.presentCount} present`,
        icon: CheckCircle2,
        color: cardColors[1],
        grad: 'linear-gradient(135deg,#30D158,#1A8C3A)',
        shadow: 'rgba(48,209,88,0.45)',
      },
      {
        label: 'Fee Collected',
        value: `Rs${Math.round((stats.paidTotal || 0) / 1000)}K`,
        sub: `${stats.pendingCount} pending`,
        icon: CreditCard,
        color: cardColors[2],
        grad: 'linear-gradient(135deg,#C8991A,#9A7210)',
        shadow: 'rgba(200,153,26,0.45)',
        sensitive: true,
      },
      {
        label: 'Active Staff',
        value: String(stats.empCount),
        sub: 'Employees',
        icon: Users,
        color: cardColors[3],
        grad: 'linear-gradient(135deg,#BF5AF2,#8E3AC0)',
        shadow: 'rgba(191,90,242,0.45)',
      },
    ]
  }, [stats])

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const maxCount = classData.length > 0 ? Math.max(...classData.map((classItem) => classItem.count)) : 1
  const collectionRate = stats && stats.paidTotal + stats.pendingTotal > 0
    ? Math.round((stats.paidTotal / (stats.paidTotal + stats.pendingTotal)) * 100)
    : 0
  const birthdayStudents = students.filter((student) => {
    const parts = studentDobParts(student)
    return parts && parts.day === date.getDate() && parts.month === date.getMonth()
  })

  return (
    <div className="super-dashboard-shell">
      <style>{`
        .super-dashboard-shell {
          min-height: 100%;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
        }
        .super-dashboard-inner {
          max-width: 1400px;
          margin: 0 auto;
        }
        .super-reveal {
          animation: superFadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .super-stat-card {
          transition: transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.35s ease, border-color 0.25s ease;
        }
        .super-stat-card:hover {
          transform: translateY(-8px) rotateX(-5deg) scale(1.02);
          box-shadow: 0 28px 56px var(--glow), 0 10px 28px rgba(0,0,0,0.5) !important;
          border-color: rgba(200, 153, 26, 0.45) !important;
        }
        .super-panel {
          position: relative;
          overflow: hidden;
          padding: 24px;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.25s ease;
        }
        .super-panel:hover {
          transform: translateY(-4px) scale(1.005);
          border-color: rgba(200, 153, 26, 0.28) !important;
          box-shadow: 0 22px 48px rgba(0,0,0,0.36), 0 0 26px rgba(200, 153, 26, 0.12) !important;
        }
        .super-glow {
          position: absolute;
          top: -34px;
          right: -34px;
          width: 132px;
          height: 132px;
          border-radius: 999px;
          pointer-events: none;
        }
        .super-glow-low {
          top: auto;
          right: auto;
          bottom: -26px;
          left: -18px;
          width: 86px;
          height: 86px;
        }
        .super-panel-glow {
          position: absolute;
          top: -44px;
          right: -34px;
          width: 180px;
          height: 180px;
          border-radius: 999px;
          pointer-events: none;
        }
        .super-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 20px;
          perspective: 1000px;
        }
        .super-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }
        .super-grid-3 {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr;
          gap: 20px;
        }
        .super-bottom-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }
        .super-action {
          transition: transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.3s ease, border-color 0.25s ease, background 0.25s ease;
        }
        .super-action:hover {
          transform: translateY(-6px) scale(1.04);
          box-shadow: 0 16px 32px rgba(200, 153, 26, 0.2), 0 4px 12px rgba(0,0,0,0.4);
          border-color: rgba(200, 153, 26, 0.28) !important;
          background: rgba(200, 153, 26, 0.08) !important;
        }
        .super-dashboard-analytics-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }
        @media (max-width: 1100px) {
          .super-dashboard-analytics-row { grid-template-columns: 1fr; }
        }
        .super-table-row {
          transition: background 0.2s ease;
        }
        .super-table-row:hover {
          background: rgba(10,132,255,0.07);
        }
        @keyframes superFadeUp {
          from { opacity: 0; transform: translateY(22px) rotateX(8deg); }
          to { opacity: 1; transform: translateY(0) rotateX(0); }
        }
        @keyframes superPulseGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.18); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1100px) {
          .super-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .super-grid-3, .super-bottom-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .super-grid-4, .super-grid-2 { grid-template-columns: 1fr; }
          .super-dashboard-header { align-items: flex-start !important; flex-direction: column; gap: 18px; }
          .super-dashboard-clock { text-align: left !important; }
        }
      `}</style>

      <div className="super-dashboard-inner">
        <div className="mb-7">
          <SchoolHero
            schoolName={schoolName}
            schoolLogo={branding?.logoUrl || branding?.school_logo}
          />
        </div>

        {loading ? (
          <Panel accent="#C8991A" style={{ padding: 60, marginBottom: 28, textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, marginBottom: 16 }}>
              <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(148,163,184,0.18)', borderTopColor: '#C8991A', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
              <Sparkles size={24} color="#C8991A" />
            </div>
            <div style={{ fontWeight: 800 }}>Loading academic insights...</div>
          </Panel>
        ) : (
          <div className="super-grid-4" style={{ marginBottom: 28 }}>
            {dashboardStats.map((stat, index) => (
              <StatCard
                key={stat.label}
                stat={stat}
                index={index}
                hidden={hidden[stat.label]}
                onToggle={(key) => setHidden((current) => ({ ...current, [key]: !current[key] }))}
              />
            ))}
          </div>
        )}

        {!loading && (
          <div className="super-dashboard-analytics-row">
            <AttendanceStatsCard
              stats={dashApi?.attendance_stats}
              loading={false}
            />
            <AdmissionWithdrawalStatsCard
              stats={dashApi?.admission_withdrawal}
              loading={false}
            />
          </div>
        )}

        {!loading && stats && (
          <Panel accent="#FF9F0A" style={{ marginBottom: 20, background: 'linear-gradient(135deg,rgba(15,23,42,0.82),rgba(255,159,10,0.08))' }}>
            <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:14, background:'linear-gradient(135deg,#FF9F0A,#C8991A)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 10px 24px rgba(255,159,10,.24)' }}>
                  <Sparkles size={18} color="white" />
                </div>
                <div>
                  <h3 style={{ color:'#f8fafc', fontSize:17, fontWeight:900, margin:0 }}>Today&apos;s Birthdays</h3>
                  <p style={{ color:'#94A3B8', fontSize:12, margin:'3px 0 0' }}>Click a student name to print a modern birthday certificate or send WhatsApp wishes.</p>
                </div>
              </div>
              <div style={{ color:'#FF9F0A', fontSize:28, fontWeight:900 }}>{birthdayStudents.length}</div>
            </div>
            <div style={{ position:'relative', zIndex:1, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
              {birthdayStudents.length ? birthdayStudents.map((student) => {
                const wa = whatsappHref(student, schoolName)
                return (
                  <div key={student.id || student.gr_number || student.name} style={{ padding:14, borderRadius:16, background:'rgba(255,255,255,.045)', border:'1px solid rgba(255,159,10,.22)', display:'flex', alignItems:'center', gap:12 }}>
                    <button onClick={() => printBirthdayCertificate(student)} style={{ width:46, height:46, borderRadius:15, border:'1px solid rgba(255,159,10,.35)', background:'rgba(255,159,10,.14)', color:'#FF9F0A', fontWeight:900, fontSize:17, cursor:'pointer' }}>
                      {(student.name || 'S').slice(0,1)}
                    </button>
                    <div style={{ flex:1, minWidth:0 }}>
                      <button onClick={() => printBirthdayCertificate(student)} style={{ display:'block', width:'100%', textAlign:'left', background:'transparent', border:0, color:'#fff', fontSize:14, fontWeight:900, cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{student.name}</button>
                      <div style={{ color:'#94A3B8', fontSize:11, marginTop:2 }}>Class {student.class || '-'} {student.section || ''} · {student.parent_phone || student.phone || '-'}</div>
                    </div>
                    {wa && <a href={wa} target="_blank" rel="noreferrer" style={{ padding:'8px 10px', borderRadius:10, background:'rgba(37,211,102,.12)', border:'1px solid rgba(37,211,102,.28)', color:'#25D366', textDecoration:'none', fontSize:12, fontWeight:900 }}>WhatsApp</a>}
                  </div>
                )
              }) : (
                <div style={{ gridColumn:'1 / -1', color:'#94A3B8', fontSize:13, padding:'10px 2px' }}>No student birthdays today.</div>
              )}
            </div>
          </Panel>
        )}

        {!loading && stats && (
          <div className="super-grid-2" style={{ marginBottom: 20 }}>
            <Panel accent="#30D158">
              <div style={{ position: 'relative', zIndex: 1, color: '#C0C8D8', fontSize: 13, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={15} color="#C8991A" /> Fee Status
              </div>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <DonutChart
                  segments={[
                    { value: stats.paidTotal || 0, color: '#30D158' },
                    { value: stats.pendingTotal || 0, color: '#FF375F' },
                  ]}
                  size={120}
                  strokeWidth={16}
                  label={`${stats.pendingCount || 0}`}
                  sublabel="pending"
                />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <ChartLegend
                    items={[
                      { label: 'Paid', color: '#30D158', value: `Rs${Math.round((stats.paidTotal || 0) / 1000)}K` },
                      { label: 'Pending', color: '#FF375F', value: `Rs${Math.round((stats.pendingTotal || 0) / 1000)}K` },
                    ]}
                  />
                  <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(48,209,88,0.08)', borderRadius: 8, border: '1px solid rgba(48,209,88,0.15)' }}>
                    <div style={{ color: '#30D158', fontSize: 11, fontWeight: 800 }}>Collection Rate</div>
                    <div style={{ color: '#fff', fontSize: 18, fontWeight: 900 }}>{collectionRate}%</div>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel accent="#0A84FF">
              <div style={{ position: 'relative', zIndex: 1, color: '#C0C8D8', fontSize: 13, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={15} color="#0A84FF" /> Class Distribution
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                {classData.length > 0 ? (
                  <BarChart
                    bars={classData.slice(0, 8).map((classItem, index) => ({
                      label: String(classItem.name).replace('Class ', 'C'),
                      value: classItem.count,
                      color: ['#0A84FF', '#30D158', '#C8991A', '#BF5AF2', '#FF375F', '#64D2FF', '#FF9F0A', '#25D366'][index % 8],
                    }))}
                    height={120}
                    showValues
                  />
                ) : (
                  <div style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No class data</div>
                )}
              </div>
            </Panel>
          </div>
        )}

        <div className="super-grid-3" style={{ marginBottom: 28 }}>
          <Panel accent="#BF5AF2">
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GraduationCap size={16} color="#C8991A" />
                <h3 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 800, margin: 0 }}>Enrolment Analysis</h3>
              </div>
              <span style={{ color: '#C8991A', fontSize: 12, fontWeight: 800 }}>TOTAL: {stats?.totalStudents || 0}</span>
            </div>
            {stats && (() => {
              const boys = Math.round((stats.totalStudents || 100) * 0.58)
              const girls = (stats.totalStudents || 100) - boys
              const boysPct = Math.round((boys / (stats.totalStudents || 1)) * 100)
              const girlsPct = 100 - boysPct
              const Gauge = ({ pct, label, color, sub }) => {
                const radius = 40
                const circumference = Math.PI * radius
                return (
                  <div style={{ textAlign: 'center' }}>
                    <svg width="100" height="60" viewBox="0 0 100 60">
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(circumference * pct) / 100} ${circumference}`} />
                      <text x="50" y="45" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="900">{pct}%</text>
                    </svg>
                    <div style={{ color, fontSize: 12, fontWeight: 800, marginTop: -5 }}>{label}</div>
                    <div style={{ color: '#94A3B8', fontSize: 10 }}>{sub}</div>
                  </div>
                )
              }
              return (
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 0' }}>
                  <Gauge pct={boysPct} label="Boys" color="#0A84FF" sub={`${boys} active`} />
                  <Gauge pct={girlsPct} label="Girls" color="#FF375F" sub={`${girls} active`} />
                </div>
              )
            })()}
          </Panel>

          <Panel accent="#30D158">
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Activity size={15} color="#30D158" />
              <h3 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 800, margin: 0 }}>Attendance Trends</h3>
            </div>
            <p style={{ position: 'relative', zIndex: 1, color: '#94A3B8', fontSize: 12, margin: '0 0 20px' }}>Weekly participation rate</p>
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', gap: 10, height: 100 }}>
              {ATTENDANCE_DATA.map((day) => (
                <div key={day.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: '100%', height: `${day.pct}%`, borderRadius: 4, background: `linear-gradient(to top,${day.pct >= 90 ? '#30D158' : '#0A84FF'},rgba(255,255,255,0.08))`, boxShadow: day.pct >= 90 ? '0 4px 12px rgba(48,209,88,0.3)' : '0 4px 12px rgba(10,132,255,0.2)' }} />
                  <span style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700 }}>{day.day}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel accent="#C8991A">
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <BarChart3 size={15} color="#C8991A" />
              <h3 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 800, margin: 0 }}>Class Breakdown</h3>
            </div>
            <p style={{ position: 'relative', zIndex: 1, color: '#94A3B8', fontSize: 12, margin: '0 0 14px' }}>Enrollment by grade</p>
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 120, overflowY: 'auto' }}>
              {classData.length > 0 ? classData.map((classItem, index) => {
                const color = ['#0A84FF', '#30D158', '#C8991A', '#BF5AF2', '#FF375F'][index % 5]
                return (
                  <div key={classItem.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#94A3B8', fontSize: 10, width: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{classItem.name}</span>
                    <div style={{ flex: 1, height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(classItem.count / maxCount) * 100}%`, height: '100%', background: color, borderRadius: 4, boxShadow: `0 0 8px ${color}66` }} />
                    </div>
                    <span style={{ color: '#f8fafc', fontSize: 10, fontWeight: 800, minWidth: 16 }}>{classItem.count}</span>
                  </div>
                )
              }) : (
                <p style={{ color: '#94A3B8', fontSize: 12 }}>No class data</p>
              )}
            </div>
          </Panel>
        </div>

        <Panel accent="#C8991A" style={{ marginBottom: 28 }}>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#C8991A,#9A7210)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} color="white" />
            </div>
            <h3 style={{ color: '#f8fafc', fontSize: 17, fontWeight: 900, margin: 0 }}>Quick Actions</h3>
          </div>
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 14 }}>
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  className="super-action"
                  onClick={() => navigate(action.path)}
                  style={{
                    '--accent': action.color,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    padding: '18px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    color: '#C0C8D8',
                  }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: action.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px ${action.color}40` }}>
                    <Icon size={20} color="white" />
                  </div>
                  <span style={{ fontSize: 11, textAlign: 'center', fontWeight: 700, lineHeight: 1.3 }}>{action.label}</span>
                </button>
              )
            })}
          </div>
        </Panel>

        <div className="super-bottom-grid">
          <Panel accent="#0A84FF">
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#0A84FF,#0060D0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={16} color="white" />
                </div>
                <h3 style={{ color: '#f8fafc', fontSize: 16, fontWeight: 800, margin: 0 }}>Recent Students</h3>
              </div>
              <button onClick={() => navigate('/students')} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#0A84FF', background: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.25)', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                View All
              </button>
            </div>
            <div style={{ position: 'relative', zIndex: 1, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Name', 'GR No', 'Class', 'Phone'].map((heading) => (
                      <th key={heading} style={{ padding: '10px 14px', textAlign: 'left', color: '#94A3B8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.length > 0 ? students.slice(0, 5).map((student, index) => (
                    <tr key={`${student.gr_number || student.name}-${index}`} className="super-table-row" style={{ borderBottom: index < students.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <td style={{ padding: 14, color: '#f8fafc', fontSize: 13, fontWeight: 700 }}>{student.name}</td>
                      <td style={{ padding: 14, color: '#94A3B8', fontSize: 12 }}>{student.gr_number || '-'}</td>
                      <td style={{ padding: 14, color: '#94A3B8', fontSize: 12 }}>Class {student.class || '-'}</td>
                      <td style={{ padding: 14, color: '#94A3B8', fontSize: 12 }}>{student.parent_phone || '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>No students found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel accent="#C8991A">
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#C8991A,#9A7210)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={16} color="white" />
              </div>
              <h3 style={{ color: '#f8fafc', fontSize: 16, fontWeight: 800, margin: 0 }}>Upcoming Events</h3>
            </div>
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {EVENTS.map((event) => {
                const Icon = event.icon
                return (
                  <div key={event.title} className="super-action" style={{ '--accent': event.color, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', cursor: 'default' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${event.color}30,${event.color}10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${event.color}25`, flexShrink: 0 }}>
                      <Icon size={16} color={event.color} />
                    </div>
                    <div>
                      <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{event.title}</div>
                      <div style={{ color: '#94A3B8', fontSize: 11 }}>{event.date}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ position: 'relative', zIndex: 1, marginTop: 18, padding: 16, background: 'linear-gradient(135deg,rgba(200,153,26,0.1),rgba(200,153,26,0.04))', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <ShieldAlert size={13} color="#C8991A" />
                <h4 style={{ color: '#C8991A', fontSize: 11, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today's Summary</h4>
              </div>
              {[
                ['Total Students', stats ? String(stats.totalStudents) : '-'],
                ['Present Today', stats ? String(stats.presentCount) : '-'],
                ['Fee Pending', stats ? String(stats.pendingCount) : '-'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ color: '#94A3B8', fontSize: 12 }}>{label}</span>
                  <span style={{ color: '#f8fafc', fontSize: 13, fontWeight: 800 }}>{value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

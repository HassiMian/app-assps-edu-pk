import { useNavigate } from 'react-router-dom'
import {
  UserPlus,
  UserMinus,
  Users,
  UserCheck,
  UserX,
  Clock,
  CalendarOff,
  Briefcase,
  ArrowRight,
} from 'lucide-react'

const glass = {
  background: 'rgba(15,23,42,0.58)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 20,
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: '0 22px 50px rgba(0,0,0,0.32)',
}

function CircleIcon({ Icon, color, bg }) {
  return (
    <div style={{
      width: 40,
      height: 40,
      borderRadius: 999,
      background: bg,
      display: 'grid',
      placeItems: 'center',
      flexShrink: 0,
    }}
    >
      <Icon size={18} color={color} />
    </div>
  )
}

function ViewAllLink({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        color: '#C8991A',
        fontSize: 12,
        fontWeight: 800,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      View all <ArrowRight size={14} />
    </button>
  )
}

function StatCell({ icon: Icon, label, value, color, bg, subtitle }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid rgba(148,163,184,0.1)',
    }}
    >
      <CircleIcon Icon={Icon} color={color} bg={bg} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        {subtitle && <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ color, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

export function AttendanceStatsCard({ stats, loading }) {
  const navigate = useNavigate()
  const s = stats?.students || {}
  const staff = stats?.staff || {}

  return (
    <div className="super-panel super-reveal" style={{ ...glass, padding: 22, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ color: '#f8fafc', fontSize: 17, fontWeight: 900, margin: 0 }}>Attendance Stats</h3>
          <p style={{ color: '#94A3B8', fontSize: 12, margin: '4px 0 0' }}>Current day summary</p>
        </div>
        <ViewAllLink onClick={() => navigate('/attendance/mark')} />
      </div>

      {loading ? (
        <div style={{ color: '#94A3B8', padding: 20, textAlign: 'center' }}>Loading…</div>
      ) : (
        <>
          <div style={{ color: '#C8991A', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>STUDENT ATTENDANCE</div>
          <div className="super-attendance-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0 16px' }}>
            <StatCell icon={Users} label="Unmarked" value={s.unmarked ?? 0} color="#94A3B8" bg="rgba(148,163,184,0.12)" />
            <StatCell icon={UserCheck} label="Present" value={s.present ?? 0} color="#30D158" bg="rgba(48,209,88,0.12)" />
            <StatCell icon={UserX} label="Absent" value={s.absent ?? 0} color="#FF375F" bg="rgba(255,55,95,0.12)" />
            <StatCell icon={Clock} label="Late" value={s.late ?? 0} color="#FF9F0A" bg="rgba(255,159,10,0.12)" />
            <StatCell icon={CalendarOff} label="Leave" value={s.leave ?? 0} color="#64D2FF" bg="rgba(100,210,255,0.12)" />
          </div>

          <div style={{ height: 1, background: 'rgba(148,163,184,0.15)', margin: '16px 0' }} />

          <div style={{ color: '#C8991A', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>STAFF ATTENDANCE</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <StatCell icon={Briefcase} label="Present Staff" value={staff.present ?? 0} color="#30D158" bg="rgba(48,209,88,0.12)" subtitle="Employee roster" />
            <StatCell icon={UserX} label="Absent Staff" value={staff.absent ?? 0} color="#FF375F" bg="rgba(255,55,95,0.12)" />
            <div style={{ borderBottom: 'none' }}>
              <StatCell icon={CalendarOff} label="Leave Staff" value={staff.leave ?? 0} color="#64D2FF" bg="rgba(100,210,255,0.12)" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function AdmissionWithdrawalStatsCard({ stats, loading }) {
  const navigate = useNavigate()
  const a = stats || {}

  const rows = [
    { icon: UserPlus, label: 'Admission in this day', sub: 'New enrolments today', key: 'admission_today', color: '#30D158', bg: 'rgba(48,209,88,0.12)' },
    { icon: UserPlus, label: 'Admission in this month', sub: 'Current calendar month', key: 'admission_month', color: '#0A84FF', bg: 'rgba(10,132,255,0.12)' },
    { icon: UserPlus, label: 'Admission in this year', sub: 'Current calendar year', key: 'admission_year', color: '#C8991A', bg: 'rgba(200,153,26,0.12)' },
    { icon: UserMinus, label: 'Withdrawal in this month', sub: 'Deactivated this month', key: 'withdrawal_month', color: '#FF375F', bg: 'rgba(255,55,95,0.12)' },
    { icon: UserMinus, label: 'Withdrawal in this year', sub: 'Deactivated this year', key: 'withdrawal_year', color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)' },
  ]

  return (
    <div className="super-panel super-reveal" style={{ ...glass, padding: 22, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ color: '#f8fafc', fontSize: 17, fontWeight: 900, margin: 0 }}>Admission &amp; Withdrawal Stats</h3>
          <p style={{ color: '#94A3B8', fontSize: 12, margin: '4px 0 0' }}>Enrolment movement</p>
        </div>
        <ViewAllLink onClick={() => navigate('/students/admissions')} />
      </div>

      {loading ? (
        <div style={{ color: '#94A3B8', padding: 20, textAlign: 'center' }}>Loading…</div>
      ) : (
        <div>
          {rows.map((row, i) => (
            <div
              key={row.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 0',
                borderBottom: i < rows.length - 1 ? '1px solid rgba(148,163,184,0.1)' : 'none',
              }}
            >
              <CircleIcon Icon={row.icon} color={row.color} bg={row.bg} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700 }}>{row.label}</div>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{row.sub}</div>
              </div>
              <div style={{ color: row.color, fontSize: 24, fontWeight: 900 }}>{a[row.key] ?? 0}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

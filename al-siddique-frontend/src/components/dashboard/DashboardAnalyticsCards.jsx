import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
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
  Search,
  CheckCircle2,
  X,
  Save,
  Zap,
  Loader2,
  ExternalLink,
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

function StatCell({ icon: Icon, label, value, color, bg, subtitle, onClick, clickable }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid rgba(148,163,184,0.1)',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
      onMouseEnter={clickable ? (e) => (e.currentTarget.style.opacity = '0.85') : undefined}
      onMouseLeave={clickable ? (e) => (e.currentTarget.style.opacity = '1') : undefined}
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

function UnmarkedAttendanceModal({ onClose, onRefresh }) {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const todayDisplay = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [markedToday, setMarkedToday] = useState([])
  const [selectedStatus, setSelectedStatus] = useState({})
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('All Classes')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [stuRes, attRes] = await Promise.all([
        api.get('/api/students').catch(() => ({ data: { data: [] } })),
        api.get(`/api/attendance?date=${today}`).catch(() => ({ data: { data: [] } })),
      ])
      const stuList = stuRes.data?.data || []
      const attList = attRes.data?.data || []
      setStudents(stuList)
      setMarkedToday(attList)
    } catch (err) {
      console.error('Failed to load unmarked attendance data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const markedIds = useMemo(() => {
    const ids = new Set()
    markedToday.forEach((a) => {
      if (a.student_id) ids.add(Number(a.student_id))
      if (a.gr_number) ids.add(String(a.gr_number).trim().toLowerCase())
    })
    return ids
  }, [markedToday])

  const unmarkedStudents = useMemo(() => {
    return students.filter((s) => {
      const idMatch = markedIds.has(Number(s.id))
      const grMatch = s.gr_number && markedIds.has(String(s.gr_number).trim().toLowerCase())
      return !idMatch && !grMatch
    })
  }, [students, markedIds])

  const classList = useMemo(() => {
    const set = new Set()
    unmarkedStudents.forEach((s) => {
      if (s.class) set.add(s.class)
    })
    return ['All Classes', ...Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))]
  }, [unmarkedStudents])

  const filteredUnmarked = useMemo(() => {
    return unmarkedStudents.filter((s) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.gr_number || s.gr || '').toLowerCase().includes(q) ||
        String(s.father_name || s.father || '').toLowerCase().includes(q)
      const matchClass = filterClass === 'All Classes' || s.class === filterClass
      return matchSearch && matchClass
    })
  }, [unmarkedStudents, search, filterClass])

  const handleSetStatus = (studentId, status) => {
    setSelectedStatus((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? undefined : status,
    }))
  }

  const handleMarkAllVisiblePresent = () => {
    const updated = { ...selectedStatus }
    filteredUnmarked.forEach((s) => {
      updated[s.id] = 'present'
    })
    setSelectedStatus(updated)
  }

  const handleSaveAttendance = async () => {
    const entries = Object.entries(selectedStatus).filter(([_, val]) => !!val)
    if (entries.length === 0) {
      alert('Please select attendance status for at least one student before saving.')
      return
    }

    setSaving(true)
    try {
      const records = entries.map(([studentId, status]) => ({
        student_id: Number(studentId),
        status,
        date: today,
      }))

      await api.post('/api/attendance/mark', { records })
      setSaveSuccess(true)
      setSelectedStatus({})
      await loadData()
      if (onRefresh) onRefresh()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving attendance:', err)
      alert('Failed to save attendance: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  const pendingCount = Object.values(selectedStatus).filter(Boolean).length

  return createPortal(
    <div
      className="app-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        background: 'rgba(7,22,40,0.94)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        isolation: 'isolate',
      }}
    >
      <div
        className="super-module-card"
        style={{
          width: 'min(1100px, 100%)',
          maxHeight: '92vh',
          background: 'rgba(11,44,77,0.98)',
          border: '1px solid rgba(200,153,26,0.3)',
          borderRadius: 24,
          boxShadow: '0 28px 80px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, rgba(7,30,52,0.95), rgba(11,44,77,0.95))',
            borderBottom: '1px solid rgba(200,153,26,0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'rgba(200,153,26,0.15)',
                border: '1px solid rgba(200,153,26,0.3)',
                display: 'grid',
                placeItems: 'center',
                color: '#C8991A',
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: '#f8fafc', fontWeight: 900 }}>
                  Unmarked Students Today
                </h3>
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: 20,
                    background: 'rgba(255,159,10,0.15)',
                    border: '1px solid rgba(255,159,10,0.3)',
                    color: '#FF9F0A',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {unmarkedStudents.length} Unmarked
                </span>
              </div>
              <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: 12 }}>
                {todayDisplay} &mdash; Mark student attendance directly below
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                onClose()
                navigate('/attendance/mark')
              }}
              style={{
                background: 'rgba(10,132,255,0.12)',
                border: '1px solid rgba(10,132,255,0.25)',
                color: '#0A84FF',
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ExternalLink size={14} /> Full Sheet
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                width: 36,
                height: 36,
                borderRadius: 10,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div
          style={{
            padding: '14px 24px',
            background: 'rgba(7,22,40,0.5)',
            borderBottom: '1px solid rgba(148,163,184,0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={16}
                color="#8892A4"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student by name, GR No, or father..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  background: 'rgba(7,22,40,0.92)',
                  border: '1px solid rgba(200,153,26,0.2)',
                  borderRadius: 10,
                  color: '#C0C8D8',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                background: 'rgba(7,22,40,0.92)',
                border: '1px solid rgba(200,153,26,0.2)',
                color: '#C0C8D8',
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {classList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleMarkAllVisiblePresent}
              disabled={filteredUnmarked.length === 0}
              style={{
                background: 'rgba(48,209,88,0.14)',
                border: '1px solid rgba(48,209,88,0.3)',
                color: '#30D158',
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Zap size={14} /> Mark All Visible Present ({filteredUnmarked.length})
            </button>

            <button
              onClick={handleSaveAttendance}
              disabled={saving || pendingCount === 0}
              style={{
                background: pendingCount > 0 ? 'linear-gradient(135deg, #C8991A, #e8b420)' : 'rgba(148,163,184,0.2)',
                color: pendingCount > 0 ? '#071e34' : '#8892A4',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 800,
                cursor: pendingCount > 0 && !saving ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: pendingCount > 0 ? '0 4px 15px rgba(200,153,26,0.3)' : 'none',
              }}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Attendance ({pendingCount})
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div
            style={{
              padding: '10px 24px',
              background: 'rgba(48,209,88,0.15)',
              borderBottom: '1px solid rgba(48,209,88,0.3)',
              color: '#30D158',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} /> Attendance saved and synchronized successfully!
          </div>
        )}

        {/* Unmarked Student List Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#8892A4' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <p>Loading unmarked students list...</p>
            </div>
          ) : filteredUnmarked.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 50, color: '#8892A4' }}>
              <CheckCircle2 size={40} color="#30D158" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ color: '#f8fafc', fontSize: 16, margin: '0 0 6px' }}>
                {unmarkedStudents.length === 0 ? 'All Students Marked!' : 'No matching unmarked students found'}
              </h4>
              <p style={{ margin: 0, fontSize: 13 }}>
                {unmarkedStudents.length === 0
                  ? 'All active students have their attendance recorded for today.'
                  : 'Try selecting another class or clearing the search query.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(200,153,26,0.2)' }}>
                  {['Sr#', 'GR No', 'Student', 'Father Name', 'Class & Sec', 'Quick Attendance Action'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px',
                        textAlign: h.includes('Action') ? 'center' : 'left',
                        color: '#8892A4',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUnmarked.map((s, idx) => {
                  const currentMark = selectedStatus[s.id]
                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: '1px solid rgba(200,153,26,0.06)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)',
                      }}
                    >
                      <td style={{ padding: '12px', color: '#8892A4', fontSize: 12, width: 45 }}>{idx + 1}</td>
                      <td style={{ padding: '12px', color: '#C8991A', fontSize: 13, fontWeight: 700, width: 90 }}>
                        {s.gr_number || s.gr || 'â€”'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ color: '#C0C8D8', fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#8892A4', fontSize: 13 }}>
                        {s.father_name || s.father || 'â€”'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            background: 'rgba(10,132,255,0.1)',
                            border: '1px solid rgba(10,132,255,0.2)',
                            borderRadius: 14,
                            fontSize: 12,
                            color: '#0A84FF',
                            fontWeight: 600,
                          }}
                        >
                          {s.class || 'Unassigned'} {s.section ? `Â· ${s.section}` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => handleSetStatus(s.id, 'present')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              border: currentMark === 'present' ? '1px solid #30D158' : '1px solid rgba(48,209,88,0.25)',
                              background: currentMark === 'present' ? '#30D158' : 'rgba(48,209,88,0.1)',
                              color: currentMark === 'present' ? '#071e34' : '#30D158',
                              fontWeight: 700,
                              fontSize: 11,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <UserCheck size={13} /> Present
                          </button>
                          <button
                            onClick={() => handleSetStatus(s.id, 'absent')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              border: currentMark === 'absent' ? '1px solid #FF375F' : '1px solid rgba(255,55,95,0.25)',
                              background: currentMark === 'absent' ? '#FF375F' : 'rgba(255,55,95,0.1)',
                              color: currentMark === 'absent' ? '#fff' : '#FF375F',
                              fontWeight: 700,
                              fontSize: 11,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <UserX size={13} /> Absent
                          </button>
                          <button
                            onClick={() => handleSetStatus(s.id, 'late')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              border: currentMark === 'late' ? '1px solid #FF9F0A' : '1px solid rgba(255,159,10,0.25)',
                              background: currentMark === 'late' ? '#FF9F0A' : 'rgba(255,159,10,0.1)',
                              color: currentMark === 'late' ? '#071e34' : '#FF9F0A',
                              fontWeight: 700,
                              fontSize: 11,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Clock size={13} /> Late
                          </button>
                          <button
                            onClick={() => handleSetStatus(s.id, 'leave')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              border: currentMark === 'leave' ? '1px solid #0A84FF' : '1px solid rgba(10,132,255,0.25)',
                              background: currentMark === 'leave' ? '#0A84FF' : 'rgba(10,132,255,0.1)',
                              color: currentMark === 'leave' ? '#fff' : '#0A84FF',
                              fontWeight: 700,
                              fontSize: 11,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <CalendarOff size={13} /> Leave
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            background: 'rgba(7,30,52,0.95)',
            borderTop: '1px solid rgba(200,153,26,0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            fontSize: 12,
            color: '#8892A4',
          }}
        >
          <div>
            Showing <strong>{filteredUnmarked.length}</strong> of <strong>{unmarkedStudents.length}</strong> unmarked students
            {pendingCount > 0 && <span style={{ color: '#C8991A', marginLeft: 10 }}>({pendingCount} staged for save)</span>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleSaveAttendance}
              disabled={saving || pendingCount === 0}
              style={{
                background: pendingCount > 0 ? 'linear-gradient(135deg, #C8991A, #e8b420)' : 'rgba(148,163,184,0.18)',
                color: pendingCount > 0 ? '#071e34' : '#8892A4',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: pendingCount > 0 && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Savingâ€¦' : `Save Attendance (${pendingCount})`}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function AttendanceStatsCard({ stats, loading, onRefresh }) {
  const [showUnmarkedModal, setShowUnmarkedModal] = useState(false)
  const s = stats?.students || {}
  const staff = stats?.staff || {}

  return (
    <div className="super-panel super-reveal" style={{ ...glass, padding: 22, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ color: '#f8fafc', fontSize: 17, fontWeight: 900, margin: 0 }}>Attendance Stats</h3>
          <p style={{ color: '#94A3B8', fontSize: 12, margin: '4px 0 0' }}>Current day summary</p>
        </div>
        <ViewAllLink onClick={() => setShowUnmarkedModal(true)} />
      </div>

      {loading ? (
        <div style={{ color: '#94A3B8', padding: 20, textAlign: 'center' }}>Loadingâ€¦</div>
      ) : (
        <>
          <div style={{ color: '#C8991A', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>STUDENT ATTENDANCE</div>
          <div className="super-attendance-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0 16px' }}>
            <StatCell
              icon={Users}
              label="Unmarked"
              value={s.unmarked ?? 0}
              color="#94A3B8"
              bg="rgba(148,163,184,0.12)"
              clickable
              onClick={() => setShowUnmarkedModal(true)}
            />
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

      {showUnmarkedModal && (
        <UnmarkedAttendanceModal
          onClose={() => setShowUnmarkedModal(false)}
          onRefresh={onRefresh}
        />
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
        <div style={{ color: '#94A3B8', padding: 20, textAlign: 'center' }}>Loadingâ€¦</div>
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

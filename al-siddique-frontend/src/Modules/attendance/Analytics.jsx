import { useEffect, useMemo, useState } from 'react'
import { C, card, btnSecondary, select, labelStyle, sectionHeader } from '../moduleStyles'
import api from '../../services/api'
import { Download, FileText, Search, TrendingUp, Users } from 'lucide-react'

const statusColors = {
  present: '#30D158',
  absent: '#FF375F',
  late: '#FF9F0A',
  leave: '#C8991A',
}

function monthRange(monthValue) {
  const [year, month] = String(monthValue || '').split('-').map(Number)
  const safeYear = year || new Date().getFullYear()
  const safeMonth = month || (new Date().getMonth() + 1)
  const start = new Date(safeYear, safeMonth - 1, 1)
  const end = new Date(safeYear, safeMonth, 0)
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  }
}

function normalizeStatus(status) {
  return String(status || '').toLowerCase()
}

function dateLabel(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-GB')
}

function pct(present, total) {
  return total > 0 ? Math.round((present / total) * 100) : 0
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function Analytics() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { from, to } = useMemo(() => monthRange(selectedMonth), [selectedMonth])

  useEffect(() => {
    let alive = true
    api.get('/api/students')
      .then((res) => {
        if (!alive) return
        setStudents(Array.isArray(res.data?.data) ? res.data.data : [])
      })
      .catch((err) => {
        console.warn('Unable to load student filters:', err?.message || err)
        if (alive) setStudents([])
      })
    return () => { alive = false }
  }, [])

  const classOptions = useMemo(() => {
    const values = students.map((student) => student.class).filter(Boolean)
    return Array.from(new Set(values)).sort((a, b) => String(a).localeCompare(String(b)))
  }, [students])

  const sectionOptions = useMemo(() => {
    const values = students
      .filter((student) => !selectedClass || student.class === selectedClass)
      .map((student) => student.section)
      .filter(Boolean)
    return Array.from(new Set(values)).sort((a, b) => String(a).localeCompare(String(b)))
  }, [selectedClass, students])

  const fetchHistory = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/attendance/history', {
        params: {
          from,
          to,
          class: selectedClass || undefined,
          section: selectedSection || undefined,
        },
      })
      const data = res.data?.data || {}
      setRecords(Array.isArray(data.records) ? data.records : [])
    } catch (err) {
      console.error('Failed to fetch attendance history:', err)
      setError(err?.response?.data?.message || err?.message || 'Attendance history could not be loaded.')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, selectedClass, selectedSection])

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return records
    return records.filter((record) => {
      const student = record.student || {}
      return [
        student.name,
        record.name,
        student.grNumber,
        record.gr_number,
        student.rollNumber,
        record.roll_number,
        student.class,
        record.class,
        student.section,
        record.section,
      ].some((value) => String(value || '').toLowerCase().includes(q))
    })
  }, [records, search])

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, leave: 0 }
    filteredRecords.forEach((record) => {
      const status = normalizeStatus(record.status)
      if (counts[status] !== undefined) counts[status] += 1
    })
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
    return {
      ...counts,
      total,
      percentage: pct(counts.present, total),
    }
  }, [filteredRecords])

  const studentRows = useMemo(() => {
    const map = new Map()
    filteredRecords.forEach((record) => {
      const student = record.student || {}
      const id = record.student_id || student.id || `${student.name || record.name}-${student.grNumber || record.gr_number}`
      const current = map.get(id) || {
        id,
        name: student.name || record.name || 'Unnamed Student',
        grNumber: student.grNumber || record.gr_number || '-',
        className: student.class || record.class || '-',
        section: student.section || record.section || '-',
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        total: 0,
      }
      const status = normalizeStatus(record.status)
      if (current[status] !== undefined) current[status] += 1
      current.total += 1
      map.set(id, current)
    })
    return Array.from(map.values())
      .map((row) => ({ ...row, percentage: pct(row.present, row.total) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [filteredRecords])

  const dateRows = useMemo(() => {
    const map = new Map()
    filteredRecords.forEach((record) => {
      const key = String(record.date || '').slice(0, 10)
      const current = map.get(key) || { date: key, present: 0, absent: 0, late: 0, leave: 0, total: 0 }
      const status = normalizeStatus(record.status)
      if (current[status] !== undefined) current[status] += 1
      current.total += 1
      map.set(key, current)
    })
    return Array.from(map.values())
      .map((row) => ({ ...row, percentage: pct(row.present, row.total) }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [filteredRecords])

  const exportCsv = () => {
    downloadCsv(`attendance-history-${selectedMonth}.csv`, [
      ['Date', 'Student', 'GR Number', 'Class', 'Section', 'Status', 'Remarks'],
      ...filteredRecords.map((record) => {
        const student = record.student || {}
        return [
          dateLabel(record.date),
          student.name || record.name || '',
          student.grNumber || record.gr_number || '',
          student.class || record.class || '',
          student.section || record.section || '',
          record.status || '',
          record.remarks || record.note || '',
        ]
      }),
    ])
  }

  const printPdf = () => {
    const html = `<!doctype html><html><head><title>Attendance History</title><style>
      body{font-family:Arial,sans-serif;color:#111827;padding:24px}
      h1{margin:0 0 4px} p{color:#64748b;margin:0 0 18px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #d1d5db;padding:8px;text-align:left}
      th{background:#f1f5f9}
    </style></head><body>
      <h1>Attendance History</h1>
      <p>${from} to ${to}</p>
      <table><thead><tr><th>Date</th><th>Student</th><th>Class</th><th>Status</th><th>Remarks</th></tr></thead>
      <tbody>${filteredRecords.map((record) => {
        const student = record.student || {}
        return `<tr><td>${dateLabel(record.date)}</td><td>${student.name || record.name || ''}</td><td>${student.class || record.class || ''} ${student.section || record.section || ''}</td><td>${record.status || ''}</td><td>${record.remarks || record.note || ''}</td></tr>`
      }).join('')}</tbody></table>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
    </body></html>`
    const win = window.open('', '_blank', 'width=1100,height=760')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="attendance-analytics-page" style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 20 }}>
        <div className="super-module-card analytics-header" style={{ ...card, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={sectionHeader}>Attendance Analytics</h1>
            <p style={{ color: C.muted, marginTop: 8 }}>Student-wise and date-wise attendance history with tenant-safe filters.</p>
          </div>
          <div className="analytics-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={exportCsv} disabled={!filteredRecords.length} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 8, opacity: filteredRecords.length ? 1 : 0.55 }}>
              <Download size={16} /> Export Excel/CSV
            </button>
            <button onClick={printPdf} disabled={!filteredRecords.length} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 8, opacity: filteredRecords.length ? 1 : 0.55 }}>
              <FileText size={16} /> Export PDF
            </button>
          </div>
        </div>

        <div className="analytics-filters" style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 14 }}>
          <div>
            <label style={labelStyle}>Class</label>
            <select style={select} value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection('') }}>
              <option value="">All Classes</option>
              {classOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Section</label>
            <select style={select} value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
              <option value="">All Sections</option>
              {sectionOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Month</label>
            <input type="month" style={select} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value || currentMonth)} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Search Student</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...select, padding: '0 12px' }}>
              <Search size={16} color={C.muted} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, GR, roll, class..."
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 'none', color: '#fff', height: 42 }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ ...card, borderColor: 'rgba(255,55,95,0.38)', color: C.red }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ ...card, textAlign: 'center', color: C.muted, padding: 42 }}>Loading attendance history...</div>
        ) : (
          <>
            <div className="analytics-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 14 }}>
              {[
                ['Percentage', `${summary.percentage}%`, C.gold],
                ['Present', summary.present, statusColors.present],
                ['Absent', summary.absent, statusColors.absent],
                ['Late', summary.late, statusColors.late],
                ['Leave', summary.leave, statusColors.leave],
                ['Records', summary.total, '#64D2FF'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ ...card, borderColor: `${color}55`, padding: 18 }}>
                  <div style={{ color, fontSize: 28, fontWeight: 900 }}>{value}</div>
                  <div style={{ color: C.muted, marginTop: 6, fontSize: 12 }}>{label}</div>
                </div>
              ))}
            </div>

            <div className="analytics-two-col" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 }}>
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <Users size={18} color={C.gold} />
                  <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 900, margin: 0 }}>Student-wise Attendance</h3>
                </div>
                <div className="responsive-table-wrap" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Student', 'Class', 'P', 'A', 'L', 'Lv', '%'].map((head) => (
                          <th key={head} style={{ color: C.muted, fontSize: 11, textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {studentRows.length ? studentRows.map((row) => (
                        <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '11px 8px', color: '#fff', fontWeight: 800 }}>{row.name}<div style={{ color: C.muted, fontSize: 11 }}>{row.grNumber}</div></td>
                          <td style={{ padding: '11px 8px', color: C.muted }}>{row.className} {row.section}</td>
                          <td style={{ padding: '11px 8px', color: statusColors.present }}>{row.present}</td>
                          <td style={{ padding: '11px 8px', color: statusColors.absent }}>{row.absent}</td>
                          <td style={{ padding: '11px 8px', color: statusColors.late }}>{row.late}</td>
                          <td style={{ padding: '11px 8px', color: statusColors.leave }}>{row.leave}</td>
                          <td style={{ padding: '11px 8px', color: C.gold, fontWeight: 900 }}>{row.percentage}%</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="7" style={{ padding: 24, textAlign: 'center', color: C.muted }}>No attendance history found for these filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <TrendingUp size={18} color={C.green} />
                  <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 900, margin: 0 }}>Date-wise History</h3>
                </div>
                <div style={{ display: 'grid', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                  {dateRows.length ? dateRows.map((row) => (
                    <div key={row.date} style={{ padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                        <strong style={{ color: '#fff' }}>{dateLabel(row.date)}</strong>
                        <span style={{ color: C.gold, fontWeight: 900 }}>{row.percentage}%</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, color: C.muted, fontSize: 12 }}>
                        <span style={{ color: statusColors.present }}>P {row.present}</span>
                        <span style={{ color: statusColors.absent }}>A {row.absent}</span>
                        <span style={{ color: statusColors.late }}>Late {row.late}</span>
                        <span style={{ color: statusColors.leave }}>Leave {row.leave}</span>
                      </div>
                    </div>
                  )) : (
                    <div style={{ color: C.muted, textAlign: 'center', padding: 24 }}>No date-wise records this month.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

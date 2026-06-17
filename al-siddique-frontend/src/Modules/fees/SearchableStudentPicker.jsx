import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../../services/api'
import { useAcademicStore } from '../../services/useAcademicStore'
import { C, input, labelStyle } from '../moduleStyles'
import { getRecentStudents } from './feeWorkflowStorage'

export default function SearchableStudentPicker({
  value,
  onChange,
  onStudentSelect,
  classFilter: classFilterProp,
  onClassFilterChange,
  showRecent = true,
}) {
  const { classNames } = useAcademicStore()
  const [students, setStudents] = useState([])
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState(classFilterProp || '')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)

  const activeClassFilter = classFilterProp !== undefined ? classFilterProp : classFilter
  const setActiveClassFilter = onClassFilterChange || setClassFilter

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = { active: 'true' }
    if (activeClassFilter) params.class = activeClassFilter
    if (query.trim().length >= 2) params.search = query.trim()
    api.get('/api/students', { params })
      .then((r) => { if (!cancelled) setStudents(r.data?.data || []) })
      .catch(() => { if (!cancelled) setStudents([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [query, activeClassFilter])

  const selected = useMemo(
    () => students.find((s) => Number(s.id) === Number(value)) || null,
    [students, value]
  )

  useEffect(() => {
    if (selected) {
      setQuery(`${selected.name} (${selected.gr_number || ''})`)
    }
  }, [selected?.id])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || selected) return students.slice(0, 12)
    return students
      .filter((s) => {
        const hay = [
          s.name,
          s.father_name,
          s.gr_number,
          s.roll_number,
          s.class,
          s.section,
        ].join(' ').toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 12)
  }, [students, query, selected])

  const recent = getRecentStudents()

  const pick = (student) => {
    onChange?.(student.id)
    onStudentSelect?.(student)
    setQuery(`${student.name} (${student.gr_number || ''})`)
    setOpen(false)
  }

  const chipStyle = {
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid rgba(200,153,26,0.25)',
    background: 'rgba(11,44,77,0.7)',
    color: C.silver,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }

  return (
    <div ref={wrapRef} style={{ display: 'grid', gap: 10 }}>
      <div>
        <label style={labelStyle}>Class filter</label>
        <select
          style={input}
          value={activeClassFilter}
          onChange={(e) => setActiveClassFilter(e.target.value)}
        >
          <option value="">All classes</option>
          {classNames.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div style={{ position: 'relative' }}>
        <label style={labelStyle}>Search student</label>
        <input
          style={input}
          value={query}
          placeholder="Name, father, GR, roll, class..."
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value) onChange?.('')
          }}
        />
        {open && (
          <div style={{
            position: 'absolute',
            zIndex: 40,
            left: 0,
            right: 0,
            top: 'calc(100% + 6px)',
            maxHeight: 280,
            overflowY: 'auto',
            background: '#0B2C4D',
            border: '1px solid rgba(200,153,26,0.25)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
          }}
          >
            {loading && (
              <div style={{ padding: 12, color: C.muted, fontSize: 12 }}>Searching…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: 12, color: C.muted, fontSize: 12 }}>No students found</div>
            )}
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: Number(value) === Number(s.id) ? 'rgba(200,153,26,0.12)' : 'transparent',
                  color: C.silver,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  {s.gr_number} · {s.father_name} · {s.class} {s.section}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showRecent && (
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            ['Recently added', recent.added],
            ['Recently viewed', recent.viewed],
            ['Recent challan', recent.challan],
          ].map(([label, list]) => list.length > 0 && (
            <div key={label}>
              <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {list.map((s) => (
                  <button key={`${label}-${s.id}`} type="button" style={chipStyle} onClick={() => pick(s)}>
                    {s.name} · {s.gr_number || s.class}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

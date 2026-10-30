import { useMemo, useState, useCallback } from 'react'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, labelStyle, select, input, sectionHeader } from '../moduleStyles'
import { useAcademicStore } from '../../services/useAcademicStore'
import { compareSchoolClasses, sortSchoolClasses } from '../../services/schoolClassOrder.js'
import { 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  RefreshCw, 
  FileDown, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  ShieldCheck, 
  X,
  Search,
  CheckCheck
} from 'lucide-react'

// Preflight server-backed identity before an atomic school promotion.
// Never retry a non-idempotent student write after an uncertain response.
const PROMOTION_SIGN_IN = 'Your school session has expired. Sign in again as Principal, then reopen Promote / Demote. No student was moved.'

function samePromotionActor(before, after) {
  if (!before || !after || !Number.isSafeInteger(Number(before.id)) ||
      Number(before.id) !== Number(after.id)) return false
  const school = obj => obj?.school_id ?? obj?.schoolId
  if (String(school(before) ?? '') !== String(school(after) ?? '')) return false
  return String(before.role || '').toLowerCase() === String(after.role || '').toLowerCase()
}

async function promotionIdentity(accessToken) {
  if (!accessToken) return {status:401,user:null}
  const response=await fetch('/api/auth/me', {
    method:'GET', headers:{Authorization:'Bearer '+accessToken,Accept:'application/json'},
    credentials:'same-origin',cache:'no-store',
  })
  if (!response.ok) return {status:response.status,user:null}
  const data=await response.json()
  return {status:response.status,user:data?.user || null}
}

async function ensurePromotionAuthenticated() {
  const storage=window.localStorage
  const previousToken=storage.getItem('al_siddique_token')
  const previousRefresh=storage.getItem('al_siddique_refresh_token')
  let previousUser=null
  try { previousUser=JSON.parse(storage.getItem('al_siddique_user') || 'null') } catch { /* reject */ }
  if (!previousUser || !previousToken) throw new Error(PROMOTION_SIGN_IN)
  const verified=await promotionIdentity(previousToken)
  if (verified.status===200) {
    if (!samePromotionActor(previousUser,verified.user)) throw new Error('Authenticated school identity changed. No promotion was submitted.')
    return
  }
  if (verified.status!==401) throw new Error('Unable to verify the Principal session. No students were moved.')
  if (!previousRefresh) throw new Error(PROMOTION_SIGN_IN)
  const response=await fetch('/api/auth/refresh', {
    method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({refreshToken:previousRefresh}),
    credentials:'same-origin',cache:'no-store',
  })
  if (!response.ok) throw new Error(PROMOTION_SIGN_IN)
  const refreshed=await response.json()
  if (!refreshed?.token || !refreshed?.refreshToken ||
      !samePromotionActor(previousUser,refreshed.user) ||
      storage.getItem('al_siddique_refresh_token')!==previousRefresh) {
    throw new Error('Authentication identity changed while refreshing. No students were moved.')
  }
  const confirmed=await promotionIdentity(refreshed.token)
  if (confirmed.status!==200 || !samePromotionActor(previousUser,confirmed.user))
    throw new Error(PROMOTION_SIGN_IN)
  storage.setItem('al_siddique_token',refreshed.token)
  storage.setItem('al_siddique_refresh_token',refreshed.refreshToken)
  storage.setItem('al_siddique_user',JSON.stringify(refreshed.user))
  window.dispatchEvent(new CustomEvent('auth:refreshed',{detail:{user:refreshed.user}}))
}

function exportCsv(rows, sourceClass, sourceSection) {
  const table = [
    ['GR No', 'Student Name', 'Current Class', 'Section', 'Roll No'],
    ...rows.map(s => [
      s.gr_number || '', 
      s.name || '', 
      s.class || '', 
      s.section || '',
      s.roll_number || ''
    ])
  ]
  const csv = table.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `roster-${sourceClass || 'all'}${sourceSection ? `-${sourceSection}` : ''}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function PromoteDemote() {
  const { activeClasses, loading: academicLoading } = useAcademicStore()

  // ── Source Class & Loading State ───────────────────────────────────────────
  const [fromClassSelection, setFromClass] = useState('')
  const [fromSectionSelection, setFromSection] = useState('')
  const [students, setStudents] = useState([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // ── Selection State ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState([])

  // ── Target Destination State ───────────────────────────────────────────────
  const [targetClass, setTargetClass] = useState('')
  const [targetSectionSelection, setTargetSection] = useState('')
  const [reason, setReason] = useState('Principal authorized cohort transition')

  // ── Execution & Verification State ─────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [alert, setAlert] = useState(null)
  const [lastVerified, setLastVerified] = useState(null)

  // ── Canonical Ordered Classes ──────────────────────────────────────────────
  const canonicalClasses = useMemo(() => {
    return [...activeClasses].sort((a, b) => compareSchoolClasses(a.name, b.name))
  }, [activeClasses])

  const classNames = useMemo(() => {
    return sortSchoolClasses(canonicalClasses.map(c => c.name))
  }, [canonicalClasses])

  // Derived defaults avoid synchronous setState-in-effect render cascades.
  const fromClass = fromClassSelection || canonicalClasses[0]?.name || ''

  // Sections available for source class
  const fromClassSections = useMemo(() => {
    const found = canonicalClasses.find(c => c.name === fromClass)
    return found?.sections || []
  }, [canonicalClasses, fromClass])

  const fromSection = fromClassSections.includes(fromSectionSelection) ? fromSectionSelection : ''

  // Target class object and its configured sections
  const selectedTargetObj = useMemo(() => {
    return canonicalClasses.find(c => c.name === targetClass) || null
  }, [canonicalClasses, targetClass])

  const targetClassSections = useMemo(() => {
    return selectedTargetObj?.sections || []
  }, [selectedTargetObj])

  const targetSection = targetClassSections.length
    ? (targetClassSections.includes(targetSectionSelection) ? targetSectionSelection : targetClassSections[0])
    : ''

  // ── 1. LOAD STUDENTS WORKFLOW ──────────────────────────────────────────────
  const loadRoster = useCallback(async (cls = fromClass, sec = fromSection, options = {}) => {
    if (!cls) return
    setLoadingRoster(true)
    if (!options.keepAlert) {
      setAlert(null)
    }
    setSelectedIds([])
    try {
      const params = { class: cls }
      if (sec) params.section = sec
      const res = await api.get('/api/students', { params, skipCache: true })
      const list = res.data?.data || []
      setStudents(list)
      if (list.length === 0 && !options.keepAlert) {
        setAlert({ 
          type: 'info', 
          message: `No active students found in Class "${cls}"${sec ? ` (${sec})` : ''}.` 
        })
      }
    } catch (err) {
      setAlert({ 
        type: 'error', 
        message: err.response?.data?.message || err.message || 'Student roster could not be loaded for promotion/demotion.' 
      })
    } finally {
      setLoadingRoster(false)
    }
  }, [fromClass, fromSection])

  // Roster fetch is explicit: Class → Section → Load Students.
  // Changing selection never implicitly exposes an unrelated class roster.

  // ── 2. SELECTION HANDLERS ──────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students
    const term = searchTerm.toLowerCase().trim()
    return students.filter(s => 
      String(s.name || '').toLowerCase().includes(term) ||
      String(s.gr_number || '').toLowerCase().includes(term) ||
      String(s.roll_number || '').includes(term)
    )
  }, [students, searchTerm])

  const toggleStudent = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    const visibleIds=filteredStudents.map(s=>s.id)
    if (!visibleIds.length) return
    const current=new Set(selectedIds)
    const everyVisible=visibleIds.every(id=>current.has(id))
    setSelectedIds(everyVisible
      ? selectedIds.filter(id=>!visibleIds.includes(id))
      : [...new Set([...selectedIds,...visibleIds])])
  }

  const selectAll = () => setSelectedIds(students.map(s => s.id))
  const deselectAll = () => setSelectedIds([])

  // ── 3. QUICK STEP PROMOTIONS / DEMOTIONS ───────────────────────────────────
  const quickPickDestination = (direction) => {
    const currentIndex = canonicalClasses.findIndex(c => c.name === fromClass)
    if (currentIndex < 0) return

    const nextIndex = direction === 'promote' ? currentIndex + 1 : currentIndex - 1
    if (nextIndex < 0) {
      setAlert({ type: 'warning', message: `Class "${fromClass}" is already the lowest configured class.` })
      return
    }
    if (nextIndex >= canonicalClasses.length) {
      setAlert({ type: 'warning', message: `Class "${fromClass}" is already the highest configured class.` })
      return
    }

    const dest = canonicalClasses[nextIndex]
    setTargetClass(dest.name)
    const destSecs = dest.sections || []
    setTargetSection(destSecs[0] || '')
  }

  // ── 4. PREVIEW MODAL LOGIC ────────────────────────────────────────────────
  const handleOpenPreview = () => {
    setAlert(null)
    if (!selectedIds.length) {
      setAlert({ type: 'error', message: 'Select at least one student to move.' })
      return
    }
    if (!targetClass) {
      setAlert({ type: 'error', message: 'Choose a valid destination class.' })
      return
    }
    if (targetClassSections.length > 0 && !targetSection) {
      setAlert({ type: 'error', message: `Destination class "${targetClass}" requires an explicit section.` })
      return
    }

    // Check if target is same as source
    const selectedStudents = students.filter(s => selectedIds.includes(s.id))
    const allSame = selectedStudents.every(s => s.class === targetClass && s.section === targetSection)
    if (allSame) {
      setAlert({ 
        type: 'warning', 
        message: `All selected students are already in "${targetClass}" · Section "${targetSection}". Please choose a different destination.` 
      })
      return
    }

    setShowPreview(true)
  }

  // ── 5. APPLY TRANSITION (ATOMIC BACKEND CALL) ──────────────────────────────
  const handleApply = async () => {
    setSaving(true)
    setAlert(null)

    const selectedStudents = students.filter(s => selectedIds.includes(s.id))
    const assignments = selectedStudents.map(s => ({
      student_id: s.id,
      class: targetClass,
      section: targetSection,
    }))

    try {
      const payload = {
        source_class: fromClass,
        source_section: fromSection,
        reason: reason.trim() || 'Principal bulk class assignment',
        assignments,
      }

      // Refresh credentials BEFORE the non-idempotent write.
      // Never retry an uncertain promotion automatically.
      await ensurePromotionAuthenticated()
      const res = await api.post('/api/students/bulk-class-assignment', payload)
      if (res.data?.success !== true || Number(res.data?.count) !== assignments.length ||
          !Array.isArray(res.data?.data) || res.data.data.length !== assignments.length)
        throw new Error('Server did not confirm all student movements. Check the roster before retrying.')
      const movedCount = Number(res.data.count)

      setShowPreview(false)
      setSelectedIds([])

      const successNotice = `Successfully moved ${movedCount} student${movedCount === 1 ? '' : 's'} from ${fromClass} to ${targetClass} (${targetSection}). Historical movement logged.`
      setAlert({ type: 'success', message: successNotice })

      setLastVerified({
        count: movedCount,
        fromClass,
        toClass: targetClass,
        toSection: targetSection,
        timestamp: new Date(),
      })

      // Immediate refresh of source roster
      await loadRoster(fromClass, fromSection, { keepAlert: true })
    } catch (err) {
      const data = err.response?.data
      const errorMsg = data?.message || err.message || 'Bulk transition failed.'
      setAlert({ 
        type: 'error', 
        message: errorMsg,
        details: data?.code === 'STALE_ROSTER' ? 'Another session modified student records. Please refresh the roster.' : undefined
      })
      setShowPreview(false)
    } finally {
      setSaving(false)
    }
  }

  // Helper to switch source view to destination for instant verification
  const inspectDestination = () => {
    if (!lastVerified) return
    setFromClass(lastVerified.toClass)
    setFromSection(lastVerified.toSection)
    void loadRoster(lastVerified.toClass, lastVerified.toSection)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--apex-shell-gradient)', color: C.silver, padding: '24px 16px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 24 }}>

        {/* ── HEADER CARD ──────────────────────────────────────────────────────── */}
        <div className="super-module-card" style={{ ...card, borderRadius: 20, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'color-mix(in srgb, var(--apex-action-primary) 14%, transparent)', display: 'grid', placeItems: 'center', color: 'var(--apex-action-primary)' }}>
                <Users size={22} />
              </div>
              <h1 style={{ ...sectionHeader, margin: 0, fontSize: 22 }}>Promote / Demote Students</h1>
            </div>
            <p style={{ color: C.muted, margin: '6px 0 0 50px', fontSize: 13, lineHeight: 1.4 }}>
              Authoritative academic progression & cohort management. Atomic, tenant-scoped transitions with audit logging and rollback protection.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              type="button" 
              style={btnSecondary} 
              onClick={() => exportCsv(students, fromClass, fromSection)} 
              disabled={!students.length}
            >
              <FileDown size={15} /> Export Roster
            </button>
          </div>
        </div>

        {/* ── ALERT BANNER ─────────────────────────────────────────────────────── */}
        {alert && (
          <div style={{
            padding: '14px 18px',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: alert.type === 'success' 
              ? 'color-mix(in srgb, var(--apex-action-success) 12%, var(--apex-bg-surface-solid))' 
              : alert.type === 'error'
              ? 'color-mix(in srgb, var(--apex-action-danger) 12%, var(--apex-bg-surface-solid))'
              : 'color-mix(in srgb, var(--apex-action-highlight) 12%, var(--apex-bg-surface-solid))',
            border: `1px solid ${
              alert.type === 'success' 
                ? 'var(--apex-action-success)' 
                : alert.type === 'error' 
                ? 'var(--apex-action-danger)' 
                : 'var(--apex-action-highlight)'
            }`,
            color: alert.type === 'success' ? C.green : alert.type === 'error' ? C.red : C.gold,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <div>
                <span style={{ fontWeight: 650, fontSize: 13 }}>{alert.message}</span>
                {alert.details && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{alert.details}</div>}
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setAlert(null)} 
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── LAST VERIFIED DESTINATION BANNER ─────────────────────────────────── */}
        {lastVerified && (
          <div style={{
            padding: '12px 18px',
            borderRadius: 14,
            background: 'color-mix(in srgb, var(--apex-action-primary) 10%, var(--apex-bg-surface-solid))',
            border: '1px solid color-mix(in srgb, var(--apex-action-primary) 30%, transparent)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={18} style={{ color: 'var(--apex-action-primary)' }} />
              <span style={{ fontSize: 13, color: C.silver }}>
                Verified transition of <strong>{lastVerified.count} students</strong> into <strong>{lastVerified.toClass} ({lastVerified.toSection})</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={inspectDestination}
              style={{ ...btnSecondary, minHeight: 32, padding: '4px 12px', fontSize: 12 }}
            >
              View Destination Roster <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* ── WORKFLOW CONTAINER: FROM CLASS & DESTINATION CLASS CONTROLS ───────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

          {/* STEP 1: FROM CLASS (SOURCE) */}
          <div className="super-module-card" style={{ ...card, borderRadius: 18, display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ 
                  width: 24, height: 24, borderRadius: '50%', background: 'var(--apex-action-primary)', 
                  color: '#fff', fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center' 
                }}>1</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.silver }}>Source Class</span>
              </div>
              <span style={{ fontSize: 12, color: C.muted }}>From School Roster</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Class</label>
                <select 
                  style={select} 
                  value={fromClass} 
                  onChange={e => {
                    setFromClass(e.target.value)
                    setFromSection('')
                    setStudents([])
                    setSelectedIds([])
                  }}
                  disabled={loadingRoster || academicLoading}
                >
                  {classNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Section</label>
                <select 
                  style={select} 
                  value={fromSection} 
                  onChange={e => {
                    setFromSection(e.target.value)
                    setStudents([])
                    setSelectedIds([])
                  }}
                  disabled={loadingRoster || academicLoading}
                >
                  <option value="">All Sections</option>
                  {fromClassSections.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  style={{ ...btnPrimary, width: '100%', minHeight: 42 }}
                  onClick={() => loadRoster(fromClass, fromSection)}
                  disabled={loadingRoster || !fromClass}
                >
                  <RefreshCw size={14} className={loadingRoster ? 'animate-spin' : ''} />
                  {loadingRoster ? 'Loading…' : 'Load Students'}
                </button>
              </div>
            </div>

            <div style={{ fontSize: 12, color: C.muted, display: 'flex', justifyContent: 'space-between' }}>
              <span>Total in {fromClass || 'Class'}: <strong>{students.length}</strong></span>
              <span>Selected: <strong>{selectedIds.length}</strong></span>
            </div>
          </div>

          {/* STEP 2: TO CLASS (DESTINATION) */}
          <div className="super-module-card" style={{ ...card, borderRadius: 18, display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ 
                  width: 24, height: 24, borderRadius: '50%', background: selectedIds.length ? 'var(--apex-action-primary)' : 'var(--apex-border-default)', 
                  color: '#fff', fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center' 
                }}>2</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.silver }}>Destination & Direction</span>
              </div>
              <span style={{ fontSize: 12, color: C.muted }}>Target Setup</span>
            </div>

            {/* Quick Step Buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => quickPickDestination('promote')}
                style={{ ...btnSecondary, flex: 1, minHeight: 34, fontSize: 12, padding: '6px 10px' }}
                disabled={!fromClass}
              >
                <ArrowUp size={13} style={{ color: C.green }} /> Next Class (Promote ↑)
              </button>
              <button
                type="button"
                onClick={() => quickPickDestination('demote')}
                style={{ ...btnSecondary, flex: 1, minHeight: 34, fontSize: 12, padding: '6px 10px' }}
                disabled={!fromClass}
              >
                <ArrowDown size={13} style={{ color: C.red }} /> Prev Class (Demote ↓)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Target Class</label>
                <select 
                  style={select} 
                  value={targetClass} 
                  onChange={e => setTargetClass(e.target.value)}
                  disabled={saving}
                >
                  <option value="">Select Target Class</option>
                  {classNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Target Section</label>
                <select 
                  style={select} 
                  value={targetSection} 
                  onChange={e => setTargetSection(e.target.value)}
                  disabled={saving || !targetClassSections.length}
                >
                  {targetClassSections.length === 0 ? (
                    <option value="">No sections configured</option>
                  ) : (
                    targetClassSections.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  style={{
                    ...btnPrimary,
                    width: '100%',
                    minHeight: 42,
                    background: selectedIds.length ? 'var(--apex-action-primary)' : 'var(--apex-bg-surface-solid)',
                    border: selectedIds.length ? 'none' : '1px solid var(--apex-border-default)',
                    color: selectedIds.length ? '#fff' : C.muted,
                    cursor: selectedIds.length ? 'pointer' : 'not-allowed',
                  }}
                  onClick={handleOpenPreview}
                  disabled={saving || !selectedIds.length || !targetClass || (targetClassSections.length > 0 && !targetSection)}
                >
                  Preview Movement ({selectedIds.length})
                </button>
              </div>
            </div>

            <div style={{ fontSize: 12, color: C.muted }}>
              Destination Section: <strong>{targetSection || 'None'}</strong>
            </div>
          </div>

        </div>

        {/* ── STEP 3: STUDENT SELECTION TABLE ─────────────────────────────────── */}
        <div className="super-module-card" style={{ ...card, borderRadius: 20, display: 'grid', gap: 16 }}>
          
          {/* Table Header Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ 
                  width: 24, height: 24, borderRadius: '50%', background: 'var(--apex-action-primary)', 
                  color: '#fff', fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center' 
                }}>3</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Select Students</span>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button 
                  type="button" 
                  onClick={selectAll} 
                  disabled={!filteredStudents.length} 
                  style={{ ...btnSecondary, minHeight: 30, padding: '4px 10px', fontSize: 11 }}
                >
                  <CheckCheck size={12} /> Select All ({filteredStudents.length})
                </button>
                <button 
                  type="button" 
                  onClick={deselectAll} 
                  disabled={!selectedIds.length} 
                  style={{ ...btnSecondary, minHeight: 30, padding: '4px 10px', fontSize: 11 }}
                >
                  Clear Selection
                </button>
              </div>

              <span style={{ 
                padding: '4px 10px', 
                borderRadius: 20, 
                fontSize: 12, 
                background: selectedIds.length ? 'color-mix(in srgb, var(--apex-action-primary) 18%, transparent)' : 'var(--apex-bg-subtle)',
                color: selectedIds.length ? 'var(--apex-action-primary)' : C.muted,
                fontWeight: 650
              }}>
                {selectedIds.length} of {filteredStudents.length} selected
              </span>
            </div>

            {/* Filter Search */}
            <div style={{ position: 'relative', minWidth: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 13, color: C.muted }} />
              <input
                type="text"
                style={{ ...input, paddingLeft: 30, minHeight: 36, fontSize: 12 }}
                placeholder="Search name or GR number…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Roster Table */}
          <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 14 }}>
            {loadingRoster ? (
              <div style={{ padding: 48, textAlign: 'center', color: C.muted, display: 'grid', gap: 8, placeItems: 'center' }}>
                <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--apex-action-primary)' }} />
                <span>Loading {fromClass || 'class'} roster from database…</span>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--apex-bg-surface-solid)', borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: '12px 14px', width: 44, textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.length > 0 && selectedIds.length === filteredStudents.length}
                        onChange={toggleAll}
                        disabled={!filteredStudents.length}
                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                      />
                    </th>
                    <th style={{ padding: '12px 14px', color: C.muted, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>GR Number</th>
                    <th style={{ padding: '12px 14px', color: C.muted, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Student Name</th>
                    <th style={{ padding: '12px 14px', color: C.muted, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Current Class</th>
                    <th style={{ padding: '12px 14px', color: C.muted, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Section</th>
                    <th style={{ padding: '12px 14px', color: C.muted, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Roll No</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, idx) => {
                    const isSelected = selectedIds.includes(s.id)
                    return (
                      <tr 
                        key={s.id} 
                        style={{ 
                          background: isSelected 
                            ? 'color-mix(in srgb, var(--apex-action-primary) 10%, transparent)' 
                            : idx % 2 === 0 ? 'transparent' : 'var(--apex-bg-subtle)',
                          borderBottom: `1px solid color-mix(in srgb, ${C.border} 40%, transparent)`,
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onClick={() => toggleStudent(s.id)}
                      >
                        <td style={{ padding: '12px 14px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleStudent(s.id)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--apex-action-primary)', fontWeight: 700 }}>
                          {s.gr_number || '—'}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 650 }}>
                          {s.name}
                        </td>
                        <td style={{ padding: '12px 14px', color: C.silver }}>
                          {s.class}
                        </td>
                        <td style={{ padding: '12px 14px', color: C.muted }}>
                          {s.section || '—'}
                        </td>
                        <td style={{ padding: '12px 14px', color: C.muted }}>
                          {s.roll_number || '—'}
                        </td>
                      </tr>
                    )
                  })}

                  {!filteredStudents.length && !loadingRoster && (
                    <tr>
                      <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: C.muted }}>
                        {searchTerm ? 'No students match your search filter.' : `No students found in Class "${fromClass || ''}".`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom Action Summary Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 6 }}>
            <span style={{ fontSize: 13, color: C.muted }}>
              {selectedIds.length > 0 ? (
                <span>Ready to transition <strong>{selectedIds.length}</strong> student{selectedIds.length === 1 ? '' : 's'} into <strong>{targetClass || '…'} ({targetSection || '…'})</strong>.</span>
              ) : (
                <span>Select one or more students to proceed with promotion or demotion.</span>
              )}
            </span>

            <button
              type="button"
              style={{
                ...btnPrimary,
                minHeight: 40,
                padding: '8px 24px',
                background: selectedIds.length && targetClass && targetSection ? 'var(--apex-action-primary)' : 'var(--apex-bg-surface-solid)',
                border: selectedIds.length && targetClass && targetSection ? 'none' : '1px solid var(--apex-border-default)',
                color: selectedIds.length && targetClass && targetSection ? '#fff' : C.muted,
                cursor: selectedIds.length && targetClass && targetSection ? 'pointer' : 'not-allowed',
              }}
              onClick={handleOpenPreview}
              disabled={saving || !selectedIds.length || !targetClass || (targetClassSections.length > 0 && !targetSection)}
            >
              Review & Preview Movement <ArrowRight size={15} />
            </button>
          </div>
        </div>

      </div>

      {/* ── STEP 4 & 5: CONFIRMATION PREVIEW MODAL ────────────────────────────── */}
      {showPreview && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'grid',
          placeItems: 'center',
          padding: 16,
          zIndex: 9999,
        }}>
          <div style={{
            ...card,
            maxWidth: 680,
            width: '100%',
            borderRadius: 22,
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
            display: 'grid',
            gap: 20,
            padding: 26,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={22} style={{ color: 'var(--apex-action-primary)' }} />
                <h2 style={{ margin: 0, fontSize: 18, color: C.silver }}>Review & Confirm Cohort Movement</h2>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPreview(false)} 
                disabled={saving}
                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Movement Comparison Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 14, alignItems: 'center' }}>
              <div style={{ padding: 14, borderRadius: 14, background: 'var(--apex-bg-surface-solid)', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 700 }}>Source</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.silver, marginTop: 4 }}>{fromClass}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{fromSection || 'All Sections'}</div>
              </div>

              <div style={{ display: 'grid', placeItems: 'center', color: 'var(--apex-action-primary)' }}>
                <ArrowRight size={24} />
              </div>

              <div style={{ padding: 14, borderRadius: 14, background: 'color-mix(in srgb, var(--apex-action-primary) 12%, var(--apex-bg-surface-solid))', border: '1px solid var(--apex-action-primary)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--apex-action-primary)', textTransform: 'uppercase', fontWeight: 700 }}>Destination</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 4 }}>{targetClass}</div>
                <div style={{ fontSize: 12, color: C.silver, marginTop: 2 }}>Section: {targetSection}</div>
              </div>
            </div>

            {/* Selected Student Count */}
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--apex-bg-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: C.silver }}>Cohort Count:</span>
              <strong style={{ fontSize: 14, color: 'var(--apex-action-primary)' }}>{selectedIds.length} student{selectedIds.length === 1 ? '' : 's'}</strong>
            </div>

            {/* Selected Students Preview Scroll Area */}
            <div>
              <label style={labelStyle}>Selected Students ({selectedIds.length})</label>
              <div style={{ maxHeight: 160, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 10, background: 'var(--apex-bg-surface-solid)' }}>
                {students.filter(s => selectedIds.includes(s.id)).map(s => (
                  <div key={s.id} style={{ padding: '8px 12px', borderBottom: `1px solid color-mix(in srgb, ${C.border} 30%, transparent)`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span><strong>{s.name}</strong> <span style={{ color: C.muted }}>({s.gr_number})</span></span>
                    <span style={{ color: C.muted }}>{s.class} · {s.section}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Movement Reason Input */}
            <div>
              <label style={labelStyle}>Audit Reason</label>
              <input
                type="text"
                style={input}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Reason for audit log…"
                disabled={saving}
              />
            </div>

            {/* Impact & Safety Notice */}
            <div style={{
              padding: 12,
              borderRadius: 12,
              background: 'color-mix(in srgb, var(--apex-action-highlight) 10%, var(--apex-bg-surface-solid))',
              border: '1px solid color-mix(in srgb, var(--apex-action-highlight) 30%, transparent)',
              fontSize: 12,
              lineHeight: 1.4,
              color: C.goldL,
            }}>
              <strong>Preservation Guarantee:</strong> Student identities, GR numbers, fee payment history, attendance records, and exam results remain completely intact under the new class enrollment. This transaction is atomic and logged in <code>student_class_movement_audit</code>.
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <button
                type="button"
                style={btnSecondary}
                onClick={() => setShowPreview(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  ...btnPrimary,
                  padding: '9px 24px',
                  background: 'var(--apex-action-primary)',
                }}
                onClick={handleApply}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Applying Changes…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Apply Transition ({selectedIds.length})
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

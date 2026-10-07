import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import { btnSecondary } from '../moduleStyles'
import { printChallan } from './ViewChallans'
import { trackRecentChallan } from './feeWorkflowStorage'
import { MONTHS } from './feeConstants'

const subTabBtn = (active) => ({
  padding: '8px 12px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  background: active ? 'color-mix(in srgb, var(--apex-action-primary) 10%, var(--apex-bg-surface-solid))' : 'transparent',
  color: active ? 'var(--apex-action-primary)' : 'var(--apex-text-tertiary)',
  fontWeight: 600,
  fontSize: 12,
  whiteSpace: 'nowrap',
})

const badge = (status) => {
  const s = String(status || '').toLowerCase()
  const color = s === 'paid' ? '#30D158' : s === 'partial' ? '#C8991A' : s === 'unpaid' ? '#FF375F' : '#8892A4'
  return { color, fontWeight: 700, fontSize: 12, textTransform: 'capitalize' }
}

export default function StudentFeePanel({ student, school }) {
  const studentId = student?.id
  const [subTab, setSubTab] = useState('current')
  const [profile, setProfile] = useState(null)
  const [challans, setChallans] = useState([])
  const [loadedStudentId, setLoadedStudentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const load = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    setLoadError('')
    try {
      const profilePromise = api.get(`/api/students/${studentId}/fee-profile`).catch((err) => {
        if (err.response?.status === 404) return { data: { data: null } }
        throw err
      })
      const [profileRes, feesRes] = await Promise.all([
        profilePromise,
        api.get('/api/fees', { params: { student_id: studentId } }),
      ])
      setProfile(profileRes.data?.data || null)
      setChallans(Array.isArray(feesRes.data?.data) ? feesRes.data.data : [])
      setLoadedStudentId(String(studentId))
    } catch (err) {
      console.error('Student fee panel load failed', err)
      setLoadError(err.response?.data?.message || 'Student fee records could not be refreshed. Existing loaded fee data was preserved for its original student.')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => { load() }, [load])

  const scopeMatches = String(loadedStudentId) === String(studentId)
  const activeProfile = scopeMatches ? profile : null
  const activeChallans = scopeMatches ? challans : []

  const currentChallan = useMemo(() => {
    const now = new Date()
    const month = MONTHS[now.getMonth()]
    const year = now.getFullYear()
    return activeChallans.find((c) => c.month === month && Number(c.year) === year)
      || activeChallans.find((c) => (c.status || '').toLowerCase() !== 'paid')
      || activeChallans[0]
      || null
  }, [activeChallans])

  const markPaid = async (challan) => {
    if (!challan?.id) return
    setPaying(true)
    setActionMessage('')
    try {
      const payable = Math.max(0, Number(challan.gross_total ?? challan.amount ?? 0))
      await api.put(`/api/fees/${challan.id}/pay`, {
        paid_amount: payable,
        payment_mode: 'cash',
        discount: Number(challan.discount || 0),
        payment_note: 'Quick mark-paid action from student fee panel',
      })
      setActionMessage('Payment recorded successfully.')
      await load()
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Payment could not be recorded.')
    } finally {
      setPaying(false)
    }
  }

  const sendToParent = () => {
    const phone = student?.whatsapp || student?.phone || student?.parent_phone
    if (!phone) {
      setActionMessage('Parent WhatsApp/phone is not set on the student record.')
      return
    }
    const clean = String(phone).replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Fee challan for ${student.name} (${student.gr || student.gr_number}) — ${currentChallan?.month} ${currentChallan?.year} — outstanding Rs. ${Number(currentChallan?.remaining_balance ?? Math.max(0, Number(currentChallan?.gross_total ?? currentChallan?.amount ?? 0) - Number(currentChallan?.paid_amount || 0))).toLocaleString()}`
    )
    window.open(`https://wa.me/92${clean.replace(/^0/, '')}?text=${msg}`, '_blank')
  }

  if (loading) {
    return <div style={{ color: 'var(--apex-text-tertiary)', padding: 16 }}>Loading fee records…</div>
  }

  if (loadError && !scopeMatches) {
    return <div style={{ padding:16, borderRadius:12, background:'color-mix(in srgb, var(--apex-action-danger) 8%, var(--apex-bg-surface-solid))', border:'1px solid color-mix(in srgb, var(--apex-action-danger) 24%, var(--apex-border-default))', color:'var(--apex-action-danger)', fontSize:12, fontWeight:700 }}>{loadError}</div>
  }

  const subTabs = [
    { id: 'profile', label: 'Fee Profile' },
    { id: 'current', label: 'Current Challan' },
    { id: 'challans', label: 'View Challans' },
    { id: 'vouchers', label: 'Voucher History' },
  ]

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {loadError && scopeMatches && (
        <div style={{ padding:12, borderRadius:10, background:'color-mix(in srgb, var(--apex-action-danger) 8%, var(--apex-bg-surface-solid))', border:'1px solid color-mix(in srgb, var(--apex-action-danger) 24%, var(--apex-border-default))', color:'var(--apex-action-danger)', fontSize:12, fontWeight:700 }}>{loadError}</div>
      )}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', background: 'var(--apex-bg-subtle)', borderRadius: 10, padding: 4 }}>
        {subTabs.map((t) => (
          <button key={t.id} type="button" style={subTabBtn(subTab === t.id)} onClick={() => setSubTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {actionMessage && <div style={{ padding:'10px 12px', borderRadius:10, background:actionMessage.includes('success') ? 'color-mix(in srgb, var(--apex-action-success) 8%, var(--apex-bg-surface-solid))' : 'color-mix(in srgb, var(--apex-action-danger) 8%, var(--apex-bg-surface-solid))', border:`1px solid ${actionMessage.includes('success') ? 'color-mix(in srgb, var(--apex-action-success) 24%, var(--apex-border-default))' : 'color-mix(in srgb, var(--apex-action-danger) 24%, var(--apex-border-default))'}`, color:actionMessage.includes('success') ? 'var(--apex-action-success)' : 'var(--apex-action-danger)', fontSize:12, fontWeight:700 }}>{actionMessage}</div>}

      {subTab === 'profile' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {activeProfile ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {[
                ['Monthly', activeProfile.monthly_fee],
                ['Admission', activeProfile.admission_fee],
                ['Registration', activeProfile.registration_fee],
                ['Library', activeProfile.library_fee],
                ['Transport', activeProfile.transport_fee],
                ['Exam', activeProfile.exam_fee],
                ['Other', activeProfile.other_charges],
              ].map(([label, val]) => (
                <div key={label} style={{ padding: '12px 14px', background: 'var(--apex-bg-subtle)', borderRadius: 10 }}>
                  <div style={{ color: '#8892A4', fontSize: 11 }}>{label}</div>
                  <div style={{ color: '#C0C8D8', fontWeight: 700 }}>Rs. {Number(val || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#8892A4', fontSize: 13 }}>No fee profile saved yet. Set fees when adding the student or from Create Challan.</div>
          )}
        </div>
      )}

      {subTab === 'current' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {currentChallan ? (
            <>
              <div style={{ padding: 16, background: 'var(--apex-bg-subtle)', borderRadius: 12, border: '1px solid var(--apex-border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ color: '#C0C8D8', fontWeight: 800 }}>{currentChallan.month} {currentChallan.year}</div>
                    <div style={{ color: '#8892A4', fontSize: 12 }}>{currentChallan.challan_no}</div>
                  </div>
                  <div style={badge(currentChallan.status)}>{currentChallan.status || 'Not recorded'}</div>
                </div>
                <div style={{ marginTop: 10, color: '#C8991A', fontSize: 22, fontWeight: 800 }}>
                  Rs. {Number(currentChallan.remaining_balance ?? Math.max(0, Number(currentChallan.gross_total ?? currentChallan.amount ?? 0) - Number(currentChallan.paid_amount || 0))).toLocaleString()} outstanding
                </div>
                <div style={{ color: '#8892A4', fontSize: 12, marginTop: 6 }}>
                  Due: {currentChallan.due_date ? new Date(currentChallan.due_date).toLocaleDateString('en-PK') : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" style={btnSecondary} onClick={() => printChallan({ ...currentChallan, name: student.name, gr_number: student.gr || student.gr_number, class: student.class, section: student.section, father_name: student.father }, school)}>Print voucher</button>
                <button type="button" style={btnSecondary} onClick={() => printChallan({ ...currentChallan, name: student.name, gr_number: student.gr || student.gr_number, class: student.class, section: student.section, father_name: student.father }, school)}>Download PDF</button>
                <button type="button" style={btnSecondary} disabled={paying} onClick={() => markPaid(currentChallan)}>Mark paid</button>
                <button type="button" style={btnSecondary} onClick={sendToParent}>Send to parent</button>
              </div>
            </>
          ) : (
            <div style={{ color: '#8892A4' }}>No challan for this period. Create one from Fees → Create Challan.</div>
          )}
        </div>
      )}

      {subTab === 'challans' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {activeChallans.length === 0 && <div style={{ color: '#8892A4' }}>No challans yet.</div>}
          {activeChallans.map((ch) => (
            <div key={ch.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '12px 14px', background: 'var(--apex-bg-subtle)', borderRadius: 10, alignItems: 'center' }}>
              <div>
                <div style={{ color: '#C0C8D8', fontWeight: 700 }}>{ch.month} {ch.year}</div>
                <div style={{ color: '#8892A4', fontSize: 11 }}>
                  Rs. {Number(ch.amount || 0).toLocaleString()} · Issued {ch.created_at ? new Date(ch.created_at).toLocaleDateString('en-PK') : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={badge(ch.status)}>{ch.status}</span>
                <button type="button" style={btnSecondary} onClick={() => { trackRecentChallan(student); printChallan({ ...ch, name: student.name, gr_number: student.gr || student.gr_number, class: student.class, section: student.section, father_name: student.father }, school) }}>Print</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'vouchers' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {activeChallans.map((ch) => (
            <div key={`v-${ch.id}`} style={{ padding: '10px 14px', background: 'var(--apex-bg-subtle)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#C0C8D8' }}>{ch.challan_no || `CH-${ch.id}`}</div>
                <div style={{ fontSize: 11, color: '#8892A4' }}>{ch.month} {ch.year}</div>
              </div>
              <button type="button" style={btnSecondary} onClick={() => printChallan({ ...ch, name: student.name, gr_number: student.gr || student.gr_number, class: student.class, section: student.section, father_name: student.father }, school)}>Reprint</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

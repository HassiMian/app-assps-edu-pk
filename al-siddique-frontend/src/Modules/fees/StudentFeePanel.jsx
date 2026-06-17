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
  background: active ? 'rgba(200,153,26,0.2)' : 'transparent',
  color: active ? '#C8991A' : '#8892A4',
  fontWeight: 600,
  fontSize: 12,
  whiteSpace: 'nowrap',
})

const badge = (status) => {
  const s = (status || 'unpaid').toLowerCase()
  const color = s === 'paid' ? '#30D158' : s === 'partial' ? '#C8991A' : '#FF375F'
  return { color, fontWeight: 700, fontSize: 12, textTransform: 'capitalize' }
}

export default function StudentFeePanel({ student, school }) {
  const studentId = student?.id
  const [subTab, setSubTab] = useState('current')
  const [profile, setProfile] = useState(null)
  const [challans, setChallans] = useState([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  const load = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const [profileRes, feesRes] = await Promise.all([
        api.get(`/api/students/${studentId}/fee-profile`).catch(() => ({ data: { data: null } })),
        api.get('/api/fees', { params: { student_id: studentId } }),
      ])
      setProfile(profileRes.data?.data || null)
      setChallans(feesRes.data?.data || [])
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => { load() }, [load])

  const currentChallan = useMemo(() => {
    const now = new Date()
    const month = MONTHS[now.getMonth()]
    const year = now.getFullYear()
    return challans.find((c) => c.month === month && Number(c.year) === year)
      || challans.find((c) => (c.status || '').toLowerCase() !== 'paid')
      || challans[0]
      || null
  }, [challans])

  const markPaid = async (challan) => {
    if (!challan?.id) return
    setPaying(true)
    try {
      await api.put(`/api/fees/${challan.id}/pay`, {
        paid_amount: challan.amount,
        payment_mode: 'cash',
      })
      await load()
    } finally {
      setPaying(false)
    }
  }

  const sendToParent = () => {
    const phone = student?.whatsapp || student?.phone || student?.parent_phone
    if (!phone) {
      alert('Parent WhatsApp/phone not set on student record.')
      return
    }
    const clean = String(phone).replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Fee challan for ${student.name} (${student.gr || student.gr_number}) — ${currentChallan?.month} ${currentChallan?.year} — Rs. ${Number(currentChallan?.amount || 0).toLocaleString()}`
    )
    window.open(`https://wa.me/92${clean.replace(/^0/, '')}?text=${msg}`, '_blank')
  }

  if (loading) {
    return <div style={{ color: '#8892A4', padding: 16 }}>Loading fee records…</div>
  }

  const subTabs = [
    { id: 'profile', label: 'Fee Profile' },
    { id: 'current', label: 'Current Challan' },
    { id: 'challans', label: 'View Challans' },
    { id: 'vouchers', label: 'Voucher History' },
  ]

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', background: 'rgba(7,30,52,0.5)', borderRadius: 10, padding: 4 }}>
        {subTabs.map((t) => (
          <button key={t.id} type="button" style={subTabBtn(subTab === t.id)} onClick={() => setSubTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {subTab === 'profile' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {profile ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {[
                ['Monthly', profile.monthly_fee],
                ['Admission', profile.admission_fee],
                ['Registration', profile.registration_fee],
                ['Library', profile.library_fee],
                ['Transport', profile.transport_fee],
                ['Exam', profile.exam_fee],
                ['Other', profile.other_charges],
              ].map(([label, val]) => (
                <div key={label} style={{ padding: '12px 14px', background: 'rgba(7,30,52,0.4)', borderRadius: 10 }}>
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
              <div style={{ padding: 16, background: 'rgba(7,30,52,0.45)', borderRadius: 12, border: '1px solid rgba(200,153,26,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ color: '#C0C8D8', fontWeight: 800 }}>{currentChallan.month} {currentChallan.year}</div>
                    <div style={{ color: '#8892A4', fontSize: 12 }}>{currentChallan.challan_no}</div>
                  </div>
                  <div style={badge(currentChallan.status)}>{currentChallan.status || 'unpaid'}</div>
                </div>
                <div style={{ marginTop: 10, color: '#C8991A', fontSize: 22, fontWeight: 800 }}>
                  Rs. {Number(currentChallan.amount || 0).toLocaleString()}
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
          {challans.length === 0 && <div style={{ color: '#8892A4' }}>No challans yet.</div>}
          {challans.map((ch) => (
            <div key={ch.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '12px 14px', background: 'rgba(7,30,52,0.4)', borderRadius: 10, alignItems: 'center' }}>
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
          {challans.map((ch) => (
            <div key={`v-${ch.id}`} style={{ padding: '10px 14px', background: 'rgba(7,30,52,0.35)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
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

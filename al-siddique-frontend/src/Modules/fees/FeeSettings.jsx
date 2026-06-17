import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from '../moduleStyles'
import { useAcademicStore } from '../../services/useAcademicStore'

const FALLBACK_FEES = {
  Starter: 2500,
  Mover: 2500,
  Flyer: 2500,
  One: 2500,
  Two: 2500,
  Three: 2500,
  Four: 2500,
  Five: 2500,
  Six: 2800,
  Seven: 2800,
  Eight: 2800,
  'Pre Nine': 3000,
  'Hifaz Class': 2500,
}

const emptyPackage = {
  name: 'Triple Star Discount Package',
  description: 'Automatically applies when a family has 3 or more active enrolled children.',
  discount_type: 'percentage',
  discount_value: 10,
  min_sibling_count: 3,
  applicable_classes: [],
  applicable_sessions: ['2026-2027'],
  active: true,
  auto_apply: true,
  start_date: '',
  end_date: '',
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 54,
        height: 30,
        borderRadius: 999,
        border: `1px solid ${checked ? 'rgba(48,209,88,0.55)' : 'rgba(148,163,184,0.28)'}`,
        background: checked ? 'linear-gradient(135deg,#22c55e,#4ade80)' : 'rgba(15,23,42,0.7)',
        padding: 3,
        cursor: 'pointer',
      }}
    >
      <span style={{
        display: 'block',
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: checked ? '#06210f' : '#94a3b8',
        transform: checked ? 'translateX(23px)' : 'translateX(0)',
        transition: 'transform 160ms ease',
      }} />
    </button>
  )
}

function MultiSelect({ items, values, onChange, placeholder }) {
  const selected = values || []
  const summary = selected.length ? `${selected.length} selected` : placeholder
  const toggle = (item) => {
    onChange(selected.includes(item) ? selected.filter(value => value !== item) : [...selected, item])
  }
  return (
    <details style={{ position: 'relative' }}>
      <summary style={{
        listStyle: 'none',
        cursor: 'pointer',
        padding: '12px 14px',
        borderRadius: 14,
        background: 'rgba(7,22,40,0.92)',
        border: '1px solid rgba(200,153,26,0.2)',
        color: '#C0C8D8',
        fontSize: 13,
        fontWeight: 650,
      }}>{summary}</summary>
      <div style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        zIndex: 30,
        minWidth: 260,
        maxHeight: 280,
        overflowY: 'auto',
        padding: 10,
        borderRadius: 16,
        background: 'rgba(11,44,77,0.98)',
        border: '1px solid rgba(200,153,26,0.24)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.4)',
      }}>
        {items.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => toggle(item)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 12,
              padding: '9px 10px',
              marginBottom: 6,
              background: selected.includes(item) ? 'rgba(200,153,26,0.14)' : 'rgba(255,255,255,0.03)',
              color: selected.includes(item) ? '#fff' : C.silver,
              textAlign: 'left',
              fontWeight: 650,
            }}
          >
            <span>{item}</span>
            <span>{selected.includes(item) ? 'Yes' : ''}</span>
          </button>
        ))}
      </div>
    </details>
  )
}

export default function FeeSettings() {
  const { classNames: CLASSES } = useAcademicStore()
  const [classSettings, setClassSettings] = useState([])
  const [discountPackages, setDiscountPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const availableClasses = useMemo(() => {
    const merged = [...new Set([...(CLASSES || []), ...Object.keys(FALLBACK_FEES)])]
    return merged.filter(Boolean)
  }, [CLASSES])

  useEffect(() => {
    let alive = true
    setLoading(true)
    api.get('/api/fees/settings')
      .then((res) => {
        if (!alive) return
        const data = res.data?.data || {}
        const remoteClasses = data.classSettings || []
        const merged = availableClasses.map((className) => {
          const found = remoteClasses.find(item => item.class_name === className)
          return found || {
            class_name: className,
            session: '2026-2027',
            monthly_fee: FALLBACK_FEES[className] || 2500,
            active: true,
          }
        })
        setClassSettings(merged)
        setDiscountPackages((data.discountPackages?.length ? data.discountPackages : [emptyPackage]).map(pkg => ({
          ...emptyPackage,
          ...pkg,
          applicable_classes: Array.isArray(pkg.applicable_classes) ? pkg.applicable_classes : [],
          applicable_sessions: Array.isArray(pkg.applicable_sessions) ? pkg.applicable_sessions : ['2026-2027'],
          start_date: pkg.start_date || '',
          end_date: pkg.end_date || '',
        })))
      })
      .catch(() => {
        if (!alive) return
        setError('Fee settings could not be loaded from server.')
        setClassSettings(availableClasses.map(className => ({
          class_name: className,
          session: '2026-2027',
          monthly_fee: FALLBACK_FEES[className] || 2500,
          active: true,
        })))
        setDiscountPackages([emptyPackage])
      })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [availableClasses])

  const updateClass = (index, patch) => {
    setClassSettings(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item))
  }

  const updatePackage = (index, patch) => {
    setDiscountPackages(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item))
  }

  const addPackage = () => {
    setDiscountPackages(prev => [...prev, { ...emptyPackage, name: `New Discount Package ${prev.length + 1}`, active: false }])
  }

  const save = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.put('/api/fees/settings', { classSettings, discountPackages })
      setMessage('Fee settings saved. Defaults and discount packages are now active for challan generation.')
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      setError(err.response?.data?.message || 'Fee settings could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 22 }}>
        <div className="super-module-card" style={{ ...card, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, borderRadius: 22, background: 'rgba(11,44,77,0.9)' }}>
          <div>
            <h1 style={sectionHeader}>Fee Settings</h1>
            <p style={{ color: C.muted, marginTop: 8 }}>Database-backed class fee defaults, challan rules, and automatic family discounts.</p>
          </div>
          <button onClick={save} style={btnPrimary} disabled={saving || loading}>{saving ? 'Saving...' : 'Save Fee Settings'}</button>
        </div>

        {error && <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,55,95,0.12)', border: '1px solid rgba(255,55,95,0.22)', color: C.red, fontWeight: 700 }}>{error}</div>}
        {message && <div style={{ padding: 14, borderRadius: 14, background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.22)', color: C.green, fontWeight: 700 }}>{message}</div>}

        <div className="super-module-card" style={{ ...card, display: 'grid', gap: 18, borderRadius: 22, background: 'rgba(11,44,77,0.9)' }}>
          <div>
            <h2 style={{ margin: 0, color: C.gold, fontSize: 20 }}>Class Monthly Fee Structure</h2>
            <p style={{ color: C.muted, margin: '8px 0 0' }}>These values feed future automatic challan generation unless an admin manually overrides a student voucher.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {classSettings.map((item, index) => (
              <div key={`${item.class_name}-${item.session}`} style={{ padding: 16, borderRadius: 18, background: 'rgba(7,30,52,0.46)', border: '1px solid rgba(148,163,184,0.12)', display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800 }}>{item.class_name}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{item.session || '2026-2027'}</div>
                  </div>
                  <Toggle checked={item.active !== false} onChange={(checked) => updateClass(index, { active: checked })} />
                </div>
                <div>
                  <label style={labelStyle}>Monthly Fee</label>
                  <input
                    style={input}
                    type="number"
                    value={item.monthly_fee || 0}
                    onChange={(event) => updateClass(index, { monthly_fee: Number(event.target.value) })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="super-module-card" style={{ ...card, display: 'grid', gap: 18, borderRadius: 22, background: 'rgba(11,44,77,0.9)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, color: C.gold, fontSize: 20 }}>Discount Packages</h2>
              <p style={{ color: C.muted, margin: '8px 0 0' }}>Create reusable, auto-applied sibling/family discount rules. Triple Star is active by default.</p>
            </div>
            <button type="button" style={btnSecondary} onClick={addPackage}>Add Package</button>
          </div>

          {discountPackages.map((pkg, index) => (
            <div key={`${pkg.name}-${index}`} style={{ padding: 18, borderRadius: 20, background: 'rgba(7,30,52,0.46)', border: '1px solid rgba(148,163,184,0.12)', display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ color: '#fff', fontWeight: 850, fontSize: 16 }}>{pkg.name || 'Discount Package'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ color: C.muted, fontSize: 12, fontWeight: 800 }}>Active</span>
                  <Toggle checked={pkg.active !== false} onChange={(checked) => updatePackage(index, { active: checked })} />
                  <span style={{ color: C.muted, fontSize: 12, fontWeight: 800 }}>Auto Apply</span>
                  <Toggle checked={pkg.auto_apply !== false} onChange={(checked) => updatePackage(index, { auto_apply: checked })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Package Name</label>
                  <input style={input} value={pkg.name || ''} onChange={e => updatePackage(index, { name: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Discount Type</label>
                  <select style={select} value={pkg.discount_type || 'percentage'} onChange={e => updatePackage(index, { discount_type: e.target.value })}>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Discount Value</label>
                  <input style={input} type="number" value={pkg.discount_value || 0} onChange={e => updatePackage(index, { discount_value: Number(e.target.value) })} />
                </div>
                <div>
                  <label style={labelStyle}>Minimum Sibling Count</label>
                  <input style={input} type="number" value={pkg.min_sibling_count || 1} onChange={e => updatePackage(index, { min_sibling_count: Number(e.target.value) })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Applicable Classes</label>
                  <MultiSelect
                    items={availableClasses}
                    values={pkg.applicable_classes || []}
                    onChange={(values) => updatePackage(index, { applicable_classes: values })}
                    placeholder="All classes"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Applicable Sessions</label>
                  <input
                    style={input}
                    value={(pkg.applicable_sessions || []).join(', ')}
                    onChange={e => updatePackage(index, { applicable_sessions: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
                    placeholder="2026-2027"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input style={input} type="date" value={pkg.start_date || ''} onChange={e => updatePackage(index, { start_date: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input style={input} type="date" value={pkg.end_date || ''} onChange={e => updatePackage(index, { end_date: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...input, minHeight: 84, resize: 'vertical' }}
                  value={pkg.description || ''}
                  onChange={e => updatePackage(index, { description: e.target.value })}
                />
              </div>
            </div>
          ))}

          <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
            Auto detection checks family code, linked parent account, father CNIC, and guardian phone. Discounts are attached once per challan through the discount applications ledger.
          </div>
        </div>
      </div>
    </div>
  )
}

import { C, btnPrimary, btnSecondary } from '../moduleStyles'
import { printChallan } from './ViewChallans'

export default function SmartExistingChallanPanel({
  challan,
  school,
  onView,
  onEdit,
  onRegenerate,
  onDismiss,
}) {
  if (!challan) return null

  const status = (challan.status || 'unpaid').toLowerCase()

  return (
    <div style={{
      padding: 16,
      borderRadius: 12,
      border: '1px solid rgba(200,153,26,0.35)',
      background: 'rgba(200,153,26,0.08)',
      display: 'grid',
      gap: 12,
    }}
    >
      <div>
        <div style={{ color: C.gold, fontWeight: 800, fontSize: 15 }}>Current challan found</div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
          {challan.month} {challan.year} · {challan.challan_no || '—'} · Rs. {Number(challan.amount || 0).toLocaleString()} ·{' '}
          <span style={{ color: status === 'paid' ? C.green : status === 'partial' ? C.gold : C.red, fontWeight: 700 }}>
            {status}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" style={btnSecondary} onClick={() => onView?.(challan) || printChallan(challan, school)}>View challan</button>
        <button type="button" style={btnSecondary} onClick={() => printChallan(challan, school)}>Print voucher</button>
        <button type="button" style={btnSecondary} onClick={() => onEdit?.(challan)}>Edit challan</button>
        <button type="button" style={btnPrimary} onClick={() => onRegenerate?.(challan)}>Regenerate</button>
        {onDismiss && (
          <button type="button" style={{ ...btnSecondary, opacity: 0.85 }} onClick={onDismiss}>Create different month</button>
        )}
      </div>
    </div>
  )
}

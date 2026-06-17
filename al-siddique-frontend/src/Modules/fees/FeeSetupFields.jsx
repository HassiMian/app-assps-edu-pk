import { C, input, labelStyle } from '../moduleStyles'
import { FEE_HEADS, defaultFeeAmounts } from './feeConstants'

const inp = { width: '100%', padding: '10px 14px', borderRadius: 10, boxSizing: 'border-box', background: 'rgba(7,22,40,0.92)', border: '1px solid rgba(200,153,26,0.2)', color: '#C0C8D8', fontSize: 14, outline: 'none' }
const lbl = { color: '#8892A4', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }

export default function FeeSetupFields({
  amounts,
  setAmounts,
  selectedHeads,
  setSelectedHeads,
  discount = 0,
  setDiscount,
  compact = false,
  title = 'Fee setup',
}) {
  const heads = compact ? FEE_HEADS : FEE_HEADS

  return (
    <div style={{ display: 'grid', gap: 14, padding: compact ? 0 : '4px 0' }}>
      <div style={{ color: '#C8991A', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {heads.map((head) => (
          <div key={head}>
            <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={selectedHeads?.[head] !== false}
                onChange={() => setSelectedHeads?.((prev) => ({ ...prev, [head]: !prev[head] }))}
              />
              {head}
            </label>
            <input
              type="number"
              style={{ ...inp, opacity: selectedHeads?.[head] === false ? 0.45 : 1 }}
              disabled={selectedHeads?.[head] === false}
              value={amounts[head] ?? 0}
              onChange={(e) => setAmounts((prev) => ({ ...prev, [head]: Number(e.target.value) }))}
            />
          </div>
        ))}
      </div>
      {setDiscount && (
        <div>
          <label style={lbl}>Discount (Rs.)</label>
          <input type="number" style={inp} value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
        </div>
      )}
    </div>
  )
}

export function initFeeSetup(monthlyFee = 2500) {
  return {
    amounts: defaultFeeAmounts(monthlyFee),
    selectedHeads: FEE_HEADS.reduce((a, h) => ({ ...a, [h]: h === 'Monthly Fee' || h === 'Admission Fee' }), {}),
    discount: 0,
  }
}

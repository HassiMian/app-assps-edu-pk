// CountingWritingGrid.jsx — Grid of cells for counting practice (1 to 30, 1 to 50, etc.)
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function CountingWritingGrid({
  countTo = 30,
  gridColumns = 6,
  gridRows = null,
  showGuideNumbers = false
}) {
  const totalCells = countTo || (gridColumns * (gridRows || 5))
  // Dense counting tasks (e.g. 1–50) should remain child-writable without
  // wasting an entire extra A4 side. Ten columns still leave ~17–18mm per
  // cell on A4, which is comfortable for two-digit answers.
  const resolvedColumns = countTo >= 40 ? 10 : gridColumns
  const resolvedCellHeightMm = countTo >= 40 ? 11 : LAYOUT_TOKENS.childResponse.boxGridCellSizeMm
  const resolvedGap = countTo >= 40 ? '4px' : '6px'

  return (
    <div
      className="early-years-counting-grid"
      data-testid="counting-writing-grid"
      data-count-to={countTo}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${resolvedColumns}, minmax(0, 1fr))`,
        gap: resolvedGap,
        margin: countTo >= 40 ? '7px 0' : '12px 0'
      }}
    >
      {Array.from({ length: totalCells }).map((_, idx) => (
        <div
          key={`counting-cell-${idx}`}
          className="counting-cell"
          data-cell-idx={idx}
          style={{
            height: resolvedCellHeightMm + 'mm',
            minHeight: countTo >= 40 ? '34px' : '38px',
            border: '1.5px solid #222',
            borderRadius: '6px',
            background: '#fff',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            padding: '2px 4px'
          }}
        >
          {/* Default: BLANK response cell. Guide number only rendered if explicitly requested */}
          {showGuideNumbers && (
            <span className="guide-number" style={{ fontSize: '9px', color: '#bbb' }}>{idx + 1}</span>
          )}
        </div>
      ))}
    </div>
  )
}

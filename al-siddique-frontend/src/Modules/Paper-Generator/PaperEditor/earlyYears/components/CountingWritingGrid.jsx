// CountingWritingGrid.jsx — Grid of cells for counting practice (1 to 30, 1 to 50, etc.)
import React from 'react'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function CountingWritingGrid({
  countTo = 30,
  gridColumns = 6,
  gridRows = null
}) {
  const totalCells = countTo || (gridColumns * (gridRows || 5))

  return (
    <div
      className="early-years-counting-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
        gap: '6px',
        margin: '12px 0'
      }}
    >
      {Array.from({ length: totalCells }).map((_, idx) => (
        <div
          key={`counting-cell-${idx}`}
          style={{
            height: LAYOUT_TOKENS.childResponse.boxGridCellSizeMm + 'mm',
            minHeight: '38px',
            border: '1.5px solid #222',
            borderRadius: '6px',
            background: '#fff',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            padding: '2px 4px'
          }}
        >
          {/* Subtle index helper in light grey */}
          <span style={{ fontSize: '9px', color: '#bbb' }}>{idx + 1}</span>
        </div>
      ))}
    </div>
  )
}

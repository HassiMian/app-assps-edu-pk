// NumberCopyPractice.jsx — Top reference row with spacious blank cells below for number copy practice
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function NumberCopyPractice({
  referenceRow = [1, 2, 3, 4, 5],
  rows = 2
}) {
  return (
    <div
      className="early-years-number-copy-practice"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        margin: '14px 0',
        padding: '12px',
        border: '1.5px solid #333',
        borderRadius: '10px',
        background: '#fff'
      }}
    >
      {/* Top Model/Reference Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${referenceRow.length}, minmax(0, 1fr))`,
          gap: '10px',
          borderBottom: '2px solid #000',
          paddingBottom: '10px'
        }}
      >
        {referenceRow.map((num, idx) => (
          <div
            key={`ref-${idx}`}
            style={{
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary,
              fontSize: TYPOGRAPHY_TOKENS.fontSizes.numberGridText,
              fontWeight: 'bold',
              color: '#000',
              background: '#f4f4f5',
              borderRadius: '6px'
            }}
          >
            {num}
          </div>
        ))}
      </div>

      {/* Practice Rows with empty cells */}
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div
          key={`copy-row-${rIdx}`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${referenceRow.length}, minmax(0, 1fr))`,
            gap: '10px'
          }}
        >
          {referenceRow.map((_, cIdx) => (
            <div
              key={`blank-${rIdx}-${cIdx}`}
              style={{
                height: LAYOUT_TOKENS.childResponse.boxGridCellSizeMm + 'mm',
                minHeight: '44px',
                border: '1.5px dashed #444',
                borderRadius: '6px',
                background: '#fff'
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

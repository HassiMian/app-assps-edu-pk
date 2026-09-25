// MissingNumberGrid.jsx — Grid of numbers with empty cells for child number completion
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function MissingNumberGrid({
  grid = []
}) {
  return (
    <div
      className="early-years-missing-number-grid"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        margin: '14px 0',
        justifyContent: 'flex-start'
      }}
    >
      {grid.map((num, idx) => {
        const isBlank = num === null || num === undefined || num === ''

        return (
          <div
            key={`num-cell-${idx}`}
            style={{
              width: LAYOUT_TOKENS.childResponse.boxGridCellSizeMm + 'mm',
              height: LAYOUT_TOKENS.childResponse.boxGridCellSizeMm + 'mm',
              minWidth: '44px',
              minHeight: '44px',
              border: isBlank ? '2px dashed #444' : '2px solid #000',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isBlank ? '#fff' : '#f5f5f5',
              fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary,
              fontSize: TYPOGRAPHY_TOKENS.fontSizes.numberGridText,
              fontWeight: 'bold',
              color: isBlank ? 'transparent' : '#000',
              userSelect: 'none'
            }}
          >
            {isBlank ? ' ' : num}
          </div>
        )
      })}
    </div>
  )
}

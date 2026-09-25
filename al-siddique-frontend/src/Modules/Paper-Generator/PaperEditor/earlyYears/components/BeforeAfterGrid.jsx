// BeforeAfterGrid.jsx — Before/After child response boxes
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function BeforeAfterGrid({
  items = [],
  mode = 'before' // 'before' | 'after'
}) {
  return (
    <div
      className="early-years-before-after-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: '16px',
        margin: '14px 0'
      }}
    >
      {items.map((item, idx) => {
        const val = item.target || item.before || item.after

        return (
          <div
            key={`ba-${mode}-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              background: '#fafafa'
            }}
          >
            {/* Blank box first if 'before' */}
            {mode === 'before' && (
              <div
                style={{
                  width: LAYOUT_TOKENS.childResponse.boxGridCellSizeMm + 'mm',
                  height: LAYOUT_TOKENS.childResponse.boxGridCellSizeMm + 'mm',
                  minWidth: '40px',
                  minHeight: '40px',
                  border: '2px dashed #000',
                  borderRadius: '6px',
                  background: '#fff'
                }}
              />
            )}

            {/* Target numeral */}
            <span
              style={{
                fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary,
                fontSize: TYPOGRAPHY_TOKENS.fontSizes.numberGridText,
                fontWeight: 'bold',
                minWidth: '24px',
                textAlign: 'center'
              }}
            >
              {val}
            </span>

            {/* Blank box after if 'after' */}
            {mode === 'after' && (
              <div
                style={{
                  width: LAYOUT_TOKENS.childResponse.boxGridCellSizeMm + 'mm',
                  height: LAYOUT_TOKENS.childResponse.boxGridCellSizeMm + 'mm',
                  minWidth: '40px',
                  minHeight: '40px',
                  border: '2px dashed #000',
                  borderRadius: '6px',
                  background: '#fff'
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// BeforeAfterGrid.jsx — Before/After child response boxes
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function BeforeAfterGrid({
  items = [],
  mode = 'before' // 'before' | 'after' | 'after-sequence'
}) {
  // Mode C: after-sequence (Flyer Math Q5)
  if (mode === 'after-sequence') {
    return (
      <div
        className="early-years-before-after-grid after-sequence-mode"
        data-testid="after-sequence-grid"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          margin: '14px 0',
          alignItems: 'flex-start'
        }}
      >
        {items.map((item, idx) => {
          const sequence = item.sequence || []
          return (
            <div
              key={`after-seq-${idx}`}
              className="after-sequence-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '6px 14px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: '#fafafa'
              }}
            >
              <span
                className="after-sequence-text"
                style={{
                  fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary,
                  fontSize: TYPOGRAPHY_TOKENS.fontSizes.numberGridText,
                  fontWeight: 'bold',
                  letterSpacing: '2px',
                  color: '#000'
                }}
              >
                {sequence.join(', ')},
              </span>

              <div
                className="after-sequence-blank"
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
            </div>
          )
        })}
      </div>
    )
  }

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

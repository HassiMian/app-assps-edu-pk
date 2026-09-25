// HandwritingLines.jsx — Reusable child handwriting guides (English 4-line or Urdu baseline)
import React from 'react'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function HandwritingLines({
  lineCount = 3,
  lineGapMm = LAYOUT_TOKENS.childResponse.handwritingRowSpacingMm,
  styleMode = 'four-line', // 'four-line' | 'single-baseline'
  width = '100%',
  isUrdu = false
}) {
  return (
    <div
      className="early-years-handwriting-lines"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${lineGapMm}mm`,
        margin: '12px 0',
        width,
        direction: isUrdu ? 'rtl' : 'ltr'
      }}
    >
      {Array.from({ length: lineCount }).map((_, idx) => {
        if (styleMode === 'four-line' && !isUrdu) {
          // Classic 4-line English guideline: Top, Mid (dashed), Base, Descent
          return (
            <div
              key={`hw-lane-${idx}`}
              style={{
                height: `${lineGapMm}mm`,
                borderTop: '1px solid #e11d48',    // Top red line
                borderBottom: '1px solid #e11d48', // Bottom red line
                position: 'relative',
                background: '#fff',
                marginBottom: '4px'
              }}
            >
              {/* Mid waist line (dashed blue) */}
              <div
                style={{
                  position: 'absolute',
                  top: '35%',
                  left: 0,
                  right: 0,
                  borderBottom: '1px dashed #2563eb'
                }}
              />
              {/* Base line (solid blue) */}
              <div
                style={{
                  position: 'absolute',
                  top: '70%',
                  left: 0,
                  right: 0,
                  borderBottom: '1.2px solid #2563eb'
                }}
              />
            </div>
          )
        }

        // Single spacious baseline for Urdu or general writing
        return (
          <div
            key={`hw-lane-${idx}`}
            style={{
              height: `${lineGapMm}mm`,
              borderBottom: '1.5px solid #222',
              position: 'relative'
            }}
          />
        )
      })}
    </div>
  )
}

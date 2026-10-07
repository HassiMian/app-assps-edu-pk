// UrduHandwritingResponse.jsx — RTL Urdu handwriting answer lines with optional numbering
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function UrduHandwritingResponse({
  lineCount = 3,
  lineGapMm = null,
  placeholders = null
}) {
  const count = lineCount || (placeholders ? placeholders.length : 3)
  const effectiveGapMm = lineGapMm !== null && lineGapMm !== undefined ? lineGapMm : LAYOUT_TOKENS.childResponse.handwritingRowSpacingMm

  return (
    <div
      className="early-years-urdu-handwriting-response"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${effectiveGapMm}mm`,
        margin: '14px 0',
        direction: 'rtl'
      }}
    >
      {Array.from({ length: count }).map((_, idx) => {
        const numLabel = placeholders && placeholders[idx] ? placeholders[idx] : null

        return (
          <div
            key={`urdu-hw-line-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '12px'
            }}
          >
            {numLabel && (
              <span
                style={{
                  fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary,
                  fontSize: TYPOGRAPHY_TOKENS.fontSizes.urduQuestionHeading,
                  fontWeight: 'bold',
                  minWidth: '24px',
                  color: '#222'
                }}
              >
                {numLabel}
              </span>
            )}

            {/* Generous baseline answer line */}
            <div
              style={{
                flex: 1,
                borderBottom: '1.8px solid #222',
                minHeight: `${effectiveGapMm}mm`
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

// CircleChoiceGrid.jsx — Spacious grid of letters for circle target letter exercises (e.g. Starter Urdu Q3)
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function CircleChoiceGrid({
  letterGrid = [],
  isUrdu = true
}) {
  return (
    <div
      className="early-years-circle-choice-grid"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        margin: '14px 0',
        direction: isUrdu ? 'rtl' : 'ltr',
        alignItems: 'center'
      }}
    >
      {letterGrid.map((row, rIdx) => (
        <div
          key={`grid-row-${rIdx}`}
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center'
          }}
        >
          {row.map((letter, cIdx) => (
            <div
              key={`cell-${rIdx}-${cIdx}`}
              style={{
                width: LAYOUT_TOKENS.childResponse.visualChoiceHitAreaMm + 'mm',
                height: LAYOUT_TOKENS.childResponse.visualChoiceHitAreaMm + 'mm',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '50%',
                border: '1.5px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff',
                fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary,
                fontSize: TYPOGRAPHY_TOKENS.fontSizes.urduQuestionHeading,
                fontWeight: 'bold',
                color: '#000',
                userSelect: 'none'
              }}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

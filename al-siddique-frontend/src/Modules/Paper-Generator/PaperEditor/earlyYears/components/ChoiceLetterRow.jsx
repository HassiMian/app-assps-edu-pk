// ChoiceLetterRow.jsx — Choice letter rows with prompt on left and spacious circular choice targets on right
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function ChoiceLetterRow({
  rows = [],
  isUrdu = false
}) {
  const fontFamily = isUrdu
    ? TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary
    : TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary

  return (
    <div
      className="early-years-choice-letter-rows"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        margin: '12px 0',
        direction: isUrdu ? 'rtl' : 'ltr'
      }}
    >
      {rows.map((row, idx) => {
        const promptLabel = row.prompt || row.capital || `${idx + 1}.`

        return (
          <div
            key={`choice-row-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              background: '#fafafa',
              justifyContent: 'space-between'
            }}
          >
            {/* Prompt */}
            <div
              style={{
                fontFamily,
                fontSize: TYPOGRAPHY_TOKENS.fontSizes.englishQuestionHeading,
                fontWeight: 'bold',
                minWidth: '50px',
                color: '#111'
              }}
            >
              {promptLabel}
            </div>

            {/* Arrow separator if single letter prompt */}
            <div style={{ color: '#888', margin: '0 12px', fontSize: '16px' }}>➔</div>

            {/* Circular Choices */}
            <div
              style={{
                display: 'flex',
                gap: '18px',
                flex: 1,
                justifyContent: 'space-around'
              }}
            >
              {row.choices.map((choice, cIdx) => (
                <div
                  key={`ch-${idx}-${cIdx}`}
                  style={{
                    width: LAYOUT_TOKENS.childResponse.visualChoiceHitAreaMm + 'mm',
                    height: LAYOUT_TOKENS.childResponse.visualChoiceHitAreaMm + 'mm',
                    minWidth: '40px',
                    minHeight: '40px',
                    borderRadius: '50%',
                    border: '1.5px solid #222',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fff',
                    fontFamily,
                    fontSize: TYPOGRAPHY_TOKENS.fontSizes.englishChildText,
                    fontWeight: 'bold',
                    color: '#000',
                    padding: '2px 8px'
                  }}
                >
                  {choice}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

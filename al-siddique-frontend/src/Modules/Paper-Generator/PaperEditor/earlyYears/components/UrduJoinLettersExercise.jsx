// UrduJoinLettersExercise.jsx — Split letters with plus signs and large writing lines for Urdu word formation
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function UrduJoinLettersExercise({
  expressions = []
}) {
  return (
    <div
      className="early-years-urdu-join-letters"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        margin: '14px 0',
        direction: 'rtl'
      }}
    >
      {expressions.map((item, idx) => {
        const partsText = item.parts ? item.parts.join(' + ') : item.raw

        return (
          <div
            key={`join-expr-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              borderBottom: '1px dotted #ccc'
            }}
          >
            {/* Number index */}
            <span
              style={{
                fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary,
                fontSize: TYPOGRAPHY_TOKENS.fontSizes.urduQuestionHeading,
                fontWeight: 'bold',
                minWidth: '24px'
              }}
            >
              {idx + 1}.
            </span>

            {/* Split letters prompt: e.g. ا + ن + ا + ر */}
            <div
              style={{
                fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary,
                fontSize: TYPOGRAPHY_TOKENS.fontSizes.urduChildText,
                letterSpacing: '4px',
                padding: '0 12px',
                color: '#111'
              }}
            >
              {partsText}
            </div>

            {/* Equals sign */}
            <span style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 8px' }}>=</span>

            {/* Large child response line */}
            <div
              style={{
                flex: 1,
                maxWidth: LAYOUT_TOKENS.childResponse.largeAnswerLineWidthMm + 'mm',
                borderBottom: '2px solid #000',
                height: '32px'
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

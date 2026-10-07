// MissingUrduLetterGrid.jsx — RTL Urdu missing letter grid with Nastaleeq typography
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'
import SourceFaithfulPracticeLayout from './SourceFaithfulPracticeLayout.jsx'

export default function MissingUrduLetterGrid({
  sequence = null,
  sequences = null,
  rawSourceLayout = null,
  layoutAmbiguous = false
}) {
  const allSequences = sequences || (sequence ? [sequence] : [])

  // Mode 0: Raw source layout fallback for ambiguous teacher formats
  if ((layoutAmbiguous && rawSourceLayout) || (rawSourceLayout && allSequences.length === 0)) {
    return (
      <SourceFaithfulPracticeLayout
        rawText={rawSourceLayout}
        isUrdu={true}
        preserveWhitespace={true}
        fontSize={TYPOGRAPHY_TOKENS.fontSizes.urduChildText}
        minRowHeight="48px"
      />
    )
  }

  return (
    <div
      className="early-years-missing-urdu-letter-grid"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        margin: '14px 0',
        direction: 'rtl'
      }}
    >
      {allSequences.map((seq, rowIdx) => (
        <div
          key={`urdu-row-${rowIdx}`}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }}
        >
          {seq.map((letter, idx) => {
            const isBlank = letter === null || letter === '_' || letter === ''

            return (
              <div
                key={`urdu-box-${rowIdx}-${idx}`}
                style={{
                  width: LAYOUT_TOKENS.childResponse.boxGridCellSizeMm + 'mm',
                  height: LAYOUT_TOKENS.childResponse.boxGridCellSizeMm + 'mm',
                  minWidth: '48px',
                  minHeight: '48px',
                  border: isBlank ? '2px dashed #444' : '2px solid #000',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isBlank ? '#fff' : '#f8f8f8',
                  fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary,
                  fontSize: TYPOGRAPHY_TOKENS.fontSizes.urduChildText,
                  fontWeight: 'bold',
                  color: isBlank ? 'transparent' : '#000',
                  userSelect: 'none'
                }}
              >
                {isBlank ? ' ' : letter}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

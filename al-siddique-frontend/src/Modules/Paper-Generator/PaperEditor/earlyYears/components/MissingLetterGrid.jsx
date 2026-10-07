import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'
import SourceFaithfulPracticeLayout from './SourceFaithfulPracticeLayout.jsx'

export default function MissingLetterGrid({
  sequence = [],
  items = [],
  isUrdu = false,
  rawSourceLayout = null,
  layoutAmbiguous = false
}) {
  const fontFamily = isUrdu
    ? TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary
    : TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary

  // Mode 0: Raw source layout fallback for ambiguous teacher formats
  if ((layoutAmbiguous && rawSourceLayout) || (rawSourceLayout && (!items || items.length === 0) && (!sequence || sequence.length === 0))) {
    return (
      <SourceFaithfulPracticeLayout
        rawText={rawSourceLayout}
        isUrdu={isUrdu}
        preserveWhitespace={true}
        fontSize={isUrdu ? TYPOGRAPHY_TOKENS.fontSizes.urduChildText : TYPOGRAPHY_TOKENS.fontSizes.englishChildText}
        minRowHeight="48px"
      />
    )
  }

  // Mode A: items with blank underscores like "Ball _", "C _ t"
  if (items && items.length > 0) {

    return (
      <div
        className="early-years-missing-letter-items"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '14px',
          margin: '12px 0',
          direction: isUrdu ? 'rtl' : 'ltr'
        }}
      >
        {items.map((item, idx) => (
          <div
            key={`missing-item-${idx}`}
            style={{
              border: '1.5px solid #333',
              borderRadius: '8px',
              padding: '10px 14px',
              textAlign: 'center',
              background: '#fff',
              fontFamily,
              fontSize: TYPOGRAPHY_TOKENS.fontSizes.englishChildText,
              fontWeight: 'bold',
              letterSpacing: '2px',
              color: '#000'
            }}
          >
            {item}
          </div>
        ))}
      </div>
    )
  }

  // Mode B: sequence array with null for blanks (e.g. ['A', null, 'C', null, ...])
  return (
    <div
      className="early-years-missing-letter-grid"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        margin: '14px 0',
        direction: isUrdu ? 'rtl' : 'ltr',
        justifyContent: 'flex-start'
      }}
    >
      {sequence.map((letter, idx) => {
        const isBlank = letter === null || letter === '_' || letter === ''

        return (
          <div
            key={`box-${idx}`}
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
              background: isBlank ? '#fefefe' : '#f4f4f5',
              fontFamily,
              fontSize: isUrdu
                ? TYPOGRAPHY_TOKENS.fontSizes.urduChildText
                : TYPOGRAPHY_TOKENS.fontSizes.englishChildText,
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
  )
}

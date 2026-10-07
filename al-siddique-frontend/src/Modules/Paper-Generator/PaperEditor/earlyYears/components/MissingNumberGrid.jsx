// MissingNumberGrid.jsx — Grid of numbers with empty cells for child number completion
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'
import SourceFaithfulPracticeLayout from './SourceFaithfulPracticeLayout.jsx'

export default function MissingNumberGrid({
  grid = [],
  rows = null,
  rawSourceSequence = null,
  layoutAmbiguous = false
}) {
  // Mode 0: Raw source sequence fallback for ambiguous teacher formats
  if ((layoutAmbiguous && rawSourceSequence) || (rawSourceSequence && (!rows || rows.length === 0) && (!grid || grid.length === 0))) {
    return (
      <SourceFaithfulPracticeLayout
        rawText={rawSourceSequence}
        isUrdu={false}
        preserveWhitespace={true}
        fontSize={TYPOGRAPHY_TOKENS.fontSizes.englishChildText}
        minRowHeight="48px"
      />
    )
  }

  // Mode A: Explicit 2D rows (e.g. 5 rows × 4 cells in Mover Math Q1)
  if (rows && Array.isArray(rows) && rows.length > 0) {
    return (
      <div
        className="early-years-missing-number-grid early-years-missing-number-rows"
        data-testid="missing-number-rows"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          margin: '14px 0',
          alignItems: 'flex-start'
        }}
      >
        {rows.map((row, rIdx) => (
          <div
            key={`num-row-${rIdx}`}
            className="missing-number-row"
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}
          >
            {row.map((num, cIdx) => {
              const isBlank = num === null || num === undefined || num === '' || num === '_'

              return (
                <div
                  key={`num-cell-${rIdx}-${cIdx}`}
                  className={isBlank ? 'num-cell blank-cell' : 'num-cell given-cell'}
                  data-row={rIdx}
                  data-col={cIdx}
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
        ))}
      </div>
    )
  }

  // Mode B: Flat sequence grid
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

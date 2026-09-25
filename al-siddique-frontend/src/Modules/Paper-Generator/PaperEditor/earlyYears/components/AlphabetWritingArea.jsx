// AlphabetWritingArea.jsx — Multi-row structured alphabet writing practice area
import React from 'react'
import HandwritingLines from './HandwritingLines.jsx'

export default function AlphabetWritingArea({
  lines = 4,
  lineCount = null,
  isUrdu = false
}) {
  const count = lineCount || lines || 4

  return (
    <div
      className="early-years-alphabet-writing-area"
      style={{
        margin: '12px 0',
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        background: '#fff'
      }}
    >
      <HandwritingLines
        lineCount={count}
        styleMode={isUrdu ? 'single-baseline' : 'four-line'}
        isUrdu={isUrdu}
      />
    </div>
  )
}

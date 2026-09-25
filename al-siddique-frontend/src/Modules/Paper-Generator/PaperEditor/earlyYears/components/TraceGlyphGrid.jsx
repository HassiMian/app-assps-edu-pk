// TraceGlyphGrid.jsx — Trace glyph grid with dotted/light glyphs and optional practice lane
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function TraceGlyphGrid({
  glyphs = [],
  gridColumns = 5,
  practiceLane = true,
  isUrdu = false
}) {
  const fontFamily = isUrdu
    ? TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary
    : TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary

  return (
    <div
      className="early-years-trace-glyph-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
        gap: '12px',
        margin: '10px 0',
        direction: isUrdu ? 'rtl' : 'ltr'
      }}
    >
      {glyphs.map((glyph, idx) => (
        <div
          key={`trace-box-${idx}`}
          style={{
            border: '1.5px solid #222',
            borderRadius: '8px',
            padding: '8px 4px',
            textAlign: 'center',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '75px'
          }}
        >
          {/* Tracing letter */}
          <div
            style={{
              fontFamily,
              fontSize: TYPOGRAPHY_TOKENS.fontSizes.traceGlyph,
              lineHeight: 1.1,
              color: '#555',
              borderBottom: practiceLane ? '1px dashed #bbb' : 'none',
              width: '100%',
              paddingBottom: '4px',
              userSelect: 'none',
              letterSpacing: '2px',
              // Dotted font appearance via stroke or dash
              textDecoration: 'none'
            }}
          >
            {glyph}
          </div>

          {/* Child practice space lane */}
          {practiceLane && (
            <div
              style={{
                width: '100%',
                height: LAYOUT_TOKENS.childResponse.handwritingRowSpacingMm + 'mm',
                borderBottom: '1px solid #333',
                marginTop: '4px'
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

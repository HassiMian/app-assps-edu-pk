// SourceFaithfulPracticeLayout.jsx — Raw ambiguous teacher layout fallback renderer
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'

export default function SourceFaithfulPracticeLayout({
  rawText = '',
  isUrdu = false,
  preserveWhitespace = true,
  fontSize = null,
  minRowHeight = '48px',
  style = {}
}) {
  const fontFamily = isUrdu
    ? TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary
    : TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary

  const resolvedFontSize = fontSize || (
    isUrdu
      ? TYPOGRAPHY_TOKENS.fontSizes.urduChildText
      : TYPOGRAPHY_TOKENS.fontSizes.englishChildText
  )

  return (
    <div
      className="early-years-source-faithful-practice-layout"
      data-testid="source-faithful-practice-layout"
      style={{
        direction: isUrdu ? 'rtl' : 'ltr',
        fontFamily,
        margin: '14px 0',
        padding: '16px 20px',
        border: '1.5px solid #333',
        borderRadius: '8px',
        background: '#ffffff',
        ...style
      }}
    >
      <div
        className="practice-layout-body"
        style={{
          whiteSpace: preserveWhitespace ? 'pre-wrap' : 'normal',
          fontFamily,
          fontSize: resolvedFontSize,
          fontWeight: 'bold',
          lineHeight: isUrdu ? 2.4 : 2.2,
          letterSpacing: isUrdu ? '0.15em' : '0.3em',
          wordSpacing: '0.4em',
          color: '#000',
          minHeight: minRowHeight
        }}
      >
        {rawText}
      </div>
    </div>
  )
}

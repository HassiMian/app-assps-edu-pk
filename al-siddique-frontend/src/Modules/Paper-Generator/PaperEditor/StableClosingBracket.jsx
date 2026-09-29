import React from 'react'

export default function StableClosingBracket({ color = 'currentColor', style = {} }) {
  return (
    <span
      data-option-bracket
      dir="ltr"
      aria-hidden="true"
      style={{
        direction: 'ltr',
        unicodeBidi: 'isolate-override',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 800,
        fontSize: '1.2em',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '0.38em',
        minWidth: '0.38em',
        height: '1.02em',
        verticalAlign: 'baseline',
        color,
        flex: '0 0 auto',
        transform: 'translateY(0.03em)',
        ...style,
      }}
    >
      <span
        data-option-bracket-glyph
        dir="ltr"
        style={{
          direction: 'ltr',
          unicodeBidi: 'isolate-override',
          display: 'block',
          lineHeight: 1,
          transform: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        )
      </span>
    </span>
  )
}

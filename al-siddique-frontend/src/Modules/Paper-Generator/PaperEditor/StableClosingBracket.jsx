import React from 'react'

export default function StableClosingBracket({ color = 'currentColor', style = {} }) {
  return (
    <span
      data-option-bracket
      data-urdu-closing-bracket="true"
      dir="ltr"
      aria-hidden="true"
      style={{
        direction: 'ltr',
        // Unicode ')' is an LTR closing parenthesis; in an RTL answer-label
        // sequence its physical closing curve must mirror to face the label.
        // Isolate text first, then mirror its painted glyph (not DOM/order).
        unicodeBidi: 'isolate-override',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 400,
        fontSize: '0.70em',
        lineHeight: 1,
        letterSpacing: 0,
        display: 'inline-block',
        width: '0.42em',
        minWidth: '0.42em',
        textAlign: 'center',
        verticalAlign: '-0.02em',
        color,
        flex: '0 0 auto',
        transform: 'translateY(-0.03em) scaleX(-1) scaleY(0.92)',
        transformOrigin: 'center center',
        ...style,
      }}
    >
      )
    </span>
  )
}

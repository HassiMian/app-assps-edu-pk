import React from 'react'

export default function StableClosingBracket({ color = 'currentColor', style = {} }) {
  return (
    <span
      data-option-bracket
      dir="ltr"
      aria-hidden="true"
      style={{
        direction: 'ltr',
        unicodeBidi: 'isolate',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 700,
        fontSize: '0.96em',
        lineHeight: 1,
        display: 'inline-block',
        width: '0.48em',
        minWidth: '0.48em',
        textAlign: 'center',
        verticalAlign: 'baseline',
        color,
        flex: '0 0 auto',
        transform: 'none',
        ...style,
      }}
    >
      )
    </span>
  )
}

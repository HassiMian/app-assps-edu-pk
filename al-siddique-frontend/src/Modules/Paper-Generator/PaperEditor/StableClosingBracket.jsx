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
        fontFamily: 'Arial, sans-serif',
        fontWeight: 900,
        display: 'inline-grid',
        placeItems: 'center',
        width: '0.58em',
        height: '1.08em',
        minWidth: '0.58em',
        position: 'relative',
        verticalAlign: 'middle',
        color,
        flex: '0 0 auto',
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
        }}
      >
        )
      </span>
      <svg
        data-option-bracket-shape
        viewBox="0 0 8 18"
        width="100%"
        height="100%"
        focusable="false"
        aria-hidden="true"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <path
          d="M1.1 1.2 C5.1 4.1 6.8 7.2 6.8 9 C6.8 10.8 5.1 13.9 1.1 16.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

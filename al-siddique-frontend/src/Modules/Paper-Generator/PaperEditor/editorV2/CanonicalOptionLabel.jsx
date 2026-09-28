import React from 'react'
import { optionLabelParts } from '../../paperSystemRules.js'

export function getCanonicalOptionLabelParts(option = {}, index = 0, direction = 'ltr') {
  const isUrdu = direction === 'rtl' || option.direction === 'rtl'
  const rawLabel =
    option.sourceLabel ??
    option.displayLabel ??
    option.canonicalLabel ??
    option.label ??
    String.fromCharCode(65 + index)

  return optionLabelParts(rawLabel, index, isUrdu)
}

export default function CanonicalOptionLabel({
  option = {},
  index = 0,
  direction = 'ltr',
  color = '#1e3a8a',
  style = {},
}) {
  const parts = getCanonicalOptionLabelParts(option, index, direction)
  return (
    <span
      data-canonical-option-label
      data-language={parts.direction === 'rtl' ? 'urdu' : 'english'}
      style={{
        display: 'inline-flex',
        flexDirection: parts.direction === 'rtl' ? 'row-reverse' : 'row',
        direction: 'ltr',
        unicodeBidi: 'isolate',
        alignItems: 'baseline',
        gap: '1px',
        whiteSpace: 'nowrap',
        fontWeight: 800,
        color,
        ...style,
      }}
    >
      <b data-option-label-text>{parts.label}</b>
      <b data-option-bracket dir="ltr">{parts.closingBracket}</b>
    </span>
  )
}
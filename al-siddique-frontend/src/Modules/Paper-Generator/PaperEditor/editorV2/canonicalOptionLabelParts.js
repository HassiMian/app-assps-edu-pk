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


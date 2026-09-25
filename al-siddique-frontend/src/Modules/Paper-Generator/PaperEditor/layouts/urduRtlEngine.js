// urduRtlEngine.js — Urdu & RTL Layout Engine for ASSPS Paper Generator
export const URDU_ALPHABET_MAP = {
  'A': 'الف',
  'B': 'ب',
  'C': 'ج',
  'D': 'د',
}

export const REVERSE_URDU_ALPHABET_MAP = {
  'ا': 'A',
  'الف': 'A',
  'ب': 'B',
  'ج': 'C',
  'د': 'D',
  '1': 'A',
  '2': 'B',
  '3': 'C',
  '4': 'D',
}

export const URDU_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
export const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

export function isUrduText(text) {
  if (!text) return false
  return /[\u0600-\u06ff]/.test(String(text))
}

export function detectDirection(text, fallback = 'ltr') {
  if (!text) return fallback
  const str = String(text)
  const urduMatches = (str.match(/[\u0600-\u06ff]/g) || []).length
  const latinMatches = (str.match(/[a-zA-Z]/g) || []).length
  if (urduMatches > latinMatches) return 'rtl'
  if (latinMatches > urduMatches) return 'ltr'
  return fallback
}

export function normalizeOptionLabel(raw) {
  if (!raw) return 'A'
  const clean = String(raw).replace(/[()۔.:\-\s]/g, '').trim()
  const upper = clean.toUpperCase()
  if (['A', 'B', 'C', 'D'].includes(upper)) return upper
  if (REVERSE_URDU_ALPHABET_MAP[clean]) return REVERSE_URDU_ALPHABET_MAP[clean]
  return 'A'
}

export function getDisplayOptionLabel(canonicalLabel, isUrdu = false) {
  const norm = normalizeOptionLabel(canonicalLabel)
  if (isUrdu) {
    return URDU_ALPHABET_MAP[norm] || norm
  }
  return norm
}

export function toUrduDigits(value) {
  return String(value).replace(/\d/g, d => URDU_DIGITS[Number(d)] || d)
}

export function toWesternDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, ch => String(URDU_DIGITS.indexOf(ch)))
    .replace(/[٠-٩]/g, ch => String(ARABIC_DIGITS.indexOf(ch)))
}

export function getQuestionNumberText(num, isUrdu = false) {
  if (isUrdu) {
    return `سوال نمبر ${toUrduDigits(num)}:`
  }
  return `Q${num}.`
}

export function getSectionHeadingText(section, isUrdu = false) {
  const num = section.sectionNumber || 1
  if (isUrdu) {
    return section.titleUrdu || `حصہ ${toUrduDigits(num)}: ${section.title}`
  }
  return `Section ${num}: ${section.title}`
}

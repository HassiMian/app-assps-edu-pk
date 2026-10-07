import { URDU_FONT_STACK } from '../../resolvePaperRoute.js'

export function resolvePaperFontFamily({ isUrdu = false, fontFamily = '', englishFallback = "'Times New Roman', Times, serif" } = {}) {
  const selected = String(fontFamily || '').trim()
  if (selected) return selected
  return isUrdu ? URDU_FONT_STACK : englishFallback
}

export function buildPaperTextFlow({
  isUrdu = false,
  englishLineHeight = 1.5,
  urduLineHeight = 2,
  letterSpacing = 0,
  wordSpacing = 0,
} = {}) {
  const safeEnglishLineHeight = Number.isFinite(Number(englishLineHeight)) ? Number(englishLineHeight) : 1.5
  const safeUrduLineHeight = Number.isFinite(Number(urduLineHeight)) ? Number(urduLineHeight) : 2
  const safeLetterSpacing = Number.isFinite(Number(letterSpacing)) ? Number(letterSpacing) : 0
  const safeWordSpacing = Number.isFinite(Number(wordSpacing)) ? Number(wordSpacing) : 0

  return {
    lineHeight: isUrdu ? safeUrduLineHeight : safeEnglishLineHeight,
    letterSpacing: safeLetterSpacing + 'px',
    wordSpacing: safeWordSpacing + 'px',
  }
}

export function buildPaperTypography({
  isUrdu = false,
  fontFamily = '',
  fontSize = 13,
  fontColor = '#1a1a1a',
  bold = false,
  italic = false,
  underline = false,
  textAlign = 'start',
  englishLineHeight = 1.5,
  urduLineHeight = 2,
  letterSpacing = 0,
  wordSpacing = 0,
} = {}) {
  return {
    fontFamily: resolvePaperFontFamily({ isUrdu, fontFamily }),
    fontSize: Number.isFinite(Number(fontSize)) ? Number(fontSize) + 'px' : '13px',
    color: fontColor || '#1a1a1a',
    fontWeight: bold ? 700 : 400,
    fontStyle: italic ? 'italic' : 'normal',
    textDecoration: underline ? 'underline' : 'none',
    textAlign,
    ...buildPaperTextFlow({
      isUrdu,
      englishLineHeight,
      urduLineHeight,
      letterSpacing,
      wordSpacing,
    }),
  }
}

// typographyTokens.js — Explicit design tokens for Early Years Worksheet typography
export const TYPOGRAPHY_TOKENS = {
  fontFamilies: {
    englishPrimary: "'Times New Roman', serif",
    englishSupportingSans: "Arial, sans-serif",
    urduPrimary: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif",
    urduFallback: "'Noto Nastaliq Urdu', serif"
  },

  fontSizes: {
    schoolName: "16pt",
    schoolSubtitle: "9.5pt",
    metadata: "10.5pt",
    englishQuestionHeading: "13.5pt",
    englishChildText: "14pt",
    urduQuestionHeading: "18pt",
    urduChildText: "21pt",
    traceGlyph: "30pt",
    numberGridText: "17pt",
    matchingText: "14pt",
    choiceOptionText: "14pt",
    instructionSubtext: "10.5pt"
  },

  fontWeights: {
    normal: 400,
    medium: 500,
    semiBold: 600,
    bold: 700
  },

  lineHeights: {
    tight: 1.15,
    normal: 1.35,
    loose: 1.6,
    handwritingLane: "11mm"
  }
}

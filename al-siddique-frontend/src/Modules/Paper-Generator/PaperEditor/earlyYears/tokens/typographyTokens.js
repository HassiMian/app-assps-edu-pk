// typographyTokens.js — Explicit design tokens for Early Years Worksheet typography
export const TYPOGRAPHY_TOKENS = {
  fontFamilies: {
    englishPrimary: "'Times New Roman', serif",
    englishSupportingSans: "Arial, sans-serif",
    urduPrimary: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif",
    urduFallback: "'Noto Nastaliq Urdu', serif"
  },

  fontSizes: {
    schoolName: "18pt",
    schoolSubtitle: "11pt",
    metadata: "12pt",
    englishQuestionHeading: "15pt",
    englishChildText: "16pt",
    urduQuestionHeading: "21pt",
    urduChildText: "25pt",
    traceGlyph: "38pt",
    numberGridText: "19pt",
    matchingText: "16pt",
    choiceOptionText: "16pt",
    instructionSubtext: "12pt"
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

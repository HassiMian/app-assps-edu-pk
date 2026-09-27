// layoutTokens.js — Layout, spacing, sketch dimension tokens for Early Years Worksheets
export const LAYOUT_TOKENS = {
  // Page Profile: A4 Portrait default
  page: {
    format: 'A4',
    orientation: 'portrait',
    widthMm: 210,
    heightMm: 297,
    marginTopMm: 8,
    marginBottomMm: 8,
    marginLeftMm: 9,
    marginRightMm: 9
  },

  // Sketch sizes (in mm for print fidelity)
  sketchSizes: {
    smallVisual: '22mm',
    choiceVisual: '27mm',
    mainVisual: '32mm',
    colouringVisual: '38mm',
    patternVisual: '27mm'
  },

  // Child Response Spacing
  childResponse: {
    handwritingRowSpacingMm: 9,
    largeAnswerLineWidthMm: 90,
    matchingRowHeightMm: 13,
    matchingCorridorGapMm: 34,
    visualChoiceHitAreaMm: 11,
    boxGridCellSizeMm: 14,
    questionNumberWidthPx: 32    // aligned question numbering column
  },

  // Print safety borders & strokes
  print: {
    borderStrokeMm: 0.35,
    dottedStrokeDashMm: '2, 2',
    lineArtStrokeMm: 0.5,
    containerBorderMm: 0.4
  }
}

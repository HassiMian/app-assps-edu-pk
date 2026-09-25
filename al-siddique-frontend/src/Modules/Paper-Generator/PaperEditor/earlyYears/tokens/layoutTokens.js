// layoutTokens.js — Layout, spacing, sketch dimension tokens for Early Years Worksheets
export const LAYOUT_TOKENS = {
  // Page Profile: A4 Portrait default
  page: {
    format: 'A4',
    orientation: 'portrait',
    widthMm: 210,
    heightMm: 297,
    marginTopMm: 12,
    marginBottomMm: 12,
    marginLeftMm: 15,
    marginRightMm: 15
  },

  // Sketch sizes (in mm for print fidelity)
  sketchSizes: {
    smallVisual: '28mm',    // 26-30mm
    choiceVisual: '35mm',   // 32-38mm
    mainVisual: '42mm',     // 38-45mm
    colouringVisual: '54mm', // 48-60mm
    patternVisual: '34mm'    // 30-38mm
  },

  // Child Response Spacing
  childResponse: {
    handwritingRowSpacingMm: 11, // 10-12mm vertical row spacing
    largeAnswerLineWidthMm: 95,   // 85-110mm usable width
    matchingRowHeightMm: 16,     // min 14mm height
    matchingCorridorGapMm: 45,   // corridor between columns
    visualChoiceHitAreaMm: 14,   // min 12-14mm hit/circle area
    boxGridCellSizeMm: 16,       // cell size for letter/number boxes
    questionNumberWidthPx: 36    // aligned question numbering column
  },

  // Print safety borders & strokes
  print: {
    borderStrokeMm: 0.35,
    dottedStrokeDashMm: '2, 2',
    lineArtStrokeMm: 0.5,
    containerBorderMm: 0.4
  }
}

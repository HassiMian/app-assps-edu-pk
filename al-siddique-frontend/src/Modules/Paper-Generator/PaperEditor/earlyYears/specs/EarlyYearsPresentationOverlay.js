// EarlyYearsPresentationOverlay.js
// Decoupled presentation overlay — keyed by paperId+questionId
// NEVER mutates academic source JSON.
// Controls: sketchAsset, sketchSize, lineCount, lineGapMm, writingMode, layout

const _store = new Map()

function overlayKey(paperId, questionId) {
  return `${paperId}::${questionId}`
}

/**
 * Returns the overlay for a specific question (or empty defaults).
 */
export function getOverlay(paperId, questionId) {
  const key = overlayKey(paperId, questionId)
  return _store.get(key) || {}
}

/**
 * Updates one or more overlay fields for a question without mutating source.
 */
export function setOverlay(paperId, questionId, fields) {
  const key = overlayKey(paperId, questionId)
  const existing = _store.get(key) || {}
  _store.set(key, { ...existing, ...fields })
}

/**
 * Clears overlay for a question.
 */
export function clearOverlay(paperId, questionId) {
  _store.delete(overlayKey(paperId, questionId))
}

/**
 * Clears all overlays for a paper.
 */
export function clearPaperOverlays(paperId) {
  for (const key of _store.keys()) {
    if (key.startsWith(`${paperId}::`)) {
      _store.delete(key)
    }
  }
}

/**
 * Returns all overlays for a paper as an object keyed by questionId.
 */
export function getAllOverlaysForPaper(paperId) {
  const result = {}
  for (const [key, value] of _store.entries()) {
    if (key.startsWith(`${paperId}::`)) {
      const questionId = key.slice(paperId.length + 2)
      result[questionId] = value
    }
  }
  return result
}

// Valid sketch size tokens
export const SKETCH_SIZES = {
  smallVisual: '28mm',
  choiceVisual: '35mm',
  mainVisual: '42mm',
  colouringVisual: '54mm',
  patternVisual: '34mm'
}

// Valid layout modes and which presentation types support them
export const LAYOUT_SUPPORT = {
  stacked: ['all'],
  'two-column': ['TraceGlyphGrid', 'CircleChoiceGrid', 'CircleChoiceWithSketch', 'ChoiceLetterRow', 'MissingLetterGrid', 'MissingNumberGrid', 'BeforeAfterGrid'],
  'visual-left': ['CircleChoiceWithSketch', 'PictureColoringBlock', 'VisualMatchingColumns'],
  'visual-top': ['CircleChoiceWithSketch', 'PictureColoringBlock', 'VisualMatchingColumns']
}

/**
 * Returns whether a layout mode is supported for a presentationType
 */
export function isLayoutSupported(presentationType, layoutMode) {
  const supported = LAYOUT_SUPPORT[layoutMode]
  if (!supported) return false
  if (supported.includes('all')) return true
  return supported.includes(presentationType)
}

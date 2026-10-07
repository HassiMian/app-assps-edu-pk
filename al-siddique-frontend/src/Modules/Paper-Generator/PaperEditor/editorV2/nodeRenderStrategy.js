// nodeRenderStrategy.js — Centralized Canonical B3 Node Editability and Rendering Strategy (Rules 4, 5, 15)

export const B3_RENDER_STRATEGY = {
  EDITABLE_RICH: 'EDITABLE_RICH',
  EDITABLE_RAW: 'EDITABLE_RAW',
  READ_ONLY_STRUCTURED: 'READ_ONLY_STRUCTURED',
}

// B3 Editable Academic Question Types (Rule 4, 21)
const RICH_TEXT_TYPES = new Set([
  'short_question',
  'long_question',
  'essay',
  'application',
  'letter',
  'translation',
  'definition',
  'mcq',
  'rich_text',
])

// B3 Read-Only Structural Node Types (Rule 4, 21)
const READ_ONLY_STRUCTURED_TYPES = new Set([
  'true_false',
  'fill_blank',
  'matching_columns',
  'grammar_table',
  'vertical_math',
  'scope_header',
  'section_banner',
])

/**
 * Determines the exact B3 rendering and editability strategy for a canonical node type.
 *
 * @param {string} nodeType
 * @returns {'EDITABLE_RICH' | 'EDITABLE_RAW' | 'READ_ONLY_STRUCTURED'}
 */
export function getB3NodeEditability(nodeType) {
  if (RICH_TEXT_TYPES.has(nodeType)) {
    return B3_RENDER_STRATEGY.EDITABLE_RICH
  }

  if (nodeType === 'unknown_preserved') {
    return B3_RENDER_STRATEGY.READ_ONLY_STRUCTURED
  }

  if (READ_ONLY_STRUCTURED_TYPES.has(nodeType)) {
    return B3_RENDER_STRATEGY.READ_ONLY_STRUCTURED
  }

  // Safe fallback for unclassified future nodes
  return B3_RENDER_STRATEGY.READ_ONLY_STRUCTURED
}

// structuredFocusHelpers.js — Pure JS exports shared between StructuredFocusContext.jsx and test code.
// Separated from .jsx so that node:test runners can import without JSX transform.

// INTERACTION MODES (spec §14)
export const INTERACTION_MODE = {
  TIPTAP:     'TIPTAP',
  STRUCTURED: 'STRUCTURED',
  NONE:       'NONE',
}

/**
 * Builds a structured control key. Separate from B3 field key grammar (spec §13).
 * Format: structured::<docId>::<secId>::<nodeId>::<kind>::<itemId>::<subfield>
 */
export function buildStructuredControlKey(docId, secId, nodeId, kind, itemId = '', subfield = '') {
  return `structured::${docId}::${secId}::${nodeId}::${kind}::${itemId}::${subfield}`
}

export function parseStructuredControlKey(key) {
  if (typeof key !== 'string' || !key.startsWith('structured::')) return null
  const parts = key.split('::')
  return {
    prefix:   parts[0] || '',
    docId:    parts[1] || '',
    secId:    parts[2] || '',
    nodeId:   parts[3] || '',
    kind:     parts[4] || '',
    itemId:   parts[5] || '',
    subfield: parts[6] || '',
  }
}

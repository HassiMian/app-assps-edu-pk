// classifyPaperDocument.js — Deterministic document discriminator for Paper Editor V2

export const DOCUMENT_CLASSIFICATIONS = Object.freeze({
  CANONICAL_V2: 'CANONICAL_V2',
  LEGACY_CANVAS_V2: 'LEGACY_CANVAS_V2',
  OFFICIAL_V13_PAPER: 'OFFICIAL_V13_PAPER',
  OFFICIAL_V13_DATASET: 'OFFICIAL_V13_DATASET',
  UNKNOWN: 'UNKNOWN',
})

/**
 * Classifies an incoming paper document or dataset payload.
 *
 * @param {any} payload
 * @returns {string} One of DOCUMENT_CLASSIFICATIONS
 */
export function classifyPaperDocument(payload) {
  if (!payload || typeof payload !== 'object') {
    return DOCUMENT_CLASSIFICATIONS.UNKNOWN
  }

  // 1. CANONICAL_V2: requires ALL THREE canonical discriminator keys
  if (
    payload.format === 'assps-canonical-paper' &&
    payload.documentModel === 'PaperDocumentV2' &&
    payload.schemaVersion === 3
  ) {
    return DOCUMENT_CLASSIFICATIONS.CANONICAL_V2
  }

  // 2. LEGACY_CANVAS_V2: schemaVersion === 2 with sections array and no canonical discriminator
  if (
    payload.schemaVersion === 2 &&
    Array.isArray(payload.sections) &&
    payload.format !== 'assps-canonical-paper'
  ) {
    return DOCUMENT_CLASSIFICATIONS.LEGACY_CANVAS_V2
  }

  // 3. OFFICIAL_V13_DATASET: dataset container with papers[] and unambiguous V13 evidence
  if (
    Array.isArray(payload.papers) &&
    ((typeof payload.version === 'string' && /v13/i.test(payload.version)) ||
      (typeof payload.generation === 'string' && /v13/i.test(payload.generation)) ||
      (typeof payload.sourceVersion === 'string' && /v13/i.test(payload.sourceVersion)))
  ) {
    return DOCUMENT_CLASSIFICATIONS.OFFICIAL_V13_DATASET
  }

  // 4. OFFICIAL_V13_PAPER: individual paper with documentFormat === "pts-native-v13"
  // Do NOT classify arbitrary official_section[] alone as V13.
  // Historical V12 papers or custom objects must not classify as OFFICIAL_V13_PAPER.
  if (
    !Array.isArray(payload.papers) &&
    payload.documentFormat === 'pts-native-v13' &&
    Array.isArray(payload.official_section)
  ) {
    return DOCUMENT_CLASSIFICATIONS.OFFICIAL_V13_PAPER
  }

  return DOCUMENT_CLASSIFICATIONS.UNKNOWN
}

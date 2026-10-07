// structuredDraftV2.js — V2 compact draft export/import for structured state.
// Handles serialization and deserialization of B4 structured patches.

import { validateV2StructuredBlock } from './structuredPatchValidator.js'
import { extractMaxSequenceFromUserId } from './structuredIdAllocator.js'

export const DRAFT_VERSION_V2 = 2

/**
 * Exports the structured block from a working document for inclusion in a V2 draft.
 */
export function exportStructuredBlock(workingDoc) {
  const s = workingDoc?.structured
  if (!s) {
    return {
      structuredPatches: {},
      insertedNodes: {},
      deletedNodeIds: [],
      nodeOrderBySection: {},
      nextUserStructureSequence: 1,
    }
  }
  return {
    structuredPatches: s.structuredPatches || {},
    insertedNodes: s.insertedNodes || {},
    deletedNodeIds: Array.isArray(s.deletedNodeIds) ? [...s.deletedNodeIds] : [],
    nodeOrderBySection: s.nodeOrderBySection || {},
    nextUserStructureSequence: s.nextUserStructureSequence || 1,
  }
}

/**
 * Validates the entire V2 draft structured block against the canonical baseline.
 * Returns { valid: true } or { valid: false, error }
 */
export function validateDraftStructuredBlock(structured, canonicalDoc) {
  return validateV2StructuredBlock(structured, canonicalDoc)
}

/**
 * Computes the max user-ID sequence found in an imported structured block.
 * Used to advance the allocator past all saved IDs on draft reload.
 */
export function computeMaxSequenceFromStructured(structured) {
  let max = 0

  const scan = (id) => {
    const s = extractMaxSequenceFromUserId(id)
    if (s > max) max = s
  }

  for (const nodeId of Object.keys(structured.insertedNodes || {})) {
    scan(nodeId)
    const rec = structured.insertedNodes[nodeId]
    for (const opt of rec.options || []) scan(opt.id)
    for (const seg of rec.segments || []) scan(seg.id)
    for (const row of rec.rows || []) scan(row.id)
    for (const op of rec.operands || []) scan(op.id)
    for (const item of rec.leftItems || []) scan(item.id)
    for (const item of rec.rightItems || []) scan(item.id)
  }

  // Also scan patches for inserted sub-items
  for (const patch of Object.values(structured.structuredPatches || {})) {
    for (const id of Object.keys(patch.insertedOptions || {})) scan(id)
    for (const id of Object.keys(patch.insertedSegments || {})) scan(id)
    for (const id of Object.keys(patch.insertedRows || {})) scan(id)
    for (const id of Object.keys(patch.insertedOperands || {})) scan(id)
    for (const id of Object.keys(patch.insertedLeftItems || {})) scan(id)
    for (const id of Object.keys(patch.insertedRightItems || {})) scan(id)
  }

  return max
}

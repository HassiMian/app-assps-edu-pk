// structuredPatchValidator.js — V2 draft structured payload pre-flight validation.
// All validation is atomic: one failure means the whole structured block is rejected.

import { deriveBaselineSegmentId, deriveBaselineGrammarRowId, deriveBaselineOperandId } from './structuredIdAllocator.js'

// Answer-key fields that must NEVER appear in any patch
const FORBIDDEN_PATCH_KEYS = new Set(['isCorrect', 'expectedAnswer', 'correctMappings'])

function err(msg) { return { valid: false, error: msg } }
const OK = { valid: true }

/**
 * Validates a single StructuredNodePatch against the baseline canonical node.
 */
function validateStructuredPatch(patch, baselineNode) {
  if (!patch || typeof patch !== 'object') return err('Patch must be an object')
  if (!patch.nodeId || typeof patch.nodeId !== 'string') return err('Patch missing nodeId')
  if (!baselineNode) return err(`Node not found in baseline for id: ${patch.nodeId}`)
  if (patch.nodeType !== (baselineNode.type || baselineNode.nodeType)) {
    return err(`Patch nodeType '${patch.nodeType}' does not match baseline '${baselineNode.type}'`)
  }

  // Check forbidden answer-key fields
  for (const key of Object.keys(patch)) {
    if (FORBIDDEN_PATCH_KEYS.has(key)) {
      return err(`Forbidden answer-key field '${key}' found in structured patch`)
    }
  }

  const type = patch.nodeType

  if (type === 'mcq') {
    // Validate option IDs exist in baseline or insertedOptions
    const srcOptIds = new Set((baselineNode.options || []).map(o => o.id))
    const insertedIds = new Set(Object.keys(patch.insertedOptions || {}))
    for (const oid of Object.keys(patch.optionPatches || {})) {
      if (!srcOptIds.has(oid)) return err(`MCQ optionPatch references unknown optionId: ${oid}`)
    }
    for (const oid of (patch.deletedOptionIds || [])) {
      if (!srcOptIds.has(oid)) return err(`MCQ deletedOptionId references unknown optionId: ${oid}`)
    }
    // optionOrder must reference known IDs
    if (patch.optionOrder) {
      const allKnown = new Set([...srcOptIds, ...insertedIds])
      for (const oid of patch.optionOrder) {
        if (!allKnown.has(oid)) return err(`MCQ optionOrder references unknown optionId: ${oid}`)
      }
    }
    // Check for forbidden isCorrect in insertedOptions
    for (const [id, opt] of Object.entries(patch.insertedOptions || {})) {
      if ('isCorrect' in opt) return err(`Forbidden isCorrect in insertedOption ${id}`)
    }
  }

  if (type === 'fill_blank') {
    const srcSegs = baselineNode.segments || []
    const srcSegIds = new Set(srcSegs.map((_, i) => deriveBaselineSegmentId(baselineNode.id, i)))
    const insertedIds = new Set(Object.keys(patch.insertedSegments || {}))
    for (const sid of Object.keys(patch.segmentPatches || {})) {
      if (!srcSegIds.has(sid)) return err(`FillBlank segmentPatch references unknown segId: ${sid}`)
    }
    for (const sid of (patch.deletedSegIds || [])) {
      if (!srcSegIds.has(sid)) return err(`FillBlank deletedSegId references unknown segId: ${sid}`)
    }
    if (patch.segmentOrder) {
      const allKnown = new Set([...srcSegIds, ...insertedIds])
      for (const sid of patch.segmentOrder) {
        if (!allKnown.has(sid)) return err(`FillBlank segmentOrder references unknown segId: ${sid}`)
      }
    }
  }

  if (type === 'matching_columns') {
    const srcLeftIds = new Set((baselineNode.leftItems || []).map(i => i.id))
    const srcRightIds = new Set((baselineNode.rightItems || []).map(i => i.id))
    for (const id of Object.keys(patch.leftPatches || {})) {
      if (!srcLeftIds.has(id)) return err(`Matching leftPatch references unknown leftItemId: ${id}`)
    }
    for (const id of Object.keys(patch.rightPatches || {})) {
      if (!srcRightIds.has(id)) return err(`Matching rightPatch references unknown rightItemId: ${id}`)
    }
    if ('correctMappings' in patch) return err('Forbidden correctMappings in matching patch')
  }

  if (type === 'grammar_table') {
    const srcRows = baselineNode.rows || []
    const srcRowIds = new Set(srcRows.map((_, i) => deriveBaselineGrammarRowId(baselineNode.id, i)))
    const insertedIds = new Set(Object.keys(patch.insertedRows || {}))
    for (const rid of Object.keys(patch.rowPatches || {})) {
      if (!srcRowIds.has(rid)) return err(`Grammar rowPatch references unknown rowId: ${rid}`)
    }
    for (const rid of (patch.deletedRowIds || [])) {
      if (!srcRowIds.has(rid)) return err(`Grammar deletedRowId references unknown rowId: ${rid}`)
    }
    if (patch.rowOrder) {
      const allKnown = new Set([...srcRowIds, ...insertedIds])
      for (const rid of patch.rowOrder) {
        if (!allKnown.has(rid)) return err(`Grammar rowOrder references unknown rowId: ${rid}`)
      }
    }
  }

  if (type === 'vertical_math') {
    const srcOps = baselineNode.operands || []
    const srcOpIds = new Set(srcOps.map((_, i) => deriveBaselineOperandId(baselineNode.id, i)))
    const insertedIds = new Set(Object.keys(patch.insertedOperands || {}))
    for (const oid of Object.keys(patch.operandPatches || {})) {
      if (!srcOpIds.has(oid)) return err(`VerticalMath operandPatch references unknown opId: ${oid}`)
    }
    for (const oid of (patch.deletedOperandIds || [])) {
      if (!srcOpIds.has(oid)) return err(`VerticalMath deletedOperandId references unknown opId: ${oid}`)
    }
    if (patch.operandOrder) {
      const allKnown = new Set([...srcOpIds, ...insertedIds])
      for (const oid of patch.operandOrder) {
        if (!allKnown.has(oid)) return err(`VerticalMath operandOrder references unknown opId: ${oid}`)
      }
    }
  }

  return OK
}

/**
 * Validates a full structured block from a V2 draft.
 * Requires the canonical baseline documents map: { [docId]: canonicalDoc }
 * Returns { valid: true } or { valid: false, error: string }
 */
export function validateV2StructuredBlock(structured, canonicalDoc) {
  if (!structured || typeof structured !== 'object') {
    return err('V2 draft missing structured block')
  }

  // Build baseline node map
  const nodeMap = {}
  for (const sec of canonicalDoc?.sections || []) {
    for (const n of sec.nodes || []) {
      nodeMap[n.id] = n
    }
  }

  const allSourceIds = new Set(Object.keys(nodeMap))
  const insertedIds = new Set(Object.keys(structured.insertedNodes || {}))

  // 1. Validate structuredPatches
  for (const [nodeId, patch] of Object.entries(structured.structuredPatches || {})) {
    const baseline = nodeMap[nodeId]
    const r = validateStructuredPatch(patch, baseline)
    if (!r.valid) return r
  }

  // 2. Validate deletedNodeIds — must exist in source
  for (const id of (structured.deletedNodeIds || [])) {
    if (!allSourceIds.has(id)) return err(`deletedNodeId references unknown source node: ${id}`)
  }

  // 3. Validate insertedNodes
  for (const [nodeId, rec] of Object.entries(structured.insertedNodes || {})) {
    if (allSourceIds.has(nodeId)) return err(`insertedNode ID collides with source node: ${nodeId}`)
    if (rec.origin !== 'USER_CREATED') return err(`insertedNode ${nodeId} missing origin USER_CREATED`)
    if (rec.sourceSegmentIds !== null && !Array.isArray(rec.sourceSegmentIds)) {
      return err(`insertedNode ${nodeId} sourceSegmentIds must be []`)
    }
    if (rec.rawSourceSnapshot !== null) return err(`insertedNode ${nodeId} rawSourceSnapshot must be null`)
    // Forbidden answer-key fields
    for (const key of Object.keys(rec)) {
      if (FORBIDDEN_PATCH_KEYS.has(key) && rec[key] !== null) {
        return err(`Forbidden answer-key field '${key}' set to non-null in insertedNode ${nodeId}`)
      }
    }
  }

  // 4. Validate nodeOrderBySection
  for (const [secId, order] of Object.entries(structured.nodeOrderBySection || {})) {
    if (!Array.isArray(order)) return err(`nodeOrderBySection[${secId}] must be an array`)
    const seen = new Set()
    for (const id of order) {
      if (seen.has(id)) return err(`nodeOrderBySection[${secId}] has duplicate id: ${id}`)
      seen.add(id)
      if (!allSourceIds.has(id) && !insertedIds.has(id)) {
        return err(`nodeOrderBySection[${secId}] references unknown nodeId: ${id}`)
      }
    }
  }

  // 5. nextUserStructureSequence
  if (typeof structured.nextUserStructureSequence !== 'number' || structured.nextUserStructureSequence < 1) {
    return err('nextUserStructureSequence must be a positive integer')
  }

  return OK
}

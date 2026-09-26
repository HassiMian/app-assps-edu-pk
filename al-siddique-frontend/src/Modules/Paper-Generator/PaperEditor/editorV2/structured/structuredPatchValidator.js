// structuredPatchValidator.js — V2 draft structured payload pre-flight validation.
// All validation is atomic: one failure means the whole structured block is rejected.

import { deriveBaselineSegmentId, deriveBaselineGrammarRowId, deriveBaselineOperandId } from './structuredIdAllocator.js'

// Answer-key fields that must NEVER appear in any patch
const FORBIDDEN_PATCH_KEYS = new Set(['isCorrect', 'expectedAnswer', 'correctMappings'])

function err(msg) { return { valid: false, error: msg } }
const OK = { valid: true }

function validateDeletedIds(deletedIds, name, srcIdSet, insertedIdSet) {
  if (!Array.isArray(deletedIds)) return err(`${name} must be an array`)
  const seen = new Set()
  for (const id of deletedIds) {
    if (seen.has(id)) return err(`${name} contains duplicate ID: ${id}`)
    seen.add(id)
    if (insertedIdSet && insertedIdSet.has(id)) {
      return err(`${name} contains inserted ID (must be baseline-only): ${id}`)
    }
    if (!srcIdSet.has(id)) {
      return err(`${name} references unknown baseline ID: ${id}`)
    }
  }
  return OK
}

function validateOrderArray(order, name, allowedSet, deletedSet) {
  if (!Array.isArray(order)) return err(`${name} must be an array`)
  const seen = new Set()
  for (const id of order) {
    if (seen.has(id)) return err(`${name} contains duplicate ID: ${id}`)
    seen.add(id)
    if (deletedSet && deletedSet.has(id)) {
      return err(`${name} contains deleted ID: ${id}`)
    }
    if (!allowedSet.has(id)) {
      return err(`${name} references unknown ID: ${id}`)
    }
  }
  return OK
}

function checkCollision(setA, setB, nameA, nameB) {
  for (const id of setA) {
    if (setB.has(id)) {
      return err(`ID collision between ${nameA} and ${nameB}: ${id}`)
    }
  }
  return OK
}

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
    const srcOptIds = new Set((baselineNode.options || []).map(o => o.id))
    const insertedOptIds = new Set(Object.keys(patch.insertedOptions || {}))

    // Reject collision
    const col = checkCollision(insertedOptIds, srcOptIds, 'insertedOptions', 'source options')
    if (!col.valid) return col

    // Validate deletedOptionIds (baseline-only, no duplicates)
    const delRes = validateDeletedIds(patch.deletedOptionIds || [], 'MCQ deletedOptionIds', srcOptIds, insertedOptIds)
    if (!delRes.valid) return delRes

    // Validate optionPatches: source only, isCorrect NEVER writable
    for (const [oid, opPatch] of Object.entries(patch.optionPatches || {})) {
      if (!srcOptIds.has(oid)) return err(`MCQ optionPatch references unknown optionId: ${oid}`)
      if ('isCorrect' in opPatch) return err(`Forbidden isCorrect in optionPatch ${oid}`)
    }

    // Validate insertedOptions: isCorrect may exist ONLY as exactly null or omitted
    for (const [id, opt] of Object.entries(patch.insertedOptions || {})) {
      if (!opt || typeof opt !== 'object') return err(`MCQ insertedOption ${id} must be an object`)
      if ('isCorrect' in opt && opt.isCorrect !== null) {
        return err(`Forbidden non-null isCorrect in insertedOption ${id}`)
      }
    }

    // Validate optionOrder: unique, known non-deleted IDs
    if (patch.optionOrder) {
      const allowed = new Set([...srcOptIds, ...insertedOptIds])
      const deletedSet = new Set(patch.deletedOptionIds || [])
      const ordRes = validateOrderArray(patch.optionOrder, 'MCQ optionOrder', allowed, deletedSet)
      if (!ordRes.valid) return ordRes
    }
  }

  if (type === 'fill_blank') {
    const srcSegs = baselineNode.segments || []
    const srcSegIds = new Set(srcSegs.map((_, i) => deriveBaselineSegmentId(baselineNode.id, i)))
    const insertedSegIds = new Set(Object.keys(patch.insertedSegments || {}))

    const col = checkCollision(insertedSegIds, srcSegIds, 'insertedSegments', 'source segments')
    if (!col.valid) return col

    const delRes = validateDeletedIds(patch.deletedSegIds || [], 'FillBlank deletedSegIds', srcSegIds, insertedSegIds)
    if (!delRes.valid) return delRes

    for (const sid of Object.keys(patch.segmentPatches || {})) {
      if (!srcSegIds.has(sid)) return err(`FillBlank segmentPatch references unknown segId: ${sid}`)
    }

    if (patch.segmentOrder) {
      const allowed = new Set([...srcSegIds, ...insertedSegIds])
      const deletedSet = new Set(patch.deletedSegIds || [])
      const ordRes = validateOrderArray(patch.segmentOrder, 'FillBlank segmentOrder', allowed, deletedSet)
      if (!ordRes.valid) return ordRes
    }
  }

  if (type === 'matching_columns') {
    const srcLeftIds = new Set((baselineNode.leftItems || []).map(i => i.id))
    const srcRightIds = new Set((baselineNode.rightItems || []).map(i => i.id))
    const insertedLeftIds = new Set(Object.keys(patch.insertedLeftItems || {}))
    const insertedRightIds = new Set(Object.keys(patch.insertedRightItems || {}))

    const colL = checkCollision(insertedLeftIds, srcLeftIds, 'insertedLeftItems', 'source left items')
    if (!colL.valid) return colL
    const colR = checkCollision(insertedRightIds, srcRightIds, 'insertedRightItems', 'source right items')
    if (!colR.valid) return colR

    const delLRes = validateDeletedIds(patch.deletedLeftIds || [], 'Matching deletedLeftIds', srcLeftIds, insertedLeftIds)
    if (!delLRes.valid) return delLRes
    const delRRes = validateDeletedIds(patch.deletedRightIds || [], 'Matching deletedRightIds', srcRightIds, insertedRightIds)
    if (!delRRes.valid) return delRRes

    for (const id of Object.keys(patch.leftPatches || {})) {
      if (!srcLeftIds.has(id)) return err(`Matching leftPatch references unknown leftItemId: ${id}`)
    }
    for (const id of Object.keys(patch.rightPatches || {})) {
      if (!srcRightIds.has(id)) return err(`Matching rightPatch references unknown rightItemId: ${id}`)
    }

    if (patch.leftOrder) {
      const allowed = new Set([...srcLeftIds, ...insertedLeftIds])
      const deletedSet = new Set(patch.deletedLeftIds || [])
      const ordRes = validateOrderArray(patch.leftOrder, 'Matching leftOrder', allowed, deletedSet)
      if (!ordRes.valid) return ordRes
    }

    if (patch.rightOrder) {
      const allowed = new Set([...srcRightIds, ...insertedRightIds])
      const deletedSet = new Set(patch.deletedRightIds || [])
      const ordRes = validateOrderArray(patch.rightOrder, 'Matching rightOrder', allowed, deletedSet)
      if (!ordRes.valid) return ordRes
    }

    if ('correctMappings' in patch) return err('Forbidden correctMappings in matching patch')
  }

  if (type === 'grammar_table') {
    const srcRows = baselineNode.rows || []
    const srcRowIds = new Set(srcRows.map((_, i) => deriveBaselineGrammarRowId(baselineNode.id, i)))
    const insertedRowIds = new Set(Object.keys(patch.insertedRows || {}))

    const col = checkCollision(insertedRowIds, srcRowIds, 'insertedRows', 'source rows')
    if (!col.valid) return col

    const delRes = validateDeletedIds(patch.deletedRowIds || [], 'Grammar deletedRowIds', srcRowIds, insertedRowIds)
    if (!delRes.valid) return delRes

    for (const rid of Object.keys(patch.rowPatches || {})) {
      if (!srcRowIds.has(rid)) return err(`Grammar rowPatch references unknown rowId: ${rid}`)
    }

    if (patch.rowOrder) {
      const allowed = new Set([...srcRowIds, ...insertedRowIds])
      const deletedSet = new Set(patch.deletedRowIds || [])
      const ordRes = validateOrderArray(patch.rowOrder, 'Grammar rowOrder', allowed, deletedSet)
      if (!ordRes.valid) return ordRes
    }
  }

  if (type === 'vertical_math') {
    const srcOps = baselineNode.operands || []
    const srcOpIds = new Set(srcOps.map((_, i) => deriveBaselineOperandId(baselineNode.id, i)))
    const insertedOpIds = new Set(Object.keys(patch.insertedOperands || {}))

    const col = checkCollision(insertedOpIds, srcOpIds, 'insertedOperands', 'source operands')
    if (!col.valid) return col

    const delRes = validateDeletedIds(patch.deletedOperandIds || [], 'VerticalMath deletedOperandIds', srcOpIds, insertedOpIds)
    if (!delRes.valid) return delRes

    for (const oid of Object.keys(patch.operandPatches || {})) {
      if (!srcOpIds.has(oid)) return err(`VerticalMath operandPatch references unknown opId: ${oid}`)
    }

    if (patch.operandOrder) {
      const allowed = new Set([...srcOpIds, ...insertedOpIds])
      const deletedSet = new Set(patch.deletedOperandIds || [])
      const ordRes = validateOrderArray(patch.operandOrder, 'VerticalMath operandOrder', allowed, deletedSet)
      if (!ordRes.valid) return ordRes
    }
  }

  return OK
}

/**
 * Validates a full structured block from a V2 draft.
 * Requires the canonical baseline documents map: { [docId]: canonicalDoc } or single canonicalDoc.
 * Returns { valid: true } or { valid: false, error: string }
 */
export function validateV2StructuredBlock(structured, canonicalDoc) {
  if (!structured || typeof structured !== 'object') {
    return err('V2 draft missing structured block')
  }

  // Build baseline node map & section ownership map
  const nodeMap = {}
  const sourceNodeToSection = new Map()
  for (const sec of canonicalDoc?.sections || []) {
    for (const n of sec.nodes || []) {
      nodeMap[n.id] = n
      sourceNodeToSection.set(n.id, sec.id)
    }
  }

  const allSourceIds = new Set(Object.keys(nodeMap))
  const insertedIds = new Set(Object.keys(structured.insertedNodes || {}))

  // Check collision between source node IDs and inserted node IDs
  const nodeCol = checkCollision(insertedIds, allSourceIds, 'insertedNodes', 'source nodes')
  if (!nodeCol.valid) return nodeCol

  // 1. Validate structuredPatches
  for (const [nodeId, patch] of Object.entries(structured.structuredPatches || {})) {
    const baseline = nodeMap[nodeId]
    const r = validateStructuredPatch(patch, baseline)
    if (!r.valid) return r
  }

  // 2. Validate deletedNodeIds — must exist in source, baseline-only, no duplicates
  const delNodeRes = validateDeletedIds(structured.deletedNodeIds || [], 'deletedNodeIds', allSourceIds, insertedIds)
  if (!delNodeRes.valid) return delNodeRes

  // 3. Validate insertedNodes
  for (const [nodeId, rec] of Object.entries(structured.insertedNodes || {})) {
    if (allSourceIds.has(nodeId)) return err(`insertedNode ID collides with source node: ${nodeId}`)
    if (rec.origin !== 'USER_CREATED') return err(`insertedNode ${nodeId} missing origin USER_CREATED`)
    if (rec.sourceSegmentIds !== null && (!Array.isArray(rec.sourceSegmentIds) || rec.sourceSegmentIds.length !== 0)) {
      return err(`insertedNode ${nodeId} sourceSegmentIds must be [] or null`)
    }
    if (rec.rawSourceSnapshot !== null) return err(`insertedNode ${nodeId} rawSourceSnapshot must be null`)
    // Forbidden answer-key fields
    for (const key of Object.keys(rec)) {
      if (FORBIDDEN_PATCH_KEYS.has(key) && rec[key] !== null) {
        return err(`Forbidden answer-key field '${key}' set to non-null in insertedNode ${nodeId}`)
      }
    }
    // Check MCQ options within inserted node
    if (Array.isArray(rec.options)) {
      for (const opt of rec.options) {
        if ('isCorrect' in opt && opt.isCorrect !== null) {
          return err(`Forbidden non-null isCorrect in insertedNode ${nodeId} option ${opt.id}`)
        }
      }
    }
  }

  // 4. Validate nodeOrderBySection & Section Ownership
  const deletedNodeSet = new Set(structured.deletedNodeIds || [])
  for (const [secId, order] of Object.entries(structured.nodeOrderBySection || {})) {
    if (!Array.isArray(order)) return err(`nodeOrderBySection[${secId}] must be an array`)
    const seen = new Set()
    for (const id of order) {
      if (seen.has(id)) return err(`nodeOrderBySection[${secId}] has duplicate id: ${id}`)
      seen.add(id)
      if (deletedNodeSet.has(id)) {
        return err(`nodeOrderBySection[${secId}] contains deleted node: ${id}`)
      }
      if (sourceNodeToSection.has(id)) {
        const expectedSec = sourceNodeToSection.get(id)
        if (expectedSec !== secId) {
          return err(`Source node ${id} belongs to section ${expectedSec}, but found in nodeOrderBySection[${secId}] (cross-section moves forbidden)`)
        }
      } else if (structured.insertedNodes?.[id]) {
        const ins = structured.insertedNodes[id]
        if (ins.sectionId !== secId) {
          return err(`Inserted node ${id} has sectionId '${ins.sectionId}', but found in nodeOrderBySection[${secId}]`)
        }
      } else {
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

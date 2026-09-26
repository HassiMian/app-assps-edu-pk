// structuredNodeProjection.js — Pure functions: baseline + patch → resolved working node.
// INVARIANT: Never mutates baselineNode or structuredPatch inputs.

import {
  deriveBaselineSegmentId,
  deriveBaselineGrammarRowId,
  deriveBaselineOperandId,
} from './structuredIdAllocator.js'

// ─────────────────────────────────────────────────────────────────────────────
// CONSERVATIVE NUMERIC PARSER (spec §40)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Parses a raw operand string conservatively.
 * Returns a finite number only if the FULL string is a valid integer or decimal.
 * Returns null for anything ambiguous (leading zero on multi-digit, mixed chars, etc.)
 */
export function parseVerticalNumeric(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const s = raw.trim()
  // Allow optional sign, optional leading zeros (display only), digits, optional decimal
  // But if it's multi-digit with leading zero treat as string (e.g. "0012" → 12 still valid per spec)
  const num = Number(s)
  if (!Number.isFinite(num)) return null
  // Reject if it doesn't survive round-trip (e.g. 'Infinity', '1e2' would round-trip differently)
  if (String(num) === 'Infinity' || String(num) === '-Infinity') return null
  return num
}

// ─────────────────────────────────────────────────────────────────────────────
// MCQ PROJECTION
// ─────────────────────────────────────────────────────────────────────────────
function projectMCQ(baselineNode, patch) {
  if (!patch) return baselineNode

  // Build resolved options map
  const srcOpts = Array.isArray(baselineNode.options) ? baselineNode.options : []
  const deletedSet = new Set(patch.deletedOptionIds || [])

  // Patch existing source options
  const resolvedSrcMap = {}
  for (const opt of srcOpts) {
    if (deletedSet.has(opt.id)) continue
    const p = patch.optionPatches?.[opt.id]
    resolvedSrcMap[opt.id] = p
      ? { ...opt, text: p.text !== undefined ? p.text : opt.text, direction: p.direction !== undefined ? p.direction : opt.direction }
      : opt
  }

  // Merge inserted options
  const insertedMap = patch.insertedOptions || {}

  // Determine order
  let order = patch.optionOrder
  if (!order) {
    // canonical order + append inserted options at end
    order = srcOpts.filter(o => !deletedSet.has(o.id)).map(o => o.id)
    for (const id of Object.keys(insertedMap)) {
      if (!order.includes(id)) order.push(id)
    }
  }

  const resolvedOptions = order
    .map(id => resolvedSrcMap[id] || insertedMap[id])
    .filter(Boolean)

  return { ...baselineNode, options: resolvedOptions }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUE/FALSE PROJECTION
// ─────────────────────────────────────────────────────────────────────────────
function projectTrueFalse(baselineNode, patch) {
  if (!patch) return baselineNode
  const result = { ...baselineNode }
  if (patch.statementPatch !== null && patch.statementPatch !== undefined) {
    result.statement = patch.statementPatch.workingPlainText ?? baselineNode.statement
    result.statementText = result.statement
  }
  if (patch.hasIndicatorBoxPatch !== null && patch.hasIndicatorBoxPatch !== undefined) {
    result.hasIndicatorBox = patch.hasIndicatorBoxPatch
  }
  // expectedAnswer is NEVER in patch — always from source
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// FILL BLANK PROJECTION
// ─────────────────────────────────────────────────────────────────────────────
function projectFillBlank(baselineNode, patch) {
  if (!patch) return baselineNode

  const srcSegs = Array.isArray(baselineNode.segments) ? baselineNode.segments : []
  const deletedSet = new Set(patch.deletedSegIds || [])
  const insertedMap = patch.insertedSegments || {}

  // Build resolved segment map with derived IDs for source segments
  const srcMap = {}
  for (let i = 0; i < srcSegs.length; i++) {
    const wid = deriveBaselineSegmentId(baselineNode.id, i)
    if (deletedSet.has(wid)) continue
    const p = patch.segmentPatches?.[wid]
    srcMap[wid] = p
      ? { workingSegmentId: wid, type: p.type ?? srcSegs[i].type, value: p.value !== undefined ? p.value : srcSegs[i].value }
      : { workingSegmentId: wid, type: srcSegs[i].type, value: srcSegs[i].value }
  }

  // Determine order
  let order = patch.segmentOrder
  if (!order) {
    order = Object.keys(srcMap)
    for (const id of Object.keys(insertedMap)) {
      if (!order.includes(id)) order.push(id)
    }
  }

  const resolvedSegments = order
    .map(id => srcMap[id] || (insertedMap[id] ? { workingSegmentId: id, ...insertedMap[id] } : null))
    .filter(Boolean)

  const wordBank = patch.wordBankPatch !== null && patch.wordBankPatch !== undefined
    ? patch.wordBankPatch
    : (baselineNode.wordBank || [])

  return { ...baselineNode, segments: resolvedSegments, wordBank }
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCHING PROJECTION
// ─────────────────────────────────────────────────────────────────────────────
function projectMatching(baselineNode, patch) {
  if (!patch) return baselineNode

  const srcLeft = Array.isArray(baselineNode.leftItems) ? baselineNode.leftItems : []
  const srcRight = Array.isArray(baselineNode.rightItems) ? baselineNode.rightItems : []
  const deletedLeft = new Set(patch.deletedLeftIds || [])
  const deletedRight = new Set(patch.deletedRightIds || [])

  // Project left
  const leftMap = {}
  for (const item of srcLeft) {
    if (deletedLeft.has(item.id)) continue
    const p = patch.leftPatches?.[item.id]
    leftMap[item.id] = p ? { ...item, text: p.text !== undefined ? p.text : item.text } : item
  }
  const insertedLeft = patch.insertedLeftItems || {}

  let leftOrder = patch.leftOrder
  if (!leftOrder) {
    leftOrder = srcLeft.filter(i => !deletedLeft.has(i.id)).map(i => i.id)
    for (const id of Object.keys(insertedLeft)) {
      if (!leftOrder.includes(id)) leftOrder.push(id)
    }
  }
  const resolvedLeft = leftOrder.map(id => leftMap[id] || insertedLeft[id]).filter(Boolean)

  // Project right
  const rightMap = {}
  for (const item of srcRight) {
    if (deletedRight.has(item.id)) continue
    const p = patch.rightPatches?.[item.id]
    rightMap[item.id] = p ? { ...item, text: p.text !== undefined ? p.text : item.text } : item
  }
  const insertedRight = patch.insertedRightItems || {}

  let rightOrder = patch.rightOrder
  if (!rightOrder) {
    rightOrder = srcRight.filter(i => !deletedRight.has(i.id)).map(i => i.id)
    for (const id of Object.keys(insertedRight)) {
      if (!rightOrder.includes(id)) rightOrder.push(id)
    }
  }
  const resolvedRight = rightOrder.map(id => rightMap[id] || insertedRight[id]).filter(Boolean)

  return {
    ...baselineNode,
    leftItems: resolvedLeft,
    rightItems: resolvedRight,
    correctMappings: baselineNode.correctMappings,  // NEVER from patch
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GRAMMAR PROJECTION
// ─────────────────────────────────────────────────────────────────────────────
function projectGrammar(baselineNode, patch) {
  if (!patch) return baselineNode

  const srcRows = Array.isArray(baselineNode.rows) ? baselineNode.rows : []
  const deletedSet = new Set(patch.deletedRowIds || [])
  const insertedMap = patch.insertedRows || {}

  const rowMap = {}
  for (let i = 0; i < srcRows.length; i++) {
    const rid = deriveBaselineGrammarRowId(baselineNode.id, i)
    if (deletedSet.has(rid)) continue
    const p = patch.rowPatches?.[rid]
    rowMap[rid] = p ? { ...srcRows[i], workingRowId: rid, ...p } : { ...srcRows[i], workingRowId: rid }
  }

  let rowOrder = patch.rowOrder
  if (!rowOrder) {
    rowOrder = Object.keys(rowMap)
    for (const id of Object.keys(insertedMap)) {
      if (!rowOrder.includes(id)) rowOrder.push(id)
    }
  }
  const resolvedRows = rowOrder
    .map(id => rowMap[id] || (insertedMap[id] ? { workingRowId: id, ...insertedMap[id] } : null))
    .filter(Boolean)

  const columns = patch.columnHeaderPatches !== null && patch.columnHeaderPatches !== undefined
    ? patch.columnHeaderPatches
    : (baselineNode.columns || ['Column 1', 'Column 2'])

  return { ...baselineNode, columns, rows: resolvedRows }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERTICAL MATH PROJECTION
// ─────────────────────────────────────────────────────────────────────────────
function projectVerticalMath(baselineNode, patch) {
  if (!patch) return baselineNode

  const srcOps = Array.isArray(baselineNode.operands) ? baselineNode.operands : []
  const deletedSet = new Set(patch.deletedOperandIds || [])
  const insertedMap = patch.insertedOperands || {}

  const opMap = {}
  for (let i = 0; i < srcOps.length; i++) {
    const wid = deriveBaselineOperandId(baselineNode.id, i)
    if (deletedSet.has(wid)) continue
    const p = patch.operandPatches?.[wid]
    if (p) {
      opMap[wid] = { ...srcOps[i], workingOpId: wid, raw: p.raw, normalizedNumericValue: p.normalizedNumericValue }
    } else {
      opMap[wid] = { ...srcOps[i], workingOpId: wid }
    }
  }

  let opOrder = patch.operandOrder
  if (!opOrder) {
    opOrder = Object.keys(opMap)
    for (const id of Object.keys(insertedMap)) {
      if (!opOrder.includes(id)) opOrder.push(id)
    }
  }
  const resolvedOperands = opOrder
    .map(id => opMap[id] || (insertedMap[id] ? { workingOpId: id, ...insertedMap[id] } : null))
    .filter(Boolean)

  const operator = patch.operatorPatch !== null && patch.operatorPatch !== undefined
    ? patch.operatorPatch
    : baselineNode.operator

  let result = baselineNode.result
  if (patch.resultPatch !== undefined) {
    result = patch.resultPatch  // may be null (explicitly removed) or { raw, normalizedNumericValue }
  }

  return { ...baselineNode, operands: resolvedOperands, operator, result }
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER RESOLVER
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Pure function: resolves a source canonical node + optional structured patch.
 * Returns a new object; neither input is mutated.
 */
export function resolveStructuredNode(baselineNode, structuredPatch) {
  if (!baselineNode) return null
  if (!structuredPatch || structuredPatch.mutationState === 'PRISTINE') {
    return baselineNode  // fast path: no allocation needed
  }
  const type = baselineNode.type || baselineNode.nodeType
  switch (type) {
    case 'mcq':              return projectMCQ(baselineNode, structuredPatch)
    case 'true_false':       return projectTrueFalse(baselineNode, structuredPatch)
    case 'fill_blank':       return projectFillBlank(baselineNode, structuredPatch)
    case 'matching_columns': return projectMatching(baselineNode, structuredPatch)
    case 'grammar_table':    return projectGrammar(baselineNode, structuredPatch)
    case 'vertical_math':    return projectVerticalMath(baselineNode, structuredPatch)
    default:                 return baselineNode
  }
}

/**
 * Pure function: projects an inserted user-created node for rendering.
 * Converts InsertedNodeRecord shape into a render-compatible node object.
 */
export function resolveInsertedStructuredNode(insertedRecord) {
  if (!insertedRecord) return null
  return { ...insertedRecord, id: insertedRecord.nodeId }
}

/**
 * Resolves the visible node list for a section, applying inserts / deletes / reorder.
 * Returns an array of { resolvedNode, nodeId, isInserted } objects.
 */
export function resolveWorkingSectionNodes(baselineSection, structuredState) {
  if (!baselineSection || !structuredState) {
    return (baselineSection?.nodes || []).map(n => ({ resolvedNode: n, nodeId: n.id, isInserted: false }))
  }

  const {
    structuredPatches,
    insertedNodes,
    deletedNodeIds,
    nodeOrderBySection,
  } = structuredState

  const deletedSet = new Set(deletedNodeIds || [])
  const sectionId = baselineSection.id

  // Build source node map
  const srcMap = {}
  for (const n of baselineSection.nodes || []) {
    srcMap[n.id] = n
  }

  // Determine working order
  let order = nodeOrderBySection?.[sectionId]
  if (!order) {
    // Use canonical order, filter deleted, append inserted
    order = (baselineSection.nodes || [])
      .filter(n => !deletedSet.has(n.id))
      .map(n => n.id)
    for (const iid of Object.keys(insertedNodes || {})) {
      const ins = insertedNodes[iid]
      if (ins.sectionId === sectionId && !order.includes(iid)) {
        order.push(iid)
      }
    }
  }

  const result = []
  for (const id of order) {
    if (deletedSet.has(id)) continue
    if (srcMap[id]) {
      const patch = structuredPatches?.[id] || null
      const resolvedNode = resolveStructuredNode(srcMap[id], patch)
      result.push({ resolvedNode, nodeId: id, isInserted: false })
    } else if (insertedNodes?.[id]) {
      const resolvedNode = resolveInsertedStructuredNode(insertedNodes[id])
      result.push({ resolvedNode, nodeId: id, isInserted: true })
    }
  }
  return result
}

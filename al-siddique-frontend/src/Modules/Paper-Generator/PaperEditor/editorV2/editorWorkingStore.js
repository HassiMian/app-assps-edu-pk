// editorWorkingStore.js — In-Memory Working Document Controller (B4 Schema 3.2-W)
import {
  computeFieldDirtyState,
  computeCanonicalFingerprint,
  extractPlainTextFromTiptap,
} from './editorProjection.js'
import {
  createEditorWorkingDocument,
} from './createEditorWorkingDocument.js'
import {
  parseFieldKey,
  buildFieldKey,
} from './EditorFieldRegistry.js'
import {
  StructuredIdAllocator,
} from './structured/structuredIdAllocator.js'
import { CMD } from './structured/structuredCommands.js'
import { StructuredCommandHistory } from './structured/StructuredCommandHistory.js'
import {
  createMcqPatch,
  createTrueFalsePatch,
  createFillBlankPatch,
  createMatchingPatch,
  createGrammarPatch,
  createVerticalMathPatch,
  STRUCTURED_MUTATION,
  createInsertedOption,
} from './structured/structuredNodeModel.js'
import {
  deriveBaselineSegmentId,
  deriveBaselineGrammarRowId,
  deriveBaselineOperandId,
} from './structured/structuredIdAllocator.js'
import { exportStructuredBlock, computeMaxSequenceFromStructured } from './structured/structuredDraftV2.js'
import { validateV2StructuredBlock } from './structured/structuredPatchValidator.js'
import { parseVerticalNumeric, resolveWorkingSectionNodes } from './structured/structuredNodeProjection.js'

function applyFieldPatchToDoc(doc, fieldKey, patch) {
  const { sectionId, nodeId, fieldName } = parseFieldKey(fieldKey)
  const section = doc.sections.find(s => s.id === sectionId)
  if (!section) return false
  const nodeOverlay = section.nodeOverlays.find(n => n.nodeId === nodeId)
  if (!nodeOverlay) return false
  const fieldOverlay = nodeOverlay.editableFields?.[fieldName]
  if (!fieldOverlay) return false

  const workingRich = patch.workingRich
  const resolvedPlainText = patch.workingPlainText !== null && patch.workingPlainText !== undefined
    ? patch.workingPlainText
    : extractPlainTextFromTiptap(workingRich)

  const dirtyCheck = computeFieldDirtyState(
    workingRich,
    fieldOverlay.baselineRich,
    resolvedPlainText,
    fieldOverlay.baselinePlainText
  )

  fieldOverlay.workingRich = dirtyCheck.sanitizedWorking
  fieldOverlay.workingPlainText = resolvedPlainText
  fieldOverlay.isDirty = dirtyCheck.isDirty
  fieldOverlay.academicTextMutated = dirtyCheck.academicTextMutated
  fieldOverlay.mutationState = dirtyCheck.mutationState
  nodeOverlay.provenance.academicTextMutated = dirtyCheck.academicTextMutated
  return true
}

/**
 * Deep freezes an object recursively to guarantee immutability.
 */
export function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object' || Object.isFrozen(obj)) return obj
  Object.freeze(obj)
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (obj[prop] !== null && typeof obj[prop] === 'object' && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop])
    }
  })
  return obj
}

export class EditorWorkingStore {
  constructor(canonicalDoc) {
    if (!canonicalDoc) throw new Error('EditorWorkingStore requires a canonical document')
    // Baseline canonical document is frozen to guarantee zero mutations
    this._baselineDoc = deepFreeze(JSON.parse(JSON.stringify(canonicalDoc)))
    this._workingDoc = createEditorWorkingDocument(canonicalDoc)
    this._listeners = new Set()
    this._structuredHistory = new StructuredCommandHistory()
    this._idAllocator = new StructuredIdAllocator(
      canonicalDoc.id,
      this._workingDoc.structured?.nextUserStructureSequence || 1
    )
  }

  getBaselineDocument() { return this._baselineDoc }
  getWorkingDocument() { return this._workingDoc }
  getStructuredHistory() { return this._structuredHistory }
  getIdAllocator() { return this._idAllocator }

  isDirty() {
    return Boolean(this._workingDoc?.session?.isDirty)
  }

  subscribe(listener) {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  _notify() {
    for (const listener of this._listeners) {
      try { listener(this._workingDoc) } catch (err) { console.error('EditorWorkingStore listener error:', err) }
    }
  }

  publishDocumentChange() { this._notify() }

  // ─────────────────────────────────────────────────────────────────────────
  // B3 FIELD OPERATIONS (unchanged interface)
  // ─────────────────────────────────────────────────────────────────────────
  findFieldOverlay(fieldKey) {
    const { sectionId, nodeId, fieldName } = parseFieldKey(fieldKey)
    const section = this._workingDoc.sections.find(s => s.id === sectionId)
    if (!section) return null
    const nodeOverlay = section.nodeOverlays.find(n => n.nodeId === nodeId)
    if (!nodeOverlay) return null
    return nodeOverlay.editableFields?.[fieldName] || null
  }

  /**
   * Updates an individual field overlay in place without full paper cloning.
   * notifyMode: 'NONE' | 'NORMAL' (default NORMAL only on PRISTINE→DIRTY or explicit)
   */
  updateField(fieldKey, workingRich, workingPlainText = null, { publishDocument = false, notifyMode = 'NORMAL' } = {}) {
    const { sectionId, nodeId, fieldName } = parseFieldKey(fieldKey)
    const section = this._workingDoc.sections.find(s => s.id === sectionId)
    if (!section) return null
    const nodeOverlay = section.nodeOverlays.find(n => n.nodeId === nodeId)
    if (!nodeOverlay) return null
    const fieldOverlay = nodeOverlay.editableFields?.[fieldName]
    if (!fieldOverlay) return null

    const resolvedPlainText = workingPlainText !== null
      ? workingPlainText
      : extractPlainTextFromTiptap(workingRich)

    const dirtyCheck = computeFieldDirtyState(
      workingRich,
      fieldOverlay.baselineRich,
      resolvedPlainText,
      fieldOverlay.baselinePlainText
    )

    fieldOverlay.workingRich = dirtyCheck.sanitizedWorking
    fieldOverlay.workingPlainText = resolvedPlainText
    fieldOverlay.isDirty = dirtyCheck.isDirty
    fieldOverlay.academicTextMutated = dirtyCheck.academicTextMutated
    fieldOverlay.mutationState = dirtyCheck.mutationState
    nodeOverlay.provenance.academicTextMutated = dirtyCheck.academicTextMutated

    let docDirty = false
    outer: for (const sec of this._workingDoc.sections) {
      for (const node of sec.nodeOverlays) {
        for (const f of Object.values(node.editableFields || {})) {
          if (f.isDirty) { docDirty = true; break outer }
        }
      }
    }

    const previousDocDirty = this._workingDoc.session.isDirty
    this._workingDoc.session.isDirty = docDirty

    // Fix spec §21: NONE mode never notifies (even on first PRISTINE→DIRTY)
    if (notifyMode !== 'NONE') {
      if (publishDocument || (!previousDocDirty && docDirty)) {
        this._notify()
      }
    }
    return fieldOverlay
  }

  // ─────────────────────────────────────────────────────────────────────────
  // B4 STRUCTURED STATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  _getOrCreatePatch(nodeId, nodeType) {
    const s = this._workingDoc.structured
    if (s.structuredPatches[nodeId]) return s.structuredPatches[nodeId]
    let patch
    switch (nodeType) {
      case 'mcq':              patch = createMcqPatch(nodeId); break
      case 'true_false':       patch = createTrueFalsePatch(nodeId); break
      case 'fill_blank':       patch = createFillBlankPatch(nodeId); break
      case 'matching_columns': patch = createMatchingPatch(nodeId); break
      case 'grammar_table':    patch = createGrammarPatch(nodeId); break
      case 'vertical_math':    patch = createVerticalMathPatch(nodeId); break
      default:                 throw new Error(`Unknown structured node type: ${nodeType}`)
    }
    s.structuredPatches[nodeId] = patch
    return patch
  }

  _markStructuralDirty() {
    this._workingDoc.session.isDirty = true
    this._workingDoc.structured.nextUserStructureSequence = this._idAllocator.serialize()
    this._workingDoc.session.structuralRevisionToken = (this._workingDoc.session.structuralRevisionToken || 1) + 1
  }

  _getBaselineNode(nodeId) {
    for (const sec of this._baselineDoc.sections || []) {
      for (const n of sec.nodes || []) {
        if (n.id === nodeId) return n
      }
    }
    return null
  }

  _getBaselineSection(sectionId) {
    return this._baselineDoc.sections?.find(s => s.id === sectionId) || null
  }

  _getSectionNodeOrder(sectionId) {
    const s = this._workingDoc.structured
    if (s.nodeOrderBySection[sectionId]) return s.nodeOrderBySection[sectionId]
    // Initialize from canonical + inserted
    const blSec = this._getBaselineSection(sectionId)
    const deletedSet = new Set(s.deletedNodeIds || [])
    const order = (blSec?.nodes || [])
      .filter(n => !deletedSet.has(n.id))
      .map(n => n.id)
    for (const [id, ins] of Object.entries(s.insertedNodes || {})) {
      if (ins.sectionId === sectionId && !order.includes(id)) order.push(id)
    }
    s.nodeOrderBySection[sectionId] = order
    return order
  }

  getSectionWorkingNodeOrder(sectionId) {
    return [...this._getSectionNodeOrder(sectionId)]
  }

  _allocate(sectionId, kind) {
    return this._idAllocator.allocate(sectionId, kind)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // APPLY STRUCTURAL COMMAND (dispatcher)
  // ─────────────────────────────────────────────────────────────────────────
  applyStructuralCommand(cmd) {
    const { type, nodeId, sectionId, payload } = cmd

    switch (type) {
      // MCQ
      case CMD.UPDATE_MCQ_OPTION_TEXT: {
        const p = this._getOrCreatePatch(nodeId, 'mcq')
        p.optionPatches[payload.optionId] = { ...(p.optionPatches[payload.optionId] || {}), text: payload.text }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.ADD_MCQ_OPTION: {
        const p = this._getOrCreatePatch(nodeId, 'mcq')
        const bl = this._getBaselineNode(nodeId)
        const isBaseline = (bl?.options || []).some(o => o.id === payload.newOption.id)
        if (isBaseline) {
          p.deletedOptionIds = (p.deletedOptionIds || []).filter(id => id !== payload.newOption.id)
        } else {
          p.insertedOptions[payload.newOption.id] = payload.newOption
        }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        // Update order
        const curOrder = p.optionOrder || (bl?.options || []).filter(o => !(p.deletedOptionIds || []).includes(o.id)).map(o => o.id)
        const idx = payload.afterId ? curOrder.indexOf(payload.afterId) : -1
        const newOrder = [...curOrder]
        newOrder.splice(idx >= 0 ? idx + 1 : newOrder.length, 0, payload.newOption.id)
        p.optionOrder = newOrder
        break
      }
      case CMD.REMOVE_MCQ_OPTION: {
        const p = this._getOrCreatePatch(nodeId, 'mcq')
        const isInserted = Boolean(p.insertedOptions && p.insertedOptions[payload.optionId])
        if (isInserted) {
          delete p.insertedOptions[payload.optionId]
          if (p.optionPatches) delete p.optionPatches[payload.optionId]
        } else {
          if (!p.deletedOptionIds.includes(payload.optionId)) p.deletedOptionIds.push(payload.optionId)
        }
        const bl = this._getBaselineNode(nodeId)
        const curOrder = p.optionOrder || (bl?.options || []).map(o => o.id)
        p.optionOrder = curOrder.filter(id => id !== payload.optionId)
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.REORDER_MCQ_OPTIONS: {
        const p = this._getOrCreatePatch(nodeId, 'mcq')
        p.optionOrder = payload.optionOrder
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      // True/False
      case CMD.UPDATE_TF_STATEMENT: {
        const p = this._getOrCreatePatch(nodeId, 'true_false')
        p.statementPatch = { workingPlainText: payload.text }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.UPDATE_TF_INDICATOR: {
        const p = this._getOrCreatePatch(nodeId, 'true_false')
        p.hasIndicatorBoxPatch = payload.hasIndicatorBox
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      // Fill Blank
      case CMD.UPDATE_FILL_SEGMENT_TEXT: {
        const p = this._getOrCreatePatch(nodeId, 'fill_blank')
        p.segmentPatches[payload.segId] = { ...(p.segmentPatches[payload.segId] || {}), value: payload.value }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.INSERT_FILL_SEGMENT: {
        const p = this._getOrCreatePatch(nodeId, 'fill_blank')
        const bl = this._getBaselineNode(nodeId)
        const srcSegIds = new Set((bl?.segments || []).map((_, i) => deriveBaselineSegmentId(nodeId, i)))
        if (srcSegIds.has(payload.newSeg.id)) {
          p.deletedSegIds = (p.deletedSegIds || []).filter(id => id !== payload.newSeg.id)
        } else {
          p.insertedSegments[payload.newSeg.id] = payload.newSeg
        }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        // Update order
        const curOrder = p.segmentOrder || (bl?.segments || []).map((_, i) => deriveBaselineSegmentId(nodeId, i)).filter(id => !(p.deletedSegIds || []).includes(id))
        const idx = payload.afterSegId ? curOrder.indexOf(payload.afterSegId) : -1
        const newOrder = [...curOrder]
        newOrder.splice(idx >= 0 ? idx + 1 : newOrder.length, 0, payload.newSeg.id)
        p.segmentOrder = newOrder
        break
      }
      case CMD.REMOVE_FILL_SEGMENT: {
        const p = this._getOrCreatePatch(nodeId, 'fill_blank')
        const isInserted = Boolean(p.insertedSegments && p.insertedSegments[payload.segId])
        if (isInserted) {
          delete p.insertedSegments[payload.segId]
          if (p.segmentPatches) delete p.segmentPatches[payload.segId]
        } else {
          if (!p.deletedSegIds.includes(payload.segId)) p.deletedSegIds.push(payload.segId)
        }
        const bl = this._getBaselineNode(nodeId)
        const curOrder = p.segmentOrder || (bl?.segments || []).map((_, i) => deriveBaselineSegmentId(nodeId, i))
        p.segmentOrder = curOrder.filter(id => id !== payload.segId)
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.REORDER_FILL_SEGMENTS: {
        const p = this._getOrCreatePatch(nodeId, 'fill_blank')
        p.segmentOrder = payload.segmentOrder
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.UPDATE_WORD_BANK: {
        const p = this._getOrCreatePatch(nodeId, 'fill_blank')
        p.wordBankPatch = payload.wordBank
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      // Matching
      case CMD.UPDATE_MATCHING_LEFT: {
        const p = this._getOrCreatePatch(nodeId, 'matching_columns')
        p.leftPatches[payload.itemId] = { ...(p.leftPatches[payload.itemId] || {}), text: payload.text }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.UPDATE_MATCHING_RIGHT: {
        const p = this._getOrCreatePatch(nodeId, 'matching_columns')
        p.rightPatches[payload.itemId] = { ...(p.rightPatches[payload.itemId] || {}), text: payload.text }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.ADD_MATCHING_LEFT: {
        const p = this._getOrCreatePatch(nodeId, 'matching_columns')
        const bl = this._getBaselineNode(nodeId)
        const isBaseline = (bl?.leftItems || []).some(i => i.id === payload.newItem.id)
        if (isBaseline) {
          p.deletedLeftIds = (p.deletedLeftIds || []).filter(id => id !== payload.newItem.id)
        } else {
          p.insertedLeftItems[payload.newItem.id] = payload.newItem
        }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        const curOrder = p.leftOrder || (bl?.leftItems || []).filter(i => !(p.deletedLeftIds || []).includes(i.id)).map(i => i.id)
        p.leftOrder = [...curOrder, payload.newItem.id]
        break
      }
      case CMD.REMOVE_MATCHING_LEFT: {
        const p = this._getOrCreatePatch(nodeId, 'matching_columns')
        const isInserted = Boolean(p.insertedLeftItems && p.insertedLeftItems[payload.itemId])
        if (isInserted) {
          delete p.insertedLeftItems[payload.itemId]
          if (p.leftPatches) delete p.leftPatches[payload.itemId]
        } else {
          if (!p.deletedLeftIds.includes(payload.itemId)) p.deletedLeftIds.push(payload.itemId)
        }
        const bl = this._getBaselineNode(nodeId)
        const curOrder = p.leftOrder || (bl?.leftItems || []).map(i => i.id)
        p.leftOrder = curOrder.filter(id => id !== payload.itemId)
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.ADD_MATCHING_RIGHT: {
        const p = this._getOrCreatePatch(nodeId, 'matching_columns')
        const bl = this._getBaselineNode(nodeId)
        const isBaseline = (bl?.rightItems || []).some(i => i.id === payload.newItem.id)
        if (isBaseline) {
          p.deletedRightIds = (p.deletedRightIds || []).filter(id => id !== payload.newItem.id)
        } else {
          p.insertedRightItems[payload.newItem.id] = payload.newItem
        }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        const curOrder = p.rightOrder || (bl?.rightItems || []).filter(i => !(p.deletedRightIds || []).includes(i.id)).map(i => i.id)
        p.rightOrder = [...curOrder, payload.newItem.id]
        break
      }
      case CMD.REMOVE_MATCHING_RIGHT: {
        const p = this._getOrCreatePatch(nodeId, 'matching_columns')
        const isInserted = Boolean(p.insertedRightItems && p.insertedRightItems[payload.itemId])
        if (isInserted) {
          delete p.insertedRightItems[payload.itemId]
          if (p.rightPatches) delete p.rightPatches[payload.itemId]
        } else {
          if (!p.deletedRightIds.includes(payload.itemId)) p.deletedRightIds.push(payload.itemId)
        }
        const bl = this._getBaselineNode(nodeId)
        const curOrder = p.rightOrder || (bl?.rightItems || []).map(i => i.id)
        p.rightOrder = curOrder.filter(id => id !== payload.itemId)
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.REORDER_MATCHING_LEFT: {
        const p = this._getOrCreatePatch(nodeId, 'matching_columns')
        p.leftOrder = payload.order
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.REORDER_MATCHING_RIGHT: {
        const p = this._getOrCreatePatch(nodeId, 'matching_columns')
        p.rightOrder = payload.order
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      // Grammar
      case CMD.UPDATE_GRAMMAR_HEADERS: {
        const p = this._getOrCreatePatch(nodeId, 'grammar_table')
        p.columnHeaderPatches = payload.headers
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.UPDATE_GRAMMAR_CELL: {
        const p = this._getOrCreatePatch(nodeId, 'grammar_table')
        p.rowPatches[payload.rowId] = {
          ...(p.rowPatches[payload.rowId] || {}),
          [payload.side === 'left' ? 'leftText' : 'rightText']: payload.value,
        }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.TOGGLE_GRAMMAR_BLANK: {
        const p = this._getOrCreatePatch(nodeId, 'grammar_table')
        p.rowPatches[payload.rowId] = {
          ...(p.rowPatches[payload.rowId] || {}),
          [payload.side === 'left' ? 'leftIsBlank' : 'rightIsBlank']: payload.isBlank,
        }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.ADD_GRAMMAR_ROW: {
        const p = this._getOrCreatePatch(nodeId, 'grammar_table')
        const bl = this._getBaselineNode(nodeId)
        const srcRowIds = new Set((bl?.rows || []).map((_, i) => deriveBaselineGrammarRowId(nodeId, i)))
        if (srcRowIds.has(payload.newRow.id)) {
          p.deletedRowIds = (p.deletedRowIds || []).filter(id => id !== payload.newRow.id)
        } else {
          p.insertedRows[payload.newRow.id] = payload.newRow
        }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        const curOrder = p.rowOrder || (bl?.rows || []).map((_, i) => deriveBaselineGrammarRowId(nodeId, i)).filter(id => !(p.deletedRowIds || []).includes(id))
        const idx = payload.afterRowId ? curOrder.indexOf(payload.afterRowId) : -1
        const newOrder = [...curOrder]
        newOrder.splice(idx >= 0 ? idx + 1 : newOrder.length, 0, payload.newRow.id)
        p.rowOrder = newOrder
        break
      }
      case CMD.REMOVE_GRAMMAR_ROW: {
        const p = this._getOrCreatePatch(nodeId, 'grammar_table')
        const isInserted = Boolean(p.insertedRows && p.insertedRows[payload.rowId])
        if (isInserted) {
          delete p.insertedRows[payload.rowId]
          if (p.rowPatches) delete p.rowPatches[payload.rowId]
        } else {
          if (!p.deletedRowIds.includes(payload.rowId)) p.deletedRowIds.push(payload.rowId)
        }
        const bl = this._getBaselineNode(nodeId)
        const curOrder = p.rowOrder || (bl?.rows || []).map((_, i) => deriveBaselineGrammarRowId(nodeId, i))
        p.rowOrder = curOrder.filter(id => id !== payload.rowId)
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.REORDER_GRAMMAR_ROWS: {
        const p = this._getOrCreatePatch(nodeId, 'grammar_table')
        p.rowOrder = payload.rowOrder
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      // Vertical Math
      case CMD.UPDATE_VERTICAL_OPERAND: {
        const p = this._getOrCreatePatch(nodeId, 'vertical_math')
        p.operandPatches[payload.opId] = { raw: payload.raw, normalizedNumericValue: payload.normalizedNumericValue }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.ADD_VERTICAL_OPERAND: {
        const p = this._getOrCreatePatch(nodeId, 'vertical_math')
        const bl = this._getBaselineNode(nodeId)
        const srcOpIds = new Set((bl?.operands || []).map((_, i) => deriveBaselineOperandId(nodeId, i)))
        if (srcOpIds.has(payload.newOp.id)) {
          p.deletedOperandIds = (p.deletedOperandIds || []).filter(id => id !== payload.newOp.id)
        } else {
          p.insertedOperands[payload.newOp.id] = payload.newOp
        }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        const curOrder = p.operandOrder || (bl?.operands || []).map((_, i) => deriveBaselineOperandId(nodeId, i)).filter(id => !(p.deletedOperandIds || []).includes(id))
        const idx = payload.afterOpId ? curOrder.indexOf(payload.afterOpId) : -1
        const newOrder = [...curOrder]
        newOrder.splice(idx >= 0 ? idx + 1 : newOrder.length, 0, payload.newOp.id)
        p.operandOrder = newOrder
        break
      }
      case CMD.REMOVE_VERTICAL_OPERAND: {
        const p = this._getOrCreatePatch(nodeId, 'vertical_math')
        const isInserted = Boolean(p.insertedOperands && p.insertedOperands[payload.opId])
        if (isInserted) {
          delete p.insertedOperands[payload.opId]
          if (p.operandPatches) delete p.operandPatches[payload.opId]
        } else {
          if (!p.deletedOperandIds.includes(payload.opId)) p.deletedOperandIds.push(payload.opId)
        }
        const bl = this._getBaselineNode(nodeId)
        const curOrder = p.operandOrder || (bl?.operands || []).map((_, i) => deriveBaselineOperandId(nodeId, i))
        p.operandOrder = curOrder.filter(id => id !== payload.opId)
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.REORDER_VERTICAL_OPERANDS: {
        const p = this._getOrCreatePatch(nodeId, 'vertical_math')
        p.operandOrder = payload.operandOrder
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.UPDATE_VERTICAL_OPERATOR: {
        const p = this._getOrCreatePatch(nodeId, 'vertical_math')
        p.operatorPatch = payload.operator
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.SET_VERTICAL_RESULT: {
        const p = this._getOrCreatePatch(nodeId, 'vertical_math')
        p.resultPatch = { raw: payload.raw, normalizedNumericValue: payload.normalizedNumericValue }
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.REMOVE_VERTICAL_RESULT: {
        const p = this._getOrCreatePatch(nodeId, 'vertical_math')
        p.resultPatch = null
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      // Node operations
      case CMD.INSERT_NODE: {
        const s = this._workingDoc.structured
        s.insertedNodes[nodeId] = payload.insertedRecord
        const order = this._getSectionNodeOrder(sectionId)
        const idx = payload.afterNodeId ? order.indexOf(payload.afterNodeId) : -1
        order.splice(idx >= 0 ? idx + 1 : order.length, 0, nodeId)
        break
      }
      case CMD.DELETE_NODE: {
        const s = this._workingDoc.structured
        const blNode = this._getBaselineNode(nodeId)
        if (blNode) {
          if (!s.deletedNodeIds.includes(nodeId)) s.deletedNodeIds.push(nodeId)
        } else {
          // User-created node: remove from insertedNodes and also purge from nodeOrderBySection
          delete s.insertedNodes[nodeId]
          // Purge from all section orders so the draft validator doesn't see a dangling reference
          for (const secId of Object.keys(s.nodeOrderBySection)) {
            const ord = s.nodeOrderBySection[secId]
            const i = ord.indexOf(nodeId)
            if (i >= 0) ord.splice(i, 1)
          }
        }
        const order = this._getSectionNodeOrder(sectionId)
        const idx = order.indexOf(nodeId)
        if (idx >= 0) order.splice(idx, 1)
        break
      }
      case CMD.UNDELETE_NODE: {
        const s = this._workingDoc.structured
        s.deletedNodeIds = s.deletedNodeIds.filter(id => id !== nodeId)
        // Restore position in order from prevOrder
        if (payload.prevOrder && s.nodeOrderBySection[sectionId]) {
          s.nodeOrderBySection[sectionId] = [...payload.prevOrder]
        }
        break
      }
      case CMD.DUPLICATE_NODE: {
        const s = this._workingDoc.structured
        s.insertedNodes[payload.newNodeId] = payload.insertedRecord
        const order = this._getSectionNodeOrder(sectionId)
        const idx = payload.afterNodeId ? order.indexOf(payload.afterNodeId) : order.indexOf(nodeId)
        order.splice(idx >= 0 ? idx + 1 : order.length, 0, payload.newNodeId)
        break
      }
      case CMD.MOVE_NODE: {
        const s = this._workingDoc.structured
        s.nodeOrderBySection[sectionId] = [...payload.newOrder]
        break
      }
      default:
        console.warn('Unknown structural command type:', type)
        return false
    }

    this._markStructuralDirty()
    return true
  }

  /**
   * Pushes a structural command to history and applies it.
   * Publishes ONE document update.
   */
  dispatchStructuralCommand(cmd) {
    this.applyStructuralCommand(cmd)
    this._structuredHistory.push(cmd)
    this._notify()
  }

  /**
   * Undo: pops undo stack, applies inverse command, publishes ONE update.
   */
  undoStructural() {
    const inverse = this._structuredHistory.undo()
    if (!inverse) return false
    this.applyStructuralCommand(inverse)
    this._notify()
    return true
  }

  /**
   * Redo: pops redo stack, applies command, publishes ONE update.
   */
  redoStructural() {
    const cmd = this._structuredHistory.redo()
    if (!cmd) return false
    this.applyStructuralCommand(cmd)
    this._notify()
    return true
  }

  canUndoStructural() {
    return this._structuredHistory.canUndo()
  }

  canRedoStructural() {
    return this._structuredHistory.canRedo()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRAFT EXPORT (V2)
  // ─────────────────────────────────────────────────────────────────────────
  exportCompactDraft({ forceV2 = false } = {}) {
    const fieldPatches = {}
    const docId = this._workingDoc.baseCanonicalDocumentId
    for (const sec of this._workingDoc.sections) {
      for (const node of sec.nodeOverlays) {
        for (const [fieldName, fieldOverlay] of Object.entries(node.editableFields || {})) {
          if (fieldOverlay.isDirty) {
            const key = buildFieldKey(docId, sec.id, node.nodeId, fieldName)
            fieldPatches[key] = {
              workingRich: fieldOverlay.workingRich,
              workingPlainText: fieldOverlay.workingPlainText,
              mutationState: fieldOverlay.mutationState,
              academicTextMutated: fieldOverlay.academicTextMutated,
            }
          }
        }
      }
    }

    const structured = exportStructuredBlock(this._workingDoc)
    structured.nextUserStructureSequence = this._idAllocator.serialize()

    const hasStructuredEdits =
      Object.keys(structured.structuredPatches || {}).length > 0 ||
      Object.keys(structured.insertedNodes || {}).length > 0 ||
      (structured.deletedNodeIds || []).length > 0 ||
      Object.keys(structured.nodeOrderBySection || {}).length > 0

    const isV2 = forceV2 || hasStructuredEdits

    const draft = {
      draftFormat: 'assps-canonical-working-draft',
      draftVersion: isV2 ? 2 : 1,
      baseCanonicalDocumentId: this._workingDoc.baseCanonicalDocumentId,
      baseFingerprint: this._workingDoc.baseFingerprint,
      savedAt: new Date().toISOString(),
      fieldPatches,
      presentationPatch: {
        zoomLevel: this._workingDoc.presentation.zoomLevel,
        templateId: this._workingDoc.presentation.templateId,
      },
    }

    if (isV2) {
      draft.structured = structured
    }

    return draft
  }

  exportCompactDraftV2() {
    return this.exportCompactDraft({ forceV2: true })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TRUE ATOMIC DRAFT APPLY (spec §21, §22)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Applies a compact draft (V1 or V2) atomically.
   * Strategy: build a fresh candidate working doc from baseline, apply all patches
   * to the candidate, then swap _workingDoc only on complete success.
   * Publishes exactly ONE document-level notification on success.
   */
  applyCompactDraft(compactDraft) {
    if (!compactDraft || compactDraft.draftFormat !== 'assps-canonical-working-draft') {
      return { status: 'INVALID_DRAFT', error: 'Invalid compact draft format' }
    }
    if (compactDraft.baseFingerprint !== this._workingDoc.baseFingerprint) {
      return { status: 'BASELINE_MISMATCH' }
    }

    const patches = compactDraft.fieldPatches || {}
    const structured = compactDraft.structured || null

    // 1. PREFLIGHT text patches: all keys must resolve
    for (const fieldKey of Object.keys(patches)) {
      const field = this.findFieldOverlay(fieldKey)
      if (!field) {
        return { status: 'INVALID_DRAFT', error: `UNKNOWN_FIELD: '${fieldKey}' not found` }
      }
    }

    // 2. PREFLIGHT structured block (V2 only)
    if (structured && compactDraft.draftVersion === 2) {
      const sv = validateV2StructuredBlock(structured, this._baselineDoc)
      if (!sv.valid) {
        return { status: 'INVALID_DRAFT', error: `Structured preflight: ${sv.error}` }
      }
    }

    // 3. TRUE ATOMIC APPLY: build candidate document and allocator from canonical baseline
    try {
      const candidateDoc = createEditorWorkingDocument(this._baselineDoc)
      const candidateAllocator = new StructuredIdAllocator(this._baselineDoc.id)

      // Apply all text patches silently to candidateDoc
      for (const [fieldKey, patch] of Object.entries(patches)) {
        const applied = applyFieldPatchToDoc(candidateDoc, fieldKey, patch)
        if (!applied) {
          return { status: 'INVALID_DRAFT', error: `UNKNOWN_FIELD: '${fieldKey}' not found in candidate` }
        }
      }

      // Compute dirty state on candidate
      let hasDirtyField = false
      for (const sec of candidateDoc.sections) {
        for (const node of sec.nodeOverlays) {
          for (const f of Object.values(node.editableFields || {})) {
            if (f.isDirty) { hasDirtyField = true; break }
          }
        }
      }

      // Apply complete structured block
      if (structured) {
        Object.assign(candidateDoc.structured, {
          structuredPatches: structured.structuredPatches ? JSON.parse(JSON.stringify(structured.structuredPatches)) : {},
          insertedNodes: structured.insertedNodes ? JSON.parse(JSON.stringify(structured.insertedNodes)) : {},
          deletedNodeIds: Array.isArray(structured.deletedNodeIds) ? [...structured.deletedNodeIds] : [],
          nodeOrderBySection: structured.nodeOrderBySection ? JSON.parse(JSON.stringify(structured.nodeOrderBySection)) : {},
          nextUserStructureSequence: structured.nextUserStructureSequence || 1,
        })
        // Advance candidate allocator
        const maxSeq = computeMaxSequenceFromStructured(structured)
        const savedSeq = structured.nextUserStructureSequence || 1
        candidateAllocator.advanceTo(Math.max(maxSeq, savedSeq - 1))
      }

      // Apply presentation patch
      if (compactDraft.presentationPatch) {
        Object.assign(candidateDoc.presentation, compactDraft.presentationPatch)
      }

      // Validate final candidate state
      for (const sec of candidateDoc.sections) {
        resolveWorkingSectionNodes(sec, candidateDoc.structured, this._baselineDoc)
      }

      // Candidate tokens and dirty flags
      candidateDoc.session.revisionToken = (this._workingDoc.session.revisionToken || 1) + 1
      candidateDoc.session.structuralRevisionToken = (this._workingDoc.session.structuralRevisionToken || 1) + 1
      candidateDoc.session.isDirty = hasDirtyField || (structured && Object.keys(structured.structuredPatches || {}).length > 0)

      // ONLY THEN swap candidate into _workingDoc and swap allocator
      this._workingDoc = candidateDoc
      this._idAllocator = candidateAllocator
      this._structuredHistory.clear()

      // Exactly ONE notification
      this._notify()

      return {
        status: 'APPLIED',
        patchCount: Object.keys(patches).length,
        structuredPatchCount: Object.keys(structured?.structuredPatches || {}).length,
      }
    } catch (err) {
      // Current _workingDoc and _idAllocator remain completely unchanged; zero notification
      return { status: 'INVALID_DRAFT', error: err.message }
    }
  }

  revertAllToBaseline() {
    for (const sec of this._workingDoc.sections) {
      for (const node of sec.nodeOverlays) {
        for (const fieldOverlay of Object.values(node.editableFields || {})) {
          fieldOverlay.workingRich = JSON.parse(JSON.stringify(fieldOverlay.baselineRich))
          fieldOverlay.workingPlainText = fieldOverlay.baselinePlainText
          fieldOverlay.isDirty = false
          fieldOverlay.academicTextMutated = false
          fieldOverlay.mutationState = 'PRISTINE'
        }
        node.provenance.academicTextMutated = false
      }
    }
    // Reset structured state
    Object.assign(this._workingDoc.structured, {
      structuredPatches: {},
      insertedNodes: {},
      deletedNodeIds: [],
      nodeOrderBySection: {},
      nextUserStructureSequence: 1,
    })
    this._structuredHistory.clear()
    this._workingDoc.session.isDirty = false
    this._workingDoc.session.revisionToken += 1
    this._workingDoc.session.structuralRevisionToken = (this._workingDoc.session.structuralRevisionToken || 1) + 1
    this.publishDocumentChange()
  }
}

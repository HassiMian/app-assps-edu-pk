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
import { parseVerticalNumeric } from './structured/structuredNodeProjection.js'

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
        p.insertedOptions[payload.newOption.id] = payload.newOption
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        // Update order
        const bl = this._getBaselineNode(nodeId)
        const curOrder = p.optionOrder || (bl?.options || []).map(o => o.id)
        const idx = payload.afterId ? curOrder.indexOf(payload.afterId) : -1
        const newOrder = [...curOrder]
        newOrder.splice(idx >= 0 ? idx + 1 : newOrder.length, 0, payload.newOption.id)
        p.optionOrder = newOrder
        break
      }
      case CMD.REMOVE_MCQ_OPTION: {
        const p = this._getOrCreatePatch(nodeId, 'mcq')
        if (!p.deletedOptionIds.includes(payload.optionId)) p.deletedOptionIds.push(payload.optionId)
        p.optionOrder = (p.optionOrder || []).filter(id => id !== payload.optionId)
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
        p.insertedSegments[payload.newSeg.id] = payload.newSeg
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        // Update order
        const bl = this._getBaselineNode(nodeId)
        const srcSegs = bl?.segments || []
        const curOrder = p.segmentOrder || srcSegs.map((_, i) => deriveBaselineSegmentId(nodeId, i))
        const idx = payload.afterSegId ? curOrder.indexOf(payload.afterSegId) : -1
        const newOrder = [...curOrder]
        newOrder.splice(idx >= 0 ? idx + 1 : newOrder.length, 0, payload.newSeg.id)
        p.segmentOrder = newOrder
        break
      }
      case CMD.REMOVE_FILL_SEGMENT: {
        const p = this._getOrCreatePatch(nodeId, 'fill_blank')
        if (!p.deletedSegIds.includes(payload.segId)) p.deletedSegIds.push(payload.segId)
        if (p.segmentOrder) p.segmentOrder = p.segmentOrder.filter(id => id !== payload.segId)
        if (p.insertedSegments[payload.segId]) delete p.insertedSegments[payload.segId]
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
        p.insertedLeftItems[payload.newItem.id] = payload.newItem
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        const bl = this._getBaselineNode(nodeId)
        const curOrder = p.leftOrder || (bl?.leftItems || []).map(i => i.id)
        p.leftOrder = [...curOrder, payload.newItem.id]
        break
      }
      case CMD.REMOVE_MATCHING_LEFT: {
        const p = this._getOrCreatePatch(nodeId, 'matching_columns')
        if (!p.deletedLeftIds.includes(payload.itemId)) p.deletedLeftIds.push(payload.itemId)
        if (p.leftOrder) p.leftOrder = p.leftOrder.filter(id => id !== payload.itemId)
        if (p.insertedLeftItems[payload.itemId]) delete p.insertedLeftItems[payload.itemId]
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        break
      }
      case CMD.ADD_MATCHING_RIGHT: {
        const p = this._getOrCreatePatch(nodeId, 'matching_columns')
        p.insertedRightItems[payload.newItem.id] = payload.newItem
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        const bl = this._getBaselineNode(nodeId)
        const curOrder = p.rightOrder || (bl?.rightItems || []).map(i => i.id)
        p.rightOrder = [...curOrder, payload.newItem.id]
        break
      }
      case CMD.REMOVE_MATCHING_RIGHT: {
        const p = this._getOrCreatePatch(nodeId, 'matching_columns')
        if (!p.deletedRightIds.includes(payload.itemId)) p.deletedRightIds.push(payload.itemId)
        if (p.rightOrder) p.rightOrder = p.rightOrder.filter(id => id !== payload.itemId)
        if (p.insertedRightItems[payload.itemId]) delete p.insertedRightItems[payload.itemId]
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
        p.insertedRows[payload.newRow.id] = payload.newRow
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        const bl = this._getBaselineNode(nodeId)
        const srcRows = bl?.rows || []
        const curOrder = p.rowOrder || srcRows.map((_, i) => deriveBaselineGrammarRowId(nodeId, i))
        const idx = payload.afterRowId ? curOrder.indexOf(payload.afterRowId) : -1
        const newOrder = [...curOrder]
        newOrder.splice(idx >= 0 ? idx + 1 : newOrder.length, 0, payload.newRow.id)
        p.rowOrder = newOrder
        break
      }
      case CMD.REMOVE_GRAMMAR_ROW: {
        const p = this._getOrCreatePatch(nodeId, 'grammar_table')
        if (!p.deletedRowIds.includes(payload.rowId)) p.deletedRowIds.push(payload.rowId)
        if (p.rowOrder) p.rowOrder = p.rowOrder.filter(id => id !== payload.rowId)
        if (p.insertedRows[payload.rowId]) delete p.insertedRows[payload.rowId]
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
        p.insertedOperands[payload.newOp.id] = payload.newOp
        p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        const bl = this._getBaselineNode(nodeId)
        const srcOps = bl?.operands || []
        const curOrder = p.operandOrder || srcOps.map((_, i) => deriveBaselineOperandId(nodeId, i))
        const idx = payload.afterOpId ? curOrder.indexOf(payload.afterOpId) : -1
        const newOrder = [...curOrder]
        newOrder.splice(idx >= 0 ? idx + 1 : newOrder.length, 0, payload.newOp.id)
        p.operandOrder = newOrder
        break
      }
      case CMD.REMOVE_VERTICAL_OPERAND: {
        const p = this._getOrCreatePatch(nodeId, 'vertical_math')
        if (!p.deletedOperandIds.includes(payload.opId)) p.deletedOperandIds.push(payload.opId)
        if (p.operandOrder) p.operandOrder = p.operandOrder.filter(id => id !== payload.opId)
        if (p.insertedOperands[payload.opId]) delete p.insertedOperands[payload.opId]
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
          // User-created node: remove from insertedNodes
          delete s.insertedNodes[nodeId]
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

    // 3. ALL GOOD — apply to _workingDoc directly (candidate approach for large docs is wasteful;
    //    since preflight is complete, in-place mutation is safe)
    // Apply field patches with NONE notify mode (no mid-apply notifications)
    for (const [fieldKey, patch] of Object.entries(patches)) {
      this.updateField(fieldKey, patch.workingRich, patch.workingPlainText, { notifyMode: 'NONE' })
    }

    // Apply structured block
    if (structured) {
      Object.assign(this._workingDoc.structured, {
        structuredPatches: structured.structuredPatches || {},
        insertedNodes: structured.insertedNodes || {},
        deletedNodeIds: Array.isArray(structured.deletedNodeIds) ? [...structured.deletedNodeIds] : [],
        nodeOrderBySection: structured.nodeOrderBySection || {},
        nextUserStructureSequence: structured.nextUserStructureSequence || 1,
      })
      // Advance ID allocator past all saved user IDs
      const maxSeq = computeMaxSequenceFromStructured(structured)
      const savedSeq = structured.nextUserStructureSequence || 1
      this._idAllocator.advanceTo(Math.max(maxSeq, savedSeq - 1))
    }

    if (compactDraft.presentationPatch) {
      Object.assign(this._workingDoc.presentation, compactDraft.presentationPatch)
    }

    this._workingDoc.session.revisionToken += 1
    this._workingDoc.session.structuralRevisionToken = (this._workingDoc.session.structuralRevisionToken || 1) + 1
    this._workingDoc.session.isDirty = Object.keys(patches).length > 0 || (structured && Object.keys(structured.structuredPatches || {}).length > 0)

    this._notify() // EXACTLY ONE notification (spec §21)

    return {
      status: 'APPLIED',
      patchCount: Object.keys(patches).length,
      structuredPatchCount: Object.keys(structured?.structuredPatches || {}).length,
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

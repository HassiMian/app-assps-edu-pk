// editorWorkingStore.js — In-Memory Working Document Controller (B4 Schema 3.2-W)
import {
  computeFieldDirtyState,
  computeCanonicalFingerprint,
  extractPlainTextFromTiptap,
  SUPPORTED_FONTS,
  SUPPORTED_SIZES,
  SUPPORTED_COLORS,
  SUPPORTED_HIGHLIGHTS,
  SUPPORTED_LINE_HEIGHTS,
  SUPPORTED_PARAGRAPH_SPACING,
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
import { CMD, cmdInsertNode } from './structured/structuredCommands.js'
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
import { createDefaultInsertedNode } from './structured/structuredNodeDefaults.js'
import { parseVerticalNumeric, resolveWorkingSectionNodes } from './structured/structuredNodeProjection.js'
import {
  normalizeWorkingMark,
  recalculateWorkingMarks,
  getEffectiveSectionTotal,
  getEffectivePaperTotal,
} from './workingMarksEngine.js'

const STRUCTURED_FONT_VALUES = new Set(SUPPORTED_FONTS.map(font => font.value))
const STRUCTURED_SIZE_VALUES = new Set(SUPPORTED_SIZES.map(size => `${size}pt`))
const STRUCTURED_ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify'])
const STRUCTURED_DIRECTION_VALUES = new Set(['ltr', 'rtl'])
const STRUCTURED_WEIGHT_VALUES = new Set(['normal', 'bold', '400', '700'])
const STRUCTURED_STYLE_VALUES = new Set(['normal', 'italic'])
const STRUCTURED_DECORATION_VALUES = new Set(['none', 'underline', 'line-through'])

function sanitizeStructuredFieldStyle(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const out = {}
  if (STRUCTURED_FONT_VALUES.has(input.fontFamily)) out.fontFamily = input.fontFamily
  if (STRUCTURED_SIZE_VALUES.has(input.fontSize)) out.fontSize = input.fontSize
  if (STRUCTURED_WEIGHT_VALUES.has(input.fontWeight)) out.fontWeight = input.fontWeight
  if (STRUCTURED_STYLE_VALUES.has(input.fontStyle)) out.fontStyle = input.fontStyle
  if (STRUCTURED_DECORATION_VALUES.has(input.textDecoration)) out.textDecoration = input.textDecoration
  if (SUPPORTED_COLORS.includes(input.color)) out.color = input.color
  if (SUPPORTED_HIGHLIGHTS.includes(input.backgroundColor)) out.backgroundColor = input.backgroundColor
  if (STRUCTURED_ALIGN_VALUES.has(input.textAlign)) out.textAlign = input.textAlign
  if (STRUCTURED_DIRECTION_VALUES.has(input.direction)) out.direction = input.direction
  if (SUPPORTED_LINE_HEIGHTS.includes(input.lineHeight)) out.lineHeight = input.lineHeight
  if (SUPPORTED_PARAGRAPH_SPACING.includes(input.paragraphSpacing)) out.paragraphSpacing = input.paragraphSpacing
  return out
}

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

  _hasStructuredEdits() {
    const structured = this._workingDoc?.structured || {}
    return (
      Object.keys(structured.structuredPatches || {}).length > 0 ||
      Object.keys(structured.insertedNodes || {}).length > 0 ||
      (structured.deletedNodeIds || []).length > 0 ||
      Object.keys(structured.nodeOrderBySection || {}).length > 0
    )
  }

  _recomputeDocumentDirty() {
    let textDirty = false
    let marksDirty = Boolean(this._workingDoc?.marks?.paperMarksDirty)
    let numberingDirty = false

    for (const sec of this._workingDoc.sections || []) {
      marksDirty = marksDirty || Boolean(sec.sectionMarksDirty)
      if (sec.sectionTextDirty?.title || sec.sectionTextDirty?.instructions) textDirty = true
      for (const node of sec.nodeOverlays || []) {
        marksDirty = marksDirty || Boolean(node.nodeMarksDirty)
        numberingDirty = numberingDirty || Boolean(node.displayNumberDirty)
        for (const field of Object.values(node.editableFields || {})) {
          if (field.isDirty) textDirty = true
        }
      }
    }

    const metadataDirty = Boolean(
      this._workingDoc?.metadata?.customFieldsDirty ||
      this._workingDoc?.metadata?.hiddenHeaderFieldsDirty ||
      Object.values(this._workingDoc?.metadata?.dirtyFields || {}).some(Boolean)
    )
    const presentationDirty = Boolean(this._workingDoc?.presentation?.isDirty)
    const dirty = Boolean(
      textDirty ||
      metadataDirty ||
      marksDirty ||
      numberingDirty ||
      presentationDirty ||
      this._hasStructuredEdits()
    )
    this._workingDoc.session.isDirty = dirty
    return dirty
  }

  _findNodeOverlay(sectionId, nodeId) {
    const section = this._workingDoc.sections.find(sec => sec.id === sectionId)
    const node = section?.nodeOverlays?.find(item => item.nodeId === nodeId)
    return { section, node }
  }

  setMetadataField(fieldName, value) {
    const metadata = this._workingDoc.metadata
    if (!metadata || !Object.prototype.hasOwnProperty.call(metadata, fieldName)) return false
    if ([
      'language',
      'direction',
      'dirtyFields',
      'customFields',
      'customFieldsDirty',
      'hiddenHeaderFields',
      'hiddenHeaderFieldsDirty',
    ].includes(fieldName)) return false

    const baselineValue = this._baselineDoc.metadata?.[fieldName] ?? null
    const normalizedValue = fieldName === 'durationMinutes'
      ? normalizeWorkingMark(value)
      : (value === null || value === undefined ? '' : String(value))

    metadata[fieldName] = normalizedValue
    metadata.dirtyFields[fieldName] = normalizedValue !== baselineValue
    this._recomputeDocumentDirty()
    this._notify()
    return true
  }

  addCustomHeaderField(label = 'Field', value = '') {
    const metadata = this._workingDoc.metadata
    if (!metadata) return null
    const used = new Set((metadata.customFields || []).map(field => field.id))
    let seq = (metadata.customFields || []).length + 1
    let id = `custom_header_${seq}`
    while (used.has(id)) {
      seq += 1
      id = `custom_header_${seq}`
    }
    const record = { id, label: String(label || 'Field'), value: String(value || '') }
    metadata.customFields.push(record)
    metadata.customFieldsDirty = true
    this._recomputeDocumentDirty()
    this._notify()
    return record
  }

  updateCustomHeaderField(fieldId, patch = {}) {
    const metadata = this._workingDoc.metadata
    const field = metadata?.customFields?.find(item => item.id === fieldId)
    if (!field) return false
    if (patch.label !== undefined) field.label = String(patch.label)
    if (patch.value !== undefined) field.value = String(patch.value)
    metadata.customFieldsDirty = true
    this._recomputeDocumentDirty()
    this._notify()
    return true
  }

  removeCustomHeaderField(fieldId) {
    const metadata = this._workingDoc.metadata
    if (!metadata) return false
    const before = metadata.customFields.length
    metadata.customFields = metadata.customFields.filter(field => field.id !== fieldId)
    if (metadata.customFields.length === before) return false
    metadata.customFieldsDirty = true
    this._recomputeDocumentDirty()
    this._notify()
    return true
  }

  hideHeaderField(fieldId) {
    const metadata = this._workingDoc.metadata
    if (!metadata || !fieldId) return false
    if (!metadata.hiddenHeaderFields.includes(fieldId)) {
      metadata.hiddenHeaderFields.push(fieldId)
      metadata.hiddenHeaderFieldsDirty = true
      this._recomputeDocumentDirty()
      this._notify()
    }
    return true
  }

  restoreHeaderField(fieldId) {
    const metadata = this._workingDoc.metadata
    if (!metadata || !fieldId) return false
    const before = metadata.hiddenHeaderFields.length
    metadata.hiddenHeaderFields = metadata.hiddenHeaderFields.filter(id => id !== fieldId)
    if (metadata.hiddenHeaderFields.length !== before) {
      metadata.hiddenHeaderFieldsDirty = true
      this._recomputeDocumentDirty()
      this._notify()
    }
    return true
  }

  setSectionTitle(sectionId, value) {
    const section = this._workingDoc.sections.find(sec => sec.id === sectionId)
    const baseline = this._baselineDoc.sections?.find(sec => sec.id === sectionId)
    if (!section || !baseline) return false

    const normalized = value === null || value === undefined ? '' : String(value)
    const isRtl = section.direction === 'rtl'
    const baselineDisplay = isRtl
      ? String(baseline.titleUrdu || baseline.title || '')
      : String(baseline.title || '')

    section.title = normalized
    section.heading = normalized
    if (isRtl) section.titleUrdu = normalized || null
    section.sectionTextDirty = section.sectionTextDirty || { title: false, instructions: false }
    section.sectionTextDirty.title = normalized !== baselineDisplay

    this._recomputeDocumentDirty()
    this._notify()
    return true
  }

  setSectionInstructions(sectionId, value) {
    const section = this._workingDoc.sections.find(sec => sec.id === sectionId)
    const baseline = this._baselineDoc.sections?.find(sec => sec.id === sectionId)
    if (!section || !baseline) return false

    const normalized = value === null || value === undefined ? '' : String(value)
    const baselineValue = String(baseline.instructions || '')

    section.instructions = normalized || null
    section.sectionTextDirty = section.sectionTextDirty || { title: false, instructions: false }
    section.sectionTextDirty.instructions = normalized !== baselineValue

    this._recomputeDocumentDirty()
    this._notify()
    return true
  }

  getEffectiveNodeMarks(sectionId, nodeId) {
    const { node } = this._findNodeOverlay(sectionId, nodeId)
    if (node) return normalizeWorkingMark(node.workingNodeMarks)
    const inserted = this._workingDoc.structured?.insertedNodes?.[nodeId]
    return normalizeWorkingMark(inserted?.workingMarksOverride)
  }

  setNodeMarks(sectionId, nodeId, value) {
    const mark = normalizeWorkingMark(value)
    const { section, node } = this._findNodeOverlay(sectionId, nodeId)
    const inserted = this._workingDoc.structured?.insertedNodes?.[nodeId]
    if (!section || (!node && !inserted)) return false

    if (node) {
      const sourceMark = node.authoritativeNodeMarks ?? node.operationalNodeMarks ?? null
      node.workingNodeMarks = mark
      node.nodeMarksDirty = mark !== normalizeWorkingMark(sourceMark)
    } else {
      inserted.workingMarksOverride = mark
    }

    if (section.sectionTotalMode !== 'MANUAL') {
      section.sectionTotalMode = 'AUTO'
      section.sectionMarksDirty = true
    }
    if (this._workingDoc.marks.paperTotalMode !== 'MANUAL') {
      this._workingDoc.marks.paperTotalMode = 'AUTO'
      this._workingDoc.marks.paperMarksDirty = true
    }

    recalculateWorkingMarks(this._workingDoc, this._baselineDoc)
    this._recomputeDocumentDirty()
    this._notify()
    return true
  }

  getEffectiveSectionTotal(sectionId) {
    const section = this._workingDoc.sections.find(sec => sec.id === sectionId)
    return getEffectiveSectionTotal(section)
  }

  setSectionMarks(sectionId, value) {
    const section = this._workingDoc.sections.find(sec => sec.id === sectionId)
    if (!section) return false
    const mark = normalizeWorkingMark(value)
    const sourceMark = section.authoritativeSectionTotal ?? section.operationalSectionTotal ?? null
    section.workingSectionTotal = mark
    section.sectionTotalMode = 'MANUAL'
    section.sectionMarksDirty = mark !== normalizeWorkingMark(sourceMark)
    section.sectionMarksStatus = 'MANUAL'

    if (this._workingDoc.marks.paperTotalMode !== 'MANUAL') {
      this._workingDoc.marks.paperTotalMode = 'AUTO'
      this._workingDoc.marks.paperMarksDirty = true
    }
    recalculateWorkingMarks(this._workingDoc, this._baselineDoc)
    this._recomputeDocumentDirty()
    this._notify()
    return true
  }

  setPaperTotalMarks(value) {
    const mark = normalizeWorkingMark(value)
    this._workingDoc.marks.paperTotalMode = 'MANUAL'
    this._workingDoc.marks.manualPaperTotal = mark
    this._workingDoc.marks.paperMarksDirty = mark !== normalizeWorkingMark(this._workingDoc.marks.sourcePaperTotal)
    this._workingDoc.marks.paperMarksStatus = 'MANUAL'
    this._recomputeDocumentDirty()
    this._notify()
    return true
  }

  setPaperTotalAuto() {
    this._workingDoc.marks.paperTotalMode = 'AUTO'
    this._workingDoc.marks.paperMarksDirty = true
    recalculateWorkingMarks(this._workingDoc, this._baselineDoc)
    this._recomputeDocumentDirty()
    this._notify()
  }

  getEffectivePaperTotal() {
    return getEffectivePaperTotal(this._workingDoc)
  }

  getNodeDisplayNumber(sectionId, nodeId, fallbackNumber) {
    const { node } = this._findNodeOverlay(sectionId, nodeId)
    const inserted = this._workingDoc.structured?.insertedNodes?.[nodeId]
    const override = node?.displayNumberOverride ?? inserted?.displayNumberOverride
    return override === null || override === undefined || String(override).trim() === ''
      ? String(fallbackNumber)
      : String(override)
  }

  setNodeDisplayNumber(sectionId, nodeId, value) {
    const normalized = value === null || value === undefined ? null : String(value).trim()
    const { node } = this._findNodeOverlay(sectionId, nodeId)
    const inserted = this._workingDoc.structured?.insertedNodes?.[nodeId]
    if (!node && !inserted) return false
    if (node) {
      node.displayNumberOverride = normalized || null
      node.displayNumberDirty = Boolean(normalized)
    } else {
      inserted.displayNumberOverride = normalized || null
    }
    this._recomputeDocumentDirty()
    this._notify()
    return true
  }

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

    const previousDocDirty = this._workingDoc.session.isDirty
    const docDirty = this._recomputeDocumentDirty()

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
        const s = this._workingDoc.structured
        const insNode = s.insertedNodes?.[nodeId]
        if (insNode) {
          const opt = (insNode.options || []).find(o => o.id === payload.optionId)
          if (opt) opt.text = payload.text
        } else {
          const p = this._getOrCreatePatch(nodeId, 'mcq')
          if (p.insertedOptions && p.insertedOptions[payload.optionId]) {
            p.insertedOptions[payload.optionId] = {
              ...p.insertedOptions[payload.optionId],
              text: payload.text,
            }
          } else {
            p.optionPatches[payload.optionId] = { ...(p.optionPatches[payload.optionId] || {}), text: payload.text }
          }
          p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        }
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
        const s = this._workingDoc.structured
        const insNode = s.insertedNodes?.[nodeId]
        if (insNode) {
          const seg = (insNode.segments || []).find(seg => seg.id === payload.segId)
          if (seg) seg.value = payload.value
        } else {
          const p = this._getOrCreatePatch(nodeId, 'fill_blank')
          if (p.insertedSegments && p.insertedSegments[payload.segId]) {
            p.insertedSegments[payload.segId] = {
              ...p.insertedSegments[payload.segId],
              value: payload.value,
            }
          } else {
            p.segmentPatches[payload.segId] = { ...(p.segmentPatches[payload.segId] || {}), value: payload.value }
          }
          p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        }
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
        const s = this._workingDoc.structured
        const insNode = s.insertedNodes?.[nodeId]
        if (insNode) {
          const item = (insNode.leftItems || []).find(i => i.id === payload.itemId)
          if (item) item.text = payload.text
        } else {
          const p = this._getOrCreatePatch(nodeId, 'matching_columns')
          if (p.insertedLeftItems && p.insertedLeftItems[payload.itemId]) {
            p.insertedLeftItems[payload.itemId] = {
              ...p.insertedLeftItems[payload.itemId],
              text: payload.text,
            }
          } else {
            p.leftPatches[payload.itemId] = { ...(p.leftPatches[payload.itemId] || {}), text: payload.text }
          }
          p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        }
        break
      }
      case CMD.UPDATE_MATCHING_RIGHT: {
        const s = this._workingDoc.structured
        const insNode = s.insertedNodes?.[nodeId]
        if (insNode) {
          const item = (insNode.rightItems || []).find(i => i.id === payload.itemId)
          if (item) item.text = payload.text
        } else {
          const p = this._getOrCreatePatch(nodeId, 'matching_columns')
          if (p.insertedRightItems && p.insertedRightItems[payload.itemId]) {
            p.insertedRightItems[payload.itemId] = {
              ...p.insertedRightItems[payload.itemId],
              text: payload.text,
            }
          } else {
            p.rightPatches[payload.itemId] = { ...(p.rightPatches[payload.itemId] || {}), text: payload.text }
          }
          p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        }
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
        const s = this._workingDoc.structured
        const insNode = s.insertedNodes?.[nodeId]
        if (insNode) {
          const row = (insNode.rows || []).find(r => r.id === payload.rowId)
          if (row) {
            row[payload.side === 'left' ? 'leftText' : 'rightText'] = payload.value
          }
        } else {
          const p = this._getOrCreatePatch(nodeId, 'grammar_table')
          if (p.insertedRows && p.insertedRows[payload.rowId]) {
            p.insertedRows[payload.rowId] = {
              ...p.insertedRows[payload.rowId],
              [payload.side === 'left' ? 'leftText' : 'rightText']: payload.value,
            }
          } else {
            p.rowPatches[payload.rowId] = {
              ...(p.rowPatches[payload.rowId] || {}),
              [payload.side === 'left' ? 'leftText' : 'rightText']: payload.value,
            }
          }
          p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        }
        break
      }
      case CMD.TOGGLE_GRAMMAR_BLANK: {
        const s = this._workingDoc.structured
        const insNode = s.insertedNodes?.[nodeId]
        if (insNode) {
          const row = (insNode.rows || []).find(r => r.id === payload.rowId)
          if (row) {
            row[payload.side === 'left' ? 'leftIsBlank' : 'rightIsBlank'] = payload.isBlank
          }
        } else {
          const p = this._getOrCreatePatch(nodeId, 'grammar_table')
          if (p.insertedRows && p.insertedRows[payload.rowId]) {
            p.insertedRows[payload.rowId] = {
              ...p.insertedRows[payload.rowId],
              [payload.side === 'left' ? 'leftIsBlank' : 'rightIsBlank']: payload.isBlank,
            }
          } else {
            p.rowPatches[payload.rowId] = {
              ...(p.rowPatches[payload.rowId] || {}),
              [payload.side === 'left' ? 'leftIsBlank' : 'rightIsBlank']: payload.isBlank,
            }
          }
          p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        }
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
        const s = this._workingDoc.structured
        const insNode = s.insertedNodes?.[nodeId]
        if (insNode) {
          const op = (insNode.operands || []).find(o => o.id === payload.opId)
          if (op) {
            op.raw = payload.raw
            op.normalizedNumericValue = payload.normalizedNumericValue
          }
        } else {
          const p = this._getOrCreatePatch(nodeId, 'vertical_math')
          if (p.insertedOperands && p.insertedOperands[payload.opId]) {
            p.insertedOperands[payload.opId] = {
              ...p.insertedOperands[payload.opId],
              raw: payload.raw,
              normalizedNumericValue: payload.normalizedNumericValue,
            }
          } else {
            p.operandPatches[payload.opId] = { raw: payload.raw, normalizedNumericValue: payload.normalizedNumericValue }
          }
          p.mutationState = STRUCTURED_MUTATION.USER_EDITED
        }
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
        // Resolve current order BEFORE registering the inserted node; otherwise
        // _getSectionNodeOrder() already includes it and a second splice duplicates the id.
        const order = this._getSectionNodeOrder(sectionId)
        s.insertedNodes[nodeId] = payload.insertedRecord
        if (!order.includes(nodeId)) {
          const idx = payload.afterNodeId ? order.indexOf(payload.afterNodeId) : -1
          order.splice(idx >= 0 ? idx + 1 : order.length, 0, nodeId)
        }
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
        const order = this._getSectionNodeOrder(sectionId)
        s.insertedNodes[payload.newNodeId] = payload.insertedRecord
        if (!order.includes(payload.newNodeId)) {
          const idx = payload.afterNodeId ? order.indexOf(payload.afterNodeId) : order.indexOf(nodeId)
          order.splice(idx >= 0 ? idx + 1 : order.length, 0, payload.newNodeId)
        }
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
  insertQuestion(sectionId, nodeType = 'mcq', afterNodeId = null) {
    const secId = sectionId || this._workingDoc.sections?.[0]?.id
    if (!secId) return null
    const baselineSection = this._baselineDoc.sections?.find(section => section.id === secId)
    if (!baselineSection) return null

    const currentNodes = resolveWorkingSectionNodes(baselineSection, this._workingDoc.structured)
    const previousOrder = currentNodes.map(node => node.id)
    const effectiveAfterId = afterNodeId || previousOrder[previousOrder.length - 1] || null
    const nodeId = this._idAllocator.allocateNodeId(secId)
    const allocate = kind => {
      if (kind === 'option') return this._idAllocator.allocateOptionId(secId)
      if (kind === 'segment') return this._idAllocator.allocateSegmentId(secId)
      if (kind === 'row') return this._idAllocator.allocateRowId(secId)
      if (kind === 'operand') return this._idAllocator.allocateOperandId(secId)
      if (kind === 'left-item') return this._idAllocator.allocateItemId(secId, 'left')
      if (kind === 'right-item') return this._idAllocator.allocateItemId(secId, 'right')
      return this._idAllocator.allocate(secId, kind)
    }
    const insertedRecord = createDefaultInsertedNode(nodeType, nodeId, secId, allocate)
    this.dispatchStructuralCommand(cmdInsertNode(nodeId, secId, insertedRecord, effectiveAfterId, previousOrder))
    return nodeId
  }
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
  // STRUCTURAL PRESENTATION CONTROLS (FIX F)
  // ─────────────────────────────────────────────────────────────────────────
  setPageBorder(pageBorder) {
    if (!this._workingDoc.presentation) this._workingDoc.presentation = {}
    this._workingDoc.presentation.pageBorder = pageBorder
    this._workingDoc.presentation.isDirty = true
    this._workingDoc.session.isDirty = true
    this.publishDocumentChange()
  }

  setTemplateId(templateId) {
    if (!this._workingDoc.presentation) this._workingDoc.presentation = {}
    this._workingDoc.presentation.templateId = templateId || 'academic'
    this._workingDoc.presentation.isDirty = true
    this._workingDoc.session.isDirty = true
    this.publishDocumentChange()
  }

  setPrintMode(printMode) {
    if (!this._workingDoc.presentation) this._workingDoc.presentation = {}
    this._workingDoc.presentation.printMode = printMode === 'half' ? 'half' : 'a4'
    this._workingDoc.presentation.isDirty = true
    this._workingDoc.session.isDirty = true
    this.publishDocumentChange()
  }

  setMcqLayout(sectionId, mcqLayout) {
    if (!this._workingDoc.presentation) this._workingDoc.presentation = {}
    if (!this._workingDoc.presentation.sectionLayoutOverrides) this._workingDoc.presentation.sectionLayoutOverrides = {}
    const secId = sectionId || this._workingDoc.sections?.[0]?.id
    if (secId) {
      this._workingDoc.presentation.sectionLayoutOverrides[secId] = {
        ...(this._workingDoc.presentation.sectionLayoutOverrides[secId] || {}),
        mcqLayout,
      }
      this._workingDoc.presentation.isDirty = true
      this._workingDoc.session.isDirty = true
      this.publishDocumentChange()
    }
  }

  setShortLayout(sectionId, shortLayout) {
    if (!this._workingDoc.presentation) this._workingDoc.presentation = {}
    if (!this._workingDoc.presentation.sectionLayoutOverrides) this._workingDoc.presentation.sectionLayoutOverrides = {}
    const secId = sectionId || this._workingDoc.sections?.[0]?.id
    if (secId) {
      this._workingDoc.presentation.sectionLayoutOverrides[secId] = {
        ...(this._workingDoc.presentation.sectionLayoutOverrides[secId] || {}),
        shortLayout,
      }
      this._workingDoc.presentation.isDirty = true
      this._workingDoc.session.isDirty = true
      this.publishDocumentChange()
    }
  }

  setQuestionBorder(sectionId, questionBorder) {
    if (!this._workingDoc.presentation) this._workingDoc.presentation = {}
    if (!this._workingDoc.presentation.sectionLayoutOverrides) this._workingDoc.presentation.sectionLayoutOverrides = {}
    const secId = sectionId || this._workingDoc.sections?.[0]?.id
    if (secId) {
      this._workingDoc.presentation.sectionLayoutOverrides[secId] = {
        ...(this._workingDoc.presentation.sectionLayoutOverrides[secId] || {}),
        questionBorder,
      }
      this._workingDoc.presentation.isDirty = true
      this._workingDoc.session.isDirty = true
      this.publishDocumentChange()
    }
  }

  setQuestionLayout(nodeId, layout) {
    if (!nodeId) return false
    if (!this._workingDoc.presentation) this._workingDoc.presentation = {}
    if (!this._workingDoc.presentation.questionLayoutByNode) {
      this._workingDoc.presentation.questionLayoutByNode = {}
    }
    if (layout === 'inherit' || layout === null || layout === undefined || layout === '') {
      delete this._workingDoc.presentation.questionLayoutByNode[nodeId]
    } else {
      const normalized = ['plain', 'box', 'table'].includes(layout) ? layout : 'plain'
      this._workingDoc.presentation.questionLayoutByNode[nodeId] = normalized
    }
    this._workingDoc.presentation.isDirty = true
    this._workingDoc.session.isDirty = true
    this.publishDocumentChange()
    return true
  }

  getStructuredFieldStyle(controlKey) {
    if (!controlKey) return {}
    return {
      ...(this._workingDoc.presentation?.structuredFieldStyles?.[controlKey] || {}),
    }
  }

  setStructuredFieldStyle(controlKey, patch = {}) {
    if (!controlKey || typeof controlKey !== 'string' || !controlKey.startsWith('structured::')) return false
    if (!this._workingDoc.presentation) this._workingDoc.presentation = {}
    if (!this._workingDoc.presentation.structuredFieldStyles) {
      this._workingDoc.presentation.structuredFieldStyles = {}
    }

    const current = this._workingDoc.presentation.structuredFieldStyles[controlKey] || {}
    const merged = { ...current }
    for (const [key, value] of Object.entries(patch || {})) {
      if (value === null || value === undefined || value === '') delete merged[key]
      else merged[key] = value
    }
    const sanitized = sanitizeStructuredFieldStyle(merged)

    if (Object.keys(sanitized).length > 0) {
      this._workingDoc.presentation.structuredFieldStyles[controlKey] = sanitized
    } else {
      delete this._workingDoc.presentation.structuredFieldStyles[controlKey]
    }

    this._workingDoc.presentation.isDirty = true
    this._recomputeDocumentDirty()
    this.publishDocumentChange()
    return true
  }

  clearStructuredFieldStyle(controlKey) {
    if (!controlKey || !this._workingDoc.presentation?.structuredFieldStyles?.[controlKey]) return false
    delete this._workingDoc.presentation.structuredFieldStyles[controlKey]
    this._workingDoc.presentation.isDirty = true
    this._recomputeDocumentDirty()
    this.publishDocumentChange()
    return true
  }

  setAnswerLines(nodeId, lines) {
    if (!nodeId) return
    if (!this._workingDoc.presentation) this._workingDoc.presentation = {}
    if (!this._workingDoc.presentation.answerLinesByNode) this._workingDoc.presentation.answerLinesByNode = {}
    this._workingDoc.presentation.answerLinesByNode[nodeId] = Number(lines) || 0
    this._workingDoc.presentation.isDirty = true
    this._workingDoc.session.isDirty = true
    this.publishDocumentChange()
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

    const metadataPatch = { fields: {}, customFields: null, hiddenHeaderFields: null }
    for (const [fieldName, dirty] of Object.entries(this._workingDoc.metadata?.dirtyFields || {})) {
      if (dirty) metadataPatch.fields[fieldName] = this._workingDoc.metadata[fieldName]
    }
    if (this._workingDoc.metadata?.customFieldsDirty) {
      metadataPatch.customFields = JSON.parse(JSON.stringify(this._workingDoc.metadata.customFields || []))
    }
    if (this._workingDoc.metadata?.hiddenHeaderFieldsDirty) {
      metadataPatch.hiddenHeaderFields = [...(this._workingDoc.metadata.hiddenHeaderFields || [])]
    }

    const sectionPatch = {}

    for (const sec of this._workingDoc.sections || []) {
      const patch = {}
      if (sec.sectionTextDirty?.title) {
        patch.title = sec.title
        patch.heading = sec.heading
        patch.titleUrdu = sec.titleUrdu
      }
      if (sec.sectionTextDirty?.instructions) {
        patch.instructions = sec.instructions
      }
      if (Object.keys(patch).length > 0) sectionPatch[sec.id] = patch
    }

    const marksPatch = {
      paper: this._workingDoc.marks?.paperMarksDirty
        ? {
            paperTotalMode: this._workingDoc.marks.paperTotalMode,
            manualPaperTotal: this._workingDoc.marks.manualPaperTotal,
          }
        : null,
      sections: {},
      nodes: {},
    }

    for (const sec of this._workingDoc.sections || []) {
      if (sec.sectionMarksDirty) {
        marksPatch.sections[sec.id] = {
          workingSectionTotal: sec.workingSectionTotal,
          sectionTotalMode: sec.sectionTotalMode,
        }
      }
      for (const node of sec.nodeOverlays || []) {
        if (node.nodeMarksDirty || node.displayNumberDirty) {
          marksPatch.nodes[node.nodeId] = {
            sectionId: sec.id,
            workingNodeMarks: node.workingNodeMarks,
            nodeMarksDirty: Boolean(node.nodeMarksDirty),
            displayNumberOverride: node.displayNumberOverride,
            displayNumberDirty: Boolean(node.displayNumberDirty),
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

    const hasMetadataEdits =
      Object.keys(metadataPatch.fields).length > 0 ||
      metadataPatch.customFields !== null ||
      metadataPatch.hiddenHeaderFields !== null
    const hasSectionEdits = Object.keys(sectionPatch).length > 0
    const hasMarksEdits =
      Boolean(marksPatch.paper) ||
      Object.keys(marksPatch.sections).length > 0 ||
      Object.keys(marksPatch.nodes).length > 0

    const isV2 = forceV2 || hasStructuredEdits || hasMetadataEdits || hasSectionEdits || hasMarksEdits

    const draft = {
      draftFormat: 'assps-canonical-working-draft',
      draftVersion: isV2 ? 2 : 1,
      baseCanonicalDocumentId: this._workingDoc.baseCanonicalDocumentId,
      baseFingerprint: this._workingDoc.baseFingerprint,
      savedAt: new Date().toISOString(),
      fieldPatches,
      metadataPatch,
      sectionPatch,
      marksPatch,
      presentationPatch: {
        isDirty: Boolean(this._workingDoc.presentation.isDirty),
        zoomLevel: this._workingDoc.presentation.zoomLevel,
        templateId: this._workingDoc.presentation.templateId,
        printMode: this._workingDoc.presentation.printMode || 'a4',
        pageBorder: this._workingDoc.presentation.pageBorder || 'none',
        sectionLayoutOverrides: this._workingDoc.presentation.sectionLayoutOverrides || {},
        questionLayoutByNode: this._workingDoc.presentation.questionLayoutByNode || {},
        answerLinesByNode: this._workingDoc.presentation.answerLinesByNode || {},
        structuredFieldStyles: this._workingDoc.presentation.structuredFieldStyles || {},
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
    const metadataPatch = compactDraft.metadataPatch || { fields: {}, customFields: null, hiddenHeaderFields: null }
    const sectionPatch = compactDraft.sectionPatch || {}
    const marksPatch = compactDraft.marksPatch || { paper: null, sections: {}, nodes: {} }

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

      // Apply section text overlays before metadata/marks. Canonical source remains immutable.
      for (const [sectionId, patch] of Object.entries(sectionPatch)) {
        const section = candidateDoc.sections.find(sec => sec.id === sectionId)
        if (!section) {
          return { status: 'INVALID_DRAFT', error: `UNKNOWN_SECTION_PATCH: '${sectionId}'` }
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'title')) {
          section.title = patch.title ?? ''
          section.heading = Object.prototype.hasOwnProperty.call(patch, 'heading')
            ? (patch.heading ?? '')
            : section.title
          if (section.direction === 'rtl') {
            section.titleUrdu = Object.prototype.hasOwnProperty.call(patch, 'titleUrdu')
              ? (patch.titleUrdu ?? null)
              : (section.title || null)
          } else if (Object.prototype.hasOwnProperty.call(patch, 'titleUrdu')) {
            section.titleUrdu = patch.titleUrdu ?? null
          }
          section.sectionTextDirty.title = true
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'instructions')) {
          section.instructions = patch.instructions ?? null
          section.sectionTextDirty.instructions = true
        }
      }

      // Apply metadata overlay. School name/logo are not part of editable metadata.
      for (const [fieldName, value] of Object.entries(metadataPatch.fields || {})) {
        if (
          !Object.prototype.hasOwnProperty.call(candidateDoc.metadata, fieldName) ||
          ['language', 'direction', 'dirtyFields', 'customFields', 'customFieldsDirty'].includes(fieldName)
        ) {
          return { status: 'INVALID_DRAFT', error: `UNKNOWN_METADATA_FIELD: '${fieldName}'` }
        }
        candidateDoc.metadata[fieldName] = value
        candidateDoc.metadata.dirtyFields[fieldName] = true
      }
      if (Array.isArray(metadataPatch.customFields)) {
        candidateDoc.metadata.customFields = JSON.parse(JSON.stringify(metadataPatch.customFields))
        candidateDoc.metadata.customFieldsDirty = true
      }
      if (Array.isArray(metadataPatch.hiddenHeaderFields)) {
        candidateDoc.metadata.hiddenHeaderFields = [...metadataPatch.hiddenHeaderFields]
        candidateDoc.metadata.hiddenHeaderFieldsDirty = true
      }

      // Apply marks + numbering overlays.
      if (marksPatch.paper) {
        candidateDoc.marks.paperTotalMode = marksPatch.paper.paperTotalMode || 'MANUAL'
        candidateDoc.marks.manualPaperTotal = normalizeWorkingMark(marksPatch.paper.manualPaperTotal)
        candidateDoc.marks.paperMarksDirty = true
        candidateDoc.marks.paperMarksStatus = candidateDoc.marks.paperTotalMode === 'MANUAL' ? 'MANUAL' : 'AUTO'
      }

      for (const [sectionId, sectionPatch] of Object.entries(marksPatch.sections || {})) {
        const section = candidateDoc.sections.find(sec => sec.id === sectionId)
        if (!section) return { status: 'INVALID_DRAFT', error: `UNKNOWN_MARKS_SECTION: '${sectionId}'` }
        section.workingSectionTotal = normalizeWorkingMark(sectionPatch.workingSectionTotal)
        section.sectionTotalMode = sectionPatch.sectionTotalMode || 'MANUAL'
        section.sectionMarksDirty = true
        section.sectionMarksStatus = section.sectionTotalMode === 'MANUAL' ? 'MANUAL' : 'AUTO'
      }

      for (const [nodeId, nodePatch] of Object.entries(marksPatch.nodes || {})) {
        const section = candidateDoc.sections.find(sec => sec.id === nodePatch.sectionId)
        const node = section?.nodeOverlays?.find(item => item.nodeId === nodeId)
        const inserted = candidateDoc.structured?.insertedNodes?.[nodeId]
        if (!node && !inserted) {
          return { status: 'INVALID_DRAFT', error: `UNKNOWN_MARKS_NODE: '${nodeId}'` }
        }
        if (node) {
          node.workingNodeMarks = normalizeWorkingMark(nodePatch.workingNodeMarks)
          node.nodeMarksDirty = Boolean(nodePatch.nodeMarksDirty)
          node.displayNumberOverride = nodePatch.displayNumberOverride ?? null
          node.displayNumberDirty = Boolean(nodePatch.displayNumberDirty)
        } else {
          inserted.workingMarksOverride = normalizeWorkingMark(nodePatch.workingNodeMarks)
          inserted.displayNumberOverride = nodePatch.displayNumberOverride ?? null
        }
      }

      recalculateWorkingMarks(candidateDoc, this._baselineDoc)

      // Apply presentation patch (Rule 11, FIX G)
      if (compactDraft.presentationPatch) {
        Object.assign(candidateDoc.presentation, {
          ...candidateDoc.presentation,
          ...compactDraft.presentationPatch,
          isDirty: Boolean(compactDraft.presentationPatch.isDirty),
          sectionLayoutOverrides: {
            ...(candidateDoc.presentation.sectionLayoutOverrides || {}),
            ...(compactDraft.presentationPatch.sectionLayoutOverrides || {}),
          },
          questionLayoutByNode: {
            ...(candidateDoc.presentation.questionLayoutByNode || {}),
            ...(compactDraft.presentationPatch.questionLayoutByNode || {}),
          },
          answerLinesByNode: {
            ...(candidateDoc.presentation.answerLinesByNode || {}),
            ...(compactDraft.presentationPatch.answerLinesByNode || {}),
          },
          structuredFieldStyles: {
            ...(candidateDoc.presentation.structuredFieldStyles || {}),
            ...(compactDraft.presentationPatch.structuredFieldStyles || {}),
          },
        })
      }

      // Validate final candidate state
      for (const sec of candidateDoc.sections) {
        resolveWorkingSectionNodes(sec, candidateDoc.structured, this._baselineDoc)
      }

      // Candidate tokens and dirty flags
      const hasStructuredDirty = Boolean(
        structured && (
          Object.keys(structured.structuredPatches || {}).length > 0 ||
          Object.keys(structured.insertedNodes || {}).length > 0 ||
          (structured.deletedNodeIds || []).length > 0 ||
          Object.keys(structured.nodeOrderBySection || {}).length > 0
        )
      )
      const hasMetadataDirty = Boolean(
        Object.keys(metadataPatch.fields || {}).length > 0 ||
        Array.isArray(metadataPatch.customFields) ||
        Array.isArray(metadataPatch.hiddenHeaderFields)
      )
      const hasSectionDirty = Object.keys(sectionPatch || {}).length > 0
      const hasMarksDirty = Boolean(
        marksPatch.paper ||
        Object.keys(marksPatch.sections || {}).length > 0 ||
        Object.keys(marksPatch.nodes || {}).length > 0
      )

      candidateDoc.session.revisionToken = (this._workingDoc.session.revisionToken || 1) + 1
      candidateDoc.session.structuralRevisionToken = (this._workingDoc.session.structuralRevisionToken || 1) + 1
      candidateDoc.session.isDirty = Boolean(
        hasDirtyField ||
        hasStructuredDirty ||
        hasMetadataDirty ||
        hasSectionDirty ||
        hasMarksDirty ||
        candidateDoc.presentation.isDirty
      )

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
    const previousRevision = this._workingDoc?.session?.revisionToken || 1
    const previousStructuralRevision = this._workingDoc?.session?.structuralRevisionToken || 1
    this._workingDoc = createEditorWorkingDocument(this._baselineDoc)
    this._workingDoc.session.revisionToken = previousRevision + 1
    this._workingDoc.session.structuralRevisionToken = previousStructuralRevision + 1
    this._idAllocator = new StructuredIdAllocator(this._baselineDoc.id, 1)
    this._structuredHistory.clear()
    this.publishDocumentChange()
  }
}
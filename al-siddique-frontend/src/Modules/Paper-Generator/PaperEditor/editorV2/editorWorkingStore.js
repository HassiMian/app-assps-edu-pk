// editorWorkingStore.js — In-Memory Working Document Controller and Store for Editor V2
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

/**
 * Deep freezes an object recursively to guarantee immutability.
 */
export function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return obj
  }
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
    if (!canonicalDoc) {
      throw new Error('EditorWorkingStore requires a canonical document')
    }
    // Baseline canonical document is frozen to guarantee zero mutations
    this._baselineDoc = deepFreeze(JSON.parse(JSON.stringify(canonicalDoc)))
    this._workingDoc = createEditorWorkingDocument(canonicalDoc)
    this._listeners = new Set()
  }

  getBaselineDocument() {
    return this._baselineDoc
  }

  getWorkingDocument() {
    return this._workingDoc
  }

  isDirty() {
    return Boolean(this._workingDoc?.session?.isDirty)
  }

  subscribe(listener) {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  _notify() {
    for (const listener of this._listeners) {
      try {
        listener(this._workingDoc)
      } catch (err) {
        console.error('Error in EditorWorkingStore listener:', err)
      }
    }
  }

  /**
   * Finds a field overlay by fieldKey.
   */
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
   */
  updateField(fieldKey, workingRich, workingPlainText = null) {
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

    // Recompute document-level isDirty
    let docDirty = false
    for (const sec of this._workingDoc.sections) {
      for (const node of sec.nodeOverlays) {
        for (const f of Object.values(node.editableFields || {})) {
          if (f.isDirty) {
            docDirty = true
            break
          }
        }
        if (docDirty) break
      }
      if (docDirty) break
    }

    this._workingDoc.session.isDirty = docDirty
    this._notify()

    return fieldOverlay
  }

  /**
   * Exports only the compact overlay patches for storage (Rule 9).
   */
  exportCompactDraft() {
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

    return {
      draftFormat: 'assps-canonical-working-draft',
      draftVersion: 1,
      baseCanonicalDocumentId: this._workingDoc.baseCanonicalDocumentId,
      baseFingerprint: this._workingDoc.baseFingerprint,
      savedAt: new Date().toISOString(),
      fieldPatches,
      presentationPatch: {
        zoomLevel: this._workingDoc.presentation.zoomLevel,
        templateId: this._workingDoc.presentation.templateId,
      },
    }
  }

  /**
   * Applies a compact draft onto the working document.
   */
  applyCompactDraft(compactDraft) {
    if (!compactDraft || compactDraft.draftFormat !== 'assps-canonical-working-draft') {
      throw new Error('Invalid compact draft format')
    }

    if (compactDraft.baseFingerprint !== this._workingDoc.baseFingerprint) {
      return { status: 'BASELINE_MISMATCH' }
    }

    const patches = compactDraft.fieldPatches || {}
    for (const [fieldKey, patch] of Object.entries(patches)) {
      this.updateField(fieldKey, patch.workingRich, patch.workingPlainText)
    }

    if (compactDraft.presentationPatch) {
      Object.assign(this._workingDoc.presentation, compactDraft.presentationPatch)
    }

    this._workingDoc.session.revisionToken += 1
    this._notify()

    return { status: 'APPLIED', patchCount: Object.keys(patches).length }
  }

  /**
   * Reverts all field overlays back to baseline.
   */
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
    this._workingDoc.session.isDirty = false
    this._workingDoc.session.revisionToken += 1
    this._notify()
  }
}

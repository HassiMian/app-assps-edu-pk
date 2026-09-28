// workingDraftStorage.js — Scoped Tenant Storage for Canonical Working Drafts (Rules 9, 10, 11, B4-B)
import {
  getTenantStorageItem,
  setTenantStorageItem,
  removeTenantStorageItem,
} from '../../../../services/tenantStorage.js'
import {
  computeCanonicalFingerprint,
  sanitizePaperRichText,
  stableStringify,
} from './editorProjection.js'
import { validateDraftStructuredBlock } from './structured/structuredDraftV2.js'

export const CANONICAL_DRAFTS_BASE_KEY = 'al_siddique_canonical_working_drafts'
export const CANONICAL_DRAFT_FORMAT = 'assps-canonical-working-draft'
export const CANONICAL_DRAFT_VERSION = 1
export const CANONICAL_DRAFT_VERSION_V2 = 2

// In-memory fallback map for non-browser / headless test environments
const _memoryFallback = new Map()

function getRawDraftsContainer() {
  try {
    const raw = getTenantStorageItem(CANONICAL_DRAFTS_BASE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (err) {
    console.warn('Failed to parse canonical drafts from tenant storage:', err)
  }

  // Check in-memory fallback
  if (_memoryFallback.has(CANONICAL_DRAFTS_BASE_KEY)) {
    return _memoryFallback.get(CANONICAL_DRAFTS_BASE_KEY)
  }

  return {}
}

function setRawDraftsContainer(container) {
  const jsonStr = JSON.stringify(container)
  try {
    setTenantStorageItem(CANONICAL_DRAFTS_BASE_KEY, jsonStr)
  } catch (err) {
    // Check for quota exceeded or storage unavailable
    if (err && err.name === 'QuotaExceededError') {
      throw new Error('Draft storage quota exceeded');
    }
  }
  // Keep fallback synced
  _memoryFallback.set(CANONICAL_DRAFTS_BASE_KEY, container)
}

/**
 * Validates a compact working draft object (Rule 11).
 * Supports draftVersion 1 (B3) and draftVersion 2 (B4).
 * Rejects corrupt or invalid drafts without silent modification.
 * @param {object} draft
 * @param {object} [canonicalDoc] — required for V2 structured block validation
 */
export function validateWorkingDraft(draft, canonicalDoc) {
  if (!draft || typeof draft !== 'object') {
    return { valid: false, error: 'Draft must be a non-null object' }
  }
  if (draft.draftFormat !== CANONICAL_DRAFT_FORMAT) {
    return { valid: false, error: `Invalid draftFormat '${draft.draftFormat}', expected '${CANONICAL_DRAFT_FORMAT}'` }
  }
  if (draft.draftVersion !== CANONICAL_DRAFT_VERSION && draft.draftVersion !== CANONICAL_DRAFT_VERSION_V2) {
    return { valid: false, error: `Unsupported draftVersion '${draft.draftVersion}'` }
  }
  if (typeof draft.baseCanonicalDocumentId !== 'string' || !draft.baseCanonicalDocumentId) {
    return { valid: false, error: 'Missing or invalid baseCanonicalDocumentId' }
  }
  if (typeof draft.baseFingerprint !== 'string' || draft.baseFingerprint.length !== 64) {
    return { valid: false, error: 'Missing or invalid 64-char hex baseFingerprint' }
  }
  if (!draft.fieldPatches || typeof draft.fieldPatches !== 'object' || Array.isArray(draft.fieldPatches)) {
    return { valid: false, error: 'fieldPatches must be a non-null object dictionary' }
  }

  const validMutationStates = new Set(['PRISTINE', 'FORMATTING_ONLY', 'TEXT_CHANGED'])

  for (const [key, patch] of Object.entries(draft.fieldPatches)) {
    if (!patch || typeof patch !== 'object') {
      return { valid: false, error: `Invalid patch object for key '${key}'` }
    }
    if (!patch.workingRich || patch.workingRich.type !== 'doc' || !Array.isArray(patch.workingRich.content)) {
      return { valid: false, error: `Patch '${key}' has invalid workingRich ProseMirror document` }
    }
    if (typeof patch.workingPlainText !== 'string') {
      return { valid: false, error: `Patch '${key}' missing workingPlainText string` }
    }
    if (!validMutationStates.has(patch.mutationState)) {
      return { valid: false, error: `Patch '${key}' has invalid mutationState '${patch.mutationState}'` }
    }
    if (typeof patch.academicTextMutated !== 'boolean') {
      return { valid: false, error: `Patch '${key}' academicTextMutated must be a boolean` }
    }

    // Strict sanitization validation (Rule 23):
    // Sanitized rich text must be semantically identical to submitted workingRich.
    // If sanitization would drop or mutate unsupported content, reject draft as invalid.
    const sanitizedRich = sanitizePaperRichText(patch.workingRich)
    if (stableStringify(sanitizedRich) !== stableStringify(patch.workingRich)) {
      return {
        valid: false,
        error: `Patch '${key}' workingRich contains unsupported content that would be dropped or mutated by sanitization`,
      }
    }
  }

  // Optional metadata overlay validation (V2 working overlays).
  if (draft.metadataPatch !== undefined && draft.metadataPatch !== null) {
    if (typeof draft.metadataPatch !== 'object' || Array.isArray(draft.metadataPatch)) {
      return { valid: false, error: 'metadataPatch must be an object' }
    }
    const allowedMetadataFields = new Set([
      'title',
      'paperCode',
      'className',
      'classLevel',
      'subject',
      'subjectName',
      'examType',
      'session',
      'durationMinutes',
      'timeAllowed',
      'examDate',
      'generalInstructions',
      'schoolAddress',
      'studentNameField',
      'rollNoField',
    ])
    const fields = draft.metadataPatch.fields || {}
    if (typeof fields !== 'object' || Array.isArray(fields)) {
      return { valid: false, error: 'metadataPatch.fields must be an object' }
    }
    for (const [fieldName, value] of Object.entries(fields)) {
      if (!allowedMetadataFields.has(fieldName)) {
        return { valid: false, error: `Unsupported metadata field '${fieldName}'` }
      }
      if (fieldName === 'durationMinutes') {
        if (value !== null && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
          return { valid: false, error: 'durationMinutes must be a non-negative number or null' }
        }
      } else if (value !== null && typeof value !== 'string') {
        return { valid: false, error: `metadataPatch.fields.${fieldName} must be string or null` }
      }
    }
    if (draft.metadataPatch.customFields !== null && draft.metadataPatch.customFields !== undefined) {
      if (!Array.isArray(draft.metadataPatch.customFields)) {
        return { valid: false, error: 'metadataPatch.customFields must be an array or null' }
      }
      for (const field of draft.metadataPatch.customFields) {
        if (
          !field ||
          typeof field !== 'object' ||
          typeof field.id !== 'string' ||
          typeof field.label !== 'string' ||
          typeof field.value !== 'string'
        ) {
          return { valid: false, error: 'Each custom header field must contain string id, label, and value' }
        }
      }
    }
    if (
      draft.metadataPatch.hiddenHeaderFields !== null &&
      draft.metadataPatch.hiddenHeaderFields !== undefined
    ) {
      if (
        !Array.isArray(draft.metadataPatch.hiddenHeaderFields) ||
        draft.metadataPatch.hiddenHeaderFields.some(id => typeof id !== 'string')
      ) {
        return { valid: false, error: 'metadataPatch.hiddenHeaderFields must be an array of strings or null' }
      }
    }
  }

  // Optional section title/instruction overlay validation.
  if (draft.sectionPatch !== undefined && draft.sectionPatch !== null) {
    if (typeof draft.sectionPatch !== 'object' || Array.isArray(draft.sectionPatch)) {
      return { valid: false, error: 'sectionPatch must be an object' }
    }
    const allowedSectionFields = new Set(['title', 'titleUrdu', 'heading', 'instructions'])
    const canonicalSectionIds = canonicalDoc
      ? new Set((canonicalDoc.sections || []).map(section => section.id))
      : null

    for (const [sectionId, patch] of Object.entries(draft.sectionPatch)) {
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return { valid: false, error: `Invalid section patch '${sectionId}'` }
      }
      if (canonicalSectionIds && !canonicalSectionIds.has(sectionId)) {
        return { valid: false, error: `Unknown section patch '${sectionId}'` }
      }
      for (const [fieldName, value] of Object.entries(patch)) {
        if (!allowedSectionFields.has(fieldName)) {
          return { valid: false, error: `Unsupported section field '${fieldName}'` }
        }
        if (value !== null && typeof value !== 'string') {
          return { valid: false, error: `sectionPatch.${sectionId}.${fieldName} must be string or null` }
        }
      }
    }
  }

  // Optional marks / numbering overlay validation.
  if (draft.marksPatch !== undefined && draft.marksPatch !== null) {
    if (typeof draft.marksPatch !== 'object' || Array.isArray(draft.marksPatch)) {
      return { valid: false, error: 'marksPatch must be an object' }
    }
    const validModes = new Set(['SOURCE', 'AUTO', 'MANUAL'])
    const validateMark = (value) =>
      value === null || value === undefined || (Number.isFinite(Number(value)) && Number(value) >= 0)

    if (draft.marksPatch.paper) {
      if (!validModes.has(draft.marksPatch.paper.paperTotalMode)) {
        return { valid: false, error: 'marksPatch.paper.paperTotalMode is invalid' }
      }
      if (!validateMark(draft.marksPatch.paper.manualPaperTotal)) {
        return { valid: false, error: 'marksPatch.paper.manualPaperTotal is invalid' }
      }
    }

    const sections = draft.marksPatch.sections || {}
    if (typeof sections !== 'object' || Array.isArray(sections)) {
      return { valid: false, error: 'marksPatch.sections must be an object' }
    }
    for (const [sectionId, patch] of Object.entries(sections)) {
      if (!patch || typeof patch !== 'object' || !validModes.has(patch.sectionTotalMode)) {
        return { valid: false, error: `Invalid marks section patch '${sectionId}'` }
      }
      if (!validateMark(patch.workingSectionTotal)) {
        return { valid: false, error: `Invalid section mark for '${sectionId}'` }
      }
    }

    const nodes = draft.marksPatch.nodes || {}
    if (typeof nodes !== 'object' || Array.isArray(nodes)) {
      return { valid: false, error: 'marksPatch.nodes must be an object' }
    }
    for (const [nodeId, patch] of Object.entries(nodes)) {
      if (!patch || typeof patch !== 'object' || typeof patch.sectionId !== 'string') {
        return { valid: false, error: `Invalid marks node patch '${nodeId}'` }
      }
      if (!validateMark(patch.workingNodeMarks)) {
        return { valid: false, error: `Invalid node mark for '${nodeId}'` }
      }
      if (patch.nodeMarksDirty !== undefined && typeof patch.nodeMarksDirty !== 'boolean') {
        return { valid: false, error: `nodeMarksDirty must be boolean for '${nodeId}'` }
      }
      if (patch.displayNumberDirty !== undefined && typeof patch.displayNumberDirty !== 'boolean') {
        return { valid: false, error: `displayNumberDirty must be boolean for '${nodeId}'` }
      }
      if (
        patch.displayNumberOverride !== null &&
        patch.displayNumberOverride !== undefined &&
        typeof patch.displayNumberOverride !== 'string'
      ) {
        return { valid: false, error: `displayNumberOverride must be string or null for '${nodeId}'` }
      }
    }
  }

  // V2-specific structured block validation
  if (draft.draftVersion === CANONICAL_DRAFT_VERSION_V2) {
    if (draft.structured !== undefined && draft.structured !== null) {
      const hasStructuredEdits =
        Object.keys(draft.structured.structuredPatches || {}).length > 0 ||
        Object.keys(draft.structured.insertedNodes || {}).length > 0 ||
        (Array.isArray(draft.structured.deletedNodeIds) && draft.structured.deletedNodeIds.length > 0) ||
        Object.keys(draft.structured.nodeOrderBySection || {}).length > 0

      if (hasStructuredEdits && !canonicalDoc) {
        return {
          valid: false,
          error: 'Canonical baseline document is required to validate V2 structured draft',
        }
      }

      if (canonicalDoc) {
        const structuredResult = validateDraftStructuredBlock(draft.structured, canonicalDoc)
        if (!structuredResult.valid) {
          return { valid: false, error: `V2 structured validation: ${structuredResult.error}` }
        }
      } else {
        if (typeof draft.structured !== 'object' || Array.isArray(draft.structured)) {
          return { valid: false, error: 'V2 structured block must be a non-null object' }
        }
        if (draft.structured.structuredPatches && (typeof draft.structured.structuredPatches !== 'object' || Array.isArray(draft.structured.structuredPatches))) {
          return { valid: false, error: 'structuredPatches must be an object' }
        }
        if (draft.structured.insertedNodes && (typeof draft.structured.insertedNodes !== 'object' || Array.isArray(draft.structured.insertedNodes))) {
          return { valid: false, error: 'insertedNodes must be an object' }
        }
        if (draft.structured.deletedNodeIds && !Array.isArray(draft.structured.deletedNodeIds)) {
          return { valid: false, error: 'deletedNodeIds must be an array' }
        }
        if (draft.structured.nodeOrderBySection && (typeof draft.structured.nodeOrderBySection !== 'object' || Array.isArray(draft.structured.nodeOrderBySection))) {
          return { valid: false, error: 'nodeOrderBySection must be an object' }
        }
      }
    }
  }

  return { valid: true }
}

/**
 * Saves a compact working draft for a canonical document.
 * @param {object} compactDraft
 * @param {object} [canonicalDoc]
 */
export function saveWorkingDraft(compactDraft, canonicalDoc = null) {
  const validation = validateWorkingDraft(compactDraft, canonicalDoc)
  if (!validation.valid) {
    throw new Error(`Draft validation failed: ${validation.error}`)
  }

  const container = getRawDraftsContainer()
  container[compactDraft.baseCanonicalDocumentId] = compactDraft
  setRawDraftsContainer(container)

  return {
    success: true,
    savedAt: compactDraft.savedAt,
    baseCanonicalDocumentId: compactDraft.baseCanonicalDocumentId,
    patchCount: Object.keys(compactDraft.fieldPatches || {}).length,
  }
}

/**
 * Loads a compact working draft for a canonical document.
 * Returns BASELINE_MISMATCH if the canonical document was modified since the draft was created.
 */
export function loadWorkingDraft(canonicalDoc) {
  if (!canonicalDoc || !canonicalDoc.id) {
    return null
  }

  const container = getRawDraftsContainer()
  const draft = container[canonicalDoc.id]
  if (!draft) {
    return null
  }

  const validation = validateWorkingDraft(draft, canonicalDoc)
  if (!validation.valid) {
    console.warn(`Stored draft for '${canonicalDoc.id}' is invalid:`, validation.error)
    return { status: 'CORRUPTED', error: validation.error }
  }

  const currentFingerprint = computeCanonicalFingerprint(canonicalDoc)
  if (draft.baseFingerprint !== currentFingerprint) {
    return {
      status: 'BASELINE_MISMATCH',
      draft,
      currentFingerprint,
      draftFingerprint: draft.baseFingerprint,
    }
  }

  return {
    status: 'OK',
    draft,
  }
}

/**
 * Deletes a compact draft from tenant storage.
 */
export function deleteWorkingDraft(canonicalDocId) {
  if (!canonicalDocId) return false
  const container = getRawDraftsContainer()
  if (container[canonicalDocId]) {
    delete container[canonicalDocId]
    setRawDraftsContainer(container)
    return true
  }
  return false
}

/**
 * Clears all drafts in storage (for testing).
 */
export function clearAllWorkingDrafts() {
  _memoryFallback.clear()
  try {
    removeTenantStorageItem(CANONICAL_DRAFTS_BASE_KEY)
  } catch {}
}

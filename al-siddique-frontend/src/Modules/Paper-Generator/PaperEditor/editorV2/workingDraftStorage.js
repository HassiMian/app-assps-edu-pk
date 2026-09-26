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

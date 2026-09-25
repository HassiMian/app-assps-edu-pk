// workingDraftStorage.js — Scoped Tenant Storage for Canonical Working Drafts (Rules 9, 10, 11)
import {
  getTenantStorageItem,
  setTenantStorageItem,
  removeTenantStorageItem,
} from '../../../../services/tenantStorage.js'
import {
  computeCanonicalFingerprint,
  sanitizePaperRichText,
} from './editorProjection.js'

export const CANONICAL_DRAFTS_BASE_KEY = 'al_siddique_canonical_working_drafts'
export const CANONICAL_DRAFT_FORMAT = 'assps-canonical-working-draft'
export const CANONICAL_DRAFT_VERSION = 1

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
 * Rejects corrupt or invalid drafts without silent modification.
 */
export function validateWorkingDraft(draft) {
  if (!draft || typeof draft !== 'object') {
    return { valid: false, error: 'Draft must be a non-null object' }
  }
  if (draft.draftFormat !== CANONICAL_DRAFT_FORMAT) {
    return { valid: false, error: `Invalid draftFormat '${draft.draftFormat}', expected '${CANONICAL_DRAFT_FORMAT}'` }
  }
  if (draft.draftVersion !== CANONICAL_DRAFT_VERSION) {
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
  }

  return { valid: true }
}

/**
 * Saves a compact working draft for a canonical document.
 */
export function saveWorkingDraft(compactDraft) {
  const validation = validateWorkingDraft(compactDraft)
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

  const validation = validateWorkingDraft(draft)
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

// editorV2DraftStorage.test.js — Unit Tests for Working Draft Validation, Storage, and Fingerprint Protection
import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  validateWorkingDraft,
  saveWorkingDraft,
  loadWorkingDraft,
  deleteWorkingDraft,
  clearAllWorkingDrafts,
} from '../editorV2/workingDraftStorage.js'
import {
  EditorWorkingStore,
} from '../editorV2/editorWorkingStore.js'
import {
  buildFieldKey,
} from '../editorV2/EditorFieldRegistry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const corpusPath = path.resolve(__dirname, '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
const canonicalCorpus = JSON.parse(fs.readFileSync(corpusPath, 'utf-8')).documents

test('DRAFT VALIDATOR: Strictly validates schema and rejects malformed draft payloads (Rule 11)', () => {
  // Missing fields
  assert.strictEqual(validateWorkingDraft(null).valid, false)
  assert.strictEqual(validateWorkingDraft({}).valid, false)

  // Wrong format
  assert.strictEqual(
    validateWorkingDraft({
      draftFormat: 'wrong-format',
      draftVersion: 1,
      baseCanonicalDocumentId: 'doc1',
      baseFingerprint: 'a'.repeat(64),
      fieldPatches: {},
    }).valid,
    false
  )

  // Invalid patch
  assert.strictEqual(
    validateWorkingDraft({
      draftFormat: 'assps-canonical-working-draft',
      draftVersion: 1,
      baseCanonicalDocumentId: 'doc1',
      baseFingerprint: 'a'.repeat(64),
      fieldPatches: {
        'field1': {
          workingRich: { type: 'not-doc' },
          workingPlainText: 'text',
          mutationState: 'PRISTINE',
          academicTextMutated: false,
        },
      },
    }).valid,
    false
  )

  // Reject draft with unsupported content that would be dropped by sanitization (Rule 23)
  assert.strictEqual(
    validateWorkingDraft({
      draftFormat: 'assps-canonical-working-draft',
      draftVersion: 1,
      baseCanonicalDocumentId: 'doc1',
      baseFingerprint: 'a'.repeat(64),
      fieldPatches: {
        'field1': {
          workingRich: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Hello', marks: [{ type: 'disallowedMarkType' }] }],
              },
            ],
          },
          workingPlainText: 'Hello',
          mutationState: 'FORMATTING_ONLY',
          academicTextMutated: false,
        },
      },
    }).valid,
    false,
    'Draft with unsupported mark type must be rejected as invalid'
  )

  // Valid draft passes
  assert.strictEqual(
    validateWorkingDraft({
      draftFormat: 'assps-canonical-working-draft',
      draftVersion: 1,
      baseCanonicalDocumentId: 'doc1',
      baseFingerprint: 'a'.repeat(64),
      fieldPatches: {
        'field1': {
          workingRich: { type: 'doc', content: [{ type: 'paragraph' }] },
          workingPlainText: 'text',
          mutationState: 'PRISTINE',
          academicTextMutated: false,
        },
      },
    }).valid,
    true
  )
})

test('ATOMIC DRAFT APPLICATION: Preflights all keys and rejects if unknown field key exists (Rule 24)', () => {
  const doc = canonicalCorpus[0]
  const store = new EditorWorkingStore(doc)
  const workingDoc = store.getWorkingDocument()

  const firstSec = workingDoc.sections[0]
  const firstNode = firstSec.nodeOverlays[0]
  const fieldName = Object.keys(firstNode.editableFields)[0]
  const validKey = buildFieldKey(workingDoc.baseCanonicalDocumentId, firstSec.id, firstNode.nodeId, fieldName)
  const unknownKey = 'nonexistent-doc::nonexistent-sec::nonexistent-node::stemText'

  const initialText = firstNode.editableFields[fieldName].workingPlainText

  // Draft contains 1 valid patch and 1 unknown field key
  const draftWithUnknown = {
    draftFormat: 'assps-canonical-working-draft',
    draftVersion: 1,
    baseCanonicalDocumentId: workingDoc.baseCanonicalDocumentId,
    baseFingerprint: workingDoc.baseFingerprint,
    fieldPatches: {
      [validKey]: {
        workingRich: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'SHOULD_NOT_BE_APPLIED' }] }] },
        workingPlainText: 'SHOULD_NOT_BE_APPLIED',
        mutationState: 'TEXT_CHANGED',
        academicTextMutated: true,
      },
      [unknownKey]: {
        workingRich: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'UNKNOWN' }] }] },
        workingPlainText: 'UNKNOWN',
        mutationState: 'TEXT_CHANGED',
        academicTextMutated: true,
      },
    },
  }

  // Preflight must reject draft atomically
  const result = store.applyCompactDraft(draftWithUnknown)
  assert.strictEqual(result.status, 'INVALID_DRAFT')
  assert.ok(result.error.includes('UNKNOWN_FIELD'))

  // Assert atomic rollback: valid patch was NOT applied
  assert.strictEqual(
    firstNode.editableFields[fieldName].workingPlainText,
    initialText,
    'Valid patch must NOT be applied when another key is unknown (atomic apply)'
  )
})

test('DRAFT STORAGE: Saves and loads compact drafts without corrupting baseline (Rules 9, 10)', () => {
  clearAllWorkingDrafts()
  const doc = canonicalCorpus[0]
  const store = new EditorWorkingStore(doc)
  const workingDoc = store.getWorkingDocument()

  const firstSec = workingDoc.sections[0]
  const firstNode = firstSec.nodeOverlays[0]
  const fieldName = Object.keys(firstNode.editableFields)[0]
  const fieldKey = buildFieldKey(workingDoc.baseCanonicalDocumentId, firstSec.id, firstNode.nodeId, fieldName)

  // Modify field
  const editedRich = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Brand new edited stem text' }],
      },
    ],
  }
  store.updateField(fieldKey, editedRich, 'Brand new edited stem text')

  // Export compact draft and verify it only contains the modified patch
  const compactDraft = store.exportCompactDraft()
  assert.strictEqual(compactDraft.draftFormat, 'assps-canonical-working-draft')
  assert.strictEqual(compactDraft.draftVersion, 1)
  assert.strictEqual(compactDraft.baseCanonicalDocumentId, doc.id)
  assert.ok(compactDraft.fieldPatches[fieldKey])
  assert.strictEqual(compactDraft.fieldPatches[fieldKey].workingPlainText, 'Brand new edited stem text')

  // Save to tenant storage
  const saveResult = saveWorkingDraft(compactDraft)
  assert.strictEqual(saveResult.success, true)
  assert.strictEqual(saveResult.patchCount, 1)

  // Load back from tenant storage
  const loadResult = loadWorkingDraft(doc)
  assert.strictEqual(loadResult.status, 'OK')
  assert.ok(loadResult.draft)
  assert.strictEqual(loadResult.draft.fieldPatches[fieldKey].workingPlainText, 'Brand new edited stem text')

  // Delete draft
  const deleted = deleteWorkingDraft(doc.id)
  assert.strictEqual(deleted, true)

  // Load after deletion returns null
  assert.strictEqual(loadWorkingDraft(doc), null)
})

test('FINGERPRINT MISMATCH: Draft is rejected if baseline canonical document fingerprint changes (Rule 8)', () => {
  clearAllWorkingDrafts()
  const doc = canonicalCorpus[0]
  const store = new EditorWorkingStore(doc)

  const compactDraft = store.exportCompactDraft()
  compactDraft.fieldPatches['dummyKey'] = {
    workingRich: { type: 'doc', content: [{ type: 'paragraph' }] },
    workingPlainText: 'dummy',
    mutationState: 'TEXT_CHANGED',
    academicTextMutated: true,
  }

  saveWorkingDraft(compactDraft)

  // Mutate a canonical field (e.g. source dataset hash changed)
  const modifiedCanonical = JSON.parse(JSON.stringify(doc))
  modifiedCanonical.sourceIdentity.sourceDatasetByteSha256 = '0'.repeat(64)

  const loadResult = loadWorkingDraft(modifiedCanonical)
  assert.strictEqual(loadResult.status, 'BASELINE_MISMATCH', 'Must return BASELINE_MISMATCH when canonical fingerprint differs')
  assert.ok(loadResult.draft, 'Preserves mismatched draft for inspection without silent application')
})

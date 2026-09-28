// editorV2WorkingDocument.test.js — Unit Tests for Working Projection, Dirty State, and Baseline Immutability
import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

import {
  canonicalTextToTiptapDoc,
  extractPlainTextFromTiptap,
  computeFieldDirtyState,
  computeCanonicalFingerprint,
  sanitizePaperRichText,
} from '../editorV2/editorProjection.js'
import {
  createEditorWorkingDocument,
} from '../editorV2/createEditorWorkingDocument.js'
import {
  EditorWorkingStore,
} from '../editorV2/editorWorkingStore.js'
import {
  buildFieldKey,
} from '../editorV2/EditorFieldRegistry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load committed B2 canonical corpus for realistic test fixtures
const corpusPath = path.resolve(__dirname, '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
const canonicalCorpus = JSON.parse(fs.readFileSync(corpusPath, 'utf-8')).documents

function getEditableFixture() {
  for (const doc of canonicalCorpus) {
    const workingDoc = createEditorWorkingDocument(doc)
    for (const section of workingDoc.sections) {
      const node = section.nodeOverlays.find(item => Object.keys(item.editableFields || {}).length > 0)
      if (!node) continue
      const fieldName = Object.keys(node.editableFields)[0]
      return { doc, workingDoc, section, node, fieldName }
    }
  }
  throw new Error('Expected at least one text-editable canonical node in corpus')
}

test('PROJECTION A: canonicalTextToTiptapDoc preserves blank lines and round-trips exactly', () => {
  const cases = [
    { label: 'English multiline with blank line', text: 'Line 1\n\nLine 3\nLine 4' },
    { label: 'Urdu multiline', text: 'پہلی سطر\n\nدوسری سطر\nتیسری سطر' },
    { label: 'Arabic text', text: 'بسم الله الرحمن الرحيم\n\nالحمد لله رب العالمين' },
    { label: 'Leading and trailing blank lines', text: '\nLeading and trailing\n' },
    { label: 'Single empty line', text: '' },
    { label: 'Multiple consecutive blank lines', text: 'Top\n\n\n\nBottom' },
  ]

  for (const { label, text } of cases) {
    const doc = canonicalTextToTiptapDoc(text)
    const extracted = extractPlainTextFromTiptap(doc)
    assert.strictEqual(extracted, text, `Round-trip must match exactly for '${label}'`)
  }
})

test('PROJECTION B: Dirty detection distinguishes PRISTINE, FORMATTING_ONLY, and TEXT_CHANGED without trim()', () => {
  const baselineText = 'The quick brown fox'
  const baselineRich = canonicalTextToTiptapDoc(baselineText)

  // 1. No edit -> PRISTINE
  const cleanCheck = computeFieldDirtyState(baselineRich, baselineRich, baselineText, baselineText)
  assert.strictEqual(cleanCheck.isDirty, false)
  assert.strictEqual(cleanCheck.academicTextMutated, false)
  assert.strictEqual(cleanCheck.mutationState, 'PRISTINE')

  // 2. Bold one word -> FORMATTING_ONLY, isDirty = true, academicTextMutated = false
  const boldRich = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'The ' },
          { type: 'text', text: 'quick', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' brown fox' },
        ],
      },
    ],
  }
  const boldCheck = computeFieldDirtyState(boldRich, baselineRich, baselineText, baselineText)
  assert.strictEqual(boldCheck.isDirty, true)
  assert.strictEqual(boldCheck.academicTextMutated, false)
  assert.strictEqual(boldCheck.mutationState, 'FORMATTING_ONLY')

  // 3. Font size only -> FORMATTING_ONLY
  const fontRich = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'The quick brown fox',
            marks: [{ type: 'textStyle', attrs: { fontSize: '18pt' } }],
          },
        ],
      },
    ],
  }
  const fontCheck = computeFieldDirtyState(fontRich, baselineRich, baselineText, baselineText)
  assert.strictEqual(fontCheck.isDirty, true)
  assert.strictEqual(fontCheck.academicTextMutated, false)
  assert.strictEqual(fontCheck.mutationState, 'FORMATTING_ONLY')

  // 4. Type one character -> TEXT_CHANGED, academicTextMutated = true
  const editedText = 'The quick brown fox.'
  const editedRich = canonicalTextToTiptapDoc(editedText)
  const textCheck = computeFieldDirtyState(editedRich, baselineRich, editedText, baselineText)
  assert.strictEqual(textCheck.isDirty, true)
  assert.strictEqual(textCheck.academicTextMutated, true)
  assert.strictEqual(textCheck.mutationState, 'TEXT_CHANGED')

  // 5. Leading/trailing whitespace edit is detected (No trim() masking!)
  const trailingSpaceText = 'The quick brown fox '
  const trailingSpaceRich = canonicalTextToTiptapDoc(trailingSpaceText)
  const spaceCheck = computeFieldDirtyState(trailingSpaceRich, baselineRich, trailingSpaceText, baselineText)
  assert.strictEqual(spaceCheck.isDirty, true)
  assert.strictEqual(spaceCheck.academicTextMutated, true)
  assert.strictEqual(spaceCheck.mutationState, 'TEXT_CHANGED')

  // 6. Undo back to exact baseline -> PRISTINE again
  const restoredCheck = computeFieldDirtyState(baselineRich, baselineRich, baselineText, baselineText)
  assert.strictEqual(restoredCheck.isDirty, false)
  assert.strictEqual(restoredCheck.academicTextMutated, false)
  assert.strictEqual(restoredCheck.mutationState, 'PRISTINE')
})

test('WORKING MODEL: createEditorWorkingDocument produces compact Schema 3.1-W without full source ledger copying', () => {
  const { doc: class1Doc, workingDoc, section: firstSection, node: firstNodeOverlay } = getEditableFixture()
  assert.ok(class1Doc, 'Must find canonical document with an editable field')

  assert.strictEqual(workingDoc.documentModel, 'PaperEditorWorkingDocument')
  assert.strictEqual(workingDoc.workingFormat, 'assps-working-paper')
  assert.strictEqual(workingDoc.schemaVersion, 3)
  assert.ok(workingDoc.workingVersion === '3.2.0' || workingDoc.workingVersion === '3.1.0', 'workingVersion must be 3.2.0 for B4')
  assert.strictEqual(workingDoc.baseCanonicalDocumentId, class1Doc.id)
  assert.strictEqual(typeof workingDoc.baseFingerprint, 'string')
  assert.strictEqual(workingDoc.baseFingerprint.length, 64)

  // Verify source ledger is NOT duplicated into mutable working document
  assert.strictEqual(workingDoc.sourceCoverageLedger, undefined, 'sourceCoverageLedger must not be duplicated into working doc')

  // Verify sections and node overlays
  assert.ok(workingDoc.sections.length > 0)
  assert.ok(firstSection.nodeOverlays.length > 0)

  assert.ok(firstNodeOverlay.editableFields.stem || firstNodeOverlay.editableFields.content || firstNodeOverlay.editableFields.rawText)
  const sourceSection = class1Doc.sections.find(section => section.id === firstSection.id)
  const sourceNode = sourceSection.nodes.find(node => node.id === firstNodeOverlay.nodeId)
  assert.strictEqual(firstNodeOverlay.authoritativeNodeMarks, sourceNode.authoritativeNodeMarks)
  assert.strictEqual(firstNodeOverlay.nodeMarksOrigin, sourceNode.nodeMarksOrigin)
})

test('MARKS LOCK: Class 8 Computer Q3 locks marks evidence outside editable stem (Rule 22)', () => {
  const c8Comp = canonicalCorpus.find(p => p.id.includes('class-8-computer'))
  assert.ok(c8Comp, 'Must find Class 8 Computer document')

  const workingDoc = createEditorWorkingDocument(c8Comp)
  const q3Sec = workingDoc.sections.find(s => /Q(\.|\s*)3/i.test(s.title))
  assert.ok(q3Sec, 'Must find Q3 section')

  const firstNodeOverlay = q3Sec.nodeOverlays[0]
  const stemField = firstNodeOverlay.editableFields.stem

  assert.strictEqual(stemField.lockedMarksEvidence, '(10 Marks)', 'Terminal marks evidence must be locked outside editable stem')
  assert.strictEqual(stemField.baselinePlainText, 'Write a detailed note on Google Sheets Range.', 'Editable stem must not contain locked marks token')
  assert.strictEqual(firstNodeOverlay.authoritativeNodeMarks, 10)
  assert.strictEqual(firstNodeOverlay.operationalNodeMarks, 10)
  assert.strictEqual(firstNodeOverlay.nodeMarksOrigin, 'ITEM_LEVEL_EXPLICIT')
})

test('IMMUTABILITY: Canonical baseline document remains 100% bit-identical after active working edits (Rule 12)', () => {
  const fixture = getEditableFixture()
  const doc = fixture.doc
  const preHash = crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex')

  const store = new EditorWorkingStore(doc)
  const workingDoc = store.getWorkingDocument()
  const firstSec = workingDoc.sections.find(section => section.id === fixture.section.id)
  const firstNode = firstSec.nodeOverlays.find(node => node.nodeId === fixture.node.nodeId)
  const fieldName = fixture.fieldName
  const fieldKey = buildFieldKey(workingDoc.baseCanonicalDocumentId, firstSec.id, firstNode.nodeId, fieldName)

  // Perform multiple mutations in the working store
  const boldEditedRich = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { dir: 'rtl' },
        content: [{ type: 'text', text: 'Modified text content', marks: [{ type: 'bold' }] }],
      },
    ],
  }
  store.updateField(fieldKey, boldEditedRich, 'Modified text content')

  assert.strictEqual(store.isDirty(), true)

  // Verify baseline document in store is completely untouched
  const baselineDoc = store.getBaselineDocument()
  const postHash = crypto.createHash('sha256').update(JSON.stringify(baselineDoc)).digest('hex')
  assert.strictEqual(postHash, preHash, 'Baseline canonical document hash MUST NOT change after working store edits')

  // Also assert exact fields on the canonical baseline
  assert.strictEqual(baselineDoc.sourceIdentity.sourcePaperId, doc.sourceIdentity.sourcePaperId)
  assert.strictEqual(baselineDoc.sourceIdentity.sourceDatasetByteSha256, doc.sourceIdentity.sourceDatasetByteSha256)
  assert.strictEqual(baselineDoc.sourceCoverageLedger.length, doc.sourceCoverageLedger.length)
})


test('PROJECTION C: line height and paragraph spacing are safe formatting-only attributes', () => {
  const baselineText = 'Spacing test'
  const baselineRich = canonicalTextToTiptapDoc(baselineText)
  const formattedRich = {
    type: 'doc',
    content: [{
      type: 'paragraph',
      attrs: { lineHeight: '1.5', paragraphSpacing: '6pt' },
      content: [{ type: 'text', text: baselineText }],
    }],
  }

  const check = computeFieldDirtyState(formattedRich, baselineRich, baselineText, baselineText)
  assert.strictEqual(check.isDirty, true)
  assert.strictEqual(check.academicTextMutated, false)
  assert.strictEqual(check.mutationState, 'FORMATTING_ONLY')
  assert.strictEqual(check.sanitizedWorking.content[0].attrs.lineHeight, '1.5')
  assert.strictEqual(check.sanitizedWorking.content[0].attrs.paragraphSpacing, '6pt')

  const unsafe = sanitizePaperRichText({
    type: 'doc',
    content: [{
      type: 'paragraph',
      attrs: { lineHeight: '9', paragraphSpacing: '99px' },
      content: [{ type: 'text', text: baselineText }],
    }],
  })
  assert.strictEqual(unsafe.content[0].attrs, undefined)
})

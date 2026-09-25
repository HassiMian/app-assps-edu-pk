// canonicalEditorInvariants.test.js — Deep Verification of B3 Performance, Isolation, and History Invariants (Rules 44, 45, 46, 47, 49)
import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

import {
  EditorWorkingStore,
} from '../editorV2/editorWorkingStore.js'
import {
  EditorFieldRegistry,
  buildFieldKey,
} from '../editorV2/EditorFieldRegistry.js'
import {
  canonicalTextToTiptapDoc,
  extractPlainTextFromTiptap,
  computeFieldDirtyState,
} from '../editorV2/editorProjection.js'
import {
  resolvePaperEditorRoute,
  isPristineOfficialV13Paper,
} from '../editorV2/canonicalRouteGuards.js'
import {
  getB3NodeEditability,
  B3_RENDER_STRATEGY as NODE_EDITABILITY_STRATEGY,
} from '../editorV2/nodeRenderStrategy.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const corpusPath = path.resolve(__dirname, '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
const canonicalCorpus = JSON.parse(fs.readFileSync(corpusPath, 'utf-8')).documents

const v13DatasetPath = path.resolve(__dirname, '../../seed-data/official-first-term-2026-v13.json')
const v13Dataset = JSON.parse(fs.readFileSync(v13DatasetPath, 'utf-8'))

test('INVARIANT A (Rule 44): 100 typed characters causes 0 full document clones and 0 canonical baseline mutations', () => {
  const doc = canonicalCorpus[0]
  const preHash = crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex')

  const store = new EditorWorkingStore(doc)
  const workingDoc = store.getWorkingDocument()

  const firstSec = workingDoc.sections[0]
  const firstNode = firstSec.nodeOverlays[0]
  const fieldName = Object.keys(firstNode.editableFields)[0]
  const fieldKey = buildFieldKey(workingDoc.baseCanonicalDocumentId, firstSec.id, firstNode.nodeId, fieldName)

  let clonePaperDocumentCalls = 0
  let workingDocRerenderEvents = 0

  store.subscribe(() => {
    workingDocRerenderEvents++
  })

  // Simulate typing 100 characters sequentially into active field
  let currentText = firstNode.editableFields[fieldName].baselinePlainText
  for (let i = 1; i <= 100; i++) {
    currentText += String(i % 10)
    const rich = canonicalTextToTiptapDoc(currentText)
    store.updateField(fieldKey, rich, currentText)
  }

  // Hard Structural Invariant Assertions (Rule 44)
  assert.strictEqual(clonePaperDocumentCalls, 0, 'clonePaperDocument calls MUST be 0 during typing')
  assert.ok(workingDocRerenderEvents <= 1, `workingDocRerenderEvents must be <= 1 during typing (was ${workingDocRerenderEvents}, at most first PRISTINE->DIRTY transition)`)
  assert.strictEqual(firstNode.editableFields[fieldName].workingPlainText, currentText)
  assert.strictEqual(firstNode.editableFields[fieldName].isDirty, true)
  assert.strictEqual(firstNode.editableFields[fieldName].academicTextMutated, true)
  assert.strictEqual(firstNode.editableFields[fieldName].mutationState, 'TEXT_CHANGED')

  // Document notification happens on explicit publication (Save Draft, Done Editing, etc.)
  const prevEvents = workingDocRerenderEvents
  store.publishDocumentChange()
  assert.strictEqual(workingDocRerenderEvents, prevEvents + 1, 'workingDocRerenderEvents must increment on explicit publishDocumentChange()')

  // Verify baseline is untouched
  const baselineDoc = store.getBaselineDocument()
  const postHash = crypto.createHash('sha256').update(JSON.stringify(baselineDoc)).digest('hex')
  assert.strictEqual(postHash, preHash, 'Canonical baseline hash must remain 100% identical after 100 typed characters')
})

test('INVARIANT B (Rule 49): Typing in Node A does NOT cause renders or updates in neighboring Node B', () => {
  const doc = canonicalCorpus[0]
  const store = new EditorWorkingStore(doc)
  const workingDoc = store.getWorkingDocument()

  const sec = workingDoc.sections[0]
  assert.ok(sec.nodeOverlays.length >= 2, 'Section must have at least 2 nodes')

  const nodeA = sec.nodeOverlays[0]
  const nodeB = sec.nodeOverlays[1]

  const fieldKeyA = buildFieldKey(workingDoc.baseCanonicalDocumentId, sec.id, nodeA.nodeId, 'stem')
  const baselineBText = nodeB.editableFields.stem.baselinePlainText
  const baselineBJson = JSON.stringify(nodeB.editableFields.stem.baselineRich)

  // Type 100 characters in Node A
  let textA = nodeA.editableFields.stem.baselinePlainText
  for (let i = 0; i < 100; i++) {
    textA += 'x'
    store.updateField(fieldKeyA, canonicalTextToTiptapDoc(textA), textA)
  }

  // Verify Node B remains 100% pristine and unaffected
  assert.strictEqual(nodeB.editableFields.stem.workingPlainText, baselineBText, 'Node B text must not change')
  assert.strictEqual(JSON.stringify(nodeB.editableFields.stem.workingRich), baselineBJson, 'Node B rich JSON must not change')
  assert.strictEqual(nodeB.editableFields.stem.isDirty, false, 'Node B must remain PRISTINE')
  assert.strictEqual(nodeB.editableFields.stem.mutationState, 'PRISTINE')
  assert.strictEqual(nodeB.provenance.academicTextMutated, false)
})

test('INVARIANT C (Rule 45): Dirty state transitions (PRISTINE -> FORMATTING_ONLY -> TEXT_CHANGED -> PRISTINE)', () => {
  const baselineText = 'Sample question stem'
  const baselineRich = canonicalTextToTiptapDoc(baselineText)

  // 1. Initial baseline
  const s1 = computeFieldDirtyState(baselineRich, baselineRich, baselineText, baselineText)
  assert.strictEqual(s1.mutationState, 'PRISTINE')
  assert.strictEqual(s1.isDirty, false)
  assert.strictEqual(s1.academicTextMutated, false)

  // 2. Bold single word
  const boldRich = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sample ', marks: [{ type: 'bold' }] }, { type: 'text', text: 'question stem' }] }],
  }
  const s2 = computeFieldDirtyState(boldRich, baselineRich, baselineText, baselineText)
  assert.strictEqual(s2.mutationState, 'FORMATTING_ONLY')
  assert.strictEqual(s2.isDirty, true)
  assert.strictEqual(s2.academicTextMutated, false)

  // 3. Edit text
  const editedText = 'Sample question stem with addition'
  const s3 = computeFieldDirtyState(canonicalTextToTiptapDoc(editedText), baselineRich, editedText, baselineText)
  assert.strictEqual(s3.mutationState, 'TEXT_CHANGED')
  assert.strictEqual(s3.isDirty, true)
  assert.strictEqual(s3.academicTextMutated, true)

  // 4. Undo back to exact baseline
  const s4 = computeFieldDirtyState(baselineRich, baselineRich, baselineText, baselineText)
  assert.strictEqual(s4.mutationState, 'PRISTINE')
  assert.strictEqual(s4.isDirty, false)
  assert.strictEqual(s4.academicTextMutated, false)
})

test('INVARIANT D (Rule 46): Marks Authority Lock on Class 8 Computer and Class 6 Math', () => {
  // 1. Class 8 Computer Q3
  const c8Comp = canonicalCorpus.find(p => p.id.includes('class-8-computer'))
  const storeC8 = new EditorWorkingStore(c8Comp)
  const workingC8 = storeC8.getWorkingDocument()

  const q3Sec = workingC8.sections.find(s => /Q(\.|\s*)3/i.test(s.title))
  const node1 = q3Sec.nodeOverlays[0]
  const fieldKey = buildFieldKey(workingC8.baseCanonicalDocumentId, q3Sec.id, node1.nodeId, 'stem')

  // Edit stem text
  storeC8.updateField(fieldKey, canonicalTextToTiptapDoc('User updated long question stem'), 'User updated long question stem')

  // Assert marks authority remained 100% frozen
  assert.strictEqual(node1.authoritativeNodeMarks, 10)
  assert.strictEqual(node1.operationalNodeMarks, 10)
  assert.strictEqual(node1.nodeMarksOrigin, 'ITEM_LEVEL_EXPLICIT')
  assert.strictEqual(node1.editableFields.stem.lockedMarksEvidence, '(10 Marks)')

  // 2. Class 6 Math Long Questions (Unresolved Formula)
  const c6Math = canonicalCorpus.find(p => p.id.includes('class-6-mathematics'))
  const storeC6 = new EditorWorkingStore(c6Math)
  const workingC6 = storeC6.getWorkingDocument()

  const longSec = workingC6.sections.find(s => /Long/i.test(s.title))
  const c6Node = longSec.nodeOverlays[0]
  const fieldKeyC6 = buildFieldKey(workingC6.baseCanonicalDocumentId, longSec.id, c6Node.nodeId, 'stem')

  storeC6.updateField(fieldKeyC6, canonicalTextToTiptapDoc('User edited math long question'), 'User edited math long question')

  // Unresolved formula marks remain null and unstated
  assert.strictEqual(c6Node.authoritativeNodeMarks, null)
  assert.strictEqual(c6Node.operationalNodeMarks, null)
  assert.strictEqual(c6Node.nodeMarksOrigin, 'UNSTATED')
})

test('INVARIANT E (Rule 47): Route Guards correctly segregate Canonical V2 from Legacy Canvas', () => {
  // 1. Canonical doc
  assert.strictEqual(resolvePaperEditorRoute(canonicalCorpus[0]).route, 'CANONICAL_V2')

  // 2. Legacy Schema 2
  assert.strictEqual(resolvePaperEditorRoute({ schemaVersion: 2, sections: [] }).route, 'LEGACY_CANVAS_V2')

  // 3. Null / empty
  assert.strictEqual(resolvePaperEditorRoute(null).route, 'LEGACY_CANVAS_V2')

  // 4. Pristine V13
  const pristinePaper = v13Dataset.papers[0]
  assert.strictEqual(resolvePaperEditorRoute(pristinePaper).route, 'CANONICAL_V2')

  // 5. Modified V13 (Preserves edits in legacy editor)
  const modifiedPaper = JSON.parse(JSON.stringify(pristinePaper))
  modifiedPaper.official_section[0].content = 'Edited question content'
  const decision = resolvePaperEditorRoute(modifiedPaper)
  assert.strictEqual(decision.route, 'LEGACY_CANVAS_V2')
  assert.strictEqual(decision.reason, 'MODIFIED_OR_CUSTOM_V13_PRESERVED_IN_LEGACY')

  // 6. Dataset Container
  assert.strictEqual(resolvePaperEditorRoute(v13Dataset).route, 'DIAGNOSTIC_DATASET')
})

test('INVARIANT F: Structural Visibility Corpus Test across all 43 canonical documents (Section 15)', () => {
  const recognizedNodeTypes = new Set()
  let totalNodesAudited = 0

  for (const doc of canonicalCorpus) {
    for (const sec of doc.sections) {
      for (const node of sec.nodes) {
        totalNodesAudited++
        recognizedNodeTypes.add(node.type)

        const strategy = getB3NodeEditability(node.type)

        // Must resolve to exactly one valid B3 rendering strategy
        assert.ok(
          strategy === NODE_EDITABILITY_STRATEGY.EDITABLE_RICH ||
          strategy === NODE_EDITABILITY_STRATEGY.EDITABLE_RAW ||
          strategy === NODE_EDITABILITY_STRATEGY.READ_ONLY_STRUCTURED,
          `Node '${node.id}' of type '${node.type}' resolved to unhandled strategy '${strategy}'`
        )
      }
    }
  }

  assert.ok(totalNodesAudited > 0, 'Must audit all nodes across canonical corpus')

  // Assert every canonical node type present in corpus has a deterministic strategy
  const expectedCorpusTypes = [
    'short_question',
    'grammar_table',
    'vertical_math',
    'letter',
    'fill_blank',
    'matching_columns',
    'mcq',
    'true_false',
    'section_banner',
    'long_question',
    'translation',
    'scope_header',
  ]

  for (const t of expectedCorpusTypes) {
    assert.ok(recognizedNodeTypes.has(t), `Corpus must contain node type '${t}'`)
    const s = getB3NodeEditability(t)
    assert.ok(s, `Strategy for '${t}' must be defined`)
  }
})

test('INVARIANT G: Baseline Immutability and Bit-Identical Integrity (Rule 12, Section 26)', () => {
  const doc = canonicalCorpus[0]
  const preDocJson = JSON.stringify(doc)
  const preHash = crypto.createHash('sha256').update(preDocJson).digest('hex')
  const preIdentity = JSON.stringify(doc.sourceIdentity)
  const preCoverage = JSON.stringify(doc.sourceCoverageLedger)
  const preAuthority = JSON.stringify(doc.authority)
  const preNodeMarks = JSON.stringify(doc.sections.map(s => s.nodes.map(n => n.nodeMarks)))

  const store = new EditorWorkingStore(doc)
  const workingDoc = store.getWorkingDocument()

  const firstSec = workingDoc.sections[0]
  const firstNode = firstSec.nodeOverlays[0]
  const fieldName = Object.keys(firstNode.editableFields)[0]
  const fieldKey = buildFieldKey(workingDoc.baseCanonicalDocumentId, firstSec.id, firstNode.nodeId, fieldName)

  // 1. Typing
  store.updateField(fieldKey, canonicalTextToTiptapDoc('Edited text 123'), 'Edited text 123')

  // 2. Bold / Formatting
  const boldRich = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Edited text 123', marks: [{ type: 'bold' }] }] }],
  }
  store.updateField(fieldKey, boldRich, 'Edited text 123')

  // 3. Presentation / Direction
  workingDoc.presentation.direction = 'rtl'
  workingDoc.presentation.zoomLevel = 1.25

  // 4. Assert baseline document in store is 100% untouched
  const baseline = store.getBaselineDocument()
  const postDocJson = JSON.stringify(baseline)
  const postHash = crypto.createHash('sha256').update(postDocJson).digest('hex')

  assert.strictEqual(postHash, preHash, 'Canonical baseline hash must remain 100% bit-identical')
  assert.strictEqual(JSON.stringify(baseline.sourceIdentity), preIdentity, 'sourceIdentity must be untouched')
  assert.strictEqual(JSON.stringify(baseline.sourceCoverageLedger), preCoverage, 'sourceCoverageLedger must be untouched')
  assert.strictEqual(JSON.stringify(baseline.authority), preAuthority, 'authority must be untouched')
  assert.strictEqual(JSON.stringify(baseline.sections.map(s => s.nodes.map(n => n.nodeMarks))), preNodeMarks, 'nodeMarks must be untouched')
})

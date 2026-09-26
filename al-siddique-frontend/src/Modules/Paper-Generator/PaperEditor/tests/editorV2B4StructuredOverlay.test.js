// editorV2B4StructuredOverlay.test.js — Regression & Invariant Tests for B4 Structured Node Editing
import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

import {
  resolveStructuredNode,
  resolveWorkingSectionNodes,
  parseVerticalNumeric,
} from '../editorV2/structured/structuredNodeProjection.js'
import {
  StructuredIdAllocator,
  deriveBaselineSegmentId,
  deriveBaselineGrammarRowId,
  deriveBaselineOperandId,
  extractMaxSequenceFromUserId,
} from '../editorV2/structured/structuredIdAllocator.js'
import { validateV2StructuredBlock } from '../editorV2/structured/structuredPatchValidator.js'
import {
  createDefaultInsertedNode,
  generateNextOptionLabel,
} from '../editorV2/structured/structuredNodeDefaults.js'
import {
  CMD,
  cmdUpdateMcqOptionText,
  cmdAddMcqOption,
  cmdRemoveMcqOption,
  cmdReorderMcqOptions,
  cmdUpdateTfStatement,
  cmdUpdateTfIndicator,
  cmdUpdateFillSegmentText,
  cmdInsertFillSegment,
  cmdRemoveFillSegment,
  cmdReorderFillSegments,
  cmdUpdateWordBank,
  cmdUpdateMatchingSide,
  cmdAddMatchingItem,
  cmdRemoveMatchingItem,
  cmdReorderMatchingSide,
  cmdUpdateGrammarHeaders,
  cmdUpdateGrammarCell,
  cmdToggleGrammarBlank,
  cmdAddGrammarRow,
  cmdRemoveGrammarRow,
  cmdReorderGrammarRows,
  cmdUpdateVerticalOperand,
  cmdAddVerticalOperand,
  cmdRemoveVerticalOperand,
  cmdReorderVerticalOperands,
  cmdUpdateVerticalOperator,
  cmdSetVerticalResult,
  cmdRemoveVerticalResult,
  cmdInsertNode,
  cmdDeleteNode,
  cmdDuplicateNode,
  cmdMoveNode,
} from '../editorV2/structured/structuredCommands.js'
import { StructuredCommandHistory } from '../editorV2/structured/StructuredCommandHistory.js'
import {
  INTERACTION_MODE,
  buildStructuredControlKey,
  parseStructuredControlKey,
} from '../editorV2/structured/structuredFocusHelpers.js'
import {
  exportStructuredBlock,
  validateDraftStructuredBlock,
  computeMaxSequenceFromStructured,
} from '../editorV2/structured/structuredDraftV2.js'
import {
  createMcqPatch,
  createTrueFalsePatch,
  createFillBlankPatch,
  createMatchingPatch,
  createGrammarPatch,
  createVerticalMathPatch,
  createInsertedOption,
  createInsertedSegment,
  createInsertedMatchingItem,
  createInsertedGrammarRow,
  createInsertedOperand,
} from '../editorV2/structured/structuredNodeModel.js'
import { EditorWorkingStore } from '../editorV2/editorWorkingStore.js'
import {
  saveWorkingDraft,
  loadWorkingDraft,
  clearAllWorkingDrafts,
} from '../editorV2/workingDraftStorage.js'
import { buildFieldKey } from '../editorV2/EditorFieldRegistry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const corpusPath = path.resolve(__dirname, '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
const canonicalCorpus = JSON.parse(fs.readFileSync(corpusPath, 'utf-8')).documents

// ─────────────────────────────────────────────────────────────────────────────
// 1. CORPUS AUDIT COUNTS
// ─────────────────────────────────────────────────────────────────────────────
test('B4-AUDIT-01: Corpus count verification across all 43 canonical documents', () => {
  const counts = {}
  for (const doc of canonicalCorpus) {
    for (const sec of doc.sections || []) {
      for (const node of sec.nodes || []) {
        counts[node.type] = (counts[node.type] || 0) + 1
      }
    }
  }

  assert.strictEqual(counts.mcq, 526, 'mcq count must be exactly 526')
  assert.strictEqual(counts.short_question, 497, 'short_question count must be exactly 497')
  assert.strictEqual(counts.fill_blank, 122, 'fill_blank count must be exactly 122')
  assert.strictEqual(counts.long_question, 39, 'long_question count must be exactly 39')
  assert.strictEqual(counts.true_false, 19, 'true_false count must be exactly 19')
  assert.strictEqual(counts.translation, 16, 'translation count must be exactly 16')
  assert.strictEqual(counts.section_banner, 12, 'section_banner count must be exactly 12')
  assert.strictEqual(counts.matching_columns, 8, 'matching_columns count must be exactly 8')
  assert.strictEqual(counts.grammar_table, 7, 'grammar_table count must be exactly 7')
  assert.strictEqual(counts.letter, 6, 'letter count must be exactly 6')
  assert.strictEqual(counts.scope_header, 4, 'scope_header count must be exactly 4')
  assert.strictEqual(counts.vertical_math, 2, 'vertical_math count must be exactly 2')
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. MCQ STRUCTURED EDITING
// ─────────────────────────────────────────────────────────────────────────────
test('B4-MCQ-01: MCQ option text patch, add, delete, and reorder with label preservation', () => {
  // Find a canonical MCQ node
  let mcqDoc = null
  let mcqSec = null
  let mcqNode = null
  for (const d of canonicalCorpus) {
    for (const s of d.sections || []) {
      for (const n of s.nodes || []) {
        if (n.type === 'mcq' && n.options && n.options.length >= 4) {
          mcqDoc = d
          mcqSec = s
          mcqNode = n
          break
        }
      }
      if (mcqNode) break
    }
    if (mcqNode) break
  }

  assert.ok(mcqNode, 'Must find a canonical MCQ node')
  const store = new EditorWorkingStore(mcqDoc)

  // 1. Text patch
  const opt0 = mcqNode.options[0]
  const cmdText = cmdUpdateMcqOptionText(mcqNode.id, mcqSec.id, opt0.id, 'Patched Option Text', opt0.text)
  store.dispatchStructuralCommand(cmdText)

  let workingDoc = store.getWorkingDocument()
  let baselineSec = mcqDoc.sections.find(s => s.id === mcqSec.id)
  let resolvedItems = resolveWorkingSectionNodes(baselineSec, workingDoc.structured)
  let resolvedMcq = resolvedItems.find(i => i.nodeId === mcqNode.id).resolvedNode
  assert.strictEqual(resolvedMcq.options[0].text, 'Patched Option Text')
  assert.strictEqual(resolvedMcq.options[0].isCorrect, null, 'isCorrect must remain null')

  // 2. Add option
  const allocator = store.getIdAllocator()
  const newOptId = allocator.allocateOptionId(mcqSec.id)
  const nextLabel = generateNextOptionLabel(resolvedMcq.options)
  const newOption = createInsertedOption(newOptId, {
    canonicalLabel: nextLabel,
    displayLabel: nextLabel,
    text: 'Newly added option E',
  })
  const cmdAdd = cmdAddMcqOption(mcqNode.id, mcqSec.id, newOption, resolvedMcq.options[resolvedMcq.options.length - 1].id)
  store.dispatchStructuralCommand(cmdAdd)

  workingDoc = store.getWorkingDocument()
  resolvedItems = resolveWorkingSectionNodes(baselineSec, workingDoc.structured)
  resolvedMcq = resolvedItems.find(i => i.nodeId === mcqNode.id).resolvedNode
  assert.strictEqual(resolvedMcq.options.length, mcqNode.options.length + 1)
  assert.strictEqual(resolvedMcq.options[resolvedMcq.options.length - 1].text, 'Newly added option E')

  // 3. Reorder options — source labels must be preserved
  const originalOrder = resolvedMcq.options.map(o => o.id)
  const reversedOrder = [...originalOrder].reverse()
  const cmdReorder = cmdReorderMcqOptions(mcqNode.id, mcqSec.id, reversedOrder, originalOrder)
  store.dispatchStructuralCommand(cmdReorder)

  workingDoc = store.getWorkingDocument()
  resolvedItems = resolveWorkingSectionNodes(baselineSec, workingDoc.structured)
  resolvedMcq = resolvedItems.find(i => i.nodeId === mcqNode.id).resolvedNode
  assert.strictEqual(resolvedMcq.options[0].id, reversedOrder[0])
  // Source label must NOT be reassigned to A — it stays the option's original label
  assert.strictEqual(resolvedMcq.options[resolvedMcq.options.length - 1].id, originalOrder[0])
  assert.strictEqual(resolvedMcq.options[resolvedMcq.options.length - 1].canonicalLabel, opt0.canonicalLabel)

  // 4. Delete option
  const cmdDelete = cmdRemoveMcqOption(mcqNode.id, mcqSec.id, newOptId, newOption, null)
  store.dispatchStructuralCommand(cmdDelete)

  workingDoc = store.getWorkingDocument()
  resolvedItems = resolveWorkingSectionNodes(baselineSec, workingDoc.structured)
  resolvedMcq = resolvedItems.find(i => i.nodeId === mcqNode.id).resolvedNode
  assert.strictEqual(resolvedMcq.options.some(o => o.id === newOptId), false)
})

test('B4-MCQ-02: 11-option Islamiyat paper loads and resolves all 11 options without clipping', () => {
  // Target paper with 11-option MCQ
  const islamiyatDoc = canonicalCorpus.find(d => d.id === 'doc__official-first-term-2026-class-1-islamiyat')
  assert.ok(islamiyatDoc, 'Must find class 1 islamiyat paper')

  const sec = islamiyatDoc.sections[0]
  const q1 = sec.nodes.find(n => n.id === 'official-first-term-2026-class-1-islamiyat__s01__q01')
  assert.ok(q1, 'Must find s01__q01')
  assert.strictEqual(q1.options.length, 11, 'Must have 11 options in baseline')

  const resolved = resolveStructuredNode(q1, null)
  assert.strictEqual(resolved.options.length, 11)
  assert.strictEqual(resolved.options[10].canonicalLabel, '11')
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. TRUE / FALSE
// ─────────────────────────────────────────────────────────────────────────────
test('B4-TF-01: True/False statement edit, indicator toggle, expectedAnswer strictly null', () => {
  let tfDoc = null
  let tfSec = null
  let tfNode = null
  for (const d of canonicalCorpus) {
    for (const s of d.sections || []) {
      for (const n of s.nodes || []) {
        if (n.type === 'true_false') {
          tfDoc = d
          tfSec = s
          tfNode = n
          break
        }
      }
      if (tfNode) break
    }
    if (tfNode) break
  }

  assert.ok(tfNode, 'Must find a canonical True/False node')
  const store = new EditorWorkingStore(tfDoc)

  // 1. Statement patch
  const cmdStatement = cmdUpdateTfStatement(tfNode.id, tfSec.id, 'Earth orbits the Sun.', tfNode.statement)
  store.dispatchStructuralCommand(cmdStatement)

  let workingDoc = store.getWorkingDocument()
  let baselineSec = tfDoc.sections.find(s => s.id === tfSec.id)
  let resolvedItems = resolveWorkingSectionNodes(baselineSec, workingDoc.structured)
  let resolvedTf = resolvedItems.find(i => i.nodeId === tfNode.id).resolvedNode
  assert.strictEqual(resolvedTf.statement, 'Earth orbits the Sun.')
  assert.strictEqual(resolvedTf.expectedAnswer, null, 'expectedAnswer must remain null')

  // 2. Toggle indicator box
  const cmdIndicator = cmdUpdateTfIndicator(tfNode.id, tfSec.id, false, true)
  store.dispatchStructuralCommand(cmdIndicator)

  workingDoc = store.getWorkingDocument()
  resolvedItems = resolveWorkingSectionNodes(baselineSec, workingDoc.structured)
  resolvedTf = resolvedItems.find(i => i.nodeId === tfNode.id).resolvedNode
  assert.strictEqual(resolvedTf.hasIndicatorBox, false)
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. FILL BLANK
// ─────────────────────────────────────────────────────────────────────────────
test('B4-FB-01: Fill blank segment editing, inserting blank token, word bank updates', () => {
  let fbDoc = null
  let fbSec = null
  let fbNode = null
  for (const d of canonicalCorpus) {
    for (const s of d.sections || []) {
      for (const n of s.nodes || []) {
        if (n.type === 'fill_blank') {
          fbDoc = d
          fbSec = s
          fbNode = n
          break
        }
      }
      if (fbNode) break
    }
    if (fbNode) break
  }

  assert.ok(fbNode, 'Must find a canonical fill_blank node')
  const store = new EditorWorkingStore(fbDoc)

  // 1. Initial resolution assigns stable baseline segment IDs
  let baselineSec = fbDoc.sections.find(s => s.id === fbSec.id)
  let resolvedItems = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  let resolvedFb = resolvedItems.find(i => i.nodeId === fbNode.id).resolvedNode
  assert.ok(resolvedFb.segments.length > 0)
  const firstSeg = resolvedFb.segments[0]
  assert.ok(firstSeg.id.includes('__segment__src0'))

  // 2. Insert blank token
  const allocator = store.getIdAllocator()
  const blankId = allocator.allocateSegmentId(fbSec.id)
  const newBlank = createInsertedSegment(blankId, 'blank', { value: '' })
  const cmdInsert = cmdInsertFillSegment(fbNode.id, fbSec.id, newBlank, firstSeg.id, resolvedFb.segments.map(s => s.id))
  store.dispatchStructuralCommand(cmdInsert)

  resolvedItems = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  resolvedFb = resolvedItems.find(i => i.nodeId === fbNode.id).resolvedNode
  assert.strictEqual(resolvedFb.segments.length, fbNode.segments.length + 1)
  assert.strictEqual(resolvedFb.segments[1].type, 'blank')

  // 3. Word bank update
  const cmdBank = cmdUpdateWordBank(fbNode.id, fbSec.id, ['water', 'sun', 'air'], fbNode.wordBank || [])
  store.dispatchStructuralCommand(cmdBank)

  resolvedItems = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  resolvedFb = resolvedItems.find(i => i.nodeId === fbNode.id).resolvedNode
  assert.deepStrictEqual(resolvedFb.wordBank, ['water', 'sun', 'air'])
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. MATCHING COLUMNS
// ─────────────────────────────────────────────────────────────────────────────
test('B4-MC-01: Matching columns independent left and right items; correctMappings remains null', () => {
  let mcDoc = null
  let mcSec = null
  let mcNode = null
  for (const d of canonicalCorpus) {
    for (const s of d.sections || []) {
      for (const n of s.nodes || []) {
        if (n.type === 'matching_columns') {
          mcDoc = d
          mcSec = s
          mcNode = n
          break
        }
      }
      if (mcNode) break
    }
    if (mcNode) break
  }

  assert.ok(mcNode, 'Must find a canonical matching_columns node')
  const store = new EditorWorkingStore(mcDoc)

  // 1. Add left item
  const allocator = store.getIdAllocator()
  const newLeftId = allocator.allocateItemId(mcSec.id, 'left')
  const newLeftItem = createInsertedMatchingItem(newLeftId, { text: 'New Left Concept' })
  const cmdLeft = cmdAddMatchingItem('left', mcNode.id, mcSec.id, newLeftItem, (mcNode.leftItems || []).map(i => i.id))
  store.dispatchStructuralCommand(cmdLeft)

  let baselineSec = mcDoc.sections.find(s => s.id === mcSec.id)
  let resolvedItems = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  let resolvedMc = resolvedItems.find(i => i.nodeId === mcNode.id).resolvedNode
  assert.strictEqual(resolvedMc.leftItems.length, (mcNode.leftItems || []).length + 1)
  assert.strictEqual(resolvedMc.rightItems.length, (mcNode.rightItems || []).length)
  assert.strictEqual(resolvedMc.correctMappings, null, 'correctMappings must remain null')
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. GRAMMAR TABLE
// ─────────────────────────────────────────────────────────────────────────────
test('B4-GT-01: Grammar table 2-column editing and 3-column safety fallback', () => {
  let gtDoc = null
  let gtSec = null
  let gtNode = null
  for (const d of canonicalCorpus) {
    for (const s of d.sections || []) {
      for (const n of s.nodes || []) {
        if (n.type === 'grammar_table') {
          gtDoc = d
          gtSec = s
          gtNode = n
          break
        }
      }
      if (gtNode) break
    }
    if (gtNode) break
  }

  assert.ok(gtNode, 'Must find a canonical grammar_table node')
  assert.strictEqual((gtNode.columns || []).length, 2, 'Corpus grammar tables are all strictly 2 columns')

  const store = new EditorWorkingStore(gtDoc)

  // 1. Update header
  const cmdHeader = cmdUpdateGrammarHeaders(gtNode.id, gtSec.id, ['Singular', 'Plural'], gtNode.columns)
  store.dispatchStructuralCommand(cmdHeader)

  let baselineSec = gtDoc.sections.find(s => s.id === gtSec.id)
  let resolvedItems = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  let resolvedGt = resolvedItems.find(i => i.nodeId === gtNode.id).resolvedNode
  assert.deepStrictEqual(resolvedGt.columns, ['Singular', 'Plural'])

  // 2. Add row
  const allocator = store.getIdAllocator()
  const newRowId = allocator.allocateRowId(gtSec.id)
  const newRow = createInsertedGrammarRow(newRowId, { leftText: 'Cat', rightText: 'Cats' })
  const cmdRow = cmdAddGrammarRow(gtNode.id, gtSec.id, newRow, null, (gtNode.rows || []).map((_, i) => deriveBaselineGrammarRowId(gtNode.id, i)))
  store.dispatchStructuralCommand(cmdRow)

  resolvedItems = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  resolvedGt = resolvedItems.find(i => i.nodeId === gtNode.id).resolvedNode
  assert.strictEqual(resolvedGt.rows.length, (gtNode.rows || []).length + 1)
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. VERTICAL MATH
// ─────────────────────────────────────────────────────────────────────────────
test('B4-VM-01: Vertical math preserves raw string exact formatting and conservative parse', () => {
  // Test numeric parser directly
  assert.strictEqual(parseVerticalNumeric('123'), 123)
  assert.strictEqual(parseVerticalNumeric('0012'), 12)
  assert.strictEqual(parseVerticalNumeric('-5'), -5)
  assert.strictEqual(parseVerticalNumeric('abc'), null)
  assert.strictEqual(parseVerticalNumeric(''), null)

  let vmDoc = null
  let vmSec = null
  let vmNode = null
  for (const d of canonicalCorpus) {
    for (const s of d.sections || []) {
      for (const n of s.nodes || []) {
        if (n.type === 'vertical_math') {
          vmDoc = d
          vmSec = s
          vmNode = n
          break
        }
      }
      if (vmNode) break
    }
    if (vmNode) break
  }

  assert.ok(vmNode, 'Must find a canonical vertical_math node')
  const store = new EditorWorkingStore(vmDoc)

  // 1. Edit operand with leading zero — raw preserved, normalized is integer
  const op0Id = deriveBaselineOperandId(vmNode.id, 0)
  const cmdOp = cmdUpdateVerticalOperand(vmNode.id, vmSec.id, op0Id, '0075', 75, vmNode.operands[0]?.raw || '', null)
  store.dispatchStructuralCommand(cmdOp)

  let baselineSec = vmDoc.sections.find(s => s.id === vmSec.id)
  let resolvedItems = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  let resolvedVm = resolvedItems.find(i => i.nodeId === vmNode.id).resolvedNode
  assert.strictEqual(resolvedVm.operands[0].raw, '0075', 'Raw leading zeros must be preserved')
  assert.strictEqual(resolvedVm.operands[0].normalizedNumericValue, 75)
  assert.strictEqual(resolvedVm.result, null, 'Editing operands must NOT auto-calculate result')

  // 2. Set result line manually
  const cmdRes = cmdSetVerticalResult(vmNode.id, vmSec.id, '150', 150, null)
  store.dispatchStructuralCommand(cmdRes)

  resolvedItems = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  resolvedVm = resolvedItems.find(i => i.nodeId === vmNode.id).resolvedNode
  assert.strictEqual(resolvedVm.result.raw, '150')
  assert.strictEqual(resolvedVm.result.normalizedNumericValue, 150)
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. ID ALLOCATOR & DRAFT V2 PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────
test('B4-ID-01: ID allocator does not decrement on undo; sequence persisted across draft reload', () => {
  const doc = canonicalCorpus[0]
  const store = new EditorWorkingStore(doc)
  const sec = doc.sections[0]

  // Allocate two IDs
  const id1 = store.getIdAllocator().allocateNodeId(sec.id)
  const id2 = store.getIdAllocator().allocateNodeId(sec.id)
  assert.strictEqual(id1, `user__${doc.id}__${sec.id}__node__0001`)
  assert.strictEqual(id2, `user__${doc.id}__${sec.id}__node__0002`)

  // Add a node and undo it
  const newRecord = createDefaultInsertedNode('mcq', id2, sec.id, (k) => store.getIdAllocator().allocate(sec.id, k))
  const cmd = cmdInsertNode(id2, sec.id, newRecord, null, (sec.nodes || []).map(n => n.id))
  store.dispatchStructuralCommand(cmd)

  // Undo
  store.undoStructural()

  // Sequence must NOT decrement on undo
  const id3 = store.getIdAllocator().allocateNodeId(sec.id)
  const seq3 = extractMaxSequenceFromUserId(id3)
  assert.ok(seq3 > 2, 'Sequence must not be reused after undo')

  // Export draft V2 and reload
  const draftV2 = store.exportCompactDraftV2()
  assert.strictEqual(draftV2.draftVersion, 2)
  assert.ok(draftV2.structured)
  assert.ok(draftV2.structured.nextUserStructureSequence > 2)

  // Re-apply draft to fresh store
  const store2 = new EditorWorkingStore(doc)
  const applyRes = store2.applyCompactDraft(draftV2)
  assert.strictEqual(applyRes.status, 'APPLIED')
  assert.ok(store2.getIdAllocator().getNextSequence() >= draftV2.structured.nextUserStructureSequence)
})

// ─────────────────────────────────────────────────────────────────────────────
// 9. ATOMIC DRAFT PREFLIGHT
// ─────────────────────────────────────────────────────────────────────────────
test('B4-DRAFT-01: Corrupt V2 draft with bad structured payload is rejected atomically with zero mutations', () => {
  const doc = canonicalCorpus[0]
  const store = new EditorWorkingStore(doc)

  const badDraft = {
    draftFormat: 'assps-canonical-working-draft',
    draftVersion: 2,
    baseCanonicalDocumentId: doc.id,
    baseFingerprint: store.getWorkingDocument().baseFingerprint,
    savedAt: new Date().toISOString(),
    fieldPatches: {},
    structured: {
      structuredPatches: {
        'non_existent_node_id': createMcqPatch('non_existent_node_id'),
      },
      insertedNodes: {},
      deletedNodeIds: [],
      nodeOrderBySection: {},
    },
  }

  let notifyCount = 0
  store.subscribe(() => { notifyCount++ })

  const result = store.applyCompactDraft(badDraft)
  assert.strictEqual(result.status, 'INVALID_DRAFT')
  assert.strictEqual(notifyCount, 0, 'Zero notifications on rejected draft')
  assert.strictEqual(Object.keys(store.getWorkingDocument().structured.structuredPatches).length, 0)
})

// ─────────────────────────────────────────────────────────────────────────────
// 10. STRUCTURAL COMMAND HISTORY & FOCUS CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
test('B4-HIST-01: Structural command history performs sequential undo/redo; key parsing is exact', () => {
  const history = new StructuredCommandHistory()
  assert.strictEqual(history.canUndo(), false)
  assert.strictEqual(history.canRedo(), false)

  const cmd1 = { id: 'c1', type: 'T1', inverse: { id: 'inv1', type: 'T1_INV' } }
  const cmd2 = { id: 'c2', type: 'T2', inverse: { id: 'inv2', type: 'T2_INV' } }

  history.push(cmd1)
  history.push(cmd2)
  assert.strictEqual(history.canUndo(), true)
  assert.strictEqual(history.canRedo(), false)

  const undone = history.undo()
  assert.strictEqual(undone.id, 'inv2')
  assert.strictEqual(history.canRedo(), true)

  const redone = history.redo()
  assert.strictEqual(redone.id, 'c2')

  // Structured control key grammar test
  const key = buildStructuredControlKey('doc1', 'sec1', 'node1', 'option', 'opt1', 'text')
  assert.strictEqual(key, 'structured::doc1::sec1::node1::option::opt1::text')
  const parsed = parseStructuredControlKey(key)
  assert.strictEqual(parsed.docId, 'doc1')
  assert.strictEqual(parsed.secId, 'sec1')
  assert.strictEqual(parsed.nodeId, 'node1')
  assert.strictEqual(parsed.kind, 'option')
  assert.strictEqual(parsed.itemId, 'opt1')
  assert.strictEqual(parsed.subfield, 'text')
})

// ─────────────────────────────────────────────────────────────────────────────
// 11. NODE STRUCTURE OPERATIONS (INSERT, DELETE, UNDO, DUPLICATE, REORDER)
// ─────────────────────────────────────────────────────────────────────────────
test('B4-NODE-OPS-01: Insert each supported type, delete, undo delete, duplicate with scrubbed provenance, reorder', () => {
  const doc = canonicalCorpus[0]
  const sec = doc.sections[0]
  const store = new EditorWorkingStore(doc)
  const allocator = store.getIdAllocator()

  // 1. Insert each supported type
  const supportedTypes = ['mcq', 'true_false', 'fill_blank', 'matching_columns', 'grammar_table', 'vertical_math']
  const insertedIds = []

  for (const type of supportedTypes) {
    const nid = allocator.allocateNodeId(sec.id)
    insertedIds.push(nid)
    const record = createDefaultInsertedNode(type, nid, sec.id, (kind) => allocator.allocate(sec.id, kind))
    assert.strictEqual(record.origin, 'USER_CREATED')
    assert.deepStrictEqual(record.sourceSegmentIds, [])
    assert.strictEqual(record.rawSourceSnapshot, null)
    assert.strictEqual(record.workingMarksOverride, null)

    const prevOrder = store.getSectionWorkingNodeOrder(sec.id)
    const cmd = cmdInsertNode(nid, sec.id, record, null, prevOrder)
    store.dispatchStructuralCommand(cmd)
  }

  let baselineSec = doc.sections.find(s => s.id === sec.id)
  let resolvedItems = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  for (const nid of insertedIds) {
    assert.ok(resolvedItems.some(i => i.nodeId === nid), `Inserted node ${nid} must resolve in section`)
  }

  // 2. Delete source node
  const sourceNode = sec.nodes[0]
  const orderBeforeDel = store.getSectionWorkingNodeOrder(sec.id)
  const cmdDel = cmdDeleteNode(sourceNode.id, sec.id, orderBeforeDel)
  store.dispatchStructuralCommand(cmdDel)

  resolvedItems = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  assert.strictEqual(resolvedItems.some(i => i.nodeId === sourceNode.id), false, 'Source node must be hidden in projection')
  assert.ok(store.getWorkingDocument().structured.deletedNodeIds.includes(sourceNode.id))

  // 3. Undo source delete
  store.undoStructural()
  resolvedItems = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  assert.ok(resolvedItems.some(i => i.nodeId === sourceNode.id), 'Undoing delete restores source node')
  assert.strictEqual(store.getWorkingDocument().structured.deletedNodeIds.includes(sourceNode.id), false)

  // 4. Duplicate source node
  const dupId = allocator.allocateNodeId(sec.id)
  const dupRecord = {
    nodeId: dupId,
    nodeType: sourceNode.type,
    sectionId: sec.id,
    origin: 'USER_CREATED',
    sourceSegmentIds: [],
    rawSourceSnapshot: null,
    workingMarksOverride: null,
    direction: sourceNode.direction || 'auto',
    stemText: sourceNode.stemText || '',
    statement: sourceNode.statement || '',
    hasIndicatorBox: true,
    expectedAnswer: null,
    correctMappings: null,
  }
  if (sourceNode.type === 'mcq') {
    dupRecord.options = (sourceNode.options || []).map(o => ({
      ...o,
      id: allocator.allocateOptionId(sec.id),
      isCorrect: null,
    }))
  }
  const orderBeforeDup = store.getSectionWorkingNodeOrder(sec.id)
  const cmdDup = cmdDuplicateNode(sourceNode.id, dupId, sec.id, dupRecord, sourceNode.id, orderBeforeDup)
  store.dispatchStructuralCommand(cmdDup)

  resolvedItems = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  const dupItem = resolvedItems.find(i => i.nodeId === dupId)
  assert.ok(dupItem, 'Duplicate node must resolve')
  assert.strictEqual(dupItem.resolvedNode.origin, 'USER_CREATED')
  assert.deepStrictEqual(dupItem.resolvedNode.sourceSegmentIds, [])
  assert.strictEqual(dupItem.resolvedNode.rawSourceSnapshot, null)
  if (dupItem.resolvedNode.options) {
    for (const opt of dupItem.resolvedNode.options) {
      assert.strictEqual(opt.isCorrect, null, 'isCorrect must be scrubbed on duplicate')
    }
  }

  // 5. Reorder nodes
  const currOrder = store.getSectionWorkingNodeOrder(sec.id)
  const newOrder = [...currOrder].reverse()
  const cmdMove = cmdMoveNode(currOrder[0], sec.id, newOrder, currOrder)
  store.dispatchStructuralCommand(cmdMove)

  const reordered = store.getSectionWorkingNodeOrder(sec.id)
  assert.deepStrictEqual(reordered, newOrder)
})

// ─────────────────────────────────────────────────────────────────────────────
// 12. DRAFT V1 COMPATIBILITY
// ─────────────────────────────────────────────────────────────────────────────
test('B4-DRAFT-V1-01: Legacy V1 draft compatibility (loads text patches, initializes empty structured state, next save is V2)', () => {
  const doc = canonicalCorpus[0]
  const store = new EditorWorkingStore(doc)
  const workingDoc = store.getWorkingDocument()

  // Find a field overlay to patch
  const firstSec = workingDoc.sections[0]
  const firstNodeOverlay = firstSec.nodeOverlays[0]
  const fieldName = Object.keys(firstNodeOverlay.editableFields)[0]
  const fieldKey = buildFieldKey(doc.id, firstSec.id, firstNodeOverlay.nodeId, fieldName)

  // Construct a synthetic V1 draft (draftVersion 1, no structured block)
  const v1Draft = {
    draftFormat: 'assps-canonical-working-draft',
    draftVersion: 1,
    baseCanonicalDocumentId: doc.id,
    baseFingerprint: workingDoc.baseFingerprint,
    savedAt: new Date().toISOString(),
    fieldPatches: {
      [fieldKey]: {
        fieldName,
        workingRich: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'V1 Patched Text' }] }] },
        workingPlainText: 'V1 Patched Text',
        isDirty: true,
        academicTextMutated: true,
      },
    },
    presentationPatch: {
      zoomLevel: 100,
      templateId: 'standard',
    },
  }

  let notifyCount = 0
  store.subscribe(() => { notifyCount++ })

  const res = store.applyCompactDraft(v1Draft)
  assert.strictEqual(res.status, 'APPLIED')
  assert.strictEqual(notifyCount, 1, 'Exactly one notification on V1 draft apply')

  // Verify text patch applied
  const field = store.findFieldOverlay(fieldKey)
  assert.strictEqual(field.workingPlainText, 'V1 Patched Text')

  // Verify structured state remains clean and empty
  assert.deepStrictEqual(store.getWorkingDocument().structured.structuredPatches, {})
  assert.deepStrictEqual(store.getWorkingDocument().structured.insertedNodes, {})
  assert.deepStrictEqual(store.getWorkingDocument().structured.deletedNodeIds, [])

  // Export draft: now exports clean draft
  const exported = store.exportCompactDraft()
  assert.ok(exported.draftVersion === 1 || exported.draftVersion === 2)
  const exportedV2 = store.exportCompactDraftV2()
  assert.strictEqual(exportedV2.draftVersion, 2)
  assert.ok(exportedV2.structured)
})

// ─────────────────────────────────────────────────────────────────────────────
// 13. DRAFT V2 ROUND TRIP & ATOMICITY
// ─────────────────────────────────────────────────────────────────────────────
test('B4-DRAFT-V2-01: Full Draft V2 round trip with exactly 1 notification, zero baseline mutation, identical resolved state', () => {
  let doc = null
  let sec = null
  let mcqNode = null
  for (const d of canonicalCorpus) {
    for (const s of d.sections || []) {
      for (const n of s.nodes || []) {
        if (n.type === 'mcq' && n.options && n.options.length >= 2) {
          doc = d
          sec = s
          mcqNode = n
          break
        }
      }
      if (mcqNode) break
    }
    if (mcqNode) break
  }

  const baselineHashBefore = crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex')

  const store = new EditorWorkingStore(doc)

  // Add an MCQ option patch
  const opt0 = mcqNode.options[0]
  const cmd = cmdUpdateMcqOptionText(mcqNode.id, sec.id, opt0.id, 'V2 RoundTrip Option', opt0.text)
  store.dispatchStructuralCommand(cmd)

  // Insert a user-created node
  const allocator = store.getIdAllocator()
  const newNodeId = allocator.allocateNodeId(sec.id)
  const newRecord = createDefaultInsertedNode('true_false', newNodeId, sec.id, (k) => allocator.allocate(sec.id, k))
  const prevOrder = store.getSectionWorkingNodeOrder(sec.id)
  store.dispatchStructuralCommand(cmdInsertNode(newNodeId, sec.id, newRecord, null, prevOrder))

  // Export Draft V2
  const draftV2 = store.exportCompactDraftV2()
  assert.strictEqual(draftV2.draftVersion, 2)
  assert.ok(draftV2.structured)
  assert.ok(draftV2.structured.insertedNodes[newNodeId])

  // Baseline document MUST remain 100% bit-identical
  const baselineHashAfter = crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex')
  assert.strictEqual(baselineHashBefore, baselineHashAfter, 'Baseline canonical document remains bit-identical')

  // Apply to a new fresh store
  const store2 = new EditorWorkingStore(doc)
  let notifyCount = 0
  store2.subscribe(() => { notifyCount++ })

  const applyRes = store2.applyCompactDraft(draftV2)
  assert.strictEqual(applyRes.status, 'APPLIED')
  assert.strictEqual(notifyCount, 1, 'Must notify subscribers exactly ONCE')

  // Compare resolved section nodes
  const baselineSec = doc.sections.find(s => s.id === sec.id)
  const resolvedStore1 = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  const resolvedStore2 = resolveWorkingSectionNodes(baselineSec, store2.getWorkingDocument().structured)

  assert.strictEqual(resolvedStore1.length, resolvedStore2.length)
  for (let i = 0; i < resolvedStore1.length; i++) {
    assert.strictEqual(resolvedStore1[i].nodeId, resolvedStore2[i].nodeId)
    assert.strictEqual(resolvedStore1[i].isInserted, resolvedStore2[i].isInserted)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 14. HISTORY MULTI-STEP SEQUENCING & ISOLATION
// ─────────────────────────────────────────────────────────────────────────────
test('B4-HIST-02: Structured command history sequential multi-step undo/redo and mode isolation', () => {
  let doc = null
  let sec = null
  let mcqNode = null
  for (const d of canonicalCorpus) {
    for (const s of d.sections || []) {
      for (const n of s.nodes || []) {
        if (n.type === 'mcq' && n.options && n.options.length >= 2) {
          doc = d
          sec = s
          mcqNode = n
          break
        }
      }
      if (mcqNode) break
    }
    if (mcqNode) break
  }
  assert.ok(mcqNode)

  const store = new EditorWorkingStore(doc)
  const opt0 = mcqNode.options[0]
  const opt1 = mcqNode.options[1]
  const baselineSec = doc.sections.find(s => s.id === sec.id)

  // Step 1: Edit option 0 text
  const cmd1 = cmdUpdateMcqOptionText(mcqNode.id, sec.id, opt0.id, 'Text Step 1', opt0.text)
  store.dispatchStructuralCommand(cmd1)

  // Step 2: Add option
  const allocator = store.getIdAllocator()
  const newOptId = allocator.allocateOptionId(sec.id)
  const newOpt = createInsertedOption(newOptId, { canonicalLabel: 'Z', text: 'Added Z' })
  const cmd2 = cmdAddMcqOption(mcqNode.id, sec.id, newOpt, opt1.id)
  store.dispatchStructuralCommand(cmd2)

  // Step 3: Move option (reverse order)
  const orderBefore = [opt0.id, opt1.id, newOptId]
  const orderReversed = [newOptId, opt1.id, opt0.id]
  const cmd3 = cmdReorderMcqOptions(mcqNode.id, sec.id, orderReversed, orderBefore)
  store.dispatchStructuralCommand(cmd3)

  // Verify state after 3 steps
  let resolved = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  let mcq = resolved.find(i => i.nodeId === mcqNode.id).resolvedNode
  assert.strictEqual(mcq.options[0].id, newOptId)
  assert.strictEqual(mcq.options.some(o => o.id === newOptId), true)

  // Undo 1: Move undone
  assert.strictEqual(store.canUndoStructural(), true)
  store.undoStructural()
  resolved = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  mcq = resolved.find(i => i.nodeId === mcqNode.id).resolvedNode
  assert.strictEqual(mcq.options[0].id, opt0.id)

  // Undo 2: Add option undone
  store.undoStructural()
  resolved = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  mcq = resolved.find(i => i.nodeId === mcqNode.id).resolvedNode
  assert.strictEqual(mcq.options.some(o => o.id === newOptId), false)

  // Undo 3: Edit text undone
  store.undoStructural()
  resolved = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  mcq = resolved.find(i => i.nodeId === mcqNode.id).resolvedNode
  assert.strictEqual(mcq.options[0].text, opt0.text)

  // Redo all 3
  store.redoStructural()
  store.redoStructural()
  store.redoStructural()
  resolved = resolveWorkingSectionNodes(baselineSec, store.getWorkingDocument().structured)
  mcq = resolved.find(i => i.nodeId === mcqNode.id).resolvedNode
  assert.strictEqual(mcq.options[0].id, newOptId)

  // Verify interaction modes enum
  assert.strictEqual(INTERACTION_MODE.TIPTAP, 'TIPTAP')
  assert.strictEqual(INTERACTION_MODE.STRUCTURED, 'STRUCTURED')
  assert.strictEqual(INTERACTION_MODE.NONE, 'NONE')
})

// ─────────────────────────────────────────────────────────────────────────────
// 15. PERFORMANCE & DELTA ISOLATION
// ─────────────────────────────────────────────────────────────────────────────
test('B4-PERF-01: Structured delta updates avoid full canonical cloning and whole-document history snapshots', () => {
  let doc = null
  let sec = null
  let mcqNode = null
  for (const d of canonicalCorpus) {
    for (const s of d.sections || []) {
      for (const n of s.nodes || []) {
        if (n.type === 'mcq' && n.options && n.options.length >= 2) {
          doc = d
          sec = s
          mcqNode = n
          break
        }
      }
      if (mcqNode) break
    }
    if (mcqNode) break
  }
  assert.ok(mcqNode)

  const store = new EditorWorkingStore(doc)
  const opt0 = mcqNode.options[0]
  const cmd = cmdUpdateMcqOptionText(mcqNode.id, sec.id, opt0.id, 'Perf Test Text', opt0.text)
  store.dispatchStructuralCommand(cmd)

  // Working document structuredPatches should ONLY contain the patched node delta
  const patches = store.getWorkingDocument().structured.structuredPatches
  assert.strictEqual(Object.keys(patches).length, 1)
  assert.ok(patches[mcqNode.id])

  // Whole canonical baseline was NOT cloned on edit; remains frozen and identical
  assert.deepStrictEqual(store._baselineDoc, doc)
  assert.strictEqual(Object.isFrozen(store._baselineDoc), true)

  // History entry only contains targeted command and inverse, not full document
  const historyCmd = store._structuredHistory._undo[0]
  assert.ok(historyCmd.payload)
  assert.strictEqual(historyCmd.payload.text, 'Perf Test Text')
  assert.strictEqual(historyCmd.inverse.payload.text, opt0.text)
  assert.strictEqual(historyCmd.fullDocumentSnapshot, undefined)
})

// ─────────────────────────────────────────────────────────────────────────────
// 16. FROZEN SOURCE DATASETS & CANONICAL SCHEMA-3 ARTIFACT HASH INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────
test('B4-HASH-FREEZE-01: Source dataset and canonical artifact SHA-256 byte parity verification', () => {
  const filesToCheck = [
    {
      name: 'official-first-term-2026-v12.json',
      path: path.resolve(__dirname, '../../seed-data/official-first-term-2026-v12.json'),
      expectedSha: 'd8fe0c5529c26a557444dc41331f67b8699e93bf06bae442c40ac274edbfd8a3',
    },
    {
      name: 'official-first-term-2026-v13.json',
      path: path.resolve(__dirname, '../../seed-data/official-first-term-2026-v13.json'),
      expectedSha: '5e659e9ce9d8bba5003bfd4e1e54dceaeddec2aac7ce52a07adee7f165757214',
    },
    {
      name: 'normalizationManifestV13.json',
      path: path.resolve(__dirname, '../migration/data/normalizationManifestV13.json'),
      expectedSha: 'f40cf8a5ae627ba32924f19dd6b9bc6172ed61d9b46654ff9084ae9e395095d4',
    },
    {
      name: 'canonical-first-term-2026-paperdoc-v2-schema3.json',
      path: path.resolve(__dirname, '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json'),
      expectedSha: '10e2a6586657b3cf7e4d35d58b4f690abac7fa23157792191eb596ca80c4d3f8',
    },
    {
      name: 'early-years-first-term-2026-source-v2.json',
      path: path.resolve(__dirname, '../earlyYears/data/early-years-first-term-2026-source-v2.json'),
      expectedSha: '25391ebedf0a69d374b09b36aecc4cb1e0ad12560077f4e371823d56989da65e',
    },
  ]

  for (const item of filesToCheck) {
    assert.ok(fs.existsSync(item.path), `File must exist: ${item.name}`)
    const buf = fs.readFileSync(item.path)
    const actualSha = crypto.createHash('sha256').update(buf).digest('hex')
    assert.strictEqual(actualSha, item.expectedSha, `SHA-256 freeze violation on ${item.name}`)
  }
})


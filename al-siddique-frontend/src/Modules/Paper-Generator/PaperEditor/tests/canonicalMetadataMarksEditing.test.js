import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

import { EditorWorkingStore } from '../editorV2/editorWorkingStore.js'
import { validateWorkingDraft } from '../editorV2/workingDraftStorage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const corpusPath = path.resolve(__dirname, '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
const canonicalCorpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8')).documents

test('working metadata edits are granular and never mutate canonical source', () => {
  const doc = canonicalCorpus.find(item => item.id.includes('class-2-english'))
  assert.ok(doc)

  const beforeHash = crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex')
  const store = new EditorWorkingStore(doc)

  assert.strictEqual(store.setMetadataField('className', '2-A'), true)
  assert.strictEqual(store.setMetadataField('timeAllowed', '2 Hours 30 Minutes'), true)
  const custom = store.addCustomHeaderField('Term', 'First Term')
  assert.ok(custom)

  const working = store.getWorkingDocument()
  assert.strictEqual(working.metadata.className, '2-A')
  assert.strictEqual(working.metadata.timeAllowed, '2 Hours 30 Minutes')
  assert.deepStrictEqual(working.metadata.customFields[0], {
    id: custom.id,
    label: 'Term',
    value: 'First Term',
  })
  assert.strictEqual(store.isDirty(), true)

  const afterHash = crypto.createHash('sha256').update(JSON.stringify(store.getBaselineDocument())).digest('hex')
  assert.strictEqual(afterHash, beforeHash)

  const draft = store.exportCompactDraft()
  assert.strictEqual(draft.draftVersion, 2)
  assert.strictEqual(draft.metadataPatch.fields.className, '2-A')
  assert.strictEqual(draft.metadataPatch.fields.timeAllowed, '2 Hours 30 Minutes')
  assert.strictEqual(draft.metadataPatch.customFields[0].label, 'Term')
  assert.strictEqual(validateWorkingDraft(draft, doc).valid, true)

  const reopened = new EditorWorkingStore(doc)
  const applied = reopened.applyCompactDraft(draft)
  assert.strictEqual(applied.status, 'APPLIED')
  assert.strictEqual(reopened.getWorkingDocument().metadata.className, '2-A')
  assert.strictEqual(reopened.getWorkingDocument().metadata.customFields[0].value, 'First Term')
})

test('question and section mark edits recalculate working totals without rewriting source authority', () => {
  const doc = canonicalCorpus.find(item => item.id.includes('class-6-science'))
  assert.ok(doc)
  assert.strictEqual(doc.authority.authoritativePaperTotal, 50)

  const store = new EditorWorkingStore(doc)
  const working = store.getWorkingDocument()
  const section = working.sections.find(item => /Long Questions/i.test(item.title || ''))
  assert.ok(section)
  assert.strictEqual(section.attemptCount, 2)
  assert.strictEqual(section.nodeOverlays.length, 2)

  const firstNode = section.nodeOverlays[0]
  assert.strictEqual(store.getEffectiveSectionTotal(section.id), 20)
  assert.strictEqual(store.getEffectivePaperTotal(), 50)

  assert.strictEqual(store.setNodeMarks(section.id, firstNode.nodeId, 12), true)
  assert.strictEqual(store.getEffectiveNodeMarks(section.id, firstNode.nodeId), 12)
  assert.strictEqual(store.getEffectiveSectionTotal(section.id), 22)
  assert.strictEqual(store.getEffectivePaperTotal(), 42)
  assert.strictEqual(store.getBaselineDocument().authority.authoritativePaperTotal, 50)

  assert.strictEqual(store.setSectionMarks(section.id, 25), true)
  assert.strictEqual(store.getEffectiveSectionTotal(section.id), 25)
  assert.strictEqual(store.getEffectivePaperTotal(), 45)

  store.setPaperTotalMarks(60)
  assert.strictEqual(store.getEffectivePaperTotal(), 60)

  const secondNode = section.nodeOverlays[1]
  store.setNodeMarks(section.id, secondNode.nodeId, 11)
  assert.strictEqual(store.getEffectivePaperTotal(), 60, 'Explicit manual paper total remains authoritative in working copy')

  const draft = store.exportCompactDraft()
  assert.strictEqual(draft.marksPatch.paper.manualPaperTotal, 60)
  assert.strictEqual(draft.marksPatch.sections[section.id].workingSectionTotal, 25)
  assert.strictEqual(draft.marksPatch.nodes[firstNode.nodeId].workingNodeMarks, 12)
  assert.strictEqual(validateWorkingDraft(draft, doc).valid, true)

  const reopened = new EditorWorkingStore(doc)
  assert.strictEqual(reopened.applyCompactDraft(draft).status, 'APPLIED')
  assert.strictEqual(reopened.getEffectiveNodeMarks(section.id, firstNode.nodeId), 12)
  assert.strictEqual(reopened.getEffectiveSectionTotal(section.id), 25)
  assert.strictEqual(reopened.getEffectivePaperTotal(), 60)
})

test('question display number override is independent and draft-safe', () => {
  const doc = canonicalCorpus.find(item => item.id.includes('class-6-science'))
  const store = new EditorWorkingStore(doc)
  const working = store.getWorkingDocument()
  const section = working.sections.find(item => /Long Questions/i.test(item.title || ''))
  const node = section.nodeOverlays[0]

  assert.strictEqual(store.getNodeDisplayNumber(section.id, node.nodeId, 1), '1')
  assert.strictEqual(store.setNodeDisplayNumber(section.id, node.nodeId, '3A'), true)
  assert.strictEqual(store.getNodeDisplayNumber(section.id, node.nodeId, 1), '3A')

  const draft = store.exportCompactDraft()
  assert.strictEqual(draft.marksPatch.nodes[node.nodeId].displayNumberOverride, '3A')

  const reopened = new EditorWorkingStore(doc)
  assert.strictEqual(reopened.applyCompactDraft(draft).status, 'APPLIED')
  assert.strictEqual(reopened.getNodeDisplayNumber(section.id, node.nodeId, 1), '3A')
})


test('section title and instructions are independent draft-safe working overlays', () => {
  const doc = canonicalCorpus.find(item => item.id.includes('class-6-science'))
  assert.ok(doc)

  const baselineHash = crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex')
  const store = new EditorWorkingStore(doc)
  const working = store.getWorkingDocument()
  const section = working.sections.find(item => (item.title || '').length > 0)
  assert.ok(section)

  const originalTitle = section.title
  const originalInstructions = section.instructions

  assert.strictEqual(store.setSectionTitle(section.id, 'Section A — Revised Working Title'), true)
  assert.strictEqual(store.setSectionInstructions(section.id, 'Attempt all questions carefully.'), true)

  assert.strictEqual(section.title, 'Section A — Revised Working Title')
  assert.strictEqual(section.instructions, 'Attempt all questions carefully.')
  assert.strictEqual(section.sectionTextDirty.title, true)
  assert.strictEqual(section.sectionTextDirty.instructions, true)

  const draft = store.exportCompactDraft()
  assert.strictEqual(draft.draftVersion, 2)
  assert.strictEqual(draft.sectionPatch[section.id].title, 'Section A — Revised Working Title')
  assert.strictEqual(draft.sectionPatch[section.id].instructions, 'Attempt all questions carefully.')
  assert.strictEqual(validateWorkingDraft(draft, doc).valid, true)

  const reopened = new EditorWorkingStore(doc)
  assert.strictEqual(reopened.applyCompactDraft(draft).status, 'APPLIED')
  const reopenedSection = reopened.getWorkingDocument().sections.find(item => item.id === section.id)
  assert.strictEqual(reopenedSection.title, 'Section A — Revised Working Title')
  assert.strictEqual(reopenedSection.instructions, 'Attempt all questions carefully.')

  const afterHash = crypto.createHash('sha256').update(JSON.stringify(reopened.getBaselineDocument())).digest('hex')
  assert.strictEqual(afterHash, baselineHash)

  // Restore-to-source values clears dirty state through normal setters.
  assert.strictEqual(reopened.setSectionTitle(section.id, originalTitle || ''), true)
  assert.strictEqual(reopened.setSectionInstructions(section.id, originalInstructions || ''), true)
})

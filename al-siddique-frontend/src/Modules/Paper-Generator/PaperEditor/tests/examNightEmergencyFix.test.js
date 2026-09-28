// examNightEmergencyFix.test.js — Acceptance tests for ASSPS Exam-Night Paper Editor Emergency Fix (2026-09-27)
import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolvePaperRoute } from '../../resolvePaperRoute.js'
import { EditorWorkingStore } from '../editorV2/editorWorkingStore.js'
import { EditorFieldRegistry } from '../editorV2/EditorFieldRegistry.js'
import { saveWorkingDraft, loadWorkingDraft, clearAllWorkingDrafts } from '../editorV2/workingDraftStorage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const corpusPath = path.resolve(__dirname, '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
const canonicalCorpus = JSON.parse(fs.readFileSync(corpusPath, 'utf-8')).documents

// ─────────────────────────────────────────────────────────────────────────────
// 1. ROUTING TESTS (FIX A)
// ─────────────────────────────────────────────────────────────────────────────
test('FIX A.1: Class 5 official V13 uses guarded canonical route with rollback available', () => {
  const paper = {
    id: 'official-first-term-2026-class-5-english',
    documentFormat: 'pts-native-v13',
    config: { classLevel: '5', subject: 'English' },
  }
  assert.strictEqual(resolvePaperRoute(paper), 'word_editor')
  assert.strictEqual(resolvePaperRoute(paper, null, { forceOfficialLegacyRoute: true }), 'build')
})

test('FIX A.2: Class 7 official V13 uses guarded canonical route with rollback available', () => {
  const paper = {
    id: 'official-first-term-2026-class-7-english',
    documentFormat: 'pts-native-v13',
    config: { classLevel: '7', subject: 'English' },
  }
  assert.strictEqual(resolvePaperRoute(paper), 'word_editor')
  assert.strictEqual(resolvePaperRoute(paper, null, { forceOfficialLegacyRoute: true }), 'build')
})

test('FIX A.3: Official First Term canonical document opens canonical editor by default', () => {
  const paper = canonicalCorpus.find(p => p.id.includes('class-5-english'))
  assert.ok(paper)
  assert.strictEqual(resolvePaperRoute(paper), 'word_editor')
  assert.strictEqual(resolvePaperRoute(paper, null, { forceOfficialLegacyRoute: true }), 'build')
})

test('FIX A.4: Starter English routes to early_years', () => {
  const paper = {
    id: 'ey-starter-english-2026',
    corpusId: 'early-years-first-term-2026',
    classStage: 'starter',
    config: { classLevel: 'Starter' },
  }
  assert.strictEqual(resolvePaperRoute(paper), 'early_years')
})

test('FIX A.5: Mover & Flyer papers route to early_years', () => {
  assert.strictEqual(resolvePaperRoute({ id: 'ey-mover-english-2026', classStage: 'mover' }), 'early_years')
  assert.strictEqual(resolvePaperRoute({ id: 'ey-flyer-english-2026', classStage: 'flyer' }), 'early_years')
  assert.strictEqual(resolvePaperRoute({ id: 'custom-p1', classStage: 'playgroup' }), 'early_years')
  assert.strictEqual(resolvePaperRoute({ id: 'custom-n1', classStage: 'nursery' }), 'early_years')
  assert.strictEqual(resolvePaperRoute({ id: 'custom-pr1', classStage: 'prep' }), 'early_years')
})

test('FIX A.6: Board pattern papers route to board_pattern', () => {
  const paper = {
    id: 'custom-board-paper',
    structureMode: 'board_pattern',
  }
  assert.strictEqual(resolvePaperRoute(paper), 'board_pattern')
})

test('FIX A.7: True legacy custom builder papers route to build', () => {
  const paper = {
    id: 'custom-user-paper-99',
    selectedMCQ: [{ id: 'q1' }],
    config: { classLevel: '6', subject: 'Urdu' },
  }
  assert.strictEqual(resolvePaperRoute(paper), 'build')
  assert.strictEqual(resolvePaperRoute(null), 'build')
})

test('FIX A.8: Official V13 canonical routing cannot be bypassed, while emergency rollback and custom targetTab remain authoritative', () => {
  const officialPaper = {
    id: 'official-first-term-2026-class-5-english',
    documentFormat: 'pts-native-v13',
  }
  assert.strictEqual(resolvePaperRoute(officialPaper, 'build'), 'word_editor')
  assert.strictEqual(resolvePaperRoute(officialPaper, 'saved'), 'word_editor')
  assert.strictEqual(resolvePaperRoute(officialPaper, 'word_editor'), 'word_editor')
  assert.strictEqual(
    resolvePaperRoute(officialPaper, 'word_editor', { forceOfficialLegacyRoute: true }),
    'build'
  )

  const customPaper = { id: 'custom-user-paper-100' }
  assert.strictEqual(resolvePaperRoute(customPaper, 'saved'), 'saved')
  assert.strictEqual(resolvePaperRoute(customPaper, 'word_editor'), 'word_editor')
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. CLASS 5 MCQ COUNT & STRUCTURE TESTS (FIX B)
// ─────────────────────────────────────────────────────────────────────────────
test('FIX B.1: Class 5 English Q1 has exactly 10 MCQ nodes, each with exactly 3 options', () => {
  const p5 = canonicalCorpus.find(p => p.id.includes('class-5-english'))
  assert.ok(p5, 'Class 5 English paper exists in canonical corpus')

  const q1Sec = p5.sections.find(s => s.title && s.title.includes('Tick the correct option'))
  assert.ok(q1Sec, 'Q1 section exists')

  const mcqNodes = q1Sec.nodes.filter(n => n.type === 'mcq')
  assert.strictEqual(mcqNodes.length, 10, 'Q1 must have exactly 10 MCQ nodes')

  for (let i = 0; i < mcqNodes.length; i++) {
    const node = mcqNodes[i]
    assert.strictEqual(node.options.length, 3, `MCQ #${i + 1} must have exactly 3 options`)
    assert.strictEqual(node.type, 'mcq')
    assert.ok(node.stemText.length > 5, `MCQ #${i + 1} stem must be non-empty`)
    assert.ok(node.options[0].text.length > 0, `MCQ #${i + 1} opt a must be non-empty`)
    assert.ok(node.options[1].text.length > 0, `MCQ #${i + 1} opt b must be non-empty`)
    assert.ok(node.options[2].text.length > 0, `MCQ #${i + 1} opt c must be non-empty`)
  }

  assert.strictEqual(mcqNodes[0].stemText, 'Why did Saba cry suddenly?')
  assert.strictEqual(mcqNodes[0].options[0].text, 'She lost her diary')
  assert.strictEqual(mcqNodes[0].options[1].text, 'She missed her bus')
  assert.strictEqual(mcqNodes[0].options[2].text, 'She forgot to do her homework')
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. CLASS 3 ENGLISH TABLES (FIX C)
// ─────────────────────────────────────────────────────────────────────────────
test('FIX C.1: Class 3 English Q3 Match the Column is structured without raw markdown pipes', () => {
  const p3 = canonicalCorpus.find(p => p.id.includes('class-3-english'))
  assert.ok(p3)

  const matchSec = p3.sections.find(s => s.title && s.title.includes('Match the Column'))
  assert.ok(matchSec)

  const matchNode = matchSec.nodes.find(n => n.type === 'matching_columns')
  assert.ok(matchNode)
  assert.strictEqual(matchNode.leftItems.length, 5)
  assert.strictEqual(matchNode.rightItems.length, 5)

  matchNode.leftItems.forEach(item => {
    assert.ok(!item.text.includes('|'), `Left item "${item.text}" must not contain markdown pipes`)
  })
  matchNode.rightItems.forEach(item => {
    assert.ok(!item.text.includes('|'), `Right item "${item.text}" must not contain markdown pipes`)
  })
})

test('FIX C.2: Class 3 English Q6 Singular/Plural is structured table without raw markdown pipes', () => {
  const p3 = canonicalCorpus.find(p => p.id.includes('class-3-english'))
  assert.ok(p3)

  const pluralSec = p3.sections.find(s => s.title && s.title.includes('plural of the following'))
  assert.ok(pluralSec)

  const grammarNode = pluralSec.nodes.find(n => n.type === 'grammar_table')
  assert.ok(grammarNode)
  assert.deepStrictEqual(grammarNode.columns, ['Singular', 'Plural'])
  assert.strictEqual(grammarNode.rows.length, 6)

  grammarNode.rows.forEach(r => {
    assert.ok(!r.leftText.includes('|'), `Row left text "${r.leftText}" must not contain markdown pipes`)
    assert.ok(!r.rightText.includes('|'), `Row right text "${r.rightText}" must not contain markdown pipes`)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. MARKS AUTHORITY (FIX D)
// ─────────────────────────────────────────────────────────────────────────────
test('FIX D.1: Class 1 English principal-corrected marks authority: total 50 and five 10-mark sections', () => {
  const p1 = canonicalCorpus.find(p => p.id.includes('class-1-english'))
  assert.ok(p1)
  assert.strictEqual(p1.authority.authoritativePaperTotal, 50)

  const sectionMarks = p1.sections.map(s => s.authoritativeSectionTotal)
  assert.deepStrictEqual(sectionMarks, [10, 10, 10, 10, 10])
})

test('FIX D.2: Class 3 English marks authority: total 75 preserved from source dataset', () => {
  const p3 = canonicalCorpus.find(p => p.id.includes('class-3-english'))
  assert.ok(p3)
  assert.strictEqual(p3.authority.authoritativePaperTotal, 75)
})

test('FIX D.3: Class 5 and Class 7 English marks authority: total 75 with unresolved section marks', () => {
  const p5 = canonicalCorpus.find(p => p.id.includes('class-5-english'))
  assert.ok(p5)
  assert.strictEqual(p5.authority.authoritativePaperTotal, 75)
  assert.strictEqual(p5.authority.paperMarksStatus, 'HEADER_TOTAL_WITH_UNRESOLVED_SECTIONS')
  p5.sections.forEach(s => {
    assert.strictEqual(s.authoritativeSectionTotal, null, `Class 5 section ${s.id} marks must be unresolved/null`)
  })

  const p7 = canonicalCorpus.find(p => p.id.includes('class-7-english'))
  assert.ok(p7)
  assert.strictEqual(p7.authority.authoritativePaperTotal, 75)
  assert.strictEqual(p7.authority.paperMarksStatus, 'HEADER_TOTAL_WITH_UNRESOLVED_SECTIONS')
  p7.sections.forEach(s => {
    assert.strictEqual(s.authoritativeSectionTotal, null, `Class 7 section ${s.id} marks must be unresolved/null`)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. SELECTION TRACKING (FIX E)
// ─────────────────────────────────────────────────────────────────────────────
test('FIX E.1: EditorFieldRegistry tracks and restores exact selection ranges', () => {
  const registry = new EditorFieldRegistry()
  const fieldKey = 'doc1::sec1::node1::stem'

  registry.register(fieldKey, { editor: { name: 'mock' } })
  registry.setActiveFieldKey(fieldKey)

  // Save selection
  registry.saveSelection(fieldKey, { from: 5, to: 12 })
  const sel = registry.getSelection(fieldKey)
  assert.deepStrictEqual(sel, { from: 5, to: 12 })

  // Active key lookup without explicit argument
  assert.deepStrictEqual(registry.getSelection(), { from: 5, to: 12 })

  registry.clear()
  assert.strictEqual(registry.getSelection(), null)
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. STRUCTURAL CONTROLS & PERSISTENCE (FIX F, FIX G)
// ─────────────────────────────────────────────────────────────────────────────
test('FIX F & G: Page border, MCQ layout, short layout, Q border, and answer lines persist cleanly', () => {
  clearAllWorkingDrafts()
  const p5 = canonicalCorpus.find(p => p.id.includes('class-5-english'))
  assert.ok(p5)

  const store = new EditorWorkingStore(p5)
  const secId = p5.sections[1].id
  const nodeId = p5.sections[1].nodes[0].id

  // 1. Set page border
  store.setPageBorder('double')
  assert.strictEqual(store.getWorkingDocument().presentation.pageBorder, 'double')

  // 2. Set MCQ layout
  store.setMcqLayout(secId, 'classic')
  assert.strictEqual(store.getWorkingDocument().presentation.sectionLayoutOverrides[secId].mcqLayout, 'classic')

  // 3. Set Short question layout
  store.setShortLayout(secId, '2-column-balanced')
  assert.strictEqual(store.getWorkingDocument().presentation.sectionLayoutOverrides[secId].shortLayout, '2-column-balanced')

  // 4. Set Question border
  store.setQuestionBorder(secId, 'box')
  assert.strictEqual(store.getWorkingDocument().presentation.sectionLayoutOverrides[secId].questionBorder, 'box')

  // 5. Set Answer lines on single node
  store.setAnswerLines(nodeId, 3)
  assert.strictEqual(store.getWorkingDocument().presentation.answerLinesByNode[nodeId], 3)

  // 6. Export compact draft and verify presence
  const draft = store.exportCompactDraft()
  assert.ok(draft.presentationPatch)
  assert.strictEqual(draft.presentationPatch.pageBorder, 'double')
  assert.strictEqual(draft.presentationPatch.sectionLayoutOverrides[secId].mcqLayout, 'classic')
  assert.strictEqual(draft.presentationPatch.sectionLayoutOverrides[secId].shortLayout, '2-column-balanced')
  assert.strictEqual(draft.presentationPatch.sectionLayoutOverrides[secId].questionBorder, 'box')
  assert.strictEqual(draft.presentationPatch.answerLinesByNode[nodeId], 3)

  // 7. Save and reload draft into a fresh store
  saveWorkingDraft(draft, p5)
  const freshStore = new EditorWorkingStore(p5)
  const loaded = loadWorkingDraft(p5)
  assert.strictEqual(loaded.status, 'OK')

  const applyRes = freshStore.applyCompactDraft(loaded.draft)
  assert.strictEqual(applyRes.status, 'APPLIED')

  const reloadedPres = freshStore.getWorkingDocument().presentation
  assert.strictEqual(reloadedPres.pageBorder, 'double')
  assert.strictEqual(reloadedPres.sectionLayoutOverrides[secId].mcqLayout, 'classic')
  assert.strictEqual(reloadedPres.sectionLayoutOverrides[secId].shortLayout, '2-column-balanced')
  assert.strictEqual(reloadedPres.sectionLayoutOverrides[secId].questionBorder, 'box')
  assert.strictEqual(reloadedPres.answerLinesByNode[nodeId], 3)

  // Baseline remains 100% immutable
  assert.strictEqual(freshStore.getBaselineDocument().presentation?.pageBorder || 'none', 'none')
})

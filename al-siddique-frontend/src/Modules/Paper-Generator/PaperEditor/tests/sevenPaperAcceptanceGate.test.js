// sevenPaperAcceptanceGate.test.js
// Acceptance Gate for the Seven Must-Pass Exam Papers:
// 1. Starter English
// 2. Mover English
// 3. Flyer English
// 4. Class 1 English
// 5. Class 3 English
// 6. Class 5 English
// 7. Class 7 English

import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolvePaperRoute } from '../../resolvePaperRoute.js'
import { EditorWorkingStore } from '../editorV2/editorWorkingStore.js'
import { EditorFieldRegistry } from '../editorV2/EditorFieldRegistry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const canonicalCorpusPath = path.resolve(__dirname, '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
const canonicalCorpus = JSON.parse(fs.readFileSync(canonicalCorpusPath, 'utf-8')).documents

const eyCorpusPath = path.resolve(__dirname, '../earlyYears/data/early-years-first-term-2026-source-v2.json')
const eyCorpus = JSON.parse(fs.readFileSync(eyCorpusPath, 'utf-8')).papers

test('GATE 1: Starter English (ey-starter-english-2026) Acceptance', () => {
  const paper = eyCorpus.find(p => p.id === 'ey-starter-english-2026')
  assert.ok(paper, 'Starter English paper exists in EY corpus')

  // Route
  assert.strictEqual(resolvePaperRoute(paper), 'early_years', 'Starter English routes to early_years')

  // Content
  assert.ok(paper.questions && paper.questions.length >= 5, 'Starter English has questions')
  assert.strictEqual(paper.classStage, 'starter')
  assert.strictEqual(paper.subject, 'english')

  // Marks
  assert.strictEqual(paper.totalMarksSource.headerTotal, 50, 'Authoritative header total is 50')
  assert.strictEqual(paper.totalMarksSource.listedQuestionTotal, 50, 'Listed question total is 50')
  assert.strictEqual(paper.totalMarksSource.hasConflict, false, 'No marks conflict')
})

test('GATE 2: Mover English (ey-mover-english-2026) Acceptance', () => {
  const paper = eyCorpus.find(p => p.id === 'ey-mover-english-2026')
  assert.ok(paper, 'Mover English paper exists in EY corpus')

  // Route
  assert.strictEqual(resolvePaperRoute(paper), 'early_years', 'Mover English routes to early_years')

  // Content
  assert.ok(paper.questions && paper.questions.length >= 4, 'Mover English has questions')
  assert.strictEqual(paper.classStage, 'mover')
  assert.strictEqual(paper.subject, 'english')

  // Q3 marks = 20, Q4 marks = 10
  const q3 = paper.questions.find(q => q.questionNumber === 3)
  const q4 = paper.questions.find(q => q.questionNumber === 4)
  assert.strictEqual(q3.marks, 20)
  assert.strictEqual(q4.marks, 10)
})

test('GATE 3: Flyer English (ey-flyer-english-2026) Acceptance', () => {
  const paper = eyCorpus.find(p => p.id === 'ey-flyer-english-2026')
  assert.ok(paper, 'Flyer English paper exists in EY corpus')

  // Route
  assert.strictEqual(resolvePaperRoute(paper), 'early_years', 'Flyer English routes to early_years')

  // Content
  assert.ok(paper.questions && paper.questions.length >= 5, 'Flyer English has questions')
  assert.strictEqual(paper.classStage, 'flyer')
  assert.strictEqual(paper.subject, 'english')
})

test('GATE 4: Class 1 English (official-first-term-2026-class-1-english) Acceptance', () => {
  const paper = canonicalCorpus.find(p => p.id.includes('class-1-english'))
  assert.ok(paper, 'Class 1 English exists in Canonical V2')

  // Route
  assert.strictEqual(resolvePaperRoute(paper), 'word_editor', 'Class 1 English routes to word_editor')

  // Marks authority
  assert.strictEqual(paper.authority.authoritativePaperTotal, 36)
  const secTotals = paper.sections.map(s => s.authoritativeSectionTotal)
  assert.deepStrictEqual(secTotals, [6, 10, 10, 5, 5])
})

test('GATE 5: Class 3 English (official-first-term-2026-class-3-english) Acceptance', () => {
  const paper = canonicalCorpus.find(p => p.id.includes('class-3-english'))
  assert.ok(paper, 'Class 3 English exists in Canonical V2')

  // Route
  assert.strictEqual(resolvePaperRoute(paper), 'word_editor', 'Class 3 English routes to word_editor')

  // Marks authority
  assert.strictEqual(paper.authority.authoritativePaperTotal, 75)

  // Tables / Hierarchy
  const matchSec = paper.sections.find(s => s.title && s.title.includes('Match the Column'))
  assert.ok(matchSec, 'Match the Column section exists')
  const matchNode = matchSec.nodes.find(n => n.type === 'matching_columns')
  assert.ok(matchNode, 'Matching columns node exists')
  assert.strictEqual(matchNode.leftItems.length, 5)
  assert.strictEqual(matchNode.rightItems.length, 5)

  const pluralSec = paper.sections.find(s => s.title && s.title.includes('plural'))
  assert.ok(pluralSec, 'Plural section exists')
  const grammarNode = pluralSec.nodes.find(n => n.type === 'grammar_table')
  assert.ok(grammarNode, 'Grammar table node exists')
  assert.strictEqual(grammarNode.rows.length, 6)
})

test('GATE 6: Class 5 English (official-first-term-2026-class-5-english) Acceptance', () => {
  const paper = canonicalCorpus.find(p => p.id.includes('class-5-english'))
  assert.ok(paper, 'Class 5 English exists in Canonical V2')

  // Route
  assert.strictEqual(resolvePaperRoute(paper), 'word_editor', 'Class 5 English routes to word_editor')

  // Marks authority
  assert.strictEqual(paper.authority.authoritativePaperTotal, 75)
  assert.strictEqual(paper.authority.paperMarksStatus, 'HEADER_TOTAL_WITH_UNRESOLVED_SECTIONS')
  paper.sections.forEach(s => {
    assert.strictEqual(s.authoritativeSectionTotal, null, `Section ${s.id} marks must remain unresolved/null`)
  })

  // Q1 10 MCQs with 3 options
  const q1Sec = paper.sections.find(s => s.title && s.title.includes('Tick the correct option'))
  assert.ok(q1Sec, 'Q1 MCQ section exists')
  const mcqs = q1Sec.nodes.filter(n => n.type === 'mcq')
  assert.strictEqual(mcqs.length, 10, 'Class 5 Q1 must have exactly 10 MCQs')
  mcqs.forEach((mcq, idx) => {
    assert.strictEqual(mcq.options.length, 3, `MCQ #${idx + 1} must have exactly 3 options`)
    assert.strictEqual(mcq.options.map(o => o.sourceLabel.toLowerCase()).join(','), 'a,b,c')
  })
  assert.strictEqual(mcqs[0].stemText, 'Why did Saba cry suddenly?')
  assert.strictEqual(mcqs[0].options[0].text, 'She lost her diary')
  assert.strictEqual(mcqs[0].options[1].text, 'She missed her bus')
  assert.strictEqual(mcqs[0].options[2].text, 'She forgot to do her homework')

  // Controls & Persistence
  const store = new EditorWorkingStore(paper)
  store.setPageBorder('double')
  store.setMcqLayout(q1Sec.id, 'table')
  const targetNodeId = mcqs[0].id
  store.setAnswerLines(targetNodeId, 2)

  const workingDoc = store.getWorkingDocument()
  assert.strictEqual(workingDoc.presentation.pageBorder, 'double')
  assert.strictEqual(workingDoc.presentation.sectionLayoutOverrides[q1Sec.id].mcqLayout, 'table')
  assert.strictEqual(workingDoc.presentation.answerLinesByNode[targetNodeId], 2)
  // Ensure other nodes do NOT have answer lines
  assert.strictEqual(workingDoc.presentation.answerLinesByNode[mcqs[1].id], undefined)
})

test('GATE 7: Class 7 English (official-first-term-2026-class-7-english) Acceptance', () => {
  const paper = canonicalCorpus.find(p => p.id.includes('class-7-english'))
  assert.ok(paper, 'Class 7 English exists in Canonical V2')

  // Route
  assert.strictEqual(resolvePaperRoute(paper), 'word_editor', 'Class 7 English routes to word_editor')

  // Marks authority
  assert.strictEqual(paper.authority.authoritativePaperTotal, 75)
  assert.strictEqual(paper.authority.paperMarksStatus, 'HEADER_TOTAL_WITH_UNRESOLVED_SECTIONS')
  paper.sections.forEach(s => {
    assert.strictEqual(s.authoritativeSectionTotal, null, `Section ${s.id} marks must remain unresolved/null`)
  })

  // Content preservation
  assert.ok(paper.sections.length >= 5, 'Class 7 English has all sections preserved')
})

test('PRINT PARITY: CSS rules verification for print fidelity', () => {
  const cssPath = path.resolve(__dirname, '../editorV2/canonicalEditor.css')
  const css = fs.readFileSync(cssPath, 'utf-8')

  assert.ok(css.includes('.canonical-answer-lines'), 'CSS defines .canonical-answer-lines')
  assert.ok(css.includes('.canonical-answer-line'), 'CSS defines .canonical-answer-line')
  assert.ok(css.includes('.canonical-mcq-table'), 'CSS defines .canonical-mcq-table')
  assert.ok(css.includes('.page-border-thin'), 'CSS defines .page-border-thin')
  assert.ok(css.includes('.page-border-thick'), 'CSS defines .page-border-thick')
  assert.ok(css.includes('.page-border-double'), 'CSS defines .page-border-double')

  // In print section, ensure page borders are preserved
  const printIndex = css.indexOf('@media print')
  assert.ok(printIndex > -1, '@media print rule exists')
  const printSection = css.slice(printIndex)
  assert.ok(!printSection.includes('.canonical-page-sheet { border: none !important; }'), 'Page sheet border: none removed from print')
})

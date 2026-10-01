import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolvePaperRoute } from '../../resolvePaperRoute.js'
import { getEarlyYearsPaperById } from '../earlyYears/data/earlyYearsSourceStore.js'
import { getOverlay, setOverlay } from '../earlyYears/specs/EarlyYearsPresentationOverlay.js'
import { resolveEarlyYearsMarks } from '../earlyYears/specs/earlyYearsMarks.js'
import { buildRecoverySavedPapers } from '../../seed-data/examNightRecoveryAdapter.js'
import { auditOfficialPaperForPrint } from '../../officialPaperRules.js'
import { replaceSectionMarks, buildMarksLedger } from '../../paperSystemRules.js'

const testsDir = path.dirname(fileURLToPath(import.meta.url))
const paperDir = path.resolve(testsDir, '../..')

test('Class Eight Urdu recovery opens the editable workspace, not preview-only canonical fallback', () => {
  const seed = JSON.parse(fs.readFileSync(path.join(paperDir,'seed-data/exam-night-recovery-v3.json'),'utf8'))
  const p = buildRecoverySavedPapers(seed).find(p=>p.id==='recovery-first-term-2026-class-8-urdu')
  assert.ok(p)
  assert.equal(p.documentFormat,'pts-native-v13')
  assert.equal(resolvePaperRoute(p),'build')
  assert.equal(resolvePaperRoute(p,'word_editor'),'build')
  assert.equal(p.config.totalMarks,75)
  assert.equal(p.official_section.reduce((n,q)=>n+(Number(q.marks)||0),0),70)
  assert.equal(resolvePaperRoute({id:'official-first-term-2026-class-5-english',documentFormat:'pts-native-v13'}),'word_editor')
  assert.equal(resolvePaperRoute({id:'ey-flyer-urdu-2026',classStage:'flyer'}),'early_years')
  const source = fs.readFileSync(path.join(paperDir,'PTSPaperGenerator.jsx'),'utf8')
  assert.doesNotMatch(source,/data-marks-reconciliation/)
  assert.match(source,/data-edit-paper-toggle/)
  assert.match(source,/<details data-paper-metadata-editor style=/)
  assert.match(source,/const \[editMode, setEditMode\] = useState\(false\)/)
  assert.match(source,/selectedSectionMarks/)
})

test('Flyer Urdu Q4 uses a supported alphabet writing renderer, preserving source data', () => {
  const flyer = getEarlyYearsPaperById('ey-flyer-urdu-2026')
  const q4 = flyer.questions.find(q=>q.id==='ey-flyer-urdu-q4')
  assert.equal(q4.presentationType,'UrduAlphabetWritingArea')
  assert.equal(q4.content.lineCount,4)
  const source = fs.readFileSync(path.join(paperDir,'PaperEditor/earlyYears/components/EarlyYearsQuestionBlock.jsx'),'utf8')
  assert.match(source,/case 'UrduAlphabetWritingArea':\s*case 'UrduHandwritingResponse':/)
  assert.doesNotMatch(source,/Unsupported presentation:/)
})

test('working paper marks reconcile independently without ever changing the teacher source', () => {
  const source = getEarlyYearsPaperById('ey-flyer-urdu-2026')
  const paper = { ...source, id:'emergency-working-copy-marks-test', questions:source.questions.map(q=>({...q})) }
  const original = JSON.stringify(paper)
  let marks = resolveEarlyYearsMarks(paper)
  assert.equal(marks.headerTotal,50)
  assert.equal(marks.questionTotal,60)
  assert.equal(marks.hasConflict,true)
  const q2 = paper.questions[1]
  setOverlay(paper.id,q2.id,{marksOverride:10,instructionOverride:'Manual edited instruction'})
  marks = resolveEarlyYearsMarks(paper)
  assert.equal(marks.questionTotal,50)
  assert.equal(marks.hasConflict,false)
  assert.equal(getOverlay(paper.id,q2.id).instructionOverride,'Manual edited instruction')
  setOverlay(paper.id,'__header__',{totalMarksOverride:75})
  assert.equal(resolveEarlyYearsMarks(paper).hasConflict,true)
  setOverlay(paper.id,'__header__',{totalMarksOverride:50})
  assert.equal(resolveEarlyYearsMarks(paper).hasConflict,false)
  assert.equal(JSON.stringify(paper),original)
})

test('Early Years working overlay is saved to a tenant-scoped key', () => {
  const previousWindow = globalThis.window
  const storage = new Map()
  storage.set('al_siddique_user',JSON.stringify({school_id:919191}))
  globalThis.window={localStorage:{
    getItem:key=>storage.get(key)??null,
    setItem:(key,value)=>storage.set(key,value),
    removeItem:key=>storage.delete(key),
  }}
  try {
    setOverlay('ey-flyer-urdu-2026-test-tenant','q4',{marksOverride:12,presentationTypeOverride:'UrduAlphabetWritingArea'})
    const key='assps-early-years-editor-working-copy-v1__school-919191'
    assert.ok(storage.has(key))
    const saved=JSON.parse(storage.get(key))
    assert.equal(saved['ey-flyer-urdu-2026-test-tenant::q4'].marksOverride,12)
    assert.equal(saved['ey-flyer-urdu-2026-test-tenant::q4'].presentationTypeOverride,'UrduAlphabetWritingArea')
  } finally {
    globalThis.window=previousWindow
  }
})

test('Class Eight Urdu 75/70 conflict becomes printable only after an explicit operator marks decision', () => {
  const seed=JSON.parse(fs.readFileSync(path.join(paperDir,'seed-data/exam-night-recovery-v3.json'),'utf8'))
  const original=buildRecoverySavedPapers(seed).find(p=>p.id==='recovery-first-term-2026-class-8-urdu')
  const originalSerialized=JSON.stringify(original)
  const initial=auditOfficialPaperForPrint(original)
  assert.equal(initial.headerTotal,75)
  assert.equal(initial.explicitSectionSum,70)
  assert.equal(initial.blocked,true)

  // Option A: operator chooses the real section sum as the new header.
  const chooseHeader={...original,config:{...original.config,totalMarks:70}}
  assert.equal(buildMarksLedger(chooseHeader).balanced,true)
  assert.equal(auditOfficialPaperForPrint(chooseHeader).blocked,false)

  // Option B: operator authorizes a particular question-mark correction.
  const revised=structuredClone(original)
  revised.official_section[3].marks=10
  revised.official_section[3].operationalMarks=10
  revised.official_section[3].heading=replaceSectionMarks(revised.official_section[3].heading,10,true)
  assert.equal(buildMarksLedger(revised).headerTotal,75)
  assert.equal(buildMarksLedger(revised).questionTotal,75)
  assert.equal(auditOfficialPaperForPrint(revised).blocked,false)
  assert.equal(JSON.stringify(original),originalSerialized,'teacher recovery seed stays unchanged')
})

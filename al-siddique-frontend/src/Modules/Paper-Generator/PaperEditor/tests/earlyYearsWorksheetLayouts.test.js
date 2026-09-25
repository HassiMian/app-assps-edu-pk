// earlyYearsWorksheetLayouts.test.js — Verifies worksheet specifications, layouts, and header configurations
import test from 'node:test'
import assert from 'node:assert/strict'
import { getAllEarlyYearsPapers, getEarlyYearsPaperById } from '../earlyYears/data/earlyYearsSourceStore.js'
import { buildWorksheetSpec } from '../earlyYears/specs/EarlyYearsWorksheetSpec.js'
import { checkUrduFontAvailability } from '../earlyYears/diagnostics/EarlyYearsFontDiagnostics.js'

test('EY-LAYOUT 1: buildWorksheetSpec generates valid presentation spec for all 9 papers', () => {
  const papers = getAllEarlyYearsPapers()
  assert.equal(papers.length, 9)

  for (const paper of papers) {
    const spec = buildWorksheetSpec(paper)
    assert.ok(spec, `Spec must be generated for ${paper.id}`)
    assert.equal(spec.paperId, paper.id)
    assert.equal(spec.classStage, paper.classStage)
    assert.equal(spec.subject, paper.subject)

    // Page profile
    assert.equal(spec.pageProfile.format, 'A4')
    assert.equal(spec.pageProfile.orientation, 'portrait')
    assert.equal(spec.pageProfile.widthMm, 210)
    assert.equal(spec.pageProfile.heightMm, 297)
    assert.equal(spec.pageProfile.margins.top, 12)
    assert.equal(spec.pageProfile.margins.bottom, 12)
    assert.equal(spec.pageProfile.margins.left, 15)
    assert.equal(spec.pageProfile.margins.right, 15)

    // Header config
    assert.equal(spec.headerConfig.schoolName, 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL')
    assert.equal(spec.headerConfig.campus, 'Sharif Chowk, Rayya Khas, Narowal')
    assert.ok(spec.headerConfig.classDisplayName)
    assert.ok(spec.headerConfig.subjectDisplayName)

    // Questions
    assert.equal(spec.questionPresentations.length, paper.questions.length)
    for (const q of spec.questionPresentations) {
      assert.ok(q.questionId)
      assert.ok(q.presentationType)
      assert.ok(q.instruction)
      assert.ok(q.content)
      assert.equal(q.layout.preventPageBreakInside, true)
    }
  }
})

test('EY-LAYOUT 2: Language direction and typography tokens are strictly enforced', () => {
  const urduPapers = ['ey-starter-urdu-2026', 'ey-mover-urdu-2026', 'ey-flyer-urdu-2026']
  const ltrPapers = [
    'ey-starter-english-2026', 'ey-starter-math-2026',
    'ey-mover-english-2026', 'ey-mover-math-2026',
    'ey-flyer-english-2026', 'ey-flyer-math-2026'
  ]

  for (const id of urduPapers) {
    const paper = getEarlyYearsPaperById(id)
    const spec = buildWorksheetSpec(paper)
    assert.equal(spec.typography.direction, 'rtl', `${id} must be RTL`)
    assert.ok(spec.typography.fontFamily.includes('Jameel Noori Nastaleeq'), `${id} must specify Jameel Noori Nastaleeq`)
  }

  for (const id of ltrPapers) {
    const paper = getEarlyYearsPaperById(id)
    const spec = buildWorksheetSpec(paper)
    assert.equal(spec.typography.direction, 'ltr', `${id} must be LTR`)
    assert.ok(spec.typography.fontFamily.includes('Times New Roman'), `${id} must specify Times New Roman`)
  }
})

test('EY-LAYOUT 3: Marks fidelity and total preservation across header configurations', () => {
  // Starter Urdu: Header total 50, but individual questions total 80
  const starterUrdu = buildWorksheetSpec(getEarlyYearsPaperById('ey-starter-urdu-2026'))
  assert.equal(starterUrdu.headerConfig.totalMarks, 50, 'Header total must be 50')
  const suQuestionSum = starterUrdu.questionPresentations.reduce((acc, q) => acc + q.marks, 0)
  assert.equal(suQuestionSum, 80, 'Question sum must remain 80 without auto-reconciliation')

  // Mover Urdu: Header total omitted by teacher
  const moverUrdu = buildWorksheetSpec(getEarlyYearsPaperById('ey-mover-urdu-2026'))
  assert.equal(moverUrdu.headerConfig.totalMarks, null, 'Omitted header total must be null')

  // Flyer Urdu: Header total 50, but individual questions total 60
  const flyerUrdu = buildWorksheetSpec(getEarlyYearsPaperById('ey-flyer-urdu-2026'))
  assert.equal(flyerUrdu.headerConfig.totalMarks, 50, 'Header total must be 50')
  const fuQuestionSum = flyerUrdu.questionPresentations.reduce((acc, q) => acc + q.marks, 0)
  assert.equal(fuQuestionSum, 60, 'Question sum must remain 60 without auto-reconciliation')
})

test('EY-LAYOUT 4: Font diagnostics reports fallback safely in non-browser environment', () => {
  const diag = checkUrduFontAvailability()
  assert.ok(diag)
  assert.equal(diag.jameelLoaded, false)
  assert.equal(diag.activeFamily, 'Noto Nastaliq Urdu')
})

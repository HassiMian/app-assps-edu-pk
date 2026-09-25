// migrateLegacyPaper.test.js — Regression tests for safe numeric parsing and zero preservation in legacy migration
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { migrateLegacyPaper, finiteNumberOr } from '../migrateLegacyPaper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('HELPER: finiteNumberOr behaves according to strict authority requirements', () => {
  // Test E & F: Numeric strings
  assert.equal(finiteNumberOr('10', 0), 10, 'Numeric string "10" must parse to 10')
  assert.equal(finiteNumberOr('0', 5), 0, 'Numeric string "0" must parse to 0')
  assert.equal(finiteNumberOr(0, 10), 0, 'Numeric 0 must remain 0')
  assert.equal(finiteNumberOr(10, 0), 10, 'Numeric 10 must remain 10')

  // Nullish and empty fallbacks
  assert.equal(finiteNumberOr(null, 5), 5, 'null must return fallback')
  assert.equal(finiteNumberOr(undefined, 7), 7, 'undefined must return fallback')
  assert.equal(finiteNumberOr('', 12), 12, 'empty string must return fallback')

  // Test I: Invalid numeric string must not create NaN
  assert.equal(finiteNumberOr('abc', 0), 0, 'Invalid string must return fallback and not NaN')
  assert.equal(Number.isNaN(finiteNumberOr('NaN', 0)), false, '"NaN" string must not create NaN')
  assert.equal(finiteNumberOr('NaN', 0), 0)
})

test('TEST A & B: Class 1 Science input totalMarks 0 and section marks 0 remain 0', () => {
  const v13Path = path.resolve(__dirname, '../../../seed-data/official-first-term-2026-v13.json')
  const v13 = JSON.parse(fs.readFileSync(v13Path, 'utf8'))
  const c1sci = v13.papers.find(p => p.id === 'official-first-term-2026-class-1-science')

  assert.ok(c1sci, 'Class 1 Science must exist in v13')
  assert.equal(c1sci.config.totalMarks, 0, 'Seed config totalMarks must be 0')

  const migrated = migrateLegacyPaper(c1sci)

  // Test A: Migrated totalMarks must be 0
  assert.equal(migrated.metadata.totalMarks, 0, 'Migrated Class 1 Science totalMarks must remain 0, never coerced to 50')

  // Test B: All sections and questions must preserve 0 marks
  assert.ok(migrated.sections.length > 0, 'Must have migrated sections')
  for (const sec of migrated.sections) {
    assert.equal(sec.totalMarks, 0, `Section ${sec.title} totalMarks must remain 0`)
    for (const q of sec.questions) {
      assert.equal(q.marks, 0, `Question in section ${sec.title} marks must remain 0`)
    }
  }
})

test('TEST C & D: Class 1 Islamiyat input totalMarks 0 and section marks 0 remain 0', () => {
  const v13Path = path.resolve(__dirname, '../../../seed-data/official-first-term-2026-v13.json')
  const v13 = JSON.parse(fs.readFileSync(v13Path, 'utf8'))
  const c1isl = v13.papers.find(p => p.id === 'official-first-term-2026-class-1-islamiyat')

  assert.ok(c1isl, 'Class 1 Islamiyat must exist in v13')
  assert.equal(c1isl.config.totalMarks, 0, 'Seed config totalMarks must be 0')

  const migrated = migrateLegacyPaper(c1isl)

  // Test C: Migrated totalMarks must be 0
  assert.equal(migrated.metadata.totalMarks, 0, 'Migrated Class 1 Islamiyat totalMarks must remain 0, never coerced to 50')

  // Test D: All sections and questions must preserve 0 marks
  assert.ok(migrated.sections.length > 0, 'Must have migrated sections')
  for (const sec of migrated.sections) {
    assert.equal(sec.totalMarks, 0, `Section ${sec.title} totalMarks must remain 0`)
    for (const q of sec.questions) {
      assert.equal(q.marks, 0, `Question in section ${sec.title} marks must remain 0`)
    }
  }
})

test('TEST G: Explicit q.marks = 0 in Category-based paper must NOT inherit marksEach', () => {
  const legacyPaper = {
    id: 'legacy-zero-marks-test',
    config: { title: 'Zero Marks Test', totalMarks: 10 },
    selectedMCQ: [
      { id: 'm1', text: 'Normal MCQ', marks: 1 },
      { id: 'm2', text: 'Zero Mark MCQ', marks: 0 },
      { id: 'm3', text: 'Missing Mark MCQ' }, // undefined marks -> should inherit marksEach
    ],
    selectedShort: [
      { id: 's1', text: 'Zero Mark Short', marks: 0 },
      { id: 's2', text: 'String Zero Short', marks: '0' },
      { id: 's3', text: 'Normal Short', marks: 2 },
    ],
    selectedLong: [
      { id: 'l1', text: 'Zero Mark Long', marks: 0 },
    ],
    mcq_marks: 1,
    short_marks: 2,
    long_marks: 5,
  }

  const migrated = migrateLegacyPaper(legacyPaper)

  // Check MCQ
  const mcqSection = migrated.sections.find(s => s.type === 'mcq')
  assert.equal(mcqSection.questions[0].marks, 1)
  assert.equal(mcqSection.questions[1].marks, 0, 'Explicit q.marks = 0 must NOT become marksEach (1)')
  assert.equal(mcqSection.questions[2].marks, 1, 'Missing mark value must inherit marksEach (1)')

  // Check Short
  const shortSection = migrated.sections.find(s => s.type === 'short')
  assert.equal(shortSection.questions[0].marks, 0, 'Explicit q.marks = 0 must NOT become marksEach (2)')
  assert.equal(shortSection.questions[1].marks, 0, 'String "0" must parse to 0 and NOT become marksEach (2)')
  assert.equal(shortSection.questions[2].marks, 2)

  // Check Long
  const longSection = migrated.sections.find(s => s.type === 'long')
  assert.equal(longSection.questions[0].marks, 0, 'Explicit q.marks = 0 must NOT become marksEach (5)')
})

test('TEST H & J: Truly unresolved total does not create arbitrary 50 total', () => {
  const unresolvedPaper = {
    id: 'truly-unresolved-paper',
    config: {
      title: 'Unresolved Exam',
      // totalMarks is completely missing
    },
    official_section: [
      { id: 'sec1', heading: 'Section 1', content: 'Task 1', marks: 0 },
      { id: 'sec2', heading: 'Section 2', content: 'Task 2', marks: 0 },
    ],
  }

  const migrated = migrateLegacyPaper(unresolvedPaper)
  assert.equal(migrated.metadata.totalMarks, 0, 'Truly unresolved total with 0-mark sections must NOT become arbitrary 50')
})

test('TEST J (with sections): Truly missing config total inherits deterministic section sum if > 0', () => {
  const paperWithSectionMarks = {
    id: 'missing-config-total-paper',
    config: {
      title: 'Missing Config Total',
      // totalMarks missing
    },
    official_section: [
      { id: 'sec1', heading: 'Section 1', content: 'Task 1', marks: 15 },
      { id: 'sec2', heading: 'Section 2', content: 'Task 2', marks: 25 },
    ],
  }

  const migrated = migrateLegacyPaper(paperWithSectionMarks)
  assert.equal(migrated.metadata.totalMarks, 40, 'Missing config total must inherit sum of sections (15+25=40), not arbitrary 50')
})

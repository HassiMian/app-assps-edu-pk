import { test } from 'node:test'
import assert from 'node:assert/strict'
import { migrateLegacyPaper } from '../migration/migrateLegacyPaper.js'

const paper = (totalMarks, includeTotal = true) => ({
  id: 'legacy-marks-compatibility',
  name: 'Teacher saved paper',
  config: includeTotal ? { totalMarks } : {},
  selectedMCQ: [{ text: 'Which word is a noun?', options: ['apple', 'run', 'quickly', 'very'], marks: 1 }],
})

test('explicit numeric zero remains zero, not a falsy fallback to section marks', () => {
  const migrated = migrateLegacyPaper(paper(0))
  assert.equal(migrated.metadata.totalMarks, 0)
  assert.equal(migrated.sections[0].totalMarks, 1)
})

test('explicit numeric string zero remains zero', () => {
  assert.equal(migrateLegacyPaper(paper('0')).metadata.totalMarks, 0)
})

test('blank or absent total falls back to actual section marks', () => {
  for (const p of [paper(''), paper(null), paper(undefined, false)]) {
    const migrated = migrateLegacyPaper(p)
    assert.equal(migrated.metadata.totalMarks, 1)
  }
})

test('teacher-configured nonzero total remains authoritative', () => {
  assert.equal(migrateLegacyPaper(paper(5)).metadata.totalMarks, 5)
})

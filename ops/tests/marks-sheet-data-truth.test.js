const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.resolve(__dirname, '../../al-siddique-frontend/src/Modules/examination/MarksSheet.jsx'), 'utf8')

test('marks refresh only clears dependent state after exam source refresh succeeds', () => {
  assert.match(source, /const refreshed = await loadExams\(\)[\s\S]{0,140}if \(refreshed\) \{[\s\S]{0,100}setStudents\(\[\]\)[\s\S]{0,60}setMarks\(\{\}\)/)
  assert.doesNotMatch(source, /const refreshData = async \(\) => \{\s*setStudents\(\[\]\)\s*setMarks\(\{\}\)/)
})

test('marks search failure preserves the last known-good student and marks state', () => {
  const block = source.match(/catch \(err\) \{[\s\S]{0,350}Existing loaded students and marks were preserved\.[\s\S]{0,120}?finally/)?.[0] || ''
  assert.ok(block, 'search failure block not found')
  assert.doesNotMatch(block, /setStudents\(\[\]\)|setMarks\(\{\}\)/)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const view = readFileSync(new URL('./MarksSheet.jsx', import.meta.url),'utf8')
test('passing control is one class/subject header, not repeated in the student roster', () => {
  assert.equal(view.split('>Class passing format</label>').length-1, 1)
  assert.match(view, /selectedClass && selectedSubject && \(/)
  assert.match(view, /Displayed once per class\/subject/)
  assert.match(view, /<option value="percentage">Percentage \(%\)<\/option>/)
  assert.match(view, /<option value="marks">Marks<\/option>/)
  assert.match(view, /not an approved change to the school's official grading policy/)
})
test('roster refresh retains the selected subject total and passing display mode', () => {
  assert.doesNotMatch(view, /setTotalMarks\(selectedExam\.total_marks/)
  assert.match(view, /passMarks:passPreview\?\.marks \?\? ''/)
  assert.match(view, /setPassPercentage\(String\(DEFAULT_REQUESTED_PASS_PERCENT\)\)/)
})

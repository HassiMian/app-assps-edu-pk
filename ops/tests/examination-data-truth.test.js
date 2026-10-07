const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.resolve(__dirname, '../../al-siddique-frontend/src/Modules/examination/ExaminationModule.jsx'), 'utf8')

test('examination workspace source failure preserves loaded exams and students', () => {
  const catchBlock = source.match(/catch \(err\) \{[\s\S]{0,500}Failed to load examination workspace[\s\S]{0,500}?\n \}/)?.[0] || ''
  assert.ok(catchBlock, 'examination load catch block not found')
  assert.doesNotMatch(catchBlock, /setExams\(\[\]\)|setStudents\(\[\]\)|setSelectedExam\(null\)/)
  assert.match(catchBlock, /Examination workspace could not be refreshed\. Existing loaded exams and students were preserved\./)
})

test('examination workspace exposes source availability separately from empty data', () => {
  assert.match(source, /const \[loadError, setLoadError\] = useState\(''\)/)
  assert.match(source, /\{loadError\}/)
})

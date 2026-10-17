const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '../..')
const examSource = fs.readFileSync(path.join(root, 'al-siddique-backend/src/routes/examRoutes.js'), 'utf8')
const guardSource = fs.readFileSync(path.join(root, 'ops/production-safety-check.js'), 'utf8')

const strictBands = /gradeBands\s*=\s*await\s+loadGradeBandsForSchool\(\s*schoolId,\s*\{\s*previewDefaults\s*:\s*false\s*\}\s*\)/
const savedGrade = /grade\s*:\s*parsedState\.status\s*===\s*['"]SCORED['"]\s*&&\s*gradeBands\.length\s*>\s*0\s*\?\s*gradeFromBands\([^)]*gradeBands\)\s*:\s*null/

test('live candidate saves only configured school grade bands, not preview defaults', () => {
  assert.match(examSource, strictBands)
  assert.match(examSource, savedGrade)
})

test('release checker includes fail-closed configured-bands and no-fabrication source guards', () => {
  assert.ok(guardSource.includes(strictBands.toString()))
  assert.ok(guardSource.includes(savedGrade.toString()))
  assert.ok(guardSource.includes('exam result writes must not bypass configured grade settings.'))
})

test('regression: reintroducing implicit defaults is rejected', () => {
  assert.doesNotMatch('gradeBands = await loadGradeBandsForSchool(schoolId)', strictBands)
  assert.doesNotMatch('gradeBands = await loadGradeBandsForSchool(schoolId, {previewDefaults:true})', strictBands)
})

test('regression: saving an invented grade without configured bands is rejected', () => {
  assert.doesNotMatch("grade: gradeFromBands(marksObtained, totalMarks, DEFAULT_GRADE_SETTINGS)", savedGrade)
  assert.doesNotMatch("grade: parsedState.status === 'SCORED' ? gradeFromBands(marksObtained, totalMarks, gradeBands) : null", savedGrade)
})

test('whitespace changes retain secure grade checks', () => {
  assert.match('gradeBands = await loadGradeBandsForSchool( schoolId, { previewDefaults: false } )', strictBands)
  assert.match("grade : parsedState.status === 'SCORED' && gradeBands.length > 0 ? gradeFromBands(marksObtained, totalMarks, gradeBands) : null", savedGrade)
})

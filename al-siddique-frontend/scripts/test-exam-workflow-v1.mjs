import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(here, '..')
const repoRoot = path.resolve(frontendRoot, '..')
const require = createRequire(import.meta.url)
const backendSchedule = require(path.join(repoRoot, 'al-siddique-backend', 'src', 'config', 'firstTermExam2026.js'))
const frontendSchedule = await import(pathToFileURL(path.join(frontendRoot, 'src', 'Modules', 'dateSheetFinalExam2026.js')).href)

const seeded = frontendSchedule.mergeFinalExamRows([])
assert.equal(seeded.length, 75, 'Official frontend date sheet must contain 75 actual papers')
assert.deepEqual(frontendSchedule.validateFinalExamRows(seeded), [], 'Official frontend schedule must validate cleanly')

const backendRows = backendSchedule.officialRows()
assert.equal(backendRows.length, seeded.length, 'Backend and frontend must contain the same number of official papers')

const frontKey = new Set(seeded.map(row => {
  const className = backendSchedule.CLASS_LEVEL_TO_NAME[String(row.class)]
  return [className, row.date, row.subjects?.[0], (row.times || []).filter(Boolean)[0]].join('|')
}))
const backKey = new Set(backendRows.map(row => [row.className, row.examDate, row.subject, row.paperTime].join('|')))
assert.deepEqual([...backKey].sort(), [...frontKey].sort(), 'Backend schedule must exactly match the Date Sheet matrix')

assert.equal(backendRows.some(row => row.className === 'Nine'), false, 'Class Nine must not be added to First Term schedule')
assert.equal(backendRows.some(row => row.examDate === '2026-10-04'), false, 'Sunday 04 Oct must not contain a paper')
assert.equal(backendSchedule.normalizeClassName('Class 1'), 'One')
assert.equal(backendSchedule.normalizeClassName('سٹاٹر'), 'Starter')

const marksSource = fs.readFileSync(path.join(frontendRoot, 'src', 'Modules', 'examination', 'MarksSheet.jsx'), 'utf8')
assert.match(marksSource, /\/api\/exams\/\$\{selectedExamId\}\/setup/)
assert.match(marksSource, /\/api\/exams\/\$\{selectedExamId\}\/roster/)
assert.doesNotMatch(marksSource, /api\.get\(['"]\/api\/students/)
assert.doesNotMatch(marksSource, /api\.post\(['"]\/api\/exams['"]/)
assert.match(marksSource, /Saved and verified marks/)

const resultSource = fs.readFileSync(path.join(frontendRoot, 'src', 'Modules', 'examination', 'resultCardTemplates.jsx'), 'utf8')
assert.doesNotMatch(resultSource, /row\.[A-Za-z_]+\s*\|\s*row\.[A-Za-z_]+/, 'Result card must not combine marks with bitwise OR')
assert.match(resultSource, /pct >= 33[^\n]*return 'E'/)

const resultPageSource = fs.readFileSync(path.join(frontendRoot, 'src', 'Modules', 'examination', 'ResultCards.jsx'), 'utf8')
assert.match(resultPageSource, /className:\s*r\.class/)
assert.match(resultPageSource, /section:\s*r\.section/)
assert.match(resultPageSource, /pct >= 33[^\n]*return 'E'/)

const migrationSource = fs.readFileSync(path.join(repoRoot, 'al-siddique-backend', 'src', 'config', 'migrate_exam_workflow_v1.js'), 'utf8')
assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS exam_class_enrollments/)
assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS exam_subjects/)
assert.match(migrationSource, /UNIQUE \(school_id, exam_id, class_name, section, subject\)/)

const routeSource = fs.readFileSync(path.join(repoRoot, 'al-siddique-backend', 'src', 'routes', 'examRoutes.js'), 'utf8')
assert.match(routeSource, /official-first-term\/sync/)
assert.match(routeSource, /router\.get\('\/:id\/setup'/)
assert.match(routeSource, /router\.get\('\/:id\/roster'/)
assert.match(routeSource, /await client\.query\('BEGIN'\)/)
assert.match(routeSource, /ON CONFLICT \(exam_id, student_id, subject\)/)

console.log('EXAM_WORKFLOW_V1_TESTS_OK')
console.log(JSON.stringify({
  officialPapers: backendRows.length,
  classes: [...new Set(backendRows.map(row => row.className))],
  firstDate: backendSchedule.START_DATE,
  lastDate: backendSchedule.END_DATE,
}, null, 2))

'use strict'
const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '../../..')
const frontend = fs.readFileSync(path.join(root, 'al-siddique-frontend/src/Modules/examination/ResultCards.jsx'), 'utf8')
const backend = fs.readFileSync(path.join(root, 'al-siddique-backend/src/routes/examRoutes.js'), 'utf8')

function checkSelectedExamContracts(front = frontend, back = backend) {
  const errors = []
  const required = (ok, message) => {if (!ok) errors.push(message)}
  const load = front.split('const loadResults = () => {')[1]?.split('const handleExamChange = (examId) => {')[0] || ''
  const selected = back.split("router.get('/results/:exam_id', protect, canReadResults, async (req, res) => {")[1]?.split("router.get('/student-results/:student_id'")[0] || ''
  const save = back.split("gradeBands = await loadGradeBandsForSchool(schoolId, { previewDefaults: false })")[1]?.split('const client = await pool.connect()')[0] || ''
  required(load.includes('const requestExamId = String(selectedExam)'), 'selected request id')
  required(load.includes('api.get(`/api/exams/results/${requestExamId}`)'), 'bounded selected exam request')
  required(load.includes('if (latestResultRequest.current !== requestId) return'), 'stale response denial')
  required(front.includes('const activeResults = String(loadedExamId) === String(selectedExam) ? results : []'), 'cached previous exam isolation')
  required(front.includes('return buildPrintCards(activeResults, exam, students)'), 'all-class print isolation')
  required(!/Promise\.all\(exams\.map[\s\S]{0,240}\/api\/exams\/results\//.test(front), 'no unbounded per-exam fanout')
  required(!!selected, 'authenticated selected-exam route')
  required(selected.includes('WHERE er.exam_id = $1'), 'server-side requested-exam constraint')
  required(selected.includes("tenantClause(req, { table: 'students'"), 'student tenant filter')
  required(selected.includes("tenantClause(req, { table: 'exams'"), 'exam tenant filter')
  required(selected.includes("portalStudentScope(req, 's'"), 'student portal row scope')
  required(!!save, 'write uses configured-only grading bands')
  required(save.includes("grade:parsedState.status === 'SCORED' && gradeBands.length > 0 ? gradeFromBands(marksObtained, totalMarks, gradeBands) : null"), 'null unless scored and grading configured')
  required(back.includes('return result.rowCount') && back.includes('(previewDefaults ? DEFAULT_GRADE_SETTINGS : [])'), 'configurable preview-only default policy')
  return errors
}

test('actual checked-in result/grade contract passes all 14 invariants', () => {
  assert.deepEqual(checkSelectedExamContracts(), [])
})
function corruptSelectedRoute(source, needle, replacement) {
  const route = "router.get('/results/:exam_id', protect, canReadResults, async (req, res) => {"
  const index = source.indexOf(route)
  assert.ok(index !== -1, 'selected-exam route must be present before mutation')
  const tail = source.slice(index)
  assert.ok(tail.includes(needle), 'targeted security check must be present before mutation')
  return source.slice(0, index) + tail.replace(needle, replacement)
}
const corruptions = [
  ['unbounded results endpoint', () => [frontend.replace('api.get(`/api/exams/results/${requestExamId}`)', "api.get('/api/exams/results')"), backend]],
  ['stale prior examination can become printable', () => [frontend.replace('const activeResults = String(loadedExamId) === String(selectedExam) ? results : []', 'const activeResults = results'), backend]],
  ['all-class print bypasses current exam scope', () => [frontend.replace('return buildPrintCards(activeResults, exam, students)', 'return buildPrintCards(results, exam, students)'), backend]],
  ['late asynchronous request overwrites new exam', () => [frontend.replaceAll('if (latestResultRequest.current !== requestId) return', 'if (false) return'), backend]],
  ['selected-exam WHERE filter removed', () => [frontend, backend.replace('WHERE er.exam_id = $1', 'WHERE 1=1')]],
  ['student tenant filter removed', () => [frontend, corruptSelectedRoute(backend, "const studentTenant = await tenantClause(req, { table: 'students', alias: 's', paramIndex: 2 })", "const studentTenant = {clause:'',params:[],nextIndex:2}")]],
  ['exam tenant filter removed', () => [frontend, corruptSelectedRoute(backend, "const examTenant = await tenantClause(req, { table: 'exams', alias: 'e', paramIndex: studentTenant.nextIndex })", "const examTenant = {clause:'',params:[],nextIndex:2}")]],
  ['student portal row filter removed', () => [frontend, corruptSelectedRoute(backend, "const portalScope = portalStudentScope(req, 's', examTenant.nextIndex)", "const portalScope = {clause:'',params:[]}")]],
  ['unsafe grade preview defaults on write', () => [frontend, backend.replace('gradeBands = await loadGradeBandsForSchool(schoolId, { previewDefaults: false })','gradeBands = await loadGradeBandsForSchool(schoolId)')]],
  ['fabricated grade without configured bands', () => [frontend, backend.replace("grade:parsedState.status === 'SCORED' && gradeBands.length > 0 ? gradeFromBands(marksObtained, totalMarks, gradeBands) : null", "grade:gradeFromBands(marksObtained, totalMarks, DEFAULT_GRADE_SETTINGS)")]],
  ['bulk per-exam HTTP fanout', () => [frontend + "\nPromise.all(exams.map(e => api.get('/api/exams/results/' + e.id)))", backend]],
]
for (const [name, mutate] of corruptions) {
  test('fail closed on synthetic source corruption: '+name, () => {
    const [badFront, badBack] = mutate()
    assert.notDeepEqual(checkSelectedExamContracts(badFront, badBack), [])
  })
}

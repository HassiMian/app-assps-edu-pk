'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { checkSource } = require('../release/check-resultcards-grading-contract-20261017.cjs')
const originals = Object.freeze({
  cards: fs.readFileSync('al-siddique-frontend/src/Modules/examination/ResultCards.jsx', 'utf8'),
  exams: fs.readFileSync('al-siddique-backend/src/routes/examRoutes.js', 'utf8'),
})

function altered(side, before, after, code, handlerStart = '') {
  const source = originals[side]
  const from = handlerStart ? source.indexOf(handlerStart) : 0
  assert.ok(from >= 0, 'Fixture drift: expected handler missing')
  const start = source.indexOf(before, from)
  assert.ok(start >= 0, 'Fixture drift: replacement source must really exist inside handler')
  const candidate = source.slice(0, start) + after + source.slice(start + before.length)
  const failures = checkSource({ ...originals, [side]: candidate })
  assert.ok(failures.includes(code), `${code} was not rejected: ${failures.join(', ')}`)
}

test('reviewed selected-exam results and school grading are safely scoped', () => {
  assert.deepEqual(checkSource(originals), [])
})
test('cross-exam stale response cannot silently mix selected results', () => altered('cards',
  'if (latestResultRequest.current !== requestId) return', 'if (false) return',
  'RESULT_FETCH_MUST_REJECT_STALE_RESPONSE', 'const loadResults = () => {'))
test('late previous-exam error cannot overwrite the current selection error', () => {
  const before = '.catch(err => {\n        if (latestResultRequest.current !== requestId) return'
  assert.ok(originals.cards.includes(before))
  const candidate = originals.cards.replace(before, '.catch(err => {\n        if (false) return')
  assert.ok(checkSource({ ...originals, cards: candidate }).includes('RESULT_FETCH_MUST_REJECT_STALE_ERROR'))
})
test('loaded result rows cannot leak across exam changes', () => altered('cards',
  'String(loadedExamId) === String(selectedExam) ? results : []', 'results',
  'RESULT_PRINT_MUST_FAIL_CLOSED_ON_WRONG_EXAM'))
test('all-classes printing cannot read unscoped result rows', () => altered('cards',
  'return buildPrintCards(activeResults, exam, students)', 'return buildPrintCards(results, exam, students)',
  'ALL_CLASSES_PRINT_MUST_USE_SAME_EXAM_ROWS'))
test('all-classes without saved marks must fail, never fabricate cards', () => altered('cards',
  'if (!allExamPrintCards.length)', 'if (false)',
  'ALL_CLASSES_PRINT_MUST_FAIL_ON_MISSING_SAVED_CARDS'))
test('an actual all-examinations mode may not masquerade as scoped all-classes', () => altered('cards',
  'All Classes — all saved result cards', 'All Examinations — all saved result cards',
  'ALL_EXAMS_MODE_REQUIRES_SEPARATE_BATCH_CONTRACT'))
test('bulk N-per-exam HTTP fanout cannot replace scoped selection', () => {
  const failures = checkSource({ ...originals,
    cards: originals.cards + '\nPromise.all(exams.map(e=>api.get(`/api/exams/results/${e.id}`)))' })
  assert.ok(failures.includes('RESULTS_EXAM_HTTP_FANOUT_FORBIDDEN'))
})
test('protected result route cannot be converted into anonymous endpoint', () => altered('exams',
  "router.get('/results/:exam_id', protect, canReadResults", "router.get('/results/:exam_id', async",
  'RESULT_ROUTE_MUST_AUTHORIZE_READS'))
test('result scope cannot drop exact exam constraint', () => altered('exams',
  'WHERE er.exam_id = $1', 'WHERE true',
  'RESULT_ROUTE_MUST_FILTER_EXAM_ID'))
test('result scope cannot drop student tenant check', () => altered('exams',
  "tenantClause(req, { table: 'students', alias: 's'", "tenantClause(req, { table: 'students', alias: 'x'",
  'RESULT_ROUTE_MUST_FILTER_STUDENT_TENANT', "router.get('/results/:exam_id'"))
test('result scope cannot drop exam tenant check', () => altered('exams',
  "tenantClause(req, { table: 'exams', alias: 'e'", "tenantClause(req, { table: 'exams', alias: 'x'",
  'RESULT_ROUTE_MUST_FILTER_EXAM_TENANT', "router.get('/results/:exam_id'"))
test('parent/student scoped access cannot be widened', () => altered('exams',
  "portalStudentScope(req, 's', examTenant.nextIndex)", "portalStudentScope(req, 'e', examTenant.nextIndex)",
  'RESULT_ROUTE_MUST_ENFORCE_LINKED_PORTAL_SCOPE', "router.get('/results/:exam_id'"))
test('saving grades cannot load default preview bands', () => altered('exams',
  'loadGradeBandsForSchool(schoolId, { previewDefaults: false })', 'loadGradeBandsForSchool(schoolId)',
  'SAVED_GRADES_MUST_DISABLE_PREVIEW_DEFAULTS'))
test('grade policy must come from same school not a global row set', () => altered('exams',
  'FROM grade_settings\n    WHERE school_id = $1', 'FROM grade_settings\n    WHERE true',
  'GRADING_BANDS_MUST_BE_FROM_OWN_SCHOOL'))
test('unconfigured school grade bands must not fall back to defaults', () => altered('exams',
  '(previewDefaults ? DEFAULT_GRADE_SETTINGS : [])', 'DEFAULT_GRADE_SETTINGS',
  'MISSING_APPROVED_BANDS_MUST_NOT_INFER_GRADES'))
test('save must not assign a grade if policy has no configured bands', () => altered('exams',
  "parsedState.status === 'SCORED' && gradeBands.length > 0 ? gradeFromBands(marksObtained, totalMarks, gradeBands) : null",
  "parsedState.status === 'SCORED' ? gradeFromBands(marksObtained, totalMarks, gradeBands) : null",
  'SAVED_GRADES_MUST_FAIL_CLOSED_IF_BANDS_ABSENT'))

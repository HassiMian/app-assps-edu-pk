'use strict'
// Source-only security contract. No network, database, or privileged user actions.
const fs = require('node:fs')
const path = require('node:path')
const REL_CARDS = 'al-siddique-frontend/src/Modules/examination/ResultCards.jsx'
const REL_EXAMS = 'al-siddique-backend/src/routes/examRoutes.js'

function checkSource({ cards, exams }) {
  const failures = []
  const requirePattern = (source, pattern, label) => {
    if (!pattern.test(source)) failures.push(label)
  }
  const forbidPattern = (source, pattern, label) => {
    if (pattern.test(source)) failures.push(label)
  }

  function inHandler(text, opening, next, error) {
    const start = text.indexOf(opening)
    if (start < 0) { failures.push(error); return '' }
    const finish = text.indexOf(next, start + opening.length)
    if (finish < 0) { failures.push(error); return '' }
    return text.slice(start, finish)
  }
  const activeFetch = inHandler(cards, 'const loadResults = () => {',
    'const handleExamChange =', 'RESULT_FETCH_HANDLER_MISSING')
  const exactResultRoute = inHandler(exams,
    "router.get('/results/:exam_id'", "router.get('/student-results/:student_id'",
    'EXACT_EXAM_READ_ROUTE_MISSING')
  const policyLoader = inHandler(exams, 'async function loadGradeBandsForSchool(',
    'function validateGradeSettings(', 'GRADE_POLICY_LOADER_MISSING')
  const saveLoader = inHandler(exams, '  let gradeBands', '  const normalized = []',
    'SAVED_GRADE_POLICY_FETCH_MISSING')
  const savedRows = inHandler(exams, '  const normalized = []',
    '  const client = await pool.connect()', 'SAVED_GRADE_APPLICATION_MISSING')

  // "All" in this UI means all CLASSES in ONE selected exam, not all exams.
  // If all-exams is ever added, this guard must be extended for the bounded
  // tenant-scoped batch endpoint rather than silently permitting a fan-out.
  requirePattern(cards, /<option\s+value="all">All Classes\s*[—–-]\s*all saved result cards/, 'RESULT_PRINT_MUST_IDENTIFY_SELECTED_EXAM_ALL_CLASSES_MODE')
  forbidPattern(cards, /(?:All\s+Exams|All\s+Examinations|value="all-exams")/i, 'ALL_EXAMS_MODE_REQUIRES_SEPARATE_BATCH_CONTRACT')
  forbidPattern(cards, /Promise\.all\(\s*exams\.map[\s\S]{0,450}\/api\/exams\/results\//, 'RESULTS_EXAM_HTTP_FANOUT_FORBIDDEN')
  requirePattern(activeFetch, /const requestExamId\s*=\s*String\(selectedExam\)/, 'RESULT_FETCH_MUST_PIN_SELECTED_EXAM')
  requirePattern(activeFetch, /api\.get\(`\/api\/exams\/results\/\$\{requestExamId\}`\)/, 'RESULT_FETCH_MUST_USE_SINGLE_EXAM_ENDPOINT')
  requirePattern(activeFetch, /\.then\(r\s*=>\s*\{\s*if\s*\(latestResultRequest\.current\s*!==\s*requestId\)\s*return/, 'RESULT_FETCH_MUST_REJECT_STALE_RESPONSE')
  requirePattern(activeFetch, /\.catch\(err\s*=>\s*\{\s*if\s*\(latestResultRequest\.current\s*!==\s*requestId\)\s*return/, 'RESULT_FETCH_MUST_REJECT_STALE_ERROR')
  requirePattern(activeFetch, /setLoadedExamId\(requestExamId\)/, 'RESULT_ROWS_MUST_RECORD_EXAM_PROVENANCE')
  requirePattern(cards, /const activeResults\s*=\s*String\(loadedExamId\)\s*===\s*String\(selectedExam\)\s*\?\s*results\s*:\s*\[\]/, 'RESULT_PRINT_MUST_FAIL_CLOSED_ON_WRONG_EXAM')
  requirePattern(cards, /const allExamPrintCards\s*=\s*useMemo\(\(\)\s*=>\s*\{\s*return buildPrintCards\(activeResults,\s*exam,\s*students\)/, 'ALL_CLASSES_PRINT_MUST_USE_SAME_EXAM_ROWS')
  requirePattern(cards, /if\s*\(outputMode\s*===\s*'all'\)\s*\{\s*if\s*\(!allExamPrintCards\.length\)/, 'ALL_CLASSES_PRINT_MUST_FAIL_ON_MISSING_SAVED_CARDS')
  requirePattern(cards, /setPrintCards\(allExamPrintCards\)/, 'ALL_CLASSES_PRINT_MUST_USE_SCOPED_CARDS')

  requirePattern(exactResultRoute, /router\.get\('\/results\/:exam_id',\s*protect,\s*canReadResults/, 'RESULT_ROUTE_MUST_AUTHORIZE_READS')
  requirePattern(exactResultRoute, /WHERE er\.exam_id = \$1/, 'RESULT_ROUTE_MUST_FILTER_EXAM_ID')
  requirePattern(exactResultRoute, /tenantClause\(req,\s*\{\s*table:\s*'students',\s*alias:\s*'s'/, 'RESULT_ROUTE_MUST_FILTER_STUDENT_TENANT')
  requirePattern(exactResultRoute, /tenantClause\(req,\s*\{\s*table:\s*'exams',\s*alias:\s*'e'/, 'RESULT_ROUTE_MUST_FILTER_EXAM_TENANT')
  requirePattern(exactResultRoute, /portalStudentScope\(req,\s*'s',\s*examTenant\.nextIndex\)/, 'RESULT_ROUTE_MUST_ENFORCE_LINKED_PORTAL_SCOPE')

  // School-specific grade save is intentionally STRONGER than the old literal
  // checker: no preview/default grade bands are used for persisted marks.
  requirePattern(saveLoader, /gradeBands\s*=\s*await loadGradeBandsForSchool\(schoolId,\s*\{\s*previewDefaults:\s*false\s*\}\)/, 'SAVED_GRADES_MUST_DISABLE_PREVIEW_DEFAULTS')
  requirePattern(policyLoader, /FROM grade_settings\s+WHERE school_id = \$1/, 'GRADING_BANDS_MUST_BE_FROM_OWN_SCHOOL')
  requirePattern(policyLoader, /\(previewDefaults\s*\?\s*DEFAULT_GRADE_SETTINGS\s*:\s*\[\]\)/, 'MISSING_APPROVED_BANDS_MUST_NOT_INFER_GRADES')
  requirePattern(savedRows, /grade:\s*parsedState\.status\s*===\s*'SCORED'\s*&&\s*gradeBands\.length\s*>\s*0\s*\?\s*gradeFromBands\(marksObtained,\s*totalMarks,\s*gradeBands\)\s*:\s*null/, 'SAVED_GRADES_MUST_FAIL_CLOSED_IF_BANDS_ABSENT')
  forbidPattern(exams, /const grade\s*=\s*calcGrade\(/, 'LEGACY_UNSCOPED_GRADE_CALCULATION_FORBIDDEN')
  return failures
}

function checkRepository(root = path.resolve(__dirname, '../..')) {
  return checkSource({
    cards: fs.readFileSync(path.join(root, REL_CARDS), 'utf8'),
    exams: fs.readFileSync(path.join(root, REL_EXAMS), 'utf8'),
  })
}

module.exports = { checkSource, checkRepository }
if (require.main === module) {
  const errors = checkRepository()
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1 }
  else console.log('RESULT_CARDS_SELECTED_EXAM_TENANT_AND_SAVED_GRADE_POLICY_PASS')
}

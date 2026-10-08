const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const route = fs.readFileSync(path.join(root, 'routes/assessmentStudioRoutes.js'), 'utf8')
const service = fs.readFileSync(path.join(root, 'services/assessmentPrintJobs.js'), 'utf8')

test('Assessment Studio print projections remain authenticated, tenant-bound, and hash-bound', () => {
  assert.match(route, /router\.use\(protect, canAuthorAssessments\)/)
  assert.match(route, /WHERE j\.school_id=\$1 AND j\.print_job_id=\$2 LIMIT 1/)
  assert.match(route, /PRINT_RELEASE_HASH_MISMATCH/)
  assert.match(route, /PRINT_ROSTER_HASH_MISMATCH/)
  assert.match(route, /PRINT_ROSTER_STUDENT_NOT_FOUND/)
})

test('student projection strips answer material and answer-key projection remains staff-only', () => {
  assert.match(service, /STUDENT_PROJECTION_ANSWER_LEAK/)
  assert.match(service, /FORBIDDEN_ANSWER_KEYS/)
  assert.match(service, /ANSWER_KEY_ROLE_REQUIRED/)
  assert.match(service, /new Set\(\['super_admin','admin','school_admin','principal','teacher'\]\)/)
  assert.match(route, /buildStaffAnswerKeyProjection\(row\.snapshot_json \|\| \{\}, \{ role:req\.user\?\.role \}\)/)
})

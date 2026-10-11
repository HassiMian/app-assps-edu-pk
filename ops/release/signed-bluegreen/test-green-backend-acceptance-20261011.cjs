'use strict'
/**
 * Genuine authenticated principal/teacher, tenant isolation, marks save/reload/zero
 * and connection-pool isolation tests against the candidate green backend.
 * Protected fixture is provided via anonymous stdin only (no argv/environment leaks).
 */
const assert = require('node:assert/strict')
const http = require('node:http')
const { readFileSync } = require('node:fs')
const jwt = require('/var/www/apex-backend/node_modules/jsonwebtoken')
const { execFileSync } = require('node:child_process')

function psql(sql) {
  return execFileSync('runuser', ['-u', 'postgres', '--', 'psql', '-d', 'apexos', '-X', '-t', '-A', '-c', sql], { encoding: 'utf8' }).trim()
}

function getFixture() {
  assert.equal(process.env.ASSPS_GREEN_ACCEPTANCE_STDIN, '1',
    'Green acceptance requires protected stdin fixture; no credential environment variables')
  const fixture = JSON.parse(readFileSync(0, 'utf8'))
  assert.ok(fixture && typeof fixture === 'object' && !Array.isArray(fixture))
  return fixture
}

function makeRequest(port, path, method = 'GET', token = null, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const headers = {}
    if (token) headers['Authorization'] = 'Bearer ' + token
    if (payload) {
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(payload)
    }
    const req = http.request({
      host: '127.0.0.1',
      port,
      path,
      method,
      headers,
      timeout: 8000,
    }, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(data) } catch (_) {}
        resolve({ status: res.statusCode, data: json, raw: data })
      })
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy(new Error('Request timeout to green backend on port ' + port))
    })
    if (payload) req.write(payload)
    req.end()
  })
}

async function main() {
  const fixture = getFixture()
  const port = Number(fixture.port || 5091)
  const jwtSecret = fixture.jwtSecret
  assert.ok(jwtSecret && jwtSecret.length >= 16, 'Valid JWT secret required')

  const sign = claims => jwt.sign(claims, jwtSecret, { algorithm: 'HS256', expiresIn: '15m' })

  console.log('=== TEST 1: ANONYMOUS REQUEST DENIAL ===')
  const anon = await makeRequest(port, '/api/exams/results?exam_ids=9')
  assert.equal(anon.status, 401, 'Anonymous request must return 401 Unauthorized')
  console.log('PASS: Anonymous access returned HTTP 401')

  console.log('=== TEST 2: SCHOOL 1 PRINCIPAL EXAMS READ ===')
  const s1AdminToken = sign({
    id: fixture.admin1Id || 1,
    email: 'admin@assps.edu.pk',
    role: 'admin',
    school_id: fixture.school1Id || 1,
    tenant_id: 'assps',
  })
  const examsRes = await makeRequest(port, '/api/exams', 'GET', s1AdminToken)
  assert.equal(examsRes.status, 200, 'Principal GET /api/exams must return 200')
  assert.ok(Array.isArray(examsRes.data?.data) || Array.isArray(examsRes.data?.exams), 'Exams list returned')
  console.log('PASS: Principal GET /api/exams returned HTTP 200')

  console.log('=== TEST 3: SCHOOL 1 PRINCIPAL GRADE SETTINGS READ ===')
  const gradeRes = await makeRequest(port, '/api/exams/grade-settings', 'GET', s1AdminToken)
  assert.equal(gradeRes.status, 200, 'Principal GET /api/exams/grade-settings must return 200')
  console.log('PASS: Principal GET /api/exams/grade-settings returned HTTP 200')

  console.log('=== TEST 4: SCHOOL 1 PRINCIPAL EXAM RESULTS READ ===')
  const resultsRes = await makeRequest(port, '/api/exams/results?exam_ids=9', 'GET', s1AdminToken)
  assert.equal(resultsRes.status, 200, 'Principal GET /api/exams/results returned 200')
  console.log('PASS: Principal GET /api/exams/results returned HTTP 200')

  console.log('=== TEST 5: UNASSIGNED TEACHER NEGATIVE AUTHORIZATION ===')
  const s1TeacherToken = sign({
    id: fixture.teacher2Id || 2,
    email: 'teacher@alsiddique.edu.pk',
    role: 'teacher',
    school_id: fixture.school1Id || 1,
    tenant_id: 'assps',
  })
  const unassignedWrite = await makeRequest(port, '/api/exams/results', 'POST', s1TeacherToken, {
    results: [{
      exam_id: fixture.examId || 9,
      student_id: fixture.testStudentId || 763,
      subject: fixture.testSubject || 'English',
      marks_obtained: 85,
      total_marks: 100,
    }]
  })
  assert.equal(unassignedWrite.status, 403, 'Unassigned teacher marks write must return 403')
  assert.equal(unassignedWrite.data?.code, 'EXAM_MARKS_TEACHER_ASSIGNMENT_REQUIRED',
    'Error code must be EXAM_MARKS_TEACHER_ASSIGNMENT_REQUIRED')
  console.log('PASS: Unassigned teacher write denied with HTTP 403 EXAM_MARKS_TEACHER_ASSIGNMENT_REQUIRED')

  console.log('=== TEST 6: ASSIGNED TEACHER MARKS LIFECYCLE + EXPLICIT ZERO ===')
  const schoolId = fixture.school1Id || 1
  const teacherId = fixture.teacher2Id || 2
  const examId = fixture.examId || 9
  const studentId = fixture.testStudentId || 763
  const subject = fixture.testSubject || 'English'

  try {
    // 1. Insert temporary active assignment
    psql(`INSERT INTO teacher_class_assignments (school_id, teacher_user_id, class_name, section, subject, is_active) VALUES (${schoolId}, ${teacherId}, 'Nine', 'Fatima', '${subject}', true) ON CONFLICT DO NOTHING;`)

    // 2. Perform teacher marks save (88/100)
    const saveRes = await makeRequest(port, '/api/exams/results', 'POST', s1TeacherToken, {
      results: [{
        exam_id: examId,
        student_id: studentId,
        subject: subject,
        marks_obtained: 88,
        total_marks: 100,
      }]
    })
    assert.equal(saveRes.status, 200, 'Assigned teacher save marks must return 200')
    assert.equal(saveRes.data?.savedCount, 1, 'savedCount must be 1')
    console.log('PASS: Assigned teacher saved marks (88/100) successfully')

    // 3. Reload marks via GET /api/exams/results?exam_ids=9 as Principal
    const reload1 = await makeRequest(port, '/api/exams/results?exam_ids=9', 'GET', s1AdminToken)
    assert.equal(reload1.status, 200, 'Reload results must return 200')
    const rows1 = reload1.data?.data || []
    const savedRow1 = rows1.find(r => Number(r.student_id) === Number(studentId) && r.subject === subject)
    assert.ok(savedRow1, 'Saved result row must exist in reload')
    assert.equal(Number(savedRow1.marks_obtained), 88, 'Reloaded marks_obtained must match 88')
    console.log('PASS: Reloaded saved marks confirmed: marks_obtained = 88')

    // 4. Perform explicit zero marks save (0/100)
    const zeroSaveRes = await makeRequest(port, '/api/exams/results', 'POST', s1TeacherToken, {
      results: [{
        exam_id: examId,
        student_id: studentId,
        subject: subject,
        marks_obtained: 0,
        total_marks: 100,
      }]
    })
    assert.equal(zeroSaveRes.status, 200, 'Explicit zero save must return 200')
    assert.equal(zeroSaveRes.data?.savedCount, 1, 'savedCount must be 1')
    console.log('PASS: Assigned teacher saved explicit zero marks (0/100) successfully')

    // 5. Reload marks and verify 0 is persisted
    const reload2 = await makeRequest(port, '/api/exams/results?exam_ids=9', 'GET', s1AdminToken)
    assert.equal(reload2.status, 200, 'Reload results must return 200')
    const rows2 = reload2.data?.data || []
    const savedRow2 = rows2.find(r => Number(r.student_id) === Number(studentId) && r.subject === subject)
    assert.ok(savedRow2, 'Saved result row with zero must exist')
    assert.equal(Number(savedRow2.marks_obtained), 0, 'Reloaded marks_obtained must match 0')
    console.log('PASS: Reloaded explicit zero marks confirmed: marks_obtained = 0')
  } finally {
    // 6. Cleanup test row and assignment to preserve school records
    psql(`DELETE FROM exam_results WHERE school_id = ${schoolId} AND exam_id = ${examId} AND student_id = ${studentId} AND subject = '${subject}';`)
    psql(`DELETE FROM teacher_class_assignments WHERE school_id = ${schoolId} AND teacher_user_id = ${teacherId} AND class_name = 'Nine' AND section = 'Fatima' AND subject = '${subject}';`)
    console.log('PASS: Cleaned up temporary test result row and assignment (records preserved)')
  }

  console.log('=== TEST 7: PEER TENANT ISOLATION (SCHOOL 2) ===')
  const s2AdminToken = sign({
    id: fixture.admin2Id || 2420,
    email: 'demo@assps.edu.pk',
    role: 'admin',
    school_id: fixture.school2Id || 2,
    tenant_id: 'demo',
  })
  const s2ReadExam9 = await makeRequest(port, '/api/exams/results?exam_ids=9', 'GET', s2AdminToken)
  assert.equal(s2ReadExam9.status, 200, 'School 2 read query returns 200')
  const s2Data = s2ReadExam9.data?.data || []
  assert.equal(s2Data.length, 0, 'School 2 must see 0 results for School 1 exam 9 (RLS tenant isolation)')
  console.log('PASS: School 2 cannot see School 1 exam 9 results (0 rows returned)')

  const s2WriteCross = await makeRequest(port, '/api/exams/results', 'POST', s2AdminToken, {
    results: [{
      exam_id: fixture.examId || 9,
      student_id: fixture.testStudentId || 763,
      subject: fixture.testSubject || 'English',
      marks_obtained: 50,
      total_marks: 100,
    }]
  })
  assert.equal(s2WriteCross.status, 403, 'Cross-school write must return 403 Forbidden')
  console.log('PASS: School 2 cross-school write denied with HTTP 403 Forbidden')

  console.log('=== TEST 8: STUDENT ROLE DENIAL ===')
  const s1StudentToken = sign({
    id: fixture.student1Id || 1987,
    email: 'student_mig26-090@assps.edu.pk',
    role: 'student',
    school_id: fixture.school1Id || 1,
    tenant_id: 'assps',
  })
  const studentWrite = await makeRequest(port, '/api/exams/results', 'POST', s1StudentToken, {
    results: [{
      exam_id: fixture.examId || 9,
      student_id: fixture.testStudentId || 763,
      subject: fixture.testSubject || 'English',
      marks_obtained: 50,
      total_marks: 100,
    }]
  })
  assert.equal(studentWrite.status, 403, 'Student marks write must return 403 Forbidden')
  console.log('PASS: Student marks write denied with HTTP 403 Forbidden')

  console.log('=== TEST 9: FORGED TENANT TOKEN / INVALID SIGNATURE ===')
  const badToken = jwt.sign({
    id: 1,
    email: 'admin@assps.edu.pk',
    role: 'admin',
    school_id: 1,
    tenant_id: 'assps',
  }, 'wrong-secret-key-1234567890abcdef', { algorithm: 'HS256' })
  const forgedRes = await makeRequest(port, '/api/exams/results?exam_ids=9', 'GET', badToken)
  assert.equal(forgedRes.status, 401, 'Forged/tampered signature token must return 401 Unauthorized')
  console.log('PASS: Forged token denied with HTTP 401 Unauthorized')

  console.log('=== TEST 10: CONNECTION-POOL ISOLATION ===')
  // Send 10 rapid alternating requests between School 1 and School 2
  for (let i = 0; i < 5; i++) {
    const r1 = await makeRequest(port, '/api/exams/results?exam_ids=9', 'GET', s1AdminToken)
    assert.equal(r1.status, 200)
    const r2 = await makeRequest(port, '/api/exams/results?exam_ids=9', 'GET', s2AdminToken)
    assert.equal(r2.status, 200)
    assert.equal((r2.data?.data || []).length, 0, 'School 2 must never see School 1 rows on pooled connection')
  }
  console.log('PASS: Connection-pool isolation verified across 10 alternating multi-tenant requests')

  console.log('\n======================================================')
  console.log('ALL 10 GREEN BACKEND ACCEPTANCE GATES PASSED (10/10 PASS)')
  console.log('======================================================')
}

main().catch(err => {
  console.error('GREEN_BACKEND_ACCEPTANCE_FAILED', err)
  process.exit(1)
})

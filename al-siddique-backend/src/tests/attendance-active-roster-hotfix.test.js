// al-siddique-backend/src/tests/attendance-active-roster-hotfix.test.js
// ATTENDANCE PRODUCTION HOTFIX — REGRESSION AND INTEGRATION TEST SUITE

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const assert = require('assert')
const http = require('http')
const jwt = require('jsonwebtoken')
const { pool } = require('../config/database')

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_KEY_MIN_32_CHARS'
const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000'

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(data) } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data })
      })
    })

    req.on('error', reject)
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
    req.end()
  })
}

function getPktDateString(dateObj = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj)
}

async function runHotfixSuite() {
  console.log('=================================================================')
  console.log('STARTING ATTENDANCE ACTIVE ROSTER HOTFIX SUITE')
  console.log('=================================================================')

  const client = await pool.connect()
  const todayPkt = getPktDateString()
  console.log(`Current Date (PKT): ${todayPkt}`)
  console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET, 'length:', process.env.JWT_SECRET?.length)

  const schoolAId = 1
  const schoolBId = 98765
  const tenantA = 'assps'
  const tenantB = 'test_b'

  // Fixture student IDs (using high deterministic range)
  const activeStudent1Id = 888101
  const activeStudent2Id = 888102
  const inactiveStudentId = 888103
  const foreignStudentId = 888104

  try {
    // 0. Setup test school B
    await client.query(`
      INSERT INTO schools (id, name, code, status, tenant_id)
      VALUES ($1, 'Tenant B Test School', 'test_b', 'active', $2)
      ON CONFLICT (id) DO UPDATE SET status = 'active', tenant_id = $2
    `, [schoolBId, tenantB])

    // Create fixture students:
    // Active students in School A, Class 'One', Section 'Yellow'
    await client.query(`
      INSERT INTO students (id, school_id, gr_number, name, father_name, roll_number, class, section, is_active, tenant_id)
      VALUES 
        ($1, $2, 'GR-ACT-1', 'Active Student One', 'Father One', '101', 'One', 'Yellow', true, $3),
        ($4, $2, 'GR-ACT-2', 'Active Student Two', 'Father Two', '102', 'One', 'Yellow', true, $3)
      ON CONFLICT (id) DO UPDATE SET is_active = true, school_id = $2, tenant_id = $3, class = 'One', section = 'Yellow'
    `, [activeStudent1Id, schoolAId, tenantA, activeStudent2Id])

    // Inactive student in School A, Class 'One', Section 'Yellow'
    await client.query(`
      INSERT INTO students (id, school_id, gr_number, name, father_name, roll_number, class, section, is_active, tenant_id)
      VALUES ($1, $2, 'GR-INACT-3', 'Inactive Student Three', 'Father Three', '103', 'One', 'Yellow', false, $3)
      ON CONFLICT (id) DO UPDATE SET is_active = false, school_id = $2, tenant_id = $3, class = 'One', section = 'Yellow'
    `, [inactiveStudentId, schoolAId, tenantA])

    // Foreign active student in School B (different tenant/school)
    await client.query(`
      INSERT INTO students (id, school_id, gr_number, name, father_name, roll_number, class, section, is_active, tenant_id)
      VALUES ($1, $2, 'GR-FOR-4', 'Foreign Tenant Active Student', 'Father Foreign', '201', 'One', 'Yellow', true, $3)
      ON CONFLICT (id) DO UPDATE SET is_active = true, school_id = $2, tenant_id = $3
    `, [foreignStudentId, schoolBId, tenantB])

    const tokenA = jwt.sign(
      { id: 1, email: 'admin@assps.edu.pk', role: 'admin', school_id: schoolAId, tenant_id: tenantA },
      JWT_SECRET,
      { expiresIn: '1h' }
    )

    // Clean any existing attendance for test students today
    await client.query(`
      DELETE FROM attendance 
      WHERE student_id = ANY($1::int[]) AND date = $2
    `, [[activeStudent1Id, activeStudent2Id, inactiveStudentId, foreignStudentId], todayPkt])

    // ──────────────────────────────────────────────────────────────────────────
    // FIX 6 TEST: Dashboard Path — Unmarked Students Modal Loader & Save
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TEST FIX 6] Dashboard Path: Unmarked Students Roster & Save')
    {
      // 1. Loader simulation: call GET /api/students?active=true
      const getRes = await makeRequest('GET', '/api/students?active=true', { Authorization: `Bearer ${tokenA}` })
      if (getRes.status !== 200) {
        console.error('getRes failed:', getRes.status, getRes.body, getRes.raw)
      }
      assert.strictEqual(getRes.status, 200, `Expected 200 from GET /api/students?active=true, got ${getRes.status}`)
      assert.strictEqual(getRes.body?.success, true)
      
      const returnedList = getRes.body?.data || []
      // Defensive UI filtering: student.is_active !== false
      const visibleList = returnedList.filter(s => s.is_active !== false)
      
      const containsActive1 = visibleList.some(s => s.id === activeStudent1Id)
      const containsActive2 = visibleList.some(s => s.id === activeStudent2Id)
      const containsInactive = visibleList.some(s => s.id === inactiveStudentId)

      assert.ok(containsActive1, 'Dashboard loader must include active student 1')
      assert.ok(containsActive2, 'Dashboard loader must include active student 2')
      assert.strictEqual(containsInactive, false, 'Dashboard loader must EXCLUDE inactive student')
      console.log('  ✓ Dashboard Unmarked Students loader excludes inactive student.')

      // 2. Mark All Visible Present and Save Attendance
      const payload = {
        records: [
          { student_id: activeStudent1Id, status: 'present', date: todayPkt },
          { student_id: activeStudent2Id, status: 'present', date: todayPkt }
        ]
      }
      const saveRes = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, payload)
      if (saveRes.status !== 200) {
        console.error('saveRes failed:', saveRes.status, saveRes.body, saveRes.raw)
      }
      assert.strictEqual(saveRes.status, 200, `Expected 200 from save attendance, got ${saveRes.status}`)
      assert.strictEqual(saveRes.body?.success, true)
      assert.strictEqual(saveRes.body?.savedCount, 2)

      // Verify records in DB
      const dbRows = await client.query(
        'SELECT student_id, status FROM attendance WHERE student_id = ANY($1::int[]) AND date = $2',
        [[activeStudent1Id, activeStudent2Id, inactiveStudentId], todayPkt]
      )
      assert.strictEqual(dbRows.rows.length, 2, 'Exactly 2 records must be persisted in DB')
      assert.ok(!dbRows.rows.some(r => r.student_id === inactiveStudentId), 'Inactive student must NOT have attendance')
      console.log('  ✓ Active records persisted cleanly with 0 INVALID_STUDENT_IDS.')
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FIX 7 TEST: Full Attendance Path — Class One / Section Yellow
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TEST FIX 7] Full Attendance Path: Class One / Section Yellow Roster & Save')
    {
      // Reset attendance for test
      await client.query(`
        DELETE FROM attendance 
        WHERE student_id = ANY($1::int[]) AND date = $2
      `, [[activeStudent1Id, activeStudent2Id, inactiveStudentId], todayPkt])

      // 1. Roster query: GET /api/students?class=One&section=Yellow&active=true
      const rosterRes = await makeRequest('GET', '/api/students?class=One&section=Yellow&active=true', { Authorization: `Bearer ${tokenA}` })
      assert.strictEqual(rosterRes.status, 200)
      assert.strictEqual(rosterRes.body?.success, true)

      const roster = (rosterRes.body?.data || []).filter(s => s.is_active !== false)
      const hasActive1 = roster.some(s => s.id === activeStudent1Id)
      const hasActive2 = roster.some(s => s.id === activeStudent2Id)
      const hasInactive = roster.some(s => s.id === inactiveStudentId)

      assert.ok(hasActive1, 'Full attendance roster must include active student 1')
      assert.ok(hasActive2, 'Full attendance roster must include active student 2')
      assert.strictEqual(hasInactive, false, 'Full attendance roster must EXCLUDE inactive student')
      console.log('  ✓ Class One / Section Yellow roster contains active students only.')

      // 2. Save fixture active students as Present
      const fixtureRoster = roster.filter(s => s.id === activeStudent1Id || s.id === activeStudent2Id)
      assert.strictEqual(fixtureRoster.length, 2, 'Fixture roster must contain exactly the 2 active fixture students')

      const batchRecords = fixtureRoster.map(s => ({
        student_id: s.id,
        status: 'present',
        date: todayPkt
      }))

      const saveRosterRes = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, { records: batchRecords })
      if (saveRosterRes.status !== 200) {
        console.error('saveRosterRes failed:', saveRosterRes.status, saveRosterRes.body)
      }
      assert.strictEqual(saveRosterRes.status, 200)
      assert.strictEqual(saveRosterRes.body?.success, true)
      assert.strictEqual(saveRosterRes.body?.savedCount, 2)
      console.log(`  ✓ Batch saved successfully: ${batchRecords.length} active records saved, 0 inactive records sent.`)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FIX 8 TEST: Backend Safety Regression — Deliberate Inactive Student POST
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TEST FIX 8] Backend Safety Regression: Deliberate Inactive Student POST')
    {
      const countBefore = await client.query('SELECT COUNT(*)::int AS cnt FROM attendance WHERE date = $1', [todayPkt])

      const inactivePayload = {
        records: [
          { student_id: activeStudent1Id, status: 'present', date: todayPkt },
          { student_id: inactiveStudentId, status: 'present', date: todayPkt } // INACTIVE!
        ]
      }

      const res = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, inactivePayload)
      assert.strictEqual(res.status, 400, `Expected 400 for inactive student, got ${res.status}`)
      assert.strictEqual(res.body?.success, false)
      assert.strictEqual(res.body?.error, 'INVALID_STUDENT_IDS')
      assert.ok(res.body?.invalidIds?.includes(inactiveStudentId), 'invalidIds must include inactive student ID')
      assert.strictEqual(res.body?.saved, 0, 'Saved count must be 0 (full atomic rollback)')

      const countAfter = await client.query('SELECT COUNT(*)::int AS cnt FROM attendance WHERE date = $1', [todayPkt])
      assert.strictEqual(countAfter.rows[0].cnt, countBefore.rows[0].cnt, 'DB attendance count must remain unchanged')
      console.log('  ✓ Backend correctly rejected inactive student with HTTP 400, INVALID_STUDENT_IDS, and 0 saved.')
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FIX 9 TEST: Tenant Regression — Cross-Tenant Student POST
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TEST FIX 9] Tenant Regression: Cross-Tenant Student POST')
    {
      const countBefore = await client.query('SELECT COUNT(*)::int AS cnt FROM attendance WHERE date = $1', [todayPkt])

      const crossTenantPayload = {
        records: [
          { student_id: activeStudent1Id, status: 'present', date: todayPkt },
          { student_id: foreignStudentId, status: 'present', date: todayPkt } // FOREIGN TENANT!
        ]
      }

      const res = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, crossTenantPayload)
      assert.strictEqual(res.status, 400, `Expected 400 for cross-tenant student, got ${res.status}`)
      assert.strictEqual(res.body?.success, false)
      assert.strictEqual(res.body?.error, 'INVALID_STUDENT_IDS')
      assert.ok(res.body?.invalidIds?.includes(foreignStudentId), 'invalidIds must include foreign student ID')
      assert.strictEqual(res.body?.saved, 0, 'Saved count must be 0 (full atomic rollback)')

      const countAfter = await client.query('SELECT COUNT(*)::int AS cnt FROM attendance WHERE date = $1', [todayPkt])
      assert.strictEqual(countAfter.rows[0].cnt, countBefore.rows[0].cnt, 'DB attendance count must remain unchanged')
      console.log('  ✓ Backend correctly rejected cross-tenant student with HTTP 400, INVALID_STUDENT_IDS, and 0 saved.')
    }

    // Clean up test fixtures
    await client.query(`
      DELETE FROM attendance 
      WHERE student_id = ANY($1::int[]) AND date = $2
    `, [[activeStudent1Id, activeStudent2Id, inactiveStudentId, foreignStudentId], todayPkt])

    await client.query(`
      DELETE FROM students 
      WHERE id = ANY($1::int[])
    `, [[activeStudent1Id, activeStudent2Id, inactiveStudentId, foreignStudentId]])

    console.log('\n=================================================================')
    console.log('ALL FIX 6, FIX 7, FIX 8, FIX 9 TESTS PASSED (100%)')
    console.log('=================================================================\n')

    return true
  } finally {
    client.release()
  }
}

if (require.main === module) {
  runHotfixSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('TEST SUITE FAILED:', err)
      process.exit(1)
    })
}

module.exports = { runHotfixSuite }

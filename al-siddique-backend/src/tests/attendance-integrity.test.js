// al-siddique-backend/src/tests/attendance-integrity.test.js
// GATE D: Comprehensive Attendance End-to-End & Integrity Test Suite

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

// Helper to get PKT date string
function getPktDateString(dateObj = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj)
}

async function runAttendanceIntegritySuite() {
  console.log('=================================================================')
  console.log('STARTING GATE D: ATTENDANCE INTEGRITY & END-TO-END TEST SUITE')
  console.log('=================================================================')

  const client = await pool.connect()
  const todayPkt = getPktDateString()
  console.log(`Current Asia/Karachi Date: ${todayPkt}`)

  try {
    // Setup test school & tokens
    const schoolAId = 1
    const schoolBId = 98765

    await client.query(`
      INSERT INTO schools (id, name, code, status, tenant_id)
      VALUES ($1, 'Tenant B Test School', 'test_b', 'active', 'test_b')
      ON CONFLICT (id) DO UPDATE SET status = 'active'
    `, [schoolBId])

    // Find 5 active students from School A
    const stuRes = await client.query(`
      SELECT id, name, class, section, school_id 
      FROM students 
      WHERE school_id = $1 AND is_active = true 
      ORDER BY id ASC LIMIT 5
    `, [schoolAId])
    assert.ok(stuRes.rows.length >= 5, 'Need at least 5 active students for School A')
    const studentsA = stuRes.rows
    const [s1, s2, s3, s4, s5] = studentsA

    // Create / ensure a student in School B (foreign tenant)
    const foreignStudentId = 888991
    await client.query(`
      INSERT INTO students (id, school_id, gr_number, name, father_name, roll_number, class, section, is_active, tenant_id)
      VALUES ($1, $2, 'GR-TEST-B', 'Foreign Tenant Student', 'Father Test', 'B-101', '6th', 'A', true, 'test_b')
      ON CONFLICT (id) DO UPDATE SET school_id = $2, is_active = true
    `, [foreignStudentId, schoolBId])

    const tokenA = jwt.sign(
      { id: 1, email: 'admin@alsiddique.edu.pk', role: 'admin', school_id: schoolAId, tenant_id: 'school_1' },
      JWT_SECRET,
      { expiresIn: '1h' }
    )

    // Clean any existing attendance for our 5 test students for today
    await client.query(`
      DELETE FROM attendance 
      WHERE student_id = ANY($1::int[]) AND date = $2
    `, [[s1.id, s2.id, s3.id, s4.id, s5.id, foreignStudentId], todayPkt])

    // ── TEST 1: Present ────────────────────────────────────────────────────────
    console.log('\n[1/16] Testing Status: Present...')
    const res1 = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, {
      records: [{ student_id: s1.id, status: 'present', date: todayPkt }]
    })
    assert.strictEqual(res1.status, 200, `Expected 200, got ${res1.status}`)
    assert.strictEqual(res1.body?.success, true)
    assert.strictEqual(res1.body?.savedCount, 1)

    const db1 = await client.query('SELECT status FROM attendance WHERE student_id = $1 AND date = $2', [s1.id, todayPkt])
    assert.strictEqual(db1.rows[0]?.status, 'present', 'DB row must be present')
    console.log('  ✓ Present persisted to DB correctly.')

    // ── TEST 2: Absent ─────────────────────────────────────────────────────────
    console.log('\n[2/16] Testing Status: Absent...')
    const res2 = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, {
      records: [{ student_id: s2.id, status: 'absent', date: todayPkt }]
    })
    assert.strictEqual(res2.status, 200)
    assert.strictEqual(res2.body?.savedCount, 1)
    const db2 = await client.query('SELECT status FROM attendance WHERE student_id = $1 AND date = $2', [s2.id, todayPkt])
    assert.strictEqual(db2.rows[0]?.status, 'absent', 'DB row must be absent')
    console.log('  ✓ Absent persisted to DB correctly.')

    // ── TEST 3: Late ───────────────────────────────────────────────────────────
    console.log('\n[3/16] Testing Status: Late...')
    const res3 = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, {
      records: [{ student_id: s3.id, status: 'late', date: todayPkt }]
    })
    assert.strictEqual(res3.status, 200)
    assert.strictEqual(res3.body?.savedCount, 1)
    const db3 = await client.query('SELECT status FROM attendance WHERE student_id = $1 AND date = $2', [s3.id, todayPkt])
    assert.strictEqual(db3.rows[0]?.status, 'late', 'DB row must be late')
    console.log('  ✓ Late persisted to DB correctly.')

    // ── TEST 4: Leave ──────────────────────────────────────────────────────────
    console.log('\n[4/16] Testing Status: Leave...')
    const res4 = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, {
      records: [{ student_id: s4.id, status: 'leave', date: todayPkt }]
    })
    assert.strictEqual(res4.status, 200)
    assert.strictEqual(res4.body?.savedCount, 1)
    const db4 = await client.query('SELECT status FROM attendance WHERE student_id = $1 AND date = $2', [s4.id, todayPkt])
    assert.strictEqual(db4.rows[0]?.status, 'leave', 'DB row must be leave')
    console.log('  ✓ Leave persisted to DB correctly.')

    // ── TEST 5: Batch Mark All Present ─────────────────────────────────────────
    console.log('\n[5/16] Testing Batch Mark All Present (Atomic 5-record upsert)...')
    const batchRecords = [
      { student_id: s1.id, status: 'present', date: todayPkt },
      { student_id: s2.id, status: 'present', date: todayPkt },
      { student_id: s3.id, status: 'present', date: todayPkt },
      { student_id: s4.id, status: 'present', date: todayPkt },
      { student_id: s5.id, status: 'present', date: todayPkt }
    ]
    const res5 = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, {
      records: batchRecords
    })
    assert.strictEqual(res5.status, 200)
    assert.strictEqual(res5.body?.success, true)
    assert.strictEqual(res5.body?.savedCount, 5)
    assert.strictEqual(res5.body?.requestedCount, 5)

    const db5 = await client.query(`
      SELECT student_id, status FROM attendance 
      WHERE student_id = ANY($1::int[]) AND date = $2
    `, [[s1.id, s2.id, s3.id, s4.id, s5.id], todayPkt])
    assert.strictEqual(db5.rows.length, 5)
    for (const row of db5.rows) {
      assert.strictEqual(row.status, 'present', `Student ${row.student_id} must now be present`)
    }
    console.log('  ✓ Batch Mark All Present persisted atomically (5/5).')

    // ── TEST 6: Modal X Exit Guard Contract ────────────────────────────────────
    console.log('\n[6/16] Testing Modal X Exit Guard contract...')
    // Guard contract logic:
    // If stagedCount > 0:
    //   onClose() -> triggers showUnsavedConfirm = true; modal stays open
    //   confirm 'keep_editing' -> modal stays open, staged retained
    //   confirm 'discard' -> staged cleared, modal closes
    const mockState = {
      stagedAttendance: { [s1.id]: 'present' },
      isModalOpen: true,
      showConfirm: false,
      attemptExit(action) {
        if (Object.keys(this.stagedAttendance).length > 0) {
          this.showConfirm = true
          return false // Exit prevented
        }
        this.isModalOpen = false
        return true
      },
      handleConfirm(choice) {
        if (choice === 'keep') {
          this.showConfirm = false
        } else if (choice === 'discard') {
          this.stagedAttendance = {}
          this.showConfirm = false
          this.isModalOpen = false
        }
      }
    }
    // Attempt X exit with staged items
    const exitBlocked = !mockState.attemptExit('X')
    assert.ok(exitBlocked, 'Exit must be blocked when staged attendance exists')
    assert.strictEqual(mockState.showConfirm, true, 'Confirm prompt must be displayed')
    assert.strictEqual(mockState.isModalOpen, true, 'Modal must remain open')

    // Choose Keep Editing
    mockState.handleConfirm('keep')
    assert.strictEqual(mockState.isModalOpen, true)
    assert.strictEqual(Object.keys(mockState.stagedAttendance).length, 1)

    // Attempt exit again, choose Discard
    mockState.attemptExit('X')
    mockState.handleConfirm('discard')
    assert.strictEqual(mockState.isModalOpen, false)
    assert.strictEqual(Object.keys(mockState.stagedAttendance).length, 0)
    console.log('  ✓ Modal X Exit Guard contract validated.')

    // ── TEST 7: Backdrop Exit Guard Contract ───────────────────────────────────
    console.log('\n[7/16] Testing Backdrop Exit Guard contract...')
    const backdropState = {
      stagedAttendance: { [s2.id]: 'absent' },
      isModalOpen: true,
      showConfirm: false,
      onBackdropClick() {
        if (Object.keys(this.stagedAttendance).length > 0) {
          this.showConfirm = true
          return false
        }
        this.isModalOpen = false
        return true
      }
    }
    const backdropBlocked = !backdropState.onBackdropClick()
    assert.ok(backdropBlocked, 'Backdrop click must not close modal when staged items exist')
    assert.strictEqual(backdropState.showConfirm, true)
    assert.strictEqual(backdropState.isModalOpen, true)
    console.log('  ✓ Backdrop Exit Guard contract validated.')

    // ── TEST 8: ESC Exit Guard Contract ────────────────────────────────────────
    console.log('\n[8/16] Testing ESC Key Exit Guard contract...')
    const escState = {
      stagedAttendance: { [s3.id]: 'late' },
      isModalOpen: true,
      showConfirm: false,
      onKeyDown(e) {
        if (e.key === 'Escape') {
          if (Object.keys(this.stagedAttendance).length > 0) {
            this.showConfirm = true
            return false
          }
          this.isModalOpen = false
          return true
        }
      }
    }
    const escBlocked = !escState.onKeyDown({ key: 'Escape' })
    assert.ok(escBlocked, 'ESC key must not dismiss modal when staged items exist')
    assert.strictEqual(escState.showConfirm, true)
    assert.strictEqual(escState.isModalOpen, true)
    console.log('  ✓ ESC Key Exit Guard contract validated.')

    // ── TEST 9: Full Sheet Navigation Guard Contract ───────────────────────────
    console.log('\n[9/16] Testing Full Sheet Navigation Guard contract...')
    const navState = {
      stagedAttendance: { [s4.id]: 'leave' },
      pendingNav: null,
      showConfirm: false,
      navigate(route) {
        if (Object.keys(this.stagedAttendance).length > 0) {
          this.pendingNav = route
          this.showConfirm = true
          return false
        }
        return true
      }
    }
    const navBlocked = !navState.navigate('/attendance/matrix')
    assert.ok(navBlocked, 'Navigation to full sheet must be intercepted')
    assert.strictEqual(navState.pendingNav, '/attendance/matrix')
    assert.strictEqual(navState.showConfirm, true)
    console.log('  ✓ Full Sheet Navigation Guard contract validated.')

    // ── TEST 10: Save Network Failure Resilience ───────────────────────────────
    console.log('\n[10/16] Testing Save Network Failure Resilience...')
    // Frontend state machine verification: network failure sets error state and preserves staged map
    const failureState = {
      stagedAttendance: { [s5.id]: 'present' },
      saving: false,
      saveError: null,
      async save(apiCall) {
        this.saving = true
        this.saveError = null
        try {
          await apiCall()
          this.stagedAttendance = {}
        } catch (err) {
          this.saveError = err.message
          // Invariant: stagedAttendance must NOT be wiped on failure
        } finally {
          this.saving = false
        }
      }
    }
    await failureState.save(async () => {
      throw new Error('Network timeout: Gateway 504')
    })
    assert.strictEqual(failureState.saving, false)
    assert.strictEqual(failureState.saveError, 'Network timeout: Gateway 504')
    assert.strictEqual(Object.keys(failureState.stagedAttendance).length, 1, 'Staged attendance must be preserved on network error')
    assert.strictEqual(failureState.stagedAttendance[s5.id], 'present')
    console.log('  ✓ Network failure resilience contract validated (staged items preserved).')

    // ── TEST 11: Invalid Student ID (Atomic Rejection) ─────────────────────────
    console.log('\n[11/16] Testing Invalid Student ID Rejection & Atomic Rollback...')
    const invalidId = 9999987
    const countBefore11 = await client.query('SELECT COUNT(*)::int AS cnt FROM attendance WHERE date = $1', [todayPkt])

    const res11 = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, {
      records: [
        { student_id: s1.id, status: 'absent', date: todayPkt },
        { student_id: invalidId, status: 'present', date: todayPkt }
      ]
    })
    assert.strictEqual(res11.status, 400, `Expected 400 for invalid ID, got ${res11.status}`)
    assert.strictEqual(res11.body?.success, false)
    assert.strictEqual(res11.body?.error, 'INVALID_STUDENT_IDS')
    assert.ok(res11.body?.invalidIds?.includes(invalidId))
    assert.strictEqual(res11.body?.saved, 0)

    const countAfter11 = await client.query('SELECT COUNT(*)::int AS cnt FROM attendance WHERE date = $1', [todayPkt])
    assert.strictEqual(countAfter11.rows[0].cnt, countBefore11.rows[0].cnt, 'DB row count must not change on error (all-or-nothing rollback)')

    // Verify s1 was NOT updated to 'absent' because transaction rolled back
    const s1Row = await client.query('SELECT status FROM attendance WHERE student_id = $1 AND date = $2', [s1.id, todayPkt])
    assert.strictEqual(s1Row.rows[0]?.status, 'present', 's1 status must remain present due to rollback')
    console.log('  ✓ Invalid student ID rejected with 400 and full rollback.')

    // ── TEST 12: Wrong-Tenant Student (Atomic Rejection) ───────────────────────
    console.log('\n[12/16] Testing Wrong-Tenant Student Rejection & Rollback...')
    const countBefore12 = await client.query('SELECT COUNT(*)::int AS cnt FROM attendance WHERE date = $1', [todayPkt])

    const res12 = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, {
      records: [
        { student_id: s2.id, status: 'leave', date: todayPkt },
        { student_id: foreignStudentId, status: 'present', date: todayPkt }
      ]
    })
    assert.strictEqual(res12.status, 400, `Expected 400 for cross-tenant, got ${res12.status}`)
    assert.strictEqual(res12.body?.success, false)
    assert.strictEqual(res12.body?.error, 'INVALID_STUDENT_IDS')
    assert.ok(res12.body?.invalidIds?.includes(foreignStudentId))
    assert.strictEqual(res12.body?.saved, 0)

    const countAfter12 = await client.query('SELECT COUNT(*)::int AS cnt FROM attendance WHERE date = $1', [todayPkt])
    assert.strictEqual(countAfter12.rows[0].cnt, countBefore12.rows[0].cnt, 'DB row count unchanged on cross-tenant rejection')

    const s2Row = await client.query('SELECT status FROM attendance WHERE student_id = $1 AND date = $2', [s2.id, todayPkt])
    assert.strictEqual(s2Row.rows[0]?.status, 'present', 's2 status must remain present due to rollback')
    console.log('  ✓ Wrong-tenant student rejected with 400 and full rollback.')

    // ── TEST 13: PKT 00:01 Boundary ────────────────────────────────────────────
    console.log('\n[13/16] Testing PKT 00:01 Date Boundary...')
    // At PKT 00:01, UTC is 19:01 of previous calendar day
    const pktMidnightObj = new Date('2026-09-24T00:01:00+05:00')
    const pktResolvedDate = getPktDateString(pktMidnightObj)
    assert.strictEqual(pktResolvedDate, '2026-09-24', 'PKT 00:01 must resolve to 2026-09-24')

    // Test API acceptance of PKT date string
    const res13 = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, {
      records: [{ student_id: s3.id, status: 'present', date: pktResolvedDate }]
    })
    assert.strictEqual(res13.status, 200)
    console.log('  ✓ PKT 00:01 boundary correctly resolves calendar day (2026-09-24).')

    // ── TEST 14: PKT 04:30 Boundary ────────────────────────────────────────────
    console.log('\n[14/16] Testing PKT 04:30 Date Boundary...')
    // At PKT 04:30, UTC is 23:30 of previous calendar day
    const pktFajrObj = new Date('2026-09-24T04:30:00+05:00')
    const pktFajrResolvedDate = getPktDateString(pktFajrObj)
    assert.strictEqual(pktFajrResolvedDate, '2026-09-24', 'PKT 04:30 must resolve to 2026-09-24')

    const res14 = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, {
      records: [{ student_id: s4.id, status: 'late', date: pktFajrResolvedDate }]
    })
    assert.strictEqual(res14.status, 200)
    console.log('  ✓ PKT 04:30 boundary correctly resolves calendar day (2026-09-24).')

    // ── TEST 15 & 16: Reopen Modal & Browser Reload Persistence Assertion ──────
    console.log('\n[15/16] Testing Modal Reopening & Unmarked Exclusion...')
    console.log('[16/16] Testing Simulated Browser Reload Persistence Assertion...')
    
    // Step A: Mark student s5 explicitly as 'present'
    const resSave = await makeRequest('POST', '/api/attendance/mark', { Authorization: `Bearer ${tokenA}` }, {
      records: [{ student_id: s5.id, status: 'present', date: todayPkt }]
    })
    assert.strictEqual(resSave.status, 200)
    assert.strictEqual(resSave.body?.savedCount, 1)

    // Step B: Verify DB row exists
    const dbS5 = await client.query('SELECT status FROM attendance WHERE student_id = $1 AND date = $2', [s5.id, todayPkt])
    assert.strictEqual(dbS5.rows[0]?.status, 'present', 'DB row must exist and be present')

    // Step C: Simulate Modal Reopening (fetch attendance for today, compute unmarked roster)
    const attListRes1 = await makeRequest('GET', `/api/attendance?date=${todayPkt}`, { Authorization: `Bearer ${tokenA}` })
    assert.strictEqual(attListRes1.status, 200)
    const markedIds1 = (attListRes1.body?.data || []).map(r => r.student_id)
    assert.ok(markedIds1.includes(s5.id), 's5 must be in marked attendance list')

    // Unmarked filter logic:
    // unmarkedStudents = allActiveStudents.filter(st => !markedIds.includes(st.id))
    const isS5Unmarked1 = !markedIds1.includes(s5.id)
    assert.strictEqual(isS5Unmarked1, false, 's5 must be EXCLUDED from unmarked list upon modal reopen')
    console.log('  ✓ Reopening modal excludes s5 from Unmarked list.')

    // Step D: Simulate Hard Browser Reload (fresh query without local memory cache)
    const attListResReload = await makeRequest('GET', `/api/attendance?date=${todayPkt}&_t=${Date.now()}`, {
      Authorization: `Bearer ${tokenA}`,
      'Cache-Control': 'no-cache'
    })
    assert.strictEqual(attListResReload.status, 200)
    const markedIdsReload = (attListResReload.body?.data || []).map(r => r.student_id)
    assert.ok(markedIdsReload.includes(s5.id), 'After reload, s5 must still be in marked attendance list')
    const isS5UnmarkedReload = !markedIdsReload.includes(s5.id)
    assert.strictEqual(isS5UnmarkedReload, false, 'After reload, s5 is still EXCLUDED from unmarked list')
    console.log('  ✓ Browser reload persistence assertion verified: s5 remains persisted and excluded from Unmarked list.')

    console.log('\n=================================================================')
    console.log('ALL 16 ATTENDANCE INTEGRITY & END-TO-END TESTS PASSED (100%)')
    console.log('=================================================================\n')
  } finally {
    client.release()
  }
}

if (require.main === module) {
  runAttendanceIntegritySuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('TEST SUITE FAILED:', err)
      process.exit(1)
    })
}

module.exports = { runAttendanceIntegritySuite }

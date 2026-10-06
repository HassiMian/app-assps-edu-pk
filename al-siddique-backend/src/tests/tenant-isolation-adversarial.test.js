// al-siddique-backend/src/tests/tenant-isolation-adversarial.test.js
// Multi-Tenant Adversarial Isolation Verification Suite

const assert = require('assert')
const http = require('http')
const jwt = require('jsonwebtoken')
const { pool } = require('../config/database')

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_KEY_MIN_32_CHARS'
const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:3001'

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

async function runAdversarialSuite() {
  console.log('==================================================')
  console.log('STARTING PHASE 3 MULTI-TENANT ADVERSARIAL TESTS')
  console.log('==================================================')

  const client = await pool.connect()
  const idSeed = await client.query(`
    SELECT
      GREATEST(COALESCE((SELECT MAX(id) FROM schools), 0), 100000) + 1000 AS tenant_b_id,
      GREATEST(COALESCE((SELECT MAX(id) FROM users), 0), 100000) + 2000 AS user_b_id
  `)
  const tenantBId = Number(idSeed.rows[0].tenant_b_id)
  const userBId = Number(idSeed.rows[0].user_b_id)
  const tenantBKey = `adv_test_${tenantBId}`
  const tenantBEmail = `admin+${userBId}@adv-test.com`

  try {
    // 1. Resolve the real Tenant A identity and create an isolated collision-free Tenant B fixture
    const tenantAResult = await client.query(`
      SELECT id, email, role, school_id, tenant_id
      FROM users
      WHERE id = 1 AND is_active = true
      LIMIT 1
    `)
    assert.ok(tenantAResult.rows[0], 'Active Tenant A admin fixture (user id 1) is required')
    const tenantA = tenantAResult.rows[0]
    await client.query(`
      INSERT INTO schools (id, name, code, status, tenant_id)
      VALUES ($1, 'Tenant B Adversarial School', $2, 'active', $2)
      ON CONFLICT (id) DO UPDATE SET status = 'active'
    `, [tenantBId, tenantBKey])

    await client.query(`
      INSERT INTO users (id, school_id, name, email, password, role, is_active, tenant_id)
      VALUES ($1, $2, 'Tenant B Admin', $3, 'dummy_hash', 'admin', true, $4)
      ON CONFLICT (id) DO UPDATE SET is_active = true, school_id = $2
    `, [userBId, tenantBId, tenantBEmail, tenantBKey])

    // 2. Insert test daily diary records
    const diaryTagA = `DIARY_TENANT_A_${Date.now()}`
    const diaryTagB = `DIARY_TENANT_B_${Date.now()}`

    await client.query(`
      INSERT INTO daily_diaries (school_id, school_name, tagline, class_name, rows)
      VALUES ($1, 'ASSPS', $2, 'Class 1', '[]'::jsonb)
    `, [tenantA.school_id, diaryTagA])

    await client.query(`
      INSERT INTO daily_diaries (school_id, school_name, tagline, class_name, rows)
      VALUES ($1, 'Tenant B School', $2, 'Class 1', '[]'::jsonb)
    `, [tenantBId, diaryTagB])

    // 3. Issue Tokens
    const tenantAClaims = { id: tenantA.id, email: tenantA.email, role: tenantA.role, school_id: tenantA.school_id, tenant_id: tenantA.tenant_id }
    const tenantBClaims = { id: userBId, email: tenantBEmail, role: 'admin', school_id: tenantBId, tenant_id: tenantBKey }
    const tokenA = jwt.sign(tenantAClaims, JWT_SECRET, { expiresIn: '1h' })
    const tokenB = jwt.sign(tenantBClaims, JWT_SECRET, { expiresIn: '1h' })
    const expiredTokenA = jwt.sign(tenantAClaims, JWT_SECRET, { expiresIn: '-10s' })
    const forgedToken = jwt.sign(tenantAClaims, 'WRONG_SECRET_KEY_FOR_TAMPER_TEST', { expiresIn: '1h' })

    // TEST T1: Tenant A fetches daily diary -> receives only Tenant A
    const resT1 = await makeRequest('GET', '/api/daily-diary', { Authorization: `Bearer ${tokenA}` })
    assert.strictEqual(resT1.status, 200, `T1 expected 200, got ${resT1.status}`)
    const diariesA = resT1.body?.data || []
    const hasTagA_in_A = diariesA.some(d => d.tagline === diaryTagA)
    const hasTagB_in_A = diariesA.some(d => d.tagline === diaryTagB)
    assert.ok(hasTagA_in_A, 'T1: Tenant A must see its own diary')
    assert.strictEqual(hasTagB_in_A, false, 'T1: Tenant A must NEVER see Tenant B diary')
    console.log('TEST T1 (Tenant A diary isolation): PASS')

    // TEST T2: Tenant B fetches daily diary -> receives only Tenant B
    const resT2 = await makeRequest('GET', '/api/daily-diary', { Authorization: `Bearer ${tokenB}` })
    assert.strictEqual(resT2.status, 200, `T2 expected 200, got ${resT2.status}`)
    const diariesB = resT2.body?.data || []
    const hasTagA_in_B = diariesB.some(d => d.tagline === diaryTagA)
    const hasTagB_in_B = diariesB.some(d => d.tagline === diaryTagB)
    assert.ok(hasTagB_in_B, 'T2: Tenant B must see its own diary')
    assert.strictEqual(hasTagA_in_B, false, 'T2: Tenant B must NEVER see Tenant A diary')
    console.log('TEST T2 (Tenant B diary isolation): PASS')

    // TEST T3: Tenant A token with forged school_id query parameter (?school_id=98765)
    const resT3 = await makeRequest('GET', `/api/daily-diary?school_id=${tenantBId}`, { Authorization: `Bearer ${tokenA}` })
    assert.strictEqual(resT3.status, 200)
    const forgedQueryDiaries = resT3.body?.data || []
    const leakedBViaQuery = forgedQueryDiaries.some(d => d.tagline === diaryTagB)
    assert.strictEqual(leakedBViaQuery, false, 'T3: Forged ?school_id must NOT leak Tenant B data')
    console.log('TEST T3 (Forged school_id query param rejection): PASS')

    // TEST T4: Tenant A token with forged header (x-school-id: 98765)
    const resT4 = await makeRequest('GET', '/api/daily-diary', {
      Authorization: `Bearer ${tokenA}`,
      'x-school-id': String(tenantBId),
      'x-tenant-id': tenantBKey
    })
    assert.strictEqual(resT4.status, 200)
    const forgedHeaderDiaries = resT4.body?.data || []
    const leakedBViaHeader = forgedHeaderDiaries.some(d => d.tagline === diaryTagB)
    assert.strictEqual(leakedBViaHeader, false, 'T4: Forged x-school-id header must NOT leak Tenant B data')
    console.log('TEST T4 (Forged x-school-id header rejection): PASS')

    // TEST T5: Unauthenticated request (no token)
    const resT5 = await makeRequest('GET', '/api/daily-diary')
    assert.strictEqual(resT5.status, 401, `T5 expected 401 for no token, got ${resT5.status}`)
    console.log('TEST T5 (No-token 401 rejection): PASS')

    // TEST T6: Expired token
    const resT6 = await makeRequest('GET', '/api/daily-diary', { Authorization: `Bearer ${expiredTokenA}` })
    assert.strictEqual(resT6.status, 401, `T6 expected 401 for expired token, got ${resT6.status}`)
    console.log('TEST T6 (Expired token 401 rejection): PASS')

    // TEST T7: Forged/Tampered signature token
    const resT7 = await makeRequest('GET', '/api/daily-diary', { Authorization: `Bearer ${forgedToken}` })
    assert.strictEqual(resT7.status, 401, `T7 expected 401 for forged signature, got ${resT7.status}`)
    console.log('TEST T7 (Tampered signature 401 rejection): PASS')

    // TEST T8: Connection reuse across requests (A -> B -> A rapid alternation)
    for (let i = 0; i < 5; i++) {
      const respA = await makeRequest('GET', '/api/daily-diary', { Authorization: `Bearer ${tokenA}` })
      assert.strictEqual(respA.status, 200)
      assert.strictEqual((respA.body?.data || []).some(d => d.tagline === diaryTagB), false, `Leak in iter ${i} (A)`)

      const respB = await makeRequest('GET', '/api/daily-diary', { Authorization: `Bearer ${tokenB}` })
      assert.strictEqual(respB.status, 200)
      assert.strictEqual((respB.body?.data || []).some(d => d.tagline === diaryTagA), false, `Leak in iter ${i} (B)`)
    }
    console.log('TEST T8 (Connection reuse A->B->A isolation): PASS')

    console.log('==================================================')
    console.log('ALL 8 ADVERSARIAL MULTI-TENANT TESTS PASSED')
    console.log('==================================================')
  } finally {
    // Teardown temporary Tenant B test artifacts
    await client.query('DELETE FROM daily_diaries WHERE school_id = $1', [tenantBId])
    await client.query('DELETE FROM users WHERE id = $1', [userBId])
    await client.query('DELETE FROM schools WHERE id = $1', [tenantBId])
    client.release()
  }
}

runAdversarialSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ ADVERSARIAL MULTI-TENANT TEST FAILED:', err)
    process.exit(1)
  })

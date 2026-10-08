const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const http = require('node:http')
const bcrypt = require('bcryptjs')
const { pool } = require('../config/database')

const PORT = Number(process.env.STAGE_API_PORT || 5039)
function request(path, { method = 'GET', body, cookie = '' } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const req = http.request({host: '127.0.0.1', port: PORT, path, method,
      headers: {Host: 'api.assps.edu.pk', 'Content-Type': 'application/json',
        ...(cookie ? {Cookie: cookie} : {}),
        ...(payload ? {'Content-Length': Buffer.byteLength(payload)} : {})},
      timeout: 8000}, res => {
      const chunks = []
      res.on('data', x => chunks.push(x))
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8')}))
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

test('restricted app runtime preserves school dashboard and academic API', {timeout: 45000}, async () => {
  assert.equal(process.env.NODE_ENV, 'test')
  assert.match(String(process.env.DB_NAME || ''), /^assps_archv1_rls_stage_/)
  assert.notEqual(PORT, 5000)
  const suffix = crypto.randomBytes(6).toString('hex')
  const code = `runt${suffix}`
  const email = `runtime-${suffix}@invalid.example`
  const password = crypto.randomBytes(18).toString('base64url')
  const digest = await bcrypt.hash(password, 10)
  let sid
  try {
    sid = (await pool.query("INSERT INTO schools(name,code,status,tenant_id) VALUES('Synthetic Runtime Smoke',$1,'active',$1) RETURNING id", [code])).rows[0].id
    await pool.query("INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active) VALUES($1,$2,'Runtime Smoke Admin',$3,'admin',$4,true)", [sid, code, email, digest])
    const login = await request('/api/auth/login', {method:'POST', body: {email, password, role:'admin', school_code:code}})
    assert.equal(login.status, 200, `Synthetic login failed HTTP ${login.status}`)
    const cookie = (login.headers['set-cookie'] || []).map(x => x.split(';')[0]).join('; ')
    assert.ok(cookie, 'Expected an authenticated HttpOnly session')
    const paths = [
      '/api/dashboard/stats',
      '/api/students?active=true',
      '/api/fees/summary',
      '/api/paper/vault',
      '/api/portal/paper-studio/context',
      '/api/question-bank',
      '/api/lesson-plans',
    ]
    const problems = []
    for (const path of paths) {
      const res = await request(path, {cookie})
      console.log('APP_RUNTIME_STAGE_HTTP',path,res.status)
      if (res.status >= 500 || res.status === 401) {
        problems.push(`${path}: ${res.status} ${res.body.slice(0,180)}`)
      }
    }
    assert.deepEqual(problems, [], 'Authenticated school operations must not crash or lose session')
    console.log(`APP_RUNTIME_BUSINESS_STAGE ${paths.length}/${paths.length} PASS`)
  } finally {
    if (sid) {
      await pool.query('DELETE FROM users WHERE school_id=$1', [sid]).catch(() => {})
      await pool.query('DELETE FROM schools WHERE id=$1', [sid]).catch(() => {})
    }
    await pool.end()
  }
})

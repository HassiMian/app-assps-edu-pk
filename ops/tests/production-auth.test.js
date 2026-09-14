const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')
const { createRequire } = require('node:module')

const root = path.resolve(__dirname, '..', '..')
const authPath = require.resolve(path.join(root, 'al-siddique-backend/src/middleware/auth.js'))
const databasePath = require.resolve(path.join(root, 'al-siddique-backend/src/config/database.js'))
const backendRequire = createRequire(path.join(root, 'al-siddique-backend/src/server.js'))
const jwt = backendRequire('jsonwebtoken')

function withEnv(env, fn) {
  const previous = { ...process.env }
  const restore = () => {
    for (const key of Object.keys(process.env)) delete process.env[key]
    Object.assign(process.env, previous)
  }
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('JARVIS_SCHOOL_SERVICE_') || ['NODE_ENV', 'JWT_SECRET', 'DEMO_LOGIN_ENABLED'].includes(key)) {
      delete process.env[key]
    }
  }
  Object.assign(process.env, env)
  try {
    const result = fn()
    if (result && typeof result.then === 'function') {
      return result.finally(restore)
    }
    restore()
    return result
  } catch (err) {
    restore()
    throw err
  } finally {
    // Async calls restore through finally on the returned promise.
  }
}

function loadAuth(env, queryImpl = async () => ({ rows: [] })) {
  delete require.cache[authPath]
  delete require.cache[databasePath]
  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: { query: queryImpl },
  }
  return withEnv(env, () => require(authPath))
}

function responseRecorder() {
  const res = {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.payload = payload
      return this
    },
  }
  return res
}

test('production auth refuses to load without JWT_SECRET', () => {
  assert.throws(() => loadAuth({ NODE_ENV: 'production' }), /JWT_SECRET is required in production/)
})

test('production auth rejects missing token', async () => {
  const { protect } = loadAuth({ NODE_ENV: 'production', JWT_SECRET: 'test-secret' })
  const res = responseRecorder()
  let nextCalled = false
  await protect({ headers: {} }, res, () => { nextCalled = true })
  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 401)
  assert.equal(res.payload.message, 'Token required')
})

test('production auth rejects mock JWT token even when demo flag is enabled', async () => {
  const { protect } = loadAuth({
    NODE_ENV: 'production',
    JWT_SECRET: 'test-secret',
    DEMO_LOGIN_ENABLED: 'true',
  })
  const res = responseRecorder()
  let nextCalled = false
  const originalWarn = console.warn
  console.warn = () => {}
  try {
    await protect({ headers: { authorization: 'Bearer mock-jwt-token' } }, res, () => { nextCalled = true })
  } finally {
    console.warn = originalWarn
  }
  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 401)
})

test('production auth accepts a valid active user and active school', async () => {
  const secret = 'test-secret'
  const token = jwt.sign({ id: 44, email: 'principal@example.test' }, secret, { algorithm: 'HS256' })
  const calls = []
  const query = async (sql) => {
    calls.push(sql)
    if (sql.includes('FROM users')) {
      return {
        rows: [{
          id: 44,
          school_id: 1,
          name: 'Principal',
          email: 'principal@example.test',
          role: 'principal',
          designation: 'Principal',
        }],
      }
    }
    if (sql.includes('FROM schools')) {
      return {
        rows: [{
          id: 1,
          name: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
          code: 'assps',
          tenant_id: 'assps',
          status: 'active',
          feature_flags: [],
        }],
      }
    }
    return { rows: [] }
  }

  const { protect } = loadAuth({ NODE_ENV: 'production', JWT_SECRET: secret }, query)
  const req = { headers: { authorization: `Bearer ${token}` }, method: 'GET', originalUrl: '/api/students' }
  const res = responseRecorder()
  let nextCalled = false
  await protect(req, res, () => { nextCalled = true })

  assert.equal(nextCalled, true)
  assert.equal(res.statusCode, null)
  assert.equal(req.school_id, 1)
  assert.equal(req.tenant_id, 'assps')
  assert.equal(req.user.role, 'principal')
  assert.equal(calls.length, 2)
})

test('production service token requires explicit service claims', async () => {
  const crypto = require('node:crypto')
  const serviceToken = 'service-token'
  const hash = crypto.createHash('sha256').update(serviceToken, 'utf8').digest('hex')
  const env = {
    NODE_ENV: 'production',
    JWT_SECRET: 'test-secret',
    JARVIS_SCHOOL_SERVICE_TOKEN_SHA256: hash,
  }
  const { protect } = loadAuth(env)
  const req = { headers: { authorization: `Bearer ${serviceToken}` } }
  const res = responseRecorder()
  let nextCalled = false
  await withEnv(env, () => protect(req, res, () => { nextCalled = true }))

  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 403)
  assert.equal(res.payload.message, 'Service credential claims are not fully configured.')
})

test('production service token rejects tenant mismatch', async () => {
  const crypto = require('node:crypto')
  const serviceToken = 'service-token'
  const hash = crypto.createHash('sha256').update(serviceToken, 'utf8').digest('hex')
  const query = async (sql) => {
    if (sql.includes('FROM schools')) {
      return {
        rows: [{
          id: 1,
          name: 'Other School',
          code: 'other',
          tenant_id: 'other',
          status: 'active',
          feature_flags: [],
        }],
      }
    }
    return { rows: [] }
  }
  const env = {
    NODE_ENV: 'production',
    JWT_SECRET: 'test-secret',
    JARVIS_SCHOOL_SERVICE_TOKEN_SHA256: hash,
    JARVIS_SCHOOL_SERVICE_IDENTITY: 'JARVIS_SCHOOL_SERVICE',
    JARVIS_SCHOOL_SERVICE_TENANT_ID: 'assps',
    JARVIS_SCHOOL_SERVICE_SCHOOL_ID: '1',
  }
  const { protect } = loadAuth(env, query)
  const req = { headers: { authorization: `Bearer ${serviceToken}` } }
  const res = responseRecorder()
  let nextCalled = false
  await withEnv(env, () => protect(req, res, () => { nextCalled = true }))

  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 403)
  assert.equal(res.payload.message, 'Service tenant claim does not match school tenant.')
})

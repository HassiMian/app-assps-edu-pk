const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const express = require('express')
const rateLimit = require('express-rate-limit')
const { isReadOnlySessionIntrospection, guardAuthAttempts } = require('./authRateLimitPolicy')

test('Only read-only /me introspection is exempt, never login/refresh/reset', () => {
  for (const method of ['GET', 'HEAD']) {
    assert.equal(isReadOnlySessionIntrospection({ method, path: '/me' }), true)
  }
  for (const [method, path] of [
    ['POST', '/login'], ['POST', '/refresh'], ['POST', '/reset-password'],
    ['GET', '/logout'], ['GET', '/me/other'], ['POST', '/me'],
  ]) {
    assert.equal(isReadOnlySessionIntrospection({ method, path }), false)
  }
  assert.throws(() => guardAuthAttempts(null), /rate limiter/)
})

test('Express mounted aliases: session checks cannot exhaust login quota; POST logins remain throttled', async (t) => {
  const app = express()
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 2,
    standardHeaders: true, legacyHeaders: false,
  })
  app.use(['/api/auth', '/api/admin/auth'], guardAuthAttempts(limiter))
  app.get('/api/auth/me', (req, res) => res.status(401).json({ success: false }))
  app.get('/api/admin/auth/me', (req, res) => res.status(401).json({ success: false }))
  app.post('/api/auth/login', (req, res) => res.status(401).json({ success: false }))
  app.post('/api/admin/auth/login', (req, res) => res.status(401).json({ success: false }))
  const server = http.createServer(app)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const port = server.address().port
  const req = (method, path) => fetch('http://127.0.0.1:' + port + path, { method }).then(r => r.status)

  // Simulate repeated Connect pages while signed session is absent or expired.
  for (let i = 0; i < 13; i++) {
    assert.equal(await req('GET', '/api/auth/me'), 401)
    assert.equal(await req('GET', '/api/admin/auth/me'), 401)
  }
  assert.equal(await req('POST', '/api/auth/login'), 401)
  assert.equal(await req('POST', '/api/admin/auth/login'), 401)
  assert.equal(await req('POST', '/api/auth/login'), 429)
  // Session introspection stays reachable even after actual login attempts are limited.
  assert.equal(await req('GET', '/api/auth/me'), 401)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldClearSessionOn401 } from '../src/services/auth401Policy.js'
const auth = (overrides = {}) => ({
  status: 401,
  requestUrl: '/api/portal/paper-studio/papers',
  sentAuthorization: 'Bearer server-jwt-1',
  currentToken: 'server-jwt-1',
  ...overrides,
})
test('matching server JWT on protected Paper Studio 401 clears stale session', () => {
  assert.equal(shouldClearSessionOn401(auth()), true)
})
test('wrong password on login must display API error without redirect', () => {
  assert.equal(shouldClearSessionOn401(auth({ requestUrl: '/api/auth/login' })), false)
  assert.equal(shouldClearSessionOn401(auth({ requestUrl: 'https://app.assps.edu.pk/api/admin/auth/login?from=staff' })), false)
})
test('failed refresh must not trigger a duplicate forced logout', () => {
  assert.equal(shouldClearSessionOn401(auth({ requestUrl: '/api/auth/refresh' })), false)
})
test('local-only token can never be treated as a valid server JWT', () => {
  assert.equal(shouldClearSessionOn401(auth({ sentAuthorization: 'Bearer local_123_123', currentToken: 'local_123_123' })), false)
})
test('previous session request cannot erase a newer session', () => {
  assert.equal(shouldClearSessionOn401(auth({ currentToken: 'server-jwt-2' })), false)
})
test('unauthenticated 401 must not redirect the user again', () => {
  assert.equal(shouldClearSessionOn401(auth({ currentToken: null })), false)
  assert.equal(shouldClearSessionOn401(auth({ sentAuthorization: '' })), false)
})
test('other HTTP failures never invalidate an authenticated session', () => {
  for (const status of [400, 403, 404, 429, 500]) {
    assert.equal(shouldClearSessionOn401(auth({ status })), false)
  }
})
test('Bearer header must be exact and nonlocal', () => {
  assert.equal(shouldClearSessionOn401(auth({ sentAuthorization: 'Token server-jwt-1' })), false)
  assert.equal(shouldClearSessionOn401(auth({ sentAuthorization: 'Bearer wrong' })), false)
})
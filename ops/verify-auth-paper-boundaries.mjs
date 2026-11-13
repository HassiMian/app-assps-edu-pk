#!/usr/bin/env node
// A312: Safe, read-only external authentication and Saved Papers boundary smoke.
// No real credentials, no school-data mutations.
import assert from 'node:assert/strict'
const base = process.env.ASSPS_BASE_URL || 'https://app.assps.edu.pk'
const routes = [
  {path: '/', expected: 200, type: 'text/html'},
  {path: '/api/auth/me', expected: 401, type: 'application/json', noStore: true},
  {path: '/api/portal/paper-studio/papers', expected: 401, type: 'application/json'},
  {path: '/api/portal/paper-studio/library', expected: 401, type: 'application/json'},
  {path: '/api/portal/paper-studio/papers/nonexistent-a312', expected: 401, type: 'application/json'},
]
const results = []
for (const target of routes) {
  const url = new URL(target.path, base)
  const response = await fetch(url, {
    method: 'GET', cache: 'no-store', redirect: 'manual',
    signal: AbortSignal.timeout(12000),
  })
  const type = response.headers.get('content-type') || ''
  const cacheControl = response.headers.get('cache-control') || ''
  assert.equal(response.status, target.expected, target.path + ' status')
  assert.ok(type.includes(target.type), target.path + ' content-type')
  if (target.noStore) assert.match(cacheControl, /no-store/i)
  if (target.expected === 401) {
    const data = await response.json()
    assert.equal(typeof data.message, 'string')
  }
  results.push({path:target.path,status:response.status,contentType:target.type})
}
const localDenied = await fetch(new URL('/api/portal/paper-studio/papers',base), {
  method:'GET', headers:{authorization:'Bearer local_a312_probe_only'},
  signal:AbortSignal.timeout(12000),
})
assert.equal(localDenied.status,401,'Local-only pseudo-token must never read protected papers')
results.push({path:'/api/portal/paper-studio/papers',auth:'synthetic-local',status:localDenied.status})
console.log(JSON.stringify({mission:'A312',ok:true,checkedAt:new Date().toISOString(),results},null,2))
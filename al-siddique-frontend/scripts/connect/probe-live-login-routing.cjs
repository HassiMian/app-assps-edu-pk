#!/usr/bin/env node
'use strict';
// Anonymous read-only HTTP smoke probe. This is NOT proof of an authenticated staff login.
const { URL } = require('node:url');
const base = process.argv[2] || 'https://api.assps.edu.pk';
const parsed = new URL(base);
if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
  throw new Error('Provide an absolute origin only');
}
const checks = [
  { path: '/login', status: 200 },
  { path: '/dashboard', status: 307, target: '/login', next: '/admin' },
  { path: '/teacher', status: 302, target: '/login', next: '/teacher' },
  { path: '/api/auth/me', status: 401 },
  { path: '/auth/change-password', status: 200 },
];
(async () => {
  let passed = 0;
  for (const c of checks) {
    let response;
    try {
      response = await fetch(new URL(c.path, parsed), { redirect: 'manual', signal: AbortSignal.timeout(6000), headers: { 'Cache-Control': 'no-cache' } });
    } catch (error) {
      console.error('FAIL', c.path, error.name);
      continue;
    }
    let ok = response.status === c.status;
    let shown = `http=${response.status}`;
    if (c.target) {
      const location = response.headers.get('location');
      const destination = location ? new URL(location, parsed) : null;
      ok = ok && !!destination && destination.origin === parsed.origin && destination.pathname === c.target && destination.searchParams.get('next') === c.next;
      shown += ` redirect=${destination?.pathname || 'MISSING'} next=${destination?.searchParams.get('next') || 'MISSING'}`;
    }
    console.log(ok ? 'PASS' : 'FAIL', c.path, shown);
    if (ok) passed++;
  }
  console.log(`CONNECT_ANONYMOUS_ROUTING_GATE ${passed}/${checks.length} ${passed === checks.length ? 'PASS' : 'FAIL'}`);
  process.exitCode = passed === checks.length ? 0 : 1;
})().catch(err => { console.error('FAIL', err.name); process.exitCode = 1; });

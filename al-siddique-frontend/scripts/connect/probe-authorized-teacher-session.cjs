#!/usr/bin/env node
'use strict';
// Operational end-to-end verification using an APPROVED test teacher, never credential guessing.
// Supply a dedicated teacher login with secure environment variables; never print secrets.
const origin = process.argv[2] || 'https://api.assps.edu.pk';
const identifier = process.env.CONNECT_E2E_TEACHER_IDENTIFIER;
const password = process.env.CONNECT_E2E_TEACHER_PASSWORD;
const schoolCode = process.env.CONNECT_E2E_SCHOOL_CODE;
const expectedSchoolId = process.env.CONNECT_E2E_SCHOOL_ID || '1';
if (!identifier || !password || !schoolCode) {
  console.error('AUTHENTICATED_LOGIN_GATE NOT_RUN: dedicated approved teacher credentials unavailable');
  process.exit(4);
}
const parsed = new URL(origin);
if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash || !['http:', 'https:'].includes(parsed.protocol)) {
  console.error('AUTHENTICATED_LOGIN_GATE INVALID_ORIGIN'); process.exit(2);
}
async function request(path, options) {
  return fetch(new URL(path, parsed), { redirect: 'manual', signal: AbortSignal.timeout(9000), cache: 'no-store', ...options });
}
(async () => {
  const login = await request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: identifier, password, school_code: schoolCode, role: 'teacher' }) });
  const data = await login.json().catch(() => null);
  if (login.status !== 200 || !data?.success || String(data.user?.role || '').toLowerCase() !== 'teacher') {
    console.error('AUTHENTICATED_LOGIN_GATE FAIL: approved teacher login not accepted', login.status); process.exitCode = 1; return;
  }
  if (data.mustChangePassword) {
    const page = await request('/auth/change-password');
    console.log('AUTHENTICATED_LOGIN_GATE TEMP_PASSWORD_CHANGE_REQUIRED page_http=' + page.status + ' (full session deliberately not issued)');
    process.exitCode = 4;
    return;
  }
  const cookies = login.headers.getSetCookie().map(x => x.split(';', 1)[0]).filter(x => /^(authToken|userId|tenantId|role)=/.test(x));
  if (!cookies.some(x => x.startsWith('authToken='))) {
    console.error('AUTHENTICATED_LOGIN_GATE FAIL: Connect session cookie missing'); process.exitCode = 1; return;
  }
  const cookieHeader = cookies.join('; ');
  try {
    const me = await request('/api/auth/me', { headers: { Cookie: cookieHeader } });
    const identity = await me.json().catch(() => null);
    const actual = identity?.user;
    if (me.status !== 200 || !identity?.success || String(actual?.role || '').toLowerCase() !== 'teacher' || String(actual?.school_id) !== expectedSchoolId) {
      console.error('AUTHENTICATED_LOGIN_GATE FAIL: role/school/session verification', me.status); process.exitCode = 1; return;
    }
    const portal = await request('/teacher', { headers: { Cookie: cookieHeader } });
    const location = portal.headers.get('location');
    const destination = location ? new URL(location, parsed) : null;
    const passed = portal.status === 200 || ([302,307,308].includes(portal.status) && destination?.origin === parsed.origin && destination.pathname.startsWith('/teacher'));
    if (!passed) {
      console.error('AUTHENTICATED_LOGIN_GATE FAIL: teacher portal redirect', portal.status, destination?.pathname || 'none'); process.exitCode = 1; return;
    }
    console.log('AUTHENTICATED_LOGIN_GATE PASS: credential->signed cookie->canonical me->teacher portal; role=teacher school=' + expectedSchoolId);
  } finally {
    await request('/api/auth/logout', { method: 'POST', headers: { Cookie: cookieHeader } }).catch(() => null);
  }
})().catch(() => { console.error('AUTHENTICATED_LOGIN_GATE FAIL: network or application error'); process.exitCode = 1; });

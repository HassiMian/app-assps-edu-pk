const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../src/routes/authRoutes.js'), 'utf8');

test('legacy passwords reach hash verification instead of 8-char login rejection', () => {
  const match = source.match(/function isAcceptableLoginPassword\(password\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(match, 'login validator exists');
  const validate = new Function('password', match[1]);
  for (const value of ['x', 'legacy7', 'normal123', 'a'.repeat(1024)]) assert.equal(validate(value), true);
  for (const value of ['', null, {}, [], 12345678, 'a'.repeat(1025)]) assert.equal(validate(value), false);
});

test('login policy does not alter new-password and recovery enrollment rules', () => {
  const login = source.slice(source.indexOf("router.post('/login'"), source.indexOf("router.post('/refresh'"));
  assert.match(login, /if \(!isAcceptableLoginPassword\(password\)\)/);
  assert.doesNotMatch(login, /Password must be at least 8 characters long/);
  assert.match(source, /New password must be at least 8 characters/);
  assert.match(source, /bcrypt\.compare/);
});
test('one staff login failure cannot lock other accounts sharing a school IP', () => {
  const vm = require('node:vm');
  const crypto = require('node:crypto');
  let clock = 1_800_000_000_000;
  const attempts = new Map();
  const code = source.slice(source.indexOf('function getClientKey('), source.indexOf('function buildUserPayload('));
  const context = {
    crypto,
    normalizeLoginId: value => String(value || '').trim(),
    loginAttempts: attempts,
    MAX_LOGIN_ATTEMPTS: 5,
    BLOCK_DURATION_MS: 15 * 60 * 1000,
    Date: { now: () => clock },
  };
  const utils = vm.runInNewContext(code + '\n({getClientKey, recordLoginFailure, isBlocked, getLoginAttempt})', context);
  const req = { headers: { 'x-forwarded-for': '203.0.113.10' }, ip: '127.0.0.1' };
  const alice = utils.getClientKey(req, 'alice@example.invalid');
  const aliceCaps = utils.getClientKey(req, 'ALICE@EXAMPLE.INVALID');
  const bob = utils.getClientKey(req, 'bob@example.invalid');
  assert.equal(alice, aliceCaps);
  // Spoofed first X-Forwarded-For header must not evade the same client's quota.
  const spoofed = { ...req, headers: { 'x-forwarded-for': '198.51.100.77' } };
  assert.equal(utils.getClientKey(spoofed, 'alice@example.invalid'), alice);
  assert.notEqual(alice, bob);
  assert.equal(alice.includes('alice@'), false);
  for (let i = 0; i < 5; i++) utils.recordLoginFailure(alice);
  assert.ok(utils.isBlocked(alice));
  assert.ok(!utils.isBlocked(bob));
  // After precisely 15 minutes the expired lockout must reset, not re-lock on one failure.
  clock += 15 * 60 * 1000;
  assert.ok(!utils.isBlocked(alice));
  utils.recordLoginFailure(alice);
  assert.equal(utils.getLoginAttempt(alice).count, 1);
  assert.ok(!utils.isBlocked(alice));
  // Four old failures should also expire after inactivity.
  for (let i = 0; i < 3; i++) utils.recordLoginFailure(bob);
  clock += 15 * 60 * 1000;
  utils.recordLoginFailure(bob);
  assert.equal(utils.getLoginAttempt(bob).count, 1);
});
test('password reset OTP is sent but not stored in plaintext notification logs', async () => {
  const vm = require('node:vm');
  const start = source.indexOf('async function sendPasswordOtp(');
  const end = source.indexOf('function normalizeSchoolId(', start);
  assert.ok(start >= 0 && end > start);
  const snippet = source.slice(start, end);
  const logs = [];
  const sent = [];
  const context = {
    query: async (sql, params) => { logs.push({ sql, params }); return {}; },
    normalizeSchoolId: id => Number(id),
    getTwilioConfigForSchool: async () => ({ accountSid: 'TEST', authToken: 'TEST', smsFrom: '+19999999999' }),
    buildTwilioClient: () => ({ messages: { create: async msg => { sent.push(msg); return {}; } } }),
    maskPhone: () => '***0001',
    normalizePakPhone: () => '+923000000001',
    console,
  };
  const send = vm.runInNewContext(snippet + '\nsendPasswordOtp', context);
  const delivered = await send({ id: 5, role: 'admin', school_id: 7, phone: '03000000001' }, '654321');
  assert.equal(delivered.sent, true);
  assert.equal(logs.length, 1);
  assert.ok(!logs[0].params[2].includes('654321'));
  assert.match(logs[0].params[2], /OTP omitted/);
  assert.equal(sent.length, 1);
  assert.match(sent[0].body, /654321/);
  const unavailable = await send({ id: 5, role: 'admin', school_id: 7 }, '654321');
  assert.equal(unavailable.sent, false);
  assert.equal(sent.length, 1);
  assert.equal(logs.length, 2);
  assert.ok(!logs[1].params[2].includes('654321'));
});

test('undelivered password reset challenges are revoked and never returned', () => {
  const request = source.slice(source.indexOf("router.post('/password-reset/request'"), source.indexOf("router.post('/password-reset/confirm'"));
  const failed = request.indexOf('if (!delivery.sent)');
  const revoke = request.indexOf('passwordResetOtps.delete(resetToken)', failed);
  const failResponse = request.indexOf('return sendJson(res, 503', failed);
  const successResponse = request.indexOf('return sendJson(res, 200', failed);
  assert.ok(failed >= 0 && revoke > failed && failResponse > revoke && successResponse > failResponse);
});
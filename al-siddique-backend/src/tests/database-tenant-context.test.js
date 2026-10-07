const test = require('node:test')
const assert = require('node:assert/strict')

process.env.DB_STARTUP_PROBE = 'false'
const { tenantContext, applyTenantContext, pool } = require('../config/database')

function fakeClient() {
  const calls = []
  return {
    calls,
    async query(text, params = []) {
      calls.push({ text: String(text), params })
      return { rows: [], rowCount: 0 }
    },
  }
}

test('applyTenantContext is exported and applies tenant RLS settings', async () => {
  assert.equal(typeof applyTenantContext, 'function')
  const client = fakeClient()
  const applied = await tenantContext.run({ rlsEnabled: true, tenantId: 42, isSuperAdmin: false }, () => applyTenantContext(client))
  assert.equal(applied, true)
  assert.ok(client.calls.some(call => call.text.includes("app.rls_enabled") && call.text.includes("true")))
  assert.ok(client.calls.some(call => call.text.includes("app.is_super_admin") && call.text.includes("false")))
  assert.ok(client.calls.some(call => call.text.includes("app.tenant_id") && call.params[0] === '42'))
})

test('applyTenantContext uses explicit super-admin context without tenant binding', async () => {
  const client = fakeClient()
  const applied = await tenantContext.run({ rlsEnabled: true, tenantId: 42, isSuperAdmin: true }, () => applyTenantContext(client))
  assert.equal(applied, true)
  assert.ok(client.calls.some(call => call.text.includes("app.is_super_admin") && call.text.includes("true")))
  assert.ok(client.calls.some(call => call.text.includes("app.tenant_id") && call.params.length === 0))
})

test('applyTenantContext is a no-op outside RLS context', async () => {
  const client = fakeClient()
  const applied = await applyTenantContext(client)
  assert.equal(applied, false)
  assert.equal(client.calls.length, 0)
})

test.after(async () => {
  await pool.end().catch(() => {})
})

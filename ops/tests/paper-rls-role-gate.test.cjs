const { test } = require('node:test')
const assert = require('node:assert/strict')
const { REQUIRED, assessRlsGate } = require('../check-paper-tenant-rls-role.cjs')

const strictTables = REQUIRED.map(relname => ({
  relname, relrowsecurity: true, relforcerowsecurity: true,
}))
test('strict role plus FORCE RLS passes', () => {
  const out = assessRlsGate({
    role: { rolsuper: false, rolbypassrls: false },
    tables: strictTables,
  })
  assert.equal(out.safe, true)
})
test('BYPASSRLS and superuser roles fail even when FORCE RLS is enabled', () => {
  for (const unsafe of [
    { rolsuper: false, rolbypassrls: true },
    { rolsuper: true, rolbypassrls: false },
  ]) {
    const out = assessRlsGate({ role: unsafe, tables: strictTables })
    assert.equal(out.safe, false)
    assert.ok(out.findings.includes('APPLICATION_ROLE_BYPASSES_RLS'))
  }
})
test('missing or unforced protected table fails closed', () => {
  const missing = assessRlsGate({
    role: { rolsuper: false, rolbypassrls: false },
    tables: strictTables.slice(1),
  })
  assert.equal(missing.safe, false)
  assert.ok(missing.findings.includes('MISSING_TENANT_TABLE:question_bank'))
  const unforced = assessRlsGate({
    role: { rolsuper: false, rolbypassrls: false },
    tables: strictTables.map(t =>
      t.relname === 'lesson_plans' ? { ...t, relforcerowsecurity: false } : t),
  })
  assert.ok(unforced.findings.includes('UNENFORCED_TENANT_RLS:lesson_plans'))
})

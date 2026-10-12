'use strict'
// Synthetic SQL-builder tests. Mocked schema lookups only; no production PG.
process.env.DB_STARTUP_PROBE = 'false'
const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')
const tenantModule = path.resolve(__dirname, '../middleware/tenant.js')
const originalLoad = Module._load
let supported = new Set(['school_id', 'tenant_id'])
const queries = []
const state = {}
try {
  delete require.cache[tenantModule]
  Module._load = function (request, parent, isMain) {
    if (request === '../config/database' && parent && path.resolve(parent.filename) === tenantModule) {
      return {
        tenantContext: { getStore: () => state },
        query: async (_sql, args) => {
          queries.push(args)
          return { rowCount: supported.has(args[1]) ? 1 : 0 }
        },
      }
    }
    return originalLoad.apply(this, arguments)
  }
  var { tenantClause } = require(tenantModule)
} finally {
  Module._load = originalLoad
}
const request = (user = { role: 'principal', school_id: 1, tenant_id: 'assps' }) => ({ user })
test('both trusted identifiers intersect, not union, and bind parameters', async () => {
  supported = new Set(['school_id', 'tenant_id'])
  const result = await tenantClause(request(), { table: 'fee_challans', alias: 'f', paramIndex: 3 })
  assert.equal(result.clause, ' AND (f.school_id = $3 AND (f.tenant_id = $4 OR f.tenant_id IS NULL))')
  assert.deepEqual(result.params, [1, 'assps'])
  assert.equal(result.nextIndex, 5)
  assert.equal(state.rlsEnabled, true)
  assert.equal(state.tenantId, 1)
})
test('school-only table never inherits cross-school tenant-key OR', async () => {
  supported = new Set(['school_id'])
  const result = await tenantClause(request(), { table: 'school_fees' })
  assert.equal(result.clause, ' AND (school_id = $1)')
  assert.deepEqual(result.params, [1])
})
test('tenant-only table uses tenant_id when authenticated school context exists', async () => {
  supported = new Set(['tenant_id'])
  const result = await tenantClause(request(), { table: 'tenant_settings' })
  assert.equal(result.clause, ' AND (tenant_id = $1)')
  assert.deepEqual(result.params, ['assps'])
})
test('legacy null tenant key remains school-isolated', async () => {
  supported = new Set(['school_id', 'tenant_id'])
  const result = await tenantClause(request({role:'teacher',school_id:1}), { table: 'students' })
  assert.equal(result.clause, ' AND (school_id = $1)')
  assert.deepEqual(result.params, [1])
})
test('missing or malformed school claim fails before database scope lookup', async () => {
  supported = new Set(['school_id', 'tenant_id'])
  const before = queries.length
  for (const user of [null, { role:'teacher', school_id:'1forged', tenant_id:'assps' },
                      { role:'teacher', tenant_id:'assps' }]) {
    await assert.rejects(tenantClause(request(user), { table: 'students' }),
      { code: 'TENANT_SCHOOL_CONTEXT_REQUIRED' })
  }
  assert.equal(queries.length, before)
})
test('missing tenant-scope columns fail closed', async () => {
  supported = new Set([])
  await assert.rejects(tenantClause(request(), { table: 'unscoped' }),
    { code: 'TENANT_SCOPE_COLUMNS_MISSING' })
})
test('super-admin retains existing platform control behavior', async () => {
  const result = await tenantClause(request({role:'super_admin'}), {table:'students'})
  assert.equal(result.clause, '')
  assert.deepEqual(result.params, [])
  assert.equal(state.isSuperAdmin, true)
})
test('no-table scope mutation requires authenticated school identity', async () => {
  await assert.rejects(tenantClause(request({role:'teacher'})),
    { code:'TENANT_SCHOOL_CONTEXT_REQUIRED' })
  assert.equal((await tenantClause(request())).clause, '')
})

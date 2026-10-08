const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadPlanningContext } = require('../services/lessonPlanningContext')

function makeClient({ settingsExists = true, settingsReadable = false, academicSetup = null } = {}) {
  const queries = []
  const client = {
    async query(sql, args = []) {
      queries.push({ sql, args })
      if (sql.includes('to_regclass')) {
        return { rows: [{ table_name: settingsExists && args[0] === 'public.settings' ? 'settings' : null }] }
      }
      if (sql.includes('has_table_privilege')) return { rows: [{ allowed: settingsReadable }] }
      if (sql.includes('FROM settings')) {
        if (!settingsReadable) throw new Error('permission denied for settings')
        assert.deepEqual(args, [42])
        return { rows: [{ academic_setup: academicSetup }] }
      }
      throw new Error(`Unexpected SQL: ${sql}`)
    },
  }
  return { client, queries }
}

test('planner falls back safely without SELECT privilege on settings', async () => {
  const { client, queries } = makeClient()
  const context = await loadPlanningContext(client, 42, { classLevel: '8', subjects: ['Science'] })
  assert.deepEqual(context.academicSetup, {})
  assert.deepEqual(context.curriculumScopes, [])
  assert.ok(context.warnings.some(w => w.includes('No timetable rows')))
  assert.equal(queries.filter(q => q.sql.includes('FROM settings')).length, 0)
  assert.equal(queries.filter(q => q.sql.includes('has_table_privilege')).length, 1)
})

test('planner reads approved settings when role has SELECT privilege', async () => {
  const setup = { periodLength: 40 }
  const { client, queries } = makeClient({ settingsReadable: true, academicSetup: setup })
  const context = await loadPlanningContext(client, 42)
  assert.deepEqual(context.academicSetup, setup)
  assert.equal(queries.filter(q => q.sql.includes('FROM settings')).length, 1)
})

test('planner does not check settings privileges if table is absent', async () => {
  const { client, queries } = makeClient({ settingsExists: false })
  const context = await loadPlanningContext(client, 42)
  assert.deepEqual(context.academicSetup, {})
  assert.equal(queries.filter(q => q.sql.includes('has_table_privilege')).length, 0)
})

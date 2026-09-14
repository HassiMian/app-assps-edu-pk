// src/config/migrations/005_rls_policies.js
const { query } = require('../database')

function assertSafeTableName(table) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(table)) {
    throw new Error(`Unsafe table name in RLS migration: ${table}`)
  }
}

async function up() {
  const tables = [
    'students',
    'exams',
    'attendance',
    'student_fee_profiles',
    'cards',
    'notification_log',
    'online_classes',
    'timetable',
    'classes',
    'daily_diaries',
    'users',
    'settings',
    'fee_challans',
    'fee_class_settings',
    'fee_discount_packages',
    'fee_discount_applications',
    'employees',
    'exam_results',
    'events',
  ]

  const skipped = []

  for (const table of tables) {
    assertSafeTableName(table)

    const tableExists = await query('SELECT to_regclass($1) AS table_name', [`public.${table}`])
    if (!tableExists.rows[0]?.table_name) {
      skipped.push(`${table} (missing table)`)
      continue
    }

    const schoolIdColumn = await query(
      `SELECT 1
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = 'school_id'
        LIMIT 1`,
      [table]
    )
    if (!schoolIdColumn.rowCount) {
      skipped.push(`${table} (missing school_id)`)
      continue
    }

    await query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`)
    await query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`)
    await query(`DROP POLICY IF EXISTS tenant_isolation_policy ON ${table};`)
    await query(`
      CREATE POLICY tenant_isolation_policy ON ${table}
      FOR ALL
      USING (
        current_setting('app.rls_enabled', true) IS NULL
        OR current_setting('app.rls_enabled', true) = 'false'
        OR current_setting('app.is_super_admin', true) = 'true'
        OR school_id = NULLIF(current_setting('app.tenant_id', true), '')::int
      );
    `)
  }

  if (skipped.length) {
    console.log(`RLS skipped optional tables: ${skipped.join(', ')}`)
  }
  console.log('RLS Policies applied to tenant tables.')
}

module.exports = { up }

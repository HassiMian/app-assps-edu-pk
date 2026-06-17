// src/config/migrations/005_rls_policies.js
const { query } = require('../database')

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
    'events'
  ]

  for (const table of tables) {
    // Enable RLS and Force it for the owner
    await query(`ALTER TABLE IF EXISTS ${table} ENABLE ROW LEVEL SECURITY;`)
    await query(`ALTER TABLE IF EXISTS ${table} FORCE ROW LEVEL SECURITY;`)

    // Drop policy if it already exists to allow re-runs
    await query(`DROP POLICY IF EXISTS tenant_isolation_policy ON ${table};`)

    // Create the isolation policy
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

  console.log('✅ RLS Policies applied to tenant tables.')
}

module.exports = { up }

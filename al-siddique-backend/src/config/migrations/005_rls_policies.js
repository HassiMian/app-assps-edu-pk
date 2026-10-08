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
    'lesson_plans',
    'users',
    'settings',
    'fee_challans',
    'fee_class_settings',
    'fee_discount_packages',
    'fee_discount_applications',
    'employees',
    'exam_results',
    'events',
    'question_bank',
    'question_bank_imports',
    'assessment_papers',
    'assessment_paper_revisions',
    'assessment_releases',
    'paper_vault',
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
        current_setting('app.rls_enabled', true) IS DISTINCT FROM 'true'
        OR current_setting('app.is_super_admin', true) = 'true'
        OR school_id = NULLIF(current_setting('app.tenant_id', true), '')::int
      );
    `)
  }

  // High-value authoring data is default-deny at the database layer.
  // Unlike legacy tables, an unset request RLS context must never become a bypass.
  const strictTables = [
    'question_bank', 'question_bank_imports', 'question_masters', 'question_revisions', 'question_mappings', 'question_capture_requests',
    'subject_offerings', 'academic_sessions', 'academic_session_versions', 'curriculum_profiles', 'curriculum_profile_versions',
    'learning_scope_identities', 'learning_scope_versions', 'publishers', 'resource_series', 'resource_books', 'resource_versions',
    'resource_sets', 'resource_set_items', 'resource_scope_mappings', 'curriculum_migration_plans',
    'assessment_papers', 'assessment_paper_revisions', 'assessment_releases',
    'assessment_roster_snapshots', 'assessment_print_jobs', 'lesson_plans'
  ]
  for (const table of strictTables) {
    assertSafeTableName(table)
    const exists = await query('SELECT to_regclass($1) AS table_name', [`public.${table}`])
    if (!exists.rows[0]?.table_name) continue
    const schoolIdColumn = await query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='school_id' LIMIT 1`,
      [table]
    )
    if (!schoolIdColumn.rowCount) continue
    await query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`)
    await query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`)
    await query(`DROP POLICY IF EXISTS tenant_isolation_policy ON ${table};`)
    await query(`
      CREATE POLICY tenant_isolation_policy ON ${table}
      FOR ALL
      USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR school_id = NULLIF(current_setting('app.tenant_id', true), '')::int
      )
      WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
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
